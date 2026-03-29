const NEWS_JSON     = '../python/news.json';
const TELEGRAM_JSON = '../python/telegram.json';

const FALLBACKS = {
  "American Media":             "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=300&fit=crop",
  "European Media":             "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=300&fit=crop",
  "Indian Media":               "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&h=300&fit=crop",
  "Chinese Media":              "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=600&h=300&fit=crop",
  "Russian Media":              "https://images.unsplash.com/photo-1520106212299-d99c443e4568?w=600&h=300&fit=crop",
  "Middle East & Global South": "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=600&h=300&fit=crop",
  "Alternative & Independent":  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=300&fit=crop",
};

const CATEGORY_ORDER = [
  "American Media",
  "European Media",
  "Indian Media",
  "Chinese Media",
  "Russian Media",
  "Middle East & Global South",
  "Alternative & Independent",
];

// ── State ────────────────────────────────────────────────────────────────────
let newsData     = {};
let telegramData = [];
let activeTab    = 'all';

// ── Boot ─────────────────────────────────────────────────────────────────────
async function init() {
  await Promise.all([loadNews(), loadTelegram()]);
  buildTabs();
  renderAll();
  renderTicker();
}

async function loadNews() {
  try {
    const res  = await fetch(NEWS_JSON);
    const items = await res.json();
    items.forEach(a => {
      if (a.source !== 'rss') return;
      const cat = a.category || 'Other';
      if (!newsData[cat]) newsData[cat] = [];
      newsData[cat].push(a);
    });
  } catch (e) {
    console.error('News load failed:', e);
  }
}

async function loadTelegram() {
  try {
    const res = await fetch(TELEGRAM_JSON);
    telegramData = await res.json();
  } catch {
    telegramData = [];
  }
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function buildTabs() {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';

  // "All" tab
  addTab(nav, 'all', 'All Sources');

  // One tab per RSS category (in order)
  CATEGORY_ORDER.forEach(cat => {
    if (newsData[cat]?.length) addTab(nav, cat, cat);
  });

  // Telegram tab (always last)
  addTab(nav, 'telegram', '✈ Telegram', true);
}

function addTab(nav, key, label, isTg = false) {
  const btn = document.createElement('button');
  btn.className = 'nav-tab' + (isTg ? ' tg-tab' : '') + (key === activeTab ? ' active' : '');
  btn.textContent = label;
  btn.onclick = () => switchTab(key);
  nav.appendChild(btn);
}

function switchTab(key) {
  activeTab = key;
  document.querySelectorAll('.nav-tab').forEach(b => {
    b.classList.toggle('active', b.textContent.replace('✈ ', '') === (key === 'telegram' ? 'Telegram' : key) || (key === 'all' && b.textContent === 'All Sources'));
  });
  renderAll();
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderAll() {
  const newsView = document.getElementById('news-view');
  const tgView   = document.getElementById('tg-view');
  const loading  = document.getElementById('loading');
  loading.style.display = 'none';

  if (activeTab === 'telegram') {
    newsView.style.display = 'none';
    tgView.style.display   = 'block';
    renderTelegram();
  } else {
    tgView.style.display   = 'none';
    newsView.style.display = 'block';
    renderNews();
  }
}

function renderNews() {
  const container = document.getElementById('news-view');
  container.innerHTML = '';

  const categories = activeTab === 'all'
    ? CATEGORY_ORDER.filter(c => newsData[c]?.length)
    : (newsData[activeTab] ? [activeTab] : []);

  if (!categories.length) {
    container.innerHTML = '<div class="state-msg">No articles found.</div>';
    return;
  }

  categories.forEach(cat => {
    const articles = newsData[cat] || [];
    if (!articles.length) return;

    const section = document.createElement('div');
    section.innerHTML = `
      <div class="section-label">
        ${cat} <span class="count">${articles.length}</span>
      </div>
      <div class="scroll-row" id="row-${cat.replace(/\W/g,'_')}"></div>
    `;
    container.appendChild(section);

    const row = section.querySelector('.scroll-row');
    articles.forEach(a => row.appendChild(buildCard(a, cat)));
  });
}

function buildCard(a, cat) {
  const card = document.createElement('div');
  card.className = 'card';

  const score   = a.importance || 0;
  const bClass  = score >= 70 ? 'badge-critical' : score >= 50 ? 'badge-high' : score >= 30 ? 'badge-medium' : 'badge-low';
  const bLabel  = a.importanceLabel || 'Low';
  const img     = a.thumbnail || FALLBACKS[cat] || FALLBACKS['American Media'];
  const date    = a.published ? new Date(a.published).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '';
  const source  = a.outlet || a.source || '';

  card.innerHTML = `
    <span class="card-badge ${bClass}">${bLabel}</span>
    <img class="card-img" src="${img}" alt="" loading="lazy"
         onerror="this.src='${FALLBACKS[cat] || FALLBACKS['American Media']}'">
    <div class="card-body">
      <div class="card-title">${a.title}</div>
      <div class="card-footer">
        <span class="card-source">${source}</span>
        <span class="card-date">${date}</span>
      </div>
      <a class="card-link" href="${a.url || a.link}" target="_blank" rel="noopener"
         onclick="event.stopPropagation()">Read →</a>
    </div>
  `;

  card.onclick = () => window.open(a.url || a.link, '_blank');
  return card;
}

// ── Telegram ──────────────────────────────────────────────────────────────────
function renderTelegram() {
  const container = document.getElementById('tg-view');
  container.innerHTML = '';

  if (!telegramData.length) {
    container.innerHTML = '<div class="state-msg">No Telegram messages loaded.</div>';
    return;
  }

  // Group by channel
  const byChannel = {};
  telegramData.forEach(m => {
    const ch = m.channel || 'unknown';
    if (!byChannel[ch]) byChannel[ch] = [];
    byChannel[ch].push(m);
  });

  Object.entries(byChannel).forEach(([ch, msgs]) => {
    const section = document.createElement('div');
    const title   = msgs[0]?.channel_title || ch;
    section.innerHTML = `
      <div class="section-label">
        @${ch} — ${title} <span class="count">${msgs.length}</span>
      </div>
      <div class="tg-grid" id="tg-${ch}"></div>
    `;
    container.appendChild(section);

    const grid = section.querySelector('.tg-grid');
    msgs.forEach(m => grid.appendChild(buildTgCard(m)));
  });
}

function buildTgCard(m) {
  const card = document.createElement('div');
  card.className = 'tg-card';

  const time    = m.posted_at ? new Date(m.posted_at).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
  const views   = m.views    ? `👁 ${m.views.toLocaleString()}` : '';
  const fwds    = m.forwards ? `↗ ${m.forwards}` : '';
  const bodyTxt = m.full_text || m.headline || '';
  // Show full_text but skip repeating the headline if it's just the first line
  const preview = bodyTxt;

  card.innerHTML = `
    <div class="tg-channel">@${m.channel}</div>
    <div class="tg-headline">${m.headline || '(no text)'}</div>
    <div class="tg-body">${preview}</div>
    <div class="tg-footer">
      <div class="tg-stats">
        ${views ? `<span>${views}</span>` : ''}
        ${fwds  ? `<span>${fwds}</span>`  : ''}
        ${m.has_media ? '<span>📎 media</span>' : ''}
      </div>
      <span class="tg-time">${time}</span>
    </div>
  `;

  card.onclick = () => window.open(m.message_url, '_blank');
  return card;
}

// ── Ticker ────────────────────────────────────────────────────────────────────
function renderTicker() {
  const all = Object.values(newsData).flat();
  const critical = all.filter(a => (a.importance || 0) >= 70).slice(0, 12);
  if (!critical.length) return;

  const ticker = document.getElementById('ticker');
  const sep = '   ◆   ';
  ticker.querySelector('.ticker-inner').textContent =
    critical.map(a => a.title).join(sep) + sep;
}

init();