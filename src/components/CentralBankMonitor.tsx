import React, { useState } from 'react';
import { Building2, RefreshCw, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNews } from '../hooks/useNews';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';

const CENTRAL_BANK_PROMPT = `Analysez la position actuelle des banques centrales.
Format JSON strict:
{
  "banks": [{
    "name": "BCE|FED|BOE",
    "stance": "Hawkish|Dovish|Neutre",
    "summary": "1 phrase max",
    "trend": "up|down|stable"
  }]
}`;

interface BankAnalysis {
  name: string;
  stance: 'Hawkish' | 'Dovish' | 'Neutre';
  summary: string;
  trend: 'up' | 'down' | 'stable';
}

export default function CentralBankMonitor() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<BankAnalysis[]>([]);
  const { data: news } = useNews();
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();

  const handleAnalysis = async () => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const newsContext = news
        ?.filter(item => 
          item.title.toLowerCase().includes('bce') ||
          item.title.toLowerCase().includes('fed') ||
          item.title.toLowerCase().includes('boe') ||
          item.content.toLowerCase().includes('banque centrale')
        )
        .slice(0, 5)
        .map(item => `${item.translatedTitle || item.title}`)
        .join('\n');

      const result = await analyzeMarket(
        CENTRAL_BANK_PROMPT,
        { newsContext },
        'CENTRAL_BANK'
      );

      const parsed = JSON.parse(result);
      setAnalysis(parsed.banks);
    } catch (error) {
      console.error('Erreur analyse banques centrales:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5 text-green-400" />;
      case 'down':
        return <TrendingDown className="h-5 w-5 text-red-400" />;
      default:
        return <Minus className="h-5 w-5 text-blue-400" />;
    }
  };

  const getStanceColor = (stance: string) => {
    switch (stance) {
      case 'Hawkish':
        return 'bg-red-400/20 text-red-400';
      case 'Dovish':
        return 'bg-green-400/20 text-green-400';
      default:
        return 'bg-blue-400/20 text-blue-400';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Building2 className="h-6 w-6 text-yellow-400" />
          <h2 className="text-xl font-semibold">Banques Centrales</h2>
        </div>
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
              <span>Actualiser</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analysis.map((bank) => (
          <div
            key={bank.name}
            className="p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/40 transition duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">{bank.name}</h3>
              {getTrendIcon(bank.trend)}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-sm font-medium ${getStanceColor(bank.stance)}`}>
                  {bank.stance}
                </span>
              </div>
              
              <p className="text-sm text-gray-300">
                {bank.summary}
              </p>
            </div>
          </div>
        ))}

        {analysis.length === 0 && !isAnalyzing && (
          <div className="col-span-3 text-center py-8 text-gray-400">
            Cliquez sur Actualiser pour obtenir l'analyse des banques centrales
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