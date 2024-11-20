import React, { useState, useEffect } from 'react';
import { AlertTriangle, XCircle, Info, CheckCircle, Clock, Trash2, Download, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Log {
  id: string;
  timestamp: number;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  source: string;
  details?: string;
}

// Système de gestion des logs
const LogManager = {
  storageKey: 'tradewise_logs',
  maxLogs: 1000, // Limite de logs stockés

  getLogs(): Log[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading logs:', error);
      return [];
    }
  },

  saveLogs(logs: Log[]): void {
    try {
      // Garder uniquement les 1000 derniers logs
      const trimmedLogs = logs.slice(-this.maxLogs);
      localStorage.setItem(this.storageKey, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  },

  addLog(log: Log): void {
    const currentLogs = this.getLogs();
    const newLogs = [...currentLogs, log];
    this.saveLogs(newLogs);
  },

  clearLogs(): void {
    localStorage.removeItem(this.storageKey);
  }
};

// Hook personnalisé pour la gestion des logs
function useLogs() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    // Charger les logs au démarrage
    setLogs(LogManager.getLogs());

    // Intercepter les erreurs console
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : arg
      ).join(' ');

      const log: Log = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        type: 'error',
        message: message.slice(0, 200), // Limiter la longueur
        source: 'Console',
      };

      LogManager.addLog(log);
      setLogs(LogManager.getLogs());
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      const log: Log = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        type: 'warning',
        message: message.slice(0, 200),
        source: 'Console',
      };

      LogManager.addLog(log);
      setLogs(LogManager.getLogs());
      originalWarn.apply(console, args);
    };

    console.info = (...args: any[]) => {
      const message = args.join(' ');
      const log: Log = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        type: 'info',
        message: message.slice(0, 200),
        source: 'Console',
      };

      LogManager.addLog(log);
      setLogs(LogManager.getLogs());
      originalInfo.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  const addLog = (log: Omit<Log, 'id' | 'timestamp'>) => {
    const newLog: Log = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    LogManager.addLog(newLog);
    setLogs(LogManager.getLogs());
  };

  const clearLogs = () => {
    LogManager.clearLogs();
    setLogs([]);
  };

  return { logs, addLog, clearLogs };
}

export default function LogsViewer() {
  const { logs, clearLogs } = useLogs();
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info' | 'success'>('all');
  const [search, setSearch] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  useEffect(() => {
    if (isAutoScroll) {
      const container = document.getElementById('logs-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [logs, isAutoScroll]);

  const getIcon = (type: Log['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getLogClass = (type: Log['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const filteredLogs = logs
    .filter(log => filter === 'all' || log.type === filter)
    .filter(log => 
      search === '' || 
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.source.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()))
    );

  const handleExportLogs = () => {
    const exportData = logs.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp).toISOString()
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradewise-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Logs Système</h2>
          <p className="text-sm text-gray-400">
            {filteredLogs.length} entrées
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExportLogs}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 
                     rounded-lg hover:bg-blue-500/30 transition"
          >
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 
                     rounded-lg hover:bg-red-500/30 transition"
          >
            <Trash2 className="h-4 w-4" />
            <span>Effacer</span>
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg 
                       text-sm focus:outline-none focus:border-blue-500 transition w-64"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition
                ${filter === 'all' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-blue-400'}`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition
                ${filter === 'error' 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'text-gray-400 hover:text-red-400'}`}
            >
              Erreurs
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition
                ${filter === 'warning' 
                  ? 'bg-yellow-500/20 text-yellow-400' 
                  : 'text-gray-400 hover:text-yellow-400'}`}
            >
              Alertes
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`text-sm font-medium transition
                ${isAutoScroll ? 'text-blue-400' : 'text-gray-400'}`}
            >
              Auto-scroll
            </button>
          </div>
        </div>
      </div>

      <div 
        id="logs-container"
        className="h-[600px] overflow-y-auto space-y-2 p-4 bg-gray-900/50 rounded-lg"
      >
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className={`p-3 rounded-lg border ${getLogClass(log.type)} transition hover:scale-[1.01]`}
          >
            <div className="flex items-start space-x-3">
              {getIcon(log.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate">{log.message}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                    {format(log.timestamp, 'HH:mm:ss')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{log.source}</span>
                  {log.details && (
                    <span className="text-sm text-gray-400 truncate ml-4">
                      {log.details}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            Aucun log à afficher
          </div>
        )}
      </div>
    </div>
  );
}