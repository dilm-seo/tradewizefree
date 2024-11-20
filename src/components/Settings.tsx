import React from 'react';
import { Settings as SettingsIcon, DollarSign, Clock, Database, Sun, Moon } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function Settings() {
  const { settings, updateSettings } = useSettings();

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ apiKey: e.target.value });
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ refreshInterval: parseInt(e.target.value, 10) });
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ demoMode: e.target.checked });
  };

  const handleDailyLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ dailyLimit: parseFloat(e.target.value) });
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <div className="bg-gray-800/50 dark:bg-gray-800/50 light:bg-white/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700 dark:border-gray-700 light:border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold dark:text-white light:text-gray-900">Paramètres</h2>
        <SettingsIcon className="h-6 w-6 text-blue-400" />
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium dark:text-gray-300 light:text-gray-700">
            Clé API OpenAI
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="password"
              value={settings.apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              className="flex-1 bg-gray-900/50 dark:bg-gray-900/50 light:bg-gray-100 border border-gray-600 dark:border-gray-600 light:border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition dark:text-white light:text-gray-900"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium dark:text-gray-300 light:text-gray-700">
            Intervalle de rafraîchissement
          </label>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 dark:text-gray-400 light:text-gray-500" />
            <select
              value={settings.refreshInterval}
              onChange={handleIntervalChange}
              className="flex-1 bg-gray-900/50 dark:bg-gray-900/50 light:bg-gray-100 border border-gray-600 dark:border-gray-600 light:border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition dark:text-white light:text-gray-900"
            >
              <option value="30">30 secondes</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
              <option value="900">15 minutes</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium dark:text-gray-300 light:text-gray-700">
            Limite de dépense journalière
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={settings.dailyLimit}
              onChange={handleDailyLimitChange}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-sm font-medium w-16 text-right dark:text-white light:text-gray-900">
              {settings.dailyLimit.toFixed(1)} €
            </span>
          </div>
          <div className="flex justify-between text-xs dark:text-gray-400 light:text-gray-500 px-1">
            <span>1€</span>
            <span>20€</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-700/30 dark:bg-gray-700/30 light:bg-gray-200/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 dark:text-gray-400 light:text-gray-500" />
            <span className="text-sm dark:text-white light:text-gray-900">Mode démo</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.demoMode}
              onChange={handleModeChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-700/30 dark:bg-gray-700/30 light:bg-gray-200/50 rounded-lg">
          <div className="flex items-center space-x-2">
            {settings.theme === 'dark' ? (
              <Moon className="h-5 w-5 text-blue-400" />
            ) : (
              <Sun className="h-5 w-5 text-yellow-400" />
            )}
            <span className="text-sm dark:text-white light:text-gray-900">Thème {settings.theme === 'dark' ? 'sombre' : 'clair'}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Changer
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-700/30 dark:bg-gray-700/30 light:bg-gray-200/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <span className="text-sm dark:text-white light:text-gray-900">Coût API OpenAI</span>
          </div>
          <span className="text-lg font-medium dark:text-white light:text-gray-900">{settings.apiCosts.toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
}