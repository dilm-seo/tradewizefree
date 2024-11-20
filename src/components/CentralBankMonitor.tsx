import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Building2, RefreshCw, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { useNews } from '../hooks/useNews';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';

const BANK_INFO = {
  'BCE': {
    fullName: 'Banque Centrale Européenne',
    keywords: ['bce', 'lagarde', 'banque centrale européenne']
  },
  'FED': {
    fullName: 'Federal Reserve',
    keywords: ['fed', 'powell', 'federal reserve']
  },
  'BOE': {
    fullName: 'Bank of England',
    keywords: ['boe', 'bailey', 'bank of england']
  }
} as const;

interface CentralBank {
  name: keyof typeof BANK_INFO;
  fullName: string;
  stance: 'Hawkish' | 'Dovish' | 'Neutre';
  lastUpdate: string;
  nextMeeting: string;
  keyMessage: string;
  impact: 'high' | 'medium' | 'low';
}

const CENTRAL_BANK_PROMPT = `Analysez les actualités des banques centrales.

Actualités:
{newsContext}

Répondez avec un JSON de cette structure exacte:
{
  "banks": [
    {
      "name": "BCE" | "FED" | "BOE",
      "stance": "Hawkish" | "Dovish" | "Neutre",
      "lastUpdate": "YYYY-MM-DD",
      "nextMeeting": "YYYY-MM-DD",
      "keyMessage": "Message principal",
      "impact": "high" | "medium" | "low"
    }
  ]
}

Règles strictes:
1. name: uniquement BCE, FED, ou BOE
2. stance: uniquement Hawkish, Dovish, ou Neutre
3. dates: format YYYY-MM-DD ou "Non annoncé"
4. keyMessage: max 100 caractères
5. impact: uniquement high, medium, low
6. Texte en français uniquement`;

const MOCK_BANKS: CentralBank[] = [
  {
    name: 'BCE',
    fullName: 'Banque Centrale Européenne',
    stance: 'Hawkish',
    lastUpdate: new Date().toISOString().split('T')[0],
    nextMeeting: 'Non annoncé',
    keyMessage: 'Maintien des taux élevés pour lutter contre l\'inflation',
    impact: 'high'
  },
  {
    name: 'FED',
    fullName: 'Federal Reserve',
    stance: 'Neutre',
    lastUpdate: new Date().toISOString().split('T')[0],
    nextMeeting: 'Non annoncé',
    keyMessage: 'Données dépendantes pour les prochaines décisions',
    impact: 'medium'
  },
  {
    name: 'BOE',
    fullName: 'Bank of England',
    stance: 'Dovish',
    lastUpdate: new Date().toISOString().split('T')[0],
    nextMeeting: 'Non annoncé',
    keyMessage: 'Signes de ralentissement économique',
    impact: 'medium'
  }
];

const CentralBankMonitor = forwardRef<{ handleAnalysis: () => Promise<void> }, {}>((_props, ref) => {
  const [banks, setBanks] = useState<CentralBank[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: news } = useNews();

  const validateBank = (bank: any): bank is Omit<CentralBank, 'fullName'> => {
    const validNames = ['BCE', 'FED', 'BOE'];
    const validStances = ['Hawkish', 'Dovish', 'Neutre'];
    const validImpacts = ['high', 'medium', 'low'];
    
    const isValidDate = (dateStr: string) => {
      if (dateStr === 'Non annoncé') return true;
      const date = new Date(dateStr);
      return date instanceof Date && !isNaN(date.getTime());
    };

    return (
      validNames.includes(bank.name) &&
      validStances.includes(bank.stance) &&
      isValidDate(bank.lastUpdate) &&
      isValidDate(bank.nextMeeting) &&
      validImpacts.includes(bank.impact) &&
      typeof bank.keyMessage === 'string' &&
      bank.keyMessage.length <= 100
    );
  };

  const handleAnalysis = async () => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      if (settings.demoMode) {
        setBanks(MOCK_BANKS);
        return;
      }

      if (!news || news.length === 0) {
        throw new Error("Aucune actualité disponible");
      }

      // Filtrer les actualités par banque centrale
      const bankNews = Object.entries(BANK_INFO).reduce((acc, [bank, info]) => {
        const relevantNews = news.filter(item => {
          const content = (item.title + ' ' + item.content).toLowerCase();
          return info.keywords.some(keyword => content.includes(keyword));
        });
        acc[bank] = relevantNews;
        return acc;
      }, {} as Record<string, typeof news>);

      // Vérifier si nous avons des actualités
      const hasNews = Object.values(bankNews).some(news => news && news.length > 0);
      if (!hasNews) {
        throw new Error("Aucune actualité des banques centrales disponible");
      }

      // Préparer le contexte
      const newsContext = Object.entries(bankNews)
        .map(([bank, news]) => {
          if (!news?.length) return '';
          return `${bank}:\n${news
            .slice(0, 3)
            .map(item => `- ${item.translatedTitle || item.title}`)
            .join('\n')}`;
        })
        .filter(Boolean)
        .join('\n\n');

      const result = await analyzeMarket(CENTRAL_BANK_PROMPT, {
        newsContext
      });

      try {
        const parsed = JSON.parse(result);
        
        if (!parsed || !Array.isArray(parsed.banks)) {
          throw new Error("Structure JSON invalide");
        }

        const validBanks = parsed.banks
          .filter(validateBank)
          .map(bank => ({
            ...bank,
            fullName: BANK_INFO[bank.name as keyof typeof BANK_INFO].fullName
          }));

        if (validBanks.length === 0) {
          throw new Error("Aucune analyse valide disponible");
        }

        setBanks(validBanks);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error("Format de réponse invalide");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur s'est produite";
      console.error('Erreur analyse banques centrales:', errorMessage);
      setError(errorMessage);
      setBanks([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleAnalysis
  }));

  const getStanceIcon = (stance: string) => {
    switch (stance) {
      case 'Hawkish':
        return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case 'Dovish':
        return <TrendingDown className="h-5 w-5 text-red-400" />;
      default:
        return <Minus className="h-5 w-5 text-blue-400" />;
    }
  };

  const getStanceStyle = (stance: string) => {
    switch (stance) {
      case 'Hawkish':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'Dovish':
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
          <h2 className="text-xl font-semibold">Banques Centrales</h2>
          <p className="text-sm text-gray-400">Analyse des communications officielles</p>
        </div>
        <div className="flex items-center space-x-4">
          <Building2 className="h-6 w-6 text-yellow-400" />
          <button
            onClick={handleAnalysis}
            disabled={isAnalyzing || !settings.apiKey}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg 
                     hover:bg-yellow-600 transition disabled:opacity-50"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {banks.map((bank) => (
          <div key={bank.name} className="p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">{bank.name}</h3>
                <p className="text-sm text-gray-400">{bank.fullName}</p>
              </div>
              <div className="flex items-center space-x-2">
                {getStanceIcon(bank.stance)}
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStanceStyle(bank.stance)}`}>
                  {bank.stance}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-300 line-clamp-2">{bank.keyMessage}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Impact</span>
                    <span className={getImpactStyle(bank.impact)}>
                      {bank.impact === 'high' ? 'Élevé' : bank.impact === 'medium' ? 'Moyen' : 'Faible'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Mise à jour</span>
                    <span className="text-gray-300">{bank.lastUpdate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Prochaine réunion</span>
                    <span className="text-gray-300">{bank.nextMeeting}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {banks.length === 0 && !isAnalyzing && !error && (
          <div className="col-span-3 text-center py-8 text-gray-400">
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
});

CentralBankMonitor.displayName = 'CentralBankMonitor';
export default CentralBankMonitor;