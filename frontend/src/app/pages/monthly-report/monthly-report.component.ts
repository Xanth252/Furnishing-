import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../components/header/header.component';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { MonthlyReport } from '../../models/models';

@Component({
  selector: 'app-monthly-report',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  template: `
    <div class="page-wrapper">
      <app-header />
      <main class="main-content">

        <!-- Page Header -->
        <div class="page-header">
          <div>
            <div class="header-pretitle">Performance &amp; Revenue Analytics</div>
            <h1 class="ph-title">Monthly Business Report</h1>
            <p class="ph-sub">Quotations, conversion ratios, and cash collection breakdown by calendar month</p>
          </div>
          <div class="page-actions">
            <div class="year-select-wrap">
              <span class="year-icon">📅</span>
              <select class="form-control year-select" [(ngModel)]="selectedYear" (change)="load()">
                <option *ngFor="let y of years" [value]="y">Fiscal Year {{ y }}</option>
              </select>
            </div>
            <button class="btn btn-secondary" (click)="load(true)" [disabled]="loading" title="Reload financial data">
              <span>↻</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="loading-wrap">
          <div class="loader"></div>
          <span>Analyzing financial and quotation records for {{ selectedYear }}...</span>
        </div>

        <!-- No data -->
        <div *ngIf="!loading && months.length === 0" class="empty-card">
          <div class="empty-icon">📅</div>
          <div class="empty-title">No records found for {{ selectedYear }}</div>
          <div class="empty-sub">Once products and quotations are recorded with dates in {{ selectedYear }}, monthly performance metrics will appear here.</div>
        </div>

        <!-- Annual Summary Bar & Month Cards Grid -->
        <ng-container *ngIf="!loading && months.length > 0">

          <!-- Annual Executive Overview Bar -->
          <div class="annual-summary-grid">
            <div class="ann-kpi ann-total">
              <div class="ann-lbl">Total Quotes in {{ selectedYear }}</div>
              <div class="ann-val font-mono">{{ annualQuotations }}</div>
              <div class="ann-sub">Proposals submitted</div>
            </div>

            <div class="ann-kpi ann-approved">
              <div class="ann-lbl">Approved Deals</div>
              <div class="ann-val font-mono green">{{ annualApproved }}</div>
              <div class="ann-sub">{{ pct(annualApproved, annualQuotations) | number:'1.0-0' }}% conversion rate</div>
            </div>

            <div class="ann-kpi ann-revenue">
              <div class="ann-lbl">Net Annual Order Value</div>
              <div class="ann-val font-mono">₹{{ annualFinalAmount | number:'1.0-0' }}</div>
              <div class="ann-sub">Net receivable after discounts</div>
            </div>

            <div class="ann-kpi ann-cleared">
              <div class="ann-lbl">Payments Cleared</div>
              <div class="ann-val font-mono green">₹{{ annualCleared | number:'1.0-0' }}</div>
              <div class="ann-sub">{{ pct(annualCleared, annualFinalAmount) | number:'1.0-0' }}% realized</div>
            </div>
          </div>

          <!-- Month Cards List -->
          <div class="month-list">
            <div *ngFor="let m of months" class="month-block">

              <!-- Month Header -->
              <div class="month-header">
                <div class="month-title-wrap">
                  <span class="month-icon">🗓️</span>
                  <span class="month-name">{{ m.monthName }} {{ selectedYear }}</span>
                </div>
                <div class="month-chips">
                  <span class="chip chip-total">{{ m.totalQuotations }} Quotes</span>
                  <span class="chip chip-green">✓ {{ m.approved }} Approved</span>
                  <span class="chip chip-amber">⏳ {{ m.pending }} Pending</span>
                  <span class="chip chip-red" *ngIf="m.rejected > 0">✕ {{ m.rejected }} Declined</span>
                </div>
              </div>

              <!-- Three Metric Columns -->
              <div class="month-body">

                <!-- Section 1: Quotation Breakdown -->
                <div class="msec">
                  <div class="msec-title">
                    <span>📊</span>
                    <span>Pipeline &amp; Approvals</span>
                  </div>
                  <div class="srows">
                    <div class="srow">
                      <span class="sl">Total Quotations</span>
                      <span class="sv sv-bold font-mono">{{ m.totalQuotations }}</span>
                    </div>
                    <div class="srow">
                      <span class="sl">Approved Deals</span>
                      <span class="sv sv-green font-mono">{{ m.approved }}</span>
                    </div>
                    <div class="srow">
                      <span class="sl">Pending Decisions</span>
                      <span class="sv sv-amber font-mono">{{ m.pending }}</span>
                    </div>
                    <div class="srow">
                      <span class="sl">Declined / Lost</span>
                      <span class="sv sv-red font-mono">{{ m.rejected }}</span>
                    </div>
                  </div>

                  <div class="seg-bar-wrap" *ngIf="m.totalQuotations > 0">
                    <div class="seg-track">
                      <div class="seg green-seg" [style.width.%]="pct(m.approved, m.totalQuotations)" title="Approved: {{ m.approved }}"></div>
                      <div class="seg amber-seg" [style.width.%]="pct(m.pending,  m.totalQuotations)" title="Pending: {{ m.pending }}"></div>
                      <div class="seg red-seg"   [style.width.%]="pct(m.rejected, m.totalQuotations)" title="Rejected: {{ m.rejected }}"></div>
                    </div>
                    <div class="seg-legend">
                      <span class="leg-dot green-leg">● Approved ({{ pct(m.approved, m.totalQuotations) | number:'1.0-0' }}%)</span>
                      <span class="leg-dot amber-leg">● Pending</span>
                      <span class="leg-dot red-leg" *ngIf="m.rejected > 0">● Declined</span>
                    </div>
                  </div>
                </div>

                <!-- Section 2: Amount Breakdown -->
                <div class="msec">
                  <div class="msec-title">
                    <span>💰</span>
                    <span>Revenue &amp; Receivables</span>
                  </div>
                  <div class="srows">
                    <div class="srow">
                      <span class="sl">Gross Quoted</span>
                      <span class="sv sv-bold font-mono">₹{{ m.totalQuotedAmount | number:'1.0-0' }}</span>
                    </div>
                    <div class="srow">
                      <span class="sl">Discount Concession</span>
                      <span class="sv sv-amber font-mono">− ₹{{ m.totalDiscount | number:'1.0-0' }}</span>
                    </div>
                    <div class="srow srow-divider">
                      <span class="sl bold-label">Net Order Value</span>
                      <span class="sv sv-dark font-mono">₹{{ m.totalFinalAmount | number:'1.0-0' }}</span>
                    </div>
                    <div class="srow">
                      <span class="sl">Advance Received</span>
                      <span class="sv sv-green font-mono">₹{{ m.totalAdvance | number:'1.0-0' }}</span>
                    </div>
                    <div class="srow">
                      <span class="sl">Balance Due</span>
                      <span class="sv sv-red font-mono">₹{{ m.totalBalance | number:'1.0-0' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Section 3: Payment Status -->
                <div class="msec">
                  <div class="msec-title">
                    <span>💳</span>
                    <span>Collection Health</span>
                  </div>
                  <div class="srows">
                    <div class="srow">
                      <span class="sl">Cleared Orders</span>
                      <span class="sv sv-green font-mono">{{ m.paymentsClearedCount }} order{{ m.paymentsClearedCount !== 1 ? 's' : '' }}</span>
                    </div>
                    <div class="srow">
                      <span class="sl">Amount Realized</span>
                      <span class="sv sv-green font-mono">₹{{ m.totalCleared | number:'1.0-0' }}</span>
                    </div>
                    <div class="srow" style="margin-top:6px;">
                      <span class="sl">Pending Orders</span>
                      <span class="sv sv-amber font-mono">{{ m.paymentsPendingCount }} order{{ m.paymentsPendingCount !== 1 ? 's' : '' }}</span>
                    </div>
                    <div class="srow">
                      <span class="sl">Amount In Arrears</span>
                      <span class="sv sv-amber font-mono">₹{{ m.totalPending | number:'1.0-0' }}</span>
                    </div>
                  </div>

                  <div class="pay-bar-wrap" *ngIf="m.totalFinalAmount > 0">
                    <div class="pay-track">
                      <div class="pay-fill" [style.width.%]="pct(m.totalCleared, m.totalFinalAmount)"></div>
                    </div>
                    <div class="pay-pct-label">
                      <span>{{ pct(m.totalCleared, m.totalFinalAmount) | number:'1.0-0' }}%</span>
                      <span>of total net revenue cleared</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </ng-container>

      </main>
    </div>
  `,
  styles: [`
    .header-pretitle {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 4px;
    }
    .ph-title {
      font-size: 1.7rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.025em;
    }
    .ph-sub {
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 3px;
    }

    .year-select-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .year-icon {
      position: absolute;
      left: 12px;
      font-size: 0.9rem;
      pointer-events: none;
      z-index: 1;
    }
    .year-select {
      padding-left: 36px !important;
      font-weight: 600;
      min-width: 170px;
    }

    .loading-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 70px 20px;
      justify-content: center;
      color: #64748b;
      font-size: 0.95rem;
    }
    .loader {
      width: 22px;
      height: 22px;
      border: 2.5px solid #e2e8f0;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-card {
      background: #ffffff;
      border: 1.5px dashed #cbd5e1;
      border-radius: 16px;
      padding: 56px 24px;
      text-align: center;
      max-width: 500px;
      margin: 40px auto;
    }
    .empty-icon { font-size: 2.4rem; margin-bottom: 12px; }
    .empty-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .empty-sub { font-size: 0.85rem; color: #64748b; line-height: 1.4; }

    /* Annual Overview */
    .annual-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .ann-kpi {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ann-kpi:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px -4px rgba(15, 23, 42, 0.08);
      border-color: #cbd5e1;
    }
    .ann-total:hover { border-color: #a5b4fc; }
    .ann-approved:hover { border-color: #86efac; }
    .ann-revenue:hover { border-color: #94a3b8; }
    .ann-cleared:hover { border-color: #6ee7b7; }

    .ann-lbl {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .ann-val {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin-bottom: 4px;
    }
    .ann-val.green { color: #059669; }
    .ann-sub {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 500;
    }

    /* Month Blocks */
    .month-list { display: flex; flex-direction: column; gap: 20px; }
    .month-block {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      overflow: hidden;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .month-block:hover {
      box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08);
      border-color: #cbd5e1;
    }
    .month-header {
      padding: 16px 24px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
    }
    .month-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .month-icon { font-size: 1.2rem; }
    .month-name {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
    }
    .month-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .chip {
      font-size: 0.74rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
    }
    .chip-total { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; }
    .chip-green { background: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; }
    .chip-amber { background: #fffbeb; border: 1px solid #fde68a; color: #d97706; }
    .chip-red   { background: #fff1f2; border: 1px solid #fecdd3; color: #e11d48; }

    .month-body {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      padding: 24px;
      gap: 24px;
    }
    .msec {
      display: flex;
      flex-direction: column;
      border-right: 1px solid #f1f5f9;
      padding-right: 24px;
    }
    .msec:last-child { border-right: none; padding-right: 0; }
    .msec-title {
      font-size: 0.8rem;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .srows { display: flex; flex-direction: column; gap: 8px; }
    .srow { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
    .srow-divider {
      border-top: 1px dashed #e2e8f0;
      padding-top: 8px;
      margin-top: 4px;
    }
    .sl { color: #64748b; font-size: 0.82rem; }
    .bold-label { font-weight: 700; color: #0f172a; }
    .sv { font-weight: 600; color: #0f172a; }
    .sv-bold { font-weight: 800; }
    .sv-dark { font-weight: 800; color: #0f172a; font-size: 0.95rem; }
    .sv-green { color: #059669; }
    .sv-red   { color: #e11d48; }
    .sv-amber { color: #d97706; }

    .seg-bar-wrap { margin-top: auto; padding-top: 14px; }
    .seg-track {
      display: flex;
      height: 8px;
      border-radius: 9999px;
      overflow: hidden;
      background: #f1f5f9;
    }
    .seg { height: 100%; transition: width 0.5s ease; }
    .green-seg { background: #10b981; }
    .amber-seg { background: #f59e0b; }
    .red-seg   { background: #ef4444; }
    .seg-legend {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .leg-dot { font-size: 0.72rem; font-weight: 600; }
    .green-leg { color: #059669; }
    .amber-leg { color: #d97706; }
    .red-leg   { color: #e11d48; }

    .pay-bar-wrap { margin-top: auto; padding-top: 14px; }
    .pay-track {
      background: #f1f5f9;
      border-radius: 9999px;
      height: 8px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .pay-fill {
      height: 100%;
      background: linear-gradient(90deg, #34d399, #059669);
      border-radius: 9999px;
      transition: width 0.5s ease;
    }
    .pay-pct-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #059669;
      display: flex;
      gap: 4px;
    }

    @media(max-width:1080px) {
      .annual-summary-grid { grid-template-columns: repeat(2, 1fr); }
      .month-body { grid-template-columns: 1fr 1fr; }
      .msec:nth-child(2) { border-right: none; }
      .msec:nth-child(3) { border-top: 1px solid #f1f5f9; grid-column: span 2; padding-top: 16px; }
    }
    @media(max-width:640px) {
      .annual-summary-grid { grid-template-columns: 1fr; }
      .month-body { grid-template-columns: 1fr; }
      .msec { border-right: none !important; border-top: 1px solid #f1f5f9; padding-top: 14px; }
      .msec:first-child { border-top: none; padding-top: 0; }
      .month-header { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class MonthlyReportComponent implements OnInit {
  months: MonthlyReport[] = [];
  years: number[] = [];
  selectedYear = new Date().getFullYear();
  loading = true;

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }

  load(notify = false) {
    this.loading = true;
    this.api.getMonthlyReport(this.selectedYear).subscribe({
      next: res => {
        this.months = res.months;
        this.years = res.years;
        if (!this.years.includes(this.selectedYear)) this.years.unshift(this.selectedYear);
        this.loading = false;
        if (notify) this.toast.success(`Updated report for ${this.selectedYear}`);
      },
      error: () => {
        this.loading = false;
        if (notify) this.toast.error('Failed to load monthly report');
      }
    });
  }

  get annualQuotations(): number { return this.months.reduce((s, m) => s + m.totalQuotations, 0); }
  get annualApproved(): number { return this.months.reduce((s, m) => s + m.approved, 0); }
  get annualFinalAmount(): number { return this.months.reduce((s, m) => s + m.totalFinalAmount, 0); }
  get annualCleared(): number { return this.months.reduce((s, m) => s + m.totalCleared, 0); }

  pct(part: number, total: number): number {
    return total > 0 ? Math.min((part / total) * 100, 100) : 0;
  }
}
