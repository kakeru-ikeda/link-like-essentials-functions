import * as admin from 'firebase-admin';

export const initializeFirebase = (): void => {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
};

export const getFirestore = (): admin.firestore.Firestore => {
  const firestore = admin.firestore();

  return firestore;
};

export const getAuth = (): admin.auth.Auth => {
  return admin.auth();
};
