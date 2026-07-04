// Собирает ленту сообщений из сессии по тем же правилам, что app/llm.py::_history:
// source_prompt -> реплика пользователя; ревизия с instruction -> уточнение + ответ;
// ревизия без instruction после ответа -> регенерация, заменяющая прошлый ответ.
export function buildTimeline(session) {
  const timeline = [
    {
      id: `s${session.id}-source`,
      role: 'user',
      kind: 'source',
      content: session.source_prompt,
    },
  ];

  for (const rev of session.revisions) {
    if (rev.instruction !== null) {
      timeline.push({
        id: `rev${rev.id}-instruction`,
        role: 'user',
        kind: 'instruction',
        content: rev.instruction,
        revisionId: rev.id,
      });
      timeline.push({
        id: `rev${rev.id}-result`,
        role: 'assistant',
        kind: 'result',
        content: rev.result,
        revisionId: rev.id,
      });
      continue;
    }

    const resultMessage = {
      id: `rev${rev.id}-result`,
      role: 'assistant',
      kind: 'result',
      content: rev.result,
      revisionId: rev.id,
    };
    const last = timeline[timeline.length - 1];
    if (last && last.role === 'assistant') {
      timeline[timeline.length - 1] = resultMessage;
    } else {
      timeline.push(resultMessage);
    }
  }

  return timeline;
}

let counter = 0;
export function uid(prefix = 'm') {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

export function messageToText(error) {
  if (!error) return '';
  return error.message || String(error);
}
