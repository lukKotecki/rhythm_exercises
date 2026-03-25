import wholeNoteSvg from '../assets/musicGlyphs/whole-note.svg?raw';
import halfNoteSvg from '../assets/musicGlyphs/half-note.svg?raw';
import quarterNoteSvg from '../assets/musicGlyphs/quarter-note.svg?raw';
import eighthNoteSvg from '../assets/musicGlyphs/eighth-note.svg?raw';
import sixteenthNoteSvg from '../assets/musicGlyphs/sixteenth-note.svg?raw';

import wholeRestSvg from '../assets/musicGlyphs/whole-rest.svg?raw';
import halfRestSvg from '../assets/musicGlyphs/half-rest.svg?raw';
import quarterRestSvg from '../assets/musicGlyphs/quarter-rest.svg?raw';
import eighthRestSvg from '../assets/musicGlyphs/eighth-rest.svg?raw';
import sixteenthRestSvg from '../assets/musicGlyphs/sixteenth-rest.svg?raw';

import eighthPairSvg from '../assets/musicGlyphs/eighth-pair.svg?raw';
import twoSixteenthAndEighthSvg from '../assets/musicGlyphs/two-sixteenth-and-eighth.svg?raw';
import eighthAndTwoSixteenthSvg from '../assets/musicGlyphs/eighth-and-two-sixteenth.svg?raw';
import fourSixteenthSvg from '../assets/musicGlyphs/four-sixteenth.svg?raw';
import sixteenthEighthSixteenthSvg from '../assets/musicGlyphs/sixteenth-eighth-sixteenth.svg?raw';
import dottedEighthSixteenthSvg from '../assets/musicGlyphs/dotted-eighth-sixteenth.svg?raw';
import sixteenthDottedEighthSvg from '../assets/musicGlyphs/sixteenth-dotted-eighth.svg?raw';
import tripletEighthSvg from '../assets/musicGlyphs/triplet-eighth.svg?raw';

const NOTE_GLYPHS = {
  whole: wholeNoteSvg,
  half: halfNoteSvg,
  quarter: quarterNoteSvg,
  eighth: eighthNoteSvg,
  sixteenth: sixteenthNoteSvg,
};

const REST_GLYPHS = {
  whole: wholeRestSvg,
  half: halfRestSvg,
  quarter: quarterRestSvg,
  eighth: eighthRestSvg,
  sixteenth: sixteenthRestSvg,
};

const GROUP_GLYPHS = {
  'eighth-pair': eighthPairSvg,
  'two-sixteenth-and-eighth': twoSixteenthAndEighthSvg,
  'eighth-and-two-sixteenth': eighthAndTwoSixteenthSvg,
  'four-sixteenth': fourSixteenthSvg,
  'sixteenth-eighth-sixteenth': sixteenthEighthSixteenthSvg,
  'dotted-eighth-sixteenth': dottedEighthSixteenthSvg,
  'sixteenth-dotted-eighth': sixteenthDottedEighthSvg,
  'triplet-eighth': tripletEighthSvg,
};

// Unicode musical note symbols
const UNICODE_NOTES = {
  whole: '𝅗',      // U+1D15E
  half: '𝅗𝅥',       // U+1D15E
  quarter: '𝅘𝅥',   // U+1D15F U+1D165
  eighth: '𝅘𝅥𝅮',   // U+1D15F U+1D165 U+1D16E
  sixteenth: '𝅘𝅥𝅯', // U+1D15F U+1D165 U+1D16F
};

const UNICODE_RESTS = {
  whole: '𝄻',      // U+1D13B
  half: '𝄼',       // U+1D13C
  quarter: '𝄽',    // U+1D13D
  eighth: '𝄾',     // U+1D13E
  sixteenth: '𝄿',  // U+1D13F
};

function extractSvgBody(rawSvg) {
  const match = rawSvg?.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  return match ? match[1] : rawSvg;
}

export default function NoteRenderer({ type = 'note', name = 'quarter', size = 24, className = '', mode = 'svg' }) {
  // If mode is unicode, render unicode symbol
  if (mode === 'unicode') {
    const unicodeMap = type === 'rest' ? UNICODE_RESTS : UNICODE_NOTES;
    const unicodeChar = unicodeMap[name];
    if (unicodeChar) {
      return (
        <span className={`note-unicode ${className}`.trim()} style={{ fontSize: size }}>
          {unicodeChar}
        </span>
      );
    }
  }

  // Otherwise render SVG (default behavior)
  const glyphCollection = type === 'rest' ? REST_GLYPHS : type === 'group' ? GROUP_GLYPHS : NOTE_GLYPHS;
  const fallbackCollection = type === 'rest' ? REST_GLYPHS : NOTE_GLYPHS;
  const rawSvg = glyphCollection[name] || fallbackCollection.quarter;
  const svgBody = extractSvgBody(rawSvg);
  const cls = `note-glyph ${className}`.trim();

  return (
    <svg
      viewBox="0 0 24 24"
      className={cls}
      style={{ width: size, height: size }}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: svgBody }}
    />
  );
}
