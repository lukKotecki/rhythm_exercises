import { useState, useEffect } from 'react';

// options shape: {
//   noteValues: { whole: true, half: true, ... },
//   rests: { whole: true, half: true, ... },
//   timeSignature: '4/4',
//   articulation: 'legato',
//   bars: 4,
//   metronomeDelay: 0,
//   metronomeSound: { waveform: 'sine', accentFreq: 1500, beatFreq: 1000 }
// }

const EXPANDED_KEY = 'rhythmExercisesSectionsExpanded';

const DEFAULT_EXPANDED = {
  noteValues: false,
  pauseValues: false,
  barSettings: false,
  articulation: false,
  metronome: false,
};

export default function Sidebar({ options, onChangeOptions, onStart, onPause, onReset, running, hasBars, open }) {
  const noteNames = ['whole', 'half', 'quarter', 'eighth', 'sixteenth'];
  const articulations = ['legato', 'extension', 'staccato'];
  const timeSigs = ['2/4', '3/4', '4/4', '3/8', '6/8'];
  const waveforms = ['sine', 'square', 'triangle', 'sawtooth'];

  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_KEY);
      return saved ? { ...DEFAULT_EXPANDED, ...JSON.parse(saved) } : DEFAULT_EXPANDED;
    } catch {
      return DEFAULT_EXPANDED;
    }
  });

  useEffect(() => {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(expanded));
  }, [expanded]);

  function toggleSection(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleNote(type, kind) {
    const updated = { ...options };
    updated[kind] = { ...updated[kind], [type]: !updated[kind][type] };
    onChangeOptions(updated);
  }

  function changeField(field, value) {
    if (field === 'metronomeDelay') {
      const parsed = parseInt(value, 10);
      const clamped = Number.isNaN(parsed) ? 0 : Math.max(-300, Math.min(300, parsed));
      onChangeOptions({ ...options, metronomeDelay: clamped });
      return;
    }
    onChangeOptions({ ...options, [field]: value });
  }

  function changeSoundField(field, value) {
    onChangeOptions({
      ...options,
      metronomeSound: { ...options.metronomeSound, [field]: value },
    });
  }

  function AccordionSection({ id, title, children }) {
    const isOpen = expanded[id];
    return (
      <div className="accordion-section">
        <button
          className={`accordion-header${isOpen ? ' open' : ''}`}
          onClick={() => toggleSection(id)}
        >
          <span>{title}</span>
          <span className="accordion-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && <div className="accordion-body">{children}</div>}
      </div>
    );
  }

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-inner">

        <AccordionSection id="noteValues" title="Note values">
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
        </AccordionSection>

        <AccordionSection id="pauseValues" title="Pause values">
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
        </AccordionSection>

        <AccordionSection id="barSettings" title="Bar settings">
          <div className="field-group">
            <label className="field-label">Time signature</label>
            <select
              value={options.timeSignature}
              onChange={(e) => changeField('timeSignature', e.target.value)}
            >
              {timeSigs.map((sig) => (
                <option key={sig} value={sig}>{sig}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Number of bars</label>
            <input
              type="number"
              min="1"
              value={options.bars}
              onChange={(e) => changeField('bars', parseInt(e.target.value, 10) || 1)}
            />
          </div>
        </AccordionSection>

        <AccordionSection id="articulation" title="Articulation">
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
        </AccordionSection>

        <AccordionSection id="metronome" title="Metronome settings">
          <div className="field-group">
            <label className="field-label">
              Delay: <strong>{(options.metronomeDelay / 100).toFixed(2)} s</strong>
            </label>
            <div className="range-group">
              <input
                type="range"
                min="-300"
                max="300"
                step="1"
                value={options.metronomeDelay}
                onChange={(e) => changeField('metronomeDelay', e.target.value)}
              />
              <input
                type="number"
                min="-300"
                max="300"
                value={options.metronomeDelay}
                onChange={(e) => changeField('metronomeDelay', e.target.value)}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Waveform</label>
            <select
              value={options.metronomeSound.waveform}
              onChange={(e) => changeSoundField('waveform', e.target.value)}
            >
              {waveforms.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">
              Accent freq: <strong>{options.metronomeSound.accentFreq} Hz</strong>
            </label>
            <div className="range-group">
              <input
                type="range"
                min="200"
                max="2000"
                step="50"
                value={options.metronomeSound.accentFreq}
                onChange={(e) => changeSoundField('accentFreq', parseInt(e.target.value, 10))}
              />
              <input
                type="number"
                min="200"
                max="2000"
                value={options.metronomeSound.accentFreq}
                onChange={(e) => changeSoundField('accentFreq', parseInt(e.target.value, 10) || 1500)}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">
              Beat freq: <strong>{options.metronomeSound.beatFreq} Hz</strong>
            </label>
            <div className="range-group">
              <input
                type="range"
                min="200"
                max="2000"
                step="50"
                value={options.metronomeSound.beatFreq}
                onChange={(e) => changeSoundField('beatFreq', parseInt(e.target.value, 10))}
              />
              <input
                type="number"
                min="200"
                max="2000"
                value={options.metronomeSound.beatFreq}
                onChange={(e) => changeSoundField('beatFreq', parseInt(e.target.value, 10) || 1000)}
              />
            </div>
          </div>
        </AccordionSection>

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
