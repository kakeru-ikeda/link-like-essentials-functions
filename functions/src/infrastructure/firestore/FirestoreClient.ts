import { Firestore } from 'firebase-admin/firestore';

import { getFirestore } from '@/config/firebase';

export class FirestoreClient {
  private db: Firestore;

  constructor() {
    this.db = getFirestore();
  }

  public getDb(): Firestore {
    return this.db;
  }

  public collection(path: string): FirebaseFirestore.CollectionReference {
    return this.db.collection(path);
  }

  public doc(path: string): FirebaseFirestore.DocumentReference {
    return this.db.doc(path);
  }
}
