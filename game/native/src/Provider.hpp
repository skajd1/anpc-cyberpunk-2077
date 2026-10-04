#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <string_view>

// 제공자별 고정 HTTPS 엔드포인트와 응답 해석. 키는 등록된 엔드포인트로만 보낸다.
namespace anpc
{
struct Endpoint
{
    const wchar_t* host;
    const wchar_t* path;
};

struct ProviderResult
{
    // ok | auth_failed | rate_limited | network_error | provider_rejected | provider_refused | invalid_response
    std::string status;
    // ok일 때 모델 출력 텍스트(구조화 출력 JSON 문자열).
    std::string text;
    int32_t inputTokens = -1;
    int32_t outputTokens = -1;
};

std::optional<Endpoint> FindEndpoint(std::string_view aProvider);
ProviderResult ParseResponse(std::string_view aProvider, uint32_t aHttpStatus, const std::string& aBody);
} // namespace anpc
