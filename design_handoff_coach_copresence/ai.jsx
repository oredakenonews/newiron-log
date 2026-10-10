// AIトレーナー画面 — Coach feed (conversational, side-by-side, low-pressure)
const { useState: useAIState, useEffect: useAIEffect } = React;

function ModePill() {
  const { mode, setMode, coach } = useCoach();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: '#0E1118', border: '1px solid #1F242E',
      padding: 3,
    }}>
      {[
        { id: 'spartan', label: 'スパルタ' },
        { id: 'gentle',  label: 'やさしい' },
      ].map(opt => {
        const active = mode === opt.id;
        const tone = COACHES_SHARED[opt.id].tone;
        return (
          <button
            key={opt.id}
            onClick={() => setMode(opt.id)}
            style={{
              background: active ? tone : 'transparent',
              border: 'none',
              color: active ? '#0B0D10' : '#8693AA',
              fontFamily: '"Noto Sans JP", system-ui',
              fontWeight: 700, fontSize: 11,
              padding: '5px 9px', cursor: 'pointer',
            }}
          >{opt.label}</button>
        );
      })}
    </div>
  );
}

// One coach-spoken row in the feed (like reading a journal entry from the coach)
function FeedTurn({ icon, label, message, metric, unit, accent, big, onAsk }) {
  const { coach } = useCoach();
  return (
    <div style={{
      display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start',
    }}>
      <div style={{ paddingTop: 2 }}>
        <CoachAvatarShared size={48} tone={coach.tone} letter={coach.letter} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
        }}>
          {icon && <div style={{ color: accent }}>{icon}</div>}
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5,
            color: accent,
          }}>{label}</div>
        </div>
        <div style={{
          background: '#13171F',
          border: '1px solid #1F242E',
          borderLeft: `2px solid ${accent}`,
          padding: '12px 14px',
        }}>
          {(metric !== undefined) && (
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 4,
              marginBottom: 6,
            }}>
              <div style={{
                fontFamily: 'Oswald', fontWeight: 700,
                fontSize: big ? 36 : 26, lineHeight: 1, color: accent,
                letterSpacing: -0.5,
              }}>{metric}</div>
              <div style={{
                fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1,
                color: '#5A6477',
              }}>{unit}</div>
            </div>
          )}
          <div style={{
            fontSize: 13, lineHeight: 1.65, color: '#E5E9F0',
            fontWeight: 500,
          }}>{message}</div>
          {onAsk && (
            <div onClick={onAsk} style={{
              marginTop: 8,
              fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5,
              color: accent, cursor: 'pointer',
            }}>もっと聞く →</div>
          )}
        </div>
      </div>
    </div>
  );
}

const FEED_LINES = {
  spartan: {
    greeting: '今日のベンチ、悪くない。だが最終セットはまだ余ってた。次は90×7いけ。',
    growth:   'ベンチ、6週間で +12.5kg。これは事実だ。だが100kgまでまだ14kg、気を抜くな。',
    issue:    'プッシュ系に偏ってる。プル系のボリュームが35%足りん。背中の日を1本追加しろ。',
    goal:     '次は100kg。8週で取りに行く。週3で胸を組め、計画は俺が出す。',
    balance:  '左右差7%。左の腰が逃げてる。片側種目で潰せ、ダンベル列が効く。',
  },
  gentle: {
    greeting: 'お疲れさまでした。今日の胸の日、本当によく頑張りましたね。',
    growth:   'ベンチプレス、6週間で +12.5kg。素晴らしい伸びです、自信を持って。',
    issue:    '背中の日が少なめでした。次は背中を1日入れてみると、もっと伸びますよ。',
    goal:     'ベンチ100kg、現実的な目標です。8週後を一緒に目指していきましょう。',
    balance:  '左右の差が少しあります。片側種目で整えると、もっと伸びますよ。',
  },
};

function AIScreen() {
  const { coach, mode, trainerName } = useCoach();
  const [chatOpen, setChatOpen] = useAIState(false);
  const [chatSeed, setChatSeed] = useAIState(null);
  const lines = FEED_LINES[mode];

  const openChat = (q = null) => { setChatSeed(q); setChatOpen(true); };

  // Listen for cross-tab open-chat events from CoachStrip on Record / History.
  useAIEffect(() => {
    const h = () => openChat(null);
    window.addEventListener('iron-open-chat', h);
    return () => window.removeEventListener('iron-open-chat', h);
  }, []);

  return (
    <div style={{ background: '#0B0D10', minHeight: '100%', paddingBottom: 100 }}>
      {/* Coach header — feels like sitting next to them, not a settings tab */}
      <div style={{
        padding: '14px 16px 14px',
        background: '#0B0D10',
        borderBottom: '1px solid #1A1F28',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <CoachAvatarShared size={52} tone={coach.tone} letter={coach.letter} pulse />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5,
            color: coach.tone,
          }}>YOUR COACH · ONLINE</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginTop: 1 }}>
            {trainerName}
          </div>
        </div>
        <ModePill />
      </div>

      {/* Feed */}
      <div style={{ padding: '14px 14px 0' }}>
        {/* Greeting (no metric — just the coach speaking) */}
        <FeedTurn
          label="今日のひとこと"
          accent={coach.tone}
          message={lines.greeting}
        />

        {/* Insights, woven into the same feed */}
        <FeedTurn
          icon={<Ico.Trend s={14} />}
          label="伸び"
          accent="#5BC25B"
          metric="+12.5"
          unit="KG / 6週"
          message={lines.growth}
          onAsk={() => openChat('この伸びをどう活かす？')}
        />
        <FeedTurn
          icon={<Ico.Flame s={14} />}
          label="気になる点"
          accent="#FF6A1A"
          metric="−35"
          unit="% PULL"
          message={lines.issue}
          onAsk={() => openChat('プル系、何から組む？')}
        />
        <FeedTurn
          icon={<Ico.Target s={14} />}
          label="次の目標"
          accent="#FFB800"
          metric="100"
          unit="KG ベンチ"
          message={lines.goal}
          onAsk={() => openChat('100kgまでのプランを組んで')}
        />
        <FeedTurn
          icon={<Ico.Balance s={14} />}
          label="バランス"
          accent="#5AA9FF"
          metric="7"
          unit="% 左右差"
          message={lines.balance}
          onAsk={() => openChat('左右差、どう直す？')}
        />

        {/* Quiet inline chat trigger */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '10px 12px',
          background: '#13171F',
          border: '1px solid #1F242E',
          marginTop: 4, marginBottom: 10,
          cursor: 'pointer',
        }} onClick={() => openChat(null)}>
          <CoachAvatarShared size={36} tone={coach.tone} letter={coach.letter} />
          <div style={{
            flex: 1, fontSize: 12, color: '#8693AA',
          }}>{trainerName} に質問する...</div>
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5,
            color: coach.tone,
          }}>OPEN →</div>
        </div>

        {/* Subtle Pro mention — single line, not a banner */}
        <div style={{
          marginTop: 4, padding: '10px 12px',
          background: 'transparent',
          border: '1px dashed #2A3142',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ color: '#FF6A1A' }}><Ico.Crown s={13} /></div>
            <div style={{
              fontSize: 11, color: '#8693AA',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              無料は週3回まで · Pro で質問・プラン無制限
            </div>
          </div>
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5,
            color: '#FF6A1A', cursor: 'pointer',
          }}>¥980 →</div>
        </div>
      </div>

      <ChatScreen
        key={chatOpen ? `${mode}-${chatSeed || 'open'}` : 'closed'}
        open={chatOpen}
        mode={mode}
        coach={coach}
        initialQuestion={chatSeed}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}

window.AIScreen = AIScreen;
