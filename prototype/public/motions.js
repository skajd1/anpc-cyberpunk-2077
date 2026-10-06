// AMM 2.12.5 DB(54272353)의 메타데이터. 외부 자산은 패키지에 포함하지 않는다.
export const AMM_MOTIONS = [
  { ref: 'amm_wave', meaning: '서서 짧게 손을 흔듦', name: 'stand__2h_on_sides__01__crowd_wave__01', rigs: ['Man Average', 'Woman Average'] },
  { ref: 'amm_clap', meaning: '서서 기쁘게 박수를 침', name: 'stand__2h_on_sides__01__2h_clap__happy__01', rigs: ['Man Average', 'Woman Average', 'Big'] },
  { ref: 'amm_talk', meaning: '서서 회상하듯 이야기하는 제스처', name: 'stand__lh_crossed_front__01__talk__nostalgic__01', rigs: ['Man Average', 'Woman Average'] }
].map(m => ({ ...m, ent: 'base\\amm_workspots\\entity\\workspot_anim.ent', comp: 'amm_workspot_base' }));
