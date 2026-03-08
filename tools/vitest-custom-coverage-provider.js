import fs from 'node:fs/promises';
import inspector from 'node:inspector';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseCoverageProvider } from 'vitest/coverage';

const sessionState = {
  session: null,
  connected: false,
};

function post(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!sessionState.session) {
      reject(new Error('Coverage session is not initialized.'));
      return;
    }

    sessionState.session.post(method, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
}

function mergeIntervals(intervals) {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort((left, right) => left[0] - right[0]);
  const merged = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    const [start, end] = sorted[index];
    const last = merged[merged.length - 1];

    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
}

function intervalLength(intervals) {
  return intervals.reduce((accumulator, [start, end]) => accumulator + Math.max(0, end - start), 0);
}

function toFilePath(url) {
  if (url.startsWith('file://')) {
    return fileURLToPath(url);
  }

  if (path.isAbsolute(url)) {
    return url;
  }

  return null;
}

class CustomCoverageProvider extends BaseCoverageProvider {
  name = 'custom-v8-lite';

  #ctx;

  #workerCoverage = [];

  initialize(ctx) {
    this.#ctx = ctx;
  }

  resolveOptions() {
    return this.#ctx.config.coverage;
  }

  async clean(shouldClean = true) {
    if (!shouldClean) {
      return;
    }

    await fs.rm(this.#ctx.config.coverage.reportsDirectory, {
      recursive: true,
      force: true,
    });
  }

  onAfterSuiteRun(meta) {
    if (Array.isArray(meta.coverage)) {
      this.#workerCoverage.push(...meta.coverage);
    }
  }

  async reportCoverage() {
    const rootDirectory = this.#ctx.config.root;
    const reportDirectory = this.#ctx.config.coverage.reportsDirectory;
    const byFile = new Map();

    for (const scriptCoverage of this.#workerCoverage) {
      const resolvedPath = toFilePath(scriptCoverage.url);
      if (!resolvedPath || !resolvedPath.startsWith(rootDirectory)) {
        continue;
      }

      const extension = path.extname(resolvedPath);
      if (!['.js', '.jsx', '.ts', '.tsx'].includes(extension)) {
        continue;
      }

      const allIntervals = [];
      const coveredIntervals = [];

      for (const fnCoverage of scriptCoverage.functions) {
        for (const range of fnCoverage.ranges) {
          allIntervals.push([range.startOffset, range.endOffset]);
          if (range.count > 0) {
            coveredIntervals.push([range.startOffset, range.endOffset]);
          }
        }
      }

      const mergedAll = mergeIntervals(allIntervals);
      const mergedCovered = mergeIntervals(coveredIntervals);
      const totalBytes = intervalLength(mergedAll);
      const coveredBytes = intervalLength(mergedCovered);

      if (totalBytes === 0) {
        continue;
      }

      const previous = byFile.get(resolvedPath);
      if (!previous || coveredBytes > previous.coveredBytes) {
        byFile.set(resolvedPath, { coveredBytes, totalBytes });
      }
    }

    const files = [...byFile.entries()].sort(([left], [right]) => left.localeCompare(right));
    const coveredBytes = files.reduce((sum, [, stats]) => sum + stats.coveredBytes, 0);
    const totalBytes = files.reduce((sum, [, stats]) => sum + stats.totalBytes, 0);
    const pct = totalBytes === 0 ? 100 : (coveredBytes / totalBytes) * 100;

    await fs.mkdir(reportDirectory, { recursive: true });

    const summary = {
      provider: this.name,
      metric: 'byte-range',
      files: files.map(([file, stats]) => ({
        file: path.relative(rootDirectory, file),
        coveredBytes: stats.coveredBytes,
        totalBytes: stats.totalBytes,
        percent: Number(((stats.coveredBytes / stats.totalBytes) * 100).toFixed(2)),
      })),
      totals: {
        coveredBytes,
        totalBytes,
        percent: Number(pct.toFixed(2)),
      },
    };

    await fs.writeFile(
      path.join(reportDirectory, 'coverage-summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
      'utf8',
    );

    console.log(`Coverage summary (byte-range): ${summary.totals.percent}% (${coveredBytes}/${totalBytes})`);
  }
}

async function startCoverage() {
  if (sessionState.connected) {
    return;
  }

  sessionState.session = new inspector.Session();
  sessionState.session.connect();

  await post('Profiler.enable');
  await post('Profiler.startPreciseCoverage', {
    callCount: true,
    detailed: true,
  });

  sessionState.connected = true;
}

async function takeCoverage() {
  if (!sessionState.connected) {
    return null;
  }

  const result = await post('Profiler.takePreciseCoverage');
  return result.result;
}

async function stopCoverage() {
  if (!sessionState.connected) {
    return;
  }

  await post('Profiler.stopPreciseCoverage');
  await post('Profiler.disable');

  sessionState.session.disconnect();
  sessionState.session = null;
  sessionState.connected = false;
}

export default {
  getProvider() {
    return new CustomCoverageProvider();
  },
  startCoverage,
  takeCoverage,
  stopCoverage,
};
