async function loadNews() {
  try {
    const response = await fetch('../python/news.json');
    const allNews = await response.json();

    // Group by category
    const categorizedNews = {};
    allNews.forEach(article => {
      if (!categorizedNews[article.category]) {
        categorizedNews[article.category] = [];
      }
      categorizedNews[article.category].push(article);
    });

    renderNews(categorizedNews);
  } catch (error) {
    document.getElementById('loading').textContent = 'Error loading news. Please refresh the page.';
    console.error(error);
  }
}

function renderNews(newsData) {
  const container = document.getElementById('news-container');
  const loading = document.getElementById('loading');
  
  loading.style.display = 'none';
  container.innerHTML = '';

  // Sort categories to show most important first
  const sortedCategories = Object.entries(newsData).sort((a, b) => {
    const avgA = a[1].reduce((sum, art) => sum + art.importance, 0) / a[1].length;
    const avgB = b[1].reduce((sum, art) => sum + art.importance, 0) / b[1].length;
    return avgB - avgA;
  });

  sortedCategories.forEach(([category, articles]) => {
    if (articles.length === 0) return;

    const section = document.createElement('div');
    section.className = 'category-section';

    section.innerHTML = `
      <div class="category-header">
        <div class="category-title">${category}</div>
        <div class="category-count">${articles.length} articles</div>
      </div>
      <div class="scroll-container"></div>
    `;

    container.appendChild(section);

    const scrollContainer = section.querySelector('.scroll-container');
    
    articles.forEach(article => {
      const card = document.createElement('div');
      card.className = 'news-card';
      
      const publishedDate = article.published ? new Date(article.published).toLocaleDateString() : 'N/A';
      
      // Determine badge color class
      let badgeClass = 'importance-low';
      if (article.importance >= 70) badgeClass = 'importance-critical';
      else if (article.importance >= 50) badgeClass = 'importance-high';
      else if (article.importance >= 30) badgeClass = 'importance-medium';
      
      // Use thumbnail from feed or fallback to category-specific images
      const fallbackThumbnails = {
        'Markets & Finance': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop',
        'Global Economy': 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=250&fit=crop',
        'Geopolitics': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop',
        'Technology': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=250&fit=crop',
        'Business': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=250&fit=crop'
      };
      
      const thumbnail = article.thumbnail || fallbackThumbnails[article.category] || fallbackThumbnails['Business'];
      
      card.innerHTML = `
        <div class="importance-badge ${badgeClass}">${article.importanceLabel}</div>
        <img src="${thumbnail}" alt="${article.category}" class="news-thumbnail" loading="lazy" onerror="this.src='${fallbackThumbnails[article.category]}'">
        <div class="news-card-content">
          <div class="news-title">${article.title}</div>
          <div class="news-meta">
            <span class="meta-tag">📰 ${article.source}</span>
            <span class="meta-tag">📅 ${publishedDate}</span>
          </div>
          <a href="${article.link}" target="_blank" class="news-link" onclick="event.stopPropagation()">Read Article →</a>
        </div>
      `;
      
      card.onclick = () => window.open(article.link, '_blank');
      scrollContainer.appendChild(card);
    });
  });
}

// Load news on page load
loadNews();