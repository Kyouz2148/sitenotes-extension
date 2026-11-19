const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  'yclid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'si',
  'spm',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'vero_conv',
  'vero_id',
  'ref_src',
]);

const NON_WEB_PROTOCOLS = new Set([
  'chrome:',
  'chrome-extension:',
  'about:',
  'edge:',
  'brave:',
  'opera:',
  'vivaldi:',
  'devtools:',
  'view-source:',
  'data:',
  'javascript:',
]);

export const GLOBAL_NOTE_ID = 'global:scratchpad';

/**
 * Normalizes a hostname by removing a leading `www.` prefix.
 * @param {string} hostname
 * @returns {string}
 */
export function normalizeDomain(hostname) {
  if (!hostname || typeof hostname !== 'string') return '';
  return hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * Removes common tracking query parameters and hash fragments from a URL,
 * preserving meaningful query parameters and paths.
 * @param {string} rawUrl
 * @returns {string}
 */
export function normalizePageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl);
    if (NON_WEB_PROTOCOLS.has(parsed.protocol)) {
      return '';
    }

    // Remove tracking query parameters
    const keysToDelete = [];
    for (const key of parsed.searchParams.keys()) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      parsed.searchParams.delete(key);
    }

    // Sort remaining search params for consistent keys
    parsed.searchParams.sort();
    parsed.hash = '';

    // Normalize trailing slash on non-root paths
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // Normalize hostname lowercase and strip www.
    parsed.hostname = normalizeDomain(parsed.hostname);

    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Extracts structured page, domain, and global context metadata from a browser tab.
 * @param {string | undefined} rawUrl
 * @param {string | undefined} rawTitle
 */
export function parseTabContext(rawUrl, rawTitle = '') {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isWebPage: false,
      rawUrl: '',
      normalizedUrl: '',
      domain: '',
      title: rawTitle || '',
      pageId: '',
      domainId: '',
      globalId: GLOBAL_NOTE_ID,
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const isFile = parsed.protocol === 'file:';
    const isWeb =
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:' ||
      isFile;

    if (!isWeb || NON_WEB_PROTOCOLS.has(parsed.protocol)) {
      return {
        isWebPage: false,
        rawUrl,
        normalizedUrl: '',
        domain: '',
        title: rawTitle || '',
        pageId: '',
        domainId: '',
        globalId: GLOBAL_NOTE_ID,
      };
    }

    const normalizedUrl = normalizePageUrl(rawUrl);
    const domain = isFile ? 'local-files' : normalizeDomain(parsed.hostname);

    return {
      isWebPage: Boolean(normalizedUrl),
      rawUrl,
      normalizedUrl,
      domain,
      title: (rawTitle || domain || normalizedUrl).trim(),
      pageId: normalizedUrl ? `page:${normalizedUrl}` : '',
      domainId: domain ? `domain:${domain}` : '',
      globalId: GLOBAL_NOTE_ID,
    };
  } catch {
    return {
      isWebPage: false,
      rawUrl,
      normalizedUrl: '',
      domain: '',
      title: rawTitle || '',
      pageId: '',
      domainId: '',
      globalId: GLOBAL_NOTE_ID,
    };
  }
}

/**
 * Formats a compact display path from a normalized URL (e.g. "/docs/getting-started").
 * @param {string} normalizedUrl
 * @returns {string}
 */
export function formatCompactPath(normalizedUrl) {
  if (!normalizedUrl) return '';
  try {
    const parsed = new URL(normalizedUrl);
    const pathAndQuery = `${parsed.pathname}${parsed.search}`;
    return pathAndQuery === '/' ? '/' : pathAndQuery;
  } catch {
    return normalizedUrl;
  }
}
