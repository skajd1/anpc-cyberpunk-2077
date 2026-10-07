module ANPC
@if(ModuleExists("Audioware"))
import Audioware.*

// NPC 일본어 음성 3D 재생(개발·검증 계획 6.4.1 설계안 A). Audioware 슬롯 anpc_voice_0~7을 대화 NPC 음원에서 재생한다.
// 슬롯 파일은 로컬 TTS 보조 프로세스가 덮어쓰고, CET 브리지가 구간 순서와 시점을 정한다.
// Audioware 참조는 AnpcAudioware의 조건부 static 함수에만 둔다. Entry의 음성 메서드는 Entry.reds에 있다(같은 모듈 클래스에는 @addMethod 불가).
// Audioware가 없으면 VoiceSpatialAvailable()이 false이고 CET는 보조 프로세스 2D 재생을 쓴다.

public abstract class AnpcAudioware {
  @if(ModuleExists("Audioware"))
  public static func Available() -> Bool { return true; }

  @if(!ModuleExists("Audioware"))
  public static func Available() -> Bool { return false; }

  @if(ModuleExists("Audioware"))
  public static func IsRegistered(game: GameInstance, id: EntityID) -> Bool {
    let ext = GameInstance.GetAudioSystemExt(game);
    return IsDefined(ext) && ext.IsRegisteredEmitter(id, n"ANPC");
  }

  @if(!ModuleExists("Audioware"))
  public static func IsRegistered(game: GameInstance, id: EntityID) -> Bool { return false; }

  @if(ModuleExists("Audioware"))
  public static func Register(game: GameInstance, id: EntityID) -> Bool {
    let ext = GameInstance.GetAudioSystemExt(game);
    if !IsDefined(ext) { return false; }
    // 원작 음성처럼 실내·실외 환경 효과와 가림(벽 뒤 소리 감쇠)을 받는다. 잔향 믹스는 기본값(켜짐).
    let settings = new EmitterSettings();
    settings.affectedByEnvironmentalPreset = true;
    settings.enableOcclusion = true;
    return ext.RegisterEmitter(id, n"ANPC", n"ANPC", settings);
  }

  @if(!ModuleExists("Audioware"))
  public static func Register(game: GameInstance, id: EntityID) -> Bool { return false; }

  @if(ModuleExists("Audioware"))
  public static func Unregister(game: GameInstance, id: EntityID) -> Void {
    let ext = GameInstance.GetAudioSystemExt(game);
    if IsDefined(ext) { ext.UnregisterEmitter(id, n"ANPC"); }
  }

  @if(!ModuleExists("Audioware"))
  public static func Unregister(game: GameInstance, id: EntityID) -> Void {}

  @if(ModuleExists("Audioware"))
  public static func Play(game: GameInstance, id: EntityID, slot: Int32, volume: Float) -> Bool {
    let ext = GameInstance.GetAudioSystemExt(game);
    if !IsDefined(ext) { return false; }
    let audio = new AudioSettingsExt();
    audio.volume = volume;
    ext.PlayOnEmitter(StringToName("anpc_voice_" + ToString(slot)), id, n"ANPC", audio);
    return true;
  }

  @if(!ModuleExists("Audioware"))
  public static func Play(game: GameInstance, id: EntityID, slot: Int32, volume: Float) -> Bool { return false; }

  @if(ModuleExists("Audioware"))
  public static func Stop(game: GameInstance, id: EntityID, slot: Int32) -> Void {
    let ext = GameInstance.GetAudioSystemExt(game);
    if IsDefined(ext) { ext.StopOnEmitter(StringToName("anpc_voice_" + ToString(slot)), id, n"ANPC"); }
  }

  @if(!ModuleExists("Audioware"))
  public static func Stop(game: GameInstance, id: EntityID, slot: Int32) -> Void {}
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
