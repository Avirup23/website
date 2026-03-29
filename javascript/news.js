const NEWS_JSON = '../python/news.json';

const FALLBACKS = {
  "American Media":             "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=300&fit=crop",
  "European Media":             "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=300&fit=crop",
  "Indian Media":               "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&h=300&fit=crop",
  "Chinese Media":              "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=600&h=300&fit=crop",
  "Russian Media":              "https://images.unsplash.com/photo-1520106212299-d99c443e4568?w=600&h=300&fit=crop",
  "Middle East & Global South": "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=600&h=300&fit=crop",
  "Alternative & Independent":  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=300&fit=crop",
  "Reddit":                     "https://images.unsplash.com/photo-1562907550-096d3bf9b25c?w=600&h=300&fit=crop",
};

const CATEGORY_ORDER = [
  "American Media", "European Media", "Indian Media",
  "Chinese Media", "Russian Media",
  "Middle East & Global South", "Alternative & Independent",
];

let newsData     = {};
let telegramData = [];
let redditData   = [];
let activeTab    = 'all';

// ── Podcast state ──────────────────────────────────────────────────────────
const podcast = {
  script:    null,   // generated script text
  utterance: null,   // current SpeechSynthesisUtterance
  playing:   false,
  paused:    false,
};

marked.use({ breaks: true, gfm: true, mangle: false, headerIds: false });
function parseTgInline(text) {
  const cleaned = text.replace(/\*/g, '');
  return `<strong>${cleaned.trim()}</strong>`;
}
function parseTgMarkdown(text) {
  const cleaned = text.replace(/\*/g, '');
  return marked.parse(cleaned);
}

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════
async function init() {
  try {
    const items = await fetch(NEWS_JSON).then(r => r.json());
    items.forEach(item => {
      if (item.source === 'telegram') {
        telegramData.push(item);
      } else if (item.source === 'reddit') {
        redditData.push(item);
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
  injectPodcastUI();
}

// ══════════════════════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════════════════════
function buildTabs() {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';
  addTab(nav, 'all', 'All Sources');
  CATEGORY_ORDER.forEach(cat => { if (newsData[cat]?.length) addTab(nav, cat, cat); });
  if (redditData.length)   addTab(nav, 'reddit',   '🟠 Reddit',   true);
  if (telegramData.length) addTab(nav, 'telegram', '✈ Telegram',  true);
}

function addTab(nav, key, label, isSpecial = false) {
  const btn = document.createElement('button');
  btn.className = 'nav-tab' + (isSpecial ? ' tg-tab' : '') + (key === activeTab ? ' active' : '');
  btn.textContent = label;
  btn.onclick = (e) => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    activeTab = key;
    renderAll();
  };
  nav.appendChild(btn);
}

// ══════════════════════════════════════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════════════════════════════════════
function renderAll() {
  document.getElementById('loading').style.display = 'none';
  const newsView   = document.getElementById('news-view');
  const tgView     = document.getElementById('tg-view');
  const redditView = document.getElementById('reddit-view');

  newsView.style.display   = 'none';
  tgView.style.display     = 'none';
  redditView.style.display = 'none';

  if (activeTab === 'telegram') {
    tgView.style.display = 'block';
    renderTelegram();
  } else if (activeTab === 'reddit') {
    redditView.style.display = 'block';
    renderReddit();
  } else {
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

function renderReddit() {
  const container = document.getElementById('reddit-view');
  container.innerHTML = '';
  if (!redditData.length) {
    container.innerHTML = '<div class="state-msg">No Reddit posts.</div>';
    return;
  }
  const bySub = {};
  redditData.forEach(p => {
    const sub = p.subreddit || 'reddit';
    if (!bySub[sub]) bySub[sub] = [];
    bySub[sub].push(p);
  });
  Object.entries(bySub).forEach(([sub, posts]) => {
    const section = document.createElement('div');
    section.innerHTML = `<div class="section-label">r/${sub} <span class="count">${posts.length}</span></div><div class="scroll-row"></div>`;
    container.appendChild(section);
    posts.forEach(p => section.querySelector('.scroll-row').appendChild(buildCard(p, 'Reddit')));
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
  if (!telegramData.length) {
    container.innerHTML = '<div class="state-msg">No Telegram messages.</div>';
    return;
  }
  const byChannel = {};
  telegramData.forEach(m => {
    const ch = m.channel || 'unknown';
    if (!byChannel[ch]) byChannel[ch] = [];
    byChannel[ch].push(m);
  });
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
  const time = m.posted_at ? new Date(m.posted_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : '';
  const hasBody = !!(m.full_text && m.full_text.trim());
  const headline = m.headline ? parseTgInline(m.headline) : '(no text)';
  card.innerHTML = `
    <div class="tg-channel">@${m.channel} — ${m.channel_title || ''}</div>
    <div class="tg-headline">${headline}</div>
    ${hasBody ? `<button class="tg-toggle">Read more ▾</button><div class="tg-body"></div>` : ''}
    <div class="tg-footer">
      <div class="tg-stats">
        ${m.views    ? `<span>👁 ${m.views.toLocaleString()}</span>` : ''}
        ${m.forwards ? `<span>↗ ${m.forwards}</span>` : ''}
        ${m.has_media ? '<span>📎 media</span>' : ''}
      </div>
      <span class="tg-time">${time}</span>
    </div>`;
  if (hasBody) {
    const btn  = card.querySelector('.tg-toggle');
    const body = card.querySelector('.tg-body');
    body.innerHTML = parseTgMarkdown(m.full_text);
    body.style.display = 'none';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'block' : 'none';
      btn.textContent = isHidden ? 'Show less ▴' : 'Read more ▾';
    });
  }
  card.onclick = () => window.open(m.url || m.message_url, '_blank');
  return card;
}

function renderTicker() {
  const critical = Object.values(newsData).flat().filter(a => (a.importance || 0) >= 50).slice(0, 12);
  if (!critical.length) return;
  document.querySelector('.ticker-inner').textContent = critical.map(a => a.title).join('   ◆   ') + '   ◆   ';
}

// ══════════════════════════════════════════════════════════════════════════════
// PODCAST — UI INJECTION
// ══════════════════════════════════════════════════════════════════════════════
function injectPodcastUI() {
  // Floating launch button
  const fab = document.createElement('button');
  fab.id = 'podcast-fab';
  fab.innerHTML = `<span class="pod-icon">🎙</span><span class="pod-label">Daily Brief</span>`;
  fab.title = 'Generate AI News Podcast';
  fab.onclick = openPodcastModal;
  document.body.appendChild(fab);

  // Modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'podcast-overlay';
  overlay.innerHTML = `
    <div id="podcast-modal">
      <div id="pod-header">
        <div id="pod-title-block">
          <span id="pod-live-dot"></span>
          <span id="pod-title">AI NEWS BRIEF</span>
        </div>
        <button id="pod-close" onclick="closePodcastModal()">✕</button>
      </div>

      <div id="pod-body">
        <div id="pod-idle">
          <div id="pod-idle-icon">📻</div>
          <div id="pod-idle-text">Ready to generate your<br><strong>Critical &amp; High</strong> headlines brief</div>
          <button id="pod-generate-btn" onclick="generatePodcast()">
            <span>Generate &amp; Play</span>
          </button>
        </div>

        <div id="pod-loading" style="display:none">
          <div id="pod-spinner"></div>
          <div id="pod-loading-text">Writing your news script…</div>
        </div>

        <div id="pod-player" style="display:none">
          <div id="pod-waveform">
            ${Array.from({length: 28}, (_, i) =>
              `<div class="wave-bar" style="animation-delay:${(i * 0.07).toFixed(2)}s"></div>`
            ).join('')}
          </div>
          <div id="pod-script-box"></div>
          <div id="pod-controls">
            <button class="pod-ctrl" id="pod-restart-btn" onclick="restartPodcast()" title="Restart">⏮</button>
            <button class="pod-ctrl pod-play-btn" id="pod-play-btn" onclick="togglePodcast()">⏸</button>
            <button class="pod-ctrl" id="pod-stop-btn" onclick="stopPodcast()" title="Stop">⏹</button>
            <div id="pod-speed-wrap">
              <label>Speed</label>
              <input type="range" id="pod-speed" min="0.7" max="1.5" step="0.05" value="0.95"
                     oninput="updateSpeed(this.value)">
              <span id="pod-speed-val">0.95×</span>
            </div>
            <div id="pod-voice-wrap">
              <label>Voice</label>
              <select id="pod-voice-select" onchange="changeVoice()"></select>
            </div>
          </div>
          <button id="pod-regen-btn" onclick="generatePodcast()">↻ Regenerate</button>
        </div>
      </div>

      <div id="pod-footer">
        <span id="pod-count"></span>
        <span id="pod-ts"></span>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePodcastModal(); });

  // Populate voice list once voices load
  const populateVoices = () => {
    const sel = document.getElementById('pod-voice-select');
    if (!sel) return;
    const voices = window.speechSynthesis.getVoices()
      .filter(v => v.lang.startsWith('en'));
    sel.innerHTML = '';
    voices.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${v.name} (${v.lang})`;
      // prefer a neutral/deep voice by default
      if (v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('google uk')) opt.selected = true;
      sel.appendChild(opt);
    });
  };
  speechSynthesis.onvoiceschanged = populateVoices;
  populateVoices();
}

function openPodcastModal() {
  document.getElementById('podcast-overlay').style.display = 'flex';
}
function closePodcastModal() {
  document.getElementById('podcast-overlay').style.display = 'none';
  stopPodcast();
}

// ══════════════════════════════════════════════════════════════════════════════
// PODCAST — SCRIPT GENERATION via Claude API
// ══════════════════════════════════════════════════════════════════════════════
async function generatePodcast() {
  stopPodcast();
  showPodState('loading');

  const count = [
    ...Object.values(newsData).flat(),
    ...redditData,
  ].filter(a => (a.importance || 0) >= 50).length;

  document.getElementById('pod-count').textContent = `${Math.min(count, 20)} headline${count !== 1 ? 's' : ''}`;
  document.getElementById('pod-ts').textContent = new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});

  try {
    const res    = await fetch('../python/podcast_script.txt');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const script = (await res.text()).trim();
    if (!script) throw new Error('Empty script file');

    podcast.script = script;
    document.getElementById('pod-script-box').textContent = script;
    showPodState('player');
    speakScript(script);
  } catch (err) {
    console.error('Podcast generation failed:', err);
    document.getElementById('pod-loading-text').textContent = '⚠ Failed to generate script. Check console.';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PODCAST — SPEECH
// ══════════════════════════════════════════════════════════════════════════════
function speakScript(text) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate  = parseFloat(document.getElementById('pod-speed')?.value || '0.95');
  utter.pitch = 0.95;

  const sel    = document.getElementById('pod-voice-select');
  const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  if (sel && voices[sel.value]) utter.voice = voices[sel.value];

  utter.onstart = () => {
    podcast.playing = true; podcast.paused = false;
    setWaveActive(true);
    document.getElementById('pod-play-btn').textContent = '⏸';
  };
  utter.onend = utter.onerror = () => {
    podcast.playing = false; podcast.paused = false;
    setWaveActive(false);
    document.getElementById('pod-play-btn').textContent = '▶';
  };

  podcast.utterance = utter;
  window.speechSynthesis.speak(utter);
}

function togglePodcast() {
  if (!podcast.utterance) return;
  if (podcast.paused) {
    window.speechSynthesis.resume();
    podcast.paused = false;
    document.getElementById('pod-play-btn').textContent = '⏸';
    setWaveActive(true);
  } else {
    window.speechSynthesis.pause();
    podcast.paused = true;
    document.getElementById('pod-play-btn').textContent = '▶';
    setWaveActive(false);
  }
}

function stopPodcast() {
  window.speechSynthesis.cancel();
  podcast.playing = false; podcast.paused = false;
  setWaveActive(false);
  const btn = document.getElementById('pod-play-btn');
  if (btn) btn.textContent = '▶';
}

function restartPodcast() {
  if (podcast.script) speakScript(podcast.script);
}

function updateSpeed(val) {
  document.getElementById('pod-speed-val').textContent = `${parseFloat(val).toFixed(2)}×`;
  if (podcast.utterance) podcast.utterance.rate = parseFloat(val);
}

function changeVoice() {
  if (podcast.script && podcast.playing) speakScript(podcast.script);
}

// ══════════════════════════════════════════════════════════════════════════════
// PODCAST — HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function showPodState(state) {
  document.getElementById('pod-idle').style.display    = state === 'idle'    ? 'flex' : 'none';
  document.getElementById('pod-loading').style.display = state === 'loading' ? 'flex' : 'none';
  document.getElementById('pod-player').style.display  = state === 'player'  ? 'flex' : 'none';
}

function setWaveActive(active) {
  document.getElementById('pod-waveform')?.classList.toggle('wave-active', active);
}

init();