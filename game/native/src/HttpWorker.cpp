#include "HttpWorker.hpp"

#include <Windows.h>
#include <winhttp.h>

#include <algorithm>
#include <chrono>
#include <condition_variable>
#include <deque>
#include <mutex>
#include <thread>
#include <unordered_set>

#include "Credentials.hpp"
#include "Provider.hpp"

namespace anpc
{
namespace
{
using Clock = std::chrono::steady_clock;

struct Job
{
    int32_t id;
    std::string provider;
    std::string body;
    uint32_t timeoutMs;
};

constexpr size_t kMaxBody = 256 * 1024;
constexpr size_t kMaxResponse = 2 * 1024 * 1024;
constexpr size_t kMaxQueue = 8;
constexpr uint32_t kMinTimeoutMs = 1000;
constexpr uint32_t kMaxTimeoutMs = 120000;

std::mutex gMutex;
std::condition_variable gWake;
std::deque<Job> gQueue;
std::deque<CompletedRequest> gDone;
std::unordered_set<int32_t> gCancelled;
bool gRunning = false;
std::thread gWorker;
std::thread gWatchdog;
HINTERNET gSession = nullptr;

// 진행 중인 요청. 감시 스레드가 전체 마감 시간 초과·취소 시 핸들을 닫아 동기 호출을 끝낸다.
HINTERNET gActiveRequest = nullptr;
int32_t gActiveId = -1;
Clock::time_point gDeadline;
bool gActiveTimedOut = false;
bool gActiveCancelled = false;

std::wstring Widen(std::string_view aText)
{
    if (aText.empty())
        return {};
    const int size = MultiByteToWideChar(CP_UTF8, 0, aText.data(), static_cast<int>(aText.size()), nullptr, 0);
    std::wstring wide(static_cast<size_t>(size), L'\0');
    MultiByteToWideChar(CP_UTF8, 0, aText.data(), static_cast<int>(aText.size()), wide.data(), size);
    return wide;
}

void CloseActiveLocked(bool aTimedOut)
{
    if (!gActiveRequest)
        return;
    WinHttpCloseHandle(gActiveRequest);
    gActiveRequest = nullptr;
    if (aTimedOut)
        gActiveTimedOut = true;
    else
        gActiveCancelled = true;
}

CompletedRequest Execute(const Job& aJob)
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

    const int timeout = static_cast<int>(aJob.timeoutMs);
    WinHttpSetTimeouts(request, timeout, timeout, timeout, timeout);
    {
        std::lock_guard lock(gMutex);
        gActiveRequest = request;
        gActiveId = aJob.id;
        gDeadline = Clock::now() + std::chrono::milliseconds(aJob.timeoutMs);
        gActiveTimedOut = false;
        gActiveCancelled = gCancelled.erase(aJob.id) > 0;
        if (gActiveCancelled)
            CloseActiveLocked(false);
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

    bool timedOut = false;
    bool cancelled = false;
    {
        std::lock_guard lock(gMutex);
        if (gActiveRequest == request)
        {
            WinHttpCloseHandle(request);
            gActiveRequest = nullptr;
        }
        gActiveId = -1;
        timedOut = gActiveTimedOut;
        cancelled = gActiveCancelled;
    }
    WinHttpCloseHandle(connect);

    if (cancelled)
        done.status = "cancelled";
    else if (timedOut)
        done.status = "timeout";
    else if (tooLarge)
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
        Job job;
        {
            std::unique_lock lock(gMutex);
            gWake.wait(lock, [] { return !gRunning || !gQueue.empty(); });
            if (!gRunning)
                return;
            job = std::move(gQueue.front());
            gQueue.pop_front();
        }

        const auto started = Clock::now();
        auto done = Execute(job);
        done.elapsedMs = static_cast<uint32_t>(
            std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now() - started).count());
        SecureZeroMemory(job.body.data(), job.body.size());

        std::lock_guard lock(gMutex);
        if (done.status != "cancelled")
            gDone.push_back(std::move(done));
    }
}

void WatchdogLoop()
{
    std::unique_lock lock(gMutex);
    while (gRunning)
    {
        gWake.wait_for(lock, std::chrono::milliseconds(100));
        if (gActiveRequest && Clock::now() > gDeadline)
            CloseActiveLocked(true);
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
        gQueue.clear();
        CloseActiveLocked(false);
    }
    gWake.notify_all();
    if (gWorker.joinable())
        gWorker.join();
    if (gWatchdog.joinable())
        gWatchdog.join();

    std::lock_guard lock(gMutex);
    gDone.clear();
    gCancelled.clear();
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
        if (!gRunning || !gSession || gQueue.size() >= kMaxQueue)
            return false;
        gQueue.push_back(
            Job{aId, std::move(aProvider), std::move(aBody), std::clamp(aTimeoutMs, kMinTimeoutMs, kMaxTimeoutMs)});
    }
    gWake.notify_all();
    return true;
}

bool HttpWorker::Cancel(int32_t aId)
{
    std::lock_guard lock(gMutex);
    const auto queued = std::find_if(gQueue.begin(), gQueue.end(), [aId](const Job& job) { return job.id == aId; });
    if (queued != gQueue.end())
    {
        gQueue.erase(queued);
        return true;
    }
    if (gActiveId == aId)
    {
        CloseActiveLocked(false);
        return true;
    }
    gCancelled.insert(aId);
    return false;
}

std::optional<CompletedRequest> HttpWorker::Poll()
{
    std::lock_guard lock(gMutex);
    if (gDone.empty())
        return std::nullopt;
    auto done = std::move(gDone.front());
    gDone.pop_front();
    return done;
}
} // namespace anpc
