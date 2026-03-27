# Rhythm Exercises

Interactive rhythm training web app for musicians. The app generates random bars based on selected note/rest values and lets you practice tap timing against a metronome with visual and per-bar accuracy feedback.

## Highlights

- Random rhythm generation with configurable note values and rests
- Time signatures: `2/4`, `3/4`, `4/4`, `3/8`, `6/8`
- Adjustable tempo (`30-300 BPM`)
- Tap input by mouse click or `Space`
- Per-bar and overall timing accuracy summary
- Visual progress and expected rhythm grid
- Metronome with selectable sound engines:
	- `sine`, `square`, `triangle`, `sawtooth`
	- `cowbell`, `woodblock`, `clave`, `hihat`
- Legato mode with configurable frequency
- SVG and Unicode note rendering modes
- Rhythmic group glyphs (beamed note groups) rendered in beat-box context
- Bilingual UI (`Polish` / `English`) with persisted language choice
- Settings persisted in `localStorage`

## Tech Stack

- React 19
- Vite 7
- ESLint 9
- Plain CSS (no UI framework)
- Web Audio API (metronome and rhythm cues)

## Getting Started

### Prerequisites

- Node.js `20+`
- npm `10+` (or compatible)

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Project Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint across the project |

## How the App Works

1. Configure note/rest values, meter, bar count, and metronome settings in the sidebar.
2. Click `Generate` to prepare a new exercise, or `Start` to generate (if needed) and run.
3. The first bar acts as a warm-up/count-in and is excluded from scoring.
4. Tap/click in time with the generated rhythm.
5. Inspect per-bar accuracy and overall timing accuracy after playback.

## Rhythmic Groups

The renderer can combine specific note patterns into dedicated group glyphs (for cleaner rhythmic notation in a beat-box):

- `eighth-pair`
- `two-sixteenth-and-eighth`
- `eighth-and-two-sixteenth`
- `four-sixteenth`
- `sixteenth-eighth-sixteenth`
- `dotted-eighth-sixteenth`
- `sixteenth-dotted-eighth`
- `triplet-eighth`

## Localization

UI text is available in:

- English (`en`)
- Polish (`pl`)

Language preference is saved in browser storage.

## Repository Structure

```text
.
|- public/
|- src/
|  |- assets/
|  |  |- musicGlyphs/
|  |- components/
|  |  |- Header.jsx
|  |  |- Sidebar.jsx
|  |  |- RhythmArea.jsx
|  |  |- NoteRenderer.jsx
|  |  |- Instructions.jsx
|  |  |- About.jsx
|  |  |- Settings.jsx
|  |- App.jsx
|  |- App.css
|  |- i18n.js
|  |- main.jsx
|- index.html
|- vite.config.js
|- eslint.config.js
|- package.json
```

## Quality and Status

- Build status: local production build succeeds (`npm run build`)
- Linting available through ESLint script
- No dedicated automated test suite is included yet

## Contributing

Contributions are welcome. Recommended workflow:

1. Create a feature branch
2. Make focused commits with clear messages
3. Run `npm run lint` and `npm run build` locally
4. Open a pull request with a concise change summary

## License

No license file is currently defined in this repository.
