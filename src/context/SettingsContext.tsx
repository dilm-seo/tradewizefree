import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Settings, SettingsContextType } from '../types';
import CostToast from '../components/CostToast';

const defaultPrompts = {
  fundamentalAnalysis: `Analysez ces actualités forex pour identifier les opportunités de trading immédiates:

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

Soyez concis et direct.`,

  tradingSignals: `Analysez le marché forex actuel.

Données de marché:
{marketContext}

Actualités:
{newsContext}

Répondez avec un JSON valide:
{
  "signals": [
    {
      "pair": string,
      "direction": "buy" | "sell",
      "timing": string,
      "volatility": "high" | "medium" | "low",
      "duration": string,
      "analysis": string
    }
  ]
}`,

  aiInsights: `Analysez cette question sur le forex:
{question}

Contexte marché:
{marketContext}

Actualités:
{newsContext}

Répondez de manière concise et directe.`,

  mascot: `Analysez brièvement les actualités forex:
{newsContext}

Répondez en 2-3 phrases maximum.
Focalisez sur l'opportunité la plus importante.`
};

const defaultSettings: Settings = {
  apiKey: '',
  refreshInterval: 60,
  demoMode: true,
  apiCosts: 0,
  dailyLimit: 5,
  lastResetDate: new Date().toISOString().split('T')[0],
  theme: 'dark',
  gptModel: 'gpt-3.5-turbo',
  prompts: defaultPrompts
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Export the hook
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return {
        ...parsed,
        prompts: {
          ...defaultPrompts,
          ...parsed.prompts
        }
      };
    }
    return defaultSettings;
  });

  const [showCostToast, setShowCostToast] = useState(false);
  const [lastCost, setLastCost] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (settings.lastResetDate !== today) {
      setSettings(prev => ({
        ...prev,
        apiCosts: 0,
        lastResetDate: today
      }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
    
    const htmlElement = document.documentElement;
    if (settings.theme === 'dark') {
      htmlElement.classList.add('dark');
      htmlElement.classList.remove('light');
    } else {
      htmlElement.classList.add('light');
      htmlElement.classList.remove('dark');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.prompts) {
        updated.prompts = {
          ...defaultPrompts,
          ...newSettings.prompts
        };
      }
      
      if (newSettings.apiCosts && newSettings.apiCosts !== prev.apiCosts) {
        const costDiff = newSettings.apiCosts - prev.apiCosts;
        if (costDiff > 0) {
          setLastCost(costDiff);
          setShowCostToast(true);
          setTimeout(() => setShowCostToast(false), 3000);
        }
      }
      
      return updated;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
      <CostToast cost={lastCost} isVisible={showCostToast} />
    </SettingsContext.Provider>
  );
}