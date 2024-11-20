import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { LineChart, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';
import { useNews } from '../hooks/useNews';

const FUNDAMENTAL_PROMPT = `Analysez ces actualités forex pour identifier les opportunités de trading.

Actualités:
{newsContext}

Répondez avec un JSON de cette structure exacte:
{
  "opportunities": [
    {
      "pair": "EUR/USD",
      "direction": "haussier",
      "catalyst": "BCE hawkish",
      "risk": "CPI US"
    }
  ]
}

Règles strictes:
1. Uniquement les paires EUR/USD, GBP/USD, USD/JPY
2. Direction: uniquement "haussier" ou "baissier"
3. Catalyst et risk: max 20 caractères
4. Maximum 3 opportunités
5. Texte en français uniquement
6. Pas de caractères spéciaux dans le JSON
7. Pas de retours à la ligne dans les valeurs
8. Pas d'espaces avant/après les valeurs

IMPORTANT: Répondez UNIQUEMENT avec un objet JSON valide, sans texte avant ou après.`;

interface Opportunity {
  pair: string;
  direction: 'haussier' | 'baissier';
  catalyst: string;
  risk: string;
}

const FundamentalAnalysis = forwardRef<{ handleGenerateAnalysis: () => Promise<void> }, {}>((_props, ref) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: news } = useNews();

  const validateOpportunity = (item: any): item is Opportunity => {
    const validPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY'];
    const validDirections = ['haussier', 'baissier'];
    
    return (
      validPairs.includes(item.pair) &&
      validDirections.includes(item.direction) &&
      typeof item.catalyst === 'string' &&
      item.catalyst.length <= 20 &&
      typeof item.risk === 'string' &&
      item.risk.length <= 20
    );
  };

  const generateHtml = (opportunities: Opportunity[]): string => {
    return `<div class="space-y-4">
      ${opportunities.map(item => `
        <div class="p-4 bg-gray-800/50 rounded-lg">
          <h3 class="text-lg font-medium text-blue-400 mb-2">${item.pair}</h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Direction</span>
              <span class="${item.direction === 'haussier' ? 'text-emerald-400' : 'text-red-400'}">
                ${item.direction === 'haussier' ? 'Haussier' : 'Baissier'}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Catalyseur</span>
              <span class="text-gray-200">${item.catalyst}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Risque</span>
              <span class="text-red-400">${item.risk}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
  };

  const handleGenerateAnalysis = async () => {
    if (!settings.apiKey || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      if (!news || news.length === 0) {
        throw new Error("Aucune actualité disponible");
      }

      // Filtrer les actualités pertinentes
      const relevantNews = news
        .filter(item => {
          const content = (item.title + item.content).toLowerCase();
          return content.includes('eur') ||
                 content.includes('usd') ||
                 content.includes('gbp') ||
                 content.includes('jpy') ||
                 content.includes('bank') ||
                 content.includes('rate') ||
                 content.includes('inflation');
        })
        .slice(0, 3)
        .map(item => item.translatedTitle || item.title);

      if (relevantNews.length === 0) {
        throw new Error("Aucune actualité importante détectée");
      }

      const result = await analyzeMarket(FUNDAMENTAL_PROMPT, {
        newsContext: relevantNews.join('\n')
      });

      try {
        // Extraire uniquement la partie JSON valide
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Aucun JSON valide trouvé dans la réponse");
        }

        const parsed = JSON.parse(jsonMatch[0]);
        
        if (!parsed || !Array.isArray(parsed.opportunities)) {
          throw new Error("Structure JSON invalide");
        }

        const validOpportunities = parsed.opportunities
          .filter(validateOpportunity)
          .slice(0, 3);

        if (validOpportunities.length === 0) {
          throw new Error("Aucune opportunité valide détectée");
        }

        const html = generateHtml(validOpportunities);
        setAnalysis(html);
      } catch (parseError) {
        console.error('Parse error:', parseError, '\nResponse:', result);
        throw new Error("Format de réponse invalide");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur s'est produite";
      console.error('Erreur analyse fondamentale:', errorMessage);
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