// Shared coach presence — strip, bubble, content.
// Used across Record / History / AI tabs so the coach feels co-present.

const COACH_MODE_DEFAULT = 'spartan';

const COACHES_SHARED = {
  spartan: { name: 'コーチ・カイザー', tag: 'スパルタ', tone: '#FF6A1A', letter: 'K' },
  gentle:  { name: 'コーチ・ハル',     tag: 'やさしい', tone: '#5BC25B', letter: 'H' },
};

// Read/write coach mode (so all tabs stay in sync, persisted in memory)
const CoachContext = React.createContext({
  mode: COACH_MODE_DEFAULT,
  setMode: () => {},
  coach: COACHES_SHARED[COACH_MODE_DEFAULT],
  trainerName: 'RYOTA',
});

function CoachProvider({ children, initialTrainer = 'RYOTA' }) {
  const [mode, setMode] = React.useState(COACH_MODE_DEFAULT);
  const value = React.useMemo(() => ({
    mode, setMode,
    coach: COACHES_SHARED[mode],
    trainerName: initialTrainer,
  }), [mode, initialTrainer]);
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
        <CoachAvatarShared size={64} tone={coach.tone} letter={coach.letter} pulse />
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
              fontFamily: 'JetBrains Mono', fontSize: 9, color: '#5A6477',
            }}>· {sub}</div>
          )}
        </div>
        <div style={{
          fontSize: 13, lineHeight: 1.55, color: '#E5E9F0',
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
      fontSize: 12, color: '#B5BECF',
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

// Coach commentary content — varies by mode + screen context.
const COACH_LINES = {
  spartan: {
    record_idle:    '今日も来たな。胸の日、追い込め。',
    record_active:  ({ doneSets, totalSets }) => `${doneSets}/${totalSets} セット完了。まだ手を抜くな。`,
    record_done:    'よし、悪くない。だが100kgはまだ遠いぞ。',
    history_summary: '今週 +12.4%。継続してるのは認める。だが満足するな。',
    workout_pr:      '胸 PR、当然の結果だ。次は95kgを取りに行け。',
    workout_normal:  '良いボリューム。プル系が薄いのが気になる。',
    workout_legs:    '脚を逃げてないのは偉い。デッドの重量、上げられる。',
  },
  gentle: {
    record_idle:    'お疲れさまです。今日も一緒に頑張りましょう。',
    record_active:  ({ doneSets, totalSets }) => `${doneSets}/${totalSets} セット、いいペースですよ。`,
    record_done:    '今日もよく頑張りました。明日のためにストレッチを。',
    history_summary: '今週 +12.4%、すごく順調です。継続が一番大事ですよ。',
    workout_pr:      'PR おめでとうございます。記録、ちゃんと残しておきますね。',
    workout_normal:  'バランス良く組めています。次回も同じペースで。',
    workout_legs:    '脚の日、しっかりやれていて立派です。',
  },
};

window.COACHES_SHARED = COACHES_SHARED;
window.CoachContext = CoachContext;
window.CoachProvider = CoachProvider;
window.useCoach = useCoach;
window.CoachAvatarShared = CoachAvatarShared;
window.CoachStrip = CoachStrip;
window.CoachQuote = CoachQuote;
window.COACH_LINES = COACH_LINES;
