import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const url = `https://places.googleapis.com/v1/places:searchText`;

  // 1. Adicionámos horários, preço e website ao FieldMask
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey || '',
      'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.businessStatus,places.location,places.types,places.regularOpeningHours,places.priceLevel,places.websiteUri'
    },
    body: JSON.stringify({
      textQuery: "restaurants and bars near R. Conde Agrolongo 29, Esposende",
      maxResultCount: 20,
    }),
  });

  const data = await response.json();
  const guestHouseCoords = { lat: 41.5332, lng: -8.7836 };
  
  const formattedResults = data.places?.map((p: any) => {
    // 2. Cálculo de distância convertido para Metros reais
    const dLat = p.location.latitude - guestHouseCoords.lat;
    const dLng = p.location.longitude - guestHouseCoords.lng;
    const distanceDegrees = Math.sqrt(dLat * dLat + dLng * dLng);
    const distanceInMeters = Math.round(distanceDegrees * 111000); // 1 grau ~= 111km
    const distanceText = distanceInMeters > 1000 ? `${(distanceInMeters / 1000).toFixed(1)} km` : `${distanceInMeters} m`;
    
    const types = p.types || [];
    const isRestaurant = types.includes("restaurant");
    const isBar = types.includes("bar") || types.includes("night_club");
    let category = isRestaurant && isBar ? "Restaurante & Bar" : isRestaurant ? "Restaurante" : isBar ? "Bar" : "Local";

    return {
      name: p.displayName.text,
      rating: p.rating || 0,
      user_ratings_total: p.userRatingCount || 0,
      business_status: p.businessStatus,
      category: category,
      distance: distanceDegrees, // Para ordenação
      distanceText: distanceText, // Para o ecrã
      priceLevel: p.priceLevel,
      websiteUri: p.websiteUri,
      weekdayDescriptions: p.regularOpeningHours?.weekdayDescriptions || [], // Horários da semana
      opening_hours: { open_now: p.businessStatus === "OPERATIONAL" }
    };
  }) || [];

  formattedResults.sort((a: any, b: any) => {
    const distDiff = a.distance - b.distance;
    if (Math.abs(distDiff) < 0.0005) {
      return b.rating - a.rating;
    }
    return distDiff;
  });

  return NextResponse.json(formattedResults.slice(0, 15)); 
}