import feedparser
import json
import asyncio
import os
import re
from datetime import datetime

# ══════════════════════════════════════════════════════════════════════════════
# CREDENTIALS — set these as GitHub Secrets (or in your local environment)
# ══════════════════════════════════════════════════════════════════════════════
TELEGRAM_API_ID    = os.environ.get("TELEGRAM_API_ID", "")
TELEGRAM_API_HASH  = os.environ.get("TELEGRAM_API_HASH", "")
TELEGRAM_SESSION   = os.environ.get("TELEGRAM_SESSION", "")
REDDIT_CLIENT_ID   = os.environ.get("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.environ.get("REDDIT_CLIENT_SECRET", "")

# ══════════════════════════════════════════════════════════════════════════════
# SOURCES
# ══════════════════════════════════════════════════════════════════════════════
RSS_FEEDS = {
    "American Media": [
        "https://feeds.bloomberg.com/markets/news.rss",
        "https://feeds.bloomberg.com/economics/news.rss",
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://www.cnbc.com/id/10001147/device/rss/rss.html",
        "http://rss.cnn.com/rss/money_news_companies.rss",
        "https://moxie.foxbusiness.com/google-publisher/markets.xml",
        "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
    ],
    "European Media": [
        "https://feeds.bbci.co.uk/news/business/rss.xml",
        "https://www.ft.com/rss/home",
        "https://www.economist.com/business/rss.xml",
    ],
    "Indian Media": [
        "https://www.moneycontrol.com/rss/latestnews.xml",
        "https://economictimes.indiatimes.com/rssfeedsdefault.cms",
        "https://www.business-standard.com/rss/home_page_top_stories.rss",
        "https://www.livemint.com/rss/markets",
    ],
    "Chinese Media": [
        "https://www.scmp.com/rss/91/feed",
        "https://asia.nikkei.com/rss/feed/nar",
        "https://www.globaltimes.cn/rss/outbrain.xml",
        "https://www.cgtn.com/subscribe/rss/section/business.xml",
    ],
    "Russian Media": [
        "https://tass.com/rss/v2.xml",
        "https://www.themoscowtimes.com/rss/news",
        "https://www.rt.com/rss/news",
    ],
    "Middle East": [
        "https://www.aljazeera.com/xml/rss/all.xml",
    ],
    "Alternative & Independent":[
        "https://thediplomat.com/feed/",
        "https://www.reddit.com/r/geopolitics.rss",
        "https://www.reddit.com/r/worldnews.rss",
        "https://www.reddit.com/r/economics.rss"
    ]
}

TELEGRAM_CHANNELS = [
    "geopolitics_prime",
]

REDDIT_SUBREDDITS = [
    "geopolitics", "worldnews", "CredibleDefense",
    "economics", "investing", "Sino", "IndiaInternational",
]

# ══════════════════════════════════════════════════════════════════════════════
# SCORING
# ══════════════════════════════════════════════════════════════════════════════
KEYWORDS = [
    'market', 'stock', 'bond', 'inflation', 'gdp', 'recession', 'fed',
    'interest rate', 'currency', 'trade', 'sanctions', 'war', 'conflict',
    'election', 'military', 'nato', 'china', 'russia', 'india', 'crisis',
    'collapse', 'surge', 'crash', 'treaty', 'summit', 'nuclear', 'oil',
]

def score(title: str) -> int:
    lower = title.lower()
    return min(20 + sum(8 for kw in KEYWORDS if kw in lower), 100)

def label(s: int) -> str:
    return "Critical" if s >= 70 else "High" if s >= 50 else "Medium" if s >= 30 else "Low"

# ══════════════════════════════════════════════════════════════════════════════
# FETCHERS
# ══════════════════════════════════════════════════════════════════════════════
def fetch_rss() -> list[dict]:
    items = []
    for category, urls in RSS_FEEDS.items():
        for url in urls:
            try:
                feed = feedparser.parse(url)
                for e in feed.entries[:15]:
                    title = e.get("title", "")
                    s = score(title)
                    items.append({
                        "source":    "rss",
                        "category":  category,
                        "outlet":    feed.feed.get("title", url),
                        "title":     title,
                        "url":       e.get("link", ""),
                        "published": e.get("published", ""),
                        "importance": s,
                        "importanceLabel": label(s),
                        "fetched_at": datetime.utcnow().isoformat(),
                    })
            except Exception as ex:
                print(f"  ❌ RSS {url}: {ex}")
    print(f"  ✅ RSS: {len(items)} articles")
    return items


async def _telegram_fetch() -> list[dict]:
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    items = []
    async with TelegramClient(StringSession(TELEGRAM_SESSION), int(TELEGRAM_API_ID), TELEGRAM_API_HASH) as client:
        for ch in TELEGRAM_CHANNELS:
            try:
                entity = await client.get_entity(ch)
                async for msg in client.iter_messages(entity, limit=30):
                    if not msg.text:
                        continue
                    items.append({
                        "source":       "telegram",
                        "channel":      ch,
                        "channel_title": getattr(entity, "title", ch),
                        "full_text":    msg.text.strip(),
                        "headline":     msg.text.strip().splitlines()[0][:280],
                        "has_media":    msg.media is not None,
                        "url":          f"https://t.me/{ch}/{msg.id}",
                        "posted_at":    msg.date.isoformat() if msg.date else None,
                        "fetched_at":   datetime.utcnow().isoformat(),
                    })
            except Exception as ex:
                print(f"  ❌ Telegram @{ch}: {ex}")
    print(f"  ✅ Telegram: {len(items)} messages")
    return items

def fetch_telegram() -> list[dict]:
    if not all([TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION]):
        print("  ⚠️  Telegram credentials missing — skipping")
        return []
    try:
        return asyncio.run(_telegram_fetch())
    except Exception as ex:
        print(f"  ❌ Telegram: {ex}")
        return []


def fetch_reddit() -> list[dict]:
    if not all([REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET]):
        print("  ⚠️  Reddit credentials missing — skipping")
        return []
    try:
        import praw
        reddit = praw.Reddit(client_id=REDDIT_CLIENT_ID, client_secret=REDDIT_CLIENT_SECRET, user_agent="fetcher/1.0")
        items = []
        for sub in REDDIT_SUBREDDITS:
            try:
                for post in reddit.subreddit(sub).new(limit=15):
                    items.append({
                        "source":    "reddit",
                        "subreddit": sub,
                        "title":     post.title,
                        "url":       post.url,
                        "reddit_url": f"https://reddit.com{post.permalink}",
                        "flair":     post.link_flair_text,
                        "domain":    post.domain,
                        "is_self":   post.is_self,
                        "self_text": post.selftext if post.is_self else None,
                        "posted_at": datetime.utcfromtimestamp(post.created_utc).isoformat(),
                        "fetched_at": datetime.utcnow().isoformat(),
                    })
            except Exception as ex:
                print(f"  ❌ Reddit r/{sub}: {ex}")
        print(f"  ✅ Reddit: {len(items)} posts")
        return items
    except Exception as ex:
        print(f"  ❌ Reddit: {ex}")
        return []

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("🔄 Fetching all sources...")

    all_items = fetch_rss() + fetch_telegram() #+ fetch_reddit()

    # RSS articles sorted by importance; Telegram/Reddit stay chronological within their block
    all_items.sort(key=lambda x: (x["source"] != "rss", -x.get("importance", 0)))

    out = os.path.join(os.path.dirname(__file__), "news.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_items, f, indent=2, ensure_ascii=False)

    print(f"\n✅ {len(all_items)} items → news.json")
    for src in ["rss", "telegram", "reddit"]:
        n = sum(1 for x in all_items if x["source"] == src)
        print(f"   {src:<10} {n}")