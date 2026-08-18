import { Injectable } from '@angular/core';
import { sortOptionsById } from '../data/options';
import type { CurrentQuestionDto, SubmitAnswerResult } from '../models/types';

const EXTRA_TIME_SECONDS = 15;

/**
 * QUIZ SERVİSİ — Sadece şık seçimi, cevap kontrolü ve puanlama.
 *
 * Bu servis SADECE quiz mantığıyla ilgilenir:
 * - Cevap karşılaştırması (isCorrect)
 * - Puan hesaplama (time-factor, joker bonusları)
 * - Tip güvenli eşleşme (optionId, indeks, harf, metin)
 *
 * Lobi katılımı bu servise DOKUNMAZ.
 * Oyun durum geçişleri bu servise DOKUNMAZ.
 */
@Injectable({ providedIn: 'root' })
export class QuizService {
  /**
   * Seçilen şıkkın doğru olup olmadığını tip güvenli şekilde karşılaştır.
   * 4 katmanlı eşleşme: optionId → indeks (A/B/C/D) → harf → metin.
   */
  computeIsCorrect(
    selectedOptionId: string,
    correctOptionId: string,
    options: CurrentQuestionDto['options'],
  ): boolean {
    const normalize = (v: unknown): string => String(v ?? '').trim().toUpperCase();
    const normSelected = normalize(selectedOptionId);
    const normCorrect = normalize(correctOptionId);

    if (!normCorrect) {
      return false;
    }
    if (normSelected === normCorrect) {
      return true;
    }

    const sorted = sortOptionsById(options);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    const selectedIndex = sorted.findIndex((o) => normalize(o.optionId) === normSelected);
    const correctIndex = sorted.findIndex((o) => normalize(o.optionId) === normCorrect);

    if (selectedIndex >= 0 && correctIndex >= 0 && selectedIndex === correctIndex) {
      return true;
    }
    if (letters[selectedIndex] === normCorrect || letters[correctIndex] === normSelected) {
      return true;
    }

    const selectedText = normalize(sorted[selectedIndex]?.text ?? '');
    const correctText = normalize(sorted[correctIndex]?.text ?? '');
    if (selectedText && correctText && selectedText === correctText) {
      return true;
    }

    return false;
  }

  /**
   * Cevaplama süresine ve joker usage'a göre puan hesapla.
   */
  computeLocalScore(
    question: CurrentQuestionDto | null,
    responseTime: number,
    usedJokers: string[],
  ): number {
    if (!question) {
      return 0;
    }
    let timeLimit = question.timeLimitInSeconds;
    if (usedJokers.includes('ExtraTime')) {
      timeLimit += EXTRA_TIME_SECONDS;
    }
    const effectiveTime = Math.min(Math.max(responseTime, 0), timeLimit);
    const timeFactor = 1.0 - (effectiveTime / timeLimit) * 0.5;
    let score = Math.round(question.points * timeFactor);
    if (usedJokers.includes('DoublePoints')) {
      score *= 2;
    }
    return Math.max(0, score);
  }

  /**
   * submitAnswer sonucunu yerel olarak oluştur (cross-device fallback).
   */
  buildLocalResult(
    selectedOptionId: string,
    correctOptionId: string,
    question: CurrentQuestionDto | null,
    responseTime: number,
    usedJokers: string[],
  ): SubmitAnswerResult {
    const isCorrect = this.computeIsCorrect(selectedOptionId, correctOptionId, question?.options ?? []);
    const scoreEarned = isCorrect ? this.computeLocalScore(question, responseTime, usedJokers) : 0;

    return {
      answerId: 'local-' + Date.now(),
      isCorrect,
      scoreEarned,
      correctOptionId,
      responseTimeInSeconds: responseTime,
      usedJokers,
    };
  }

  getExtraTimeSeconds(): number {
    return EXTRA_TIME_SECONDS;
  }
}
