import React, { useState } from 'react';
import { BarChart2, RefreshCw, Loader2 } from 'lucide-react';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';
import { useMarketData } from '../hooks/useMarketData';
import { useNews } from '../hooks/useNews';

interface SentimentResult {
  pair: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number;
  confidence: number;
  reasoning: string;
}

const SENTIMENT_PROMPT = `En tant qu'analyste de sentiment de marché forex, analysez les actualités récentes pour déterminer le sentiment actuel sur chaque paire de devises.

Données de marché actuelles :
{marketContext}

Actualités récentes :
{newsContext}

Pour chaque paire de devises :
1. Évaluez uniquement les actualités qui impactent directement la paire
2. Déterminez le sentiment global (bullish/bearish/neutral)
3. Attribuez un score de -100 à +100
4. Évaluez le niveau de confiance (0-100%)
5. Fournissez une brève justification

Format de réponse JSON :
{
  "analysis": [{
    "pair": "string",
    "sentiment": "bullish" | "bearish" | "neutral",
    "score": number (-100 à +100),
    "confidence": number (0-100),
    "reasoning": "string (brève explication)"
  }]
}`;

export default function SentimentAnalysis() {
  const [results, setResults] = useState<SentimentResult[]>([]);
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

      const response = await analyzeMarket(SENTIMENT_PROMPT, {
        marketContext,
        newsContext
      });

      const parsed = JSON.parse(response);
      setResults(parsed.analysis);
    } catch (err) {
      console.error('Erreur analyse sentiment:', err);
      setError("Erreur lors de l'analyse du sentiment");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentColor = (sentiment: string, opacity: boolean = false) => {
    const alpha = opacity ? '20' : '';
    switch (sentiment) {
      case 'bullish': return `bg-green-400/${alpha} text-green-400`;
      case 'bearish': return `bg-red-400/${alpha} text-red-400`;
      default: return `bg-blue-400/${alpha} text-blue-400`;
    }
  };

  const getSentimentWidth = (score: number) => {
    // Convertit le score (-100 à +100) en pourcentage (0 à 100)
    const percentage = ((score + 100) / 2);
    return `${Math.max(5, Math.min(95, percentage))}%`;
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Analyse du Sentiment</h2>
          <p className="text-sm text-gray-400 mt-1">
            Analyse IA du sentiment de marché
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <BarChart2 className="h-6 w-6 text-purple-400" />
          <button
            onClick={handleAnalysis}
            disabled={isAnalyzing || !settings.apiKey}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg 
                     hover:bg-purple-600 transition disabled:opacity-50 disabled:hover:bg-purple-500"
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
        <div className="text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((result) => (
          <div key={result.pair} className="p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-medium">{result.pair}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getSentimentColor(result.sentiment, true)}`}>
                  {result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1)}
                </span>
              </div>
              <span className="text-sm text-gray-400">
                Confiance: {result.confidence}%
              </span>
            </div>
            
            <div className="h-2 bg-gray-600 rounded-full mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getSentimentColor(result.sentiment)}`}
                style={{ width: getSentimentWidth(result.score) }}
              />
            </div>
            
            <div className="mt-3 text-sm text-gray-300">
              {result.reasoning}
            </div>
          </div>
        ))}

        {results.length === 0 && !isAnalyzing && (
          <div className="col-span-2 text-center py-8 text-gray-400">
            Cliquez sur Analyser pour obtenir une analyse du sentiment
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
}