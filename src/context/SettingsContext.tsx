import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Settings, SettingsContextType } from '../types';
import CostToast from '../components/CostToast';

// Prompts optimisés pour réduire les tokens
const defaultPrompts = {
  fundamentalAnalysis: `Analysez les actualités forex pour identifier les opportunités immédiates.

Actualités :
{newsContext}

Instructions :
1. Identifiez les actualités à fort impact
2. Évaluez l'impact sur les devises majeures
3. Indiquez les opportunités de trading

Format : HTML bref avec classes Tailwind CSS.`,

  tradingSignals: `Générez des signaux de trading basés sur l'actualité.

Données :
{marketContext}
{newsContext}

Format : JSON {
  signals: [{
    symbol: string,
    direction: "buy"|"sell",
    analysis: string
  }]
}`,

  aiInsights: `Analysez l'impact des actualités sur le forex.

Données :
{marketContext}
{newsContext}
Question : {question}

Format : Réponse courte et précise.`,

  mascot: `Analysez les actualités forex à fort impact.

Données :
{newsContext}
{calendarContext}

Format : 2-3 phrases maximum.`
};

const defaultSettings: Settings = {
  apiKey: '',
  refreshInterval: 60,
  demoMode: true,
  apiCosts: 0,
  dailyLimit: 5,
  lastResetDate: new Date().toISOString().split('T')[0],
  theme: 'dark',
  prompts: defaultPrompts
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

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
      
      // Si le coût API a changé, afficher le toast
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

export default SettingsContext;