import { useEffect, useState, useRef } from 'react';
import NoteRenderer from './NoteRenderer.jsx';

// Convert absolute time t (seconds since start) to 1-based slot number within a bar.
// beatDuration: duration of one metronome beat (= beatValue at 60 BPM)
// slotsPerBeat: number of grid slots per beat (tappedRhythmAccuracy)
function timeToSlot(offsetInBar, beatDuration, slotsPerBeat) {
  return Math.floor((offsetInBar / beatDuration) * slotsPerBeat) + 1;
}

const GROUP_PATTERNS = [
  { name: 'triplet-eighth',            pattern: ['triplet-eighth', 'triplet-eighth', 'triplet-eighth'], requireFullBeat: true },
  { name: 'triplet-quarter',           pattern: ['quarter-triplet', 'quarter-triplet', 'quarter-triplet'], requireFullBeat: true, requiredBeatBoxes: 2 },
  { name: 'four-sixteenth',             pattern: ['sixteenth', 'sixteenth', 'sixteenth', 'sixteenth'], requireFullBeat: true },
  { name: 'two-sixteenth-and-eighth',   pattern: ['sixteenth', 'sixteenth', 'eighth'], requireFullBeat: true },
  { name: 'eighth-and-two-sixteenth',   pattern: ['eighth', 'sixteenth', 'sixteenth'], requireFullBeat: true },
  { name: 'sixteenth-eighth-sixteenth', pattern: ['sixteenth', 'eighth', 'sixteenth'], requireFullBeat: true },
  { name: 'dotted-eighth-sixteenth',    pattern: ['dotted-eighth', 'sixteenth'], requireFullBeat: true },
  { name: 'sixteenth-dotted-eighth',    pattern: ['sixteenth', 'dotted-eighth'], requireFullBeat: true },
  { name: 'eighth-pair',                pattern: ['eighth', 'eighth'], requireFullBeat: true },
  { name: 'three-sixteenth',            pattern: ['sixteenth', 'sixteenth', 'sixteenth'], requireFullBeat: false },
  { name: 'two-sixteenth',              pattern: ['sixteenth', 'sixteenth'], requireFullBeat: false },
];

function groupNotesForRender(bar, beatValue) {
  const items = [];
  let cumDur = 0;
  let i = 0;
  while (i < bar.length) {
    let matched = false;
    for (const { name, pattern, requireFullBeat, requiredBeatBoxes = 1 } of GROUP_PATTERNS) {
      const len = pattern.length;
      if (i + len > bar.length) continue;
      const slice = bar.slice(i, i + len);
      if (slice.some((n, j) => n.type !== 'note' || n.name !== pattern[j])) continue;
      const totalDur = slice.reduce((s, n) => s + n.duration, 0);
      const beatOffset = cumDur % beatValue;
      const startsAtBeatBoundary = beatOffset <= 0.001 || beatValue - beatOffset <= 0.001;
      if (!startsAtBeatBoundary && requireFullBeat) continue;

      const withinRequiredSpan = beatOffset + totalDur <= beatValue * requiredBeatBoxes + 0.001;
      if (!withinRequiredSpan) continue;

      if (requireFullBeat && Math.abs(totalDur - beatValue * requiredBeatBoxes) > 0.001) continue;
      items.push({ type: 'group', name, duration: totalDur, accent: slice[0].accent });
      cumDur += totalDur;
      i += len;
      matched = true;
      break;
    }
    if (!matched) {
      items.push(bar[i]);
      cumDur += bar[i].duration;
      i++;
    }
  }
  return items;
}

const OSC_WAVEFORMS = new Set(['sine', 'square', 'triangle', 'sawtooth']);

function playWaveClick(audioCtx, waveform, frequency, durationSec = 0.05, startAt = audioCtx.currentTime) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = waveform;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec);
}

function playCowbellClick(audioCtx, frequency, isAccent, startAt = audioCtx.currentTime) {
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

  gain.gain.setValueAtTime(isAccent ? 0.55 : 0.42, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(hp);
  hp.connect(audioCtx.destination);

  osc1.start(startAt);
  osc2.start(startAt);
  osc1.stop(startAt + durationSec);
  osc2.stop(startAt + durationSec);
}

function playWoodblockClick(audioCtx, frequency, isAccent, startAt = audioCtx.currentTime) {
  const durationSec = isAccent ? 0.08 : 0.06;
  const osc = audioCtx.createOscillator();
  const bp = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.value = frequency * (isAccent ? 1.05 : 1);
  bp.type = 'bandpass';
  bp.frequency.value = frequency;
  bp.Q.value = 12;

  gain.gain.setValueAtTime(isAccent ? 0.5 : 0.35, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

  osc.connect(bp);
  bp.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec);
}

function playClaveClick(audioCtx, frequency, isAccent, startAt = audioCtx.currentTime) {
  const durationSec = isAccent ? 0.06 : 0.05;
  const osc = audioCtx.createOscillator();
  const hp = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.value = frequency * (isAccent ? 1.15 : 1);
  hp.type = 'highpass';
  hp.frequency.value = 1200;

  gain.gain.setValueAtTime(isAccent ? 0.45 : 0.3, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

  osc.connect(hp);
  hp.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec);
}

function playHiHatClick(audioCtx, isAccent, startAt = audioCtx.currentTime) {
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
  gain.gain.setValueAtTime(isAccent ? 0.5 : 0.35, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

  src.connect(hp);
  hp.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(startAt);
  src.stop(startAt + durationSec);
}

function playMetronomeClick(audioCtx, soundConfig, isAccent, startAt = audioCtx.currentTime) {
  const sound = soundConfig || {};
  const selected = sound.waveform || 'sine';
  const baseFreq = isAccent ? (sound.accentFreq || 1500) : (sound.beatFreq || 1000);

  if (OSC_WAVEFORMS.has(selected)) {
    playWaveClick(audioCtx, selected, baseFreq, 0.05, startAt);
    return;
  }

  switch (selected) {
    case 'cowbell':
      playCowbellClick(audioCtx, baseFreq, isAccent, startAt);
      break;
    case 'woodblock':
      playWoodblockClick(audioCtx, baseFreq, isAccent, startAt);
      break;
    case 'clave':
      playClaveClick(audioCtx, baseFreq, isAccent, startAt);
      break;
    case 'hihat':
      playHiHatClick(audioCtx, isAccent, startAt);
      break;
    default:
      playWaveClick(audioCtx, 'sine', baseFreq, 0.05, startAt);
      break;
  }
}

function playRhythmCue(audioCtx, soundConfig) {
  const beatFreq = soundConfig?.beatFreq || 1000;
  const rhythmFreq = Math.max(220, Math.min(2600, beatFreq * 1.2));
  playWaveClick(audioCtx, 'triangle', rhythmFreq, 0.045);
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

function buildLegatoPlan(barsData, enabled, frequencyPercent = 50) {
  const ignoredNoteIdxByBar = barsData.map(() => new Set());
  const segmentsByBar = barsData.map(() => []);
  if (!enabled || !Array.isArray(barsData) || barsData.length === 0) {
    return { ignoredNoteIdxByBar, segmentsByBar };
  }

  const clampedFrequency = Math.max(0, Math.min(100, frequencyPercent));
  if (clampedFrequency <= 0) {
    return { ignoredNoteIdxByBar, segmentsByBar };
  }

  const barTotals = barsData.map((bar) => bar.reduce((sum, n) => sum + (n.duration || 0), 0));
  const allItems = [];

  barsData.forEach((bar, barIndex) => {
    let start = 0;
    bar.forEach((note, noteIdx) => {
      allItems.push({
        barIndex,
        noteIdx,
        note,
        start,
        duration: note.duration,
        totalBarDuration: barTotals[barIndex] || 1,
      });
      start += note.duration;
    });
  });

  const candidates = [];
  for (let i = 0; i < allItems.length - 1;) {
    const first = allItems[i];
    const second = allItems[i + 1];
    if (first.note?.type === 'note' && second.note?.type === 'note') {
      candidates.push({ first, second });
      i += 2;
    } else {
      i += 1;
    }
  }

  const selected = [];
  let carry = 0;
  candidates.forEach((pair) => {
    carry += clampedFrequency;
    if (carry >= 100) {
      selected.push(pair);
      carry -= 100;
    }
  });

  selected.forEach(({ first, second }) => {
    ignoredNoteIdxByBar[second.barIndex].add(second.noteIdx);

    const firstHeadPct = ((first.start + first.duration * 0.18) / first.totalBarDuration) * 100;
    const secondHeadPct = ((second.start + second.duration * 0.18) / second.totalBarDuration) * 100;

    if (first.barIndex === second.barIndex) {
      segmentsByBar[first.barIndex].push({
        fromPct: firstHeadPct,
        toPct: secondHeadPct,
      });
      return;
    }

    const nextInCurrentScalePct = secondHeadPct * (second.totalBarDuration / first.totalBarDuration);
    const boundaryGapPct = 1.2;
    segmentsByBar[first.barIndex].push({
      fromPct: firstHeadPct,
      toPct: 100 + boundaryGapPct + nextInCurrentScalePct,
    });
    segmentsByBar[second.barIndex].push({
      fromPct: 0,
      toPct: secondHeadPct,
      continuationFromPrevBar: true,
    });
  });

  return { ignoredNoteIdxByBar, segmentsByBar };
}

function calculateOverallTimingAccuracy(expectedTapTimes, userTapTimes, beatDurationSec) {
  if (!Array.isArray(expectedTapTimes) || expectedTapTimes.length === 0) return null;

  const expected = [...expectedTapTimes].sort((a, b) => a - b);
  const user = [...(userTapTimes || [])].sort((a, b) => a - b);
  const toleranceSec = Math.max(0.06, (beatDurationSec || 1) * 0.45);

  // Greedy local matching prevents one early/late tap from shifting all later pairs.
  // Matched taps contribute timing quality; missed/extra events contribute 0 equally.
  let i = 0;
  let j = 0;
  let matchedScoreSum = 0;
  let matchedCount = 0;
  let missedCount = 0;
  let extraCount = 0;

  while (i < expected.length && j < user.length) {
    const diff = user[j] - expected[i];
    const distance = Math.abs(diff);

    if (distance <= toleranceSec) {
      const ratio = Math.min(1, distance / toleranceSec);
      const normalized = Math.max(0, 1 - ratio ** 1.35);
      matchedScoreSum += normalized;
      matchedCount += 1;
      i += 1;
      j += 1;
      continue;
    }

    if (user[j] < expected[i]) {
      extraCount += 1;
      j += 1;
    } else {
      missedCount += 1;
      i += 1;
    }
  }

  if (i < expected.length) missedCount += expected.length - i;
  if (j < user.length) extraCount += user.length - j;

  const totalEvents = matchedCount + missedCount + extraCount;
  if (totalEvents <= 0) return 0;
  const combinedScore = matchedScoreSum / totalEvents;
  const pct = Math.round(Math.max(0, Math.min(1, combinedScore)) * 100);
  return pct;
}

function getAverageEligibleTapTimes(rawTapTimes, expectedTapTimes, timingMap, userTapSyncPercent) {
  const expected = Array.isArray(expectedTapTimes) ? expectedTapTimes : [];
  const beatDuration = timingMap?.beatDuration || 1;
  const barEnds = timingMap?.barEnds || [];
  const slotsPerBeat = timingMap?.slotsPerBeat || 12;
  const warmupEndTime = barEnds[0] ?? 0;
  const userTapSyncDelaySec = beatDuration * ((userTapSyncPercent ?? 10) / 100);
  const slotDurationSec = beatDuration / slotsPerBeat;
  const scoringToleranceSec = Math.max(0.06, beatDuration * 0.45);
  const boundaryToleranceSec = Math.max(slotDurationSec * 2, scoringToleranceSec);
  const firstExpectedAtBarStart = expected[0] !== undefined && Math.abs(expected[0] - warmupEndTime) <= 0.001;

  return (rawTapTimes || [])
    .map((tap) => tap + userTapSyncDelaySec)
    .filter((tap) => tap >= warmupEndTime || (firstExpectedAtBarStart && tap >= warmupEndTime - boundaryToleranceSec));
}

export default function RhythmArea({
  t,
  barsData,
  timeSignature,
  tappedRhythmAccuracy,
  userTapSyncPercent,
  legatoEnabled = false,
  legatoFrequency = 50,
  noteGraphicsMode = 'svg',
  repeatToken = 0,
  focusMainToken = 0,
  showMovingProgressIndicator = true,
  showExpectedRhythmGrid,
  useResponsiveBeatBoxWidth = true,
  metronomeSound,
  bpm = 60,
  playRhythmSound = true,
  exerciseMode,
  running,
  pausedElapsed = 0,
  onElapsedChange,
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
  const [overallAccuracyPct, setOverallAccuracyPct] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioCtx = useRef(null);
  const mainRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeoutRef = useRef(null);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const startTokenRef = useRef(0);
  const audioPrimedRef = useRef(false);
  const rhythmPlayIndexRef = useRef(0);
  const lastAudioElapsedRef = useRef(0);
  const playRhythmSoundRef = useRef(true);
  const calibrationSentRef = useRef(false);
  const finishedNaturallyRef = useRef(false);
  const rewardShownRef = useRef(false);
  const confettiHideTimerRef = useRef(null);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentBar, setCurrentBar] = useState(-1);
  const barsContainerRef = useRef(null);
  const barWrapperRefs = useRef([]);
  const barStartsNewLineRef = useRef([]);
  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  // per-bar expected slot Sets (index 0 = warmup, skipped during evaluation)
  const expectedByBarRef = useRef([]);
  const ignoredByBarRef = useRef([]);
  const legatoSegmentsByBarRef = useRef([]);
  const expectedTapTimesRef = useRef([]);
  const totalDurationRef = useRef(0);
  // timing lookup built when barsData changes
  const timingMapRef = useRef({ beatsPerBar: 4, beatDuration: 1, slotsPerBeat: 12, barStarts: [], barEnds: [] });
  const [totalDuration, setTotalDuration] = useState(0);

  // Build per-bar expected slot sets and timing map whenever barsData / accuracy setting changes
  useEffect(() => {
    if (barsData.length === 0) {
      expectedByBarRef.current = [];
      totalDurationRef.current = 0;
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
    const ignoredByBar = [];
    const expectedTapTimes = [];
    const { ignoredNoteIdxByBar, segmentsByBar } = buildLegatoPlan(barsData, legatoEnabled, legatoFrequency);

    barsData.forEach((bar, idx) => {
      barStarts.push(time);
      let offsetInBar = 0;
      const slots = new Set();
      const ignoredSlots = new Set();
      const secondLegatoNoteIdx = ignoredNoteIdxByBar[idx] || new Set();
      bar.forEach((note, noteIdx) => {
        const isSecondLegatoNote = secondLegatoNoteIdx.has(noteIdx);
        const slot = timeToSlot(offsetInBar, beatDuration, slotsPerBeat);
        const maxSlot = beatsPerBar * slotsPerBeat;
        const boundedSlot = Math.max(1, Math.min(maxSlot, slot));
        // only notes (not rests) in non-warmup bars generate expected tap slots
        if (idx > 0 && note.type === 'note' && !isSecondLegatoNote) {
          expectedTapTimes.push(time);
          slots.add(boundedSlot);
        }
        if (idx > 0 && note.type === 'note' && isSecondLegatoNote) {
          ignoredSlots.add(boundedSlot);
        }
        const noteDurationSec = note.duration * (60 / bpm);
        offsetInBar += noteDurationSec;
        time += noteDurationSec;
      });
      barEnds.push(time);
      expectedByBar.push(slots);
      ignoredByBar.push(ignoredSlots);
    });

    expectedByBarRef.current = expectedByBar;
    ignoredByBarRef.current = ignoredByBar;
    legatoSegmentsByBarRef.current = segmentsByBar;
    expectedTapTimesRef.current = expectedTapTimes;
    totalDurationRef.current = time;
    timingMapRef.current = { beatsPerBar, beatDuration, slotsPerBeat, barStarts, barEnds };
    setTotalDuration(time);
    // reset tracking
    finishedNaturallyRef.current = false;
    setTappedRhythm([]);
    setTapAssessments([]);
    setBarAccuracy([]);
    setMissingExpectedByBar([]);
    setOverallAccuracyPct(null);
    setShowConfetti(false);
    rewardShownRef.current = false;
    calibrationSentRef.current = false;
    rhythmPlayIndexRef.current = 0;
    lastAudioElapsedRef.current = 0;
    playRhythmSoundRef.current = playRhythmSound;
  }, [barsData, timeSignature, tappedRhythmAccuracy, bpm, legatoEnabled, legatoFrequency, playRhythmSound]);

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
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Support resuming from paused elapsed time
    const resumeFrom = pausedElapsed > 0 ? pausedElapsed : 0;
    const startupLeadInSec = resumeFrom > 0 ? 0 : 0.06;
    startTimeRef.current = ctx.currentTime + startupLeadInSec - resumeFrom;
    finishedNaturallyRef.current = false;
    lastAudioElapsedRef.current = resumeFrom;
    const expectedTimes = expectedTapTimesRef.current;
    let nextExpectedIndex = 0;
    while (nextExpectedIndex < expectedTimes.length && expectedTimes[nextExpectedIndex] < resumeFrom - 0.001) {
      nextExpectedIndex += 1;
    }
    rhythmPlayIndexRef.current = nextExpectedIndex;
    // start from resume position
    setElapsed(resumeFrom);
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
    const beatIntervalSec = beatValue * (60 / bpm);
    const beatIntervalMs = beatIntervalSec * 1000;
    const exerciseTotalDuration = totalDurationRef.current;
    // Calculate which beat to start from based on resumeFrom
    const { barStarts, barEnds } = timingMapRef.current;
    let startBeat = 0;
    if (resumeFrom > 0 && barStarts.length > 0) {
      // Find which bar we're in
      const barIndex = barStarts.findIndex((start, idx) => resumeFrom >= start && resumeFrom < barEnds[idx]);
      if (barIndex >= 0) {
        startBeat = barIndex * beatsPerBar;
      }
    }
    let beat = startBeat;
    let nextBeatAudioTime = ctx.currentTime + startupLeadInSec;
    const totalBeats = beatsPerBar * barsData.length;
    const schedulePendingBeats = () => {
      if (startToken !== startTokenRef.current) return;
      const scheduleLookAheadSec = 0.12;
      while (beat < totalBeats && nextBeatAudioTime <= ctx.currentTime + scheduleLookAheadSec) {
        const isAccent = beat % beatsPerBar === 0;
        playMetronomeClick(ctx, metronomeSound, isAccent, nextBeatAudioTime);
        beat += 1;
        nextBeatAudioTime += beatIntervalSec;
      }

      if (beat >= totalBeats && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    schedulePendingBeats();
    intervalRef.current = setInterval(schedulePendingBeats, Math.min(25, beatIntervalMs));

    // start animation frame for elapsed
    function update() {
      const rawElapsed = ctx.currentTime - startTimeRef.current;
      const currentElapsed = Math.max(resumeFrom, rawElapsed);
      const previousElapsed = lastAudioElapsedRef.current;
      const nextExpectedTimes = expectedTapTimesRef.current;
      const { barStarts: tmBarStarts, barEnds: tmBarEnds, beatDuration: tmBeatDuration } = timingMapRef.current;

      if (rawElapsed < 0 && resumeFrom <= 0) {
        setCurrentBeat(-1);
        setCurrentBar(-1);
        setElapsed(0);
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      if (currentElapsed >= exerciseTotalDuration) {
        finishedNaturallyRef.current = true;
        lastAudioElapsedRef.current = exerciseTotalDuration;
        setElapsed(exerciseTotalDuration);
        setCurrentBeat(-1);
        setCurrentBar(-1);
        stopMetronome();
        return;
      }

      const activeBarIndex = tmBarStarts.findIndex((start, idx) => currentElapsed >= start && currentElapsed < tmBarEnds[idx]);
      if (activeBarIndex >= 0) {
        const beatInBar = Math.max(0, Math.floor((currentElapsed - tmBarStarts[activeBarIndex]) / (tmBeatDuration || 1)));
        setCurrentBar(activeBarIndex);
        setCurrentBeat(Math.min(beatsPerBar - 1, beatInBar));
      } else {
        setCurrentBar(-1);
        setCurrentBeat(-1);
      }

      // Trigger rhythm sound exactly when progress crosses expected rhythm positions.
      while (rhythmPlayIndexRef.current < nextExpectedTimes.length) {
        const expectedTime = nextExpectedTimes[rhythmPlayIndexRef.current];
        if (expectedTime > currentElapsed) break;
        if (expectedTime >= previousElapsed - 0.001 && playRhythmSoundRef.current) {
          playRhythmCue(ctx, metronomeSound);
        }
        rhythmPlayIndexRef.current += 1;
      }

      lastAudioElapsedRef.current = currentElapsed;
      setElapsed(currentElapsed);
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
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    rhythmPlayIndexRef.current = 0;
    lastAudioElapsedRef.current = 0;
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
    if (!running || startTimeRef.current == null) return;
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
      if (barIndex < 0) {
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

      if (effectiveBarIndex <= 0) {
        assessments[ti] = { barIndex: effectiveBarIndex, slot: null, status: 'bad', correct: false };
        return;
      }

      const expected = expectedByBarRef.current[effectiveBarIndex] || new Set();
      const ignored = ignoredByBarRef.current[effectiveBarIndex] || new Set();

      const ignoredClosest = findClosestSlot(ignored, bounded);
      if (ignoredClosest.slot !== null && ignoredClosest.distance <= goodDistanceSlots) {
        assessments[ti] = { barIndex: effectiveBarIndex, slot: bounded, status: 'ignored', correct: true };
        return;
      }

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

  useEffect(() => {
    if (barsData.length === 0) {
      barStartsNewLineRef.current = [];
      return undefined;
    }

    const computeLineStarts = () => {
      const refs = barWrapperRefs.current;
      const starts = refs.map(() => false);
      for (let i = 1; i < refs.length; i++) {
        const prev = refs[i - 1];
        const curr = refs[i];
        if (!prev || !curr) continue;
        if (curr.offsetTop > prev.offsetTop + 1) starts[i] = true;
      }
      barStartsNewLineRef.current = starts;
    };

    const rafId = requestAnimationFrame(computeLineStarts);
    window.addEventListener('resize', computeLineStarts);

    let observer;
    if (typeof ResizeObserver !== 'undefined' && barsContainerRef.current) {
      observer = new ResizeObserver(computeLineStarts);
      observer.observe(barsContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', computeLineStarts);
      if (observer) observer.disconnect();
    };
  }, [barsData, isSmallScreen]);

  useEffect(() => {
    if (barsData.length === 0) return;
    setTappedRhythm([]);
    setTapAssessments([]);
    setBarAccuracy([]);
    setMissingExpectedByBar([]);
    setOverallAccuracyPct(null);
    setShowConfetti(false);
    setElapsed(0);
    setCurrentBeat(-1);
    setCurrentBar(-1);
    finishedNaturallyRef.current = false;
    rewardShownRef.current = false;
    calibrationSentRef.current = false;
  }, [repeatToken, barsData.length]);

  useEffect(() => {
    if (!finishedNaturallyRef.current || running) return;
    if (elapsed < totalDuration || totalDuration <= 0) return;

    const expected = expectedTapTimesRef.current;
    if (!expected.length) {
      setOverallAccuracyPct(null);
      return;
    }

    const { beatDuration } = timingMapRef.current;
    const effectiveBeatDuration = beatDuration || 1;
    const adjustedTaps = getAverageEligibleTapTimes(
      tappedRhythm,
      expected,
      timingMapRef.current,
      userTapSyncPercent,
    );

    if (adjustedTaps.length === 0) {
      setOverallAccuracyPct(0);
      return;
    }

    const overallPct = calculateOverallTimingAccuracy(expected, adjustedTaps, effectiveBeatDuration);
    setOverallAccuracyPct(overallPct);
  }, [elapsed, totalDuration, running, tappedRhythm, userTapSyncPercent]);

  useEffect(() => {
    if (!finishedNaturallyRef.current || rewardShownRef.current) return;
    if (barAccuracy.length === 0) return;
    const isPerfectRun = barAccuracy.every((row) => row.accuracyPct === 100);
    if (!isPerfectRun) return;

    rewardShownRef.current = true;
    setShowConfetti(true);
    if (confettiHideTimerRef.current) {
      clearTimeout(confettiHideTimerRef.current);
    }
    confettiHideTimerRef.current = setTimeout(() => {
      setShowConfetti(false);
      confettiHideTimerRef.current = null;
    }, 2800);
  }, [barAccuracy, running]);

  useEffect(() => {
    return () => {
      if (confettiHideTimerRef.current) {
        clearTimeout(confettiHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (focusMainToken <= 0) return;
    const node = mainRef.current;
    if (!node) return;
    if (typeof node.focus === 'function') {
      try {
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
    }
  }, [focusMainToken]);

  // start metronome when barsData is available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (barsData.length > 0 && running) {
      startMetronome();
    }
  }, [barsData, running, pausedElapsed, repeatToken]);

  // when running toggled off (stop), keep user markers/results visible;
  // they are cleared only by Start/Generate paths.
  useEffect(() => {
    if (!running && barsData.length > 0) {
      // Save the paused elapsed time for resuming later
      if (onElapsedChange) {
        onElapsedChange(elapsed);
      }
      stopMetronome();
    }
  }, [running, barsData, elapsed, totalDuration, onElapsedChange]);

  return (
    <main
      ref={mainRef}
      className="rhythm-area"
      onClick={handleTapInput}
      tabIndex={0}
      onKeyDown={handleKey}
    >
      {barsData.length === 0 ? (
        <p>{t.rhythm.emptyState}</p>
      ) : (
        <div className="bars" ref={barsContainerRef}>
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
            const desktopBeatBoxUnit = useResponsiveBeatBoxWidth ? 'var(--beat-box-unit)' : '3.3cm';

            // Mobile: percentage-based layout so each bar fills full container width.
            // Desktop/tablet: either responsive or fixed beat-box unit (user setting).
            const getBeatBoxLeft = (beatIdx) => isSmallScreen
              ? `${(beatIdx / beats) * 100}%`
              : `calc(${beatIdx * beatValue} * ${desktopBeatBoxUnit})`;
            const beatBoxWidthStr = isSmallScreen
              ? `${(1 / beats) * 100}%`
              : `calc(${beatValue} * ${desktopBeatBoxUnit})`;
            const getNoteWidth = (dur) => isSmallScreen
              ? `${(dur / totalBarDuration) * 100}%`
              : `calc(${dur} * ${desktopBeatBoxUnit})`;
            const getCountLeft = (j) => isSmallScreen
              ? `${((j + 0.5) / beats) * 100}%`
              : `calc(${j * beatValue + beatValue / 2} * ${desktopBeatBoxUnit})`;
            const responsiveBarWidthStr = isSmallScreen
              ? '100%'
              : `calc(${totalBarDuration} * ${desktopBeatBoxUnit})`;

            const isNewLineBar = !!barStartsNewLineRef.current[i];
            const legatoPairs = (legatoSegmentsByBarRef.current[i] || []).filter(
              (pair) => !pair.continuationFromPrevBar || isNewLineBar,
            );

            return (
              <div
                key={i}
                className={`bar-wrapper${i === 0 ? ' count-in-row' : ''}`}
                ref={(el) => {
                  barWrapperRefs.current[i] = el;
                }}
              >
                <div className="bar" style={{ width: responsiveBarWidthStr }}>
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
                  {groupNotesForRender(bar, beatValue).map((note, j) => (
                    <span
                      key={j}
                      className={`note ${note.type}${note.accent ? ' accent' : ''}`}
                      style={{ width: getNoteWidth(note.duration), flex: '0 0 auto' }}
                    >
                      <NoteRenderer type={note.type} name={note.name} mode={noteGraphicsMode} fillWidth={true} />
                    </span>
                  ))}
                </div>
                {legatoEnabled && i > 0 && (
                  <div className="legato-lane" style={{ width: responsiveBarWidthStr }}>
                    {legatoPairs.map((pair, pairIdx) => {
                      const widthPct = Math.max(2.4, pair.toPct - pair.fromPct);
                      return (
                        <svg
                          key={`legato-${i}-${pairIdx}`}
                          className="legato-arc"
                          viewBox="0 0 100 20"
                          preserveAspectRatio="none"
                          style={{ left: `${pair.fromPct}%`, width: `${widthPct}%` }}
                        >
                          <path d="M 2 5 Q 50 18 98 5" />
                        </svg>
                      );
                    })}
                  </div>
                )}
                <div className="count-bar" style={{ width: responsiveBarWidthStr }}>
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
                <div className="bar-progress" style={{ width: responsiveBarWidthStr }}>
                  {showMovingProgressIndicator !== false && (
                    <div
                      className="bar-progress-fill"
                      style={{ transform: `scaleX(${barProgressPct / 100})` }}
                    />
                  )}
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
                    if (assessment?.status === 'ignored') return null;
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
                  {showMovingProgressIndicator !== false && running && i === currentBar && (
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
              {t.rhythm.barLine
                .replace('{index}', row.barIndex)
                .replace('{pct}', row.accuracyPct)
                .replace('{matched}', row.matched)
                .replace('{expected}', row.expected)}
            </div>
          ))}
        </div>
      )}
      {showConfetti && (
        <div className="confetti-overlay" aria-hidden="true">
          {Array.from({ length: 42 }, (_, idx) => {
            const leftPct = ((idx * 17) % 100) + (idx % 3) * 0.15;
            const delaySec = ((idx * 7) % 10) / 20;
            const durationSec = 2.1 + ((idx * 13) % 9) / 10;
            const swaySec = 1.2 + ((idx * 5) % 7) / 10;
            const hue = (idx * 37) % 360;
            const rotate = ((idx * 29) % 80) - 40;
            return (
              <span
                key={`confetti-${idx}`}
                className="confetti-piece"
                style={{
                  left: `${leftPct}%`,
                  animationDelay: `${delaySec}s`,
                  animationDuration: `${durationSec}s, ${swaySec}s`,
                  backgroundColor: `hsl(${hue} 90% 58%)`,
                  transform: `rotate(${rotate}deg)`,
                }}
              />
            );
          })}
        </div>
      )}
      {overallAccuracyPct !== null && !running && elapsed >= totalDuration && (
        <div className="overall-accuracy-summary" role="status" aria-live="polite">
          {t.rhythm.averageAccuracy}: <strong>{overallAccuracyPct}%</strong>
        </div>
      )}

    </main>
  );
}
