/**
 * Converts a SiteNotes record into clean Markdown text.
 * @param {object} note
 * @param {object} [labels]
 * @returns {string}
 */
export function noteToMarkdown(note, labels = {}) {
  if (!note) return '';

  const {
    notesHeading = 'Notes',
    checklistHeading = 'Checklist',
    scopeLabel = 'Scope',
    sourceLabel = 'Source',
    updatedLabel = 'Updated',
  } = labels;

  const lines = [];
  const heading = note.title || note.domain || 'SiteNotes';
  lines.push(`# ${heading}`);
  lines.push('');

  if (note.scope) {
    lines.push(`- **${scopeLabel}:** ${note.scope}`);
  }
  if (note.url) {
    lines.push(`- **${sourceLabel}:** ${note.url}`);
  } else if (note.domain) {
    lines.push(`- **${sourceLabel}:** https://${note.domain}`);
  }
  if (note.updatedAt) {
    lines.push(`- **${updatedLabel}:** ${new Date(note.updatedAt).toISOString()}`);
  }

  const content = (note.content || '').trim();
  if (content) {
    lines.push('');
    lines.push(`## ${notesHeading}`);
    lines.push('');
    lines.push(content);
  }

  const checklist = Array.isArray(note.checklist) ? note.checklist : [];
  if (checklist.length > 0) {
    lines.push('');
    lines.push(`## ${checklistHeading}`);
    lines.push('');
    for (const item of checklist) {
      const mark = item.done ? 'x' : ' ';
      lines.push(`- [${mark}] ${item.text}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generates a safe filename slug for Markdown downloads.
 * @param {string} input
 * @returns {string}
 */
export function slugifyFilename(input) {
  const base = (input || 'sitenotes')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'sitenotes';
}
