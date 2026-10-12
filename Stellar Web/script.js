/**
 * Stellar — guild & community site
 */

// ============================================================
// CONFIG — the only things you should need to change here
// ============================================================
const CONFIG = {
  // EDIT: your permanent Discord invite (Server Settings → Invites, set to never expire)
  discordInvite: 'https://discord.gg/YOUR_INVITE',
  // EDIT: Server Settings → Widget → turn on "Enable Server Widget" and copy the Server ID
  discordServerId: '',
  // Where announcements are read from. Later, the Discord bot keeps this file updated.
  announcementsUrl: 'announcements.json',
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================
// DISCORD LINKS — every [data-discord-invite] gets the invite
// ============================================================
$$('[data-discord-invite]').forEach(a => { a.href = CONFIG.discordInvite; });

// ============================================================
// DISCORD WIDGET (news page)
// ============================================================
(function initDiscordWidget() {
  const slot = $('[data-discord-widget]');
  if (!slot || !CONFIG.discordServerId) return;
  const frame = document.createElement('iframe');
  frame.className = 'discord-widget';
  frame.title = 'Stellar Discord server — who is online';
  frame.loading = 'lazy';
  frame.src = `https://discord.com/widget?id=${encodeURIComponent(CONFIG.discordServerId)}&theme=dark`;
  frame.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts');
  slot.appendChild(frame);
})();

// ============================================================
// ANNOUNCEMENTS
// Reads announcements.json and renders it into any
// [data-announcements] list (data-limit caps the count).
// ============================================================
(function initAnnouncements() {
  const lists = $$('[data-announcements]');
  if (!lists.length) return;

  const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Light Discord-style formatting: **bold**, *italic*, links
  const format = s => escapeHTML(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a class="text-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  const fmtDate = iso => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const render = (list, posts) => {
    const limit = parseInt(list.dataset.limit, 10) || posts.length;
    const shown = posts.slice(0, limit);
    if (!shown.length) {
      list.innerHTML = '<p class="announce-empty">No announcements yet. Check back soon.</p>';
      return;
    }
    list.innerHTML = shown.map(p => `
      <article class="announce-card">
        <p class="announce-meta">
          <span class="announce-channel">#${escapeHTML(p.channel || 'announcements')}</span>
          <time datetime="${escapeHTML(p.timestamp)}">${fmtDate(p.timestamp)}</time>
          ${p.author ? `<span>${escapeHTML(p.author)}</span>` : ''}
        </p>
        ${p.title ? `<h3 class="announce-title">${escapeHTML(p.title)}</h3>` : ''}
        <p class="announce-body">${format(p.content)}</p>
      </article>`).join('');
  };

  fetch(CONFIG.announcementsUrl, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      const posts = (data.announcements || [])
        .slice()
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      lists.forEach(list => render(list, posts));
    })
    .catch(() => {
      lists.forEach(list => {
        list.innerHTML = '<p class="announce-empty">Announcements couldn’t load right now. You can always find them in the Discord.</p>';
      });
    });
})();

// ============================================================
// STARFIELD — fixed canvas behind the whole site
// ============================================================
(function initStarfield() {
  const canvas = $('#starfield');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const tints = ['255,255,255', '200,190,255', '255,170,235', '160,215,255'];
  let stars = [], w, h, raf;

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((w * h) / 2800) }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() < 0.93 ? Math.random() * 0.9 + 0.2 : Math.random() * 1.3 + 1,
      a: Math.random() * 0.6 + 0.3,
      tw: Math.random() * 0.002 + 0.0005,
      ph: Math.random() * Math.PI * 2,
      c: tints[Math.floor(Math.random() * tints.length)],
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = reduceMotion ? s.a : s.a * (0.65 + 0.35 * Math.sin(t * s.tw + s.ph));
      ctx.fillStyle = `rgba(${s.c},${a})`;
      if (s.r > 1.3) {
        // four-point sparkle on the bright ones, echoing the logo
        const l = s.r * 3.2;
        ctx.fillRect(s.x - l, s.y - 0.4, l * 2, 0.8);
        ctx.fillRect(s.x - 0.4, s.y - l, 0.8, l * 2);
      }
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  const loop = t => { draw(t); raf = requestAnimationFrame(loop); };
  build();
  if (reduceMotion) draw(0); else raf = requestAnimationFrame(loop);

  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { build(); if (reduceMotion) draw(0); }, 150);
  });
  document.addEventListener('visibilitychange', () => {
    if (reduceMotion) return;
    if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop);
  });
})();

// ============================================================
// HEADER — background once you scroll
// ============================================================
(function initScrollHeader() {
  const header = $('#site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ============================================================
// MOBILE MENU
// ============================================================
(function initMobileMenu() {
  const btn = $('#mobile-menu-btn');
  const nav = $('#mobile-nav');
  if (!btn || !nav) return;
  const open = () => {
    btn.classList.add('open'); nav.classList.add('open');
    btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Close navigation menu');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    btn.classList.remove('open'); nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Open navigation menu');
    document.body.style.overflow = '';
  };
  btn.addEventListener('click', () => (btn.classList.contains('open') ? close() : open()));
  $$('a', nav).forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && btn.classList.contains('open')) { close(); btn.focus(); } });
  document.addEventListener('click', e => {
    if (btn.classList.contains('open') && !nav.contains(e.target) && !btn.contains(e.target)) close();
  });
})();

// ============================================================
// FAQ ACCORDION
// ============================================================
(function initFaq() {
  const items = $$('.faq-item');
  items.forEach(item => {
    const btn = $('.faq-question', item);
    btn.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      items.forEach(other => {
        other.classList.remove('open');
        $('.faq-question', other).setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });
})();
