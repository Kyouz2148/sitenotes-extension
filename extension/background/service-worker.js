import { parseTabContext } from '../shared/url-utils.js';
import {
  STORAGE_KEYS,
  appendSelectionToNote,
  isNoteEmpty,
  loadAllNotes,
} from '../shared/storage.js';

const MENU_SAVE_PAGE = 'sitenotes-save-page';
const MENU_SAVE_DOMAIN = 'sitenotes-save-domain';

async function setupExtension() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    console.warn('SiteNotes: setPanelBehavior failed', err);
  }

  try {
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: MENU_SAVE_PAGE,
      title: chrome.i18n.getMessage('contextMenuSaveSelection') || 'Save selection to SiteNotes',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: MENU_SAVE_DOMAIN,
      title:
        chrome.i18n.getMessage('contextMenuSaveSelectionDomain') ||
        'Save selection to Domain Note',
      contexts: ['selection'],
    });
  } catch (err) {
    console.warn('SiteNotes: contextMenus setup failed', err);
  }
}

async function updateBadgeForTab(tab) {
  if (!tab?.id) return;
  try {
    const ctx = parseTabContext(tab.url, tab.title);
    if (!ctx.isWebPage) {
      await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
      return;
    }

    const notes = await loadAllNotes();
    const pageNote = notes[ctx.pageId];
    const domainNote = notes[ctx.domainId];

    const hasPage = !isNoteEmpty(pageNote);
    const hasDomain = !isNoteEmpty(domainNote);

    if (!hasPage && !hasDomain) {
      await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
      return;
    }

    const pendingTasks =
      (pageNote?.checklist?.filter((i) => !i.done).length || 0) +
      (domainNote?.checklist?.filter((i) => !i.done).length || 0);

    const badgeText = pendingTasks > 0 ? String(Math.min(pendingTasks, 99)) : '•';
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#4F46E5' });
    await chrome.action.setBadgeTextColor({ tabId: tab.id, color: '#FFFFFF' });
    await chrome.action.setBadgeText({ tabId: tab.id, text: badgeText });
  } catch {
    // Tab may have closed before badge update completed
  }
}

async function refreshActiveTabBadge() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab) {
      await updateBadgeForTab(activeTab);
    }
  } catch {
    // Ignore transient query errors
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setupExtension();
  refreshActiveTabBadge();
});

chrome.runtime.onStartup.addListener(() => {
  setupExtension();
  refreshActiveTabBadge();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-side-panel') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.windowId !== undefined) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
    } catch (err) {
      console.warn('SiteNotes: failed to open side panel via command', err);
    }
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_SAVE_PAGE && info.menuItemId !== MENU_SAVE_DOMAIN) {
    return;
  }
  const selectedText = info.selectionText || '';
  if (!selectedText.trim()) return;

  const ctx = parseTabContext(info.pageUrl || tab?.url, tab?.title);
  const useDomain = info.menuItemId === MENU_SAVE_DOMAIN;

  let targetMeta;
  if (!ctx.isWebPage) {
    targetMeta = {
      id: ctx.globalId,
      scope: 'global',
      url: '',
      domain: '',
      title: 'Scratchpad',
    };
  } else if (useDomain) {
    targetMeta = {
      id: ctx.domainId,
      scope: 'domain',
      url: `https://${ctx.domain}`,
      domain: ctx.domain,
      title: ctx.domain,
    };
  } else {
    targetMeta = {
      id: ctx.pageId,
      scope: 'page',
      url: ctx.normalizedUrl,
      domain: ctx.domain,
      title: ctx.title,
    };
  }

  await appendSelectionToNote(targetMeta, selectedText);

  if (tab?.windowId !== undefined) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch {
      // Side panel may already be open or unavailable in this window
    }
  }
  if (tab) {
    await updateBadgeForTab(tab);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await updateBadgeForTab(tab);
  } catch {
    // Ignore closed tabs
  }
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.status === 'complete' || changeInfo.url)) {
    updateBadgeForTab(tab);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEYS.NOTES]) {
    refreshActiveTabBadge();
  }
});
