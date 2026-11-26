import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDays,
  getDueCards,
  gradeCard,
  initializeCard,
  isCardDue,
  updateCardState,
} from '../src/lib/spaced-repetition.ts';

const DAY = '2026-11-22';

test('a new card is due immediately with default ease 2.5', () => {
  const card = initializeCard('c1', DAY);
  assert.equal(card.ease, 2.5);
  assert.equal(card.interval, 1);
  assert.equal(card.repetitions, 0);
  assert.equal(card.dueDate, DAY);
  assert.equal(isCardDue(card.dueDate, DAY), true);
});

test('addDays crosses month boundaries without timezone drift', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
});

test('grades below 3 reset repetitions and schedule the card for tomorrow', () => {
  const learned = gradeCard(undefined, 'c1', 5, DAY);
  const relearn = updateCardState(learned, 1, DAY);

  assert.equal(relearn.repetitions, 0);
  assert.equal(relearn.interval, 1);
  assert.equal(relearn.dueDate, addDays(DAY, 1));
  assert.ok(relearn.ease >= 1.3);
});

test('successful reviews follow the 1 -> 6 -> interval * ease schedule', () => {
  let card = gradeCard(undefined, 'c1', 4, DAY);
  assert.equal(card.interval, 1);
  assert.equal(card.repetitions, 1);
  assert.equal(card.dueDate, addDays(DAY, 1));

  card = updateCardState(card, 4, addDays(DAY, 1));
  assert.equal(card.interval, 6);
  assert.equal(card.repetitions, 2);
  assert.equal(card.dueDate, addDays(addDays(DAY, 1), 6));

  const previousInterval = card.interval;
  const previousEase = card.ease;
  card = updateCardState(card, 4, addDays(DAY, 7));
  assert.equal(card.interval, Math.round(previousInterval * previousEase));
  assert.equal(card.repetitions, 3);
});

test('ease grows with perfect answers and is clamped at 1.3', () => {
  let card = initializeCard('c1', DAY);
  card = updateCardState(card, 5, DAY);
  assert.ok(card.ease > 2.5);

  for (let i = 0; i < 20; i += 1) {
    card = updateCardState(card, 0, DAY);
  }
  assert.equal(card.ease, 1.3);
});

test('getDueCards returns only cards due on the given day, earliest first', () => {
  const cards = {
    a: { cardId: 'a', ease: 2.5, interval: 1, repetitions: 1, dueDate: '2026-11-20' },
    b: { cardId: 'b', ease: 2.5, interval: 3, repetitions: 2, dueDate: '2026-11-25' },
    c: { cardId: 'c', ease: 2.5, interval: 1, repetitions: 1, dueDate: '2026-11-22' },
  };

  assert.deepEqual(getDueCards(cards, DAY), ['a', 'c']);
  assert.equal(isCardDue(cards.b.dueDate, DAY), false);
});
