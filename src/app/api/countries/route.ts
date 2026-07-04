import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch("https://restcountries.com/v3.1/all?fields=translations,flag", {
      next: { revalidate: 86400 } // Guarda em cache por 24 horas
    });
    
    if (!response.ok) throw new Error("Falha na API externa");
    
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Erro no Servidor ao buscar países:", error);
    return NextResponse.json({ error: "Falha ao obter países" }, { status: 500 });
  }
}