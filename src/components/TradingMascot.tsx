export default function TradingMascot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<
    Array<{
      symbol: string;
      direction: "buy" | "sell";
      timing: string;
      volatility: string;
      duration: string;
      analysis: string;
    }> | null
  >(null);

  const generateAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      // Exemple de réponse fictive pour démonstration
      const fakeResponse = [
        {
          symbol: "XAUUSD",
          direction: "buy",
          timing: "immediate",
          volatility: "high",
          duration: "short-term",
          analysis: "Gold is gaining momentum due to recent dollar weakness."
        },
        {
          symbol: "EURUSD",
          direction: "sell",
          timing: "next hour",
          volatility: "medium",
          duration: "mid-term",
          analysis: "Euro is under pressure after disappointing economic data."
        }
      ];

      // Simuler une analyse
      setTimeout(() => {
        setAnalysis(fakeResponse);
        setIsAnalyzing(false);
      }, 2000);
    } catch (error) {
      console.error("Erreur d'analyse :", error);
      setAnalysis(null);
      setIsAnalyzing(false);
    }
  };

  const toggleAnalysis = () => {
    if (!isOpen) generateAnalysis();
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Bouton de la mascotte */}
      <button
        onClick={toggleAnalysis}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 
                   rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 
                   transition-all duration-300 z-50 group animate-bounce hover:animate-none"
      >
        <Bot className="w-6 h-6 text-white" />
      </button>

      {/* Modal pour afficher les résultats */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 
                          rounded-lg shadow-2xl w-full max-w-lg transform transition-all
                          border border-blue-500/20 backdrop-blur-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Assistant Trading</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-blue-400">Analyse en cours...</p>
                  </div>
                ) : analysis ? (
                  <div className="grid gap-4">
                    {analysis.map((signal, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <h4 className="text-xl font-bold text-blue-400">
                          {signal.symbol}
                        </h4>
                        <p className="text-sm text-gray-400">
                          Direction:{" "}
                          <span
                            className={`font-semibold ${
                              signal.direction === "buy"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {signal.direction.toUpperCase()}
                          </span>
                        </p>
                        <p className="text-sm text-gray-400">
                          Timing: <span className="font-medium">{signal.timing}</span>
                        </p>
                        <p className="text-sm text-gray-400">
                          Volatilité:{" "}
                          <span className="font-medium">{signal.volatility}</span>
                        </p>
                        <p className="text-sm text-gray-400">
                          Durée: <span className="font-medium">{signal.duration}</span>
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          Analyse:{" "}
                          <span className="text-gray-300">{signal.analysis}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    Aucune donnée disponible pour l'instant.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
