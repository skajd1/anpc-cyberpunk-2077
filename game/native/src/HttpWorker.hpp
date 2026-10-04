#pragma once

#include <cstdint>
#include <optional>
#include <string>

// 게임 스레드를 막지 않도록 별도 작업 스레드에서 WinHTTP 요청을 순서대로 처리한다.
// 완료 결과는 게임 스레드가 Poll로 꺼내 간다(콜백으로 게임 객체를 건드리지 않는다).
namespace anpc
{
struct CompletedRequest
{
    int32_t id = -1;
    // ok | key_missing | timeout | cancelled | network_error | auth_failed | rate_limited |
    // provider_rejected | provider_refused | invalid_response | response_too_large
    std::string status;
    std::string text;
    int32_t inputTokens = -1;
    int32_t outputTokens = -1;
    uint32_t elapsedMs = 0;
};

class HttpWorker
{
public:
    static void Start();
    static void Stop();
    static bool Enqueue(int32_t aId, std::string aProvider, std::string aBody, uint32_t aTimeoutMs);
    static bool Cancel(int32_t aId);
    static std::optional<CompletedRequest> Poll();
};
} // namespace anpc
