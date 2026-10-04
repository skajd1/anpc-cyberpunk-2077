#include "Provider.hpp"

#include <nlohmann/json.hpp>

namespace anpc
{
std::optional<Endpoint> FindEndpoint(std::string_view aProvider)
{
    if (aProvider == "openai")
        return Endpoint{L"api.openai.com", L"/v1/responses"};
    return std::nullopt;
}

// prototype/openai.js의 상태 분류와 출력 추출을 따른다.
ProviderResult ParseResponse(std::string_view aProvider, uint32_t aHttpStatus, const std::string& aBody)
{
    ProviderResult result;
    if (aProvider != "openai")
    {
        result.status = "provider_rejected";
        return result;
    }

    if (aHttpStatus < 200 || aHttpStatus >= 300)
    {
        if (aHttpStatus == 401 || aHttpStatus == 403)
            result.status = "auth_failed";
        else if (aHttpStatus == 429)
            result.status = "rate_limited";
        else if (aHttpStatus >= 500)
            result.status = "network_error";
        else
            result.status = "provider_rejected";
        return result;
    }

    const auto data = nlohmann::json::parse(aBody, nullptr, false);
    // JSON 텍스트가 유효해도 필드 타입은 틀릴 수 있다. value<string>의 타입 예외가
    // 작업 스레드 밖으로 전파되어 게임을 종료하지 않도록 변환 없이 비교한다.
    if (data.is_discarded() || !data.is_object() || !data.contains("status") || data["status"] != "completed")
    {
        result.status = "invalid_response";
        return result;
    }

    std::string text;
    if (data.contains("output") && data["output"].is_array())
    {
        for (const auto& item : data["output"])
        {
            if (!item.is_object() || !item.contains("type") || item["type"] != "message" || !item.contains("content") ||
                !item["content"].is_array())
                continue;
            for (const auto& part : item["content"])
            {
                if (!part.is_object() || !part.contains("type"))
                    continue;
                const auto& type = part["type"];
                if (type == "refusal")
                {
                    result.status = "provider_refused";
                    return result;
                }
                if (type == "output_text" && part.contains("text") && part["text"].is_string())
                    text += part["text"].get<std::string>();
            }
        }
    }

    if (text.empty())
    {
        result.status = "invalid_response";
        return result;
    }

    if (data.contains("usage") && data["usage"].is_object())
    {
        const auto& usage = data["usage"];
        if (usage.contains("input_tokens") && usage["input_tokens"].is_number_integer())
            result.inputTokens = usage["input_tokens"].get<int32_t>();
        if (usage.contains("output_tokens") && usage["output_tokens"].is_number_integer())
            result.outputTokens = usage["output_tokens"].get<int32_t>();
    }

    result.status = "ok";
    result.text = std::move(text);
    return result;
}
} // namespace anpc
