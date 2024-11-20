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

const SESSION_ANALYSIS_PROMPT = `En tant qu'analyste forex spécialisé dans la session de trading {session}, analysez les actualités suivantes pour identifier les opportunités spécifiques à cette période de marché.

Actualités de la session :
{newsContext}

Instructions d'analyse :
1. Identifiez les actualités pertinentes pour la session {session}
2. Évaluez l'impact sur les paires de devises typiques de cette session
3. Déterminez les mouvements probables pendant les heures de trading
4. Suggérez des points d'attention particuliers

Format : Réponse concise focalisée sur les opportunités immédiates.`;

const PAIR_ANALYSIS_PROMPT = `En tant qu'analyste forex spécialisé sur {pair}, analysez le sentiment fondamental actuel basé sur les actualités récentes.

Actualités récentes :
{newsContext}

Instructions d'analyse :
1. Identifiez les facteurs fondamentaux impactant {pair}
2. Évaluez le sentiment général (bullish/bearish/neutre)
3. Déterminez les niveaux de volatilité attendus
4. Suggérez des points d'attention particuliers

Format : Réponse concise focalisée sur le sentiment actuel.`;

export default function WorldMap() {
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
      const session = TRADING_SESSIONS[sessionName];
      const sessionStart = session.start;
      const sessionEnd = session.end;
      
      // Filtrer les news pertinentes pour la session
      const sessionNews = news?.filter(item => {
        const newsHour = new Date(item.pubDate).getHours();
        if (sessionStart < sessionEnd) {
          return newsHour >= sessionStart && newsHour < sessionEnd;
        } else {
          return newsHour >= sessionStart || newsHour < sessionEnd;
        }
      });

      const newsContext = sessionNews
        ?.slice(0, 5)
        .map(item => `- ${item.translatedTitle || item.title}`)
        .join('\n') || 'Aucune actualité récente';

      const result = await analyzeMarket(SESSION_ANALYSIS_PROMPT, {
        session: sessionName,
        newsContext
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
      const relevantNews = news?.filter(item => 
        item.title.includes(pair) || 
        item.content.includes(pair) ||
        pair.split('/').some(currency => 
          item.title.includes(currency) || 
          item.content.includes(currency)
        )
      );

      const newsContext = relevantNews
        ?.slice(0, 5)
        .map(item => `- ${item.translatedTitle || item.title}`)
        .join('\n') || 'Aucune actualité récente';

      const result = await analyzeMarket(PAIR_ANALYSIS_PROMPT, {
        pair,
        newsContext
      });

      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing pair:', error);
      setAnalysis('Erreur lors de l\'analyse de la paire');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-xl p-6 backdrop-blur-sm border border-blue-500/20 shadow-2xl transform transition-all duration-500 hover:scale-[1.02]">
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
          {/* Interactive background effects */}
          <div 
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.15),transparent_70%)] transition-transform duration-300"
            style={{
              transform: `translate(${(mousePosition.x - 50) * 0.1}px, ${(mousePosition.y - 50) * 0.1}px)`
            }}
          />
          <div 
            className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(6,182,212,0.15),transparent_70%)] transition-transform duration-300"
            style={{
              transform: `translate(${(mousePosition.x - 50) * 0.15}px, ${(mousePosition.y - 50) * 0.15}px)`
            }}
          />

          {/* Animated grid with parallax effect */}
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:4%_4%] transition-transform duration-300"
              style={{
                transform: `translate(${(mousePosition.x - 50) * 0.05}px, ${(mousePosition.y - 50) * 0.05}px)`
              }}
            >
              <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.05),transparent_60%)]" />
            </div>
          </div>

          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-400/20 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${5 + Math.random() * 5}s`
                }}
              />
            ))}
          </div>

          {/* Trading Sessions Markers */}
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
              {/* Enhanced pulse animation for active sessions */}
              {session.status === 'active' && (
                <>
                  <div className="absolute inset-0 -m-8 animate-ping rounded-full bg-blue-500/20" />
                  <div className="absolute inset-0 -m-6 animate-pulse rounded-full bg-blue-400/20" />
                  <div className="absolute inset-0 -m-4 animate-pulse rounded-full bg-cyan-400/20" />
                </>
              )}
              
              {/* Session marker with interactive effects */}
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
              
              {/* Enhanced tooltip with 3D effect */}
              <div
                className={`
                  absolute top-full left-1/2 -translate-x-1/2 mt-2
                  px-4 py-2 rounded-lg
                  bg-gradient-to-r from-blue-900/90 to-gray-900/90 backdrop-blur-md
                  border border-blue-500/20
                  shadow-[0_0_20px_rgba(59,130,246,0.3)]
                  transform perspective-1000
                  transition-all duration-300
                  ${hoveredSession === session.name 
                    ? 'opacity-100 translate-y-0 rotateX-0'
                    : 'opacity-0 -translate-y-2 rotateX-90'}
                `}
              >
                <p className="whitespace-nowrap text-blue-400 font-medium">{session.name}</p>
                <p className="text-xs text-cyan-400/80">
                  {TRADING_SESSIONS[session.name].start}:00 - {TRADING_SESSIONS[session.name].end}:00
                </p>
              </div>
            </div>
          ))}

          {/* Enhanced connection lines with gradient and glow */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(59,130,246,0.4)" />
                <stop offset="100%" stopColor="rgba(6,182,212,0.4)" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {activeSessions
              .filter(session => session.status === 'active')
              .map((session, i, arr) => {
                if (i === arr.length - 1) return null;
                const next = arr[i + 1];
                return (
                  <g key={`${session.name}-${next.name}`} filter="url(#glow)">
                    <line
                      x1={`${session.coordinates.x}%`}
                      y1={`${session.coordinates.y}%`}
                      x2={`${next.coordinates.x}%`}
                      y2={`${next.coordinates.y}%`}
                      stroke="url(#lineGradient)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="8"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    </line>
                    <line
                      x1={`${session.coordinates.x}%`}
                      y1={`${session.coordinates.y}%`}
                      x2={`${next.coordinates.x}%`}
                      y2={`${next.coordinates.y}%`}
                      stroke="rgba(59,130,246,0.1)"
                      strokeWidth="4"
                      className="blur-[4px]"
                    />
                  </g>
                );
              })}
          </svg>
        </div>
      </div>

      {/* Active pairs display with enhanced styling */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-blue-400">
          Paires actives :
        </h3>
        <div className="flex flex-wrap gap-2">
          {getActivePairs().map(pair => (
            <button
              key={pair}
              onClick={() => analyzePair(pair)}
              className={`px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 
                         border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium
                         shadow-[0_0_15px_rgba(59,130,246,0.2)]
                         transform hover:scale-105 hover:-translate-y-1 transition-all duration-300
                         hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]
                         ${selectedPair === pair ? 'ring-2 ring-blue-500' : ''}`}
            >
              {pair}
            </button>
          ))}
        </div>
      </div>

      {/* Session status grid with enhanced styling */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {activeSessions.map(session => (
          <button
            key={session.name}
            onClick={() => analyzeSession(session.name)}
            className={`
              p-4 rounded-lg border transition-all duration-500
              ${session.status === 'active'
                ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/30 hover:border-gray-600/50'}
              transform hover:scale-[1.02] hover:-translate-y-0.5
              ${selectedSession === session.name ? 'ring-2 ring-blue-500' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-blue-400">{session.name}</span>
              <div className={`w-2 h-2 rounded-full ${session.color} shadow-[0_0_10px_rgba(59,130,246,0.5)]`} />
            </div>
            <div className="text-xs text-cyan-400/80">
              {TRADING_SESSIONS[session.name].start}:00 - {TRADING_SESSIONS[session.name].end}:00
            </div>
          </button>
        ))}
      </div>

      {/* Analysis Modal */}
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

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-10px) translateX(5px);
          }
          50% {
            transform: translateY(0) translateX(10px);
          }
          75% {
            transform: translateY(10px) translateX(5px);
          }
        }

        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}