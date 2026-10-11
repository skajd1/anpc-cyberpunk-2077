// AMM 2.12.5 DB(54272353)의 메타데이터. 외부 자산은 패키지에 포함하지 않는다.
// rigs는 DB에서 해당 동작이 등록된 체형 중 어댑터가 지원하는 Man Average·Woman Average·Big만 둔다.
// meaning은 AI가 대사에 맞는 동작을 고르는 설명이다. 실게임 재생 확인 전 후보다(행동 규격 5절).
const M = ['Man Average', 'Woman Average'], MB = ['Man Average', 'Woman Average', 'Big'];
export const AMM_MOTIONS = [
  { ref: 'amm_wave', meaning: '서서 짧게 손을 흔듦', name: 'stand__2h_on_sides__01__crowd_wave__01', rigs: M },
  { ref: 'amm_clap', meaning: '서서 기쁘게 박수를 침', name: 'stand__2h_on_sides__01__2h_clap__happy__01', rigs: MB },
  { ref: 'amm_talk', meaning: '서서 회상하듯 이야기하는 제스처', name: 'stand__lh_crossed_front__01__talk__nostalgic__01', rigs: M },
  { ref: 'amm_nod', meaning: '고개를 끄덕이며 수긍함', name: 'stand__2h_on_hip__01__yes__neutral__01', rigs: MB },
  { ref: 'amm_head_shake', meaning: '고개를 저으며 부정함', name: 'stand__2h_on_sides__01__no__head__01', rigs: MB },
  { ref: 'amm_refuse_angry', meaning: '화를 내며 손을 저어 거절함', name: 'stand__2h_on_hip__01__no__angry__01', rigs: MB },
  { ref: 'amm_shrug', meaning: '어깨를 으쓱함(모르겠다·어쩔 수 없다)', name: 'stand__2h_on_hip__01__shrug__01', rigs: MB },
  { ref: 'amm_calm_down', meaning: '웃으며 진정하라는 손짓', name: 'stand__2h_on_sides__01__calm_down__happy__01', rigs: MB },
  { ref: 'amm_calm_down_tense', meaning: '긴장한 채 두 손을 들어 말림', name: 'stand__2h_on_sides__01__calm_down__afraid__01', rigs: MB },
  { ref: 'amm_go_away', meaning: '짜증 내며 저리 가라고 손짓함', name: 'stand__2h_on_hip__01__go_away__angry__01', rigs: MB },
  { ref: 'amm_what', meaning: '놀라서 "뭐?" 하고 되묻는 손짓', name: 'stand__2h_on_hip__01__what__surprised__01', rigs: MB },
  { ref: 'amm_whatever', meaning: '웃으며 됐다는 듯 손을 내저음', name: 'stand__2h_on_hip__01__whatever__happy__01', rigs: MB },
  { ref: 'amm_explain', meaning: '손짓하며 차분히 설명함', name: 'stand__2h_on_hip__01__talk__neutral__01', rigs: MB },
  { ref: 'amm_facepalm', meaning: '이마를 짚으며 어이없어함', name: 'stand__2h_on_sides__01__facepalm__01', rigs: MB },
  { ref: 'amm_thumb_up', meaning: '엄지를 들어 좋다고 함', name: 'stand__2h_on_sides__01__thumb_up__neutral__01', rigs: MB },
  { ref: 'amm_sigh', meaning: '한숨을 쉼(지침·체념)', name: 'stand__2h_on_sides__01__sigh__01', rigs: MB },
  { ref: 'amm_scratch_neck', meaning: '목을 긁으며 머뭇거림', name: 'stand__2h_on_sides__01__scratch_neck__01', rigs: MB },
  { ref: 'amm_cheer', meaning: '두 팔을 들어 환호함', name: 'stand__2h_on_sides__01__cheer__01', rigs: M }
].map(m => ({ ...m, ent: 'base\\amm_workspots\\entity\\workspot_anim.ent', comp: 'amm_workspot_base' }));
