import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver'; // Note: docx often uses file-saver for blobs

/**
 * Cleanup Markdown to semi-plain text for PDF (simple version)
 */
function cleanMarkdownForExport(markdown) {
  return markdown
    .replace(/^#+\s+/gm, '') // Remove heading markers
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italics
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .trim();
}

/**
 * Export to PDF using jsPDF
 */
export function exportToPdf(markdown, filename = 'article.pdf') {
  const doc = new jsPDF();
  const cleanText = cleanMarkdownForExport(markdown);
  
  // Basic multi-line text wrapping for PDF
  const splitText = doc.splitTextToSize(cleanText, 180);
  doc.text(splitText, 10, 10);
  doc.save(filename);
}

/**
 * Export to Word using docx
 */
export async function exportToWord(markdown, filename = 'article.docx') {
  const lines = markdown.split('\n');
  const docChildren = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('# ')) {
      docChildren.push(new Paragraph({ text: trimmed.replace('# ', ''), heading: HeadingLevel.HEADING_1 }));
    } else if (trimmed.startsWith('## ')) {
      docChildren.push(new Paragraph({ text: trimmed.replace('## ', ''), heading: HeadingLevel.HEADING_2 }));
    } else if (trimmed.startsWith('### ')) {
      docChildren.push(new Paragraph({ text: trimmed.replace('### ', ''), heading: HeadingLevel.HEADING_3 }));
    } else {
      docChildren.push(new Paragraph({
        children: [new TextRun(trimmed)],
        spacing: { after: 200 }
      }));
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

/**
 * Copy to clipboard helper
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}
