import { useEffect, useState, useRef } from 'react';

// Convert absolute time t (seconds since start) to 1-based slot number within a bar.
// beatDuration: duration of one metronome beat (= beatValue at 60 BPM)
// slotsPerBeat: number of grid slots per beat (tappedRhythmAccuracy)
function timeToSlot(offsetInBar, beatDuration, slotsPerBeat) {
  return Math.floor((offsetInBar / beatDuration) * slotsPerBeat) + 1;
}

const OSC_WAVEFORMS = new Set(['sine', 'square', 'triangle', 'sawtooth']);

function playWaveClick(audioCtx, waveform, frequency, durationSec = 0.05) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = waveform;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSec);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + durationSec);
}

function playCowbellClick(audioCtx, frequency, isAccent) {
  const durationSec = isAccent ? 0.11 : 0.09;
  const gain = audioCtx.createGain();
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 700;

  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  osc1.type = 'square';
  osc2.type = 'square';
  osc1.frequency.value = frequency;
  osc2.frequency.value = frequency * 1.48;

  gain.gain.setValueAtTime(isAccent ? 0.55 : 0.42, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSec);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(hp);
  hp.connect(audioCtx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(audioCtx.currentTime + durationSec);
  osc2.stop(audioCtx.currentTime + durationSec);
}

function playWoodblockClick(audioCtx, frequency, isAccent) {
  const durationSec = isAccent ? 0.08 : 0.06;
  const osc = audioCtx.createOscillator();
  const bp = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.value = frequency * (isAccent ? 1.05 : 1);
  bp.type = 'bandpass';
  bp.frequency.value = frequency;
  bp.Q.value = 12;

  gain.gain.setValueAtTime(isAccent ? 0.5 : 0.35, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSec);

  osc.connect(bp);
  bp.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + durationSec);
}

function playClaveClick(audioCtx, frequency, isAccent) {
  const durationSec = isAccent ? 0.06 : 0.05;
  const osc = audioCtx.createOscillator();
  const hp = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.value = frequency * (isAccent ? 1.15 : 1);
  hp.type = 'highpass';
  hp.frequency.value = 1200;

  gain.gain.setValueAtTime(isAccent ? 0.45 : 0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSec);

  osc.connect(hp);
  hp.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + durationSec);
}

function playHiHatClick(audioCtx, isAccent) {
  const durationSec = isAccent ? 0.05 : 0.035;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * durationSec, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;

  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = isAccent ? 5000 : 6500;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(isAccent ? 0.5 : 0.35, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSec);

  src.connect(hp);
  hp.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
  src.stop(audioCtx.currentTime + durationSec);
}

function playMetronomeClick(audioCtx, soundConfig, isAccent) {
  const sound = soundConfig || {};
  const selected = sound.waveform || 'sine';
  const baseFreq = isAccent ? (sound.accentFreq || 1500) : (sound.beatFreq || 1000);

  if (OSC_WAVEFORMS.has(selected)) {
    playWaveClick(audioCtx, selected, baseFreq, 0.05);
    return;
  }

  switch (selected) {
    case 'cowbell':
      playCowbellClick(audioCtx, baseFreq, isAccent);
      break;
    case 'woodblock':
      playWoodblockClick(audioCtx, baseFreq, isAccent);
      break;
    case 'clave':
      playClaveClick(audioCtx, baseFreq, isAccent);
      break;
    case 'hihat':
      playHiHatClick(audioCtx, isAccent);
      break;
    default:
      playWaveClick(audioCtx, 'sine', baseFreq, 0.05);
      break;
  }
}

function findClosestSlot(expectedSet, targetSlot, predicate = null) {
  let bestSlot = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  expectedSet.forEach((slotVal) => {
    if (predicate && !predicate(slotVal)) return;
    const dist = Math.abs(slotVal - targetSlot);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestSlot = slotVal;
    }
  });
  return { slot: bestSlot, distance: bestDistance };
}

export default function RhythmArea({
  barsData,
  timeSignature,
  tappedRhythmAccuracy,
  userTapSyncPercent,
  showExpectedRhythmGrid,
  metronomeSound,
  bpm = 60,
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
  // expected slots that were not hit exactly (used for blue markers)
  const [missingExpectedByBar, setMissingExpectedByBar] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const audioCtx = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const startTokenRef = useRef(0);
  const audioPrimedRef = useRef(false);
  const calibrationSentRef = useRef(false);
  const finishedNaturallyRef = useRef(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentBar, setCurrentBar] = useState(-1);
  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

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
    // beatDuration in real seconds: at 60 BPM = beatValue s, at 80 BPM = beatValue * 0.75 s
    const beatDuration = beatValue * (60 / bpm);
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
        const noteDurationSec = note.duration * (60 / bpm);
        offsetInBar += noteDurationSec;
        time += noteDurationSec;
      });
      barEnds.push(time);
      expectedByBar.push(slots);
    });

    expectedByBarRef.current = expectedByBar;
    expectedTapTimesRef.current = expectedTapTimes;
    timingMapRef.current = { beatsPerBar, beatDuration, slotsPerBeat, barStarts, barEnds };
    setTotalDuration(time);
    // reset tracking
    finishedNaturallyRef.current = false;
    setTappedRhythm([]);
    setTapAssessments([]);
    setBarAccuracy([]);
    setMissingExpectedByBar([]);
    calibrationSentRef.current = false;
  }, [barsData, timeSignature, tappedRhythmAccuracy, bpm]);

  async function ensureAudioReady() {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') {
      try {
        await audioCtx.current.resume();
      } catch {
        // Keep trying on next user interaction.
      }
    }
    if (!audioPrimedRef.current) {
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      osc.start();
      osc.stop(audioCtx.current.currentTime + 0.01);
      audioPrimedRef.current = true;
    }
    return audioCtx.current;
  }

  async function startMetronome() {
    const startToken = ++startTokenRef.current;
    const ctx = await ensureAudioReady();
    if (startToken !== startTokenRef.current) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    startTimeRef.current = ctx.currentTime;
    finishedNaturallyRef.current = false;
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
    // scale by 60/bpm so that at 60 BPM one beat = 1 s, at 80 BPM = 0.75 s, etc.
    const beatIntervalMs = beatValue * (60 / bpm) * 1000;
    let beat = 0;
    const totalBeats = beatsPerBar * barsData.length;
    const playBeat = () => {
      // stop once we've played the requested number of beats
      if (beat >= totalBeats) {
        finishedNaturallyRef.current = true;
        setElapsed(totalDuration);
        stopMetronome();
        return;
      }

      setCurrentBeat(beat % beatsPerBar);
      setCurrentBar(Math.floor(beat / beatsPerBar));

      const isAccent = beat % beatsPerBar === 0;
      playMetronomeClick(ctx, metronomeSound, isAccent);
      beat += 1;
    };

    // play first click immediately; subsequent clicks keep the beat interval
    playBeat();
    intervalRef.current = setInterval(playBeat, beatIntervalMs);
    // start animation frame for elapsed
    function update() {
      setElapsed(ctx.currentTime - startTimeRef.current);
      rafRef.current = requestAnimationFrame(update);
    }
    rafRef.current = requestAnimationFrame(update);
  }

  function stopMetronome() {
    startTokenRef.current += 1;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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

    const goodDistanceSlots = 1;
    const nearDistanceSlots = 2;
    const userTapSyncDelaySec = beatDuration * ((userTapSyncPercent ?? 10) / 100);

    const assessments = [];
    // track which slots have already been matched exactly in each bar (once each)
    const matchedByBar = barsData.map(() => new Set());
    const tapCountByBar = new Array(barsData.length).fill(0);

    tappedRhythm.forEach((tapTime, ti) => {
      // Use the same timeline as visible click markers on the progress bar.
      const displayTapTime = tapTime + userTapSyncDelaySec;
      const barIndex = barStarts.findIndex((start, idx) => displayTapTime >= start && displayTapTime < barEnds[idx]);
      if (barIndex <= 0) { // warmup bar or before start: ignore
        assessments[ti] = { barIndex, slot: null, status: 'bad', correct: false };
        return;
      }

      const offsetInBar = displayTapTime - barStarts[barIndex];
      const slot = timeToSlot(offsetInBar, beatDuration, slotsPerBeat);
      const maxSlot = beatsPerBar * slotsPerBeat;
      let bounded = Math.max(1, Math.min(maxSlot, slot));
      let effectiveBarIndex = barIndex;

      // If tap lands just before next bar start, allow it to count as slot 1 in next bar.
      const nextBarIndex = barIndex + 1;
      if (nextBarIndex > 0 && nextBarIndex < barStarts.length) {
        const nextStart = barStarts[nextBarIndex];
        const slotDurationSec = beatDuration / slotsPerBeat;
        const boundaryToleranceSec = goodDistanceSlots * slotDurationSec;
        const earlyForNextBar = displayTapTime < nextStart && (nextStart - displayTapTime) <= boundaryToleranceSec;
        const nextExpected = expectedByBarRef.current[nextBarIndex] || new Set();
        const nextSlotAvailable = nextExpected.has(1) && !matchedByBar[nextBarIndex].has(1);

        if (earlyForNextBar && nextSlotAvailable) {
          effectiveBarIndex = nextBarIndex;
          bounded = 1;
        }
      }

      const expected = expectedByBarRef.current[effectiveBarIndex] || new Set();
      const unmatchedClosest = findClosestSlot(expected, bounded, (slotVal) => !matchedByBar[effectiveBarIndex].has(slotVal));
      const anyClosest = findClosestSlot(expected, bounded);

      let status = 'bad';
      if (unmatchedClosest.slot !== null && unmatchedClosest.distance <= goodDistanceSlots) {
        status = 'good';
        matchedByBar[effectiveBarIndex].add(unmatchedClosest.slot);
      } else if (anyClosest.slot !== null && anyClosest.distance <= nearDistanceSlots) {
        status = 'near';
      }

      tapCountByBar[effectiveBarIndex] += 1;
      assessments[ti] = { barIndex: effectiveBarIndex, slot: bounded, status, correct: status === 'good' };
    });

    const accRows = [];
    const missingByBar = barsData.map(() => []);
    for (let i = 1; i < barsData.length; i++) {
      const expectedSlots = expectedByBarRef.current[i] || new Set();
      const expectedCount = expectedSlots.size;
      const matched = matchedByBar[i].size;
      const extra = Math.max(0, tapCountByBar[i] - matched);
      const missed = Math.max(0, expectedCount - matched);
      const denom = matched + extra + missed;
      const pct = denom === 0 ? 100 : Math.round((matched / denom) * 100);
      accRows.push({ barIndex: i, accuracyPct: pct, matched, expected: expectedCount });
      missingByBar[i] = [...expectedSlots].filter((slotVal) => !matchedByBar[i].has(slotVal));
    }

    setTapAssessments(assessments);
    setBarAccuracy(accRows);
    setMissingExpectedByBar(missingByBar);
  }, [tappedRhythm, barsData, userTapSyncPercent]);

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

  // Prime audio engine on first user gesture to avoid initial click latency.
  useEffect(() => {
    const prime = () => {
      void ensureAudioReady();
    };
    window.addEventListener('pointerdown', prime, { passive: true });
    window.addEventListener('keydown', prime);
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(max-width: 767px)');
    const handleChange = (e) => setIsSmallScreen(e.matches);
    setIsSmallScreen(media.matches);

    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
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
      const completed = finishedNaturallyRef.current || elapsed >= totalDuration;
      if (!completed) {
        setTappedRhythm([]);
        setTapAssessments([]);
        setBarAccuracy([]);
        setMissingExpectedByBar([]);
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
            // use the pre-computed timing map (already scaled by BPM) instead of
            // re-accumulating raw note durations which would be in quarter-note units
            const { barStarts: tmBarStarts, barEnds: tmBarEnds, beatDuration: tmBeatDuration } = timingMapRef.current;
            return barsData.map((bar, i) => {
            // compute beats per bar and beat value from time signature
            let beats = 4;
            let beatValue = 1; // quarter note = 1 unit
            if (timeSignature) {
              const [numStr, denomStr] = timeSignature.split('/');
              const n = parseInt(numStr, 10);
              const d = parseInt(denomStr, 10);
              if (!isNaN(n)) beats = n;
              // beat value depends on denominator: 4 = quarter (1), 8 = eighth (0.5), etc.
              if (!isNaN(d)) beatValue = 4 / d;
            }
            const isActiveBar = i === currentBar;
            const barStart = tmBarStarts[i] ?? 0;
            const barEnd = tmBarEnds[i] ?? barStart;
            const barDuration = barEnd - barStart;
            const barProgressPct = barDuration > 0
              ? Math.min(100, Math.max(0, (elapsed - barStart) / barDuration * 100))
              : 0;
            // userTapSyncDelaySec must be in real seconds — use BPM-scaled beatDuration
            const userTapSyncDelaySec = (tmBeatDuration || beatValue) * ((userTapSyncPercent ?? 10) / 100);
            // collect taps that fall in this bar with their global index
            const barTapped = tappedRhythm.reduce((acc, t, ti) => {
              const syncedTapTime = t + userTapSyncDelaySec;
              if (syncedTapTime >= barStart && syncedTapTime < barEnd) {
                acc.push({ t: syncedTapTime, ti });
              }
              return acc;
            }, []);
            const slotsPerBeat = timingMapRef.current.slotsPerBeat || 12;
            const totalSlotsInBar = beats * slotsPerBeat;
            const expectedSlots = [...(expectedByBarRef.current[i] || new Set())].sort((a, b) => a - b);
            const expectedSlotSet = new Set(expectedSlots);
            const missingSlotSet = new Set(missingExpectedByBar[i] || []);
            const totalBarDuration = beats * beatValue; // in quarter-note units

            // Mobile: percentage-based layout so each bar fills full container width.
            // Desktop: fixed cm-based layout.
            const barWidthStr = isSmallScreen ? '100%' : `${totalBarDuration * 3.3}cm`;
            const getBeatBoxLeft = (beatIdx) => isSmallScreen
              ? `${(beatIdx / beats) * 100}%`
              : `${beatIdx * beatValue * 3.3}cm`;
            const beatBoxWidthStr = isSmallScreen
              ? `${(1 / beats) * 100}%`
              : `${beatValue * 3.3}cm`;
            const getNoteWidth = (dur) => isSmallScreen
              ? `${(dur / totalBarDuration) * 100}%`
              : `${(dur / beatValue) * beatValue * 3.3}cm`;
            const getCountLeft = (j) => isSmallScreen
              ? `${((j + 0.5) / beats) * 100}%`
              : `${(j * beatValue + beatValue / 2) * 3.3}cm`;

            return (
              <div key={i} className="bar-wrapper">
                <div className="bar" style={{ width: barWidthStr }}>
                  {/* beat-box visual containers */}
                  {Array.from({ length: beats }, (_, beatIdx) => {
                    const isActiveBeatBox = i === currentBar && beatIdx === currentBeat;
                    return (
                      <div
                        key={`beat-box-${beatIdx}`}
                        className={`beat-box${isActiveBeatBox ? ' active' : ''}`}
                        style={{
                          position: 'absolute',
                          left: getBeatBoxLeft(beatIdx),
                          top: 0,
                          bottom: 0,
                          width: beatBoxWidthStr,
                        }}
                      />
                    );
                  })}
                  {bar.map((note, j) => (
                    <span
                      key={j}
                      className={`note ${note.type}${note.accent ? ' accent' : ''}`}
                      style={{ width: getNoteWidth(note.duration), flex: '0 0 auto' }}
                    >
                      {note.symbol || note.value}
                    </span>
                  ))}
                </div>
                <div className="count-bar" style={{ width: barWidthStr }}>
                  {Array.from({ length: beats }, (_, j) => (
                    <span
                      key={j}
                      className={`count${isActiveBar && currentBeat === j ? ' active' : ''}`}
                      style={{ left: getCountLeft(j) }}
                    >
                      {j + 1}
                    </span>
                  ))}
                </div>
                <div className="bar-progress" style={{ width: barWidthStr }}>
                  <div
                    className="bar-progress-fill"
                    style={{ transform: `scaleX(${barProgressPct / 100})` }}
                  />
                  {showExpectedRhythmGrid !== false && Array.from({ length: totalSlotsInBar }, (_, idx) => idx + 1).map((slotVal) => {
                    const pct = ((slotVal - 1) / totalSlotsInBar) * 100;
                    const isExpected = expectedSlotSet.has(slotVal);
                    const missing = isExpected && missingSlotSet.has(slotVal);
                    return (
                      <span
                        key={`grid-${i}-${slotVal}`}
                        className={`bar-grid-marker ${isExpected ? 'expected' : 'unexpected'}${missing ? ' missing' : ''}`}
                        style={{ left: `${pct}%` }}
                      />
                    );
                  })}
                  {barTapped.map(({ t, ti }) => {
                    const pct = ((t - barStart) / barDuration) * 100;
                    const assessment = tapAssessments[ti];
                    let color = '#ef4444';
                    if (assessment?.status === 'good') color = '#22c55e';
                    else if (assessment?.status === 'near') color = '#9ca3af';
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
