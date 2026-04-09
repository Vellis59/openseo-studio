/**
 * Plan Generation Service
 * Generate article outlines based on keywords
 */

import * as api from '../api/client.js';
import * as prompts from '../api/prompts.js';
import * as constants from '../api/constants.js';

export class PlanService {
  constructor() {
    this.currentPlan = '';
  }

  async generatePlan(keyword, languageConfig, tone, length, provider, model, apiKey) {
    if (!keyword?.trim()) {
      throw new Error('Keyword is required for plan generation');
    }

    const sysPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt({
      keyword,
      languageConfig,
      tone,
      length
    });

    const body = {
      model,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5 // Lower temperature for more structured output
    };

    try {
      const plan = await api.callChatProvider({ provider, model, apiKey, body });
      this.currentPlan = this.formatPlan(plan);
      return this.currentPlan;
    } catch (err) {
      console.error('Plan generation failed:', err);
      throw err;
    }
  }

  buildSystemPrompt() {
    return [
      "You are an expert content strategist and SEO specialist.",
      "You create detailed, well-structured article outlines that follow SEO best practices.",
      "Your outlines must be practical, comprehensive, and logically ordered."
    ].join(' ');
  }

  buildUserPrompt({ keyword, languageConfig, tone, length }) {
    const lines = [];

    lines.push(`Create a detailed article outline for a ${tone} article about "${keyword}".`);
    lines.push(`Language: ${languageConfig.promptName}`);
    lines.push(`Target length: ${length}`);
    lines.push('');
    lines.push('Requirements:');
    lines.push('- Start with a compelling H1 title that includes the main keyword');
    lines.push('- Create 5-8 H2 sections covering different aspects of the topic');
    lines.push('- Each H2 should have 2-4 H3 subsections when relevant');
    lines.push('- Include an introduction and conclusion section');
    lines.push('- Ensure logical flow and progressive disclosure of information');
    lines.push('- Output only the outline structure (H1, H2, H3)');
    lines.push('');
    lines.push('Format:');
    lines.push('# [H1 Title]');
    lines.push('## [H2 Section]');
    lines.push('### [H3 Subsection]');
    lines.push('...');

    return lines.join('\n');
  }

  formatPlan(rawPlan) {
    // Clean up the plan
    let plan = rawPlan.trim();

    // Ensure it starts with H1
    if (!plan.startsWith('# ')) {
      plan = '# ' + plan;
    }

    // Remove any extra whitespace
    plan = plan.replace(/\n{3,}/g, '\n\n');

    return plan;
  }

  getCurrentPlan() {
    return this.currentPlan;
  }

  setCurrentPlan(plan) {
    this.currentPlan = plan;
  }

  clearPlan() {
    this.currentPlan = '';
  }

  parsePlanToStructure(plan) {
    const lines = plan.split('\n');
    const structure = {
      h1: '',
      h2s: [],
      h3s: []
    };

    let currentH2 = null;

    lines.forEach(line => {
      if (line.startsWith('# ')) {
        structure.h1 = line.substring(2).trim();
      } else if (line.startsWith('## ')) {
        currentH2 = {
          title: line.substring(3).trim(),
          h3s: []
        };
        structure.h2s.push(currentH2);
      } else if (line.startsWith('### ') && currentH2) {
        currentH2.h3s.push(line.substring(4).trim());
      }
    });

    return structure;
  }

  getPlanStats(plan) {
    const lines = plan.split('\n');
    const h1Count = (plan.match(/^#\s/gm) || []).length;
    const h2Count = (plan.match(/^##\s/gm) || []).length;
    const h3Count = (plan.match(/^###\s/gm) || []).length;

    return {
      totalLines: lines.length,
      h1Count,
      h2Count,
      h3Count,
      totalSections: h1Count + h2Count + h3Count
    };
  }
}

// Create singleton instance
let planServiceInstance = null;

export function initPlanService() {
  if (!planServiceInstance) {
    planServiceInstance = new PlanService();
  }
  return planServiceInstance;
}

export function getPlanService() {
  return planServiceInstance;
}
