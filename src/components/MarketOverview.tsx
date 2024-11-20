import React, { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function MarketOverview() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (!chartRef.current || !window.TradingView) return;

    new window.TradingView.widget({
      container_id: chartRef.current.id,
      symbol: "FX:EURUSD",
      interval: "D",
      timezone: "Europe/Paris",
      theme: "dark",
      style: "1",
      locale: "fr",
      toolbar_bg: "#f1f3f6",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: true,
      save_image: false,
      height: 600,
      allow_symbol_change: true,
      studies: [
        "RSI@tv-basicstudies",
        "MAExp@tv-basicstudies",
        "MACD@tv-basicstudies",
        "StochasticRSI@tv-basicstudies"
      ],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650"
    });
  }, []);

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Aperçu des Marchés</h2>
        {settings.demoMode && (
          <div className="flex items-center text-yellow-400 text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            Mode démo
          </div>
        )}
      </div>

      <div 
        id="tradingview_main" 
        ref={chartRef}
        className="bg-gray-700/30 rounded-lg overflow-hidden"
      />

      <p className="text-xs text-gray-400 mt-4">
        * Graphique fourni par TradingView. Mise à jour en temps réel.
      </p>
    </div>
  );
}