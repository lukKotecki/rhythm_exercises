import { useEffect, useState, useRef } from 'react';


export default function RhythmArea({ barsData, timeSignature, metronomeDelay, metronomeSound, running, onPause }) {
  const [clicks, setClicks] = useState([]);
  const [results, setResults] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const audioCtx = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentBar, setCurrentBar] = useState(-1);

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
    // determine how many metronome ticks we expect: one beat per quarter-note
    // multiplied by number of bars in barsData (includes warm‑up bar at start).
    // Example: default 4/4 with 4 bars → barsData.length == 5 → totalBeats = 20.
    let beat = 0;
    const totalBeats = beatsPerBar * barsData.length;
    intervalRef.current = setInterval(() => {
      // stop once we've played the requested number of beats
      if (beat >= totalBeats) {
        stopMetronome();
        return;
      }

      setCurrentBeat(beat % beatsPerBar);
      setCurrentBar(Math.floor(beat / beatsPerBar));

      const osc = audioCtx.current.createOscillator();
      const sound = metronomeSound || {};
      osc.type = sound.waveform || 'sine';
      osc.frequency.value = (beat % beatsPerBar === 0)
        ? (sound.accentFreq || 1500)
        : (sound.beatFreq || 1000);
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
  // only clear the history if the exercise was stopped before finishing;
  // if we've reached the end of the rhythm the results should remain visible.
  useEffect(() => {
    if (!running && barsData.length > 0) {
      // if we haven't yet played the whole duration, wipe the clicks/results
      if (elapsed < totalDuration) {
        setClicks([]);
        setResults([]);
        nextExpectedIdx.current = 0;
      }
      stopMetronome();
    }
  }, [running, barsData, elapsed, totalDuration]);

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
          {(() => {
            // compute bar start times in seconds (60BPM: duration in quarter-notes = seconds)
            const barStartTimes = [];
            let _t = 0;
            barsData.forEach((bar) => {
              barStartTimes.push(_t);
              bar.forEach((note) => { _t += note.duration; });
            });
            barStartTimes.push(_t);
            return barsData.map((bar, i) => {
            // compute beats per bar and beat value from time signature
            let beats = 4;
            let beatValue = 1; // quarter note = 1cm
            if (timeSignature) {
              const [numStr, denomStr] = timeSignature.split('/');
              const n = parseInt(numStr, 10);
              const d = parseInt(denomStr, 10);
              if (!isNaN(n)) beats = n;
              // beat value depends on denominator: 4 = quarter (1), 8 = eighth (0.5), etc.
              if (!isNaN(d)) beatValue = 4 / d;
            }
            const isActiveBar = i === currentBar;
            const barStart = barStartTimes[i];
            const barEnd = barStartTimes[i + 1];
            const barDuration = barEnd - barStart;
            const barProgressPct = barDuration > 0
              ? Math.min(100, Math.max(0, (elapsed - barStart) / barDuration * 100))
              : 0;
            const barClicks = clicks.reduce((acc, t, ci) => {
              if (t >= barStart && t < barEnd) acc.push({ t, ci });
              return acc;
            }, []);
            return (
              <div key={i} className="bar-wrapper">
                <div className="bar" style={{ width: `${beats * beatValue * 3.3}cm` }}>
                  {/* beat-box visual containers - width = beatValue * 3.3cm */}
                  {Array.from({ length: beats }, (_, beatIdx) => {
                    const beatBoxWidthCm = beatValue * 3.3;
                    const isActiveBeatBox = i === currentBar && beatIdx === currentBeat;
                    return (
                      <div
                        key={`beat-box-${beatIdx}`}
                        className={`beat-box${isActiveBeatBox ? ' active' : ''}`}
                        style={{
                          position: 'absolute',
                          left: `${beatIdx * beatBoxWidthCm}cm`,
                          top: 0,
                          bottom: 0,
                          width: `${beatBoxWidthCm}cm`,
                        }}
                      />
                    );
                  })}
                  {(() => {
                    const beatBoxWidthCm = beatValue * 3.3;
                    return bar.map((note, j) => {
                      // Width in cm: note duration scaled to beat-box width
                      // beatBoxWidth = beatValue * 3.3cm, represents beatValue quarter-notes
                      // So: width = (note.duration / beatValue) * beatBoxWidth
                      const widthCm = (note.duration / beatValue) * beatBoxWidthCm;
                      return (
                        <span
                          key={j}
                          className={`note ${note.type}${note.accent ? ' accent' : ''}`}
                          style={{ width: `${widthCm}cm`, flex: '0 0 auto' }}
                        >
                          {note.symbol || note.value}
                        </span>
                      );
                    });
                  })()}
                </div>
                <div className="count-bar" style={{ width: `${beats * beatValue * 3.3}cm` }}>
                  {i === 0 && timeSignature && (
                    <span className="meter">{timeSignature}</span>
                  )}
                  {Array.from({ length: beats }, (_, j) => {
                    const beatBoxWidthCm = beatValue * 3.3;
                    const countPosition = j * beatBoxWidthCm + beatBoxWidthCm / 2;
                    return (
                      <span
                        key={j}
                        className={`count${isActiveBar && currentBeat === j ? ' active' : ''}`}
                        style={{ left: `${countPosition}cm` }}
                      >
                        {j + 1}
                      </span>
                    );
                  })}
                </div>
                <div className="bar-progress" style={{ width: `${beats * beatValue * 3.3}cm` }}>
                  <div className="bar-progress-fill" style={{ width: `${barProgressPct}%` }} />
                  {barClicks.map(({ t, ci }) => {
                    const pct = ((t - barStart) / barDuration) * 100;
                    const r = results[ci];
                    const color = r ? (r.correct ? '#22c55e' : '#ef4444') : '#94a3b8';
                    return (
                      <span
                        key={ci}
                        className="bar-click-marker"
                        style={{ left: `${pct}%`, background: color }}
                      />
                    );
                  })}
                  {running && i === currentBar && (
                    <span
                      className="bar-progress-head"
                      style={{ left: `${barProgressPct}%` }}
                    />
                  )}
                </div>
              </div>
            );
          });})()}
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

    </main>
  );
}
