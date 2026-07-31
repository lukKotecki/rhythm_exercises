import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import RhythmArea from './components/RhythmArea.jsx';
import Instructions from './components/Instructions.jsx';
import About from './components/About.jsx';
import Settings from './components/Settings.jsx';
import CartPageTemporary from './components/CartPageTemporary.jsx';
import { LANGUAGE_STORAGE_KEY, TRANSLATIONS } from './i18n.js';
import './App.css';

const EMPTY_SESSION_CLICK_COUNTS = {
  generate: 0,
  next: 0,
  start: 0,
  repeat: 0,
  stop: 0,
};

// Encode options object to base64 string for URL sharing
function encodeSettingsToUrl(options) {
  try {
    const json = JSON.stringify(options);
    return btoa(json);
  } catch {
    return null;
  }
}

// Decode base64 string from URL back to options object
function decodeSettingsFromUrl(encoded) {
  try {
    const json = atob(encoded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Get settings from URL parameter if present
function getSettingsFromUrlParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const settingsParam = params.get('settings');
    if (settingsParam) {
      const decoded = decodeSettingsFromUrl(settingsParam);
      if (decoded && typeof decoded === 'object') {
        return decoded;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function getResultsFromUrlParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const resultsParam = params.get('results');
    if (resultsParam) {
      const decoded = decodeSettingsFromUrl(resultsParam);
      if (decoded && typeof decoded === 'object' && Array.isArray(decoded.results)) {
        return decoded;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && TRANSLATIONS[saved]) return saved;
    } catch {
      // ignore localStorage access issues
    }
    return 'pl';
  });
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // options state – loaded from localStorage, URL params, or defaults
  const [options, setOptions] = useState(() => {
    const defaults = {
      noteValues: {
        whole: true,
        'dotted-half': true,
        half: true,
        'dotted-quarter': true,
        quarter: true,
        'dotted-eighth': true,
        eighth: true,
        sixteenth: true,
        'triplet-eighth': false,
        'quarter-triplet': false,
      },
      rests: {
        whole: false,
        'dotted-half': false,
        half: false,
        'dotted-quarter': false,
        quarter: false,
        'dotted-eighth': false,
        eighth: false,
        sixteenth: false,
      },
      legato: false,
      legatoFrequency: 50,
      noteGraphicsMode: 'svg',
      timeSignature: '4/4',
      articulation: 'legato',
      bars: 4,
      bpm: 60,
      tappedRhythmAccuracy: 12,
      tappedRhythmSyncPercent: 0,
      showMovingProgressIndicator: true,
      showExpectedRhythmGrid: true,
      useResponsiveBeatBoxWidth: true,
      playRhythmSound: true,
      showBarAccuracy: false,
      showAccuracyOnProgress: false,
      metronomeSound: { waveform: 'sine', accentFreq: 1500, beatFreq: 1000 },
    };

    const resultsPayload = getResultsFromUrlParam();
    const sourceSettings = resultsPayload?.options || getSettingsFromUrlParam();

    // First check if settings are in URL or embedded in shared results.
    if (sourceSettings) {
      return {
        ...defaults,
        ...sourceSettings,
        noteValues: { ...defaults.noteValues, ...(sourceSettings.noteValues || {}) },
        rests: { ...defaults.rests, ...(sourceSettings.rests || {}) },
        metronomeSound: { ...defaults.metronomeSound, ...(sourceSettings.metronomeSound || {}) },
      };
    }

    // Otherwise load from localStorage
    try {
      const saved = localStorage.getItem('rhythmExercisesOptions');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
          noteValues: { ...defaults.noteValues, ...(parsed.noteValues || {}) },
          rests: { ...defaults.rests, ...(parsed.rests || {}) },
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

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const [barsData, setBarsData] = useState([]);
  const [running, setRunning] = useState(false);
  const [pausedElapsed, setPausedElapsed] = useState(0);
  const [repeatToken, setRepeatToken] = useState(0);
  const [focusMainToken, setFocusMainToken] = useState(0);
  const [exerciseMode, setExerciseMode] = useState('normal');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [barAccuracyData, setBarAccuracyData] = useState([]);
  const [overallAccuracyData, setOverallAccuracyData] = useState(null);
  const [sessionAccuracyHistoryData, setSessionAccuracyHistoryData] = useState([]);
  const [currentSessionClickCounts, setCurrentSessionClickCounts] = useState(EMPTY_SESSION_CLICK_COUNTS);
  const [sessionHeaderClickHistory, setSessionHeaderClickHistory] = useState([]);
  const [generateClickCount, setGenerateClickCount] = useState(0);
  const [exerciseAttempts, setExerciseAttempts] = useState([]);
  const [currentAttemptIndex, setCurrentAttemptIndex] = useState(-1);
  const [currentAttemptStarted, setCurrentAttemptStarted] = useState(false);
  const [loadedResults, setLoadedResults] = useState(() => getResultsFromUrlParam());
  const settingsResetToken = JSON.stringify(options);

  useEffect(() => {
    setSessionHeaderClickHistory([]);
    setCurrentSessionClickCounts(EMPTY_SESSION_CLICK_COUNTS);
  }, [settingsResetToken]);

  function resetSessionShareStats() {
    setGenerateClickCount(0);
    setExerciseAttempts([]);
    setCurrentAttemptIndex(-1);
    setCurrentAttemptStarted(false);
  }

  function incrementHeaderClickCount(key) {
    setCurrentSessionClickCounts((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  }

  function finalizeSessionClickStats() {
    setSessionHeaderClickHistory((prev) => [...prev, currentSessionClickCounts]);
    setCurrentSessionClickCounts(EMPTY_SESSION_CLICK_COUNTS);
  }

  function registerAttempt({ autoStarted = false, countGenerateClick = false } = {}) {
    if (countGenerateClick) {
      setGenerateClickCount((prev) => prev + 1);
    }
    setExerciseAttempts((prev) => [...prev, { attemptNumber: prev.length + 1, repeatCount: 0 }]);
    setCurrentAttemptIndex(exerciseAttempts.length);
    setCurrentAttemptStarted(autoStarted);
  }

  function incrementCurrentAttemptRepeat() {
    if (currentAttemptIndex < 0) return;
    setExerciseAttempts((prev) => prev.map((attempt, idx) => (
      idx === currentAttemptIndex
        ? { ...attempt, repeatCount: attempt.repeatCount + 1 }
        : attempt
    )));
  }

  function generateBars(mode = 'normal', trackingOptions = {}) {
    if (loadedResults) {
      setLoadedResults(null);
      resetSessionShareStats();
    }
    setBarAccuracyData([]);
    setOverallAccuracyData(null);
    setSessionAccuracyHistoryData([]);
    if (mode === 'normal') {
      registerAttempt(trackingOptions);
    }
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
    let isSixEightMeter = false;
    if (options.timeSignature) {
      const [numStr, denomStr] = options.timeSignature.split('/');
      const n = parseInt(numStr, 10);
      const d = parseInt(denomStr, 10);
      if (!isNaN(n)) beatsPerBar = n;
      if (!isNaN(d) && n !== 6) {
        // already parsed below for 6/8
      }
      isSixEightMeter = n === 6 && d === 8;
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
    const noteChoices = [];
    Object.entries(options.noteValues).forEach(([name, enabled]) => {
      if (!enabled) return;
      if (name === 'quarter-triplet') {
        noteChoices.push({ type: 'note', name, duration: (2 * beatValue) / 3 });
        return;
      }
      noteChoices.push({ type: 'note', name, duration: durationMap[name] });
    });
    const restChoices = [];
    Object.entries(options.rests).forEach(([name, enabled]) => {
      if (enabled) restChoices.push({ type: 'rest', name, duration: durationMap[name] });
    });
    const choices = [...noteChoices, ...restChoices];

    const bars = [];
    for (let i = 0; i < options.bars; i++) {
      const barDuration = beatsPerBar * beatValue;
      const epsilon = 0.0001;
      let bar = buildExactBar(choices, barDuration, beatValue);

      if (!bar) {
        // Auto-fill with rests only as a fallback when exact generation is impossible.
        const partial = buildGreedyBar(noteChoices, barDuration, beatValue);
        appendRestsToFillBar(partial.items, partial.sum, barDuration, beatValue);
        bar = partial.items;
      }

      let accentPositions = new Set([0]);
      if (isSixEightMeter) {
        const accentBeatStarts = [0, 3 * beatValue];
        let cursor = 0;
        accentPositions = new Set();
        let nextBeatIdx = 0;
        for (let i = 0; i < bar.length; i++) {
          if (nextBeatIdx < accentBeatStarts.length && Math.abs(cursor - accentBeatStarts[nextBeatIdx]) < 0.0001) {
            accentPositions.add(i);
            nextBeatIdx += 1;
          }
          cursor += bar[i].duration;
        }
        if (accentPositions.size === 0) accentPositions.add(0);
      }
      const withMeta = bar.map((item, idx) => ({
        ...item,
        value: item.name,
        accent: accentPositions.has(idx),
      }));

      if (withMeta.reduce((acc, n) => acc + n.duration, 0) < barDuration - epsilon) {
        appendRestsToFillBar(withMeta, withMeta.reduce((acc, n) => acc + n.duration, 0), barDuration, beatValue);
      }

      bars.push(combineAdjacentRestsInBeatBox(withMeta, beatValue));
    }

    // insert a warm-up bar at start
    const emptyBar = [];
    const accentBeats = isSixEightMeter ? new Set([0, 3]) : new Set([0]);
    for (let beat = 0; beat < beatsPerBar; beat++) {
      emptyBar.push({
        type: 'rest',
        name: 'quarter',
        duration: beatValue,
        value: '',
        accent: accentBeats.has(beat),
      });
    }
    setBarsData([emptyBar, ...bars]);
  }

  function handleStart() {
    setFocusMainToken((prev) => prev + 1);
    setExerciseMode('normal');
    // If no bars yet, generate them on first start.
    if (barsData.length === 0) {
      generateBars('normal', { autoStarted: true });
    } else if (currentAttemptStarted) {
      incrementCurrentAttemptRepeat();
    } else {
      setCurrentAttemptStarted(true);
    }
    // Start behaves like Repeat: always restart from the beginning.
    setRepeatToken((prev) => prev + 1);
    setPausedElapsed(0);
    setRunning(true);
  }

  function handleHeaderStartClick() {
    if (running) {
      incrementHeaderClickCount('repeat');
    } else {
      incrementHeaderClickCount('start');
    }
    handleStart();
  }

  function handlePause() {
    // Pause playback but keep generated rhythm and paused time
    setRunning(false);
  }

  function handleHeaderStopClick() {
    incrementHeaderClickCount('stop');
    handlePause();
  }

  function handleReset() {
    setFocusMainToken((prev) => prev + 1);
    // Generate new rhythm (paused state, ready for Start)
    setRunning(false);
    setPausedElapsed(0);
    setExerciseMode('normal');
    generateBars('normal', { autoStarted: false, countGenerateClick: true });
  }

  function handleHeaderGenerateClick() {
    incrementHeaderClickCount('generate');
    handleReset();
  }

  function handleNext() {
    setFocusMainToken((prev) => prev + 1);
    // Generate a new rhythm and start it immediately from the beginning.
    setExerciseMode('normal');
    setPausedElapsed(0);
    setRepeatToken((prev) => prev + 1);
    generateBars('normal', { autoStarted: true });
    setRunning(true);
  }

  function handleHeaderNextClick() {
    incrementHeaderClickCount('next');
    handleNext();
  }

  function handleElapsedChange(nextElapsed) {
    setPausedElapsed(nextElapsed);
  }

  function handleCalibrationComplete(payload) {
    if (!payload || typeof payload.averageOffsetSec !== 'number') return;
    setExerciseMode('normal');
  }

  function handleRequestMainFocus() {
    setFocusMainToken((prev) => prev + 1);
  }

  function handleShareSettings() {
    const encoded = encodeSettingsToUrl(options);
    if (!encoded) return;

    const url = `${window.location.origin}${window.location.pathname}?settings=${encoded}`;
    try {
      navigator.clipboard.writeText(url).then(() => {
        alert(t.sidebar.fields.settingsCopiedToClipboard);
      });
    } catch {
      // Fallback if clipboard API fails
      alert(`${t.sidebar.fields.settingsCopiedToClipboard}\n\n${url}`);
    }
  }

  function handleShareResults() {
    if (overallAccuracyData === null) {
      alert(t.sidebar.fields.noResultsToShare || 'No results to share.');
      return;
    }

    // Create a results summary to include in the URL
    const resultsSummary = {
      options,
      results: barAccuracyData,
      overallAccuracy: overallAccuracyData,
      sessionAccuracyHistory: sessionAccuracyHistoryData,
      sessionHeaderClickHistory,
      generateClickCount,
      exerciseAttempts,
      timestamp: new Date().toISOString(),
    };

    const encoded = encodeSettingsToUrl(resultsSummary);
    if (!encoded) return;

    const url = `${window.location.origin}${window.location.pathname}?results=${encoded}`;
    try {
      navigator.clipboard.writeText(url).then(() => {
        alert(t.sidebar.fields.resultsCopiedToClipboard);
      });
    } catch {
      // Fallback if clipboard API fails
      alert(`${t.sidebar.fields.resultsCopiedToClipboard}\n\n${url}`);
    }
  }

  return (
    <div className="app-container">
      <Header
        t={t}
        language={language}
        onChangeLanguage={setLanguage}
        currentPage={currentPage}
        onChangePage={(page) => {
          setCurrentPage(page);
          setSidebarOpen(false);
        }}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onRequestMainFocus={handleRequestMainFocus}
        onStart={handleHeaderStartClick}
        onNext={handleHeaderNextClick}
        onPause={handleHeaderStopClick}
        onReset={handleHeaderGenerateClick}
        running={running}
      />
      <div className="content-wrap">
        {sidebarOpen && (
          <Sidebar
            t={t}
            options={options}
            onChangeOptions={setOptions}
            onRequestMainFocus={handleRequestMainFocus}
            onShareSettings={handleShareSettings}
            onShareResults={handleShareResults}
            open={sidebarOpen}
          />
        )}
        <div className="main-area">
          {currentPage === 'home' && (
            <RhythmArea
              t={t}
              barsData={barsData}
              timeSignature={exerciseMode === 'delay-calibration' ? '4/4' : options.timeSignature}
              tappedRhythmAccuracy={options.tappedRhythmAccuracy}
              userTapSyncPercent={options.tappedRhythmSyncPercent}
              legatoEnabled={options.legato}
              legatoFrequency={options.legatoFrequency}
              noteGraphicsMode={options.noteGraphicsMode}
              repeatToken={repeatToken}
              focusMainToken={focusMainToken}
              showMovingProgressIndicator={options.showMovingProgressIndicator}
              showExpectedRhythmGrid={options.showExpectedRhythmGrid}
              useResponsiveBeatBoxWidth={options.useResponsiveBeatBoxWidth}
              settingsResetToken={settingsResetToken}
              metronomeSound={options.metronomeSound}
              bpm={options.bpm}
              playRhythmSound={options.playRhythmSound}
              showBarAccuracy={options.showBarAccuracy}
              showAccuracyOnProgress={options.showAccuracyOnProgress}
              exerciseMode={exerciseMode}
              running={running}
              pausedElapsed={pausedElapsed}
              loadedResults={loadedResults}
              sessionHeaderClickHistory={sessionHeaderClickHistory}
              onElapsedChange={handleElapsedChange}
              onPause={handlePause}
              onSessionRecorded={finalizeSessionClickStats}
              onUpdateResults={(barAccuracy, overallAccuracy, sessionAccuracyHistory) => {
                setBarAccuracyData(barAccuracy);
                setOverallAccuracyData(overallAccuracy);
                setSessionAccuracyHistoryData(sessionAccuracyHistory);
              }}
              onShareResults={handleShareResults}
              onNext={handleHeaderNextClick}
              onCalibrationComplete={handleCalibrationComplete}
            />
          )}
          {currentPage === 'instructions' && <Instructions t={t} />}
          {currentPage === 'about' && <About t={t} />}
          {currentPage === 'settings' && <Settings t={t} options={options} />}
          {currentPage === 'cart' && <CartPageTemporary />}
        </div>
      </div>
    </div>
  );
}

const durationMap = {
  whole: 4,
  'dotted-half': 3,
  half: 2,
  'dotted-quarter': 1.5,
  quarter: 1,
  'dotted-eighth': 0.75,
  eighth: 0.5,
  sixteenth: 0.25,
  'triplet-eighth': 1 / 3,
  'quarter-triplet': 2 / 3,
};

function approxEqual(a, b, epsilon = 0.0001) {
  return Math.abs(a - b) <= epsilon;
}

function getAvailableChoices(choices, sum, barDuration, beatValue, path = []) {
  const epsilon = 0.0001;
  const remaining = barDuration - sum;
  const positionInBeat = sum % beatValue;
  const remainingInBeat = positionInBeat < epsilon ? beatValue : beatValue - positionInBeat;
  const quarterTripletTailCount = countTrailingQuarterTriplets(path);

  return choices.filter((c) => {
    if (!Number.isFinite(c.duration) || c.duration <= 0) return false;
    if (c.duration > remaining + epsilon) return false;

    if (c.name !== 'quarter-triplet' && quarterTripletTailCount % 3 !== 0) return false;

    const atBeatStart = positionInBeat <= epsilon;
    const atHalfBeat = Math.abs(positionInBeat - beatValue / 2) <= epsilon;
    const canStartOffBeat = c.name === 'dotted-quarter' && atHalfBeat;

    if (c.name === 'quarter-triplet') {
      const quarterTripletDuration = (2 * beatValue) / 3;
      const tripletPhase = quarterTripletTailCount % 3;

      if (tripletPhase === 0) {
        if (!atBeatStart) return false;
        if (remaining < 2 * beatValue - epsilon) return false;
      }

      if (tripletPhase === 1 && Math.abs(positionInBeat - quarterTripletDuration) > epsilon) return false;
      if (tripletPhase === 2 && Math.abs(positionInBeat - beatValue / 3) > epsilon) return false;
    }

    const mustStartOnBeatBox = c.duration >= 1;
    if (mustStartOnBeatBox && !(atBeatStart || canStartOffBeat)) return false;
    if (c.name === 'quarter-triplet') return true;
    if (c.duration <= 1 && c.duration > remainingInBeat + epsilon) return false;
    return true;
  });
}

function countTrailingQuarterTriplets(path) {
  let count = 0;
  for (let i = path.length - 1; i >= 0; i -= 1) {
    if (path[i]?.name !== 'quarter-triplet') break;
    count += 1;
  }
  return count;
}

function shuffled(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildExactBar(choices, barDuration, beatValue) {
  const epsilon = 0.0001;
  const maxNodes = 12000;
  let visited = 0;

  function dfs(sum, path) {
    visited += 1;
    if (visited > maxNodes) return null;
    if (sum >= barDuration - epsilon) return path;

    const available = shuffled(getAvailableChoices(choices, sum, barDuration, beatValue, path));
    for (const choice of available) {
      const result = dfs(sum + choice.duration, [...path, choice]);
      if (result) return result;
    }
    return null;
  }

  return dfs(0, []);
}

function buildGreedyBar(noteChoices, barDuration, beatValue) {
  const epsilon = 0.0001;
  const items = [];
  let sum = 0;

  while (sum < barDuration - epsilon) {
    const available = getAvailableChoices(noteChoices, sum, barDuration, beatValue, items);
    if (available.length === 0) break;
    const choice = available[Math.floor(Math.random() * available.length)];
    items.push(choice);
    sum += choice.duration;
  }

  return { items, sum };
}

const REST_FILL_CHOICES = [
  { name: 'whole', duration: 4 },
  { name: 'dotted-half', duration: 3 },
  { name: 'half', duration: 2 },
  { name: 'dotted-quarter', duration: 1.5 },
  { name: 'quarter', duration: 1 },
  { name: 'dotted-eighth', duration: 0.75 },
  { name: 'eighth', duration: 0.5 },
  { name: 'sixteenth', duration: 0.25 },
];

function appendRestsToFillBar(bar, startSum, barDuration, beatValue) {
  const epsilon = 0.0001;
  let sum = startSum;

  while (sum < barDuration - epsilon) {
    const remaining = barDuration - sum;
    const positionInBeat = sum % beatValue;
    const remainingInBeat = positionInBeat < epsilon ? beatValue : beatValue - positionInBeat;

    const choice = REST_FILL_CHOICES.find((c) =>
      c.duration <= remaining + epsilon && c.duration <= remainingInBeat + epsilon,
    );

    if (!choice) {
      // Safety fallback to avoid infinite loop with floating-point edge cases.
      const fallback = REST_FILL_CHOICES[REST_FILL_CHOICES.length - 1];
      if (fallback.duration > remaining + epsilon || fallback.duration > remainingInBeat + epsilon) {
        break;
      }
      bar.push({ type: 'rest', name: fallback.name, value: fallback.name, duration: fallback.duration, accent: false });
      sum += fallback.duration;
      continue;
    }

    bar.push({ type: 'rest', name: choice.name, value: choice.name, duration: choice.duration, accent: false });
    sum += choice.duration;
  }
}

function restNameForDuration(duration) {
  if (approxEqual(duration, 4)) return 'whole';
  if (approxEqual(duration, 2)) return 'half';
  if (approxEqual(duration, 1)) return 'quarter';
  if (approxEqual(duration, 0.75)) return 'dotted-eighth';
  if (approxEqual(duration, 0.5)) return 'eighth';
  if (approxEqual(duration, 0.25)) return 'sixteenth';
  return null;
}

function combineAdjacentRestsInBeatBox(bar, beatValue) {
  const combined = [];
  const epsilon = 0.0001;
  let i = 0;
  let cursor = 0;

  while (i < bar.length) {
    const current = bar[i];

    if (current.type !== 'rest') {
      combined.push(current);
      cursor += current.duration;
      i += 1;
      continue;
    }

    const beatIdx = Math.floor((cursor + epsilon) / beatValue);
    const beatEnd = (beatIdx + 1) * beatValue;
    let j = i;
    let runDuration = 0;

    while (j < bar.length) {
      const item = bar[j];
      if (item.type !== 'rest') break;
      if (cursor + runDuration + item.duration > beatEnd + epsilon) break;
      runDuration += item.duration;
      j += 1;
    }

    const mergedName = restNameForDuration(runDuration);
    if (j > i + 1 && mergedName) {
      combined.push({
        ...current,
        name: mergedName,
        value: mergedName,
        duration: runDuration,
      });
      cursor += runDuration;
      i = j;
      continue;
    }

    combined.push(current);
    cursor += current.duration;
    i += 1;
  }

  return combined;
}

export default App;
