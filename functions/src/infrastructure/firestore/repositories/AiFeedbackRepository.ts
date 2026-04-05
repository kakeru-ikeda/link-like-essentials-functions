import { Timestamp } from 'firebase-admin/firestore';

import type {
  AiFeedback,
  AiFeedbackCreateInput,
} from '@/domain/entities/AiFeedback';
import type { IAiFeedbackRepository } from '@/domain/repositories/IAiFeedbackRepository';
import { FirestoreClient } from '@/infrastructure/firestore/FirestoreClient';
import { sanitizeForFirestore } from '@/infrastructure/firestore/firestoreUtils';

export class AiFeedbackRepository implements IAiFeedbackRepository {
  private readonly AI_FEEDBACK_COLLECTION = 'ai_card_filter_feedback';

  private firestoreClient: FirestoreClient;

  constructor() {
    this.firestoreClient = new FirestoreClient();
  }

  async createFeedback(input: AiFeedbackCreateInput): Promise<AiFeedback> {
    const collectionRef = this.firestoreClient.collection(
      this.AI_FEEDBACK_COLLECTION
    );
    const docRef = collectionRef.doc();
    const now = Timestamp.now();

    const feedback: AiFeedback = {
      id: docRef.id,
      ...input,
      createdAt: now,
    };

    await docRef.set(sanitizeForFirestore(feedback));

    return feedback;
  }
}
