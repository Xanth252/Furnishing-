import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { isRomanBlind, isOtherBlind, isBlind } from '../calculation/curtain-calculation';

@Component({
  selector: 'app-quotations-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  template: `
    <div class="page-wrapper">
      <app-header />
      <main class="main-content">

        <!-- Page Header -->
        <div class="pg-header">
          <div>
            <div class="header-pretitle">Sales Pipeline &amp; Estimation Archive</div>
            <h1 class="pg-title">Quotations Summary</h1>
            <p class="pg-sub">All client proposals grouped chronologically by month · Click any quotation to open full details</p>
          </div>
          <div class="header-actions">
            <a routerLink="/quotation-maker" class="btn btn-primary">
              <span>🧾</span>
              <span>New Quotation</span>
            </a>
            <a routerLink="/calculation" class="btn btn-secondary">
              <span>📐</span>
              <span>Window Calculation</span>
            </a>
          </div>
        </div>

        <!-- Status Filter Chips -->
        <div class="filter-chips" style="margin-bottom: 14px;">
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="selectedStatus === 'ALL'" 
            (click)="setStatusFilter('ALL')">
            <span>All Status</span>
            <span class="chip-count">{{ allQuotes.length }}</span>
          </button>
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="selectedStatus === 'Approved'" 
            (click)="setStatusFilter('Approved')">
            <span>✓ Approved</span>
            <span class="chip-count">{{ countStatus('Approved') }}</span>
          </button>
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="selectedStatus === 'Pending'" 
            (click)="setStatusFilter('Pending')">
            <span>⏳ Pending</span>
            <span class="chip-count">{{ countStatus('Pending') }}</span>
          </button>
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="selectedStatus === 'Rejected'" 
            (click)="setStatusFilter('Rejected')">
            <span>✕ Declined</span>
            <span class="chip-count" *ngIf="countStatus('Rejected') > 0">{{ countStatus('Rejected') }}</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="filter-bar">
          <div class="search-field-wrap">
            <span class="search-icon">🔍</span>
            <input 
              class="form-control search-input" 
              [(ngModel)]="searchTerm" 
              (ngModelChange)="onSearch()" 
              (keydown.enter)="load(searchTerm || undefined)" 
              placeholder="Search customer, quotation number (e.g. QT-2026), or notes..." />
            <button 
              class="clear-input-btn" 
              *ngIf="searchTerm" 
              (click)="clearSearch()">✕</button>
          </div>
          <span *ngIf="searchTerm && !loading" class="result-badge">
            Search results for "{{ searchTerm }}"
          </span>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="loading-wrap">
          <div class="loader"></div>
          <span>Loading quotation history...</span>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && grouped.length === 0" class="empty-card">
          <div class="empty-icon">📋</div>
          <div class="empty-title">{{ searchTerm ? 'No quotations match "' + searchTerm + '"' : 'No quotations found' }}</div>
          <p class="empty-sub">
            {{ searchTerm ? 'Try checking for typos or clear the search query.' : 'Start your first window calculation and save it as an official client proposal.' }}
          </p>
          <div style="margin-top:16px;">
            <button *ngIf="searchTerm" class="btn btn-secondary" (click)="clearSearch()">Clear Search</button>
            <a *ngIf="!searchTerm" routerLink="/calculation" class="btn btn-primary">📐 Start First Calculation</a>
          </div>
        </div>

        <!-- Grouped by Month -->
        <div *ngFor="let group of grouped" class="month-block">
          <div class="month-header">
            <div class="month-title-wrap">
              <span class="month-calendar-icon">📅</span>
              <span class="month-name">{{ group.month }}</span>
            </div>
            <div class="month-badges">
              <span class="month-count-pill">{{ group.quotes.length }} quotation{{ group.quotes.length !== 1 ? 's' : '' }}</span>
            </div>
          </div>

          <div class="quote-row header-row">
            <span class="col-customer">Customer</span>
            <span class="col-title">Quotation Reference</span>
            <span class="col-products">Items &amp; Measurements</span>
            <span class="col-amount text-right">Net Value</span>
            <span class="col-balance text-right">Outstanding</span>
            <span class="col-status text-center">Status</span>
          </div>

          <div 
            *ngFor="let q of group.quotes" 
            class="quote-row data-row" 
            (click)="goToCustomer(q)"
            title="Open quotation details for {{ q.customerName }}">
            
            <span class="col-customer">
              <div class="cust-row-flex">
                <span class="cust-avatar-sm" [ngClass]="getAvatarClass(q.customerName)">
                  {{ q.customerName.charAt(0).toUpperCase() }}
                </span>
                <span class="customer-name">{{ q.customerName }}</span>
              </div>
            </span>

            <span class="col-title ref-title">
              <span 
                class="quote-no-tag font-mono" 
                *ngIf="q.quotationNumber" 
                (click)="copyQuotationNumber(q.quotationNumber, $event)"
                title="Click to copy quotation number">
                📋 {{ q.quotationNumber }}
              </span>
              <span class="quote-t-text">{{ q.title }}</span>
            </span>

            <span class="col-products">
              <span *ngIf="q.windows && windowCount(q) > 0" class="win-count-chip">
                🪟 {{ windowCount(q) }} win<span *ngIf="doubleCurtainCount(q) > 0"> ({{ doubleCurtainCount(q) }} dbl)</span><span *ngIf="blindCount(q) > 0"> ({{ blindCount(q) }} blind)</span>
              </span>
              <span *ngIf="q.windows && wallpaperArea(q) > 0" class="wallpaper-count-chip">
                🖼️ {{ wallpaperArea(q) | number:'1.0-0' }} sq ft
              </span>
              <span *ngFor="let p of q.products; let last = last" class="product-chip">
                {{ p.productName }}<span *ngIf="!last">, </span>
              </span>
              <span *ngIf="q.products.length === 0 && (!q.windows || q.windows.length === 0)" class="no-products">—</span>
            </span>

            <span class="col-amount amount-val font-mono text-right">₹{{ q.totalFinalAmount | number:'1.0-0' }}</span>
            <span class="col-balance text-right font-mono" [class.balance-due]="q.totalBalance > 0" [class.balance-clear]="q.totalBalance <= 0">
              {{ q.totalBalance <= 0 ? '✓ Cleared' : '₹' + (q.totalBalance | number:'1.0-0') }}
            </span>

            <span class="col-status text-center">
              <span [class]="'badge badge-' + q.quotationStatus.toLowerCase()">{{ q.quotationStatus }}</span>
            </span>
          </div>
        </div>

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
    .pg-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .pg-title {
      font-size: 1.7rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.025em;
    }
    .pg-sub {
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 3px;
    }

    .search-field-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 480px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 0.95rem;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-input {
      padding-left: 38px !important;
      padding-right: 32px !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    .clear-input-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      font-size: 0.8rem;
      color: #94a3b8;
      cursor: pointer;
      padding: 2px 5px;
      border-radius: 4px;
    }
    .clear-input-btn:hover { color: #0f172a; }

    .result-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #4338ca;
      background: #e0e7ff;
      padding: 4px 10px;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .loading-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 60px 20px;
      justify-content: center;
      color: #64748b;
      font-size: 0.95rem;
    }
    .loader {
      width: 20px;
      height: 20px;
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

    /* Month Blocks */
    .month-block {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      margin-bottom: 22px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      overflow: hidden;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .month-block:hover {
      box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08);
      border-color: #cbd5e1;
    }
    .month-header {
      padding: 14px 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .month-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .month-calendar-icon { font-size: 1.1rem; }
    .month-name {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0f172a;
    }
    .month-count-pill {
      font-size: 0.72rem;
      font-weight: 700;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 3px 9px;
      border-radius: 9999px;
      color: #475569;
    }

    /* Rows */
    .quote-row {
      display: grid;
      grid-template-columns: 220px 1.4fr 1.6fr 130px 120px 110px;
      gap: 12px;
      align-items: center;
      padding: 12px 20px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.85rem;
    }
    .quote-row:last-child { border-bottom: none; }
    .header-row {
      background: #f8fafc;
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-row {
      cursor: pointer;
      transition: background 0.15s, transform 0.15s;
    }
    .data-row:hover {
      background: #fafcff;
    }

    .cust-row-flex {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .cust-avatar-sm {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 800;
      color: #ffffff;
      flex-shrink: 0;
    }
    .customer-name {
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ref-title {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .quote-no-tag {
      font-size: 0.72rem;
      background: #f1f5f9;
      padding: 2px 7px;
      border-radius: 4px;
      color: #334155;
      font-weight: 700;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: all 0.15s;
    }
    .quote-no-tag:hover {
      background: #e0e7ff;
      color: #4338ca;
      border-color: #c7d2fe;
    }
    .quote-t-text {
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .win-count-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.74rem;
      background: #ecfdf5;
      color: #059669;
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid #a7f3d0;
      font-weight: 600;
      margin-right: 4px;
    }
    .wallpaper-count-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.74rem;
      background: #f5f3ff;
      color: #7c3aed;
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid #ddd6fe;
      font-weight: 600;
      margin-right: 4px;
    }
    .product-chip {
      font-size: 0.78rem;
      color: #64748b;
    }
    .no-products { color: #cbd5e1; }

    .amount-val { font-weight: 800; color: #0f172a; }
    .balance-due { color: #e11d48; font-weight: 800; }
    .balance-clear { color: #059669; font-weight: 800; }

    @media (max-width: 960px) {
      .quote-row {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .header-row { display: none; }
      .col-customer { grid-column: span 2; }
    }
  `]
})
export class QuotationsSummaryComponent implements OnInit {
  grouped: { month: string; quotes: any[] }[] = [];
  allQuotes: any[] = [];
  searchTerm = '';
  selectedStatus: 'ALL' | 'Approved' | 'Pending' | 'Rejected' = 'ALL';
  loading = false;
  private searchTimer: any;

  constructor(
    private api: ApiService, 
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.load();
  }

  load(search?: string) {
    this.loading = true;
    this.api.getQuotationsSummary(search).subscribe({
      next: (quotes) => {
        this.allQuotes = quotes;
        this.buildGroups(quotes);
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getAvatarClass(name: string): string {
    const classes = ['avatar-emerald', 'avatar-indigo', 'avatar-violet', 'avatar-amber', 'avatar-rose', 'avatar-cyan', 'avatar-teal'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return classes[Math.abs(hash) % classes.length];
  }

  countStatus(status: string): number {
    return this.allQuotes.filter(q => (q.quotationStatus || '').toLowerCase() === status.toLowerCase()).length;
  }

  setStatusFilter(status: 'ALL' | 'Approved' | 'Pending' | 'Rejected') {
    this.selectedStatus = status;
    this.buildGroups(this.allQuotes);
  }

  buildGroups(quotes: any[]) {
    let filtered = quotes;
    if (this.selectedStatus !== 'ALL') {
      filtered = quotes.filter(q => (q.quotationStatus || '').toLowerCase() === this.selectedStatus.toLowerCase());
    }
    const map = new Map<string, any[]>();
    for (const q of filtered) {
      const key = new Date(q.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    }
    this.grouped = Array.from(map.entries()).map(([month, qs]) => ({ month, quotes: qs }));
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(this.searchTerm || undefined), 300);
  }

  clearSearch() {
    this.searchTerm = '';
    this.load();
  }

  copyQuotationNumber(num: string, e: Event) {
    e.stopPropagation();
    if (navigator.clipboard) navigator.clipboard.writeText(num);
    this.toast.success(`Copied quotation number: ${num}`);
  }

  windowCount(q: any): number {
    return q.windows?.filter((w: any) => w.treatmentType !== 'Wallpaper').length ?? 0;
  }

  doubleCurtainCount(q: any): number {
    return q.windows?.filter((w: any) => w.treatmentType === 'Curtain' && !!w.isDoubleCurtain).length ?? 0;
  }

  singleCurtainCount(q: any): number {
    return q.windows?.filter((w: any) => w.treatmentType === 'Curtain' && !w.isDoubleCurtain).length ?? 0;
  }

  blindCount(q: any): number {
    return q.windows?.filter((w: any) => isBlind(w.treatmentType)).length ?? 0;
  }

  romanBlindCount(q: any): number {
    return q.windows?.filter((w: any) => isRomanBlind(w.treatmentType)).length ?? 0;
  }

  otherBlindCount(q: any): number {
    return q.windows?.filter((w: any) => isOtherBlind(w.treatmentType)).length ?? 0;
  }

  wallpaperArea(q: any): number {
    return q.windows?.filter((w: any) => w.treatmentType === 'Wallpaper').reduce((s: number, w: any) => s + (w.requirement ?? 0), 0) ?? 0;
  }

  goToCustomer(q: any) {
    this.router.navigate(['/customers', q.customerId], { queryParams: { quotationId: q.id, tab: 'quotations' } });
  }
}
