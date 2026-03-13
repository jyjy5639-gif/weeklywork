// ============================================================
//  dashboard.js — 대시보드 페이지 로직
//  window.DB (Db.js) 를 통해 Firestore 실시간 구독
// ============================================================

let _allEntries  = [];
let _viewWeek    = '';      // 현재 보고 있는 주차 시작일 (YYYY-MM-DD)
let _filterDept  = '전체';
let _filterCat   = '전체';
let _unsubscribe = null;

const DEPTS = ['투자1부', '투자2부', '투자3부', '관리부'];
const CATS  = ['작성중', '신규', '기존', '기존★', '관리자산', '입/출금', '기타'];

const STATUS_CLS = {
  '작성중':'status-작성중','검토중':'status-검토중','심사중':'status-심사중',
  '투자완료':'status-투자완료','협의중':'status-협의중','보류':'status-보류','종결':'status-종결'
};
const CAT_CLS = {
  '작성중':'tag-작성중','신규':'tag-신규','기존':'tag-기존','기존★':'tag-기존★',
  '관리자산':'tag-관리자산','입/출금':'tag-입출금','기타':'tag-기타'
};

// ── 유틸 ────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getMondayStr(d) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(d);
  m.setDate(diff);
  return m.toISOString().split('T')[0];
}

function shiftWeek(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

function formatWeekLabel(mondayStr) {
  if (!mondayStr) return '—';
  const m   = new Date(mondayStr);
  const sun = new Date(m);
  sun.setDate(m.getDate() + 6);
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${mondayStr.slice(0, 4)}년  ${fmt(m)} – ${fmt(sun)}`;
}

// ── 주차 네비게이션 ─────────────────────────────────────────
function prevWeek() {
  _viewWeek = shiftWeek(_viewWeek, -1);
  renderAll();
}

function nextWeek() {
  _viewWeek = shiftWeek(_viewWeek, 1);
  renderAll();
}

// ── 탭 필터 ─────────────────────────────────────────────────
function filterDept(dept, el) {
  _filterDept = dept;
  document.querySelectorAll('.dept-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderTable();
}

function filterCat(cat, el) {
  _filterCat = cat;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderTable();
}

// ── 전체 렌더 ────────────────────────────────────────────────
function renderAll() {
  updateWeekLabel();
  updateHeaderDates();
  renderKPI();
  renderTable();
}

function updateWeekLabel() {
  const el = document.getElementById('currentWeekLabel');
  if (el) el.textContent = formatWeekLabel(_viewWeek);
}

function updateHeaderDates() {
  const prevMon = shiftWeek(_viewWeek, -1);
  const cur = document.getElementById('headerDateCurrent');
  const prv = document.getElementById('headerDatePrev');
  if (cur) cur.textContent = formatWeekLabel(_viewWeek);
  if (prv) prv.textContent = formatWeekLabel(prevMon);
}

// ── KPI (주차 전체 기준, 탭 필터 미적용) ──────────────────────
function renderKPI() {
  const week = _allEntries.filter(e => e.week_start === _viewWeek);
  const cur  = week.filter(e => e.week_type === 'current');
  const prv  = week.filter(e => e.week_type === 'prev');

  const kpis = [
    {
      label: '금주 실적',
      value: cur.length,
      sub: `총 ${cur.length}건`,
      cls: 'blue'
    },
    {
      label: '전주 실적',
      value: prv.length,
      sub: `총 ${prv.length}건`,
      cls: 'green'
    },
    {
      label: '투자완료',
      value: week.filter(e => e.status === '투자완료').length,
      sub: '이번 주',
      cls: 'gold'
    },
    {
      label: '심사중',
      value: week.filter(e => e.status === '심사중').length,
      sub: '이번 주',
      cls: 'red'
    },
    {
      label: '검토중 / 협의중',
      value: week.filter(e => e.status === '검토중' || e.status === '협의중').length,
      sub: '이번 주',
      cls: ''
    },
  ];

  document.getElementById('kpiRow').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
}

// ── 테이블 셀 헬퍼 ───────────────────────────────────────────
function makeCurCells(e) {
  if (!e) {
    return '<td class="current-col empty-cell">—</td>'.repeat(6);
  }
  return `
    <td class="current-col"><span class="company-name">${esc(e.company) || '—'}</span></td>
    <td class="current-col"><span class="industry-text" title="${esc(e.industry)}">${esc(e.industry) || '—'}</span></td>
    <td class="current-col"><span class="invest-text"   title="${esc(e.invest_type)}">${esc(e.invest_type) || '—'}</span></td>
    <td class="current-col">${esc(e.target) || '—'}</td>
    <td class="current-col"><span class="amount-text">${esc(e.review_amount) || '—'}</span></td>
    <td class="current-col"><span class="status-badge ${STATUS_CLS[e.status] || ''}">${esc(e.status) || '—'}</span></td>`;
}

function makePrvCells(e) {
  if (!e) {
    return '<td class="prev-col empty-cell">—</td>'.repeat(6);
  }
  return `
    <td class="prev-col"><span class="company-name">${esc(e.company) || '—'}</span></td>
    <td class="prev-col"><span class="industry-text" title="${esc(e.industry)}">${esc(e.industry) || '—'}</span></td>
    <td class="prev-col"><span class="invest-text"   title="${esc(e.invest_type)}">${esc(e.invest_type) || '—'}</span></td>
    <td class="prev-col">${esc(e.target) || '—'}</td>
    <td class="prev-col"><span class="amount-text">${esc(e.review_amount) || '—'}</span></td>
    <td class="prev-col"><span class="status-badge ${STATUS_CLS[e.status] || ''}">${esc(e.status) || '—'}</span></td>`;
}

// ── 테이블 렌더 ──────────────────────────────────────────────
function renderTable() {
  const weekAll = _allEntries.filter(e => e.week_start === _viewWeek);

  // 탭 필터 적용
  let filtered = weekAll;
  if (_filterDept !== '전체') filtered = filtered.filter(e => e.dept === _filterDept);
  if (_filterCat  !== '전체') filtered = filtered.filter(e => e.category === _filterCat);

  const curEntries = filtered.filter(e => e.week_type === 'current');
  const prvEntries = filtered.filter(e => e.week_type === 'prev');

  const deptOrder = _filterDept !== '전체' ? [_filterDept] : DEPTS;
  const catOrder  = _filterCat  !== '전체' ? [_filterCat]  : CATS;

  const rows = [];

  for (const dept of deptOrder) {
    for (const cat of catOrder) {
      const cg = curEntries.filter(e => e.dept === dept && e.category === cat);
      const pg = prvEntries.filter(e => e.dept === dept && e.category === cat);

      if (!cg.length && !pg.length) continue;

      const rowCount = Math.max(cg.length, pg.length);

      for (let i = 0; i < rowCount; i++) {
        rows.push(`<tr>
          ${i === 0
            ? `<td class="td-dept" rowspan="${rowCount}">${esc(dept)}</td>
               <td class="td-cat"  rowspan="${rowCount}">
                 <span class="tag ${CAT_CLS[cat] || 'tag-기타'}">${esc(cat)}</span>
               </td>`
            : ''}
          ${makeCurCells(cg[i])}
          ${makePrvCells(pg[i])}
        </tr>`);
      }
    }
  }

  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = rows.length
    ? rows.join('')
    : `<tr><td colspan="14" class="empty-row">해당 주차에 데이터가 없습니다.<br>
         <a href="input.html" style="color:var(--gold);font-size:12px;margin-top:8px;display:inline-block">+ 데이터 입력하러 가기</a>
       </td></tr>`;

  // 푸터 업데이트
  const rcEl = document.getElementById('recordCount');
  if (rcEl) rcEl.textContent = `총 ${_allEntries.length}건`;

  const luEl = document.getElementById('lastUpdated');
  if (luEl) luEl.textContent = `최종 업데이트: ${new Date().toLocaleString('ko-KR')}`;

  document.getElementById('loadingOverlay')?.classList.add('hidden');
}

// ── 실시간 구독 시작 ─────────────────────────────────────────
function startSubscription() {
  if (!window.DB) return;
  if (_unsubscribe) _unsubscribe();

  _unsubscribe = window.DB.subscribeAll(entries => {
    _allEntries = entries;

    // 뷰 주차가 아직 없으면 가장 최신 주차로 설정
    if (!_viewWeek) {
      const weeks = [...new Set(entries.map(e => e.week_start))]
        .filter(Boolean).sort();
      _viewWeek = weeks.length ? weeks[weeks.length - 1] : getMondayStr(new Date());
    }

    renderAll();
  });
}

// ── 초기화 ─────────────────────────────────────────────────
window.addEventListener('db-ready', startSubscription);

document.addEventListener('DOMContentLoaded', () => {
  // 기본 뷰 주차: 오늘 기준 이번 주 월요일
  if (!_viewWeek) _viewWeek = getMondayStr(new Date());
  updateWeekLabel();
  updateHeaderDates();

  // DB 모듈이 먼저 로드됐을 경우 대비 폴링
  const tryConnect = () => {
    if (window.DB) startSubscription();
    else setTimeout(tryConnect, 200);
  };
  tryConnect();
});
