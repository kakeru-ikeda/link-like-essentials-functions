import { Timestamp } from 'firebase-admin/firestore';

import type {
  User,
  UserCreateInput,
  UserRole,
  UserUpdateInput,
} from '@/domain/entities/User';
import { NotFoundError } from '@/domain/errors/AppError';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import { FirestoreClient } from '@/infrastructure/firestore/FirestoreClient';
import { sanitizeForFirestore } from '@/infrastructure/firestore/firestoreUtils';

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

    return this.buildUserFromDocument(doc);
  }

  async findByUids(uids: string[]): Promise<User[]> {
    if (uids.length === 0) {
      return [];
    }

    const uniqueUids = Array.from(new Set(uids));
    const docRefs = uniqueUids.map((uid) =>
      this.firestoreClient.collection(this.COLLECTION_NAME).doc(uid)
    );
    const snapshots = await this.firestoreClient.getDb().getAll(...docRefs);

    return snapshots
      .filter((doc) => doc.exists)
      .map((doc) => this.buildUserFromDocument(doc));
  }

  async create(input: UserCreateInput): Promise<User> {
    const now = Timestamp.now();

    const userData = {
      displayName: input.displayName,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      role: this.resolveRole(input.role),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = this.firestoreClient
      .collection(this.COLLECTION_NAME)
      .doc(input.uid);

    // undefined を null に変換してから保存
    await docRef.set(sanitizeForFirestore(userData));

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
      updatedAt: Timestamp.now(),
    };

    if (input.llid !== undefined) {
      updateData.llid = input.llid;
    }

    if (input.displayName !== undefined) {
      updateData.displayName = input.displayName;
    }

    if (input.bio !== undefined) {
      updateData.bio = input.bio;
    }

    if (input.avatarUrl !== undefined) {
      updateData.avatarUrl = input.avatarUrl;
    }

    if (input.role !== undefined) {
      updateData.role = input.role;
    }

    // undefined を null に変換してから保存
    await docRef.set(sanitizeForFirestore(updateData), { merge: true });

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data() as Partial<User>;
    return {
      uid: updatedDoc.id,
      llid: updatedData.llid ?? null,
      displayName: updatedData.displayName as string,
      bio: updatedData.bio ?? null,
      avatarUrl: updatedData.avatarUrl ?? null,
      role: this.resolveRole(updatedData.role),
      createdAt: updatedData.createdAt as Timestamp,
      updatedAt: updatedData.updatedAt as Timestamp,
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

  private buildUserFromDocument(
    doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
  ): User {
    const data = doc.data() as Partial<User>;

    return {
      uid: doc.id,
      llid: data.llid ?? null,
      displayName: data.displayName as string,
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl ?? null,
      role: this.resolveRole(data.role),
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    };
  }

  private resolveRole(role: UserRole | null | undefined): UserRole {
    return role ?? 'anonymous';
  }
}
