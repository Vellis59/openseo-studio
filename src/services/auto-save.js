/**
 * Auto-save Service
 * Automatically save article content and restore on load
 */

const STORAGE_KEY_ARTICLE = 'openseo_autosave_article';
const STORAGE_KEY_METADATA = 'openseo_autosave_metadata';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export class AutoSaveService {
  constructor(callback) {
    this.callback = callback;
    this.interval = null;
    this.lastSavedContent = '';
  }

  start() {
    // Stop any existing interval
    this.stop();

    // Load saved content
    this.load();

    // Start auto-save interval
    this.interval = setInterval(() => {
      this.save();
    }, AUTOSAVE_INTERVAL);

    console.log('Auto-save service started (30s interval)');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Auto-save service stopped');
    }
  }

  save(content = null, metadata = {}) {
    const contentToSave = content || this.callback?.();

    // Only save if content has changed
    if (contentToSave === this.lastSavedContent) {
      return;
    }

    try {
      const saveData = {
        content: contentToSave,
        timestamp: Date.now(),
        ...metadata
      };

      localStorage.setItem(STORAGE_KEY_ARTICLE, JSON.stringify(saveData));

      if (Object.keys(metadata).length > 0) {
        localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(metadata));
      }

      this.lastSavedContent = contentToSave;
      console.log('Auto-saved at', new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }

  load() {
    try {
      const savedArticle = localStorage.getItem(STORAGE_KEY_ARTICLE);
      const savedMetadata = localStorage.getItem(STORAGE_KEY_METADATA);

      if (savedArticle) {
        const parsed = JSON.parse(savedArticle);
        console.log('Restored auto-saved article from', new Date(parsed.timestamp).toLocaleString());

        let metadata = {};
        if (savedMetadata) {
          metadata = JSON.parse(savedMetadata);
        }

        return {
          ...parsed,
          ...metadata
        };
      }

      return null;
    } catch (err) {
      console.error('Failed to load auto-saved content:', err);
      return null;
    }
  }

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY_ARTICLE);
      localStorage.removeItem(STORAGE_KEY_METADATA);
      this.lastSavedContent = '';
      console.log('Auto-save cleared');
    } catch (err) {
      console.error('Failed to clear auto-save:', err);
    }
  }

  hasSavedContent() {
    return localStorage.getItem(STORAGE_KEY_ARTICLE) !== null;
  }

  getLastSavedTime() {
    try {
      const savedArticle = localStorage.getItem(STORAGE_KEY_ARTICLE);
      if (savedArticle) {
        const parsed = JSON.parse(savedArticle);
        return parsed.timestamp;
      }
      return null;
    } catch (err) {
      return null;
    }
  }
}

// Create singleton instance
let autoSaveInstance = null;

export function initAutoSave(callback) {
  if (!autoSaveInstance) {
    autoSaveInstance = new AutoSaveService(callback);
  }
  return autoSaveInstance;
}

export function getAutoSave() {
  return autoSaveInstance;
}
