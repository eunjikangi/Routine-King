(() => {
  'use strict';

  const Core = globalThis.RoutineCore;
  const STORAGE_KEY = 'routine-king-state-v1';
  const today = () => Core.toISO(new Date());
  const content = document.querySelector('#app-content');
  const cycleDialog = document.querySelector('#cycle-dialog');
  const settingsDialog = document.querySelector('#settings-dialog');
  const cycleForm = document.querySelector('#cycle-form');
  const sidebar = document.querySelector('#sidebar');
  const scrim = document.querySelector('#sidebar-scrim');
  const toast = document.querySelector('#toast');
  const toastMessage = document.querySelector('#toast-message');
  const toastAction = document.querySelector('#toast-action');
  let toastTimer;
  let cycleSearch = '';

  function escapeHTML(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? Core.normalizeState(JSON.parse(stored), today()) : Core.createDefaultState(today());
    } catch (error) {
      console.warn('저장 데이터를 불러오지 못해 예시 데이터로 시작합니다.', error);
      return Core.createDefaultState(today());
    }
  }

  let state = loadState();
  saveState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function parseRoute() {
    const raw = location.hash.slice(1) || 'home';
    const [name, query = ''] = raw.split('?');
    const allowed = ['home', 'cycles', 'history', 'insights'];
    return { name: allowed.includes(name) ? name : 'home', params: new URLSearchParams(query) };
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    scrim.classList.remove('show');
    document.body.classList.remove('menu-open');
  }

  function setPageHeader(route) {
    const dateLabel = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    }).format(new Date());
    document.querySelector('#today-label').textContent = dateLabel;
    const titleMap = {
      home: `좋은 하루예요, ${state.profile.name || '민지'}님`,
      cycles: '내 사이클',
      history: '완료 기록',
      insights: '생활 인사이트'
    };
    document.querySelector('#page-title').innerHTML = `${escapeHTML(titleMap[route.name])}${route.name === 'home' ? ' <span aria-hidden="true">👋</span>' : ''}`;
  }

  function renderSidebar(route) {
    document.querySelector('#cycle-count').textContent = state.cycles.length;
    document.querySelectorAll('[data-route]').forEach(link => {
      const isActive = link.dataset.route === route.name && !route.params.get('category');
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const counts = Core.categoryCounts(state.cycles);
    document.querySelector('#category-nav').innerHTML = Object.entries(Core.CATEGORIES)
      .filter(([name]) => counts[name])
      .map(([name, meta]) => {
        const isActive = route.name === 'cycles' && route.params.get('category') === name;
        return `<a class="${isActive ? 'active' : ''}" ${isActive ? 'aria-current="page"' : ''} href="#cycles?category=${encodeURIComponent(name)}"><span aria-hidden="true">${meta.icon}</span><span>${name}</span><b>${counts[name]}</b></a>`;
      }).join('');
  }

  function statusCopy(status) {
    if (status.daysLeft < 0) return `${Math.abs(status.daysLeft)}일 지났어요`;
    if (status.daysLeft === 0) return '오늘이 예정일이에요';
    return `${status.daysLeft}일 남았어요`;
  }

  function cycleCard(item, compact = false) {
    const { cycle, status } = item;
    const meta = Core.CATEGORIES[cycle.category] || Core.CATEGORIES['기타'];
    if (compact) {
      return `<article class="mini-card">
        <span class="emoji ${meta.tone}" aria-hidden="true">${escapeHTML(cycle.emoji)}</span>
        <div><h3>${escapeHTML(cycle.name)}</h3><p>${Core.formatDate(status.nextDate)} · ${Core.formatInterval(cycle.intervalDays)}</p></div>
        <strong>${status.label}</strong>
      </article>`;
    }
    const severity = status.group === 'overdue' ? 'urgent' : status.group === 'due' ? 'warning' : 'normal';
    return `<article class="cycle-card ${severity}" data-cycle-id="${escapeHTML(cycle.id)}">
      <div class="card-top">
        <span class="emoji ${meta.tone}" aria-hidden="true">${escapeHTML(cycle.emoji)}</span>
        <button class="more" type="button" data-action="edit" data-id="${escapeHTML(cycle.id)}" aria-label="${escapeHTML(cycle.name)} 수정">•••</button>
      </div>
      <div class="card-title">
        <div><h3>${escapeHTML(cycle.name)}</h3><span>${escapeHTML(cycle.category)}</span></div>
        <strong>${status.label}</strong>
      </div>
      <div class="progress" role="progressbar" aria-label="${escapeHTML(cycle.name)} 주기 진행률" aria-valuenow="${status.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${status.progress}%"></i></div>
      <div class="cycle-meta"><span>마지막 완료 <b>${Core.formatDate(cycle.lastCompletedAt)}</b></span><span>주기 <b>${Core.formatInterval(cycle.intervalDays)}</b></span></div>
      <button class="complete" type="button" data-action="complete" data-id="${escapeHTML(cycle.id)}">✓ &nbsp; ${escapeHTML(cycle.action || '완료했어요')}</button>
    </article>`;
  }

  function emptyState(icon, title, copy, action = '') {
    return `<div class="empty-state"><span aria-hidden="true">${icon}</span><h3>${title}</h3><p>${copy}</p>${action}</div>`;
  }

  function renderHome() {
    const groups = Core.groupCycles(state.cycles, today());
    const overdue = groups.attention.filter(item => item.status.group === 'overdue');
    const first = groups.attention[0];
    const briefing = groups.attention.length
      ? `지금 챙길 일은 <strong>${groups.attention.length}개</strong>예요. ${first ? `${escapeHTML(first.cycle.name)}${first.status.daysLeft < 0 ? `이(가) ${Math.abs(first.status.daysLeft)}일 지났어요.` : `까지 ${first.status.daysLeft}일 남았어요.`}` : ''}`
      : '오늘 바로 챙길 일은 없어요. 모든 생활 주기가 편안하게 흘러가고 있어요.';

    content.innerHTML = `
      <section class="briefing">
        <div class="brief-icon" aria-hidden="true">✦</div>
        <div class="brief-copy"><span>오늘의 라이프 브리핑</span><p>${briefing}</p></div>
        <button type="button" data-action="brief-details">자세히 보기 <span aria-hidden="true">→</span></button>
      </section>

      <section class="status-section" id="attention-section">
        <div class="section-heading"><div><h2><span class="dot red"></span> 지금 챙겨야 해요</h2><p>예정일이 지났거나 알림 시점이 된 항목이에요.</p></div><a class="text-button" href="#cycles">전체 보기&nbsp; →</a></div>
        ${groups.attention.length
          ? `<div class="card-grid urgent-grid">${groups.attention.slice(0, 4).map(item => cycleCard(item)).join('')}</div>`
          : emptyState('🌿', '지금은 여유로워요', '알림 시점이 된 사이클이 아직 없어요.')}
      </section>

      <section class="status-section upcoming">
        <div class="section-heading"><div><h2><span class="dot amber"></span> 곧 돌아와요</h2><p>앞으로 30일 안에 돌아오는 사이클이에요.</p></div><a class="text-button" href="#cycles">전체 보기&nbsp; →</a></div>
        ${groups.upcoming.length
          ? `<div class="card-grid compact-grid">${groups.upcoming.slice(0, 3).map(item => cycleCard(item, true)).join('')}</div>`
          : emptyState('🗓️', '30일 안의 일정이 없어요', '새 사이클을 추가하면 다음 날짜를 계산해드려요.')}
      </section>

      <section class="calm-section">
        <div class="calm-icon" aria-hidden="true">✓</div>
        <div><h3>나머지는 당분간 괜찮아요</h3><p>${groups.calm.length ? `${groups.calm[0].cycle.name} 외 ${Math.max(0, groups.calm.length - 1)}개 사이클은 아직 여유가 있어요.` : overdue.length ? '조금만 챙기면 모든 사이클이 다시 편안해져요.' : '모든 사이클을 확인했어요.'}</p></div>
        <a href="#cycles">확인하기 →</a>
      </section>`;
  }

  function filteredCycles(route) {
    const category = route.params.get('category');
    return state.cycles
      .filter(cycle => !category || cycle.category === category)
      .filter(cycle => cycle.name.toLocaleLowerCase('ko').includes(cycleSearch.toLocaleLowerCase('ko')))
      .map(cycle => ({ cycle, status: Core.getCycleStatus(cycle, today()) }))
      .sort((a, b) => a.status.daysLeft - b.status.daysLeft);
  }

  function renderCycleList(route) {
    const list = filteredCycles(route);
    const listNode = document.querySelector('#cycle-list');
    const resultNode = document.querySelector('#cycle-results');
    if (resultNode) resultNode.textContent = `${list.length}개`;
    if (!listNode) return;
    listNode.innerHTML = list.length
      ? list.map(item => cycleCard(item)).join('')
      : emptyState('🔎', '조건에 맞는 사이클이 없어요', '검색어를 바꾸거나 새로운 사이클을 추가해보세요.', '<button class="primary-button compact" type="button" data-action="add">새 사이클 만들기</button>');
  }

  function renderCycles(route) {
    const category = route.params.get('category');
    const chips = ['전체', ...Object.keys(Core.CATEGORIES).filter(name => state.cycles.some(cycle => cycle.category === name))];
    content.innerHTML = `
      <section class="view-heading"><div><p class="view-kicker">LIFE CYCLES</p><h2>${category ? `${escapeHTML(category)} 사이클` : '기억할 일은 여기에 맡겨두세요'}</h2><p>다가오는 순서대로 정리했어요. 완료하면 다음 날짜를 다시 계산합니다.</p></div><button class="primary-button" type="button" data-action="add">＋ 새 사이클</button></section>
      <section class="toolbar" aria-label="사이클 찾기와 분류">
        <label class="search-box"><span aria-hidden="true">⌕</span><input id="cycle-search" type="search" placeholder="사이클 검색" value="${escapeHTML(cycleSearch)}" aria-label="사이클 검색" /></label>
        <div class="filter-chips">${chips.map(name => `<a class="${(!category && name === '전체') || category === name ? 'active' : ''}" href="${name === '전체' ? '#cycles' : `#cycles?category=${encodeURIComponent(name)}`}">${name}</a>`).join('')}</div>
        <span class="result-count" id="cycle-results"></span>
      </section>
      <section class="cycle-library" id="cycle-list"></section>`;
    renderCycleList(route);
  }

  function renderHistory() {
    const records = [...state.records].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const groups = records.reduce((result, record) => {
      const month = record.completedAt.slice(0, 7);
      (result[month] ||= []).push(record);
      return result;
    }, {});

    content.innerHTML = `
      <section class="view-heading"><div><p class="view-kicker">HISTORY</p><h2>해낸 일들이 차곡차곡 쌓여요</h2><p>완료 기록은 다음 주기를 계산하고 생활 패턴을 이해하는 데 사용돼요.</p></div></section>
      ${records.length ? `<div class="history-summary"><strong>${records.length}</strong><span>지금까지 남긴 완료 기록</span></div>
        <div class="timeline">${Object.entries(groups).map(([month, items]) => {
          const [year, monthNumber] = month.split('-');
          return `<section class="timeline-group"><h3>${year}년 ${Number(monthNumber)}월</h3><div>${items.map(record => {
            const timing = record.scheduledAt ? Core.dayDifference(record.completedAt, record.scheduledAt) : 0;
            const timingLabel = timing >= 0 ? '예정일 안에 완료' : `${Math.abs(timing)}일 늦게 완료`;
            return `<article class="history-row"><span class="emoji ${(Core.CATEGORIES[record.category] || Core.CATEGORIES['기타']).tone}" aria-hidden="true">${escapeHTML(record.emoji || '✓')}</span><div><strong>${escapeHTML(record.cycleName)}</strong><small>${escapeHTML(record.category || '기타')} · ${timingLabel}</small></div><time datetime="${record.completedAt}">${Core.formatDate(record.completedAt)}</time></article>`;
          }).join('')}</div></section>`;
        }).join('')}</div>` : emptyState('✓', '아직 완료 기록이 없어요', '사이클을 완료하면 이곳에 자동으로 기록돼요.')}`;
  }

  function renderInsights() {
    const currentMonth = today().slice(0, 7);
    const monthlyRecords = state.records.filter(record => record.completedAt.startsWith(currentMonth));
    const onTime = state.records.filter(record => !record.scheduledAt || Core.dayDifference(record.completedAt, record.scheduledAt) >= 0).length;
    const onTimeRate = state.records.length ? Math.round((onTime / state.records.length) * 100) : 0;
    const averageInterval = state.cycles.length ? Math.round(state.cycles.reduce((sum, cycle) => sum + cycle.intervalDays, 0) / state.cycles.length) : 0;
    const comingWeek = state.cycles.filter(cycle => {
      const days = Core.getCycleStatus(cycle, today()).daysLeft;
      return days >= 0 && days <= 7;
    }).length;
    const counts = Core.categoryCounts(state.cycles);
    const maxCount = Math.max(1, ...Object.values(counts));

    content.innerHTML = `
      <section class="view-heading"><div><p class="view-kicker">INSIGHTS</p><h2>내 생활의 리듬을 한눈에</h2><p>쌓인 완료 기록을 바탕으로 현재 패턴을 간단히 정리했어요.</p></div></section>
      <section class="insight-grid">
        <article class="metric-card featured"><span>이번 달 완료</span><strong>${monthlyRecords.length}<small>회</small></strong><p>${monthlyRecords.length ? '생활의 작은 약속을 잘 이어가고 있어요.' : '첫 완료를 기록해보세요.'}</p></article>
        <article class="metric-card"><span>제때 완료</span><strong>${onTimeRate}<small>%</small></strong><p>예정일을 넘기지 않은 비율</p></article>
        <article class="metric-card"><span>평균 주기</span><strong>${averageInterval}<small>일</small></strong><p>등록된 사이클의 평균 간격</p></article>
        <article class="metric-card"><span>7일 안에</span><strong>${comingWeek}<small>개</small></strong><p>곧 챙겨야 할 사이클</p></article>
      </section>
      <section class="insight-panels">
        <article class="panel category-panel"><div class="panel-heading"><div><span>CATEGORY BALANCE</span><h3>카테고리별 사이클</h3></div><strong>${state.cycles.length}개</strong></div>
          <div class="bar-list">${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
            const meta = Core.CATEGORIES[name] || Core.CATEGORIES['기타'];
            return `<div class="bar-row"><div><span aria-hidden="true">${meta.icon}</span><strong>${name}</strong><small>${count}개</small></div><div class="bar-track"><i style="width:${Math.round((count / maxCount) * 100)}%"></i></div></div>`;
          }).join('') || '<p class="panel-empty">등록된 사이클이 없어요.</p>'}</div>
        </article>
        <article class="panel next-panel"><div class="panel-heading"><div><span>NEXT UP</span><h3>다음으로 챙길 일</h3></div></div>
          ${Core.groupCycles(state.cycles, today()).attention.concat(Core.groupCycles(state.cycles, today()).upcoming).slice(0, 4).map(item => `<div class="next-row"><span>${escapeHTML(item.cycle.emoji)}</span><div><strong>${escapeHTML(item.cycle.name)}</strong><small>${statusCopy(item.status)}</small></div><b>${item.status.label}</b></div>`).join('') || '<p class="panel-empty">가까운 일정이 없어요.</p>'}
        </article>
      </section>`;
  }

  function render() {
    const route = parseRoute();
    setPageHeader(route);
    renderSidebar(route);
    if (route.name === 'home') renderHome();
    if (route.name === 'cycles') renderCycles(route);
    if (route.name === 'history') renderHistory();
    if (route.name === 'insights') renderInsights();
    closeSidebar();
  }

  function showToast(message, actionLabel, action) {
    clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toastAction.hidden = !actionLabel;
    toastAction.textContent = actionLabel || '';
    toastAction.onclick = action || null;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), actionLabel ? 5000 : 3000);
  }

  function populateCategorySelect() {
    document.querySelector('#cycle-category').innerHTML = Object.entries(Core.CATEGORIES)
      .map(([name, meta]) => `<option value="${name}">${meta.icon} ${name}</option>`).join('');
  }

  function inferAction(name) {
    if (name.includes('구매') || name.includes('모래')) return '구매했어요';
    if (name.includes('교체') || name.includes('필터')) return '교체했어요';
    return '완료했어요';
  }

  function openCycleDialog(cycleId) {
    const cycle = cycleId ? state.cycles.find(item => item.id === cycleId) : null;
    cycleForm.reset();
    document.querySelector('#cycle-id').value = cycle?.id || '';
    document.querySelector('#cycle-name').value = cycle?.name || '';
    document.querySelector('#cycle-emoji').value = cycle?.emoji || '✨';
    document.querySelector('#cycle-category').value = cycle?.category || '생활';
    document.querySelector('#cycle-interval').value = cycle?.intervalDays || 30;
    document.querySelector('#cycle-last-date').value = cycle?.lastCompletedAt || today();
    document.querySelector('#cycle-reminder').value = cycle?.reminderDays ?? 7;
    document.querySelector('#dialog-eyebrow').textContent = cycle ? 'EDIT CYCLE' : 'NEW CYCLE';
    document.querySelector('#dialog-title').textContent = cycle ? '사이클을 다듬어볼까요?' : '새로운 주기를 기억할게요';
    document.querySelector('#delete-cycle').hidden = !cycle;
    cycleDialog.showModal();
    setTimeout(() => document.querySelector('#cycle-name').focus(), 0);
  }

  function handleContentClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'add') openCycleDialog();
    if (action === 'edit') openCycleDialog(id);
    if (action === 'brief-details') document.querySelector('#attention-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (action === 'complete') {
      const cycle = state.cycles.find(item => item.id === id);
      const result = Core.completeCycle(state, id, today());
      if (!result.record) return;
      saveState();
      render();
      showToast(`${cycle.name} 완료! 다음 주기를 시작했어요.`, '되돌리기', () => {
        state = result.previous;
        saveState();
        render();
        toast.classList.remove('show');
      });
    }
  }

  cycleForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!cycleForm.reportValidity()) return;
    const id = document.querySelector('#cycle-id').value;
    const name = document.querySelector('#cycle-name').value.trim();
    const values = {
      name,
      emoji: document.querySelector('#cycle-emoji').value.trim() || '✨',
      category: document.querySelector('#cycle-category').value,
      intervalDays: Number(document.querySelector('#cycle-interval').value),
      lastCompletedAt: document.querySelector('#cycle-last-date').value,
      reminderDays: Number(document.querySelector('#cycle-reminder').value),
      action: inferAction(name)
    };
    if (id) {
      const index = state.cycles.findIndex(item => item.id === id);
      if (index >= 0) state.cycles[index] = { ...state.cycles[index], ...values };
      showToast('사이클을 수정했어요.');
    } else {
      state.cycles.push({ id: Core.createId(), createdAt: today(), ...values });
      showToast('새 사이클을 만들었어요.');
    }
    saveState();
    cycleDialog.close();
    render();
  });

  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => document.querySelector(`#${button.dataset.close}`).close());
  });

  document.querySelector('#delete-cycle').addEventListener('click', () => {
    const id = document.querySelector('#cycle-id').value;
    const cycle = state.cycles.find(item => item.id === id);
    if (!cycle) return;
    const previous = JSON.parse(JSON.stringify(state));
    state.cycles = state.cycles.filter(item => item.id !== id);
    saveState();
    cycleDialog.close();
    render();
    showToast(`${cycle.name} 사이클을 삭제했어요.`, '되돌리기', () => {
      state = previous;
      saveState();
      render();
      toast.classList.remove('show');
    });
  });

  document.querySelectorAll('[data-preset]').forEach(button => {
    button.addEventListener('click', () => {
      const [name, category, emoji, interval] = button.dataset.preset.split('|');
      document.querySelector('#cycle-name').value = name;
      document.querySelector('#cycle-category').value = category;
      document.querySelector('#cycle-emoji').value = emoji;
      document.querySelector('#cycle-interval').value = interval;
    });
  });

  [cycleDialog, settingsDialog].forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.querySelector('#add-cycle').addEventListener('click', () => openCycleDialog());
  document.querySelector('#mobile-menu').addEventListener('click', () => {
    sidebar.classList.add('open');
    scrim.classList.add('show');
    document.body.classList.add('menu-open');
  });
  scrim.addEventListener('click', closeSidebar);
  content.addEventListener('click', handleContentClick);
  content.addEventListener('input', event => {
    if (event.target.id !== 'cycle-search') return;
    cycleSearch = event.target.value;
    renderCycleList(parseRoute());
  });

  document.querySelector('#open-settings').addEventListener('click', () => settingsDialog.showModal());
  document.querySelector('.notification-button').addEventListener('click', () => {
    const count = Core.groupCycles(state.cycles, today()).attention.length;
    showToast(count ? `지금 확인할 사이클이 ${count}개 있어요.` : '새로운 알림이 없어요.');
  });

  document.querySelector('#export-data').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `routine-king-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('백업 파일을 저장했어요.');
  });
  document.querySelector('#import-data').addEventListener('click', () => document.querySelector('#import-file').click());
  document.querySelector('#import-file').addEventListener('change', async event => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported.cycles) || !Array.isArray(imported.records)) throw new Error('Invalid backup');
      state = Core.normalizeState(imported, today());
      saveState();
      settingsDialog.close();
      render();
      showToast('백업 데이터를 불러왔어요.');
    } catch (error) {
      showToast('올바른 Routine King 백업 파일이 아니에요.');
    } finally {
      event.target.value = '';
    }
  });
  document.querySelector('#reset-data').addEventListener('click', () => {
    if (!window.confirm('현재 사이클과 기록을 모두 지우고 예시 데이터로 돌아갈까요?')) return;
    state = Core.createDefaultState(today());
    saveState();
    settingsDialog.close();
    render();
    showToast('예시 데이터로 초기화했어요.');
  });

  window.addEventListener('hashchange', render);
  populateCategorySelect();
  if (!location.hash) history.replaceState(null, '', '#home');
  render();
})();
