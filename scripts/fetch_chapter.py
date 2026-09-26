"""
KomikIndo Chapter Scraper Helper
Gunakan skrip ini untuk mengambil langsung list URL gambar chapter dari KomikIndo!
Contoh pemakaian:
    python scripts/fetch_chapter.py https://komikindo.ch/solo-leveling-chapter-1/
"""

import sys
import urllib.request
import re
import json

def fetch_chapter_images(chapter_url):
    print(f"[*] Mengambil data dari: {chapter_url}")
    req = urllib.request.Request(
        chapter_url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            
            # Cari semua URL gambar dalam area baca
            reader_match = re.search(r'id=["\']readerarea["\'][^>]*>(.*?)</div>\s*<(div|footer|script)', html, re.DOTALL)
            if not reader_match:
                reader_match = re.search(r'id=["\']readerarea["\'][^>]*>(.*?)</div>', html, re.DOTALL)
            target_html = reader_match.group(1) if reader_match else html
            all_imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', target_html)
            
            manga_pages = []
            seen = set()
            for img in all_imgs:
                img_clean = img.strip()
                if not img_clean or img_clean in seen:
                    continue
                if any(bad in img_clean.lower() for bad in ['fav.png', 'komikindo-e', 'logo', 'banner', 'avatar', '211x285', '236x319', '236x315']):
                    continue
                if any(valid in img_clean for valid in ['/data/', '.jpg', '.webp', '.jpeg', '.gif', '.png', 'googleusercontent', 'imageainewgeneration', 'himmga', 'aicontent', 'indocontent', 'gaimgame', 'contentkere']):
                    manga_pages.append(img_clean)
                    seen.add(img_clean)

            
            print(f"[OK] Berhasil menemukan {len(manga_pages)} halaman komik!\n")
            print("Array Javascript yang bisa langsung dicopy ke data.js:\n")
            print(json.dumps(manga_pages, indent=2))
            return manga_pages
    except Exception as e:
        print(f"[!] Terjadi kesalahan: {e}")
        return []

if __name__ == '__main__':
    url = sys.argv[1] if len(sys.argv) > 1 else 'https://komikindo.ch/solo-leveling-chapter-1/'
    fetch_chapter_images(url)
