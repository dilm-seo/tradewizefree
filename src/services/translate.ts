import type { TranslationService } from '../types';

// Cache de traduction pour éviter les appels API répétés
const translationCache = new Map<string, string>();

// File d'attente pour les traductions
let translationQueue: Array<{
  text: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}> = [];

let isProcessingQueue = false;

const TRANSLATION_PROVIDER = {
  name: 'MyMemory',
  url: (text: string) => 
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`,
  extract: (data: any) => data.responseData.translatedText,
  validateResponse: (data: any) => 
    data?.responseData?.translatedText && 
    data.responseStatus === 200
};

// Délai entre chaque requête pour éviter de surcharger l'API
const RATE_LIMIT_DELAY = 1000; // 1 seconde

function shouldTranslate(text: string): boolean {
  // Ne pas traduire si le texte est vide ou trop court
  if (!text?.trim() || text.length < 3) return false;

  // Ne pas traduire si le texte contient principalement des nombres/symboles
  if (/^[^a-zA-Z]*$/.test(text)) return false;

  // Ne pas traduire si le texte contient des caractères français
  if (/[éèêëàâäôöûüçîïÉÈÊËÀÂÄÔÖÛÜÇÎÏ]/.test(text)) return false;

  // Ne pas traduire les URLs
  if (/^https?:\/\//.test(text)) return false;

  // Ne pas traduire les textes qui semblent déjà être en français
  const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'donc'];
  const words = text.toLowerCase().split(/\s+/);
  const frenchWordCount = words.filter(word => frenchWords.includes(word)).length;
  if (frenchWordCount / words.length > 0.3) return false;

  return true;
}

async function processQueue() {
  if (isProcessingQueue || translationQueue.length === 0) return;

  isProcessingQueue = true;

  while (translationQueue.length > 0) {
    const { text, resolve, reject } = translationQueue.shift()!;

    try {
      // Vérifier le cache avant de faire l'appel API
      if (translationCache.has(text)) {
        resolve(translationCache.get(text)!);
        continue;
      }

      const response = await fetch(TRANSLATION_PROVIDER.url(text));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!TRANSLATION_PROVIDER.validateResponse(data)) {
        throw new Error('Invalid response format');
      }
      
      const translation = TRANSLATION_PROVIDER.extract(data).trim();

      // Ne mettre en cache que si la traduction est différente du texte original
      if (translation.toLowerCase() !== text.toLowerCase()) {
        translationCache.set(text, translation);
        resolve(translation);
      } else {
        resolve(text);
      }

      // Attendre avant la prochaine requête
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    } catch (error) {
      console.error('Translation error:', error);
      reject(error instanceof Error ? error : new Error('Unknown translation error'));
    }
  }

  isProcessingQueue = false;
}

export const translateText: TranslationService = async (text: string): Promise<string> => {
  // Vérifier si la traduction est nécessaire
  if (!shouldTranslate(text)) {
    return text;
  }

  // Vérifier le cache
  const cachedTranslation = translationCache.get(text);
  if (cachedTranslation) {
    return cachedTranslation;
  }

  // Ajouter à la file d'attente
  return new Promise((resolve, reject) => {
    translationQueue.push({ text, resolve, reject });
    processQueue();
  });
};