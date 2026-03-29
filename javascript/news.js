const NEWS_JSON = '../python/news.json';

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
  "American Media", "European Media", "Indian Media",
  "Chinese Media", "Russian Media",
  "Middle East & Global South", "Alternative & Independent",
];

let newsData     = {};
let telegramData = [];
let activeTab    = 'all';

async function init() {
  try {
    const items = await fetch(NEWS_JSON).then(r => r.json());
    items.forEach(item => {
      if (item.source === 'telegram') {
        telegramData.push(item);
      } else {
        const cat = item.category || 'Other';
        if (!newsData[cat]) newsData[cat] = [];
        newsData[cat].push(item);
      }
    });
  } catch (e) {
    document.getElementById('loading').textContent = 'Failed to load news.';
    return;
  }
  buildTabs();
  renderAll();
  renderTicker();
}

function buildTabs() {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';
  addTab(nav, 'all', 'All Sources');
  CATEGORY_ORDER.forEach(cat => { if (newsData[cat]?.length) addTab(nav, cat, cat); });
  if (telegramData.length) addTab(nav, 'telegram', '✈ Telegram', true);
}

function addTab(nav, key, label, isTg = false) {
  const btn = document.createElement('button');
  btn.className = 'nav-tab' + (isTg ? ' tg-tab' : '') + (key === activeTab ? ' active' : '');
  btn.textContent = label;
  btn.onclick = (e) => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    activeTab = key;
    renderAll();
  };
  nav.appendChild(btn);
}

function renderAll() {
  document.getElementById('loading').style.display = 'none';
  const newsView = document.getElementById('news-view');
  const tgView   = document.getElementById('tg-view');
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
  const cats = activeTab === 'all'
    ? CATEGORY_ORDER.filter(c => newsData[c]?.length)
    : (newsData[activeTab] ? [activeTab] : []);
  if (!cats.length) { container.innerHTML = '<div class="state-msg">No articles found.</div>'; return; }
  cats.forEach(cat => {
    const articles = newsData[cat];
    const section  = document.createElement('div');
    section.innerHTML = `<div class="section-label">${cat} <span class="count">${articles.length}</span></div><div class="scroll-row"></div>`;
    container.appendChild(section);
    articles.forEach(a => section.querySelector('.scroll-row').appendChild(buildCard(a, cat)));
  });
}

function buildCard(a, cat) {
  const card = document.createElement('div');
  card.className = 'card';
  const s      = a.importance || 0;
  const bClass = s >= 70 ? 'badge-critical' : s >= 50 ? 'badge-high' : s >= 30 ? 'badge-medium' : 'badge-low';
  const img    = a.thumbnail || FALLBACKS[cat] || FALLBACKS['American Media'];
  const date   = a.published ? new Date(a.published).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '';
  card.innerHTML = `
    <span class="card-badge ${bClass}">${a.importanceLabel || 'Low'}</span>
    <img class="card-img" src="${img}" alt="" loading="lazy" onerror="this.src='${FALLBACKS[cat] || FALLBACKS['American Media']}'">
    <div class="card-body">
      <div class="card-title">${a.title}</div>
      <div class="card-footer">
        <span class="card-source">${a.outlet || ''}</span>
        <span class="card-date">${date}</span>
      </div>
      <a class="card-link" href="${a.url || a.link}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Read →</a>
    </div>`;
  card.onclick = () => window.open(a.url || a.link, '_blank');
  return card;
}

function renderTelegram() {
  const container = document.getElementById('tg-view');
  container.innerHTML = '';
  if (!telegramData.length) { container.innerHTML = '<div class="state-msg">No Telegram messages.</div>'; return; }
  const byChannel = {};
  telegramData.forEach(m => { const ch = m.channel || 'unknown'; if (!byChannel[ch]) byChannel[ch] = []; byChannel[ch].push(m); });
  Object.entries(byChannel).forEach(([ch, msgs]) => {
    const section = document.createElement('div');
    section.innerHTML = `<div class="section-label">@${ch} — ${msgs[0]?.channel_title || ch} <span class="count">${msgs.length}</span></div><div class="tg-grid"></div>`;
    container.appendChild(section);
    msgs.forEach(m => section.querySelector('.tg-grid').appendChild(buildTgCard(m)));
  });
}

function buildTgCard(m) {
  const card = document.createElement('div');
  card.className = 'tg-card';
  const time = m.posted_at ? new Date(m.posted_at).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
  card.innerHTML = `
    <div class="tg-channel">@${m.channel}</div>
    <div class="tg-headline">${m.headline || '(no text)'}</div>
    <div class="tg-body">${m.full_text || ''}</div>
    <div class="tg-footer">
      <div class="tg-stats">
        ${m.views    ? `<span>👁 ${m.views.toLocaleString()}</span>` : ''}
        ${m.forwards ? `<span>↗ ${m.forwards}</span>` : ''}
        ${m.has_media ? '<span>📎 media</span>' : ''}
      </div>
      <span class="tg-time">${time}</span>
    </div>`;
  card.onclick = () => window.open(m.message_url, '_blank');
  return card;
}

function renderTicker() {
  const critical = Object.values(newsData).flat().filter(a => (a.importance || 0) >= 70).slice(0, 12);
  if (!critical.length) return;
  document.querySelector('.ticker-inner').textContent = critical.map(a => a.title).join('   ◆   ') + '   ◆   ';
}

init();