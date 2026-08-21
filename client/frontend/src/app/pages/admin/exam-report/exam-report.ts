import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { LogoComponent } from '../../../shared/logo/logo';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import type { ExamReportDto } from '../../../models/types';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-exam-report',
  imports: [MatButtonModule, LogoComponent, SpinnerComponent, DecimalPipe],
  templateUrl: './exam-report.html',
  styleUrl: './exam-report.scss',
})
export class ExamReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly report = signal<ExamReportDto | null>(null);

  private quizId = '';

  ngOnInit(): void {
    this.quizId = this.route.snapshot.paramMap.get('quizId') ?? '';
    if (!this.quizId) {
      this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
      return;
    }
    this.loadReport();
  }

  private async loadReport(): Promise<void> {
    try {
      this.loading.set(true);
      const report = await this.api.getExamReport(this.quizId);
      this.report.set(report);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Rapor yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }

  exportToExcel(): void {
    const r = this.report();
    if (!r) return;

    const rows = r.leaderboard.map((entry, i) => ({
      'Sira': i + 1,
      'Ad Soyad': entry.studentName,
      'Sicil No': entry.registrationNumber,
      'Puan': entry.totalScore + ' / ' + entry.maxPossibleScore,
      'Yuzde': '%' + entry.percentage.toFixed(1),
      'Durum': entry.isPassed ? 'GECTI' : 'KALDI',
      'Deneme Sayisi': entry.attemptCount,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 8 }, { wch: 8 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sonuclar');

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, 'TKI_Akademi_Sinav_Sonuclari_' + today + '.xlsx');
  }

  goBack(): void {
    void this.router.navigate(['/admin/dashboard']);
  }

  handleLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }
}
