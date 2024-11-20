import React, { useState } from 'react';
import { TrendingUp, Settings as SettingsIcon, MessageSquare, Home, RefreshCw, Loader2 } from 'lucide-react';
import NewsFeed from './NewsFeed';
import MarketOverview from './MarketOverview';
import TradingSignals from './TradingSignals';
import FundamentalAnalysis from './FundamentalAnalysis';
import AIInsights from './AIInsights';
import Settings from './Settings';
import WorldMap from './WorldMap';
import EconomicCalendar from './EconomicCalendar';
import TradingMascot from './TradingMascot';
import PromptManager from './PromptManager';
import SentimentAnalysis from './SentimentAnalysis';
import VolatilityAnalysis from './VolatilityAnalysis';
import CentralBankMonitor from './CentralBankMonitor';
import { useSettings } from '../context/SettingsContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('markets');
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const { settings } = useSettings();

  // Références aux composants pour déclencher leurs analyses
  const fundamentalAnalysisRef = React.useRef<{ handleGenerateAnalysis: () => void }>(null);
  const centralBankMonitorRef = React.useRef<{ handleAnalysis: () => void }>(null);
  const sentimentAnalysisRef = React.useRef<{ handleAnalysis: () => void }>(null);
  const volatilityAnalysisRef = React.useRef<{ handleAnalysis: () => void }>(null);

  const handleAnalyzeAll = async () => {
    if (isAnalyzingAll || !settings.apiKey) return;
    
    setIsAnalyzingAll(true);

    try {
      // Lancer toutes les analyses en parallèle
      await Promise.all([
        fundamentalAnalysisRef.current?.handleGenerateAnalysis(),
        centralBankMonitorRef.current?.handleAnalysis(),
        sentimentAnalysisRef.current?.handleAnalysis(),
        volatilityAnalysisRef.current?.handleAnalysis()
      ]);
    } catch (error) {
      console.error('Erreur lors de l\'analyse globale:', error);
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <div className="max-w-3xl mx-auto">
            <Settings />
          </div>
        );
      case 'prompts':
        return <PromptManager />;
      case 'markets':
      default:
        return (
          <>
            <div className="mb-6 flex justify-end">
              <button
                onClick={handleAnalyzeAll}
                disabled={isAnalyzingAll || !settings.apiKey}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 
                         text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition 
                         disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl
                         transform hover:scale-105 active:scale-95"
              >
                {isAnalyzingAll ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Analyse en cours...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5" />
                    <span>Analyser tout</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                <WorldMap />
                <MarketOverview />
                <TradingSignals />
                <FundamentalAnalysis ref={fundamentalAnalysisRef} />
                <CentralBankMonitor ref={centralBankMonitorRef} />
              </div>
              <div className="space-y-8">
                <NewsFeed />
                <SentimentAnalysis ref={sentimentAnalysisRef} />
                <VolatilityAnalysis ref={volatilityAnalysisRef} />
                <EconomicCalendar />
                <AIInsights />
              </div>
            </div>
          </>
        );
    }
  };

  const getTabClass = (tabName: string) => `
    flex items-center space-x-2 px-4 py-2 rounded-lg transition
    ${activeTab === tabName 
      ? 'text-blue-400 bg-blue-400/10' 
      : 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30'}
  `;

  return (
    <div className={`min-h-screen ${settings.theme === 'dark' ? 'dark' : 'light'}`}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900">
        <header className="border-b border-blue-500/20 bg-gradient-to-r from-gray-900/50 via-blue-900/30 to-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('markets')}
                className="flex items-center space-x-2 hover:opacity-80 transition"
              >
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  TradeWise
                </h1>
              </button>
              <div className="flex items-center space-x-2">
                {activeTab !== 'markets' && (
                  <button
                    onClick={() => setActiveTab('markets')}
                    className={getTabClass('home')}
                  >
                    <Home className="h-5 w-5" />
                    <span className="hidden md:inline">Accueil</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('prompts')}
                  className={getTabClass('prompts')}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="hidden md:inline">Prompts</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={getTabClass('settings')}
                >
                  <SettingsIcon className="h-5 w-5" />
                  <span className="hidden md:inline">Paramètres</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {renderContent()}
        </main>

        <TradingMascot />
      </div>
    </div>
  );
}