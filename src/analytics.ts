export interface Review {
  date: number;
  score: number;
  responseTime?: number;
  isCram?: boolean;
  scheduled?: number;
}

export interface CardRecord {
  id: string;
  remId: string;
  type: unknown;
  createdAt: number;
  history?: Review[];
  nextRepetitionTime?: number;
  lastRepetitionTime?: number;
  timesWrongInRow?: number;
}

const recallScores = new Set([0, 0.5, 1, 1.5]);

// Preserve raw timestamps; infer units only for plausible contemporary dates.
export function timestampISO(value: number | undefined): string | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const milliseconds = value >= 1e12 ? value : value * 1000;
  const year = new Date(milliseconds).getUTCFullYear();
  return year >= 2000 && year <= 2100 ? new Date(milliseconds).toISOString() : undefined;
}

export function summarize(cards: CardRecord[]) {
  let recordedEvents = 0, recallAttempts = 0, cramAttempts = 0;
  let administrativeOrOtherEvents = 0, withResponseTime = 0, withScheduledDate = 0;
  let invalidDates = 0;
  const dates: string[] = [];
  const ratingCounts: Record<string, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  const labels: Record<string, string> = { '0': 'again', '0.5': 'hard', '1': 'good', '1.5': 'easy' };
  for (const card of cards) {
    for (const event of card.history || []) {
      recordedEvents++;
      const date = timestampISO(event.date);
      if (date) dates.push(date); else invalidDates++;
      if (!recallScores.has(event.score)) { administrativeOrOtherEvents++; continue; }
      if (event.isCram === true) { cramAttempts++; continue; }
      recallAttempts++;
      ratingCounts[labels[String(event.score)]]++;
      if (event.responseTime !== undefined) withResponseTime++;
      if (event.scheduled !== undefined) withScheduledDate++;
    }
  }
  dates.sort();
  return {
    cardsReturned: cards.length,
    cardsWithHistoryField: cards.filter(c => c.history !== undefined).length,
    cardsWithRecordedEvents: cards.filter(c => c.history?.length).length,
    recordedEvents, recallAttempts, cramAttempts, administrativeOrOtherEvents,
    ratingCounts, withResponseTime, withScheduledDate, invalidDates,
    earliestRecordedEvent: dates[0] || null,
    latestRecordedEvent: dates[dates.length - 1] || null,
    repeatedFailureCandidates: cards.filter(c => (c.timesWrongInRow || 0) >= 2).length,
  };
}
