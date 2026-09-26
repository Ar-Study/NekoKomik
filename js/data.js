// KomikIndo Live API Service (Hybrid Mode: Live Scraper saat lokal, Static JSON saat di GitHub Pages)

const ComicAPI = {
  baseUrl: "/api",
  isGitHubPages: window.location.hostname.includes("github.io") || window.location.protocol === "file:",
  _comicCache: [],

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
      console.warn(`[Fetch Warning] Gagal request ${url}:`, e.message || e);
    }
    return null;
  },

  async _fetchWithFallback(apiEndpoint, relStaticPath) {
    const staticUrl = this.getStaticUrl(relStaticPath);

    // Jika di GitHub Pages, langsung akses static JSON
    if (this.isGitHubPages) {
      const data = await this._fetchJson(staticUrl);
      if (data) return data;
      console.warn(`[GitHub Pages] File static tidak ditemukan: ${staticUrl}`);
      return null;
    }

    // Jika di lokal / server aktif, coba API dulu dengan timeout 4s
    const apiData = await this._fetchJson(apiEndpoint, 4000);
    if (apiData && apiData.status === "success") {
      return apiData.data;
    }

    // Fallback ke static jika API gagal / server mati
    return await this._fetchJson(staticUrl);
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
    const existingSlugs = new Set(this._comicCache.map(c => c.slug));
    items.forEach(c => {
      if (!existingSlugs.has(c.slug)) {
        this._comicCache.push(c);
        existingSlugs.add(c.slug);
      }
    });
  },

  async searchComics(query) {
    if (!query) return [];
    const qLower = query.toLowerCase().trim();

    // Coba live search API jika bukan static hosting
    if (!this.isGitHubPages) {
      try {
        const res = await this._fetchJson(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, 4000);
        if (res && res.status === "success" && res.data.length > 0) {
          this._saveToCache(res.data);
          return res.data;
        }
      } catch (e) {
        console.warn("[Live Search API Fail] Menggunakan pencarian lokal cache:", e);
      }
    }

    // Pastikan cache terisi jika belum
    if (this._comicCache.length === 0) {
      await Promise.all([this.getPopularComics(), this.getLatestComics()]);
    }

    // Filter lokal dari daftar komik yang ada
    return this._comicCache.filter(c => 
      c.title.toLowerCase().includes(qLower) ||
      (c.genres && c.genres.some(g => g.toLowerCase().includes(qLower))) ||
      (c.type && c.type.toLowerCase().includes(qLower))
    );
  },

  async getComicDetail(slug) {
    const data = await this._fetchWithFallback(
      `${this.baseUrl}/comic?slug=${encodeURIComponent(slug)}`,
      `data/comics/${slug}.json`
    );
    if (data) return data;

    // Pastikan cache komik terisi
    if (this._comicCache.length === 0) {
      await Promise.all([this.getPopularComics(), this.getLatestComics()]);
    }

    const cached = this._comicCache.find(c => c.slug === slug);
    if (cached) {
      return {
        id: cached.id || cached.slug,
        slug: cached.slug,
        title: cached.title,
        coverImage: cached.coverImage || cached.cover || "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg",
        type: cached.type || "Manhwa",
        status: "Publishing",
        synopsis: `${cached.title} - Komik seru berkualitas HD di NekoKomik. Baca kelanjutan petualangannya sekarang!`,
        genres: cached.genres && cached.genres.length ? cached.genres : ["Action", "Fantasy", "Adventure"],
        rating: cached.rating || 9.0,
        author: "KomikIndo Artist",
        artist: "KomikIndo Studio",
        totalChapters: 1,
        chapters: [
          {
            id: `${cached.slug}-chapter-1`,
            slug: `${cached.slug}-chapter-1`,
            title: cached.latestChapter || "Chapter 1",
            url: cached.url || `https://komikindo.ch/komik/${cached.slug}/`,
            releaseDate: cached.chapterDate || "Baru saja",
            isEnd: false
          }
        ]
      };
    }
    return null;
  },

  async getChapterPages(chapterSlug) {
    const data = await this._fetchWithFallback(
      `${this.baseUrl}/chapter?slug=${encodeURIComponent(chapterSlug)}`,
      `data/chapters/${chapterSlug}.json`
    );
    if (data && data.pages && data.pages.length > 0) {
      return data;
    }

    // Fallback agar pembaca tidak pernah stuck loading jika chapter belum terunduh
    return {
      title: chapterSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      chapterSlug: chapterSlug,
      pages: [
        "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg"
      ],
      isFallback: true,
      prevSlug: null,
      nextSlug: null
    };
  }
};
