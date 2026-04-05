import type { AiFeedback, AiFeedbackCreateInput } from '../entities/AiFeedback';

export interface IAiFeedbackRepository {
  createFeedback(input: AiFeedbackCreateInput): Promise<AiFeedback>;
}
