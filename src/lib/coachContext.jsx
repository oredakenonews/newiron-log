import { createContext, useContext, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'

// v2.1: スパルタ/やさしいのモード切替は廃止（TestFlightフィードバック: 切替で別人格になる）。
// トレーナーキャラクター本来の性格一本で統一する。

const TRAINER_IMAGES = {
  RYOTA:   '/gazou/ryota_bu.png',
  DAIKI:   '/gazou/daiki_bu.png',
  YUKI:    '/gazou/yuki_bu.png',
  KENJI:   '/gazou/kenji_bu.png',
  NANA:    '/gazou/nana_bu.png',
  HANA:    '/gazou/hana_bu.png',
  RACHELL: '/gazou/rachell_bu.png',
  TORU:    '/gazou/toru_bu.png',
  BILLY:   '/gazou/billybu.png',
}

const TRAINER_TAGS = {
  RYOTA: '熱血', YUKI: '穏やか', DAIKI: '理論派', KENJI: 'ストイック',
  NANA: 'ポジティブ', HANA: '丁寧', RACHELL: '国際派', TORU: 'ベテラン', BILLY: 'エンタメ',
}

const ACCENT = '#FF6A1A'

// トレーナー別セリフ（キャラ本来の口調・強度で1セット）
export const TRAINER_LINES = {
  RYOTA: {
    record_idle:     '来たな！今日も限界の一歩先まで行くぞ！',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット！いいぞ、まだ止まるな！`,
    record_done:     '全セット完了！よくやった！明日はもっと行けるぞ！',
    history_summary: '今週も走り切ったな！この勢い、止めるなよ！',
    workout_pr:      'PR更新！見たか！積み重ねは裏切らないぞ！',
    workout_normal:  'いいボリュームだ！次はプル系ももっと攻めるぞ！',
    workout_legs:    '脚から逃げなかったな！それでこそ俺の相棒だ！',
  },
  YUKI: {
    record_idle:     'お疲れさまです。今日もわたしと一緒に、ゆっくりいきましょう。',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット、いいペースですよ。呼吸を忘れずに。`,
    record_done:     '今日もよく頑張りました。体をいたわってあげてくださいね。',
    history_summary: '今週もお疲れさまでした。続けられていること、本当にすごいですよ。',
    workout_pr:      '記録更新、おめでとうございます。体の声も聞きながらいきましょうね。',
    workout_normal:  'バランスの良いトレーニングでした。この調子で大丈夫ですよ。',
    workout_legs:    '脚の日、よく頑張りましたね。今夜はしっかり休んでください。',
  },
  DAIKI: {
    record_idle:     'ようこそ。今日も記録を積み上げよう。データは裏切らない。',
    record_active:   ({ doneSets, totalSets }) => `進捗${doneSets}/${totalSets}。良いペース配分だ。`,
    record_done:     '全セット完了。データ上、次回は負荷を上げるタイミングだ。',
    history_summary: '今週も良いデータが取れた。継続こそ最大の変数だ。',
    workout_pr:      'PR更新。トレーニング設計が機能している証拠だ。',
    workout_normal:  '総量は妥当。プル系の比率を上げると均衡が取れる。',
    workout_legs:    '脚のボリュームを確保できている。合理的な判断だ。',
  },
  KENJI: {
    record_idle:     '来たか。やるぞ。',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}。続けろ。`,
    record_done:     '完了。悪くない。',
    history_summary: '継続は認める。以上だ。',
    workout_pr:      'PR。次だ。',
    workout_normal:  '量は足りてる。質を上げろ。',
    workout_legs:    '脚、逃げなかったな。良い。',
  },
  NANA: {
    record_idle:     '今日も来てくれて嬉しい！全力でいこー！',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット！そのペース、すっごくいいよ！`,
    record_done:     '全クリア！最高！自分にごほうびあげてね！',
    history_summary: '今週も続けられたね！それが一番すごいこと！',
    workout_pr:      'PR更新きたー！努力はちゃんと数字に出るんだよ！',
    workout_normal:  'いい感じ！背中ももっと攻めると最強になれるよ！',
    workout_legs:    '脚の日ちゃんとやってえらい！それ、一番強いやつ！',
  },
  HANA: {
    record_idle:     'ようこそお越しくださいました。本日もご一緒できて嬉しいです。',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セットでございます。とても良いペースですよ。`,
    record_done:     '本日もお疲れさまでございました。ストレッチもお忘れなく。',
    history_summary: '今週もよく続けられました。お体を大切になさってくださいね。',
    workout_pr:      '記録更新おめでとうございます。正しい努力の成果でございます。',
    workout_normal:  'バランスの取れた内容でございます。この調子でまいりましょう。',
    workout_legs:    '脚の日、お疲れさまでした。今夜はゆっくりお休みください。',
  },
  RACHELL: {
    record_idle:     'Hi！今日もトレーニングの時間よ。一緒にPushしていきましょ。',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets} sets done。Nice pace、その調子！`,
    record_done:     'All sets cleared！Well done、Recoveryも大切にしてね。',
    history_summary: 'Great consistency！継続できてるのがAmazingよ。',
    workout_pr:      "New PR！That's what I'm talking about！",
    workout_normal:  'Good volume。Pull系を足せばPerfectね。',
    workout_legs:    'Leg dayから逃げない、それがChampion mindsetよ。',
  },
  TORU: {
    record_idle:     'よく来たな。今日の一回一回が、半年後の体を作るんだ。',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット。いいペースだ、丁寧にいこう。`,
    record_done:     '今日も積めたな。継続できる奴が最後に勝つんだ。',
    history_summary: '今週もコツコツやれたな。それが一番難しくて、一番偉い。',
    workout_pr:      'PRおめでとう。体は正直だ、やった分だけ返してくる。',
    workout_normal:  '悪くない組み方だ。背中はもう少し効かせられるな。',
    workout_legs:    '脚をやる奴は伸びる。昔から変わらん真理だ。',
  },
  BILLY: {
    record_idle:     'YO！今日も来たな！限界までBURNしようぜ、FIRE！',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット！いいFLOWだぜ、その調子！`,
    record_done:     'ALL CLEAR！お前のGROOVE、最高にFIREだったぜ！',
    history_summary: '今週もフルスロットル！このBEAT、止めんじゃねーぞ！',
    workout_pr:      'PR更新！YOU ARE ON FIRE！会場沸いてるぜ！',
    workout_normal:  'ナイスVOLUME！背中も鳴らせばもっとアガるぜ！',
    workout_legs:    'LEG DAYから逃げないお前、マジRESPECTだ！',
  },
}

const CoachContext = createContext({
  coach: { name: 'RYOTA', tag: TRAINER_TAGS.RYOTA, tone: ACCENT, letter: 'R' },
  trainerImg: TRAINER_IMAGES.RYOTA,
  trainerName: 'RYOTA',
  lines: TRAINER_LINES.RYOTA,
})

export function CoachProvider({ children }) {
  const { profile } = useAuth()

  const trainerName = profile?.trainer_character || 'RYOTA'
  const trainerImg = TRAINER_IMAGES[trainerName] ?? TRAINER_IMAGES.RYOTA

  const value = useMemo(() => ({
    coach: {
      name: trainerName,
      tag: TRAINER_TAGS[trainerName] ?? 'コーチ',
      tone: ACCENT,
      letter: trainerName[0] || 'C',
    },
    trainerImg,
    trainerName,
    lines: TRAINER_LINES[trainerName] ?? TRAINER_LINES.RYOTA,
  }), [trainerImg, trainerName])

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
}

export function useCoach() {
  return useContext(CoachContext)
}

export function CoachAvatarShared({ size = 32, tone, letter, img, pulse = false }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: 'var(--bg-deep)', border: '1px solid var(--border)',
      position: 'relative', overflow: 'hidden',
    }}>
      {img ? (
        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      ) : (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: `repeating-linear-gradient(45deg, transparent 0 6px, ${tone}22 6px 7px)`,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Oswald', fontWeight: 700,
            fontSize: Math.round(size * 0.46), color: tone,
          }}>{letter}</div>
        </>
      )}
      {pulse && (
        <div style={{
          position: 'absolute', right: 2, bottom: 2,
          width: 6, height: 6, borderRadius: 3, background: '#5BC25B',
          boxShadow: '0 0 0 1px var(--card)',
        }} />
      )}
    </div>
  )
}

export function CoachStrip({ message, sub, action, onOpenChat }) {
  const { coach, trainerImg, trainerName } = useCoach()
  return (
    <div
      style={{
        display: 'flex', gap: 12, alignItems: 'stretch',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderLeft: `3px solid ${coach.tone}`,
        padding: '12px',
        cursor: onOpenChat ? 'pointer' : 'default',
      }}
      onClick={onOpenChat}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <CoachAvatarShared size={88} tone={coach.tone} letter={coach.letter} img={trainerImg} pulse />
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1.5, color: coach.tone }}>{coach.tag}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: 'var(--text-strong)' }}>{trainerName}</div>
          {sub && <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>· {sub}</div>}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text)', fontWeight: 500 }}>{message}</div>
        {action && (
          <div
            onClick={e => { e.stopPropagation(); onOpenChat?.() }}
            style={{ marginTop: 8, fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, color: coach.tone, cursor: 'pointer' }}
          >{action} →</div>
        )}
      </div>
    </div>
  )
}

export function CoachQuote({ text }) {
  const { coach, trainerImg } = useCoach()
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      marginTop: 8, fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55,
    }}>
      <CoachAvatarShared size={32} tone={coach.tone} letter={coach.letter} img={trainerImg} />
      <div style={{ flex: 1, borderLeft: `2px solid ${coach.tone}`, paddingLeft: 10, paddingTop: 2 }}>
        「{text}」
      </div>
    </div>
  )
}
