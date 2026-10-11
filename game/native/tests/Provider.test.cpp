#include "Provider.hpp"

#include <iostream>
#include <stdexcept>

int main()
{
    try
    {
        const auto check = [](const char* body, const char* expected) {
            const auto result = anpc::ParseResponse("openai", 200, body);
            if (result.status != expected)
                throw std::runtime_error("unexpected provider response status");
        };
        check("{", "invalid_response");
        check("[]", "invalid_response");
        check(R"({"status":0})", "invalid_response");
        check(R"({"status":null})", "invalid_response");
        check(R"({"status":"completed","output":[{"type":false}]})", "invalid_response");
        check(R"({"status":"completed","output":[{"type":"message","content":[{"type":[]},{"type":"output_text","text":5}]}]})", "invalid_response");
        check(R"({"status":"completed","output":[{"type":"message","content":[{"type":"refusal"}]}]})", "provider_refused");
        const auto result = anpc::ParseResponse("openai", 200,
            R"({"status":"completed","model":"m1","output":[{"type":"message","content":[{"type":"output_text","text":"reply"}]}],"usage":{"input_tokens":12,"output_tokens":3,"input_tokens_details":{"cached_tokens":8},"output_tokens_details":{"reasoning_tokens":0}}})");
        if (result.status != "ok" || result.text != "reply" || result.inputTokens != 12 || result.outputTokens != 3 ||
            result.cachedTokens != 8 || result.reasoningTokens != 0 || result.model != "m1")
            throw std::runtime_error("valid response changed");
        // 사용량 세부 항목이 없거나 형식이 달라도 응답은 그대로 쓰고 값만 -1이다.
        const auto bare = anpc::ParseResponse("openai", 200,
            R"({"status":"completed","output":[{"type":"message","content":[{"type":"output_text","text":"reply"}]}],"usage":{"input_tokens":1,"output_tokens":1,"input_tokens_details":[]}})");
        if (bare.status != "ok" || bare.cachedTokens != -1 || bare.reasoningTokens != -1 || !bare.model.empty())
            throw std::runtime_error("missing usage details changed");
        if (anpc::ParseResponse("openai", 401, "{}").status != "auth_failed" ||
            anpc::ParseResponse("openai", 429, "{}").status != "rate_limited" ||
            anpc::ParseResponse("other", 200, "{}").status != "provider_rejected")
            throw std::runtime_error("provider error classification changed");
    }
    catch (const std::exception& error)
    {
        std::cerr << error.what() << '\n';
        return 1;
    }
    std::cout << "Provider parsing checks passed\n";
}
