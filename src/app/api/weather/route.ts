import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // O ID 1160900 corresponde a Viana do Castelo na base de dados do IPMA
    const url = 'https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/1160900.json';
    
    // O 'no-store' garante que o servidor vai sempre buscar os dados mais frescos
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    // O IPMA devolve um array 'data' de 5 dias. O índice [0] é hoje, o [1] é amanhã!
    const tomorrowWeather = data.data[1];

    return NextResponse.json({
      tMin: tomorrowWeather.tMin,
      tMax: tomorrowWeather.tMax,
      precipProb: tomorrowWeather.precipitaProb,
      date: tomorrowWeather.forecastDate,
      // O IPMA usa IDs para o tipo de tempo (ex: 1 = Limpo, 11 = Chuva, etc.)
      idWeatherType: tomorrowWeather.idWeatherType 
    });

  } catch (error) {
    console.error("Erro na API do IPMA:", error);
    return NextResponse.json({ error: "Falha ao obter meteorologia" }, { status: 500 });
  }
}