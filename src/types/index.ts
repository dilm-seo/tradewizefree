// Add GPTModel type
export type GPTModel = 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo-preview';

// Update Settings interface
export interface Settings {
  apiKey: string;
  refreshInterval: number;
  demoMode: boolean;
  apiCosts: number;
  dailyLimit: number;
  lastResetDate?: string;
  theme: 'dark' | 'light';
  gptModel: GPTModel;
  prompts: {
    fundamentalAnalysis: string;
    tradingSignals: string;
    aiInsights: string;
    mascot: string;
  };
}