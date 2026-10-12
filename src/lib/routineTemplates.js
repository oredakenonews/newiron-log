// ルーチン未作成時に1タップで作れる初期テンプレート。名前・内容は作成後に自由に編集できる。
export const ROUTINE_TEMPLATES = [
  {
    name: '上半身',
    exercises: [
      { name: 'ベンチプレス', sets: 3, reps: 10 },
      { name: 'ラットプルダウン', sets: 3, reps: 10 },
      { name: 'ショルダープレス', sets: 3, reps: 10 },
      { name: 'ベントオーバーロウ', sets: 3, reps: 10 },
      { name: 'ダンベルカール', sets: 3, reps: 12 },
      { name: 'トライセプスプレス', sets: 3, reps: 12 },
    ],
  },
  {
    name: '下半身',
    exercises: [
      { name: 'スクワット', sets: 4, reps: 8 },
      { name: 'デッドリフト', sets: 3, reps: 6 },
      { name: 'レッグプレス', sets: 3, reps: 10 },
      { name: 'レッグカール', sets: 3, reps: 12 },
    ],
  },
  {
    name: '全身',
    exercises: [
      { name: 'スクワット', sets: 3, reps: 10 },
      { name: 'ベンチプレス', sets: 3, reps: 10 },
      { name: 'ラットプルダウン', sets: 3, reps: 10 },
      { name: 'ショルダープレス', sets: 3, reps: 10 },
    ],
  },
]
