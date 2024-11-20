import OpenAI from 'openai';
import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { TradingSignal } from '../types';

// Optimisation des prompts pour réduire les tokens
const SYSTEM_INSTRUCTIONS = {
  TRADING: "Analyste forex focalisé news. Réponses courtes, précises. Format JSON strict.",
  SENTIMENT: "Analyste sentiment forex. Réponses courtes, précises. Format JSON strict.",
  FUNDAMENTAL: "Analyste fondamental forex. Réponses courtes, précises. HTML uniquement.",
  CENTRAL_BANK: "Analyste banques centrales. Réponses courtes, précises. Format JSON strict."
};

// Optimisation du contexte pour réduire les tokens
function optimizeContext(context: Record<string, string>): Record<string, string> {
  return Object.entries(context).reduce((acc, [key, value]) => {
    // Limiter la taille du contexte
    if (value && typeof value === 'string') {
      // Tronquer les textes longs
      const maxLength = key.includes('news') ? 500 : 200;
      acc[key] = value.length > maxLength ? value.slice(0, maxLength) + '...' : value;
    }
    return acc;
  }, {} as Record<string, string>);
}

export function useOpenAI() {
  const { settings, updateSettings } = useSettings();
  
  const openai = new OpenAI({
    apiKey: settings.apiKey,
    dangerouslyAllowBrowser: true
  });

  const checkDailyLimit = (cost: number): boolean => {
    const newTotal = settings.apiCosts + cost;
    return newTotal <= settings.dailyLimit;
  };

  const analyzeMarket = useCallback(async (
    prompt: string,
    context: Record<string, string> = {},
    type: keyof typeof SYSTEM_INSTRUCTIONS = 'TRADING'
  ): Promise<string> => {
    if (!settings.apiKey) {
      throw new Error("Clé API OpenAI non configurée");
    }

    try {
      const estimatedCost = 0.02; // Réduit grâce à l'optimisation
      if (!checkDailyLimit(estimatedCost)) {
        throw new Error("Limite de dépense journalière atteinte");
      }

      // Optimisation du contexte
      const optimizedContext = optimizeContext(context);

      // Construction du prompt optimisé
      const systemPrompt = SYSTEM_INSTRUCTIONS[type] + "\n\n" + prompt;
      const messages = [{
        role: "system",
        content: systemPrompt
      }];

      // Ajout du contexte uniquement si nécessaire
      if (Object.keys(optimizedContext).length > 0) {
        messages.push({
          role: "user",
          content: Object.entries(optimizedContext)
            .map(([key, value]) => `${key}:\n${value}`)
            .join('\n\n')
        });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Utilisation de gpt-3.5-turbo au lieu de gpt-4 pour réduire les coûts
        messages,
        temperature: 0.7,
        max_tokens: 500, // Limite de tokens réduite
        response_format: type !== 'FUNDAMENTAL' ? { type: "json_object" } : undefined
      });

      const totalTokens = response.usage?.total_tokens || 0;
      const cost = (totalTokens / 1000) * 0.002; // Coût réduit avec gpt-3.5-turbo
      updateSettings({ apiCosts: settings.apiCosts + cost });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Pas de réponse de l'API");
      }

      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erreur d'analyse: ${error.message}`);
      }
      throw new Error("Une erreur inattendue s'est produite");
    }
  }, [settings.apiKey, settings.apiCosts, settings.dailyLimit, updateSettings]);

  const generateTradingSignals = useCallback(async (
    context: Record<string, string> = {}
  ): Promise<TradingSignal[]> => {
    if (!settings.apiKey) {
      throw new Error("Clé API OpenAI non configurée");
    }

    try {
      const estimatedCost = 0.02;
      if (!checkDailyLimit(estimatedCost)) {
        throw new Error("Limite de dépense journalière atteinte");
      }

      const optimizedContext = optimizeContext(context);
      const response = await analyzeMarket(
        settings.prompts.tradingSignals,
        optimizedContext,
        'TRADING'
      );

      return JSON.parse(response).signals || [];
    } catch (error) {
      console.error('Erreur de génération des signaux:', error);
      return [];
    }
  }, [settings.apiKey, settings.apiCosts, settings.dailyLimit, updateSettings]);

  return { analyzeMarket, generateTradingSignals };
}