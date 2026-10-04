#pragma once

#include <optional>
#include <string>
#include <string_view>

// 제공자별 개인 API 키를 Windows 자격 증명 관리자(일반 자격 증명 "ANPC/<provider>")에 보관한다.
// 키 원문은 게임·스크립트로 되돌려 주지 않는다. ReadApiKey는 HTTPS 요청 헤더 작성에만 쓴다.
namespace anpc
{
bool IsKnownProvider(std::string_view aProvider);
bool HasApiKey(std::string_view aProvider);
bool SaveApiKey(std::string_view aProvider, std::string_view aKey);
bool DeleteApiKey(std::string_view aProvider);
std::optional<std::string> ReadApiKey(std::string_view aProvider);
} // namespace anpc
