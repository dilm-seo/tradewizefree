import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { LineChart, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';
import { useNews } from '../hooks/useNews';

const FUNDAMENTAL_PROMPT = `Analysez ces actualités forex pour identifier les opportunités de trading immédiates:

{newsContext}

Répondez avec un HTML bref et structuré contenant:
1. Une liste de maximum 3 opportunités principales
2. Pour chaque opportunité:
   - La paire de devises concernée
   - La direction probable (haussier/baissier)
   - Le catalyseur principal
   - Le risque majeur

Utilisez ces classes Tailwind:
- Titres: text-lg font-medium text-blue-400 mb-2
- Sections: p-4 bg-gray-800/50 rounded-lg mb-4
- Listes: space-y-2
- Éléments: flex items-center justify-between

Soyez concis et direct.`;

const FundamentalAnalysis = forwardRef<{ handleGenerateAnalysis: () => Promise<void> }, {}>((_props, ref) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: news } = useNews();

  const handleGenerateAnalysis = async () => {
    if (!settings.apiKey || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      if (!news || news.length === 0) {
        throw new Error("Aucune actualité disponible");
      }

      // Sélectionner uniquement les actualités importantes
      const relevantNews = news
        .filter(item => {
          const content = (item.title + item.content).toLowerCase();
          return content.includes('bank') ||
                 content.includes('rate') ||
                 content.includes('inflation') ||
                 content.includes('gdp') ||
                 content.includes('employment') ||
                 content.includes('policy');
        })
        .slice(0, 3)
        .map(item => `${item.translatedTitle || item.title}`);

      if (relevantNews.length === 0) {
        throw new Error("Aucune actualité importante détectée");
      }

      const result = await analyzeMarket(FUNDAMENTAL_PROMPT, {
        newsContext: relevantNews.join('\n')
      });
      
      setAnalysis(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur s'est produite";
      console.error('Erreur analyse fondamentale:', err);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleGenerateAnalysis
  }));

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Analyse Fondamentale</h2>
          <p className="text-sm text-gray-400">Opportunités basées sur l'actualité</p>
        </div>
        <button
          onClick={handleGenerateAnalysis}
          disabled={isGenerating || !settings.apiKey}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {isGenerating ? (
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

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="p-4 bg-gray-700/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <LineChart className="h-5 w-5 text-blue-400 mt-1" />
          <div className="flex-1">
            {analysis ? (
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: analysis }}
              />
            ) : !error && (
              <p className="text-gray-400 text-center">
                Cliquez sur Analyser pour obtenir une analyse fondamentale
              </p>
            )}
          </div>
        </div>
      </div>

      {!settings.apiKey && (
        <p className="text-sm text-red-400 mt-2">
          Veuillez configurer votre clé API OpenAI dans les paramètres
        </p>
      )}
    </div>
  );
});

FundamentalAnalysis.displayName = 'FundamentalAnalysis';
export default FundamentalAnalysis;