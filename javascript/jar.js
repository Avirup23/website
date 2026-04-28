// Replace the DATA line and everything after with this:
fetch('../static/motivation.json5')
  .then(res => res.text())               // fetch as raw text (not .json()!)
  .then(text => {
    const DATA = JSON5.parse(text);      // parse with the JSON5 library
    renderPage(DATA);                    // call your render logic
  })
  .catch(err => console.error('Failed to load journal data:', err));

document.getElementById('site-title').textContent = DATA.title;
document.getElementById('site-subtitle').textContent = DATA.subtitle;

function renderPage(DATA) {
  document.getElementById('site-title').textContent = DATA.title;
  document.getElementById('site-subtitle').textContent = DATA.subtitle;

  const timeline = document.getElementById('timeline');

    DATA.chapters.forEach(chapter => {
    const sec = document.createElement('section');
    sec.className = 'chapter';

    sec.innerHTML = `
        <div class="chapter-header">
        <span class="chapter-year">${chapter.year}</span>
        <span class="chapter-title">${chapter.label}</span>
        <div class="chapter-line"></div>
        </div>`;

    chapter.entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'entry';

        // media column
        let mediaHTML = '';
        if (!entry.media) {
        mediaHTML = `<div class="media-placeholder">✦</div>`;
        } else if (entry.media.type === 'image') {
        mediaHTML = `<img src="${entry.media.src}" alt="${entry.title}" loading="lazy" />`;
        } else if (entry.media.type === 'youtube') {
        mediaHTML = `
            <div class="video-wrap">
            <iframe src="https://www.youtube.com/embed/${entry.media.id}?rel=0"
                title="${entry.title}" allowfullscreen loading="lazy"></iframe>
            </div>`;
        } else if (entry.media.type === 'video') {
        mediaHTML = `
            <div class="video-wrap">
            <video src="${entry.media.src}" controls playsinline></video>
            </div>`;
        }

        // text column
        const tagsHTML = entry.tags?.length
        ? `<div class="tags">${entry.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
        : '';

        const quoteHTML = entry.quote
        ? `<blockquote class="entry-quote">${entry.quote}</blockquote>`
        : '';

        const bodyHTML = entry.body
        ? entry.body.split('\n').map(p => `<p class="entry-body">${p}</p>`).join('')
        : '';

        card.innerHTML = `
        <div class="media-col">
            ${mediaHTML}
            ${entry.date ? `<span class="date-badge">${entry.date}</span>` : ''}
        </div>
        <div class="text-col">
            ${entry.mood ? `<p class="entry-mood">${entry.mood}</p>` : ''}
            <h2 class="entry-title">${entry.title}</h2>
            ${bodyHTML}
            ${quoteHTML}
            ${tagsHTML}
        </div>`;

        sec.appendChild(card);
    });

    timeline.appendChild(sec);
    });

    // scroll-triggered fade-in
    const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.08 }
    );
    document.querySelectorAll('.entry').forEach(el => observer.observe(el));
}