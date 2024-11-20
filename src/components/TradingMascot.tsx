import React, { useState } from 'react';
import { Bot, X, Loader2 } from 'lucide-react';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';
import { useNews } from '../hooks/useNews';

const HIGH_IMPACT_KEYWORDS = [
  'breaking',
  'urgent',
  'surprise',
  'unexpected',
  'shock',
  'major',
  'critical',
  'significant',
  'important',
  'key',
  'central bank',
  'fed',
  'bce',
  'boe',
  'inflation',
  'gdp',
  'employment',
  'rate',
  'decision'
];

const SCALPING_PROMPT = `En tant que scalper forex focalisé sur les news à fort impact, analysez uniquement l'actualité la plus importante pour identifier une opportunité immédiate.

Actualité à fort impact :
{newsContext}

Instructions :
1. Évaluez UNIQUEMENT l'impact immédiat (0-30 minutes)
2. Identifiez la/les devise(s) impactée(s)
3. Indiquez la direction probable du mouvement
4. Estimez la volatilité attendue (haute/moyenne/basse)

IMPORTANT :
- Ne donnez JAMAIS de niveaux de prix
- Restez bref et concis (2-3 phrases maximum)
- Si aucune actualité à fort impact, recommandez d'attendre

Format : Réponse courte et directe, focalisée sur l'opportunité immédiate.`;

export default function TradingMascot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: news } = useNews();

  const getHighImpactNews = () => {
    if (!news) return null;

    // Filtrer les news des dernières 2 heures
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    return news
      .filter(item => {
        const newsDate = new Date(item.pubDate);
        const isRecent = newsDate > twoHoursAgo;
        const isHighImpact = HIGH_IMPACT_KEYWORDS.some(keyword => 
          item.title.toLowerCase().includes(keyword) || 
          item.content.toLowerCase().includes(keyword)
        );
        return isRecent && isHighImpact;
      })
      .slice(0, 3); // Prendre les 3 news les plus récentes à fort impact
  };

  const generateAnalysis = async () => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const highImpactNews = getHighImpactNews();
      
      if (!highImpactNews || highImpactNews.length === 0) {
        setAnalysis("Aucune actualité à fort impact détectée. Attendez de meilleures opportunités.");
        return;
      }

      const newsContext = highImpactNews
        .map(item => `${item.translatedTitle || item.title}\n${item.translatedContent || item.content}`)
        .join('\n\n');

      const result = await analyzeMarket(SCALPING_PROMPT, { newsContext });
      setAnalysis(result);
    } catch (error) {
      console.error('Erreur d\'analyse:', error);
      setAnalysis("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleAnalysis = () => {
    if (!isOpen) {
      generateAnalysis();
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mascot Button */}
      <button
        onClick={toggleAnalysis}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 
                   rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 
                   transition-all duration-300 z-50 group animate-bounce hover:animate-none"
      >
        <Bot className="w-6 h-6 text-white" />
        <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-white dark:bg-gray-800 
                      rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity
                      pointer-events-none whitespace-nowrap">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Assistant Trading
          </p>
        </div>
      </button>

      {/* Analysis Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 
                        rounded-lg shadow-2xl w-full max-w-lg transform transition-all
                        border border-blue-500/20 backdrop-blur-md
                        animate-in slide-in-from-bottom duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Bot className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Analyse Scalping</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-blue-400">Analyse des actualités en cours...</p>
                  </div>
                ) : analysis ? (
                  <div className="prose prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: analysis }} />
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    Une erreur est survenue. Veuillez réessayer.
                  </p>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={generateAnalysis}
                    disabled={isAnalyzing || !settings.apiKey}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg 
                             hover:bg-blue-600 transition disabled:opacity-50
                             disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyse en cours...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" />
                        <span>Nouvelle analyse</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}