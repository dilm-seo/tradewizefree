import { useQuery } from 'react-query';
import { fetchRSSFeeds } from '../services/rss';
import { useSettings } from '../context/SettingsContext';

export function useNews() {
  const { settings } = useSettings();

  return useQuery(
    'news',
    fetchRSSFeeds,
    {
      refetchInterval: settings.refreshInterval * 1000,
      enabled: !settings.demoMode
    }
  );
}