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

    # 3. Top comics from latest
    if latest and latest.get("data"):
        for c in latest["data"][:8]:
            c_slug = c["slug"]
            if c_slug != "229848-solo-leveling":
                cd = fetch_json(f"{BASE_API}/comic?slug={c_slug}")
                if cd and cd.get("status") == "success":
                    save_json(f"data/comics/{c_slug}.json", cd["data"])
                    # Also fetch first chapter of each
                    if cd["data"].get("chapters") and len(cd["data"]["chapters"]) > 0:
                        first_ch = cd["data"]["chapters"][-1]["slug"]
                        first_data = fetch_json(f"{BASE_API}/chapter?slug={first_ch}")
                        if first_data and first_data.get("status") == "success":
                            save_json(f"data/chapters/{first_ch}.json", first_data["data"])

    print("[DONE] Static data generation completed successfully!")

if __name__ == '__main__':
    main()
