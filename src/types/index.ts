export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  category: string;
  author?: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp?: number;
}

export interface TradingSignal {
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  analysis: string;
}

export interface Settings {
  apiKey: string;
  refreshInterval: number;
  demoMode: boolean;
  apiCosts: number;
  dailyLimit: number;
  lastResetDate?: string;
  theme: 'dark' | 'light';
  prompts: {
    fundamentalAnalysis: string;
    tradingSignals: string;
    aiInsights: string;
    mascot: string;
  };
}

export interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

export type TranslationService = (text: string) => Promise<string>;

export interface EconomicEvent {
  date: string;
  time: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  event: string;
  actual?: string;
  forecast?: string;
  previous?: string;
}