module ANPC

// 생성 객체의 약한 참조를 보관한다. 이름·레코드·외형으로 다시 연결하지 않는다.
public class IdentityInstance extends IScriptable {
  public let npc: wref<NPCPuppet>;
  public let token: String;
  public let touchedAt: Float;
}
