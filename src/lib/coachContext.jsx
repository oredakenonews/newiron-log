import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../hooks/useAuth'

export const COACHES_SHARED = {
  spartan: { name: 'コーチ・カイザー', tag: 'スパルタ', tone: '#FF6A1A', letter: 'K' },
  gentle:  { name: 'コーチ・ハル',     tag: 'やさしい', tone: '#5BC25B', letter: 'H' },
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

const CoachContext = createContext({
  mode: 'spartan',
  setMode: () => {},
  coach: COACHES_SHARED.spartan,
})

export function CoachProvider({ children }) {
  const { user, profile } = useAuth()
  const [mode, setModeLocal] = useState('spartan')

  useEffect(() => {
    if (profile?.coach_mode) setModeLocal(profile.coach_mode)
  }, [profile?.coach_mode])

  async function setMode(newMode) {
    setModeLocal(newMode)
    if (user) {
      await supabase.from('profiles').update({ coach_mode: newMode }).eq('id', user.id)
    }
  }

  const value = useMemo(
    () => ({ mode, setMode, coach: COACHES_SHARED[mode] ?? COACHES_SHARED.spartan }),
    [mode, user]
  )

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
}

export function useCoach() {
  return useContext(CoachContext)
}

export function CoachAvatarShared({ size = 32, tone, letter, pulse = false }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: '#0E1118', border: '1px solid #1F242E',
      position: 'relative', overflow: 'hidden',
    }}>
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
  const { coach } = useCoach()
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
        <CoachAvatarShared size={64} tone={coach.tone} letter={coach.letter} pulse />
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 9, letterSpacing: 1.5, color: coach.tone }}>{coach.tag}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 10, letterSpacing: 1.5, color: '#fff' }}>{coach.name}</div>
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
  const { coach } = useCoach()
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      marginTop: 8, fontSize: 12, color: '#B5BECF', lineHeight: 1.55,
    }}>
      <CoachAvatarShared size={32} tone={coach.tone} letter={coach.letter} />
      <div style={{ flex: 1, borderLeft: `2px solid ${coach.tone}`, paddingLeft: 10, paddingTop: 2 }}>
        「{text}」
      </div>
    </div>
  )
}
