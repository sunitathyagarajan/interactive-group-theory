/* Shared by every page: light/dark toggle, phone helpers for the lesson stage. */
(function(){
  const KEY = 'igt-theme';
  const root = document.documentElement;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const stored = () => { try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : null; } catch(e){ return null; } };
  const current = () => root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light');
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>';

  function paint(){
    const t = current();
    document.querySelectorAll('[data-theme-toggle]').forEach(b => {
      // show what you will switch to
      b.innerHTML = (t === 'dark' ? SUN : MOON) + `<span class="lbl-txt">${t === 'dark' ? 'Light' : 'Dark'} mode</span>`;
      b.setAttribute('aria-label', `Switch to ${t === 'dark' ? 'light' : 'dark'} mode`);
      b.title = b.getAttribute('aria-label');
    });
  }
  function set(t){
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch(e){}
    paint();
    document.dispatchEvent(new CustomEvent('themechange', {detail:t}));
  }
  const s = stored(); if (s) root.setAttribute('data-theme', s);
  mq.addEventListener && mq.addEventListener('change', () => { if (!stored()){ root.removeAttribute('data-theme'); paint(); } });

  function init(){
    document.querySelectorAll('[data-theme-toggle]').forEach(b => {
      b.type = 'button';
      b.addEventListener('click', () => set(current() === 'dark' ? 'light' : 'dark'));
    });
    paint();
    initStage();
    initStepper();
    initTips();
  }

  /* ---------- lesson stage on phones ---------- */
  function initStage(){
    const stage = document.getElementById('stage');
    if (!stage) return;
    const dock = stage.querySelector('.st-bottom');
    if (dock){
      const b = document.createElement('button');
      b.className = 'dock-toggle'; b.type = 'button';
      const sync = () => { const c = stage.classList.contains('collapsed'); b.textContent = c ? 'Show 3D model' : 'Hide 3D model'; b.setAttribute('aria-expanded', String(!c)); };
      b.addEventListener('click', () => { stage.classList.toggle('collapsed'); sync(); });
      sync(); dock.appendChild(b);
    }
    // the lesson scrolls to just below the pinned stage, whatever height it currently has
    const setH = () => root.style.setProperty('--stage-h', stage.offsetHeight + 'px');
    new ResizeObserver(setH).observe(stage); setH();
  }

  /* keep the current step pill in view when the stepper is a single scrolling row */
  function initStepper(){
    const ol = document.getElementById('stepper');
    if (!ol) return;
    const centre = () => {
      const cur = ol.querySelector('[aria-current="step"]');
      if (!cur || ol.scrollWidth <= ol.clientWidth) return;
      const li = cur.closest('li') || cur;
      ol.scrollTo({left: li.offsetLeft - (ol.clientWidth - li.offsetWidth)/2, behavior:'auto'});
    };
    new MutationObserver(centre).observe(ol, {childList:true, subtree:true});
    centre();
  }

  /* spectrum tooltips are driven by pointermove; a tap should show them too */
  function initTips(){
    document.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('.spec [data-tip]');
      if (!t) return;
      t.dispatchEvent(new PointerEvent('pointermove', {bubbles:true, clientX:e.clientX, clientY:e.clientY}));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
