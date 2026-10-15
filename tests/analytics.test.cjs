const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize, timestampISO } = require('../src/analytics');
const card = history => ({ id: 'card', remId: 'rem', type: 'forward', createdAt: 0, history });

test('separates recall, cram, administrative and unknown scores', () => {
  const result = summarize([card([
    { date: 1700000000000, score: 0 },
    { date: 1700000000000, score: 1 },
    { date: 1700000000000, score: 1.5, isCram: true },
    { date: 1700000000000, score: 3 },
    { date: 1700000000000, score: 0.01 },
    { date: 1700000000000, score: 42 },
  ])]);
  assert.equal(result.recordedEvents, 6);
  assert.equal(result.recallAttempts, 2);
  assert.equal(result.cramAttempts, 1);
  assert.equal(result.administrativeOrOtherEvents, 3);
  assert.deepEqual(result.ratingCounts, { again: 1, hard: 0, good: 1, easy: 0 });
});

test('preserves distinction between absent history and empty history', () => {
  const result = summarize([card(undefined), card([])]);
  assert.equal(result.cardsWithHistoryField, 1);
  assert.equal(result.cardsWithRecordedEvents, 0);
  assert.equal(result.earliestRecordedEvent, null);
});

test('optional zero values count as present and invalid dates are explicit', () => {
  const result = summarize([card([{ date: NaN, score: 0.5, responseTime: 0, scheduled: 0 }])]);
  assert.equal(result.withResponseTime, 1);
  assert.equal(result.withScheduledDate, 1);
  assert.equal(result.invalidDates, 1);
});

test('seconds and milliseconds normalize equally while invalid dates are rejected', () => {
  assert.equal(timestampISO(1700000000), timestampISO(1700000000000));
  assert.equal(timestampISO(0), undefined);
  assert.equal(timestampISO(Infinity), undefined);
});
