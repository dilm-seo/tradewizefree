import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Settings, SettingsContextType } from '../types';

const defaultPrompts = {
  fundamentalAnalysis: `En tant que day trader forex focalisé sur les news, analysez les actualités pour identifier les opportunités de trading immédiates.

Contexte des actualités :
{newsContext}

Instructions d'analyse :
1. Identifiez les actualités à fort potentiel de volatilité :
   - Breaking news
   - Déclarations surprises
   - Données économiques inattendues
   - Changements politiques majeurs

2. Pour chaque actualité importante :
   - Impact immédiat sur les devises (0-2h)
   - Réaction probable du marché
   - Paires de devises les plus sensibles
   - Niveau de volatilité attendu

3. Hiérarchisez les opportunités :
   - Classement par potentiel de mouvement
   - Timing optimal d'entrée
   - Durée probable de l'impact
   - Risques spécifiques à surveiller

Format : Réponse structurée en HTML avec classes Tailwind CSS, focalisée sur les opportunités de trading intraday.`,

  tradingSignals: `En tant que day trader news, générez des signaux de trading basés sur l'actualité immédiate.

Données de marché actuelles :
{marketContext}

Actualités récentes :
{newsContext}

Instructions :
1. Analysez uniquement les news avec impact immédiat :
   - Breaking news
   - Surprises de marché
   - Réactions en cours
   - Mouvements techniques significatifs

2. Pour chaque opportunité :
   - Paire de devise concernée
   - Direction probable
   - Timing d'entrée optimal
   - Durée estimée du mouvement
   - Niveau de volatilité attendu

Format : JSON strict avec la structure :
[{
  symbol: string,
  direction: "buy" | "sell",
  timing: string,
  volatility: "high" | "medium" | "low",
  duration: string,
  analysis: string (en français)
}]`,

  aiInsights: `En tant que day trader spécialisé dans le trading de news, analysez l'impact immédiat des actualités sur le marché forex.

Données fondamentales :
- Actualités récentes : {newsContext}
- Données de marché : {marketContext}

Instructions d'analyse :
1. Évaluez les actualités par ordre d'importance :
   - Breaking news et surprises majeures
   - Actualités en développement
   - Réactions de marché en cours
   - Événements secondaires

2. Pour chaque actualité significative :
   - Impact immédiat sur les devises
   - Durée probable de l'effet
   - Volatilité attendue
   - Risques spécifiques

3. Identifiez les opportunités de trading :
   - Timing optimal
   - Paires les plus réactives
   - Direction probable
   - Durée estimée du mouvement

4. Fournissez une conclusion actionnable :
   - Meilleure opportunité immédiate
   - Timing d'entrée suggéré
   - Risques principaux
   - Points de surveillance

Format : Réponse structurée privilégiant les opportunités de trading immédiates basées sur les news.
En l'absence de news significatives, indiquez clairement qu'il est préférable d'attendre de meilleures opportunités.`,

  mascot: `En tant qu'assistant trading spécialisé dans l'analyse fondamentale, concentrez-vous uniquement sur les actualités à fort impact.

Actualités récentes :
{newsContext}

Événements économiques :
{calendarContext}

Instructions :
1. Analysez UNIQUEMENT :
   - Les actualités à fort impact
   - Les surprises économiques majeures
   - Les déclarations importantes des banques centrales
   - Les événements géopolitiques majeurs

2. Si une actualité à fort impact est détectée :
   - Expliquez brièvement son importance
   - Identifiez les devises les plus impactées
   - Indiquez la direction probable du mouvement
   - Estimez la durée potentielle de l'impact

3. En l'absence d'actualités à fort impact :
   - Vérifiez les actualités à impact moyen
   - Si rien de significatif, recommandez d'attendre

Format : Réponse très courte (2-3 phrases maximum) focalisée uniquement sur l'actualité la plus importante.
Ne jamais fournir de niveaux de prix spécifiques.`
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
      return updated;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
