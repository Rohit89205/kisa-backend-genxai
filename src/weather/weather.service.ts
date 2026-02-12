import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { addDays, formatISO } from 'date-fns';

/* ================= TYPES ================= */

type FarmingAdvisory = {
  label: 'FAVORABLE' | 'CAUTION ADVISED' | 'UNFAVORABLE' | 'SEVERE RISK';
  title: string;
  message: string;
  advice: string[];
};

type TemperatureTrend = {
  trend: 'RISING' | 'FALLING' | 'STABLE';
  change: number;
};

/* ================= AGRICULTURAL LIMITS ================= */

const AGRI_LIMITS = {
  TEMP: {
    OPTIMAL_MIN: 15,
    OPTIMAL_MAX: 32,
    HEAT_STRESS: 38,
    HEAT_SEVERE: 42,
  },
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
  private readonly DEFAULT_TIMEZONE = 'UTC';
  private readonly DEFAULT_LATITUDE = 20.5937; // India center
  private readonly DEFAULT_LONGITUDE = 78.9629; // India center

  /* ======================================================
     MAIN WEATHER ANALYTICS (UI CONSUMES THIS)
     ====================================================== */

  async getWeatherOverview(opts: {
    latitude?: number;
    longitude?: number;
    timezone?: string;
  }) {
    const data = await this.fetchPointWeather(
      opts.latitude ?? this.DEFAULT_LATITUDE,
      opts.longitude ?? this.DEFAULT_LONGITUDE,
      opts.timezone ?? this.DEFAULT_TIMEZONE,
    );

    const dailyAverages = this.computeDailyAverages(data.hourly);

    const forecast7d = this.build7DayForecast(
      data.daily,
      dailyAverages.slice(0, 7),
    );

    const trend7d = this.buildTrend(forecast7d);
    const trend30d = this.buildTrend(dailyAverages.slice(-30));

    const tempTrend = this.calculateTemperatureTrend(
      trend30d.avgTemp,
    );

    const advisory = this.evaluateAdvancedAdvisory(
      data.current,
      forecast7d.map(d => d.maxTemp),
      tempTrend,
    );

    return {
      location: {
        latitude: opts.latitude,
        longitude: opts.longitude,
        timezone: data.timezone,
      },

      current: data.current,

      forecast7d,
      trend7d,
      trend30d,

      temperatureTrend: tempTrend,
      advisory,

      generatedAt: new Date().toISOString(),
    };
  }

  /* ================= OPEN-METEO FETCH ================= */

  private async fetchPointWeather(
    lat: number,
    lon: number,
    timezone: string,
  ) {
    const today = new Date();
    const startDate = formatISO(addDays(today, -30), { representation: 'date' });
    const endDate = formatISO(addDays(today, 7), { representation: 'date' });

    const url =
      `${this.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&start_date=${startDate}&end_date=${endDate}` +
      `&timezone=${encodeURIComponent(timezone)}`;

    const res = await axios.get(url, { timeout: 15000 });
    const p = res.data;

    const idx = p.hourly.time.length - 1;

    return {
      timezone: p.timezone,

      current: {
        time: p.hourly.time[idx],
        temperature: p.hourly.temperature_2m[idx],
        humidity: p.hourly.relativehumidity_2m[idx],
        rain: p.hourly.precipitation[idx],
        wind: p.hourly.windspeed_10m[idx],
      },

      hourly: p.hourly,
      daily: p.daily,
    };
  }

  /* ================= DAILY AVERAGES ================= */

  private computeDailyAverages(hourly: any) {
    const map: Record<string, any> = {};

    hourly.time.forEach((t: string, i: number) => {
      const date = t.split('T')[0];

      if (!map[date]) {
        map[date] = { temp: [], humidity: [], rain: [] };
      }

      map[date].temp.push(hourly.temperature_2m[i]);
      map[date].humidity.push(hourly.relativehumidity_2m[i]);
      map[date].rain.push(hourly.precipitation[i]);
    });

    return Object.entries(map).map(([date, v]: any) => ({
      date,
      avgTemp: avg(v.temp),
      avgHumidity: avg(v.humidity),
      rain: sum(v.rain),
    }));
  }

  /* ================= 7 DAY FORECAST ================= */

  private build7DayForecast(daily: any, avg: any[]) {
    return avg.map((d, i) => ({
      date: d.date,
      minTemp: daily.temperature_2m_min[i],
      maxTemp: daily.temperature_2m_max[i],
      avgTemp: d.avgTemp,
      avgHumidity: d.avgHumidity,
      rain: d.rain,
    }));
  }

  /* ================= TREND BUILDER ================= */

  private buildTrend(days: any[]) {
    return {
      avgTemp: days.map(d => d.avgTemp),
      rain: days.map(d => d.rain),
      humidity: days.map(d => d.avgHumidity),
    };
  }

  /* ================= TEMP TREND ================= */

  private calculateTemperatureTrend(temps: number[]): TemperatureTrend {
    const first = temps[0];
    const last = temps[temps.length - 1];
    const change = +(last - first).toFixed(2);

    if (change > 1.5) return { trend: 'RISING', change };
    if (change < -1.5) return { trend: 'FALLING', change };
    return { trend: 'STABLE', change };
  }

  /* ================= ADVISORY ================= */

  private evaluateAdvancedAdvisory(
    current: any,
    forecastMax: number[],
    trend: TemperatureTrend,
  ): FarmingAdvisory {
    const peak = Math.max(...forecastMax);

    if (peak >= AGRI_LIMITS.TEMP.HEAT_SEVERE) {
      return {
        label: 'SEVERE RISK',
        title: '🔥 Extreme Heat Ahead',
        message: 'Severe heat expected in coming days.',
        advice: ['Increase irrigation', 'Avoid daytime field work'],
      };
    }

    if (trend.trend === 'RISING' && peak >= AGRI_LIMITS.TEMP.HEAT_STRESS) {
      return {
        label: 'UNFAVORABLE',
        title: '🔥 Heat Stress Building',
        message: 'Temperature trend indicates upcoming heat stress.',
        advice: ['Monitor soil moisture', 'Avoid spraying'],
      };
    }

    if (
      current.temperature >= AGRI_LIMITS.TEMP.OPTIMAL_MIN &&
      current.temperature <= AGRI_LIMITS.TEMP.OPTIMAL_MAX
    ) {
      return {
        label: 'FAVORABLE',
        title: '🌤️ Favorable Conditions',
        message: 'Weather conditions are suitable for farming.',
        advice: ['Proceed with field activities'],
      };
    }
    if (current.rain > 50) {
      return {
        label: 'UNFAVORABLE',
        title: '🌧️ Heavy Rainfall',
        message: 'Heavy rainfall expected.',
        advice: ['Ensure drainage', 'Avoid irrigation'],
      };
    }

    if (current.wind > 30) {
      return {
        label: 'CAUTION ADVISED',
        title: '💨 Strong Winds',
        message: 'Strong winds predicted.',
        advice: ['Avoid pesticide spraying'],
      };
    }
    if (current.temperature < 10) {
      return {
        label: 'UNFAVORABLE',
        title: '❄ Cold Stress',
        message: 'Low temperature may affect crops.',
        advice: ['Use mulching', 'Irrigate lightly'],
      };
    }

    return {
      label: 'CAUTION ADVISED',
      title: '⚠️ Mixed Conditions',
      message: 'Weather conditions need monitoring.',
      advice: ['Stay alert', 'Monitor crops closely'],
    };
  }
}

/* ================= HELPERS ================= */

const avg = (arr: number[]) =>
  +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

const sum = (arr: number[]) =>
  +arr.reduce((a, b) => a + b, 0).toFixed(1);
