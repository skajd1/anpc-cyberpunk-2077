#include "HttpWorker.hpp"

#include <Windows.h>
#include <winhttp.h>

#include <algorithm>
#include <chrono>
#include <condition_variable>
#include <mutex>
#include <thread>

#include "Credentials.hpp"
#include "Provider.hpp"
#include "RequestLedger.hpp"

namespace anpc
{
namespace
{
using Clock = LedgerClock;

constexpr size_t kMaxBody = 256 * 1024;
constexpr size_t kMaxResponse = 2 * 1024 * 1024;
constexpr uint32_t kMinTimeoutMs = 1000;
constexpr uint32_t kMaxTimeoutMs = 120000;

std::mutex gMutex;
std::condition_variable gWake;
// 접수·대기·진행·완료 상태와 접수 기준 마감 시간. gMutex로 보호한다.
RequestLedger gLedger;
bool gRunning = false;
std::thread gWorker;
std::thread gWatchdog;
HINTERNET gSession = nullptr;

// 진행 중인 요청의 WinHTTP 핸들. 감시 스레드·취소가 닫아 동기 호출을 끝낸다. 만료·취소 여부는 gLedger가 기록한다.
HINTERNET gActiveRequest = nullptr;

std::wstring Widen(std::string_view aText)
{
    if (aText.empty())
        return {};
    const int size = MultiByteToWideChar(CP_UTF8, 0, aText.data(), static_cast<int>(aText.size()), nullptr, 0);
    std::wstring wide(static_cast<size_t>(size), L'\0');
    MultiByteToWideChar(CP_UTF8, 0, aText.data(), static_cast<int>(aText.size()), wide.data(), size);
    return wide;
}

void CloseActiveLocked()
{
    if (!gActiveRequest)
        return;
    WinHttpCloseHandle(gActiveRequest);
    gActiveRequest = nullptr;
}

CompletedRequest Execute(const LedgerJob& aJob)
{
    CompletedRequest done;
    done.id = aJob.id;

    const auto endpoint = FindEndpoint(aJob.provider);
    if (!endpoint)
    {
        done.status = "provider_rejected";
        return done;
    }

    auto key = ReadApiKey(aJob.provider);
    if (!key)
    {
        done.status = "key_missing";
        return done;
    }

    std::wstring headers = L"Content-Type: application/json\r\nAuthorization: Bearer ";
    headers += Widen(*key);
    headers += L"\r\n";
    SecureZeroMemory(key->data(), key->size());
    key.reset();

    HINTERNET connect = WinHttpConnect(gSession, endpoint->host, INTERNET_DEFAULT_HTTPS_PORT, 0);
    HINTERNET request = connect ? WinHttpOpenRequest(connect, L"POST", endpoint->path, nullptr, WINHTTP_NO_REFERER,
                                                     WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE)
                                : nullptr;
    if (!request)
    {
        SecureZeroMemory(headers.data(), headers.size() * sizeof(wchar_t));
        if (connect)
            WinHttpCloseHandle(connect);
        done.status = "network_error";
        return done;
    }

    // 각 단계 제한은 접수 기준 남은 시간을 넘지 않게 한다(0은 무제한이라 최소 1ms).
    const auto remaining = std::chrono::duration_cast<std::chrono::milliseconds>(aJob.deadline - Clock::now()).count();
    const int timeout = static_cast<int>(std::clamp<long long>(remaining, 1, aJob.timeoutMs));
    WinHttpSetTimeouts(request, timeout, timeout, timeout, timeout);
    {
        std::lock_guard lock(gMutex);
        gActiveRequest = request;
        // 대기열에서 꺼낸 뒤 통신 핸들이 열리기 전에 취소·만료됐으면 바로 닫는다.
        if (gLedger.ActiveCancelled() || gLedger.ActiveTimedOut())
            CloseActiveLocked();
    }

    bool ok = WinHttpSendRequest(request, headers.c_str(), static_cast<DWORD>(-1),
                                 const_cast<char*>(aJob.body.data()), static_cast<DWORD>(aJob.body.size()),
                                 static_cast<DWORD>(aJob.body.size()), 0) == TRUE;
    SecureZeroMemory(headers.data(), headers.size() * sizeof(wchar_t));
    ok = ok && WinHttpReceiveResponse(request, nullptr) == TRUE;

    DWORD statusCode = 0;
    DWORD statusSize = sizeof(statusCode);
    if (ok)
    {
        ok = WinHttpQueryHeaders(request, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                                 WINHTTP_HEADER_NAME_BY_INDEX, &statusCode, &statusSize,
                                 WINHTTP_NO_HEADER_INDEX) == TRUE;
    }

    std::string body;
    bool tooLarge = false;
    while (ok)
    {
        DWORD available = 0;
        if (!WinHttpQueryDataAvailable(request, &available))
        {
            ok = false;
            break;
        }
        if (available == 0)
            break;
        if (body.size() + available > kMaxResponse)
        {
            tooLarge = true;
            break;
        }
        const size_t offset = body.size();
        body.resize(offset + available);
        DWORD read = 0;
        if (!WinHttpReadData(request, body.data() + offset, available, &read))
        {
            ok = false;
            break;
        }
        body.resize(offset + read);
    }

    {
        std::lock_guard lock(gMutex);
        if (gActiveRequest == request)
        {
            WinHttpCloseHandle(request);
            gActiveRequest = nullptr;
        }
    }
    WinHttpCloseHandle(connect);

    // 취소·만료는 RequestLedger::Finish가 결과를 버리거나 timeout으로 바꾼다.
    if (tooLarge)
        done.status = "response_too_large";
    else if (!ok)
        done.status = "network_error";
    else
    {
        auto parsed = ParseResponse(aJob.provider, statusCode, body);
        done.status = std::move(parsed.status);
        done.text = std::move(parsed.text);
        done.inputTokens = parsed.inputTokens;
        done.outputTokens = parsed.outputTokens;
    }
    return done;
}

void WorkerLoop()
{
    for (;;)
    {
        std::optional<LedgerJob> job;
        {
            std::unique_lock lock(gMutex);
            gWake.wait(lock, [&] {
                if (!gRunning)
                    return true;
                job = gLedger.Begin(Clock::now());
                return job.has_value();
            });
            if (!gRunning)
                return;
        }

        auto done = Execute(*job);
        done.elapsedMs = static_cast<uint32_t>(
            std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now() - job->enqueuedAt).count());
        SecureZeroMemory(job->body.data(), job->body.size());

        std::lock_guard lock(gMutex);
        gLedger.Finish(std::move(done));
    }
}

// 접수 시점 기준 마감을 넘긴 대기·진행 요청을 즉시 만료시키고 진행 중 핸들을 닫는다.
void WatchdogLoop()
{
    std::unique_lock lock(gMutex);
    while (gRunning)
    {
        gWake.wait_for(lock, std::chrono::milliseconds(100));
        if (gLedger.ExpireDue(Clock::now()))
            CloseActiveLocked();
    }
}
} // namespace

void HttpWorker::Start()
{
    std::lock_guard lock(gMutex);
    if (gRunning)
        return;

    gSession = WinHttpOpen(L"ANPC.Native/0.1", WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY, WINHTTP_NO_PROXY_NAME,
                           WINHTTP_NO_PROXY_BYPASS, 0);
    if (!gSession)
    {
        gSession = WinHttpOpen(L"ANPC.Native/0.1", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME,
                               WINHTTP_NO_PROXY_BYPASS, 0);
    }
    if (gSession)
    {
        DWORD protocols = WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_2;
#ifdef WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_3
        protocols |= WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_3;
#endif
        WinHttpSetOption(gSession, WINHTTP_OPTION_SECURE_PROTOCOLS, &protocols, sizeof(protocols));
    }

    gRunning = true;
    gWorker = std::thread(WorkerLoop);
    gWatchdog = std::thread(WatchdogLoop);
}

void HttpWorker::Stop()
{
    {
        std::lock_guard lock(gMutex);
        if (!gRunning)
            return;
        gRunning = false;
        gLedger.Clear();
        CloseActiveLocked();
    }
    gWake.notify_all();
    if (gWorker.joinable())
        gWorker.join();
    if (gWatchdog.joinable())
        gWatchdog.join();

    std::lock_guard lock(gMutex);
    gLedger.Clear();
    if (gSession)
    {
        WinHttpCloseHandle(gSession);
        gSession = nullptr;
    }
}

bool HttpWorker::Enqueue(int32_t aId, std::string aProvider, std::string aBody, uint32_t aTimeoutMs)
{
    if (aBody.empty() || aBody.size() > kMaxBody || !FindEndpoint(aProvider))
        return false;

    {
        std::lock_guard lock(gMutex);
        if (!gRunning || !gSession)
            return false;
        // 마감은 접수 시각부터 센다. 대기열에서 기다린 시간도 포함한다.
        if (!gLedger.Enqueue(aId, std::move(aProvider), std::move(aBody),
                             std::clamp(aTimeoutMs, kMinTimeoutMs, kMaxTimeoutMs), Clock::now()))
            return false;
    }
    gWake.notify_all();
    return true;
}

// 접수된 요청(대기·진행·미회수 완료)이면 true. 모르는 ID는 아무 상태도 남기지 않고 false.
bool HttpWorker::Cancel(int32_t aId)
{
    std::lock_guard lock(gMutex);
    const auto result = gLedger.Cancel(aId);
    if (result == RequestLedger::CancelResult::Active)
        CloseActiveLocked();
    return result != RequestLedger::CancelResult::Unknown;
}

std::optional<CompletedRequest> HttpWorker::Poll()
{
    std::lock_guard lock(gMutex);
    return gLedger.Poll();
}
} // namespace anpc
