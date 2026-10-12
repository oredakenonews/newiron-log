import { createContext, useContext, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { TRAINER_LINES } from './trainerLines'

// v2.1: スパルタ/やさしいのモード切替は廃止（TestFlightフィードバック: 切替で別人格になる）。
// トレーナーキャラクター本来の性格一本で統一する。

const TRAINER_IMAGES = {
  RYOTA:   '/gazou/ryota_bu.png',
  LEON:    '/gazou/leon_bu.png',
  YUKI:    '/gazou/yuki_bu.png',
  JADE:    '/gazou/jade_bu.png',
  NANA:    '/gazou/nana_bu.png',
  HANA:    '/gazou/hana_bu.png',
  RACHELL: '/gazou/rachell_bu.png',
  TORU:    '/gazou/toru_bu.png',
  BILLY:   '/gazou/billybu.png',
}

const TRAINER_TAGS = {
  RYOTA: '熱血', YUKI: '穏やか', LEON: '理論派', JADE: 'ストイック',
  NANA: 'クール', HANA: '丁寧', RACHELL: '国際派', TORU: 'ベテラン', BILLY: 'エンタメ',
}

const ACCENT = '#FF6A1A'

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
