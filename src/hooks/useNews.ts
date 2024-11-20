import { useQuery } from 'react-query';
import { fetchRSSFeeds } from '../services/rss';
import { useSettings } from '../context/SettingsContext';
import type { NewsItem } from '../types';

const MOCK_NEWS: NewsItem[] = [
  {
    title: "La BCE maintient ses taux directeurs",
    link: "#",
    pubDate: new Date().toISOString(),
    content: "La Banque centrale européenne a décidé de maintenir ses taux directeurs inchangés lors de sa dernière réunion de politique monétaire, conformément aux attentes du marché. Cette décision reflète la volonté de la BCE de maintenir une politique monétaire restrictive pour lutter contre l'inflation.",
    category: "Central Bank",
    author: "Jean Dupont"
  },
  {
    title: "L'inflation américaine plus élevée que prévu",
    link: "#",
    pubDate: new Date().toISOString(),
    content: "Les derniers chiffres de l'inflation aux États-Unis sont ressortis au-dessus des attentes, ravivant les inquiétudes concernant la persistance des pressions inflationnistes. Cette surprise pourrait influencer les prochaines décisions de la Réserve fédérale.",
    category: "Economic Data",
    author: "Marie Martin"
  },
  {
    title: "Le dollar se renforce face à l'euro",
    link: "#",
    pubDate: new Date().toISOString(),
    content: "Le dollar américain poursuit sa hausse face à l'euro, soutenu par des données économiques solides et les perspectives de maintien de taux d'intérêt élevés par la Fed. Les traders surveillent attentivement les prochaines données économiques.",
    category: "Market Analysis",
    author: "Pierre Martin"
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
      retryDelay: 2000,
      staleTime: 30000,
      cacheTime: 60000,
      initialData: MOCK_NEWS,
      onError: (error) => {
        console.error('News fetch error:', error);
      }
    }
  );
}