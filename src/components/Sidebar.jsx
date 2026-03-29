import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import NoteRenderer from './NoteRenderer.jsx';

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
  advancedSettings: false,
};

function AccordionSection({ id, title, children, isOpen, onToggle }) {
  return (
    <div className={`accordion-section${isOpen ? ' open' : ''}`}>
      <button
        className={`accordion-header${isOpen ? ' open' : ''}`}
        onClick={() => onToggle(id)}
      >
        <span>{title}</span>
        <span className="accordion-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  );
}

function NumericControl({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
  ariaLabel,
}) {
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : min;

  const handleDecrease = () => {
    onChange(Math.max(min, numericValue - step));
  };

  const handleIncrease = () => {
    onChange(Math.min(max, numericValue + step));
  };

  return (
    <div className="numeric-control">
      <input
        className="numeric-control-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={numericValue}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
      />
      <div className="numeric-control-row">
        <button
          type="button"
          className="numeric-step-button"
          onClick={handleDecrease}
          aria-label={`${ariaLabel} minus`}
        >
          -
        </button>
        <div className="numeric-control-value" aria-live="polite">
          {numericValue}{suffix}
        </div>
        <button
          type="button"
          className="numeric-step-button"
          onClick={handleIncrease}
          aria-label={`${ariaLabel} plus`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ t, options, onChangeOptions, onRequestMainFocus, onShareSettings, open }) {
  const noteNames = ['whole', 'dotted-half', 'half', 'dotted-quarter', 'quarter', 'dotted-eighth', 'eighth', 'sixteenth', 'triplet-eighth', 'quarter-triplet'];
  const restNames = ['whole', 'dotted-half', 'half', 'dotted-quarter', 'quarter', 'dotted-eighth', 'eighth', 'sixteenth'];
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
    if (onRequestMainFocus) onRequestMainFocus();
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
    if (field === 'noteGraphicsMode') {
      onChangeOptions({ ...options, noteGraphicsMode: value });
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
      const bounded = Number.isNaN(parsed) ? 60 : Math.max(30, Math.min(200, parsed));
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

  return (
    <aside
      ref={sidebarRef}
      className={`sidebar${open ? ' open' : ''}`}
      onScroll={(e) => {
        scrollTopRef.current = e.currentTarget.scrollTop;
      }}
    >
      <div className="sidebar-inner">

        <AccordionSection id="noteValues" title={t.sidebar.sections.noteValues} isOpen={expanded.noteValues} onToggle={toggleSection}>
          {noteNames.map((n) => (
            <label key={n}>
              <input
                type="checkbox"
                checked={options.noteValues[n]}
                onChange={() => toggleNote(n, 'noteValues')}
              />
              <span
                className="sidebar-note-preview"
              >
                <NoteRenderer type="note" name={n} size={18} mode={options.noteGraphicsMode ?? 'svg'} />
              </span>
              {t.sidebar.noteNames[n]}
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={options.legato ?? false}
              onChange={(e) => changeField('legato', e.target.checked)}
            />
            {t.sidebar.fields.legato}
          </label>
          <div className="field-group">
            <label className="field-label">
              {t.sidebar.fields.legatoFrequency}: <strong>{options.legatoFrequency ?? 50}%</strong>
            </label>
            <NumericControl
              value={options.legatoFrequency ?? 50}
              min={0}
              max={100}
              step={10}
              onChange={(next) => changeField('legatoFrequency', next)}
              suffix="%"
              ariaLabel={t.sidebar.fields.legatoFrequency}
            />
          </div>
        </AccordionSection>

        <AccordionSection id="pauseValues" title={t.sidebar.sections.restValues} isOpen={expanded.pauseValues} onToggle={toggleSection}>
          {restNames.map((n) => (
            <label key={n}>
              <input
                type="checkbox"
                checked={options.rests[n]}
                onChange={() => toggleNote(n, 'rests')}
              />
              <span
                className="sidebar-note-preview"
              >
                <NoteRenderer type="rest" name={n} size={18} mode={options.noteGraphicsMode ?? 'svg'} />
              </span>
              {t.sidebar.restNames[n]}
            </label>
          ))}
        </AccordionSection>

        <AccordionSection id="barSettings" title={t.sidebar.sections.barSettings} isOpen={expanded.barSettings} onToggle={toggleSection}>
          <div className="field-group">
            <label className="field-label">{t.sidebar.fields.timeSignature}</label>
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
            <label className="field-label">{t.sidebar.fields.numberOfBars}</label>
            <NumericControl
              value={options.bars}
              min={1}
              max={32}
              step={1}
              onChange={(next) => changeField('bars', next)}
              ariaLabel={t.sidebar.fields.numberOfBars}
            />
          </div>
          <div className="field-group">
            <label className="field-label">
              {t.sidebar.fields.tempo}: <strong>{options.bpm ?? 60} BPM</strong>
            </label>
            <NumericControl
              value={options.bpm ?? 60}
              min={30}
              max={200}
              step={1}
              onChange={(next) => changeField('bpm', next)}
              suffix=" BPM"
              ariaLabel={t.sidebar.fields.tempo}
            />
          </div>
        </AccordionSection>

        <AccordionSection id="advancedSettings" title={t.sidebar.sections.advancedSettings} isOpen={expanded.advancedSettings} onToggle={toggleSection}>
          <div className="advanced-checkbox-group">
            <div className="field-group">
              <label>
                <input
                  type="checkbox"
                  checked={options.showMovingProgressIndicator ?? true}
                  onChange={(e) => changeField('showMovingProgressIndicator', e.target.checked)}
                />
                {t.sidebar.fields.movingProgress}
              </label>
            </div>

            <div className="field-group">
              <label>
                <input
                  type="checkbox"
                  checked={options.playRhythmSound ?? true}
                  onChange={(e) => changeField('playRhythmSound', e.target.checked)}
                />
                {t.sidebar.fields.playRhythmSound}
              </label>
            </div>

            <div className="field-group">
              <label>
                <input
                  type="checkbox"
                  checked={options.showExpectedRhythmGrid ?? true}
                  onChange={(e) => changeField('showExpectedRhythmGrid', e.target.checked)}
                />
                {t.sidebar.fields.expectedGrid}
              </label>
            </div>

            <div className="field-group">
              <label>
                <input
                  type="checkbox"
                  checked={options.useResponsiveBeatBoxWidth ?? true}
                  onChange={(e) => changeField('useResponsiveBeatBoxWidth', e.target.checked)}
                />
                {t.sidebar.fields.useResponsiveBeatBoxWidth}
              </label>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">
              {t.sidebar.fields.noteGraphics}:
              <select
                value={options.noteGraphicsMode ?? 'svg'}
                onChange={(e) => changeField('noteGraphicsMode', e.target.value)}
              >
                <option value="svg">SVG</option>
                <option value="unicode">Unicode</option>
              </select>
            </label>
          </div>

          <div className="advanced-sound-group">

          <div className="field-group">
            <label className="field-label">{t.sidebar.fields.sound}</label>
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
              {t.sidebar.fields.accentFreq}: <strong>{options.metronomeSound.accentFreq} Hz</strong>
            </label>
            <NumericControl
              value={options.metronomeSound.accentFreq}
              min={200}
              max={2000}
              step={50}
              onChange={(next) => changeSoundField('accentFreq', next)}
              suffix=" Hz"
              ariaLabel={t.sidebar.fields.accentFreq}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              {t.sidebar.fields.beatFreq}: <strong>{options.metronomeSound.beatFreq} Hz</strong>
            </label>
            <NumericControl
              value={options.metronomeSound.beatFreq}
              min={200}
              max={2000}
              step={50}
              onChange={(next) => changeSoundField('beatFreq', next)}
              suffix=" Hz"
              ariaLabel={t.sidebar.fields.beatFreq}
            />
          </div>
          </div>

          <div className="field-group">
            <label className="field-label">
              {t.sidebar.fields.accuracyGrid}: <strong>{options.tappedRhythmAccuracy ?? 12}</strong>
            </label>
            <NumericControl
              value={options.tappedRhythmAccuracy ?? 12}
              min={4}
              max={100}
              step={4}
              onChange={(next) => changeField('tappedRhythmAccuracy', next)}
              ariaLabel={t.sidebar.fields.accuracyGrid}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              {t.sidebar.fields.userTapSync}: <strong>{options.tappedRhythmSyncPercent ?? 0}%</strong>
            </label>
            <NumericControl
              value={options.tappedRhythmSyncPercent ?? 0}
              min={-50}
              max={50}
              step={1}
              onChange={(next) => changeField('tappedRhythmSyncPercent', next)}
              suffix="%"
              ariaLabel={t.sidebar.fields.userTapSync}
            />
          </div>

          <div className="field-group">
            <button
              type="button"
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                marginTop: '12px',
              }}
              onClick={() => onShareSettings && onShareSettings()}
            >
              {t.sidebar.fields.shareSettings}
            </button>
          </div>
        </AccordionSection>

      </div>
    </aside>
  );
}
