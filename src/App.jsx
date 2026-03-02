import { useState } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import RhythmArea from './components/RhythmArea.jsx';
import Instructions from './components/Instructions.jsx';
import About from './components/About.jsx';
import Settings from './components/Settings.jsx';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('Home');

  // options state
  const [options, setOptions] = useState({
    noteValues: { whole: true, half: true, quarter: true, eighth: true, sixteenth: true },
    rests: { whole: false, half: false, quarter: false, eighth: false, sixteenth: false },
    timeSignature: '4/4',
    articulation: 'legato',
    bars: 4,
  });

  const [barsData, setBarsData] = useState([]);
  const [running, setRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function generateBars() {
    // determine beats per bar (quarter notes) from the numerator of timeSignature
    let beatsPerBar = 4;
    if (options.timeSignature) {
      const [numStr] = options.timeSignature.split('/');
      const n = parseInt(numStr, 10);
      if (!isNaN(n)) beatsPerBar = n;
    }

    // convert bar length to quarter-note count (not needed internally)
    const barLength = beatsPerBar;

    // build list of possible notes and rests with their durations
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
      let sum = 0;
      // keep adding random choices until we exactly match the meter value
      while (sum < barLength) {
        const available = choices.filter((c) => sum + c.duration <= barLength);
        if (available.length === 0) {
          // no suitable choice left; break to avoid infinite loop
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

    // insert a warm-up bar at start filled with quarter-note rests
    const emptyBar = [];
    for (let beat = 0; beat < beatsPerBar; beat++) {
      emptyBar.push({
        type: 'rest',
        name: 'quarter',
        duration: 1,
        value: '',
        symbol: mapSymbol({ type: 'rest', name: 'quarter' }),
        accent: beat === 0,
      });
    }
    setBarsData([emptyBar, ...bars]);
  }

  function handleStart() {
    if (running) return; // already active
    generateBars();
    setRunning(true);
  }

  function handlePause() {
    // stop playback but keep generated rhythm
    setRunning(false);
  }

  function handleReset() {
    setBarsData([]);
    setRunning(false);
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
      />
      <div className="content-wrap">
        <Sidebar
          options={options}
          onChangeOptions={setOptions}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
          running={running}
          hasBars={barsData.length > 0}
          open={sidebarOpen}
        />
        <div className="main-area">
          {currentPage === 'Home' && (
            <RhythmArea
              barsData={barsData}
              timeSignature={options.timeSignature}
              running={running}
              onPause={handlePause}
              // no need for onStop
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
