// KomikIndo Live API Service (Hybrid Mode: Local API + Static JSON + Live Client Scraper)

const ComicAPI = {
  baseUrl: "/api",
  isGitHubPages: window.location.hostname.includes("github.io") || window.location.protocol === "file:",
  _comicCache: [],
  _catalogLoaded: false,

  getBaseUrl() {
    let path = window.location.pathname;
    if (/\.[a-zA-Z0-9]+$/.test(path)) {
      path = path.substring(0, path.lastIndexOf('/') + 1);
    } else if (!path.endsWith('/')) {
      path = path + '/';
    }
    return window.location.origin + path;
  },

  getStaticUrl(relPath) {
    const clean = relPath.replace(/^\.?\//, "");
    return new URL(clean, this.getBaseUrl()).href;
  },

  async _fetchJson(url, timeoutMs = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      clearTimeout(timer);
      console.warn(`[Fetch Warning] ${url}:`, e.message || e);
    }
    return null;
  },

  async _fetchWithFallback(apiEndpoint, relStaticPath) {
    const staticUrl = this.getStaticUrl(relStaticPath);

    // Jika di GitHub Pages / file protocol, langsung akses static JSON
    if (this.isGitHubPages) {
      const data = await this._fetchJson(staticUrl);
      if (data) return data;
      return null;
    }

    // Jika di lokal / server aktif, coba API dulu dengan timeout 3.5s
    const apiData = await this._fetchJson(apiEndpoint, 3500);
    if (apiData && apiData.status === "success") {
      return apiData.data;
    }

    // Fallback ke static jika API offline / gagal
    return await this._fetchJson(staticUrl);
  },

  // Mendapatkan semua koleksi komik lengkap untuk katalog
  async getAllCatalogComics() {
    // 1. Coba load dari master index data/comics_index.json
    const catalogData = await this._fetchJson(this.getStaticUrl("data/comics_index.json"));
    if (catalogData && Array.isArray(catalogData) && catalogData.length > 0) {
      this._saveToCache(catalogData);
      this._catalogLoaded = true;
      return catalogData;
    }

    // 2. Fallback gabungkan popular + latest
    const [popular, latest] = await Promise.all([
      this.getPopularComics(1),
      this.getLatestComics(1)
    ]);

    const map = new Map();
    [...(popular || []), ...(latest || [])].forEach(c => {
      if (c && c.slug && !map.has(c.slug)) {
        map.set(c.slug, c);
      }
    });

    const combined = Array.from(map.values());
    this._saveToCache(combined);
    return combined;
  },

  async getLatestComics(page = 1) {
    const data = await this._fetchWithFallback(`${this.baseUrl}/latest?page=${page}`, `data/latest.json`);
    const list = Array.isArray(data) ? data : [];
    if (list.length > 0) {
      this._saveToCache(list);
    }
    return list;
  },

  async getPopularComics(page = 1) {
    const data = await this._fetchWithFallback(`${this.baseUrl}/popular?page=${page}`, `data/popular.json`);
    const list = Array.isArray(data) ? data : [];
    if (list.length > 0) {
      this._saveToCache(list);
    }
    return list;
  },

  _saveToCache(items) {
    if (!Array.isArray(items)) return;
    const existingSlugs = new Set(this._comicCache.map(c => c.slug));
    items.forEach(c => {
      if (c && c.slug && !existingSlugs.has(c.slug)) {
        this._comicCache.push(c);
        existingSlugs.add(c.slug);
      }
    });
  },

  async searchComics(query) {
    if (!query) return [];
    const qLower = query.toLowerCase().trim();

    // Pastikan master katalog terisi untuk pencarian super komplit
    if (!this._catalogLoaded) {
      await this.getAllCatalogComics();
    }

    // Coba live search API jika server lokal berjalan
    if (!this.isGitHubPages) {
      try {
        const res = await this._fetchJson(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, 3000);
        if (res && res.status === "success" && res.data && res.data.length > 0) {
          this._saveToCache(res.data);
          return res.data;
        }
      } catch (e) {
        // Fallback ke pencarian lokal
      }
    }

    // Pencarian menyeluruh dari cache lokal (Judul, Genre, Tipe, Author, Sinopsis)
    return this._comicCache.filter(c => {
      const titleMatch = c.title && c.title.toLowerCase().includes(qLower);
      const genreMatch = c.genres && c.genres.some(g => g.toLowerCase().includes(qLower));
      const typeMatch = c.type && c.type.toLowerCase().includes(qLower);
      const authorMatch = c.author && c.author.toLowerCase().includes(qLower);
      return titleMatch || genreMatch || typeMatch || authorMatch;
    });
  },

  async getComicDetail(slug) {
    // 1. Coba ambil dari static file / API
    const data = await this._fetchWithFallback(
      `${this.baseUrl}/comic?slug=${encodeURIComponent(slug)}`,
      `data/comics/${slug}.json`
    );
    if (data && data.chapters && data.chapters.length > 0) {
      return data;
    }

    // 2. Cek apakah ada di cache komik
    if (this._comicCache.length === 0) {
      await this.getAllCatalogComics();
    }

    const cached = this._comicCache.find(c => c.slug === slug);
    if (cached) {
      return {
        id: cached.id || cached.slug,
        slug: cached.slug,
        title: cached.title,
        coverImage: cached.coverImage || cached.cover || "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg",
        type: cached.type || "Manhwa",
        status: cached.status || "Publishing",
        synopsis: cached.synopsis || `${cached.title} - Komik seru berkualitas HD di NekoKomik. Baca kelanjutan petualangannya sekarang!`,
        genres: cached.genres && cached.genres.length ? cached.genres : ["Action", "Fantasy", "Adventure"],
        rating: cached.rating || 9.5,
        author: cached.author || "KomikIndo Artist",
        artist: "KomikIndo Studio",
        totalChapters: cached.totalChapters || 1,
        chapters: cached.chapters || [
          {
            id: `${cached.slug}-chapter-1`,
            slug: cached.firstChapterSlug || `${cached.slug}-chapter-1`,
            title: cached.latestChapter || "Chapter 1",
            url: `https://komikindo.ch/${cached.firstChapterSlug || `${cached.slug}-chapter-1`}/`,
            releaseDate: "Rilis",
            isEnd: false
          }
        ]
      };
    }
    return null;
  },

  // Mengambil gambar halaman chapter secara universal (Offline Cache + Live Local + Browser CORS Proxy Fallback)
  async getChapterPages(chapterSlug) {
    // 1. Cek browser sessionStorage untuk loading instan
    const storageKey = `neko_ch_${chapterSlug}`;
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.pages && parsed.pages.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}

    // 2. Cek file JSON lokal di repo (data/chapters/<slug>.json)
    const localData = await this._fetchJson(this.getStaticUrl(`data/chapters/${chapterSlug}.json`));
    if (localData && localData.pages && localData.pages.length > 0) {
      try { sessionStorage.setItem(storageKey, JSON.stringify(localData)); } catch(e){}
      return localData;
    }

    // 3. Jika server API lokal aktif, request ke backend
    if (!this.isGitHubPages) {
      const apiData = await this._fetchJson(`${this.baseUrl}/chapter?slug=${encodeURIComponent(chapterSlug)}`, 4500);
      if (apiData && apiData.status === "success" && apiData.data && apiData.data.pages && apiData.data.pages.length > 0) {
        try { sessionStorage.setItem(storageKey, JSON.stringify(apiData.data)); } catch(e){}
        return apiData.data;
      }
    }

    // 4. Live Scrape langsung dari KomikIndo via CORS Mirror Proxy (Browser Client-side)
    const liveScraped = await this._fetchChapterLiveScrape(chapterSlug);
    if (liveScraped && liveScraped.pages && liveScraped.pages.length > 0) {
      try { sessionStorage.setItem(storageKey, JSON.stringify(liveScraped)); } catch(e){}
      return liveScraped;
    }

    // 5. Fallback Universal: Tampilkan portal baca resmi KomikIndo tanpa membuat user stuck
    return {
      title: chapterSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      chapterSlug: chapterSlug,
      comicSlug: "",
      pages: [],
      isDirectFallback: true,
      sourceUrl: `https://komikindo.ch/${chapterSlug}/`,
      nextSlug: "",
      prevSlug: ""
    };
  },

  // Scraper Client-Side via Resilient CORS Mirrors
  async _fetchChapterLiveScrape(chapterSlug) {
    const targetUrl = `https://komikindo.ch/${chapterSlug}/`;
    
    // Daftar mirror proxy publik yang cepat & mendukung CORS
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`
    ];

    for (const proxyUrl of proxies) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6500);
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timer);

        if (res.ok) {
          const html = await res.text();
          const parsed = this._parseChapterHtml(html, chapterSlug);
          if (parsed && parsed.pages && parsed.pages.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn(`[Proxy Fail] ${proxyUrl.substring(0, 30)}...:`, err.message || err);
      }
    }
    return null;
  },

  // Parser HTML Chapter KomikIndo di sisi browser
  _parseChapterHtml(html, chapterSlug) {
    if (!html || html.length < 200) return null;

    // Ambil Judul
    let title = "";
    const titleMatch = html.match(/<title>(.*?) - KomikIndo<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    } else {
      title = chapterSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }

    // Temukan area pembaca utama
    let targetHtml = html;
    const readerMatch = html.match(/id=["']readerarea["'][^>]*>([\s\S]*?)<\/div>\s*<(?:div|footer|script)/i) 
                     || html.match(/id=["']readerarea["'][^>]*>([\s\S]*?)<\/div>/i);
    if (readerMatch) {
      targetHtml = readerMatch[1];
    }

    // Ambil seluruh URL gambar
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    const pages = [];
    const seen = new Set();

    while ((match = imgRegex.exec(targetHtml)) !== null) {
      const src = match[1].trim();
      if (!src || seen.has(src)) continue;

      // Filter ketat: Buang semua iklan judol, banner slot, GIF animasi, dan thumbnail
      const lower = src.toLowerCase();
      if (lower.includes('.gif')) continue; // Komik tidak pernah berupa GIF, semua GIF adalah iklan judol
      if (['slot', 'judol', 'judi', 'gacor', 'casino', 'bet88', 'banner', 'fav.png', 'komikindo-e', 'logo', 'avatar', '211x', '214x', '236x', 'thumb'].some(ad => lower.includes(ad))) {
        continue;
      }

      // Validasi ekstensi dan CDN halaman komik asli
      const isValid = ['/data/', '.jpg', '.webp', '.jpeg', '.png', 'imageainewgeneration', 
                       'himmga', 'aicontent', 'indocontent', 'gaimgame', 'contentkere'].some(k => lower.includes(k));

      if (isValid) {
        pages.push(src);
        seen.add(src);
      }
    }


    // Ambil slug chapter selanjutnya dan sebelumnya
    const nextMatch = html.match(/<a[^>]+href=["']https:\/\/komikindo\.ch\/([^/'"]+)\/["'][^>]*>Chapter Selanjutnya/i);
    const prevMatch = html.match(/<a[^>]+href=["']https:\/\/komikindo\.ch\/([^/'"]+)\/["'][^>]*>Chapter Sebelumnya/i);
    const comicMatch = html.match(/<a[^>]+href=["']https:\/\/komikindo\.ch\/komik\/([^/'"]+)\/["'][^>]*>Daftar Chapter/i);

    return {
      slug: chapterSlug,
      title: title,
      comicSlug: comicMatch ? comicMatch[1] : "",
      nextSlug: nextMatch ? nextMatch[1] : "",
      prevSlug: prevMatch ? prevMatch[1] : "",
      pages: pages
    };
  }
};
