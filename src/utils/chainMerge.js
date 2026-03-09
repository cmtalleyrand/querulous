export const ONSET_TICKS_PER_QUARTER = 480;

export function normalizeOnsetKey(onset) {
  return Math.round(onset * ONSET_TICKS_PER_QUARTER) / ONSET_TICKS_PER_QUARTER;
}

export function mapChainRecordOntoIntervalPoint(intervalPoint, chainRecord) {
  if (!intervalPoint || !chainRecord) return intervalPoint;

  intervalPoint.isChainEntry = chainRecord.isChainEntry || false;
  intervalPoint.isConsecutiveDissonance = chainRecord.isConsecutiveDissonance || false;
  intervalPoint.chainPosition = chainRecord.chainPosition;
  intervalPoint.chainLength = chainRecord.chainLength || 0;
  intervalPoint.chainStartOnset = chainRecord.chainStartOnset;
  intervalPoint.chainEndOnset = chainRecord.chainEndOnset;
  intervalPoint.chainUnresolved = chainRecord.chainUnresolved || false;
  intervalPoint.isChainResolution = chainRecord.isChainResolution || false;

  intervalPoint.passingMotion = chainRecord.passingMotion || null;
  intervalPoint.isPassing = chainRecord.isPassing || false;
  intervalPoint.consecutiveMitigationCount = chainRecord.consecutiveMitigationCount || 0;
  intervalPoint.consecutiveMitigation = chainRecord.consecutiveMitigation || 0;

  if (chainRecord.score !== undefined) intervalPoint.score = chainRecord.score;
  if (chainRecord.entryScore !== undefined) intervalPoint.entryScore = chainRecord.entryScore;
  if (chainRecord.exitScore !== undefined) intervalPoint.exitScore = chainRecord.exitScore;
  if (chainRecord.chainTotalScore !== undefined) intervalPoint.chainTotalScore = chainRecord.chainTotalScore;
  if (chainRecord.passingCharacterAdj !== undefined) intervalPoint.passingCharacterAdj = chainRecord.passingCharacterAdj;
  if (chainRecord.entryMitigationDetails?.length > 0) intervalPoint.entryMitigationDetails = chainRecord.entryMitigationDetails;
  if (chainRecord.exitMitigationDetails?.length > 0) intervalPoint.exitMitigationDetails = chainRecord.exitMitigationDetails;

  if (chainRecord.isRepeated !== undefined) intervalPoint.isRepeated = chainRecord.isRepeated;
  if (chainRecord.isResolved !== undefined) intervalPoint.isResolved = chainRecord.isResolved;
  if (chainRecord.isParallel !== undefined) intervalPoint.isParallel = chainRecord.isParallel;

  return intervalPoint;
}

export function mergeChainAnalysisIntoIntervalPoints(intervalPoints, chainRecords) {
  if (!Array.isArray(intervalPoints) || !Array.isArray(chainRecords)) return intervalPoints;

  const chainByOnset = new Map();
  for (const record of chainRecords) {
    chainByOnset.set(normalizeOnsetKey(record.onset), record);
  }

  for (const point of intervalPoints) {
    const chainRecord = chainByOnset.get(normalizeOnsetKey(point.onset));
    mapChainRecordOntoIntervalPoint(point, chainRecord);
  }

  return intervalPoints;
}
