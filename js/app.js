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
  currentHeroIndex: 0,
  heroAutoTimer: null,
  featuredHeroes: [
    {
      id: "229848-solo-leveling",
      slug: "229848-solo-leveling",
      title: "Solo Leveling",
      tag: "🔥 Manhwa Terpopuler #1",
      coverImage: "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg",
      type: "Manhwa",
      rating: "9.8",
      votes: "14,820",
      status: "Tamat",
      totalChapters: "179",
      releaseYear: "2018",
      firstChapterSlug: "solo-leveling-chapter-1",
      synopsis: "10 tahun lalu, Gerbang terbuka menghubungkan dunia manusia dengan monster. Sung Jin-Woo, pemburu peringkat-E terlemah di dunia, menemukan sistem rahasia untuk naik level tanpa batas!",
      genres: ["Action", "Adventure", "Fantasy", "Supernatural"]
    },
    {
      id: "155895-nano-machine",
      slug: "155895-nano-machine",
      title: "Nano Machine",
      tag: "⚡ Murim Sci-Fi Populer",
      coverImage: "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Nano-Machine-223x319.jpg",
      type: "Manhwa",
      rating: "9.7",
      votes: "9,420",
      status: "Berjalan",
      totalChapters: "250+",
      releaseYear: "2020",
      firstChapterSlug: "nano-machine-chapter-1",
      synopsis: "Cheon Yeo-Woon, pangeran terbuang dari Sekte Iblis, menerima suntikan Nano Machine dari keturunan masa depannya. Kini takdirnya untuk menguasai dunia persilatan dimulai!",
      genres: ["Action", "Martial Arts", "Sci-Fi", "Murim"]
    },
    {
      id: "martial-peak",
      slug: "martial-peak",
      title: "Martial Peak",
      tag: "⚔️ Epik Kultivasi Terpanjang",
      coverImage: "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Martial-Peak-236x315.jpg",
      type: "Manhua",
      rating: "9.5",
      votes: "21,500",
      status: "Berjalan",
      totalChapters: "3700+",
      releaseYear: "2018",
      firstChapterSlug: "martial-peak-chapter-1",
      synopsis: "Puncak bela diri adalah perjalanan yang sepi dan berbahaya. Yang Kai, seorang penyapu lantai paviliun Lingxiao, menemukan Kitab Hitam tanpa kata yang mengubah takdirnya!",
      genres: ["Action", "Fantasy", "Martial Arts", "Cultivation"]
    },
    {
      id: "447206-the-beginning-after-the-end",
      slug: "447206-the-beginning-after-the-end",
      title: "The Beginning After The End",
      tag: "👑 Reinkarnasi Sihir Terbaik",
      coverImage: "https://komikindo.ch/wp-content/uploads/2020/12/Komik-The-Beginning-After-The-End-236x315.jpg",
      type: "Manhwa",
      rating: "9.8",
      votes: "11,200",
      status: "Berjalan",
      totalChapters: "190+",
      releaseYear: "2018",
      firstChapterSlug: "the-beginning-after-the-end-chapter-1",
      synopsis: "Raja Grey memiliki kekuasaan dan prestise tak tertandingi di dunia militer. Namun, ia terlahir kembali di dunia sihir sebagai Arthur Leywin untuk mengukir takdir baru yang damai!",
      genres: ["Action", "Adventure", "Fantasy", "Isekai"]
    },
    {
      id: "950565-lookism",
      slug: "950565-lookism",
      title: "Lookism",
      tag: "🥊 Aksi Tawuran & Gang Korea",
      coverImage: "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Lookism-236x319.jpeg",
      type: "Manhwa",
      rating: "9.7",
      votes: "13,600",
      status: "Berjalan",
      totalChapters: "520+",
      releaseYear: "2014",
      firstChapterSlug: "lookism-chapter-1",
      synopsis: "Park Hyung-suk, seorang siswa sekolah yang sering dirundung, tiba-tiba terbangun dengan tubuh kedua yang rupawan dan tangguh. Kehidupan gandanya yang seru pun dimulai!",
      genres: ["Action", "Drama", "School", "Supernatural"]
    }
  ],

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
    this.updateActiveNav(hash);
    
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

  updateActiveNav(hash) {
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    document.querySelectorAll(".bottom-nav-item").forEach(l => l.classList.remove("active"));

    if (hash.startsWith("#catalog")) {
      document.getElementById("nav-catalog")?.classList.add("active");
      document.getElementById("bnav-catalog")?.classList.add("active");
    } else if (hash === "#bookmarks") {
      document.getElementById("bnav-bookmarks")?.classList.add("active");
    } else if (hash === "#history") {
      document.getElementById("bnav-history")?.classList.add("active");
    } else if (!hash || hash === "#home") {
      document.getElementById("nav-home")?.classList.add("active");
      document.getElementById("bnav-home")?.classList.add("active");
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
    const bnavBadge = document.getElementById("bnav-bookmark-badge");
    if (bnavBadge) {
      bnavBadge.textContent = list.length;
      bnavBadge.style.display = list.length > 0 ? "inline-block" : "none";
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

    // Render hero banner immediately so user never sees a blank page
    this.renderHeroBanner(heroContainer);

    if (this.cachedPopular.length === 0 || this.cachedLatest.length === 0) {
      if (popularGrid) popularGrid.innerHTML = this.getSkeletonCardsHTML(8);
      if (latestGrid) latestGrid.innerHTML = this.getSkeletonCardsHTML(8);
      
      try {
        const [popular, latest] = await Promise.all([
          ComicAPI.getPopularComics(1),
          ComicAPI.getLatestComics(1)
        ]);

        if (popular && popular.length > 0) this.cachedPopular = popular;
        if (latest && latest.length > 0) this.cachedLatest = latest;
      } catch (err) {
        console.error("Gagal load daftar komik di home:", err);
      }
    }

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

  renderHeroBanner(heroContainer) {
    if (!heroContainer) return;
    const hero = this.featuredHeroes[this.currentHeroIndex];
    const isSaved = StorageService.isBookmarked(hero.slug);
    const badgeClass = hero.type === "Manhwa" ? "badge-manhwa" : hero.type === "Manga" ? "badge-manga" : "badge-manhua";

    heroContainer.innerHTML = `
      <div class="container">
        <div class="hero-card" id="hero-active-card">
          <div class="hero-cover-wrapper">
            <img src="${hero.coverImage}" alt="${hero.title}" referrerpolicy="no-referrer" />
            <div class="hero-badges-floating">
              <span class="badge badge-hot">${hero.tag}</span>
              <span class="badge ${badgeClass}">${hero.type}</span>
              <span class="badge badge-color">BERWARNA</span>
            </div>
          </div>

          <div class="hero-content">
            <div class="hero-tag">⚡ Sorotan Komik Pilihan NekoKomik</div>
            <h1 class="hero-title">${hero.title}</h1>
            <div class="hero-meta">
              <span class="meta-rating">⭐ ${hero.rating} (${hero.votes} votes)</span>
              <span>• Status: <strong style="color: #10b981;">${hero.status}</strong></span>
              <span>• Total: <strong>${hero.totalChapters} Chapter</strong></span>
              <span>• Rilis: <strong>${hero.releaseYear}</strong></span>
            </div>

            <p class="hero-synopsis">
              ${hero.synopsis}
            </p>

            <div class="hero-genres">
              ${hero.genres.map(g => `<span class="genre-pill">${g}</span>`).join("")}
            </div>

            <div class="hero-actions">
              <a href="#read/${hero.slug}/${hero.firstChapterSlug}" class="btn btn-primary" style="padding: 10px 20px; font-weight: 700;">
                🚀 Mulai Baca Chapter 1
              </a>
              <a href="#comic/${hero.slug}" class="btn btn-secondary">
                📖 Detail & Chapter
              </a>
              <button class="btn btn-secondary" id="hero-bookmark-btn">
                ${isSaved ? '❤️ Favorit' : '⭐ Bookmark'}
              </button>
            </div>

            <!-- Carousel Controls -->
            <div class="hero-controls">
              <div class="carousel-indicators">
                ${this.featuredHeroes.map((h, i) => `
                  <button class="indicator-pill ${i === this.currentHeroIndex ? 'active' : ''}" data-index="${i}" title="${h.title}" aria-label="Slide ${i+1}"></button>
                `).join("")}
              </div>
              <div class="carousel-arrows">
                <button class="carousel-arrow-btn" id="hero-prev-btn" aria-label="Komik Sebelumnya">‹</button>
                <button class="carousel-arrow-btn" id="hero-next-btn" aria-label="Komik Berikutnya">›</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bookmark toggle
    document.getElementById("hero-bookmark-btn")?.addEventListener("click", () => {
      const nowSaved = StorageService.toggleBookmark({
        id: hero.slug,
        title: hero.title,
        coverImage: hero.coverImage,
        type: hero.type,
        rating: parseFloat(hero.rating),
        totalChapters: parseInt(hero.totalChapters, 10) || 100
      });
      this.updateBookmarkCount();
      this.showToast(nowSaved ? `${hero.title} ditambahkan ke Favorit!` : `${hero.title} dihapus dari Favorit.`);
      this.renderHeroBanner(heroContainer);
    });

    // Arrow navigation
    document.getElementById("hero-prev-btn")?.addEventListener("click", () => {
      this.currentHeroIndex = (this.currentHeroIndex - 1 + this.featuredHeroes.length) % this.featuredHeroes.length;
      this.renderHeroBanner(heroContainer);
      this.resetHeroTimer(heroContainer);
    });

    document.getElementById("hero-next-btn")?.addEventListener("click", () => {
      this.currentHeroIndex = (this.currentHeroIndex + 1) % this.featuredHeroes.length;
      this.renderHeroBanner(heroContainer);
      this.resetHeroTimer(heroContainer);
    });

    // Indicators click
    heroContainer.querySelectorAll(".indicator-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        this.currentHeroIndex = parseInt(btn.dataset.index, 10);
        this.renderHeroBanner(heroContainer);
        this.resetHeroTimer(heroContainer);
      });
    });

    this.startHeroAutoTimer(heroContainer);
  },

  startHeroAutoTimer(heroContainer) {
    if (this.heroAutoTimer) return;
    this.heroAutoTimer = setInterval(() => {
      this.currentHeroIndex = (this.currentHeroIndex + 1) % this.featuredHeroes.length;
      this.renderHeroBanner(heroContainer);
    }, 6000);
  },

  resetHeroTimer(heroContainer) {
    clearInterval(this.heroAutoTimer);
    this.heroAutoTimer = null;
    this.startHeroAutoTimer(heroContainer);
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
        <h2 style="font-family: var(--font-heading); font-size: 1.4rem;">Mengambil Data Komik...</h2>
        <p style="color: var(--text-dim); margin-top: 8px;">Memuat sinopsis dan seluruh daftar chapter</p>
      </div>
    `;

    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const comic = await ComicAPI.getComicDetail(slug);
      if (!comic) {
        detailContainer.innerHTML = `
          <div class="container" style="padding: 60px 20px; text-align: center;">
            <h2 style="font-family: var(--font-heading);">Komik Tidak Ditemukan</h2>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Gagal memuat komik dengan slug "${slug}".</p>
            <a href="#home" class="btn btn-primary">Kembali ke Beranda</a>
          </div>
        `;
        return;
      }

      this.currentComicDetail = comic;
      document.title = `Komik ${comic.title} Bahasa Indonesia - NekoKomik`;

      const coverSrc = comic.coverImage || comic.cover || "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg";
      const comicType = comic.type || "Manhwa";
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
            <a href="#catalog?type=${comicType.toLowerCase()}">${comicType}</a>
            <span>›</span>
            <span style="color: var(--text-main); font-weight: 600;">${comic.title}</span>
          </nav>

          <!-- Header Card with Ambient Backdrop -->
          <div class="detail-header-card" style="background: linear-gradient(180deg, rgba(19, 24, 38, 0.92) 0%, rgba(7, 9, 14, 0.98) 100%), url('${coverSrc}') center/cover no-repeat;">
            <div class="detail-poster-col">
              <div class="detail-poster-img">
                <img src="${coverSrc}" alt="${comic.title}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg';" />
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 14px;">
                <button class="btn ${isSaved ? 'btn-primary' : 'btn-secondary'}" id="detail-bookmark-btn" style="width: 100%;">
                  ${isSaved ? '❤️ Tersimpan di Favorit' : '⭐ Tambah ke Favorit'}
                </button>
                <button class="btn btn-secondary" id="detail-share-btn" style="width: 100%; font-size: 0.85rem;">
                  🔗 Bagikan Komik
                </button>
              </div>
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
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; margin-bottom: 4px;">
                Daftar Chapter
              </h2>
              <span class="chapter-count-chip" id="chapter-counter-chip">
                Menampilkan ${chapters.length} chapter
              </span>
            </div>

            <div class="chapter-search-box">
              <input type="text" id="chapter-filter-input" class="chapter-search-input" placeholder="Cari nomor chapter (cth: 1, 10)..." />
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
    } catch (err) {
      console.error("Error in showComicDetail:", err);
      detailContainer.innerHTML = `
        <div class="container" style="padding: 60px 20px; text-align: center;">
          <h2 style="font-family: var(--font-heading);">Gagal Memuat Komik</h2>
          <p style="color: var(--text-muted); margin-bottom: 20px;">Terjadi kendala saat memuat detail komik ini.</p>
          <a href="#home" class="btn btn-primary">Kembali ke Beranda</a>
        </div>
      `;
    }
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

    // Update chapter counter chip if present
    const counterChip = document.getElementById("chapter-counter-chip");
    if (counterChip) {
      counterChip.textContent = `Menampilkan ${chapters.length} dari ${(comic.chapters || []).length} chapter`;
    }

    if (chapters.length === 0) {
      listContainer.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 24px;">Tidak ada chapter yang sesuai dengan pencarian "${filterKeyword}".</div>`;
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
            <span>📅 ${ch.releaseDate || 'Rilis'}</span>
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

  // --- View: Catalog (Koleksi Lengkap 60+ Komik) ---
  // --- View: Catalog (Koleksi Lengkap 70+ Komik dari NekoKomik) ---
  async showCatalog() {
    document.title = "Jelajah Komik Lengkap - NekoKomik";
    document.getElementById("home-view-container").style.display = "none";
    document.getElementById("reader-view-container").style.display = "none";
    document.getElementById("comic-detail-container").style.display = "none";
    const catalogContainer = document.getElementById("catalog-view-container");
    catalogContainer.style.display = "block";

    catalogContainer.innerHTML = `
      <div class="container" style="padding: 30px 20px 60px;">
        <div class="section-head" style="flex-direction: column; align-items: flex-start; gap: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 14px;">
            <div>
              <h1 class="section-title">
                <span class="section-title-icon">📚</span> Jelajah Semua Komik
              </h1>
              <span class="chapter-count-chip" id="catalog-count-badge" style="margin-top: 6px; display: inline-block;">
                Memuat katalog komik...
              </span>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <!-- Sort Select -->
              <select class="reader-select" id="catalog-sort-select" title="Urutan Komik">
                <option value="popular">🔥 Terpopuler</option>
                <option value="rating">⭐ Rating Tertinggi</option>
                <option value="chapters">📚 Chapter Terbanyak</option>
                <option value="az">🔤 Judul (A - Z)</option>
              </select>

              <!-- Search in Catalog Input -->
              <div style="position: relative; width: 260px; max-width: 100%;">
                <input type="text" id="catalog-search-filter" class="search-input" placeholder="Cari judul / genre..." style="padding-left: 36px;" />
                <span class="search-icon">🔍</span>
              </div>
            </div>
          </div>

          <!-- Type and Genre Filter Pills -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="catalog-filter-pills">
            <button class="genre-pill active" data-filter="all">🔥 Semua</button>
            <button class="genre-pill" data-filter="Manhwa">🇰🇷 Manhwa</button>
            <button class="genre-pill" data-filter="Manga">🇯🇵 Manga</button>
            <button class="genre-pill" data-filter="Manhua">🇨🇳 Manhua</button>
            <button class="genre-pill" data-filter="Action">⚔️ Action</button>
            <button class="genre-pill" data-filter="Fantasy">✨ Fantasy</button>
            <button class="genre-pill" data-filter="Martial Arts">🥋 Martial Arts</button>
            <button class="genre-pill" data-filter="Romance">💖 Romance</button>
            <button class="genre-pill" data-filter="Adventure">🗺️ Adventure</button>
            <button class="genre-pill" data-filter="Supernatural">🔮 Supernatural</button>
            <button class="genre-pill" data-filter="Comedy">😂 Comedy</button>
          </div>
        </div>

        <div class="comic-grid" id="catalog-grid-results">
          ${this.getSkeletonCardsHTML(12)}
        </div>
      </div>
    `;

    // Ambil koleksi komik lengkap dari master index data/comics_index.json
    const allComics = await ComicAPI.getAllCatalogComics();

    const grid = document.getElementById("catalog-grid-results");
    const countBadge = document.getElementById("catalog-count-badge");
    const sortSelect = document.getElementById("catalog-sort-select");
    let activeFilter = "all";
    let searchVal = "";
    let activeSort = "popular";

    const applyFilters = () => {
      let filtered = [...allComics];

      // Filter tipe / genre
      if (activeFilter !== "all") {
        const afLower = activeFilter.toLowerCase();
        filtered = filtered.filter(c => 
          (c.type && c.type.toLowerCase() === afLower) ||
          (c.genres && c.genres.some(g => g.toLowerCase().includes(afLower))) ||
          (c.title && c.title.toLowerCase().includes(afLower))
        );
      }

      // Filter kata kunci pencarian
      if (searchVal) {
        const sLower = searchVal.toLowerCase();
        filtered = filtered.filter(c => 
          (c.title && c.title.toLowerCase().includes(sLower)) ||
          (c.type && c.type.toLowerCase().includes(sLower)) ||
          (c.genres && c.genres.some(g => g.toLowerCase().includes(sLower))) ||
          (c.author && c.author.toLowerCase().includes(sLower))
        );
      }

      // Sort logic
      if (activeSort === "rating") {
        filtered.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
      } else if (activeSort === "chapters") {
        filtered.sort((a, b) => (b.totalChapters || 0) - (a.totalChapters || 0));
      } else if (activeSort === "az") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        // Popular default
        filtered.sort((a, b) => ((b.rating || 0) * (b.totalChapters || 1)) - ((a.rating || 0) * (a.totalChapters || 1)));
      }

      if (countBadge) {
        countBadge.textContent = `Menampilkan ${filtered.length} dari ${allComics.length} komik lengkap`;
      }

      this.renderComicsGrid(grid, filtered);
    };

    // Cek parameter hash (misal #catalog?type=manhwa)
    const hash = window.location.hash;
    if (hash.includes("type=manhwa")) activeFilter = "Manhwa";
    else if (hash.includes("type=manga")) activeFilter = "Manga";
    else if (hash.includes("type=manhua")) activeFilter = "Manhua";

    document.querySelectorAll("#catalog-filter-pills [data-filter]").forEach(btn => {
      if (btn.dataset.filter.toLowerCase() === activeFilter.toLowerCase()) {
        document.querySelectorAll("#catalog-filter-pills [data-filter]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      }
      btn.addEventListener("click", () => {
        document.querySelectorAll("#catalog-filter-pills [data-filter]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        applyFilters();
      });
    });

    document.getElementById("catalog-search-filter")?.addEventListener("input", (e) => {
      searchVal = e.target.value.trim();
      applyFilters();
    });

    sortSelect?.addEventListener("change", (e) => {
      activeSort = e.target.value;
      applyFilters();
    });

    applyFilters();
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
