import {
  GLOBAL_NOTE_ID,
  formatCompactPath,
  parseTabContext,
} from '../shared/url-utils.js';
import { noteToMarkdown, slugifyFilename } from '../shared/markdown.js';
import { resolveLanguage, t } from '../shared/i18n.js';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  createEmptyNote,
  deleteNote,
  isNoteEmpty,
  loadAllNotes,
  loadSettings,
  saveNote,
  saveSettings,
  validateAndMergeBackup,
} from '../shared/storage.js';

const state = {
  notes: {},
  settings: { ...DEFAULT_SETTINGS },
  lang: 'en',
  activeView: 'editor', // 'editor' | 'all'
  scope: 'page', // 'page' | 'domain' | 'global'
  tabContext: parseTabContext('', ''),
  detachedNoteId: null, // Non-null when editing a saved note from All Notes
  currentNote: null,
  searchQuery: '',
  filter: 'all', // 'all' | 'pinned' | 'domain' | 'page'
  saveTimer: null,
  toastTimer: null,
  isSavingLocal: false,
};

const els = {
  btnTabEditor: document.getElementById('btn-tab-editor'),
  btnTabAll: document.getElementById('btn-tab-all'),
  labelTabAll: document.getElementById('label-tab-all'),
  viewEditor: document.getElementById('view-editor'),
  viewAll: document.getElementById('view-all'),
  scopePage: document.getElementById('scope-btn-page'),
  scopeDomain: document.getElementById('scope-btn-domain'),
  scopeGlobal: document.getElementById('scope-btn-global'),
  dotPage: document.getElementById('dot-page'),
  dotDomain: document.getElementById('dot-domain'),
  dotGlobal: document.getElementById('dot-global'),
  contextBanner: document.getElementById('context-banner'),
  contextDomain: document.getElementById('context-domain'),
  contextPath: document.getElementById('context-path'),
  btnBackToTab: document.getElementById('btn-back-to-tab'),
  browserPageNotice: document.getElementById('browser-page-notice'),
  btnOpenScratchpad: document.getElementById('btn-open-scratchpad'),
  editorCard: document.getElementById('editor-card'),
  noteTitle: document.getElementById('note-title'),
  colorPicker: document.getElementById('color-picker'),
  btnPin: document.getElementById('btn-pin'),
  saveStatus: document.getElementById('save-status'),
  noteContent: document.getElementById('note-content'),
  checklistProgress: document.getElementById('checklist-progress'),
  checklistProgressTrack: document.getElementById('checklist-progress-track'),
  checklistProgressFill: document.getElementById('checklist-progress-fill'),
  btnClearCompleted: document.getElementById('btn-clear-completed'),
  checklistList: document.getElementById('checklist-list'),
  checklistForm: document.getElementById('checklist-form'),
  checklistInput: document.getElementById('checklist-input'),
  btnCopyMd: document.getElementById('btn-copy-md'),
  btnDownloadMd: document.getElementById('btn-download-md'),
  btnDeleteNote: document.getElementById('btn-delete-note'),
  searchInput: document.getElementById('search-input'),
  filterPills: document.getElementById('filter-pills'),
  notesList: document.getElementById('notes-list'),
  allNotesEmpty: document.getElementById('all-notes-empty'),
  allEmptyTitle: document.getElementById('all-empty-title'),
  allEmptySubtitle: document.getElementById('all-empty-subtitle'),
  btnSettings: document.getElementById('btn-settings'),
  settingsModal: document.getElementById('settings-modal'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  settingTheme: document.getElementById('setting-theme'),
  settingLanguage: document.getElementById('setting-language'),
  settingDefaultScope: document.getElementById('setting-default-scope'),
  btnExportBackup: document.getElementById('btn-export-backup'),
  btnImportBackup: document.getElementById('btn-import-backup'),
  fileImportBackup: document.getElementById('file-import-backup'),
  toast: document.getElementById('toast'),
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    els.toast.classList.add('hidden');
  }, 2200);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'system');
}

function applyTranslations() {
  state.lang = resolveLanguage(state.settings.language);
  document.documentElement.lang = state.lang === 'pt' ? 'pt-BR' : 'en';

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(state.lang, key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(state.lang, key));
  });

  els.btnBackToTab.textContent = `↩ ${t(state.lang, 'tabEditor')}`;
  updateAllTabCount();
  renderCurrentEditor();
  renderAllNotesList();
}

function updateAllTabCount() {
  const count = Object.keys(state.notes).length;
  els.labelTabAll.textContent = t(state.lang, 'tabAll', { count });
}

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return t(state.lang, 'justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t(state.lang, 'minutesAgo', { n: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t(state.lang, 'hoursAgo', { n: diffHr });
  const diffDays = Math.floor(diffHr / 24);
  return t(state.lang, 'daysAgo', { n: diffDays });
}

function getTargetMetaForScope(scope) {
  const ctx = state.tabContext;
  if (scope === 'global') {
    return {
      id: GLOBAL_NOTE_ID,
      scope: 'global',
      url: '',
      domain: '',
      title: t(state.lang, 'globalTitle'),
    };
  }
  if (!ctx.isWebPage) return null;
  if (scope === 'domain') {
    return {
      id: ctx.domainId,
      scope: 'domain',
      url: `https://${ctx.domain}`,
      domain: ctx.domain,
      title: ctx.domain,
    };
  }
  return {
    id: ctx.pageId,
    scope: 'page',
    url: ctx.normalizedUrl,
    domain: ctx.domain,
    title: ctx.title,
  };
}

function resolveCurrentNote() {
  if (state.detachedNoteId && state.notes[state.detachedNoteId]) {
    return { ...state.notes[state.detachedNoteId] };
  }
  state.detachedNoteId = null;

  const meta = getTargetMetaForScope(state.scope);
  if (!meta) return null;

  const existing = state.notes[meta.id];
  if (existing) {
    return {
      ...existing,
      checklist: Array.isArray(existing.checklist)
        ? existing.checklist.map((item) => ({ ...item }))
        : [],
    };
  }
  return createEmptyNote(meta);
}

function updateScopeDots() {
  const ctx = state.tabContext;
  const hasPage = Boolean(ctx.isWebPage && state.notes[ctx.pageId]);
  const hasDomain = Boolean(ctx.isWebPage && state.notes[ctx.domainId]);
  const hasGlobal = Boolean(state.notes[GLOBAL_NOTE_ID]);

  els.dotPage.classList.toggle('has-note', hasPage);
  els.dotDomain.classList.toggle('has-note', hasDomain);
  els.dotGlobal.classList.toggle('has-note', hasGlobal);

  els.scopePage.disabled = !ctx.isWebPage && !state.detachedNoteId;
  els.scopeDomain.disabled = !ctx.isWebPage && !state.detachedNoteId;

  els.scopePage.classList.toggle('active', !state.detachedNoteId && state.scope === 'page');
  els.scopeDomain.classList.toggle('active', !state.detachedNoteId && state.scope === 'domain');
  els.scopeGlobal.classList.toggle('active', !state.detachedNoteId && state.scope === 'global');
}

function renderChecklist(note) {
  const items = Array.isArray(note?.checklist) ? note.checklist : [];
  els.checklistList.innerHTML = '';

  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;

  if (total > 0) {
    els.checklistProgress.textContent = t(state.lang, 'checklistProgress', {
      done: doneCount,
      total,
    });
    els.checklistProgress.classList.remove('hidden');
    els.checklistProgressTrack.classList.remove('hidden');
    els.checklistProgressFill.style.width = `${Math.round((doneCount / total) * 100)}%`;
  } else {
    els.checklistProgress.classList.add('hidden');
    els.checklistProgressTrack.classList.add('hidden');
  }

  els.btnClearCompleted.classList.toggle('hidden', doneCount === 0);

  for (const item of items) {
    const li = document.createElement('li');
    li.className = `checklist-item${item.done ? ' done' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checklist-checkbox';
    checkbox.checked = Boolean(item.done);
    checkbox.addEventListener('change', () => {
      item.done = checkbox.checked;
      renderChecklist(state.currentNote);
      persistCurrentNoteImmediately();
    });

    const span = document.createElement('span');
    span.className = 'checklist-text';
    span.textContent = item.text;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'checklist-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', 'Remove');
    removeBtn.addEventListener('click', () => {
      state.currentNote.checklist = state.currentNote.checklist.filter((c) => c.id !== item.id);
      renderChecklist(state.currentNote);
      persistCurrentNoteImmediately();
    });

    li.append(checkbox, span, removeBtn);
    els.checklistList.appendChild(li);
  }
}

function renderCurrentEditor() {
  updateScopeDots();

  const note = resolveCurrentNote();
  state.currentNote = note;

  if (!note) {
    els.browserPageNotice.classList.remove('hidden');
    els.editorCard.classList.add('hidden');
    els.contextBanner.classList.add('hidden');
    return;
  }

  els.browserPageNotice.classList.add('hidden');
  els.editorCard.classList.remove('hidden');
  els.contextBanner.classList.remove('hidden');

  if (state.detachedNoteId) {
    els.contextDomain.textContent = note.domain || t(state.lang, 'globalTitle');
    els.contextPath.textContent = note.url ? formatCompactPath(note.url) : '';
    els.btnBackToTab.classList.remove('hidden');
  } else if (state.scope === 'global') {
    els.contextDomain.textContent = t(state.lang, 'globalTitle');
    els.contextPath.textContent = t(state.lang, 'globalSubtitle');
    els.btnBackToTab.classList.add('hidden');
  } else if (state.scope === 'domain') {
    els.contextDomain.textContent = state.tabContext.domain;
    els.contextPath.textContent = t(state.lang, 'scopeDomain');
    els.btnBackToTab.classList.add('hidden');
  } else {
    els.contextDomain.textContent = state.tabContext.domain;
    els.contextPath.textContent = formatCompactPath(state.tabContext.normalizedUrl);
    els.btnBackToTab.classList.add('hidden');
  }

  els.editorCard.setAttribute('data-accent', note.color || 'indigo');
  els.colorPicker.querySelectorAll('.color-dot').forEach((dot) => {
    dot.classList.toggle('active', dot.dataset.color === (note.color || 'indigo'));
  });

  els.btnPin.classList.toggle('pinned', Boolean(note.pinned));
  els.btnPin.title = note.pinned ? t(state.lang, 'unpinNote') : t(state.lang, 'pinNote');

  if (document.activeElement !== els.noteTitle) {
    els.noteTitle.value = note.title || '';
  }
  if (document.activeElement !== els.noteContent) {
    els.noteContent.value = note.content || '';
  }

  const savedInStore = Boolean(state.notes[note.id]);
  setSaveStatus(savedInStore ? 'saved' : 'empty');
  renderChecklist(note);
}

function setSaveStatus(mode) {
  els.saveStatus.classList.toggle('saved', mode === 'saved');
  if (mode === 'saving') {
    els.saveStatus.textContent = t(state.lang, 'statusSaving');
  } else if (mode === 'saved') {
    els.saveStatus.textContent = t(state.lang, 'statusSaved');
  } else {
    els.saveStatus.textContent = t(state.lang, 'statusEmpty');
  }
}

async function persistCurrentNoteImmediately() {
  clearTimeout(state.saveTimer);
  if (!state.currentNote) return;

  state.isSavingLocal = true;
  try {
    const saved = await saveNote(state.currentNote);
    if (saved) {
      state.notes[saved.id] = saved;
      state.currentNote = saved;
      setSaveStatus('saved');
    } else {
      delete state.notes[state.currentNote.id];
      if (state.detachedNoteId === state.currentNote.id) {
        state.detachedNoteId = null;
      }
      setSaveStatus('empty');
    }
    updateScopeDots();
    updateAllTabCount();
  } finally {
    state.isSavingLocal = false;
  }
}

function scheduleSave() {
  setSaveStatus('saving');
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    persistCurrentNoteImmediately();
  }, 280);
}

function renderAllNotesList() {
  const query = state.searchQuery.trim().toLowerCase();
  const entries = Object.values(state.notes);

  const filtered = entries
    .filter((note) => {
      if (state.filter === 'pinned' && !note.pinned) return false;
      if (state.filter === 'domain' && note.scope !== 'domain') return false;
      if (state.filter === 'page' && note.scope !== 'page') return false;

      if (!query) return true;
      const haystack = [
        note.title || '',
        note.domain || '',
        note.url || '',
        note.content || '',
        ...(Array.isArray(note.checklist) ? note.checklist.map((c) => c.text) : []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  els.notesList.innerHTML = '';

  if (filtered.length === 0) {
    els.allNotesEmpty.classList.remove('hidden');
    if (entries.length > 0) {
      els.allEmptyTitle.textContent = t(state.lang, 'noSearchResults');
      els.allEmptySubtitle.textContent = '';
    } else {
      els.allEmptyTitle.textContent = t(state.lang, 'noNotesTitle');
      els.allEmptySubtitle.textContent = t(state.lang, 'noNotesSubtitle');
    }
    return;
  }

  els.allNotesEmpty.classList.add('hidden');

  for (const note of filtered) {
    const card = document.createElement('article');
    card.className = 'note-card';
    card.setAttribute('data-accent', note.color || 'indigo');

    const top = document.createElement('div');
    top.className = 'note-card-top';

    const title = document.createElement('div');
    title.className = 'note-card-title';
    title.textContent = `${note.pinned ? '📌 ' : ''}${note.title || note.domain || 'SiteNotes'}`;

    const badges = document.createElement('div');
    badges.className = 'note-card-badges';

    if (Array.isArray(note.checklist) && note.checklist.length > 0) {
      const done = note.checklist.filter((c) => c.done).length;
      const progress = document.createElement('span');
      progress.className = 'progress-pill';
      progress.textContent = `${done}/${note.checklist.length}`;
      badges.appendChild(progress);
    }

    const scopeBadge = document.createElement('span');
    scopeBadge.className = 'scope-badge';
    const scopeKey =
      note.scope === 'domain'
        ? 'scopeBadgeDomain'
        : note.scope === 'global'
          ? 'scopeBadgeGlobal'
          : 'scopeBadgePage';
    scopeBadge.textContent = t(state.lang, scopeKey);
    badges.appendChild(scopeBadge);

    top.append(title, badges);
    card.appendChild(top);

    const previewText = (note.content || '').trim();
    if (previewText) {
      const preview = document.createElement('div');
      preview.className = 'note-card-preview';
      preview.textContent = previewText;
      card.appendChild(preview);
    }

    const footer = document.createElement('div');
    footer.className = 'note-card-footer';

    const urlSpan = document.createElement('span');
    urlSpan.className = 'note-card-url';
    const metaLabel = note.domain
      ? `${note.domain}${note.scope === 'page' && note.url ? formatCompactPath(note.url) : ''}`
      : t(state.lang, 'globalTitle');
    urlSpan.textContent = `${metaLabel} · ${formatRelativeTime(note.updatedAt)}`;
    footer.appendChild(urlSpan);

    if (note.url) {
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'open-link-btn';
      openBtn.textContent = `${t(state.lang, 'openUrl')} ↗`;
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.tabs.create({ url: note.url });
      });
      footer.appendChild(openBtn);
    }

    card.appendChild(footer);

    card.addEventListener('click', async () => {
      await persistCurrentNoteImmediately();
      if (note.id === GLOBAL_NOTE_ID) {
        state.detachedNoteId = null;
        state.scope = 'global';
      } else if (state.tabContext.isWebPage && note.id === state.tabContext.pageId) {
        state.detachedNoteId = null;
        state.scope = 'page';
      } else if (state.tabContext.isWebPage && note.id === state.tabContext.domainId) {
        state.detachedNoteId = null;
        state.scope = 'domain';
      } else {
        state.detachedNoteId = note.id;
      }
      switchView('editor');
      renderCurrentEditor();
    });

    els.notesList.appendChild(card);
  }
}

function switchView(viewName) {
  state.activeView = viewName;
  els.viewEditor.classList.toggle('active', viewName === 'editor');
  els.viewAll.classList.toggle('active', viewName === 'all');
  els.btnTabEditor.classList.toggle('active', viewName === 'editor');
  els.btnTabAll.classList.toggle('active', viewName === 'all');
  els.btnTabEditor.setAttribute('aria-selected', String(viewName === 'editor'));
  els.btnTabAll.setAttribute('aria-selected', String(viewName === 'all'));

  if (viewName === 'all') {
    renderAllNotesList();
  }
}

async function syncWithActiveTab() {
  if (state.saveTimer) {
    await persistCurrentNoteImmediately();
  }
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  state.tabContext = parseTabContext(tab?.url, tab?.title);

  if (!state.detachedNoteId) {
    if (!state.tabContext.isWebPage && state.scope !== 'global') {
      // Show browser page notice cleanly unless user picked Scratchpad
    }
    renderCurrentEditor();
  }
}

function bindEvents() {
  els.btnTabEditor.addEventListener('click', () => switchView('editor'));
  els.btnTabAll.addEventListener('click', async () => {
    await persistCurrentNoteImmediately();
    switchView('all');
  });

  [els.scopePage, els.scopeDomain, els.scopeGlobal].forEach((btn) => {
    btn.addEventListener('click', async () => {
      await persistCurrentNoteImmediately();
      state.detachedNoteId = null;
      state.scope = btn.dataset.scope;
      renderCurrentEditor();
    });
  });

  els.btnOpenScratchpad.addEventListener('click', () => {
    state.detachedNoteId = null;
    state.scope = 'global';
    renderCurrentEditor();
  });

  els.btnBackToTab.addEventListener('click', async () => {
    await persistCurrentNoteImmediately();
    state.detachedNoteId = null;
    state.scope = state.settings.defaultScope || 'page';
    renderCurrentEditor();
  });

  els.noteTitle.addEventListener('input', () => {
    if (!state.currentNote) return;
    state.currentNote.title = els.noteTitle.value;
    scheduleSave();
  });

  els.noteContent.addEventListener('input', () => {
    if (!state.currentNote) return;
    state.currentNote.content = els.noteContent.value;
    scheduleSave();
  });

  els.colorPicker.addEventListener('click', (e) => {
    const dot = e.target.closest('.color-dot');
    if (!dot || !state.currentNote) return;
    state.currentNote.color = dot.dataset.color;
    els.editorCard.setAttribute('data-accent', state.currentNote.color);
    els.colorPicker.querySelectorAll('.color-dot').forEach((d) => {
      d.classList.toggle('active', d === dot);
    });
    if (!isNoteEmpty(state.currentNote)) {
      persistCurrentNoteImmediately();
    }
  });

  els.btnPin.addEventListener('click', () => {
    if (!state.currentNote) return;
    state.currentNote.pinned = !state.currentNote.pinned;
    els.btnPin.classList.toggle('pinned', state.currentNote.pinned);
    if (!isNoteEmpty(state.currentNote)) {
      persistCurrentNoteImmediately();
    }
  });

  els.checklistForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.currentNote) return;
    const text = els.checklistInput.value.trim();
    if (!text) return;

    state.currentNote.checklist = state.currentNote.checklist || [];
    state.currentNote.checklist.push({
      id: crypto.randomUUID(),
      text,
      done: false,
    });
    els.checklistInput.value = '';
    renderChecklist(state.currentNote);
    persistCurrentNoteImmediately();
  });

  els.btnClearCompleted.addEventListener('click', () => {
    if (!state.currentNote) return;
    state.currentNote.checklist = (state.currentNote.checklist || []).filter((i) => !i.done);
    renderChecklist(state.currentNote);
    persistCurrentNoteImmediately();
  });

  els.btnCopyMd.addEventListener('click', async () => {
    if (!state.currentNote) return;
    const md = noteToMarkdown(state.currentNote, {
      notesHeading: t(state.lang, 'mdNotesHeading'),
      checklistHeading: t(state.lang, 'mdChecklistHeading'),
      scopeLabel: t(state.lang, 'mdScopeLabel'),
      sourceLabel: t(state.lang, 'mdSourceLabel'),
      updatedLabel: t(state.lang, 'mdUpdatedLabel'),
    });
    await navigator.clipboard.writeText(md);
    showToast(t(state.lang, 'toastCopied'));
  });

  els.btnDownloadMd.addEventListener('click', () => {
    if (!state.currentNote) return;
    const md = noteToMarkdown(state.currentNote, {
      notesHeading: t(state.lang, 'mdNotesHeading'),
      checklistHeading: t(state.lang, 'mdChecklistHeading'),
      scopeLabel: t(state.lang, 'mdScopeLabel'),
      sourceLabel: t(state.lang, 'mdSourceLabel'),
      updatedLabel: t(state.lang, 'mdUpdatedLabel'),
    });
    const filename = `${slugifyFilename(state.currentNote.title || state.currentNote.domain)}.md`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t(state.lang, 'toastDownloaded'));
  });

  els.btnDeleteNote.addEventListener('click', async () => {
    if (!state.currentNote) return;
    if (isNoteEmpty(state.currentNote) && !state.notes[state.currentNote.id]) return;
    if (!window.confirm(t(state.lang, 'confirmDeleteNote'))) return;

    const targetId = state.currentNote.id;
    await deleteNote(targetId);
    delete state.notes[targetId];
    if (state.detachedNoteId === targetId) {
      state.detachedNoteId = null;
    }
    updateAllTabCount();
    renderCurrentEditor();
    showToast(t(state.lang, 'toastDeleted'));
  });

  els.searchInput.addEventListener('input', () => {
    state.searchQuery = els.searchInput.value;
    renderAllNotesList();
  });

  els.filterPills.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    state.filter = pill.dataset.filter;
    els.filterPills.querySelectorAll('.filter-pill').forEach((p) => {
      p.classList.toggle('active', p === pill);
    });
    renderAllNotesList();
  });

  // Settings modal
  els.btnSettings.addEventListener('click', () => {
    els.settingTheme.value = state.settings.theme;
    els.settingLanguage.value = state.settings.language;
    els.settingDefaultScope.value = state.settings.defaultScope;
    els.settingsModal.classList.remove('hidden');
  });

  const closeSettings = () => els.settingsModal.classList.add('hidden');
  els.btnCloseSettings.addEventListener('click', closeSettings);
  els.settingsModal.addEventListener('click', (e) => {
    if (e.target === els.settingsModal) closeSettings();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.settingsModal.classList.contains('hidden')) {
      closeSettings();
    }
  });

  els.settingTheme.addEventListener('change', async () => {
    state.settings = await saveSettings({ theme: els.settingTheme.value });
    applyTheme(state.settings.theme);
  });

  els.settingLanguage.addEventListener('change', async () => {
    state.settings = await saveSettings({ language: els.settingLanguage.value });
    applyTranslations();
  });

  els.settingDefaultScope.addEventListener('change', async () => {
    state.settings = await saveSettings({ defaultScope: els.settingDefaultScope.value });
  });

  els.btnExportBackup.addEventListener('click', () => {
    const payload = {
      app: 'SiteNotes',
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: state.notes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitenotes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t(state.lang, 'toastBackupExported'));
  });

  els.btnImportBackup.addEventListener('click', () => {
    els.fileImportBackup.click();
  });

  els.fileImportBackup.addEventListener('change', async () => {
    const file = els.fileImportBackup.files?.[0];
    els.fileImportBackup.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { notes: merged, importedCount } = validateAndMergeBackup(parsed, state.notes);
      state.notes = merged;
      await chrome.storage.local.set({ [STORAGE_KEYS.NOTES]: merged });
      updateAllTabCount();
      renderCurrentEditor();
      renderAllNotesList();
      showToast(t(state.lang, 'toastBackupImported', { count: importedCount }));
    } catch {
      showToast(t(state.lang, 'toastImportError'));
    }
  });

  // Tab & external storage listeners
  chrome.tabs.onActivated.addListener(() => {
    syncWithActiveTab();
  });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (tab.active && (changeInfo.url || changeInfo.title || changeInfo.status === 'complete')) {
      syncWithActiveTab();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEYS.NOTES] || state.isSavingLocal) return;
    state.notes = changes[STORAGE_KEYS.NOTES].newValue || {};
    updateAllTabCount();
    renderCurrentEditor();
    if (state.activeView === 'all') {
      renderAllNotesList();
    }
  });
}

async function init() {
  state.settings = await loadSettings();
  state.notes = await loadAllNotes();
  state.scope = state.settings.defaultScope || 'page';

  applyTheme(state.settings.theme);
  bindEvents();
  await syncWithActiveTab();
  applyTranslations();
}

init();
