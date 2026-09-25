// Reader Engine: Menggunakan Data Live dari KomikIndo via API

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
    maxWidth: "850px",
    autoScrollSpeed: 1
  },

  init() {
    this.settings = StorageService.getReaderSettings();
    this.bindGlobalKeys();
  },

  bindGlobalKeys() {
    window.addEventListener("keydown", (e) => {
      const readerElem = document.getElementById("reader-view-container");
      if (!readerElem || readerElem.style.display === "none") return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

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
    });
  },

  async openChapter(comicSlug, chapterSlug) {
    this.currentComicSlug = comicSlug;
    this.currentChapterSlug = chapterSlug;
    this.currentPageIndex = 0;
    this.stopAutoScroll();

    const container = document.getElementById("reader-view-container");
    if (!container) return;

    // Hide other views
    document.getElementById("home-view-container").style.display = "none";
    document.getElementById("comic-detail-container").style.display = "none";
    document.getElementById("catalog-view-container").style.display = "none";
    container.style.display = "block";

    // Show loading state
    container.innerHTML = `
      <div class="reader-view" style="align-items: center; justify-content: center; min-height: 80vh;">
        <div style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 2.5rem; animation: pulse 1s infinite; margin-bottom: 16px;">⚡</div>
          <h2 style="font-family: var(--font-heading); font-size: 1.4rem; margin-bottom: 8px;">Memuat Chapter dari KomikIndo...</h2>
          <p style="color: var(--text-dim); font-size: 0.9rem;">Mengambil gambar resolusi tinggi langsung dari server KomikIndo</p>
        </div>
      </div>
    `;

    window.scrollTo({ top: 0, behavior: "smooth" });

    // Fetch live chapter data
    const [chapterData, comicDetail] = await Promise.all([
      ComicAPI.getChapterPages(chapterSlug),
      ComicAPI.getComicDetail(comicSlug)
    ]);

    if (!chapterData || !chapterData.pages || chapterData.pages.length === 0) {
      container.innerHTML = `
        <div class="reader-view" style="align-items: center; justify-content: center; min-height: 80vh;">
          <div style="text-align: center; padding: 40px 20px; max-width: 500px;">
            <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
            <h2 style="font-family: var(--font-heading); margin-bottom: 12px;">Gagal Memuat Chapter</h2>
            <p style="color: var(--text-muted); margin-bottom: 24px;">Halaman chapter dari KomikIndo tidak dapat diambil atau link telah berubah.</p>
            <a href="#comic/${comicSlug}" class="btn btn-primary">Kembali ke Detail Komik</a>
          </div>
        </div>
      `;
      return;
    }

    this.chapterData = chapterData;
    this.comicDetail = comicDetail;

    // Save to reading history
    StorageService.saveHistory(
      { id: comicSlug, title: comicDetail ? comicDetail.title : comicSlug, coverImage: comicDetail ? comicDetail.coverImage : "", type: comicDetail ? comicDetail.type : "Komik" },
      { id: chapterSlug, number: chapterSlug, title: chapterData.title }
    );

    this.renderReader();
  },

  renderReader() {
    const container = document.getElementById("reader-view-container");
    if (!container || !this.chapterData) return;

    document.title = `${this.chapterData.title} - NekoKomik`;

    const nextSlug = this.chapterData.nextSlug;
    const prevSlug = this.chapterData.prevSlug;

    // Generate dropdown options if we have comicDetail chapters
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
        <!-- Reader Top Navigation Bar -->
        <header class="reader-top-bar" id="reader-top-nav">
          <div class="reader-comic-title">
            <button class="btn btn-secondary" id="reader-back-btn" style="padding: 6px 12px; font-size: 0.85rem;">
              ← Kembali
            </button>
            <span style="font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;">
              ${this.chapterData.title}
            </span>
          </div>

          <div class="reader-controls">
            <!-- Chapter Selector -->
            <select class="reader-select" id="reader-chapter-select" title="Pilih Chapter">
              ${chapterOptions}
            </select>

            <!-- Mode Selector -->
            <select class="reader-select" id="reader-mode-select" title="Mode Baca">
              <option value="webtoon" ${this.settings.mode === "webtoon" ? "selected" : ""}>Mode: Webtoon (Scroll)</option>
              <option value="manga" ${this.settings.mode === "manga" ? "selected" : ""}>Mode: Manga (Per Halaman)</option>
            </select>

            <!-- Width Selector -->
            <select class="reader-select" id="reader-width-select" title="Lebar Tampilan">
              <option value="700px" ${this.settings.maxWidth === "700px" ? "selected" : ""}>Kompak (700px)</option>
              <option value="850px" ${this.settings.maxWidth === "850px" ? "selected" : ""}>Standar (850px)</option>
              <option value="100%" ${this.settings.maxWidth === "100%" ? "selected" : ""}>Penuh (100%)</option>
            </select>

            <!-- Auto-scroll Button -->
            <button class="btn btn-secondary" id="reader-autoscroll-btn" style="padding: 6px 12px; font-size: 0.85rem;" title="Mulai Auto-scroll (Spasi)">
              ▶ Auto-Scroll
            </button>

            <!-- Fullscreen Button -->
            <button class="icon-btn" id="reader-fullscreen-btn" title="Layar Penuh" style="width: 34px; height: 34px;">
              ⛶
            </button>
          </div>
        </header>

        <!-- Reading Canvas -->
        <main class="reader-canvas-container">
          <div class="reader-pages-wrapper" id="reader-pages-content" style="max-width: ${this.settings.maxWidth};">
            ${this.getPagesHTML()}
          </div>

          <!-- Reader Bottom Nav -->
          <nav class="reader-bottom-nav">
            <button class="btn btn-secondary" id="reader-prev-ch-btn" ${!prevSlug ? "disabled style='opacity:0.4;cursor:not-allowed;'" : ""}>
              « Chapter Sebelumnya
            </button>
            <button class="btn btn-primary" id="reader-ch-list-btn">
              📋 Daftar Chapter
            </button>
            <button class="btn ${nextSlug ? 'btn-primary' : 'btn-secondary'}" id="reader-next-ch-btn" ${!nextSlug ? "disabled style='opacity:0.4;cursor:not-allowed;'" : ""}>
              Chapter Selanjutnya »
            </button>
          </nav>

          <!-- Interactive Comments for Chapter -->
          <section class="reader-comments-wrap" id="reader-comments-section">
            <h3 style="font-family: var(--font-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              💬 Komentar Pembaca (${this.chapterData.title})
            </h3>
            
            <form class="comment-form" id="reader-comment-form">
              <div class="comment-input-row">
                <input type="text" class="comment-user-input" id="reader-comment-author" placeholder="Nama kamu (Opsional)" />
                <div class="comment-rating-select">
                  <span>Rating:</span>
                  <select class="reader-select" id="reader-comment-star">
                    <option value="5">⭐⭐⭐⭐⭐ (5.0)</option>
                    <option value="4">⭐⭐⭐⭐ (4.0)</option>
                    <option value="3">⭐⭐⭐ (3.0)</option>
                    <option value="2">⭐⭐ (2.0)</option>
                    <option value="1">⭐ (1.0)</option>
                  </select>
                </div>
              </div>
              <textarea class="comment-textarea" id="reader-comment-text" placeholder="Tulis tanggapan atau teori kamu tentang chapter ini..." required></textarea>
              <button type="submit" class="btn btn-primary" style="align-self: flex-start; padding: 10px 20px;">
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

  getPagesHTML() {
    const pages = this.chapterData.pages || [];
    if (this.settings.mode === "manga") {
      const pageUrl = pages[this.currentPageIndex] || pages[0];
      return `
        <div class="manga-mode-wrapper">
          <div class="manga-single-slide">
            <button class="manga-nav-btn manga-prev" id="manga-prev-btn" title="Halaman Sebelumnya (←)">‹</button>
            <img src="${pageUrl}" alt="Halaman ${this.currentPageIndex + 1}" id="manga-current-img" referrerpolicy="no-referrer" />
            <button class="manga-nav-btn manga-next" id="manga-next-btn" title="Halaman Selanjutnya (→)">›</button>
            <div class="page-indicator-badge">Halaman ${this.currentPageIndex + 1} / ${pages.length}</div>
          </div>
          <div style="margin-top: 14px; font-size: 0.85rem; color: var(--text-dim);">
            Gunakan tombol panah <strong>[ ← ]</strong> atau <strong>[ → ]</strong> pada keyboard untuk berpindah halaman.
          </div>
        </div>
      `;
    } else {
      return pages.map((pageUrl, idx) => `
        <div class="reader-page-item">
          <img src="${pageUrl}" alt="Panel ${idx + 1}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none';" />
          <div class="page-indicator-badge">${idx + 1} / ${pages.length}</div>
        </div>
      `).join("");
    }
  },

  attachEventListeners(nextSlug, prevSlug) {
    document.getElementById("reader-back-btn").addEventListener("click", () => {
      this.stopAutoScroll();
      App.navigateTo(`#comic/${this.currentComicSlug}`);
    });

    document.getElementById("reader-chapter-select").addEventListener("change", (e) => {
      this.stopAutoScroll();
      App.navigateTo(`#read/${this.currentComicSlug}/${e.target.value}`);
    });

    document.getElementById("reader-mode-select").addEventListener("change", (e) => {
      this.settings.mode = e.target.value;
      StorageService.saveReaderSettings(this.settings);
      this.stopAutoScroll();
      this.updatePagesContent();
    });

    document.getElementById("reader-width-select").addEventListener("change", (e) => {
      this.settings.maxWidth = e.target.value;
      StorageService.saveReaderSettings(this.settings);
      const wrapper = document.getElementById("reader-pages-content");
      if (wrapper) wrapper.style.maxWidth = this.settings.maxWidth;
    });

    document.getElementById("reader-autoscroll-btn").addEventListener("click", () => {
      this.toggleAutoScroll();
    });

    document.getElementById("reader-fullscreen-btn").addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      } else {
        document.exitFullscreen().catch(err => console.log(err));
      }
    });

    if (prevSlug) {
      document.getElementById("reader-prev-ch-btn").addEventListener("click", () => {
        this.stopAutoScroll();
        App.navigateTo(`#read/${this.currentComicSlug}/${prevSlug}`);
      });
    }

    if (nextSlug) {
      document.getElementById("reader-next-ch-btn").addEventListener("click", () => {
        this.stopAutoScroll();
        App.navigateTo(`#read/${this.currentComicSlug}/${nextSlug}`);
      });
    }

    document.getElementById("reader-ch-list-btn").addEventListener("click", () => {
      this.stopAutoScroll();
      App.navigateTo(`#comic/${this.currentComicSlug}`);
    });

    if (this.settings.mode === "manga") {
      this.attachMangaNavControls();
    }

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
      window.scrollTo({ top: 120, behavior: "smooth" });
    } else {
      App.showToast("Kamu berada di akhir halaman chapter ini!");
    }
  },

  prevPage() {
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--;
      this.updatePagesContent();
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  },

  toggleAutoScroll() {
    if (this.settings.mode === "manga") {
      App.showToast("Auto-scroll hanya aktif pada Mode Webtoon (Scroll)!");
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
      container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px;">Belum ada komentar. Jadilah yang pertama berkomentar!</div>`;
      return;
    }

    container.innerHTML = comments.map(c => `
      <div class="comment-item" id="${c.id}">
        <div class="comment-avatar">
          <img src="${c.avatar || 'assets/images/solo_leveling_cover.jpg'}" alt="${c.userName}" />
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
