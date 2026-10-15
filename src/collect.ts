import type { RNPlugin } from '@remnote/plugin-sdk';
import { CardRecord, summarize } from './analytics';

declare const __BRIDGE_TOKEN__: string;
export const SNAPSHOT_KEY = 'study-insights-snapshot';
let running: Promise<unknown> | undefined;

export function collectSnapshot(plugin: RNPlugin): Promise<any> {
  if (running) return running;
  running = collect(plugin).finally(() => { running = undefined; });
  return running;
}

async function collect(plugin: RNPlugin) {
  const startedAt = new Date().toISOString();
  const knowledgeBase = await plugin.kb.getCurrentKnowledgeBaseData();
  const cards = await plugin.card.getAll();
  const records: CardRecord[] = cards.map(card => ({
    id: card._id, remId: card.remId, type: card.type, createdAt: card.createdAt,
    history: card.repetitionHistory,
    nextRepetitionTime: card.nextRepetitionTime,
    lastRepetitionTime: card.lastRepetitionTime,
    timesWrongInRow: card.timesWrongInRow,
  }));
  // Prefer a small content sample with history, but keep every card's raw history.
  const candidates = [...cards].sort((a, b) =>
    (b.timesWrongInRow || 0) - (a.timesWrongInRow || 0) ||
    (b.repetitionHistory?.length || 0) - (a.repetitionHistory?.length || 0));
  const sample = [];
  for (const card of candidates.slice(0, 20)) {
    try {
      const rem = await card.getRem();
      sample.push({ cardId: card._id, remId: card.remId,
        front: rem ? await plugin.richText.toString(rem.text || []) : null,
        back: rem ? await plugin.richText.toString(rem.backText || []) : null,
        parentRemId: rem?.parent,
        note: 'Underlying Rem text; not a rendered card. Nested answers and cloze context may be incomplete.',
      });
    } catch (error) { sample.push({ cardId: card._id, error: String(error) }); }
  }
  const snapshot = {
    schemaVersion: 1, startedAt, collectedAt: new Date().toISOString(), sdkVersion: '0.0.46',
    knowledgeBase,
    scope: 'Cards returned by SDK in the currently open knowledge base; completeness unverified.',
    caveats: [
      'Current surviving cards only; deleted cards and historical content versions may be absent.',
      'Missing isCram is not proof of normal scheduled practice.',
      'Raw timestamps retained; displayed ISO dates infer seconds/milliseconds and require validation.',
      'Response-time units, history completeness and due/enabled state are not validated.',
    ],
    summary: summarize(records), sample, cards: records,
  };
  let bridgeStatus = 'Not configured. Start with npm start to enable the local assistant bridge.';
  if (__BRIDGE_TOKEN__) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch('http://127.0.0.1:7789/snapshot', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__BRIDGE_TOKEN__}` },
          body: JSON.stringify(snapshot), signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        bridgeStatus = 'Saved to the local assistant bridge.';
      } finally { clearTimeout(timer); }
    } catch (error) { bridgeStatus = `Bridge unavailable: ${String(error)}`; }
  }
  // Session storage is local to this running plugin, not a note in the knowledge base.
  const display = { ...snapshot, cards: undefined, bridgeStatus };
  await plugin.storage.setSession(SNAPSHOT_KEY, display);
  return display;
}
