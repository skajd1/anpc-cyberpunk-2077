module ANPC

// NPC 일본어 음성 3D 재생(개발·검증 계획 6.4.1 설계안 A). Audioware 슬롯 anpc_voice_0~7을 대화 NPC 음원에서 재생한다.
// 슬롯 파일은 로컬 TTS 보조 프로세스가 덮어쓰고, CET 브리지가 구간 순서와 시점을 정한다.
// Audioware가 없으면 VoiceSpatialAvailable()이 false이고 CET는 보조 프로세스 2D 재생을 쓴다.

@addField(Entry)
private let voiceEmitter: EntityID;

@addField(Entry)
private let voiceRegistered: Bool;

@if(ModuleExists("Audioware"))
@addMethod(Entry)
public func VoiceSpatialAvailable() -> Bool { return true; }

@if(!ModuleExists("Audioware"))
@addMethod(Entry)
public func VoiceSpatialAvailable() -> Bool { return false; }

// 재생과 같은 프레임에 등록하면 위치가 잡히지 않을 수 있어 요청 시점에 미리 등록한다.
@if(ModuleExists("Audioware"))
@addMethod(Entry)
public func VoicePrepare(requestId: Int32) -> Bool {
  let session = this.session;
  if !IsDefined(session) || session.latestRequest != requestId { return false; }
  let npc: ref<NPCPuppet> = session.npc;
  if !IsDefined(npc) || !npc.IsAttached() { return false; }
  let id = npc.GetEntityID();
  let ext = GameInstance.GetAudioSystemExt(this.GetGameInstance());
  if !IsDefined(ext) { return false; }
  if this.voiceRegistered && NotEquals(this.voiceEmitter, id) {
    ext.UnregisterEmitter(this.voiceEmitter, n"ANPC");
    this.voiceRegistered = false;
  }
  if !this.voiceRegistered || !ext.IsRegisteredEmitter(id, n"ANPC") {
    this.voiceRegistered = ext.RegisterEmitter(id, n"ANPC", n"ANPC");
    this.voiceEmitter = id;
  }
  return this.voiceRegistered;
}

@if(!ModuleExists("Audioware"))
@addMethod(Entry)
public func VoicePrepare(requestId: Int32) -> Bool { return false; }

@if(ModuleExists("Audioware"))
@addMethod(Entry)
public func VoicePlay(requestId: Int32, slot: Int32) -> Bool {
  let session = this.session;
  if !IsDefined(session) || session.latestRequest != requestId || !this.voiceRegistered { return false; }
  let npc: ref<NPCPuppet> = session.npc;
  if !IsDefined(npc) || NotEquals(npc.GetEntityID(), this.voiceEmitter) { return false; }
  GameInstance.GetAudioSystemExt(this.GetGameInstance())
    .PlayOnEmitter(StringToName("anpc_voice_" + ToString(slot)), this.voiceEmitter, n"ANPC");
  return true;
}

@if(!ModuleExists("Audioware"))
@addMethod(Entry)
public func VoicePlay(requestId: Int32, slot: Int32) -> Bool { return false; }

// 새 입력·대화 종료·초기화: 모든 슬롯을 멈춘다.
@if(ModuleExists("Audioware"))
@addMethod(Entry)
public func VoiceStop() -> Void {
  if !this.voiceRegistered { return; }
  let ext = GameInstance.GetAudioSystemExt(this.GetGameInstance());
  let slot = 0;
  while slot < 8 {
    ext.StopOnEmitter(StringToName("anpc_voice_" + ToString(slot)), this.voiceEmitter, n"ANPC");
    slot += 1;
  }
}

@if(!ModuleExists("Audioware"))
@addMethod(Entry)
public func VoiceStop() -> Void {}

@if(ModuleExists("Audioware"))
@addMethod(Entry)
public func VoiceRelease() -> Void {
  if !this.voiceRegistered { return; }
  this.VoiceStop();
  GameInstance.GetAudioSystemExt(this.GetGameInstance()).UnregisterEmitter(this.voiceEmitter, n"ANPC");
  this.voiceRegistered = false;
}

@if(!ModuleExists("Audioware"))
@addMethod(Entry)
public func VoiceRelease() -> Void {}

// 첫 음성 재생과 함께 자막을 띄운다(음성 출력 규격 4.3). 표시 시간은 글자 수 기준과 예상 음성 길이 중 긴 쪽.
@addMethod(Entry)
public func OnAIVoiceResponse(requestId: Int32, status: String, text: String, voiceSeconds: Float) -> Void {
  let session = this.session;
  if !IsDefined(session) || session.pendingRequest != requestId { return; }
  let npc: ref<NPCPuppet> = session.npc;
  if !StrBeginsWith(status, "ok") || StrLen(text) == 0 || !IsDefined(npc) {
    this.OnAIResponse(requestId, status, text);
    return;
  }
  session.pendingRequest = -1;
  let diagnostics = SceneEntryInstaller.Get();
  if IsDefined(diagnostics) { diagnostics.RecordInput("ai_response #" + ToString(requestId) + " " + status + " voice"); }
  let game = this.GetGameInstance();
  this.HideSubtitles(session);
  let line = this.NextSubtitleId();
  let duration = MinF(30.0, MaxF(AnpcSubtitles.Duration(text), voiceSeconds + 0.3));
  AnpcVoiceSubtitles.Show(game, line, npc, session.name, text, duration);
  ArrayPush(session.subtitles, line);
  this.ScheduleSubtitle(game, AnpcSubtitleCallback.Hide(), line, duration);
  let next = Equals(status, "ok:end") ? AnpcSubtitleCallback.EndAfter() : AnpcSubtitleCallback.Reopen();
  this.ScheduleSubtitle(game, next, line, duration + 0.3);
}

public abstract class AnpcVoiceSubtitles {
  public static func Show(game: GameInstance, id: CRUID, speaker: ref<GameObject>, speakerName: String, text: String, duration: Float) -> Void {
    let line: scnDialogLineData;
    line.id = id;
    line.text = text;
    line.type = scnDialogLineType.Regular;
    line.speaker = speaker;
    line.speakerName = speakerName;
    line.isPersistent = false;
    line.duration = duration;
    let lines: array<scnDialogLineData>;
    ArrayPush(lines, line);
    GameInstance.GetBlackboardSystem(game).Get(GetAllBlackboardDefs().UIGameData)
      .SetVariant(GetAllBlackboardDefs().UIGameData.ShowDialogLine, ToVariant(lines), true);
  }
}
