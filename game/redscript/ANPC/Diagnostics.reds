module ANPC

// CET 디버그 창의 바라보는 NPC 검사 전용. 게임 객체는 약한 참조로만 보관하고 원작 상태를 변경하지 않는다.
public class DiagnosticSnapshot extends IScriptable {
  public let reason: String;
  public let epoch: Int32;
  public let entityID: String;
  public let recordID: String;
  public let distance: Float;
  public let sameObject: Bool;
  public let dead: Bool;
  public let playerCombat: Bool;
  public let npcCombat: Bool;
  public let npcStateKnown: Bool;
  public let sceneKnown: Bool;
  public let inScene: Bool;
  public let highLevel: Int32;
  public let diagnosticAllowed: Bool;
  public let voice: ref<NpcVoiceProbe>;
}

public class Diagnostics extends ScriptableSystem {
  private let epoch: Int32;
  private let pinnedNPC: wref<NPCPuppet>;
  private let pinnedPlayer: wref<PlayerPuppet>;

  public static func Version() -> String {
    return "0.1.0";
  }

  private func OnAttach() -> Void {
    this.Reset();
  }

  private func OnRestored(saveVersion: Int32, gameVersion: Int32) -> Void {
    this.Reset();
  }

  private func OnDetach() -> Void {
    this.Reset();
  }

  public func Reset() -> Void {
    this.epoch += 1;
    this.pinnedNPC = null;
    this.pinnedPlayer = null;
  }

  private func LookAt(player: ref<PlayerPuppet>) -> ref<NPCPuppet> {
    let targeting = GameInstance.GetTargetingSystem(this.GetGameInstance());
    if !IsDefined(targeting) {
      return null;
    }
    let target = targeting.GetLookAtObject(player, true, false);
    if !IsDefined(target) {
      target = targeting.GetLookAtObject(player, false, false);
    }
    return target as NPCPuppet;
  }

  public func Pin() -> ref<DiagnosticSnapshot> {
    this.Reset();
    let state = this.Collect();
    if state.diagnosticAllowed {
      let player = GetPlayer(this.GetGameInstance());
      this.pinnedPlayer = player;
      this.pinnedNPC = this.LookAt(player);
    }
    return this.Collect();
  }

  public func Collect() -> ref<DiagnosticSnapshot> {
    let state = new DiagnosticSnapshot();
    state.epoch = this.epoch;
    state.reason = "no_player";
    state.distance = -1.0;
    state.highLevel = -1;
    let game = this.GetGameInstance();
    let player = GetPlayer(game);
    if !IsDefined(player) || !player.IsAttached() {
      return state;
    }
    let npc = this.LookAt(player);
    state.reason = "no_npc";
    if !IsDefined(npc) || !npc.IsAttached() {
      return state;
    }
    // ID 문자열은 진단 표시 전용이다. 개인 키나 객체 동일성 판정에 쓰지 않는다.
    state.entityID = ToString(npc.GetEntityID());
    state.recordID = TDBID.ToStringDEBUG(npc.GetRecordID());
    state.voice = NpcVoice.Probe(npc);
    state.sameObject = IsDefined(this.pinnedNPC) && IsDefined(this.pinnedPlayer)
      && this.pinnedNPC == npc && this.pinnedPlayer == player;
    state.distance = Vector4.Distance(player.GetWorldPosition(), npc.GetWorldPosition());
    state.dead = player.IsDead() || npc.IsDead();
    state.playerCombat = player.IsInCombat();
    let puppetBB = npc.GetPuppetStateBlackboard();
    if !IsDefined(puppetBB) {
      state.reason = "npc_state_unknown";
      return state;
    }
    state.npcCombat = NPCPuppet.IsInCombat(npc);
    state.npcStateKnown = true;
    let playerBB = player.GetPlayerStateMachineBlackboard();
    let sceneSystem = GameInstance.GetSceneSystem(game);
    if !IsDefined(playerBB) || !IsDefined(sceneSystem) {
      state.reason = "scene_unknown";
      return state;
    }
    let scene = sceneSystem.GetScriptInterface();
    if !IsDefined(scene) {
      state.reason = "scene_unknown";
      return state;
    }
    state.highLevel = playerBB.GetInt(GetAllBlackboardDefs().PlayerStateMachine.HighLevel);
    state.sceneKnown = true;
    state.inScene = scene.IsEntityInScene(npc.GetEntityID())
      || scene.IsEntityInDialogue(npc.GetEntityID())
      || scene.IsEntityInScene(player.GetEntityID())
      || scene.IsEntityInDialogue(player.GetEntityID());
    if state.dead {
      state.reason = "dead";
    } else {
      if state.playerCombat || state.npcCombat {
        state.reason = "combat";
      } else {
        if state.inScene || state.highLevel > 1 || state.highLevel < 0 {
          state.reason = state.inScene ? "original_scene" : "player_state_restricted";
        } else {
          if state.distance > 4.5 {
            state.reason = "too_far";
          } else {
            state.reason = "diagnostic_only";
            state.diagnosticAllowed = true;
          }
        }
      }
    }
    return state;
  }
}
