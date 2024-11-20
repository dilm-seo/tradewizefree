import React, { useState } from 'react';
import { Gem, RefreshCw, Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';
import { useNews } from '../hooks/useNews';

interface CommodityAnalysis {
  symbol: string;
  name: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  price: string;
  trend: string;
  catalysts: string[];
  risks: string[];
}

const COMMODITIES_PROMPT = `Analysez le sentiment sur les matières premières principales.

Actualités:
{newsContext}

Répondez avec un JSON de cette structure exacte:
{
  "commodities": [
    {
      "symbol": "XAU" | "XAG" | "OIL" | "COPPER",
      "name": "Or" | "Argent" | "Pétrole" | "Cuivre",
      "sentiment": "bullish" | "bearish" | "neutral",
      "impact": "high" | "medium" | "low",
      "price": "description tendance prix",
      "trend": "description tendance technique",
      "catalysts": ["raison 1", "raison 2"],
      "risks": ["risque 1", "risque 2"]
    }
  ]
}

Règles strictes:
1. Maximum 4 matières premières
2. price et trend: max 50 caractères
3. catalysts et risks: 2-3 éléments courts
4. Texte en français uniquement
5. Pas de prix spécifiques`;

const MOCK_DATA: CommodityAnalysis[] = [
  {
    symbol: 'XAU',
    name: 'Or',
    sentiment: 'bullish',
    impact: 'high',
    price: 'Tendance haussière soutenue',
    trend: 'Au-dessus des moyennes mobiles',
    catalysts: ['Tensions géopolitiques', 'Inflation élevée'],
    risks: ['Hausse des taux', 'Dollar fort']
  },
  {
    symbol: 'OIL',
    name: 'Pétrole',
    sentiment: 'neutral',
    impact: 'medium',
    price: 'Consolidation dans une fourchette',
    trend: 'Entre support et résistance',
    catalysts: ['Demande stable', 'Production contrôlée'],
    risks: ['Ralentissement économique', 'Stocks élevés']
  }
];

export default function CommoditiesAnalysis() {
  const [commodities, setCommodities] = useState<CommodityAnalysis[]>(MOCK_DATA);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: news } = useNews();

  const validateCommodity = (item: any): item is CommodityAnalysis => {
    const validSymbols = ['XAU', 'XAG', 'OIL', 'COPPER'];
    const validNames = ['Or', 'Argent', 'Pétrole', 'Cuivre'];
    const validSentiments = ['bullish', 'bearish', 'neutral'];
    const validImpacts = ['high', 'medium', 'low'];
    
    return (
      validSymbols.includes(item.symbol) &&
      validNames.includes(item.name) &&
      validSentiments.includes(item.sentiment) &&
      validImpacts.includes(item.impact) &&
      typeof item.price === 'string' &&
      item.price.length <= 50 &&
      typeof item.trend === 'string' &&
      item.trend.length <= 50 &&
      Array.isArray(item.catalysts) &&
      item.catalysts.length >= 2 &&
      item.catalysts.length <= 3 &&
      Array.isArray(item.risks) &&
      item.risks.length >= 2 &&
      item.risks.length <= 3
    );
  };

  const handleAnalysis = async () => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      if (settings.demoMode) {
        setCommodities(MOCK_DATA);
        return;
      }

      if (!news || news.length === 0) {
        throw new Error("Aucune actualité disponible");
      }

      // Filtrer les actualités pertinentes
      const relevantNews = news
        .filter(item => {
          const content = (item.title + item.content).toLowerCase();
          return content.includes('gold') ||
                 content.includes('oil') ||
                 content.includes('silver') ||
                 content.includes('copper') ||
                 content.includes('commodity') ||
                 content.includes('commodities') ||
                 content.includes('metals') ||
                 content.includes('energy') ||
                 content.includes('or') ||
                 content.includes('pétrole') ||
                 content.includes('argent') ||
                 content.includes('cuivre');
        })
        .slice(0, 5)
        .map(item => item.translatedTitle || item.title);

      if (relevantNews.length === 0) {
        throw new Error("Aucune actualité sur les matières premières");
      }

      const result = await analyzeMarket(COMMODITIES_PROMPT, {
        newsContext: relevantNews.join('\n')
      });

      try {
        const parsed = JSON.parse(result);
        
        if (!parsed || !Array.isArray(parsed.commodities)) {
          throw new Error("Structure JSON invalide");
        }

        const validCommodities = parsed.commodities
          .filter(validateCommodity)
          .slice(0, 4);

        if (validCommodities.length === 0) {
          throw new Error("Aucune analyse valide disponible");
        }

        setCommodities(validCommodities);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error("Format de réponse invalide");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur s'est produite";
      console.error('Erreur analyse matières premières:', errorMessage);
      setError(errorMessage);
      if (!settings.demoMode) {
        setCommodities([]);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case 'bearish':
        return <TrendingDown className="h-5 w-5 text-red-400" />;
      default:
        return <Gem className="h-5 w-5 text-blue-400" />;
    }
  };

  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'bearish':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const getImpactStyle = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      default:
        return 'text-green-400';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Matières Premières</h2>
          <p className="text-sm text-gray-400">Analyse du sentiment et catalyseurs</p>
        </div>
        <div className="flex items-center space-x-4">
          <Gem className="h-6 w-6 text-purple-400" />
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
        {commodities.map((commodity) => (
          <div key={commodity.symbol} className="p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">{commodity.name}</h3>
                <p className="text-sm text-gray-400">{commodity.symbol}</p>
              </div>
              <div className="flex items-center space-x-2">
                {getSentimentIcon(commodity.sentiment)}
                <span className={`px-2 py-1 rounded text-xs font-medium ${getSentimentStyle(commodity.sentiment)}`}>
                  {commodity.sentiment === 'bullish' ? 'Haussier' :
                   commodity.sentiment === 'bearish' ? 'Baissier' : 'Neutre'}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Impact</div>
                  <div className={`font-medium ${getImpactStyle(commodity.impact)}`}>
                    {commodity.impact === 'high' ? 'Élevé' :
                     commodity.impact === 'medium' ? 'Moyen' : 'Faible'}
                  </div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Prix</div>
                  <div className="font-medium text-gray-200">{commodity.price}</div>
                </div>
              </div>

              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">Tendance</div>
                <div className="font-medium text-gray-200">{commodity.trend}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Catalyseurs</h4>
                  <ul className="space-y-1">
                    {commodity.catalysts.map((catalyst, index) => (
                      <li key={index} className="text-sm text-emerald-400">
                        • {catalyst}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Risques</h4>
                  <ul className="space-y-1">
                    {commodity.risks.map((risk, index) => (
                      <li key={index} className="text-sm text-red-400">
                        • {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}

        {commodities.length === 0 && !isAnalyzing && !error && (
          <div className="col-span-2 text-center py-8 text-gray-400">
            Cliquez sur Analyser pour obtenir les dernières informations
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