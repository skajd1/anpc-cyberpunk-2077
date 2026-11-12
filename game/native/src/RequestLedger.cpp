#include "RequestLedger.hpp"

#include <algorithm>

namespace anpc
{
namespace
{
CompletedRequest TimedOut(const LedgerJob& aJob, LedgerClock::time_point aNow)
{
    CompletedRequest done;
    done.id = aJob.id;
    done.status = "timeout";
    done.elapsedMs = static_cast<uint32_t>(
        std::chrono::duration_cast<std::chrono::milliseconds>(aNow - aJob.enqueuedAt).count());
    return done;
}
} // namespace

bool RequestLedger::Tracked(int32_t aId) const
{
    if (mActive && mActive->id == aId)
        return true;
    if (std::any_of(mQueue.begin(), mQueue.end(), [aId](const LedgerJob& job) { return job.id == aId; }))
        return true;
    return std::any_of(mDone.begin(), mDone.end(), [aId](const CompletedRequest& done) { return done.id == aId; });
}

bool RequestLedger::Enqueue(int32_t aId, std::string aProvider, std::string aBody, uint32_t aTimeoutMs,
                            LedgerClock::time_point aNow)
{
    if (mQueue.size() >= kMaxQueue || Tracked(aId))
        return false;
    LedgerJob job;
    job.id = aId;
    job.provider = std::move(aProvider);
    job.body = std::move(aBody);
    job.timeoutMs = aTimeoutMs;
    job.enqueuedAt = aNow;
    job.deadline = aNow + std::chrono::milliseconds(aTimeoutMs);
    mQueue.push_back(std::move(job));
    return true;
}

bool RequestLedger::ExpireDue(LedgerClock::time_point aNow)
{
    for (auto it = mQueue.begin(); it != mQueue.end();)
    {
        if (aNow >= it->deadline)
        {
            mDone.push_back(TimedOut(*it, aNow));
            it = mQueue.erase(it);
        }
        else
            ++it;
    }
    if (mActive && !mActiveCancelled && !mActiveTimedOut && aNow >= mActive->deadline)
    {
        mActiveTimedOut = true;
        return true;
    }
    return false;
}

std::optional<LedgerJob> RequestLedger::Begin(LedgerClock::time_point aNow)
{
    ExpireDue(aNow);
    if (mActive || mQueue.empty())
        return std::nullopt;
    LedgerJob job = std::move(mQueue.front());
    mQueue.pop_front();
    // 요청 본문은 실행하는 쪽만 가진다(진행 상태에는 남기지 않는다).
    std::string body = std::move(job.body);
    mActive = job;
    job.body = std::move(body);
    mActiveCancelled = false;
    mActiveTimedOut = false;
    return job;
}

RequestLedger::CancelResult RequestLedger::Cancel(int32_t aId)
{
    const auto queued = std::find_if(mQueue.begin(), mQueue.end(), [aId](const LedgerJob& job) { return job.id == aId; });
    if (queued != mQueue.end())
    {
        mQueue.erase(queued);
        return CancelResult::Queued;
    }
    if (mActive && mActive->id == aId)
    {
        mActiveCancelled = true;
        return CancelResult::Active;
    }
    const auto done = std::find_if(mDone.begin(), mDone.end(), [aId](const CompletedRequest& item) { return item.id == aId; });
    if (done != mDone.end())
    {
        mDone.erase(done);
        return CancelResult::Completed;
    }
    return CancelResult::Unknown;
}

void RequestLedger::Finish(CompletedRequest aDone)
{
    if (!mActive)
        return;
    const bool cancelled = mActiveCancelled;
    const bool timedOut = mActiveTimedOut;
    mActive.reset();
    mActiveCancelled = false;
    mActiveTimedOut = false;
    if (cancelled)
        return;
    if (timedOut)
    {
        aDone.status = "timeout";
        aDone.text.clear();
        aDone.inputTokens = -1;
        aDone.outputTokens = -1;
    }
    mDone.push_back(std::move(aDone));
}

std::optional<CompletedRequest> RequestLedger::Poll()
{
    if (mDone.empty())
        return std::nullopt;
    auto done = std::move(mDone.front());
    mDone.pop_front();
    return done;
}

void RequestLedger::Clear()
{
    mQueue.clear();
    mDone.clear();
    if (mActive)
        mActiveCancelled = true;
}
} // namespace anpc
