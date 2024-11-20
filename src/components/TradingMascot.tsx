import React, { useState } from 'react';
import { Bot, X, Loader2, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
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
  'decision',
  'hawkish',
  'dovish',
  'pivot',
  'intervention',
  'statement',
  'minutes',
  'forecast'
];

const SCALPING_PROMPT = `Analysez les actualités forex des 15 dernières minutes pour identifier une opportunité de scalping immédiate.

Actualités importantes:
{newsContext}

Règles d'analyse strictes:
1. Évaluez UNIQUEMENT les actualités des 15 dernières minutes
2. Identifiez les catalyseurs à fort impact immédiat:
   - Surprises dans les données économiques
   - Déclarations imprévues des banques centrales
   - Interventions de marché
   - Événements géopolitiques majeurs
   - Mouvements techniques significatifs

3. Critères de sélection:
   - Impact immédiat sur le prix (1-15min)
   - Réaction claire du marché
   - Volume de transactions élevé
   - Spread normal
   - Volatilité suffisante (>10 pips)

4. Pour l'opportunité identifiée:
   - Paire la plus réactive
   - Direction basée sur la réaction initiale
   - Volatilité attendue en pips
   - Durée estimée du mouvement
   - Risque principal à surveiller
   - Niveau de confiance basé sur:
     * Importance du catalyseur
     * Clarté de la réaction
     * Confirmation par plusieurs sources
     * Cohérence avec le sentiment général
   - Informations supplémentaires sur les actualités analysées (source, heure de publication, résumé de l'impact)
   - Implication des données sur les prochaines 24 heures

Répondez avec un JSON de cette structure exacte:
{
  "analysis": {
    "pair": "EUR/USD" | "GBP/USD" | "USD/JPY",
    "direction": "haussier" | "baissier",
    "volatility": "haute" | "moyenne" | "basse",
    "duration": "5min" | "10min" | "15min",
    "catalyst": "raison courte",
    "risk": "risque principal",
    "confidence": "haute" | "moyenne" | "basse",
    "volume": "élevé" | "normal" | "faible",
    "confirmation": ["signal 1", "signal 2"],
    "news_details": [{
      "source": "nom de la source",
      "time": "heure de publication",
      "summary": "résumé de l'impact"
    }],
    "next_24h_impact": "analyse des implications sur les prochaines 24 heures"
  }
}

IMPORTANT:
- Ne donnez JAMAIS de niveaux de prix
- Si aucune opportunité claire, répondez "no_opportunity"
- Privilégiez la qualité du signal sur la quantité
- Texte en français uniquement
- Maximum 2 signaux de confirmation`;

// Mettre à jour l'interface pour inclure les nouveaux champs
interface ScalpingAnalysis {
  pair: string;
  direction: 'haussier' | 'baissier';
  volatility: 'haute' | 'moyenne' | 'basse';
  duration: '5min' | '10min' | '15min';
  catalyst: string;
  risk: string;
  confidence: 'haute' | 'moyenne' | 'basse';
  volume: 'élevé' | 'normal' | 'faible';
  confirmation: string[];
  news_details: { source: string; time: string; summary: string }[];
  next_24h_impact: string;
}

export default function TradingMascot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: news } = useNews();

  const getRecentHighImpactNews = () => {
    if (!news) return null;

    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 15);

    return news
      .filter(item => {
        const newsDate = new Date(item.pubDate);
        const isRecent = newsDate > thirtyMinutesAgo;
        const isHighImpact = HIGH_IMPACT_KEYWORDS.some(keyword => 
          item.title.toLowerCase().includes(keyword) || 
          item.content.toLowerCase().includes(keyword)
        );
        return isRecent && isHighImpact;
      })
      .slice(0, 3);
  };

  const validateAnalysis = (data: any): data is ScalpingAnalysis => {
    const validPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY'];
    const validDirections = ['haussier', 'baissier'];
    const validLevels = ['haute', 'moyenne', 'basse'];
    const validDurations = ['5min', '10min', '15min'];
    const validVolumes = ['élevé', 'normal', 'faible'];
    
    return (
      validPairs.includes(data.pair) &&
      validDirections.includes(data.direction) &&
      validLevels.includes(data.volatility) &&
      validDurations.includes(data.duration) &&
      validLevels.includes(data.confidence) &&
      validVolumes.includes(data.volume) &&
      typeof data.catalyst === 'string' &&
      typeof data.risk === 'string' &&
      Array.isArray(data.confirmation) &&
      data.confirmation.every(signal => typeof signal === 'string') &&
      Array.isArray(data.news_details) &&
      data.news_details.every(news => typeof news.source === 'string' && typeof news.time === 'string' && typeof news.summary === 'string') &&
      typeof data.next_24h_impact === 'string' &&
      data.catalyst.length <= 50 &&
      data.risk.length <= 50
    );
  };

  const generateAnalysis = async () => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const recentNews = getRecentHighImpactNews();
      
      if (!recentNews || recentNews.length === 0) {
        setAnalysis(`
          <div class="space-y-4">
            <div class="flex items-center justify-center p-4 bg-gray-700/30 rounded-lg">
              <div class="text-center">
                <AlertTriangle class="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                <p class="text-gray-300">Aucune actualité à fort impact détectée</p>
                <p class="text-sm text-gray-400 mt-1">Attendez de meilleures opportunités</p>
              </div>
            </div>
          </div>
        `);
        return;
      }

      const newsContext = recentNews
        .map(item => `${new Date(item.pubDate).toLocaleTimeString('fr-FR')} - ${item.translatedTitle || item.title}`)
        .join('\n');

      const result = await analyzeMarket(SCALPING_PROMPT, { newsContext });

      try {
        const parsed = JSON.parse(result);

        if (parsed === "no_opportunity") {
          setAnalysis(`
            <div class="space-y-4">
              <div class="flex items-center justify-center p-4 bg-gray-700/30 rounded-lg">
                <div class="text-center">
                  <Activity class="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p class="text-gray-300">Pas d'opportunité de scalping</p>
                  <p class="text-sm text-gray-400 mt-1">Attendez le prochain catalyseur</p>
                </div>
              </div>
            </div>
          `);
          return;
        }

        if (!parsed.analysis || !validateAnalysis(parsed.analysis)) {
          throw new Error("Format d'analyse invalide");
        }

        const { pair, direction, volatility, duration, catalyst, risk, confidence, volume, confirmation, news_details, next_24h_impact } = parsed.analysis;
        
        setAnalysis(`
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <span class="text-xl font-bold text-blue-400">\${pair}</span>
                <div class="flex items-center space-x-2 px-3 py-1 rounded-full \${
                  direction === 'haussier' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }">
                  \${direction === 'haussier' 
                    ? '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 13l5-5 5 5"/></svg>'
                    : '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7l5 5 5-5"/></svg>'
                  }
                  <span class="font-medium">\${direction.toUpperCase()}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span class="px-3 py-1 rounded-full text-sm font-medium \${
                  confidence === 'haute' ? 'bg-emerald-500/20 text-emerald-400' :
                  confidence === 'moyenne' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }">
                  Confiance \${confidence}
                </span>
                <span class="px-3 py-1 rounded-full text-sm font-medium \${
                  volume === 'élevé' ? 'bg-purple-500/20 text-purple-400' :
                  volume === 'normal' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }">
                  Volume \${volume}
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 bg-gray-700/30 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Volatilité</div>
                <div class="font-medium \${
                  volatility === 'haute' ? 'text-red-400' :
                  volatility === 'moyenne' ? 'text-yellow-400' :
                  'text-green-400'
                }">\${volatility.toUpperCase()}</div>
              </div>
              <div class="p-3 bg-gray-700/30 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Durée</div>
                <div class="font-medium text-blue-400">\${duration}</div>
              </div>
            </div>

            <div class="space-y-3">
              <div class="p-3 bg-gray-700/30 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Catalyseur</div>
                <div class="font-medium text-gray-200">\${catalyst}</div>
              </div>
              <div class="p-3 bg-gray-700/30 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Risque principal</div>
                <div class="font-medium text-red-400">\${risk}</div>
              </div>
              <div class="p-3 bg-gray-700/30 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Signaux de confirmation</div>
                <div class="space-y-1">
                  \${confirmation.map(signal => `
                    <div class="text-sm text-emerald-400">• \${signal}</div>
                  `).join('')}
                </div>
              </div>
              <div class="p-3 bg-gray-700/30 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Détails des actualités</div>
                <div class="space-y-1">
                  \${news_details.map(news => `
                    <div class="text-sm text-gray-200">
                      <strong>Source:</strong> \${news.source} - <strong>Heure:</strong> \${news.time}
                      <div>\${news.summary}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="p-3 bg-gray-700/30 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Impact sur les prochaines 24 heures</div>
                <div class="font-medium text-gray-200">\${next_24h_impact}</div>
              </div>
            </div>

            <div class="text-xs text-gray-400 text-center">
              Analyse basée sur les actualités des 15 dernières minutes
            </div>
          </div>
        `);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error("Format de réponse invalide");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur s'est produite";
      console.error('Erreur d'analyse:', error);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          generateAnalysis();
        }}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 
                   rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 
                   transition-all duration-300 z-50 group"
      >
        <Bot className="w-6 h-6 text-white" />
        <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-white dark:bg-gray-800 
                      rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity
                      pointer-events-none whitespace-nowrap">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Assistant Scalping
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 
                        rounded-lg shadow-2xl w-full max-w-lg transform transition-all
                        border border-blue-500/20 backdrop-blur-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
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

              {error && (
                <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-blue-400">Analyse des actualités en cours...</p>
                  </div>
                ) : analysis ? (
                  <div 
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: analysis }}
                  />
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
