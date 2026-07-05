import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createPrompt,
  finalizeSession,
  getSession,
  listSessions,
  refinePrompt,
  regeneratePrompt,
} from '../api/client.js';
import { buildTimeline, messageToText, uid } from '../lib/timeline.js';

function newAssistant() {
  return { id: uid('a'), role: 'assistant', kind: 'result', content: '', streaming: true, error: null };
}

export function useChat() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const abortRef = useRef(null);

  const toggleSearch = useCallback(() => setSearchEnabled((v) => !v), []);

  const patchMessage = useCallback((id, updater) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await listSessions());
    } catch {
      // список сессий не критичен для текущего действия
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const runStream = useCallback(
    async (assistantId, invoke) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      setError(null);
      setNotice(null);

      const handlers = {
        onSession: (id) => setActiveId(id),
        onToken: (text) => patchMessage(assistantId, (m) => ({ ...m, content: m.content + text })),
        onDone: () => patchMessage(assistantId, (m) => ({ ...m, streaming: false })),
        onError: (detail) =>
          patchMessage(assistantId, (m) => ({ ...m, streaming: false, error: detail })),
      };

      try {
        await invoke(handlers, controller.signal);
      } catch (err) {
        const text = messageToText(err);
        patchMessage(assistantId, (m) => ({ ...m, streaming: false, error: text }));
        setError(text);
      } finally {
        // на случай остановки: гасим курсор, если поток не завершился штатно
        patchMessage(assistantId, (m) => (m.streaming ? { ...m, streaming: false } : m));
        setBusy(false);
        abortRef.current = null;
        refreshSessions();
      }
    },
    [patchMessage, refreshSessions],
  );

  const runCreate = useCallback(
    (prompt) => {
      setActiveId(null);
      const userMsg = { id: uid('u'), role: 'user', kind: 'source', content: prompt };
      const assistant = newAssistant();
      setMessages([userMsg, assistant]);
      runStream(assistant.id, (h, s) => createPrompt(prompt, searchEnabled, h, s));
    },
    [runStream, searchEnabled],
  );

  const runRefine = useCallback(
    (sessionId, instruction) => {
      const userMsg = { id: uid('u'), role: 'user', kind: 'instruction', content: instruction };
      const assistant = newAssistant();
      setMessages((prev) => [...prev, userMsg, assistant]);
      runStream(assistant.id, (h, s) => refinePrompt(sessionId, instruction, searchEnabled, h, s));
    },
    [runStream, searchEnabled],
  );

  const newChat = useCallback(() => {
    if (busy) return;
    setActiveId(null);
    setMessages([]);
    setError(null);
    setNotice(null);
  }, [busy]);

  const selectSession = useCallback(
    async (id) => {
      if (busy || id === activeId) return;
      setError(null);
      setNotice(null);
      try {
        const session = await getSession(id);
        setActiveId(id);
        setMessages(buildTimeline(session));
      } catch (err) {
        setError(messageToText(err));
      }
    },
    [activeId, busy],
  );

  const send = useCallback(
    (text) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      if (activeId == null) runCreate(trimmed);
      else runRefine(activeId, trimmed);
    },
    [activeId, busy, runCreate, runRefine],
  );

  const regenerate = useCallback(() => {
    if (busy || activeId == null) return;
    const assistantId = uid('a');
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i -= 1) {
        if (copy[i].role === 'assistant') {
          copy[i] = { ...copy[i], id: assistantId, content: '', streaming: true, error: null };
          break;
        }
      }
      return copy;
    });
    runStream(assistantId, (h, s) => regeneratePrompt(activeId, searchEnabled, h, s));
  }, [activeId, busy, runStream, searchEnabled]);

  // Правка исходного промпта невозможна на сервере (source immutable) — создаём
  // новую сессию; правка уточнения отправляется как новый refine.
  const editMessage = useCallback(
    (message, newText) => {
      const trimmed = newText.trim();
      if (!trimmed || busy) return;
      if (message.kind === 'source') runCreate(trimmed);
      else if (message.kind === 'instruction' && activeId != null) runRefine(activeId, trimmed);
    },
    [activeId, busy, runCreate, runRefine],
  );

  const finalize = useCallback(async () => {
    if (busy || activeId == null) return;
    setError(null);
    setNotice(null);
    try {
      const result = await finalizeSession(activeId);
      setNotice(`Финальная версия сохранена: ${result.file}`);
      refreshSessions();
    } catch (err) {
      setError(messageToText(err));
    }
  }, [activeId, busy, refreshSessions]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const hasResult = Boolean(
    lastAssistant && !lastAssistant.streaming && lastAssistant.content && !lastAssistant.error,
  );

  return {
    sessions,
    activeId,
    messages,
    busy,
    error,
    notice,
    searchEnabled,
    toggleSearch,
    mode: activeId == null ? 'create' : 'refine',
    canRegenerate: activeId != null && hasResult && !busy,
    canFinalize: activeId != null && hasResult && !busy,
    newChat,
    selectSession,
    send,
    regenerate,
    editMessage,
    finalize,
    stop,
    dismissError: () => setError(null),
    dismissNotice: () => setNotice(null),
  };
}
