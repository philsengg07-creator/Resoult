'use client';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: 'studio-288338678-646a3',
  appId: '1:711064706944:web:25d7173846e803e1efeb65',
  storageBucket: 'studio-288338678-646a3.firebasestorage.app',
  apiKey: 'AIzaSyCs6YdyKhNdnXbbhmmEjq54obYSCnlV_ec',
  authDomain: 'studio-288338678-646a3.firebaseapp.com',
  messagingSenderId: '711064706944',
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);

export { app, auth };
