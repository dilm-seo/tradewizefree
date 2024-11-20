import { useQuery } from 'react-query';
import { useSettings } from '../context/SettingsContext';
import type { MarketData } from '../types';

const FALLBACK_DATA: MarketData[] = [
  { symbol: 'EUR/USD', price: 1.0925, change: 0.0015, changePercent: 0.14, timestamp: Date.now() },
  { symbol: 'GBP/USD', price: 1.2650, change: -0.0025, changePercent: -0.20, timestamp: Date.now() },
  { symbol: 'USD/JPY', price: 148.75, change: 0.45, changePercent: 0.30, timestamp: Date.now() },
  { symbol: 'AUD/USD', price: 0.6580, change: -0.0012, changePercent: -0.18, timestamp: Date.now() },
  { symbol: 'USD/CHF', price: 0.8790, change: 0.0008, changePercent: 0.09, timestamp: Date.now() },
  { symbol: 'USD/CAD', price: 1.3480, change: 0.0020, changePercent: 0.15, timestamp: Date.now() }
];

async function fetchForexData(): Promise<MarketData[]> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rates = data.rates;

    return [
      {
        symbol: 'EUR/USD',
        price: 1 / rates.EUR,
        change: 0,
        changePercent: 0,
        timestamp: Date.now()
      },
      {
        symbol: 'GBP/USD',
        price: 1 / rates.GBP,
        change: 0,
        changePercent: 0,
        timestamp: Date.now()
      },
      {
        symbol: 'USD/JPY',
        price: rates.JPY,
        change: 0,
        changePercent: 0,
        timestamp: Date.now()
      },
      {
        symbol: 'AUD/USD',
        price: 1 / rates.AUD,
        change: 0,
        changePercent: 0,
        timestamp: Date.now()
      },
      {
        symbol: 'USD/CHF',
        price: rates.CHF,
        change: 0,
        changePercent: 0,
        timestamp: Date.now()
      },
      {
        symbol: 'USD/CAD',
        price: rates.CAD,
        change: 0,
        changePercent: 0,
        timestamp: Date.now()
      }
    ];
  } catch (error) {
    console.error('Error fetching forex data:', error);
    return FALLBACK_DATA;
  }
}

export function useMarketData() {
  const { settings } = useSettings();
  
  return useQuery(
    'marketData',
    () => settings.demoMode ? Promise.resolve(FALLBACK_DATA) : fetchForexData(),
    {
      refetchInterval: settings.refreshInterval * 1000,
      retry: 2,
      retryDelay: 1000,
      onError: (error) => {
        console.error('Market data fetch error:', error);
      },
      fallbackData: FALLBACK_DATA,
      staleTime: 10000
    }
  );
}