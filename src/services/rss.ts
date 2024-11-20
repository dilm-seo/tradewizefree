import type { NewsItem } from '../types';

const RSS_FEEDS = [
  // ForexLive feeds
  'https://www.forexlive.com/feed',
  'https://www.forexlive.com/feed/news',
  'https://www.forexlive.com/feed/technicalanalysis',
  'https://www.forexlive.com/feed/forexorders',
  'https://www.forexlive.com/feed/centralbank',
  // Reuters feeds
  'https://www.reutersagency.com/feed/?best-topics=foreign-exchange&post_type=best',
  // Bloomberg feeds (via RSS Bridge)
  'https://rsshub.app/bloomberg/topics/markets',
  // FXStreet alternative feeds
  'https://www.fxstreet.com/rss/news',
  'https://www.fxstreet.com/rss/analysis/central-banks',
  // Investing.com feeds
  'https://www.investing.com/rss/forex.rss',
  'https://www.investing.com/rss/news.rss',
  'https://www.investing.com/rss/market_overview.rss',
  // Additional forex feeds
  'https://www.dailyfx.com/feeds/market-news',
  'https://www.financemagnates.com/feed/',
  'https://www.actionforex.com/feed/'
];

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://proxy.cors.sh/',
  'https://api.codetabs.com/v1/proxy?quest='
];

async function fetchWithFallback(url: string): Promise<Response> {
  let lastError;
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
          'User-Agent': 'Mozilla/5.0 (compatible; ForexNewsBot/1.0)'
        }
      });
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.warn(`Failed with proxy ${proxy}:`, error);
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error('All proxies failed');
}

function stripCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
}

function stripHTML(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

function truncateText(text: string, maxLength: number): string {
  const stripped = stripHTML(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength).trim() + '...';
}

function parseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function removeDuplicates(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.title.toLowerCase()}-${item.content.substring(0, 50).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function parseFeed(text: string, feedUrl: string): Promise<NewsItem[]> {
  const parser = new DOMParser();
  const items: NewsItem[] = [];

  try {
    const doc = parser.parseFromString(text, 'text/xml');
    
    if (doc.querySelector('parsererror')) {
      console.warn(`Parse error for ${feedUrl}`);
      return [];
    }

    const entries = Array.from(doc.querySelectorAll('item, entry'));

    for (const entry of entries) {
      try {
        const title = stripCDATA(
          entry.querySelector('title')?.textContent ||
          entry.querySelector('dc\\:title')?.textContent || ''
        );

        const link = 
          entry.querySelector('link')?.textContent ||
          entry.querySelector('guid')?.textContent || '';

        const pubDate = parseDate(
          entry.querySelector('pubDate')?.textContent ||
          entry.querySelector('dc\\:date')?.textContent ||
          entry.querySelector('published')?.textContent || ''
        );

        const content = stripCDATA(
          entry.querySelector('description')?.textContent ||
          entry.querySelector('content\\:encoded')?.textContent ||
          entry.querySelector('content')?.textContent || ''
        );

        const category = stripCDATA(
          entry.querySelector('category')?.textContent ||
          entry.querySelector('dc\\:subject')?.textContent || 'News'
        );

        const author = stripCDATA(
          entry.querySelector('author')?.textContent ||
          entry.querySelector('dc\\:creator')?.textContent || ''
        );

        if (title && link) {
          items.push({
            title: stripHTML(title),
            link,
            pubDate,
            content: truncateText(content, 200),
            category,
            author
          });
        }
      } catch (e) {
        console.warn(`Error parsing entry in ${feedUrl}:`, e);
      }
    }
  } catch (e) {
    console.error(`Error parsing feed ${feedUrl}:`, e);
  }

  return items;
}

export async function fetchRSSFeeds(): Promise<NewsItem[]> {
  try {
    const feedPromises = RSS_FEEDS.map(async feed => {
      try {
        const response = await fetchWithFallback(feed);
        const text = await response.text();
        return await parseFeed(text, feed);
      } catch (error) {
        console.warn(`Failed to fetch ${feed}:`, error);
        return [];
      }
    });

    const results = await Promise.allSettled(feedPromises);
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<NewsItem[]> => result.status === 'fulfilled')
      .map(result => result.value)
      .flat();

    if (successfulResults.length === 0) {
      throw new Error('No news items found from any feed');
    }

    return removeDuplicates(successfulResults)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 20);

  } catch (error) {
    console.error('Error in fetchRSSFeeds:', error);
    throw error;
  }
}