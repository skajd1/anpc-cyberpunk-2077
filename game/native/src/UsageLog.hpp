#pragma once

#include <filesystem>

#include "HttpWorker.hpp"

// 요청별 지연·토큰 사용량(캐시 적중 포함)을 플러그인 폴더의 usage.local.jsonl에 한 줄씩 남긴다.
// 프롬프트 캐시·응답 지연 분석용 로컬 기록이며 요청/응답 본문·키는 남기지 않는다. 1MB가 넘으면 .1로 넘긴다.
namespace anpc
{
std::filesystem::path PluginDirectory();
void AppendUsage(const CompletedRequest& aDone);
} // namespace anpc
