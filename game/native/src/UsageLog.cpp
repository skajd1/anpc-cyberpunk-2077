#include "UsageLog.hpp"

#include <Windows.h>

#include <chrono>
#include <format>
#include <fstream>
#include <nlohmann/json.hpp>

namespace anpc
{
std::filesystem::path PluginDirectory()
{
    HMODULE module = nullptr;
    GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                       reinterpret_cast<LPCWSTR>(&PluginDirectory), &module);
    wchar_t path[MAX_PATH * 4]{};
    GetModuleFileNameW(module, path, static_cast<DWORD>(std::size(path)));
    return std::filesystem::path(path).parent_path();
}

void AppendUsage(const CompletedRequest& aDone)
{
    constexpr std::uintmax_t kMaxBytes = 1024 * 1024;
    const auto path = PluginDirectory() / L"usage.local.jsonl";
    std::error_code error;
    if (std::filesystem::exists(path, error) && std::filesystem::file_size(path, error) > kMaxBytes)
        std::filesystem::rename(path, std::filesystem::path(path).concat(L".1"), error);
    const auto now = std::chrono::floor<std::chrono::milliseconds>(std::chrono::system_clock::now());
    const nlohmann::json line = {
        {"time", std::format("{:%FT%TZ}", now)},
        {"id", aDone.id},
        {"status", aDone.status},
        {"model", aDone.model},
        {"elapsed_ms", aDone.elapsedMs},
        {"request_bytes", aDone.requestBytes},
        {"input_tokens", aDone.inputTokens},
        {"cached_tokens", aDone.cachedTokens},
        {"output_tokens", aDone.outputTokens},
        {"reasoning_tokens", aDone.reasoningTokens},
    };
    std::ofstream file(path, std::ios::app | std::ios::binary);
    if (file)
        file << line.dump(-1, ' ', false, nlohmann::json::error_handler_t::replace) << '\n';
}
} // namespace anpc
