import OpenAI from 'openai';
import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { GPTModel } from '../types';

const MODEL_COSTS: Record<GPTModel, number> = {
  'gpt-3.5-turbo': 0.002,
  'gpt-4': 0.03,
  'gpt-4-turbo-preview': 0.01
};

const sanitizeJsonResponse = (content: string): string => {
  try {
    // Trouver le premier { et le dernier }
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}') + 1;
    
    if (start === -1 || end <= start) {
      throw new Error('No valid JSON object found');
    }

    // Extraire uniquement la partie JSON
    let jsonStr = content.slice(start, end);

    // Nettoyer le JSON
    jsonStr = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Supprimer les caractères de contrôle
      .replace(/\\[rnt]/g, ' ') // Remplacer les retours à la ligne par des espaces
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .replace(/([{,])\s*"([^"]+)"\s*:/g, '$1"$2":') // Nettoyer les espaces autour des clés
      .replace(/:\s*"([^"]+)"\s*([,}])/g, ':"$1"$2') // Nettoyer les espaces autour des valeurs
      .replace(/,\s*([\]}])/g, '$1') // Supprimer les virgules trailing
      .replace(/([^\\])(\\u[\da-f]{4})/gi, '$1') // Supprimer les unicode escapes
      .replace(/\\/g, '') // Supprimer les backslashes restants
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Supprimer les espaces de largeur nulle
      .replace(/[\u2028\u2029]/g, '') // Supprimer les séparateurs de ligne/paragraphe
      .trim();

    // Vérifier que c'est un JSON valide
    JSON.parse(jsonStr);
    return jsonStr;
  } catch (error) {
    console.error('Error sanitizing JSON:', error);
    throw new Error('Invalid JSON format');
  }
};

const validateJsonResponse = (content: string): any => {
  try {
    // Essayer d'abord le parsing direct
    return JSON.parse(content);
  } catch (firstError) {
    try {
      // Si le parsing direct échoue, essayer de nettoyer d'abord
      const sanitized = sanitizeJsonResponse(content);
      console.log('Sanitized JSON:', sanitized);
      return JSON.parse(sanitized);
    } catch (secondError) {
      console.error('JSON validation errors:', { 
        original: content,
        firstError,
        secondError
      });
      throw new Error('Format de réponse invalide');
    }
  }
};

export function useOpenAI() {
  const { settings, updateSettings } = useSettings();
  
  const openai = new OpenAI({
    apiKey: settings.apiKey,
    dangerouslyAllowBrowser: true
  });

  const getModelCost = () => MODEL_COSTS[settings.gptModel];

  const checkDailyLimit = (cost: number): boolean => {
    const today = new Date().toISOString().split('T')[0];
    
    if (settings.lastResetDate !== today) {
      updateSettings({ 
        apiCosts: 0,
        lastResetDate: today
      });
      return true;
    }

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
      const costPerToken = getModelCost();
      const estimatedTokens = 1000;
      const estimatedCost = (estimatedTokens / 1000) * costPerToken;

      if (!checkDailyLimit(estimatedCost)) {
        throw new Error("Limite de dépense journalière atteinte");
      }

      const isJsonResponse = prompt.toLowerCase().includes('json');
      const injectedPrompt = injectContext(prompt, context);

      // Forcer le format JSON si nécessaire
      const finalPrompt = isJsonResponse 
        ? `${injectedPrompt}\n\nIMPORTANT: Répondez UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. Utilisez uniquement des guillemets doubles pour les chaînes. Ne pas utiliser d'accents ou de caractères spéciaux dans les clés JSON.`
        : injectedPrompt;

      const response = await openai.chat.completions.create({
        model: settings.gptModel,
        messages: [{
          role: "system",
          content: finalPrompt
        }],
        temperature: 0.7,
        max_tokens: estimatedTokens,
        response_format: isJsonResponse ? { type: "json_object" } : undefined,
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.1
      });

      const totalTokens = response.usage?.total_tokens || 0;
      const actualCost = (totalTokens / 1000) * costPerToken;
      updateSettings({ apiCosts: settings.apiCosts + actualCost });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Pas de réponse de l'API");
      }

      if (isJsonResponse) {
        const validatedJson = validateJsonResponse(content);
        return JSON.stringify(validatedJson);
      }

      return content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      if (error instanceof Error) {
        throw new Error(`Erreur d'analyse: ${error.message}`);
      }
      throw new Error("Une erreur inattendue s'est produite");
    }
  }, [settings.apiKey, settings.apiCosts, settings.dailyLimit, settings.gptModel, updateSettings]);

  const generateTradingSignals = useCallback(async (
    context: Record<string, string> = {}
  ): Promise<any[]> => {
    if (!settings.apiKey) {
      throw new Error("Clé API OpenAI non configurée");
    }

    try {
      const costPerToken = getModelCost();
      const estimatedTokens = 1000;
      const estimatedCost = (estimatedTokens / 1000) * costPerToken;

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
        max_tokens: estimatedTokens,
        response_format: { type: "json_object" },
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.1
      });

      const totalTokens = response.usage?.total_tokens || 0;
      const actualCost = (totalTokens / 1000) * costPerToken;
      updateSettings({ apiCosts: settings.apiCosts + actualCost });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Pas de réponse de l'API");
      }

      const validatedJson = validateJsonResponse(content);
      return validatedJson.signals || [];
    } catch (error) {
      console.error('Error generating signals:', error);
      if (error instanceof Error) {
        throw new Error(`Erreur de génération: ${error.message}`);
      }
      throw new Error("Une erreur inattendue s'est produite");
    }
  }, [settings.apiKey, settings.apiCosts, settings.dailyLimit, settings.gptModel, settings.prompts.tradingSignals, updateSettings]);

  return { 
    analyzeMarket, 
    generateTradingSignals,
    getModelCost,
    checkDailyLimit
  };
}