import { Timestamp } from 'firebase-admin/firestore';

import type {
  User,
  UserCreateInput,
  UserUpdateInput,
} from '@/domain/entities/User';
import { NotFoundError } from '@/domain/errors/AppError';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import { FirestoreClient } from '@/infrastructure/firestore/FirestoreClient';

export class UserRepository implements IUserRepository {
  private readonly COLLECTION_NAME = 'users';
  private firestoreClient: FirestoreClient;

  constructor() {
    this.firestoreClient = new FirestoreClient();
  }

  async findByUid(uid: string): Promise<User | null> {
    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      ...(doc.data() as User),
      uid: doc.id,
    };
  }

  async create(input: UserCreateInput): Promise<User> {
    const now = Timestamp.now();

    const userData = {
      displayName: input.displayName,
      bio: input.bio,
      avatarUrl: undefined,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(input.uid);

    await docRef.set(userData);

    return {
      uid: input.uid,
      ...userData,
    };
  }

  async update(uid: string, input: UserUpdateInput): Promise<User> {
    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    const updateData: Record<string, unknown> = {
      ...input,
      updatedAt: Timestamp.now(),
    };

    await docRef.set(updateData, { merge: true });

    const updatedDoc = await docRef.get();
    return {
      ...(updatedDoc.data() as User),
      uid: updatedDoc.id,
    };
  }

  async delete(uid: string): Promise<void> {
    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundError('ユーザーが見つかりません');
    }

    await docRef.delete();
  }
}
