export const STORAGE_KEYS = {
  NOTES: 'sitenotes_notes_v1',
  SETTINGS: 'sitenotes_settings_v1',
};

export const DEFAULT_SETTINGS = {
  theme: 'system',
  language: 'auto',
  defaultScope: 'page',
};

/**
 * Checks whether a note has any meaningful content or checklist items.
 * @param {object | null | undefined} note
 * @returns {boolean}
 */
export function isNoteEmpty(note) {
  if (!note) return true;
  const hasContent = typeof note.content === 'string' && note.content.trim().length > 0;
  const hasChecklist = Array.isArray(note.checklist) && note.checklist.length > 0;
  return !hasContent && !hasChecklist;
}

/**
 * Creates a fresh note object.
 * @param {object} params
 */
export function createEmptyNote({ id, scope, url = '', domain = '', title = '' }) {
  const now = Date.now();
  return {
    id,
    scope,
    url,
    domain,
    title,
    content: '',
    checklist: [],
    color: 'indigo',
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Loads all notes from chrome.storage.local.
 * @returns {Promise<Record<string, object>>}
 */
export async function loadAllNotes() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.NOTES);
  const notes = result?.[STORAGE_KEYS.NOTES];
  return notes && typeof notes === 'object' ? notes : {};
}

/**
 * Saves or deletes a note depending on whether it is empty.
 * @param {object} note
 */
export async function saveNote(note) {
  const notes = await loadAllNotes();
  if (isNoteEmpty(note)) {
    if (notes[note.id]) {
      delete notes[note.id];
      await chrome.storage.local.set({ [STORAGE_KEYS.NOTES]: notes });
    }
    return null;
  }

  const updated = {
    ...note,
    updatedAt: Date.now(),
    createdAt: note.createdAt || Date.now(),
  };
  notes[note.id] = updated;
  await chrome.storage.local.set({ [STORAGE_KEYS.NOTES]: notes });
  return updated;
}

/**
 * Deletes a note by ID.
 * @param {string} id
 */
export async function deleteNote(id) {
  const notes = await loadAllNotes();
  if (notes[id]) {
    delete notes[id];
    await chrome.storage.local.set({ [STORAGE_KEYS.NOTES]: notes });
  }
}

/**
 * Appends selected text (from context menu) to a target note.
 * @param {object} targetMeta
 * @param {string} selectedText
 */
export async function appendSelectionToNote(targetMeta, selectedText) {
  const cleaned = (selectedText || '').trim();
  if (!cleaned || !targetMeta?.id) return null;

  const notes = await loadAllNotes();
  const existing = notes[targetMeta.id] || createEmptyNote(targetMeta);
  const quoteBlock = `> ${cleaned.replace(/\r?\n/g, '\n> ')}`;
  const prefix = existing.content.trim() ? `${existing.content.trimEnd()}\n\n` : '';

  const updated = {
    ...existing,
    title: existing.title || targetMeta.title || targetMeta.domain || 'SiteNotes',
    url: existing.url || targetMeta.url || '',
    domain: existing.domain || targetMeta.domain || '',
    content: `${prefix}${quoteBlock}`,
    updatedAt: Date.now(),
  };

  notes[targetMeta.id] = updated;
  await chrome.storage.local.set({ [STORAGE_KEYS.NOTES]: notes });
  return updated;
}

/**
 * Loads user settings with defaults.
 */
export async function loadSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const stored = result?.[STORAGE_KEYS.SETTINGS];
  return {
    ...DEFAULT_SETTINGS,
    ...(stored && typeof stored === 'object' ? stored : {}),
  };
}

/**
 * Saves partial or full settings.
 * @param {Partial<typeof DEFAULT_SETTINGS>} partial
 */
export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: next });
  return next;
}

/**
 * Validates an imported JSON backup and merges it with existing notes.
 * @param {unknown} payload
 * @param {Record<string, object>} existingNotes
 * @returns {{ notes: Record<string, object>, importedCount: number }}
 */
export function validateAndMergeBackup(payload, existingNotes = {}) {
  if (!payload || typeof payload !== 'object' || !payload.notes || typeof payload.notes !== 'object') {
    throw new Error('Invalid backup structure');
  }

  const merged = { ...existingNotes };
  let importedCount = 0;

  for (const [id, rawNote] of Object.entries(payload.notes)) {
    if (!rawNote || typeof rawNote !== 'object') continue;
    if (typeof id !== 'string' || !id) continue;

    const checklist = Array.isArray(rawNote.checklist)
      ? rawNote.checklist
          .filter((item) => item && typeof item.text === 'string' && item.text.trim())
          .map((item) => ({
            id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
            text: item.text.trim(),
            done: Boolean(item.done),
          }))
      : [];

    const normalized = {
      id,
      scope: ['page', 'domain', 'global'].includes(rawNote.scope) ? rawNote.scope : 'page',
      url: typeof rawNote.url === 'string' ? rawNote.url : '',
      domain: typeof rawNote.domain === 'string' ? rawNote.domain : '',
      title: typeof rawNote.title === 'string' ? rawNote.title : '',
      content: typeof rawNote.content === 'string' ? rawNote.content : '',
      checklist,
      color: typeof rawNote.color === 'string' ? rawNote.color : 'indigo',
      pinned: Boolean(rawNote.pinned),
      createdAt: Number(rawNote.createdAt) || Date.now(),
      updatedAt: Number(rawNote.updatedAt) || Date.now(),
    };

    if (isNoteEmpty(normalized)) continue;

    // Keep whichever version was updated more recently
    if (!merged[id] || (normalized.updatedAt >= (merged[id].updatedAt || 0))) {
      merged[id] = normalized;
    }
    importedCount += 1;
  }

  return { notes: merged, importedCount };
}
