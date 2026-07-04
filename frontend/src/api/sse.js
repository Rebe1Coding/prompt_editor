import { ConnectionError, TimeoutError } from './errors.js';

function withTimeout(promise, ms, onTimeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new TimeoutError());
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function parseBlock(raw) {
  const data = raw
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Превращает поток ответа в последовательность SSE-событий. Если между чтениями
// нет данных дольше timeoutMs — это зависшее соединение (таймаут).
export async function* iterateSse(response, signal, timeoutMs) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await withTimeout(reader.read(), timeoutMs, () =>
        reader.cancel().catch(() => {}),
      );
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const payload = parseBlock(raw);
        if (payload) yield payload;
      }
    }
  } catch (err) {
    if (signal.aborted) return;
    if (err instanceof TimeoutError) throw err;
    throw new ConnectionError('Соединение прервано во время генерации');
  }
}
