import { useAuth } from '../../hooks/useAuth'

const TRAINER_IMAGES = {
  RYOTA: '/gazou/ryota_bu.png',
  DAIKI: '/gazou/daiki_bu.png',
  YUKI: '/gazou/yuki_bu.png',
  KENJI: '/gazou/kenji_bu.png',
  NANA: '/gazou/nana_bu.png',
  HANA: '/gazou/hana_bu.png',
  RACHELL: '/gazou/rachell_bu.png',
  TORU: '/gazou/toru_bu.png',
  BILLY: '/gazou/billybu.png',
}

const TRAINER_NAMES = {
  RYOTA: 'RYOTA',
  DAIKI: 'DAIKI',
  YUKI: 'YUKI',
  KENJI: 'KENJI',
  NANA: 'NANA',
  HANA: 'HANA',
  RACHELL: 'RACHELL',
  TORU: 'TORU',
  BILLY: 'BILLY',
}

export default function AITab() {
  const { profile } = useAuth()
  const trainer = profile?.trainer_character || 'RYOTA'
  const trainerImg = TRAINER_IMAGES[trainer] || TRAINER_IMAGES.RYOTA
  const trainerName = TRAINER_NAMES[trainer] || 'RYOTA'

  return (
    <div className="flex flex-col min-h-dvh pb-20" style={{ background: '#0f0f0f' }}>
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-bebas text-3xl mb-1" style={{ color: '#f97316' }}>AI TRAINER</h1>
        <p className="text-xs" style={{ color: '#888' }}>あなた専属のAIトレーナー</p>
      </div>

      {/* トレーナーエリア */}
      <div className="flex flex-col items-center px-4 py-6" style={{ background: '#1a1a1a', margin: '0 16px', borderRadius: 24, border: '1px solid #2a2a2a' }}>
        <img
          src={trainerImg}
          alt={trainerName}
          className="w-40 h-auto object-contain mb-4"
          style={{ filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.3))' }}
        />
        <p className="font-bebas text-2xl tracking-widest mb-1" style={{ color: '#f97316' }}>{trainerName}</p>

        {/* トレーナーメッセージ */}
        <div className="w-full rounded-xl p-4 mt-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2a' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#f5f5f5' }}>
            前回のトレーニング、見ましたよ👀<br />
            アドバイスを読むには<span style={{ color: '#f97316' }}>プレミアム</span>へ
          </p>
        </div>
      </div>

      {/* プレミアムCTA */}
      <div className="px-4 mt-6">
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #1a1a1a, #2a1a0a)', border: '1px solid #f97316' }}>
          <p className="text-xs font-bold mb-1" style={{ color: '#f97316' }}>PREMIUM</p>
          <h2 className="text-lg font-bold mb-2">AIが本気で伴走する</h2>
          <ul className="space-y-2 mb-4">
            {[
              'トレーニングへの具体的なフィードバック',
              '次回セッションの重量・セット数提案',
              '停滞期の打破アドバイス',
              'メンタルサポートメッセージ',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#888' }}>
                <span style={{ color: '#f97316' }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
          <button
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: '#f97316' }}
            onClick={() => alert('プレミアム機能は近日公開予定です！')}
          >
            プレミアムに登録する
          </button>
        </div>
      </div>

      {/* フリープランの制限表示 */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#0f0f0f' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold">フリープラン</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>AIアドバイスはプレミアム限定機能です</p>
          </div>
        </div>
      </div>
    </div>
  )
}
