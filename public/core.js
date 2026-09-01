(function bootstrapCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RoutineCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createCore() {
  const DAY_MS = 24 * 60 * 60 * 1000;

  const CATEGORIES = {
    '집': { icon: '🏠', tone: 'mint' },
    '생활': { icon: '🧴', tone: 'pink' },
    '뷰티': { icon: '💆🏻‍♀️', tone: 'lavender' },
    '건강': { icon: '🏥', tone: 'peach' },
    '반려동물': { icon: '🐾', tone: 'yellow' },
    '기타': { icon: '✨', tone: 'sky' }
  };

  function toISO(date) {
    const value = date instanceof Date ? date : new Date(date);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function fromISO(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(iso, days) {
    const date = fromISO(iso);
    date.setDate(date.getDate() + Number(days));
    return toISO(date);
  }

  function dayDifference(from, to) {
    const toUTC = iso => {
      const [year, month, day] = iso.split('-').map(Number);
      return Date.UTC(year, month - 1, day);
    };
    return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
  }

  function formatDate(iso, options = {}) {
    const base = { month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('ko-KR', { ...base, ...options }).format(fromISO(iso));
  }

  function formatInterval(days) {
    const value = Number(days);
    if (value % 365 === 0) return `${value / 365}년마다`;
    if (value % 30 === 0) return `${value / 30}개월마다`;
    if (value % 7 === 0) return `${value / 7}주마다`;
    return `${value}일마다`;
  }

  function getCycleStatus(cycle, today = toISO(new Date())) {
    const nextDate = addDays(cycle.lastCompletedAt, cycle.intervalDays);
    const daysLeft = dayDifference(today, nextDate);
    const elapsed = dayDifference(cycle.lastCompletedAt, today);
    const progress = Math.max(0, Math.min(100, Math.round((elapsed / cycle.intervalDays) * 100)));
    let group = 'calm';
    if (daysLeft < 0) group = 'overdue';
    else if (daysLeft <= Number(cycle.reminderDays || 0)) group = 'due';
    else if (daysLeft <= 30) group = 'upcoming';

    let label = `D-${daysLeft}`;
    if (daysLeft < 0) label = `D+${Math.abs(daysLeft)}`;
    if (daysLeft === 0) label = '오늘';

    return { nextDate, daysLeft, elapsed, progress, group, label };
  }

  function createId(prefix = 'cycle') {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createDefaultState(today = toISO(new Date())) {
    const cycle = (id, name, category, emoji, intervalDays, lastOffset, reminderDays = 7, action = '완료했어요') => ({
      id, name, category, emoji, intervalDays, reminderDays, action,
      lastCompletedAt: addDays(today, lastOffset), createdAt: addDays(today, Math.min(lastOffset - 30, -60))
    });
    const cycles = [
      cycle('toothbrush', '칫솔 교체', '생활', '🪥', 60, -63, 7, '교체했어요'),
      cycle('cat-litter', '고양이 모래', '반려동물', '🐱', 24, -22, 5, '구매했어요'),
      cycle('skincare', '피부관리', '뷰티', '💆🏻‍♀️', 90, -78, 14),
      cycle('haircut', '미용실', '뷰티', '✂️', 49, -26, 7),
      cycle('air-filter', '공기청정기 필터', '집', '🌬️', 180, -150, 14, '교체했어요'),
      cycle('bedding', '침구 세탁', '집', '🛏️', 14, -5, 3),
      cycle('supplements', '영양제 구매', '건강', '💊', 30, -10, 5, '구매했어요'),
      cycle('dental', '치과 검진', '건강', '🦷', 180, -70, 21),
      cycle('water-filter', '정수기 필터', '생활', '💧', 120, -20, 14, '교체했어요')
    ];
    const recordSeed = [
      ['bedding', -5], ['supplements', -10], ['cat-litter', -22], ['haircut', -26],
      ['toothbrush', -63], ['dental', -70], ['skincare', -78], ['air-filter', -150]
    ];
    const records = recordSeed.map(([cycleId, offset], index) => {
      const item = cycles.find(entry => entry.id === cycleId);
      return {
        id: `record-${index + 1}`,
        cycleId,
        cycleName: item.name,
        category: item.category,
        emoji: item.emoji,
        completedAt: addDays(today, offset),
        scheduledAt: addDays(today, offset + (index % 3 === 0 ? 1 : 0))
      };
    });
    return { version: 1, profile: { name: '민지' }, cycles, records };
  }

  function normalizeState(value, today = toISO(new Date())) {
    if (!value || !Array.isArray(value.cycles) || !Array.isArray(value.records)) return createDefaultState(today);
    const isISODate = input => /^\d{4}-\d{2}-\d{2}$/.test(String(input || ''));
    const cycles = value.cycles.filter(Boolean).map(item => ({
      id: String(item.id || createId()),
      name: String(item.name || '이름 없는 사이클'),
      category: CATEGORIES[item.category] ? item.category : '기타',
      emoji: String(item.emoji || '✨'),
      intervalDays: Math.max(1, Number(item.intervalDays) || 30),
      reminderDays: Math.max(0, Number(item.reminderDays) || 0),
      lastCompletedAt: isISODate(item.lastCompletedAt) ? item.lastCompletedAt : today,
      createdAt: item.createdAt || today,
      action: String(item.action || '완료했어요')
    }));
    const records = value.records.filter(Boolean).map(item => ({
      id: String(item.id || createId('record')),
      cycleId: String(item.cycleId || ''),
      cycleName: String(item.cycleName || '이름 없는 사이클'),
      category: CATEGORIES[item.category] ? item.category : '기타',
      emoji: String(item.emoji || '✓'),
      completedAt: isISODate(item.completedAt) ? item.completedAt : today,
      scheduledAt: isISODate(item.scheduledAt) ? item.scheduledAt : (isISODate(item.completedAt) ? item.completedAt : today)
    }));
    const profileName = typeof value.profile?.name === 'string' && value.profile.name.trim() ? value.profile.name.trim() : '민지';
    return { version: 1, profile: { name: profileName }, cycles, records };
  }

  function completeCycle(state, cycleId, completedAt = toISO(new Date())) {
    const previous = JSON.parse(JSON.stringify(state));
    const cycle = state.cycles.find(item => item.id === cycleId);
    if (!cycle) return { state, previous: null, record: null };
    const status = getCycleStatus(cycle, completedAt);
    const record = {
      id: createId('record'), cycleId: cycle.id, cycleName: cycle.name,
      category: cycle.category, emoji: cycle.emoji, completedAt,
      scheduledAt: status.nextDate
    };
    cycle.lastCompletedAt = completedAt;
    state.records.unshift(record);
    return { state, previous, record };
  }

  function groupCycles(cycles, today = toISO(new Date())) {
    const result = { attention: [], upcoming: [], calm: [] };
    cycles.forEach(cycle => {
      const item = { cycle, status: getCycleStatus(cycle, today) };
      if (item.status.group === 'overdue' || item.status.group === 'due') result.attention.push(item);
      else if (item.status.group === 'upcoming') result.upcoming.push(item);
      else result.calm.push(item);
    });
    const byDate = (a, b) => a.status.daysLeft - b.status.daysLeft;
    result.attention.sort(byDate);
    result.upcoming.sort(byDate);
    result.calm.sort(byDate);
    return result;
  }

  function categoryCounts(cycles) {
    return cycles.reduce((counts, cycle) => {
      counts[cycle.category] = (counts[cycle.category] || 0) + 1;
      return counts;
    }, {});
  }

  return {
    CATEGORIES, addDays, categoryCounts, completeCycle, createDefaultState, createId,
    dayDifference, formatDate, formatInterval, fromISO, getCycleStatus, groupCycles,
    normalizeState, toISO
  };
}));
