"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, Footprints, Image as ImageIcon, Loader2, Star, ExternalLink, Clock, ChevronDown, ChevronUp, Phone, Camera, CheckCircle2, Trash2 } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";


import LoginScreen from "@/components/ui/LoginScreen";

const getFlagImageUrl = (flagEmoji: string) => {
  if (!flagEmoji) return "https://flagcdn.com/24x18/pt.png";
  if (flagEmoji.length === 2 && /^[a-zA-Z]+$/.test(flagEmoji)) return `https://flagcdn.com/24x18/${flagEmoji.toLowerCase()}.png`;
  try {
    const isoCode = Array.from(flagEmoji).map(c => String.fromCharCode(c.codePointAt(0)! - 127365)).join('');
    if (isoCode.length === 2 && /^[a-z]+$/.test(isoCode)) return `https://flagcdn.com/24x18/${isoCode}.png`;
  } catch (e) {}
  return "https://flagcdn.com/24x18/pt.png";
};

export default function GuestHouseApp() {
  // ESTADO DE ARRANQUE (Evita que o ecrã de login pisque antes de ler a memória)
  const [isMounted, setIsMounted] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userFlag, setUserFlag] = useState(""); 
  const [reservationId, setReservationId] = useState("GH-2026-XX");

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [isExpandedRestaurants, setIsExpandedRestaurants] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);

  const [attractions, setAttractions] = useState<any[]>([]);
  const [loadingAttractions, setLoadingAttractions] = useState(true);
  const [isExpandedAttractions, setIsExpandedAttractions] = useState(false);
  const [selectedAttraction, setSelectedAttraction] = useState<number | null>(null);

  const [weather, setWeather] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const [userPhoto, setUserPhoto] = useState<string | null>(null); 
  const [visiblePhotosCount, setVisiblePhotosCount] = useState(2);
  const [communityPhotos, setCommunityPhotos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("esposende");

  

  // 1. LER A MEMÓRIA AO ABRIR A APP (O "Refresh")
  useEffect(() => {
    setIsMounted(true); // Diz ao React que a app já carregou no browser
    
    // Vai procurar no localStorage se o utilizador já lá estava
    const savedLogin = localStorage.getItem("gh_isLoggedIn");
    
    if (savedLogin === "true") {
      setIsLoggedIn(true);
      setUserName(localStorage.getItem("gh_userName") || "");
      setUserFlag(localStorage.getItem("gh_userFlag") || "");
      setReservationId(localStorage.getItem("gh_reservationId") || "GH-2026-XX");
    }

    // Procura se já há uma foto guardada
    const savedPhoto = localStorage.getItem("gh_userPhoto");
    if (savedPhoto) {
      setUserPhoto(savedPhoto);
    }
    
    // Procura em que aba o utilizador estava
    const savedTab = localStorage.getItem("gh_activeTab");
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!isLoggedIn) return;
      
      try {
        // 1. Carrega dados de restaurantes/clima (API)
        const [res, attr, wth] = await Promise.all([
            fetch('/api/places'), fetch('/api/attractions'), fetch('/api/weather')
        ]);
        setRestaurants(await res.json());
        setAttractions(await attr.json());
        setWeather(await wth.json());

        // 2. CARREGA FOTOS DO FIREBASE
        const q = query(collection(db, "mural"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const fotosFirebase = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            isUser: data.author === userName
          };
        });
        setCommunityPhotos(fotosFirebase);

      } catch (err) { console.error("Erro ao carregar dados:", err); } 
      finally { 
        setLoadingRestaurants(false); 
        setLoadingAttractions(false); 
        setLoadingWeather(false); 
      }
    }
    fetchData();
  }, [isLoggedIn]);

  const handleLoginSuccess = async (name: string, flag: string) => {
    setUserName(name);
    setUserFlag(flag); 
    const initials = name.substring(0, 2).toUpperCase();
    const newResId = `GH-26-${initials}${Math.floor(Math.random() * 999)}`;
    setReservationId(newResId);
    setIsLoggedIn(true);

    // 1. Grava no browser
    localStorage.setItem("gh_isLoggedIn", "true");
    localStorage.setItem("gh_userName", name);
    localStorage.setItem("gh_userFlag", flag);
    localStorage.setItem("gh_reservationId", newResId);

    // 2. REGISTA NO FIREBASE (TESTE DE LOGIN)
    try {
      await addDoc(collection(db, "peregrinos"), {
        nome: name,
        bandeira: flag,
        reservaId: newResId,
        dataLogin: new Date().toISOString()
      });
      console.log("Peregrino registado na base de dados!");
    } catch (error) {
      console.error("Erro ao registar peregrino:", error);
    }
  };

  // 3. GRAVAR A FOTO NA MEMÓRIA EM FORMATO DE TEXTO (Base64)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Criar uma referência para o ficheiro no Storage
    const storageRef = ref(storage, `fotos-peregrinos/${Date.now()}_${file.name}`);
    
    try {
      // 2. Enviar a foto para o Firebase
      const snapshot = await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(snapshot.ref);

      // 3. Guardar a informação na Base de Dados (Firestore)
      await addDoc(collection(db, "mural"), {
        src: photoUrl,
        author: userName,
        flag: userFlag,
        date: new Date().toISOString(),
        reservationId: reservationId
      });

      // Recarregar o mural após o upload
      window.location.reload(); 
    } catch (error) {
      console.error("Erro ao subir a foto:", error);
    }
  };

  const handleDeletePhoto = async () => {
    if (window.confirm("Apagar permanentemente esta foto do mural?")) {
      try {
        // Encontra o documento da foto do utilizador no Firestore
        const q = query(collection(db, "mural"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        const userDoc = snapshot.docs.find(doc => doc.data().author === userName);
        
        if (userDoc) {
          await deleteDoc(doc(db, "mural", userDoc.id));
        }
        
        setUserPhoto(null);
        localStorage.removeItem("gh_userPhoto");
        window.location.reload(); // Recarrega para limpar o mural
      } catch (e) {
        console.error("Erro ao apagar:", e);
      }
    }
  };


  const getPriceIcon = (level: string) => {
    switch(level) {
      case 'PRICE_LEVEL_INEXPENSIVE': return '💶 Económico';
      case 'PRICE_LEVEL_MODERATE': return '💶💶 Moderado';
      case 'PRICE_LEVEL_EXPENSIVE': return '💶💶💶 Caro';
      default: return 'Preço indisponível';
    }
  };

  const allPhotos = [
    ...(userPhoto ? [{ id: 'user-photo', author: userName, flag: userFlag, date: 'Hoje', tag: 'Porta de Entrada', src: userPhoto, isUser: true }] : []),
    ...communityPhotos
  ];
  
  const visiblePhotos = allPhotos.slice(0, visiblePhotosCount);
  const hasUserUploadedPhoto = allPhotos.some(photo => photo.isUser);

  // Ecrã de carregamento super rápido antes de decidir se mostra o Login ou a App
  if (!isMounted) return <div className="min-h-screen bg-slate-900" />;

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLoginSuccess} />;
  }

  return (
    <main className="min-h-screen flex flex-col font-sans relative">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        >
          <source src="/sunset_bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col w-full h-full">
      
      <header className="relative top-0 z-50 bg-[#E5C48A]/20 text-white p-6 shadow-md rounded-b-2xl">
        {/* Voltámos ao 'flex row' normal (lado a lado) com um espaçamento (gap-4) entre a imagem e o texto */}
        <div className="flex items-center gap-4">
          
          {/* LOGÓTIPO DA GUEST HOUSE À ESQUERDA */}
          <div className="shrink-0">
            <img 
              src="/logo.png" 
              alt="Logo Guest House" 
              className="w-20 h-auto object-contain" 
            />
          </div>
          
          {/* TÍTULO E BEM-VINDO À DIREITA */}
          <div className="flex flex-col justify-center">
            {/* Mantemos a tipografia serif e o estilo elegante */}
            <h1 className="text-2xl font-serif font-medium tracking-wide">River & Friends</h1>
            
            <div className="text-slate-600 text-sm mt-1 flex items-center gap-1.5">
              Welcome to Esposende, <strong className="text-blue-500">{userName}</strong>
              <img src={getFlagImageUrl(userFlag)} alt="bandeira" className="w-5 h-3.5 rounded-sm shadow-sm" />!
            </div>
          </div>

        </div>
      </header>

      <Tabs 
        value={activeTab} 
        onValueChange={(value) => {
          setActiveTab(value);
          localStorage.setItem("gh_activeTab", value);
        }}
        className="flex-1 flex flex-col mt-4 px-4 pb-24"
      >
        
        {/* ABA 1: ESPOSENDE */}
        <TabsContent value="esposende" className="flex-1 mt-0 animate-in fade-in duration-500 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Discover Esposende</h2>
          
          <Card className="border-slate-200 bg-[#5499c7]/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-900">Points of Interest</CardTitle>
              <CardDescription className=" text-blue-200" >Tourist and natural sites in the area.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAttractions ? (
                <div className="flex justify-center py-6 text-blue-600"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {(isExpandedAttractions ? attractions : attractions.slice(0, 4)).map((attraction, index) => (
                    <div key={index} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="cursor-pointer group" onClick={() => setSelectedAttraction(selectedAttraction === index ? null : index)}>
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-sm text-slate-800 truncate pr-2 group-hover:text-blue-600 transition-colors">{attraction.name}</h3>
                          <div className="flex items-center gap-2">
                            {attraction.rating > 0 && <span className="text-yellow-500 flex items-center text-xs font-bold whitespace-nowrap">{attraction.rating} <Star className="w-3 h-3 ml-1 fill-current" /></span>}
                            {selectedAttraction === index ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">{attraction.category}</p>
                      </div>
                      {selectedAttraction === index && (
                        <div className="mt-3 p-3 bg-slate-100/50 rounded-lg border border-slate-100 animate-in slide-in-from-top-2 duration-200 space-y-3">
                          <p className="text-xs text-slate-600 leading-relaxed">{attraction.description}</p>
                          {attraction.phone && <p className="text-[11px] text-slate-500 flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> {attraction.phone}</p>}
                          <div className="flex gap-2 pt-1">
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(attraction.name + ' Esposende')}`} target="_blank" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded-md text-[10px] font-bold uppercase transition-colors">View on Map</a>
                            {attraction.websiteUri && <a href={attraction.websiteUri} target="_blank" className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-center py-2 rounded-md text-[10px] font-bold uppercase flex items-center justify-center gap-1 transition-colors">Official Website <ExternalLink className="w-3 h-3" /></a>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {attractions.length > 4 && (
                    <button onClick={() => setIsExpandedAttractions(!isExpandedAttractions)} className="w-full mt-4 py-3 bg-slate-100 text-blue-700 hover:bg-slate-200 text-xs font-bold uppercase tracking-wide rounded-md transition-colors flex justify-center items-center">
                      {isExpandedAttractions ? "See More" : "See Less"}
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-[#5499c9]/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-900">Where to Eat / Drink?</CardTitle>
              <CardDescription className="text-blue-200" >Restaurants and bars in the area.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRestaurants ? (
                <div className="flex justify-center py-6 text-blue-600"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {(isExpandedRestaurants ? restaurants : restaurants.slice(0, 5)).map((place, index) => (
                    <div key={index} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="cursor-pointer group" onClick={() => setSelectedPlace(selectedPlace === index ? null : index)}>
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-sm text-slate-800 truncate pr-2 group-hover:text-blue-600 transition-colors">{place.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-500 flex items-center text-xs font-bold whitespace-nowrap">{place.rating || "N/A"} <Star className="w-3 h-3 ml-1 fill-current" /></span>
                            {selectedPlace === index ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <div className="flex mt-0.5"><p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{place.category}</p></div>
                      </div>
                      {selectedPlace === index && (
                        <div className="mt-3 p-3 bg-slate-100/50 rounded-lg border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/60">
                            <span className="text-xs font-semibold text-slate-700">{getPriceIcon(place.priceLevel)}</span>
                            {place.opening_hours?.open_now ? <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Open Now</span> : <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">Closed for now</span>}
                          </div>
                          {place.weekdayDescriptions?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1 mb-1.5"><Clock className="w-3 h-3 text-slate-500" /> Weekly Hours</p>
                              <ul className="text-[10px] text-slate-600 space-y-1 pl-4">{place.weekdayDescriptions.map((desc: string, i: number) => <li key={i}>{desc}</li>)}</ul>
                            </div>
                          )}
                          <div className="flex gap-2 mt-2">
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' Esposende')}`} target="_blank" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded-md text-[10px] font-bold uppercase transition-colors">View on Map</a>
                            {place.websiteUri && <a href={place.websiteUri} target="_blank" className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-center py-2 rounded-md text-[10px] font-bold uppercase flex items-center justify-center gap-1 transition-colors">View Menu <ExternalLink className="w-3 h-3" /></a>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {restaurants.length > 5 && (
                    <button onClick={() => setIsExpandedRestaurants(!isExpandedRestaurants)} className="w-full mt-4 py-3 bg-slate-100 text-blue-700 hover:bg-slate-200 text-xs font-bold uppercase tracking-wide rounded-md transition-colors flex justify-center items-center">
                      {isExpandedRestaurants ? "View Less Options" : "View More Places"}
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: A ETAPA DE AMANHÃ */}
        <TabsContent value="etapa" className="flex-1 mt-0 animate-in fade-in duration-500 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Tomorro's Stage</h2>
          
          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-blue-900 to-slate-900 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-200 font-medium uppercase tracking-wider text-[10px]">Portuguese Coast Path</CardDescription>
              <CardTitle className="text-2xl">Esposende → Viana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="flex flex-col"><span className="text-blue-300 text-[10px] uppercase font-bold">Distance</span><span className="text-xl font-bold">25.5 <span className="text-sm font-normal text-blue-200">km</span></span></div>
                <div className="flex flex-col"><span className="text-blue-300 text-[10px] uppercase font-bold">Difficulty</span><span className="text-xl font-bold text-emerald-400">Light</span></div>
                <div className="flex flex-col"><span className="text-blue-300 text-[10px] uppercase font-bold">Average Time</span><span className="text-xl font-bold">6 <span className="text-sm font-normal text-blue-200">hours</span></span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-[#F7A06E]/70">
            <CardHeader className="pb-2"><CardTitle className="text-lg text-blue-900 flex items-center justify-between">Tomorrow's Forecast <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Source: IPMA</span></CardTitle></CardHeader>
            <CardContent>
              {loadingWeather ? ( <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div> ) : weather ? (
                <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <div className="flex flex-col"><span className="text-3xl font-black text-slate-800">{weather.tMax}°<span className="text-lg text-slate-500 font-medium">/ {weather.tMin}°</span></span><span className="text-xs font-semibold text-blue-700 mt-1">Destiny: Viana do Castelo</span></div>
                  <div className="flex flex-col items-end"><div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100"><span className="text-lg">{weather.precipProb > 50 ? '🌧️' : weather.precipProb > 20 ? '⛅' : '☀️'}</span><span className="text-xs font-bold text-slate-700">{weather.precipProb}% Rain</span></div></div>
                </div>
              ) : ( <p className="text-sm text-slate-500">Weather data unavailable.</p> )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-[#F7A06E]/70">
            <CardHeader className="pb-4"><CardTitle className="text-lg text-blue-900 flex items-center justify-between">Elevation Profile <span className="text-xs font-bold text-slate-500">↑ 180m Cumulative</span></CardTitle></CardHeader>
            <CardContent>
              <div className="relative h-24 w-full flex items-end border-b border-slate-200 gap-1 pb-1">
                <div className="w-full bg-blue-200 rounded-t-sm" style={{ height: '10%' }}></div>
                <div className="w-full bg-blue-300 rounded-t-sm" style={{ height: '15%' }}></div>
                <div className="w-full bg-blue-400 rounded-t-sm" style={{ height: '30%' }}></div>
                <div className="w-full bg-blue-500 rounded-t-sm relative group" style={{ height: '60%' }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 bg-white px-1 rounded shadow-sm opacity-0 group-hover:opacity-100">Monte S. Romão</span></div>
                <div className="w-full bg-blue-400 rounded-t-sm" style={{ height: '40%' }}></div>
                <div className="w-full bg-blue-300 rounded-t-sm" style={{ height: '20%' }}></div>
                <div className="w-full bg-emerald-400 rounded-t-sm relative group" style={{ height: '10%' }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 bg-white px-1 rounded shadow-sm opacity-0 group-hover:opacity-100">Rio Neiva</span></div>
                <div className="w-full bg-blue-300 rounded-t-sm" style={{ height: '25%' }}></div>
                <div className="w-full bg-blue-400 rounded-t-sm" style={{ height: '45%' }}></div>
                <div className="w-full bg-blue-300 rounded-t-sm" style={{ height: '20%' }}></div>
                <div className="w-full bg-blue-200 rounded-t-sm" style={{ height: '5%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700 font-bold mt-2 uppercase tracking-wider"><span>Esposende</span><span>Castelo do Neiva</span><span>Viana</span></div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-[#F7A06E]/70">
            <CardHeader className="pb-2"><CardTitle className="text-lg text-blue-900">Mandatory Passage</CardTitle><CardDescription className="text-blue-900" >Historical and geographical locations directly on the yellow arrow.</CardDescription></CardHeader>
            <CardContent className="pt-2">
              <div className="relative border-l-2 border-blue-100 space-y-6 ml-3">
                <div className="relative pl-8">
                  <div className="absolute -left-[17px] top-0 bg-blue-600 text-white text-[9px] font-bold w-8 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">3k</div>
                  <h4 className="font-semibold text-sm text-slate-800">Almas das Marinhas</h4>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">A historic wayside cross and a traditional stopping and prayer point for pilgrims since the Middle Ages. It is located just outside the town center of Esposende.</p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute -left-[17px] top-0 bg-blue-600 text-white text-[9px] font-bold w-8 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">9k</div>
                  <h4 className="font-semibold text-sm text-slate-800">Ponte de Tábuas (Rio Neiva)</h4>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">A famous and picturesque pedestrian passage made of wooden stakes over the Rio Neiva. It is one of the most photographed and emblematic points of the entire Costa Route.</p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute -left-[17px] top-0 bg-amber-500 text-white text-[9px] font-bold w-8 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">11k</div>
                  <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5 flex-wrap">Igreja de Santiago de Castelo do Neiva <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded mt-1 sm:mt-0">★ Historical</span></h4>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">Probably the **oldest church dedicated to Santiago** in the world outside of Galicia (year 862). It has a mandatory historical stamp for the credential right in the atrium.</p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute -left-[17px] top-0 bg-blue-600 text-white text-[9px] font-bold w-8 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">24k</div>
                  <h4 className="font-semibold text-sm text-slate-800">Pinhal e Dunas do Cabedelo</h4>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">The final section of the wooden boardwalks, crossing the maritime pine forest and the dunes, offering the first panoramic view of the Lima River estuary and Monte de Santa Luzia.</p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute -left-[17px] top-0 bg-emerald-600 text-white text-[9px] font-bold w-8 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">25k</div>
                  <h4 className="font-semibold text-sm text-slate-800">Ponte Eiffel</h4>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">A iconic iron structure designed by the mythical Gustave Eiffel company in 1878. Crossing it on the lateral walkway marks the triumphant entrance and the end of the stage in Viana do Castelo.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      {/* ABA 3: ÁLBUM COMUNITÁRIO "PORTA DE ENTRADA" */}
        <TabsContent value="album" className="flex-1 mt-0 animate-in fade-in duration-500 space-y-4">
          
          <div className="flex justify-between items-center bg-slate-900 text-slate-100 p-4 rounded-xl shadow-sm border border-slate-800">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Reservation ID</span>
              <span className="text-xs font-mono font-bold text-blue-400">{reservationId}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Strict Quota</span>
              <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${hasUserUploadedPhoto ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                {hasUserUploadedPhoto ? '1 / 1 Sold Out' : '0 / 1 Available'}
              </span>
            </div>
          </div>

          {!hasUserUploadedPhoto ? (
            <Card className="border-slate-200 shadow-sm border-dashed bg-slate-50/50">
              <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                <div className="bg-blue-100 p-3 rounded-full mb-2 text-blue-600">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-slate-700 mb-1">Entrace Door</h3>
                <p className="text-[11px] text-slate-500 mb-4 px-4 leading-relaxed">
                  A photo of you or your hiking group at the iconic **main entrance of the Guest House**.
                </p>
                
                <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full text-xs uppercase tracking-wider cursor-pointer transition-colors shadow-sm flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" />
                  Register Your Memory
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={handlePhotoUpload}
                  />
                </label>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm animate-in fade-in">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-xs text-emerald-950">Collective Digital Memory Registered!</h4>
                  <p className="text-[11px] text-emerald-700">Thank you for leaving your mark. Your quota is filled for this stay.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Historical Hiker Mural</h3>
            
            {allPhotos.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-100/50 rounded-xl border border-dashed border-slate-200">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">There are no memories registered yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">Take a photo to be the first to leave your mark!</p>
              </div>
            ) : (
              <>
                <div className="columns-2 gap-3 space-y-3">
                  {visiblePhotos.map((photo) => (
                    <div key={photo.id} className={`break-inside-avoid relative rounded-xl overflow-hidden shadow-sm border ${photo.isUser ? 'border-2 border-emerald-500 shadow-md animate-in zoom-in-95 duration-300' : 'border-slate-200'} bg-white group`}>
                      <img 
                        src={photo.src} 
                        alt={`Historical Photo`} 
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                      
                      {/* BOTÃO DE APAGAR: Aparece apenas na sua foto */}
                      {photo.isUser && (
                        <button 
                          onClick={handleDeletePhoto}
                          className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white p-1.5 rounded-md backdrop-blur-sm transition-colors shadow-sm z-10"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2">
                        <div className="text-white text-[10px] font-bold truncate flex items-center gap-1.5">
                          {photo.author} <img src={getFlagImageUrl(photo.flag)} alt="bandeira" className="w-5 h-3.5 rounded-sm shadow-sm" />
                        </div>
                        <p className="text-slate-300 text-[8px]">{photo.isUser ? `ID: ${reservationId} • Today` : `${photo.date} • ${photo.tag}`}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {allPhotos.length > visiblePhotosCount && (
                  <button 
                    onClick={() => setVisiblePhotosCount(prev => prev + 4)} 
                    className="w-full mt-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wide rounded-md transition-colors flex justify-center items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" /> View More Photos
                  </button>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <div className="fixed bottom-0 left-0 right-0 bg-[#5499c7]/85 border-t border-slate-200 p-3 z-40">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-[#5499c9]">
            <TabsTrigger value="esposende"><Map className="w-5 h-5" /></TabsTrigger>
            <TabsTrigger value="etapa"><Footprints className="w-5 h-5" /></TabsTrigger>
            <TabsTrigger value="album"><ImageIcon className="w-5 h-5" /></TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
      
      </div> {/* <-- Fecho do contentor da app */}
    </main>
  );
}