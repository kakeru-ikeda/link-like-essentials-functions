import * as admin from 'firebase-admin';

export const initializeFirebase = (): void => {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
};

export const getFirestore = (): admin.firestore.Firestore => {
  const firestore = admin.firestore();
  
  // Firestoreエミュレータの自動検出
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`🔧 Using Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  }
  
  return firestore;
};

export const getAuth = (): admin.auth.Auth => {
  return admin.auth();
};
