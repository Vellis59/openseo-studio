import * as storage from './services/storage.js';
import * as api from './api/client.js';
import * as constants from './api/constants.js';
import * as seo from './utils/seo.js';
import * as textUtils from './utils/text.js';
import * as prompts from './api/prompts.js';
import { createGaugeSVG, updateGauge } from './utils/ui_gauge.js';
import { exportToPdf, exportToWord, copyToClipboard } from './utils/export.js';

// DOM Elements
const elements = {
  menuToggle: document.getElementById("menuToggle"),
  menuPanel: document.getElementById("menuPanel"),
  themeToggle: document.getElementById("themeToggle"),
  providerSelect: document.getElementById("providerSelect"),
  apiKeyInput: document.getElementById("apiKey"),
  modelSelect: document.getElementById("modelSelect"),
  reloadModelsBtn: document.getElementById("reloadModelsBtn"),
  keywordInput: document.getElementById("keyword"),
  languageSelect: document.getElementById("languageSelect"),
  toneSelect: document.getElementById("toneSelect"),
  lengthSelect: document.getElementById("lengthSelect"),
  extraInput: document.getElementById("extraInput"),
  generateBtn: document.getElementById("generateBtn"),
  outputArea: document.getElementById("output"),
  previewEl: document.getElementById("preview"),
  statusEl: document.getElementById("status"),
  wordCountEl: document.getElementById("wordCount"),
  charCountEl: document.getElementById("charCount"),
  seoScoreValue: document.getElementById("seoScoreValue"),
  seoGaugeWrapper: document.getElementById("seoGaugeWrapper"),
  seoChecksList: document.getElementById("seoChecksList"),
  seoSuggestionsList: document.getElementById("seoSuggestionsList"),
  readabilityScoreEl: document.getElementById("readabilityScore"),
  averageSentenceLengthEl: document.getElementById("averageSentenceLength"),
  complexSentencesList: document.getElementById("complexSentencesList"),
  progressBar: document.getElementById("progressBar"),
  progressLabel: document.getElementById("progressLabel"),
  etaLabel: document.getElementById("etaLabel"),
  progressShell: document.querySelector(".progress-shell"),
  aboutToggle: document.getElementById("aboutToggle"),
  aboutModal: document.getElementById("aboutModal"),
  closeAboutModalBtn: document.getElementById("closeAboutModalBtn"),
  copyMarkdownBtn: document.getElementById("copyMarkdownBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  exportWordBtn: document.getElementById("exportWordBtn")
};

// State
let state = {
  articleMarkdown: "",
  history: storage.loadHistoryFromStorage(),
  lastKeyword: "",
  isGenerating: false,
  gauge: null
};

// Initialization
function init() {
  populateLanguageSelect();
  setupEventListeners();
  applyInitialTheme();
  hydrateStateFromStorage();
  
  if (elements.seoGaugeWrapper) {
    state.gauge = createGaugeSVG(elements.seoGaugeWrapper);
  }
}

function populateLanguageSelect() {
  if (!elements.languageSelect) return;
  elements.languageSelect.innerHTML = "";
  Object.entries(constants.LANGUAGES).forEach(([code, data]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = data.label;
    elements.languageSelect.appendChild(option);
  });
  elements.languageSelect.value = constants.DEFAULT_LANGUAGE;
}

function applyInitialTheme() {
  const theme = storage.getItem(storage.STORAGE_KEY_THEME) || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  if (elements.themeToggle) {
    elements.themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
  }
}

function hydrateStateFromStorage() {
  const provider = storage.getItem(storage.STORAGE_KEY_PROVIDER) || constants.CHAT_PROVIDERS.openrouter;
  if (elements.providerSelect) elements.providerSelect.value = provider;
  
  const config = storage.getProviderConfig(provider);
  if (elements.apiKeyInput) elements.apiKeyInput.value = config.apiKey || "";
  
  refreshModels();
}

// UI Helpers
function updateMetrics() {
  const text = elements.outputArea.value;
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;
  if (elements.wordCountEl) elements.wordCountEl.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  if (elements.charCountEl) elements.charCountEl.textContent = `${chars} chars`;
}

function renderPreview(text) {
  if (!elements.previewEl) return;
  if (!text || !text.trim()) {
    elements.previewEl.innerHTML = '<p class="preview-placeholder">Start typing or generate content to see the preview.</p>';
    return;
  }
  if (window.marked && typeof window.marked.parse === 'function') {
    elements.previewEl.innerHTML = window.marked.parse(text);
  } else {
    elements.previewEl.textContent = text;
  }
}

function updateInsights() {
  const content = elements.outputArea.value;
  const keyword = elements.keywordInput.value;
  const langConfig = constants.LANGUAGES[elements.languageSelect.value] || constants.LANGUAGES[constants.DEFAULT_LANGUAGE];

  const seoData = seo.analyzeSeo(content, keyword);
  if (state.gauge) {
    updateGauge(state.gauge, seoData.score);
  } else if (elements.seoScoreValue) {
    elements.seoScoreValue.textContent = seoData.score;
  }

  const readabilityData = seo.computeReadability(content, langConfig.promptName);
  if (elements.readabilityScoreEl) elements.readabilityScoreEl.textContent = readabilityData.score;
  if (elements.averageSentenceLengthEl) {
    elements.averageSentenceLengthEl.textContent = `${readabilityData.averageSentenceLength} words`;
  }
}

async function refreshModels() {
  const provider = elements.providerSelect ? elements.providerSelect.value : constants.CHAT_PROVIDERS.openrouter;
  const apiKey = elements.apiKeyInput ? elements.apiKeyInput.value : "";
  
  try {
    const modelsList = await api.fetchModels(provider, apiKey);
    if (elements.modelSelect) {
      elements.modelSelect.innerHTML = "";
      modelsList.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        elements.modelSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Failed to load models", err);
  }
}

function showStatus(text, type) {
  if (!elements.statusEl) return;
  elements.statusEl.textContent = text;
  elements.statusEl.className = `status ${type}`;
}

function startProgress(lengthLabel) {
  const estimate = 30; 
  const start = performance.now();
  if (elements.progressShell) elements.progressShell.setAttribute("aria-hidden", "false");
  
  const interval = setInterval(() => {
    const elapsed = (performance.now() - start) / 1000;
    const percent = Math.min(95, (elapsed / estimate) * 100);
    if (elements.progressBar) elements.progressBar.style.width = `${percent}%`;
    if (elements.etaLabel) elements.etaLabel.textContent = `~${Math.ceil(Math.max(0, estimate - elapsed))}s`;
  }, 500);

  return (success) => {
    clearInterval(interval);
    if (elements.progressBar) elements.progressBar.style.width = success ? "100%" : "0%";
    setTimeout(() => {
      if (elements.progressShell) elements.progressShell.setAttribute("aria-hidden", "true");
    }, 1500);
  };
}

// Actions
async function handleGenerate() {
  if (state.isGenerating) return;

  const keyword = elements.keywordInput.value.trim();
  if (!keyword) {
    showStatus("Please enter a main keyword.", "error");
    return;
  }

  const provider = elements.providerSelect.value;
  const apiKey = elements.apiKeyInput.value;
  const model = elements.modelSelect.value;

  if (!model || (!apiKey && provider !== constants.CHAT_PROVIDERS.ollama)) {
    showStatus("Missing API key or model selection.", "error");
    return;
  }

  state.isGenerating = true;
  elements.generateBtn.disabled = true;
  elements.generateBtn.textContent = "Generating...";
  
  const finishProgress = startProgress(elements.lengthSelect.value);

  try {
    const langConfig = constants.LANGUAGES[elements.languageSelect.value] || constants.LANGUAGES[constants.DEFAULT_LANGUAGE];
    
    const sysPrompt = prompts.buildSystemPrompt();
    const userPrompt = prompts.buildPromptBlocks({
      keyword,
      languageConfig: langConfig,
      tone: elements.toneSelect.value,
      length: elements.lengthSelect.value,
      extra: elements.extraInput.value
    });

    const body = {
      model,
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7
    };

    const content = await api.callChatProvider({ provider, model, apiKey, body });

    elements.outputArea.value = content;
    updateMetrics();
    renderPreview(content);
    updateInsights();
    
    storage.addHistoryEntry({ content, keyword });
    showStatus("Article generated successfully.", "success");
    finishProgress(true);
  } catch (err) {
    console.error(err);
    showStatus(`Error: ${err.message}`, "error");
    finishProgress(false);
  } finally {
    state.isGenerating = false;
    elements.generateBtn.disabled = false;
    elements.generateBtn.textContent = "Generate article";
  }
}

// Event Listeners
function setupEventListeners() {
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      elements.themeToggle.textContent = next === "light" ? "☀️" : "🌙";
      storage.setItemGuarded(storage.STORAGE_KEY_THEME, next);
    });
  }

  if (elements.outputArea) {
    elements.outputArea.addEventListener("input", () => {
      updateMetrics();
      renderPreview(elements.outputArea.value);
      updateInsights();
    });
  }

  if (elements.providerSelect) {
    elements.providerSelect.addEventListener("change", () => {
      storage.setItemGuarded(storage.STORAGE_KEY_PROVIDER, elements.providerSelect.value);
      hydrateStateFromStorage();
    });
  }

  if (elements.apiKeyInput) {
    elements.apiKeyInput.addEventListener("change", refreshModels);
  }

  if (elements.menuToggle && elements.menuPanel) {
    elements.menuToggle.addEventListener("click", () => {
      const isOpen = elements.menuPanel.classList.contains("open");
      elements.menuPanel.classList.toggle("open", !isOpen);
      elements.menuPanel.setAttribute("aria-hidden", isOpen ? "true" : "false");
    });
  }

  if (elements.aboutToggle && elements.aboutModal) {
    elements.aboutToggle.addEventListener("click", () => {
      elements.aboutModal.classList.add("open");
      elements.aboutModal.setAttribute("aria-hidden", "false");
    });
    
    if (elements.closeAboutModalBtn) {
      elements.closeAboutModalBtn.addEventListener("click", () => {
        elements.aboutModal.classList.remove("open");
        elements.aboutModal.setAttribute("aria-hidden", "true");
      });
    }
  }

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
      }
    });
  });

  if (elements.generateBtn) {
    elements.generateBtn.addEventListener("click", handleGenerate);
  }

  // Export event listeners
  if (elements.copyMarkdownBtn) {
    elements.copyMarkdownBtn.addEventListener("click", async () => {
      const content = elements.outputArea.value;
      if (!content) return;
      const ok = await copyToClipboard(content);
      if (ok) {
        elements.copyMarkdownBtn.textContent = 'Copied!';
        setTimeout(() => elements.copyMarkdownBtn.textContent = 'Copy', 2000);
      }
    });
  }

  if (elements.exportPdfBtn) {
    elements.exportPdfBtn.addEventListener("click", () => {
      const content = elements.outputArea.value;
      const keyword = elements.keywordInput.value;
      if (!content) return;
      exportToPdf(content, `OpenSEO-${textUtils.slugifyKeyword(keyword || "article")}.pdf`);
    });
  }

  if (elements.exportWordBtn) {
    elements.exportWordBtn.addEventListener("click", () => {
      const content = elements.outputArea.value;
      const keyword = elements.keywordInput.value;
      if (!content) return;
      exportToWord(content, `OpenSEO-${textUtils.slugifyKeyword(keyword || "article")}.docx`);
    });
  }
}

// Start App
init();
