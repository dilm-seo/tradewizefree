import React, { useState } from 'react';
import { LineChart, RefreshCw, Loader2 } from 'lucide-react';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';
import { useNews } from '../hooks/useNews';

export default function FundamentalAnalysis() {
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
      // S'assurer que nous avons des news à analyser
      if (!news || news.length === 0) {
        throw new Error("Aucune actualité disponible pour l'analyse");
      }

      // Formater le contexte des news
      const newsContext = news
        .map(item => 
          `- ${item.translatedTitle || item.title}\n  Source: ${item.author || 'ForexLive'}\n  Date: ${new Date(item.pubDate).toLocaleDateString()}\n  Contenu: ${item.translatedContent || item.content}`
        )
        .join('\n\n');

      const result = await analyzeMarket(settings.prompts.fundamentalAnalysis, {
        newsContext
      });
      
      if (result.includes("erreur") || result.includes("Erreur")) {
        throw new Error(result);
      }
      
      setAnalysis(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur s'est produite lors de l'analyse.";
      console.error('Erreur d\'analyse:', err);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Analyse Fondamentale</h2>
        <button
          onClick={handleGenerateAnalysis}
          disabled={isGenerating || !settings.apiKey}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:hover:bg-blue-500"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Génération...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5" />
              <span>Générer</span>
            </>
          )}
        </button>
      </div>

      <div className="p-4 bg-gray-700/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <LineChart className="h-5 w-5 text-blue-400 mt-1" />
          <div className="flex-1">
            {analysis ? (
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: analysis }}
              />
            ) : error ? (
              <p className="text-red-400">{error}</p>
            ) : (
              <p className="text-gray-400 text-center">
                Cliquez sur Générer pour obtenir une analyse fondamentale
              </p>
            )}
          </div>
        </div>
      </div>

      {!settings.apiKey && (
        <p className="text-sm text-red-400 mt-2">
          Veuillez configurer votre clé API OpenAI dans les paramètres pour générer une analyse
        </p>
      )}
    </div>
  );
}