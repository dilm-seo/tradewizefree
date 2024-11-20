import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { BarChart2, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
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
  keyFactors: string[];
  timeframe: string;
}

const SENTIMENT_PROMPT = `Analysez le sentiment des paires forex suivantes: EUR/USD, GBP/USD, USD/JPY.

Marché actuel:
{marketContext}

Actualités récentes:
{newsContext}

Répondez UNIQUEMENT avec un objet JSON valide ayant cette structure exacte:
{
  "analysis": [
    {
      "pair": "EUR/USD",
      "sentiment": "bullish",
      "score": 75,
      "confidence": 80,
      "timeframe": "court terme",
      "keyFactors": ["facteur 1", "facteur 2"],
      "reasoning": "analyse courte"
    }
  ]
}

Règles strictes:
- sentiment doit être "bullish", "bearish" ou "neutral"
- score doit être entre -100 et 100
- confidence doit être entre 0 et 100
- keyFactors doit avoir 2-3 éléments
- reasoning doit être bref (max 100 caractères)`;

const SentimentAnalysis = forwardRef<{ handleAnalysis: () => Promise<void> }, {}>((_props, ref) => {
  const [results, setResults] = useState<SentimentResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: marketData } = useMarketData();
  const { data: news } = useNews();

  const validateResult = (result: any): result is SentimentResult => {
    return (
      typeof result.pair === 'string' &&
      ['bullish', 'bearish', 'neutral'].includes(result.sentiment) &&
      typeof result.score === 'number' &&
      result.score >= -100 &&
      result.score <= 100 &&
      typeof result.confidence === 'number' &&
      result.confidence >= 0 &&
      result.confidence <= 100 &&
      Array.isArray(result.keyFactors) &&
      result.keyFactors.length >= 2 &&
      result.keyFactors.length <= 3 &&
      typeof result.reasoning === 'string' &&
      typeof result.timeframe === 'string'
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
        .slice(0, 3)
        .map(data => 
          `${data.symbol}: ${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`
        )
        .join('\n');

      const newsContext = news
        .slice(0, 3)
        .map(item => `- ${item.translatedTitle || item.title}`)
        .join('\n');

      const response = await analyzeMarket(SENTIMENT_PROMPT, {
        marketContext,
        newsContext
      });

      try {
        const parsed = JSON.parse(response);
        
        if (!parsed || !Array.isArray(parsed.analysis)) {
          throw new Error("Format de réponse invalide: structure incorrecte");
        }

        const validResults = parsed.analysis.filter(validateResult);

        if (validResults.length === 0) {
          throw new Error("Aucun résultat valide dans l'analyse");
        }

        setResults(validResults);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error(parseError instanceof Error ? parseError.message : "Erreur de parsing JSON");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur inattendue s'est produite";
      console.error('Erreur analyse sentiment:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleAnalysis
  }));

  const getSentimentColor = (sentiment: string, opacity: boolean = false) => {
    const alpha = opacity ? '20' : '';
    switch (sentiment) {
      case 'bullish': return `bg-green-500/${alpha} text-green-400`;
      case 'bearish': return `bg-red-500/${alpha} text-red-400`;
      default: return `bg-blue-500/${alpha} text-blue-400`;
    }
  };

  const getSentimentWidth = (score: number) => {
    const percentage = ((score + 100) / 2);
    return `${Math.max(5, Math.min(95, percentage))}%`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
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
                     hover:bg-purple-600 transition disabled:opacity-50"
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
        {results.map((result) => (
          <div key={result.pair} className="p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-medium">{result.pair}</h3>
                <span className="text-sm text-gray-400">{result.timeframe}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(result.sentiment, true)}`}>
                  {result.sentiment.toUpperCase()}
                </span>
                <span className={`text-sm font-medium ${getConfidenceColor(result.confidence)}`}>
                  {result.confidence}%
                </span>
              </div>
            </div>

            <div className="mb-4">
              <div className="h-2 bg-gray-600 rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getSentimentColor(result.sentiment)}`}
                  style={{ width: getSentimentWidth(result.score) }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-400">
                <span>Bearish</span>
                <span>Score: {result.score}</span>
                <span>Bullish</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Facteurs clés:</h4>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                  {result.keyFactors.map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Analyse:</h4>
                <p className="text-sm text-gray-400">{result.reasoning}</p>
              </div>
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
});

SentimentAnalysis.displayName = 'SentimentAnalysis';
export default SentimentAnalysis;