// 記録画面 — Record screen
// Today's training: exercise list with weight/reps/sets, total volume header, add exercise button.

const { useState } = React;

const PRESET_EXERCISES = [
  { name: 'ベンチプレス', cat: 'CHEST' },
  { name: 'スクワット', cat: 'LEGS' },
  { name: 'デッドリフト', cat: 'BACK' },
  { name: 'ショルダープレス', cat: 'SHOULDERS' },
  { name: '懸垂', cat: 'BACK' },
  { name: 'ダンベルカール', cat: 'ARMS' },
  { name: 'インクラインベンチ', cat: 'CHEST' },
  { name: 'ラットプルダウン', cat: 'BACK' },
];

function VolumeHeader({ volume, sets, exercises, duration }) {
  return (
    <div style={{
      padding: '20px 20px 24px',
      background: 'linear-gradient(180deg, #13171F 0%, #0E1118 100%)',
      borderBottom: '1px solid #1F242E',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* orange diagonal stripe */}
      <div style={{
        position: 'absolute', top: 0, right: -40, width: 180, height: '100%',
        background: 'linear-gradient(135deg, transparent 50%, rgba(255,106,26,0.08) 50%, rgba(255,106,26,0.08) 55%, transparent 55%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 6, position: 'relative',
      }}>
        <div style={{
          fontFamily: 'Bebas Neue', fontSize: 12, letterSpacing: 2,
          color: '#FF6A1A',
        }}>TODAY'S VOLUME</div>
        <div style={{
          fontFamily: 'JetBrains Mono', fontSize: 11, color: '#5A6477',
          letterSpacing: 0.5,
        }}>2026.05.08 / 木</div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14,
        position: 'relative',
      }}>
        <div style={{
          fontFamily: 'Oswald', fontWeight: 700, fontSize: 56, lineHeight: 1,
          color: '#fff', letterSpacing: -1,
        }}>{volume.toLocaleString()}</div>
        <div style={{
          fontFamily: 'Oswald', fontWeight: 500, fontSize: 22, color: '#8693AA',
          letterSpacing: 1,
        }}>KG</div>
      </div>
      <div style={{
        display: 'flex', gap: 0, borderTop: '1px solid #1F242E', paddingTop: 12,
      }}>
        {[
          ['種目', exercises],
          ['セット', sets],
          ['時間', duration],
        ].map(([label, val], i) => (
          <div key={i} style={{
            flex: 1, paddingLeft: i === 0 ? 0 : 14,
            borderLeft: i === 0 ? 'none' : '1px solid #1F242E',
          }}>
            <div style={{
              fontSize: 10, color: '#5A6477', letterSpacing: 1.5,
              fontFamily: 'Bebas Neue', marginBottom: 2,
            }}>{label}</div>
            <div style={{
              fontFamily: 'Oswald', fontWeight: 600, fontSize: 22,
              color: '#E5E9F0',
            }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SetRow({ set, idx, onOpenPicker, onComplete, onRemoveSet }) {
  const done = set.done;
  const cellStyle = (active) => ({
    flex: 1, padding: '10px 8px',
    background: '#0E1118',
    border: `1px solid ${active ? '#FF6A1A' : '#1F242E'}`,
    color: '#fff',
    fontFamily: 'Oswald',
    fontWeight: 700,
    fontSize: 18,
    textAlign: 'right',
    cursor: 'pointer',
    display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4,
    minWidth: 0,
  });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 0',
      borderBottom: '1px solid #1A1F28',
      opacity: done ? 0.55 : 1,
    }}>
      <div style={{
        width: 26, height: 26, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#1F2D1F' : '#181C24',
        border: done ? '1px solid #2C5A2C' : '1px solid #252B36',
        fontFamily: 'Oswald', fontWeight: 700, fontSize: 13,
        color: done ? '#5BC25B' : '#8693AA',
      }}>{idx + 1}</div>
      <div onClick={() => onOpenPicker(idx)} style={cellStyle(false)}>
        {set.weight}
        <span style={{
          fontFamily: 'Bebas Neue', fontWeight: 400, fontSize: 11,
          color: '#5A6477', letterSpacing: 1,
        }}>KG</span>
      </div>
      <span style={dotStyle}>×</span>
      <div onClick={() => onOpenPicker(idx)} style={cellStyle(false)}>
        {set.reps}
        <span style={{
          fontFamily: 'Bebas Neue', fontWeight: 400, fontSize: 11,
          color: '#5A6477', letterSpacing: 1,
        }}>回</span>
      </div>
      <button
        onClick={() => onComplete(idx)}
        style={{
          width: 36, height: 36, flexShrink: 0,
          background: done ? '#FF6A1A' : 'transparent',
          border: done ? '1px solid #FF6A1A' : '1px solid #2A3142',
          color: done ? '#0B0D10' : '#5A6477',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        <Ico.Check s={16} />
      </button>
      <button
        onClick={() => onRemoveSet(idx)}
        style={{
          width: 28, height: 28, flexShrink: 0,
          background: 'transparent', border: 'none',
          color: '#3A4253',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

const inputStyle = ({ flex = 1, align = 'left' } = {}) => ({
  flex,
  background: '#0E1118',
  border: '1px solid #1F242E',
  color: '#fff',
  fontFamily: 'JetBrains Mono',
  fontWeight: 700,
  fontSize: 17,
  padding: '8px 10px',
  textAlign: align,
  width: 0, // allow flex to shrink
  minWidth: 0,
  outline: 'none',
});
const unitStyle = {
  fontFamily: 'Bebas Neue', fontSize: 13, color: '#5A6477',
  letterSpacing: 1, width: 14,
};
const dotStyle = {
  fontFamily: 'Oswald', fontWeight: 500, fontSize: 18,
  color: '#3A4253',
};

function ExerciseCard({ ex, onOpenPicker, onAddSet, onToggleSetDone, onRemoveSet, expanded, onToggleExpand, onRemoveExercise }) {
  const totalVol = ex.sets.reduce((s, x) => s + (parseFloat(x.weight) || 0) * (parseInt(x.reps) || 0), 0);
  const doneCount = ex.sets.filter(s => s.done).length;
  return (
    <div style={{
      background: '#13171F',
      border: '1px solid #1F242E',
      marginBottom: 10,
    }}>
      <div
        onClick={onToggleExpand}
        style={{
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid #1F242E' : 'none',
        }}
      >
        <div style={{
          width: 4, alignSelf: 'stretch', background: '#FF6A1A',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, fontFamily: 'Bebas Neue', letterSpacing: 1.5,
            color: '#FF6A1A', marginBottom: 2,
          }}>{ex.cat}</div>
          <div style={{
            fontWeight: 700, fontSize: 16, color: '#fff',
            fontFamily: '"Noto Sans JP", system-ui',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{ex.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'Oswald', fontWeight: 700, fontSize: 20, color: '#fff',
            lineHeight: 1,
          }}>{totalVol.toLocaleString()}<span style={{
            fontSize: 11, color: '#5A6477', marginLeft: 3,
          }}>kg</span></div>
          <div style={{
            fontSize: 10, color: '#5A6477', fontFamily: 'JetBrains Mono',
            marginTop: 4,
          }}>{doneCount}/{ex.sets.length} SETS</div>
        </div>
        <div style={{
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s', color: '#5A6477',
        }}>
          <Ico.ChevD s={14} />
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '8px 16px 14px' }}>
          {ex.sets.map((s, i) => (
            <SetRow
              key={i}
              set={s}
              idx={i}
              onOpenPicker={(i) => onOpenPicker(ex.id, i)}
              onComplete={(i) => onToggleSetDone(ex.id, i)}
              onRemoveSet={(i) => onRemoveSet(ex.id, i)}
            />
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => onAddSet(ex.id)}
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px dashed #2A3142',
                color: '#8693AA',
                fontFamily: 'Bebas Neue',
                fontSize: 14, letterSpacing: 1.5,
                padding: '10px 0', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Ico.Plus s={14} /> SET 追加
            </button>
            <button
              onClick={() => onRemoveExercise(ex.id)}
              style={{
                background: 'transparent',
                border: '1px solid #2A3142',
                color: '#5A6477',
                fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 1.5,
                padding: '10px 14px', cursor: 'pointer',
              }}
            >削除</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddExerciseSheet({ open, onClose, onAdd }) {
  const [search, setSearch] = useState('');
  if (!open) return null;
  const filtered = PRESET_EXERCISES.filter(p => p.name.includes(search));
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: '#13171F',
          borderTop: '2px solid #FF6A1A',
          maxHeight: '78%',
          display: 'flex', flexDirection: 'column',
          paddingBottom: 30,
        }}
      >
        <div style={{
          padding: '18px 20px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #1F242E',
        }}>
          <div style={{
            fontFamily: 'Oswald', fontWeight: 700, fontSize: 22,
            letterSpacing: 0.5, color: '#fff',
          }}>種目を追加</div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#5A6477',
            fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: '12px 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#0E1118', border: '1px solid #1F242E',
            padding: '10px 12px',
          }}>
            <div style={{ color: '#5A6477' }}><Ico.Search s={16} /></div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="種目を検索"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: '#fff', fontSize: 14, outline: 'none',
                fontFamily: '"Noto Sans JP", system-ui',
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 12px' }}>
          {filtered.map((p, i) => (
            <div
              key={i}
              onClick={() => { onAdd(p); onClose(); }}
              style={{
                padding: '14px 0',
                borderBottom: '1px solid #1A1F28',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{
                  fontSize: 10, fontFamily: 'Bebas Neue', letterSpacing: 1.5,
                  color: '#FF6A1A', marginBottom: 2,
                }}>{p.cat}</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#fff' }}>{p.name}</div>
              </div>
              <div style={{ color: '#5A6477' }}><Ico.Plus s={18} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecordScreen() {
  const { coach, mode } = useCoach();
  const [exercises, setExercises] = useState([
    {
      id: 1, name: 'ベンチプレス', cat: 'CHEST',
      sets: [
        { weight: 60, reps: 10, done: true },
        { weight: 80, reps: 8, done: true },
        { weight: 90, reps: 6, done: true },
        { weight: 90, reps: 5, done: false },
      ],
    },
    {
      id: 2, name: 'インクラインダンベルプレス', cat: 'CHEST',
      sets: [
        { weight: 22, reps: 12, done: true },
        { weight: 24, reps: 10, done: true },
        { weight: 24, reps: 8, done: false },
      ],
    },
    {
      id: 3, name: 'ケーブルクロスオーバー', cat: 'CHEST',
      sets: [
        { weight: 15, reps: 15, done: false },
        { weight: 15, reps: 15, done: false },
        { weight: 15, reps: 15, done: false },
      ],
    },
  ]);
  const [expandedId, setExpandedId] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [picker, setPicker] = useState(null); // {exId, setIdx}

  const totalVolume = exercises.reduce((s, ex) =>
    s + ex.sets.reduce((ss, set) =>
      ss + (set.done ? (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0) : 0), 0), 0);
  const totalSets = exercises.reduce((s, ex) => s + ex.sets.filter(x => x.done).length, 0);
  const allSets = exercises.reduce((s, ex) => s + ex.sets.length, 0);
  const progress = allSets ? totalSets / allSets : 0;
  const coachLine = progress === 0
    ? COACH_LINES[mode].record_idle
    : progress >= 1
      ? COACH_LINES[mode].record_done
      : COACH_LINES[mode].record_active({ doneSets: totalSets, totalSets: allSets });

  const updateSet = (exId, setIdx, newSet) => {
    setExercises(exs => exs.map(ex => ex.id === exId
      ? { ...ex, sets: ex.sets.map((s, i) => i === setIdx ? newSet : s) }
      : ex));
  };
  const toggleSetDone = (exId, setIdx) => {
    setExercises(exs => exs.map(ex => ex.id === exId
      ? { ...ex, sets: ex.sets.map((s, i) => i === setIdx ? { ...s, done: !s.done } : s) }
      : ex));
  };
  const addSet = (exId) => {
    setExercises(exs => exs.map(ex => {
      if (ex.id !== exId) return ex;
      const last = ex.sets[ex.sets.length - 1] || { weight: 20, reps: 10 };
      return { ...ex, sets: [...ex.sets, { weight: last.weight, reps: last.reps, done: false }] };
    }));
  };
  const addExercise = (preset) => {
    const id = Math.max(0, ...exercises.map(e => e.id)) + 1;
    const newEx = {
      id, name: preset.name, cat: preset.cat,
      sets: [{ weight: 20, reps: 10, done: false }],
    };
    setExercises([...exercises, newEx]);
    setExpandedId(id);
  };
  const removeSet = (exId, setIdx) => {
    setExercises(exs => exs.map(ex =>
      ex.id !== exId ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
    ));
  };
  const removeExercise = (id) => {
    setExercises(exs => exs.filter(e => e.id !== id));
  };

  return (
    <div style={{ background: '#0B0D10', minHeight: '100%', position: 'relative' }}>
      <VolumeHeader
        volume={totalVolume}
        sets={totalSets}
        exercises={exercises.length}
        duration="48分"
      />
      <div style={{ padding: '12px 14px 0' }}>
        <CoachStrip
          message={coachLine}
          sub={`${totalSets}/${allSets} SETS`}
          action="チャットを開く"
          onOpenChat={() => window.dispatchEvent(new CustomEvent('iron-open-chat'))}
        />
      </div>
      <div style={{ padding: '14px 14px 100px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          padding: '0 4px 10px',
        }}>
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 2,
            color: '#8693AA',
          }}>WORKOUT — CHEST DAY</div>
          <div style={{
            fontFamily: 'JetBrains Mono', fontSize: 10, color: '#5A6477',
          }}>{exercises.length} exercises</div>
        </div>
        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            expanded={expandedId === ex.id}
            onToggleExpand={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
            onOpenPicker={(exId, setIdx) => setPicker({ exId, setIdx })}
            onAddSet={addSet}
            onToggleSetDone={toggleSetDone}
            onRemoveSet={removeSet}
            onRemoveExercise={removeExercise}
          />
        ))}
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            width: '100%', marginTop: 4,
            background: '#FF6A1A',
            border: 'none',
            color: '#0B0D10',
            fontFamily: 'Oswald', fontWeight: 700, fontSize: 18,
            letterSpacing: 1.5,
            padding: '16px 0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Ico.Plus s={20} c="#0B0D10" /> 種目を追加
        </button>
      </div>
      <AddExerciseSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={addExercise}
      />
      <WheelPickerSheet
        key={picker ? `${picker.exId}-${picker.setIdx}` : 'closed'}
        open={!!picker}
        exerciseName={picker ? exercises.find(e => e.id === picker.exId)?.name : ''}
        setIdx={picker ? picker.setIdx : 0}
        initial={picker ? exercises.find(e => e.id === picker.exId)?.sets[picker.setIdx] : null}
        onCancel={() => setPicker(null)}
        onConfirm={({ weight, reps }) => {
          if (picker) {
            const ex = exercises.find(e => e.id === picker.exId);
            const cur = ex.sets[picker.setIdx];
            updateSet(picker.exId, picker.setIdx, { ...cur, weight, reps });
          }
          setPicker(null);
        }}
      />
    </div>
  );
}

window.RecordScreen = RecordScreen;
