/**
 * Time signature options with compound meter support
 * For compound meters (6/8, 9/8, 12/8), beatsPerMeasure is the number of main beats (2, 3, 4)
 * and subdivisionsPerBeat is 3. For simple meters, subdivisionsPerBeat is 2.
 */
export const TIME_SIGNATURE_OPTIONS = [
  // Simple duple/triple/quadruple
  { value: '2/4', label: '2/4', meter: [2, 4], beatsPerMeasure: 2, subdivisions: 2, isCompound: false },
  { value: '3/4', label: '3/4', meter: [3, 4], beatsPerMeasure: 3, subdivisions: 2, isCompound: false },
  { value: '4/4', label: '4/4', meter: [4, 4], beatsPerMeasure: 4, subdivisions: 2, isCompound: false },
  { value: '5/4', label: '5/4', meter: [5, 4], beatsPerMeasure: 5, subdivisions: 2, isCompound: false },
  { value: '2/2', label: '2/2 (cut time)', meter: [2, 2], beatsPerMeasure: 2, subdivisions: 2, isCompound: false },
  { value: '3/2', label: '3/2', meter: [3, 2], beatsPerMeasure: 3, subdivisions: 2, isCompound: false },
  { value: '6/4', label: '6/4', meter: [6, 4], beatsPerMeasure: 6, subdivisions: 2, isCompound: false },
  // Compound meters (grouped in 3s)
  { value: '3/8', label: '3/8', meter: [3, 8], beatsPerMeasure: 1, subdivisions: 3, isCompound: true },
  { value: '6/8', label: '6/8', meter: [6, 8], beatsPerMeasure: 2, subdivisions: 3, isCompound: true },
  { value: '9/8', label: '9/8', meter: [9, 8], beatsPerMeasure: 3, subdivisions: 3, isCompound: true },
  { value: '12/8', label: '12/8', meter: [12, 8], beatsPerMeasure: 4, subdivisions: 3, isCompound: true },
];
