import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Substitua estas configurações pelas suas do console do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDFX0c1y3xl9VW5x5jmFAzCijb3vkdnSiM",
  authDomain: "parking-control-cursor.firebaseapp.com",
  projectId: "parking-control-cursor",
  storageBucket: "parking-control-cursor.firebasestorage.app",
  messagingSenderId: "834405759338",
  appId: "1:834405759338:web:f6d35c892517cf27534d13"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 