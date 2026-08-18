import { Injectable } from '@angular/core';
import type { CurrentQuestionDto, SubmitAnswerResult } from '../models/types';

@Injectable({ providedIn: 'root' })
export class QuizService {
  computeIsCorrect(
    selectedOptionId: string,
    correctOptionId: string,
    _options: CurrentQuestionDto['options'],
  ): boolean {
    if (!correctOptionId) {
      return false;
    }
    return String(selectedOptionId ?? '').trim().toUpperCase() ===
      String(correctOptionId ?? '').trim().toUpperCase();
  }

  buildLocalResult(
    selectedOptionId: string,
    correctOptionId: string,
    question: CurrentQuestionDto | null,
    responseTime: number,
  ): SubmitAnswerResult {
    const isCorrect = this.computeIsCorrect(selectedOptionId, correctOptionId, question?.options ?? []);

    return {
      answerId: 'local-' + Date.now(),
      isCorrect,
      scoreEarned: isCorrect ? 1000 : 0,
      correctOptionId,
      responseTimeInSeconds: responseTime,
    };
  }
}
