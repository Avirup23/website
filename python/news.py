import feedparser
import json
from datetime import datetime
import os

feeds = {
    "Business": [
        "https://feeds.bbci.co.uk/news/business/rss.xml"
    ],
    "Technology": [
        "https://feeds.bbci.co.uk/news/technology/rss.xml"
    ]
}
# Indian Express
# https://indianexpress.com/section/business/feed/
# https://indianexpress.com/section/world/feed/

# The Diplomat
# https://thediplomat.com/feed/

# Bloomberg
# https://feeds.bloomberg.com/markets/news.rss
# https://feeds.bloomberg.com/politics/news.rss

# Financial Times
# https://www.ft.com/rss/global-economy
# https://www.ft.com/rss/markets
# https://www.ft.com/rss/world

# NY Times
# https://rss.nytimes.com/services/xml/rss/nyt/World.xml
# https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml

all_news = []

for category, urls in feeds.items():
    for url in urls:
        feed = feedparser.parse(url)
        for entry in feed.entries[:5]:
            all_news.append({
                "title": entry.title,
                "link": entry.link,
                "source": feed.feed.title,
                "category": category,
                "published": entry.get("published", ""),
                "updated_at": datetime.now().isoformat()
            })

file_path = os.path.join(os.path.dirname(__file__), "news.json")

print(f"✅ news.json saved to: {file_path}")

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(all_news, f, indent=2, ensure_ascii=False)

print("✅ news.json updated")