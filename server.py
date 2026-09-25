"""
KomikIndo Live Scraper & Web Server
Menghubungkan website komik langsung ke https://komikindo.ch/ secara live, dinamis, dan cepat dengan sistem caching.
"""

import sys
import os
import time
import json
import re
import urllib.request
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 3000
BASE_KOMIKINDO = "https://komikindo.ch"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# In-memory Cache { key: (data, timestamp, ttl) }
CACHE = {}

def get_cache(key):
    if key in CACHE:
        data, ts, ttl = CACHE[key]
        if time.time() - ts < ttl:
            return data
        else:
            del CACHE[key]
    return None

def set_cache(key, data, ttl=300):
    CACHE[key] = (data, time.time(), ttl)

def fetch_html(url, retries=2):
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    for _ in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                return resp.read().decode('utf-8', errors='ignore')
        except Exception as e:
            time.sleep(0.5)
    return ""

def clean_text(html_text):
    if not html_text:
        return ""
    text = re.sub(r'<[^>]+>', '', html_text)
    return urllib.parse.unquote(text).strip()

# --- Scraper Functions ---

def scrape_comic_cards(html):
    cards = []
    # Match each animepost block
    blocks = re.findall(r'<div class="animepost"[^>]*>(.*?)(?=<div class="animepost"|</div>\s*</div>\s*</div>\s*</div>)', html, re.DOTALL)
    if not blocks:
        blocks = re.findall(r'<div class="animposx"[^>]*>(.*?)(?=<div class="animposx"|</div>\s*</div>\s*</div>)', html, re.DOTALL)

    for block in blocks:
        # Title and URL
        title_m = re.search(r'<h3>\s*<a href="([^"]+)"[^>]*>(.*?)</a>\s*</h3>', block, re.DOTALL)
        if not title_m:
            title_m = re.search(r'<h4>\s*<a href="([^"]+)"[^>]*>(.*?)</a>\s*</h4>', block, re.DOTALL)
        if not title_m:
            title_m = re.search(r'<a href="(https://komikindo\.ch/komik/[^"]+)"[^>]*title="([^"]+)"', block)

        if not title_m:
            continue

        raw_url = title_m.group(1).strip()
        slug = raw_url.rstrip('/').split('/')[-1]
        title = clean_text(title_m.group(2))
        if title.lower().startswith("komik "):
            title = title[6:].strip()

        # Image cover
        img_m = re.search(r'<img[^>]+src="([^"]+)"', block)
        cover = img_m.group(1) if img_m else ""

        # Type (Manhwa, Manga, Manhua)
        type_m = re.search(r'class="typeflag\s+([^"]+)"', block)
        comic_type = type_m.group(1).strip() if type_m else "Manga"

        # Color badge
        is_color = "warnalabel" in block

        # Latest chapter info
        ch_m = re.search(r'<div class="lsch"[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)</a>\s*<span class="datech">(.*?)</span>', block, re.DOTALL)
        latest_chapter = ""
        chapter_date = ""
        if ch_m:
            latest_chapter = clean_text(ch_m.group(2))
            chapter_date = clean_text(ch_m.group(3))
        else:
            simple_ch = re.search(r'<div class="lsch"[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)</a>', block, re.DOTALL)
            if simple_ch:
                latest_chapter = clean_text(simple_ch.group(2))

        # Rating
        rating_m = re.search(r'<div class="rating"[^>]*>.*?<i[^>]*>([0-9.]+)</i>', block, re.DOTALL)
        rating = rating_m.group(1) if rating_m else "9.0"

        cards.append({
            "id": slug,
            "slug": slug,
            "title": title,
            "url": raw_url,
            "coverImage": cover,
            "type": comic_type,
            "isColor": is_color,
            "rating": float(rating) if rating.replace('.', '', 1).isdigit() else 9.0,
            "latestChapter": latest_chapter or "Chapter Terbaru",
            "chapterDate": chapter_date or "Terbaru"
        })

    return cards

def get_latest_comics(page=1):
    cache_key = f"latest_{page}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    url = f"{BASE_KOMIKINDO}/komik-terbaru/" if page == 1 else f"{BASE_KOMIKINDO}/komik-terbaru/page/{page}/"
    html = fetch_html(url)
    cards = scrape_comic_cards(html)
    set_cache(cache_key, cards, ttl=300) # Cache 5 mins
    return cards

def get_popular_comics(page=1):
    cache_key = f"popular_{page}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    url = f"{BASE_KOMIKINDO}/komik-populer/" if page == 1 else f"{BASE_KOMIKINDO}/komik-populer/page/{page}/"
    html = fetch_html(url)
    cards = scrape_comic_cards(html)
    set_cache(cache_key, cards, ttl=600) # Cache 10 mins
    return cards

def search_comics(query):
    query_clean = query.strip()
    cache_key = f"search_{query_clean}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    encoded = urllib.parse.quote(query_clean)
    url = f"{BASE_KOMIKINDO}/?s={encoded}"
    html = fetch_html(url)
    cards = scrape_comic_cards(html)
    set_cache(cache_key, cards, ttl=900)
    return cards

def get_comic_detail(slug):
    cache_key = f"comic_{slug}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    url = f"{BASE_KOMIKINDO}/komik/{slug}/"
    html = fetch_html(url)
    if not html:
        return None

    # Title from <title> tag
    title_m = re.search(r'<title>Komik (.*?) - KomikIndo</title>', html, re.IGNORECASE)
    if not title_m:
        title_m = re.search(r'<title>(.*?) - KomikIndo</title>', html, re.IGNORECASE)
    title = clean_text(title_m.group(1)) if title_m else slug.replace('-', ' ').title()

    # Cover
    cover_m = re.search(r'<div class="thumb"[^>]*>.*?<img[^>]+src="([^"]+)"', html, re.DOTALL)
    cover = cover_m.group(1) if cover_m else ""

    # Synopsis
    syn_m = re.search(r'<div class="entry-content entry-content-single"[^>]*>(.*?)</div>', html, re.DOTALL)
    synopsis = clean_text(syn_m.group(1)) if syn_m else "Sinopsis belum tersedia."

    # Meta Table: Status, Pengarang, Ilustrator, Grafis, Tema
    meta = {}
    for row in re.findall(r'<span><b>([^<]+):?</b>\s*(.*?)</span>', html, re.DOTALL):
        k = row[0].strip().rstrip(':')
        v = clean_text(row[1])
        meta[k] = v

    status = meta.get("Status", "Ongoing")
    author = meta.get("Pengarang", "Unknown")
    artist = meta.get("Ilustrator", "Unknown")
    comic_type = meta.get("Grafis", "Manhwa")
    themes_str = meta.get("Tema", "")
    themes = [t.strip() for t in themes_str.split(',') if t.strip()] if themes_str else []

    # Genres
    genres = [clean_text(g) for g in re.findall(r'<a[^>]+href="https://komikindo\.ch/genres/[^/]+/"[^>]*>([^<]+)</a>', html)]

    # Chapters list
    pattern = r'<span class="lchx">\s*<a href="([^"]+)"[^>]*>(.*?)</a>\s*</span>\s*<span class="dt"><a[^>]*>(.*?)</a></span>'
    ch_matches = re.findall(pattern, html, re.DOTALL)
    chapters = []
    
    for link, raw_title, date in ch_matches:
        ch_slug = link.rstrip('/').split('/')[-1]
        ch_title = clean_text(raw_title)
        chapters.append({
            "id": ch_slug,
            "slug": ch_slug,
            "title": ch_title,
            "url": link,
            "releaseDate": date.strip(),
            "isEnd": "end" in ch_title.lower()
        })

    result = {
        "id": slug,
        "slug": slug,
        "title": title,
        "coverImage": cover,
        "synopsis": synopsis,
        "status": status,
        "author": author,
        "artist": artist,
        "type": comic_type,
        "genres": genres if genres else ["Action", "Fantasy"],
        "themes": themes if themes else ["Magic", "Monsters"],
        "rating": 9.5,
        "totalChapters": len(chapters),
        "chapters": chapters
    }

    set_cache(cache_key, result, ttl=1800) # Cache 30 mins
    return result

def get_chapter_pages(chapter_slug):
    cache_key = f"chapter_{chapter_slug}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    url = f"{BASE_KOMIKINDO}/{chapter_slug}/"
    html = fetch_html(url)
    if not html:
        return None

    # Title
    t_m = re.search(r'<title>(.*?) - KomikIndo</title>', html)
    title = clean_text(t_m.group(1)) if t_m else chapter_slug.replace('-', ' ').title()

    # Extract all real pages from readerarea
    all_imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
    manga_pages = [
        img for img in all_imgs
        if ('/data/' in img or '.jpg' in img or '.webp' in img)
        and 'blogger' not in img
        and 'komikindo-e' not in img
        and 'fav.png' not in img
    ]

    # Comic detail link / slug
    comic_link_m = re.search(r'<a href="https://komikindo\.ch/komik/([^/]+)/"[^>]*>Daftar Chapter</a>', html)
    comic_slug = comic_link_m.group(1) if comic_link_m else ""

    # Next / Prev chapter
    next_m = re.search(r'<a[^>]+href="https://komikindo\.ch/([^/]+)/"[^>]*>Chapter Selanjutnya', html)
    next_slug = next_m.group(1) if next_m else ""

    prev_m = re.search(r'<a[^>]+href="https://komikindo\.ch/([^/]+)/"[^>]*>Chapter Sebelumnya', html)
    prev_slug = prev_m.group(1) if prev_m else ""

    result = {
        "slug": chapter_slug,
        "title": title,
        "comicSlug": comic_slug,
        "nextSlug": next_slug,
        "prevSlug": prev_slug,
        "pages": manga_pages
    }

    if manga_pages:
        set_cache(cache_key, result, ttl=86400) # Cache 24 hours
    return result


# --- HTTP Server Handler ---

class KomikHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and No-Referrer Policy
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Referrer-Policy', 'no-referrer')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API Routes
        if path.startswith("/api/"):
            self.handle_api(path, query)
        else:
            # Serve static files
            super().do_GET()

    def handle_api(self, path, query):
        response_data = None

        try:
            if path == "/api/latest":
                page = int(query.get("page", [1])[0])
                response_data = {"status": "success", "data": get_latest_comics(page)}

            elif path == "/api/popular":
                page = int(query.get("page", [1])[0])
                response_data = {"status": "success", "data": get_popular_comics(page)}

            elif path == "/api/search":
                q = query.get("q", [""])[0]
                if q:
                    response_data = {"status": "success", "data": search_comics(q)}
                else:
                    response_data = {"status": "error", "message": "Query 'q' diperlukan"}

            elif path == "/api/comic":
                slug = query.get("slug", [""])[0]
                if slug:
                    detail = get_comic_detail(slug)
                    if detail:
                        response_data = {"status": "success", "data": detail}
                    else:
                        response_data = {"status": "error", "message": "Komik tidak ditemukan"}
                else:
                    response_data = {"status": "error", "message": "Parameter 'slug' diperlukan"}

            elif path == "/api/chapter":
                slug = query.get("slug", [""])[0]
                if slug:
                    chapter = get_chapter_pages(slug)
                    if chapter:
                        response_data = {"status": "success", "data": chapter}
                    else:
                        response_data = {"status": "error", "message": "Chapter tidak ditemukan"}
                else:
                    response_data = {"status": "error", "message": "Parameter 'slug' diperlukan"}

            else:
                response_data = {"status": "error", "message": "Endpoint tidak dikenal"}

        except Exception as e:
            response_data = {"status": "error", "message": str(e)}

        body = json.dumps(response_data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"[*] Menjalankan KomikIndo Live Server pada http://localhost:{PORT}")
    server = ThreadingHTTPServer(('0.0.0.0', PORT), KomikHandler)
    server.serve_forever()
