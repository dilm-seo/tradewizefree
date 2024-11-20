import type { NewsItem } from '../types';

const RSS_FEEDS = [
  'https://www.forexlive.com/feed',
  'https://www.forexlive.com/feed/news',
  'https://www.forexlive.com/feed/technicalanalysis',
  'https://www.forexlive.com/feed/forexorders',
  'https://www.forexlive.com/feed/centralbank',
  'https://www.forexlive.com/feed/education',
  'https://www.forexlive.com/feed/cryptocurrency'
];

const CORS_PROXY = 'https://corsproxy.io/?';

function stripCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
}

function stripHTML(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
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

export async function fetchRSSFeeds(): Promise<NewsItem[]> {
  try {
    const responses = await Promise.all(
      RSS_FEEDS.map(feed => 
        fetch(`${CORS_PROXY}${encodeURIComponent(feed)}`)
          .catch(() => null)
      )
    );

    const validResponses = responses.filter((res): res is Response => res !== null);
    const texts = await Promise.all(
      validResponses.map(res => res.text().catch(() => ''))
    );
    
    const parser = new DOMParser();
    const newsItems: NewsItem[] = [];
    
    texts.forEach(text => {
      if (!text) return;
      
      try {
        const doc = parser.parseFromString(text, 'text/xml');
        const items = doc.querySelectorAll('item');
        
        items.forEach(item => {
          const title = stripCDATA(item.querySelector('title')?.textContent || '');
          const link = item.querySelector('link')?.textContent || '';
          const pubDate = item.querySelector('pubDate')?.textContent || '';
          const description = stripHTML(stripCDATA(item.querySelector('description')?.textContent || ''));
          const category = stripCDATA(item.querySelector('category')?.textContent || 'News');
          const creator = stripCDATA(item.querySelector('dc\\:creator')?.textContent || '');
          
          if (title && link) {
            const content = truncateText(description, 200);

            newsItems.push({
              title,
              link,
              pubDate,
              content,
              category,
              author: creator
            });
          }
        });
      } catch (e) {
        console.warn('Error parsing RSS feed:', e);
      }
    });
    
    return removeDuplicates(newsItems)
      .filter(item => item.title && item.link)
      .sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      )
      .slice(0, 10); // Limit to 10 most recent items
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    return [];
  }
}