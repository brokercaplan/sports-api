# 📍 City & Location Search - API Examples

Perfect for integrating sports events into your Help Wanted PWA map!

## Quick Examples

### 1. Search by City Name

**Find all events in Miami:**
```bash
GET /api/events/city/miami
```

**Response:**
```json
{
  "success": true,
  "city": "miami",
  "count": 5,
  "data": [
    {
      "id": 1,
      "home_team_name": "Miami Heat",
      "away_team_name": "Los Angeles Lakers",
      "event_date": "2026-03-03T19:30:00Z",
      "venue_name": "Kaseya Center",
      "venue_city": "Miami",
      "venue_state": "FL",
      "venue_latitude": 25.7814,
      "venue_longitude": -80.1870,
      "ticket_url": "https://seatgeek.com/..."
    }
  ]
}
```

### 2. Proximity Search (Map Integration)

**Find events within 25 miles:**
```bash
GET /api/events/nearby?lat=25.7617&lng=-80.1918&radius=25
```

Miami Beach coordinates: `lat=25.7617, lng=-80.1918`

**Response includes distance:**
```json
{
  "success": true,
  "location": { "lat": 25.7617, "lng": -80.1918 },
  "radius": 25,
  "count": 8,
  "data": [
    {
      "home_team_name": "Miami Heat",
      "venue_city": "Miami",
      "distance_miles": 3.42,
      "venue_latitude": 25.7814,
      "venue_longitude": -80.1870
    }
  ]
}
```

### 3. Search by State

**All events in Florida:**
```bash
GET /api/events?state=FL
```

---

## Integration with Your Help Wanted PWA

### Show Events on Map

```javascript
// Get user location
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;
  
  // Find nearby sports events
  const response = await fetch(
    `https://your-api.com/api/events/nearby?lat=${latitude}&lng=${longitude}&radius=25`
  );
  const data = await response.json();
  
  // Add to map
  data.data.forEach(event => {
    map.addMarker({
      lat: event.venue_latitude,
      lng: event.venue_longitude,
      title: `${event.away_team_name} @ ${event.home_team_name}`,
      description: `${event.venue_city} - ${event.distance_miles} mi away`,
      icon: '🏈',
      link: event.ticket_url
    });
  });
});
```

### City Filter

```javascript
async function loadCityEvents(city) {
  const response = await fetch(
    `https://your-api.com/api/events/city/${city}`
  );
  const data = await response.json();
  
  // Display events
  console.log(`${data.count} events in ${city}`);
  data.data.forEach(event => addEventToMap(event));
}

loadCityEvents('miami');      // 5 events
loadCityEvents('orlando');    // 8 events
loadCityEvents('tampa');      // 4 events
```

---

## Major Florida City Coordinates

```javascript
const cities = {
  miami: { lat: 25.7617, lng: -80.1918 },
  miami_beach: { lat: 25.7907, lng: -80.1300 },
  fort_lauderdale: { lat: 26.1224, lng: -80.1373 },
  orlando: { lat: 28.5383, lng: -81.3792 },
  tampa: { lat: 27.9506, lng: -82.4572 }
};
```

---

## New API Endpoints

✅ `GET /api/events?city=miami` - Filter by city  
✅ `GET /api/events?state=FL` - Filter by state  
✅ `GET /api/events/city/:cityname` - Dedicated city endpoint  
✅ `GET /api/events/nearby?lat=X&lng=Y&radius=25` - Proximity search  

**Perfect for your map-based PWA!** 🗺️
