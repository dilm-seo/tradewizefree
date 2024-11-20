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

const VOLATILITY_PROMPT = `En tant qu'analyste de volatilité forex, analysez les actualités récentes et les données de marché pour évaluer la volatilité attendue.

Données de marché actuelles :
{marketContext}

Actualités récentes :
{newsContext}

Instructions d'analyse :
1. Pour chaque paire majeure, évaluez :
   - Le niveau de volatilité actuel
   - Les déclencheurs potentiels de volatilité
   - La direction probable des mouvements
   - L'amplitude attendue des variations

2. Classez la volatilité :
   - "high": Mouvements importants attendus (>0.5%)
   - "medium": Mouvements modérés (0.2-0.5%)
   - "low": Mouvements faibles (<0.2%)

Format de réponse JSON :
{
  "analysis": [{
    "pair": string,
    "volatility": "high" | "medium" | "low",
    "score": number (0-100),
    "triggers": string[],
    "prediction": string
  }]
}`;

const VolatilityAnalysis = forwardRef((props, ref) => {
  const [volatilityData, setVolatilityData] = useState<VolatilityData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: marketData } = useMarketData();
  const { data: news } = useNews();

  const handleAnalysis = async () => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      if (!marketData || !news) {
        throw new Error("Données de marché ou actualités non disponibles");
      }

      const marketContext = marketData
        .map(data => 
          `${data.symbol}: ${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`
        )
        .join('\n');

      const newsContext = news
        .slice(0, 10)
        .map(item => `- ${item.translatedTitle || item.title}`)
        .join('\n');

      const response = await analyzeMarket(VOLATILITY_PROMPT, {
        marketContext,
        newsContext
      });

      const parsed = JSON.parse(response);
      setVolatilityData(parsed.analysis);
    } catch (err) {
      console.error('Erreur analyse volatilité:', err);
      setError("Erreur lors de l'analyse de la volatilité");
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
            Évaluation de la volatilité attendue par paire
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Activity className="h-6 w-6 text-red-400" />
          <button
            onClick={handleAnalysis}
            disabled={isAnalyzing || !settings.apiKey}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg 
                     hover:bg-red-600 transition disabled:opacity-50 disabled:hover:bg-red-500"
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
                {data.volatility.toUpperCase()}
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
                <span>Faible</span>
                <span>Score: {data.score}%</span>
                <span>Élevée</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Déclencheurs potentiels:</h4>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                  {data.triggers.map((trigger, index) => (
                    <li key={index}>{trigger}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Prédiction:</h4>
                <p className="text-sm text-gray-400">{data.prediction}</p>
              </div>
            </div>
          </div>
        ))}

        {volatilityData.length === 0 && !isAnalyzing && (
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