import type { JSONSchemaType } from 'ajv';
import type { GeneratedItinerary } from 'src/ai/dto/generated-itinerary.dto';

export const generateItinerarySchema: JSONSchemaType<GeneratedItinerary> = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dayNumber: { type: 'number' },
          date: { type: 'string', nullable: true },
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                time: { type: 'string', nullable: true },
                title: { type: 'string' },
                description: { type: 'string', nullable: true },
                durationMinutes: { type: 'number', nullable: true },
                cost: { type: 'number', nullable: true },
                currency: { type: 'string', nullable: true },
                poi: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    placeId: { type: 'string' },
                    name: { type: 'string' },
                    formattedAddress: { type: 'string' },
                    location: {
                      type: 'object',
                      properties: {
                        lat: { type: 'number' },
                        lng: { type: 'number' },
                      },
                      required: ['lat', 'lng'],
                      additionalProperties: true,
                    },
                    rating: { type: 'number', nullable: true },
                    userRatingsTotal: { type: 'number', nullable: true },
                    priceLevel: { type: 'number', nullable: true },
                    types: {
                      type: 'array',
                      nullable: true,
                      items: { type: 'string' },
                    },
                    openingHours: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        openNow: { type: 'boolean', nullable: true },
                        weekdayText: {
                          type: 'array',
                          nullable: true,
                          items: { type: 'string' },
                        },
                      },
                      required: [],
                      additionalProperties: true,
                    },
                  },
                  required: ['placeId', 'name', 'formattedAddress', 'location'],
                  additionalProperties: true,
                },
              },
              required: ['title'],
              additionalProperties: true,
            },
          },
        },
        required: ['dayNumber', 'activities'],
        additionalProperties: true,
      },
    },
    totalCost: { type: 'number', nullable: true },
    currency: { type: 'string', nullable: true },
    notes: {
      type: 'array',
      nullable: true,
      items: { type: 'string' },
    },
  },
  required: ['days'],
  additionalProperties: true,
};
