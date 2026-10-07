import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// redscript는 로컬에서 실행할 수 없어 UF-14 군중 정지·시선과 UF-11 허브 재확인의 연결 지점만 소스로 검사한다.
const read=name=>readFileSync(new URL('../../game/redscript/ANPC/'+name,import.meta.url),'utf8');
const entry=read('Entry.reds'),control=read('NpcControl.reds'),session=read('Session.reds');
function block(source,header){
  const start=source.indexOf(header);assert.ok(start>=0,header);
  let i=source.indexOf('{',start),level=1;const from=++i;
  for(;level&&i<source.length;i++){if(source[i]==='{')level++;if(source[i]==='}')level--;}
  return source.slice(from,i-1);
}

test('군중 세션 시작에서만 정지·시선 제어를 건다',()=>{
  const start=block(entry,'private func StartSession(');
  assert.match(start,/if crowd \{[\s\S]*new NpcControl\(\)[\s\S]*Engage\(npc, player\)[\s\S]*session\.control = control/);
  assert.equal((entry.match(/new NpcControl\(\)/g)||[]).length,1);
  assert.match(session,/public let control: ref<NpcControl>;/);
  // 커뮤니티 허브(UF-15)는 crowd=false로 시작되므로 제어하지 않는다.
  assert.match(block(entry,'public func AcceptScene('),/StartSession\(token\.npc, player, token\.characterKey, false, token\.hubId\)/);
});

test('모든 종료 경로에서 제어를 해제하고 감시 중 갱신한다',()=>{
  assert.match(block(entry,'private func EndSession('),/session\.control\.Release\(\)/);
  assert.match(block(entry,'private func Reset('),/session\.control\.Release\(\)/);
  assert.match(block(entry,'public func OnSubtitleTimer('),/session\.control\.Maintain\(\)/);
});

test('정지 명령은 유한 수명이고 ANPC 소유 명령·시선만 해제한다',()=>{
  assert.match(control,/HoldSeconds\(\) -> Float \{ return 20\.0; \}/);
  assert.match(control,/RenewSeconds\(\) -> Float \{ return 10\.0; \}/);
  const release=block(control,'public func Release(');
  assert.match(release,/StopCommand\(npc, hold\)/);
  assert.match(release,/QueueRemoveLookatEvent\(npc, look\)/);
  assert.doesNotMatch(control,/AIComponent\.CancelCommand|ClearCommands|CancelAll/);
});

test('차선 군중은 군중 이동을 먼저 멈추고, 걷기 시작하면 다시 멈춘다',()=>{
  const stop=block(control,'private func Stop(');
  assert.ok(stop.indexOf('TryStopTrafficMovement()')<stop.indexOf('this.SendHold(npc)'));
  // 워크스팟 중 시작해도 소유를 잡고, 벗어난 뒤 감시에서 건다.
  const engage=block(control,'public func Engage(');
  assert.match(engage,/if !NpcControl\.InWorkspot\(npc\) \{ this\.Apply\(npc, player\); \}[\s\S]*return true;/);
  const maintain=block(control,'public func Maintain(');
  assert.match(maintain,/if NpcControl\.InWorkspot\(npc\) \{ return; \}/);
  assert.match(maintain,/if !this\.applied \{/);
  assert.match(maintain,/this\.IsWalking\(npc\)[\s\S]*this\.Stop\(npc, now\)/);
  assert.match(block(control,'private func IsWalking('),/DriftMeters\(\)/);
  assert.match(block(control,'public func Release('),/this\.applied = false;/);
});

test('세션 종료 시 ANPC가 멈춘 군중만 차선에 다시 합류시킨다',()=>{
  const release=block(control,'public func Release(');
  assert.match(release,/let stopped = this\.applied;[\s\S]*if stopped \{ NpcRejoinStep\.Schedule\(npc, 0\); \}/);
  assert.match(block(control,'public static func TryRejoin('),/TryAndJoinTraffic\(npc, Vector4\.Vector4To3\(player\.GetWorldPosition\(\)\), false\)/);
  const step=block(control,'public class NpcRejoinStep');
  assert.match(step,/entry\.IsControlling\(npc\) \{ return; \}/);
  assert.match(step,/IsActorInWorkspot\(npc\) \{ return; \}/);
  assert.match(step,/this\.attempt >= 8/);
});

test('커뮤니티 허브 진입은 허브가 떠 있는 동안 막힌 조건을 다시 확인한다',()=>{
  const offer=block(entry,'public func OfferScene(');
  assert.equal((offer.match(/this\.ScheduleRetry\(player\)/g)||[]).length,2);
  assert.doesNotMatch(block(entry,'private func ScheduleRetry('),/retries >= 10/);
  const retry=block(entry,'public func OnRetry(');
  assert.match(retry,/SceneEntry\.HasWaitingHub\(game\)/);
  assert.match(retry,/candidate\.hubId >= 0 \{[\s\S]*RefreshDialogs\(game\)/);
  assert.match(retry,/this\.ScheduleRetry\(player\);/);
});
