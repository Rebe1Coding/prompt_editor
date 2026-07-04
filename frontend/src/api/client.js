import { ApiError, ConnectionError } from './errors.js';
import { iterateSse } from './sse.js';

const API_BASE = '/api';
const INACTIVITY_TIMEOUT_MS = 60_000;

async function readErrorDetail(response) {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (data?.detail) return JSON.stringify(data.detail);
  } catch {
    // тело не JSON — общий текст ниже
  }
  return `Ошибка сервера (${response.status})`;
}

async function requestJson(path, options) {
  let response;
  try {
    response = await fetch(API_BASE + path, options);
  } catch {
    throw new ConnectionError();
  }
  if (!response.ok) throw new ApiError(await readErrorDetail(response), response.status);
  return response.json();
}

async function openStream(path, body, signal) {
  let response;
  try {
    response = await fetch(API_BASE + path, {
      method: 'POST',
      headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
      body: body != null ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    if (signal.aborted) return null;
    throw new ConnectionError();
  }
  if (!response.ok) throw new ApiError(await readErrorDetail(response), response.status);
  if (!response.body) throw new ConnectionError('Пустой ответ сервера');
  return response;
}

async function stream(path, body, handlers, signal) {
  const response = await openStream(path, body, signal);
  if (!response) return;
  for await (const event of iterateSse(response, signal, INACTIVITY_TIMEOUT_MS)) {
    if (event.type === 'session' && event.session_id != null) {
      handlers.onSession?.(event.session_id);
    } else if (event.type === 'token' && event.text) {
      handlers.onToken?.(event.text);
    } else if (event.type === 'done') {
      handlers.onDone?.();
      return;
    } else if (event.type === 'error') {
      handlers.onError?.(event.detail ?? 'Ошибка генерации');
      return;
    }
  }
}

export function createPrompt(prompt, handlers, signal) {
  return stream('/prompts', { prompt }, handlers, signal);
}

export function regeneratePrompt(sessionId, handlers, signal) {
  return stream(`/prompts/${sessionId}/regenerate`, null, handlers, signal);
}

export function refinePrompt(sessionId, instruction, handlers, signal) {
  return stream(`/prompts/${sessionId}/refine`, { instruction }, handlers, signal);
}

export function listSessions() {
  return requestJson('/prompts');
}

export function getSession(sessionId) {
  return requestJson(`/prompts/${sessionId}`);
}

export function finalizeSession(sessionId) {
  return requestJson(`/prompts/${sessionId}/finalize`, { method: 'POST' });
}
