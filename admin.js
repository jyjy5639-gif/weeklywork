// ============================================================
//  admin.js — 관리자 설정 페이지 로직
// ============================================================

const DEFAULTS = {
  depts:      ['투자1부', '투자2부', '투자3부', '관리부'],
  categories: ['작성중', '신규', '기존', '기존★', '관리자산', '입/출금', '기타'],
  worktypes:  ['투', '자', '업', '무', '부'],
  statuses:   ['작성중', '검토중', '심사중', '투자완료', '협의중', '보류', '종결', '-']
};

// 현재 편집 중인 옵션 상태
let _opts = {
  depts:      [...DEFAULTS.depts],
  categories: [...DEFAULTS.categories],
  worktypes:  [...DEFAULTS.worktypes],
  statuses:   [...DEFAULTS.statuses]
};

// ── 태그 렌더링 ─────────────────────────────────────────────
function renderTags(key) {
  const container = document.getElementById(`tags-${key}`);
  if (!container) return;
  container.innerHTML = _opts[key].map((v, i) => `
    <span class="tag-item">
      ${v}
      <button class="del-btn" onclick="removeTag('${key}',${i})" title="삭제">✕</button>
    </span>`).join('');
}

function renderAll() {
  Object.keys(_opts).forEach(renderTags);
}

// ── 태그 추가 ────────────────────────────────────────────────
function addTag(key) {
  const input = document.getElementById(`add-${key}`);
  const val = input.value.trim();
  if (!val) return;
  if (_opts[key].includes(val)) {
    input.value = '';
    input.focus();
    return;
  }
  _opts[key].push(val);
  input.value = '';
  input.focus();
  renderTags(key);
}

function handleAddKey(e, key) {
  if (e.key === 'Enter') { e.preventDefault(); addTag(key); }
}

// ── 태그 삭제 ────────────────────────────────────────────────
function removeTag(key, index) {
  _opts[key].splice(index, 1);
  renderTags(key);
}

// ── 전체 저장 ────────────────────────────────────────────────
async function saveAll() {
  if (!window.DB) { showSaveMsg('Firebase가 연결되지 않았습니다.', 'error'); return; }
  const btn = document.getElementById('btnSaveAll');
  btn.disabled = true; btn.textContent = '저장 중...';
  try {
    await DB.saveSettings({ ..._opts });
    showSaveMsg('✓ 저장되었습니다. 입력 페이지에 즉시 반영됩니다.', 'success');
  } catch(e) {
    showSaveMsg('저장 실패: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '전체 저장';
  }
}

function showSaveMsg(msg, cls) {
  const el = document.getElementById('saveMsg');
  el.textContent = msg; el.className = 'save-msg ' + cls;
  setTimeout(() => { el.textContent = ''; el.className = 'save-msg'; }, 5000);
}

// ── 초기화 ──────────────────────────────────────────────────
async function loadSettings() {
  if (!window.DB) return;
  try {
    const s = await DB.getSettings();
    if (s) _opts = { ...DEFAULTS, ...s };
  } catch(e) { console.warn('설정 로드 실패, 기본값 사용:', e); }
  renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll(); // 기본값으로 먼저 렌더
  const tryLoad = () => { if (window.DB) loadSettings(); else setTimeout(tryLoad, 200); };
  tryLoad();
});

window.addEventListener('db-ready', loadSettings);
