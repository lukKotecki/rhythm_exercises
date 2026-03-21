import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import RhythmArea from './components/RhythmArea.jsx';
import Instructions from './components/Instructions.jsx';
import About from './components/About.jsx';
import Settings from './components/Settings.jsx';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('Home');

  // options state – loaded from localStorage, falls back to defaults
  const [options, setOptions] = useState(() => {
    const defaults = {
      noteValues: { whole: true, half: true, quarter: true, eighth: true, sixteenth: true },
      rests: { whole: false, half: false, quarter: false, eighth: false, sixteenth: false },
      timeSignature: '4/4',
      articulation: 'legato',
      bars: 4,
      bpm: 60,
      tappedRhythmAccuracy: 12,
      tappedRhythmSyncPercent: 0,
      showMovingProgressIndicator: true,
      showExpectedRhythmGrid: true,
      metronomeSound: { waveform: 'sine', accentFreq: 1500, beatFreq: 1000 },
    };
    try {
      const saved = localStorage.getItem('rhythmExercisesOptions');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
          metronomeSound: { ...defaults.metronomeSound, ...(parsed.metronomeSound || {}) },
        };
      }
    } catch { /* ignore */ }
    return defaults;
  });

  // persist options whenever they change
  useEffect(() => {
    localStorage.setItem('rhythmExercisesOptions', JSON.stringify(options));
  }, [options]);

  const [barsData, setBarsData] = useState([]);
  const [running, setRunning] = useState(false);
  const [pausedElapsed, setPausedElapsed] = useState(0);
  const [exerciseMode, setExerciseMode] = useState('normal');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function generateBars(mode = 'normal') {
    if (mode === 'delay-calibration') {
      const beatValue = 1;
      const beatsPerBar = 4;
      const warmupBar = [];
      for (let beat = 0; beat < beatsPerBar; beat++) {
        warmupBar.push({
          type: 'rest',
          name: 'quarter',
          duration: beatValue,
          value: '',
          symbol: mapSymbol({ type: 'rest', name: 'quarter' }),
          accent: beat === 0,
        });
      }

      const quarterBars = Array.from({ length: 4 }, () => {
        const bar = [];
        for (let beat = 0; beat < beatsPerBar; beat++) {
          bar.push({
            type: 'note',
            name: 'quarter',
            duration: 1,
            value: 'quarter',
            symbol: mapSymbol({ type: 'note', name: 'quarter' }),
            accent: beat === 0,
          });
        }
        return bar;
      });

      setBarsData([warmupBar, ...quarterBars]);
      return;
    }

    // determine beats per bar from the numerator of timeSignature
    let beatsPerBar = 4;
    if (options.timeSignature) {
      const [numStr] = options.timeSignature.split('/');
      const n = parseInt(numStr, 10);
      if (!isNaN(n)) beatsPerBar = n;
    }

    // determine beat value (duration of one beat in quarter-notes) from denominator
    // Each beat-box will contain notes totaling beatValue quarter-notes
    let beatValue = 1;
    if (options.timeSignature) {
      const [, denomStr] = options.timeSignature.split('/');
      const d = parseInt(denomStr, 10);
      if (!isNaN(d)) beatValue = 4 / d;
    }

    // build list of possible notes and rests with their durations (in quarter-notes)
    const choices = [];
    Object.entries(options.noteValues).forEach(([name, enabled]) => {
      if (enabled) choices.push({ type: 'note', name, duration: durationMap[name] });
    });
    Object.entries(options.rests).forEach(([name, enabled]) => {
      if (enabled) choices.push({ type: 'rest', name, duration: durationMap[name] });
    });

    const bars = [];
    for (let i = 0; i < options.bars; i++) {
      const bar = [];

      const barDuration = beatsPerBar * beatValue;
      let sum = 0;
      const epsilon = 0.0001;

      // Fill the whole bar with randomly selected values that fit remaining time.
      // This allows larger note values (e.g. half/whole) to be generated when selected.
      while (sum < barDuration - epsilon) {
        const remaining = barDuration - sum;
        const positionInBeat = sum % beatValue;
        const remainingInBeat =
          positionInBeat < epsilon ? beatValue : beatValue - positionInBeat;

        const available = choices.filter((c) => {
          if (c.duration > remaining + epsilon) return false;
          const mustStartOnBeatBox =
            c.name === 'quarter' || c.name === 'half' || c.name === 'whole';
          if (mustStartOnBeatBox && positionInBeat > epsilon) return false;
          // quarter and smaller values must stay inside one beat-box
          if (c.duration <= 1 && c.duration > remainingInBeat + epsilon) return false;
          return true;
        });

        if (available.length === 0) {
          break;
        }

        const choice = available[Math.floor(Math.random() * available.length)];
        const noteObj = {
          ...choice,
          value: choice.name,
          symbol: mapSymbol(choice),
          accent: bar.length === 0, // accent first note in the bar
        };
        bar.push(noteObj);
        sum += choice.duration;
      }

      bars.push(bar);
    }

    // insert a warm-up bar at start
    const emptyBar = [];
    for (let beat = 0; beat < beatsPerBar; beat++) {
      emptyBar.push({
        type: 'rest',
        name: 'quarter',
        duration: beatValue,
        value: '',
        symbol: mapSymbol({ type: 'rest', name: 'quarter' }),
        accent: beat === 0,
      });
    }
    setBarsData([emptyBar, ...bars]);
  }

  function handleStart() {
    if (running) return; // already active
    setExerciseMode('normal');
    // If no bars yet, generate them on first start
    if (barsData.length === 0) {
      generateBars('normal');
    }
    setPausedElapsed(0); // Reset pause state when starting
    setRunning(true);
  }

  function handleResume() {
    // Resume from paused state
    if (running) return;
    setRunning(true);
  }

  function handleDelayCalibration() {
    if (running) return;
    setExerciseMode('delay-calibration');
    generateBars('delay-calibration');
    setRunning(true);
  }

  function handlePause() {
    // Pause playback but keep generated rhythm and paused time
    setRunning(false);
  }

  function handleStop() {
    // Stop playback and reset everything
    setBarsData([]);
    setRunning(false);
    setPausedElapsed(0);
    setExerciseMode('normal');
  }

  function handleReset() {
    // Generate new rhythm (paused state, ready for Start)
    setRunning(false);
    setPausedElapsed(0);
    setExerciseMode('normal');
    generateBars('normal');
  }

  function handleCalibrationComplete(payload) {
    if (!payload || typeof payload.averageOffsetSec !== 'number') return;
    setExerciseMode('normal');
  }

  return (
    <div className="app-container">
      <Header
        currentPage={currentPage}
        onChangePage={(page) => {
          setCurrentPage(page);
          setSidebarOpen(false);
        }}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onStart={handleStart}
        onResume={handleResume}
        onPause={handlePause}
        onReset={handleReset}
        running={running}
        hasBars={barsData.length > 0}
      />
      <div className="content-wrap">
        {sidebarOpen && (
          <Sidebar
            options={options}
            onChangeOptions={setOptions}
            onGenerateSynchronizationRhythm={handleDelayCalibration}
            running={running}
            open={sidebarOpen}
          />
        )}
        <div className="main-area">
          {currentPage === 'Home' && (
            <RhythmArea
              barsData={barsData}
              timeSignature={exerciseMode === 'delay-calibration' ? '4/4' : options.timeSignature}
              tappedRhythmAccuracy={options.tappedRhythmAccuracy}
              userTapSyncPercent={options.tappedRhythmSyncPercent}
              showMovingProgressIndicator={options.showMovingProgressIndicator}
              showExpectedRhythmGrid={options.showExpectedRhythmGrid}
              metronomeSound={options.metronomeSound}
              bpm={options.bpm}
              exerciseMode={exerciseMode}
              running={running}
              pausedElapsed={pausedElapsed}
              onElapsedChange={setPausedElapsed}
              onPause={handlePause}
              onCalibrationComplete={handleCalibrationComplete}
            />
          )}
          {currentPage === 'Instructions' && <Instructions />}
          {currentPage === 'About' && <About />}
          {currentPage === 'Settings' && <Settings options={options} />}
        </div>
      </div>
    </div>
  );
}

// helper mapping for unicode symbols
const durationMap = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

function mapSymbol(choice) {
  const symbols = {
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
  if (choice.type === 'rest') return restSymbols[choice.name] || restSymbols.quarter;
  return symbols[choice.name] || symbols.quarter;
}

export default App;
