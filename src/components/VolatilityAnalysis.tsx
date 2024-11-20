import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Activity, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';
import { useNews } from '../hooks/useNews';
import { useMarketData } from '../hooks/useMarketData';

interface VolatilityData {
  pair: string;
  volatility: 'high' | 'medium' | 'low';
  score: number;
  triggers: string[];
  prediction: string;
}

const VOLATILITY_PROMPT = `Analysez la volatilité intraday des paires forex majeures.

Marché actuel:
{marketContext}

Actualités:
{newsContext}

Répondez UNIQUEMENT avec un JSON valide de cette structure:
{
  "analysis": [
    {
      "pair": "EUR/USD",
      "volatility": "high" | "medium" | "low",
      "score": number (0-100),
      "triggers": [
        "raison courte 1",
        "raison courte 2"
      ],
      "prediction": "prédiction courte sur les prochaines heures"
    }
  ]
}

Règles strictes:
- Uniquement les paires EUR/USD, GBP/USD, USD/JPY
- Analyse de la volatilité sur les prochaines 4-8 heures
- volatility basée sur les mouvements attendus:
  * high: >50 pips
  * medium: 20-50 pips
  * low: <20 pips
- score: 0 (très calme) à 100 (très volatile)
- triggers: 2-3 catalyseurs immédiats
- prediction: max 100 caractères
- Texte en français uniquement`;

const VolatilityAnalysis = forwardRef<{ handleAnalysis: () => Promise<void> }, {}>((_props, ref) => {
  const [volatilityData, setVolatilityData] = useState<VolatilityData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: marketData } = useMarketData();
  const { data: news } = useNews();

  const validateVolatilityData = (data: any): data is VolatilityData => {
    const validPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY'];
    const validVolatility = ['high', 'medium', 'low'];
    
    return (
      validPairs.includes(data.pair) &&
      validVolatility.includes(data.volatility) &&
      typeof data.score === 'number' &&
      data.score >= 0 &&
      data.score <= 100 &&
      Array.isArray(data.triggers) &&
      data.triggers.length >= 2 &&
      data.triggers.length <= 3 &&
      data.triggers.every((t: any) => typeof t === 'string' && t.length <= 50) &&
      typeof data.prediction === 'string' &&
      data.prediction.length <= 100
    );
  };

  const handleAnalysis = async () => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      if (!marketData || !news) {
        throw new Error("Données de marché ou actualités non disponibles");
      }

      const marketContext = marketData
        .filter(data => ['EUR/USD', 'GBP/USD', 'USD/JPY'].includes(data.symbol))
        .map(data => 
          `${data.symbol}: ${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`
        )
        .join('\n');

      const relevantNews = news
        .filter(item => {
          const content = (item.title + item.content).toLowerCase();
          return content.includes('eur') ||
                 content.includes('usd') ||
                 content.includes('gbp') ||
                 content.includes('jpy') ||
                 content.includes('volatility') ||
                 content.includes('volatilité') ||
                 content.includes('movement') ||
                 content.includes('mouvement');
        })
        .slice(0, 3)
        .map(item => item.translatedTitle || item.title);

      if (relevantNews.length === 0) {
        throw new Error("Aucune actualité pertinente disponible");
      }

      const result = await analyzeMarket(VOLATILITY_PROMPT, {
        marketContext,
        newsContext: relevantNews.join('\n')
      });

      try {
        const parsed = JSON.parse(result);
        
        if (!parsed || !Array.isArray(parsed.analysis)) {
          throw new Error("Structure JSON invalide");
        }

        const validData = parsed.analysis.filter(validateVolatilityData);

        if (validData.length === 0) {
          throw new Error("Aucune analyse valide disponible");
        }

        setVolatilityData(validData);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error("Format de réponse invalide");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur s'est produite";
      console.error('Erreur analyse volatilité:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleAnalysis
  }));

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const getVolatilityBg = (volatility: string) => {
    switch (volatility) {
      case 'high': return 'bg-red-400/20';
      case 'medium': return 'bg-yellow-400/20';
      default: return 'bg-green-400/20';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Analyse de Volatilité</h2>
          <p className="text-sm text-gray-400 mt-1">
            Évaluation de la volatilité sur 4-8 heures
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Activity className="h-6 w-6 text-red-400" />
          <button
            onClick={handleAnalysis}
            disabled={isAnalyzing || !settings.apiKey}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg 
                     hover:bg-red-600 transition disabled:opacity-50"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {volatilityData.map((data) => (
          <div key={data.pair} className="p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">{data.pair}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVolatilityBg(data.volatility)} ${getVolatilityColor(data.volatility)}`}>
                {data.volatility === 'high' ? 'HAUTE' :
                 data.volatility === 'medium' ? 'MOYENNE' : 'BASSE'}
              </span>
            </div>

            <div className="mb-4">
              <div className="h-2 bg-gray-600 rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getVolatilityBg(data.volatility)}`}
                  style={{ width: `${data.score}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-400">
                <span>Calme</span>
                <span>{data.score}%</span>
                <span>Volatile</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Catalyseurs:</h4>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                  {data.triggers.map((trigger, index) => (
                    <li key={index}>{trigger}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Prévision:</h4>
                <p className="text-sm text-gray-400">{data.prediction}</p>
              </div>
            </div>
          </div>
        ))}

        {volatilityData.length === 0 && !isAnalyzing && !error && (
          <div className="col-span-2 text-center py-8 text-gray-400">
            Cliquez sur Analyser pour obtenir une analyse de la volatilité
          </div>
        )}
      </div>

      {!settings.apiKey && (
        <p className="text-sm text-red-400 mt-4">
          Veuillez configurer votre clé API OpenAI dans les paramètres
        </p>
      )}
    </div>
  );
});

VolatilityAnalysis.displayName = 'VolatilityAnalysis';
export default VolatilityAnalysis;