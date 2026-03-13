// ============================================================
//  input.js — 데이터 입력 페이지 로직 (Firebase)
// ============================================================

let _currentEditId = null;
let _allEntries    = [];

const FIELDS = [
  'f_dept','f_category','f_worktype','f_date','f_week_start','f_week_type',
  'f_company','f_industry','f_invest_type','f_target','f_total_size',
  'f_review_amount','f_status','f_note',
  'f_pre_value','f_equity_ratio','f_coupon','f_irr','f_moic',
  'f_exit_method','f_exit_year','f_put_call','f_tag_drag'
];

function getVal(id) { return document.getElementById(id)?.value?.trim() || ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }

// ── 주간 시작일 기준 금주/전주 자동 판별 ─────────────────────
function getMondayStr(d) {
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(d); m.setDate(diff);
  return m.toISOString().split('T')[0];
}

function calcWeekType(weekStart) {
  if (!weekStart) return '';
  const currentMonday = getMondayStr(new Date());
  return weekStart >= currentMonday ? 'current' : 'prev';
}

function updateWeekTypeBadge() {
  const weekStart = getVal('f_week_start');
  const badge = document.getElementById('weekTypeBadge');
  if (!badge) return;

  const type = calcWeekType(weekStart);
  if (!weekStart) {
    badge.textContent = '주간 시작일을 선택하세요';
    badge.className = 'week-type-badge empty';
  } else if (type === 'current') {
    badge.textContent = '● 금주 실적으로 저장됩니다';
    badge.className = 'week-type-badge current';
  } else {
    badge.textContent = '● 전주 실적으로 저장됩니다';
    badge.className = 'week-type-badge prev';
  }
}

function resetForm() {
  FIELDS.forEach(id => setVal(id, ''));
  const today = new Date().toISOString().split('T')[0];
  setVal('f_date', today);
  setVal('f_week_start', getMondayStr(new Date()));
  setVal('f_status', '검토중');
  updateWeekTypeBadge();
  document.getElementById('formMsg').textContent = '';
  document.getElementById('formMsg').className = 'form-msg';
  document.getElementById('btnSubmit').textContent = '저장';
  document.getElementById('btnSubmit').onclick = submitEntry;
  _currentEditId = null;
}

// ── 저장 ─────────────────────────────────────────────────
async function submitEntry() {
  if (!window.DB) { showMsg('Firebase가 연결되지 않았습니다.', 'error'); return; }

  const dept       = getVal('f_dept');
  const category   = getVal('f_category');
  const company    = getVal('f_company');
  const week_start = getVal('f_week_start');

  if (!dept || !category || !company || !week_start) {
    showMsg('필수 항목(부서, 구분, 회사명, 주간 시작일)을 입력해 주세요.', 'error'); return;
  }

  const week_type = calcWeekType(week_start);

  const entry = {
    dept, category,
    worktype:      getVal('f_worktype'),
    date:          new Date().toISOString().split('T')[0],
    week_start,
    week_type,
    company,
    industry:      getVal('f_industry'),
    invest_type:   getVal('f_invest_type'),
    target:        getVal('f_target'),
    total_size:    getVal('f_total_size'),
    review_amount: getVal('f_review_amount'),
    status:        getVal('f_status') || '검토중',
    note:          getVal('f_note'),
    pre_value:     getVal('f_pre_value'),
    equity_ratio:  getVal('f_equity_ratio'),
    coupon:        getVal('f_coupon'),
    irr:           getVal('f_irr'),
    moic:          getVal('f_moic'),
    exit_method:   getVal('f_exit_method'),
    exit_year:     getVal('f_exit_year'),
    put_call:      getVal('f_put_call'),
    tag_drag:      getVal('f_tag_drag'),
  };

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true; btn.textContent = '저장 중...';

  try {
    if (_currentEditId) {
      await DB.update(_currentEditId, entry);
      showMsg('✓ 수정되었습니다.', 'success');
      _currentEditId = null;
      btn.textContent = '저장';
      btn.onclick = submitEntry;
    } else {
      await DB.add(entry);
      showMsg('✓ 저장되었습니다.', 'success');
    }
    resetForm();
    await loadList();
  } catch(e) {
    showMsg('저장 실패: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    if (!_currentEditId) btn.textContent = '저장';
  }
}

function showMsg(msg, cls) {
  const el = document.getElementById('formMsg');
  el.textContent = msg; el.className = 'form-msg ' + cls;
  setTimeout(() => { el.textContent=''; el.className='form-msg'; }, 4000);
}

// ── 목록 로드 ─────────────────────────────────────────────
async function loadList() {
  if (!window.DB) return;
  _allEntries = await DB.getAll();
  renderList();
  updateWeekFilter();
}

function updateWeekFilter() {
  const weeks = [...new Set(_allEntries.map(e=>e.week_start))].sort().reverse();
  const sel = document.getElementById('filterWeek');
  const cur = sel.value;
  sel.innerHTML = '<option value="">전체 주차</option>' +
    weeks.map(w=>`<option value="${w}" ${cur===w?'selected':''}>${w} 주</option>`).join('');
}

function renderList() {
  const fDept = document.getElementById('filterDept')?.value||'';
  const fCat  = document.getElementById('filterCatList')?.value||'';
  const fWeek = document.getElementById('filterWeek')?.value||'';

  let entries = _allEntries;
  if (fDept) entries = entries.filter(e=>e.dept===fDept);
  if (fCat)  entries = entries.filter(e=>e.category===fCat);
  if (fWeek) entries = entries.filter(e=>e.week_start===fWeek);

  const container = document.getElementById('entryList');
  if (!entries.length) {
    container.innerHTML = `<div class="entry-empty">조건에 맞는 항목이 없습니다.</div>`; return;
  }

  const statusCls = {
    '작성중':'status-작성중','검토중':'status-검토중','심사중':'status-심사중',
    '투자완료':'status-투자완료','협의중':'status-협의중','보류':'status-보류','종결':'status-종결'
  };
  const catCls = {
    '작성중':'tag-작성중','신규':'tag-신규','기존':'tag-기존','기존★':'tag-기존★',
    '관리자산':'tag-관리자산','입/출금':'tag-입출금','기타':'tag-기타'
  };

  container.innerHTML = entries.map(e => `
    <div class="entry-card">
      <div class="entry-card-header">
        <span class="entry-card-company">${e.company||'—'}</span>
        <div class="entry-card-actions">
          <button class="btn-edit" onclick="editEntry('${e.id}')">수정</button>
          <button class="btn-delete" onclick="deleteEntry('${e.id}')">삭제</button>
        </div>
      </div>
      <div class="entry-card-industry">${e.industry||'업종 미입력'}</div>
      <div class="entry-card-meta">
        <span>${e.dept||'—'}</span>
        <span>·</span>
        <span class="tag ${catCls[e.category]||'tag-기타'}" style="font-size:10px;padding:1px 6px">${e.category||'—'}</span>
        <span>·</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px">${e.week_start||'—'}</span>
        <span>·</span>
        <span style="color:${e.week_type==='current'?'var(--cur-lt)':'var(--prv-lt)'}">${e.week_type==='current'?'금주':'전주'}</span>
        <span>·</span>
        <span class="status-badge ${statusCls[e.status]||''}">${e.status||'—'}</span>
        <span>·</span>
        <span style="color:var(--gold);font-family:'DM Mono',monospace">${e.review_amount||'—'}</span>
      </div>
    </div>`).join('');
}

function editEntry(id) {
  const e = _allEntries.find(x=>x.id===id);
  if (!e) return;
  _currentEditId = id;
  const map = {
    f_dept:e.dept, f_category:e.category, f_worktype:e.worktype,
    f_date:e.date, f_week_start:e.week_start, f_week_type:e.week_type,
    f_company:e.company, f_industry:e.industry, f_invest_type:e.invest_type,
    f_target:e.target, f_total_size:e.total_size, f_review_amount:e.review_amount,
    f_status:e.status, f_note:e.note,
    f_pre_value:e.pre_value, f_equity_ratio:e.equity_ratio, f_coupon:e.coupon,
    f_irr:e.irr, f_moic:e.moic, f_exit_method:e.exit_method,
    f_exit_year:e.exit_year, f_put_call:e.put_call, f_tag_drag:e.tag_drag
  };
  Object.entries(map).forEach(([k,v])=>setVal(k,v));
  updateWeekTypeBadge();
  document.getElementById('btnSubmit').textContent = '수정 저장';
  window.scrollTo({top:0,behavior:'smooth'});
}

async function deleteEntry(id) {
  if (!confirm('이 항목을 삭제하시겠습니까?')) return;
  if (!window.DB) return;
  try {
    await DB.remove(id);
    await loadList();
  } catch(e) { alert('삭제 실패: ' + e.message); }
}

// ── 초기화 ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setVal('f_date', new Date().toISOString().split('T')[0]);
  setVal('f_week_start', getMondayStr(new Date()));
  setVal('f_status', '검토중');
  updateWeekTypeBadge();

  const tryLoad = () => { if (window.DB) loadList(); else setTimeout(tryLoad, 200); };
  tryLoad();
});

window.addEventListener('db-ready', loadList);
