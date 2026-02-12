import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeocodingService {
  constructor(private readonly http: HttpService) {}

  /**
   * City / free-text → latitude & longitude
   */
  async geocodeCity(rawQuery: string) {
    const url = 'https://geocoding-api.open-meteo.com/v1/search';

    const parts = rawQuery
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    const candidates: string[] = [];

    if (rawQuery && !candidates.includes(rawQuery)) {
      candidates.push(rawQuery);
    }

    if (parts[0] && !candidates.includes(parts[0])) {
      candidates.push(parts[0]);
    }

    if (parts.length >= 2) {
      const cityCountry = `${parts[0]}, ${parts[parts.length - 1]}`;
      if (!candidates.includes(cityCountry)) {
        candidates.push(cityCountry);
      }
    }

    for (const name of candidates) {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: {
            name,
            count: 1,
            language: 'en',
            format: 'json',
          },
        }),
      );

      if (data?.results?.length > 0) {
        const r = data.results[0];

        return {
          latitude: r.latitude,
          longitude: r.longitude,
          displayName: [r.name, r.admin1, r.country]
            .filter(Boolean)
            .join(', '),
        };
      }
    }

    throw new NotFoundException(`No location found for: ${rawQuery}`);
  }

  /**
   * NEW METHOD (IMPORTANT)
   * Latitude & longitude → state & district
   * Used for polygon → market region mapping
   */
  async reverseGeocode(lat: number, lng: number) {
    const url = 'https://nominatim.openstreetmap.org/reverse';

    const { data } = await firstValueFrom(
      this.http.get(url, {
        params: {
          lat,
          lon: lng,
          format: 'json',
        },
        headers: {
          // REQUIRED by OpenStreetMap policy
          'User-Agent': 'Kisan-Sathi-App/1.0',
        },
      }),
    );

    const address = data?.address;
    if (!address) {
      throw new NotFoundException(
        `No address found for coordinates: ${lat}, ${lng}`,
      );
    }

    return {
      state: address.state || null,
      district:
        address.district ||
        address.county ||
        address.state_district ||
        null,
      country: address.country || null,
      displayName: data.display_name || null,
    };
  }
}
