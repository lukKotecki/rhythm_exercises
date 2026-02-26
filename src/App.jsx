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

  function generateBars() {
    // parse time signature
    const [numStr, denStr] = options.timeSignature.split('/');
    const numerator = parseInt(numStr, 10);
    const denominator = parseInt(denStr, 10);
    // value of a beat in quarter-note units: quarter=1, eighth=0.5 etc.
    const beatValue = 4 / denominator;
    const barLength = numerator * beatValue;

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
      while (sum < barLength) {
        const choice = choices[Math.floor(Math.random() * choices.length)];
        if (!choice) break;
        // don't pick a note that would push over the bar
        if (sum + choice.duration > barLength) break;
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

    // insert an empty bar at start for warm-up (accent on rest)
    const emptyBar = [{
      type: 'rest',
      name: 'warmup',
      duration: barLength,
      value: '',
      symbol: '',
      accent: true,
    }];
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
      <Header currentPage={currentPage} onChangePage={setCurrentPage} />
      <div className="content-wrap">
        <Sidebar
          options={options}
          onChangeOptions={setOptions}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
          running={running}
          hasBars={barsData.length > 0}
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
