'use strict';
// 화면 구조는 배달의민족 앱을 따른다 (분석: ../배민_UI분석.md). 내용·색·그림은 교통대 가이드 것으로 바꿨다.

/* ---------- 기본 값 ---------- */
const CATS = [
  { name: '맛집', emoji: '🍴', icon: 'assets/cat-food.png' },
  { name: '숨은장소', emoji: '🌳', icon: 'assets/cat-hidden.png' },
  { name: '생활꿀팁', emoji: '💡', icon: 'assets/cat-tip.png' },
  { name: '자유', emoji: '💬', icon: 'assets/cat-free.png' },
];
const CAT = Object.fromEntries(CATS.map(c => [c.name, c]));

// 분류 칸(배민의 치킨·분식…)에 해당하는 주제. 장소 이름·추천 이유·메뉴 글자로 거른다
const THEMES = {
  맛집: [
    ['카페', '☕', '카페|커피'], ['국밥·찌개', '🍲', '국밥|찌개|해장|탕'], ['고기', '🥩', '고기|삼겹|갈비|숯불'],
    ['분식', '🍢', '분식|떡볶이|김밥'], ['덮밥·일식', '🍱', '덮밥|돈까스|일식|초밥|라멘'], ['빵·디저트', '🍰', '빵|베이커리|디저트|케이크'],
    ['중식', '🥟', '짜장|짬뽕|중식|중국|마라'], ['양식', '🍕', '버거|피자|파스타|양식'], ['치킨', '🍗', '치킨|통닭'],
    ['학식', '🍚', '학식|학생식당|교직원식당'],
  ],
  생활꿀팁: [
    ['프린트', '🖨️', '프린트|프린터|복사|출력'], ['버스', '🚌', '버스'], ['생활관', '🏠', '기숙사|생활관'],
    ['공부', '📚', '열람실|도서관|공부'], ['증명서', '📄', '증명서|발급'], ['세탁', '🧺', '세탁|빨래'],
    ['택배', '📦', '택배|우체국'], ['은행', '💳', '은행|atm'], ['병원·약국', '💊', '병원|약국|보건'], ['편의점', '🏪', '편의점'],
  ],
  숨은장소: [
    ['물가', '🌊', '호수|저수지|강|천'], ['공부', '📚', '공부|열람'], ['산책', '🚶', '산책|둘레길'], ['쉼터', '🪑', '벤치|쉼터|휴식'],
    ['카페', '☕', '카페|커피'], ['노을', '🌅', '노을|야경|일몰'], ['꽃', '🌸', '벚꽃|꽃'], ['사진', '📸', '사진|포토'],
  ],
  자유: [['버스', '🚌', '버스'], ['술', '🍺', '술|호프|포차'], ['카페', '☕', '카페|커피'], ['산책', '🚶', '산책|둘레길']],
};
// 도장깨기: 에브리타임에서 자주 묻는 것(이동·프린트·열람실·「뭐 먹지」)을 직접 해 보는 퀘스트로. 각 퀘스트는 실제 장소로 이어진다
const QUESTS = [
  { id: 'meal', emoji: '🍚', title: '학식 먹어 보기', desc: '학생식당이나 교직원식당에서 한 끼', link: '#/search?q=학생식당' },
  { id: 'print', emoji: '🖨️', title: '무인프린터로 출력하기', desc: '과제 출력은 어디서? 결제는 어떻게?', link: '#/search?q=무인프린터' },
  { id: 'bus999', emoji: '🚌', title: '999번 버스 타 보기', desc: '학교와 시내를 잇는 버스', link: '#/search?q=999번' },
  { id: 'station', emoji: '🚉', title: '충주역·터미널 다녀오기', desc: '무료 통학버스와 시내버스 타는 법', link: '#/search?q=충주역' },
  { id: 'library', emoji: '📚', title: '중앙도서관 열람실 가 보기', desc: '시험 기간 자리 잡기', link: '#/search?q=열람실' },
  { id: 'post', emoji: '📦', title: '교내 우체국에서 택배 보내기', desc: '기숙사 택배는 어디로?', link: '#/search?q=우체국' },
  { id: 'cert', emoji: '📄', title: '자동증명발급기 써 보기', desc: '증명서는 창구까지 안 가도 돼요', link: '#/search?q=증명' },
  { id: 'cafe', emoji: '☕', title: '교내 카페에서 공부하기', desc: '카페플로르 세 곳 중 한 곳', link: '#/search?q=카페플로르' },
  { id: 'walk', emoji: '🚶', title: '교내 둘레길 걷기', desc: '공강 시간 산책', link: '#/search?q=둘레길' },
  { id: 'sunset', emoji: '🌅', title: '노을 명소에서 노을 보기', desc: '선배들이 꼽은 노을 자리', link: '#/search?q=노을' },
  { id: 'jjamppong', emoji: '🥟', title: '대소원 중국집 도장 찍기', desc: '짬뽕 맛집 하나는 알아 두기', link: '#/search?q=짬뽕' },
  { id: 'top1', emoji: '👑', title: '추천 1위 가게 가 보기', desc: '교통대생이 가장 많이 추천한 곳', link: 'top1' },
];
const LEVELS = [[0, '새내기'], [3, '캠퍼스 적응 중'], [6, '교통대 생활러'], [9, '교통대 고수'], [12, '교통대 마스터']];
const MOVE_RE = '통학버스|시내버스|버스|택시|ktx|터미널|충주역|정류소';
const SORTS = [['rec', '추천 많은 순'], ['near', '가까운 순'], ['price', '가격 낮은 순'], ['name', '가나다순']];
const AREAS = ['교내', '대소원', '충주 시내'];
const UNKNOWN = '확인 안 됨';
const PAGE = 20;
const PLACEHOLDERS = ['학식? 프린트?', '카페? 국밥?', '버스? 택배?', '산책? 노을?'];
// 네이버 지도 Client ID. 웹페이지에 공개되는 값이고, 등록한 주소(localhost:5178·kth4778.github.io)에서만 동작한다
const NAVER_MAP_ID = 'g0yc562ytb';
const CAMPUS = [36.969692, 127.872252];

const state = { places: [], byId: new Map(), scroll: new Map(), homeTab: '맛집', pendingLoc: null };
const view = document.getElementById('view');

/* ---------- 작은 도구 ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = n => n.toLocaleString('ko-KR') + '원';
const priceText = p => p.minPrice == null ? null : (p.maxPrice && p.maxPrice !== p.minPrice ? `${won(p.minPrice)}~` : won(p.minPrice));
const addrText = p => ({ [UNKNOWN]: '위치 확인 안 됨', '해당 없음': '장소가 따로 없는 꿀팁' }[p.address] || p.address);
const squash = s => String(s ?? '').toLowerCase().replace(/\s+/g, '');
const hay = p => squash([p.name, p.address, ...p.reasons, ...p.menus.map(m => m.name)].join(' '));
const themeHit = (p, re) => new RegExp(re).test(hay(p));
const qs = (k, def = '') => new URLSearchParams(location.hash.split('?')[1] || '').get(k) ?? def;

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1600);
}
// 그림 파일이 없으면 대체 내용으로 바꾼다
window.fallback = (img, html) => { img.outerHTML = html; };

/* ---------- 이 폰에만 남는 기록 (찜 · 최근 본 곳 · 최근 검색어) ---------- */
function store(key, max = 50) {
  return {
    read() { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
    write(list) { try { localStorage.setItem(key, JSON.stringify(list.slice(0, max))); } catch { /* 사생활 보호 모드: 화면만 동작 */ } },
    has(v) { return this.read().includes(v); },
    push(v) { this.write([v, ...this.read().filter(x => x !== v)]); },
    remove(v) { this.write(this.read().filter(x => x !== v)); },
    clear() { this.write([]); },
  };
}
const saved = store('knut-guide:saved', 500);
const recent = store('knut-guide:recent', 30);
const recentQ = store('knut-guide:recent-q', 10);
const stamps = store('knut-guide:stamps', 20);
const levelOf = n => [...LEVELS].reverse().find(([min]) => n >= min)[1];
function toggleSaved(id) {
  const on = !saved.has(id);
  on ? saved.push(id) : saved.remove(id);
  const n = saved.read().length;
  [view, ...[...pages.values()].map(p => p.node)].forEach(root => root.querySelectorAll('a[href="#/saved"].badge-wrap').forEach(a => {
    a.querySelector('.badge')?.remove();
    if (n) a.insertAdjacentHTML('beforeend', `<span class="badge">${n}</span>`);
  }));
  toast(on ? '찜했어요' : '찜을 취소했어요');
  return on;
}

/* ---------- 거리 기준 위치 ---------- */
// 기본은 학교(대학로 50). 위치는 메모리에만 두고 저장하거나 서버로 보내지 않는다 (새로고침하면 다시 학교 기준).
const ORIGIN_CAMPUS = { latlng: CAMPUS, label: '교통대', gps: false };
state.origin = ORIGIN_CAMPUS;
function distanceM([lat1, lng1], [lat2, lng2]) {
  const r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lng2 - lng1) * r / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}
const distOf = p => p.latlng ? distanceM(state.origin.latlng, p.latlng) : null;
const distText = m => m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)}m` : `${(m / 1000).toFixed(1)}km`;

// 실패 이유를 배민처럼 셋으로 나눠 안내한다
const LOC_ERR = {
  1: '위치 권한이 꺼져 있어요. 브라우저 설정에서 이 사이트의 위치 권한을 허용해 주세요.',
  2: '현재 위치를 찾을 수 없어요. 휴대폰 설정에서 위치 서비스를 켜 주세요.',
  3: '위치를 찾는 데 시간이 너무 걸려요. 잠시 뒤 다시 눌러 주세요.',
  unsupported: '이 브라우저에서는 현재 위치를 쓸 수 없어요.',
};
// 권한은 「현재 위치로 찾기」를 눌렀을 때만 묻는다
function locate() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator) || !window.isSecureContext) return reject('unsupported');
    navigator.geolocation.getCurrentPosition(
      pos => resolve([pos.coords.latitude, pos.coords.longitude]),
      err => reject(err.code),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/* ---------- 아이콘 (24px, 기본은 선 · 선택은 채움 — 배민 ic_*_line / ic_*_fill 짝) ---------- */
const svg = (d, extra = '') => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  heart: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  share: svg('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  target: svg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  school: svg('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'data-check'),
  down: svg('<path d="M6 9l6 6 6-6"/>', 'data-sm'),
  right: svg('<path d="M9 6l6 6-6 6"/>', 'data-sm'),
  sort: svg('<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/>', 'data-sm'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>', 'data-sm'),
  thumb: svg('<path d="M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7"/>', 'data-sm'),
  notice: svg('<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M17 9a4 4 0 0 1 0 6"/>'),
};

/* ---------- 공통 조각 ---------- */
function logo(p, size = 'sm') {
  const c = CAT[p.category];
  return `<span class="logo logo-${size}" aria-hidden="true"><img src="${c.icon}" alt="" loading="lazy" onerror="fallback(this, '${c.emoji}')"></span>`;
}
function photoOrTile(p) {
  // 카드에는 작은 사진(폭 480px)을 쓴다. 큰 사진은 상세 화면에서만
  if (p.photos.length) return `<img src="${(p.thumbs || p.photos)[0]}" alt="" loading="lazy" decoding="async">`;
  const c = CAT[p.category];
  return `<span class="tile-art" aria-hidden="true"><img src="${c.icon}" alt="" loading="lazy" onerror="fallback(this, '${c.emoji}')"></span>`;
}
// 배민의 「약 41분 · 배달팁 0원 · 📍150m」 줄 → 우리는 거리 · 지역 · 가격
function metaRow(p) {
  const bits = [];
  if (p.latlng) bits.push(`<span>${ICON.pin}${distText(distOf(p))}</span>`);
  bits.push(`<span>${p.area}</span>`);
  const price = priceText(p);
  if (price) bits.push(`<span class="strong">${price}</span>`);
  return `<div class="meta">${bits.join('')}</div>`;
}
const recBadge = p => `<span class="rec">${ICON.thumb}<b>${p.rec}</b><i>명 추천</i></span>`;
const tags = p => `<div class="tags"><span class="tag">${p.category}</span>${p.photos.length ? `<span class="tag">사진 ${p.photos.length}</span>` : ''}${p.hours.length ? '<span class="tag">영업시간</span>' : ''}</div>`;

// 홈 가로 카드 (배민: 사진 167dp + 띠 + 이름 ★ + 정보 줄 + 태그)
function hCard(p, opt = {}) {
  const strip = opt.strip ?? (priceText(p) ? `최저 ${priceText(p)}` : '');
  const review = opt.review ? `<div class="review-box"><b>교통대생 추천</b><p>${esc(opt.review)}</p></div>` : '';
  return `<a class="hcard" href="#/p/${p.id}">
    <div class="hcard-img">${photoOrTile(p)}${opt.rank ? `<span class="rank-num">${opt.rank}</span>` : ''}</div>
    ${strip ? `<div class="strip">${esc(strip)}</div>` : ''}
    <div class="hcard-body">
      <div class="title-row"><b class="name">${esc(p.name)}</b>${recBadge(p)}</div>
      ${metaRow(p)}
      ${review}
    </div>
  </a>`;
}
function section(title, sub, more, cards) {
  if (!cards) return '';
  return `<section class="sec">
    <div class="sec-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${more ? `<a href="${more}" class="more-link">전체보기 ${ICON.right}</a>` : ''}</div>
    <div class="hscroll">${cards}</div>
  </section>`;
}

// 목록 카드 (배민 분류 목록: 메뉴 사진 띠 → 로고 · 이름 ★ → 정보 줄 → 태그)
function listCard(p) {
  const shots = (p.thumbs || p.photos).slice(0, 3);
  const menus = p.menus.filter(m => m.min != null);
  const strip = shots.length ? `<div class="shot-strip">${shots.map((src, i) => `<div class="shot"><img src="${src}" alt="" loading="lazy" decoding="async">${menus[i] ? `<span><i>${esc(menus[i].name)}</i><b>${won(menus[i].min)}</b></span>` : ''}</div>`).join('')}</div>` : '';
  return `<a class="lcard" href="#/p/${p.id}">
    ${strip}
    <div class="lcard-row">${logo(p)}<div class="lcard-text">
      <div class="title-row"><b class="name">${esc(p.name)}</b>${recBadge(p)}</div>
      ${metaRow(p)}${tags(p)}
    </div></div>
  </a>`;
}
// 줄 목록 (배민 찜·검색 결과: 왼쪽 사진 + 오른쪽 글, 검색어는 파란색 강조)
function rowItem(p, hl = '') {
  const words = hl.split(/\s+/).filter(Boolean);
  let snippet = '';
  if (words.length) {
    const src = [...p.reasons, ...p.menus.map(m => m.name)].find(t => words.some(w => squash(t).includes(squash(w))));
    if (src) snippet = `<p class="snippet">${highlight(src, words)}</p>`;
  }
  return `<a class="row" href="#/p/${p.id}">
    <div class="row-img">${photoOrTile(p)}</div>
    <div class="row-text">
      <b class="name">${words.length ? highlight(p.name, words) : esc(p.name)}</b>
      ${snippet || `<p class="sub">${esc(addrText(p))}</p>`}
      <div class="title-row">${recBadge(p)}</div>
      ${metaRow(p)}
    </div>
  </a>`;
}
function highlight(text, words) {
  let out = esc(text);
  words.forEach(w => {
    const re = new RegExp(esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, m => `<mark>${m}</mark>`);
  });
  return out;
}
function pagedList(list, render) {
  const id = 'pl' + Math.random().toString(36).slice(2, 7);
  // 첫 묶음은 화면과 함께 바로 그린다 (따로 그리면 빈 목록이 한 번 보였다가 채워져 깜빡인다)
  setTimeout(() => {
    const box = document.getElementById(id);
    if (!box) return;
    let shown = PAGE;
    const more = box.nextElementSibling;
    more.onclick = () => {
      box.insertAdjacentHTML('beforeend', list.slice(shown, shown + PAGE).map(render).join(''));
      shown += PAGE;
      more.hidden = shown >= list.length;
      more.textContent = `더 보기 (${list.length - shown}곳)`;
    };
  });
  return `<div class="plist" id="${id}">${list.slice(0, PAGE).map(render).join('')}</div>
    <button class="more-btn" ${list.length > PAGE ? '' : 'hidden'}>더 보기 (${list.length - PAGE}곳)</button>`;
}
window.goBack = () => (history.length > 1 ? history.back() : (location.hash = '#/'));
const backBtn = `<button class="icon-btn" onclick="goBack()" aria-label="뒤로">${ICON.back}</button>`;
const heartLink = () => `<a class="icon-btn badge-wrap" href="#/saved" aria-label="찜">${ICON.heart}${saved.read().length ? `<span class="badge">${saved.read().length}</span>` : ''}</a>`;
function header(title) {
  return `<header class="head">${backBtn}<h1>${title}</h1><div class="head-actions">
    <a class="icon-btn" href="#/search" aria-label="검색">${ICON.search}</a>${heartLink()}</div></header>`;
}

/* ---------- 아래에서 올라오는 창 (정렬 · 지역) ---------- */
function openSheet(title, rows, onPick) {
  closeSheet();
  const layer = document.createElement('div');
  layer.className = 'sheet-layer';
  layer.innerHTML = `<div class="sheet-backdrop"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
    <h2>${title}</h2>
    ${rows.map(([v, label, on]) => `<button class="sheet-row" data-v="${esc(v)}" aria-pressed="${!!on}">${label}${on ? ICON.check : ''}</button>`).join('')}
    <button class="sheet-close">닫기</button></section>`;
  document.body.append(layer);
  layer.querySelector('.sheet-backdrop').onclick = closeSheet;
  layer.querySelector('.sheet-close').onclick = closeSheet;
  layer.querySelectorAll('.sheet-row').forEach(b => b.onclick = () => { closeSheet(); onPick(b.dataset.v); });
}
function closeSheet() { document.querySelector('.sheet-layer')?.remove(); }

/* =========================================================
   홈 (배민 홈: 주소 줄 → 검색창 → 배너 → 서비스 탭 + 분류 칸 → 원형 줄 → 가로 카드 섹션)
   ========================================================= */
function buildings() {
  const count = new Map();
  state.places.forEach(p => {
    const m = /대학로 50\s+([가-힣A-Za-z]+(?:관|센터|본부|홀|장|원))/.exec(p.address || '');
    if (m) count.set(m[1], (count.get(m[1]) || 0) + 1);
  });
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
}
function themeCounts(cat) {
  const ps = state.places.filter(p => p.category === cat);
  return THEMES[cat].map(([label, emoji, re]) => ({ label, emoji, re, n: ps.filter(p => themeHit(p, re)).length })).filter(t => t.n);
}

function home() {
  const tab = state.homeTab;
  const top = state.places.slice(0, 10);
  const withReason = state.places.filter(p => p.reasons.some(r => r.length >= 15)).slice(0, 10);
  const near = state.places.filter(p => p.latlng && p.category !== '생활꿀팁').sort((a, b) => distOf(a) - distOf(b)).slice(0, 10);
  const cheap = state.places.filter(p => p.minPrice != null && p.minPrice <= 10000 && p.category === '맛집').sort((a, b) => a.minPrice - b.minPrice).slice(0, 10);
  const fresh = state.places.filter(p => p.checked).sort((a, b) => b.checked.localeCompare(a.checked)).slice(0, 10);
  const seen = recent.read().map(id => state.byId.get(id)).filter(Boolean).slice(0, 10);
  const themes = themeCounts(tab);
  // 에브리타임에서 가장 많이 묻는 것: 충주역·터미널 오가는 법 (483건). 우리 생활꿀팁에 답이 있다
  const move = state.places.filter(p => p.category === '생활꿀팁' && new RegExp(MOVE_RE).test(squash(p.name))).slice(0, 10);

  return `
  <div class="home-head" id="homehead"><div class="topbar">
    <button class="loc-btn" onclick="location.hash='#/location'" aria-label="거리 기준 위치: ${esc(state.origin.label)}. 바꾸기">
      <b>${esc(state.origin.label)}</b> 기준 ${ICON.down}</button>
    <div class="head-actions">
      <a class="icon-btn badge-wrap" href="#/news" aria-label="최근 확인된 곳">${ICON.bell}<span class="dot"></span></a>
      ${heartLink()}
    </div>
  </div>
  <div class="search-wrap"><a class="searchbar" href="#/search"><span id="ph">${PLACEHOLDERS[0]}</span>${ICON.search}</a></div></div>

  <a class="banner" href="#/pick">
    <div><b>오늘 뭐 먹지? 🎲</b><p>교통대생 추천 맛집 중에서 골라 드려요 ${ICON.right}</p></div>
    <img src="assets/hero-campus.jpg" alt="" onerror="this.remove()">
  </a>

  <div class="svc-tabs" role="tablist">
    ${CATS.map(c => `<button role="tab" aria-selected="${c.name === tab}" data-home-tab="${c.name}">${c.name}</button>`).join('')}
  </div>
  <div id="homeGrid">${homeGrid(tab, themes)}</div>

  <div class="sep"></div>
  <div class="circles" aria-label="교내 건물">
    ${buildings().map(([b, n]) => `<a href="#/search?q=${encodeURIComponent(b)}"><span class="circle">🏫<em>${n}곳</em></span><b>${esc(b)}</b></a>`).join('')}
  </div>

  ${section('교통대생 추천 랭킹', '추천을 가장 많이 받은 곳', '#/c/맛집', top.map((p, i) => hCard(p, { rank: i + 1 })).join(''))}
  ${section('충주역·터미널 오가는 법', '에브리타임에서 가장 많이 묻는 질문이에요', '#/search?q=버스', move.map(p => hCard(p, { strip: '이동 꿀팁' })).join(''))}
  ${section('칭찬이 자세한 곳', '학생들이 남긴 추천 이유', null, withReason.map(p => hCard(p, { review: [...p.reasons].sort((a, b) => b.length - a.length)[0] })).join(''))}
  ${section(`${esc(state.origin.label)}에서 가까운 곳`, null, '#/c/맛집?sort=near', near.map(p => hCard(p)).join(''))}
  ${section('만 원 이하로 한 끼', '가격이 확인된 맛집', '#/c/맛집?sort=price&price=1', cheap.map(p => hCard(p)).join(''))}
  ${seen.length ? section('최근 본 곳', null, '#/recent', seen.map(p => hCard(p)).join('')) : ''}
  ${section('최근 확인된 곳', '학생들이 가장 최근에 다녀와 확인한 곳', '#/news', fresh.map(p => hCard(p, { strip: `${p.checked} 확인` })).join(''))}
  <p class="foot-note">영업시간·가격은 바뀔 수 있어요. 방문 전에 한 번 더 확인하세요.</p>`;
}
function homeGrid(tab, themes = themeCounts(tab)) {
  return `<nav class="grid" aria-label="${tab} 주제">
    ${themes.map(t => `<a href="#/c/${tab}?theme=${encodeURIComponent(t.label)}"><span class="tile">${t.emoji}</span><b>${t.label}</b></a>`).join('')}
  </nav>
  <a class="more-row" href="#/c/${tab}">${tab}에서 더보기 ${ICON.right}</a>`;
}
function bindHome() {
  // 분류 탭은 홈 전체를 다시 그리지 않고 칸만 바꾼다 (깜빡임·스크롤 튐 없음)
  document.querySelectorAll('[data-home-tab]').forEach(b => b.onclick = () => {
    state.homeTab = b.dataset.homeTab;
    document.querySelectorAll('[data-home-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    document.getElementById('homeGrid').innerHTML = homeGrid(state.homeTab);
  });
  // 검색창 안내 문구를 돌려 가며 보여준다 (배민 「족발? 순대?」)
  let i = 0;
  clearInterval(bindHome.timer);
  bindHome.timer = setInterval(() => {
    const ph = document.getElementById('ph');
    if (!ph) return clearInterval(bindHome.timer);
    ph.textContent = PLACEHOLDERS[++i % PLACEHOLDERS.length];
  }, 3000);
}

/* =========================================================
   분류 목록 (배민: 분류 글자 탭 → 하위 분류 원형 칩 → 필터 칩 → 가게 카드)
   ========================================================= */
function sortList(list, sort) {
  const l = [...list];
  if (sort === 'near') return l.sort((a, b) => (distOf(a) ?? Infinity) - (distOf(b) ?? Infinity));
  if (sort === 'price') return l.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
  if (sort === 'name') return l.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return l.sort((a, b) => b.rec - a.rec);
}
function category(cat) {
  if (!CAT[cat]) return notFound();
  const theme = qs('theme'), sort = qs('sort', 'rec'), area = qs('area'), onlyPhoto = qs('photo') === '1', onlyPrice = qs('price') === '1';
  const themes = themeCounts(cat);
  const t = themes.find(x => x.label === theme);
  let list = state.places.filter(p => p.category === cat);
  if (t) list = list.filter(p => themeHit(p, t.re));
  if (area) list = list.filter(p => p.area === area);
  if (onlyPhoto) list = list.filter(p => p.photos.length);
  if (onlyPrice) list = list.filter(p => p.minPrice != null);
  list = sortList(list, sort);

  const link = patch => catLink(cat, patch);
  return `
  ${header(cat)}
  <div class="sticky-tabs"><div class="text-tabs">
    <a href="#/">홈</a>${CATS.map(c => `<a href="#/c/${c.name}" aria-current="${c.name === cat ? 'page' : 'false'}">${c.name}</a>`).join('')}
  </div></div>
  <div class="sub-chips">
    <a href="${link({ theme: '' })}" aria-pressed="${!t}"><span class="tile">${CAT[cat].emoji}</span><b>전체</b></a>
    ${themes.map(x => `<a href="${link({ theme: x.label })}" aria-pressed="${x === t}"><span class="tile">${x.emoji}</span><b>${x.label}</b></a>`).join('')}
  </div>
  <div class="filter-bar">
    <button class="fchip on" id="sortChip">${ICON.sort}${SORTS.find(s => s[0] === sort)[1]}</button>
    <a class="fchip ${onlyPhoto ? 'on' : ''}" href="${link({ photo: onlyPhoto ? '' : '1' })}">사진 있음</a>
    <a class="fchip ${onlyPrice ? 'on' : ''}" href="${link({ price: onlyPrice ? '' : '1' })}">가격 정보</a>
    <button class="fchip ${area ? 'on' : ''}" id="areaChip">${area || '지역'} ${ICON.down}</button>
  </div>
  <div class="list-head"><span>${list.length}곳</span>${sort === 'near' ? `<a href="#/location">${ICON.pin}${esc(state.origin.label)} 기준 ${ICON.right}</a>` : ''}</div>
  ${list.length ? pagedList(list, listCard) : `<div class="empty"><div class="big">🔍</div>조건에 맞는 곳이 없어요.</div>`}`;
}
// 지금 주소의 조건에서 일부만 바꾼 분류 목록 주소
function catLink(cat, patch) {
  const cur = { theme: qs('theme'), sort: qs('sort'), area: qs('area'), photo: qs('photo'), price: qs('price'), ...patch };
  return '#/c/' + cat + '?' + new URLSearchParams(Object.entries(cur).filter(([, v]) => v && v !== 'rec')).toString();
}
function bindCategory() {
  const cat = decodeURIComponent(location.hash.split('?')[0].split('/')[2] || '');
  const sort = qs('sort', 'rec'), area = qs('area');
  document.getElementById('sortChip').onclick = () =>
    openSheet('정렬', SORTS.map(([v, l]) => [v, l, v === sort]), v => location.replace(catLink(cat, { sort: v })));
  document.getElementById('areaChip').onclick = () =>
    openSheet('지역', [['', '전체 지역', !area], ...AREAS.map(a => [a, a, a === area])], v => location.replace(catLink(cat, { area: v })));
}

/* =========================================================
   장소 상세 (배민 가게 상세: 큰 사진 → 이름 ♡ → 정보 상자 → 리뷰 카드 → 공지 → 메뉴 칩·메뉴)
   ========================================================= */
function hourText(h) {
  const day = h.day === UNKNOWN ? '' : h.day + ' ';
  if (h.type === '휴무') return esc(day + '휴무');
  if (h.start === UNKNOWN || h.end === UNKNOWN) return esc(h.raw);
  return esc(`${day}${h.start}~${h.end}${h.type !== '영업' ? ` (${h.type})` : ''}`);
}
function detail(id) {
  const p = state.byId.get(id);
  if (!p) return notFound();
  recent.push(p.id);
  const c = CAT[p.category];
  const on = saved.has(p.id);
  const gallery = p.photos.length
    ? p.photos.map((src, i) => `<img src="${src}" alt="${esc(p.name)} 사진 ${i + 1}" ${i ? 'loading="lazy"' : ''}>`).join('')
    : `<span class="tile-art"><img src="${c.icon}" alt="" onerror="fallback(this, '${c.emoji}')"></span>`;
  const priced = p.menus.filter(m => m.min != null), unpriced = p.menus.filter(m => m.min == null);
  const unk = `<span class="unknown">${UNKNOWN}</span>`;
  const menuRows = list => list.map(m => `<div class="menu-row"><b>${esc(m.name)}</b>
      <p>${m.min == null ? '가격 확인 안 됨' : (m.max && m.max !== m.min ? `${won(m.min)} ~ ${won(m.max)}` : won(m.min))}</p></div>`).join('');

  return `
  <div class="d-bar" id="dbar">
    <button class="icon-btn" onclick="goBack()" aria-label="뒤로">${ICON.back}</button>
    <b class="d-bar-title">${esc(p.name)}</b>
    <div class="head-actions">
      <button class="icon-btn" id="shareBtn" aria-label="공유">${ICON.share}</button>
      <a class="icon-btn" href="#/search" aria-label="검색">${ICON.search}</a>
    </div>
  </div>
  <div class="d-hero" id="dhero"><div class="d-gallery" id="dgal">${gallery}</div>
    ${p.photos.length > 1 ? `<div class="d-dots" id="ddots">${p.photos.map((_, i) => `<i aria-current="${i === 0}"></i>`).join('')}</div>` : ''}
    ${logo(p, 'lg')}
  </div>
  <div class="d-title">
    <h1>${esc(p.name)}</h1>
    <button class="heart ${on ? 'on' : ''}" id="saveBtn" aria-pressed="${on}" aria-label="찜">${ICON.heart}</button>
  </div>
  <div class="d-sub">
    <a href="#reasons" class="rec-link">${ICON.thumb}<b>${p.rec}명 추천</b>${p.reasons.length ? `<span>(이유 ${p.reasons.length})</span>` : ''}${ICON.right}</a>
    <span class="chip-sm">${p.category} · ${p.area}</span>
  </div>

  <div class="info-box">
    <div class="seg" role="tablist">
      <button role="tab" aria-selected="true" data-seg="info">정보</button>
      <button role="tab" aria-selected="false" data-seg="where">위치${p.latlng ? ` <small>${distText(distOf(p))}</small>` : ''}</button>
    </div>
    <dl class="kv" data-pane="info">
      <dt>가격</dt><dd>${priceText(p) || unk}</dd>
      <dt>운영시간</dt><dd>${p.hours.length ? p.hours.map(hourText).join('<br>') : unk}</dd>
      <dt>확인한 날</dt><dd>${p.checked || unk}</dd>
    </dl>
    <dl class="kv" data-pane="where" hidden>
      <dt>주소</dt><dd>${esc(addrText(p))}</dd>
      <dt>거리</dt><dd>${p.latlng ? `${esc(state.origin.label)}에서 ${distText(distOf(p))}` : unk}</dd>
      <dt>지역</dt><dd>${p.area}</dd>
    </dl>
    <div class="info-actions" data-pane="where" hidden>
      ${p.latlng ? `<a class="btn-line" href="#/map?focus=${p.id}">${ICON.pin}지도에서 보기</a>` : ''}
      ${p.map ? `<a class="btn-line" href="${p.map}" target="_blank" rel="noopener">네이버 지도 길찾기</a>` : ''}
    </div>
  </div>

  ${p.reasons.length ? `<section class="d-sec" id="reasons"><h2>학생들이 남긴 추천 이유 <span>${p.reasons.length}</span></h2>
    <div class="hscroll">${p.reasons.map((r, i) => `<div class="rv-card">${p.thumbs?.[i] ? `<img src="${p.thumbs[i]}" alt="" loading="lazy" decoding="async">` : ''}<div><span class="rv-who">교통대생</span><p>${esc(r)}</p></div></div>`).join('')}</div></section>` : ''}

  <div class="notice">${ICON.notice}<span>영업시간·가격은 바뀔 수 있어요. 방문 전에 한 번 더 확인하세요.</span></div>

  ${p.menus.length ? `<div class="menu-chips">
      ${priced.length ? '<a href="#m-priced" data-spy="m-priced">가격 있는 메뉴</a>' : ''}
      ${unpriced.length ? `<a href="#m-unpriced" data-spy="m-unpriced">메뉴 ${unpriced.length}</a>` : ''}
    </div>
    ${priced.length ? `<section class="menu-group" id="m-priced"><h2>가격 있는 메뉴</h2><p>학생들이 적어 준 가격이에요.</p>${menuRows(priced)}</section>` : ''}
    ${unpriced.length ? `<section class="menu-group" id="m-unpriced"><h2>메뉴</h2><p>가격은 아직 확인하지 못했어요.</p>${menuRows(unpriced)}</section>` : ''}` : ''}
  <p class="foot-note">교통대생 ${p.rec}명이 직접 추천한 내용을 정리했어요.</p>`;
}
function bindDetail(id) {
  const p = state.byId.get(id);
  if (!p) return;
  // 사진을 지나 내려가면 위 막대를 흰색으로 바꾸고 이름을 보여준다 (배민 가게 상세)
  const bar = document.getElementById('dbar'), hero = document.getElementById('dhero');
  const chips = [...document.querySelectorAll('[data-spy]')];
  const onScroll = () => {
    bar.classList.toggle('solid', window.scrollY > hero.offsetHeight - 70);
    // 메뉴 칩은 스크롤 위치에 맞춰 선택이 바뀐다
    let cur = chips[0];
    chips.forEach(c => { const s = document.getElementById(c.dataset.spy); if (s && s.getBoundingClientRect().top < 170) cur = c; });
    chips.forEach(c => c.setAttribute('aria-current', String(c === cur)));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', () => window.removeEventListener('scroll', onScroll), { once: true });
  onScroll();

  const gal = document.getElementById('dgal'), dots = document.querySelectorAll('#ddots i');
  gal.addEventListener('scroll', () => {
    const i = Math.round(gal.scrollLeft / gal.clientWidth);
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
  }, { passive: true });

  document.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-seg]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('[data-pane]').forEach(x => { x.hidden = x.dataset.pane !== b.dataset.seg; });
  });
  document.querySelectorAll('a[href^="#m-"], a[href="#reasons"]').forEach(a => a.onclick = e => {
    e.preventDefault();
    const t = document.querySelector(a.getAttribute('href'));
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
  });
  const btn = document.getElementById('saveBtn');
  btn.onclick = () => {
    const on = toggleSaved(p.id);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on);
  };
  document.getElementById('shareBtn').onclick = async () => {
    try {
      if (navigator.share) await navigator.share({ title: p.name, text: `${p.name} — 교통대 충주 가이드`, url: location.href });
      else { await navigator.clipboard.writeText(location.href); toast('주소를 복사했어요'); }
    } catch { /* 공유 창을 닫은 경우 */ }
  };
}

/* =========================================================
   검색 (배민: 입력 전 최근·추천·인기 / 입력 후 연관 줄 · 개수 탭 · 강조된 결과)
   ========================================================= */
function search() {
  const q = qs('q'), cat = qs('cat', '전체');
  const words = q.trim().split(/\s+/).filter(Boolean).map(squash);
  let body;
  if (!words.length) {
    const rq = recentQ.read();
    body = `
    ${rq.length ? `<div class="s-head"><h3>최근 검색어</h3><button id="clearQ">전체 삭제</button></div>
      <div class="chip-row">${rq.map(w => `<span class="qchip"><a href="#/search?q=${encodeURIComponent(w)}">${esc(w)}</a><button data-delq="${esc(w)}" aria-label="${esc(w)} 지우기">${ICON.close}</button></span>`).join('')}</div>` : ''}
    <div class="s-head"><h3>이런 걸 많이 찾아요</h3></div>
    <div class="chip-row">${['학식', '프린트', '버스', '카페', '국밥', '산책', '택배', '노을'].map(w => `<a class="kchip" href="#/search?q=${w}">${w}</a>`).join('')}</div>
    <div class="s-head"><h3>추천 많은 곳</h3></div>
    <ol class="rank-box">${state.places.slice(0, 5).map((p, i) => `<li><a href="#/p/${p.id}"><b>${i + 1}</b><span>${esc(p.name)}</span><em>${p.rec}명</em></a></li>`).join('')}</ol>`;
  } else {
    const hits = state.places.map(p => {
      const name = squash(p.name), all = hay(p);
      if (!words.every(w => all.includes(w))) return null;
      return { p, score: words.filter(w => name.includes(w)).length * 100 + p.rec };
    }).filter(Boolean).sort((a, b) => b.score - a.score).map(x => x.p);
    const counts = Object.fromEntries(CATS.map(c => [c.name, hits.filter(p => p.category === c.name).length]));
    const list = cat === '전체' ? hits : hits.filter(p => p.category === cat);
    const related = [...new Set(Object.values(THEMES).flat().map(t => t[0]))].filter(v => !squash(v).includes(words[0])).slice(0, 8);
    const link = c => `#/search?q=${encodeURIComponent(q)}${c === '전체' ? '' : '&cat=' + encodeURIComponent(c)}`;
    body = `
    <div class="related"><span>연관</span>${related.map(r => `<a href="#/search?q=${encodeURIComponent(r)}">${r}</a>`).join('')}</div>
    <div class="text-tabs count-tabs">
      <a href="${link('전체')}" aria-current="${cat === '전체' ? 'page' : 'false'}">전체 ${hits.length}</a>
      ${CATS.filter(c => counts[c.name]).map(c => `<a href="${link(c.name)}" aria-current="${cat === c.name ? 'page' : 'false'}">${c.name} ${counts[c.name]}</a>`).join('')}
    </div>
    ${list.length ? pagedList(list, p => rowItem(p, q)) : `<div class="empty"><div class="big">🔍</div>「${esc(q)}」에 맞는 곳이 없어요.<br>다른 말로 찾아보세요.</div>`}`;
  }
  return `
  <div class="s-bar">
    ${backBtn}
    <form class="s-input" id="sform"><input id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="장소, 메뉴, 추천 이유로 찾아보세요" value="${esc(q)}" aria-label="검색어">
      <button type="button" class="s-clear" id="sclear" aria-label="지우기" ${q ? '' : 'hidden'}>${ICON.close}</button></form>
  </div>
  <div id="sbody">${body}</div>`;
}
function bindSearch() {
  const input = document.getElementById('q');
  document.getElementById('sform').onsubmit = e => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    recentQ.push(v);
    input.blur();
    location.replace('#/search?q=' + encodeURIComponent(v));
  };
  input.oninput = () => { document.getElementById('sclear').hidden = !input.value; };
  document.getElementById('sclear').onclick = () => location.replace('#/search');
  document.getElementById('clearQ')?.addEventListener('click', () => { recentQ.clear(); refresh(); });
  document.querySelectorAll('[data-delq]').forEach(b => b.onclick = () => { recentQ.remove(b.dataset.delq); refresh(); });
  if (!qs('q')) input.focus({ preventScroll: true });
}

/* =========================================================
   찜 · 최근 본 곳 · 최근 확인된 곳 · 소개
   ========================================================= */
function listPage(title, ids, empty, clearable) {
  const list = ids.map(id => state.byId.get(id)).filter(Boolean);
  return `
  <header class="head">${backBtn}<h1>${title}</h1><div class="head-actions"><a class="icon-btn" href="#/search" aria-label="검색">${ICON.search}</a></div></header>
  <div class="list-head"><span>총 ${list.length}개</span>${clearable && list.length ? '<button id="clearList">전체 삭제</button>' : ''}</div>
  ${list.length ? `<div class="plist">${list.map(p => rowItem(p)).join('')}</div>` : `<div class="empty"><div class="big">${empty[0]}</div>${empty[1]}</div>`}`;
}
const savedView = () => listPage('찜', saved.read(), ['🤍', '아직 찜한 곳이 없어요.<br>장소 화면에서 ♡를 눌러 보세요.']);
const recentView = () => listPage('최근 본 곳', recent.read(), ['👀', '아직 본 곳이 없어요.'], true);
function news() {
  const list = state.places.filter(p => p.checked).sort((a, b) => b.checked.localeCompare(a.checked) || b.rec - a.rec).slice(0, 30);
  return `${header('최근 확인된 곳')}<div class="list-head"><span>학생들이 가장 최근에 다녀와 확인한 곳</span></div><div class="plist">${list.map(p => rowItem(p)).join('')}</div>`;
}
function about() {
  const rec = state.places.reduce((sum, p) => sum + p.rec, 0);
  const per = Object.fromEntries(CATS.map(c => [c.name, state.places.filter(p => p.category === c.name).length]));
  return `
  <section class="card">
    <div class="kv-row"><span>가이드 소개</span><b>장소 ${state.places.length}곳 · 학생 추천 ${rec}건</b></div>
    <div class="cat-chips">${CATS.map(c => `<a href="#/c/${c.name}">${c.emoji} ${c.name} ${per[c.name]}</a>`).join('')}</div>
    <p class="card-note">자료: 「도메인 특화 AI 데이터 스토리텔링」 수강생 추천을 정규화한 데이터 · 지도: NAVER</p>
  </section>`;
}

/* =========================================================
   🎲 뭐 먹지? (에브리타임 「점메추」「저녁 메뉴 추천 좀」 95건)
   ========================================================= */
const PICK_FILTERS = [
  ['cheap', '만 원 이하', p => p.minPrice != null && p.minPrice <= 10000],
  ['near', '1km 이내', p => p.latlng && distOf(p) <= 1000],
  ['photo', '사진 있음', p => p.photos.length > 0],
];
function pickPool() {
  const on = (qs('f') || '').split(',').filter(Boolean);
  return state.places.filter(p => p.category === '맛집' && PICK_FILTERS.every(([k, , fn]) => !on.includes(k) || fn(p)));
}
function pickPage() {
  const on = (qs('f') || '').split(',').filter(Boolean);
  const pool = pickPool();
  const toggle = k => '#/pick?f=' + (on.includes(k) ? on.filter(x => x !== k) : [...on, k]).join(',');
  return `
  <header class="head left"><h1>오늘 뭐 먹지?</h1></header>
  <p class="page-sub">교통대생이 추천한 맛집 중에서 하나 골라 드려요.</p>
  <div class="filter-bar plain">
    ${PICK_FILTERS.map(([k, label]) => `<a class="fchip ${on.includes(k) ? 'on' : ''}" href="${toggle(k)}" onclick="location.replace(this.href);return false">${label}</a>`).join('')}
  </div>
  <div class="pick-stage">
    <div class="slot" id="slot" aria-live="polite"><span>${pool.length ? '?' : '…'}</span></div>
    <p class="pick-count">후보 <b>${pool.length}</b>곳</p>
    <button class="btn-black big" id="spin" ${pool.length ? '' : 'disabled'}>${pool.length ? '🎲 뽑기' : '조건에 맞는 곳이 없어요'}</button>
  </div>
  <div id="pickResult"></div>`;
}
function bindPick() {
  const pool = pickPool();
  const slot = document.getElementById('slot'), btn = document.getElementById('spin'), out = document.getElementById('pickResult');
  btn.onclick = () => {
    if (!pool.length) return;
    btn.disabled = true;
    out.innerHTML = '';
    const pick = pool[Math.floor(Math.random() * pool.length)];
    // 슬롯머신처럼 이름을 빠르게 돌리다가 점점 느려지며 멈춘다
    let t = 0, delay = 50;
    const tick = () => {
      slot.innerHTML = `<span>${esc(pool[Math.floor(Math.random() * pool.length)].name)}</span>`;
      t += delay; delay *= 1.12;
      if (t < 1600) setTimeout(tick, delay);
      else {
        slot.innerHTML = `<span class="hit">${esc(pick.name)}</span>`;
        const reason = [...pick.reasons].sort((a, b) => b.length - a.length)[0];
        out.innerHTML = `<div class="pick-card">${hCard(pick, { review: reason })}</div>
          <div class="pick-actions"><a class="btn-line" href="#/p/${pick.id}">자세히 보기</a><button class="btn-line" id="again">다시 뽑기</button></div>`;
        document.getElementById('again').onclick = () => btn.click();
        btn.disabled = false;
        btn.textContent = '🎲 다시 뽑기';
      }
    };
    tick();
  };
}

/* =========================================================
   🏅 도장깨기
   ========================================================= */
function questPage() {
  const done = stamps.read();
  const n = QUESTS.filter(q => done.includes(q.id)).length;
  const top1 = state.places[0];
  return `
  <header class="head left"><h1>교통대 도장깨기</h1></header>
  <div class="q-hero">
    <div><span class="q-level">${levelOf(n)}</span><b>${n} / ${QUESTS.length}</b><p>해 본 것에 도장을 찍어 보세요. 기록은 이 폰에만 남아요.</p></div>
    <div class="q-bar"><i style="width:${(n / QUESTS.length) * 100}%"></i></div>
  </div>
  <div class="q-list">
    ${QUESTS.map(q => {
      const on = done.includes(q.id);
      const link = q.link === 'top1' ? `#/p/${top1.id}` : q.link;
      return `<div class="q-item ${on ? 'done' : ''}">
        <span class="stamp" aria-hidden="true">${q.emoji}</span>
        <a class="q-text" href="${link}"><b>${q.title}</b><p>${q.link === 'top1' ? esc(top1.name) : q.desc} ${ICON.right}</p></a>
        <button class="q-btn" data-q="${q.id}" aria-pressed="${on}">${on ? '완료' : '했어요'}</button>
      </div>`;
    }).join('')}
  </div>`;
}
function bindQuest() {
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
    const id = b.dataset.q, before = levelOf(stamps.read().length);
    if (stamps.has(id)) stamps.remove(id); else stamps.push(id);
    const after = levelOf(stamps.read().length);
    const y = window.scrollY;
    refresh();
    window.scrollTo(0, y);
    if (stamps.has(id)) toast(before !== after ? `🎉 「${after}」 등급이 됐어요!` : '도장 쾅! 🏅');
  });
}

/* =========================================================
   마이 (배민 마이배민: 회색 바탕 · 흰 카드 · 찜·최근 본 곳을 여기서도)
   ========================================================= */
function myPage() {
  const sv = saved.read().map(id => state.byId.get(id)).filter(Boolean);
  const rc = recent.read().map(id => state.byId.get(id)).filter(Boolean);
  const n = stamps.read().length;
  const mini = list => list.length ? `<div class="hscroll mini">${list.slice(0, 10).map(p => `<a class="mini-card" href="#/p/${p.id}"><div class="mini-img">${photoOrTile(p)}</div><b>${esc(p.name)}</b></a>`).join('')}</div>` : '';
  return `
  <div class="gray-page">
  <header class="head left"><h1>마이</h1></header>
  <div class="profile"><img src="assets/logo.png" alt="" onerror="this.remove()"><b>${levelOf(n)}</b><p>도장 ${n}개 · 교통대 충주 가이드</p></div>
  <div class="counters">
    <a href="#/saved"><b>${sv.length}</b><span>찜</span></a>
    <a href="#/recent"><b>${rc.length}</b><span>최근 본 곳</span></a>
    <a href="#/quest"><b>${n}/${QUESTS.length}</b><span>도장</span></a>
  </div>
  <section class="card">
    <a class="kv-row" href="#/saved"><span>찜한 곳</span><b>${sv.length}곳 ${ICON.right}</b></a>
    ${mini(sv) || '<p class="card-note">장소 화면에서 ♡를 누르면 여기에 모여요.</p>'}
  </section>
  <section class="card">
    <a class="kv-row" href="#/recent"><span>최근 본 곳</span><b>${rc.length}곳 ${ICON.right}</b></a>
    ${mini(rc) || '<p class="card-note">아직 본 곳이 없어요.</p>'}
  </section>
  <section class="card">
    <a class="kv-row" href="#/location"><span>거리 기준 위치</span><b>${esc(state.origin.label)} ${ICON.right}</b></a>
    <a class="kv-row" href="#/news"><span>최근 확인된 곳</span><b>${ICON.right}</b></a>
    <p class="card-note">찜·최근 본 곳·도장·최근 검색어는 이 브라우저에만 남아요. 현재 위치는 거리 계산에만 쓰고 저장하지 않아요.</p>
  </section>
  ${about()}
  </div>`;
}

/* =========================================================
   거리 기준 위치 (배민: 주소 설정 → 현재 위치로 찾기 → 지도에서 위치 확인)
   ========================================================= */
// 위치 화면에 들어오기 직전 화면으로 돌아간다 (주소로 바로 들어왔으면 홈)
function leaveLocation() { location.replace(state.locReturn || '#/'); }
function locationPage() {
  return `
  ${header('거리 기준 설정')}
  <div class="loc-page">
    <button class="loc-find" id="locFind">${ICON.target} 현재 위치로 찾기</button>
    <p class="loc-status" id="locStatus" role="status"></p>
    <button class="loc-row" id="locCampus">${ICON.school}<span><b>교통대</b><small>충북 충주시 대소원면 대학로 50</small></span>${state.origin.gps ? '' : ICON.check}</button>
    ${state.origin.gps ? `<div class="loc-row">${ICON.pin}<span><b>현재 위치</b><small>방금 확인한 위치</small></span>${ICON.check}</div>` : ''}
    <p class="loc-note">위치는 이 폰 안에서 거리를 계산하는 데만 써요. 저장하거나 서버로 보내지 않아요.</p>
  </div>`;
}
function bindLocation() {
  const status = document.getElementById('locStatus');
  document.getElementById('locFind').onclick = async () => {
    status.textContent = '현재 위치를 찾고 있어요…';
    try {
      state.pendingLoc = await locate();
      location.hash = '#/location/confirm';
    } catch (code) { status.textContent = LOC_ERR[code] || LOC_ERR[2]; }
  };
  document.getElementById('locCampus').onclick = () => { state.origin = ORIGIN_CAMPUS; dropPages(); toast('교통대 기준으로 거리를 보여드려요'); leaveLocation(); };
}
function locationConfirm() {
  if (!state.pendingLoc) return locationPage();
  return `
  <div class="lc">
    <header class="head">${backBtn}<h1>지도에서 위치 확인</h1></header>
    <div class="lc-map-wrap"><div id="lcmap" class="lc-map"></div>
      <div class="lc-pin" aria-hidden="true"><span class="lc-tip">표시된 위치가 맞나요?</span>${ICON.pin}</div></div>
    <div class="lc-card">
      <b>현재 위치</b>
      <p id="lcDist"></p>
      <p class="lc-warn">핀이 다르면 지도를 움직여 맞춰 주세요.</p>
      <button class="btn-black" id="lcOk">이 위치 기준으로 보기</button>
    </div>
  </div>`;
}
function bindLocationConfirm() {
  if (!state.pendingLoc) return bindLocation();
  let here = state.pendingLoc;
  const dist = document.getElementById('lcDist');
  const show = () => { dist.textContent = `교통대에서 ${distText(distanceM(CAMPUS, here))}`; };
  show();
  loadNaverMaps().then(() => {
    const { maps } = window.naver;
    const map = new maps.Map('lcmap', { center: new maps.LatLng(...here), zoom: 17, scaleControl: false, mapDataControl: false });
    // 가운데 핀은 고정하고 지도를 움직여 위치를 맞춘다
    maps.Event.addListener(map, 'idle', () => { const c = map.getCenter(); here = [c.lat(), c.lng()]; show(); });
  }).catch(() => {});
  document.getElementById('lcOk').onclick = () => {
    state.origin = { latlng: here, label: '현재 위치', gps: true };
    dropPages();
    state.pendingLoc = null;
    toast('현재 위치 기준으로 거리를 보여드려요');
    leaveLocation();
  };
}

/* =========================================================
   지도 (네이버 지도 · 같은 좌표는 핀 하나 · 핀 → 아래 목록)
   ========================================================= */
function mapPage(cat = '전체') {
  return `
  <div class="map-wrap">
    <div id="map" class="map" role="application" aria-label="장소 지도"></div>
    <div class="map-top"><div class="chip-row nowrap">
      ${['전체', ...CATS.map(c => c.name)].map(c => `<button class="mchip" data-mcat="${c}" aria-pressed="${c === cat}">${c === '전체' ? c : CAT[c].emoji + ' ' + c}</button>`).join('')}
    </div></div>
    <a class="mchip map-list-btn" href="#/map?list=1">목록으로 보기</a>
    <button class="map-locate" id="mapLocate" aria-label="현재 위치로 찾기">${ICON.target}</button>
    <div class="map-sheet" id="msheet" hidden></div>
  </div>`;
}
function mapList(area = '교내') {
  const counts = Object.fromEntries(AREAS.map(a => [a, state.places.filter(p => p.area === a).length]));
  return `
  <header class="head left"><h1>지역별 보기</h1><div class="head-actions"><a class="mchip" href="#/map">지도로 보기</a></div></header>
  <div class="filter-bar">${AREAS.map(a => `<a class="fchip ${a === area ? 'on' : ''}" href="#/map?list=1&area=${encodeURIComponent(a)}" onclick="location.replace(this.href);return false">${a} ${counts[a]}</a>`).join('')}</div>
  ${pagedList(state.places.filter(p => p.area === area), p => rowItem(p))}`;
}
function loadNaverMaps() {
  if (window.naver?.maps) return Promise.resolve();
  if (!loadNaverMaps.p) {
    loadNaverMaps.p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_ID}`;
      s.onload = () => window.naver?.maps ? resolve() : reject();
      s.onerror = reject;
      document.head.append(s);
    });
    // 인증 실패(등록 안 된 주소 등)는 스크립트 로드는 성공하고 이 함수만 불린다
    window.navermap_authFailure = () => { loadNaverMaps.failed = true; state.mapEntry = null; refresh(); };
  }
  return loadNaverMaps.p;
}
function bindMap(cat, focusId) {
  const sheet = document.getElementById('msheet');
  loadNaverMaps().then(() => {
    if (loadNaverMaps.failed || !document.getElementById('map')) return;
    const { maps } = window.naver;
    let focus = state.byId.get(focusId);
    const map = new maps.Map('map', {
      center: new maps.LatLng(...(focus?.latlng || state.origin.latlng)), zoom: focus?.latlng ? 17 : 15,
      scaleControl: false, mapDataControl: false, logoControlOptions: { position: maps.Position.BOTTOM_LEFT },
    });
    let markers = [], me = null;
    const openList = (list, first) => {
      if (first) list = [first, ...list.filter(p => p !== first)];
      sheet.hidden = false;
      sheet.innerHTML = `<div class="grab" aria-hidden="true"></div>
        <div class="sheet-title"><b>${list.length > 1 ? `이 위치 ${list.length}곳` : '선택한 장소'}</b><button class="icon-btn" id="msClose" aria-label="닫기">${ICON.close}</button></div>
        <div class="plist">${list.map(p => rowItem(p)).join('')}</div>`;
      document.getElementById('msClose').onclick = () => { sheet.hidden = true; };
    };
    const draw = () => {
      markers.forEach(m => m.setMap(null));
      // 같은 좌표(교내 90곳은 모두 학교 주소)는 핀 하나로 묶는다
      const groups = new Map();
      state.places.filter(p => p.latlng && (cat === '전체' || p.category === cat)).forEach(p => {
        const k = p.latlng.join(',');
        groups.set(k, [...(groups.get(k) || []), p]);
      });
      markers = [...groups.values()].map(list => {
        const top = list[0];
        const marker = new maps.Marker({
          position: new maps.LatLng(...top.latlng), map, zIndex: list.includes(focus) ? 1000 : list.length,
          icon: { content: `<div class="pin${list.includes(focus) ? ' focus' : ''}"><span>${CAT[top.category].emoji}</span>${list.length > 1 ? `<b>${list.length}</b>` : ''}</div>`, anchor: new maps.Point(20, 44) },
        });
        maps.Event.addListener(marker, 'click', () => openList(list));
        return marker;
      });
    };
    maps.Event.addListener(map, 'click', () => { sheet.hidden = true; });
    const drawMe = () => {
      me?.setMap(null);
      me = state.origin.gps ? new maps.Marker({ position: new maps.LatLng(...state.origin.latlng), map, zIndex: 2000,
        icon: { content: '<div class="me-dot" aria-label="내 위치"></div>', anchor: new maps.Point(11, 11) } }) : null;
    };
    drawMe();
    document.getElementById('mapLocate').onclick = () => state.origin.gps
      ? map.panTo(new maps.LatLng(...state.origin.latlng))
      : (location.hash = '#/location');
    document.querySelectorAll('[data-mcat]').forEach(b => b.onclick = () => {
      cat = b.dataset.mcat;
      document.querySelectorAll('[data-mcat]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      history.replaceState(null, '', '#/map' + (cat === '전체' ? '' : '?cat=' + encodeURIComponent(cat)));
      sheet.hidden = true;
      draw();
    });
    const showFocus = () => {
      if (!focus?.latlng) return;
      map.setCenter(new maps.LatLng(...focus.latlng));
      map.setZoom(17);
      openList(state.places.filter(p => p.latlng && p.latlng.join() === focus.latlng.join()), focus);
      // 아래 목록 창이 핀을 가리지 않도록 지도를 창 높이의 절반만큼 옮긴다
      map.panBy(new maps.Point(0, sheet.offsetHeight / 2));
    };
    draw();
    showFocus();
    // 지도 탭을 다시 열 때는 이 지도를 그대로 쓰고, 보여줄 장소·분류만 바꾼다
    state.mapApi = {
      show(newCat, newFocusId) {
        map.autoResize();
        drawMe();
        if (newCat !== cat) { cat = newCat; document.querySelectorAll('[data-mcat]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mcat === cat))); }
        focus = state.byId.get(newFocusId);
        sheet.hidden = true;
        draw();
        showFocus();
      },
    };
  }).catch(() => { loadNaverMaps.failed = true; state.mapEntry = null; refresh(); });
}

function notFound() {
  return `<div class="empty"><div class="big">🧭</div>페이지를 찾을 수 없어요.<br><a href="#/" class="link">홈으로</a></div>`;
}

/* ---------- 길 찾기 (주소창 # 뒤로 화면을 고른다) ---------- */
// 화면 보관함: 앞으로 간 화면은 새로 그리고, 뒤로 돌아온 화면은 보관해 둔 그대로 다시 붙인다.
// 스크롤 위치·펼친 「더 보기」·입력한 검색어가 그대로 남는다 (배민처럼 보던 자리로 돌아옴).
const pages = new Map();   // 기록 번호 → { node, y, hash, resume }
const MAX_PAGES = 20;
let seq = 0;
state.cur = null;
const KEEP_ROOT = ['#/'];   // 탭을 오가도 상태를 기억하는 화면 (홈)

function renderFresh(parts) {
  let html, after = () => {};
  switch (parts[0]) {
    case undefined: html = home(); after = bindHome; break;
    case 'c': html = category(parts[1]); after = bindCategory; break;
    case 'p': html = detail(parts[1]); after = () => bindDetail(parts[1]); break;
    case 'search': html = search(); after = bindSearch; break;
    case 'map':
      // 지도를 못 불러오면(인터넷·인증 문제) 지역별 목록으로 대신 보여준다
      if (qs('list') || loadNaverMaps.failed) html = mapList(qs('area', '교내'));
      else { html = mapPage(qs('cat', '전체')); after = () => bindMap(qs('cat', '전체'), qs('focus')); }
      break;
    case 'saved': html = savedView(); break;
    case 'recent': html = recentView(); after = () => document.getElementById('clearList')?.addEventListener('click', () => { recent.clear(); refresh(); }); break;
    case 'news': html = news(); break;
    case 'pick': html = pickPage(); after = bindPick; break;
    case 'quest': html = questPage(); after = bindQuest; break;
    case 'my': case 'about': html = myPage(); break;
    case 'location': html = parts[1] === 'confirm' ? locationConfirm() : locationPage(); after = parts[1] === 'confirm' ? bindLocationConfirm : bindLocation; break;
    default: html = notFound();
  }
  const node = document.createElement('div');
  node.className = 'page';
  node.innerHTML = html;
  return { node, after };
}

function route() {
  const path = location.hash.replace(/^#/, '').split('?')[0] || '/';
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const hash = location.hash || '#/';
  const isMap = parts[0] === 'map' && !qs('list') && !loadNaverMaps.failed;
  closeSheet();

  // 떠나는 화면은 지우지 않고 보관한다
  if (state.cur) {
    state.cur.y = window.scrollY;
    state.cur.node.remove();
    if (!state.cur.map) pages.set(state.cur.idx, state.cur);
  }

  let idx = history.state?.idx;
  let entry = null;
  if (isMap && state.mapEntry) entry = state.mapEntry;                                  // 지도는 하나를 계속 쓴다
  else if (idx != null && pages.get(idx)?.hash === hash) entry = pages.get(idx);        // 뒤로·앞으로 돌아온 화면
  else if (KEEP_ROOT.includes(hash)) entry = [...pages.values()].reverse().find(p => p.hash === hash); // 탭 화면

  if (idx == null) { idx = ++seq; history.replaceState({ idx }, ''); }
  if (entry) {
    pages.delete(entry.idx);
    entry.idx = idx;
    view.append(entry.node);
    entry.resume?.();
    if (entry.map) state.mapApi?.show(qs('cat', '전체'), qs('focus'));
  } else {
    const { node, after } = renderFresh(parts);
    entry = { node, y: 0, hash, idx, resume: ['p'].includes(parts[0]) || !parts[0] ? after : null, map: isMap };
    view.append(node);
    after();
    if (isMap) state.mapEntry = entry;
  }
  entry.hash = hash;
  state.cur = entry;
  // 오래된 화면은 버린다
  while (pages.size > MAX_PAGES) pages.delete(pages.keys().next().value);

  // 상세·검색·위치 화면은 배민처럼 아래 탭을 숨긴다
  document.body.classList.toggle('no-tabbar', ['p', 'search', 'location'].includes(parts[0]));
  document.body.classList.remove('topbar-hidden');
  const TAB = { map: 'map', pick: 'pick', quest: 'quest', my: 'my', saved: 'my', recent: 'my', about: 'my' };
  const tab = parts.length === 0 ? 'home' : TAB[parts[0]] || null;
  document.querySelectorAll('.tabbar a').forEach(a => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const name = parts[0] === 'p' ? state.byId.get(parts[1])?.name : null;
  document.title = name ? `${name} · 교통대 충주 가이드` : '교통대 충주 가이드';
  window.scrollTo(0, entry.y || 0);
}
// 지금 화면만 새로 그린다 (도장·찜 지우기처럼 화면 안 내용이 바뀐 경우)
function refresh() {
  if (state.cur) { state.cur.node.remove(); state.cur = null; }
  history.replaceState({ idx: null }, '');
  route();
}
// 거리 기준이 바뀌면 보관한 화면의 거리가 틀려지므로 비운다
function dropPages() { pages.clear(); }

window.addEventListener('hashchange', e => {
  const from = new URL(e.oldURL).hash || '#/';
  if (location.hash.startsWith('#/location') && !from.startsWith('#/location')) state.locReturn = from;
  route();
});
// 지금 있는 탭을 다시 누르면 맨 위로 (배민 홈 탭)
document.querySelectorAll('.tabbar a').forEach(a => a.addEventListener('click', e => {
  if (a.getAttribute('aria-current') === 'page' && (location.hash.split('?')[0] || '#/') === a.getAttribute('href')) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}));
// 홈에서 내리면 위치 줄을 숨기고 검색창만 고정, 올리면 다시 보인다 (배민 홈)
let lastY = 0, ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    if (document.getElementById('homehead') && Math.abs(y - lastY) > 4) {
      document.body.classList.toggle('topbar-hidden', y > 60 && y > lastY);
      lastY = y;
    }
    ticking = false;
  });
}, { passive: true });

// 데이터를 고쳐 다시 올렸을 때 예전 파일이 남지 않도록 매번 바뀌었는지 확인한다
fetch('data/places.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(places => {
    state.places = places;
    state.byId = new Map(places.map(p => [p.id, p]));
    route();
  })
  .catch(() => {
    view.innerHTML = `<div class="empty"><div class="big">⚠️</div>데이터를 불러오지 못했어요.<br>잠시 뒤 다시 열어 주세요.</div>`;
  });
