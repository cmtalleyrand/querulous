import { describe, expect, it } from 'vitest';
import {
  AVAILABLE_MODES,
  MODE_DEFINITIONS,
  MODE_OPTIONS_BY_VALUE,
  MODE_PARSER_TOKEN_TO_MODE,
  validateModeCoverage,
} from './modes';
import { extractABCHeaders } from './abcParser';

describe('mode coverage guardrails', () => {
  it('ensures parser-supported mode tokens map to valid mode definitions/options', () => {
    expect(validateModeCoverage()).toBe(true);

    for (const [token, mode] of Object.entries(MODE_PARSER_TOKEN_TO_MODE)) {
      expect(MODE_DEFINITIONS[mode], `Missing mode definition for token: ${token}`).toBeDefined();

      const definition = MODE_DEFINITIONS[mode];
      if (!definition.isExperimental) {
        expect(MODE_OPTIONS_BY_VALUE[mode], `Missing selectable option for parser mode: ${mode}`).toBeDefined();
      }
    }
  });

  it('keeps selectable modes aligned with non-experimental definitions', () => {
    const selectableModes = AVAILABLE_MODES.map((mode) => mode.value);
    const expectedSelectableModes = Object.entries(MODE_DEFINITIONS)
      .filter(([, definition]) => !definition.isExperimental)
      .map(([mode]) => mode);

    expect(selectableModes).toEqual(expectedSelectableModes);
  });

  it('parses locrian tokens while keeping locrian out of selectable options', () => {
    expect(extractABCHeaders('K:D loc').mode).toBe('locrian');
    expect(extractABCHeaders('K:D locrian').mode).toBe('locrian');

    const selectableModes = AVAILABLE_MODES.map((mode) => mode.value);
    expect(selectableModes).not.toContain('locrian');
  });
});
