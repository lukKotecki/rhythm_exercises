
// options shape: {
//   noteValues: { whole: true, half: true, ... },
//   rests: { whole: true, half: true, ... },
//   timeSignature: '4/4',
//   articulation: 'legato',
//   bars: 4
// }

export default function Sidebar({ options, onChangeOptions, onStart, onPause, onReset, running, hasBars }) {
  const noteNames = ['whole', 'half', 'quarter', 'eighth', 'sixteenth'];
  const articulations = ['legato', 'extension', 'staccato'];
  const timeSigs = ['2/4', '3/4', '4/4', '3/8', '6/8'];

  function toggleNote(type, kind) {
    const updated = { ...options }; // shallow copy
    updated[kind] = { ...updated[kind], [type]: !updated[kind][type] };
    onChangeOptions(updated);
  }

  function changeField(field, value) {
    onChangeOptions({ ...options, [field]: value });
  }

  return (
    <aside className="sidebar">
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
      <button className="start-button" onClick={onStart} disabled={running}>
        {running ? 'Running...' : 'Start'}
      </button>
      <button className="start-button" onClick={onPause} disabled={!running}>
        Stop
      </button>
      <button className="start-button" onClick={onReset} disabled={running || !hasBars}>
        Reset
      </button>
    </aside>
  );
}
