import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Settings, SettingsContextType } from '../types';
import CostToast from '../components/CostToast';

const defaultPrompts = {
  fundamentalAnalysis: `Analyze the following forex news to identify immediate trading opportunities:

{newsContext}

Respond with concise and structured HTML containing:
1. A list of up to 3 key opportunities.
2. For each opportunity:
   - The relevant currency pair.
   - The likely direction (bullish/bearish).
   - The main catalyst.
   - The primary risk.

Recommended Tailwind CSS classes:
- Titles: `text-lg font-medium text-blue-400 mb-2`.
- Sections: `p-4 bg-gray-800/50 rounded-lg mb-4`.
- Lists: `space-y-2`.
- Items: `flex items-center justify-between`.

Be clear and direct in your response.
Write in french`,

  tradingSignals: `Analyze the current forex market and identify trading signals.

Market data:
{marketContext}

News:
{newsContext}

Respond with a structured and valid JSON:
{
  "signals": [
    {
      "pair": "string",
      "direction": "buy" | "sell",
      "timing": "string",
      "volatility": "high" | "medium" | "low",
      "duration": "string",
      "analysis": "string"
    }
  ]
}
Write in french`,

  aiInsights: `Answer the following question about forex:

{question}

Market context:
{marketContext}

News:
{newsContext}

Provide a concise and relevant response, focusing on key information.
Write in french`,

  mascot: `Briefly analyze the following forex news:

{newsContext}

Respond in 2–3 sentences, highlighting the most important opportunity identified.
Write in french`
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
