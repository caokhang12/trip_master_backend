# Cost Tracking API Examples and Test Requests

This file contains comprehensive examples of API requests for testing the Enhanced Itinerary Management with Cost Tracking feature.

## Prerequisites

1. **Authentication**: All requests require a valid JWT token
2. **Database**: Ensure migrations have been run
3. **Test Data**: Create a user, trip, and itinerary first

## Authentication Setup

### 1. Register Test User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "costtracker@example.com",
  "password": "TestPassword123!",
  "firstName": "Cost",
  "lastName": "Tracker"
}
```

### 2. Login to Get Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "costtracker@example.com",
  "password": "TestPassword123!"
}
```

**Response:**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "email": "costtracker@example.com",
      "firstName": "Cost",
      "lastName": "Tracker"
    }
  }
}
```

## Trip Setup for Cost Tracking

### 3. Create Trip with Cost Tracking Enabled

```http
POST /api/v1/trips
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Tokyo Adventure - Cost Tracking Demo",
  "description": "A comprehensive trip to Tokyo with detailed cost tracking",
  "destinationName": "Tokyo, Japan",
  "destinationCoords": {
    "lat": 35.6762,
    "lng": 139.6503
  },
  "destinationCountry": "JP",
  "destinationProvince": "Tokyo",
  "destinationCity": "Tokyo",
  "startDate": "2024-07-15",
  "endDate": "2024-07-22",
  "budget": 5000,
  "currency": "USD",
  "enableCostTracking": true
}
```

**Response:**

```json
{
  "data": {
    "id": "trip-456",
    "title": "Tokyo Adventure - Cost Tracking Demo",
    "budget": 5000,
    "currency": "USD",
    "enableCostTracking": true,
    "status": "planning",
    "createdAt": "2024-06-12T10:00:00Z"
  }
}
```

### 4. Create Detailed Itinerary with Activities

```http
POST /api/v1/trips/trip-456/itinerary
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "dayNumber": 1,
  "date": "2024-07-15",
  "activities": [
    {
      "time": "08:00",
      "title": "Traditional Japanese Breakfast",
      "description": "Authentic breakfast at ryokan featuring miso soup, steamed rice, grilled fish, and green tea",
      "location": "Shibuya District, Tokyo",
      "duration": 60,
      "type": "food"
    },
    {
      "time": "10:00",
      "title": "Senso-ji Temple Visit",
      "description": "Ancient Buddhist temple in Asakusa with beautiful pagoda and traditional shopping street",
      "location": "2-3-1 Asakusa, Taito City, Tokyo",
      "duration": 120,
      "type": "sightseeing"
    },
    {
      "time": "12:30",
      "title": "Sushi Lunch at Tsukiji Outer Market",
      "description": "Fresh sushi and sashimi at famous fish market with chef's selection omakase",
      "location": "Tsukiji Outer Market, Tokyo",
      "duration": 90,
      "type": "food"
    },
    {
      "time": "15:00",
      "title": "Shopping in Harajuku",
      "description": "Fashion shopping and souvenir hunting in trendy Takeshita Street",
      "location": "Harajuku, Shibuya City, Tokyo",
      "duration": 180,
      "type": "shopping"
    },
    {
      "time": "18:30",
      "title": "Subway to Shinjuku",
      "description": "Train ride on JR Yamanote Line from Harajuku to Shinjuku",
      "location": "Tokyo Metro",
      "duration": 30,
      "type": "transport"
    },
    {
      "time": "19:30",
      "title": "Dinner at Traditional Izakaya",
      "description": "Authentic Japanese pub experience with sake, yakitori, and seasonal dishes",
      "location": "Golden Gai, Shinjuku, Tokyo",
      "duration": 150,
      "type": "food"
    }
  ]
}
```

**Response with AI Cost Estimation:**

```json
{
  "data": {
    "id": "itinerary-789",
    "tripId": "trip-456",
    "dayNumber": 1,
    "date": "2024-07-15",
    "activities": [...],
    "aiGenerated": false,
    "userModified": false,
    "estimatedCost": 185.50,
    "costCurrency": "USD",
    "costBreakdown": {
      "food": 135.00,
      "sightseeing": 5.00,
      "shopping": 40.00,
      "transport": 5.50
    },
    "activityCosts": [
      {
        "activityIndex": 0,
        "costType": "food",
        "estimatedAmount": 35.00,
        "currency": "USD",
        "costSource": "ai_estimate"
      },
      {
        "activityIndex": 1,
        "costType": "sightseeing",
        "estimatedAmount": 5.00,
        "currency": "USD",
        "costSource": "ai_estimate"
      }
    ]
  }
}
```

## Cost Tracking Operations

### 5. Update Activity Cost with Actual Spending

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/activities/0/cost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualAmount": 42.50,
  "notes": "Breakfast was more expensive than expected - ordered additional items and premium green tea"
}
```

**Response:**

```json
{
  "data": {
    "id": "activity-cost-101",
    "itineraryId": "itinerary-789",
    "activityIndex": 0,
    "costType": "food",
    "estimatedAmount": 35.0,
    "actualAmount": 42.5,
    "currency": "USD",
    "costSource": "ai_estimate",
    "notes": "Breakfast was more expensive than expected - ordered additional items and premium green tea",
    "createdAt": "2024-06-12T10:30:00Z",
    "updatedAt": "2024-06-12T15:45:00Z"
  }
}
```

### 6. Update Multiple Activity Costs

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/activities/2/cost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualAmount": 85.00,
  "notes": "Upgraded to premium omakase set with tuna sashimi and uni"
}
```

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/activities/3/cost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualAmount": 120.00,
  "notes": "Bought vintage Japanese fashion items and anime merchandise"
}
```

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/activities/5/cost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualAmount": 95.00,
  "notes": "Enjoyed premium sake and ordered extra yakitori skewers"
}
```

### 7. Record Free Activity (Temple Visit)

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/activities/1/cost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualAmount": 0.00,
  "notes": "Temple visit was free - only made small donation at prayer box"
}
```

## Cost Analysis and Reporting

### 8. Get Comprehensive Cost Analysis

```http
GET /api/v1/trips/trip-456/itinerary/itinerary-789/cost-analysis
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "data": {
    "tripId": "trip-456",
    "totalBudget": 5000.0,
    "totalEstimated": 185.5,
    "totalSpent": 342.5,
    "remainingBudget": 4657.5,
    "budgetVariance": 157.0,
    "utilizationPercentage": 6.85,
    "currency": "USD",
    "categoryBreakdown": [
      {
        "category": "food",
        "budgeted": 2000.0,
        "estimated": 135.0,
        "actual": 222.5,
        "variance": 87.5,
        "utilizationPercentage": 11.13
      },
      {
        "category": "sightseeing",
        "budgeted": 800.0,
        "estimated": 5.0,
        "actual": 0.0,
        "variance": -5.0,
        "utilizationPercentage": 0.0
      },
      {
        "category": "shopping",
        "budgeted": 1200.0,
        "estimated": 40.0,
        "actual": 120.0,
        "variance": 80.0,
        "utilizationPercentage": 10.0
      },
      {
        "category": "transport",
        "budgeted": 500.0,
        "estimated": 5.5,
        "actual": 0.0,
        "variance": -5.5,
        "utilizationPercentage": 0.0
      },
      {
        "category": "miscellaneous",
        "budgeted": 500.0,
        "estimated": 0.0,
        "actual": 0.0,
        "variance": 0.0,
        "utilizationPercentage": 0.0
      }
    ],
    "lastUpdated": "2024-06-12T15:45:00Z"
  }
}
```

### 9. Get Trip Budget Summary

```http
GET /api/v1/trips/trip-456/budget-summary
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "data": {
    "totalBudget": 5000.0,
    "totalSpent": 342.5,
    "totalEstimated": 185.5,
    "remainingBudget": 4657.5,
    "budgetUtilization": 6.85,
    "currency": "USD",
    "categoryBreakdown": [
      {
        "category": "food",
        "budgeted": 2000.0,
        "estimated": 135.0,
        "actual": 222.5,
        "variance": 87.5,
        "utilizationPercentage": 11.13
      },
      {
        "category": "accommodation",
        "budgeted": 2000.0,
        "estimated": 0.0,
        "actual": 0.0,
        "variance": 0.0,
        "utilizationPercentage": 0.0
      },
      {
        "category": "transport",
        "budgeted": 500.0,
        "estimated": 5.5,
        "actual": 0.0,
        "variance": -5.5,
        "utilizationPercentage": 0.0
      },
      {
        "category": "activity",
        "budgeted": 800.0,
        "estimated": 5.0,
        "actual": 0.0,
        "variance": -5.0,
        "utilizationPercentage": 0.0
      },
      {
        "category": "shopping",
        "budgeted": 1200.0,
        "estimated": 40.0,
        "actual": 120.0,
        "variance": 80.0,
        "utilizationPercentage": 10.0
      },
      {
        "category": "miscellaneous",
        "budgeted": 500.0,
        "estimated": 0.0,
        "actual": 0.0,
        "variance": 0.0,
        "utilizationPercentage": 0.0
      }
    ],
    "lastUpdated": "2024-06-12T15:45:00Z"
  }
}
```

## Advanced Test Scenarios

### 10. Multi-Day Trip with Different Activities

```http
POST /api/v1/trips/trip-456/itinerary
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "dayNumber": 2,
  "date": "2024-07-16",
  "activities": [
    {
      "time": "09:00",
      "title": "Tokyo Station to Nikko by Train",
      "description": "JR Pass train journey to historic Nikko",
      "location": "Tokyo Station to Nikko",
      "duration": 120,
      "type": "transport"
    },
    {
      "time": "11:30",
      "title": "Toshogu Shrine Complex",
      "description": "UNESCO World Heritage shrine complex with elaborate decorations",
      "location": "Nikko, Tochigi Prefecture",
      "duration": 180,
      "type": "sightseeing"
    },
    {
      "time": "15:00",
      "title": "Traditional Kaiseki Lunch",
      "description": "Multi-course traditional Japanese meal at historic restaurant",
      "location": "Nikko town center",
      "duration": 120,
      "type": "food"
    },
    {
      "time": "18:00",
      "title": "Return Train to Tokyo",
      "description": "Evening train back to Tokyo",
      "location": "Nikko to Tokyo Station",
      "duration": 120,
      "type": "transport"
    }
  ]
}
```

### 11. High-End Accommodation Example

```http
POST /api/v1/trips/trip-456/itinerary
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "dayNumber": 3,
  "date": "2024-07-17",
  "activities": [
    {
      "time": "15:00",
      "title": "Check-in at Luxury Ryokan",
      "description": "Traditional Japanese inn with onsen hot springs, tatami rooms, and kaiseki dinner included",
      "location": "Hakone, Kanagawa Prefecture",
      "duration": 60,
      "type": "accommodation"
    },
    {
      "time": "17:00",
      "title": "Private Onsen Experience",
      "description": "Relaxing in natural hot springs with mountain views",
      "location": "Ryokan onsen facilities",
      "duration": 120,
      "type": "activity"
    },
    {
      "time": "19:30",
      "title": "Kaiseki Dinner at Ryokan",
      "description": "Traditional multi-course dinner featuring seasonal ingredients",
      "location": "Ryokan dining room",
      "duration": 150,
      "type": "food"
    }
  ]
}
```

### 12. Budget Category Update

```http
PUT /api/v1/trips/trip-456/budget/accommodation
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "budgetedAmount": 2500.00
}
```

## Error Scenarios for Testing

### 13. Invalid Cost Update (Negative Amount)

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/activities/0/cost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualAmount": -50.00,
  "notes": "This should fail validation"
}
```

**Expected Error Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "property": "actualAmount",
        "constraints": {
          "min": "actualAmount must not be less than 0"
        }
      }
    ]
  },
  "meta": {
    "timestamp": "2024-06-12T15:45:00Z",
    "requestId": "req-error-123",
    "path": "/api/v1/trips/trip-456/itinerary/itinerary-789/activities/0/cost"
  }
}
```

### 14. Invalid Currency Code

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/activities/0/cost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualAmount": 50.00,
  "currency": "INVALID",
  "notes": "Invalid currency code"
}
```

### 15. Non-existent Activity Index

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/activities/999/cost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualAmount": 50.00,
  "notes": "Activity index does not exist"
}
```

## Performance Testing

### 16. Large Itinerary (20+ Activities)

```http
POST /api/v1/trips/trip-456/itinerary
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "dayNumber": 4,
  "date": "2024-07-18",
  "activities": [
    {
      "time": "06:00",
      "title": "Early Morning Fish Market",
      "description": "Visit Toyosu Fish Market for tuna auction",
      "location": "Toyosu Market, Tokyo",
      "duration": 120,
      "type": "sightseeing"
    },
    // ... (repeat pattern with 20+ activities)
  ]
}
```

## Multi-Currency Examples

### 17. Mixed Currency Activity Costs

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/activities/2/cost
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualAmount": 12000,
  "currency": "JPY",
  "notes": "Paid in Japanese Yen - approximately $85 USD"
}
```

## Bulk Operations

### 18. Batch Update Multiple Costs

```http
PUT /api/v1/trips/trip-456/itinerary/itinerary-789/batch-update-costs
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "updates": [
    {
      "activityIndex": 0,
      "actualAmount": 42.50,
      "notes": "Breakfast upgrade"
    },
    {
      "activityIndex": 2,
      "actualAmount": 85.00,
      "notes": "Premium sushi set"
    },
    {
      "activityIndex": 3,
      "actualAmount": 120.00,
      "notes": "Shopping spree"
    }
  ]
}
```

These examples provide comprehensive test coverage for all aspects of the cost tracking functionality, including normal operations, error scenarios, edge cases, and performance testing scenarios.
