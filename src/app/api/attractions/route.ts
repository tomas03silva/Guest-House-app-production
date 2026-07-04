import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const url = `https://places.googleapis.com/v1/places:searchText`;

  // Pedimos campos específicos para atrações: descrição editorial, site e telefone
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey || '',
      'X-Goog-FieldMask': 'places.displayName,places.rating,places.location,places.types,places.editorialSummary,places.websiteUri,places.internationalPhoneNumber'
    },
    body: JSON.stringify({
      // Procuramos uma mistura de pontos turísticos, culturais e naturais de Esposende
      textQuery: "relevant tourist attractions, points of interest, sea attractions, sports, parks, museums, beaches in Esposende",
      maxResultCount: 15,
    }),
  });

  const data = await response.json();
  const guestHouseCoords = { lat: 41.5332, lng: -8.7836 };
  
  const formattedResults = data.places?.map((p: any) => {
    const dLat = p.location.latitude - guestHouseCoords.lat;
    const dLng = p.location.longitude - guestHouseCoords.lng;
    const distanceDegrees = Math.sqrt(dLat * dLat + dLng * dLng);
    
    // Mapeamento inteligente de categorias para o ecrã
    const types = p.types || [];
    let category = "Atração";
    if (types.includes("museum") || types.includes("cultural_landmark")) category = "Cultura / Museu";
    else if (types.includes("park") || types.includes("amusement_park")) category = "Parque / Lazer";
    else if (types.includes("beach")) category = "Praia / Natureza";
    else if (types.includes("church") || types.includes("place_of_worship")) category = "Histórico / Religioso";

    return {
      name: p.displayName.text,
      rating: p.rating || 0,
      category: category,
      description: p.editorialSummary?.text || "Ponto de interesse local perfeito para explorar durante a sua estadia em Esposende.",
      websiteUri: p.websiteUri,
      phone: p.internationalPhoneNumber || null,
      distance: distanceDegrees
    };
  }) || [];

  // Ordena estritamente por proximidade da Guest House
  formattedResults.sort((a: any, b: any) => a.distance - b.distance);

  return NextResponse.json(formattedResults);
}