/**
 * Canonical mode definitions used across parsing, key header generation, and UI options.
 */
export const MODE_DEFINITIONS = {
  major: {
    label: 'Major',
    isExperimental: false,
    order: 10,
    keySuffix: '',
    parserTokens: ['maj', 'major', 'ion', 'ionian'],
    intervals: { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7 },
  },
  natural_minor: {
    label: 'Minor',
    isExperimental: false,
    order: 20,
    keySuffix: 'm',
    parserTokens: ['m', 'min', 'minor', 'aeo', 'aeolian'],
    intervals: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 8: 6, 10: 7 },
  },
  harmonic_minor: {
    label: 'Harmonic Minor',
    isExperimental: false,
    order: 30,
    keySuffix: 'm',
    parserTokens: ['harm', 'harmonic'],
    intervals: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 8: 6, 11: 7 },
  },
  dorian: {
    label: 'Dorian',
    isExperimental: false,
    order: 40,
    keySuffix: 'dor',
    parserTokens: ['dor', 'dorian'],
    intervals: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 9: 6, 10: 7 },
  },
  phrygian: {
    label: 'Phrygian',
    isExperimental: false,
    order: 50,
    keySuffix: 'phr',
    parserTokens: ['phr', 'phrygian'],
    intervals: { 0: 1, 1: 2, 3: 3, 5: 4, 7: 5, 8: 6, 10: 7 },
  },
  lydian: {
    label: 'Lydian',
    isExperimental: false,
    order: 60,
    keySuffix: 'lyd',
    parserTokens: ['lyd', 'lydian'],
    intervals: { 0: 1, 2: 2, 4: 3, 6: 4, 7: 5, 9: 6, 11: 7 },
  },
  mixolydian: {
    label: 'Mixolydian',
    isExperimental: false,
    order: 70,
    keySuffix: 'mix',
    parserTokens: ['mix', 'mixolydian'],
    intervals: { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 10: 7 },
  },
  locrian: {
    label: 'Locrian',
    isExperimental: true,
    order: 80,
    keySuffix: 'loc',
    parserTokens: ['loc', 'locrian'],
    intervals: { 0: 1, 1: 2, 3: 3, 5: 4, 6: 5, 8: 6, 10: 7 },
  },
};

const orderedModeEntries = Object.entries(MODE_DEFINITIONS).sort(([, a], [, b]) => a.order - b.order);

export const MODE_INTERVALS = Object.fromEntries(
  orderedModeEntries.map(([mode, definition]) => [mode, definition.intervals])
);

export const MODE_HEADER_SUFFIX = Object.fromEntries(
  orderedModeEntries.map(([mode, definition]) => [mode, definition.keySuffix])
);

// Locrian parsing support is retained for existing ABC input, but it is intentionally hidden
// from dropdowns until we add dedicated UX and validation guidance for advanced modal workflows.
export const AVAILABLE_MODES = orderedModeEntries
  .filter(([, definition]) => !definition.isExperimental)
  .map(([mode, definition]) => ({ value: mode, label: definition.label, isExperimental: definition.isExperimental }));

export const MODE_OPTIONS_BY_VALUE = Object.fromEntries(
  AVAILABLE_MODES.map((modeOption) => [modeOption.value, modeOption])
);

export const MODE_PARSER_TOKEN_TO_MODE = Object.fromEntries(
  orderedModeEntries.flatMap(([mode, definition]) =>
    definition.parserTokens.map((token) => [token, mode])
  )
);

const modeTokenPattern = Object.keys(MODE_PARSER_TOKEN_TO_MODE)
  .sort((a, b) => b.length - a.length)
  .join('|');

export const MODE_TOKEN_REGEX_FRAGMENT = `(${modeTokenPattern})`;

export function validateModeCoverage() {
  const parserModes = new Set(Object.values(MODE_PARSER_TOKEN_TO_MODE));

  for (const parserMode of parserModes) {
    const definition = MODE_DEFINITIONS[parserMode];
    if (!definition) {
      throw new Error(`Parser mode token maps to undefined mode: ${parserMode}`);
    }

    if (!MODE_OPTIONS_BY_VALUE[parserMode] && !definition.isExperimental) {
      throw new Error(`Non-experimental parser mode is missing from available options: ${parserMode}`);
    }
  }

  return true;
}
