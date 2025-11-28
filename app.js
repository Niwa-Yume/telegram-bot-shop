/*
  app.js – logique de la mini‑app générique multi‑client
  Chargement dynamique d'un client (config + catalogue) via ?client=slug (default=demo).
  Chaque client possède: /clients/<slug>/config.json et /clients/<slug>/catalog.json
*/
(function(){
  'use strict';
/*
  // --- Déplacer les fallbacks ici (au lieu de scripts inline bloqués par CSP) ---
  if(typeof window.__FALLBACK_CONFIG === 'undefined'){
    window.__FALLBACK_CONFIG = {
      title: 'CBD Shop · Démo',
      subtitle: 'Mini‑app Telegram — catalogue de démonstration',
      accent: '#79c3ff',
      contact: { telegram: 'MonShopCBD' },
      buttonText: 'Préparer message',
      messageTemplate: 'Bonjour, je suis intéressé par {{name}} (ID {{id}}) — {{tier}} à {{tierPrice}}.'
    };
  }
  /*
  if(typeof window.__FALLBACK_CATALOG === 'undefined'){
    window.__FALLBACK_CATALOG = {
      products: [
        { id: 'oil-10', name: 'Huile CBD 10%', category: 'Huiles', price: 29.9, farm: 'Alpine Farm', description: 'Huile de CBD 10% spectre large. Goût naturel.', media:[{type:'image',src:'https://picsum.photos/seed/oil10/800/500',thumb:'https://picsum.photos/seed/oil10/240/150'}] },
        { id: 'flower-og', name: 'Fleur OG Kush', category: 'Fleurs', farm: 'Green Valley', price: 7.5, description: 'Fleur CBD OG Kush, arômes résineux et citronnés.', media:[{type:'image',src:'https://picsum.photos/seed/ogkush/800/500',thumb:'https://picsum.photos/seed/ogkush/240/150'}] },
        { id: 'resin-hash', name: 'Résine Hash CBD', category: 'Résines', farm: 'Blue Mountain', price: 8.9, description: 'Résine CBD douce et parfumée.', media:[{type:'image',src:'https://picsum.photos/seed/hash/800/500',thumb:'https://picsum.photos/seed/hash/240/150'}] }
      ]
    };
  }
*/
  // Harmonisation dynamique de l'accent sans script inline
  document.addEventListener('DOMContentLoaded',()=>{
    const a = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#24cfff';
    document.documentElement.style.setProperty('--accent-grad',`linear-gradient(135deg,${a} 0%, var(--accent2) 30%, var(--accent3) 65%, var(--accent4) 100%)`);

    // UX: Header sticky effect
    const header = document.querySelector('.header');
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > 50) {
        header?.classList.add('scrolled');
      } else {
        header?.classList.remove('scrolled');
      }
      lastScroll = currentScroll;
    }, { passive: true });

    // UX: Filter bar scroll indicators
    const filterBarContainer = document.querySelector('.filter-bar-container');
    const filterBar = document.querySelector('.filter-bar');

    function updateScrollIndicators() {
      if (!filterBar || !filterBarContainer) return;
      const { scrollLeft, scrollWidth, clientWidth } = filterBar;

      // Left gradient
      if (scrollLeft > 10) {
        filterBarContainer.classList.add('has-scroll-left');
      } else {
        filterBarContainer.classList.remove('has-scroll-left');
      }

      // Right gradient
      if (scrollLeft < scrollWidth - clientWidth - 10) {
        filterBarContainer.classList.add('has-scroll-right');
      } else {
        filterBarContainer.classList.remove('has-scroll-right');
      }
    }

    if (filterBar) {
      filterBar.addEventListener('scroll', updateScrollIndicators, { passive: true });
      // Initial check
      setTimeout(updateScrollIndicators, 100);
      window.addEventListener('resize', updateScrollIndicators, { passive: true });
    }
  });

  const DEFAULT_CLIENT = 'demo';
  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('client')||'').toLowerCase().replace(/[^a-z0-9_-]/g,'') || DEFAULT_CLIENT;

  const els = {
    grid: document.getElementById('grid'),
    filters: document.getElementById('filters'),
    search: document.getElementById('q'),
    modal: document.getElementById('modal'),
    dlgTitle: document.getElementById('dlgTitle'),
    stage: document.getElementById('stage'),
    thumbs: document.getElementById('thumbs'),
    mDesc: document.getElementById('mDesc'),
    mPrice: document.getElementById('mPrice'),
    toast: document.getElementById('toast'),
    contactBtn: document.getElementById('contactBtn'),
    messageBtn: document.getElementById('messageBtn'),
    closeBtn: document.getElementById('closeBtn'),
    appTitle: document.getElementById('appTitle'),
    appSub: document.getElementById('appSub'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    mTiers: document.getElementById('mTiers')
  };

  // Référence au select des fermes (créé dynamiquement)
  let farmSelectEl = null;

  let state = {
    config: null,
    products: [],
    filtered: [],
    activeCategory: 'ALL',
    // Nouveau: filtre ferme
    activeFarm: 'ALL',
    search: '',
    activeProduct: null,
    mediaIndex: 0,
    activeTierIndex: null
  };
  let eventsBound = false;

  function showToast(msg, ms=1400){
    if(!els.toast) return;
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=>{ els.toast.hidden = true; }, ms);
  }

  async function loadJSON(path){
    const res = await fetch(path, {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status+' '+path);
    return res.json();
  }

  async function init(){
    showToast('Chargement…');
    // Rendu immédiat depuis fallback si présent (UX)
    const fbConfig = window.__FALLBACK_CONFIG;
    const fbCatalog = window.__FALLBACK_CATALOG;
    if(fbConfig){ state.config = fbConfig; hydrateConfig(); }
    if(fbCatalog && Array.isArray(fbCatalog.products) && fbCatalog.products.length){
      state.products = normalizeProducts(fbCatalog.products);
      buildFilters();
      applyFilter();
    }
    if(!eventsBound){ bindEvents(); }

    // Mise à jour avec les vraies données
    try {
      const [config, catalog] = await Promise.all([
        loadJSON(`config.json`),
        loadJSON(`catalog.json`)
      ]);
      if(config){ state.config = config; hydrateConfig(); }
      if(catalog && Array.isArray(catalog.products)){
        state.products = normalizeProducts(catalog.products);
        buildFilters();
        applyFilter();
      }
      showToast('Prêt', 900);
    } catch(err){
      console.warn('Fallback en cours (config/catalog)', err);
      if(!(fbCatalog && fbCatalog.products && fbCatalog.products.length)){
        if(els.grid) els.grid.innerHTML = `<p style="grid-column:1/-1;color:#f66">Impossible de charger les données.</p>`;
      }
    }
  }

  function hydrateConfig(){
    const c = state.config || {};
    if(c.title) els.appTitle.textContent = c.title;
    if(c.subtitle) els.appSub.textContent = c.subtitle;
    if(c.theme){ for(const [k,v] of Object.entries(c.theme||{})){ document.documentElement.style.setProperty(`--${k}`, v); } }
    if(c.accent){
      document.documentElement.style.setProperty('--tg-theme-button-color', c.accent);
      document.documentElement.style.setProperty('--tg-theme-link-color', c.accent);
      document.documentElement.style.setProperty('--accent', c.accent);
    }
    if(c.buttonText && els.messageBtn){ els.messageBtn.textContent = c.buttonText; }
  }

  function buildFilters(){
    const cats = new Set(state.products.map(p=>p.category).filter(Boolean));
    const container = els.filters; if(!container) return;
    container.innerHTML = '';

    const allBtn = makeChip('Tous', 'ALL');
    allBtn.setAttribute('aria-pressed','true');
    container.appendChild(allBtn);
    [...cats].sort().forEach(cat=> container.appendChild( makeChip(cat, cat) ));

    // Ajout du menu déroulant des fermes
    buildFarmSelect();
  }

  function makeChip(label, value){
    const b = document.createElement('button');
    b.className = 'chip';
    b.type='button';
    b.textContent = label;
    b.dataset.value = value;
    b.setAttribute('aria-pressed','false');
    b.addEventListener('click', ()=>{
      state.activeCategory = value;
      [...els.filters.querySelectorAll('.chip')].forEach(c=>c.setAttribute('aria-pressed', c===b?'true':'false'));
      updateFarmOptions();
      applyFilter();
    });
    return b;
  }

  function buildFarmSelect(){
    const container = els.filters; if(!container) return;
    if(!farmSelectEl){
      farmSelectEl = document.createElement('select');
      farmSelectEl.id = 'farmFilter';
      farmSelectEl.setAttribute('aria-label','Filtrer par ferme');
      farmSelectEl.className = 'farm-select';
      farmSelectEl.addEventListener('change', ()=>{ state.activeFarm = farmSelectEl.value || 'ALL'; applyFilter(); });
    }
    if(!container.contains(farmSelectEl)) container.appendChild(farmSelectEl);
    updateFarmOptions();
  }

  function collectFarms(category){
    const farms = new Set();
    (state.products||[]).forEach(p=>{
      const catOk = category==='ALL' || p.category===category;
      const availOk = p.available !== false;
      if(catOk && availOk && p.farm){ farms.add(String(p.farm)); }
    });
    return [...farms].sort((a,b)=>a.localeCompare(b,'fr'));
  }

  function updateFarmOptions(){
    if(!farmSelectEl) return;
    const farms = collectFarms(state.activeCategory);
    const prev = state.activeFarm;
    farmSelectEl.innerHTML = '';
    const optAll = document.createElement('option'); optAll.value = 'ALL'; optAll.textContent = 'Toutes les fermes'; farmSelectEl.appendChild(optAll);
    farms.forEach(f=>{ const o = document.createElement('option'); o.value = f; o.textContent = f; farmSelectEl.appendChild(o); });
    if(prev !== 'ALL' && farms.includes(prev)){ farmSelectEl.value = prev; state.activeFarm = prev; }
    else { farmSelectEl.value = 'ALL'; state.activeFarm = 'ALL'; }
  }

  function applyFilter(){
    const q = (state.search||'').trim().toLowerCase();
    state.filtered = state.products.filter(p=>{
      const availOk = p.available !== false; if(!availOk) return false;
      const catOk = state.activeCategory==='ALL' || p.category===state.activeCategory; if(!catOk) return false;
      const farmOk = state.activeFarm==='ALL' || p.farm===state.activeFarm; if(!farmOk) return false;
      if(!q) return true;
      return (p.name&&p.name.toLowerCase().includes(q)) || (p.description&&p.description.toLowerCase().includes(q));
    });
    renderProducts();
  }

  function renderProducts(){
    const list = state.filtered; if(!els.grid) return;
    if(!list.length){
      els.grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted);font-size:1.1rem">✨ Aucun produit disponible pour ces filtres</p>';
      return;
    }
    els.grid.innerHTML = list.map((p, idx)=>{
      const price = priceBadgeText(p);
      const img = (p.media && p.media[0] && p.media[0].thumb) || (p.media && p.media[0] && p.media[0].src) || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=300 height=220><rect width=100% height=100% fill=%22%2315161f%22/><text x=50% y=50% font-size=18 fill=%22%238b92a7%22 text-anchor=%22middle%22 dy=.35em>Image</text></svg>';
      const info = [p.category||'', p.farm||''].filter(Boolean).join(' • ');
      const delay = Math.min(idx * 0.05, 0.3);
      return `<button class="card" type="button" data-id="${encodeURIComponent(p.id)}" style="animation-delay: ${delay}s">
        <div class="media">
          <img loading="lazy" src="${img}" alt="${escapeHTML(p.name)}" />
          <span class="price-badge">${price}</span>
        </div>
        <div class="card-content">
          <h3 class="name">${escapeHTML(p.name)}</h3>
          <p class="cat">${escapeHTML(info)}</p>
        </div>
      </button>`;
    }).join('');
    els.grid.querySelectorAll('.card').forEach(card=>card.addEventListener('click',()=>openProduct(decodeURIComponent(card.dataset.id))));
  }

  function formatPrice(v){ if(v==null) return ''; const n = Number(v); if(Number.isNaN(n)) return v; return n.toLocaleString('fr-FR', {style:'currency', currency:'EUR'}); }
  function escapeHTML(s){ return (s||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

  function openProduct(id){
    const p = state.products.find(x=>String(x.id)===String(id)); if(!p) return;
    state.activeProduct = p; state.mediaIndex = 0;
    els.dlgTitle.textContent = p.name; els.mDesc.textContent = p.description||'';
    const tiers = getTiers(p); state.activeTierIndex = tiers.length ? 0 : null;
    els.mPrice.textContent = formatPrice(getActivePrice());
    renderMedia(); renderThumbs(); renderTiers();
    els.modal.hidden = false; previousActive = document.activeElement; els.closeBtn.focus(); document.addEventListener('keydown', escListener);
  }
  function closeModal(){ els.modal.hidden = true; document.removeEventListener('keydown', escListener); if(previousActive && previousActive.focus) previousActive.focus(); }
  function escListener(e){ if(e.key==='Escape') closeModal(); }
  let previousActive = null;

  function renderMedia(){
    const p = state.activeProduct; if(!p) return; const m = (p.media||[])[state.mediaIndex]; els.stage.innerHTML = '';
    if(!m){ els.stage.textContent = 'Aucun média'; return; }
    if(m.type==='video'){ const vid = document.createElement('video'); vid.src = m.src; vid.controls = true; vid.playsInline = true; els.stage.appendChild(vid); }
    else { const img = document.createElement('img'); img.src = m.src; img.alt = p.name; els.stage.appendChild(img); }
    updateNavButtons();
  }
  function renderThumbs(){
    const p = state.activeProduct; if(!p) return;
    els.thumbs.innerHTML = (p.media||[]).map((m,i)=>{ const src = m.thumb || m.src; return `<button class="thumb" type="button" data-i="${i}" aria-selected="${i===state.mediaIndex}" style="background-image:url('${src}')"></button>`; }).join('');
    els.thumbs.querySelectorAll('.thumb').forEach(b=>b.addEventListener('click',()=>{ state.mediaIndex=Number(b.dataset.i); renderMedia(); renderThumbs(); }));
  }

  function renderTiers(){
    const p = state.activeProduct; if(!p || !els.mTiers) return;
    const tiers = getTiers(p); els.mTiers.innerHTML = '';
    if(!tiers.length){ els.mTiers.hidden = true; return; }
    els.mTiers.hidden = false;
    tiers.forEach((t,i)=>{
      const b = document.createElement('button'); b.className = 'option'; b.type = 'button'; b.textContent = `${t.label} — ${formatPrice(t.price)}`; b.setAttribute('aria-pressed', String(i===state.activeTierIndex));
      b.addEventListener('click', ()=>{ state.activeTierIndex = i; els.mPrice.textContent = formatPrice(getActivePrice()); els.mTiers.querySelectorAll('.option').forEach((x,idx)=>x.setAttribute('aria-pressed', String(idx===state.activeTierIndex))); });
      els.mTiers.appendChild(b);
    });
  }

  function updateNavButtons(){ const p = state.activeProduct; if(!p) return; const len = (p.media||[]).length; els.prevBtn.disabled = state.mediaIndex<=0; els.nextBtn.disabled = state.mediaIndex>=len-1; }
  function nextMedia(delta){ const p = state.activeProduct; if(!p) return; const len = (p.media||[]).length; if(!len) return; state.mediaIndex = Math.min(len-1, Math.max(0, state.mediaIndex+delta)); renderMedia(); renderThumbs(); }

  function bindEvents(){
    if(eventsBound) return; eventsBound = true;
    if(els.search) els.search.addEventListener('input', ()=>{ state.search = els.search.value; applyFilter(); });
    if(els.closeBtn) els.closeBtn.addEventListener('click', closeModal);
    if(els.contactBtn) els.contactBtn.addEventListener('click', contactSeller);
    if(els.messageBtn) els.messageBtn.addEventListener('click', prepareMessage);
    if(els.prevBtn) els.prevBtn.addEventListener('click', ()=>nextMedia(-1));
    if(els.nextBtn) els.nextBtn.addEventListener('click', ()=>nextMedia(1));
    if(els.modal) els.modal.addEventListener('click', e=>{ if(e.target===els.modal) closeModal(); });

    if(els.grid){
      els.grid.addEventListener('click', e=>{
        let t = e.target; if(t && t.nodeType===3) t = t.parentElement; const el = (t && t.closest) ? t.closest('[data-id]') : null;
        if(el && els.grid.contains(el)){ const id = el.dataset.id || el.getAttribute('data-id'); if(id) openProduct(id); }
      });
      els.grid.addEventListener('keydown', e=>{
        if(e.key!=="Enter" && e.key!==" ") return; let t = e.target; if(t && t.nodeType===3) t = t.parentElement; const el = (t && t.closest) ? t.closest('[data-id]') : null;
        if(el && els.grid.contains(el)){ e.preventDefault(); const id = el.dataset.id || el.getAttribute('data-id'); if(id) openProduct(id); }
      });
      els.grid.querySelectorAll('[data-id]').forEach(node=>{ node.addEventListener('click', ()=>{ const id = node.dataset.id || node.getAttribute('data-id'); if(id) openProduct(id); }, { once: true }); });
    }

    const clear = document.querySelector('.search .clear');
    if(clear) clear.addEventListener('click', ()=>{ if(els.search){ els.search.value=''; state.search=''; applyFilter(); } });
  }

  function contactSeller(){
    const username = state.config && state.config.contact && state.config.contact.telegram;
    if(username){ const url = `https://t.me/${username.replace(/^@/,'')}`; openExternal(url); }
    else { showToast('Aucun contact configuré'); }
  }

  function prepareMessage(){
    const p = state.activeProduct; if(!p){ showToast('Ouvrez un produit'); return; }
    const tiers = getTiers(p); const chosen = (tiers.length && state.activeTierIndex!=null) ? tiers[state.activeTierIndex] : null; const chosenPrice = chosen ? chosen.price : (p.price!=null ? p.price : null);

    const templ = (state.config && state.config.messageTemplate) || 'Bonjour, je suis intéressé par {{name}} (ID {{id}}) au prix de {{price}}.';
    let text = templ.replace(/{{\s*name\s*}}/g,p.name)
      .replace(/{{\s*id\s*}}/g,p.id)
      .replace(/{{\s*price\s*}}/g, formatPrice(chosenPrice));

    if(/{{\s*tier\s*}}/.test(templ)){
      text = text.replace(/{{\s*tier\s*}}/g, chosen ? chosen.label : '');
    } else if(chosen){
      text += ` (palier ${chosen.label})`;
    }
    if(/{{\s*tierPrice\s*}}/.test(templ)){
      text = text.replace(/{{\s*tierPrice\s*}}/g, formatPrice(chosenPrice));
    }

    const tg = window.Telegram && window.Telegram.WebApp;
    if(tg && tg.initDataUnsafe){
      try {
        tg.sendData(JSON.stringify({action:'message', product:{id:p.id,name:p.name, price:chosenPrice, tier: chosen && chosen.label}, text}));
        tg.close && tg.close();
      } catch(err){
        console.error(err); showToast('Erreur envoi Telegram');
      }
    } else {
      copyToClipboard(text).then(()=>showToast('Message copié')).catch(()=>showToast('Copie impossible'));
    }
  }

  function copyToClipboard(t){
    if(navigator.clipboard) return navigator.clipboard.writeText(t);
    return new Promise((res,rej)=>{
      const ta = document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); res(); }catch(e){ rej(e);} finally { ta.remove(); }
    });
  }

  function openExternal(url){
    const tg = window.Telegram && window.Telegram.WebApp;
    if(tg && tg.openTelegramLink){ tg.openTelegramLink(url); return; }
    window.open(url,'_blank','noopener');
  }

  // ===== Helpers paliers =====
  function normalizeProducts(products){
    return (products||[]).map(p=>{
      if(p && p.tiers && Array.isArray(p.tiers)){
        // déjà ok
      } else if(p && p.tiers && typeof p.tiers === 'object'){
        p.tiers = Object.entries(p.tiers).map(([k,v])=>({ label: String(k), price: Number(v) }))
          .filter(x=>Number.isFinite(x.price));
      }
      // par défaut, un produit est disponible sauf si available === false
      if(p && typeof p.available === 'undefined') p.available = true;
      return p;
    });
  }

  function getTiers(p){
    if(!p || !Array.isArray(p.tiers)) return [];
    const enriched = p.tiers.map(t=>{
      const label = String(t.label ?? '');
      const m = /([0-9]+(?:\.[0-9]+)?)\s*[gG]\b/.exec(label) || /([0-9]+(?:\.[0-9]+)?)/.exec(label);
      const grams = m ? Number(m[1]) : NaN;
      return { label, grams, price: Number(t.price) };
    }).filter(x=>Number.isFinite(x.price));
    enriched.sort((a,b)=>{
      if(Number.isFinite(a.grams) && Number.isFinite(b.grams)) return a.grams - b.grams;
      return String(a.label).localeCompare(String(b.label), 'fr');
    });
    return enriched;
  }

  function getActivePrice(){
    const p = state.activeProduct; if(!p) return null;
    const tiers = getTiers(p);
    if(tiers.length && state.activeTierIndex!=null){
      const t = tiers[state.activeTierIndex];
      return t ? t.price : null;
    }
    return p.price!=null ? p.price : null;
  }

  function priceBadgeText(p){
    const tiers = getTiers(p);
    if(tiers.length){
      const min = Math.min(...tiers.map(t=>t.price).filter(n=>Number.isFinite(n)));
      return `dès ${formatPrice(min)}`;
    }
    return formatPrice(p.price);
  }

  document.addEventListener('DOMContentLoaded', init);

})();
