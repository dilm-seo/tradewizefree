import OpenAI from 'openai';
import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { TradingSignal } from '../types';

export function useOpenAI() {
  const { settings, updateSettings } = useSettings();
  
  const openai = new OpenAI({
    apiKey: settings.apiKey,
    dangerouslyAllowBrowser: true
  });

  const getModelCost = () => {
    return settings.gptModel === 'gpt-4' ? 0.03 : 0.002;
  };

  const getEstimatedCost = () => {
    return settings.gptModel === 'gpt-4' ? 0.01 : 0.005;
  };

  const checkDailyLimit = (cost: number): boolean => {
    const newTotal = settings.apiCosts + cost;
    return newTotal <= settings.dailyLimit;
  };

  const injectContext = (prompt: string, context: Record<string, string>): string => {
    let injectedPrompt = prompt;
    Object.entries(context).forEach(([key, value]) => {
      injectedPrompt = injectedPrompt.replace(`{${key}}`, value || '');
    });
    return injectedPrompt;
  };

  const analyzeMarket = useCallback(async (
    prompt: string,
    context: Record<string, string> = {}
  ): Promise<string> => {
    if (!settings.apiKey) {
      throw new Error("Clé API OpenAI non configurée");
    }

    try {
      const estimatedCost = getEstimatedCost();
      if (!checkDailyLimit(estimatedCost)) {
        throw new Error("Limite de dépense journalière atteinte");
      }

      const injectedPrompt = injectContext(prompt, context);

      const response = await openai.chat.completions.create({
        model: settings.gptModel,
        messages: [{
          role: "system",
          content: injectedPrompt
        }],
        temperature: 0.7,
        max_tokens: 500
      });

      const totalTokens = response.usage?.total_tokens || 0;
      const cost = (totalTokens / 1000) * getModelCost();
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
  }, [settings.apiKey, settings.apiCosts, settings.dailyLimit, settings.gptModel, updateSettings]);

  const generateTradingSignals = useCallback(async (
    context: Record<string, string> = {}
  ): Promise<TradingSignal[]> => {
    if (!settings.apiKey) {
      throw new Error("Clé API OpenAI non configurée");
    }

    try {
      const estimatedCost = getEstimatedCost() * 2;
      if (!checkDailyLimit(estimatedCost)) {
        throw new Error("Limite de dépense journalière atteinte");
      }

      const injectedPrompt = injectContext(settings.prompts.tradingSignals, context);

      const response = await openai.chat.completions.create({
        model: settings.gptModel,
        messages: [{
          role: "system",
          content: injectedPrompt
        }],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const totalTokens = response.usage?.total_tokens || 0;
      const cost = (totalTokens / 1000) * getModelCost();
      updateSettings({ apiCosts: settings.apiCosts + cost });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Pas de réponse de l'API");
      }

      return JSON.parse(content).signals || [];
    } catch (error) {
      console.error('Erreur de génération des signaux:', error);
      return [];
    }
  }, [settings.apiKey, settings.apiCosts, settings.dailyLimit, settings.gptModel, updateSettings]);

  return { analyzeMarket, generateTradingSignals };
}