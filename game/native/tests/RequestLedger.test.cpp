#include "RequestLedger.hpp"

#include <iostream>
#include <stdexcept>

using anpc::CompletedRequest;
using anpc::LedgerClock;
using anpc::RequestLedger;
using Result = RequestLedger::CancelResult;

namespace
{
void Expect(bool aCondition, const char* aMessage)
{
    if (!aCondition)
        throw std::runtime_error(aMessage);
}

CompletedRequest Ok(int32_t aId)
{
    CompletedRequest done;
    done.id = aId;
    done.status = "ok";
    done.text = "reply";
    done.inputTokens = 1;
    done.outputTokens = 2;
    return done;
}
} // namespace

int main()
{
    try
    {
        const auto t0 = LedgerClock::time_point{} + std::chrono::seconds(100);
        const auto at = [&](int aMs) { return t0 + std::chrono::milliseconds(aMs); };

        {
            // 마감은 접수 시각부터 센다. 앞 요청이 오래 걸려 대기열에서 만료되면 통신 없이 timeout.
            RequestLedger ledger;
            Expect(ledger.Enqueue(1, "openai", "a", 30000, at(0)), "enqueue 1");
            Expect(ledger.Enqueue(2, "openai", "b", 5000, at(1000)), "enqueue 2");
            auto first = ledger.Begin(at(2000));
            Expect(first && first->id == 1 && first->deadline == at(30000), "first job deadline is enqueue-based");
            Expect(!ledger.ExpireDue(at(5999)), "queued job not yet expired");
            Expect(!ledger.ExpireDue(at(6000)) && ledger.QueuedCount() == 0, "queued job expires at deadline, no handle to close");
            auto timedOut = ledger.Poll();
            Expect(timedOut && timedOut->id == 2 && timedOut->status == "timeout" && timedOut->elapsedMs == 5000,
                   "queued expiry reports timeout");
            Expect(ledger.Cancel(2) == Result::Unknown, "expired queued id is reclaimed");
            ledger.Finish(Ok(1));
            Expect(ledger.Poll()->status == "ok" && !ledger.HasActive(), "active completes");
        }
        {
            // 진행 중 요청은 마감에 도달하면 즉시 만료로 표시되고 핸들을 닫도록 알린다. 결과는 timeout으로 바뀐다.
            RequestLedger ledger;
            ledger.Enqueue(7, "openai", "x", 3000, at(0));
            ledger.Begin(at(2500));
            Expect(!ledger.ExpireDue(at(2999)), "active not expired early");
            Expect(ledger.ExpireDue(at(3000)) && ledger.ActiveTimedOut(), "active expires at enqueue deadline");
            Expect(!ledger.ExpireDue(at(3100)), "expiry reported once");
            ledger.Finish(Ok(7));
            auto done = ledger.Poll();
            Expect(done && done->status == "timeout" && done->text.empty() && done->inputTokens == -1,
                   "late success after expiry becomes timeout");
            Expect(!ledger.HasActive() && ledger.DoneCount() == 0, "state reclaimed after expiry");
        }
        {
            // 대기열 대기 중 시한이 지난 요청은 Begin에서도 실행되지 않는다.
            RequestLedger ledger;
            ledger.Enqueue(1, "openai", "a", 1000, at(0));
            Expect(!ledger.Begin(at(1000)).has_value(), "expired job is not started");
            Expect(ledger.Poll()->status == "timeout", "expired before start reports timeout");
        }
        {
            // 모르는·끝난 ID 취소는 상태를 남기지 않고, 뒤에 같은 ID를 접수해도 즉시 취소되지 않는다.
            RequestLedger ledger;
            for (int32_t id = 100; id < 400; ++id)
                Expect(ledger.Cancel(id) == Result::Unknown, "unknown cancel");
            Expect(ledger.Enqueue(100, "openai", "a", 3000, at(0)), "enqueue after unknown cancel");
            auto job = ledger.Begin(at(0));
            Expect(job && job->id == 100 && !ledger.ActiveCancelled(), "id not poisoned by earlier cancel");
            ledger.Finish(Ok(100));
            auto done = ledger.Poll();
            Expect(done && done->status == "ok", "completed normally");
            Expect(ledger.Cancel(100) == Result::Unknown, "finished and polled id cancel is a no-op");
        }
        {
            // 취소: 대기열은 제거, 진행 중은 핸들을 닫고 결과 폐기, 미회수 완료는 폐기.
            RequestLedger ledger;
            ledger.Enqueue(1, "openai", "a", 30000, at(0));
            ledger.Enqueue(2, "openai", "b", 30000, at(0));
            ledger.Enqueue(3, "openai", "c", 30000, at(0));
            auto active = ledger.Begin(at(0));
            Expect(active && active->id == 1, "begin 1");
            Expect(ledger.Cancel(2) == Result::Queued && ledger.QueuedCount() == 1, "cancel queued");
            Expect(ledger.Cancel(1) == Result::Active && ledger.ActiveCancelled(), "cancel active");
            ledger.Finish(Ok(1));
            Expect(ledger.DoneCount() == 0 && !ledger.Poll().has_value(), "cancelled result discarded");
            auto third = ledger.Begin(at(10));
            Expect(third && third->id == 3 && !ledger.ActiveCancelled(), "next job starts clean");
            ledger.Finish(Ok(3));
            Expect(ledger.Cancel(3) == Result::Completed && ledger.DoneCount() == 0, "cancel unpolled result discards it");
            Expect(!ledger.Poll().has_value(), "nothing to poll");
        }
        {
            // 취소·시간 초과 뒤 재입력(새 ID)은 이전 결과와 섞이지 않는다. 같은 ID는 미회수 상태에서 거부한다.
            RequestLedger ledger;
            ledger.Enqueue(10, "openai", "a", 3000, at(0));
            ledger.Begin(at(0));
            Expect(ledger.ExpireDue(at(3000)), "10 expires");
            Expect(!ledger.Enqueue(10, "openai", "dup", 3000, at(3001)), "duplicate id rejected while tracked");
            Expect(ledger.Enqueue(11, "openai", "b", 3000, at(3001)), "re-input with new id accepted");
            ledger.Finish(Ok(10));
            Expect(ledger.Poll()->status == "timeout", "old request reports timeout only");
            auto next = ledger.Begin(at(3002));
            Expect(next && next->id == 11 && next->deadline == at(6001) && !ledger.ActiveTimedOut(),
                   "new request has its own deadline and flags");
            ledger.Finish(Ok(11));
            Expect(ledger.Poll()->status == "ok", "new request result intact");
        }
        {
            // 대기열 상한과 종료 시 정리.
            RequestLedger ledger;
            for (int32_t id = 0; id < static_cast<int32_t>(RequestLedger::kMaxQueue); ++id)
                Expect(ledger.Enqueue(id, "openai", "a", 3000, at(0)), "fill queue");
            Expect(!ledger.Enqueue(99, "openai", "a", 3000, at(0)), "queue limit");
            ledger.Begin(at(0));
            ledger.Clear();
            Expect(ledger.QueuedCount() == 0 && ledger.DoneCount() == 0 && ledger.ActiveCancelled(), "clear");
            ledger.Finish(Ok(0));
            Expect(!ledger.Poll().has_value() && !ledger.HasActive(), "result after clear discarded");
        }
    }
    catch (const std::exception& error)
    {
        std::cerr << error.what() << '\n';
        return 1;
    }
    std::cout << "Request ledger checks passed\n";
}
