import { useState, useEffect } from 'react'
import { listFeedback, summarizeFeedback, clearFeedback } from '../../lib/localdb'

const labelStyle = { fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 8 }

// AIチャットの👍/👎の集計。👎が多いキャラから口調・内容を見直すための画面
export default function FeedbackSection() {
  const [summary, setSummary] = useState({})
  const [downs, setDowns] = useState([])
  const [open, setOpen] = useState(null)

  async function reload() {
    setSummary(await summarizeFeedback())
    setDowns((await listFeedback()).filter(f => f.rating === 'down').slice(0, 20))
  }

  useEffect(() => { reload() }, [])

  async function handleClear() {
    if (!window.confirm('返答の評価をすべて削除しますか？')) return
    await clearFeedback()
    reload()
  }

  // 👎率の高い順（直すべきキャラが上に来る）
  const rows = Object.entries(summary)
    .map(([trainer, { up, down }]) => ({ trainer, up, down, rate: down / (up + down) }))
    .sort((a, b) => b.rate - a.rate || (b.up + b.down) - (a.up + a.down))

  return (
    <>
      <div style={labelStyle}>返答の評価</div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', marginBottom: 20 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7 }}>
            AIの返事の下にある👍/👎で評価すると、ここにキャラごとの集計が出ます
          </div>
        ) : (
          <>
            {rows.map(r => (
              <div key={r.trainer} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border2)' }}>
                <div style={{ flex: 1, fontFamily: 'Oswald', fontWeight: 700, fontSize: 15, color: 'var(--text-strong)' }}>{r.trainer}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2nd)', display: 'flex', gap: 10 }}><span>👍 {r.up}</span><span>👎 {r.down}</span></div>
                <div style={{ width: 52, textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 12, color: r.rate >= 0.3 ? '#FF6A1A' : 'var(--muted)' }}>
                  {Math.round(r.rate * 100)}%
                </div>
              </div>
            ))}
            {downs.length > 0 && (
              <div style={{ padding: '10px 14px 4px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>最近の👎（タップで全文）</div>
                {downs.map(f => (
                  <div
                    key={f.id}
                    onClick={() => setOpen(open === f.id ? null : f.id)}
                    style={{ padding: '8px 0', borderTop: '1px solid var(--border2)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 12, color: 'var(--text-strong)' }}>{f.trainer}</span>
                      {f.reason && <span style={{ fontSize: 11, color: '#FF6A1A' }}>{f.reason}</span>}
                      {f.prompt && <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>「{f.prompt}」への返事</span>}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6,
                      ...(open === f.id ? { whiteSpace: 'pre-wrap' } : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
                    }}>{f.reply}</div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleClear}
              style={{
                width: '100%', padding: '10px 0', background: 'transparent', border: 'none',
                borderTop: '1px solid var(--border2)',
                color: 'var(--muted)', fontFamily: 'Bebas Neue', fontSize: 11, letterSpacing: 1.5, cursor: 'pointer',
              }}
            >評価をすべて削除</button>
          </>
        )}
      </div>
    </>
  )
}
