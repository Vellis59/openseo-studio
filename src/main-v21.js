/**
 * OpenSEO Studio v2.2 - Main Application
 * Minimalist UX with auto-save, version history, and plan generation
 * 
 * New in v2.2:
 * - Auto-save every 30 seconds
 * - Version history with restore capability
 * - Plan generation fully implemented
 * - Improved workflow integration
 */

import { Button } from './components/Button.js';
import { Input, Textarea, Select } from './components/Input.js';
import { Tabs, PRESETS_TABS } from './components/Tabs.js';
import * as storage from './services/storage.js';
import * as api from './api/client.js';
import * as constants from './api/constants.js';
import * as seo from './utils/seo.js';
import * as textUtils from './utils/text.js';
import * as prompts from './api/prompts.js';
import { createGaugeSVG, updateGauge } from './utils/ui_gauge.js';
import { exportToPdf, exportToWord, copyToClipboard } from './utils/export.js';
import { initAutoSave, getAutoSave } from './services/auto-save.js';
import { initVersionHistory, getVersionHistory } from './services/version-history.js';
import { initPlanService, getPlanService } from './services/plan-service.js';

// Application State
const appState = {
  articleMarkdown: '',
  history: storage.loadHistoryFromStorage(),
  lastKeyword: '',
  isGenerating: false,
  gauge: null,
  activeTab: 'configure',
  autoSave: null,
  versionHistory: null,
  planService: null,
  currentPlan: '',
  metadata: {
    keyword: '',
    language: 'en',
    tone: 'clear and accessible',
    length: 'standard (~1500 words)'
  }
};

// DOM Elements
const elements = {};

function initializeServices() {
  // Initialize auto-save
  appState.autoSave = initAutoSave(() => {
    return document.getElementById('markdownEditor')?.value || '';
  });
  
  // Initialize version history
  appState.versionHistory = initVersionHistory();
  
  // Initialize plan service
  appState.planService = initPlanService();
  
  // Start auto-save
  if (appState.autoSave) {
    appState.autoSave.start();
  }
  
  // Check for auto-saved content
  checkForAutoSavedContent();
}

function checkForAutoSavedContent() {
  if (appState.autoSave && appState.autoSave.hasSavedContent()) {
    const lastSaved = appState.autoSave.load();
    if (lastSaved) {
      const timeAgo = getTimeAgo(new Date(lastSaved.timestamp));
      console.log('Auto-saved content found from', timeAgo);
      // TODO: Show restore button or modal
    }
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function init() {
  cacheElements();
  initializeTheme();
  hydrateStateFromStorage();
  setupEventListeners();
  initializeTabs();
  initializeSEOComponents();
  initializeServices();

  console.log('OpenSEO Studio v2.2 initialized');
}

function cacheElements() {
  elements.themeToggle = document.getElementById('themeToggle');
  elements.settingsToggle = document.getElementById('settingsToggle');
  elements.settingsPanel = document.getElementById('settingsPanel');
  elements.closeSettingsBtn = document.getElementById('closeSettingsBtn');
  elements.homeButton = document.getElementById('homeButton');
  elements.providerSelect = document.getElementById('providerSelect');
  elements.apiKeyInput = document.getElementById('apiKeyInput');
  elements.modelSelect = document.getElementById('modelSelect');
  elements.reloadModelsBtn = document.getElementById('reloadModelsBtn');
  elements.ollamaBaseUrlInput = document.getElementById('ollamaBaseUrl');
  elements.ollamaBaseUrlGroup = document.getElementById('ollamaBaseUrlGroup');
  elements.rememberKeyCheckbox = document.getElementById('rememberKey');
  elements.anonymousModeCheckbox = document.getElementById('anonymousMode');
  elements.exportConfigBtn = document.getElementById('exportConfigBtn');
  elements.resetStorageBtn = document.getElementById('resetStorageBtn');
  elements.status = document.getElementById('status');
  elements.progressContainer = document.getElementById('progressContainer');
  elements.progressBar = document.getElementById('progressBar');
  elements.progressLabel = document.getElementById('progressLabel');
  elements.planReadyBadge = document.getElementById('planReadyBadge');
  elements.articleReadyBadge = document.getElementById('articleReadyBadge');
}

function initializeTheme() {
  const theme = storage.getItem(storage.STORAGE_KEY_THEME) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', theme);

  if (elements.themeToggle) {
    elements.themeToggle.textContent = theme === 'light' ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', next);

  if (elements.themeToggle) {
    elements.themeToggle.textContent = next === 'light' ? '☀️' : '🌙';
  }

  storage.setItemGuarded(storage.STORAGE_KEY_THEME, next);
}

function hydrateStateFromStorage() {
  const provider = storage.getItem(storage.STORAGE_KEY_PROVIDER) || constants.CHAT_PROVIDERS.openrouter;

  if (elements.providerSelect) {
    elements.providerSelect.value = provider;
  }

  const config = storage.getProviderConfig(provider);

  if (elements.apiKeyInput) {
    elements.apiKeyInput.value = config.apiKey || '';
  }

  if (elements.rememberKeyCheckbox) {
    elements.rememberKeyCheckbox.checked = config.rememberKey || false;
  }

  if (elements.anonymousModeCheckbox) {
    elements.anonymousModeCheckbox.checked = config.anonymousMode || false;
  }

  if (elements.ollamaBaseUrlInput) {
    elements.ollamaBaseUrlInput.value = config.ollamaBaseUrl || 'http://localhost:11434';
  }

  refreshModels();
}

function setupEventListeners() {
  // Theme toggle
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', toggleTheme);
  }

  // Settings panel
  if (elements.settingsToggle) {
    elements.settingsToggle.addEventListener('click', openSettingsPanel);
  }

  if (elements.homeButton) {
    elements.homeButton.addEventListener('click', () => {
      const configureTab = document.querySelector('[data-tab-id="configure"]');
      if (configureTab) configureTab.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (elements.closeSettingsBtn) {
    elements.closeSettingsBtn.addEventListener('click', closeSettingsPanel);
  }

  // Provider change
  if (elements.providerSelect) {
    elements.providerSelect.addEventListener('change', () => {
      handleProviderChange();
      // Also refresh models when provider changes
      refreshModels();
    });
  }

  // API key change
  if (elements.apiKeyInput) {
    elements.apiKeyInput.addEventListener('change', () => {
      saveApiKey();
      refreshModels();
    });
  }

  // Reload models
  if (elements.reloadModelsBtn) {
    elements.reloadModelsBtn.addEventListener('click', refreshModels);
  }

  // Remember key
  if (elements.rememberKeyCheckbox) {
    elements.rememberKeyCheckbox.addEventListener('change', saveApiKey);
  }

  // Anonymous mode
  if (elements.anonymousModeCheckbox) {
    elements.anonymousModeCheckbox.addEventListener('change', saveApiKey);
  }

  // Export config
  if (elements.exportConfigBtn) {
    elements.exportConfigBtn.addEventListener('click', exportConfig);
  }

  // Reset storage
  if (elements.resetStorageBtn) {
    elements.resetStorageBtn.addEventListener('click', resetStorage);
  }

  // Close settings on outside click
  document.addEventListener('click', (e) => {
    if (elements.settingsPanel &&
        !elements.settingsPanel.contains(e.target) &&
        !elements.settingsToggle.contains(e.target)) {
      closeSettingsPanel();
    }
  });
}

function openSettingsPanel() {
  if (elements.settingsPanel) {
    elements.settingsPanel.classList.add('settings-panel--open');
    elements.settingsPanel.setAttribute('aria-hidden', 'false');
  }
}

function closeSettingsPanel() {
  if (elements.settingsPanel) {
    elements.settingsPanel.classList.remove('settings-panel--open');
    elements.settingsPanel.setAttribute('aria-hidden', 'true');
  }
}

function handleProviderChange() {
  const provider = elements.providerSelect.value;
  storage.setItemGuarded(storage.STORAGE_KEY_PROVIDER, provider);
  hydrateStateFromStorage();
}

function saveApiKey() {
  const provider = elements.providerSelect.value;
  const apiKey = elements.apiKeyInput.value;
  const rememberKey = elements.rememberKeyCheckbox.checked;
  const anonymousMode = elements.anonymousModeCheckbox.checked;
  const ollamaBaseUrl = elements.ollamaBaseUrlInput?.value || '';

  storage.setProviderConfig(provider, {
    apiKey,
    rememberKey,
    anonymousMode,
    ollamaBaseUrl
  });
}

async function refreshModels() {
  const provider = elements.providerSelect.value;
  const apiKey = elements.apiKeyInput.value;
  const ollamaBaseUrl = elements.ollamaBaseUrlInput?.value || '';

  // Show/hide Ollama base URL field
  if (elements.ollamaBaseUrlGroup) {
    elements.ollamaBaseUrlGroup.style.display = provider === 'ollama' ? 'block' : 'none';
  }

  if (!apiKey && provider !== 'ollama') {
    if (elements.modelSelect) {
      elements.modelSelect.innerHTML = '<option value="">Enter API key to load models</option>';
      elements.modelSelect.disabled = true;
    }
    return;
  }

  try {
    // Pass Ollama base URL if provider is Ollama
    const modelsList = await api.fetchModels(
      provider,
      apiKey,
      provider === 'ollama' ? ollamaBaseUrl : undefined
    );

    if (elements.modelSelect) {
      elements.modelSelect.innerHTML = '';
      modelsList.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        elements.modelSelect.appendChild(option);
      });
      elements.modelSelect.disabled = false;
    }

    // Save default model if set
    const defaultModel = storage.getItem(`defaultModel_${provider}`);
    if (defaultModel && elements.modelSelect) {
      elements.modelSelect.value = defaultModel;
    }
  } catch (err) {
    console.error('Failed to load models:', err);
    if (elements.modelSelect) {
      elements.modelSelect.innerHTML = '<option value="">Failed to load models</option>';
      elements.modelSelect.disabled = true;
    }
  }
}

function exportConfig() {
  const config = {
    provider: elements.providerSelect.value,
    model: elements.modelSelect.value,
    theme: document.documentElement.getAttribute('data-theme'),
    rememberKey: elements.rememberKeyCheckbox.checked,
    anonymousMode: elements.anonymousModeCheckbox.checked
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'openseo-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

function resetStorage() {
  if (confirm('Are you sure you want to reset all local storage? This cannot be undone.')) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
}

// Tab System
function initializeTabs() {
  const tabContainer = document.getElementById('tabContainer');

  if (!tabContainer) return;

  const tabs = new Tabs({
    tabs: [
      {
        id: 'configure',
        label: '⚙️ Configure',
        render: renderConfigureTab
      },
      {
        id: 'plan',
        label: '📋 Plan',
        render: renderPlanTab
      },
      {
        id: 'generate',
        label: '✍️ Generate',
        render: renderGenerateTab
      },
      {
        id: 'export',
        label: '📤 Export',
        render: renderExportTab
      }
    ],
    defaultTab: 'configure',
    onTabChange: (tabId) => {
      appState.activeTab = tabId;
      console.log('Switched to tab:', tabId);
    }
  });

  tabs.render(tabContainer);
}

// Tab Render Functions
function renderConfigureTab(container) {
  const form = document.createElement('div');
  form.className = 'card';

  form.innerHTML = `
    <div class="card__header">
      <h2 class="card__title">Configure Your Article</h2>
      <p class="card__subtitle">Fill in the details below to get started</p>
    </div>

    <div class="grid grid--2" style="margin-bottom: 1rem;">
      <div class="form-group">
        <label class="form-label" for="keywordInput">Main Keyword *</label>
        <input type="text" id="keywordInput" class="form-input" placeholder="e.g. self-hosting a Ghost blog" required>
      </div>

      <div class="form-group">
        <label class="form-label" for="languageSelect">Target Language</label>
        <select id="languageSelect" class="form-select">
          <!-- Populated by JS -->
        </select>
      </div>
    </div>

    <div class="grid grid--3" style="margin-bottom: 1rem;">
      <div class="form-group">
        <label class="form-label" for="toneSelect">Tone</label>
        <select id="toneSelect" class="form-select">
          <option value="clear and accessible" selected>Clear and accessible</option>
          <option value="friendly and slightly edgy">Friendly and slightly edgy</option>
          <option value="professional and neutral">Professional and neutral</option>
          <option value="highly technical">Highly technical</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="lengthSelect">Article Length</label>
        <select id="lengthSelect" class="form-select">
          <option value="short (~800 words)">Short (~800 words)</option>
          <option value="standard (~1500 words)" selected>Standard (~1500 words)</option>
          <option value="long (~2500 words)">Long (~2500 words)</option>
          <option value="ultra-long (~3000 words)">Very long (~3000 words)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="promptModeSelect">Prompt Mode</label>
        <select id="promptModeSelect" class="form-select">
          <option value="standard" selected>Standard (balanced)</option>
          <option value="minimal">Minimal (lean guidelines)</option>
          <option value="strict-seo">Strict SEO (extended structure)</option>
        </select>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 1.5rem;">
      <label class="form-label" for="extraInput">Additional Constraints (optional)</label>
      <input type="text" id="extraInput" class="form-input" placeholder="e.g. include a table of contents, no cliché intro...">
      <small class="form-help">Add specific instructions for the AI writer</small>
    </div>

    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
      <button id="generatePlanBtn" class="btn btn--secondary">
        📋 Generate Plan
      </button>
      <button id="generateArticleBtn" class="btn btn--primary">
        ✍️ Generate Article from Plan
      </button>
    </div>
  `;

  container.appendChild(form);

  // Populate language select
  populateLanguageSelect(form.querySelector('#languageSelect'));

  // Setup event listeners
  const generatePlanBtn = form.querySelector('#generatePlanBtn');
  const generateArticleBtn = form.querySelector('#generateArticleBtn');

  if (generatePlanBtn) {
    generatePlanBtn.addEventListener('click', handleGeneratePlan);
  }

  if (generateArticleBtn) {
    generateArticleBtn.addEventListener('click', handleGenerateArticle);
  }
}

function renderPlanTab(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card__header">
        <h2 class="card__title">Article Plan</h2>
        <p class="card__subtitle">Review and edit the outline before generating</p>
      </div>

      <textarea id="planEditor" class="form-textarea" style="min-height: 400px;" placeholder="Plan will appear here..."></textarea>

      <div style="display: flex; gap: 0.5rem; margin-top: 1rem; justify-content: flex-end;">
        <button id="regeneratePlanBtn" class="btn btn--secondary">🔄 Regenerate Plan</button>
        <button id="usePlanBtn" class="btn btn--primary">✅ Generate Article</button>
      </div>
    </div>
  `;

  // Setup event listeners
  const regeneratePlanBtn = container.querySelector('#regeneratePlanBtn');
  const usePlanBtn = container.querySelector('#usePlanBtn');

  if (regeneratePlanBtn) {
    regeneratePlanBtn.addEventListener('click', handleGeneratePlan);
  }

  if (usePlanBtn) {
    usePlanBtn.addEventListener('click', async () => {
      const planEditor = document.getElementById('planEditor');
      if (planEditor) {
        appState.currentPlan = planEditor.value.trim();
      }

      if (!appState.currentPlan) {
        showStatus('Please generate or write a plan first.', 'error');
        return;
      }

      const tabs = document.querySelector('.tabs');
      if (tabs) {
        const generateTab = tabs.querySelector('[data-tab-id="generate"]');
        if (generateTab) {
          generateTab.click();
        }
      }

      setTimeout(() => {
        handleGenerateArticle();
      }, 0);
    });
  }
}

function renderGenerateTab(container) {
  const layout = document.createElement('div');
  layout.className = 'editor-layout';

  // Editor panel
  const editorPanel = document.createElement('div');
  editorPanel.className = 'editor__panel';

  editorPanel.innerHTML = `
    <div class="editor__header">
      <div>
        <div class="editor__title">Markdown Editor</div>
        <div class="editor__subtitle">Write or generate your article</div>
      </div>
      <div>
        <span id="wordCount" class="badge">0 words</span>
        <span id="charCount" class="badge">0 chars</span>
      </div>
    </div>

    <textarea id="markdownEditor" class="editor__textarea" placeholder="Your article will appear here as pure Markdown..."></textarea>

    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
      <button id="saveVersionBtn" class="btn btn--secondary btn--sm">💾 Save Version</button>
      <button id="showVersionsBtn" class="btn btn--secondary btn--sm">📜 Versions</button>
      <button id="regenSelectionBtn" class="btn btn--secondary btn--sm">🔄 Regenerate Selection</button>
      <button id="changeToneBtn" class="btn btn--ghost btn--sm">🎨 Change Tone</button>
    </div>
  `;

  // Preview panel
  const previewPanel = document.createElement('div');
  previewPanel.className = 'editor__panel';

  previewPanel.innerHTML = `
    <div class="editor__header">
      <div>
        <div class="editor__title">Live Preview</div>
        <div class="editor__subtitle">See how it will look</div>
      </div>
      <div>
        <button id="copyMarkdownBtn" class="btn btn--ghost btn--sm">📋 Copy</button>
      </div>
    </div>

    <div id="markdownPreview" class="editor__preview">
      <p class="text-secondary">Start typing or generate content to see the preview.</p>
    </div>
  `;

  layout.appendChild(editorPanel);
  layout.appendChild(previewPanel);
  container.appendChild(layout);

  // Setup event listeners
  const markdownEditor = layout.querySelector('#markdownEditor');
  const markdownPreview = layout.querySelector('#markdownPreview');
  const copyMarkdownBtn = layout.querySelector('#copyMarkdownBtn');

  if (markdownEditor) {
    markdownEditor.addEventListener('input', () => {
      updateMetrics();
      renderPreview();
      updateSEOMetrics(markdownEditor.value, appState.metadata.keyword);
      updateActionStates();
      
      // Auto-save will handle content saving
    });
    
    // Load auto-saved content if available
    loadAutoSavedContent(markdownEditor);
  }

  if (copyMarkdownBtn) {
    copyMarkdownBtn.addEventListener('click', async () => {
      const content = markdownEditor.value;
      if (!content) return;

      const ok = await copyToClipboard(content);
      if (ok) {
        copyMarkdownBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyMarkdownBtn.textContent = '📋 Copy';
        }, 2000);
      }
    });
  }

  // Version management
  const saveVersionBtn = layout.querySelector('#saveVersionBtn');
  const showVersionsBtn = layout.querySelector('#showVersionsBtn');
  
  if (saveVersionBtn) {
    saveVersionBtn.addEventListener('click', saveCurrentVersion);
  }
  
  if (showVersionsBtn) {
    showVersionsBtn.addEventListener('click', showVersionHistory);
  }
}

function renderExportTab(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card__header">
        <h2 class="card__title">Export Options</h2>
        <p class="card__subtitle">Choose your preferred format</p>
      </div>

      <div class="grid grid--2" style="margin-bottom: 1.5rem;">
        <button id="exportMarkdownBtn" class="btn btn--secondary">
          <span style="font-size: 1.5rem;">📄</span>
          <div>
            <div style="font-weight: 600;">Markdown</div>
            <div style="font-size: 0.875rem; opacity: 0.8;">.md file</div>
          </div>
        </button>

        <button id="exportPdfBtn" class="btn btn--secondary">
          <span style="font-size: 1.5rem;">📕</span>
          <div>
            <div style="font-weight: 600;">PDF</div>
            <div style="font-size: 0.875rem; opacity: 0.8;">Formatted PDF</div>
          </div>
        </button>

        <button id="exportWordBtn" class="btn btn--secondary">
          <span style="font-size: 1.5rem;">📘</span>
          <div>
            <div style="font-weight: 600;">Word</div>
            <div style="font-size: 0.875rem; opacity: 0.8;">.docx file</div>
          </div>
        </button>

        <button id="exportJsonBtn" class="btn btn--secondary">
          <span style="font-size: 1.5rem;">📋</span>
          <div>
            <div style="font-weight: 600;">JSON</div>
            <div style="font-size: 0.875rem; opacity: 0.8;">Full data bundle</div>
          </div>
        </button>
      </div>

      <div class="card" style="background-color: var(--bg-sidebar);">
        <h3 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">SEO Metrics</h3>
        <div id="seoGaugeContainer" style="width: 120px; height: 120px; margin: 0 auto;"></div>
        <p class="text-center mt-md" style="font-size: 1.5rem; font-weight: 600;">
          <span id="seoScoreValue">—</span><span style="font-size: 0.875rem; font-weight: 400;">/100</span>
        </p>
      </div>
    </div>
  `;

  // Setup event listeners
  const exportMarkdownBtn = container.querySelector('#exportMarkdownBtn');
  const exportPdfBtn = container.querySelector('#exportPdfBtn');
  const exportWordBtn = container.querySelector('#exportWordBtn');
  const exportJsonBtn = container.querySelector('#exportJsonBtn');

  if (exportMarkdownBtn) {
    exportMarkdownBtn.addEventListener('click', handleExportMarkdown);
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', handleExportPdf);
  }

  if (exportWordBtn) {
    exportWordBtn.addEventListener('click', handleExportWord);
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', handleExportJson);
  }

  // Initialize SEO gauge
  setTimeout(() => {
    const gaugeContainer = container.querySelector('#seoGaugeContainer');
    if (gaugeContainer) {
      appState.gauge = createGaugeSVG(gaugeContainer);
    }
  }, 100);
}

function populateLanguageSelect(select) {
  if (!select) return;

  Object.entries(constants.LANGUAGES).forEach(([code, data]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = data.label;
    select.appendChild(option);
  });

  select.value = constants.DEFAULT_LANGUAGE;
}

function updateMetrics() {
  const editor = document.getElementById('markdownEditor');
  if (!editor) return;

  const text = editor.value;
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;

  const wordCountEl = document.getElementById('wordCount');
  const charCountEl = document.getElementById('charCount');

  if (wordCountEl) {
    wordCountEl.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
  }

  if (charCountEl) {
    charCountEl.textContent = `${chars} chars`;
  }
}

function loadAutoSavedContent(editor) {
  if (!appState.autoSave || !appState.autoSave.hasSavedContent()) {
    return;
  }
  
  const saved = appState.autoSave.load();
  if (saved && saved.content) {
    const lastSaved = getTimeAgo(new Date(saved.timestamp));
    
    if (confirm(`Auto-saved content found from ${lastSaved}.\n\nDo you want to restore it?`)) {
      editor.value = saved.content;
      appState.articleMarkdown = saved.content;
      
      if (saved.keyword) {
        appState.metadata.keyword = saved.keyword;
      }
      if (saved.language) {
        appState.metadata.language = saved.language;
      }
      
      updateMetrics();
      renderPreview();
      updateSEOMetrics(saved.content, appState.metadata.keyword);
      updateActionStates();
      
      showStatus('Content restored from auto-save', 'success');
    }
  }
}

function saveCurrentVersion() {
  const editor = document.getElementById('markdownEditor');
  if (!editor || !editor.value.trim()) {
    showStatus('No content to save', 'warning');
    return;
  }
  
  const versionId = appState.versionHistory?.saveVersion(editor.value, {
    type: 'article',
    keyword: appState.metadata.keyword,
    language: appState.metadata.language,
    tone: appState.metadata.tone,
    length: appState.metadata.length
  });
  
  if (versionId) {
    showStatus('Version saved successfully!', 'success');
  } else {
    showStatus('Failed to save version', 'error');
  }
}

function showVersionHistory() {
  const versions = appState.versionHistory?.getVersions() || [];
  
  if (versions.length === 0) {
    showStatus('No versions saved yet', 'warning');
    return;
  }
  
  // Create modal to show versions
  const modal = createVersionHistoryModal(versions);
  document.body.appendChild(modal);
  modal.classList.add('modal-overlay--open');
}

function createVersionHistoryModal(versions) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  let versionsHTML = versions.map(v => `
    <div class="version-item" style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-bottom: 1px solid var(--border-color);
    ">
      <div>
        <div style="font-weight: 600; font-size: 0.875rem;">
          ${v.keyword || 'Untitled'}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary);">
          ${new Date(v.timestamp).toLocaleString()}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-tertiary);">
          ${v.type === 'plan' ? '📋 Plan' : '📝 Article'}
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn--secondary btn--sm" data-action="restore" data-id="${v.id}">
          Restore
        </button>
        <button class="btn btn--ghost btn--sm" data-action="delete" data-id="${v.id}">
          Delete
        </button>
      </div>
    </div>
  `).join('');
  
  modal.innerHTML = `
    <div class="modal__header">
      <h2 class="modal__title">Version History (${versions.length})</h2>
      <button class="icon-btn" id="closeVersionsModalBtn">✕</button>
    </div>
    <div class="modal__body" style="max-height: 400px; overflow-y: auto;">
      ${versionsHTML}
    </div>
    <div class="modal__footer">
      <button class="btn btn--secondary" id="exportVersionsBtn">📥 Export All</button>
      <button class="btn btn--ghost" id="deleteAllVersionsBtn">🗑️ Delete All</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  
  // Event listeners
  const closeBtn = modal.querySelector('#closeVersionsModalBtn');
  const exportBtn = modal.querySelector('#exportVersionsBtn');
  const deleteAllBtn = modal.querySelector('#deleteAllVersionsBtn');
  
  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('modal-overlay--open');
    setTimeout(() => overlay.remove(), 200);
  });
  
  exportBtn.addEventListener('click', () => {
    appState.versionHistory?.exportVersions();
  });
  
  deleteAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all versions? This cannot be undone.')) {
      appState.versionHistory?.deleteAllVersions();
      overlay.classList.remove('modal-overlay--open');
      setTimeout(() => overlay.remove(), 200);
      showStatus('All versions deleted', 'success');
    }
  });
  
  // Version item buttons
  modal.querySelectorAll('[data-action="restore"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const version = appState.versionHistory?.restoreVersion(id);
      
      if (version) {
        const editor = document.getElementById('markdownEditor');
        if (editor) {
          editor.value = version.content;
          appState.articleMarkdown = version.content;
          appState.metadata = {
            keyword: version.keyword || '',
            language: version.language || 'en',
            tone: version.tone || 'clear and accessible',
            length: version.length || 'standard (~1500 words)'
          };
          
          updateMetrics();
          renderPreview();
          updateSEOMetrics(version.content, appState.metadata.keyword);
          updateActionStates();
        }
        
        overlay.classList.remove('modal-overlay--open');
        setTimeout(() => overlay.remove(), 200);
        showStatus('Version restored', 'success');
      }
    });
  });
  
  modal.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (confirm('Delete this version?')) {
        appState.versionHistory?.deleteVersion(id);
        overlay.classList.remove('modal-overlay--open');
        setTimeout(() => overlay.remove(), 200);
        showVersionHistory(); // Refresh modal
        showStatus('Version deleted', 'success');
      }
    });
  });
  
  return overlay;
}

function renderPreview() {
  const editor = document.getElementById('markdownEditor');
  const preview = document.getElementById('markdownPreview');

  if (!editor || !preview) return;

  const text = editor.value;

  if (!text || !text.trim()) {
    preview.innerHTML = '<p class="text-secondary">Start typing or generate content to see the preview.</p>';
    return;
  }

  if (window.marked && typeof window.marked.parse === 'function') {
    preview.innerHTML = window.marked.parse(text);
  } else {
    preview.textContent = text;
  }
}

function updateActionStates() {
  const generateArticleBtn = document.getElementById('generateArticleBtn');
  const usePlanBtn = document.getElementById('usePlanBtn');
  const hasPlan = !!appState.currentPlan?.trim();
  const hasArticle = !!appState.articleMarkdown?.trim();

  if (generateArticleBtn) {
    generateArticleBtn.disabled = appState.isGenerating;
    generateArticleBtn.textContent = hasPlan ? '✍️ Generate Article from Plan' : '✍️ Generate Plan First';
  }

  if (usePlanBtn) {
    usePlanBtn.disabled = appState.isGenerating || !hasPlan;
  }

  if (elements.planReadyBadge) {
    elements.planReadyBadge.style.display = hasPlan ? 'inline-flex' : 'none';
  }

  if (elements.articleReadyBadge) {
    elements.articleReadyBadge.style.display = hasArticle ? 'inline-flex' : 'none';
  }
}

function showStatus(text, type) {
  if (!elements.status) return;

  elements.status.textContent = text;
  elements.status.className = `status status--${type}`;
  elements.status.style.display = 'inline-flex';
}

function hideStatus() {
  if (elements.status) {
    elements.status.style.display = 'none';
  }
}

function startProgress(mode = 'Generating') {
  if (!elements.progressContainer || !elements.progressBar || !elements.progressLabel) {
    return () => {};
  }

  elements.progressContainer.style.display = 'block';
  elements.progressBar.style.width = '0%';
  elements.progressLabel.textContent = `${mode}...`;

  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    let progress;

    if (elapsed < 3) progress = 8 + elapsed * 8;
    else if (elapsed < 10) progress = 32 + (elapsed - 3) * 4;
    else if (elapsed < 25) progress = 60 + (elapsed - 10) * 1.6;
    else if (elapsed < 60) progress = 84 + (elapsed - 25) * 0.3;
    else progress = 94;

    progress = Math.min(94, progress);
    elements.progressBar.style.width = `${progress.toFixed(0)}%`;
    elements.progressLabel.textContent = `${mode}... ${progress.toFixed(0)}%`;
  }, 400);

  return (success, finalLabel) => {
    clearInterval(interval);
    if (elements.progressBar) {
      elements.progressBar.style.width = success ? '100%' : '0%';
    }
    if (elements.progressLabel) {
      elements.progressLabel.textContent = finalLabel || (success ? 'Complete!' : 'Failed');
    }
    setTimeout(() => {
      if (elements.progressContainer) {
        elements.progressContainer.style.display = 'none';
      }
    }, 1800);
  };
}

// Handlers
async function handleGeneratePlan() {
  if (appState.isGenerating) return;

  const keyword = document.getElementById('keywordInput')?.value?.trim();
  if (!keyword) {
    showStatus('Please enter a main keyword.', 'error');
    return;
  }

  const provider = elements.providerSelect?.value;
  const apiKey = elements.apiKeyInput?.value;
  const model = elements.modelSelect?.value;

  console.log(`📋 Plan Generation: provider=${provider}, model=${model}, apiKey=${apiKey ? 'oui' : 'non'}`);

  if (!model) {
    showStatus('Please select a model from dropdown first.', 'error');
    return;
  }

  if (!apiKey && provider !== 'ollama') {
    showStatus('Please configure your API key first.', 'error');
    return;
  }

  appState.isGenerating = true;
  const finishProgress = startProgress();

  try {
    const languageSelect = document.getElementById('languageSelect');
    const toneSelect = document.getElementById('toneSelect');
    const lengthSelect = document.getElementById('lengthSelect');

    const langConfig = constants.LANGUAGES[languageSelect?.value] || constants.LANGUAGES[constants.DEFAULT_LANGUAGE];
    
    const ollamaBaseUrl = elements.ollamaBaseUrlInput?.value || '';
    const plan = await appState.planService.generatePlan(
      keyword,
      langConfig,
      toneSelect?.value,
      lengthSelect?.value,
      provider,
      model,
      apiKey,
      provider === 'ollama' ? ollamaBaseUrl : undefined
    );

    // Update plan editor
    const planEditor = document.getElementById('planEditor');
    if (planEditor) {
      planEditor.value = plan;
      appState.currentPlan = plan;
      
      // Update metadata
      appState.metadata.keyword = keyword;
      appState.metadata.language = languageSelect?.value;
      appState.metadata.tone = toneSelect?.value;
      appState.metadata.length = lengthSelect?.value;
    }

    // Save version
    if (appState.versionHistory) {
      appState.versionHistory.saveVersion(plan, {
        type: 'plan',
        keyword,
        language: langConfig.promptName,
        tone: toneSelect?.value,
        length: lengthSelect?.value
      });
    }

    showStatus('Plan generated successfully!', 'success');
    updateActionStates();
    finishProgress(true, 'Plan ready');

    // Switch to plan tab
    const tabs = document.querySelector('.tabs');
    if (tabs) {
      const planTab = tabs.querySelector('[data-tab-id="plan"]');
      if (planTab) {
        planTab.click();
      }
    }
  } catch (err) {
    console.error(err);
    showStatus(`Error: ${err.message}`, 'error');
    finishProgress(false);
  } finally {
    appState.isGenerating = false;
    setTimeout(hideStatus, 3000);
  }
}

async function handleGenerateArticle() {
  if (appState.isGenerating) return;

  const keyword = document.getElementById('keywordInput')?.value?.trim();
  if (!keyword) {
    showStatus('Please enter a main keyword.', 'error');
    return;
  }

  const provider = elements.providerSelect?.value;
  const apiKey = elements.apiKeyInput?.value;
  const model = elements.modelSelect?.value;

  console.log(`🔍 Article Generation: provider=${provider}, model=${model}, apiKey=${apiKey ? 'oui' : 'non'}`);

  if (!model) {
    showStatus('Please select a model from the dropdown first.', 'error');
    return;
  }

  if (!apiKey && provider !== 'ollama') {
    showStatus('Please configure your API key first.', 'error');
    return;
  }

  appState.isGenerating = true;
  const finishProgress = startProgress();

  try {
    const languageSelect = document.getElementById('languageSelect');
    const toneSelect = document.getElementById('toneSelect');
    const lengthSelect = document.getElementById('lengthSelect');
    const extraInput = document.getElementById('extraInput');

    const langConfig = constants.LANGUAGES[languageSelect?.value] || constants.LANGUAGES[constants.DEFAULT_LANGUAGE];
    const ollamaBaseUrl = elements.ollamaBaseUrlInput?.value || '';

    if (!appState.currentPlan?.trim()) {
      const generatedPlan = await appState.planService.generatePlan(
        keyword,
        langConfig,
        toneSelect?.value,
        lengthSelect?.value,
        provider,
        model,
        apiKey,
        provider === 'ollama' ? ollamaBaseUrl : undefined
      );

      const planEditor = document.getElementById('planEditor');
      if (planEditor) {
        planEditor.value = generatedPlan;
      }
      appState.currentPlan = generatedPlan;
      appState.metadata.keyword = keyword;
      appState.metadata.language = languageSelect?.value;
      appState.metadata.tone = toneSelect?.value;
      appState.metadata.length = lengthSelect?.value;

      showStatus('Plan generated. Review it before generating the full article.', 'success');
      updateActionStates();
      finishProgress(true, 'Plan ready');

      const tabs = document.querySelector('.tabs');
      if (tabs) {
        const planTab = tabs.querySelector('[data-tab-id="plan"]');
        if (planTab) planTab.click();
      }
      return;
    }

    const sysPrompt = prompts.buildSystemPrompt();
    const userPrompt = prompts.buildPromptBlocks({
      keyword,
      languageConfig: langConfig,
      tone: toneSelect?.value,
      length: lengthSelect?.value,
      extra: extraInput?.value,
      planText: appState.currentPlan
    });

    const body = {
      model,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    };

    const content = await api.callChatProvider({
      provider,
      model,
      apiKey,
      baseUrl: provider === 'ollama' ? ollamaBaseUrl : undefined,
      body
    });

    // Update editor
    const editor = document.getElementById('markdownEditor');
    if (editor) {
      editor.value = content;
      appState.articleMarkdown = content;

      updateMetrics();
      renderPreview();

      // Add to history
      storage.addHistoryEntry({ content, keyword });
    }

    showStatus('Article generated successfully!', 'success');
    updateActionStates();
    finishProgress(true, 'Article ready');

    // Update SEO metrics
    updateSEOMetrics(content, keyword);
  } catch (err) {
    console.error(err);
    showStatus(`Error: ${err.message}`, 'error');
    finishProgress(false);
  } finally {
    appState.isGenerating = false;
    setTimeout(hideStatus, 3000);
  }
}

function updateSEOMetrics(content, keyword) {
  const seoData = seo.analyzeSeo(content, keyword);

  if (appState.gauge) {
    updateGauge(appState.gauge, seoData.score);
  }

  const seoScoreValue = document.getElementById('seoScoreValue');
  if (seoScoreValue) {
    seoScoreValue.textContent = seoData.score;
  }
}

// Export handlers
function handleExportMarkdown() {
  const content = document.getElementById('markdownEditor')?.value || '';
  if (!content) {
    showStatus('No content to export', 'error');
    return;
  }

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `openseo-article-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleExportPdf() {
  const content = document.getElementById('markdownEditor')?.value || '';
  if (!content) {
    showStatus('No content to export', 'error');
    return;
  }

  const keyword = document.getElementById('keywordInput')?.value || 'article';
  exportToPdf(content, `OpenSEO-${textUtils.slugifyKeyword(keyword)}.pdf`);
}

function handleExportWord() {
  const content = document.getElementById('markdownEditor')?.value || '';
  if (!content) {
    showStatus('No content to export', 'error');
    return;
  }

  const keyword = document.getElementById('keywordInput')?.value || 'article';
  exportToWord(content, `OpenSEO-${textUtils.slugifyKeyword(keyword)}.docx`);
}

function handleExportJson() {
  const content = document.getElementById('markdownEditor')?.value || '';
  const keyword = document.getElementById('keywordInput')?.value || '';

  if (!content) {
    showStatus('No content to export', 'error');
    return;
  }

  const seoData = seo.analyzeSeo(content, keyword);

  const json = {
    meta: {
      version: '2.1.0',
      generated: new Date().toISOString(),
      keyword,
      provider: elements.providerSelect?.value,
      model: elements.modelSelect?.value
    },
    content,
    seo: seoData
  };

  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `openseo-article-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function initializeSEOComponents() {
  // SEO components are initialized in renderExportTab
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
