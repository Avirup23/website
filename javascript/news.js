let allData = [];

fetch('../python/news.json')
  .then(res => res.json())
  .then(data => {
    allData = data;
    showNews(data);
  });

function showNews(data) {
  const container = document.getElementById("news");
  container.innerHTML = "";
  data.forEach(item => {
    container.innerHTML += `
      <div class="card">
        <h3>${item.title}</h3>
        <div class="tag">${item.source} • ${item.category} • ${item.published}</div>
        <a href="${item.link}" target="_blank">Read more</a>
      </div>
    `;
  });
}

function filter(category) {
  if (category === "All") return showNews(allData);
  const filtered = allData.filter(n => n.category === category);
  showNews(filtered);
}