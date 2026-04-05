import type { Timestamp } from 'firebase-admin/firestore';

import type { CardFilter } from '@/domain/entities/CardFilter';

export type AiFeedbackRating = 'positive' | 'negative';

export interface AiFeedback {
  id: string;
  uid: string;
  userInput: string;
  aiResponse: CardFilter;
  rating: AiFeedbackRating;
  comment?: string | null;
  correctedFilter?: CardFilter | null;
  modelName: string;
  promptVersion: string;
  latencyMs?: number | null;
  createdAt: Timestamp;
}

export interface AiFeedbackCreateInput {
  uid: string;
  userInput: string;
  aiResponse: CardFilter;
  rating: AiFeedbackRating;
  comment?: string | null;
  correctedFilter?: CardFilter | null;
  modelName: string;
  promptVersion: string;
  latencyMs?: number | null;
}
