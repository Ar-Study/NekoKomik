// KomikIndo Live API Service (Menggantikan static mock data dengan data live dari KomikIndo)

const ComicAPI = {
  baseUrl: "/api",

  async getLatestComics(page = 1) {
    try {
      const res = await fetch(`${this.baseUrl}/latest?page=${page}`);
      const json = await res.json();
      return json.status === "success" ? json.data : [];
    } catch (e) {
      console.error("Gagal mengambil komik terbaru:", e);
      return [];
    }
  },

  async getPopularComics(page = 1) {
    try {
      const res = await fetch(`${this.baseUrl}/popular?page=${page}`);
      const json = await res.json();
      return json.status === "success" ? json.data : [];
    } catch (e) {
      console.error("Gagal mengambil komik populer:", e);
      return [];
    }
  },

  async searchComics(query) {
    if (!query) return [];
    try {
      const res = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      return json.status === "success" ? json.data : [];
    } catch (e) {
      console.error("Gagal mencari komik:", e);
      return [];
    }
  },

  async getComicDetail(slug) {
    try {
      const res = await fetch(`${this.baseUrl}/comic?slug=${encodeURIComponent(slug)}`);
      const json = await res.json();
      return json.status === "success" ? json.data : null;
    } catch (e) {
      console.error("Gagal mengambil detail komik:", e);
      return null;
    }
  },

  async getChapterPages(chapterSlug) {
    try {
      const res = await fetch(`${this.baseUrl}/chapter?slug=${encodeURIComponent(chapterSlug)}`);
      const json = await res.json();
      return json.status === "success" ? json.data : null;
    } catch (e) {
      console.error("Gagal mengambil halaman chapter:", e);
      return null;
    }
  }
};
