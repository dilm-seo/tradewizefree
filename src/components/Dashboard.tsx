import React, { useState } from 'react';
import { TrendingUp, Settings as SettingsIcon, MessageSquare, Home } from 'lucide-react';
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
import CentralBankMonitor from './CentralBankMonitor';
import { useSettings } from '../context/SettingsContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('markets');
  const { settings } = useSettings();

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <WorldMap />
              <MarketOverview />
              <TradingSignals />
              <FundamentalAnalysis />
              <CentralBankMonitor />
            </div>
            <div className="space-y-8">
              <NewsFeed />
              <SentimentAnalysis />
              <EconomicCalendar />
              <AIInsights />
            </div>
          </div>
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