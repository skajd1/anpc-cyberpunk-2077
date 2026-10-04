// ANPC.Native: 개인 API 키 보관(Windows 자격 증명 관리자)과 등록된 AI 제공자로의 비동기 HTTPS 요청.
// 스크립트(CET/redscript)는 아래 전역 함수만 쓴다. 키 원문을 돌려주는 함수는 두지 않는다.
// 로그에는 요청 번호·상태·지연·토큰 수만 남기고 요청/응답 본문·키를 남기지 않는다.
#include <RED4ext/RED4ext.hpp>
#include <RedLib.hpp>

#include <format>
#include <unordered_map>

#include "Credentials.hpp"
#include "HttpWorker.hpp"

namespace
{
RED4ext::v1::PluginHandle gHandle = nullptr;
const RED4ext::v1::Sdk* gSdk = nullptr;
// 게임 스레드 전용. Poll로 꺼낸 결과를 스크립트가 읽고 Release할 때까지 보관한다.
std::unordered_map<int32_t, anpc::CompletedRequest> gReady;

void LogInfo(const std::string& aMessage)
{
    if (gSdk && gSdk->logger && gSdk->logger->Info)
        gSdk->logger->Info(gHandle, aMessage.c_str());
}
} // namespace

Red::CString ANPCNative_Version()
{
    return "0.1.0";
}

bool ANPCNative_HasKey(const Red::CString& aProvider)
{
    return anpc::HasApiKey(aProvider.c_str());
}

bool ANPCNative_SaveKey(const Red::CString& aProvider, const Red::CString& aKey)
{
    const bool saved = anpc::SaveApiKey(aProvider.c_str(), aKey.c_str());
    LogInfo(std::format("API key save provider={} result={}", aProvider.c_str(), saved));
    return saved;
}

bool ANPCNative_DeleteKey(const Red::CString& aProvider)
{
    return anpc::DeleteApiKey(aProvider.c_str());
}

// body는 제공자 요청 JSON(UTF-8) 전체다. 응답은 ANPCNative_PollId로 확인한다.
bool ANPCNative_Request(int32_t aId, const Red::CString& aProvider, const Red::CString& aBody, int32_t aTimeoutMs)
{
    if (aId < 0 || aTimeoutMs <= 0)
        return false;
    return anpc::HttpWorker::Enqueue(aId, aProvider.c_str(), aBody.c_str(), static_cast<uint32_t>(aTimeoutMs));
}

bool ANPCNative_Cancel(int32_t aId)
{
    gReady.erase(aId);
    return anpc::HttpWorker::Cancel(aId);
}

// 완료된 요청 번호 하나를 돌려준다. 없으면 -1.
int32_t ANPCNative_PollId()
{
    auto done = anpc::HttpWorker::Poll();
    if (!done)
        return -1;
    LogInfo(std::format("request #{} status={} elapsed={}ms tokens={}/{}", done->id, done->status, done->elapsedMs,
                        done->inputTokens, done->outputTokens));
    const int32_t id = done->id;
    gReady[id] = std::move(*done);
    return id;
}

Red::CString ANPCNative_ResultStatus(int32_t aId)
{
    const auto it = gReady.find(aId);
    return it == gReady.end() ? Red::CString("unknown_request") : Red::CString(it->second.status.c_str());
}

Red::CString ANPCNative_ResultText(int32_t aId)
{
    const auto it = gReady.find(aId);
    return it == gReady.end() ? Red::CString("") : Red::CString(it->second.text.c_str());
}

void ANPCNative_Release(int32_t aId)
{
    gReady.erase(aId);
}

RTTI_DEFINE_GLOBALS({
    RTTI_FUNCTION(ANPCNative_Version);
    RTTI_FUNCTION(ANPCNative_HasKey);
    RTTI_FUNCTION(ANPCNative_SaveKey);
    RTTI_FUNCTION(ANPCNative_DeleteKey);
    RTTI_FUNCTION(ANPCNative_Request);
    RTTI_FUNCTION(ANPCNative_Cancel);
    RTTI_FUNCTION(ANPCNative_PollId);
    RTTI_FUNCTION(ANPCNative_ResultStatus);
    RTTI_FUNCTION(ANPCNative_ResultText);
    RTTI_FUNCTION(ANPCNative_Release);
});

RED4EXT_C_EXPORT bool RED4EXT_CALL Main(RED4ext::v1::PluginHandle aHandle, RED4ext::v1::EMainReason aReason,
                                        const RED4ext::v1::Sdk* aSdk)
{
    switch (aReason)
    {
    case RED4ext::v1::EMainReason::Load:
        gHandle = aHandle;
        gSdk = aSdk;
        Red::TypeInfoRegistrar::RegisterDiscovered();
        anpc::HttpWorker::Start();
        LogInfo("ANPC.Native 0.1.0 loaded");
        break;
    case RED4ext::v1::EMainReason::Unload:
        anpc::HttpWorker::Stop();
        gReady.clear();
        break;
    }
    return true;
}

RED4EXT_C_EXPORT void RED4EXT_CALL Query(RED4ext::v1::PluginInfo* aInfo)
{
    aInfo->name = L"ANPC.Native";
    aInfo->author = L"ANPC";
    aInfo->version = RED4EXT_V1_SEMVER(0, 1, 0);
    aInfo->runtime = RED4EXT_V1_RUNTIME_VERSION_LATEST;
    // 설치된 RED4ext 1.30 로더가 이해하는 하위 호환 표기를 쓴다.
    aInfo->sdk = RED4EXT_V1_SDK_VERSION_1_0_0_COMPAT_0_5_0;
}

RED4EXT_C_EXPORT uint32_t RED4EXT_CALL Supports()
{
    return RED4EXT_API_VERSION_1_COMPAT_0;
}
