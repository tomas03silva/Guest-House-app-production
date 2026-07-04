// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyClUH3ku37v_w60UN3fBUHVaHDfCaUWF5o",
  authDomain: "app-guest-house-9e545.firebaseapp.com",
  projectId: "app-guest-house-9e545",
  storageBucket: "app-guest-house-9e545.firebasestorage.app",
  messagingSenderId: "262257408068",
  appId: "1:262257408068:web:725a3fdb2f6e30278a6411",
  measurementId: "G-74NTRT151M"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);     // Para guardar os nomes/textos
export const storage = getStorage(app);  // Para guardar as fotos