import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Building2, RefreshCw, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { useNews } from '../hooks/useNews';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';

const CENTRAL_BANK_PROMPT = `En tant qu'analyste spécialisé dans les banques centrales, analysez les actualités suivantes pour déterminer la position actuelle des principales banques centrales.

Actualités à analyser :
{newsContext}

Instructions d'analyse :
1. Pour chaque banque centrale (BCE, FED, BOE) :
   - Identifiez la stance actuelle (hawkish/dovish/neutre)
   - Évaluez les changements de ton récents
   - Déterminez les points clés de leur communication
   - Anticipez les prochaines actions probables

2. Fournissez une analyse structurée en HTML avec :
   - Un résumé par banque centrale
   - Une évaluation de la stance monétaire
   - Les implications pour les devises concernées

Format : Réponse en HTML avec classes Tailwind CSS.`;

interface CentralBank {
  name: string;
  fullName: string;
  latestNews: string;
  pubDate: string;
  stance: 'Hawkish' | 'Dovish' | 'Neutre';
  newsCount: number;
  color: string;
  icon: React.ReactNode;
}

const CentralBankMonitor = forwardRef((props, ref) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: news } = useNews();
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();

  const centralBanks = React.useMemo(() => {
    if (!news) return [];

    const bankKeywords = {
      'BCE': {
        keywords: ['bce', 'lagarde', 'banque centrale européenne'],
        fullName: 'Banque Centrale Européenne',
        color: 'blue'
      },
      'FED': {
        keywords: ['fed', 'powell', 'federal reserve'],
        fullName: 'Federal Reserve',
        color: 'emerald'
      },
      'BOE': {
        keywords: ['boe', 'bailey', 'bank of england'],
        fullName: 'Bank of England',
        color: 'purple'
      }
    };

    return Object.entries(bankKeywords).map(([bank, info]) => {
      const relevantNews = news.filter(item => 
        info.keywords.some(keyword => 
          item.title.toLowerCase().includes(keyword) || 
          item.content.toLowerCase().includes(keyword)
        )
      );

      if (relevantNews.length === 0) return null;

      const latestNews = relevantNews[0];
      const content = latestNews.content.toLowerCase();
      
      let stance: 'Hawkish' | 'Dovish' | 'Neutre' = 'Neutre';
      let icon = <Minus className={`h-5 w-5 text-${info.color}-400`} />;

      if (content.includes('hawkish') || content.includes('restrictif') || content.includes('hausse des taux')) {
        stance = 'Hawkish';
        icon = <TrendingUp className={`h-5 w-5 text-${info.color}-400`} />;
      } else if (content.includes('dovish') || content.includes('accommodant') || content.includes('baisse des taux')) {
        stance = 'Dovish';
        icon = <TrendingDown className={`h-5 w-5 text-${info.color}-400`} />;
      }

      return {
        name: bank,
        fullName: info.fullName,
        latestNews: latestNews.translatedTitle || latestNews.title,
        pubDate: latestNews.pubDate,
        stance,
        newsCount: relevantNews.length,
        color: info.color,
        icon
      };
    }).filter(Boolean) as CentralBank[];
  }, [news]);

  const handleAnalysis = async () => {
    if (!settings.apiKey || isAnalyzing || !news) return;

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const centralBankNews = news.filter(item => {
        const content = (item.title + item.content).toLowerCase();
        return content.includes('bce') || 
               content.includes('fed') || 
               content.includes('lagarde') || 
               content.includes('powell') ||
               content.includes('banque centrale') ||
               content.includes('federal reserve') ||
               content.includes('bank of england') ||
               content.includes('boe');
      });

      const newsContext = centralBankNews
        .slice(0, 5)
        .map(item => `- ${item.translatedTitle || item.title}\n${item.translatedContent || item.content}`)
        .join('\n\n');

      const result = await analyzeMarket(CENTRAL_BANK_PROMPT, {
        newsContext
      });

      setAnalysis(result);
    } catch (error) {
      console.error('Erreur analyse banques centrales:', error);
      setError("Une erreur s'est produite lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleAnalysis
  }));

  const getStanceStyle = (stance: string, color: string) => {
    return {
      Hawkish: `bg-${color}-400/20 text-${color}-400`,
      Dovish: `bg-${color}-400/20 text-${color}-400`,
      Neutre: `bg-${color}-400/20 text-${color}-400`
    }[stance];
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Actualités Banques Centrales</h2>
          <p className="text-sm text-gray-400 mt-1">
            Analyse IA des communications des banques centrales
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Building2 className="h-6 w-6 text-yellow-400" />
          <button
            onClick={handleAnalysis}
            disabled={isAnalyzing || !settings.apiKey}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg 
                     hover:bg-yellow-600 transition disabled:opacity-50 disabled:hover:bg-yellow-500"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analyse...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                <span>Analyser</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-400 text-sm mb-4">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {centralBanks.map((bank) => (
          <div key={bank.name} className="p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">{bank.name}</h3>
                <p className="text-sm text-gray-400">{bank.fullName}</p>
              </div>
              <div className="flex items-center space-x-2">
                {bank.icon}
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStanceStyle(bank.stance, bank.color)}`}>
                  {bank.stance}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-300 line-clamp-2">{bank.latestNews}</p>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-gray-400">
                    {new Date(bank.pubDate).toLocaleString()}
                  </span>
                  <span className={`text-${bank.color}-400`}>
                    {bank.newsCount} actualité{bank.newsCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {analysis && (
        <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Analyse Détaillée</h3>
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: analysis }}
          />
        </div>
      )}

      {isAnalyzing && (
        <div className="text-center py-8 text-gray-400">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
            <p>Analyse des communications des banques centrales en cours...</p>
          </div>
        </div>
      )}

      {!settings.apiKey && (
        <p className="text-sm text-red-400 mt-4">
          Veuillez configurer votre clé API OpenAI dans les paramètres
        </p>
      )}
    </div>
  );
});

CentralBankMonitor.displayName = 'CentralBankMonitor';
export default CentralBankMonitor;