"""
Build Static Data for GitHub Pages Deployment
Mengambil dan menyimpan data JSON statis agar web bisa berjalan 100% sempurna di GitHub Pages tanpa backend server!
"""

import urllib.request
import json
import os

BASE_API = "http://localhost:3000/api"

def fetch_json(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def save_json(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Saved: {filepath}")

def main():
    print("[*] Generating static JSON data for GitHub Pages...")

    # 1. Latest & Popular
    latest = fetch_json(f"{BASE_API}/latest")
    if latest and latest.get("status") == "success":
        save_json("data/latest.json", latest["data"])
    
    popular = fetch_json(f"{BASE_API}/popular")
    if popular and popular.get("status") == "success":
        save_json("data/popular.json", popular["data"])

    # 2. Solo Leveling Detail & Chapters
    sl_detail = fetch_json(f"{BASE_API}/comic?slug=229848-solo-leveling")
    if sl_detail and sl_detail.get("status") == "success":
        save_json("data/comics/229848-solo-leveling.json", sl_detail["data"])

    sample_chapters = [
        "solo-leveling-chapter-1",
        "solo-leveling-chapter-2",
        "solo-leveling-chapter-3",
        "solo-leveling-chapter-4",
        "solo-leveling-chapter-5",
        "solo-leveling-chapter-6",
        "solo-leveling-chapter-7",
        "solo-leveling-chapter-8",
        "solo-leveling-chapter-9",
        "solo-leveling-chapter-10",
        "solo-leveling-chapter-179-end"
    ]

    for ch_slug in sample_chapters:
        ch_data = fetch_json(f"{BASE_API}/chapter?slug={ch_slug}")
        if ch_data and ch_data.get("status") == "success":
            save_json(f"data/chapters/{ch_slug}.json", ch_data["data"])

    # 3. Cache ALL comics from popular & latest
    all_slugs = []
    if popular and popular.get("data"):
        for c in popular["data"]:
            if c["slug"] not in all_slugs:
                all_slugs.append(c["slug"])
            
    if latest and latest.get("data"):
        for c in latest["data"]:
            if c["slug"] not in all_slugs:
                all_slugs.append(c["slug"])

    top_series = [
        "229848-solo-leveling",
        "martial-peak",
        "155895-nano-machine",
        "447206-the-beginning-after-the-end",
        "846048-eleceed",
        "950565-lookism",
        "one-piece-id"
    ]

    print(f"[*] Caching details for ALL {len(all_slugs)} comics...")
    for c_slug in all_slugs:
        detail_file = f"data/comics/{c_slug}.json"
        cd_data = None
        if os.path.exists(detail_file):
            try:
                with open(detail_file, 'r', encoding='utf-8') as f:
                    cd_data = json.load(f)
            except Exception:
                pass

        if not cd_data:
            cd = fetch_json(f"{BASE_API}/comic?slug={c_slug}")
            if cd and cd.get("status") == "success":
                cd_data = cd["data"]
                save_json(detail_file, cd_data)

        # Cache chapters
        if cd_data and cd_data.get("chapters") and len(cd_data["chapters"]) > 0:
            chapters_list = cd_data["chapters"]
            # If top series, cache first 3-5 chapters
            target_chapters = chapters_list[-3:] if c_slug in top_series else chapters_list[-1:]
            for ch in target_chapters:
                ch_slug = ch["slug"]
                first_ch_file = f"data/chapters/{ch_slug}.json"
                if not os.path.exists(first_ch_file):
                    first_data = fetch_json(f"{BASE_API}/chapter?slug={ch_slug}")
                    if first_data and first_data.get("status") == "success":
                        save_json(first_ch_file, first_data["data"])

    # 4. Generate Master Index (data/comics_index.json)
    print("[*] Generating master comics index (data/comics_index.json)...")
    comics_dir = "data/comics"
    if os.path.exists(comics_dir):
        comic_items = []
        for f in os.listdir(comics_dir):
            if f.endswith('.json'):
                try:
                    with open(os.path.join(comics_dir, f), 'r', encoding='utf-8') as fp:
                        d = json.load(fp)
                        chs = d.get('chapters', [])
                        latest_ch = chs[0]['title'] if chs else "Chapter 1"
                        first_ch = chs[-1]['slug'] if chs else f"{d.get('slug')}-chapter-1"
                        comic_items.append({
                            "id": d.get('slug') or d.get('id'),
                            "slug": d.get('slug') or d.get('id'),
                            "title": d.get('title'),
                            "coverImage": d.get('coverImage') or d.get('cover'),
                            "type": d.get('type', 'Manhwa'),
                            "status": d.get('status', 'Ongoing'),
                            "rating": d.get('rating', 9.5),
                            "genres": d.get('genres', []),
                            "author": d.get('author', 'Author'),
                            "synopsis": d.get('synopsis', ''),
                            "totalChapters": len(chs),
                            "latestChapter": latest_ch,
                            "firstChapterSlug": first_ch,
                            "isColor": d.get('type') != 'Manga'
                        })
                except Exception as e:
                    pass
        comic_items.sort(key=lambda c: (c['rating'], c['totalChapters']), reverse=True)
        save_json("data/comics_index.json", comic_items)
        print(f"[OK] Master index contains {len(comic_items)} comics!")

    print("[DONE] Static data generation completed successfully!")

if __name__ == '__main__':
    main()

