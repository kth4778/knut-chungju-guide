'use strict';
// 교통대 학생을 위한 장소 발견 · 학교생활 안내 · 건물별 지도.

/* ---------- 기본 값 ---------- */
const CATS = [
  { name: '맛집', emoji: '🍴', icon: 'assets/studio/food.webp' },
  { name: '숨은장소', emoji: '🌳', icon: 'assets/studio/walk.webp' },
  { name: '생활꿀팁', emoji: '💡', icon: 'assets/studio/card.webp' },
  { name: '자유', emoji: '💬', icon: 'assets/studio/dice.webp' },
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
const MOVE_RE = '통학버스|시내버스|버스|택시|ktx|터미널|충주역|정류소';
const SORTS = [['rec', '추천 많은 순'], ['near', '가까운 순'], ['price', '가격 낮은 순'], ['name', '가나다순']];
const AREAS = ['교내', '대소원', '충주 시내'];
const UNKNOWN = '확인 안 됨';
const PAGE = 20;
const PLACEHOLDERS = ['학식? 프린트?', '카페? 국밥?', '버스? 택배?', '산책? 노을?'];
// 네이버 지도 Client ID. 웹페이지에 공개되는 값이고, 등록한 주소(localhost:5178·kth4778.github.io)에서만 동작한다
const NAVER_MAP_ID = 'g0yc562ytb';
const CAMPUS = [36.969692, 127.872252];

const state = { places: [], byId: new Map(), scroll: new Map(), pendingLoc: null };
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
const hasCheckedDate = p => /^\d{4}-\d{2}(?:-\d{2})?$/.test(p.checked || '');

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


const UI = {
  food: svg('<path d="M5 3v7M2 3v5c0 3 6 3 6 0V3M5 11v10M17 3v18M17 3c-5 3-5 10 0 10"/>'),
  coffee: svg('<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a3 3 0 0 1 0 6h-2M7 3v2M12 3v2"/>'),
  walk: svg('<path d="m12 3 6 8h-3l5 7H4l5-7H6zM12 18v4"/>'),
  dice: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" stroke-width="3"/>'),
  card: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8" cy="11" r="2"/><path d="M6 16h4M14 10h4M14 14h4"/>'),
  bus: svg('<rect x="4" y="3" width="16" height="16" rx="4"/><path d="M4 11h16M8 6h8M7 19v2M17 19v2M8 15h.01M16 15h.01"/>'),
  wifi: svg('<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 20h.01"/>'),
};

const art = key => `<img class="studio-art" src="assets/studio/${key}.webp" width="80" height="80" alt="" decoding="async">`;
/* ---------- 공통 조각 ---------- */
// 실제 사진은 검토한 파일과 출처를 함께 표시한다.
function naverPhotoLink(p) {
  const m = /place\/(\d+)/.exec(p.map || '');
  return m ? `https://m.place.naver.com/place/${m[1]}/photo` : null;
}
function logo(p, size = 'sm') {
  const c = CAT[p.category];
  return `<span class="logo logo-${size}" aria-hidden="true"><img src="${c.icon}" alt="" loading="lazy" onerror="fallback(this, '${c.emoji}')"></span>`;
}
// 자유 이용 사진(CC BY-SA 등)은 쓰는 자리마다 작성자·라이선스를 밝혀야 한다
function credit(p, i, full = false) {
  const c = p.credits?.[i];
  if (!c) return '';
  if (['baemin', 'official'].includes(c.source)) {
    const text = c.source === 'baemin' ? '배민 업체 메뉴 사진' : (full ? '한국교통대학교 공식 · '+(c.note || '촬영일 미표기') : '한국교통대학교 공식 사진');
    return full && c.page ? `<a class="credit full" href="${esc(c.page)}" target="_blank" rel="noopener">${text}</a>` : `<span class="credit ${full ? 'full' : ''}">${text}</span>`;
  }
  if (c.source === 'naver') return full
    ? `<a class="credit full" href="${esc(c.page)}" target="_blank" rel="noopener">사진 출처 · 네이버 플레이스 ${c.kind === 'business' ? '업체 사진' : '방문자 사진'} ${ICON.out || ''}</a>`
    : `<span class="credit">네이버 · ${c.kind === 'business' ? '업체 사진' : '방문자 사진'}</span>`;
  return full
    ? `<a class="credit full" href="${c.page}" target="_blank" rel="noopener">${esc(c.note)} · 사진 ${esc(c.author)} · ${esc(c.license)}</a>`
    : `<span class="credit">© ${esc(c.author)} · ${esc(c.license)}</span>`;
}
function photoOrTile(p) {
  // 카드에는 작은 사진(폭 480px)을 쓴다. 큰 사진은 상세 화면에서만
  if (p.photos.length) return `<img src="${(p.thumbs || p.photos)[0]}" alt="" loading="lazy" decoding="async">${credit(p, 0)}`;
  const c = CAT[p.category];
  return `<span class="tile-art" aria-hidden="true"><img src="${c.icon}" alt="" loading="lazy" onerror="fallback(this, '${c.emoji}')"><span class="tile-caption">${p.category} 가이드</span></span>`;
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
const recBadge = p => `<span class="rec">${ICON.thumb}<b>${p.rec}</b><i>건 추천</i></span>`;
const tags = p => `<div class="tags"><span class="tag">${p.category}</span>${p.photos.length ? `<span class="tag">사진 ${p.photos.length}</span>` : ''}${p.hours.length ? '<span class="tag">영업시간</span>' : ''}</div>`;

// 홈 가로 카드 (배민: 사진 167dp + 띠 + 이름 ★ + 정보 줄 + 태그)
function hCard(p, opt = {}) {
  const strip = opt.strip ?? (priceText(p) ? `최저 ${priceText(p)}` : '');
  const review = opt.review ? `<div class="review-box"><b>교통대생 추천</b><p>${esc(opt.review)}</p></div>` : '';
  return `<a class="hcard" href="${p.category === '생활꿀팁' && lifeIsGuide(p) ? lifeHref(p) : '#/p/' + p.id}">
    <div class="hcard-img">${photoOrTile(p)}${opt.rank ? `<span class="rank-num">${opt.rank}</span>` : ''}</div>
    ${strip ? `<div class="strip">${esc(strip)}</div>` : ''}
    <div class="hcard-body">
      <b class="name">${esc(p.name)}</b>
      <div class="card-recommend">${recBadge(p)}<span>${p.category}</span></div>
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
  return `<a class="place-list-card ${p.photos.length ? '' : 'without-photo'}" href="${p.category === '생활꿀팁' && lifeIsGuide(p) ? lifeHref(p) : '#/p/' + p.id}"><div class="place-list-copy"><span class="place-kind">${esc(p.category)} · ${esc(p.area)}</span><b>${esc(p.name)}</b><p>${esc(lifePlain(p))}</p><div>${priceText(p) ? `<strong>${priceText(p)}</strong>` : ''}${p.latlng ? `<span>${distText(distOf(p))}</span>` : ''}<span class="source-rec">${ICON.thumb} 추천 ${p.rec}건</span></div></div>${p.photos.length ? `<div class="place-list-photo">${photoOrTile(p)}</div>` : `<span class="place-list-arrow">${ICON.right}</span>`}</a>`;
}

// 줄 목록 (배민 찜·검색 결과: 왼쪽 사진 + 오른쪽 글, 검색어는 파란색 강조)
function rowItem(p, hl = '') {
  const words = hl.split(/\s+/).filter(Boolean);
  let snippet = '';
  if (words.length) {
    const src = [...p.reasons, ...p.menus.map(m => m.name)].find(t => words.some(w => squash(t).includes(squash(w))));
    if (src) snippet = `<p class="snippet">${highlight(src, words)}</p>`;
  }
  return `<a class="row" href="${p.category === '생활꿀팁' && lifeIsGuide(p) ? lifeHref(p) : '#/p/' + p.id}">
    <div class="row-img">${photoOrTile(p)}</div>
    <div class="row-text">
      <b class="name">${words.length ? highlight(p.name, words) : esc(p.name)}</b>
      ${snippet || `<p class="sub">${esc(p.location?.building ? p.location.building + (p.location.floor ? ' · '+p.location.floor : '') : addrText(p))}</p>`}${p.location?.precision === 'unverified' ? '<small class="location-pending">세부 위치 확인 중</small>' : ''}
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
  openSheet.returnFocus = document.activeElement;
  const layer = document.createElement('div');
  layer.className = 'sheet-layer';
  layer.innerHTML = `<div class="sheet-backdrop"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
    <h2>${title}</h2>
    ${rows.map(([v, label, on]) => `<button class="sheet-row" data-v="${esc(v)}" aria-pressed="${!!on}">${label}${on ? ICON.check : ''}</button>`).join('')}
    <button class="sheet-close">닫기</button></section>`;
  document.body.append(layer);
  document.body.classList.add('sheet-open');
  layer.querySelector('.sheet-backdrop').onclick = closeSheet;
  layer.querySelector('.sheet-close').onclick = closeSheet;
  layer.querySelectorAll('.sheet-row').forEach(b => b.onclick = () => { closeSheet(); onPick(b.dataset.v); });
  const buttons = [...layer.querySelectorAll('button')];
  openSheet.onKey = e => {
    if (e.key === 'Escape') closeSheet();
    if (e.key !== 'Tab') return;
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', openSheet.onKey);
  (layer.querySelector('[aria-pressed="true"]') || buttons[0]).focus();
}
function closeSheet() {
  document.querySelector('.sheet-layer')?.remove();
  document.body.classList.remove('sheet-open');
  if (openSheet.onKey) document.removeEventListener('keydown', openSheet.onKey);
  if (openSheet.returnFocus?.isConnected) openSheet.returnFocus.focus({ preventScroll: true });
  openSheet.returnFocus = null;
}

/* =========================================================
   홈 (배민 홈: 주소 줄 → 검색창 → 배너 → 서비스 탭 + 분류 칸 → 원형 줄 → 가로 카드 섹션)
   ========================================================= */
function themeCounts(cat) {
  const ps = state.places.filter(p => p.category === cat);
  return THEMES[cat].map(([label, emoji, re]) => ({ label, emoji, re, n: ps.filter(p => themeHit(p, re)).length })).filter(t => t.n);
}

/* 홈은 장소를 발견하고 고르는 곳. 생활 정보 분류는 학교생활 탭에서만 보여준다. */
function homePlaceCard(p) {
  return `<a class="place-preview" href="#/p/${p.id}"><div class="place-preview-photo">${photoOrTile(p)}</div><span class="place-preview-body"><small>${esc(p.area)} · ${esc(p.category)}</small><b>${esc(p.name)}</b><span>${priceText(p) || (p.latlng ? distText(distOf(p))+' · '+esc(state.origin.label)+' 기준' : '학생 추천 장소')}</span></span></a>`;
}
function home() {
  const food = sortList(state.places.filter(p => p.category === '맛집'), 'rec');
  const photos = food.filter(p => p.photos.length).slice(0,6);
  const seen = recent.read().map(id => state.byId.get(id)).filter(p => p && ['맛집','숨은장소'].includes(p.category)).slice(0,6);
  return `<div class="campus-home">
    <header class="home-head" id="homehead"><div class="campus-top"><a class="campus-brand" href="#/"><img class="brand-mark" src="assets/studio/brand.webp" width="44" height="44" alt=""><b>교통대 가이드</b></a>${heartLink()}</div><div class="search-wrap"><a class="searchbar" href="#/search">${ICON.search}<span>장소, 메뉴, 학교생활 검색</span></a></div></header>
    <a class="campus-story" href="#/c/숨은장소?theme=산책"><img src="assets/hero-campus.jpg" alt="한국교통대학교 충주캠퍼스 풍경"><span class="story-label">우리의 캠퍼스, 더 가까이</span><h1>수업 끝,<br>어디로 갈까?</h1><span class="story-action">학교 안 산책길 찾기 ${ICON.right}</span><span class="story-page">충주캠퍼스</span></a>
    <nav class="home-shortcuts" aria-label="장소 바로 찾기">${[['맛집','food','#/c/맛집'],['카페','coffee','#/c/맛집?theme=카페'],['숨은 장소','walk','#/c/숨은장소'],['뭐 먹지?','dice','#/pick']].map(([name,icon,url])=>`<a href="${url}"><span>${art(icon)}</span><b>${name}</b></a>`).join('')}</nav>
    <section class="home-section"><div class="section-title"><div><h2>학생들이 추천한 한 끼</h2><p>우리 학교 주변, 많이 추천한 순서로</p></div><a href="#/c/맛집" aria-label="맛집 전체 보기">전체 ${ICON.right}</a></div><div class="home-ranking">${food.slice(0,3).map((p,i)=>`<a class="ranking-row" href="#/p/${p.id}"><strong>${i+1}</strong><div class="rank-photo">${p.photos.length ? photoOrTile(p) : art("food")}</div><span><b>${esc(p.name)}</b><small>${esc(p.area)}${priceText(p) ? ' · '+priceText(p):''}</small></span><em>${ICON.thumb}${p.rec}</em>${ICON.right}</a>`).join('')}</div></section>
    <section class="home-section"><div class="section-title"><div><h2>사진으로 먼저 만나기</h2><p>사진으로 살펴보는 학교 앞 맛집</p></div><a href="#/explore">더 보기 ${ICON.right}</a></div><div class="photo-shelf">${photos.map(homePlaceCard).join('')}</div></section>
    <a class="campus-map-link" href="#/map"><span>${ICON.pin}</span><div><b>가까운 곳부터 찾아볼까?</b><p>지도에서 학교 주변 장소 보기</p></div>${ICON.right}</a>
    ${seen.length ? `<section class="home-section"><div class="section-title"><h2>최근 둘러본 곳</h2><a href="#/recent">전체 ${ICON.right}</a></div><div class="photo-shelf">${seen.map(homePlaceCard).join('')}</div></section>` : ''}
    <p class="foot-note">국립한국교통대학교 충주캠퍼스<br>학생 추천 자료를 모은 우리학교 가이드</p></div>`;
}
function bindHome() {}

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
  <a class="category-origin" href="#/location">${ICON.pin}<b>${esc(state.origin.label)}</b> 기준으로 둘러보기 ${ICON.down}</a>
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
  <div class="list-head"><span><b>${t ? esc(t.label) : cat}</b> ${list.length}곳</span>${sort === 'near' ? `<a href="#/location">${ICON.pin}${esc(state.origin.label)} 기준 ${ICON.right}</a>` : ''}</div>
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
function officialPanel(p) {
  const info = p.officialInfo;
  return info ? `<section class="official-info"><span>학교 공식 안내 · ${esc(info.checked)} 확인</span><h2>${esc(info.title)}</h2>${info.lines.map(line => `<p>${esc(line)}</p>`).join('')}<a href="${esc(info.page)}" target="_blank" rel="noopener">학교 안내 원문 ${ICON.right}</a></section>` : '';
}
function detail(id) {
  const p = state.byId.get(id);
  if (!p) return notFound();
  recent.push(p.id);
  const c = CAT[p.category];
  const on = saved.has(p.id);
  const gallery = p.photos.length
    ? p.photos.map((src, i) => `<figure class="d-photo"><img src="${src}" alt="${esc(p.name)} 사진 ${i + 1}" ${i ? 'loading="lazy"' : ''}>${credit(p, i, true)}</figure>`).join('')
    : `<span class="tile-art"><img src="${c.icon}" alt="" onerror="fallback(this, '${c.emoji}')"></span>`;
  const priced = p.menus.filter(m => m.min != null), unpriced = p.menus.filter(m => m.min == null);
  const unk = `<span class="unknown">${UNKNOWN}</span>`;
  const menuRows = list => list.map(m => `<div class="menu-row"><b>${esc(m.name)}</b>
      <p>${m.min == null ? '가격 확인 안 됨' : (m.max && m.max !== m.min ? `${won(m.min)} ~ ${won(m.max)}` : won(m.min))}</p></div>`).join('');

  return `
  <div class="d-bar ${p.photos.length ? '' : 'solid no-photo-bar'}" id="dbar">
    <button class="icon-btn" onclick="goBack()" aria-label="뒤로">${ICON.back}</button>
    <b class="d-bar-title">${esc(p.name)}</b>
    <div class="head-actions">
      <button class="icon-btn" id="shareBtn" aria-label="공유">${ICON.share}</button>
      <a class="icon-btn" href="#/search" aria-label="검색">${ICON.search}</a>
    </div>
  </div>
  <div class="d-hero ${p.photos.length ? '' : 'no-photo-hero'}" id="dhero"><div class="d-gallery" id="dgal">${p.photos.length ? gallery : `<div class="detail-category-symbol">${p.category==='맛집' ? UI.food : p.category==='숨은장소' ? UI.walk : ICON.school}<span>${esc(p.category)} · ${esc(p.area)}</span></div>`}</div>
    ${naverPhotoLink(p) ? `<a class="naver-photo" href="${naverPhotoLink(p)}" target="_blank" rel="noopener">${p.photos.length ? '네이버에서 사진 더 보기' : '네이버에서 사진 보기'} ${ICON.right}</a>` : ''}
    ${p.photos.length > 1 ? `<div class="d-dots" id="ddots">${p.photos.map((_, i) => `<i aria-current="${i === 0}"></i>`).join('')}</div>` : ''}
    
  </div>
  <div class="d-title">
    <h1>${esc(p.name)}</h1>
    <button class="heart ${on ? 'on' : ''}" id="saveBtn" aria-pressed="${on}" aria-label="찜">${ICON.heart}</button>
  </div>
  <div class="d-sub">
    <a href="#reasons" class="rec-link">${ICON.thumb}<b>추천 ${p.rec}건</b>${p.reasons.length ? `<span>(이유 ${p.reasons.length})</span>` : ''}${ICON.right}</a>
    <span class="chip-sm">${p.category} · ${p.area}</span>
  </div>

  ${p.menuSummary ? `<a class="detail-menu-jump" href="#foodMenu">${UI.food}<span>사진으로 메뉴 보기 <b>${p.menuSummary.count}</b></span>${ICON.down}</a>` : ''}
  <div class="info-box">
    <div class="seg" role="tablist">
      <button role="tab" aria-selected="true" data-seg="info">정보</button>
      <button role="tab" aria-selected="false" data-seg="where">위치${p.latlng ? ` <small>${distText(distOf(p))}</small>` : ''}</button>
    </div>
    <dl class="kv" data-pane="info">
      <dt>${p.menuSummary ? '수집 가격' : '가격'}</dt><dd>${priceText(p) || unk}${p.menuSummary ? '<small class="info-price-context">학생 수집 자료 · 아래 메뉴 가격과 확인일이 달라요</small>' : ''}</dd>
      <dt>운영시간</dt><dd>${p.hours.length ? p.hours.map(hourText).join('<br>') : unk}</dd>
      <dt>확인한 날</dt><dd>${p.checked || unk}</dd>
    </dl>
    <dl class="kv" data-pane="where" hidden>
      <dt>주소</dt><dd>${esc(addrText(p))}${p.location ? `<small class="location-proof">${p.location.precision === 'unverified' ? '세부 위치 확인 중' : `${esc(p.location.building)}${p.location.floor ? ' · '+esc(p.location.floor) : ''}`}<br>${esc(p.location.note)}${p.location.source ? `<a href="${esc(p.location.source)}" target="_blank" rel="noopener">위치 출처 보기</a>` : ''}</small>` : ''}</dd>
      <dt>거리</dt><dd>${p.latlng ? `${esc(state.origin.label)}에서 ${distText(distOf(p))}` : unk}</dd>
      <dt>지역</dt><dd>${p.area}</dd>
    </dl>
    <div class="info-actions" data-pane="where" hidden>
      ${p.latlng ? `<a class="btn-line" href="#/map?focus=${p.id}">${ICON.pin}지도에서 보기</a>` : ''}
      ${p.map ? `<a class="btn-line" href="${p.map}" target="_blank" rel="noopener">네이버 지도에서 보기</a>` : ''}
    </div>
  </div>

  ${officialPanel(p)}
  ${p.menuSummary ? `<section class="food-menu-section" id="foodMenu" aria-label="메뉴와 가격"><div class="menu-heading"><h2>메뉴 <span>${p.menuSummary.count}</span></h2><p>사진으로 보고 골라요</p></div><div id="menuCatalog" aria-live="polite"><p class="menu-loading">메뉴를 불러오는 중이에요…</p></div></section>` : ''}

  ${p.reasons.length ? `<section class="d-sec" id="reasons"><h2>학생들이 남긴 추천 이유 <span>${p.reasons.length}</span></h2>
    <div class="reason-list">${[...p.reasons].sort((a,b)=>b.length-a.length).map((r, i) => `<details class="reason-note" ${i===0 ? 'open' : ''}><summary><span>추천 ${i+1}</span><b>${esc(r.slice(0,34))}${r.length>34 ? '…' : ''}</b>${ICON.down}</summary><p>${esc(r)}</p></details>`).join('')}</div></section>` : ''}

  <div class="notice">${ICON.notice}<span>영업시간·가격은 바뀔 수 있어요. 방문 전에 한 번 더 확인하세요.</span></div>

  ${!p.menuSummary && p.menus.length ? `<div class="menu-chips">
      ${priced.length ? '<a href="#m-priced" data-spy="m-priced">가격 있는 메뉴</a>' : ''}
      ${unpriced.length ? `<a href="#m-unpriced" data-spy="m-unpriced">메뉴 ${unpriced.length}</a>` : ''}
    </div>
    ${priced.length ? `<section class="menu-group" id="m-priced"><h2>가격 있는 메뉴</h2><p>학생들이 적어 준 가격이에요.</p>${menuRows(priced)}</section>` : ''}
    ${unpriced.length ? `<section class="menu-group" id="m-unpriced"><h2>메뉴</h2><p>가격은 아직 확인하지 못했어요.</p>${menuRows(unpriced)}</section>` : ''}` : ''}
  <p class="foot-note">수집 자료의 추천 ${p.rec}건을 정리했어요.</p>
  ${p.latlng || p.map ? `<div class="detail-actions">
    ${p.latlng ? `<a class="btn-line" href="#/map?focus=${p.id}">${ICON.pin}지도에서 보기</a>` : ''}
    ${p.map ? `<a class="btn-black" href="${p.map}" target="_blank" rel="noopener">네이버 지도에서 보기 ${ICON.right}</a>` : ''}
  </div>` : ''}`;
}
const menuCache = new Map();
function bindMenuCatalog(p) {
  const host = document.getElementById('menuCatalog');
  if (!host || host.dataset.menuReady === 'true') return;
  const show = data => {
    if (!host.isConnected) return;
    host.dataset.menuReady = 'true';
    let source = data.menuSources.some(x => x.source === 'naver') ? 'naver' : 'baemin', limit = 12, query = '';
    const draw = () => {
      const rows = data.menuCatalog.filter(m => m.source === source && squash(m.name).includes(squash(query)));
      const current = data.menuSources.find(x => x.source === source);
      host.innerHTML = `<div class="menu-source-tabs" role="tablist" aria-label="메뉴 출처">${data.menuSources.map(x => `<button role="tab" data-menu-source="${x.source}" aria-selected="${x.source === source}">${x.source === 'naver' ? '네이버 등록 메뉴' : '배민 배달 메뉴'}</button>`).join('')}</div>
        <div class="menu-source-note"><span>${source === 'naver' ? '네이버에 등록된 가격이에요. 매장과 다를 수 있어요.' : '확인한 배달 메뉴만 표시해요. 배달비·할인은 별도예요.'}<br>${esc(current.checked)} 확인${current.updated ? ' · '+esc(current.updated) : ''}</span>${current.page ? `<a href="${esc(current.page)}" target="_blank" rel="noopener">출처 ${ICON.out || ICON.right}</a>` : ''}</div>
        <label class="menu-search">${ICON.search}<input type="search" placeholder="메뉴 이름 찾기" aria-label="메뉴 이름 찾기" value="${esc(query)}"></label>
        <div class="food-menu-list">${rows.slice(0,limit).map(m => `<article class="food-menu-card ${m.image ? '' : 'without-image'}"><div><h3>${esc(m.name)}</h3>${m.description ? `<p>${esc(m.description)}</p>` : ''}<strong>${esc(m.priceText)}</strong>${m.variants?.length > 1 ? `<details><summary>크기·구성별 가격</summary>${m.variants.map(v => `<small>${esc(v.text.replace(/^,/, '').replace(/,(?=[\d,]+원$)/, ' · '))}</small>`).join('')}</details>` : ''}</div>${m.image ? `<img src="${esc(m.image)}" alt="${esc(m.name)}" width="104" height="104" loading="lazy" decoding="async">` : ''}</article>`).join('') || '<p class="menu-empty">찾는 메뉴가 없어요.</p>'}</div>
        ${rows.length > limit ? `<button class="menu-more">메뉴 더 보기 <span>${Math.min(limit,rows.length)} / ${rows.length}</span>${ICON.down}</button>` : ''}`;
      host.querySelectorAll('[data-menu-source]').forEach(b => b.onclick = () => { source = b.dataset.menuSource; limit = 12; query = ''; draw(); });
      const input = host.querySelector('input');
      input.oncompositionend = () => input.dispatchEvent(new Event('input'));
      input.oninput = e => { if (e.isComposing) return; const at = input.selectionStart; query = input.value; limit = 12; draw(); const next = host.querySelector('input'); next.focus({preventScroll:true}); try { next.setSelectionRange(at,at); } catch {} };
      host.querySelector('.menu-more')?.addEventListener('click', () => { limit += 12; draw(); });
    };
    draw();
  };
  if (menuCache.has(p.id)) return show(menuCache.get(p.id));
  fetch(`data/menus/${p.id}.json`).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { menuCache.set(p.id,data); show(data); }).catch(() => {
    if (host.isConnected) { host.innerHTML = '<p class="menu-loading">메뉴를 불러오지 못했어요.</p><button class="btn-line">다시 불러오기</button>'; host.querySelector('button').onclick = () => bindMenuCatalog(p); }
  });
}
function bindDetail(id) {
  const p = state.byId.get(id);
  if (!p) return;
  bindMenuCatalog(p);
  // 사진을 지나 내려가면 위 막대를 흰색으로 바꾸고 이름을 보여준다 (배민 가게 상세)
  const bar = document.getElementById('dbar'), hero = document.getElementById('dhero');
  const chips = [...document.querySelectorAll('[data-spy]')];
  const onScroll = () => {
    bar.classList.toggle('solid', !p.photos.length || window.scrollY > hero.offsetHeight - 70);
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
  document.querySelectorAll('a[href^="#m-"], a[href="#reasons"], a[href="#foodMenu"]').forEach(a => a.onclick = e => {
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
    <div class="s-head"><h3>빠르게 찾아보기</h3></div>
    <div class="chip-row">${['학식', '프린트', '버스', '카페', '국밥', '산책', '택배', '노을'].map(w => `<a class="kchip" href="#/search?q=${w}">${w}</a>`).join('')}</div>
    <div class="s-head"><h3>추천 많은 곳</h3></div>
    <ol class="rank-box">${sortList(state.places, 'rec').slice(0, 5).map((p, i) => `<li><a href="${p.category === '생활꿀팁' && lifeIsGuide(p) ? lifeHref(p) : '#/p/' + p.id}"><b>${i + 1}</b><span>${esc(p.name)}</span><em>${p.rec}건</em></a></li>`).join('')}</ol>`;
  } else {
    const hits = state.places.map(p => {
      const name = squash(p.name), all = hay(p);
      if (!words.every(w => all.includes(w))) return null;
      return { p, score: words.filter(w => name.includes(w)).length * 100 + p.rec };
    }).filter(Boolean).sort((a, b) => b.score - a.score).map(x => x.p);
    const counts = Object.fromEntries(CATS.map(c => [c.name, hits.filter(p => p.category === c.name).length]));
    const list = cat === '전체' ? hits : hits.filter(p => p.category === cat);
    const link = c => `#/search?q=${encodeURIComponent(q)}${c === '전체' ? '' : '&cat=' + encodeURIComponent(c)}`;
    body = `
    <div class="search-result-label">‘${esc(q)}’ 검색 결과</div>
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
  const list = state.places.filter(hasCheckedDate).sort((a, b) => b.checked.localeCompare(a.checked) || b.rec - a.rec).slice(0, 30);
  return `${header('최근 확인된 곳')}<div class="list-head"><span>자료에 확인 날짜가 남아 있는 곳</span></div><div class="plist">${list.map(p => rowItem(p)).join('')}</div>`;
}
function about() {
  const rec = state.places.reduce((sum, p) => sum + p.rec, 0);
  const per = Object.fromEntries(CATS.map(c => [c.name, state.places.filter(p => p.category === c.name).length]));
  return `
  <section class="card">
    <div class="kv-row"><span>가이드 소개</span><b>장소 ${state.places.length}곳 · 학생 추천 ${rec}건</b></div>
    <div class="cat-chips">${CATS.map(c => `<a href="#/c/${c.name}">${c.emoji} ${c.name} ${per[c.name]}</a>`).join('')}</div>
    <p class="card-note">자료: 「도메인 특화 AI 데이터 스토리텔링」 수강생 추천을 정규화한 데이터 · 지도: NAVER<br>
    교내 건물 사진: 위키미디어 공용 <a href="https://commons.wikimedia.org/wiki/Category:Korea_National_University_of_Transportation" target="_blank" rel="noopener">Korea National University of Transportation</a> (Knutpr·Aranaraaya, CC BY-SA 4.0)</p>
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
   🔍 둘러보기 (인스타 돋보기 화면처럼 사진 격자)
   ========================================================= */
// 같은 사진(건물 외관 1장 → 도서관 안 시설 여러 곳)은 한 칸만 두고, 누르면 해당 장소들을 고르게 한다
function exploreTiles(cat) {
  const tiles = new Map();
  state.places.filter(p => ['맛집','숨은장소'].includes(p.category) && p.photos.length && (cat === '전체' || p.category === cat)).forEach(p => {
    p.photos.forEach((src, i) => {
      const t = tiles.get(src) || { src, thumb: (p.thumbs || p.photos)[i], credit: p.credits?.[i], places: [] };
      t.places.push(p);
      tiles.set(src, t);
    });
  });
  // 학생이 찍은 가게·장소 사진을 앞에, 건물 외관 사진은 사이사이에 섞는다
  const real = [...tiles.values()].filter(t => !t.credit), bld = [...tiles.values()].filter(t => t.credit);
  const out = [];
  while (real.length || bld.length) {
    out.push(...real.splice(0, 3));
    if (bld.length) out.push(bld.shift());
  }
  return out;
}
function explorePage() {
  const cat = ['맛집','숨은장소'].includes(qs('cat')) ? qs('cat') : '전체';
  const tiles = exploreTiles(cat);
  return `
  <header class="explore-search-head"><a class="explore-search-field" href="#/search">${ICON.search}<span>사진 속 장소가 궁금하다면?</span></a><a class="icon-btn" href="#/saved" aria-label="저장한 장소">${ICON.heart}</a></header>
  <div class="filter-bar plain">
    ${['전체', '맛집', '숨은장소'].map(c => `<a class="fchip ${c === cat ? 'on' : ''}" href="#/explore${c === '전체' ? '' : '?cat=' + encodeURIComponent(c)}" onclick="location.replace(this.href);return false">${c}</a>`).join('')}
  </div>
  <div class="explore">
    ${tiles.map((t, i) => `<button class="ex-tile ${i % 18 === 2 ? 'big right' : i % 18 === 9 ? 'big' : ''}" data-ex="${i}" aria-label="${esc(t.places[0].name)}${t.places.length > 1 ? ` 외 ${t.places.length - 1}곳` : ''}">
      <img src="${i % 18 === 2 || i % 18 === 9 ? t.src : t.thumb}" alt="" loading="lazy" decoding="async">
      ${t.places.length > 1 ? `<span class="ex-count">${t.places.length}곳</span>` : ''}
      ${t.credit ? `<span class="credit">© ${esc(t.credit.author)}</span>` : ''}
    </button>`).join('')}
  </div>
  <p class="foot-note">사진 ${tiles.length}장 · 사진이 없는 곳은 장소 화면의 「네이버에서 사진 보기」로 볼 수 있어요.</p>`;
}
function bindExplore() {
  document.querySelector('.explore').onclick = e => {
    const b = e.target.closest('[data-ex]');
    if (!b) return;
    const t = exploreTiles(['맛집','숨은장소'].includes(qs('cat')) ? qs('cat') : '전체')[+b.dataset.ex];
    if (t.places.length === 1) location.hash = '#/p/' + t.places[0].id;
    else openSheet(`${t.credit?.note ? t.credit.note + ' · ' : ''}${t.places.length}곳`, t.places.map(p => [p.id, esc(p.name), false]), id => { location.hash = '#/p/' + id; });
  };
}

/* =========================================================
   마이 (배민 마이배민: 회색 바탕 · 흰 카드 · 찜·최근 본 곳을 여기서도)
   ========================================================= */
function myPage() {
  const sv = saved.read().map(id => state.byId.get(id)).filter(Boolean);
  const rc = recent.read().map(id => state.byId.get(id)).filter(Boolean);
  const mini = list => list.length ? `<div class="hscroll mini">${list.slice(0, 10).map(p => `<a class="mini-card" href="${p.category === '생활꿀팁' && lifeIsGuide(p) ? lifeHref(p) : '#/p/' + p.id}"><div class="mini-img">${photoOrTile(p)}</div><b>${esc(p.name)}</b></a>`).join('')}</div>` : '';
  return `
  <div class="gray-page">
  <header class="head left"><h1>마이</h1></header>
  <div class="profile"><img src="assets/studio/brand.webp" alt="" onerror="this.remove()"><b>교통대 충주 가이드</b><p>교통대생이 직접 추천한 충주캠퍼스 장소</p></div>
  <div class="counters">
    <a href="#/saved"><b>${sv.length}</b><span>찜</span></a>
    <a href="#/recent"><b>${rc.length}</b><span>최근 본 곳</span></a>
    <a href="#/explore"><b>${state.places.filter(p => p.photos.length).length}</b><span>사진 있는 곳</span></a>
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
    <p class="card-note">찜·최근 본 곳·최근 검색어는 이 브라우저에만 남아요. 현재 위치는 거리 계산에만 쓰고 저장하지 않아요.</p>
  </section>
  ${about()}
  <section class="card">
    <a class="kv-row" href="motion.html"><span>발표용 소개 영상</span><b>${ICON.right}</b></a>
  </section>
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
    <div id="map" class="map" role="application" aria-label="장소 지도"></div><a class="map-search-bar" href="#/search">${ICON.search}<span>장소·건물을 검색해보세요</span></a>
    <div class="map-top"><div class="chip-row nowrap">
      ${['전체', ...CATS.map(c => c.name)].map(c => `<button class="mchip" data-mcat="${c}" aria-pressed="${c === cat}">${c === '전체' ? c : CAT[c].emoji + ' ' + c}</button>`).join('')}
    </div></div>
    <button class="map-search-here" id="mapSearchHere">${ICON.refresh || ICON.target} 이 지역에서 다시 찾기</button><button class="map-list-btn" id="mapVisibleList">${ICON.menu || ICON.pin}<span id="mapResultCount">장소 불러오는 중</span></button><a class="map-area-link" id="mapAreaLink" href="#/map?list=1">지역별 목록</a><div class="map-coordinate-note">시설은 건물 위치 기준 · 산책길은 위치 설명을 확인하세요</div>
    <button class="map-locate" id="mapLocate" aria-label="현재 위치로 찾기">${ICON.target}</button>
    <div class="map-sheet" id="msheet" hidden></div>
  </div>`;
}
function mapList(area = '교내') {
  const cat = qs('cat', '전체');
  const pool = state.places.filter(p => cat === '전체' || p.category === cat);
  const areas = ['전체', ...new Set(pool.map(p => p.area))];
  const list = pool.filter(p => area === '전체' || p.area === area);
  const catParam = cat === '전체' ? '' : '&cat=' + encodeURIComponent(cat);
  return `<header class="head left"><h1>지역별 보기</h1><div class="head-actions"><a class="mchip" href="#/map${cat === '전체' ? '' : '?cat=' + encodeURIComponent(cat)}">지도로 보기</a></div></header>
  <div class="filter-bar">${areas.map(a => `<a class="fchip ${a === area ? 'on' : ''}" href="#/map?list=1&area=${encodeURIComponent(a)}${catParam}" onclick="location.replace(this.href);return false">${esc(a)} ${pool.filter(p => a === '전체' || p.area === a).length}</a>`).join('')}</div>
  <div class="list-head"><span>${esc(cat)} · ${list.length}건</span></div>${list.length ? pagedList(list, p => rowItem(p)) : '<div class="empty">이 지역에 등록된 정보가 없어요.</div>'}`;
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
    let markers = new Map(), me = null, areaBounds = null, mapResults = [];
    const openList = (list, first, title) => {
      if (first) list = [first, ...list.filter(p => p !== first)];
      sheet.hidden = false;
      sheet.classList.remove('expanded');
      sheet.innerHTML = `<button class="map-sheet-handle" aria-label="장소 목록 크게 보기" aria-expanded="false"><span></span></button>
        <div class="sheet-title"><div><b>${esc(title || (list.length > 1 ? `선택한 위치 · ${list.length}건` : '선택한 장소'))}</b><small>목록을 누르면 상세 정보를 볼 수 있어요</small></div><button class="icon-btn" id="msClose" aria-label="닫기">${ICON.close}</button></div>
        ${pagedList(list, p => rowItem(p))}`;
      document.getElementById('msClose').onclick = () => { sheet.hidden = true; };
      const handle = sheet.querySelector('.map-sheet-handle');
      const expand = on => { sheet.classList.toggle('expanded', on); handle.setAttribute('aria-expanded', String(on)); handle.setAttribute('aria-label', on ? '장소 목록 작게 보기' : '장소 목록 크게 보기'); };
      let startY = null, dragged = false;
      handle.onpointerdown = e => { startY = e.clientY; dragged = false; handle.setPointerCapture(e.pointerId); };
      handle.onpointermove = e => {
        if (startY === null) return;
        const dy = e.clientY - startY;
        if (Math.abs(dy) > 5) dragged = true;
        sheet.style.transition = 'none';
        sheet.style.transform = `translate3d(0,${Math.max(-70,dy)}px,0)`;
      };
      handle.onpointerup = e => {
        sheet.style.transition = ''; sheet.style.transform = '';
        if (startY === null) return;
        const dy = e.clientY - startY; startY = null;
        if (Math.abs(dy) > 25) { dragged = true; if (dy < 0) expand(true); else if (sheet.classList.contains('expanded')) expand(false); else sheet.hidden = true; }
      };
      handle.onclick = () => { if (!dragged) expand(!sheet.classList.contains('expanded')); };
      handle.onpointercancel = () => { startY = null; sheet.style.transition = ''; sheet.style.transform = ''; };

    };
    // 재생성 대신 같은 핀을 재사용하고, 이동이 끝났을 때 보이는 범위만 갱신한다.
    const draw = () => {
      if (!document.getElementById('mapResultCount')) return;
      const bounds = map.getBounds(), zoom = map.getZoom(), projection = map.getProjection();
      mapResults = state.places.filter(p => p.latlng && (cat === '전체' || p.category === cat) && (!areaBounds || areaBounds.hasLatLng(new maps.LatLng(...p.latlng))));
      document.getElementById('mapResultCount').textContent = `${areaBounds ? '이 지역' : '전체'} ${mapResults.length}건 · 목록 보기`;
      document.getElementById('mapAreaLink').href = '#/map?list=1' + (cat === '전체' ? '' : '&cat=' + encodeURIComponent(cat));
      document.getElementById('mapSearchHere').classList.toggle('filtered', !!areaBounds);
      const groups = new Map(), centers = new Map();
      mapResults.forEach(p => {
        const coord = new maps.LatLng(...p.latlng);
        if (!bounds.hasLatLng(coord) && p !== focus) return;
        const point = projection.fromCoordToPoint(coord);
        const radius = (zoom < 18 ? 70 : 38) / Math.pow(2, zoom);
        let key = p.id;
        for (const [candidate, center] of centers) {
          if (Math.hypot(point.x-center.x,point.y-center.y) < radius) { key = candidate; break; }
        }
        if (!groups.has(key)) { groups.set(key, []); centers.set(key,point); }
        groups.get(key).push(p);
      });
      for (const [key, entry] of markers) if (!groups.has(key)) { entry.marker.setMap(null); maps.Event.clearInstanceListeners(entry.marker); markers.delete(key); }
      for (const [key, list] of groups) {
        const top = list[0], selected = list.includes(focus);
        const label = list.length > 1 ? `${list.length}곳` : top.name;
        const withLabel = zoom >= 18 && list.length === 1;
        const signature = list.map(p=>p.id).join(',') + selected + withLabel;
        const existing = markers.get(key);
        if (existing?.signature === signature) continue;
        const symbol = top.category === '맛집' ? UI.food : top.category === '숨은장소' ? UI.walk : top.category === '생활꿀팁' ? ICON.school : ICON.heart;
        const icon = {content:`<div class="campus-pin ${top.category === '맛집' ? 'food' : top.category === '숨은장소' ? 'walk' : 'life'}${selected ? ' selected' : ''}${list.length > 1 ? ' cluster' : ''}" role="button" aria-label="${esc(label)}"><span class="pin-disc">${list.length > 1 ? `<b>${list.length}</b>` : symbol}</span>${withLabel || selected ? `<span class="pin-name">${esc(top.location?.building || top.name)}</span>` : ''}</div>`,anchor:new maps.Point(22,50)};
        const entry = existing || {marker:new maps.Marker({map,position:new maps.LatLng(...top.latlng),icon})};
        entry.list = list; entry.signature = signature;
        entry.marker.setPosition(new maps.LatLng(...top.latlng)); entry.marker.setIcon(icon); entry.marker.setZIndex(selected ? 1000 : list.length);
        if (!existing) maps.Event.addListener(entry.marker,'click',()=>{
          const items = entry.list;
          const sameBuilding = items.every(p => p.latlng.join() === items[0].latlng.join());
          if (items.length > 1 && !sameBuilding && map.getZoom() < 19) map.morph(new maps.LatLng(...items[0].latlng),Math.min(19,map.getZoom()+2),{duration:280});
          else openList(items,null,items[0].location?.building && items.every(p=>p.location?.building === items[0].location.building) ? `${items[0].location.building} · ${items.length}건` : null);
        });
        markers.set(key,entry);
      }
    };
    maps.Event.addListener(map, 'idle', draw);
    maps.Event.addListener(map, 'click', () => { sheet.hidden = true; });
    document.getElementById('mapSearchHere').onclick = () => {
      areaBounds = map.getBounds();
      sheet.hidden = true;
      draw();
      if (mapResults.length) openList(mapResults.sort((a,b) => distOf(a) - distOf(b)), null, `이 지역에서 찾은 장소 · ${mapResults.length}건`);
      else toast('이 지도 범위에 등록된 장소가 없어요. 지도를 넓혀 보세요.');
    };
    document.getElementById('mapVisibleList').onclick = () => mapResults.length ? openList([...mapResults].sort((a,b) => distOf(a) - distOf(b)), null, `지도에서 찾은 장소 · ${mapResults.length}건`) : toast('지도 범위를 넓혀 다시 찾아보세요.');
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
      areaBounds = null;
      document.querySelectorAll('[data-mcat]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      history.replaceState(null, '', '#/map' + (cat === '전체' ? '' : '?cat=' + encodeURIComponent(cat)));
      sheet.hidden = true;
      draw();
    });
    const showFocus = () => {
      if (!focus?.latlng) return;
      areaBounds = null;
      draw();
      map.morph(new maps.LatLng(...focus.latlng),18,{duration:280});
      const buildingPlaces = state.places.filter(p => p.latlng && p.latlng.join() === focus.latlng.join());
      openList(buildingPlaces, focus, focus.location?.building ? `${focus.location.building} · ${buildingPlaces.length}건` : null);
      // 아래 목록 창이 핀을 가리지 않도록 지도를 창 높이의 절반만큼 옮긴다
      map.panBy(new maps.Point(0, Math.max(0, (sheet.offsetHeight - 210) / 2)));
    };
    draw();
    showFocus();
    // 지도 탭을 다시 열 때는 이 지도를 그대로 쓰고, 보여줄 장소·분류만 바꾼다
    state.mapApi = {
      show(newCat, newFocusId) {
        map.autoResize();
        drawMe();
        if (newCat !== cat) { areaBounds = null; cat = newCat; document.querySelectorAll('[data-mcat]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mcat === cat))); }
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

/* ---------- 학교생활: 정규화된 생활꿀팁을 목적별로 찾기 ---------- */
const LIFE_GROUPS = [
  { id: 'print', name: '출력·과제', emoji: '🖨️', re: /프린트|프린터|복사|출력|카피|3d|아이디어팩토리|생성형/i },
  { id: 'study', name: '공부·도서관', emoji: '📚', re: /도서관|열람|공부|세미나|강의실|논문|서점|전공책|교재/ },
  { id: 'move', name: '이동·교통', emoji: '🚌', re: /버스|통학|택시|대중교통|충주역|터미널|이동수단|정류|콜버스|페이코|payco|ktx/i },
  { id: 'dorm', name: '생활관·세탁', emoji: '🧺', re: /생활관|기숙사|외박|통금|세탁|빨래|런드리|워시/ },
  { id: 'school', name: '학사·장학', emoji: '🎓', re: /장학|수강|학생증|증명|등록|교환학생|통합정보|utro|학사/i },
  { id: 'health', name: '건강·상담', emoji: '🩺', re: /병원|약국|보건|상담|건강|헬스|피트니스/ },
  { id: 'daily', name: '편의·생활', emoji: '🏪', re: /편의점|cu |gs25|세븐일레븐|이마트|마트|하이24|택배|우체국|은행|atm|식당|학식|아침밥/i },
  { id: 'rest', name: '여가·모임', emoji: '🎈', re: /동아리|영화|cgv|메가박스|pc|피씨|노래|술|주점|포차|호프|소주|카페|고양이/i },
  { id: 'other', name: '기타 생활', emoji: '💡', re: null },
];
function lifeGroup(p) {
  if (/^(cu|gs25|세븐일레븐|이마트|하이24)/i.test(p.name)) return LIFE_GROUPS.find(g => g.id === 'daily');
  const primary = LIFE_GROUPS.find(g => g.re?.test(p.name));
  return primary || LIFE_GROUPS.find(g => g.re?.test(p.reasons.join(' '))) || LIFE_GROUPS.at(-1);
}
const lifePlaces = () => state.places.filter(p => p.category === '생활꿀팁');
const lifeIsGuide = p => p.address === '해당 없음' || /하는 법|쓰는 법|받는 법|신청|꿀팁|이용방법|매일 확인|활용방법/.test(p.name);
const lifeHref = p => lifeIsGuide(p) ? `#/life/read/${p.id}` : `#/p/${p.id}`;
const lifePlain = p => (p.reasons.find(r => r.trim()) || addrText(p) || '자세한 정보는 상세 화면에서 확인하세요.').replace(/https?:\/\/\S+/g, '').trim();
function lifeCard(p) {
  const group = lifeGroup(p);
  return `<a class="life-result" href="${lifeHref(p)}"><span class="life-result-icon" aria-hidden="true">${group.emoji}</span><span class="life-result-copy"><span class="life-result-tag">${group.name} · ${lifeIsGuide(p) ? '이용 안내' : '장소'}</span><b>${esc(p.name)}</b><span class="life-snippet">${esc(lifePlain(p))}</span><small>${hasCheckedDate(p) ? `${esc(p.checked)} 자료 확인` : '확인일 미등록'}${!lifeIsGuide(p) && p.area ? ` · ${esc(p.area)}` : ''}</small></span>${ICON.right}</a>`;
}
function lifePage() {
  const all = lifePlaces(), groupId = qs('topic', 'all');
  const active = LIFE_GROUPS.find(g => g.id === groupId), q = qs('q').trim();
  const results = all.filter(p => (!active || lifeGroup(p).id === groupId) && (!q || hay(p).includes(squash(q))));
  const ordered = sortList(results, 'rec');
  if (q) ordered.sort((a,b) => Number(squash(b.name).includes(squash(q))) - Number(squash(a.name).includes(squash(q))));
  const quick = [['P212','학생증','card'],['P268','학식 메뉴','food'],['P254','통학버스','bus'],['P195','와이파이','wifi']].filter(([id]) => state.byId.has(id));
  const topicHref = id => '#/life' + (id === 'all' && !q ? '' : '?' + new URLSearchParams({...id !== 'all' ? {topic:id} : {}, ...q ? {q} : {}}));
  return `<div class="life-page">
    <header class="head left"><h1>학교생활</h1><div class="head-actions">${heartLink()}</div></header>
    <div class="life-welcome"><span>KNUT CAMPUS GUIDE</span><h2>학교생활의 작은 궁금증,<br>여기서 해결해요.</h2></div>
    <form id="lifeSearch" class="life-search" role="search"><label for="lifeQuery" class="sr-only">학교생활 정보 검색</label>${ICON.search}<input id="lifeQuery" name="q" value="${esc(q)}" placeholder="학생증, 프린트, 통학버스" type="search" enterkeyhint="search"><button type="submit" aria-label="학교생활 검색">검색</button></form>
    <nav class="life-quick" aria-label="바로 읽는 이용 안내">${quick.map(([id,label,icon]) => `<a href="${lifeHref(state.byId.get(id))}"><span>${art(icon)}</span><b>${label}</b></a>`).join('')}</nav>
    <nav class="life-topics" aria-label="학교생활 주제"><a href="${topicHref('all')}" ${!active ? 'aria-current="page"' : ''}>전체<span>${all.length}</span></a>${LIFE_GROUPS.map(g=>`<a href="${topicHref(g.id)}" ${active?.id===g.id ? 'aria-current="page"' : ''}>${g.name}</a>`).join('')}</nav>
    <section class="life-directory"><div class="life-directory-title"><h2>${q ? '검색 결과' : active?.name || '모든 생활 안내'} <span>${results.length}</span></h2><small>수집 자료 추천 순</small></div>${q ? `<div class="desk-query">‘${esc(q)}’ 검색 결과<a href="${active ? '#/life?topic='+active.id : '#/life'}" aria-label="검색 지우기">${ICON.close}</a></div>` : ''}<div id="lifeResults">${ordered.length ? pagedList(ordered, lifeCard) : `<div class="life-empty">찾는 안내가 없어요.<p>다른 주제나 검색어로 찾아보세요.</p><a href="#/life">전체 안내 보기</a></div>`}</div></section>
    <p class="life-source-note">학생들이 수집한 생활 정보 ${all.length}건<br>각 안내에서 자료 확인일을 확인할 수 있어요.</p></div>`;
}

function bindLife() {
  const form = document.getElementById('lifeSearch');
  if (!form) return;
  form.onsubmit = e => {
    e.preventDefault();
    const query = document.getElementById('lifeQuery').value.trim();
    const params = new URLSearchParams();
    if (qs('topic')) params.set('topic', qs('topic'));
    if (query) params.set('q', query);
    const next = '#/life' + (params.size ? '?' + params.toString() : '');
    if (location.hash !== next) location.hash = next;
  };
}
function lifeRead(id) {
  const p = state.byId.get(id);
  if (!p || p.category !== '생활꿀팁') return notFound();
  recent.push(p.id);
  const group = lifeGroup(p), on = saved.has(id);
  const reasons = [...new Set(p.reasons.filter(r => r.trim()))];
  const links = [...new Set(reasons.flatMap(r => r.match(/https?:\/\/[^\s<>"']+/g) || []))].map(url => url.replace(/[).,，。]+$/, '')).filter(url => {try {return ['http:', 'https:'].includes(new URL(url).protocol);} catch {return false;}});
  const related = lifePlaces().filter(x => x.id !== id && lifeGroup(x).id === group.id).sort((a,b) => b.rec - a.rec).slice(0,3);
  return `<article class="life-article"><header class="head">${backBtn}<h1>학교생활 안내</h1><div class="head-actions"><button class="icon-btn heart ${on ? 'on' : ''}" id="lifeSave" aria-label="이 안내 찜" aria-pressed="${on}">${ICON.heart}</button></div></header>
    <div class="life-article-title"><span class="life-article-emoji">${group.emoji}</span><a class="life-eyebrow" href="#/life?topic=${group.id}">${group.name} ${ICON.right}</a><h1>${esc(p.name)}</h1><p>${hasCheckedDate(p) ? `${esc(p.checked)} 자료 확인` : '확인일 미등록'} · 수집 자료 추천 ${p.rec}건</p></div>
    ${p.credits?.[0]?.source === 'official' ? `<figure class="life-official-photo"><img src="${esc(p.photos[0])}" alt="${esc(p.credits[0].note)}" loading="lazy" decoding="async"><figcaption>${credit(p,0,true)}</figcaption></figure>` : ''}
    ${officialPanel(p)}
    <section class="life-reading"><h2>이렇게 이용해요</h2>${reasons.length ? reasons.map((text,i) => `<div class="life-reading-block">${reasons.length > 1 ? `<span>수집된 안내 ${i+1}</span>` : ''}<p>${esc(text)}</p></div>`).join('') : '<p>자세한 이용 방법은 아직 수집되지 않았어요.</p>'}</section>
    ${links.length ? `<section class="life-reference"><h2>자료에 있는 관련 링크</h2>${links.map(url => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span><b>${esc(new URL(url).hostname)}</b><small>${esc(new URL(url).pathname)}</small></span>${ICON.right}</a>`).join('')}</section>` : ''}
    ${p.address && ![UNKNOWN, '해당 없음'].includes(p.address) ? `<section class="life-reference"><h2>관련 위치</h2><p>${esc(p.address)}</p>${p.latlng ? `<a href="#/map?focus=${p.id}">${ICON.pin}지도에서 보기 ${ICON.right}</a>` : ''}</section>` : ''}
    <p class="life-source-note">학생들이 남긴 수집 자료를 그대로 모은 안내예요.<br>기간·요금·이용 조건은 관련 기관의 최신 안내를 확인하세요.</p>
    ${related.length ? `<section class="life-list"><div class="life-section-head"><h2>함께 알아두면 좋은 정보</h2><a href="#/life?topic=${group.id}">전체보기</a></div>${related.map(lifeCard).join('')}</section>` : ''}</article>`;
}
function bindLifeRead(id) {
  const button = document.getElementById('lifeSave');
  if (!button) return;
  button.classList.toggle('on', saved.has(id));
  button.setAttribute('aria-pressed', String(saved.has(id)));
  button.onclick = () => { const on = toggleSaved(id); button.classList.toggle('on',on); button.setAttribute('aria-pressed',String(on)); };
}


/* ---------- 길 찾기 (주소창 # 뒤로 화면을 고른다) ---------- */
// 화면 보관함: 앞으로 간 화면은 새로 그리고, 뒤로 돌아온 화면은 보관해 둔 그대로 다시 붙인다.
// 스크롤 위치·펼친 「더 보기」·입력한 검색어가 그대로 남는다 (배민처럼 보던 자리로 돌아옴).
history.scrollRestoration = 'manual';
const pages = new Map();   // 기록 번호 → { node, y, hash, resume }
const MAX_PAGES = 20;
let seq = 0;
state.cur = null;
const KEEP_ROOT = ['#/', '#/life', '#/explore'];   // 탭을 오가도 상태를 기억하는 화면 (홈)

function renderFresh(parts) {
  let html, after = () => {};
  switch (parts[0]) {
    case undefined: html = home(); after = bindHome; break;
    case 'c': html = category(parts[1]); after = bindCategory; break;
    case 'p': html = detail(parts[1]); after = () => bindDetail(parts[1]); break;
    case 'search': html = search(); after = bindSearch; break;
    case 'life': html = parts[1] === 'read' ? lifeRead(parts[2]) : lifePage(); after = parts[1] === 'read' ? () => bindLifeRead(parts[2]) : bindLife; break;
    case 'map':
      // 지도를 못 불러오면(인터넷·인증 문제) 지역별 목록으로 대신 보여준다
      if (qs('list') || loadNaverMaps.failed) html = mapList(qs('area', '교내'));
      else { html = mapPage(qs('cat', '전체')); after = () => bindMap(qs('cat', '전체'), qs('focus')); }
      break;
    case 'saved': html = savedView(); break;
    case 'recent': html = recentView(); after = () => document.getElementById('clearList')?.addEventListener('click', () => { recent.clear(); refresh(); }); break;
    case 'news': html = news(); break;
    case 'pick': html = pickPage(); after = bindPick; break;
    case 'explore': html = explorePage(); after = bindExplore; break;
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
  if (!state.ready) return;
  const path = location.hash.replace(/^#/, '').split('?')[0] || '/';
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const hash = location.hash || '#/';
  const isMap = parts[0] === 'map' && !qs('list') && !loadNaverMaps.failed;
  closeSheet();
  const previous = state.cur;
  const preserveFilters = previous && previous.hash.split('?')[0] === hash.split('?')[0] && ['life','c','explore'].includes(parts[0]) && !(parts[0] === 'life' && parts[1] === 'read');
  let filterScroll = preserveFilters ? window.scrollY : null;
  const horizontal = {};
  if (preserveFilters) previous.node.querySelectorAll('.life-topics,.sub-chips,.filter-bar').forEach(el => horizontal[el.className] = el.scrollLeft);

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
    entry = { node, y: 0, hash, idx, resume: ['p', 'life', 'explore'].includes(parts[0]) || !parts[0] ? after : null, map: isMap };
    view.append(node);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) node.animate([{opacity:0},{opacity:1}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
    after();
    if (isMap) state.mapEntry = entry;
  }
  entry.hash = hash;
  state.cur = entry;
  // 오래된 화면은 버린다
  while (pages.size > MAX_PAGES) pages.delete(pages.keys().next().value);

  // 상세·검색·위치 화면은 배민처럼 아래 탭을 숨긴다
  document.body.classList.toggle('no-tabbar', ['p', 'search', 'location'].includes(parts[0]) || (parts[0] === 'life' && parts[1] === 'read'));
  document.body.classList.remove('topbar-hidden');
  const TAB = { map: 'map', life: 'life', pick: 'home', explore: 'explore', my: 'my', saved: 'my', recent: 'my', about: 'my' };
  const tab = parts.length === 0 ? 'home' : TAB[parts[0]] || null;
  document.querySelectorAll('.tabbar a').forEach(a => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const name = parts[0] === 'p' ? state.byId.get(parts[1])?.name : parts[0] === 'life' && parts[1] === 'read' ? state.byId.get(parts[2])?.name : parts[0] === 'life' ? '학교생활' : null;
  document.title = name ? `${name} · 우리학교 가이드` : '우리학교 가이드 · 교통대 충주캠퍼스';
  if (preserveFilters) entry.node.querySelectorAll('.life-topics,.sub-chips,.filter-bar').forEach(el => { el.scrollLeft = horizontal[el.className] || 0; });
  // 분류를 바꿀 때 상단 소개를 다시 지나가지 않되, 새 결과의 처음부터 읽게 한다.
  if (preserveFilters) {
    const list = entry.node.querySelector(parts[0] === 'life' ? '.life-directory' : parts[0] === 'c' ? '.list-head' : '.explore');
    const stickyHeight = parts[0] === 'life' ? 60 + entry.node.querySelector('.life-topics').offsetHeight : parts[0] === 'c' ? 108 + entry.node.querySelector('.filter-bar').offsetHeight : entry.node.querySelector('.explore-search-head').offsetHeight;
    if (list) filterScroll = Math.min(filterScroll, Math.max(0, list.offsetTop - stickyHeight));
  }
  window.scrollTo(0, filterScroll ?? entry.y ?? 0);
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
    document.getElementById('boot')?.remove();
    view.setAttribute('aria-busy', 'false');
    state.ready = true;
    state.places = places;
    state.byId = new Map(places.map(p => [p.id, p]));
    route();
  })
  .catch(() => {
    view.setAttribute('aria-busy','false');
    view.innerHTML = `<div class="empty"><div class="big">${ICON.school}</div>가이드 정보를 불러오지 못했어요.<br>인터넷 연결을 확인하고 다시 시도해 주세요.<button class="btn-line retry-load" onclick="location.reload()">다시 불러오기</button></div>`;
  });
