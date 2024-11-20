import { format, addDays } from 'date-fns';
import type { EconomicEvent } from '../types';

const INVESTING_URL = 'https://www.investing.com/economic-calendar/Service/getCalendarFilteredData';
const FOREXFACTORY_URL = 'https://www.forexfactory.com/calendar.php';
const FXSTREET_URL = 'https://www.fxstreet.com/economic-calendar';

// Fonction pour nettoyer et formater le texte
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// Fonction pour déterminer l'impact
function getImpact(impact: string): 'high' | 'medium' | 'low' {
  impact = impact.toLowerCase();
  if (impact.includes('high') || impact.includes('3') || impact.includes('important')) {
    return 'high';
  }
  if (impact.includes('medium') || impact.includes('2') || impact.includes('moderate')) {
    return 'medium';
  }
  return 'low';
}

async function fetchInvestingCalendar(startDate: Date): Promise<EconomicEvent[]> {
  try {
    const response = await fetch(INVESTING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0'
      },
      body: `dateFrom=${format(startDate, 'yyyy-MM-dd')}&dateTo=${format(addDays(startDate, 7), 'yyyy-MM-dd')}&currentTab=custom&limit_from=0`
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Investing.com data');
    }

    const data = await response.json();
    return data.data.map((event: any) => ({
      date: event.date,
      time: event.time,
      currency: event.currency,
      impact: getImpact(event.impact),
      event: cleanText(event.event),
      actual: event.actual,
      forecast: event.forecast,
      previous: event.previous
    }));
  } catch (error) {
    console.error('Error fetching from Investing.com:', error);
    return [];
  }
}

async function fetchForexFactoryCalendar(startDate: Date): Promise<EconomicEvent[]> {
  try {
    const response = await fetch(`${FOREXFACTORY_URL}?day=${format(startDate, 'MMM+dd,+yyyy')}`, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ForexFactory data');
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const events: EconomicEvent[] = [];

    doc.querySelectorAll('.calendar__row').forEach(row => {
      const event: EconomicEvent = {
        date: row.querySelector('.calendar__date')?.textContent || format(startDate, 'yyyy-MM-dd'),
        time: row.querySelector('.calendar__time')?.textContent || '',
        currency: row.querySelector('.calendar__currency')?.textContent || '',
        impact: getImpact(row.querySelector('.calendar__impact')?.className || ''),
        event: cleanText(row.querySelector('.calendar__event')?.textContent || ''),
        actual: row.querySelector('.calendar__actual')?.textContent || '',
        forecast: row.querySelector('.calendar__forecast')?.textContent || '',
        previous: row.querySelector('.calendar__previous')?.textContent || ''
      };

      if (event.currency && event.event) {
        events.push(event);
      }
    });

    return events;
  } catch (error) {
    console.error('Error fetching from ForexFactory:', error);
    return [];
  }
}

async function fetchFxStreetCalendar(startDate: Date): Promise<EconomicEvent[]> {
  try {
    const response = await fetch(`${FXSTREET_URL}/ajax/GetEconomicCalendarData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        dateFrom: format(startDate, 'yyyy-MM-dd'),
        dateTo: format(addDays(startDate, 7), 'yyyy-MM-dd'),
        timeZoneOffset: new Date().getTimezoneOffset()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch FxStreet data');
    }

    const data = await response.json();
    return data.map((event: any) => ({
      date: format(new Date(event.date), 'yyyy-MM-dd'),
      time: format(new Date(event.date), 'HH:mm'),
      currency: event.currency,
      impact: getImpact(event.importance),
      event: cleanText(event.name),
      actual: event.actual,
      forecast: event.forecast,
      previous: event.previous
    }));
  } catch (error) {
    console.error('Error fetching from FxStreet:', error);
    return [];
  }
}

// Fonction pour fusionner et dédupliquer les événements
function mergeEvents(eventArrays: EconomicEvent[][]): EconomicEvent[] {
  const eventMap = new Map<string, EconomicEvent>();

  eventArrays.flat().forEach(event => {
    const key = `${event.date}-${event.time}-${event.currency}-${event.event}`;
    if (!eventMap.has(key) || event.actual) {
      eventMap.set(key, event);
    }
  });

  return Array.from(eventMap.values()).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
  });
}

export async function fetchEconomicCalendar(startDate: Date): Promise<EconomicEvent[]> {
  try {
    const [investingEvents, forexFactoryEvents, fxStreetEvents] = await Promise.all([
      fetchInvestingCalendar(startDate),
      fetchForexFactoryCalendar(startDate),
      fetchFxStreetCalendar(startDate)
    ]);

    return mergeEvents([investingEvents, forexFactoryEvents, fxStreetEvents]);
  } catch (error) {
    console.error('Error fetching economic calendar:', error);
    return [];
  }
}