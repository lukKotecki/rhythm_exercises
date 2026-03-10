
// options shape: {
//   noteValues: { whole: true, half: true, ... },
//   rests: { whole: true, half: true, ... },
//   timeSignature: '4/4',
//   articulation: 'legato',
//   bars: 4,
//   metronomeDelay: 0
// }

export default function Sidebar({ options, onChangeOptions, onStart, onPause, onReset, running, hasBars, open }) {
  const noteNames = ['whole', 'half', 'quarter', 'eighth', 'sixteenth'];
  const articulations = ['legato', 'extension', 'staccato'];
  const timeSigs = ['2/4', '3/4', '4/4', '3/8', '6/8'];

  function clampMetronomeDelay(value) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(-300, Math.min(300, parsed));
  }

  function toggleNote(type, kind) {
    const updated = { ...options };
    updated[kind] = { ...updated[kind], [type]: !updated[kind][type] };
    onChangeOptions(updated);
  }

  function changeField(field, value) {
    if (field === 'metronomeDelay') {
      onChangeOptions({ ...options, [field]: clampMetronomeDelay(value) });
      return;
    }
    onChangeOptions({ ...options, [field]: value });
  }

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-inner">
        <section>
          <h2>Note values</h2>
          {noteNames.map((n) => (
            <label key={n}>
              <input
                type="checkbox"
                checked={options.noteValues[n]}
                onChange={() => toggleNote(n, 'noteValues')}
              />
              {n}
            </label>
          ))}
        </section>

        <section>
          <h2>Rests</h2>
          {noteNames.map((n) => (
            <label key={n}>
              <input
                type="checkbox"
                checked={options.rests[n]}
                onChange={() => toggleNote(n, 'rests')}
              />
              {n}
            </label>
          ))}
        </section>

        <section>
          <h2>Time signature</h2>
          <select
            value={options.timeSignature}
            onChange={(e) => changeField('timeSignature', e.target.value)}
          >
            {timeSigs.map((sig) => (
              <option key={sig} value={sig}>
                {sig}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h2>Articulation</h2>
          {articulations.map((a) => (
            <label key={a}>
              <input
                type="radio"
                name="articulation"
                value={a}
                checked={options.articulation === a}
                onChange={() => changeField('articulation', a)}
              />
              {a}
            </label>
          ))}
        </section>

        <section>
          <h2>Bars</h2>
          <input
            type="number"
            min="1"
            value={options.bars}
            onChange={(e) => changeField('bars', parseInt(e.target.value, 10) || 1)}
          />
        </section>

        <section>
          <h2>Metronome delay</h2>
          <div className="range-group">
            <input
              type="range"
              min="-300"
              max="300"
              step="1"
              value={options.metronomeDelay}
              onChange={(e) => changeField('metronomeDelay', e.target.value)}
            />
            <div className="range-value-row">
              <span>{(options.metronomeDelay / 100).toFixed(2)} s</span>
              <input
                type="number"
                min="-300"
                max="300"
                value={options.metronomeDelay}
                onChange={(e) => changeField('metronomeDelay', e.target.value)}
              />
            </div>
          </div>
        </section>

      </div>
      <div className="sidebar-actions">
        <button className="start-button" onClick={onStart} disabled={running}>
          {running ? 'Running...' : 'Start'}
        </button>
        <button className="start-button" onClick={onPause} disabled={!running}>
          Stop
        </button>
        <button className="start-button" onClick={onReset} disabled={running || !hasBars}>
          Reset
        </button>
      </div>
    </aside>
  );
}
