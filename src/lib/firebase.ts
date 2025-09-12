'use client';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  projectId: 'studio-288338678-646a3',
  appId: '1:711064706944:web:25d7173846e803e1efeb65',
  storageBucket: 'studio-288338678-646a3.firebasestorage.app',
  apiKey: 'AIzaSyCs6YdyKhNdnXbbhmmEjq54obYSCnlV_ec',
  authDomain: 'studio-288338678-646a3.firebaseapp.com',
  messagingSenderId: '711064706944',
  databaseURL: 'https://studio-288338678-646a3-default-rtdb.asia-southeast1.firebasedatabase.app/',
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const database = getDatabase(app);

// Get messaging instance
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;


export { app, auth, database, messaging };
