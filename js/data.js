// KomikIndo Live API Service (Hybrid Mode: Live Scraper saat lokal, Static JSON saat di GitHub Pages)

const ComicAPI = {
  baseUrl: "/api",
  isGitHubPages: window.location.hostname.includes("github.io") || window.location.protocol === "file:",
  _comicCache: [],

  async _fetchWithFallback(apiEndpoint, staticPath) {
    // Jika di GitHub Pages, langsung akses static JSON
    if (this.isGitHubPages) {
      try {
        const res = await fetch(staticPath);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn(`[GitHub Pages] Gagal load ${staticPath}:`, e);
      }
      return null;
    }

    // Jika di lokal / server aktif, coba API dulu
    try {
      const res = await fetch(apiEndpoint);
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success") return json.data;
      }
    } catch (e) {
      console.warn(`[API Fail] Fallback ke static file: ${staticPath}`, e);
    }

    // Fallback ke static file jika API gagal/tidak tersedia
    try {
      const res = await fetch(staticPath);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(`[Fallback Fail] Gagal mengambil ${staticPath}:`, e);
    }
    return null;
  },

  async getLatestComics(page = 1) {
    const data = await this._fetchWithFallback(`${this.baseUrl}/latest?page=${page}`, `./data/latest.json`);
    const list = Array.isArray(data) ? data : [];
    if (list.length > 0) {
      this._saveToCache(list);
    }
    return list;
  },

  async getPopularComics(page = 1) {
    const data = await this._fetchWithFallback(`${this.baseUrl}/popular?page=${page}`, `./data/popular.json`);
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
        const res = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && json.data.length > 0) {
            this._saveToCache(json.data);
            return json.data;
          }
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
      `./data/comics/${slug}.json`
    );
    if (data) return data;

    // Fallback jika belum tersimpan di static data: Buat template darurat dari info cache
    const cached = this._comicCache.find(c => c.slug === slug);
    if (cached) {
      return {
        slug: cached.slug,
        title: cached.title,
        cover: cached.cover,
        type: cached.type || "Manhwa",
        status: "Publishing",
        synopsis: `${cached.title} - Komik seru berkualitas HD di NekoKomik. Baca kelanjutan petualangannya sekarang!`,
        genres: cached.genres || ["Action", "Fantasy", "Adventure"],
        rating: cached.rating || "8.5",
        author: "KomikIndo Artist",
        chapters: [
          {
            title: cached.chapter || "Chapter Terbaru",
            slug: `${cached.slug}-chapter-1`,
            date: "Baru saja"
          }
        ]
      };
    }
    return null;
  },

  async getChapterPages(chapterSlug) {
    const data = await this._fetchWithFallback(
      `${this.baseUrl}/chapter?slug=${encodeURIComponent(chapterSlug)}`,
      `./data/chapters/${chapterSlug}.json`
    );
    return data;
  }
};

