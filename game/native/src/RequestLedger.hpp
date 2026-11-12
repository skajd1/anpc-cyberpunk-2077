#pragma once

#include <chrono>
#include <cstdint>
#include <deque>
#include <optional>
#include <string>

#include "HttpWorker.hpp"

// 요청 접수·대기·진행·완료 보관 상태와 접수 시점 기준 전체 마감 시간을 관리한다.
// WinHTTP·스레드를 쓰지 않으므로 시각을 넣어 단위 검사할 수 있다. 동기화는 호출자가 맡는다.
namespace anpc
{
using LedgerClock = std::chrono::steady_clock;

struct LedgerJob
{
    int32_t id = -1;
    std::string provider;
    std::string body;
    uint32_t timeoutMs = 0;
    LedgerClock::time_point enqueuedAt;
    // 접수 시각 + timeoutMs. 대기열 대기·통신·응답 수신을 모두 포함한다.
    LedgerClock::time_point deadline;
};

class RequestLedger
{
public:
    static constexpr size_t kMaxQueue = 8;

    enum class CancelResult
    {
        Unknown,   // 접수된 적 없거나 이미 회수됨. 아무 상태도 남기지 않는다.
        Queued,    // 대기열에서 제거
        Active,    // 진행 중. 호출자가 통신 핸들을 닫아야 한다.
        Completed, // 완료됐지만 아직 꺼내 가지 않은 결과를 폐기
    };

    // 대기열이 가득 찼거나 같은 ID가 대기·진행·미회수 완료 상태면 거부한다.
    bool Enqueue(int32_t aId, std::string aProvider, std::string aBody, uint32_t aTimeoutMs, LedgerClock::time_point aNow);
    // 마감이 지난 대기 요청은 timeout 완료로 바꾸고, 진행 중 요청이 마감을 넘기면 true를 돌려준다(핸들을 닫을 것).
    bool ExpireDue(LedgerClock::time_point aNow);
    // 만료되지 않은 다음 요청을 진행 상태로 옮겨 돌려준다. 없으면 nullopt.
    std::optional<LedgerJob> Begin(LedgerClock::time_point aNow);
    CancelResult Cancel(int32_t aId);
    // 진행 요청의 결과를 기록한다. 취소됐으면 버리고, 마감 초과로 표시됐으면 timeout으로 바꾼다.
    void Finish(CompletedRequest aDone);
    std::optional<CompletedRequest> Poll();
    // 종료·재시작: 대기·진행·완료 상태를 모두 비운다. 진행 요청은 취소로 표시한다.
    void Clear();

    bool HasActive() const { return mActive.has_value(); }
    bool ActiveCancelled() const { return mActiveCancelled; }
    bool ActiveTimedOut() const { return mActiveTimedOut; }
    LedgerClock::time_point ActiveDeadline() const { return mActive ? mActive->deadline : LedgerClock::time_point{}; }
    size_t QueuedCount() const { return mQueue.size(); }
    size_t DoneCount() const { return mDone.size(); }

private:
    bool Tracked(int32_t aId) const;

    std::deque<LedgerJob> mQueue;
    std::deque<CompletedRequest> mDone;
    std::optional<LedgerJob> mActive;
    bool mActiveCancelled = false;
    bool mActiveTimedOut = false;
};
} // namespace anpc
