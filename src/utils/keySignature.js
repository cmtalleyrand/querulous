import { KEY_SIGNATURES } from './constants';

export const ACCIDENTAL_OPTIONS = [
  { value: '__', label: '♭♭ (double flat)', semitones: -2 },
  { value: '_', label: '♭ (flat)', semitones: -1 },
  { value: '=', label: '♮ (natural)', semitones: 0 },
  { value: '^', label: '♯ (sharp)', semitones: 1 },
  { value: '^^', label: '𝄪 (double sharp)', semitones: 2 },
];

export const NOTE_LETTER_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((note) => ({ value: note, label: note }));

const ACCIDENTAL_TO_SEMITONES = Object.fromEntries(ACCIDENTAL_OPTIONS.map((o) => [o.value, o.semitones]));

const NOTE_TO_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };


const MODES_THAT_PREFER_FLATS = new Set(['phrygian', 'locrian']);

const MODE_TO_RELATIVE_MAJOR_OFFSET = {
  major: 0,
  natural_minor: 3,
  harmonic_minor: 3,
  dorian: -2,
  phrygian: -4,
  lydian: -5,
  mixolydian: -7,
  locrian: -1,
};

function keyToPitchClass(key) {
  const letter = key.charAt(0).toUpperCase();
  let pitch = NOTE_TO_SEMITONE[letter] ?? 0;
  if (key.includes('#')) pitch += 1;
  if (key.includes('b')) pitch -= 1;
  return (pitch + 12) % 12;
}

function resolveRelativeMajorKey(key, mode) {
  const tonicPitch = keyToPitchClass(key);
  const offset = MODE_TO_RELATIVE_MAJOR_OFFSET[mode] ?? 0;
  const targetPitch = (tonicPitch + offset + 12) % 12;

  const majorKeys = Object.keys(KEY_SIGNATURES).filter((k) => !k.endsWith('m'));
  const candidates = majorKeys.filter((k) => keyToPitchClass(k) === targetPitch);
  if (!candidates.length) return key;

  if (key.includes('b') || (MODES_THAT_PREFER_FLATS.has(mode) && !key.includes('#'))) {
    return candidates.find((candidate) => candidate.includes('b')) || candidates[0];
  }
  if (key.includes('#')) {
    return candidates.find((candidate) => candidate.includes('#')) || candidates[0];
  }
  return candidates.find((candidate) => !candidate.includes('#') && !candidate.includes('b')) || candidates[0];
}

export function modeToKeySignatureToken(key, mode) {
  if (['natural_minor', 'harmonic_minor'].includes(mode)) return `${key}m`;
  if (mode === 'major') return key;
  return resolveRelativeMajorKey(key, mode);
}

export function parseKeySignatureArrayToMap(keySignature = []) {
  const map = {};
  for (const signature of keySignature) {
    const letter = signature.charAt(0).toUpperCase();
    const accidentalPart = signature.slice(1);
    const semitones = accidentalPart === 'x' ? 2 : accidentalPart === '#' ? 1 : accidentalPart === 'bb' ? -2 : accidentalPart === 'b' ? -1 : 0;
    map[letter] = semitones;
  }
  return map;
}

export function applyKeySignatureModifiers(baseMap, modifiers = []) {
  const map = { ...baseMap };
  for (const modifier of modifiers) {
    const semitones = ACCIDENTAL_TO_SEMITONES[modifier.accidental];
    if (semitones === undefined || !modifier.note) continue;

    const letter = modifier.note.toUpperCase();
    if (semitones === 0) {
      delete map[letter];
    } else {
      map[letter] = semitones;
    }
  }
  return map;
}

export function keySignatureMapToLegacyArray(map = {}) {
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, semitones]) => {
      if (semitones === 2) return `${letter}x`;
      if (semitones === 1) return `${letter}#`;
      if (semitones === -1) return `${letter}b`;
      if (semitones === -2) return `${letter}bb`;
      return `${letter}`;
    });
}

export function getKeySignatureMap(key, mode, modifiers = []) {
  const keyToken = modeToKeySignatureToken(key, mode);
  const base = KEY_SIGNATURES[keyToken] || KEY_SIGNATURES[key] || [];
  return applyKeySignatureModifiers(parseKeySignatureArrayToMap(base), modifiers);
}

export function parseKeyHeaderAccidentalModifier(token) {
  const match = token.match(/^(\^{1,2}|_{1,2}|=)([A-Ga-g])$/);
  if (!match) return null;
  return { accidental: match[1], note: match[2] };
}

export function serializeKeySignatureModifiers(modifiers = []) {
  return modifiers
    .filter((m) => m?.accidental && m?.note)
    .map((m) => `${m.accidental}${m.note}`)
    .join(' ');
}
