import React, { useState } from 'react';
import { Clock, Tag, User, Languages } from 'lucide-react';
import { format } from 'date-fns';
import { useNews } from '../hooks/useNews';
import { useSettings } from '../context/SettingsContext';
import { translateText } from '../services/translate';
import type { NewsItem } from '../types';

interface NewsItemWithTranslation extends NewsItem {
  translatedTitle?: string;
  translatedContent?: string;
  isTranslating?: boolean;
}

const mockNews: NewsItemWithTranslation[] = [
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

export default function NewsFeed() {
  const { settings } = useSettings();
  const { data: news, isLoading } = useNews();
  const [newsItems, setNewsItems] = useState<NewsItemWithTranslation[]>([]);

  React.useEffect(() => {
    if (settings.demoMode) {
      setNewsItems(mockNews);
    } else if (news) {
      setNewsItems(news.map(item => ({
        ...item,
        isTranslating: false
      })));
    }
  }, [news, settings.demoMode]);

  const handleTranslate = async (index: number) => {
    const item = newsItems[index];
    if (item.translatedTitle && item.translatedContent) return;

    setNewsItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isTranslating: true } : item
    ));

    try {
      const [translatedTitle, translatedContent] = await Promise.all([
        translateText(item.title),
        translateText(item.content)
      ]);

      setNewsItems(prev => prev.map((item, i) => 
        i === index ? {
          ...item,
          translatedTitle,
          translatedContent,
          isTranslating: false
        } : item
      ));
    } catch (error) {
      console.error('Translation error:', error);
      setNewsItems(prev => prev.map((item, i) => 
        i === index ? { ...item, isTranslating: false } : item
      ));
    }
  };

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
        {newsItems.map((item, index) => (
          <article key={index} className="p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition">
            <div className="flex items-start justify-between gap-4">
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex-1">
                <h3 className="font-medium mb-2 hover:text-emerald-400 transition">
                  {item.translatedTitle || item.title}
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  {item.translatedContent || item.content}
                </p>
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
              <button
                onClick={() => handleTranslate(index)}
                disabled={item.isTranslating || (!!item.translatedTitle && !!item.translatedContent)}
                className={`p-2 rounded-lg transition-all flex-shrink-0
                  ${item.translatedTitle && item.translatedContent
                    ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Languages className={`h-5 w-5 ${item.isTranslating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}