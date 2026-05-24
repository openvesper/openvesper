---
name: weather-aware-itinerary
description: Build itineraries that adapt to weather forecasts
trigger_keywords: [trip, itinerary, travel plan, vacation]
tools: [geocode, daily_forecast, hourly_forecast, places_nearby]
---

# Weather-Aware Itinerary

Always check weather BEFORE finalizing daily plans.

## Process

1. **Geocode destination** → get coordinates
2. **Daily forecast** for trip dates
3. **Classify each day:**
   - ☀️ Sunny: outdoor priorities (parks, walks, viewpoints)
   - ☁️ Cloudy: flexible (good for landmarks, photography ok)
   - 🌧 Rainy: indoor priorities (museums, cafes, indoor markets)
   - ⛈ Stormy: cancel anything exposed; stay flexible
4. **Build day plan** matching weather to activity type

## Indoor backup list (always have these ready)

- Major art museums
- Aquariums / planetariums
- Department stores / covered markets
- Movie theaters
- Spa / hammam / onsen
- Cafes with character
- Live music venues

## Heat/cold contingencies

- **Heat wave** (>32°C): outdoor activities before 10am or after 5pm; siesta 1-4pm
- **Cold snap** (<5°C): morning museums, afternoon outdoor (warmest), evening indoor warmth

## Output format

For each day:
```
Day 1 — 🌤 Partly cloudy, 18°C, 20% rain
Plan: outdoor-friendly, light layers
[itinerary]
```

If multiple days rainy:
**Reshuffle**. Move outdoor highlights to sunny days, indoor to rainy.
