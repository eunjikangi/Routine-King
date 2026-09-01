const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../public/core');

test('classifies overdue, due, upcoming, and calm cycles', () => {
  const base = { lastCompletedAt: '2026-01-01', reminderDays: 5 };
  assert.equal(core.getCycleStatus({ ...base, intervalDays: 10 }, '2026-01-12').group, 'overdue');
  assert.equal(core.getCycleStatus({ ...base, intervalDays: 14 }, '2026-01-10').group, 'due');
  assert.equal(core.getCycleStatus({ ...base, intervalDays: 30 }, '2026-01-10').group, 'upcoming');
  assert.equal(core.getCycleStatus({ ...base, intervalDays: 90 }, '2026-01-10').group, 'calm');
});

test('calculates a cycle D-day and progress', () => {
  const status = core.getCycleStatus({
    lastCompletedAt: '2026-08-01', intervalDays: 30, reminderDays: 7
  }, '2026-08-21');
  assert.equal(status.nextDate, '2026-08-31');
  assert.equal(status.daysLeft, 10);
  assert.equal(status.label, 'D-10');
  assert.equal(status.progress, 67);
});

test('completion updates the cycle and creates a history record', () => {
  const state = core.createDefaultState('2026-09-02');
  const before = state.records.length;
  const result = core.completeCycle(state, 'toothbrush', '2026-09-02');
  assert.equal(result.state.cycles.find(item => item.id === 'toothbrush').lastCompletedAt, '2026-09-02');
  assert.equal(result.state.records.length, before + 1);
  assert.equal(result.record.cycleName, '칫솔 교체');
  assert.equal(result.previous.records.length, before);
});

test('normalizes invalid imported state fields', () => {
  const state = core.normalizeState({
    cycles: [{ id: 'one', name: '', category: '알 수 없음', intervalDays: 0, lastCompletedAt: 'invalid' }],
    records: [{ id: 'record', cycleName: '', category: '알 수 없음', completedAt: 'invalid' }]
  }, '2026-09-02');
  assert.equal(state.cycles[0].category, '기타');
  assert.equal(state.cycles[0].intervalDays, 30);
  assert.equal(state.cycles[0].lastCompletedAt, '2026-09-02');
  assert.equal(state.records[0].category, '기타');
  assert.equal(state.records[0].completedAt, '2026-09-02');
});
