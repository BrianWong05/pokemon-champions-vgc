/**
 * Service to fetch team data from various paste sites
 */

const PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
];

export interface PasteFetchResult {
  text: string;
  source: 'pokepaste' | 'victoryroad' | 'unknown';
}

export const fetchTeamFromUrl = async (url: string): Promise<PasteFetchResult> => {
  const normalizedUrl = url.trim();

  if (!normalizedUrl.includes('pokepast.es') && 
      !normalizedUrl.includes('victoryroadvgc.com') && 
      !normalizedUrl.includes('vrpastes.com')) {
    throw new Error('Unsupported paste source.');
  }

  let lastError: any = null;

  for (const proxy of PROXIES) {
    try {
      if (normalizedUrl.includes('pokepast.es')) {
        return await fetchFromPokepaste(normalizedUrl, proxy);
      } else {
        return await fetchFromVictoryRoad(normalizedUrl, proxy);
      }
    } catch (err: any) {
      console.warn(`Proxy ${proxy} failed:`, err.message);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('Failed to fetch team data from all available proxies.');
};

const fetchFromPokepaste = async (url: string, proxy: string): Promise<PasteFetchResult> => {
  // Ensure we use the /raw endpoint
  let rawUrl = url;
  if (!url.endsWith('/raw')) {
    rawUrl = url.replace(/\/$/, '') + '/raw';
  }

  const response = await fetch(`${proxy}${encodeURIComponent(rawUrl)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from Pokepaste (Status: ${response.status})`);
  }

  const text = await response.text();
  if (!text || text.length < 10 || text.trim().startsWith('<!DOCTYPE')) {
    throw new Error('Received invalid response from Pokepaste.');
  }

  return { text: text.trim(), source: 'pokepaste' };
};

const fetchFromVictoryRoad = async (url: string, proxy: string): Promise<PasteFetchResult> => {
  let targetUrl = url;
  
  // vrpastes.com handling
  if (url.includes('vrpastes.com')) {
    // Standardize URL to use /paste/ if missing, but vrpastes often redirects or works without it
    // The key is to try /raw for the team text
    if (!url.endsWith('/raw')) {
      targetUrl = url.replace(/\/$/, '') + '/raw';
    }
  }

  const response = await fetch(`${proxy}${encodeURIComponent(targetUrl)}`);
  
  if (response.ok) {
    const content = await response.text();
    // Strict check for raw showdown text: should not start with HTML tag
    if (!content.trim().startsWith('<') && (content.includes('@') || content.includes('Ability:'))) {
      return { text: content.trim(), source: 'victoryroad' };
    }
    
    // If we got HTML from a /raw URL, it might be a redirect to the main page
    // Fall through to extraction if it's HTML
    if (content.trim().startsWith('<')) {
      return extractFromHtml(content);
    }
  }

  // If /raw failed or returned something weird, try the original URL for HTML extraction
  if (targetUrl !== url) {
    const retryResponse = await fetch(`${proxy}${encodeURIComponent(url)}`);
    if (retryResponse.ok) {
      return extractFromHtml(await retryResponse.text());
    }
  }

  throw new Error('Failed to fetch team data from the provided URL.');
};

const extractFromHtml = (html: string): PasteFetchResult => {
  // Common patterns for showdown text in HTML
  const patterns = [
    /<code[^>]*>([\s\S]*?)<\/code>/i,
    /<pre[^>]*>([\s\S]*?)<\/pre>/i,
    /<div[^>]*class="[^"]*paste-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /id="copy-text"[^>]*>([\s\S]*?)<\/textarea>/i, // Common hidden textarea for copying
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Unescape and clean
      let text = match[1]
        .replace(/<[^>]*>?/gm, '') // Remove nested tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ');

      text = text.trim();

      // Final check: does it actually look like Showdown?
      if (text.includes('@') || text.includes('Ability:')) {
        return { text, source: 'victoryroad' };
      }
    }
  }

  throw new Error('Could not find team data on the page. Please copy and paste manually.');
};
