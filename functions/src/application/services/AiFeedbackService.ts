import type {
  AiFeedback,
  AiFeedbackCreateInput,
} from '@/domain/entities/AiFeedback';
import type { IAiFeedbackRepository } from '@/domain/repositories/IAiFeedbackRepository';

export class AiFeedbackService {
  constructor(private readonly aiFeedbackRepository: IAiFeedbackRepository) {}

  async submitFeedback(input: AiFeedbackCreateInput): Promise<AiFeedback> {
    return this.aiFeedbackRepository.createFeedback(input);
  }
}
