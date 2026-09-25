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
            all_imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
            # Filter hanya gambar halaman komik asli
            manga_pages = [
                img for img in all_imgs 
                if ('/data/' in img or '.jpg' in img or '.webp' in img) 
                and 'blogger' not in img 
                and 'komikindo-e' not in img 
                and 'fav.png' not in img
            ]
            
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
