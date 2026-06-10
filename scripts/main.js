/**
 * DAEEE・同行集 - Main Script (Complete)
 * Full CRUD for all modules: Diary, Album, Plan, Wishlist, Map
 */
(function() {
'use strict';

const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let token = localStorage.getItem('token');
let map = null;
let mapInitialized = false;
let visitedCityMarkers = [];
let footprintMarkers = [];
let currentCityId = null;
let clickedLatLng = null;
let clickMarker = null;
let selectedFile = null;
let coupleStatus = 'none';
let couplePartnerId = null;
let currentWishType = 'all';
let selectedDiaryFile = null;
let selectedAlbumPhoto = null;

const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

// ── Toast ────────────────────────────────────────────────
function initToast() {
  if (!$('#toast-container')) {
    const c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container';
    document.body.appendChild(c);
  }
}
window.showToast = function(msg, type='info', dur=3500) {
  const icons = {success:'fa-check-circle',error:'fa-exclamation-circle',info:'fa-info-circle',warning:'fa-exclamation-triangle'};
  const el = document.createElement('div'); el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type]||icons.info}"></i> ${msg}`;
  $('#toast-container').appendChild(el);
  setTimeout(() => { el.classList.add('removing'); el.addEventListener('animationend',()=>el.remove()); }, dur);
};

// ── Back to Top ──────────────────────────────────────────
function initBackToTop() {
  const btn = document.createElement('button'); btn.className = 'back-to-top';
  btn.innerHTML = '<i class="fas fa-arrow-up"></i>'; btn.title = '回到顶部';
  document.body.appendChild(btn);
  let ticking = false;
  window.addEventListener('scroll', () => {
    if(!ticking) { requestAnimationFrame(()=>{ btn.classList.toggle('visible',window.scrollY>500); ticking=false; }); ticking=true; }
  });
  btn.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
}

// ── Ripple ───────────────────────────────────────────────
function initRipple() {
  document.addEventListener('click', function(e) {
    const t = e.target.closest('.btn-primary,.btn-secondary,.ripple');
    if(!t) return;
    const r = document.createElement('span'); r.className = 'ripple-effect';
    const rect = t.getBoundingClientRect(); const s = Math.max(rect.width,rect.height);
    r.style.width = r.style.height = s+'px';
    r.style.left = (e.clientX-rect.left-s/2)+'px'; r.style.top = (e.clientY-rect.top-s/2)+'px';
    t.appendChild(r); r.addEventListener('animationend',()=>r.remove());
  });
}

// ── Scroll Reveal ────────────────────────────────────────
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('revealed'); obs.unobserve(e.target); } });
  }, {threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.stat-card,.quick-card,.diary-card,.wish-card,.album-item,.city-item,.section-header,.quote-card,.plan-item').forEach(el => {
    el.classList.add('reveal'); obs.observe(el);
  });
}

// ── Navbar ───────────────────────────────────────────────
function initNavbarScroll() {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if(!ticking){ requestAnimationFrame(()=>{ const n=$('#main-nav'); if(n)n.classList.toggle('scrolled',window.scrollY>50); ticking=false; }); ticking=true; }
  });
}

// ── Hero Particles ───────────────────────────────────────
function initHeroParticles() {
  const hero = $('.hero-section'); if(!hero) return;
  const c = document.createElement('div'); c.className = 'hero-particles'; hero.appendChild(c);
  for(let i=0;i<25;i++) {
    const p = document.createElement('div'); p.className = 'hero-particle';
    p.style.cssText = `width:${Math.random()*8+3}px;height:${Math.random()*8+3}px;left:${Math.random()*100}%;top:${Math.random()*60+40}%;animation-duration:${Math.random()*8+6}s;animation-delay:${Math.random()*5}s;opacity:${Math.random()*0.4+0.1}`;
    c.appendChild(p);
  }
}

// ── Animate Counter ──────────────────────────────────────
window.animateCounter = function(el, target, dur=1200) {
  const start = parseInt(el.textContent)||0; const st = performance.now();
  function upd(ct) { const p = Math.min((ct-st)/dur,1); const e = 1-Math.pow(1-p,3); el.textContent = Math.floor(start+(target-start)*e); if(p<1) requestAnimationFrame(upd); }
  requestAnimationFrame(upd);
};

// ── Lightbox ─────────────────────────────────────────────
function initLightbox() {
  let lb = $('#lightbox');
  if(!lb) {
    lb = document.createElement('div'); lb.id = 'lightbox'; lb.className = 'lightbox';
    lb.innerHTML = '<button class="lightbox-close"><i class="fas fa-times"></i></button><img src="" alt="预览">';
    document.body.appendChild(lb);
    lb.addEventListener('click', function(e){ if(e.target===lb||e.target.closest('.lightbox-close'))lb.classList.remove('active'); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape')lb.classList.remove('active'); });
  }
}
window.openLightbox = function(src) { const lb=$('#lightbox'); if(lb){lb.querySelector('img').src=src;lb.classList.add('active');} };

// ── Dark Mode ────────────────────────────────────────────
function initDarkMode() {
  const navRight = $('.nav-right'); if(!navRight) return;
  const toggle = document.createElement('button'); toggle.className = 'dark-toggle';
  toggle.innerHTML = '<i class="fas fa-moon"></i>'; toggle.title = '切换深色模式';
  navRight.insertBefore(toggle, navRight.firstChild);
  if(localStorage.getItem('darkMode')==='true') { document.body.classList.add('dark-mode'); toggle.innerHTML='<i class="fas fa-sun"></i>'; }
  toggle.addEventListener('click', ()=>{
    const d = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode',d); toggle.innerHTML = d?'<i class="fas fa-sun"></i>':'<i class="fas fa-moon"></i>';
  });
}

// ── Navigation ───────────────────────────────────────────
function switchSection(target) {
  $$('.section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(target);
  if(sec) { sec.classList.add('active'); if(target==='map') initMap(); }
  window.scrollTo({top:0,behavior:'smooth'});
}

function initNavigation() {
  const navToggle = $('#nav-toggle'), navLinks = $('.nav-links');
  if(navToggle) navToggle.addEventListener('click', ()=>{
    navLinks.classList.toggle('active');
    const i = navToggle.querySelector('i'); i.classList.toggle('fa-bars'); i.classList.toggle('fa-times');
  });

  $$('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      if(navLinks) { navLinks.classList.remove('active'); const i=navToggle?navToggle.querySelector('i'):null; if(i){i.classList.remove('fa-times');i.classList.add('fa-bars');} }
      $$('.nav-link').forEach(l=>l.classList.remove('active')); this.classList.add('active');
      switchSection(this.getAttribute('data-section'));
    });
  });

  $$('.btn-secondary[data-section]').forEach(btn => {
    btn.addEventListener('click', function(){
      const t = this.getAttribute('data-section');
      $$('.nav-link').forEach(l=>l.classList.remove('active'));
      const nl = document.querySelector(`[data-section="${t}"]`); if(nl)nl.classList.add('active');
      switchSection(t);
    });
  });

  // Modal close
  $$('.close-modal').forEach(c => c.addEventListener('click', function(){ this.closest('.modal').style.display='none'; clearFootprintSelection(); }));
  window.addEventListener('click', function(e){ if(e.target.classList.contains('modal')){ e.target.style.display='none'; clearFootprintSelection(); } });

  // Login/Register toggle
  $('#show-register').addEventListener('click', function(e){ e.preventDefault(); $('#login-modal').style.display='none'; $('#register-modal').style.display='block'; });
  $('#show-login').addEventListener('click', function(e){ e.preventDefault(); $('#register-modal').style.display='none'; $('#login-modal').style.display='block'; });

  // Cities stat card
  const csc = $('#cities-stat-card'); if(csc) csc.addEventListener('click', ()=>{ $$('.nav-link').forEach(l=>l.classList.remove('active')); const ml=document.querySelector('[data-section="map"]'); if(ml)ml.classList.add('active'); switchSection('map'); });
}

// ── Auth ─────────────────────────────────────────────────
function initAuth() {
  const loginForm = $('#login-form'), registerForm = $('#register-form');
  const loginMsg = $('#login-message'), registerMsg = $('#register-message');

  if(loginForm) loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    try {
      const r = await fetch(`${API_BASE}/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:$('#username').value,password:$('#password').value}) });
      const d = await r.json();
      if(r.ok) {
        token = d.token; currentUser = d.user;
        localStorage.setItem('token',token); localStorage.setItem('user',JSON.stringify(currentUser));
        loginMsg.textContent='登录成功！'; loginMsg.className='message success';
        setTimeout(()=>{ $('#login-modal').style.display='none'; loginMsg.textContent=''; loginMsg.className='message'; },1000);
        const bt = document.querySelector('#login-btn span'); if(bt) bt.textContent='退出';
        loadUserData(); showToast('登录成功！','success');
      } else { loginMsg.textContent = d.message||'登录失败'; loginMsg.className='message error'; }
    } catch { loginMsg.textContent='服务器连接失败'; loginMsg.className='message error'; }
  });

  if(registerForm) registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    try {
      const r = await fetch(`${API_BASE}/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:$('#reg-username').value,password:$('#reg-password').value,nickname:$('#reg-nickname').value,email:$('#reg-email').value}) });
      const d = await r.json();
      if(r.ok) {
        registerMsg.textContent='注册成功！请登录'; registerMsg.className='message success';
        showToast('注册成功！','success');
        setTimeout(()=>{ $('#register-modal').style.display='none'; $('#login-modal').style.display='block'; registerMsg.textContent=''; registerMsg.className='message'; registerForm.reset(); },1500);
      } else { registerMsg.textContent = d.message||'注册失败'; registerMsg.className='message error'; }
    } catch { registerMsg.textContent='服务器连接失败'; registerMsg.className='message error'; }
  });
}

function logout() {
  localStorage.removeItem('token'); localStorage.removeItem('user');
  token = null; currentUser = null;
  const bt = document.querySelector('#login-btn span'); if(bt) bt.textContent='登录';
  clearUserData(); showToast('已退出登录','info');
}

// ── Data Loading ─────────────────────────────────────────
async function loadUserData() {
  await Promise.all([loadStatistics(), loadVisitedCities(), loadProfile(), loadLatestDiary()]);
}

function clearUserData() {
  ['stat-trips','stat-cities','stat-diaries','stat-wishes'].forEach(id=>{ const e=$(id); if(e)e.textContent='0'; });
  const vt=$('#visited-text'); if(vt)vt.textContent='请登录查看足迹';
  const mm=$('#mini-map-markers'); if(mm)mm.innerHTML='';
  const vl=$('#visited-cities-list'); if(vl)vl.innerHTML='<div class="empty-state small"><p>请登录查看到访城市</p></div>';
  const pn=$('#profile-nickname'); if(pn)pn.textContent='未登录';
  const pu=$('#profile-username'); if(pu)pu.textContent='请先登录';
  const pe=$('#profile-email'); if(pe)pe.textContent='';
  $('#couple-none').style.display='block'; $('#couple-pending').style.display='none'; $('#couple-bound').style.display='none';
}

async function loadStatistics() {
  if(!token||!currentUser) return;
  try {
    const r = await fetch(`${API_BASE}/statistics/${currentUser.id}`, { headers:{'Authorization':`Bearer ${token}`} });
    const d = await r.json();
    const st=$('#stat-trips'),sc=$('#stat-cities'),sd=$('#stat-diaries'),sw=$('#stat-wishes');
    if(st)animateCounter(st,d.visitedCount||0); if(sc)animateCounter(sc,d.visitedCount||0);
    if(sd)animateCounter(sd,d.diaryCount||0); if(sw)animateCounter(sw,d.wishlistCompleted||0);
  } catch(e) { console.error('加载统计失败:',e); }
}

async function loadLatestDiary() {
  if(!token||!currentUser) return;
  try {
    const r = await fetch(`${API_BASE}/diaries`, { headers:{'Authorization':`Bearer ${token}`} });
    const diaries = await r.json();
    const ex = $('#latest-diary-excerpt'), dt = $('#latest-diary-date');
    if(diaries.length>0) {
      if(ex) ex.textContent = diaries[0].content ? diaries[0].content.substring(0,100)+'...' : '点击查看详情...';
      if(dt) dt.textContent = new Date(diaries[0].created_at).toLocaleDateString('zh-CN');
    }
  } catch(e) {}
}

// ── Cities ───────────────────────────────────────────────
async function loadCities() {
  try {
    const r = await fetch(`${API_BASE}/cities`); const cities = await r.json();
    ['city-select','footprint-city','diary-city-filter','diary-city'].forEach(id => {
      const sel = document.getElementById(id); if(!sel) return;
      while(sel.options.length>1) sel.remove(1);
      cities.forEach(c => { const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; sel.appendChild(o); });
    });
  } catch(e) { console.error('加载城市失败:',e); }
}

// ── Visited Cities ───────────────────────────────────────
async function loadVisitedCities() {
  if(!token||!currentUser) return;
  try {
    const r = await fetch(`${API_BASE}/visited-cities`, { headers:{'Authorization':`Bearer ${token}`} });
    const visited = await r.json();
    renderVisitedCities(visited); updateMiniMap(visited); if(map) updateMapMarkers(visited);
  } catch(e) { console.error('加载到访城市失败:',e); }
}

function renderVisitedCities(visited) {
  const list = $('#visited-cities-list'), vt = $('#visited-text');
  if(!list) return;
  if(!visited||visited.length===0) { list.innerHTML='<div class="empty-state small"><p>还没有到访任何城市</p><p class="hint">添加足迹点后自动记录到访城市</p></div>'; if(vt)vt.textContent='还没有到访任何城市'; return; }
  if(vt) vt.textContent = `已到访 ${visited.length} 座城市`;
  list.innerHTML = visited.map(c=>`<div class="city-item reveal"><span class="city-dot"></span><span>${c.city_name||'未知'}</span><span class="city-count">${c.visit_count||1}次</span><button class="city-delete" data-city-id="${c.city_id}"><i class="fas fa-trash"></i></button></div>`).join('');
  $$('.city-delete',list).forEach(btn => btn.addEventListener('click', async function(e){ e.stopPropagation();
    if(!confirm('确定删除该城市的所有足迹记录？')) return;
    try {
      const r = await fetch(`${API_BASE}/visited-cities/${this.getAttribute('data-city-id')}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
      if(r.ok) { showToast('已删除','success'); await Promise.all([loadVisitedCities(),loadStatistics()]); if(map){ map.setCenter([116.397428,39.90923]); map.setZoom(4); $('#city-select').value=''; currentCityId=null; clearFootprintMarkers(); clearVisitedMarkers(); } }
      else { const d=await r.json(); showToast('删除失败: '+(d.message||'未知错误'),'error'); }
    } catch { showToast('删除失败','error'); }
  }));
}

function updateMiniMap(visited) {
  const c = $('#mini-map-markers'); if(!c) return; c.innerHTML='';
  const pos = {1:{left:'22%',top:'45%'},10:{left:'32%',top:'52%'},15:{left:'32%',top:'55%'},28:{left:'22%',top:'53%'},30:{left:'20%',top:'58%'},34:{left:'18%',top:'65%'},35:{left:'20%',top:'68%'},43:{left:'8%',top:'50%'},44:{left:'10%',top:'48%'},52:{left:'15%',top:'40%'}};
  visited.forEach(city => { const p=pos[city.city_id]; if(p){ const m=document.createElement('div'); m.className='map-marker'; m.style.cssText=`left:${p.left};top:${p.top}`; m.innerHTML=`<span class="marker-tooltip">${city.city_name||''}</span>`; c.appendChild(m); } });
}

// ── Map ──────────────────────────────────────────────────
function initMap() { if(mapInitialized||typeof AMap==='undefined') return; mapInitialized=true;
  map = new AMap.Map('amap-container', { center:[116.397428,39.90923], zoom:4, resizeEnable:true, mapStyle:'amap://styles/light' });
  map.on('click', function(e) {
    if(!currentUser||!currentCityId) return;
    if(clickMarker) map.remove(clickMarker);
    clickMarker = new AMap.Marker({ position: new AMap.LngLat(e.lnglat.lng,e.lnglat.lat), icon: new AMap.Icon({ size: new AMap.Size(40,40), image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"%3E%3Ccircle cx="20" cy="20" r="18" fill="rgba(255,255,255,0.9)"/%3E%3Ccircle cx="20" cy="20" r="12" fill="%23C38D9E"/%3E%3Ccircle cx="20" cy="20" r="6" fill="white"/%3E%3C/svg%3E', imageSize: new AMap.Size(40,40) }), zIndex:1000, animation:'AMAP_ANIMATION_DROP' });
    map.add(clickMarker); clickedLatLng = {lng:e.lnglat.lng,lat:e.lnglat.lat};
    if(confirm(`确定要在该位置添加足迹点吗？\n坐标: (${e.lnglat.lng.toFixed(4)},${e.lnglat.lat.toFixed(4)})`)) {
      const fc=$('#footprint-city'); if(fc)fc.value=currentCityId;
      const m=$('#add-footprint-modal'); if(m)m.style.display='block';
      const msg=$('#footprint-message'); if(msg){msg.textContent=`已选择位置: (${e.lnglat.lng.toFixed(4)},${e.lnglat.lat.toFixed(4)})`;msg.className='message success';}
      const sb=document.querySelector('#footprint-form button[type="submit"]'); if(sb){sb.disabled=false;sb.classList.remove('disabled');}
      const rb=$('#reset-location-btn'); if(rb)rb.style.display='inline-block';
    } else { map.remove(clickMarker); clickMarker=null; clickedLatLng=null; }
  });
  const cs=$('#city-select'); if(cs) cs.addEventListener('change', async function(){ currentCityId=this.value?parseInt(this.value):null;
    if(currentCityId&&map){ const cities=await fetch(`${API_BASE}/cities`).then(r=>r.json()); const city=cities.find(c=>c.id===currentCityId); if(city){map.setCenter([city.longitude,city.latitude]);map.setZoom(12);loadFootprints(currentCityId);} }
    else if(map){ map.setCenter([116.397428,39.90923]); map.setZoom(4); clearFootprintMarkers(); }
  });
  loadVisitedCities();
}

function updateMapMarkers(visited) { clearVisitedMarkers(); if(!visited||!map) return;
  visited.forEach(city => { const isPartner=coupleStatus==='bound'&&couplePartnerId&&city.user_id===couplePartnerId; const sc=isPartner?'FFD166':'E8A87C';
    const marker = new AMap.Marker({ position:[city.longitude,city.latitude], icon: new AMap.Icon({ size:new AMap.Size(32,32), image:`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23${sc}" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/></svg>`, imageSize:new AMap.Size(32,32) }), title:(isPartner?'[伴侣] ':'')+(city.city_name||'') });
    marker.on('click', function(){ map.setCenter([city.longitude,city.latitude]); map.setZoom(12); const cs=$('#city-select'); if(cs)cs.value=city.city_id; currentCityId=city.city_id; loadFootprints(city.city_id); });
    map.add(marker); visitedCityMarkers.push(marker);
  });
}
function clearVisitedMarkers() { visitedCityMarkers.forEach(m=>map&&map.remove(m)); visitedCityMarkers=[]; }

async function loadFootprints(cityId) { if(!token||!map) return;
  try {
    const r = await fetch(`${API_BASE}/footprints/${cityId}`, { headers:{'Authorization':`Bearer ${token}`} });
    const footprints = await r.json(); clearFootprintMarkers();
    footprints.forEach((f,i) => { setTimeout(()=>{
      const isPartner=coupleStatus==='bound'&&couplePartnerId&&f.user_id===couplePartnerId; const mc=isPartner?'FFD166':'C38D9E';
      const marker = new AMap.Marker({ position:[f.longitude||0,f.latitude||0], icon: new AMap.Icon({ size:new AMap.Size(20,20), image:`data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Ccircle cx="12" cy="12" r="10" fill="white" stroke="%23${mc}" stroke-width="2"/%3E%3C/svg%3E`, imageSize:new AMap.Size(20,20) }), title:(isPartner?'[伴侣] ':'')+f.name, zIndex:100+i, animation:'AMAP_ANIMATION_DROP' });
      const imgHtml = f.image_url ? `<div style="position:relative;border-radius:12px;overflow:hidden;margin-bottom:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);cursor:pointer" onclick="openLightbox('http://localhost:3000${f.image_url}')"><img src="http://localhost:3000${f.image_url}" style="width:100%;height:160px;object-fit:cover"/><div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.6));padding:10px;color:white;font-size:12px"><i class="fas fa-search-plus" style="margin-right:4px"></i>点击查看大图</div></div>` : `<div style="height:120px;border-radius:12px;background:linear-gradient(135deg,#F5E6D3,#FFF8F0);display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:12px"><i class="fas fa-image" style="font-size:32px;color:#C38D9E;margin-bottom:8px"></i><span style="color:#999;font-size:13px">暂无图片</span></div>`;
      const iw = new AMap.InfoWindow({ isCustom:true, content:`<div style="width:280px;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);overflow:hidden;font-family:'Noto Sans SC',sans-serif"><div style="background:linear-gradient(135deg,#C38D9E,#E8A87C);padding:16px 20px;color:white"><h4 style="margin:0;font-size:18px;font-weight:600">${f.name}</h4><p style="margin:4px 0 0;font-size:13px;opacity:0.9">${f.city_name}</p></div><div style="padding:16px 20px"><p style="margin:0 0 12px;color:#666;font-size:14px;line-height:1.5">${f.description||''}</p>${imgHtml}<div style="display:flex;gap:10px"><button onclick="deleteFootprint(${f.id})" style="flex:1;padding:10px;background:linear-gradient(135deg,#E74C3C,#C0392B);color:white;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500"><i class="fas fa-trash"></i> 删除</button></div></div><div style="height:4px;background:linear-gradient(90deg,#C38D9E,#E8A87C)"></div></div>`, offset:new AMap.Pixel(0,-10) });
      marker.on('click',()=>iw.open(map,marker.getPosition())); map.add(marker); footprintMarkers.push({marker,iw:iw});
    }, i*150); });
  } catch(e) { console.error('加载足迹失败:',e); }
}
function clearFootprintMarkers() { footprintMarkers.forEach(item=>map&&map.remove(item.marker)); footprintMarkers=[]; }
function clearFootprintSelection() { const msg=$('#footprint-message'); if(msg){msg.textContent='';msg.className='message';} clickedLatLng=null; if(clickMarker&&map){map.remove(clickMarker);clickMarker=null;} }

window.deleteFootprint = async function(id) {
  if(!token) { showToast('请先登录','warning'); $('#login-modal').style.display='block'; return; }
  if(!confirm('确定删除这个足迹点吗？')) return;
  try {
    const r = await fetch(`${API_BASE}/footprints/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
    if(r.ok) { showToast('足迹已删除','success'); if(currentCityId) await Promise.all([loadFootprints(currentCityId),loadVisitedCities(),loadStatistics()]); }
    else { const d=await r.json(); showToast('删除失败: '+(d.message||'未知错误'),'error'); }
  } catch { showToast('删除失败','error'); }
};

// ── Footprint Form ───────────────────────────────────────
function initFootprintForm() {
  const addBtn = $('#add-footprint-btn'), modal = $('#add-footprint-modal'), form = $('#footprint-form');
  const message = $('#footprint-message'), submitBtn = form?form.querySelector('button[type="submit"]'):null;
  const resetBtn = $('#reset-location-btn'), uploadArea = $('#upload-area'), uploadInput = $('#footprint-image');

  if(resetBtn) resetBtn.addEventListener('click', ()=>{ clickedLatLng=null; if(clickMarker&&map){map.remove(clickMarker);clickMarker=null;} if(message){message.textContent='';message.className='message';} if(submitBtn){submitBtn.disabled=true;submitBtn.classList.add('disabled');} resetBtn.style.display='none'; if(modal)modal.style.display='none'; });
  if(addBtn) addBtn.addEventListener('click', ()=>{ if(!currentUser){showToast('请先登录','warning');$('#login-modal').style.display='block';return;} if(!currentCityId){showToast('请先选择城市','warning');return;} showToast('请在地图上点击选择位置','info'); if(map)map.setZoom(15); });
  if(form) form.addEventListener('submit', async function(e){ e.preventDefault();
    const cityId=$('#footprint-city').value, name=$('#footprint-name').value, desc=$('#footprint-desc').value;
    if(!cityId){ if(message){message.textContent='请选择城市';message.className='message error';} return; }
    if(!clickedLatLng){ if(message){message.textContent='请先在地图上选择位置';message.className='message error';} return; }
    if(!token){ if(message){message.textContent='请先登录';message.className='message error';} $('#login-modal').style.display='block'; return; }
    const fd = new FormData(); fd.append('city_id',cityId); fd.append('name',name); fd.append('description',desc); fd.append('latitude',clickedLatLng.lat); fd.append('longitude',clickedLatLng.lng); if(selectedFile) fd.append('image',selectedFile,selectedFile.name);
    try {
      const r = await fetch(`${API_BASE}/footprints`, { method:'POST', headers:{'Authorization':`Bearer ${token}`}, body:fd });
      if(r.ok) { if(message){message.textContent='足迹添加成功！';message.className='message success';} showToast('足迹添加成功！','success');
        setTimeout(async ()=>{ if(modal)modal.style.display='none'; if(message){message.textContent='';message.className='message';} form.reset(); resetUploadArea(); clickedLatLng=null; if(clickMarker&&map){map.remove(clickMarker);clickMarker=null;} await Promise.all([loadVisitedCities(),loadStatistics()]); if(currentCityId===parseInt(cityId))loadFootprints(currentCityId); },1500); }
      else { const d=await r.json(); if(message){message.textContent=d.message||'添加失败';message.className='message error';} }
    } catch { if(message){message.textContent='服务器连接失败';message.className='message error';} }
  });
  if(uploadArea&&uploadInput) {
    uploadArea.addEventListener('click',()=>uploadInput.click());
    uploadArea.addEventListener('dragover',function(e){e.preventDefault();this.classList.add('dragover');});
    uploadArea.addEventListener('dragleave',function(){this.classList.remove('dragover');});
    uploadArea.addEventListener('drop',function(e){e.preventDefault();this.classList.remove('dragover');const files=e.dataTransfer.files;if(files.length>0&&files[0].type.startsWith('image/')){const dt=new DataTransfer();dt.items.add(files[0]);uploadInput.files=dt.files;selectedFile=files[0];updateUploadArea(files[0].name);}});
    uploadInput.addEventListener('change',function(){ if(this.files.length>0){selectedFile=this.files[0];updateUploadArea(this.files[0].name);} else {selectedFile=null;resetUploadArea();} });
  }
}
function updateUploadArea(fn) { const a=$('#upload-area'); if(!a)return; const i=a.querySelector('.upload-icon'),t=a.querySelector('.upload-text'); if(i){i.className='fas fa-check upload-icon';} if(t){t.textContent=`已选择：${fn}`;} }
function resetUploadArea() { const a=$('#upload-area'); if(!a)return; const i=a.querySelector('.upload-icon'),t=a.querySelector('.upload-text'); if(i){i.className='fas fa-upload upload-icon';} if(t){t.textContent='点击或拖拽上传图片';} selectedFile=null; }

// ============================================================
// 旅行日记 CRUD
// ============================================================
async function loadDiaries(cityId) {
  if(!token) return;
  try {
    let url = `${API_BASE}/diaries`; if(cityId) url += `?city_id=${cityId}`;
    const r = await fetch(url, { headers:{'Authorization':`Bearer ${token}`} });
    const diaries = await r.json();
    const list = $('#diary-list'); if(!list) return;
    if(!diaries.length) { list.innerHTML = '<div class="empty-state"><i class="fas fa-book-open"></i><p>还没有日记，开始记录你的旅行故事吧</p></div>'; return; }
    list.innerHTML = diaries.map(d => `
      <div class="diary-card reveal">
        ${d.cover_image ? `<div class="diary-cover"><img src="http://localhost:3000${d.cover_image}" alt="${d.title}"></div>` : ''}
        <div class="diary-info">
          <h3>${d.title}</h3>
          <div class="diary-meta"><i class="fas fa-user"></i> ${d.author_nickname||'我'} ${d.city_name?`<i class="fas fa-map-marker-alt"></i> ${d.city_name}`:''} <i class="fas fa-calendar"></i> ${new Date(d.created_at).toLocaleDateString('zh-CN')}</div>
          <p class="diary-preview">${(d.content||'').substring(0,150)}...</p>
          <div class="diary-actions">
            <button class="btn-secondary btn-sm view-diary" data-id="${d.id}"><i class="fas fa-eye"></i> 查看</button>
            ${d.user_id===currentUser.id ? `<button class="btn-secondary btn-sm edit-diary" data-id="${d.id}"><i class="fas fa-edit"></i> 编辑</button><button class="btn-secondary btn-sm delete-diary" data-id="${d.id}" style="color:#E74C3C;"><i class="fas fa-trash"></i> 删除</button>` : ''}
          </div>
        </div>
      </div>
    `).join('');
    // Bind events
    $$('.view-diary',list).forEach(b=>b.addEventListener('click',()=>viewDiary(b.getAttribute('data-id'))));
    $$('.edit-diary',list).forEach(b=>b.addEventListener('click',()=>editDiary(b.getAttribute('data-id'))));
    $$('.delete-diary',list).forEach(b=>b.addEventListener('click',()=>deleteDiary(b.getAttribute('data-id'))));
  } catch(e) { console.error('加载日记失败:',e); }
}

async function viewDiary(id) {
  try {
    const r = await fetch(`${API_BASE}/diaries/${id}`, { headers:{'Authorization':`Bearer ${token}`} });
    const d = await r.json();
    showToast(`📖 ${d.title} - ${d.content?d.content.substring(0,80)+'...':''}`,'info',5000);
    if(d.cover_image) openLightbox('http://localhost:3000'+d.cover_image);
  } catch { showToast('加载日记详情失败','error'); }
}

function initDiaryEvents() {
  const newBtn = $('#new-diary-btn'), modal = $('#diary-modal'), form = $('#diary-form');
  const cityFilter = $('#diary-city-filter'), uploadArea = $('#diary-upload-area'), uploadInput = $('#diary-cover-image');

  if(newBtn) newBtn.addEventListener('click', ()=>{ if(!token){ showToast('请先登录','warning'); $('#login-modal').style.display='block'; return; } $('#diary-edit-id').value=''; $('#diary-modal-title').textContent='写日记'; form.reset(); modal.style.display='block'; });

  if(cityFilter) cityFilter.addEventListener('change', ()=>loadDiaries(cityFilter.value||null));

  if(form) form.addEventListener('submit', async function(e){ e.preventDefault();
    const editId = $('#diary-edit-id').value;
    const fd = new FormData();
    fd.append('title', $('#diary-title').value);
    fd.append('content', $('#diary-content').value);
    fd.append('city_id', $('#diary-city').value);
    fd.append('privacy_level', $('#diary-privacy').value);
    if(selectedDiaryFile) fd.append('cover_image', selectedDiaryFile, selectedDiaryFile.name);

    try {
      const url = editId ? `${API_BASE}/diaries/${editId}` : `${API_BASE}/diaries`;
      const method = editId ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers:{'Authorization':`Bearer ${token}`}, body:fd });
      const d = await r.json();
      if(r.ok) { showToast(editId?'日记更新成功':'日记创建成功！','success'); modal.style.display='none'; form.reset(); selectedDiaryFile=null; resetDiaryUpload(); loadDiaries(cityFilter?cityFilter.value:null); loadStatistics(); loadLatestDiary(); }
      else { $('#diary-message').textContent=d.message||'操作失败'; $('#diary-message').className='message error'; }
    } catch { $('#diary-message').textContent='服务器连接失败'; $('#diary-message').className='message error'; }
  });

  $$('.close-diary-modal').forEach(b=>b.addEventListener('click',()=>{ $('#diary-modal').style.display='none'; selectedDiaryFile=null; resetDiaryUpload(); }));

  if(uploadArea&&uploadInput) {
    uploadArea.addEventListener('click',()=>uploadInput.click());
    uploadInput.addEventListener('change',function(){ if(this.files.length>0){ selectedDiaryFile=this.files[0]; const t=uploadArea.querySelector('.upload-text'); if(t)t.textContent='已选择：'+this.files[0].name; } else { selectedDiaryFile=null; resetDiaryUpload(); } });
  }
}

function resetDiaryUpload() { const t=$('#diary-upload-area .upload-text'); if(t)t.textContent='点击上传封面图片'; selectedDiaryFile=null; }

async function editDiary(id) {
  try {
    const r = await fetch(`${API_BASE}/diaries/${id}`, { headers:{'Authorization':`Bearer ${token}`} });
    const d = await r.json();
    $('#diary-edit-id').value = d.id;
    $('#diary-modal-title').textContent = '编辑日记';
    $('#diary-title').value = d.title||'';
    $('#diary-content').value = d.content||'';
    $('#diary-city').value = d.city_id||'';
    $('#diary-privacy').value = d.privacy_level||'private';
    $('#diary-modal').style.display = 'block';
  } catch { showToast('加载日记失败','error'); }
}

async function deleteDiary(id) {
  if(!confirm('确定删除这篇日记吗？此操作不可撤销。')) return;
  try {
    const r = await fetch(`${API_BASE}/diaries/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
    if(r.ok) { showToast('日记已删除','success'); const cf=$('#diary-city-filter'); loadDiaries(cf?cf.value:null); loadStatistics(); loadLatestDiary(); }
    else { const d=await r.json(); showToast('删除失败: '+(d.message||'未知错误'),'error'); }
  } catch { showToast('删除失败','error'); }
}

// ============================================================
// 素材相册 CRUD
// ============================================================
async function loadAlbums() {
  if(!token) return;
  try {
    const r = await fetch(`${API_BASE}/albums`, { headers:{'Authorization':`Bearer ${token}`} });
    const albums = await r.json();
    const grid = $('#album-grid'); if(!grid) return;
    if(!albums.length) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><p>还没有相册，创建一个吧</p></div>'; return; }
    grid.innerHTML = albums.map(a => `
      <div class="album-item reveal" data-id="${a.id}">
        ${a.latest_photo ? `<img src="http://localhost:3000${a.latest_photo}" alt="${a.name}">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#F5E6D3,#FFF8F0);display:flex;align-items:center;justify-content:center"><i class="fas fa-images" style="font-size:3rem;color:#C38D9E;opacity:0.5"></i></div>`}
        <div class="album-overlay">
          <div style="text-align:center;color:white">
            <h4 style="margin:0 0 4px">${a.name}</h4>
            <span style="font-size:0.85rem;opacity:0.8">${a.photo_count||0} 张照片</span>
            <div style="margin-top:8px;display:flex;gap:8px;justify-content:center">
              <button class="btn-primary btn-sm view-album" data-id="${a.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem"><i class="fas fa-eye"></i> 查看</button>
              ${a.user_id===currentUser.id ? `<button class="btn-danger btn-sm delete-album" data-id="${a.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem"><i class="fas fa-trash"></i></button>` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
    $$('.view-album',grid).forEach(b=>b.addEventListener('click',function(e){e.stopPropagation();openAlbumDetail(this.getAttribute('data-id'));}));
    $$('.delete-album',grid).forEach(b=>b.addEventListener('click',function(e){e.stopPropagation();deleteAlbum(this.getAttribute('data-id'));}));
  } catch(e) { console.error('加载相册失败:',e); }
}

async function openAlbumDetail(albumId) {
  $('#current-album-id').value = albumId;
  $('#album-detail-modal').style.display = 'block';
  try {
    const [albumR, photosR] = await Promise.all([
      fetch(`${API_BASE}/albums`, { headers:{'Authorization':`Bearer ${token}`} }),
      fetch(`${API_BASE}/albums/${albumId}/photos`, { headers:{'Authorization':`Bearer ${token}`} })
    ]);
    const albums = await albumR.json(); const album = albums.find(a=>a.id===parseInt(albumId));
    const photos = await photosR.json();
    $('#album-detail-title').textContent = album ? album.name : '相册详情';
    const grid = $('#album-photo-grid'); if(!grid) return;
    if(!photos.length) { grid.innerHTML = '<div class="empty-state small"><p>相册中还没有照片</p></div>'; return; }
    grid.innerHTML = photos.map(p => `
      <div class="album-item reveal" style="aspect-ratio:1">
        <img src="http://localhost:3000${p.url}" alt="${p.caption||''}" onclick="openLightbox('http://localhost:3000${p.url}')">
        ${p.user_id===currentUser.id ? `<button class="photo-delete-btn" data-id="${p.id}" style="position:absolute;top:8px;right:8px;background:rgba(231,76,60,0.9);color:white;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;z-index:10"><i class="fas fa-trash"></i></button>` : ''}
      </div>
    `).join('');
    $$('.photo-delete-btn',grid).forEach(b=>b.addEventListener('click',function(e){e.stopPropagation();deletePhoto(this.getAttribute('data-id'),albumId);}));
  } catch(e) { console.error('加载相册详情失败:',e); }
}

async function deleteAlbum(id) {
  if(!confirm('确定删除整个相册及其所有照片吗？此操作不可撤销。')) return;
  try {
    const r = await fetch(`${API_BASE}/albums/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
    if(r.ok) { showToast('相册已删除','success'); loadAlbums(); $('#album-detail-modal').style.display='none'; }
    else { const d=await r.json(); showToast('删除失败: '+(d.message||''),'error'); }
  } catch { showToast('删除失败','error'); }
}

async function deletePhoto(id, albumId) {
  if(!confirm('确定删除这张照片吗？')) return;
  try {
    const r = await fetch(`${API_BASE}/photos/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
    if(r.ok) { showToast('照片已删除','success'); openAlbumDetail(albumId); loadAlbums(); }
    else { const d=await r.json(); showToast('删除失败: '+(d.message||''),'error'); }
  } catch { showToast('删除失败','error'); }
}

function initAlbumEvents() {
  const newBtn = $('#new-album-btn'), modal = $('#album-modal'), form = $('#album-form');
  if(newBtn) newBtn.addEventListener('click', ()=>{ if(!token){ showToast('请先登录','warning');$('#login-modal').style.display='block';return; } $('#album-edit-id').value=''; $('#album-modal-title').textContent='创建相册'; form.reset(); modal.style.display='block'; });
  if(form) form.addEventListener('submit', async function(e){ e.preventDefault();
    const editId = $('#album-edit-id').value;
    const body = JSON.stringify({ name:$('#album-name').value, description:$('#album-desc').value });
    try {
      const url = editId ? `${API_BASE}/albums/${editId}` : `${API_BASE}/albums`;
      const r = await fetch(url, { method:editId?'PUT':'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body });
      const d = await r.json();
      if(r.ok) { showToast(editId?'相册更新成功':'相册创建成功！','success'); modal.style.display='none'; form.reset(); loadAlbums(); }
      else { $('#album-form-message').textContent=d.message||'操作失败'; $('#album-form-message').className='message error'; }
    } catch { $('#album-form-message').textContent='服务器连接失败'; $('#album-form-message').className='message error'; }
  });
  $$('.close-album-modal').forEach(b=>b.addEventListener('click',()=>$('#album-modal').style.display='none'));

  const photoInput = $('#album-photo-input');
  if(photoInput) photoInput.addEventListener('change', async function(){
    const albumId = $('#current-album-id').value; if(!this.files.length||!albumId) return;
    const fd = new FormData(); fd.append('image', this.files[0]);
    try {
      const r = await fetch(`${API_BASE}/albums/${albumId}/photos`, { method:'POST', headers:{'Authorization':`Bearer ${token}`}, body:fd });
      if(r.ok) { showToast('照片上传成功！','success'); openAlbumDetail(albumId); loadAlbums(); }
      else { const d=await r.json(); showToast(d.message||'上传失败','error'); }
    } catch { showToast('上传失败','error'); }
  });

  $('#album-upload-area').addEventListener('click', ()=>$('#album-photo-input').click());
}

// ============================================================
// 行程规划 CRUD
// ============================================================
let currentPlanId = null;

async function loadPlans() {
  if(!token) return;
  try {
    const r = await fetch(`${API_BASE}/plans`, { headers:{'Authorization':`Bearer ${token}`} });
    const plans = await r.json();
    const list = $('#plan-list'); if(!list) return;
    if(!plans.length) { list.innerHTML = '<div class="empty-state small"><p>暂无行程规划</p></div>'; $('#plan-detail').innerHTML='<div class="empty-state"><i class="fas fa-map"></i><p>选择一个行程查看详情</p></div>'; return; }
    list.innerHTML = plans.map(p => `
      <div class="plan-item reveal" data-id="${p.id}">
        <span class="plan-dot"></span>
        <span>${p.title}</span>
        <span class="plan-status" style="background:${p.status==='completed'?'#D4EDDA':p.status==='in_progress'?'#FFF3CD':'#F5E6D3'};color:${p.status==='completed'?'#155724':p.status==='in_progress'?'#B8860B':'#E8A87C'}">${p.status==='planning'?'规划中':p.status==='in_progress'?'进行中':'已完成'}</span>
      </div>
    `).join('');
    $$('.plan-item',list).forEach(item=>item.addEventListener('click',()=>selectPlan(item.getAttribute('data-id'))));
  } catch(e) { console.error('加载行程失败:',e); }
}

async function selectPlan(planId) {
  currentPlanId = parseInt(planId);
  try {
    const [planR, daysR] = await Promise.all([
      fetch(`${API_BASE}/plans`, { headers:{'Authorization':`Bearer ${token}`} }),
      fetch(`${API_BASE}/plans/${planId}/days`, { headers:{'Authorization':`Bearer ${token}`} })
    ]);
    const plans = await planR.json(); const plan = plans.find(p=>p.id===parseInt(planId));
    const days = await daysR.json();
    if(!plan) return;
    const detail = $('#plan-detail');
    detail.innerHTML = `
      <div class="plan-header">
        <h3>${plan.title}</h3>
        <div class="plan-meta">
          ${plan.start_date?`<span><i class="fas fa-calendar-check"></i> ${plan.start_date} ~ ${plan.end_date||''}</span>`:''}
          <span><i class="fas fa-tag"></i> ${plan.status==='planning'?'规划中':plan.status==='in_progress'?'进行中':'已完成'}</span>
          ${plan.budget?`<span><i class="fas fa-coins"></i> ¥${plan.budget}</span>`:''}
          <span style="color:${plan.author_nickname!==currentUser.nickname?'#FFD166':''}"><i class="fas fa-user"></i> ${plan.author_nickname||'我'}</span>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:1rem">
          ${plan.user_id===currentUser.id ? `<button class="btn-secondary btn-sm edit-plan-btn" data-id="${plan.id}"><i class="fas fa-edit"></i> 编辑</button><button class="btn-secondary btn-sm delete-plan-btn" data-id="${plan.id}" style="color:#E74C3C"><i class="fas fa-trash"></i> 删除</button>` : ''}
          <button class="btn-primary btn-sm add-day-btn" data-id="${plan.id}"><i class="fas fa-plus"></i> 添加天数</button>
        </div>
      </div>
      <div class="daily-plan">
        ${days.length ? days.map(day => `
          <div class="day-card reveal" style="background:rgba(255,255,255,0.6);border-radius:12px;padding:1rem;margin-bottom:1rem;border:1px solid rgba(232,168,124,0.15)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
              <h4 style="margin:0"><i class="fas fa-sun" style="color:#E8A87C;margin-right:8px"></i>第${day.day_number}天 ${day.title||''}</h4>
              ${plan.user_id===currentUser.id ? `<button class="btn-secondary btn-sm delete-day-btn" data-day-id="${day.id}" style="color:#E74C3C;font-size:0.75rem"><i class="fas fa-trash"></i></button>` : ''}
            </div>
            ${day.items&&day.items.length ? day.items.map(item => `
              <div class="schedule-item reveal" style="display:flex;gap:1rem;padding:0.5rem;border-radius:8px;margin-bottom:4px;background:rgba(255,255,255,0.5)">
                <span style="width:80px;color:#E8A87C;font-weight:700;font-size:0.85rem">${item.time_slot||'全天'}</span>
                <div style="flex:1"><span style="font-weight:500;color:#4A4A4A">${item.title}</span>${item.description?`<br><span style="color:#999;font-size:0.8rem">${item.description}</span>`:''}${item.location?`<br><span style="color:#C38D9E;font-size:0.8rem"><i class="fas fa-map-marker-alt"></i> ${item.location}</span>`:''}</div>
                ${plan.user_id===currentUser.id ? `<button class="btn-secondary btn-sm edit-item-btn" data-item-id="${item.id}" data-day-id="${day.id}" style="font-size:0.7rem;padding:0.2rem 0.5rem"><i class="fas fa-edit"></i></button><button class="btn-secondary btn-sm delete-item-btn" data-item-id="${item.id}" style="font-size:0.7rem;padding:0.2rem 0.5rem;color:#E74C3C"><i class="fas fa-trash"></i></button>` : ''}
              </div>
            `).join('') : '<p style="color:#999;font-size:0.85rem">暂无安排</p>'}
            ${plan.user_id===currentUser.id ? `<button class="btn-secondary btn-sm add-item-btn" data-day-id="${day.id}" style="margin-top:0.5rem"><i class="fas fa-plus"></i> 添加项目</button>` : ''}
          </div>
        `).join('') : '<p style="color:#999;text-align:center">尚未添加日程安排，点击"添加天数"开始规划</p>'}
      </div>
    `;
    // Bind plan events
    $$('.edit-plan-btn',detail).forEach(b=>b.addEventListener('click',()=>editPlan(b.getAttribute('data-id'))));
    $$('.delete-plan-btn',detail).forEach(b=>b.addEventListener('click',()=>deletePlan(b.getAttribute('data-id'))));
    $$('.add-day-btn',detail).forEach(b=>b.addEventListener('click',()=>addDay(b.getAttribute('data-id'))));
    $$('.delete-day-btn',detail).forEach(b=>b.addEventListener('click',()=>deleteDay(b.getAttribute('data-day-id'))));
    $$('.add-item-btn',detail).forEach(b=>b.addEventListener('click',()=>openPlanItemModal(b.getAttribute('data-day-id'))));
    $$('.edit-item-btn',detail).forEach(b=>b.addEventListener('click',()=>editPlanItem(b.getAttribute('data-item-id'),b.getAttribute('data-day-id'))));
    $$('.delete-item-btn',detail).forEach(b=>b.addEventListener('click',()=>deletePlanItem(b.getAttribute('data-item-id'))));
  } catch(e) { console.error('加载行程详情失败:',e); }
}

function initPlanEvents() {
  $('#new-plan-btn').addEventListener('click', ()=>{ if(!token){ showToast('请先登录','warning');$('#login-modal').style.display='block';return; } $('#plan-edit-id').value=''; $('#plan-modal-title').textContent='新建行程'; $('#plan-form').reset(); $('#plan-modal').style.display='block'; });
  $('#plan-form').addEventListener('submit', async function(e){ e.preventDefault();
    const editId = $('#plan-edit-id').value;
    const body = JSON.stringify({ title:$('#plan-title').value, start_date:$('#plan-start').value||null, end_date:$('#plan-end').value||null, budget:$('#plan-budget').value||null, status:$('#plan-status').value });
    try {
      const url = editId ? `${API_BASE}/plans/${editId}` : `${API_BASE}/plans`;
      const r = await fetch(url, { method:editId?'PUT':'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body });
      const d = await r.json();
      if(r.ok) { showToast(editId?'行程更新成功':'行程创建成功！','success'); $('#plan-modal').style.display='none'; loadPlans(); if(currentPlanId) selectPlan(currentPlanId); }
      else { $('#plan-message').textContent=d.message||'操作失败'; $('#plan-message').className='message error'; }
    } catch { $('#plan-message').textContent='服务器连接失败'; $('#plan-message').className='message error'; }
  });
  $$('.close-plan-modal').forEach(b=>b.addEventListener('click',()=>$('#plan-modal').style.display='none'));

  // Plan item form
  $('#plan-item-form').addEventListener('submit', async function(e){ e.preventDefault();
    const dayId = $('#plan-item-day-id').value; const editId = $('#plan-item-edit-id').value;
    const body = JSON.stringify({ time_slot:$('#plan-item-time').value, title:$('#plan-item-title').value, description:$('#plan-item-desc').value, location:$('#plan-item-location').value });
    try {
      const url = editId ? `${API_BASE}/plans/items/${editId}` : `${API_BASE}/plans/days/${dayId}/items`;
      const r = await fetch(url, { method:editId?'PUT':'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body });
      if(r.ok) { showToast(editId?'项目更新成功':'项目添加成功！','success'); $('#plan-item-modal').style.display='none'; this.reset(); if(currentPlanId) selectPlan(currentPlanId); }
      else { const d=await r.json(); showToast(d.message||'操作失败','error'); }
    } catch { showToast('服务器连接失败','error'); }
  });
  $$('.close-plan-item-modal').forEach(b=>b.addEventListener('click',()=>$('#plan-item-modal').style.display='none'));
}

async function editPlan(id) {
  try {
    const r = await fetch(`${API_BASE}/plans`, { headers:{'Authorization':`Bearer ${token}`} });
    const plans = await r.json(); const plan = plans.find(p=>p.id===parseInt(id));
    if(!plan) return;
    $('#plan-edit-id').value = plan.id; $('#plan-modal-title').textContent = '编辑行程';
    $('#plan-title').value = plan.title||''; $('#plan-start').value = plan.start_date?plan.start_date.split('T')[0]:'';
    $('#plan-end').value = plan.end_date?plan.end_date.split('T')[0]:''; $('#plan-budget').value = plan.budget||'';
    $('#plan-status').value = plan.status||'planning'; $('#plan-modal').style.display='block';
  } catch { showToast('加载行程失败','error'); }
}

async function deletePlan(id) {
  if(!confirm('确定删除这个行程吗？此操作不可撤销。')) return;
  try {
    const r = await fetch(`${API_BASE}/plans/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
    if(r.ok) { showToast('行程已删除','success'); currentPlanId=null; loadPlans(); $('#plan-detail').innerHTML='<div class="empty-state"><i class="fas fa-map"></i><p>选择一个行程查看详情</p></div>'; }
    else { const d=await r.json(); showToast('删除失败: '+(d.message||''),'error'); }
  } catch { showToast('删除失败','error'); }
}

async function addDay(planId) {
  const dayNum = prompt('请输入第几天（数字）:'); if(!dayNum) return;
  const title = prompt('给这一天起个名字（可选）:',`第${dayNum}天`);
  try {
    const r = await fetch(`${API_BASE}/plans/${planId}/days`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify({day_number:parseInt(dayNum),date:null,title:title||`第${dayNum}天`}) });
    if(r.ok) { showToast('天数添加成功','success'); selectPlan(planId); }
    else { const d=await r.json(); showToast(d.message||'添加失败','error'); }
  } catch { showToast('添加失败','error'); }
}

async function deleteDay(dayId) {
  if(!confirm('确定删除这一天的所有安排吗？')) return;
  try {
    const r = await fetch(`${API_BASE}/plans/days/${dayId}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
    if(r.ok) { showToast('已删除','success'); if(currentPlanId) selectPlan(currentPlanId); }
    else { const d=await r.json(); showToast('删除失败: '+(d.message||''),'error'); }
  } catch { showToast('删除失败','error'); }
}

function openPlanItemModal(dayId) { $('#plan-item-day-id').value=dayId; $('#plan-item-edit-id').value=''; $('#plan-item-modal-title').textContent='添加日程'; $('#plan-item-form').reset(); $('#plan-item-modal').style.display='block'; }

async function editPlanItem(itemId, dayId) {
  try {
    const r = await fetch(`${API_BASE}/plans/${currentPlanId}/days`, { headers:{'Authorization':`Bearer ${token}`} });
    const days = await r.json();
    for(const day of days) {
      const item = (day.items||[]).find(i=>i.id===parseInt(itemId));
      if(item) {
        $('#plan-item-day-id').value = day.id; $('#plan-item-edit-id').value = item.id;
        $('#plan-item-modal-title').textContent = '编辑日程';
        $('#plan-item-time').value = item.time_slot||''; $('#plan-item-title').value = item.title||'';
        $('#plan-item-desc').value = item.description||''; $('#plan-item-location').value = item.location||'';
        $('#plan-item-modal').style.display='block'; return;
      }
    }
  } catch { showToast('加载项目失败','error'); }
}

async function deletePlanItem(itemId) {
  if(!confirm('确定删除这个日程项目吗？')) return;
  try {
    const r = await fetch(`${API_BASE}/plans/items/${itemId}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
    if(r.ok) { showToast('已删除','success'); if(currentPlanId) selectPlan(currentPlanId); }
    else { const d=await r.json(); showToast('删除失败: '+(d.message||''),'error'); }
  } catch { showToast('删除失败','error'); }
}

// ============================================================
// 心愿清单 CRUD
// ============================================================
async function loadWishlist(type) {
  if(!token) return;
  try {
    let url = `${API_BASE}/wishlist`; if(type&&type!=='all') url += `?type=${type}`;
    const r = await fetch(url, { headers:{'Authorization':`Bearer ${token}`} });
    const items = await r.json();
    const grid = $('#wishlist-grid'); if(!grid) return;
    if(!items.length) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>还没有心愿，添加一个吧</p></div>'; }
    else {
      grid.innerHTML = items.map(w => `
        <div class="wish-card reveal ${w.is_completed?'completed':''}">
          <div class="wish-content">
            <h3>${w.title} ${w.is_completed?'<span style="color:#27AE60;font-size:0.8rem">✓ 已完成</span>':''}</h3>
            <p>${w.description||'暂无描述'}</p>
            <div class="wish-meta">
              <span class="priority ${w.priority}">${w.priority==='high'?'高优先':w.priority==='medium'?'中等':'低优先'}</span>
              <span style="font-size:0.8rem;color:#999">${w.type==='destination'?'目的地':w.type==='experience'?'体验项目':'特色美食'} · ${w.author_nickname||'我'}</span>
            </div>
            ${w.user_id===currentUser.id ? `
            <div style="display:flex;gap:6px;margin-top:10px">
              ${!w.is_completed ? `<button class="btn-secondary btn-sm complete-wish" data-id="${w.id}" style="color:#27AE60"><i class="fas fa-check"></i> 完成</button>` : `<button class="btn-secondary btn-sm uncomplete-wish" data-id="${w.id}" style="color:#F39C12"><i class="fas fa-undo"></i> 取消完成</button>`}
              <button class="btn-secondary btn-sm edit-wish" data-id="${w.id}"><i class="fas fa-edit"></i> 编辑</button>
              <button class="btn-secondary btn-sm delete-wish" data-id="${w.id}" style="color:#E74C3C"><i class="fas fa-trash"></i> 删除</button>
            </div>` : ''}
          </div>
        </div>
      `).join('');
      $$('.edit-wish',grid).forEach(b=>b.addEventListener('click',()=>editWish(b.getAttribute('data-id'))));
      $$('.delete-wish',grid).forEach(b=>b.addEventListener('click',()=>deleteWish(b.getAttribute('data-id'))));
      $$('.complete-wish',grid).forEach(b=>b.addEventListener('click',()=>toggleWishComplete(b.getAttribute('data-id'),true)));
      $$('.uncomplete-wish',grid).forEach(b=>b.addEventListener('click',()=>toggleWishComplete(b.getAttribute('data-id'),false)));
    }
    // Update stats
    const total = items.length; const done = items.filter(w=>w.is_completed).length;
    const totalEl=$('#wish-total'),doneEl=$('#wish-done'),pendEl=$('#wish-pending');
    if(totalEl)totalEl.textContent=total; if(doneEl)doneEl.textContent=done; if(pendEl)pendEl.textContent=total-done;
  } catch(e) { console.error('加载心愿清单失败:',e); }
}

function initWishlistEvents() {
  const tabs = $$('.wishlist-tabs .tab-btn');
  tabs.forEach(tab => tab.addEventListener('click', function(){
    tabs.forEach(t=>t.classList.remove('active')); this.classList.add('active');
    currentWishType = this.getAttribute('data-type'); loadWishlist(currentWishType);
  }));

  $('#new-wish-btn').addEventListener('click', ()=>{ if(!token){ showToast('请先登录','warning');$('#login-modal').style.display='block';return; } $('#wish-edit-id').value=''; $('#wish-modal-title').textContent='添加心愿'; $('#wish-form').reset(); $('#wish-modal').style.display='block'; });

  $('#wish-form').addEventListener('submit', async function(e){ e.preventDefault();
    const editId = $('#wish-edit-id').value;
    const body = JSON.stringify({ title:$('#wish-title').value, type:$('#wish-type').value, description:$('#wish-desc').value, priority:$('#wish-priority').value });
    try {
      const url = editId ? `${API_BASE}/wishlist/${editId}` : `${API_BASE}/wishlist`;
      const r = await fetch(url, { method:editId?'PUT':'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body });
      const d = await r.json();
      if(r.ok) { showToast(editId?'心愿更新成功':'心愿添加成功！','success'); $('#wish-modal').style.display='none'; loadWishlist(currentWishType); loadStatistics(); }
      else { $('#wish-message').textContent=d.message||'操作失败'; $('#wish-message').className='message error'; }
    } catch { $('#wish-message').textContent='服务器连接失败'; $('#wish-message').className='message error'; }
  });
  $$('.close-wish-modal').forEach(b=>b.addEventListener('click',()=>$('#wish-modal').style.display='none'));
}

async function editWish(id) {
  try {
    const r = await fetch(`${API_BASE}/wishlist`, { headers:{'Authorization':`Bearer ${token}`} });
    const items = await r.json(); const w = items.find(i=>i.id===parseInt(id));
    if(!w) return;
    $('#wish-edit-id').value=w.id; $('#wish-modal-title').textContent='编辑心愿';
    $('#wish-title').value=w.title||''; $('#wish-type').value=w.type||'destination';
    $('#wish-desc').value=w.description||''; $('#wish-priority').value=w.priority||'medium';
    $('#wish-modal').style.display='block';
  } catch { showToast('加载心愿失败','error'); }
}

async function deleteWish(id) {
  if(!confirm('确定删除这个心愿吗？')) return;
  try {
    const r = await fetch(`${API_BASE}/wishlist/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
    if(r.ok) { showToast('心愿已删除','success'); loadWishlist(currentWishType); loadStatistics(); }
    else { const d=await r.json(); showToast('删除失败: '+(d.message||''),'error'); }
  } catch { showToast('删除失败','error'); }
}

async function toggleWishComplete(id, completed) {
  try {
    const r = await fetch(`${API_BASE}/wishlist/${id}`, { method:'PUT', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify({is_completed:completed}) });
    if(r.ok) { showToast(completed?'心愿已完成！🎉':'已取消完成','success'); loadWishlist(currentWishType); loadStatistics(); }
    else { const d=await r.json(); showToast(d.message||'操作失败','error'); }
  } catch { showToast('操作失败','error'); }
}

// ============================================================
// Profile & Couple Binding
// ============================================================
async function loadProfile() {
  if(!token||!currentUser) return;
  try {
    const r = await fetch(`${API_BASE}/user`, { headers:{'Authorization':`Bearer ${token}`} });
    const user = await r.json();
    const pn=$('#profile-nickname'),pu=$('#profile-username'),pe=$('#profile-email');
    if(pn)pn.textContent=user.nickname||user.username; if(pu)pu.textContent='@'+user.username; if(pe)pe.textContent=user.email||'';
    coupleStatus = user.partnerId?'bound':'none'; couplePartnerId = user.partnerId||null;
    if(user.partnerId&&user.partner) renderCoupleBound(user.partner);
    else {
      const sr = await fetch(`${API_BASE}/couple/status`, { headers:{'Authorization':`Bearer ${token}`} });
      const bs = await sr.json();
      if(bs.status==='pending'&&bs.isInitiator){ coupleStatus='pending'; renderCouplePending(bs.inviteCode,bs.expiredAt); }
      else if(bs.status==='bound'){ coupleStatus='bound'; couplePartnerId=bs.partner?bs.partner.id:null; renderCoupleBound(bs.partner); }
      else { coupleStatus='none'; couplePartnerId=null; renderCoupleNone(); }
    }
    updateMapLegend();
  } catch(e) { console.error('加载个人中心失败:',e); }
}

function renderCoupleNone(){ $('#couple-none').style.display='block'; $('#couple-pending').style.display='none'; $('#couple-bound').style.display='none'; }
function renderCouplePending(code,exp){ $('#couple-none').style.display='none'; $('#couple-pending').style.display='block'; $('#couple-bound').style.display='none'; const ce=$('#pending-invite-code'); if(ce)ce.textContent=code; updateCountdown(exp); }
function renderCoupleBound(partner){ $('#couple-none').style.display='none'; $('#couple-pending').style.display='none'; $('#couple-bound').style.display='block'; const mn=$('#my-nickname'),pn=$('#partner-nickname'),bd=$('#bound-date'); if(mn&&currentUser)mn.textContent=currentUser.nickname||currentUser.username; if(pn&&partner)pn.textContent=partner.nickname||partner.username; if(bd)bd.textContent='绑定成功，数据共享中'; }

let countdownTimer=null;
function updateCountdown(exp){ if(countdownTimer)clearInterval(countdownTimer);
  function tick(){ const diff=new Date(exp)-new Date(); const el=$('#expire-countdown'); if(!el)return;
    if(diff<=0){ el.textContent='邀请码已过期'; clearInterval(countdownTimer); loadProfile(); return; }
    const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000); el.textContent=`剩余有效时间: ${h}小时${m}分钟`; }
  tick(); countdownTimer=setInterval(tick,60000);
}

function setupCoupleEvents(){
  $('#generate-invite-btn').addEventListener('click',async function(){ if(!token){showToast('请先登录','warning');return;}
    try { const r=await fetch(`${API_BASE}/couple/generate-invite`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}}); const d=await r.json();
      if(r.ok){showToast('邀请码已生成，有效期24小时','success');renderCouplePending(d.inviteCode,d.expiredAt);} else showToast(d.message||'生成失败','error'); } catch {showToast('服务器连接失败','error');} });
  $('#accept-invite-btn').addEventListener('click',async function(){ if(!token){showToast('请先登录','warning');return;}
    const code=$('#invite-code-input').value.trim().toUpperCase(); if(!code||code.length!==6){showToast('请输入6位邀请码','warning');return;}
    try { const r=await fetch(`${API_BASE}/couple/accept-invite`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({inviteCode:code})}); const d=await r.json();
      if(r.ok){showToast('绑定成功！','success');$('#invite-code-input').value='';loadProfile();loadVisitedCities();loadStatistics();loadDiaries();loadAlbums();loadWishlist();loadPlans();} else showToast(d.message||'绑定失败','error'); } catch {showToast('服务器连接失败','error');} });
  $('#copy-invite-btn').addEventListener('click',()=>{ const c=$('#pending-invite-code'); if(c&&c.textContent) navigator.clipboard.writeText(c.textContent).then(()=>showToast('已复制','success')).catch(()=>showToast('复制失败','error')); });
  $('#cancel-invite-btn').addEventListener('click',async()=>{ if(!confirm('确定取消邀请？'))return;
    try{await fetch(`${API_BASE}/couple/unbind`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({confirm:true})});}catch{} renderCoupleNone();coupleStatus='none';showToast('已取消邀请','info'); });
  $('#unbind-btn').addEventListener('click',()=>$('#unbind-confirm-modal').style.display='block');
  $('#confirm-unbind-btn').addEventListener('click',async()=>{ try{ const r=await fetch(`${API_BASE}/couple/unbind`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({confirm:true})}); const d=await r.json();
    if(r.ok){showToast('已解除绑定','success');$('#unbind-confirm-modal').style.display='none';coupleStatus='none';couplePartnerId=null;renderCoupleNone();updateMapLegend();loadVisitedCities();loadStatistics();} else showToast(d.message||'解绑失败','error'); } catch {showToast('服务器连接失败','error');} });
  $('#cancel-unbind-btn').addEventListener('click',()=>$('#unbind-confirm-modal').style.display='none');
  $('#close-unbind-modal').addEventListener('click',()=>$('#unbind-confirm-modal').style.display='none');
}

function updateMapLegend(){
  const legend=$('#map-legend'); if(!legend) return;
  const em=legend.querySelector('.partner-male'),ef=legend.querySelector('.partner-female');
  if(coupleStatus==='bound'){ if(!em){const d=document.createElement('div');d.className='legend-item partner-male';d.innerHTML='<span class="legend-dot"></span><span>我的足迹</span>';legend.appendChild(d);} if(!ef){const d=document.createElement('div');d.className='legend-item partner-female';d.innerHTML='<span class="legend-dot"></span><span>伴侣足迹</span>';legend.appendChild(d);} }
  else { if(em)em.remove(); if(ef)ef.remove(); }
}

// ── Footer ───────────────────────────────────────────────
function initFooterLinks() {
  $$('.footer-links a').forEach(link => link.addEventListener('click', function(e){ e.preventDefault();
    const t=this.getAttribute('href').replace('#',''); if(t==='home'){window.scrollTo({top:0,behavior:'smooth'});return;}
    const s=document.getElementById(t); if(s){ $$('.section').forEach(x=>x.classList.remove('active')); s.classList.add('active');
      $$('.nav-link').forEach(l=>l.classList.remove('active')); const nl=document.querySelector(`[data-section="${t}"]`); if(nl)nl.classList.add('active');
      if(t==='map')initMap(); window.scrollTo({top:0,behavior:'smooth'}); }
  }));
}

// ── Keyboard Shortcuts ───────────────────────────────────
function initKeyboard() {
  document.addEventListener('keydown', function(e){ if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    const sections={'1':'home','2':'diary','3':'map','4':'plan','5':'wishlist','6':'album','7':'profile'};
    if(e.ctrlKey||e.metaKey){ const s=sections[e.key]; if(s){ e.preventDefault(); const t=document.getElementById(s);
      if(t){ $$('.section').forEach(x=>x.classList.remove('active')); t.classList.add('active');
        $$('.nav-link').forEach(l=>l.classList.remove('active')); const nl=document.querySelector(`[data-section="${s}"]`); if(nl)nl.classList.add('active');
        if(s==='map')initMap(); window.scrollTo({top:0,behavior:'smooth'}); } } }
  });
}

// ── Bootstrap ────────────────────────────────────────────
function bootstrap() {
  initToast(); initBackToTop(); initRipple(); initScrollReveal(); initNavbarScroll(); initHeroParticles();
  initLightbox(); initDarkMode(); initNavigation(); initAuth(); initFootprintForm(); initFooterLinks(); initKeyboard();
  initDiaryEvents(); initAlbumEvents(); initPlanEvents(); initWishlistEvents(); setupCoupleEvents();

  if(localStorage.getItem('token')) {
    token = localStorage.getItem('token');
    currentUser = JSON.parse(localStorage.getItem('user'));
    const bt = document.querySelector('#login-btn span'); if(bt) bt.textContent='退出';
    loadUserData();
  }
  loadCities();

  console.log('%c🕊️ DAEEE・同行集 %c已就绪','font-size:1.2em;font-weight:bold;color:#E8A87C;','color:#4A4A4A;');
  console.log('%c一路记账，一路写风，把朝夕与旅途都收好','font-style:italic;color:#C38D9E;');
}

bootstrap();
})();