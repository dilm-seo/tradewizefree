import React, { useEffect, useState, useCallback } from 'react';
import { Clock, Tag, User } from 'lucide-react';
import { format } from 'date-fns';
import { useNews } from '../hooks/useNews';
import { useSettings } from '../context/SettingsContext';
import { translateText } from '../services/translate';
import type { NewsItem } from '../types';

const mockNews: NewsItem[] = [
  {
    title: "La BCE maintient ses taux directeurs",
    link: "#",
    pubDate: new Date().toISOString(),
    content: "La Banque centrale européenne a décidé de maintenir ses taux...",
    category: "Central Bank",
    author: "Jean Dupont"
  },
  {
    title: "L'inflation américaine plus élevée que prévu",
    link: "#",
    pubDate: new Date().toISOString(),
    content: "Les derniers chiffres de l'inflation aux États-Unis...",
    category: "News",
    author: "Marie Martin"
  }
];

interface TranslatedNewsItem extends NewsItem {
  translatedTitle: string;
  translatedContent: string;
}

export default function NewsFeed() {
  const { settings } = useSettings();
  const { data: news, isLoading } = useNews();
  const [translatedNews, setTranslatedNews] = useState<TranslatedNewsItem[]>([]);

  const translateNewsItems = useCallback(async () => {
    if (settings.demoMode) {
      setTranslatedNews(mockNews.map(item => ({
        ...item,
        translatedTitle: item.title,
        translatedContent: item.content
      })));
      return;
    }

    if (!news?.length) return;

    // Remove duplicates based on title
    const uniqueNews = news.filter((item, index, self) =>
      index === self.findIndex((t) => t.title === item.title)
    );

    const translated = await Promise.all(
      uniqueNews.map(async (item) => ({
        ...item,
        content: item.content.length > 200 ? item.content.substring(0, 200) + '...' : item.content,
        translatedTitle: await translateText(item.title),
        translatedContent: await translateText(
          item.content.length > 200 ? item.content.substring(0, 200) + '...' : item.content
        )
      }))
    );

    setTranslatedNews(translated);
  }, [news, settings.demoMode]);

  useEffect(() => {
    translateNewsItems();
  }, [translateNewsItems]);

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Actualités Forex</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-gray-700/30 rounded-lg">
              <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-600 rounded w-full mb-3"></div>
              <div className="h-3 bg-gray-600 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <h2 className="text-xl font-semibold mb-4">Actualités Forex</h2>
      <div className="space-y-4">
        {translatedNews.map((item, index) => (
          <article key={index} className="p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition">
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
              <h3 className="font-medium mb-2 hover:text-emerald-400 transition">
                {item.translatedTitle}
              </h3>
              <p className="text-sm text-gray-400 mb-3">{item.translatedContent}</p>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(item.pubDate), 'HH:mm dd/MM')}</span>
                  </div>
                  {item.author && (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{item.author}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <span>{item.category}</span>
                </div>
              </div>
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
