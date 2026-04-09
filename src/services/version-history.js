/**
 * Version History Service
 * Manage multiple versions of an article
 */

const STORAGE_KEY_VERSIONS = 'openseo_version_history';
const MAX_VERSIONS = 10; // Keep only last 10 versions
const STORAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB limit

export class VersionHistoryService {
  constructor() {
    this.versions = this.loadVersions();
  }

  saveVersion(content, metadata = {}) {
    try {
      const version = {
        id: Date.now(),
        content,
        timestamp: Date.now(),
        ...metadata
      };

      // Add to beginning of array
      this.versions.unshift(version);

      // Limit to MAX_VERSIONS
      if (this.versions.length > MAX_VERSIONS) {
        this.versions = this.versions.slice(0, MAX_VERSIONS);
      }

      // Check storage size
      if (this.getStorageSize() > STORAGE_SIZE_LIMIT) {
        // Remove oldest version to stay under limit
        this.versions.pop();
      }

      this.saveToStorage();
      console.log('Version saved:', new Date(version.timestamp).toLocaleString());
      return version.id;
    } catch (err) {
      console.error('Failed to save version:', err);
      return null;
    }
  }

  getVersions() {
    return [...this.versions];
  }

  getVersion(id) {
    return this.versions.find(v => v.id === id) || null;
  }

  getLatestVersion() {
    return this.versions[0] || null;
  }

  getVersionsCount() {
    return this.versions.length;
  }

  deleteVersion(id) {
    this.versions = this.versions.filter(v => v.id !== id);
    this.saveToStorage();
    console.log('Version deleted:', id);
  }

  deleteAllVersions() {
    this.versions = [];
    this.saveToStorage();
    console.log('All versions deleted');
  }

  restoreVersion(id) {
    const version = this.getVersion(id);
    if (version) {
      console.log('Restoring version:', new Date(version.timestamp).toLocaleString());
      return version;
    }
    return null;
  }

  loadVersions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VERSIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed || [];
      }
      return [];
    } catch (err) {
      console.error('Failed to load versions:', err);
      return [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(this.versions));
    } catch (err) {
      console.error('Failed to save versions to storage:', err);
    }
  }

  getStorageSize() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VERSIONS);
      return stored ? new Blob([stored]).size : 0;
    } catch (err) {
      return 0;
    }
  }

  exportVersions() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      versions: this.versions,
      count: this.versions.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openseo-versions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('Versions exported');
  }

  importVersions(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          if (!data.versions || !Array.isArray(data.versions)) {
            reject(new Error('Invalid format: missing versions array'));
            return;
          }

          // Merge versions, avoiding duplicates by ID
          const existingIds = new Set(this.versions.map(v => v.id));
          const newVersions = data.versions.filter(v => !existingIds.has(v.id));

          if (newVersions.length === 0) {
            console.log('No new versions to import');
            resolve(0);
            return;
          }

          // Add new versions and limit to MAX_VERSIONS
          this.versions = [...newVersions, ...this.versions].slice(0, MAX_VERSIONS);
          this.saveToStorage();

          console.log(`Imported ${newVersions.length} versions`);
          resolve(newVersions.length);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

// Create singleton instance
let versionHistoryInstance = null;

export function initVersionHistory() {
  if (!versionHistoryInstance) {
    versionHistoryInstance = new VersionHistoryService();
  }
  return versionHistoryInstance;
}

export function getVersionHistory() {
  return versionHistoryInstance;
}
