import { useQuery } from 'react-query';
import { useSettings } from '../context/SettingsContext';
import type { MarketData } from '../types';

// API Keys
const ALPHA_VANTAGE_API_KEY = 'QWOU4XNKW4HTLBG4';
const EXCHANGERATE_API_KEY = '2c9e8db8f7c27c1de6f7e89d';
const FIXER_API_KEY = 'fca_live_GpNYHhQZAR3vP5EvwGHhYyuZn9HoMQfJPRdxDtKz';

const FALLBACK_DATA: MarketData[] = [
  { symbol: 'EUR/USD', price: 1.0925, change: 0.0015, changePercent: 0.14, timestamp: Date.now() },
  { symbol: 'GBP/USD', price: 1.2650, change: -0.0025, changePercent: -0.20, timestamp: Date.now() },
  { symbol: 'USD/JPY', price: 148.75, change: 0.45, changePercent: 0.30, timestamp: Date.now() },
  { symbol: 'AUD/USD', price: 0.6580, change: -0.0012, changePercent: -0.18, timestamp: Date.now() },
  { symbol: 'USD/CHF', price: 0.8790, change: 0.0008, changePercent: 0.09, timestamp: Date.now() },
  { symbol: 'USD/CAD', price: 1.3480, change: 0.0020, changePercent: 0.15, timestamp: Date.now() }
];

const FOREX_PAIRS = [
  'EUR_USD',
  'GBP_USD',
  'USD_JPY',
  'AUD_USD',
  'USD_CHF',
  'USD_CAD'
];

// ExchangeRate API
async function fetchFromExchangeRate(): Promise<MarketData[] | null> {
  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGERATE_API_KEY}/latest/USD`
    );

    if (!response.ok) {
      throw new Error('ExchangeRate API request failed');
    }

    const data = await response.json();
    const prevResponse = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGERATE_API_KEY}/history/USD/${
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }`
    );
    
    if (!prevResponse.ok) {
      throw new Error('ExchangeRate API history request failed');
    }
    
    const prevData = await prevResponse.json();

    return FOREX_PAIRS.map(pair => {
      const [base, quote] = pair.split('_');
      const isUsdBase = base === 'USD';
      const otherCurrency = isUsdBase ? quote : base;
      
      const currentRate = isUsdBase ? data.conversion_rates[otherCurrency] : 1 / data.conversion_rates[otherCurrency];
      const previousRate = isUsdBase ? 
        prevData.conversion_rates[otherCurrency] : 
        1 / prevData.conversion_rates[otherCurrency];
      
      const change = currentRate - previousRate;
      const changePercent = (change / previousRate) * 100;

      return {
        symbol: pair.replace('_', '/'),
        price: currentRate,
        change,
        changePercent,
        timestamp: Date.now()
      };
    });
  } catch (error) {
    console.error('Error fetching from ExchangeRate:', error);
    return null;
  }
}

// Fixer.io API
async function fetchFromFixer(): Promise<MarketData[] | null> {
  try {
    const response = await fetch(
      `https://api.fastforex.io/fetch-all?api_key=${FIXER_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Fixer API request failed');
    }

    const data = await response.json();
    
    // Get previous day rates for comparison
    const prevResponse = await fetch(
      `https://api.fastforex.io/fetch-historical?date=${
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }&api_key=${FIXER_API_KEY}`
    );

    if (!prevResponse.ok) {
      throw new Error('Fixer API historical request failed');
    }

    const prevData = await prevResponse.json();

    return FOREX_PAIRS.map(pair => {
      const [base, quote] = pair.split('_');
      const isUsdBase = base === 'USD';
      const otherCurrency = isUsdBase ? quote : base;
      
      const currentRate = isUsdBase ? data.results[otherCurrency] : 1 / data.results[otherCurrency];
      const previousRate = isUsdBase ? 
        prevData.results[otherCurrency] : 
        1 / prevData.results[otherCurrency];
      
      const change = currentRate - previousRate;
      const changePercent = (change / previousRate) * 100;

      return {
        symbol: pair.replace('_', '/'),
        price: currentRate,
        change,
        changePercent,
        timestamp: Date.now()
      };
    });
  } catch (error) {
    console.error('Error fetching from Fixer:', error);
    return null;
  }
}

async function fetchFromAlphaVantage(pair: string): Promise<MarketData | null> {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${pair.split('_')[0]}&to_symbol=${pair.split('_')[1]}&interval=5min&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Alpha Vantage API request failed');
    }

    const data = await response.json();
    const timeSeries = data['Time Series FX (5min)'];
    
    if (!timeSeries) {
      return null;
    }

    const times = Object.keys(timeSeries);
    const currentPrice = parseFloat(timeSeries[times[0]]['4. close']);
    const previousPrice = parseFloat(timeSeries[times[1]]['4. close']);
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;

    return {
      symbol: pair.replace('_', '/'),
      price: currentPrice,
      change,
      changePercent,
      timestamp: new Date(times[0]).getTime()
    };
  } catch (error) {
    console.error(`Error fetching from Alpha Vantage for ${pair}:`, error);
    return null;
  }
}

async function fetchForexData(): Promise<MarketData[]> {
  // Try ExchangeRate API first (60 requests per month)
  const exchangeRateData = await fetchFromExchangeRate();
  if (exchangeRateData) {
    return exchangeRateData;
  }

  // Try Fixer.io next (100 requests per month)
  const fixerData = await fetchFromFixer();
  if (fixerData) {
    return fixerData;
  }

  // Try Alpha Vantage as last resort (25 requests per day)
  const alphaVantageResults = await Promise.all(
    FOREX_PAIRS.map(pair => fetchFromAlphaVantage(pair))
  );
  const validResults = alphaVantageResults.map((result, index) => 
    result || FALLBACK_DATA[index]
  );

  return validResults;
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