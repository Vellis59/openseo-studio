/**
 * Tabs Component
 * Tab navigation system
 */
export class Tabs {
  constructor({ tabs = [], defaultTab = null, onTabChange = null }) {
    this.tabs = tabs;
    this.defaultTab = defaultTab || tabs[0]?.id;
    this.activeTab = this.defaultTab;
    this.onTabChange = onTabChange;
    this.tabElements = new Map();
    this.contentElements = new Map();
  }

  render(container) {
    if (!container) return;

    // Create tabs navigation
    const tabsNav = document.createElement('nav');
    tabsNav.className = 'tabs';
    tabsNav.setAttribute('role', 'tablist');

    this.tabs.forEach(tab => {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'tab';
      tabBtn.textContent = tab.label;
      tabBtn.setAttribute('role', 'tab');
      tabBtn.setAttribute('aria-controls', tab.id);
      tabBtn.setAttribute('aria-selected', tab.id === this.activeTab);
      tabBtn.dataset.tabId = tab.id;

      if (tab.id === this.activeTab) {
        tabBtn.classList.add('tab--active');
      }

      tabBtn.addEventListener('click', () => this.switchTab(tab.id));
      tabsNav.appendChild(tabBtn);

      this.tabElements.set(tab.id, tabBtn);
    });

    container.appendChild(tabsNav);

    // Create tab content areas
    this.tabs.forEach(tab => {
      const content = document.createElement('div');
      content.id = tab.id;
      content.className = 'tab-content';
      content.setAttribute('role', 'tabpanel');
      content.setAttribute('aria-labelledby', `${tab.id}-tab`);

      if (tab.id === this.activeTab) {
        content.classList.add('tab-content--active');
      }

      if (tab.render) {
        tab.render(content);
      }

      container.appendChild(content);
      this.contentElements.set(tab.id, content);
    });
  }

  switchTab(tabId) {
    if (tabId === this.activeTab) return;

    // Update tab buttons
    this.tabElements.forEach((btn, id) => {
      const isActive = id === tabId;
      btn.classList.toggle('tab--active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });

    // Update content visibility
    this.contentElements.forEach((content, id) => {
      content.classList.toggle('tab-content--active', id === tabId);
    });

    this.activeTab = tabId;

    if (this.onTabChange) {
      this.onTabChange(tabId);
    }
  }

  getActiveTab() {
    return this.activeTab;
  }

  setActiveTab(tabId) {
    if (this.tabElements.has(tabId)) {
      this.switchTab(tabId);
    }
  }
}

/**
 * Tab Presets for OpenSEO Studio
 */
export const PRESETS_TABS = [
  {
    id: 'configure',
    label: '⚙️ Configure',
    render: null // Will be set dynamically
  },
  {
    id: 'plan',
    label: '📋 Plan',
    render: null
  },
  {
    id: 'generate',
    label: '✍️ Generate',
    render: null
  },
  {
    id: 'export',
    label: '📤 Export',
    render: null
  }
];
