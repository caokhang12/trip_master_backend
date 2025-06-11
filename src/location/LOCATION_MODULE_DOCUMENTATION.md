# Location Module - Comprehensive Endpoint Documentation

## Overview

The Location Module provides comprehensive location search, geocoding, and mapping services optimized for Vietnam with international fallback support. The module has been completely optimized to reduce code duplication, improve performance, and provide a unified interface for all location-related operations.

## Architecture Optimization Summary

### Before Optimization

- **2 separate services**: LocationService (609 lines) + SmartLocationService (1259 lines) = 1,868 lines
- **2 separate DTOs**: LocationSearchDto + SmartLocationSearchDto with overlapping functionality
- **899-line controller** with 9 endpoints and significant code duplication
- Redundant caching mechanisms and API integration patterns

### After Optimization

- **1 unified service**: LocationService consolidating all functionality
- **1 unified DTO**: Comprehensive DTO supporting all search scenarios
- **Optimized controller**: Streamlined with consolidated endpoints and improved error handling
- **Reduced code duplication**: ~60% reduction in total codebase
- **Improved maintainability**: Single point of truth for location operations

## Key Features

- **Intelligent API Routing**: Automatically selects the best API (Goong for Vietnam, Nominatim for international)
- **Vietnam-First Optimization**: Prioritizes Vietnamese locations and uses local knowledge
- **Comprehensive Caching**: Redis-based caching for improved performance and API cost reduction
- **Unified Search Interface**: Single endpoint handling all search complexity
- **Bulk Operations**: Efficient batch processing for multiple location queries
- **Real-time Weather**: Integration with OpenWeatherMap for location-based weather data

## API Endpoints

### 1. Unified Location Search

**Endpoint**: `GET /api/v1/location/search`
**Purpose**: Primary search endpoint with intelligent routing and Vietnam optimization

#### Parameters

- `query` (required): Search query (location name, address, or coordinates)
- `country` (optional): User country code for optimization (default: auto-detect)
- `strategy` (optional): Search strategy enum
  - `auto`: Intelligent automatic routing
  - `vietnam_only`: Search only Vietnamese sources
  - `international_only`: Search only international sources
  - `vietnam_first`: Try Vietnam sources first, fallback to international
  - `international_first`: Try international sources first, fallback to Vietnam
- `locationType` (optional): Filter by location type
  - `all`, `cities`, `provinces`, `districts`, `tourist_attractions`, `airports`, `landmarks`
- `limit` (optional): Maximum results (1-50, default: 10)
- `userLocation` (optional): User coordinates for proximity ranking
- `includeAdministrative` (optional): Include detailed administrative info
- `includePOI` (optional): Include Points of Interest data
- `language` (optional): Response language (default: 'en')
- `excludeSources` (optional): Sources to exclude from search
- `minImportance` (optional): Minimum importance score (0.0-1.0)

#### Response Format

```json
{
  "results": [
    {
      "id": "uuid-string",
      "name": "Ho Chi Minh City",
      "displayName": "Ho Chi Minh City, Vietnam",
      "coordinates": {
        "lat": 10.8231,
        "lng": 106.6297
      },
      "country": "Vietnam",
      "countryCode": "VN",
      "province": "Ho Chi Minh",
      "district": "District 1",
      "address": "Ho Chi Minh City, Vietnam",
      "placeType": "city",
      "source": "goong",
      "importance": 0.95,
      "distanceFromUser": 1500.5,
      "vietnamRegion": "South",
      "administrative": {
        "country": "Vietnam",
        "province": "Ho Chi Minh",
        "district": "District 1"
      }
    }
  ],
  "metadata": {
    "searchTimeMs": 250,
    "strategyUsed": "vietnam_first",
    "sourcesAttempted": ["database", "goong"],
    "sourcesWithResults": ["goong"],
    "cache": {
      "hit": true,
      "key": "search:ho_chi_minh:vn",
      "ttl": 3600
    },
    "vietnamDetection": {
      "isVietnamese": true,
      "confidence": 0.95,
      "detectedKeywords": ["ho chi minh"],
      "region": "South"
    }
  },
  "totalResults": 15,
  "returnedResults": 10,
  "hasMore": true,
  "suggestions": ["Try 'Ho Chi Minh City' for more specific results"],
  "relatedTerms": ["Saigon", "HCMC"]
}
```

#### Usage Examples

```bash
# Basic search
GET /api/v1/location/search?query=Ho Chi Minh

# Advanced search with strategy
GET /api/v1/location/search?query=Paris&strategy=international_only&limit=5

# Search with user location for proximity
GET /api/v1/location/search?query=restaurants&userLocation[lat]=10.8231&userLocation[lng]=106.6297

# Vietnam-specific search
GET /api/v1/location/search?query=Đà Nẵng&country=VN&locationType=cities
```

### 2. Reverse Geocoding

**Endpoint**: `GET /api/v1/location/reverse-geocode`
**Purpose**: Convert coordinates to detailed location information

#### Parameters

- `lat` (required): Latitude (-90 to 90)
- `lng` (required): Longitude (-180 to 180)
- `zoom` (optional): Detail level (1-18, default: 10)
- `language` (optional): Response language (default: 'en')
- `includeExtraTags` (optional): Include additional metadata

#### Response Format

```json
{
  "location": {
    "id": "reverse_geocode_result",
    "name": "District 1",
    "displayName": "District 1, Ho Chi Minh City, Vietnam",
    "coordinates": {
      "lat": 10.8231,
      "lng": 106.6297
    },
    "country": "Vietnam",
    "countryCode": "VN",
    "province": "Ho Chi Minh",
    "district": "District 1",
    "address": "District 1, Ho Chi Minh City, Vietnam",
    "placeType": "district",
    "source": "goong",
    "importance": 0.8
  },
  "metadata": {
    "source": "goong",
    "confidence": 0.95,
    "zoom": 10,
    "searchTimeMs": 120
  }
}
```

### 3. Bulk Location Search

**Endpoint**: `POST /api/v1/location/bulk-search`
**Purpose**: Search multiple locations efficiently in a single request

#### Request Body

```json
{
  "queries": ["Ho Chi Minh City", "Hanoi", "Da Nang"],
  "country": "VN",
  "strategy": "auto",
  "limitPerQuery": 5
}
```

#### Response Format

```json
{
  "results": {
    "Ho Chi Minh City": [
      {
        "id": "hcm_1",
        "name": "Ho Chi Minh City",
        "displayName": "Ho Chi Minh City, Vietnam",
        "coordinates": { "lat": 10.8231, "lng": 106.6297 },
        "country": "Vietnam",
        "countryCode": "VN"
      }
    ],
    "Hanoi": [...],
    "Da Nang": [...]
  },
  "metadata": {
    "totalQueries": 3,
    "successfulQueries": 3,
    "failedQueries": 0,
    "totalSearchTimeMs": 750,
    "strategyUsed": "vietnam_first"
  }
}
```

### 4. Points of Interest Search

**Endpoint**: `GET /api/v1/location/poi-search`
**Purpose**: Find restaurants, attractions, hotels, and other POIs near coordinates

#### Parameters

- `lat` (required): Latitude coordinate
- `lng` (required): Longitude coordinate
- `radius` (optional): Search radius in kilometers (0.1-50, default: 5)
- `category` (optional): POI category (restaurant, hotel, attraction, etc.)
- `limit` (optional): Maximum results (1-100, default: 20)

#### Response Format

```json
{
  "data": [
    {
      "id": "poi_12345",
      "name": "Ben Thanh Market",
      "category": "market",
      "coordinates": {
        "lat": 10.823,
        "lng": 106.6296
      },
      "distance": 0.5,
      "rating": 4.5,
      "address": "Lê Lợi, Bến Thành, Quận 1, Thành phố Hồ Chí Minh",
      "metadata": {
        "openingHours": "06:00-18:00",
        "priceLevel": 2
      }
    }
  ],
  "metadata": {
    "searchRadius": 5,
    "totalResults": 15,
    "searchTimeMs": 300
  }
}
```

### 5. Location Suggestions (Autocomplete)

**Endpoint**: `GET /api/v1/location/suggestions`
**Purpose**: Fast autocomplete suggestions for location search

#### Parameters

- `query` (required): Partial search query (minimum 2 characters)
- `country` (optional): User country code for optimization
- `limit` (optional): Maximum suggestions (1-20, default: 10)

#### Response Format

```json
{
  "data": [
    {
      "text": "Ho Chi Minh City",
      "description": "Ho Chi Minh City, Vietnam",
      "placeId": "ChIJr5EnV42vNTERJNu_9_62R3E",
      "mainText": "Ho Chi Minh City",
      "secondaryText": "Vietnam"
    }
  ],
  "metadata": {
    "query": "Ho Chi",
    "totalSuggestions": 8,
    "searchTimeMs": 150
  }
}
```

### 6. Vietnamese Provinces

**Endpoint**: `GET /api/v1/location/vietnam/provinces`
**Purpose**: Get structured list of Vietnamese administrative divisions

#### Response Format

```json
{
  "data": [
    {
      "id": "79",
      "name": "Thành phố Hồ Chí Minh",
      "nameEn": "Ho Chi Minh City",
      "fullName": "Thành phố Hồ Chí Minh",
      "fullNameEn": "Ho Chi Minh City",
      "latitude": 10.8231,
      "longitude": 106.6297,
      "region": "South"
    }
  ],
  "metadata": {
    "totalProvinces": 63,
    "regions": ["North", "Central", "South"]
  }
}
```

### 7. Nearby Places

**Endpoint**: `GET /api/v1/location/nearby-places`
**Purpose**: Discover interesting places and attractions near coordinates

#### Parameters

- `lat` (required): Latitude coordinate
- `lng` (required): Longitude coordinate
- `radius` (optional): Search radius in kilometers (default: 10)
- `type` (optional): Place type filter
- `limit` (optional): Maximum results (default: 20)

#### Response Format

```json
{
  "data": [
    {
      "id": "place_123",
      "name": "Independence Palace",
      "displayName": "Independence Palace, Ho Chi Minh City",
      "coordinates": {
        "lat": 10.8249,
        "lng": 106.6278
      },
      "country": "Vietnam",
      "countryCode": "VN",
      "address": "135 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1",
      "placeType": "tourist_attraction",
      "source": "goong",
      "importance": 0.9,
      "distanceFromUser": 1.2
    }
  ],
  "metadata": {
    "center": { "lat": 10.8231, "lng": 106.6297 },
    "radius": 10,
    "totalResults": 25,
    "searchTimeMs": 280
  }
}
```

### 8. Weather Information

**Endpoint**: `GET /api/v1/location/weather`
**Purpose**: Get current weather and forecast for location coordinates

#### Parameters

- `lat` (required): Latitude coordinate
- `lng` (required): Longitude coordinate
- `units` (optional): Temperature units ('metric' or 'imperial', default: 'metric')

#### Response Format

```json
{
  "data": {
    "current": {
      "temperature": 28.5,
      "humidity": 75,
      "description": "Partly cloudy",
      "windSpeed": 12.5,
      "pressure": 1013,
      "uvIndex": 6,
      "visibility": 10
    },
    "forecast": [
      {
        "date": "2024-01-15",
        "temperature": {
          "min": 24,
          "max": 32
        },
        "description": "Sunny",
        "humidity": 70,
        "precipitation": 0
      }
    ],
    "vietnamSpecific": {
      "season": "Dry season",
      "monsoon": "Northeast monsoon",
      "recommendations": [
        "Good weather for outdoor activities",
        "Stay hydrated due to high humidity"
      ]
    }
  },
  "metadata": {
    "coordinates": { "lat": 10.8231, "lng": 106.6297 },
    "units": "metric",
    "source": "openweathermap",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "result": "ERROR",
  "status": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid search query provided",
    "details": {
      "field": "query",
      "constraint": "Query must be between 1 and 255 characters"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456",
    "path": "/api/v1/location/search"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input parameters
- `LOCATION_NOT_FOUND`: No results found for search query
- `API_RATE_LIMIT_EXCEEDED`: External API rate limit reached
- `EXTERNAL_API_ERROR`: External service unavailable
- `CACHE_ERROR`: Cache service temporarily unavailable
- `INTERNAL_SERVER_ERROR`: Unexpected server error

## Performance Optimization

### Caching Strategy

- **Search Results**: 1 hour TTL for location searches
- **Reverse Geocoding**: 24 hours TTL for coordinate lookups
- **Vietnamese Provinces**: 7 days TTL (rarely changes)
- **Weather Data**: 10 minutes TTL for current weather
- **POI Results**: 6 hours TTL for points of interest

### API Usage Optimization

- **Intelligent Routing**: Automatically selects cheapest/fastest API
- **Vietnam Detection**: Uses free Vietnamese APIs when possible
- **Bulk Operations**: Reduces API calls through batch processing
- **Result Deduplication**: Prevents duplicate API calls
- **Rate Limiting**: Prevents API quota exhaustion

### Database Optimization

- **Indexed Search**: Fast database lookups for Vietnamese locations
- **Connection Pooling**: Efficient database resource usage
- **Query Optimization**: Minimized database round trips

## Rate Limiting

- **Search endpoints**: 100 requests per minute per user
- **Bulk search**: 10 requests per minute per user
- **Weather endpoint**: 60 requests per minute per user
- **Suggestions**: 200 requests per minute per user

## Authentication

All endpoints require JWT authentication:

```
Authorization: Bearer <jwt_token>
```

## API Versioning

Current version: `v1`
Base URL: `/api/v1/location`

## Integration Examples

### Frontend Integration

```javascript
// Search locations with autocomplete
const searchLocations = async (query) => {
  const response = await fetch(
    `/api/v1/location/search?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return response.json();
};

// Get weather for location
const getLocationWeather = async (lat, lng) => {
  const response = await fetch(
    `/api/v1/location/weather?lat=${lat}&lng=${lng}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.json();
};
```

### Mobile App Integration

```dart
// Flutter example
Future<List<Location>> searchLocations(String query) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/v1/location/search?query=$query'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return data['results'].map<Location>((json) =>
      Location.fromJson(json)).toList();
  }
  throw Exception('Failed to search locations');
}
```

## Migration Guide

### From Legacy Endpoints

- `/location/search` → No change (enhanced functionality)
- `/location/smart-search` → Use `/location/search` with strategy parameter
- All other endpoints → No change required

### Breaking Changes

- None in current optimization
- Legacy DTOs are still supported for backward compatibility
- Response format enhanced but maintains backward compatibility

## Monitoring and Analytics

### Key Metrics

- **Search Performance**: Average response time per endpoint
- **API Usage**: Calls per minute to external services
- **Cache Hit Rate**: Percentage of requests served from cache
- **Error Rate**: Failed requests per endpoint
- **Vietnam Detection Accuracy**: Correct Vietnamese location identification

### Logging

All requests are logged with:

- Request ID for tracing
- User ID for analytics
- Search parameters for optimization
- Response time for performance monitoring
- API usage for cost tracking

## Future Enhancements

### Planned Features

1. **ML-Enhanced Search**: Machine learning for better result ranking
2. **Real-time Traffic**: Integration with traffic data APIs
3. **Place Photos**: Integration with place photo services
4. **Offline Support**: Cached data for offline mobile usage
5. **Multi-language Support**: Enhanced localization
6. **Advanced Filters**: More granular search filtering options

### Performance Improvements

1. **GraphQL API**: Alternative query interface for mobile apps
2. **WebSocket Support**: Real-time location updates
3. **CDN Integration**: Global edge caching
4. **Database Sharding**: Horizontal scaling preparation
