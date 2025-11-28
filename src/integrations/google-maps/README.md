# Google Maps Integration Module

Backend module tích hợp Google Maps API cho TripMaster, cung cấp các chức năng location-based services với caching hai lớp (Redis + in-memory), throttling, và error handling.

## 📁 Cấu trúc Module

```
src/integrations/google-maps/
├── google-maps.module.ts          # Module definition
├── google-maps.controller.ts      # REST API endpoints
├── google-maps-base.service.ts    # Abstract base service với shared logic
├── dto/
│   ├── place-details.dto.ts       # DTOs cho Place Details API
│   ├── places-search.dto.ts       # DTOs cho Places Text Search API
│   ├── geocode.dto.ts              # DTOs cho Geocoding API
│   ├── reverse-geocode.dto.ts      # DTOs cho Reverse Geocoding API
│   ├── directions.dto.ts           # DTOs cho Directions API
│   └── distance-matrix.dto.ts      # DTOs cho Distance Matrix API
├── services/
│   ├── places.service.ts           # Place Details service
│   ├── places-search.service.ts    # Places Text Search service
│   ├── geocoding.service.ts        # Geocoding service
│   ├── reverse-geocoding.service.ts # Reverse Geocoding service
│   ├── directions.service.ts       # Directions service
│   └── distance-matrix.service.ts  # Distance Matrix service
└── types/
    └── index.ts                    # TypeScript type definitions
```

## 🚀 API Endpoints

### 1. **Places Text Search** - `GET /google-maps/places/search`

Tìm kiếm địa điểm theo text query (ví dụ: "coffee shop near me").

**Request:**
```
GET /google-maps/places/search?query=coffee%20shop&lat=37.7749&lng=-122.4194&radius=5000&limit=10&language=en
```

**Query Parameters:**
- `query` (required): Search text
- `lat` (optional): Latitude for location biasing
- `lng` (optional): Longitude for location biasing  
- `radius` (optional): Search radius in meters (default: 5000)
- `limit` (optional): Max results (default: 10, max: 20)
- `language` (optional): Language code (default: 'en')

**Response:**
```json
{
  "result": "OK",
  "status": 200,
  "data": {
    "query": "coffee shop",
    "total": 10,
    "results": [
      {
        "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
        "name": "Blue Bottle Coffee",
        "address": "66 Mint St, San Francisco, CA 94103",
        "lat": 37.7766,
        "lng": -122.4090,
        "types": ["cafe", "food", "point_of_interest"],
        "rating": 4.5,
        "userRatingsTotal": 1234,
        "icon": "https://maps.gstatic.com/mapfiles/place_api/icons/..."
      }
    ],
    "fromCache": false,
    "tookMs": 245,
    "source": "google"
  }
}
```

**Cache:** 24 hours

---

### 2. **Place Details** - `GET /google-maps/place-details/:placeId`

Lấy thông tin chi tiết về một địa điểm từ Place ID.

**Request:**
```
GET /google-maps/place-details/ChIJN1t_tDeuEmsRUsoyG83frY4?language=vi
```

**Response:**
```json
{
  "result": "OK",
  "status": 200,
  "data": {
    "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "name": "Google Sydney",
    "formattedAddress": "48 Pirrama Rd, Pyrmont NSW 2009, Australia",
    "location": {
      "lat": -33.866489,
      "lng": 151.195677
    },
    "rating": 4.5,
    "userRatingsTotal": 1234,
    "types": ["point_of_interest", "establishment"],
    "openingHours": {
      "openNow": true,
      "weekdayText": ["Monday: 9:00 AM – 5:00 PM", ...]
    },
    "photos": [...],
    "internationalPhoneNumber": "+61 2 9374 4000",
    "website": "https://www.google.com.au/",
    "utcOffset": 660
  }
}
```

**Cache:** 24 hours

---

### 2. **Geocoding** - `POST /google-maps/geocode`

Chuyển đổi địa chỉ thành tọa độ (lat/lng).

**Request:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA",
  "region": "US",
  "language": "en"
}
```

**Response:**
```json
{
  "result": "OK",
  "status": 200,
  "data": {
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
    "location": {
      "lat": 37.4224764,
      "lng": -122.0842499
    },
    "locationType": "ROOFTOP",
    "placeId": "ChIJ2eUgeAK6j4ARbn5u_wAGqWA",
    "addressComponents": [...]
  }
}
```

**Cache:** 24 hours

---

### 3. **Reverse Geocoding** - `POST /google-maps/reverse-geocode`

Chuyển đổi tọa độ (lat/lng) thành địa chỉ.

**Request:**
```json
{
  "lat": 37.4224764,
  "lng": -122.0842499,
  "language": "vi"
}
```

**Response:**
```json
{
  "result": "OK",
  "status": 200,
  "data": {
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, Hoa Kỳ",
    "location": {
      "lat": 37.4224764,
      "lng": -122.0842499
    },
    "placeId": "ChIJ2eUgeAK6j4ARbn5u_wAGqWA",
    "addressComponents": [...]
  }
}
```

**Cache:** 24 hours

---

### 4. **Directions** - `POST /google-maps/directions`

Lấy hướng dẫn đường đi giữa các điểm với waypoints.

**Request:**
```json
{
  "origin": {
    "lat": 37.4224764,
    "lng": -122.0842499
  },
  "destination": {
    "lat": 37.7749295,
    "lng": -122.4194155
  },
  "waypoints": [
    {
      "lat": 37.4267861,
      "lng": -122.0806032
    }
  ],
  "mode": "driving",
  "avoid": "tolls",
  "language": "vi"
}
```

**Response:**
```json
{
  "result": "OK",
  "status": 200,
  "data": {
    "routes": [
      {
        "summary": "I-280 N",
        "legs": [
          {
            "startAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
            "endAddress": "San Francisco, CA 94102",
            "distance": {
              "text": "56.3 km",
              "value": 56300
            },
            "duration": {
              "text": "42 phút",
              "value": 2520
            },
            "steps": [...]
          }
        ],
        "overviewPolyline": "encoded_polyline_string",
        "bounds": {...},
        "copyrights": "Map data ©2024 Google"
      }
    ]
  }
}
```

**Cache:** 1 hour

---

### 5. **Distance Matrix** - `POST /google-maps/distance-matrix`

Tính khoảng cách và thời gian di chuyển giữa nhiều điểm.

**Request:**
```json
{
  "origins": [
    { "lat": 37.4224764, "lng": -122.0842499 },
    { "lat": 37.7749295, "lng": -122.4194155 }
  ],
  "destinations": [
    { "lat": 34.0522342, "lng": -118.2436849 },
    { "lat": 40.7127753, "lng": -74.0059728 }
  ],
  "mode": "driving",
  "language": "en"
}
```

**Response:**
```json
{
  "result": "OK",
  "status": 200,
  "data": {
    "originAddresses": ["Mountain View, CA 94043, USA", "San Francisco, CA 94102, USA"],
    "destinationAddresses": ["Los Angeles, CA 90012, USA", "New York, NY 10007, USA"],
    "rows": [
      {
        "elements": [
          {
            "status": "OK",
            "distance": {
              "text": "344 mi",
              "value": 553737
            },
            "duration": {
              "text": "5 hours 23 mins",
              "value": 19380
            }
          },
          ...
        ]
      }
    ]
  }
}
```

**Cache:** 10 minutes

---

## ⚙️ Configuration

### Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```env
# Google Maps API Key (bắt buộc)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Hoặc sử dụng key từ Places API (fallback)
GOOGLE_PLACES_API_KEY=your_key_here

# Region mặc định cho geocoding
GOOGLE_MAPS_DEFAULT_REGION=US

# Cache TTL (giây) - optional
GOOGLE_MAPS_CACHE_TTL_PLACE_DETAILS=86400      # 24 hours
GOOGLE_MAPS_CACHE_TTL_GEOCODING=86400          # 24 hours
GOOGLE_MAPS_CACHE_TTL_REVERSE_GEOCODING=86400  # 24 hours
GOOGLE_MAPS_CACHE_TTL_DIRECTIONS=3600          # 1 hour
GOOGLE_MAPS_CACHE_TTL_DISTANCE_MATRIX=600      # 10 minutes

# Request timeout (ms)
GOOGLE_MAPS_TIMEOUT=5000

# Max retries khi API call fail
GOOGLE_MAPS_MAX_RETRIES=2
```

### Đăng ký trong AppModule

Module đã được tự động đăng ký trong `app.module.ts`:

```typescript
import { GoogleMapsModule } from './integrations/google-maps/google-maps.module';
import googleMapsConfig from './config/google-maps.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [amadeusConfig, googleMapsConfig],
    }),
    // ... other modules
    GoogleMapsModule,
  ],
})
export class AppModule {}
```

---

## 🏗️ Kiến trúc

### Base Service Pattern

Tất cả services kế thừa từ `GoogleMapsBaseService` để chia sẻ logic:

- **Dual-layer caching:** Redis (persistent) + In-memory (fast)
- **API throttling:** Giới hạn request theo quota
- **Error handling:** Xử lý lỗi Google API và transform thành HttpException
- **Retry logic:** Tự động retry với exponential backoff

### Caching Strategy

| API                | Cache Key Pattern        | TTL      | Layer          |
|--------------------|--------------------------|----------|----------------|
| Place Details      | `google_maps:place_details:{hash}` | 24h | Redis + Memory |
| Geocoding          | `google_maps:geocode:{hash}` | 24h | Redis + Memory |
| Reverse Geocoding  | `google_maps:reverse_geocode:{hash}` | 24h | Redis + Memory |
| Directions         | `google_maps:directions:{hash}` | 1h | Redis + Memory |
| Distance Matrix    | `google_maps:distance_matrix:{hash}` | 10m | Redis + Memory |

### Throttling

API throttling được quản lý bởi `APIThrottleService`:

```env
LIMIT_GOOGLE_MAPS_HOURLY=100
LIMIT_GOOGLE_MAPS_DAILY=500
```

Khi vượt quota, API trả về `429 Too Many Requests`.

---

## 🔒 Security

- ✅ API key **KHÔNG BAO GIỜ** được expose ra frontend
- ✅ Tất cả requests đều validate với `class-validator`
- ✅ Global validation pipe với `GlobalValidationPipe`
- ✅ Error messages không leak thông tin nhạy cảm
- ✅ Timeout protection (5s default)

---

## 🧪 Testing

### Test API với cURL

```bash
# 1. Place Details
curl -X GET "http://localhost:3000/google-maps/place-details/ChIJN1t_tDeuEmsRUsoyG83frY4?language=en"

# 2. Geocoding
curl -X POST "http://localhost:3000/google-maps/geocode" \
  -H "Content-Type: application/json" \
  -d '{"address": "1600 Amphitheatre Parkway, Mountain View, CA"}'

# 3. Reverse Geocoding
curl -X POST "http://localhost:3000/google-maps/reverse-geocode" \
  -H "Content-Type: application/json" \
  -d '{"lat": 37.4224764, "lng": -122.0842499}'

# 4. Directions
curl -X POST "http://localhost:3000/google-maps/directions" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 37.4224764, "lng": -122.0842499},
    "destination": {"lat": 37.7749295, "lng": -122.4194155},
    "mode": "driving"
  }'

# 5. Distance Matrix
curl -X POST "http://localhost:3000/google-maps/distance-matrix" \
  -H "Content-Type: application/json" \
  -d '{
    "origins": [{"lat": 37.4224764, "lng": -122.0842499}],
    "destinations": [{"lat": 34.0522342, "lng": -118.2436849}],
    "mode": "driving"
  }'
```

---

## 📚 Sử dụng trong Modules khác

### Import GoogleMapsModule

```typescript
import { GoogleMapsModule } from '../integrations/google-maps/google-maps.module';

@Module({
  imports: [GoogleMapsModule],
  // ...
})
export class YourModule {}
```

### Inject Services

```typescript
import { PlacesService } from '../integrations/google-maps/services/places.service';
import { DirectionsService } from '../integrations/google-maps/services/directions.service';

@Injectable()
export class YourService {
  constructor(
    private readonly placesService: PlacesService,
    private readonly directionsService: DirectionsService,
  ) {}

  async getPlaceInfo(placeId: string) {
    return await this.placesService.getPlaceDetails(placeId);
  }

  async getRoute(origin, destination) {
    return await this.directionsService.getDirections({
      origin,
      destination,
      mode: 'driving',
    });
  }
}
```

---

## 🐛 Error Handling

Module xử lý các lỗi Google API và transform thành HTTP exceptions:

| Google API Status    | HTTP Status | Message                                      |
|----------------------|-------------|----------------------------------------------|
| `ZERO_RESULTS`       | 404         | No results found for the given parameters    |
| `INVALID_REQUEST`    | 400         | Invalid request parameters                   |
| `OVER_QUERY_LIMIT`   | 429         | Google Maps API quota exceeded               |
| `REQUEST_DENIED`     | 403         | Request denied. Check API key configuration  |
| `UNKNOWN_ERROR`      | 500         | Google Maps API error. Please try again      |

---

## 📊 Monitoring & Logging

Mỗi service log các events quan trọng:

- ✅ Cache hits (Redis/Memory)
- ⚠️ API failures và retry attempts
- 🚨 Quota warnings (80%, 90%, 95%)
- ❌ Error details (không expose sensitive data)

Check logs:
```bash
# Development
npm run start:dev

# Production
pm2 logs trip-master
```

---

## 🔄 Migration từ GooglePlacesService cũ

Module cũ (`src/location/services/google-places.service.ts`) vẫn hoạt động nhưng nên migrate sang module mới:

**Before:**
```typescript
import { GooglePlacesService } from './services/google-places.service';

@Injectable()
export class LocationService {
  constructor(private readonly googlePlaces: GooglePlacesService) {}
  
  async search(query: string) {
    return await this.googlePlaces.searchPlaces(query);
  }
}
```

**After:**
```typescript
import { PlacesService } from '../integrations/google-maps/services/places.service';

@Injectable()
export class LocationService {
  constructor(private readonly placesService: PlacesService) {}
  
  async getDetails(placeId: string) {
    return await this.placesService.getPlaceDetails(placeId);
  }
}
```

---

## 📝 Notes

- Module sử dụng `@googlemaps/google-maps-services-js` (backend SDK), **KHÔNG** phải Maps JavaScript SDK
- Frontend vẫn dùng Maps JS SDK cho autocomplete/rendering, nhưng gọi backend cho logic nặng
- Cache keys sử dụng MD5 hash của parameters để tránh key collision
- Retry logic có exponential backoff: 1s, 2s, 4s...
- Tất cả language parameters support ISO 639-1 codes (en, vi, ja, etc.)

---

## 🚀 Next Steps

1. ✅ Module đã hoàn chỉnh và sẵn sàng sử dụng
2. 🔑 Cần thêm `GOOGLE_MAPS_API_KEY` vào `.env`
3. 🧪 Test các endpoints với Postman/cURL
4. 📊 Monitor throttling limits trong production
5. 🔄 Migrate code cũ từ GooglePlacesService sang module mới (optional)

---

**Created:** November 22, 2025  
**Version:** 1.0.0  
**Package:** `@googlemaps/google-maps-services-js@^3.4.2`
