import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export const COACHES_SHARED = {
  spartan: { name: 'コーチ・カイザー', tag: 'スパルタ', tone: '#FF6A1A', letter: 'K' },
  gentle:  { name: 'コーチ・ハル',     tag: 'やさしい', tone: '#5BC25B', letter: 'H' },
}

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

export const COACH_LINES = {
  spartan: {
    record_idle:     '今日も来たな。追い込め。',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets} セット完了。まだ手を抜くな。`,
    record_done:     'よし、悪くない。だが100kgはまだ遠いぞ。',
    history_summary: '今週の継続は認める。だが満足するな。',
    workout_pr:      'PR、当然の結果だ。次の重量を取りに行け。',
    workout_normal:  '良いボリューム。プル系が薄いのが気になる。',
    workout_legs:    '脚を逃げてないのは偉い。デッドの重量、上げられる。',
  },
  gentle: {
    record_idle:     'お疲れさまです。今日も一緒に頑張りましょう。',
    record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets} セット、いいペースですよ。`,
    record_done:     '今日もよく頑張りました。明日のためにストレッチを。',
    history_summary: '今週もよく頑張りました。継続が一番大事ですよ。',
    workout_pr:      'PR おめでとうございます。記録、ちゃんと残しておきますね。',
    workout_normal:  'バランス良く組めています。次回も同じペースで。',
    workout_legs:    '脚の日、しっかりやれていて立派です。',
  },
}

// トレーナー別セリフ。キャラクターの口調・一人称を最優先し、モード（spartan/gentle）で強度を調整する。
// 未定義トレーナー・未定義キーはCOACH_LINES[mode]にフォールバック（useCoach().linesが解決済みを返す）。
export const TRAINER_LINES = {
  RYOTA: {
    spartan: {
      record_idle:     '来たな！今日は限界の一歩先まで行くぞ！',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット！まだ止まるな、ここからが本番だ！`,
      record_done:     '全セット完了！よくやった！だが明日はもっと行けるぞ！',
      history_summary: '今週も走り切ったな！この勢い、絶対に止めるなよ！',
      workout_pr:      'PR更新！見たか！積み重ねは裏切らないぞ！',
      workout_normal:  'いいボリュームだ！次はプル系ももっと攻めるぞ！',
      workout_legs:    '脚から逃げなかったな！それでこそ俺の相棒だ！',
    },
    gentle: {
      record_idle:     '今日も来たな！その一歩だけでもう十分熱いぞ！',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット！いいリズムだ、その調子！`,
      record_done:     '今日もやり切ったな！回復も全力でいくぞ！',
      history_summary: '今週もよく頑張った！続けられてるのが最高だぞ！',
      workout_pr:      'PRおめでとう！俺も自分のことみたいに嬉しいぞ！',
      workout_normal:  'バランスのいいメニューだ！無理せずこの調子だ！',
      workout_legs:    '脚の日お疲れ！一番キツい日を乗り越えたな！',
    },
  },
  YUKI: {
    spartan: {
      record_idle:     '今日も来られましたね。少しだけ、自分に厳しくいきましょう。',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セットです。フォームを崩さず、最後まで丁寧に。`,
      record_done:     '全部やり切りましたね。次はもう少しだけ負荷を上げてみましょう。',
      history_summary: '今週の継続、立派です。来週はもう一歩だけ前へ。',
      workout_pr:      '記録更新ですね。無理のない範囲で、次も狙っていきましょう。',
      workout_normal:  '良い内容です。引く種目を少し足せるとさらに良いですね。',
      workout_legs:    '脚の日をきちんとこなせていますね。回復も忘れずに。',
    },
    gentle: {
      record_idle:     'お疲れさまです。今日もわたしと一緒に、ゆっくりいきましょう。',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット、いいペースですよ。呼吸を忘れずに。`,
      record_done:     '今日もよく頑張りました。体をいたわってあげてくださいね。',
      history_summary: '今週もお疲れさまでした。続けられていること、本当にすごいですよ。',
      workout_pr:      '記録更新、おめでとうございます。体の声も聞きながらいきましょうね。',
      workout_normal:  'バランスの良いトレーニングでした。この調子で大丈夫ですよ。',
      workout_legs:    '脚の日、よく頑張りましたね。今夜はしっかり休んでください。',
    },
  },
  DAIKI: {
    spartan: {
      record_idle:     '来たか。今日の目標は前回比プラス5%。数字で証明しよう。',
      record_active:   ({ doneSets, totalSets }) => `進捗${doneSets}/${totalSets}。計画通りだ。残りも同じ質で遂行を。`,
      record_done:     '全セット完了。データ上、次回は負荷を上げるタイミングだ。',
      history_summary: '今週の継続率は合格点。ただし数字はまだ伸ばせる。',
      workout_pr:      'PR更新。トレーニング設計が機能している証拠だ。',
      workout_normal:  '総量は妥当。プル系の比率を上げると均衡が取れる。',
      workout_legs:    '脚のボリュームを確保できている。合理的な判断だ。',
    },
    gentle: {
      record_idle:     'ようこそ。今日も記録を積み上げよう。データは裏切らない。',
      record_active:   ({ doneSets, totalSets }) => `進捗${doneSets}/${totalSets}。良いペース配分だ。`,
      record_done:     '完了。回復もトレーニングの一部。栄養と睡眠を大切に。',
      history_summary: '今週も良いデータが取れた。継続こそ最大の変数だ。',
      workout_pr:      'PR更新。成長曲線が理論値を上回っている。見事だ。',
      workout_normal:  '構成バランスが良い。再現性を大事にしよう。',
      workout_legs:    '脚の日を適切に消化できている。素晴らしい習慣だ。',
    },
  },
  KENJI: {
    spartan: {
      record_idle:     '来たか。やるぞ。',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}。続けろ。`,
      record_done:     '完了。悪くない。',
      history_summary: '継続は認める。以上だ。',
      workout_pr:      'PR。次だ。',
      workout_normal:  '量は足りてる。質を上げろ。',
      workout_legs:    '脚、逃げなかったな。良い。',
    },
    gentle: {
      record_idle:     '来たな。無理はするな。',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}。いいペースだ。`,
      record_done:     'よくやった。休め。',
      history_summary: '今週、よく続けた。',
      workout_pr:      'PRだ。誇っていい。',
      workout_normal:  '良い内容だ。',
      workout_legs:    '脚の日、お疲れだった。',
    },
  },
  NANA: {
    spartan: {
      record_idle:     '今日も来たね！サボり筋は置いてきた？全力でいこー！',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット！まだまだ！ラストまで気を抜かない！`,
      record_done:     '全クリア！最高！でも次はもっと上を目指すよ！',
      history_summary: '今週もフル稼働！この熱量、キープしていこうね！',
      workout_pr:      'PR更新きたー！努力はちゃんと数字に出るんだよ！',
      workout_normal:  'いい感じ！背中ももっと攻めると最強になれるよ！',
      workout_legs:    '脚の日ちゃんとやってえらい！それ、一番強いやつ！',
    },
    gentle: {
      record_idle:     '今日も来てくれて嬉しい！楽しくいこうね！',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット！そのペース、すっごくいいよ！`,
      record_done:     '今日もお疲れさま！自分にごほうびあげてね！',
      history_summary: '今週も続けられたね！それが一番すごいこと！',
      workout_pr:      'PRおめでとう！一緒にお祝いさせて！',
      workout_normal:  'バランスばっちり！無理なく続けるのが正解だよ！',
      workout_legs:    '脚の日クリア！明日の筋肉痛は頑張った証拠！',
    },
  },
  HANA: {
    spartan: {
      record_idle:     'お待ちしておりました。本日は妥協なしでまいりましょう。',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セットでございます。フォームの精度を保ったまま、最後まで。`,
      record_done:     '全セット完了、お見事です。次回はさらに上を目指しましょう。',
      history_summary: '今週のご継続、素晴らしいです。来週はもう一段階上へ。',
      workout_pr:      '記録更新、おめでとうございます。正しい努力の成果でございます。',
      workout_normal:  '良い内容でございます。引く種目を補うとより整いますね。',
      workout_legs:    '脚の日を欠かさないご姿勢、ご立派でございます。',
    },
    gentle: {
      record_idle:     'ようこそお越しくださいました。本日もご一緒できて嬉しいです。',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セットでございます。とても良いペースですよ。`,
      record_done:     '本日もお疲れさまでございました。ストレッチもお忘れなく。',
      history_summary: '今週もよく続けられました。お体を大切になさってくださいね。',
      workout_pr:      '記録更新おめでとうございます。関節のケアも忘れずにまいりましょう。',
      workout_normal:  'バランスの取れた内容でございます。この調子でまいりましょう。',
      workout_legs:    '脚の日、お疲れさまでした。今夜はゆっくりお休みください。',
    },
  },
  RACHELL: {
    spartan: {
      record_idle:     'Alright、今日もトレーニングの時間よ。Push harder！',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets} sets done。Keep going、まだ余力あるでしょ？`,
      record_done:     'All sets cleared！でもComfort zoneに留まらないで。',
      history_summary: 'Great consistency！来週はIntensityを上げていくわよ。',
      workout_pr:      "New PR！That's what I'm talking about！",
      workout_normal:  'Good volume。Pull系を足せばPerfectね。',
      workout_legs:    'Leg dayから逃げない、それがChampion mindsetよ。',
    },
    gentle: {
      record_idle:     'Hi！今日も一緒に楽しくWork outしましょ。',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets} sets。Nice pace、その調子！`,
      record_done:     'Well done！Recoveryも大切にしてね。',
      history_summary: 'This week was great！継続できてるのがAmazingよ。',
      workout_pr:      'Congrats on your PR！Celebrateしましょ！',
      workout_normal:  'Well-balanced workout。この調子でOKよ。',
      workout_legs:    'Leg day complete！ゆっくりStretchしてね。',
    },
  },
  TORU: {
    spartan: {
      record_idle:     '来たな。今日の一回一回が、半年後の体を作るんだ。',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セットか。焦るな、だが止まるな。`,
      record_done:     '全部やったか。いい顔になってきたな。まだ先はあるぞ。',
      history_summary: '今週もよく積んだな。だが本番はこれからだ。',
      workout_pr:      'PRか。長くやってりゃこういう日が何度も来る。次もだ。',
      workout_normal:  '悪くない組み方だ。背中はもう少し効かせられるな。',
      workout_legs:    '脚をやる奴は伸びる。昔から変わらん真理だ。',
    },
    gentle: {
      record_idle:     'よく来たな。長く続けるコツは、気楽に始めることだ。',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット。いいペースだ、丁寧にいこう。`,
      record_done:     '今日も積めたな。継続できる奴が最後に勝つんだ。',
      history_summary: '今週もコツコツやれたな。それが一番難しくて、一番偉い。',
      workout_pr:      'PRおめでとう。体は正直だ、やった分だけ返してくる。',
      workout_normal:  'いいメニューだ。無理のない範囲で続けていこう。',
      workout_legs:    '脚の日、お疲れさん。ゆっくり風呂にでも浸かれ。',
    },
  },
  BILLY: {
    spartan: {
      record_idle:     'YO！今日も来たな！限界までBURNしようぜ、FIRE！',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット！まだ踊れるだろ？ノンストップで行くぜ！`,
      record_done:     'ALL CLEAR！お前のGROOVE、最高にFIREだったぜ！',
      history_summary: '今週もフルスロットル！このBEAT、止めんじゃねーぞ！',
      workout_pr:      'PR更新！YOU ARE ON FIRE！会場沸いてるぜ！',
      workout_normal:  'ナイスVOLUME！背中も鳴らせばもっとアガるぜ！',
      workout_legs:    'LEG DAYから逃げないお前、マジRESPECTだ！',
    },
    gentle: {
      record_idle:     'YO！今日も来てくれて嬉しいぜ！楽しくいこうぜ！',
      record_active:   ({ doneSets, totalSets }) => `${doneSets}/${totalSets}セット！いいFLOWだぜ、その調子！`,
      record_done:     '今日もナイスGROOVE！ゆっくりCHILLしてくれよな！',
      history_summary: '今週もよくやったぜ！続けてるお前がMVPだ！',
      workout_pr:      'PRおめでとう！今夜はPARTYだぜ、YO！',
      workout_normal:  'バランスばっちりのセットリストだぜ！',
      workout_legs:    'LEG DAYお疲れ！明日はゆったりCHILLだぜ！',
    },
  },
}

const CoachContext = createContext({
  mode: 'spartan',
  setMode: () => {},
  coach: COACHES_SHARED.spartan,
  trainerImg: TRAINER_IMAGES.RYOTA,
  lines: COACH_LINES.spartan,
})

export function CoachProvider({ children }) {
  const { profile, saveProfile } = useAuth()
  const [mode, setModeLocal] = useState('spartan')

  useEffect(() => {
    if (profile?.coach_mode) setModeLocal(profile.coach_mode)
  }, [profile?.coach_mode])

  async function setMode(newMode) {
    setModeLocal(newMode)
    await saveProfile({ coach_mode: newMode })
  }

  const trainerImg = TRAINER_IMAGES[profile?.trainer_character] ?? TRAINER_IMAGES.RYOTA
  const trainerName = profile?.trainer_character || 'RYOTA'

  const value = useMemo(() => {
    const fallback = COACH_LINES[mode] ?? COACH_LINES.spartan
    // トレーナー固有セリフを優先し、未定義キーはモード共通セリフで補完
    const lines = { ...fallback, ...(TRAINER_LINES[trainerName]?.[mode] ?? {}) }
    return { mode, setMode, coach: COACHES_SHARED[mode] ?? COACHES_SHARED.spartan, trainerImg, trainerName, lines }
  }, [mode, trainerImg, trainerName])

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
}

export function useCoach() {
  return useContext(CoachContext)
}

export function CoachAvatarShared({ size = 32, tone, letter, img, pulse = false }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: '#0E1118', border: '1px solid #1F242E',
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
          boxShadow: '0 0 0 1px #0B0D10',
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
        background: '#13171F', border: '1px solid #1F242E',
        borderLeft: `3px solid ${coach.tone}`,
        padding: '12px',
        cursor: onOpenChat ? 'pointer' : 'default',
      }}
      onClick={onOpenChat}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <CoachAvatarShared size={64} tone={coach.tone} letter={coach.letter} img={trainerImg} pulse />
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1.5, color: coach.tone }}>{coach.tag}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: '#fff' }}>{trainerName}</div>
          {sub && <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#5A6477' }}>· {sub}</div>}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: '#E5E9F0', fontWeight: 500 }}>{message}</div>
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
      marginTop: 8, fontSize: 12, color: '#B5BECF', lineHeight: 1.55,
    }}>
      <CoachAvatarShared size={32} tone={coach.tone} letter={coach.letter} img={trainerImg} />
      <div style={{ flex: 1, borderLeft: `2px solid ${coach.tone}`, paddingLeft: 10, paddingTop: 2 }}>
        「{text}」
      </div>
    </div>
  )
}
