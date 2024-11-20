import React, { useEffect, useState } from 'react';
import { Clock, Brain, Loader2 } from 'lucide-react';
import { useOpenAI } from '../services/openai';
import { useSettings } from '../context/SettingsContext';
import { useNews } from '../hooks/useNews';

interface TradingSession {
  name: string;
  status: 'active' | 'inactive';
  pairs: string[];
  color: string;
  coordinates: {
    x: number;
    y: number;
    radius: number;
  };
}

const TRADING_SESSIONS: Record<string, {
  start: number;
  end: number;
  pairs: string[];
  coordinates: { x: number; y: number; radius: number };
}> = {
  'Sydney': {
    start: 22,
    end: 7,
    pairs: ['AUD/USD', 'NZD/USD'],
    coordinates: { x: 85, y: 80, radius: 20 }
  },
  'Tokyo': {
    start: 0,
    end: 9,
    pairs: ['USD/JPY', 'EUR/JPY', 'GBP/JPY'],
    coordinates: { x: 82, y: 35, radius: 25 }
  },
  'Londres': {
    start: 8,
    end: 17,
    pairs: ['GBP/USD', 'EUR/GBP', 'EUR/USD'],
    coordinates: { x: 48, y: 25, radius: 25 }
  },
  'New York': {
    start: 13,
    end: 22,
    pairs: ['EUR/USD', 'USD/CAD', 'USD/CHF'],
    coordinates: { x: 25, y: 35, radius: 25 }
  }
};

const SESSION_PROMPT = `Analysez la session de trading {session}.
News : {newsContext}
Format : Réponse courte focalisée sur les opportunités immédiates.`;

const PAIR_PROMPT = `Analysez le sentiment sur {pair}.
News : {newsContext}
Format : Réponse courte sur le sentiment actuel.`;

function WorldMap() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSessions, setActiveSessions] = useState<TradingSession[]>([]);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const { analyzeMarket } = useOpenAI();
  const { settings } = useSettings();
  const { data: news } = useNews();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const parisHour = currentTime.getUTCHours() + 1;
    
    const sessions = Object.entries(TRADING_SESSIONS).map(([name, session]) => {
      let isActive = false;
      
      if (session.start < session.end) {
        isActive = parisHour >= session.start && parisHour < session.end;
      } else {
        isActive = parisHour >= session.start || parisHour < session.end;
      }

      return {
        name,
        status: isActive ? 'active' : 'inactive',
        pairs: session.pairs,
        color: isActive ? 'bg-blue-500' : 'bg-gray-600',
        coordinates: session.coordinates
      };
    });

    setActiveSessions(sessions);
  }, [currentTime]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
  };

  const getActivePairs = () => {
    const pairs = new Set<string>();
    activeSessions
      .filter(session => session.status === 'active')
      .forEach(session => session.pairs.forEach(pair => pairs.add(pair)));
    return Array.from(pairs);
  };

  const analyzeSession = async (sessionName: string) => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setSelectedSession(sessionName);
    setSelectedPair(null);
    setAnalysis(null);

    try {
      const sessionNews = news?.slice(0, 3).map(item => item.translatedTitle || item.title).join('\n') || 'Aucune actualité récente';
      const result = await analyzeMarket(SESSION_PROMPT, {
        session: sessionName,
        newsContext: sessionNews
      });
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing session:', error);
      setAnalysis('Erreur lors de l\'analyse de la session');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzePair = async (pair: string) => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setSelectedPair(pair);
    setSelectedSession(null);
    setAnalysis(null);

    try {
      const relevantNews = news?.slice(0, 3).map(item => item.translatedTitle || item.title).join('\n') || 'Aucune actualité récente';
      const result = await analyzeMarket(PAIR_PROMPT, {
        pair,
        newsContext: relevantNews
      });
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing pair:', error);
      setAnalysis('Erreur lors de l\'analyse de la paire');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const gridStyle = {
    backgroundSize: '4% 4%',
    transform: `translate(${(mousePosition.x - 50) * 0.05}px, ${(mousePosition.y - 50) * 0.05}px)`
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-xl p-6 backdrop-blur-sm border border-blue-500/20 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Sessions de Trading
        </h2>
        <div className="flex items-center space-x-2 text-cyan-400">
          <Clock className="h-5 w-5" />
          <span className="font-medium">
            {currentTime.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}
          </span>
        </div>
      </div>

      <div className="relative mb-8" onMouseMove={handleMouseMove}>
        <div className="w-full aspect-[2/1] bg-gradient-to-b from-blue-950 to-gray-900 rounded-lg overflow-hidden">
          <div 
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.1)_1px,transparent_1px)] transition-transform duration-300"
            style={gridStyle}
          >
            <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.05),transparent_60%)]" />
          </div>

          {activeSessions.map((session) => (
            <div
              key={session.name}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{
                left: `${session.coordinates.x}%`,
                top: `${session.coordinates.y}%`,
                zIndex: hoveredSession === session.name ? 10 : 1
              }}
              onMouseEnter={() => setHoveredSession(session.name)}
              onMouseLeave={() => setHoveredSession(null)}
            >
              {session.status === 'active' && (
                <>
                  <div className="absolute inset-0 -m-8 animate-ping rounded-full bg-blue-500/20" />
                  <div className="absolute inset-0 -m-6 animate-pulse rounded-full bg-blue-400/20" />
                </>
              )}
              
              <button
                onClick={() => analyzeSession(session.name)}
                className={`
                  w-4 h-4 rounded-full ${session.color}
                  transform transition-all duration-500
                  shadow-[0_0_15px_rgba(59,130,246,0.5)]
                  group-hover:scale-150 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]
                  ${hoveredSession === session.name ? 'scale-150' : ''}
                  ${session.status === 'active' ? 'ring-4 ring-blue-500/20' : ''}
                `}
              />
              
              {hoveredSession === session.name && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-2 rounded-lg bg-gray-900/90 backdrop-blur-md border border-blue-500/20">
                  <p className="whitespace-nowrap text-blue-400 font-medium">{session.name}</p>
                  <p className="text-xs text-cyan-400/80">
                    {TRADING_SESSIONS[session.name].start}:00 - {TRADING_SESSIONS[session.name].end}:00
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-blue-400">
          Paires actives :
        </h3>
        <div className="flex flex-wrap gap-2">
          {getActivePairs().map(pair => (
            <button
              key={pair}
              onClick={() => analyzePair(pair)}
              className={`px-4 py-2 bg-blue-500/10 border border-blue-500/20 
                         text-blue-400 rounded-full text-sm font-medium
                         hover:bg-blue-500/20 transition
                         ${selectedPair === pair ? 'ring-2 ring-blue-500' : ''}`}
            >
              {pair}
            </button>
          ))}
        </div>
      </div>

      {(selectedSession || selectedPair) && (
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-blue-400">
              {selectedSession ? `Analyse Session ${selectedSession}` : `Analyse ${selectedPair}`}
            </h3>
            {isAnalyzing && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
          </div>
          <div className="prose prose-invert max-w-none">
            {analysis ? (
              <div dangerouslySetInnerHTML={{ __html: analysis }} />
            ) : (
              <p className="text-gray-400">Analyse en cours...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorldMap;