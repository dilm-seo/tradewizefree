import React from 'react';
import { Calendar } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function EconomicCalendar() {
  const { settings } = useSettings();

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Calendrier Économique</h2>
        <Calendar className="h-6 w-6 text-blue-400" />
      </div>

      <div className="relative w-full overflow-hidden rounded-lg border border-blue-500/20 bg-[#06144d]">
        <iframe
          src="https://sslecal2.investing.com?ecoDayBackground=%2306144d&defaultFont=%23000000&innerBorderColor=%230d1b3e&borderColor=%230d1b3e&columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=110,17,25,34,32,6,37,26,5,22,39,93,14,48,10,35,105,43,38,4,36,12,72&calType=week&timeZone=58&lang=5&importance=2,3&contentFont=%23000000&titleFont=%23000000"
          width="100%"
          height="600"
          frameBorder="0"
          allowTransparency={true}
          className="transform scale-100 hover:scale-[1.02] transition-transform duration-300"
        />
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-400">
          Calendrier économique fourni par{' '}
          <a
            href="https://fr.investing.com/"
            rel="nofollow"
            target="_blank"
            className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Investing.com France
          </a>
        </p>
      </div>
    </div>
  );
}