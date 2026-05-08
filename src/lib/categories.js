export const CATEGORY_MAP = {
  // CHEST
  'ベンチプレス': 'CHEST',
  'マシンベンチプレス': 'CHEST',
  'インクラインベンチ': 'CHEST',
  'インクラインプレス': 'CHEST',
  'インクラインダンベルプレス': 'CHEST',
  'ダンベルフライ': 'CHEST',
  'チェストフライ': 'CHEST',
  'ケーブルクロスオーバー': 'CHEST',
  'ケーブルクロス': 'CHEST',
  'ペックフライ': 'CHEST',
  'プッシュアップ': 'CHEST',
  'ディクラインベンチ': 'CHEST',
  // BACK
  'デッドリフト': 'BACK',
  '懸垂': 'BACK',
  'チンニング': 'BACK',
  'ラットプルダウン': 'BACK',
  'ベントオーバーロウ': 'BACK',
  'シーテッドロウ': 'BACK',
  'ワンハンドロウ': 'BACK',
  'フェイスプル': 'BACK',
  'Tバーロウ': 'BACK',
  'ケーブルロウ': 'BACK',
  // LEGS
  'スクワット': 'LEGS',
  '自重スクワット': 'LEGS',
  'レッグプレス': 'LEGS',
  'ランジ': 'LEGS',
  'レッグカール': 'LEGS',
  'レッグエクステンション': 'LEGS',
  'カーフレイズ': 'LEGS',
  'ヒップスラスト': 'LEGS',
  'ブルガリアンスクワット': 'LEGS',
  'ルーマニアンデッドリフト': 'LEGS',
  // SHOULDERS
  'ショルダープレス': 'SHOULDERS',
  'サイドレイズ': 'SHOULDERS',
  'ラテラルレイズ': 'SHOULDERS',
  'フロントレイズ': 'SHOULDERS',
  'リアレイズ': 'SHOULDERS',
  'アーノルドプレス': 'SHOULDERS',
  // ARMS
  'ダンベルカール': 'ARMS',
  'バーベルカール': 'ARMS',
  'ハンマーカール': 'ARMS',
  'トライセプスプレス': 'ARMS',
  'トライセプスプレスダウン': 'ARMS',
  'トライセプスエクステンション': 'ARMS',
  'ディップス': 'ARMS',
  'ケーブルカール': 'ARMS',
  'インクラインダンベルカール': 'ARMS',
  // CORE
  'プランク': 'CORE',
  'クランチ': 'CORE',
  'ロシアンツイスト': 'CORE',
  'レッグレイズ': 'CORE',
  'アブローラー': 'CORE',
}

export function getCategory(name) {
  return CATEGORY_MAP[name] || 'EXERCISE'
}

export const FILTER_CATS = {
  '胸': ['CHEST'],
  '背中': ['BACK'],
  '脚': ['LEGS'],
  '肩・腕': ['SHOULDERS', 'ARMS'],
}
