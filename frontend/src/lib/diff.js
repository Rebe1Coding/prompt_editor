// Сегментный LCS-diff: возвращает список отрезков {type, value},
// где type — equal | added | removed. Значения соседних одинаковых типов склеиваются.
function diffTokens(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out = [];
  const push = (type, value) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.value += value;
    else out.push({ type, value });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('equal', a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('removed', a[i]);
      i += 1;
    } else {
      push('added', b[j]);
      j += 1;
    }
  }
  while (i < n) {
    push('removed', a[i]);
    i += 1;
  }
  while (j < m) {
    push('added', b[j]);
    j += 1;
  }
  return out;
}

const WORD_LIMIT = 1500;

export function computeDiff(base, next) {
  const baseWords = base.match(/\s+|\S+/g) || [];
  const nextWords = next.match(/\s+|\S+/g) || [];
  // На больших текстах пословный DP слишком тяжёлый — переходим на построчный.
  if (baseWords.length > WORD_LIMIT || nextWords.length > WORD_LIMIT) {
    return diffTokens(base.split(/(?<=\n)/), next.split(/(?<=\n)/));
  }
  return diffTokens(baseWords, nextWords);
}
