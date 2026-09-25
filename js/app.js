// KomikIndo Live - Main Application Controller

const App = {
  currentSortOrder: "desc", // 'desc' (terbaru ke terlama) or 'asc' (terlama ke terbaru)
  activeTab: "sinopsis",
  activeFilterType: "all",
  activeFilterGenre: "all",
  activeFilterStatus: "all",
  activeSort: "popular",
  searchDebounceTimer: null,
  cachedPopular: [],
  cachedLatest: [],
  currentComicDetail: null,

  init() {
    this.initTheme();
    this.bindEvents();
    this.updateBookmarkCount();
    ReaderController.init();
    this.handleRouting();
    window.addEventListener("hashchange", () => this.handleRouting());
  },

  // --- Theme Management ---
  initTheme() {
    const savedTheme = StorageService.getTheme();
    document.documentElement.setAttribute("data-theme", savedTheme);
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
      toggleBtn.innerHTML = savedTheme === "light" ? "🌙" : "☀️";
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    StorageService.setTheme(next);
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
      toggleBtn.innerHTML = next === "light" ? "🌙" : "☀️";
    }
    this.showToast(`Beralih ke mode ${next === 'light' ? 'Terang' : 'Gelap'}`);
  },

  // --- Toast Notification ---
  showToast(message) {
    const toast = document.getElementById("toast-notice");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  },

  // --- Router ---
  handleRouting() {
    const hash = window.location.hash || "#home";
    
    // Close search dropdown on route change
    const searchDropdown = document.getElementById("search-results-dropdown");
    if (searchDropdown) searchDropdown.classList.remove("show");

    if (hash.startsWith("#read/")) {
      const parts = hash.replace("#read/", "").split("/");
      const comicSlug = parts[0];
      const chapterSlug = parts[1];
      if (comicSlug && chapterSlug) {
        ReaderController.openChapter(comicSlug, chapterSlug);
      }
    } else if (hash.startsWith("#comic/")) {
      const comicSlug = hash.replace("#comic/", "");
      this.showComicDetail(comicSlug);
    } else if (hash.startsWith("#catalog")) {
      this.showCatalog();
    } else if (hash === "#bookmarks") {
      this.openBookmarkModal("bookmarks");
    } else if (hash === "#history") {
      this.openBookmarkModal("history");
    } else {
      this.showHome();
    }
  },

  navigateTo(hash) {
    window.location.hash = hash;
  },

  // --- Bind Header & Global Events ---
  bindEvents() {
    document.getElementById("theme-toggle-btn")?.addEventListener("click", () => this.toggleTheme());

    // Live search bar input connected to KomikIndo API
    const searchInput = document.getElementById("global-search-input");
    const searchDropdown = document.getElementById("search-results-dropdown");
    
    searchInput?.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      clearTimeout(this.searchDebounceTimer);

      if (!query || query.length < 2) {
        searchDropdown.classList.remove("show");
        return;
      }

      searchDropdown.innerHTML = `<div style="padding: 14px; font-size: 0.85rem; color: var(--text-dim); text-align: center;">Mencari di NekoKomik...</div>`;
      searchDropdown.classList.add("show");

      this.searchDebounceTimer = setTimeout(async () => {
        const results = await ComicAPI.searchComics(query);
        if (results.length === 0) {
          searchDropdown.innerHTML = `<div style="padding: 14px; font-size: 0.85rem; color: var(--text-dim); text-align: center;">Tidak ada komik yang cocok</div>`;
        } else {
          searchDropdown.innerHTML = results.map(c => `
            <div class="search-item" data-comic-slug="${c.slug}">
              <img src="${c.coverImage}" alt="${c.title}" referrerpolicy="no-referrer" />
              <div class="search-item-info">
                <h4>${c.title}</h4>
                <span>${c.type} • ⭐ ${c.rating} • ${c.latestChapter}</span>
              </div>
            </div>
          `).join("");

          searchDropdown.querySelectorAll(".search-item").forEach(item => {
            item.addEventListener("click", () => {
              const slug = item.dataset.comicSlug;
              searchDropdown.classList.remove("show");
              searchInput.value = "";
              this.navigateTo(`#comic/${slug}`);
            });
          });
        }
      }, 350);
    });

    document.addEventListener("click", (e) => {
      if (!searchInput?.contains(e.target) && !searchDropdown?.contains(e.target)) {
        searchDropdown?.classList.remove("show");
      }
    });

    document.getElementById("bookmark-btn")?.addEventListener("click", () => {
      this.openBookmarkModal("bookmarks");
    });

    document.getElementById("history-btn")?.addEventListener("click", () => {
      this.openBookmarkModal("history");
    });

    document.getElementById("modal-close-btn")?.addEventListener("click", () => {
      this.closeModal();
    });

    document.getElementById("modal-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") this.closeModal();
    });

    // Mobile Drawer Handlers
    const mobileToggle = document.getElementById("mobile-menu-toggle");
    const mobileDrawer = document.getElementById("mobile-drawer");
    const drawerBackdrop = document.getElementById("mobile-drawer-backdrop");
    const drawerClose = document.getElementById("drawer-close-btn");

    const openDrawer = () => {
      mobileDrawer?.classList.add("open");
      drawerBackdrop?.classList.add("open");
      document.body.style.overflow = "hidden";
    };

    const closeDrawer = () => {
      mobileDrawer?.classList.remove("open");
      drawerBackdrop?.classList.remove("open");
      document.body.style.overflow = "";
    };

    mobileToggle?.addEventListener("click", openDrawer);
    drawerClose?.addEventListener("click", closeDrawer);
    drawerBackdrop?.addEventListener("click", closeDrawer);

    document.querySelectorAll(".drawer-link").forEach(link => {
      link.addEventListener("click", closeDrawer);
    });

    document.getElementById("drawer-bookmark-btn")?.addEventListener("click", () => {
      closeDrawer();
      this.openBookmarkModal("bookmarks");
    });

    document.getElementById("drawer-history-btn")?.addEventListener("click", () => {
      closeDrawer();
      this.openBookmarkModal("history");
    });

    // Floating Scroll-To-Top Button
    const fab = document.getElementById("scroll-to-top-btn");
    window.addEventListener("scroll", () => {
      if (window.scrollY > 350) {
        fab?.classList.add("show");
      } else {
        fab?.classList.remove("show");
      }
    });

    fab?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  },

  updateBookmarkCount() {
    const list = StorageService.getBookmarks();
    const countBadge = document.getElementById("bookmark-count-badge");
    if (countBadge) {
      countBadge.textContent = list.length;
      countBadge.style.display = list.length > 0 ? "flex" : "none";
    }
  },

  // --- View: Home (Live from NekoKomik) ---
  async showHome() {
    document.title = "NekoKomik - Baca Komik Manga, Manhwa, Manhua Bahasa Indonesia";
    document.getElementById("reader-view-container").style.display = "none";
    document.getElementById("comic-detail-container").style.display = "none";
    document.getElementById("catalog-view-container").style.display = "none";
    const homeContainer = document.getElementById("home-view-container");
    homeContainer.style.display = "block";

    const popularGrid = document.getElementById("popular-comics-grid");
    const latestGrid = document.getElementById("latest-updates-grid");
    const heroContainer = document.getElementById("hero-banner-container");

    if (this.cachedPopular.length === 0) {
      if (popularGrid) popularGrid.innerHTML = this.getSkeletonCardsHTML(8);
      if (latestGrid) latestGrid.innerHTML = this.getSkeletonCardsHTML(8);
      
      const [popular, latest] = await Promise.all([
        ComicAPI.getPopularComics(1),
        ComicAPI.getLatestComics(1)
      ]);

      this.cachedPopular = popular;
      this.cachedLatest = latest;
    }

    this.renderHeroBanner(heroContainer);
    this.renderComicsGrid(popularGrid, this.cachedPopular);
    this.renderComicsGrid(latestGrid, this.cachedLatest);
  },

  getSkeletonCardsHTML(count = 6) {
    return Array(count).fill(0).map(() => `
      <div class="comic-card" style="opacity: 0.6; pointer-events: none;">
        <div class="card-poster" style="background: #1e293b; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 1.5rem; animation: pulse 1.5s infinite;">⏳</span>
        </div>
        <div class="card-body">
          <div style="height: 14px; background: #334155; border-radius: 4px; margin-bottom: 8px;"></div>
          <div style="height: 10px; background: #1e293b; border-radius: 4px; width: 60%;"></div>
        </div>
      </div>
    `).join("");
  },

  async renderHeroBanner(heroContainer) {
    if (!heroContainer) return;

    // Solo Leveling is our flagship featured highlight
    const isSaved = StorageService.isBookmarked("229848-solo-leveling");

    heroContainer.innerHTML = `
      <div class="container">
        <div class="hero-card">
          <div class="hero-cover-wrapper">
            <img src="https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg" alt="Solo Leveling" referrerpolicy="no-referrer" />
            <div class="hero-badges-floating">
              <span class="badge badge-hot">🔥 POPULER</span>
              <span class="badge badge-manhwa">MANHWA</span>
              <span class="badge badge-color">BERWARNA</span>
            </div>
          </div>

          <div class="hero-content">
            <div class="hero-tag">⚡ Manhwa Populer di KomikIndo</div>
            <h1 class="hero-title">Solo Leveling</h1>
            <div class="hero-meta">
              <span class="meta-rating">⭐ 9.8 (14,820 votes)</span>
              <span>• Status: <strong style="color: #10b981;">Tamat / End</strong></span>
              <span>• Total: <strong>179 Chapter</strong></span>
              <span>• Rilis: <strong>2018</strong></span>
            </div>

            <p class="hero-synopsis">
              10 tahun yang lalu, setelah "Gerbang" yang menghubungkan dunia nyata dengan dunia monster terbuka, beberapa orang biasa menerima kekuatan untuk berburu monster di dalam Gerbang. Mereka dikenal sebagai "Pemburu". Sung Jin-Woo, pemburu terlemah di dunia, menemukan rahasia sistem untuk naik level tanpa batas!
            </p>

            <div class="hero-genres">
              <span class="genre-pill">Action</span>
              <span class="genre-pill">Adventure</span>
              <span class="genre-pill">Fantasy</span>
              <span class="genre-pill">Supernatural</span>
              <span class="genre-pill" style="border-color: rgba(6,182,212,0.3); color: #67e8f9;">#Magic</span>
              <span class="genre-pill" style="border-color: rgba(6,182,212,0.3); color: #67e8f9;">#Dungeon</span>
            </div>

            <div class="hero-actions">
              <a href="#comic/229848-solo-leveling" class="btn btn-primary">
                📖 Buka Detail & Chapter
              </a>
              <a href="#read/229848-solo-leveling/solo-leveling-chapter-1" class="btn btn-secondary">
                🚀 Baca Chapter 1 (KomikIndo Asli)
              </a>
              <button class="btn btn-secondary" id="hero-bookmark-btn">
                ${isSaved ? '❤️ Tersimpan di Favorit' : '⭐ Bookmark'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("hero-bookmark-btn")?.addEventListener("click", () => {
      const nowSaved = StorageService.toggleBookmark({
        id: "229848-solo-leveling",
        title: "Solo Leveling",
        coverImage: "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg",
        type: "Manhwa",
        rating: 9.8,
        totalChapters: 179
      });
      this.updateBookmarkCount();
      this.showToast(nowSaved ? "Solo Leveling ditambahkan ke Favorit!" : "Solo Leveling dihapus dari Favorit.");
      this.renderHeroBanner(heroContainer);
    });
  },

  renderComicsGrid(parent, comics) {
    if (!parent) return;
    if (!comics || comics.length === 0) {
      parent.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 30px;">Tidak ada data komik yang ditemukan.</div>`;
      return;
    }

    parent.innerHTML = comics.map(comic => {
      const badgeClass = comic.type === "Manhwa" ? "badge-manhwa" : comic.type === "Manga" ? "badge-manga" : "badge-manhua";
      return `
        <article class="comic-card" data-comic-slug="${comic.slug}">
          <div class="card-poster">
            <img src="${comic.coverImage}" alt="${comic.title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg';" />
            <div class="card-top-badges">
              <span class="badge ${badgeClass}">${comic.type}</span>
              <div class="card-rating-badge">⭐ ${comic.rating}</div>
            </div>
            <div class="card-bottom-info">
              <span>${comic.isColor ? 'Berwarna' : 'Komik'}</span>
              <span>Live</span>
            </div>
          </div>
          <div class="card-body">
            <h3 class="card-title" title="${comic.title}">${comic.title}</h3>
            <div class="card-latest-chapter">
              <span class="latest-ch-badge">${comic.latestChapter}</span>
              <span class="latest-ch-date">${comic.chapterDate || ''}</span>
            </div>
          </div>
        </article>
      `;
    }).join("");

    this.attachCardClickEvents(parent);
  },

  attachCardClickEvents(parent) {
    parent.querySelectorAll(".comic-card").forEach(card => {
      card.addEventListener("click", () => {
        const slug = card.dataset.comicSlug;
        if (slug) this.navigateTo(`#comic/${slug}`);
      });
    });
  },

  // --- View: Comic Detail (Live Scraped from KomikIndo) ---
  async showComicDetail(slug) {
    document.getElementById("home-view-container").style.display = "none";
    document.getElementById("reader-view-container").style.display = "none";
    document.getElementById("catalog-view-container").style.display = "none";
    const detailContainer = document.getElementById("comic-detail-container");
    detailContainer.style.display = "block";

    // Show loading state
    detailContainer.innerHTML = `
      <div class="container" style="padding: 60px 20px; text-align: center;">
        <div style="font-size: 2.5rem; animation: pulse 1s infinite; margin-bottom: 16px;">⚡</div>
        <h2 style="font-family: var(--font-heading); font-size: 1.4rem;">Mengambil Data Komik dari KomikIndo...</h2>
        <p style="color: var(--text-dim); margin-top: 8px;">Memuat sinopsis dan seluruh daftar chapter</p>
      </div>
    `;

    window.scrollTo({ top: 0, behavior: "smooth" });

    const comic = await ComicAPI.getComicDetail(slug);
    if (!comic) {
      detailContainer.innerHTML = `
        <div class="container" style="padding: 60px 20px; text-align: center;">
          <h2 style="font-family: var(--font-heading);">Komik Tidak Ditemukan</h2>
          <p style="color: var(--text-muted); margin-bottom: 20px;">Gagal memuat komik dengan slug "${slug}" dari KomikIndo.</p>
          <a href="#home" class="btn btn-primary">Kembali ke Beranda</a>
        </div>
      `;
      return;
    }

    this.currentComicDetail = comic;
    document.title = `Komik ${comic.title} Bahasa Indonesia - NekoKomik`;

    const isSaved = StorageService.isBookmarked(comic.slug);
    const history = StorageService.getComicHistory(comic.slug);
    const chapters = comic.chapters || [];
    const firstChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;
    const latestChapter = chapters.length > 0 ? chapters[0] : null;

    detailContainer.innerHTML = `
      <div class="container comic-detail-view">
        <!-- Breadcrumbs -->
        <nav class="breadcrumbs" aria-label="breadcrumb">
          <a href="#home">Beranda</a>
          <span>›</span>
          <a href="#catalog?type=${comic.type.toLowerCase()}">${comic.type}</a>
          <span>›</span>
          <span style="color: var(--text-main); font-weight: 600;">${comic.title}</span>
        </nav>

        <!-- Header Card with Ambient Backdrop -->
        <div class="detail-header-card" style="background: linear-gradient(180deg, rgba(19, 24, 38, 0.92) 0%, rgba(7, 9, 14, 0.98) 100%), url('${comic.coverImage}') center/cover no-repeat;">
          <div class="detail-poster-col">
            <div class="detail-poster-img">
              <img src="${comic.coverImage}" alt="${comic.title}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg';" />
            </div>
            <button class="btn ${isSaved ? 'btn-primary' : 'btn-secondary'}" id="detail-bookmark-btn" style="width: 100%;">
              ${isSaved ? '❤️ Tersimpan di Bookmark' : '⭐ Tambah ke Bookmark'}
            </button>
            <button class="btn btn-secondary" id="detail-share-btn" style="width: 100%; font-size: 0.85rem;">
              🔗 Bagikan Komik
            </button>
          </div>

          <div class="detail-info-col">
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <span class="badge ${comic.type === 'Manhwa' ? 'badge-manhwa' : 'badge-manga'}">${comic.type}</span>
              <span class="badge badge-hot">🔥 NekoKomik</span>
            </div>

            <h1 class="detail-title">${comic.title}</h1>

            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
              <span style="color: var(--rating-color); font-weight: 800; font-size: 1.25rem;">⭐ ${comic.rating}</span>
              <span style="color: var(--text-dim); font-size: 0.85rem;">(Sumber KomikIndo Asli)</span>
            </div>

            <!-- Meta Table -->
            <table class="detail-meta-table">
              <tbody>
                <tr>
                  <td class="label">Status</td>
                  <td class="value"><span style="color: ${comic.status.toLowerCase().includes('tamat') || comic.status.toLowerCase().includes('end') ? '#10b981' : '#38bdf8'}; font-weight: 700;">${comic.status}</span></td>
                </tr>
                <tr>
                  <td class="label">Pengarang</td>
                  <td class="value">${comic.author}</td>
                </tr>
                <tr>
                  <td class="label">Ilustrator</td>
                  <td class="value">${comic.artist}</td>
                </tr>
                <tr>
                  <td class="label">Grafis</td>
                  <td class="value">${comic.type}</td>
                </tr>
                ${comic.themes.length > 0 ? `
                  <tr>
                    <td class="label">Tema</td>
                    <td class="value">${comic.themes.join(", ")}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>

            <div class="hero-genres" style="margin-bottom: 20px;">
              ${comic.genres.map(g => `<span class="genre-pill">${g}</span>`).join("")}
            </div>

            <!-- Quick Action Buttons -->
            <div class="detail-quick-actions">
              ${firstChapter ? `
                <a href="#read/${comic.slug}/${firstChapter.slug}" class="btn btn-primary">
                  📖 Baca Chapter Awal (${firstChapter.title})
                </a>
              ` : ''}
              ${latestChapter ? `
                <a href="#read/${comic.slug}/${latestChapter.slug}" class="btn btn-secondary">
                  ⚡ Chapter Terbaru (${latestChapter.title})
                </a>
              ` : ''}
              ${history ? `
                <a href="#read/${comic.slug}/${history.chapterId}" class="btn btn-secondary" style="border-color: #a78bfa; color: #a78bfa;">
                  🔖 Lanjut Baca: ${history.chapterTitle}
                </a>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Synopsis Tab -->
        <div class="tab-content" style="margin-bottom: 32px;">
          <h3 style="font-family: var(--font-heading); margin-bottom: 12px; font-size: 1.15rem;">Ringkasan & Sinopsis</h3>
          <p class="synopsis-text">${comic.synopsis}</p>
        </div>

        <!-- Chapters List Section -->
        <section class="chapters-section">
          <div class="chapters-head-bar">
            <h2 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800;">
              Daftar Chapter (${chapters.length} Chapter Asli)
            </h2>

            <div class="chapter-search-box">
              <input type="text" id="chapter-filter-input" class="chapter-search-input" placeholder="Cari chapter (cth: 1)..." />
              <button class="btn btn-secondary" id="sort-order-btn" style="padding: 8px 12px; font-size: 0.8rem;">
                ${this.currentSortOrder === 'desc' ? '⬇ Terbaru' : '⬆ Terlama'}
              </button>
            </div>
          </div>

          <div class="chapters-list" id="chapters-list-container"></div>
        </section>

        <!-- Comic Comments Section -->
        <section class="tab-content" style="margin-top: 32px;">
          <h3 style="font-family: var(--font-heading); margin-bottom: 20px;">
            💬 Diskusi Komik ${comic.title}
          </h3>
          <form class="comment-form" id="detail-comment-form">
            <div class="comment-input-row">
              <input type="text" class="comment-user-input" id="detail-comment-author" placeholder="Nama samaran kamu..." />
              <div class="comment-rating-select">
                <span>Rating:</span>
                <select class="reader-select" id="detail-comment-star">
                  <option value="5">⭐⭐⭐⭐⭐ (5.0 Luar Biasa)</option>
                  <option value="4">⭐⭐⭐⭐ (4.0 Sangat Bagus)</option>
                  <option value="3">⭐⭐⭐ (3.0 Cukup)</option>
                  <option value="2">⭐⭐ (2.0 Kurang)</option>
                </select>
              </div>
            </div>
            <textarea class="comment-textarea" id="detail-comment-text" placeholder="Bagikan kesan, teori, atau review kamu..." required></textarea>
            <button type="submit" class="btn btn-primary" style="align-self: flex-start; padding: 10px 20px;">
              Kirim Komentar
            </button>
          </form>

          <div class="comments-list" id="detail-comments-list"></div>
        </section>
      </div>
    `;

    this.attachDetailEvents(comic);
    this.renderChaptersList(comic);
    this.renderDetailComments(comic);
  },

  attachDetailEvents(comic) {
    document.getElementById("detail-bookmark-btn")?.addEventListener("click", () => {
      const nowSaved = StorageService.toggleBookmark({
        id: comic.slug,
        title: comic.title,
        coverImage: comic.coverImage,
        type: comic.type,
        rating: comic.rating,
        totalChapters: comic.chapters.length
      });
      this.updateBookmarkCount();
      this.showToast(nowSaved ? `${comic.title} berhasil ditambahkan ke Bookmark!` : `${comic.title} dihapus dari Bookmark.`);
      this.showComicDetail(comic.slug);
    });

    document.getElementById("detail-share-btn")?.addEventListener("click", () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        this.showToast("Link komik berhasil disalin!");
      } else {
        this.showToast("Link: " + window.location.href);
      }
    });

    document.getElementById("chapter-filter-input")?.addEventListener("input", (e) => {
      const val = e.target.value.trim().toLowerCase();
      this.renderChaptersList(comic, val);
    });

    document.getElementById("sort-order-btn")?.addEventListener("click", () => {
      this.currentSortOrder = this.currentSortOrder === "desc" ? "asc" : "desc";
      document.getElementById("sort-order-btn").textContent = this.currentSortOrder === "desc" ? "⬇ Terbaru" : "⬆ Terlama";
      this.renderChaptersList(comic, document.getElementById("chapter-filter-input")?.value);
    });

    document.getElementById("detail-comment-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const author = document.getElementById("detail-comment-author").value.trim();
      const star = document.getElementById("detail-comment-star").value;
      const text = document.getElementById("detail-comment-text").value.trim();
      if (!text) return;

      StorageService.addComment(comic.slug, {
        userName: author || undefined,
        rating: parseInt(star, 10),
        text: text
      });

      document.getElementById("detail-comment-text").value = "";
      this.renderDetailComments(comic);
      this.showToast("Komentar kamu berhasil diposting!");
    });
  },

  renderChaptersList(comic, filterKeyword = "") {
    const listContainer = document.getElementById("chapters-list-container");
    if (!listContainer) return;

    let chapters = [...(comic.chapters || [])];
    if (this.currentSortOrder === "asc") {
      chapters.reverse();
    }

    if (filterKeyword) {
      chapters = chapters.filter(ch => 
        ch.title.toLowerCase().includes(filterKeyword) || 
        ch.slug.toLowerCase().includes(filterKeyword)
      );
    }

    if (chapters.length === 0) {
      listContainer.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 24px;">Tidak ada chapter yang sesuai.</div>`;
      return;
    }

    const history = StorageService.getComicHistory(comic.slug);

    listContainer.innerHTML = chapters.map(ch => {
      const isRead = history && history.chapterId === ch.slug;
      return `
        <a href="#read/${comic.slug}/${ch.slug}" class="chapter-row ${isRead ? 'read' : ''}">
          <div class="chapter-left">
            <span class="ch-number">${ch.title}</span>
            ${ch.isEnd ? '<span class="ch-tag end">END</span>' : ''}
            ${isRead ? '<span style="font-size: 0.72rem; color: #a78bfa; font-weight: 700;">✓ Terakhir Dibaca</span>' : ''}
          </div>
          <div class="chapter-right">
            <span>📅 ${ch.releaseDate}</span>
            <span style="font-size: 1.1rem; color: var(--accent-primary);">›</span>
          </div>
        </a>
      `;
    }).join("");
  },

  renderDetailComments(comic) {
    const listContainer = document.getElementById("detail-comments-list");
    if (!listContainer) return;

    const comments = StorageService.getComments(comic.slug);
    if (comments.length === 0) {
      listContainer.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px;">Belum ada ulasan untuk komik ini.</div>`;
      return;
    }

    listContainer.innerHTML = comments.map(c => `
      <div class="comment-item" id="${c.id}">
        <div class="comment-avatar">
          <img src="${c.avatar || comic.coverImage}" alt="${c.userName}" referrerpolicy="no-referrer" />
        </div>
        <div class="comment-content">
          <div class="comment-meta">
            <span class="comment-author">${c.userName}</span>
            <span style="color: var(--rating-color); font-size: 0.8rem;">${'⭐'.repeat(c.rating || 5)}</span>
            <span class="comment-date">• ${c.timestamp}</span>
          </div>
          <div class="comment-text">${ReaderController.escapeHTML(c.text)}</div>
          <div class="comment-actions">
            <button class="comment-like-btn ${c.isLiked ? 'liked' : ''}" data-target="${comic.slug}" data-comment-id="${c.id}">
              ❤️ <span>${c.likes || 0}</span> Suka
            </button>
          </div>
        </div>
      </div>
    `).join("");

    listContainer.querySelectorAll(".comment-like-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        const commentId = btn.dataset.commentId;
        const updated = StorageService.likeComment(target, commentId);
        if (updated) {
          this.renderDetailComments(comic);
        }
      });
    });
  },

  // --- View: Catalog ---
  async showCatalog() {
    document.title = "Jelajah Komik - NekoKomik";
    document.getElementById("home-view-container").style.display = "none";
    document.getElementById("reader-view-container").style.display = "none";
    document.getElementById("comic-detail-container").style.display = "none";
    const catalogContainer = document.getElementById("catalog-view-container");
    catalogContainer.style.display = "block";

    catalogContainer.innerHTML = `
      <div class="container" style="padding: 30px 20px 60px;">
        <div class="section-head" style="flex-wrap: wrap; gap: 14px;">
          <h1 class="section-title">
            <span class="section-title-icon">📚</span> Jelajah Komik
          </h1>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="genre-pill active" id="filter-all" data-type="all">🔥 Semua</button>
            <button class="genre-pill" id="filter-manhwa" data-type="Manhwa">🇰🇷 Manhwa</button>
            <button class="genre-pill" id="filter-manga" data-type="Manga">🇯🇵 Manga</button>
            <button class="genre-pill" id="filter-manhua" data-type="Manhua">🇨🇳 Manhua</button>
          </div>
        </div>

        <div class="comic-grid" id="catalog-grid-results">
          ${this.getSkeletonCardsHTML(12)}
        </div>
      </div>
    `;

    const allComics = await ComicAPI.getLatestComics(1);
    const grid = document.getElementById("catalog-grid-results");
    
    // Check url params for type
    const hash = window.location.hash;
    let initialType = "all";
    if (hash.includes("type=manhwa")) initialType = "Manhwa";
    else if (hash.includes("type=manga")) initialType = "Manga";
    else if (hash.includes("type=manhua")) initialType = "Manhua";

    const filterAndRender = (type) => {
      document.querySelectorAll(".genre-pill").forEach(p => p.classList.remove("active"));
      const activePill = document.querySelector(`[data-type="${type}"]`);
      if (activePill) activePill.classList.add("active");

      const filtered = type === "all" ? allComics : allComics.filter(c => c.type.toLowerCase() === type.toLowerCase());
      this.renderComicsGrid(grid, filtered);
    };

    filterAndRender(initialType);

    document.querySelectorAll("[data-type]").forEach(btn => {
      btn.addEventListener("click", () => {
        filterAndRender(btn.dataset.type);
      });
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // --- Modal: Bookmarks & History ---
  openBookmarkModal(initialTab = "bookmarks") {
    const backdrop = document.getElementById("modal-backdrop");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body-content");
    if (!backdrop || !modalBody) return;

    backdrop.classList.add("open");
    modalTitle.innerHTML = initialTab === "bookmarks" ? "⭐ Koleksi Bookmark Favorit" : "🕒 Riwayat Terakhir Dibaca";

    this.renderModalContent(initialTab);
  },

  renderModalContent(activeTab) {
    const modalBody = document.getElementById("modal-body-content");
    if (!modalBody) return;

    const bookmarks = StorageService.getBookmarks();
    const history = StorageService.getHistory();

    modalBody.innerHTML = `
      <div style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
        <button class="tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}" id="modal-tab-bookmarks">
          ⭐ Bookmark (${bookmarks.length})
        </button>
        <button class="tab-btn ${activeTab === 'history' ? 'active' : ''}" id="modal-tab-history">
          🕒 Riwayat Baca (${history.length})
        </button>
      </div>

      <div id="modal-items-container">
        ${activeTab === 'bookmarks' ? this.getBookmarksListHTML(bookmarks) : this.getHistoryListHTML(history)}
      </div>
    `;

    document.getElementById("modal-tab-bookmarks")?.addEventListener("click", () => this.renderModalContent("bookmarks"));
    document.getElementById("modal-tab-history")?.addEventListener("click", () => this.renderModalContent("history"));

    modalBody.querySelectorAll(".modal-delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const comicId = btn.dataset.comicId;
        StorageService.toggleBookmark({ id: comicId });
        this.updateBookmarkCount();
        this.renderModalContent("bookmarks");
        this.showToast("Dihapus dari bookmark");
      });
    });

    document.getElementById("clear-history-btn")?.addEventListener("click", () => {
      if (confirm("Hapus seluruh riwayat membaca?")) {
        StorageService.clearHistory();
        this.renderModalContent("history");
        this.showToast("Riwayat baca telah dikosongkan.");
      }
    });

    modalBody.querySelectorAll(".modal-list-item").forEach(item => {
      item.addEventListener("click", () => {
        const link = item.dataset.link;
        if (link) {
          this.closeModal();
          this.navigateTo(link);
        }
      });
    });
  },

  getBookmarksListHTML(bookmarks) {
    if (bookmarks.length === 0) {
      return `<div style="text-align: center; color: var(--text-dim); padding: 30px;">Belum ada komik yang kamu simpan ke Bookmark.</div>`;
    }

    return bookmarks.map(b => `
      <div class="modal-list-item" data-link="#comic/${b.id}" style="cursor: pointer;">
        <div class="item-left">
          <img src="${b.coverImage}" class="item-thumb" alt="${b.title}" referrerpolicy="no-referrer" />
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 2px;">${b.title}</h4>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${b.type} • ⭐ ${b.rating}</div>
          </div>
        </div>
        <button class="btn btn-outline-danger modal-delete-btn" data-comic-id="${b.id}" style="padding: 6px 12px; font-size: 0.75rem;">
          🗑 Hapus
        </button>
      </div>
    `).join("");
  },

  getHistoryListHTML(history) {
    if (history.length === 0) {
      return `<div style="text-align: center; color: var(--text-dim); padding: 30px;">Belum ada riwayat baca.</div>`;
    }

    return `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
        <button class="btn btn-outline-danger" id="clear-history-btn" style="padding: 4px 10px; font-size: 0.75rem;">
          Bersihkan Semua Riwayat
        </button>
      </div>
      ${history.map(h => `
        <div class="modal-list-item" data-link="#read/${h.comicId}/${h.chapterId}" style="cursor: pointer;">
          <div class="item-left">
            <img src="${h.coverImage}" class="item-thumb" alt="${h.comicTitle}" referrerpolicy="no-referrer" />
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 2px;">${h.comicTitle}</h4>
              <div style="font-size: 0.8rem; color: #a78bfa; font-weight: 600;">Terakhir: ${h.chapterTitle}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim);">${new Date(h.readAt).toLocaleString('id-ID')}</div>
            </div>
          </div>
          <button class="btn btn-primary" style="padding: 6px 14px; font-size: 0.8rem;">
            Lanjutkan ▶
          </button>
        </div>
      `).join("")}
    `;
  },

  closeModal() {
    const backdrop = document.getElementById("modal-backdrop");
    if (backdrop) backdrop.classList.remove("open");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
