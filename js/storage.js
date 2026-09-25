// Storage Management (LocalStorage wrapper)

const STORAGE_KEYS = {
  BOOKMARKS: "komik_bookmarks",
  HISTORY: "komik_history",
  COMMENTS: "komik_comments",
  RATINGS: "komik_user_ratings",
  THEME: "komik_theme_mode",
  READER_SETTINGS: "komik_reader_settings"
};

const StorageService = {
  // --- Bookmarks ---
  getBookmarks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error reading bookmarks", e);
      return [];
    }
  },

  isBookmarked(comicId) {
    const list = this.getBookmarks();
    return list.some(item => item.id === comicId);
  },

  toggleBookmark(comic) {
    let list = this.getBookmarks();
    const index = list.findIndex(item => item.id === comic.id);
    let bookmarked = false;
    if (index >= 0) {
      list.splice(index, 1);
      bookmarked = false;
    } else {
      list.unshift({
        id: comic.id,
        title: comic.title,
        coverImage: comic.coverImage,
        type: comic.type,
        rating: comic.rating,
        totalChapters: comic.totalChapters,
        savedAt: new Date().toISOString()
      });
      bookmarked = true;
    }
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(list));
    return bookmarked;
  },

  // --- Reading History ---
  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error reading history", e);
      return [];
    }
  },

  getComicHistory(comicId) {
    const history = this.getHistory();
    return history.find(item => item.comicId === comicId) || null;
  },

  saveHistory(comic, chapter) {
    let history = this.getHistory();
    history = history.filter(item => item.comicId !== comic.id);
    history.unshift({
      comicId: comic.id,
      comicTitle: comic.title,
      coverImage: comic.coverImage,
      chapterId: chapter.id,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      type: comic.type,
      readAt: new Date().toISOString()
    });
    // Keep max 50 items
    if (history.length > 50) history.pop();
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  },

  clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },

  // --- Comments ---
  getComments(targetId) {
    try {
      const allComments = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS) || "{}");
      return allComments[targetId] || this.getDefaultComments(targetId);
    } catch (e) {
      return this.getDefaultComments(targetId);
    }
  },

  addComment(targetId, { userName, avatar, text, rating }) {
    const allComments = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS) || "{}");
    if (!allComments[targetId]) {
      allComments[targetId] = this.getDefaultComments(targetId);
    }

    const newComment = {
      id: "cmt-" + Date.now(),
      userName: userName || "Hunter " + Math.floor(100 + Math.random() * 900),
      avatar: avatar || "assets/images/solo_leveling_cover.jpg",
      text: text,
      rating: rating || 5,
      likes: 0,
      isLiked: false,
      timestamp: "Baru saja"
    };

    allComments[targetId].unshift(newComment);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(allComments));
    return newComment;
  },

  likeComment(targetId, commentId) {
    const allComments = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS) || "{}");
    const list = allComments[targetId] || [];
    const target = list.find(c => c.id === commentId);
    if (target) {
      target.isLiked = !target.isLiked;
      target.likes += target.isLiked ? 1 : -1;
      localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(allComments));
      return target;
    }
    return null;
  },

  getDefaultComments(targetId) {
    return [
      {
        id: "cmt-1",
        userName: "SungJinWoo_Fans",
        avatar: "assets/images/solo_leveling_cover.jpg",
        text: "Art Solo Leveling dari REDICE Studio benar-benar puncak tertinggi industri manhwa! Adegan Arise selalu bikin merinding!",
        rating: 5,
        likes: 124,
        isLiked: false,
        timestamp: "3 jam yang lalu"
      },
      {
        id: "cmt-2",
        userName: "MangaHunter99",
        avatar: "assets/images/neon_blade_cover.jpg",
        text: "Web baca ini enteng banget, responsif dan gak ada iklan pop-up aneh-aneh. Lanjut terus min mantap!",
        rating: 5,
        likes: 48,
        isLiked: false,
        timestamp: "6 jam yang lalu"
      },
      {
        id: "cmt-3",
        userName: "Reina_Chan",
        avatar: "assets/images/empress_rose_cover.jpg",
        text: "Fitur scroll webtoon-nya mulus parah, bisa bookmark riwayat baca juga. Auto favorit di browser!",
        rating: 5,
        likes: 31,
        isLiked: false,
        timestamp: "1 hari yang lalu"
      }
    ];
  },

  // --- Theme ---
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || "dark";
  },

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  // --- Reader Settings ---
  getReaderSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.READER_SETTINGS);
      return saved ? JSON.parse(saved) : {
        mode: "webtoon", // 'webtoon' or 'manga'
        maxWidth: "850px", // '700px', '850px', '100%'
        autoScrollSpeed: 2 // 1, 2, 3
      };
    } catch (e) {
      return { mode: "webtoon", maxWidth: "850px", autoScrollSpeed: 2 };
    }
  },

  saveReaderSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(settings));
  }
};
