import { useEffect, useState, useRef } from 'react';


export default function RhythmArea({ barsData, timeSignature, running, onPause }) {
  const [clicks, setClicks] = useState([]);
  const [results, setResults] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const audioCtx = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);

  // compute onsets for the expected rhythm
  const expectedOnsets = useRef([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const nextExpectedIdx = useRef(0);

  // when barsData changes we recompute onsets and reset tracking
  useEffect(() => {
    if (barsData.length === 0) return;
    // compute expected onsets in seconds assuming quarter note = 1 beat and tempo 60 (1s per beat)
    let time = 0;
    expectedOnsets.current = [];
    barsData.forEach((bar, idx) => {
      if (idx === 0) {
        // warm-up bar: advance time but don't add onsets
        bar.forEach((note) => {
          time += note.duration;
        });
      } else {
        bar.forEach((note) => {
          expectedOnsets.current.push(time);
          time += note.duration;
        });
      }
    });
    setTotalDuration(time);
    // reset user tracking
    setClicks([]);
    setResults([]);
    nextExpectedIdx.current = 0;
  }, [barsData]);

  function startMetronome() {
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    startTimeRef.current = audioCtx.current.currentTime;
    // reset elapsed
    setElapsed(0);
    // determine beats per bar from timeSignature
    let beatsPerBar = 4;
    if (timeSignature) {
      const [numStr] = timeSignature.split('/');
      const n = parseInt(numStr, 10);
      if (!isNaN(n)) beatsPerBar = n;
    }
    let beat = 0;
    intervalRef.current = setInterval(() => {
      const osc = audioCtx.current.createOscillator();
      // accent on first beat of bar
      if (beat % beatsPerBar === 0) {
        osc.frequency.value = 1500;
      } else {
        osc.frequency.value = 1000;
      }
      osc.connect(audioCtx.current.destination);
      osc.start();
      osc.stop(audioCtx.current.currentTime + 0.05);
      beat += 1;
    }, 1000);
    // start animation frame for elapsed
    function update() {
      setElapsed(audioCtx.current.currentTime - startTimeRef.current);
      rafRef.current = requestAnimationFrame(update);
    }
    rafRef.current = requestAnimationFrame(update);
  }

  function stopMetronome() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (onPause) onPause();
  }

  function handleKey(e) {
    if (e.code === 'Space') {
      handleUserClick();
    } else if (e.code === 'Escape' || e.key === 's' || e.key === 'S') {
      stopMetronome();
    }
  }

  function handleUserClick() {
    const now = audioCtx.current
      ? audioCtx.current.currentTime - startTimeRef.current
      : Date.now() / 1000 - startTimeRef.current;
    setClicks((c) => [...c, now]);
  }

  // check clicks against expected onsets on each click
  useEffect(() => {
    if (clicks.length === 0) return;
    const lastClick = clicks[clicks.length - 1];
    const idx = nextExpectedIdx.current;
    if (idx >= expectedOnsets.current.length) return;
    const target = expectedOnsets.current[idx];
    const diff = Math.abs(lastClick - target);
    const correct = diff < 0.25; // within a quarter-second
    setResults((r) => [...r, { expected: target, actual: lastClick, correct }]);
    nextExpectedIdx.current = idx + 1;
  }, [clicks]);

  // stop metronome when component unmounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => stopMetronome();
  }, []);

  // global key listener (space for click, escape/s for stop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    function onKey(e) {
      handleKey(e);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // start metronome when barsData is available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (barsData.length > 0 && running) {
      startMetronome();
    }
  }, [barsData, running]);

  // when running toggled off (pause), rewind progress but keep bars
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    if (!running && barsData.length > 0) {
      // reset click/results but keep bars shown
      setClicks([]);
      setResults([]);
      nextExpectedIdx.current = 0;
      stopMetronome();
    }
  }, [running, barsData]);

  return (
    <main
      className="rhythm-area"
      onClick={handleUserClick}
      tabIndex={0}
      onKeyDown={handleKey}
    >
      {barsData.length === 0 ? (
        <p>Press "Start" to generate rhythm.</p>
      ) : (
        <div className="bars">
          {barsData.map((bar, i) => (
            <div key={i} className="bar">
              {/* accent marker at beginning */}
              <span className="accent-marker">&gt;</span>
              {(() => {
                const barDur = bar.reduce((a, n) => a + n.duration, 0);
                return bar.map((note, j) => {
                  const pct = barDur > 0 ? (note.duration / barDur) * 100 : 0;
                  return (
                    <span
                      key={j}
                      className={`note ${note.type}${note.accent ? ' accent' : ''}`}
                      style={{ flexBasis: `${pct}%` }}
                    >
                      {note.symbol || note.value}
                    </span>
                  );
                });
              })()}
            </div>
          ))}
        </div>
      )}
      {results.length > 0 && (
        <div className="results">
          {results.map((r, i) => (
            <div key={i} className={r.correct ? 'correct' : 'wrong'}>
              {r.correct ? '✓' : '✗'} expected {r.expected.toFixed(2)} got {r.actual.toFixed(2)}
            </div>
          ))}
        </div>
      )}
      {/* progress bar showing click positions */}
      {totalDuration > 0 && (
        <div className="progress-bar">
          {clicks.length > 0 &&
            clicks.map((t, i) => {
              const pct = Math.min(100, (t / totalDuration) * 100);
              const color = results[i] ? (results[i].correct ? 'green' : 'red') : '#333';
              return <span key={i} className="click-marker" style={{ left: `${pct}%`, background: color }} />;
            })}
          {/* moving head */}
          {running && (
            <span
              className="progress-head"
              style={{ left: `${Math.min(100, (elapsed / totalDuration) * 100)}%` }}
            />
          )}
        </div>
      )}
    </main>
  );
}
