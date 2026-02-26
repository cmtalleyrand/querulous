/**
 * Stretto profile: musically conservative offsets used when testing
 * overlap viability across canonical fugue-answer relationships.
 */
export const STRETTO_TRANSPOSITION_OPTIONS = [
  { value: '0', label: 'Unison', shortLabel: 'Unison', intervalClass: 0 },
  { value: '12', label: '+P8 (octave up)', shortLabel: '+8ve', intervalClass: 0 },
  { value: '-12', label: '-P8 (octave down)', shortLabel: '-8ve', intervalClass: 0 },
  { value: '7', label: '+P5 (5th up)', shortLabel: '+5th', intervalClass: 7 },
  { value: '-7', label: '-P5 (5th down)', shortLabel: '-5th', intervalClass: 7 },
  { value: '5', label: '+P4 (4th up)', shortLabel: '+4th', intervalClass: 5 },
  { value: '-5', label: '-P4 (4th down)', shortLabel: '-4th', intervalClass: 5 },
  { value: '19', label: '+P12 (5th + octave up)', shortLabel: '+12th', intervalClass: 7 },
  { value: '-19', label: '-P12 (5th + octave down)', shortLabel: '-12th', intervalClass: 7 },
  { value: '17', label: '+P11 (4th + octave up)', shortLabel: '+11th', intervalClass: 5 },
  { value: '-17', label: '-P11 (4th + octave down)', shortLabel: '-11th', intervalClass: 5 },
  { value: '24', label: '+2 octaves', shortLabel: '+15th', intervalClass: 0 },
  { value: '-24', label: '-2 octaves', shortLabel: '-15th', intervalClass: 0 },
];

const COUNTERPOINT_VIZ_NAMED_INTERVALS = {
  24: { label: '+P15 (up 2 octaves)', shortLabel: '+15th' },
  19: { label: '+P12 (up 12th)', shortLabel: '+12th' },
  17: { label: '+P11 (up 11th)', shortLabel: '+11th' },
  12: { label: '+P8 (up octave)', shortLabel: '+8ve' },
  9: { label: '+M6 (up major 6th)', shortLabel: '+M6' },
  8: { label: '+m6 (up minor 6th)', shortLabel: '+m6' },
  7: { label: '+P5 (up fifth)', shortLabel: '+5th' },
  5: { label: '+P4 (up fourth)', shortLabel: '+4th' },
  4: { label: '+M3 (up major 3rd)', shortLabel: '+M3' },
  3: { label: '+m3 (up minor 3rd)', shortLabel: '+m3' },
  0: { label: 'Original', shortLabel: 'orig' },
  [-3]: { label: '-m3 (down minor 3rd)', shortLabel: '-m3' },
  [-4]: { label: '-M3 (down major 3rd)', shortLabel: '-M3' },
  [-5]: { label: '-P4 (down fourth)', shortLabel: '-4th' },
  [-7]: { label: '-P5 (down fifth)', shortLabel: '-5th' },
  [-8]: { label: '-m6 (down minor 6th)', shortLabel: '-m6' },
  [-9]: { label: '-M6 (down major 6th)', shortLabel: '-M6' },
  [-12]: { label: '-P8 (down octave)', shortLabel: '-8ve' },
  [-17]: { label: '-P11 (down 11th)', shortLabel: '-11th' },
  [-19]: { label: '-P12 (down 12th)', shortLabel: '-12th' },
  [-24]: { label: '-P15 (down 2 octaves)', shortLabel: '-15th' },
};

/**
 * Counterpoint-viz profile: full semitone coverage across ±2 octaves,
 * so the UI supports unconstrained exploratory transposition checks.
 */
export const COUNTERPOINT_VIZ_TRANSPOSITION_OPTIONS = Array.from({ length: 49 }, (_, i) => 24 - i).map((value) => {
  const named = COUNTERPOINT_VIZ_NAMED_INTERVALS[value];
  if (named) return { value, ...named };

  const direction = value > 0 ? 'up' : 'down';
  const semitones = Math.abs(value);
  const sign = value > 0 ? '+' : '';
  return {
    value,
    label: `${sign}${value} semitone${semitones === 1 ? '' : 's'} (${direction})`,
    shortLabel: `${sign}${value}st`,
  };
});
