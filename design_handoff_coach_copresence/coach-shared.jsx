// Shared coach presence — strip, bubble, content.
// Used across Record / History / AI tabs so the coach feels co-present.
// v2.1: spartan/gentle mode toggle removed — one voice per trainer character.
// Mirrors src/lib/coachContext.jsx.

const TRAINER_TAGS = {
  RYOTA: '熱血', YUKI: '穏やか', LEON: '理論派', JADE: 'ストイック',
  NANA: 'クール', HANA: '丁寧', RACHELL: '国際派', TORU: 'ベテラン', BILLY: 'エンタメ',
};

const COACH_ACCENT = '#FF6A1A';

// Trainer-specific lines — mirrors src/lib/trainerLines.js (2026-10-12 rewrite).
// Each key returns candidates for the situation; the app picks one per day (pickDaily).
// Rule: never let a coach describe their own personality; talk about the user's day instead.
const TRAINER_LINES = {
  RYOTA: {
    welcome: ({ daysSince: d, lastExercise: ex }) => {
      if (d === null) return ['いよいよ初日だな！最初の一本、しっかり見てるからな！', 'ここからスタートだ！まずは1種目、全力でいこうぜ！']
      if (d === 0) return ['今日2回目か！？その気合いは買うけど、ケガだけは気をつけろよ！']
      if (d === 1) return ['2日連続か、いいリズムだ！今日は昨日と違う部位を攻めようぜ！', ex && `昨日の${ex}、まだ効いてるか？今日も1セット目から飛ばしていくぞ！`]
      if (d <= 3) return ['ちょうどいい休み明けだ！体は回復してる、今日は重量いけるぞ！', `${d}日ぶりだな！待ってたぞ、今日もやってやろうぜ！`]
      return [`${d}日ぶりか！来てくれただけで十分だ、今日は感覚を取り戻すぞ！`, 'おかえり！まずは軽めから戻していこうな！']
    },
    chat_greeting: ['なんでも聞いてくれ！メニューでもフォームでも答えるぞ！', '今日の調子はどうだ？話したいことがあったら遠慮すんなよ！'],
    history_summary: ({ weekSessions: n }) =>
      n === 0 ? ['今週はまだゼロだ！ここから巻き返すぞ！']
      : n <= 2 ? [`今週${n}回！いい流れだ、もう1回いけるか！？`]
      : [`今週${n}回も来たのか！その積み重ねが体を変えるぞ！`],
    workout: ({ topExercise: t, sets, isLeg }) => isLeg
      ? [`${t}、よく逃げずにやったな！脚の日をやるやつは強くなる！`, `脚の日${sets}セット！明日の階段、覚悟しとけよ！`]
      : [`${t}が今日のメインだな！次はもう1回多くいこう！`, `${sets}セットやり切った！この調子だ！`],
  },
  YUKI: {
    welcome: ({ daysSince: d, lastExercise: ex }) => {
      if (d === null) return ['はじめまして。今日はできる範囲で、ひとつずつ試してみましょうね。', 'ようこそ。最初は重さより、動きに慣れることを大事にしましょう。']
      if (d === 0) return ['今日2回目ですね。疲れが残っていないか、少しだけ気にしておいてくださいね。']
      if (d === 1) return ['昨日に続けて来てくれたんですね。筋肉痛が強いところは、今日はお休みさせてあげましょう。', ex && `昨日の${ex}のあと、体の具合はどうですか？`]
      if (d <= 3) return ['少し間が空いて、体もちょうど回復した頃だと思います。今日もよろしくお願いしますね。', `${d}日ぶりですね。お会いできてうれしいです。`]
      return [`${d}日ぶりですね、おかえりなさい。最初のセットは軽めから様子を見ましょう。`, '戻ってきてくれてうれしいです。今日は体と相談しながら進めましょうね。']
    },
    chat_greeting: ['気になることがあったら、なんでも聞いてくださいね。', '体の具合や、続けるうえでの悩みも、気軽に話してください。'],
    history_summary: ({ weekSessions: n }) =>
      n === 0 ? ['今週はこれからですね。来られる日に、無理なく始めましょう。']
      : n <= 2 ? [`今週は${n}回来られましたね。いいペースですよ。`]
      : [`今週${n}回も。頑張りすぎていないか、それだけ心配です。`],
    workout: ({ topExercise: t, sets, isLeg }) => isLeg
      ? [`脚の日、お疲れさまでした。${t}のあとは、ふくらはぎもほぐしておいてくださいね。`, `${sets}セット、よく頑張りましたね。今夜は湯船に浸かってください。`]
      : [`${t}、丁寧にできていましたね。`, `${sets}セット、お疲れさまでした。水分補給も忘れずに。`],
  },
  LEON: {
    welcome: ({ daysSince: d, lastExercise: ex }) => {
      if (d === null) return ['はじめまして。初回は重量よりフォームの確認を優先しましょう。', 'ようこそ。今日の1回目の数字が、これからの基準点になります。']
      if (d === 0) return ['本日2回目のセッションですね。同じ部位なら、総セット数は抑えめにしましょう。']
      if (d === 1) return ['前回から1日です。同じ部位の回復には48時間ほどかかるので、今日は別の部位が効率的です。', ex && `昨日の${ex}の疲労を考えると、今日は違う筋群を狙うのが合理的です。`]
      if (d <= 3) return [`前回から${d}日。回復は十分なので、重量を2.5kg上げる好機です。`, `${d}日の間隔は理想的です。今日は前回の記録を基準に始めましょう。`]
      return [`${d}日空きました。最初のセットは前回の8割程度の重量から入りましょう。`, `${d}日ぶりですね。この程度の間隔では筋力はほとんど落ちません。安心して再開しましょう。`]
    },
    chat_greeting: ['質問をどうぞ。メニューの組み方から回復まで、根拠と一緒にお答えします。', '前回の記録を見ながら、次の一手を一緒に考えましょう。'],
    history_summary: ({ weekSessions: n }) =>
      n === 0 ? ['今週はまだ記録がありません。週2回あれば筋力は維持できます。']
      : n <= 2 ? [`今週${n}回。頻度としては標準的です。`]
      : [`今週${n}回。筋肥大には十分な頻度です。睡眠時間も確保しましょう。`],
    workout: ({ topExercise: t, sets, isLeg }) => isLeg
      ? [`${t}を含む${sets}セット。下半身は全身で最も大きな筋群です。良い選択です。`, '脚の日の翌日は、軽い有酸素運動を入れると回復が早まります。']
      : [`${t}が主種目ですね。次回は回数を1つ増やすのが目安です。`, `${sets}セット。今日の総量は十分です。`],
  },
  JADE: {
    welcome: ({ daysSince: d, lastExercise: ex }) => {
      if (d === null) return ['初日。まず1セット。', '始めよう。重さは後でいい。']
      if (d === 0) return ['今日2回目。やりすぎない。']
      if (d === 1) return ['連日。部位は変える。', ex && `昨日は${ex}。今日は別。`]
      if (d <= 3) return [`${d}日休んだ。もう動ける。`, '回復は済んだ。上げていく。']
      return [`${d}日ぶり。戻ってきた。それでいい。`, '空いた分は気にしない。今日やる。']
    },
    chat_greeting: ['聞きたいことは？', 'メニューなら組む。言って。'],
    history_summary: ({ weekSessions: n }) =>
      n === 0 ? ['今週ゼロ。今日から。']
      : n <= 2 ? [`今週${n}回。悪くない。`]
      : [`今週${n}回。続けて。`],
    workout: ({ topExercise: t, sets, isLeg }) => isLeg
      ? [`脚、${sets}セット。強くなる。`, `${t}。逃げなかった。`]
      : [`${t}。次は1回多く。`, `${sets}セット。完了。`],
  },
  NANA: {
    welcome: ({ daysSince: d, lastExercise: ex }) => {
      if (d === null) return ['はじめまして。今日は重さより、どこに効いてるか感じながらやってみて。', '最初の一回だね。フォーム、ちゃんと見てるから。']
      if (d === 0) return ['今日もう一回やるの？それなら軽めにしておこうか。']
      if (d === 1) return ['昨日も来てたよね。今日は違うところを使おう。', ex && `昨日の${ex}、どこに効いた？今日はそこを休ませよう。`]
      if (d <= 3) return [`${d}日ぶりだね。ちょうど体が戻ってる頃。`, '間の空け方、上手になってきたね。']
      return [`${d}日空いたね。最初は軽めで、動きを思い出そう。`, '久しぶり。焦らなくていいから、一本ずつね。']
    },
    chat_greeting: ['何か気になってることある？聞くよ。', 'フォームのことでも、メニューのことでも。'],
    history_summary: ({ weekSessions: n }) =>
      n === 0 ? ['今週はまだだね。一回来れば流れはできるよ。']
      : n <= 2 ? [`今週${n}回。ちゃんと続いてるね。`]
      : [`今週${n}回か。体つき、変わってきてると思うよ。`],
    workout: ({ topExercise: t, sets, isLeg }) => isLeg
      ? ['脚をちゃんとやる人は、後ろ姿で分かるよ。', `${t}、最後のほうもしゃがみが深かったね。`]
      : [`${t}、軌道が安定してきたね。`, `${sets}セットか。今日はいい日だったね。`],
  },
  HANA: {
    welcome: ({ daysSince: d, lastExercise: ex }) => {
      if (d === null) return ['はじめまして、わたくしHANAでございます。本日は無理のない重さで、正しい動きを身につけてまいりましょう。', 'ようこそお越しくださいました。最初はフォームの確認から始めさせていただきますね。']
      if (d === 0) return ['本日二度目でございますね。関節への負担が重ならないよう、軽めの内容がよろしいかと存じます。']
      if (d === 1) return ['昨日に続いてのお越し、ありがとうございます。痛みの出ている部位はございませんか。', ex && `昨日の${ex}でお疲れの部位は、本日はお休みさせてあげてくださいませ。`]
      if (d <= 3) return [`${d}日ぶりでございますね。お体の回復には十分な間隔かと存じます。`, 'よい間隔でお越しくださいました。本日もよろしくお願いいたします。']
      return [`${d}日ぶりでございますね。まずはウォームアップを丁寧に行ってまいりましょう。`, 'お戻りをお待ちしておりました。最初のセットは軽めの重さから始めましょう。']
    },
    chat_greeting: ['どのようなことでも、お気軽にお尋ねくださいませ。', 'フォームやお体の不調のご相談も承っております。'],
    history_summary: ({ weekSessions: n }) =>
      n === 0 ? ['今週はまだお見えになっておりませんね。お時間のある日にお待ちしております。']
      : n <= 2 ? [`今週は${n}回お越しいただきました。よいペースでございます。`]
      : [`今週は${n}回も。休養日もきちんとお取りくださいませ。`],
    workout: ({ topExercise: t, sets, isLeg }) => isLeg
      ? [`${t}、膝の向きは崩れておりませんでしたか。お疲れさまでございました。`, '脚の日、お疲れさまでございました。ストレッチもぜひ。']
      : [`${t}、丁寧なお取り組みでございました。`, `${sets}セット、お疲れさまでございました。`],
  },
  RACHELL: {
    welcome: ({ daysSince: d, lastExercise: ex }) => {
      if (d === null) return ['Welcome。最初はフォームの確認からいきましょ。', 'Nice to meet you。今日の記録が、これからのBaselineになるわよ。']
      if (d === 0) return ['今日2回目？ Overtrainingには気をつけてね。']
      if (d === 1) return ['2日連続ね、Good job。今日は昨日と別の部位にしましょ。', ex && `昨日の${ex}のRecoveryはどう？今日は別のところを狙うわよ。`]
      if (d <= 3) return [`${d}日ぶりね。Recoveryは十分、今日は少し重めでいけるわよ。`, 'いいインターバルね。今日は前回より1rep多く狙いましょ。']
      return [`${d}日ぶり、Welcome back。最初の1セットは軽めでWarm upしましょ。`, '久しぶりね。No worries、今日から積み直せばいいのよ。']
    },
    chat_greeting: ['What\'s up？ メニューの相談、なんでもOKよ。', '聞きたいことがあればどうぞ。フォームでも食事でもね。'],
    history_summary: ({ weekSessions: n }) =>
      n === 0 ? ['今週はまだね。One sessionから始めましょ。']
      : n <= 2 ? [`今週${n}回、Nice paceよ。`]
      : [`今週${n}回。この頻度をキープできたら、結果は自然についてくるわ。`],
    workout: ({ topExercise: t, sets, isLeg }) => isLeg
      ? [`Leg dayに${t}、Great choiceね。`, `${sets}セットの脚、Well done。Stretchも忘れずにね。`]
      : [`${t}がメインね。Next timeはRepを1つ足しましょ。`, `${sets}セット、Solidなworkoutだったわ。`],
  },
  TORU: {
    welcome: ({ daysSince: d, lastExercise: ex }) => {
      if (d === null) return ['初めてか。最初の一年は、続けたやつが勝つ。今日はそれだけ覚えとけ。', 'よく来たな。重さは後からいくらでもついてくる。']
      if (d === 0) return ['今日二度目か。若いな。だが疲れは翌日に来るぞ。']
      if (d === 1) return ['昨日も来てたな。同じところは休ませろ。', ex && `昨日の${ex}が残ってるなら、今日は別をやれ。`]
      if (d <= 3) return [`${d}日ぶりか。ちょうどいい間だ。`, 'いい休み方だ。体は休んでる間に強くなる。']
      return [`${d}日ぶりか。何十年やってても、休む時期はある。気にするな。`, '間が空いた日は、一本目を軽くな。それだけ守れば大丈夫だ。']
    },
    chat_greeting: ['聞きたいことがあれば言え。', '迷ってることがあるなら、話してみろ。'],
    history_summary: ({ weekSessions: n }) =>
      n === 0 ? ['今週はまだか。来週もある。']
      : n <= 2 ? [`今週${n}回か。それを一年続けてみろ。`]
      : [`今週${n}回。やりすぎるなよ、続けるのが一番だ。`],
    workout: ({ topExercise: t, sets, isLeg }) => isLeg
      ? ['脚をやったか。年を取ってから効いてくるのは、こういう日だ。', `${t}か。地味だが、一番大事なところだ。`]
      : [`${t}か。悪くない。`, `${sets}セット。今日はそれで十分だ。`],
  },
  BILLY: {
    welcome: ({ daysSince: d, lastExercise: ex }) => {
      if (d === null) return ['YO、ようこそ！初日からガンガン飛ばさなくていいぜ、まずは体を慣らそう！', 'ここからスタートだな！最初のセット、一緒にアゲていこうぜ！']
      if (d === 0) return ['今日2回目！？そのやる気は好きだけど、ほどほどにな！']
      if (d === 1) return ['2日連続だな！今日は別の部位で流れ変えていこうぜ！', ex && `昨日の${ex}、まだ効いてる？今日は別のとこ鳴らそうぜ！`]
      if (d <= 3) return [`${d}日ぶり！体はバッチリ回復してるぜ、今日はガッツリいこう！`, 'いい休み方してるな！今日は1セット目からアゲていこうぜ！']
      return [`YO、${d}日ぶり！おかえり！まずは軽めでリズム取り戻そうぜ！`, '久しぶり！また会えてテンション上がってるぜ！']
    },
    chat_greeting: ['YO！なんでも聞いてくれよ、全力で答えるぜ！', '今日のセットリスト、一緒に組もうぜ！'],
    history_summary: ({ weekSessions: n }) =>
      n === 0 ? ['今週はまだゼロ！ここからがショータイムだぜ！']
      : n <= 2 ? [`今週${n}回！いいビート刻んでるぜ！`]
      : [`今週${n}回！完全に波に乗ってるな！`],
    workout: ({ topExercise: t, sets, isLeg }) => isLeg
      ? [`脚の日に${t}！その脚、ステージ映えするぜ！`, `脚${sets}セット！明日はロボットダンスみたいな歩き方になるぜ！`]
      : [`${t}でガッツリ追い込んだな！`, `${sets}セット！今日のセッション、最高だったぜ！`],
  },
};

// Per-trainer coach identity (tone is the shared brand accent).
const CoachContext = React.createContext({
  coach: { name: 'RYOTA', tag: TRAINER_TAGS.RYOTA, tone: COACH_ACCENT, letter: 'R' },
  trainerName: 'RYOTA',
  lines: TRAINER_LINES.RYOTA,
});

function CoachProvider({ children, initialTrainer = 'RYOTA' }) {
  const value = React.useMemo(() => ({
    coach: {
      name: initialTrainer,
      tag: TRAINER_TAGS[initialTrainer] || 'コーチ',
      tone: COACH_ACCENT,
      letter: initialTrainer[0] || 'C',
    },
    trainerName: initialTrainer,
    lines: TRAINER_LINES[initialTrainer] || TRAINER_LINES.RYOTA,
  }), [initialTrainer]);
  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

function useCoach() {
  return React.useContext(CoachContext);
}

// Avatar: trainer image if provided, else hatch + letter fallback
function CoachAvatarShared({ size = 32, tone, letter, img, pulse = false }) {
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
            fontSize: size * 0.46, color: tone,
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
  );
}

// A horizontal "coach is talking to you" strip, used in Record and History.
function CoachStrip({ message, sub, action, onActionClick, onOpenChat }) {
  const { coach, trainerName } = useCoach();
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'stretch',
      background: '#13171F',
      border: '1px solid #1F242E',
      borderLeft: `3px solid ${coach.tone}`,
      padding: '12px',
      cursor: onOpenChat ? 'pointer' : 'default',
    }} onClick={onOpenChat}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        <CoachAvatarShared size={88} tone={coach.tone} letter={coach.letter} pulse />
        <div style={{
          fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1.5,
          color: coach.tone,
        }}>{coach.tag}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
        }}>
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5,
            color: '#fff',
          }}>{trainerName}</div>
          {sub && (
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: 9, color: '#7A8496',
            }}>· {sub}</div>
          )}
        </div>
        <div style={{
          fontSize: 14, lineHeight: 1.55, color: '#EEF1F6',
          fontWeight: 500,
        }}>{message}</div>
        {action && (
          <div
            onClick={(e) => { e.stopPropagation(); onActionClick && onActionClick(); }}
            style={{
              marginTop: 8,
              fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5,
              color: coach.tone, cursor: 'pointer',
            }}
          >{action} →</div>
        )}
      </div>
    </div>
  );
}

// Small inline quote — used inside history rows.
function CoachQuote({ text }) {
  const { coach } = useCoach();
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      marginTop: 8,
      fontSize: 13, color: '#C3CCDC',
      lineHeight: 1.55,
    }}>
      <CoachAvatarShared size={32} tone={coach.tone} letter={coach.letter} />
      <div style={{
        flex: 1,
        borderLeft: `2px solid ${coach.tone}`,
        paddingLeft: 10, paddingTop: 2,
      }}>「{text}」</div>
    </div>
  );
}

window.TRAINER_TAGS = TRAINER_TAGS;
window.CoachContext = CoachContext;
window.CoachProvider = CoachProvider;
window.useCoach = useCoach;
window.CoachAvatarShared = CoachAvatarShared;
window.CoachStrip = CoachStrip;
window.CoachQuote = CoachQuote;
window.TRAINER_LINES = TRAINER_LINES;
