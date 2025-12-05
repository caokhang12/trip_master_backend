import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DestinationEntity } from '../schemas/destination.entity';
import { ResolveDestinationDto } from './dto/resolve-destination.dto';
import { PlacesService } from '../integrations/google-maps/services/places.service';
import { GeocodingService } from '../integrations/google-maps/services/geocoding.service';
import {
  PlaceDetailsResult,
  GeocodingResult,
} from '../integrations/google-maps/types';

@Injectable()
export class DestinationService {
  private readonly logger = new Logger(DestinationService.name);

  constructor(
    @InjectRepository(DestinationEntity)
    private readonly destRepo: Repository<DestinationEntity>,
    private readonly placesService: PlacesService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async resolve(dto: ResolveDestinationDto): Promise<DestinationEntity | null> {
    // 1. If client provided placeId and destination exists, return it
    if (dto.placeId) {
      const existing = await this.destRepo.findOne({
        where: { placeId: dto.placeId },
      });
      if (existing) return existing;
    }

    // 2. If client provided primaryDestinationId (not in DTO here) we'd handle it elsewhere

    // 3. If client provided coords/name/country, try to find by proximity or name
    if (dto.lat && dto.lng) {
      // Simple proximity search: find destinations within ~100m using ST_DWithin
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const rows = await this.destRepo.query(
        `SELECT * FROM destinations WHERE ST_DWithin(coordinates, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3) LIMIT 1`,
        [dto.lng, dto.lat, 100],
      );
      if (Array.isArray(rows) && rows.length > 0)
        return rows[0] as DestinationEntity;
    }

    // 4. If createIfNotFound is false, return null
    if (!dto.createIfNotFound) return null;

    // 5. Attempt to get place details from Google (if placeId provided)
    let placeDetails: PlaceDetailsResult | null = null;
    if (dto.placeId) {
      try {
        placeDetails = await this.placesService.getPlaceDetails(dto.placeId);
      } catch (e) {
        this.logger.warn(
          `PlacesService failed for ${dto.placeId}: ${(e as Error).message}`,
        );
      }
    }

    // 6. If we don't have lat/lng yet, try geocoding by address
    let lat = dto.lat;
    let lng = dto.lng;
    let name = dto.name;
    let country = dto.country;
    let countryCode = dto.countryCode;
    let city = dto.city;
    let province = dto.province;

    if (placeDetails) {
      name = name || placeDetails.name || placeDetails.formattedAddress || '';
      lat = lat ?? placeDetails.location?.lat;
      lng = lng ?? placeDetails.location?.lng;
      // Try to geocode formatted address to get address components
      try {
        const g: GeocodingResult | null = await this.geocodingService.geocode(
          placeDetails.formattedAddress || name,
        );
        if (g) {
          country =
            country ||
            g.addressComponents?.find((c) => c.types?.includes('country'))
              ?.longName;
          countryCode =
            countryCode ||
            g.addressComponents?.find((c) => c.types?.includes('country'))
              ?.shortName;
          city =
            city ||
            g.addressComponents?.find((c) => c.types?.includes('locality'))
              ?.longName;
          province =
            province ||
            g.addressComponents?.find((c) =>
              c.types?.includes('administrative_area_level_1'),
            )?.longName;
        }
      } catch (e) {
        this.logger.warn(
          `Geocoding failed when resolving ${dto.placeId}: ${(e as Error).message}`,
        );
      }
    }

    // 7. If still missing required fields (country/countryCode/coords/name), try best-effort but require coords and country
    if (!lat || !lng) {
      this.logger.warn('Insufficient coordinates to create Destination');
      return null;
    }
    if (!country || !countryCode) {
      // allow creation with unknown country, but prefer country code
      country = country || 'Unknown';
      countryCode = countryCode || 'XX';
    }
    name = name || 'Unknown place';

    // 8. Insert using PostGIS ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    const insertSql = `
      INSERT INTO destinations (id, name, country, country_code, city, province, coordinates, description, image_urls, created_at, updated_at, place_id)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9, now(), now(), $10)
      RETURNING *
    `;

    const imgs = placeDetails?.photos?.length
      ? placeDetails.photos.map((p) => p.photoReference)
      : null;
    const desc =
      placeDetails?.vicinity || placeDetails?.formattedAddress || undefined;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const res = await this.destRepo.query(insertSql, [
      name,
      country,
      countryCode,
      city || null,
      province || null,
      lng,
      lat,
      desc || null,
      imgs || null,
      dto.placeId || null,
    ]);

    if (Array.isArray(res) && res.length > 0) {
      return res[0] as DestinationEntity;
    }
    return null;
  }
}
