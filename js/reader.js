// Reader Engine: Universal Comic Reader with Webtoon & Manga Modes, Image Error Recovery, and Seamless Navigation

const ReaderController = {
  currentComicSlug: null,
  currentChapterSlug: null,
  chapterData: null,
  comicDetail: null,
  currentPageIndex: 0,
  isAutoScrolling: false,
  autoScrollInterval: null,
  settings: {
    mode: "webtoon", // 'webtoon' or 'manga'
    maxWidth: "880px",
    autoScrollSpeed: 1
  },

  init() {
    this.settings = StorageService.getReaderSettings() || this.settings;
    this.bindGlobalKeys();
    this.bindScrollProgress();
  },

  bindScrollProgress() {
    const progressBar = document.getElementById("reading-progress-bar");
    window.addEventListener("scroll", () => {
      const readerElem = document.getElementById("reader-view-container");
      if (!readerElem || readerElem.style.display === "none") {
        if (progressBar) progressBar.style.width = "0%";
        return;
      }
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollY / docHeight) * 100)) : 0;
      if (progressBar) progressBar.style.width = `${progress}%`;
    }, { passive: true });
  },

  bindGlobalKeys() {
    window.addEventListener("keydown", (e) => {
      const readerElem = document.getElementById("reader-view-container");
      if (!readerElem || readerElem.style.display === "none") return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

      if (this.settings.mode === "manga") {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          this.prevPage();
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          this.nextPage();
        }
      } else {
        if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          this.toggleAutoScroll();
        }
      }

      // 'f' or 'F' for fullscreen
      if (e.key === "f" || e.key === "F") {
        this.toggleFullscreen();
      }
    });
  },

  async openChapter(comicSlug, chapterSlug) {
    this.currentComicSlug = comicSlug;
    this.currentChapterSlug = chapterSlug;
    this.currentPageIndex = 0;
    this.stopAutoScroll();

    const container = document.getElementById("reader-view-container");
    if (!container) return;

    // Sembunyikan view lainnya
    document.getElementById("home-view-container").style.display = "none";
    document.getElementById("comic-detail-container").style.display = "none";
    document.getElementById("catalog-view-container").style.display = "none";
    container.style.display = "block";

    // Tampilkan animasi skeleton loading elegan
    container.innerHTML = `
      <div class="reader-view" style="align-items: center; justify-content: center; min-height: 80vh;">
        <div class="reader-loading-card">
          <div class="loading-spinner-ring"></div>
          <h2 style="font-family: var(--font-heading); font-size: 1.35rem; margin-top: 20px; font-weight: 700;">
            Menyiapkan Chapter...
          </h2>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 8px;">
            Mengunduh gambar panel resolusi tinggi langsung dari server komik
          </p>
          <div class="loading-pulse-bar"></div>
        </div>
      </div>
    `;

    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      // Ambil data chapter dan info detail komik secara paralel
      const [chapterData, comicDetail] = await Promise.all([
        ComicAPI.getChapterPages(chapterSlug),
        ComicAPI.getComicDetail(comicSlug)
      ]);

      this.chapterData = chapterData;
      this.comicDetail = comicDetail;

      // Simpan ke riwayat baca lokal
      StorageService.saveHistory(
        {
          id: comicSlug,
          title: comicDetail ? comicDetail.title : chapterSlug.replace(/-/g, " "),
          coverImage: comicDetail ? (comicDetail.coverImage || comicDetail.cover) : "",
          type: comicDetail ? (comicDetail.type || "Komik") : "Komik"
        },
        {
          id: chapterSlug,
          number: chapterSlug,
          title: chapterData.title || chapterSlug
        }
      );

      // Render reader UI
      this.renderReader();

    } catch (err) {
      console.error("Error loading chapter:", err);
      container.innerHTML = `
        <div class="reader-view" style="align-items: center; justify-content: center; min-height: 80vh;">
          <div class="fallback-reader-card">
            <div style="font-size: 3rem; margin-bottom: 12px;">⚠️</div>
            <h2 style="font-family: var(--font-heading); font-size: 1.4rem;">Gagal Memuat Chapter</h2>
            <p style="color: var(--text-muted); margin: 12px 0 24px; font-size: 0.92rem; line-height: 1.6;">
              Koneksi ke server gambar mengalami timeout. Silakan coba kembali atau baca langsung di server KomikIndo.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <button onclick="ReaderController.openChapter('${comicSlug}', '${chapterSlug}')" class="btn btn-primary">
                🔄 Coba Muat Ulang
              </button>
              <a href="https://komikindo.ch/${chapterSlug}/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                🚀 Buka di KomikIndo
              </a>
              <a href="#comic/${comicSlug}" class="btn btn-secondary">
                ← Kembali ke Komik
              </a>
            </div>
          </div>
        </div>
      `;
    }
  },

  renderReader() {
    const container = document.getElementById("reader-view-container");
    if (!container || !this.chapterData) return;

    document.title = `${this.chapterData.title} - NekoKomik`;

    // Penentuan slug previous dan next chapter
    let nextSlug = this.chapterData.nextSlug || "";
    let prevSlug = this.chapterData.prevSlug || "";

    // Sinkronisasi next & prev dari chapters list komik jika scraper tidak menemukan di halaman
    if ((!nextSlug || !prevSlug) && this.comicDetail && this.comicDetail.chapters) {
      const chList = this.comicDetail.chapters;
      const idx = chList.findIndex(c => c.slug === this.currentChapterSlug);
      if (idx !== -1) {
        if (!nextSlug && idx > 0) nextSlug = chList[idx - 1].slug;
        if (!prevSlug && idx < chList.length - 1) prevSlug = chList[idx + 1].slug;
      }
    }

    // Jika chapter tidak memiliki array gambar lokal (fallback access)
    if (this.chapterData.isDirectFallback || !this.chapterData.pages || this.chapterData.pages.length === 0) {
      this.renderFallbackReader(container, nextSlug, prevSlug);
      return;
    }

    // Generate dropdown chapter options
    let chapterOptions = "";
    if (this.comicDetail && this.comicDetail.chapters) {
      chapterOptions = this.comicDetail.chapters.map(ch => 
        `<option value="${ch.slug}" ${ch.slug === this.currentChapterSlug ? "selected" : ""}>
          ${ch.title}
        </option>`
      ).join("");
    } else {
      chapterOptions = `<option value="${this.currentChapterSlug}">${this.chapterData.title}</option>`;
    }

    container.innerHTML = `
      <div class="reader-view">
        <!-- Floating Reader Top Bar / HUD -->
        <header class="reader-top-bar" id="reader-top-nav">
          <div class="reader-comic-title">
            <button class="btn btn-secondary reader-nav-back" id="reader-back-btn" title="Kembali ke Info Komik">
              ← <span class="desktop-only">Kembali</span>
            </button>
            <div class="reader-title-info">
              <span class="reader-title-text" title="${this.chapterData.title}">
                ${this.chapterData.title}
              </span>
              <span class="reader-comic-sub">${this.comicDetail ? this.comicDetail.title : ''}</span>
            </div>
          </div>

          <div class="reader-controls">
            <!-- Chapter Selector Dropdown -->
            <select class="reader-select" id="reader-chapter-select" title="Pindah Chapter Cepat">
              ${chapterOptions}
            </select>

            <!-- Mode Selector (Webtoon Scroll vs Manga Page Flip) -->
            <select class="reader-select" id="reader-mode-select" title="Pilih Mode Membaca">
              <option value="webtoon" ${this.settings.mode === "webtoon" ? "selected" : ""}>📜 Mode Scroll Webtoon</option>
              <option value="manga" ${this.settings.mode === "manga" ? "selected" : ""}>📖 Mode Slide Halaman</option>
            </select>

            <!-- Width Selector -->
            <select class="reader-select desktop-only" id="reader-width-select" title="Atur Lebar Gambar">
              <option value="720px" ${this.settings.maxWidth === "720px" ? "selected" : ""}>Kompak (720px)</option>
              <option value="880px" ${this.settings.maxWidth === "880px" ? "selected" : ""}>Standar (880px)</option>
              <option value="100%" ${this.settings.maxWidth === "100%" ? "selected" : ""}>Layar Penuh (100%)</option>
            </select>

            <!-- Auto-scroll Button -->
            <button class="btn btn-secondary reader-autoscroll-btn desktop-only" id="reader-autoscroll-btn" title="Mulai / Jeda Auto-scroll [Spasi]">
              ▶ Auto-Scroll
            </button>

            <!-- Fullscreen Button -->
            <button class="icon-btn reader-fs-btn" id="reader-fullscreen-btn" title="Toggle Layar Penuh [F]">
              ⛶
            </button>
          </div>
        </header>

        <!-- Canvas Area Pembaca -->
        <main class="reader-canvas-container">
          <div class="reader-pages-wrapper" id="reader-pages-content" style="max-width: ${this.settings.maxWidth};">
            ${this.getPagesHTML()}
          </div>

          <!-- Reader Bottom Nav Controls -->
          <nav class="reader-bottom-nav">
            <button class="btn btn-secondary ch-nav-btn" id="reader-prev-ch-btn" ${!prevSlug ? "disabled style='opacity:0.35;cursor:not-allowed;'" : ""}>
              « Chapter Sebelumnya
            </button>
            <button class="btn btn-secondary ch-nav-btn" id="reader-ch-list-btn">
              📋 Semua Chapter
            </button>
            <button class="btn ${nextSlug ? 'btn-primary' : 'btn-secondary'} ch-nav-btn" id="reader-next-ch-btn" ${!nextSlug ? "disabled style='opacity:0.35;cursor:not-allowed;'" : ""}>
              Chapter Selanjutnya »
            </button>
          </nav>

          <!-- Interactive Comments for Chapter -->
          <section class="reader-comments-wrap" id="reader-comments-section">
            <div class="comments-section-header">
              <h3 style="font-family: var(--font-heading); display: flex; align-items: center; gap: 8px; font-size: 1.25rem;">
                💬 Diskusi Pembaca
              </h3>
              <span style="font-size: 0.85rem; color: var(--text-dim);">${this.chapterData.title}</span>
            </div>
            
            <form class="comment-form" id="reader-comment-form">
              <div class="comment-input-row">
                <input type="text" class="comment-user-input" id="reader-comment-author" placeholder="Nama pembaca (Opsional)" />
                <div class="comment-rating-select">
                  <span>Rating:</span>
                  <select class="reader-select" id="reader-comment-star">
                    <option value="5">⭐⭐⭐⭐⭐ (5.0 Sempurna)</option>
                    <option value="4">⭐⭐⭐⭐ (4.0 Keren)</option>
                    <option value="3">⭐⭐⭐ (3.0 Lumayan)</option>
                    <option value="2">⭐⭐ (2.0 Biasa)</option>
                    <option value="1">⭐ (1.0 Kurang)</option>
                  </select>
                </div>
              </div>
              <textarea class="comment-textarea" id="reader-comment-text" placeholder="Bagikan tanggapan, review, atau teori seru kamu tentang chapter ini..." required></textarea>
              <button type="submit" class="btn btn-primary" style="align-self: flex-start; padding: 10px 22px; font-weight: 700;">
                Kirim Komentar
              </button>
            </form>

            <div class="comments-list" id="reader-comments-list">
              <!-- Rendered via JS -->
            </div>
          </section>
        </main>
      </div>
    `;

    this.attachEventListeners(nextSlug, prevSlug);
    this.renderComments();
  },

  renderFallbackReader(container, nextSlug, prevSlug) {
    const sourceUrl = `https://komikindo.ch/${this.currentChapterSlug}/`;
    container.innerHTML = `
      <div class="reader-view" style="align-items: center; justify-content: center; min-height: 85vh; padding: 30px 20px;">
        <div class="fallback-reader-card">
          <div class="fallback-icon-bubble">⚡</div>
          <div class="fallback-badge">Server KomikIndo Live Access</div>
          <h2 style="font-family: var(--font-heading); font-size: 1.45rem; margin-top: 14px; font-weight: 800; line-height: 1.3;">
            ${this.chapterData.title || this.currentChapterSlug.replace(/-/g, ' ').toUpperCase()}
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin: 14px 0 26px; line-height: 1.65; max-width: 520px; margin-inline: auto;">
            Halaman chapter ini siap diakses dengan resolusi HD dari server resmi KomikIndo. Kamu dapat membacanya langsung tanpa lag!
          </p>
          
          <div class="fallback-actions-grid">
            <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary fallback-cta-btn">
              🚀 Buka Chapter Penuh di KomikIndo ›
            </a>
            <button onclick="ReaderController.openChapter('${this.currentComicSlug}', '${this.currentChapterSlug}')" class="btn btn-secondary fallback-btn">
              🔄 Coba Muat Ulang Gambar
            </button>
          </div>

          <div class="fallback-divider"></div>

          <!-- Bottom Navigation in Fallback Mode -->
          <div class="fallback-nav-row">
            <button class="btn btn-secondary ch-nav-btn" id="fallback-prev-btn" ${!prevSlug ? "disabled style='opacity:0.35;cursor:not-allowed;'" : ""}>
              « Prev Chapter
            </button>
            <a href="#comic/${this.currentComicSlug}" class="btn btn-secondary ch-nav-btn">
              📋 Info Komik
            </a>
            <button class="btn ${nextSlug ? 'btn-primary' : 'btn-secondary'} ch-nav-btn" id="fallback-next-btn" ${!nextSlug ? "disabled style='opacity:0.35;cursor:not-allowed;'" : ""}>
              Next Chapter »
            </button>
          </div>
        </div>
      </div>
    `;

    if (prevSlug) {
      document.getElementById("fallback-prev-btn")?.addEventListener("click", () => {
        App.navigateTo(`#read/${this.currentComicSlug}/${prevSlug}`);
      });
    }

    if (nextSlug) {
      document.getElementById("fallback-next-btn")?.addEventListener("click", () => {
        App.navigateTo(`#read/${this.currentComicSlug}/${nextSlug}`);
      });
    }
  },

  getPagesHTML() {
    const pages = this.chapterData.pages || [];
    if (this.settings.mode === "manga") {
      const pageUrl = pages[this.currentPageIndex] || pages[0];
      return `
        <div class="manga-mode-wrapper">
          <div class="manga-single-slide">
            <button class="manga-nav-btn manga-prev" id="manga-prev-btn" title="Halaman Sebelumnya (←)">‹</button>
            <div class="manga-img-container">
              <img src="${pageUrl}" alt="Halaman ${this.currentPageIndex + 1}" id="manga-current-img" referrerpolicy="no-referrer" onerror="ReaderController.handleImageError(this, '${pageUrl}')" />
            </div>
            <button class="manga-nav-btn manga-next" id="manga-next-btn" title="Halaman Selanjutnya (→)">›</button>
            <div class="page-indicator-badge">Halaman ${this.currentPageIndex + 1} / ${pages.length}</div>
          </div>
          <div class="manga-hint-caption">
            Gunakan tombol panah <strong>[ ← ]</strong> atau <strong>[ → ]</strong> pada keyboard untuk berpindah halaman.
          </div>
        </div>
      `;
    } else {
      return pages.map((pageUrl, idx) => `
        <div class="reader-page-item" id="page-panel-${idx + 1}">
          <img src="${pageUrl}" alt="Panel ${idx + 1}" loading="lazy" referrerpolicy="no-referrer" onerror="ReaderController.handleImageError(this, '${pageUrl}')" />
          <div class="page-indicator-badge">${idx + 1} / ${pages.length}</div>
        </div>
      `).join("");
    }
  },

  handleImageError(imgElem, originalUrl) {
    if (!imgElem) return;
    const parent = imgElem.parentElement;
    if (parent && !parent.querySelector('.img-retry-wrap')) {
      const retryWrap = document.createElement("div");
      retryWrap.className = "img-retry-wrap";
      retryWrap.innerHTML = `
        <div class="img-retry-card">
          <span>⚠️ Gagal memuat gambar panel</span>
          <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.8rem; margin-top: 6px;">
            🔄 Muat Ulang
          </button>
        </div>
      `;
      retryWrap.querySelector("button").addEventListener("click", () => {
        imgElem.src = `${originalUrl}?t=${Date.now()}`;
        retryWrap.remove();
      });
      parent.appendChild(retryWrap);
    }
  },

  attachEventListeners(nextSlug, prevSlug) {
    document.getElementById("reader-back-btn")?.addEventListener("click", () => {
      this.stopAutoScroll();
      App.navigateTo(`#comic/${this.currentComicSlug}`);
    });

    document.getElementById("reader-chapter-select")?.addEventListener("change", (e) => {
      this.stopAutoScroll();
      App.navigateTo(`#read/${this.currentComicSlug}/${e.target.value}`);
    });

    document.getElementById("reader-mode-select")?.addEventListener("change", (e) => {
      this.settings.mode = e.target.value;
      StorageService.saveReaderSettings(this.settings);
      this.stopAutoScroll();
      this.updatePagesContent();
    });

    document.getElementById("reader-width-select")?.addEventListener("change", (e) => {
      this.settings.maxWidth = e.target.value;
      StorageService.saveReaderSettings(this.settings);
      const wrapper = document.getElementById("reader-pages-content");
      if (wrapper) wrapper.style.maxWidth = this.settings.maxWidth;
    });

    document.getElementById("reader-autoscroll-btn")?.addEventListener("click", () => {
      this.toggleAutoScroll();
    });

    document.getElementById("reader-fullscreen-btn")?.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    if (prevSlug) {
      document.getElementById("reader-prev-ch-btn")?.addEventListener("click", () => {
        this.stopAutoScroll();
        App.navigateTo(`#read/${this.currentComicSlug}/${prevSlug}`);
      });
    }

    if (nextSlug) {
      document.getElementById("reader-next-ch-btn")?.addEventListener("click", () => {
        this.stopAutoScroll();
        App.navigateTo(`#read/${this.currentComicSlug}/${nextSlug}`);
      });
    }

    document.getElementById("reader-ch-list-btn")?.addEventListener("click", () => {
      this.stopAutoScroll();
      this.openChapterListModal();
    });

    if (this.settings.mode === "manga") {
      this.attachMangaNavControls();
    }

    // Comment form submission
    const commentForm = document.getElementById("reader-comment-form");
    if (commentForm) {
      commentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const authorInput = document.getElementById("reader-comment-author");
        const starSelect = document.getElementById("reader-comment-star");
        const textInput = document.getElementById("reader-comment-text");
        const text = textInput.value.trim();
        if (!text) return;

        const targetKey = `${this.currentComicSlug}_${this.currentChapterSlug}`;
        StorageService.addComment(targetKey, {
          userName: authorInput.value.trim() || undefined,
          text: text,
          rating: parseInt(starSelect.value, 10)
        });

        textInput.value = "";
        this.renderComments();
        App.showToast("Komentar kamu berhasil dikirim!");
      });
    }
  },

  openChapterListModal() {
    if (!this.comicDetail || !this.comicDetail.chapters) {
      App.navigateTo(`#comic/${this.currentComicSlug}`);
      return;
    }

    const backdrop = document.getElementById("modal-backdrop");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body-content");
    if (!backdrop || !modalBody) return;

    backdrop.classList.add("open");
    modalTitle.innerHTML = `📚 Daftar Chapter: ${this.comicDetail.title}`;

    const chapters = this.comicDetail.chapters;
    modalBody.innerHTML = `
      <div style="margin-bottom: 14px;">
        <input type="text" id="quick-ch-filter" class="search-input" placeholder="Cari chapter (contoh: 10, 50, 100)..." style="width: 100%;" />
      </div>
      <div class="quick-ch-list" id="quick-ch-list-items" style="max-height: 380px; overflow-y: auto;">
        ${chapters.map(ch => {
          const isCurrent = ch.slug === this.currentChapterSlug;
          return `
            <a href="#read/${this.currentComicSlug}/${ch.slug}" class="quick-ch-item ${isCurrent ? 'active-ch' : ''}" onclick="document.getElementById('modal-backdrop').classList.remove('open');">
              <span>${ch.title}</span>
              <span style="font-size: 0.8rem; color: var(--text-dim);">${ch.releaseDate || ''}</span>
            </a>
          `;
        }).join("")}
      </div>
    `;

    document.getElementById("quick-ch-filter")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".quick-ch-item").forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(q) ? "flex" : "none";
      });
    });
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  },

  updatePagesContent() {
    const wrapper = document.getElementById("reader-pages-content");
    if (wrapper) {
      wrapper.innerHTML = this.getPagesHTML();
      if (this.settings.mode === "manga") {
        this.attachMangaNavControls();
      }
    }
  },

  attachMangaNavControls() {
    const prevBtn = document.getElementById("manga-prev-btn");
    const nextBtn = document.getElementById("manga-next-btn");
    if (prevBtn) prevBtn.addEventListener("click", () => this.prevPage());
    if (nextBtn) nextBtn.addEventListener("click", () => this.nextPage());
  },

  nextPage() {
    const pages = this.chapterData.pages || [];
    if (this.currentPageIndex < pages.length - 1) {
      this.currentPageIndex++;
      this.updatePagesContent();
      window.scrollTo({ top: 100, behavior: "smooth" });
    } else {
      App.showToast("Kamu berada di akhir halaman chapter ini!");
    }
  },

  prevPage() {
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--;
      this.updatePagesContent();
      window.scrollTo({ top: 100, behavior: "smooth" });
    }
  },

  toggleAutoScroll() {
    if (this.settings.mode === "manga") {
      App.showToast("Auto-scroll hanya aktif pada Mode Scroll Webtoon!");
      return;
    }

    const btn = document.getElementById("reader-autoscroll-btn");
    if (this.isAutoScrolling) {
      this.stopAutoScroll();
    } else {
      this.isAutoScrolling = true;
      if (btn) {
        btn.innerHTML = "⏸ Berhenti Scroll";
        btn.classList.remove("btn-secondary");
        btn.classList.add("btn-primary");
      }
      this.autoScrollInterval = setInterval(() => {
        window.scrollBy({ top: 2 * this.settings.autoScrollSpeed, behavior: "auto" });
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
          this.stopAutoScroll();
        }
      }, 25);
    }
  },

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
    this.isAutoScrolling = false;
    const btn = document.getElementById("reader-autoscroll-btn");
    if (btn) {
      btn.innerHTML = "▶ Auto-Scroll";
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-secondary");
    }
  },

  renderComments() {
    const container = document.getElementById("reader-comments-list");
    if (!container) return;

    const targetKey = `${this.currentComicSlug}_${this.currentChapterSlug}`;
    const comments = StorageService.getComments(targetKey);

    if (comments.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 24px;">Belum ada komentar di chapter ini. Jadilah yang pertama berkomentar!</div>`;
      return;
    }

    container.innerHTML = comments.map(c => `
      <div class="comment-item" id="${c.id}">
        <div class="comment-avatar">
          <img src="${c.avatar || 'https://komikindo.ch/wp-content/uploads/2020/12/Komik-Solo-Leveling-236x319.jpeg'}" alt="${c.userName}" referrerpolicy="no-referrer" />
        </div>
        <div class="comment-content">
          <div class="comment-meta">
            <span class="comment-author">${c.userName}</span>
            <span style="color: var(--rating-color); font-size: 0.8rem;">${'⭐'.repeat(c.rating || 5)}</span>
            <span class="comment-date">• ${c.timestamp}</span>
          </div>
          <div class="comment-text">${this.escapeHTML(c.text)}</div>
          <div class="comment-actions">
            <button class="comment-like-btn ${c.isLiked ? 'liked' : ''}" data-target="${targetKey}" data-comment-id="${c.id}">
              ❤️ <span>${c.likes || 0}</span> Suka
            </button>
          </div>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".comment-like-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        const commentId = btn.dataset.commentId;
        const updated = StorageService.likeComment(target, commentId);
        if (updated) {
          this.renderComments();
        }
      });
    });
  },

  escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
};
