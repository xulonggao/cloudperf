# CloudPerf Dashboard - API Integration

## API Integration Overview

The dashboard implements real-time data updates through REST API endpoints. Data is automatically refreshed every 30 seconds.

### Required API Endpoints

The backend needs to implement these endpoints:

1. `GET /api/stats`
```json
{
  "activeNodes": 234,
  "avgLatency": "45ms",
  "networkStatus": "98.5%",
  "regions": 12
}
```

2. `GET /api/performance?range=24h`
```json
[
  {
    "name": "00:00",
    "latency": 45,
    "throughput": 240
  }
]
```

3. `GET /api/regions`
```json
[
  {
    "name": "NA",
    "value": 4000
  }
]
```

## Environment Configuration

The API URL is configured through environment variables:

- Development: `.env.development`
```
VITE_API_URL=http://localhost:3000/api
```

- Production: `.env.production`
```
VITE_API_URL=https://api.your-domain.com
```

## Data Refresh

- Dashboard stats, performance data, and regional data are automatically fetched every 30 seconds
- Loading states are shown while data is being fetched
- Error states are displayed if API calls fail

## API Service Usage

The API service (`src/services/api.js`) provides these functions:

```javascript
// Fetch dashboard statistics
const stats = await fetchDashboardStats();

// Fetch performance data with time range
const perfData = await fetchPerformanceData('24h');

// Fetch regional distribution data
const regData = await fetchRegionalData();
```

## Error Handling

The dashboard implements comprehensive error handling:

- Loading states during data fetching
- Error messages when API calls fail
- Automatic retry mechanism
- Network error handling

## Backend Implementation Requirements

Your backend API should:

1. Return data in the exact format shown above
2. Implement proper CORS headers
3. Handle the time range parameter for performance data
4. Return appropriate HTTP status codes
5. Implement reasonable response times (<500ms)

## Security Considerations

1. CORS Configuration
```javascript
// Backend CORS setup example (Node.js/Express)
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));
```

2. Rate Limiting
```javascript
// Example rate limiting setup
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

## Monitoring

The dashboard includes built-in error logging. To monitor API performance:

1. Check browser console for API errors
2. Monitor network tab for request timing
3. Watch for failed refresh attempts

## Testing API Integration

1. Start the development server:
```bash
npm run dev
```

2. Verify API connections in browser dev tools:
- Network tab should show periodic API calls
- Console should be free of errors
- Response times should be reasonable

3. Test error handling:
- Disconnect network to verify error states
- Slow down network to test timeouts
- Send invalid data to test error displays
