import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, MessageSquare, AlertCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

type PromptKey = 'fundamentalAnalysis' | 'tradingSignals' | 'aiInsights' | 'mascot';

const promptTitles: Record<PromptKey, string> = {
  fundamentalAnalysis: 'Analyse Fondamentale',
  tradingSignals: 'Signaux de Trading',
  aiInsights: 'AI Insights',
  mascot: 'Assistant Trading'
};

const promptDescriptions: Record<PromptKey, string> = {
  fundamentalAnalysis: 'Personnalisez l\'analyse fondamentale des marchés forex',
  tradingSignals: 'Définissez la génération des signaux de trading',
  aiInsights: 'Configurez les réponses de l\'assistant IA',
  mascot: 'Ajustez le comportement de l\'assistant de trading'
};

export default function PromptManager() {
  const { settings, updateSettings } = useSettings();
  const [editedPrompts, setEditedPrompts] = useState(settings.prompts);
  const [activePrompt, setActivePrompt] = useState<PromptKey>('fundamentalAnalysis');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedPrompts(settings.prompts);
  }, [settings.prompts]);

  const handlePromptChange = (value: string) => {
    setEditedPrompts(prev => ({
      ...prev,
      [activePrompt]: value
    }));
    setHasChanges(true);
    setSaveStatus('idle');
  };

  const handleSave = () => {
    setSaveStatus('saving');
    updateSettings({ prompts: editedPrompts });
    setHasChanges(false);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleReset = () => {
    const defaultPrompts = settings.prompts;
    setEditedPrompts(defaultPrompts);
    setHasChanges(false);
    setSaveStatus('idle');
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Gestion des Prompts</h2>
          <p className="text-sm text-gray-400 mt-1">
            Personnalisez les prompts pour obtenir des analyses plus pertinentes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <span className="text-sm text-yellow-400 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Modifications non sauvegardées
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Réinitialiser</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>
              {saveStatus === 'saving' ? 'Sauvegarde...' : 
               saveStatus === 'saved' ? 'Sauvegardé !' : 
               'Sauvegarder'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {(Object.keys(promptTitles) as PromptKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActivePrompt(key)}
            className={`
              p-4 rounded-lg transition-all duration-200
              flex flex-col items-start justify-between
              ${activePrompt === key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700/30 hover:bg-gray-700/50 text-gray-300'}
            `}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="font-medium">{promptTitles[key]}</span>
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className={`text-sm ${activePrompt === key ? 'text-blue-100' : 'text-gray-400'}`}>
              {promptDescriptions[key]}
            </p>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-blue-400">
              {promptTitles[activePrompt]}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {promptDescriptions[activePrompt]}
            </p>
          </div>
        </div>
        <textarea
          value={editedPrompts[activePrompt]}
          onChange={(e) => handlePromptChange(e.target.value)}
          className="w-full h-96 bg-gray-900/50 border border-gray-600 rounded-lg p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-blue-500 transition"
          placeholder="Entrez votre prompt personnalisé..."
        />
        <div className="flex justify-between items-center text-sm text-gray-400">
          <p>
            Les modifications seront appliquées après la sauvegarde.
          </p>
          <p>
            {editedPrompts[activePrompt].length} caractères
          </p>
        </div>
      </div>
    </div>
  );
}