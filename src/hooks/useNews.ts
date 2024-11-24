import { useQuery } from 'react-query';
import { fetchRSSFeeds } from '../services/rss';
import { useSettings } from '../context/SettingsContext';
import type { NewsItem } from '../types';

const MOCK_NEWS: NewsItem[] = [
  {
    title: "Patience, les infos se préparent une petite tasse de café avant d'arriver ! ☕",
    link: "#",
    pubDate: new Date().toISOString(),
    content: "Même les actualités ont besoin d’un boost de caféine pour être au top ! Prenez un moment, elles débarquent bientôt avec toute l'énergie nécessaire pour vos trades.",
    category: "Central Bank",
    author: "Jean Dupont"
  },
  {
    title: "Les marchés bougent vite, mais les infos prennent leur temps pour peaufiner leur stratégie ! 📈",
    link: "#",
    pubDate: new Date().toISOString(),
    content: "Les données arrivent bientôt, comme un bon trader qui analyse chaque mouvement avant d'agir. Restez attentif, les insights stratégiques sont en route pour éclairer vos décisions !",
    category: "Economic Data",
    author: "Marie Martin"
  }
];

export function useNews() {
  const { settings } = useSettings();

  return useQuery(
    'news',
    async () => {
      if (settings.demoMode) {
        return Promise.resolve(MOCK_NEWS);
      }
      
      try {
        const news = await fetchRSSFeeds();
        if (!news || news.length === 0) {
          console.warn('No live news available, using mock data');
          return MOCK_NEWS;
        }
        return news;
      } catch (error) {
        console.error('Error fetching news:', error);
        return MOCK_NEWS;
      }
    },
    {
      refetchInterval: settings.refreshInterval * 1000,
      retry: 3,
      retryDelay: 1000,
      staleTime: 30000,
      cacheTime: 60000,
      initialData: MOCK_NEWS,
      onError: (error) => {
        console.error('News fetch error:', error);
      }
    }
  );
}
