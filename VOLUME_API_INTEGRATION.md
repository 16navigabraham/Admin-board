# Volume API Integration Guide

## Overview

The dashboard now integrates with the comprehensive Volume API that provides:
- ✅ Multi-chain support (Base, Lisk, Celo)
- ✅ Real-time price conversion (USD & NGN)
- ✅ Historical chart data with 15-minute intervals
- ✅ Automatic updates via backend cron jobs

## API Endpoints Used

### 1. Latest Volume Data
```
GET /api/volume/latest
```
**Used for:** Main volume card display (fast cached data)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVolumeUSD": "1,234.56",
    "totalVolumeNGN": "1,900,000.00",
    "tokenCount": 8,
    "tokens": [...],
    "timestamp": "2024-12-05T12:00:00.000Z",
    "ageMinutes": "5.2"
  }
}
```

### 2. Chart Data
```
GET /api/volume/chart?interval=24h
```
**Used for:** Volume over time chart

**Supported intervals:**
- `3h` - Last 3 hours (~12 data points)
- `12h` - Last 12 hours (~48 data points)
- `24h` - Last 24 hours (~96 data points)

**Response:**
```json
{
  "success": true,
  "interval": "24h",
  "dataPoints": 96,
  "statistics": {
    "latestVolumeUSD": "1,234.56",
    "changePercent": "+2.5%",
    "minVolumeUSD": "1,100.00",
    "maxVolumeUSD": "1,300.00"
  },
  "data": [
    {
      "timestamp": "2024-12-05T12:00:00.000Z",
      "totalVolumeUSD": "1,234.56",
      "totalVolumeNGN": "1,900,000.00"
    }
    // ... more data points
  ]
}
```

## Implementation Details

### Volume Display Card

The total volume card now:
1. Fetches data from `/api/volume/latest` (fast cached endpoint)
2. Displays real USD values (no scale factors needed)
3. Shows live exchange rates from the API
4. Supports currency switching (USD/NGN)

```typescript
// Fetch volume data
const volumeResponse = await fetch(`${BACKEND_URL}/api/volume/latest`)
const volumeData = await volumeResponse.json()

// Parse formatted string to number
const volumeUSD = parseFloat(volumeData.data.totalVolumeUSD.replace(/,/g, ''))

// Display with proper formatting
setTotalVolume(`$${volumeUSD.toLocaleString()}`)
```

### Chart Integration

The charts now:
1. Fetch from `/api/volume/chart?interval=X` for volume data
2. Fetch from `/api/stats/chart/X` for order stats
3. Merge data by timestamp
4. Display real USD values (no scaling needed)

**Timeframe Mapping:**
- Frontend `1h` → API `3h`
- Frontend `24h` → API `24h`
- Frontend `7d` → API `24h` (filtered client-side)
- Frontend `30d` → API `24h` (filtered client-side)

### Exchange Rate Updates

Exchange rates are automatically provided by the Volume API:
- Updated every 15 minutes with volume sync
- Includes +20 NGN margin for NGN rates
- No need for separate price API calls

## Migration Changes

### What Was Removed

❌ Direct smart contract calls via `publicClient.readContract()`
❌ Token-by-token volume calculation
❌ Manual stablecoin filtering
❌ Hardcoded `SCALE_DOWN_FACTOR` (1e11)
❌ Complex ratio calculations
❌ Separate exchange rate fetching

### What Was Added

✅ Volume API `/api/volume/latest` integration
✅ Volume API `/api/volume/chart` integration
✅ Automatic exchange rate updates from API
✅ Real-time multi-chain aggregation
✅ Proper timestamp-based data merging
✅ Accurate USD/NGN conversion

## Benefits

1. **Accuracy**: Volume reflects all tokens across all chains with real market prices
2. **Performance**: Cached data reduces blockchain RPC calls
3. **Scalability**: Backend handles complex calculations
4. **Reliability**: Automatic updates every 15 minutes
5. **Flexibility**: Easy to add new chains or tokens

## Data Flow

```
┌─────────────────────────────────────────────────┐
│  Smart Contracts (Base, Lisk, Celo)           │
│  - getTokenDetails()                            │
│  - getSupportedTokens()                         │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Backend Volume Service                         │
│  - Fetches token volumes from all chains       │
│  - Gets real-time prices from Price API        │
│  - Converts to USD/NGN                          │
│  - Stores snapshots every 15 minutes           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Volume API Endpoints                           │
│  - /api/volume/latest (cached)                 │
│  - /api/volume/chart?interval=X                │
│  - /api/volume/by-chain                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Frontend Dashboard                             │
│  - Displays real-time volume                   │
│  - Shows historical charts                     │
│  - Currency conversion (USD/NGN)               │
└─────────────────────────────────────────────────┘
```

## Refresh Strategy

### Automatic Updates
- Backend syncs every **15 minutes** via cron job
- Frontend uses **cached data** from `/latest` endpoint
- No need for frequent blockchain calls

### Manual Refresh
- "Refresh" button fetches latest cached data
- "Update Rates" button is now deprecated (rates auto-update)
- Both buttons trigger the same data fetch for consistency

## Troubleshooting

### Issue: Volume shows "N/A"

**Causes:**
1. Backend Volume API not responding
2. No volume data synced yet
3. Network connection issues

**Solutions:**
1. Check backend is running: `curl ${BACKEND_URL}/api/volume/latest`
2. Trigger manual sync: `curl ${BACKEND_URL}/api/volume/total`
3. Check browser console for error messages

### Issue: Chart shows no data

**Causes:**
1. Insufficient historical data (backend needs 15+ minutes of runtime)
2. Invalid interval parameter
3. API endpoint error

**Solutions:**
1. Wait for backend cron to collect data points
2. Use supported intervals: `3h`, `12h`, `24h`
3. Check network tab for API response errors

### Issue: Currency conversion incorrect

**Causes:**
1. Stale exchange rates
2. Price API unavailable during sync

**Solutions:**
1. Wait for next 15-minute sync cycle
2. Check backend logs for price fetch errors
3. Verify Price API is running

## Testing

### Test Volume Display
```bash
# Check volume API
curl http://localhost:5000/api/volume/latest

# Should return:
# {
#   "success": true,
#   "data": {
#     "totalVolumeUSD": "xxx.xx",
#     "totalVolumeNGN": "xxx.xx"
#   }
# }
```

### Test Chart Data
```bash
# Check 24h chart
curl "http://localhost:5000/api/volume/chart?interval=24h"

# Should return array of data points
```

### Frontend Testing
1. Open dashboard: `http://localhost:3000/dashboard/overview`
2. Verify volume card shows USD amount
3. Switch currency to NGN, verify conversion
4. Check chart displays data without errors
5. Click "Refresh" button, verify updates

## Future Enhancements

Possible improvements:
1. Add `/api/volume/by-chain` for chain breakdown visualization
2. Implement real-time WebSocket updates (instead of 15-min polling)
3. Add volume alerts/notifications
4. Export chart data to CSV
5. Compare volume across different time periods

## Support

For issues:
1. Check backend logs for cron job execution
2. Verify smart contracts are accessible
3. Test Price API connectivity
4. Review browser console for frontend errors

---

**Last Updated:** December 5, 2024  
**Backend Version:** 2.0.0  
**Frontend Version:** 1.5.0
