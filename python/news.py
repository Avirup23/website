import feedparser
import json
from datetime import datetime
import os

# Expanded RSS feeds
feeds = {
    "Markets & Finance": [
        "https://feeds.bloomberg.com/markets/news.rss",
        "https://feeds.bbci.co.uk/news/business/rss.xml"
    ],
    "Global Economy": [
        "https://feeds.bloomberg.com/economics/news.rss",
        "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml"
    ],
    "Geopolitics": [
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://thediplomat.com/feed/",
        "https://indianexpress.com/section/world/feed/"
    ],
    "Technology": [
        "https://feeds.bbci.co.uk/news/technology/rss.xml"
    ],
    "Business": [
        "https://indianexpress.com/section/business/feed/"
    ]
}

# Keywords for importance scoring
QUANT_KEYWORDS = [
    'market', 'trading', 'stock', 'equity', 'bond', 'derivative', 'volatility',
    'portfolio', 'risk', 'hedge', 'option', 'futures', 'quantitative', 'algorithm',
    'fed', 'interest rate', 'inflation', 'gdp', 'recession', 'bull', 'bear',
    'banking', 'investment', 'finance', 'currency', 'forex', 'commodity',
    'earnings', 'valuation', 'credit', 'debt', 'yield', 'treasury', 'central bank',
    'monetary', 'fiscal', 'analyst', 'forecast', 'economic data', 'financial'
]

GEOPOLITICS_KEYWORDS = [
    'china', 'russia', 'ukraine', 'nato', 'sanctions', 'trade war', 'diplomacy',
    'conflict', 'summit', 'alliance', 'security', 'military', 'treaty',
    'middle east', 'asia pacific', 'european union', 'g7', 'g20', 'brics',
    'taiwan', 'korea', 'india', 'pakistan', 'iran', 'israel', 'palestine',
    'election', 'president', 'prime minister', 'policy', 'strategy', 'geopolitical',
    'sovereignty', 'border', 'territorial', 'defense', 'war', 'peace'
]

HIGH_IMPACT_WORDS = [
    'crisis', 'crash', 'surge', 'plunge', 'breaking', 'urgent', 'emergency',
    'war', 'attack', 'collapse', 'breakthrough', 'historic'
]

def calculate_importance(title, category):
    """Calculate importance score based on keywords and category"""
    lower_title = title.lower()
    score = 0
    
    # Base score by category
    category_scores = {
        "Markets & Finance": 30,
        "Global Economy": 25,
        "Geopolitics": 25,
        "Business": 20,
        "Technology": 15
    }
    score += category_scores.get(category, 10)
    
    # Keyword matching
    for keyword in QUANT_KEYWORDS:
        if keyword in lower_title:
            score += 5
    
    for keyword in GEOPOLITICS_KEYWORDS:
        if keyword in lower_title:
            score += 5
    
    # High-impact words
    for word in HIGH_IMPACT_WORDS:
        if word in lower_title:
            score += 10
    
    return min(score, 100)

def get_importance_label(score):
    """Get importance badge label"""
    if score >= 70:
        return "Critical"
    elif score >= 50:
        return "High"
    elif score >= 30:
        return "Medium"
    else:
        return "Low"

# Collect all news
all_news = []

print("🔄 Fetching RSS feeds...")

for category, urls in feeds.items():
    for url in urls:
        try:
            print(f"  📡 Fetching {category}: {url}")
            feed = feedparser.parse(url)
            
            for entry in feed.entries[:20]:  # Limit to 20 articles per feed
                title = entry.get('title', 'No title')
                importance_score = calculate_importance(title, category)
                
                # Extract thumbnail from feed
                thumbnail = None
                
                # Try different possible thumbnail fields
                if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                    thumbnail = entry.media_thumbnail[0].get('url', None)
                elif hasattr(entry, 'media_content') and entry.media_content:
                    thumbnail = entry.media_content[0].get('url', None)
                elif hasattr(entry, 'enclosures') and entry.enclosures:
                    for enclosure in entry.enclosures:
                        if 'image' in enclosure.get('type', ''):
                            thumbnail = enclosure.get('href', None)
                            break
                elif hasattr(entry, 'links'):
                    for link in entry.links:
                        if link.get('rel') == 'enclosure' and 'image' in link.get('type', ''):
                            thumbnail = link.get('href', None)
                            break
                
                # Fallback: try to find image in content
                if not thumbnail and hasattr(entry, 'content'):
                    import re
                    content = entry.content[0].get('value', '')
                    img_match = re.search(r'<img[^>]+src="([^">]+)"', content)
                    if img_match:
                        thumbnail = img_match.group(1)
                
                article = {
                    "title": title,
                    "link": entry.get('link', ''),
                    "source": feed.feed.get('title', 'Unknown'),
                    "category": category,
                    "published": entry.get("published", ""),
                    "thumbnail": thumbnail,
                    "importance": importance_score,
                    "importanceLabel": get_importance_label(importance_score),
                    "updated_at": datetime.now().isoformat()
                }
                all_news.append(article)
                
        except Exception as e:
            print(f"  ❌ Error fetching {url}: {e}")

# Sort all news by importance score (descending)
all_news.sort(key=lambda x: x['importance'], reverse=True)

# Save to JSON
file_path = os.path.join(os.path.dirname(__file__), "news.json")

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(all_news, f, indent=2, ensure_ascii=False)

print(f"\n✅ news.json saved to: {file_path}")
print(f"📊 Total articles: {len(all_news)}")
print(f"🔥 Critical articles: {sum(1 for a in all_news if a['importance'] >= 70)}")
print(f"⚡ High priority articles: {sum(1 for a in all_news if 50 <= a['importance'] < 70)}")
print("✅ news.json updated successfully")