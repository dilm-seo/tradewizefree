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
  description: string;
  volatility: 'high' | 'medium' | 'low';
}

const TRADING_SESSIONS: Record<string, {
  start: number;
  end: number;
  pairs: string[];
  coordinates: { x: number; y: number; radius: number };
  description: string;
  volatility: 'high' | 'medium' | 'low';
}> = {
  'Sydney': {
    start: 22,
    end: 7,
    pairs: ['AUD/USD', 'NZD/USD', 'AUD/JPY', 'EUR/AUD', 'GBP/AUD'],
    coordinates: { x: 85, y: 80, radius: 20 },
    description: "Session océanique avec focus sur l'AUD et le NZD",
    volatility: 'low'
  },
  'Tokyo': {
    start: 0,
    end: 9,
    pairs: ['USD/JPY', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'CHF/JPY'],
    coordinates: { x: 82, y: 35, radius: 25 },
    description: "Session asiatique dominée par le Yen",
    volatility: 'medium'
  },
  'Londres': {
    start: 8,
    end: 17,
    pairs: ['GBP/USD', 'EUR/GBP', 'EUR/USD', 'GBP/JPY', 'EUR/CHF'],
    coordinates: { x: 48, y: 25, radius: 25 },
    description: "Session européenne la plus volatile",
    volatility: 'high'
  },
  'New York': {
    start: 13,
    end: 22,
    pairs: ['EUR/USD', 'USD/CAD', 'USD/CHF', 'GBP/USD', 'USD/JPY'],
    coordinates: { x: 25, y: 35, radius: 25 },
    description: "Session américaine avec forte liquidité",
    volatility: 'high'
  }
};

const SESSION_PROMPT = `Analysez la session de trading {session} en cours.

Actualités récentes:
{newsContext}

Répondez avec un JSON de cette structure:
{
  "analysis": {
    "pairs": ["EUR/USD", "GBP/USD"],
    "activity": "haute" | "moyenne" | "basse",
    "volatility": "haute" | "moyenne" | "basse",
    "opportunities": [
      {
        "pair": "EUR/USD",
        "type": "breakout" | "range" | "trend",
        "description": "description courte"
      }
    ]
  }
}`;

const PAIR_PROMPT = `Analysez la paire {pair} pendant la session actuelle.

Actualités récentes:
{newsContext}

Répondez avec un JSON de cette structure:
{
  "analysis": {
    "sentiment": "bullish" | "bearish" | "neutral",
    "volatility": "haute" | "moyenne" | "basse",
    "activity": "haute" | "moyenne" | "basse",
    "catalysts": ["raison 1", "raison 2"],
    "risks": ["risque 1", "risque 2"]
  }
}`;

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
        coordinates: session.coordinates,
        description: session.description,
        volatility: session.volatility
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

  const getActiveSessionsInfo = () => {
    const active = activeSessions.filter(session => session.status === 'active');
    if (active.length === 0) return null;

    const descriptions = active.map(session => ({
      name: session.name,
      description: session.description,
      volatility: session.volatility
    }));

    return descriptions;
  };

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const analyzeSession = async (sessionName: string) => {
    if (!settings.apiKey || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setSelectedSession(sessionName);
    setSelectedPair(null);
    setAnalysis(null);

    try {
      const sessionNews = news
        ?.filter(item => {
          const content = (item.title + item.content).toLowerCase();
          const session = TRADING_SESSIONS[sessionName];
          return session.pairs.some(pair => 
            content.includes(pair.toLowerCase().replace('/', ''))
          );
        })
        .slice(0, 3)
        .map(item => item.translatedTitle || item.title);

      if (!sessionNews || sessionNews.length === 0) {
        throw new Error("Aucune actualité pertinente pour cette session");
      }

      const result = await analyzeMarket(SESSION_PROMPT, {
        session: sessionName,
        newsContext: sessionNews.join('\n')
      });

      const parsed = JSON.parse(result);
      const { analysis } = parsed;

      setAnalysis(`
        <div class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div class="p-3 bg-gray-800/50 rounded-lg">
              <div class="text-sm text-gray-400 mb-1">Activité</div>
              <div class="font-medium ${
                analysis.activity === 'haute' ? 'text-red-400' :
                analysis.activity === 'moyenne' ? 'text-yellow-400' :
                'text-green-400'
              }">${analysis.activity.toUpperCase()}</div>
            </div>
            <div class="p-3 bg-gray-800/50 rounded-lg">
              <div class="text-sm text-gray-400 mb-1">Volatilité</div>
              <div class="font-medium ${
                analysis.volatility === 'haute' ? 'text-red-400' :
                analysis.volatility === 'moyenne' ? 'text-yellow-400' :
                'text-green-400'
              }">${analysis.volatility.toUpperCase()}</div>
            </div>
            <div class="p-3 bg-gray-800/50 rounded-lg">
              <div class="text-sm text-gray-400 mb-1">Paires actives</div>
              <div class="font-medium text-blue-400">${analysis.pairs.length}</div>
            </div>
          </div>

          <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-400">Opportunités</h4>
            ${analysis.opportunities.map(opp => `
              <div class="p-3 bg-gray-800/50 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium text-blue-400">${opp.pair}</span>
                  <span class="text-sm ${
                    opp.type === 'breakout' ? 'text-purple-400' :
                    opp.type === 'trend' ? 'text-emerald-400' :
                    'text-yellow-400'
                  }">${opp.type}</span>
                </div>
                <p class="text-sm text-gray-300">${opp.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `);
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
      const pairNews = news
        ?.filter(item => {
          const content = (item.title + item.content).toLowerCase();
          return content.includes(pair.toLowerCase().replace('/', ''));
        })
        .slice(0, 3)
        .map(item => item.translatedTitle || item.title);

      if (!pairNews || pairNews.length === 0) {
        throw new Error("Aucune actualité pertinente pour cette paire");
      }

      const result = await analyzeMarket(PAIR_PROMPT, {
        pair,
        newsContext: pairNews.join('\n')
      });

      const parsed = JSON.parse(result);
      const { analysis } = parsed;

      setAnalysis(`
        <div class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div class="p-3 bg-gray-800/50 rounded-lg">
              <div class="text-sm text-gray-400 mb-1">Sentiment</div>
              <div class="font-medium ${
                analysis.sentiment === 'bullish' ? 'text-emerald-400' :
                analysis.sentiment === 'bearish' ? 'text-red-400' :
                'text-blue-400'
              }">${
                analysis.sentiment === 'bullish' ? 'HAUSSIER' :
                analysis.sentiment === 'bearish' ? 'BAISSIER' :
                'NEUTRE'
              }</div>
            </div>
            <div class="p-3 bg-gray-800/50 rounded-lg">
              <div class="text-sm text-gray-400 mb-1">Volatilité</div>
              <div class="font-medium ${
                analysis.volatility === 'haute' ? 'text-red-400' :
                analysis.volatility === 'moyenne' ? 'text-yellow-400' :
                'text-green-400'
              }">${analysis.volatility.toUpperCase()}</div>
            </div>
            <div class="p-3 bg-gray-800/50 rounded-lg">
              <div class="text-sm text-gray-400 mb-1">Activité</div>
              <div class="font-medium ${
                analysis.activity === 'haute' ? 'text-red-400' :
                analysis.activity === 'moyenne' ? 'text-yellow-400' :
                'text-green-400'
              }">${analysis.activity.toUpperCase()}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <h4 class="text-sm font-medium text-gray-400 mb-2">Catalyseurs</h4>
              <ul class="space-y-1">
                ${analysis.catalysts.map(catalyst => `
                  <li class="text-sm text-emerald-400">• ${catalyst}</li>
                `).join('')}
              </ul>
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-400 mb-2">Risques</h4>
              <ul class="space-y-1">
                ${analysis.risks.map(risk => `
                  <li class="text-sm text-red-400">• ${risk}</li>
                `).join('')}
              </ul>
            </div>
          </div>
        </div>
      `);
    } catch (error) {
      console.error('Error analyzing pair:', error);
      setAnalysis('Erreur lors de l\'analyse de la paire');
    } finally {
      setIsAnalyzing(false);
    }
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

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-blue-400 mb-3">
            Paires actives :
          </h3>
          <div className="flex flex-wrap gap-2">
            {getActivePairs().map(pair => (
              <button
                key={pair}
                onClick={() => analyzePair(pair)}
                className={`px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 
                         border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium
                         transform hover:scale-105 hover:-translate-y-1 transition-all duration-300
                         hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]
                         ${selectedPair === pair ? 'ring-2 ring-blue-500' : ''}`}
              >
                {pair}
              </button>
            ))}
          </div>
        </div>

        {getActiveSessionsInfo() && (
          <div className="p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/20">
            <h3 className="text-sm font-medium text-blue-400 mb-3">
              Sessions actives :
            </h3>
            <div className="space-y-3">
              {getActiveSessionsInfo()?.map(session => (
                <div key={session.name} className="flex items-center justify-between">
                  <div>
                    <span className="text-cyan-400 font-medium">{session.name}</span>
                    <p className="text-sm text-gray-400">{session.description}</p>
                  </div>
                  <span className={`text-sm font-medium ${getVolatilityColor(session.volatility)}`}>
                    Volatilité {session.volatility === 'high' ? 'élevée' : 
                              session.volatility === 'medium' ? 'moyenne' : 'faible'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(selectedSession || selectedPair) && (
          <div className="p-4 bg-gray-800/50 rounded-lg border border-blue-500/20">
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