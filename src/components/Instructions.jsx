export default function Instructions() {
  return (
    <div className="page instructions">
      <h2>Instructions</h2>
      <p>
        Use the panel on the left to select which note values and rests you want to
        practice, choose a time signature, articulation style, and number of bars.
        When you hit <strong>Start</strong>, an initial empty "warm‑up" bar will play
        (each bar begins with an accent marker, shown in red). After that the random
        bars appear. The button is disabled while an exercise is running, so you can't
        start a second one. A metronome will begin, and you should click on the main
        area (or press <kbd>Space</kbd>) on each beat to match the rhythm. The warm‑up
        bar is not scored – the program only checks correctness starting with the
        second bar. A <strong>Stop</strong> button appears next to Start (or press
        <kbd>Esc</kbd>) to pause the exercise and rewind to the beginning without
        changing the rhythm. A <strong>Reset</strong> button clears the current
        exercise entirely and is disabled while running. Results will show whether your
        timing was close enough.
      </p>
    </div>
  );
}
