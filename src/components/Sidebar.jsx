import { useState, useEffect, useLayoutEffect, useRef } from 'react';

// options shape: {
//   noteValues: { whole: true, half: true, ... },
//   rests: { whole: true, half: true, ... },
//   timeSignature: '4/4',
//   bars: 4,
//   tappedRhythmSyncPercent: 10,
//   showMovingProgressIndicator: true,
//   showExpectedRhythmGrid: true,
//   metronomeSound: { waveform: 'sine', accentFreq: 1500, beatFreq: 1000 }
// }

const EXPANDED_KEY = 'rhythmExercisesSectionsExpanded';

const DEFAULT_EXPANDED = {
  noteValues: false,
  pauseValues: false,
  barSettings: false,
  metronome: false,
  tappedRhythm: false,
};

export default function Sidebar({ options, onChangeOptions, onGenerateSynchronizationRhythm, running, open }) {
  const noteNames = ['whole', 'half', 'quarter', 'eighth', 'sixteenth'];
  const noteSymbols = {
    whole: '𝅝',
    half: '𝅗𝅥',
    quarter: '𝅘𝅥',
    eighth: '𝅘𝅥𝅮',
    sixteenth: '𝅘𝅥𝅯',
  };
  const restSymbols = {
    whole: '𝄻',
    half: '𝄼',
    quarter: '𝄽',
    eighth: '𝄾',
    sixteenth: '𝄿',
  };
  const timeSigs = ['2/4', '3/4', '4/4', '3/8', '6/8'];
  const metronomeSounds = [
    { value: 'sine', label: 'Sine' },
    { value: 'square', label: 'Square' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'sawtooth', label: 'Sawtooth' },
    { value: 'cowbell', label: 'Cowbell' },
    { value: 'woodblock', label: 'Woodblock' },
    { value: 'clave', label: 'Clave' },
    { value: 'hihat', label: 'Hi-hat' },
  ];

  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_KEY);
      return saved ? { ...DEFAULT_EXPANDED, ...JSON.parse(saved) } : DEFAULT_EXPANDED;
    } catch {
      return DEFAULT_EXPANDED;
    }
  });
  const sidebarRef = useRef(null);
  const scrollTopRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(expanded));
  }, [expanded]);

  useLayoutEffect(() => {
    if (!sidebarRef.current) return;
    sidebarRef.current.scrollTop = scrollTopRef.current;
  }, [options]);

  function toggleSection(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleNote(type, kind) {
    const updated = { ...options };
    updated[kind] = { ...updated[kind], [type]: !updated[kind][type] };
    onChangeOptions(updated);
  }

  function changeField(field, value) {
    if (field === 'showExpectedRhythmGrid') {
      onChangeOptions({ ...options, showExpectedRhythmGrid: !!value });
      return;
    }
    if (field === 'tappedRhythmAccuracy') {
      const parsed = parseInt(value, 10);
      const bounded = Number.isNaN(parsed) ? 12 : Math.max(4, Math.min(100, parsed));
      const stepped = Math.round(bounded / 4) * 4;
      onChangeOptions({ ...options, tappedRhythmAccuracy: stepped });
      return;
    }
    if (field === 'tappedRhythmSyncPercent') {
      const parsed = parseInt(value, 10);
      const bounded = Number.isNaN(parsed) ? 0 : Math.max(-50, Math.min(50, parsed));
      onChangeOptions({ ...options, tappedRhythmSyncPercent: bounded });
      return;
    }
    if (field === 'bpm') {
      const parsed = parseInt(value, 10);
      const bounded = Number.isNaN(parsed) ? 60 : Math.max(30, Math.min(300, parsed));
      onChangeOptions({ ...options, bpm: bounded });
      return;
    }
    if (field === 'legatoFrequency') {
      const parsed = parseInt(value, 10);
      const bounded = Number.isNaN(parsed) ? 50 : Math.max(0, Math.min(100, parsed));
      const stepped = Math.round(bounded / 10) * 10;
      onChangeOptions({ ...options, legatoFrequency: stepped });
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
    <aside
      ref={sidebarRef}
      className={`sidebar${open ? ' open' : ''}`}
      onScroll={(e) => {
        scrollTopRef.current = e.currentTarget.scrollTop;
      }}
    >
      <div className="sidebar-inner">

        <AccordionSection id="noteValues" title="Note values">
          {noteNames.map((n) => (
            <label key={n}>
              <input
                type="checkbox"
                checked={options.noteValues[n]}
                onChange={() => toggleNote(n, 'noteValues')}
              />
              <span
                style={{
                  marginRight: '0.35rem',
                  fontSize: '1.2rem',
                  lineHeight: 1,
                  display: 'inline-block',
                  minWidth: '1.1rem',
                  textAlign: 'center',
                }}
              >
                {noteSymbols[n]}
              </span>
              {n}
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={options.legato ?? false}
              onChange={(e) => changeField('legato', e.target.checked)}
            />
            legato
          </label>
          <div className="field-group">
            <label className="field-label">
              Legato frequency: <strong>{options.legatoFrequency ?? 50}%</strong>
            </label>
            <div className="range-group">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={options.legatoFrequency ?? 50}
                onChange={(e) => changeField('legatoFrequency', e.target.value)}
              />
              <input
                type="number"
                min="0"
                max="100"
                step="10"
                value={options.legatoFrequency ?? 50}
                onChange={(e) => changeField('legatoFrequency', e.target.value)}
              />
            </div>
          </div>
        </AccordionSection>

        <AccordionSection id="pauseValues" title="Pause values">
          {noteNames.map((n) => (
            <label key={n}>
              <input
                type="checkbox"
                checked={options.rests[n]}
                onChange={() => toggleNote(n, 'rests')}
              />
              <span
                style={{
                  marginRight: '0.35rem',
                  fontSize: '1.2rem',
                  lineHeight: 1,
                  display: 'inline-block',
                  minWidth: '1.1rem',
                  textAlign: 'center',
                }}
              >
                {restSymbols[n]}
              </span>
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

        <AccordionSection id="metronome" title="Metronome settings">
          <div className="field-group">
            <label className="field-label">
              Tempo: <strong>{options.bpm ?? 60} BPM</strong>
            </label>
            <div className="range-group">
              <input
                type="range"
                min="30"
                max="300"
                step="1"
                value={options.bpm ?? 60}
                onChange={(e) => changeField('bpm', e.target.value)}
              />
              <input
                type="number"
                min="30"
                max="300"
                value={options.bpm ?? 60}
                onChange={(e) => changeField('bpm', e.target.value)}
              />
            </div>
          </div>

          <div className="field-group">
            <label>
              <input
                type="checkbox"
                checked={options.showMovingProgressIndicator ?? true}
                onChange={(e) => changeField('showMovingProgressIndicator', e.target.checked)}
              />
              Show moving progress indicator
            </label>
          </div>

          <div className="field-group">
            <label className="field-label">Sound</label>
            <select
              value={options.metronomeSound.waveform}
              onChange={(e) => changeSoundField('waveform', e.target.value)}
            >
              {metronomeSounds.map((soundOption) => (
                <option key={soundOption.value} value={soundOption.value}>{soundOption.label}</option>
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

        <AccordionSection id="tappedRhythm" title="Synchronization">
          <div className="field-group">
            <button
              className="start-button"
              onClick={onGenerateSynchronizationRhythm}
              disabled={running}
            >
              Generate synchronization rhythm
            </button>
          </div>

          <div className="field-group">
            <label className="field-label">
              Accuracy grid: <strong>{options.tappedRhythmAccuracy ?? 12}</strong>
            </label>
            <div className="range-group">
              <input
                type="range"
                min="4"
                max="100"
                step="4"
                value={options.tappedRhythmAccuracy ?? 12}
                onChange={(e) => changeField('tappedRhythmAccuracy', e.target.value)}
              />
              <input
                type="number"
                min="4"
                max="100"
                step="4"
                value={options.tappedRhythmAccuracy ?? 12}
                onChange={(e) => changeField('tappedRhythmAccuracy', e.target.value)}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">
              User tap sync: <strong>{options.tappedRhythmSyncPercent ?? 0}%</strong>
            </label>
            <div className="range-group">
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={options.tappedRhythmSyncPercent ?? 0}
                onChange={(e) => changeField('tappedRhythmSyncPercent', e.target.value)}
              />
              <input
                type="number"
                min="-50"
                max="50"
                step="1"
                value={options.tappedRhythmSyncPercent ?? 0}
                onChange={(e) => changeField('tappedRhythmSyncPercent', e.target.value)}
              />
            </div>
          </div>

          <div className="field-group">
            <label>
              <input
                type="checkbox"
                checked={options.showExpectedRhythmGrid ?? true}
                onChange={(e) => changeField('showExpectedRhythmGrid', e.target.checked)}
              />
              Show expected rhythm grid on progress bar
            </label>
          </div>
        </AccordionSection>

      </div>
    </aside>
  );
}
