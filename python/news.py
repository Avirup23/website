import urllib.parse
import feedparser
from datetime import datetime, timedelta
import asyncio
import json
import os
import re
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from email.utils import parsedate_to_datetime

# ══════════════════════════════════════════════════════════════════════════════
# CREDENTIALS — set these as GitHub Secrets (or in your local environment)
# ══════════════════════════════════════════════════════════════════════════════
TELEGRAM_API_ID    = os.environ.get("TELEGRAM_API_ID", "")
TELEGRAM_API_HASH  = os.environ.get("TELEGRAM_API_HASH", "")
TELEGRAM_SESSION   = os.environ.get("TELEGRAM_SESSION", "")

# ══════════════════════════════════════════════════════════════════════════════
# SOURCES
# ══════════════════════════════════════════════════════════════════════════════
RSS_FEEDS = {
    "American Media": [
        "https://feeds.bloomberg.com/markets/news.rss",
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
    "Alternative & Independent": [
        "https://thediplomat.com/feed/",
    ],
}

REDDIT_FEEDS = [
    "https://www.reddit.com/r/geopolitics.rss",
    "https://www.reddit.com/r/worldnews.rss",
    "https://www.reddit.com/r/economics.rss",
    "https://www.reddit.com/r/Sino.rss",
    "https://www.reddit.com/r/CredibleDefense.rss",
    "https://www.reddit.com/r/investing.rss",
]

TELEGRAM_CHANNELS = [
    "geopolitics_prime",
]

# ══════════════════════════════════════════════════════════════════════════════
# SCORING
# ══════════════════════════════════════════════════════════════════════════════
KEYWORDS = [
    # Markets & Finance
    'market', 'stock', 'bond', 'inflation', 'gdp', 'recession', 'fed',
    'interest rate', 'currency', 'trade', 'tariff', 'deficit', 'surplus',
    'debt', 'default', 'bankruptcy', 'bailout', 'stimulus', 'quantitative',
    'yield', 'equity', 'commodity', 'futures', 'derivatives', 'hedge fund',
    'ipo', 'earnings', 'revenue', 'profit', 'loss', 'dividend', 'valuation',
    'forex', 'dollar', 'euro', 'yuan', 'rupee', 'ruble', 'yen',
    # Energy & Resources
    'oil', 'gas', 'opec', 'energy', 'pipeline', 'lng', 'petroleum',
    'coal', 'uranium', 'lithium', 'rare earth', 'semiconductor', 'chip',
    # Geopolitics & Conflict
    'sanctions', 'war', 'conflict', 'military', 'nato', 'treaty', 'summit',
    'nuclear', 'missile', 'drone', 'ceasefire', 'invasion', 'occupation',
    'coup', 'revolution', 'protest', 'uprising', 'terrorism', 'insurgency',
    'espionage', 'intelligence', 'cyber', 'hack', 'disinformation',
    # Key Countries & Regions
    'china', 'russia', 'india', 'usa', 'europe', 'iran', 'israel',
    'ukraine', 'taiwan', 'pakistan', 'north korea', 'saudi arabia',
    'africa', 'latin america', 'asean', 'brics', 'g7', 'g20',
    # Political & Institutional
    'election', 'crisis', 'collapse', 'surge', 'crash', 'embargo',
    'imf', 'world bank', 'wto', 'un', 'central bank', 'federal reserve',
    'parliament', 'congress', 'senate', 'constitution', 'referendum',
    # Tech & Industry
    'ai', 'artificial intelligence', 'tech', 'supply chain', 'manufacturing',
    'export control', 'ban', 'regulation', 'antitrust', 'monopoly',
]

RSS_MAX_AGE_DAYS = 5

def parse_published(published_str: str):
    """Parse a published date string to a timezone-aware datetime, or None."""
    if not published_str:
        return None
    try:
        return parsedate_to_datetime(published_str)
    except Exception:
        pass
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%a, %d %b %Y %H:%M:%S %Z"):
        try:
            dt = datetime.strptime(published_str, fmt)
            if dt.tzinfo is None:
                from datetime import timezone
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            pass
    return None

def age_decay(published_str: str) -> float:
    """
    Returns a multiplier in (0, 1] that reduces score for older articles.
    - < 6 hours  → 1.0  (no decay)
    - 6h–24h     → 0.85
    - 1–2 days   → 0.70
    - 2–3 days   → 0.55
    - 3–4 days   → 0.40
    - 4–5 days   → 0.25
    """
    from datetime import timezone
    dt = parse_published(published_str)
    if dt is None:
        return 0.75  # unknown age gets a moderate penalty
    now = datetime.now(timezone.utc)
    age_hours = (now - dt).total_seconds() / 3600
    if age_hours < 6:
        return 1.0
    elif age_hours < 24:
        return 0.85
    elif age_hours < 48:
        return 0.70
    elif age_hours < 72:
        return 0.55
    elif age_hours < 96:
        return 0.40
    else:
        return 0.25

def score(title: str, published_str: str = "") -> int:
    lower = title.lower()
    raw = min(20 + sum(8 for kw in KEYWORDS if kw in lower), 100)
    decayed = raw * age_decay(published_str)
    return max(1, round(decayed))

def label(s: int) -> str:
    return "Critical" if s >= 70 else "High" if s >= 50 else "Medium" if s >= 30 else "Low"

def is_too_old(published_str: str) -> bool:
    """Returns True if article is older than RSS_MAX_AGE_DAYS."""
    from datetime import timezone
    dt = parse_published(published_str)
    if dt is None:
        return False  # can't determine age, keep it
    cutoff = datetime.now(timezone.utc) - timedelta(days=RSS_MAX_AGE_DAYS)
    return dt < cutoff

# ══════════════════════════════════════════════════════════════════════════════
# FETCHERS
# ══════════════════════════════════════════════════════════════════════════════
def fetch_rss() -> list[dict]:
    items = []
    skipped_old = 0
    for category, urls in RSS_FEEDS.items():
        for url in urls:
            try:
                feed = feedparser.parse(url)
                for e in feed.entries[:15]:
                    published = e.get("published", "")
                    if is_too_old(published):
                        skipped_old += 1
                        continue

                    title = e.get("title", "")
                    s = score(title, published)

                    # --- thumbnail extraction ---
                    thumb = None
                    media = e.get("media_thumbnail") or e.get("media_content")
                    if media and isinstance(media, list):
                        thumb = media[0].get("url")
                    if not thumb:
                        for enc in e.get("enclosures", []):
                            if enc.get("type", "").startswith("image"):
                                thumb = enc.get("url"); break
                    if not thumb:
                        html = e.get("summary", "") or (e.get("content") or [{}])[0].get("value", "")
                        m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html)
                        if m:
                            thumb = m.group(1)

                    items.append({
                        "source":           "rss",
                        "category":         category,
                        "outlet":           feed.feed.get("title", url),
                        "title":            title,
                        "thumbnail":        thumb,
                        "url":              e.get("link", ""),
                        "published":        published,
                        "importance":       s,
                        "importanceLabel":  label(s),
                        "fetched_at":       datetime.utcnow().isoformat(),
                    })
            except Exception as ex:
                print(f"  ❌ RSS {url}: {ex}")
    print(f"  ✅ RSS: {len(items)} articles kept, {skipped_old} skipped (>{RSS_MAX_AGE_DAYS}d old)")
    return items


def fetch_reddit() -> list[dict]:
    items = []
    skipped_old = 0
    for url in REDDIT_FEEDS:
        try:
            feed = feedparser.parse(url, request_headers={"User-Agent": "NewsAggregator/1.0"})
            subreddit = url.rstrip("/").split("/r/")[1].replace(".rss", "")
            for e in feed.entries[:20]:
                published = e.get("published", "")
                if is_too_old(published):
                    skipped_old += 1
                    continue

                title = e.get("title", "")
                s = score(title, published)

                # Reddit sometimes nests content in summary HTML
                thumb = None
                html = e.get("summary", "") or (e.get("content") or [{}])[0].get("value", "")
                m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html)
                if m:
                    thumb = m.group(1)

                items.append({
                    "source":           "reddit",
                    "category":         "Reddit",
                    "subreddit":        subreddit,
                    "outlet":           f"r/{subreddit}",
                    "title":            title,
                    "thumbnail":        thumb,
                    "url":              e.get("link", ""),
                    "published":        published,
                    "importance":       s,
                    "importanceLabel":  label(s),
                    "fetched_at":       datetime.utcnow().isoformat(),
                })
        except Exception as ex:
            print(f"  ❌ Reddit {url}: {ex}")
    print(f"  ✅ Reddit: {len(items)} posts kept, {skipped_old} skipped (>{RSS_MAX_AGE_DAYS}d old)")
    return items


async def _telegram_fetch() -> list[dict]:
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    from datetime import timezone
    items = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=12)
    async with TelegramClient(StringSession(TELEGRAM_SESSION), int(TELEGRAM_API_ID), TELEGRAM_API_HASH) as client:
        for ch in TELEGRAM_CHANNELS:
            try:
                entity = await client.get_entity(ch)
                async for msg in client.iter_messages(entity, limit=200, offset_date=None):
                    if not msg.text:
                        continue
                    if msg.date and msg.date < cutoff:
                        break
                    items.append({
                        "source":        "telegram",
                        "channel":       ch,
                        "channel_title": getattr(entity, "title", ch),
                        "full_text":     msg.text.strip(),
                        "headline":      msg.text.strip().splitlines()[0][:280],
                        "has_media":     msg.media is not None,
                        "url":           f"https://t.me/{ch}/{msg.id}",
                        "posted_at":     msg.date.isoformat() if msg.date else None,
                        "fetched_at":    datetime.utcnow().isoformat(),
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

# ══════════════════════════════════════════════════════════════════════════════
# PODCAST SCRIPT GENERATION
# ══════════════════════════════════════════════════════════════════════════════
def generate_podcast(all_items: list[dict]) -> None:
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        print("\n  ⚠️  GROQ_API_KEY not set — skipping podcast generation")
        return

    # Pick Critical + High items, top 20 by importance
    headlines = [
        a for a in all_items
        if a.get("source") in ("rss", "reddit") and (a.get("importance") or 0) >= 50
    ]
    headlines.sort(key=lambda x: -(x.get("importance") or 0))
    headlines = headlines[:20]

    if not headlines:
        print("\n  ⚠️  No Critical/High headlines found — skipping podcast")
        return

    headline_list = "\n".join(
        f"{i+1}. [{a['importanceLabel']}] {a['title']} — {a.get('outlet') or a.get('subreddit', '')}"
        for i, a in enumerate(headlines)
    )

    prompt = f"""You are a sharp, authoritative news anchor delivering a 60–90 second audio news brief.
Your tone is calm, professional, and slightly dramatic — like a BBC World Service bulletin.

Below are today's most important headlines, ranked by importance.
Write a flowing, natural-sounding spoken script that:
- Opens with a crisp dateline intro (e.g. "Good evening. Here are today's critical developments.")
- Groups related stories naturally (don't just read a list)
- Uses broadcast language: short sentences, active voice, present tense where possible
- Briefly contextualises the 2–3 most critical stories
- Closes with a sign-off line
- Is written PURELY as spoken words — no markdown, no bullet points, no stage directions, no asterisks

Headlines:
{headline_list}"""

    try:
        print("\n🎙  Generating podcast script via Groq...")
        llm     = ChatGroq(api_key=api_key, model="llama-3.3-70b-versatile", temperature=0.7)
        message = llm.invoke([HumanMessage(content=prompt)])
        script  = message.content.strip()

        out = os.path.join(os.path.dirname(__file__), "podcast_script.txt")
        with open(out, "w", encoding="utf-8") as f:
            f.write(script)
        print(f"  ✅ Podcast script → podcast_script.txt ({len(script)} chars)")

    except Exception as ex:
        print(f"  ❌ Podcast generation failed: {ex}")

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("🔄 Fetching all sources...")

    rss_items      = fetch_rss()
    reddit_items   = fetch_reddit()
    telegram_items = fetch_telegram()

    all_items = rss_items + reddit_items + telegram_items

    # Sort: RSS first, then Reddit, then Telegram; within each source by importance desc
    source_order = {"rss": 0, "reddit": 1, "telegram": 2}
    all_items.sort(key=lambda x: (source_order.get(x["source"], 9), -x.get("importance", 0)))

    out = os.path.join(os.path.dirname(__file__), "news.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_items, f, indent=2, ensure_ascii=False)

    print(f"\n✅ {len(all_items)} items → news.json")
    for src in ["rss", "reddit", "telegram"]:
        n = sum(1 for x in all_items if x["source"] == src)
        print(f"   {src:<10} {n}")

    generate_podcast(all_items)