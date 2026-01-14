
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: 'https://studio-288338678-646a3-default-rtdb.asia-southeast1.firebasedatabase.app',
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

const db = admin.database();
export { db as adminDatabase };
