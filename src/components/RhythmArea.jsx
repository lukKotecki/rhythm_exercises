import { useEffect, useState, useRef } from 'react';

// Convert absolute time t (seconds since start) to 1-based slot number within a bar.
// beatDuration: duration of one metronome beat (= beatValue at 60 BPM)
// slotsPerBeat: number of grid slots per beat (tappedRhythmAccuracy)
function timeToSlot(offsetInBar, beatDuration, slotsPerBeat) {
  return Math.floor((offsetInBar / beatDuration) * slotsPerBeat) + 1;
}

export default function RhythmArea({
  barsData,
  timeSignature,
  metronomeDelay,
  tappedRhythmAccuracy,
  metronomeSound,
  synchronization,
  exerciseMode,
  running,
  onPause,
  onCalibrationComplete,
}) {
  // tapped rhythm: array of timestamps (seconds) when user clicked/pressed space
  const [tappedRhythm, setTappedRhythm] = useState([]);
  // tapAssessments[i] = { barIndex, slot, correct } for each tap
  const [tapAssessments, setTapAssessments] = useState([]);
  // barAccuracy[i] = { barIndex, accuracyPct, matched, expected } for each non-warmup bar
  const [barAccuracy, setBarAccuracy] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const audioCtx = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const calibrationSentRef = useRef(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentBar, setCurrentBar] = useState(-1);

  // per-bar expected slot Sets (index 0 = warmup, skipped during evaluation)
  const expectedByBarRef = useRef([]);
  const expectedTapTimesRef = useRef([]);
  // timing lookup built when barsData changes
  const timingMapRef = useRef({ beatsPerBar: 4, beatDuration: 1, slotsPerBeat: 12, barStarts: [], barEnds: [] });
  const [totalDuration, setTotalDuration] = useState(0);

  // Build per-bar expected slot sets and timing map whenever barsData / accuracy setting changes
  useEffect(() => {
    if (barsData.length === 0) {
      expectedByBarRef.current = [];
      timingMapRef.current = { beatsPerBar: 4, beatDuration: 1, slotsPerBeat: 12, barStarts: [], barEnds: [] };
      return;
    }

    let beatsPerBar = 4;
    let beatValue = 1;
    if (timeSignature) {
      const [numStr, denomStr] = timeSignature.split('/');
      const n = parseInt(numStr, 10);
      const d = parseInt(denomStr, 10);
      if (!Number.isNaN(n)) beatsPerBar = n;
      if (!Number.isNaN(d)) beatValue = 4 / d;
    }
    // beatDuration = beatsValue seconds at fixed 60 BPM (1 quarter-note = 1 s)
    const beatDuration = beatValue;
    const slotsPerBeat = Math.max(4, Math.min(100, tappedRhythmAccuracy || 12));

    let time = 0;
    const barStarts = [];
    const barEnds = [];
    const expectedByBar = [];
    const expectedTapTimes = [];

    barsData.forEach((bar, idx) => {
      barStarts.push(time);
      let offsetInBar = 0;
      const slots = new Set();
      bar.forEach((note) => {
        // only notes (not rests) in non-warmup bars generate expected tap slots
        if (idx > 0 && note.type === 'note') {
          expectedTapTimes.push(time);
          const slot = timeToSlot(offsetInBar, beatDuration, slotsPerBeat);
          const maxSlot = beatsPerBar * slotsPerBeat;
          slots.add(Math.max(1, Math.min(maxSlot, slot)));
        }
        offsetInBar += note.duration;
        time += note.duration;
      });
      barEnds.push(time);
      expectedByBar.push(slots);
    });

    expectedByBarRef.current = expectedByBar;
  expectedTapTimesRef.current = expectedTapTimes;
    timingMapRef.current = { beatsPerBar, beatDuration, slotsPerBeat, barStarts, barEnds };
    setTotalDuration(time);
    // reset tracking
    setTappedRhythm([]);
    setTapAssessments([]);
    setBarAccuracy([]);
    calibrationSentRef.current = false;
  }, [barsData, timeSignature, tappedRhythmAccuracy]);

  function startMetronome() {
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    startTimeRef.current = audioCtx.current.currentTime;
    // reset elapsed
    setElapsed(0);
    // determine beats per bar and beat value from timeSignature
    let beatsPerBar = 4;
    let beatValue = 1;
    if (timeSignature) {
      const [numStr, denomStr] = timeSignature.split('/');
      const n = parseInt(numStr, 10);
      const d = parseInt(denomStr, 10);
      if (!isNaN(n)) beatsPerBar = n;
      if (!isNaN(d)) beatValue = 4 / d;
    }
    // beatValue * 1000 = ms per metronome tick at fixed 60 BPM
    const beatIntervalMs = beatValue * 1000;
    let beat = 0;
    const totalBeats = beatsPerBar * barsData.length;
    const playBeat = () => {
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
    };

    // play first click immediately; subsequent clicks keep the beat interval
    playBeat();
    intervalRef.current = setInterval(playBeat, beatIntervalMs);
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
      handleTapInput();
    } else if (e.code === 'Escape' || e.key === 's' || e.key === 'S') {
      stopMetronome();
    }
  }

  function handleTapInput() {
    const now = audioCtx.current
      ? audioCtx.current.currentTime - startTimeRef.current
      : Date.now() / 1000 - startTimeRef.current;
    setTappedRhythm((prev) => [...prev, now]);
  }

  // Evaluate every tap against the time-slot grid; compute per-bar accuracy
  useEffect(() => {
    const { beatsPerBar, beatDuration, slotsPerBeat, barStarts, barEnds } = timingMapRef.current;
    if (!barStarts.length) return;

    const manualDelaySec = (metronomeDelay || 0) / 100;
    const syncDelaySec = synchronization?.enabled ? (synchronization.averageOffsetSec || 0) : 0;
    const totalDelaySec = manualDelaySec + syncDelaySec;

    const assessments = [];
    // track which slots have already been matched in each bar (once each)
    const matchedByBar = barsData.map(() => new Set());
    const tapCountByBar = new Array(barsData.length).fill(0);

    tappedRhythm.forEach((tapTime, ti) => {
      const correctedTapTime = tapTime - totalDelaySec;
      const barIndex = barStarts.findIndex((start, idx) => correctedTapTime >= start && correctedTapTime < barEnds[idx]);
      if (barIndex <= 0) { // warmup bar or before start: ignore
        assessments[ti] = { barIndex, slot: null, correct: false };
        return;
      }

      const offsetInBar = correctedTapTime - barStarts[barIndex];
      const slot = timeToSlot(offsetInBar, beatDuration, slotsPerBeat);
      const maxSlot = beatsPerBar * slotsPerBeat;
      const bounded = Math.max(1, Math.min(maxSlot, slot));
      const expected = expectedByBarRef.current[barIndex] || new Set();
      const alreadyMatched = matchedByBar[barIndex].has(bounded);
      const correct = expected.has(bounded) && !alreadyMatched;

      if (correct) matchedByBar[barIndex].add(bounded);
      tapCountByBar[barIndex] += 1;
      assessments[ti] = { barIndex, slot: bounded, correct };
    });

    const accRows = [];
    for (let i = 1; i < barsData.length; i++) {
      const expectedCount = (expectedByBarRef.current[i] || new Set()).size;
      const matched = matchedByBar[i].size;
      const extra = Math.max(0, tapCountByBar[i] - matched);
      const missed = Math.max(0, expectedCount - matched);
      const denom = matched + extra + missed;
      const pct = denom === 0 ? 100 : Math.round((matched / denom) * 100);
      accRows.push({ barIndex: i, accuracyPct: pct, matched, expected: expectedCount });
    }

    setTapAssessments(assessments);
    setBarAccuracy(accRows);
  }, [tappedRhythm, barsData, metronomeDelay, synchronization]);

  useEffect(() => {
    if (!running || exerciseMode !== 'delay-calibration' || elapsed < totalDuration || totalDuration <= 0) return;
    if (calibrationSentRef.current) return;
    const expected = expectedTapTimesRef.current;
    if (!expected.length || tappedRhythm.length === 0) return;

    const sampleCount = Math.min(expected.length, tappedRhythm.length);
    if (sampleCount <= 0) return;

    let sum = 0;
    for (let i = 0; i < sampleCount; i++) {
      sum += tappedRhythm[i] - expected[i];
    }
    const averageOffsetSec = sum / sampleCount;
    if (onCalibrationComplete) {
      onCalibrationComplete({ averageOffsetSec, sampleCount });
      calibrationSentRef.current = true;
    }
  }, [running, exerciseMode, elapsed, totalDuration, tappedRhythm, onCalibrationComplete]);

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
        setTappedRhythm([]);
        setTapAssessments([]);
        setBarAccuracy([]);
      }
      stopMetronome();
    }
  }, [running, barsData, elapsed, totalDuration]);

  return (
    <main
      className="rhythm-area"
      onClick={handleTapInput}
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
            // collect taps that fall in this bar with their global index
            const barTapped = tappedRhythm.reduce((acc, t, ti) => {
              if (t >= barStart && t < barEnd) acc.push({ t, ti });
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
                  {barTapped.map(({ t, ti }) => {
                    const pct = ((t - barStart) / barDuration) * 100;
                    const assessment = tapAssessments[ti];
                    const color = assessment
                      ? (assessment.correct ? '#22c55e' : '#ef4444')
                      : '#94a3b8';
                    return (
                      <span
                        key={ti}
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
      {barAccuracy.length > 0 && (
        <div className="results">
          {barAccuracy.map((row) => (
            <div
              key={row.barIndex}
              className={`bar-accuracy ${row.accuracyPct >= 80 ? 'good' : 'bad'}`}
            >
              Bar {row.barIndex}: tapped rhythm {row.accuracyPct}%
              &nbsp;({row.matched}/{row.expected})
            </div>
          ))}
        </div>
      )}

    </main>
  );
}
