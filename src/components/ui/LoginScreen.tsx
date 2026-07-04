import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_COUNTRIES } from "@/lib/countries"; 

interface LoginScreenProps {
  onLogin: (name: string, flag: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [tempName, setTempName] = useState("");
  const [selectedFlag, setSelectedFlag] = useState("🇵🇹"); // Corrigido para o emoji padrão

  const handleEnter = () => {
    if (tempName.trim().length > 0) {
      onLogin(tempName.trim(), selectedFlag);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-slate-700 bg-slate-800 text-slate-100 shadow-2xl">
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-2xl text-white">O Farol do Peregrino</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            placeholder="O seu nome / Grupo"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
          />
          
          {/* Corrigido para value={c.flag} em vez de c.code que não existia */}
          <select
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
            value={selectedFlag}
            onChange={(e) => setSelectedFlag(e.target.value)}
          >
            {ALL_COUNTRIES.map((c) => (
              <option key={c.name} value={c.flag}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleEnter}
            disabled={tempName.trim().length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors uppercase tracking-wider text-sm"
          >
            Entrar na App
          </button>
        </CardContent>
      </Card>
    </main>
  );
}