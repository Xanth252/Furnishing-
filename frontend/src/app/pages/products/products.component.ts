import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Product } from '../../models/models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  template: `
    <div class="page-wrapper">
      <app-header />
      <main class="main-content">

        <!-- Page Header -->
        <div class="page-header">
          <div>
            <div class="header-pretitle">Production &amp; Order Fulfillment</div>
            <h1 class="ph-title">Orders &amp; Production Stages</h1>
            <p class="ph-sub">{{ products.length }} item{{ products.length !== 1 ? 's' : '' }} being manufactured, stitched, or installed across client accounts</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary" (click)="exportExcel()" [disabled]="exporting">
              <span>📊</span>
              <span>{{ exporting ? 'Exporting...' : 'Export to Excel' }}</span>
            </button>
          </div>
        </div>

        <!-- Quick Status Chips with counts -->
        <div class="filter-chips" style="margin-bottom: 14px;">
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="filters.quoteStatus === ''" 
            (click)="setQuoteStatusFilter('')">
            <span>All Orders</span>
            <span class="chip-count">{{ products.length }}</span>
          </button>
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="filters.quoteStatus === 'Approved'" 
            (click)="setQuoteStatusFilter('Approved')">
            <span>✓ Approved Orders</span>
          </button>
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="filters.quoteStatus === 'Pending'" 
            (click)="setQuoteStatusFilter('Pending')">
            <span>⏳ Pending Approval</span>
          </button>
        </div>

        <!-- Filters Toolbar -->
        <div class="filter-bar">
          <div class="search-field-wrap">
            <span class="search-icon">🔍</span>
            <input 
              class="form-control search-input" 
              [(ngModel)]="filters.serial"
              placeholder="Search serial number..." 
              (input)="load()" />
            <button *ngIf="filters.serial" class="clear-input-btn" (click)="filters.serial=''; load()">✕</button>
          </div>

          <div class="search-field-wrap">
            <span class="search-icon">🏢</span>
            <input 
              class="form-control" 
              [(ngModel)]="filters.company"
              placeholder="Filter company/brand..." 
              (input)="load()" 
              style="min-width:180px;" />
            <button *ngIf="filters.company" class="clear-input-btn" (click)="filters.company=''; load()">✕</button>
          </div>

          <select class="form-control" [(ngModel)]="filters.productType" (change)="load()" style="min-width:155px;">
            <option value="">All Product Types</option>
            <option value="curtain">Curtain Fabric</option>
            <option value="non-curtain">Non-Curtain</option>
          </select>

          <select class="form-control" [(ngModel)]="filters.quoteStatus" (change)="load()" style="min-width:150px;">
            <option value="">All Quote Status</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Pending">Pending</option>
          </select>

          <select class="form-control" [(ngModel)]="filters.paymentStatus" (change)="load()" style="min-width:160px;">
            <option value="">All Payment Status</option>
            <option value="Full payment cleared">Payment Cleared</option>
            <option value="Pending">Payment Pending</option>
          </select>

          <button class="btn btn-secondary btn-sm" (click)="clearFilters()" *ngIf="hasFilters()">
            <span>✕</span>
            <span>Clear Filters</span>
          </button>
        </div>

        <!-- Products Table -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:45px;">#</th>
                <th>Customer</th>
                <th>Product Name</th>
                <th>Serial No</th>
                <th>Brand / Vendor</th>
                <th>Category</th>
                <th style="min-width:140px;">Stage Progress</th>
                <th class="text-right">Net Value</th>
                <th class="text-right">Balance</th>
                <th>Quote Status</th>
                <th>Payment Status</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of products; let i = index">
                <td class="td-num">{{ i + 1 }}</td>
                <td>
                  <a [routerLink]="['/customers', p.customerId]" class="cust-link">
                    <span class="cust-mini-avatar" [ngClass]="getAvatarClass(p.customerName)">
                      {{ p.customerName.charAt(0).toUpperCase() }}
                    </span>
                    <span>{{ p.customerName }}</span>
                  </a>
                </td>
                <td class="td-bold">{{ p.productName }}</td>
                <td>
                  <span 
                    class="serial-pill font-mono" 
                    *ngIf="p.serialNumber"
                    (click)="copySerial(p.serialNumber, $event)" 
                    title="Click to copy serial">
                    📋 {{ p.serialNumber }}
                  </span>
                  <span *ngIf="!p.serialNumber" class="text-muted">—</span>
                </td>
                <td>{{ p.company || '—' }}</td>
                <td>
                  <span class="type-chip" [class.curtain]="p.productType === 'Curtain Fabric'">
                    {{ p.productType === 'Curtain Fabric' ? '🪟 ' : '📦 ' }}{{ p.productType }}
                  </span>
                </td>
                <td>
                  <div class="prog-cell">
                    <div class="prog-wrap">
                      <div 
                        class="prog-bar" 
                        [ngClass]="getProgBarClass(p)"
                        [style.width.%]="p.totalStages ? (p.completedStages/p.totalStages*100) : 0"></div>
                    </div>
                    <span class="prog-label">
                      {{ p.completedStages }}/{{ p.totalStages }} 
                      ({{ (p.totalStages ? (p.completedStages/p.totalStages*100) : 0) | number:'1.0-0' }}%)
                      <span *ngIf="p.completedStages === p.totalStages && p.totalStages > 0" class="done-check">✓</span>
                    </span>
                  </div>
                </td>
                <td class="td-amt font-mono text-right">₹{{ p.finalAmount | number:'1.0-0' }}</td>
                <td class="text-right font-mono">
                  <span [class]="p.balanceAmount > 0 ? 'bal-due' : 'bal-clear'">
                    ₹{{ p.balanceAmount | number:'1.0-0' }}
                  </span>
                </td>
                <td>
                  <span [class]="'badge badge-' + p.quotationStatus.toLowerCase()">{{ p.quotationStatus }}</span>
                </td>
                <td>
                  <span [class]="p.paymentStatus === 'Full payment cleared' ? 'badge badge-cleared' : 'badge badge-pending'">
                    {{ p.paymentStatus === 'Full payment cleared' ? '✓ Cleared' : 'Pending' }}
                  </span>
                </td>
                <td style="text-align:right;">
                  <a [routerLink]="['/customers', p.customerId]" [queryParams]="{ tab: 'orders' }" class="btn btn-secondary btn-sm" title="View customer orders & work stages">
                    <span>Stages</span>
                    <span>→</span>
                  </a>
                </td>
              </tr>
              <tr *ngIf="products.length === 0">
                <td colspan="12">
                  <div class="empty-state">
                    <div style="font-size:2.5rem;margin-bottom:12px;">📦</div>
                    <div style="font-weight:700;color:#0f172a;font-size:1.05rem;">No products match your criteria</div>
                    <div style="font-size:0.85rem;color:#64748b;margin-top:4px;">Try modifying or clearing your search filters</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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

    .search-field-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 0.95rem;
      color: #94a3b8;
      pointer-events: none;
    }
    .filter-bar .form-control {
      padding-left: 38px;
      padding-right: 32px;
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

    .td-num { color: #94a3b8; font-size: 0.75rem; font-weight: 700; }
    .td-bold { font-weight: 700; color: #0f172a; }
    .td-amt { font-weight: 800; color: #0f172a; }

    .cust-link {
      color: #0f172a;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: color 0.15s;
    }
    .cust-link:hover { color: #4f46e5; }
    .cust-mini-avatar {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 800;
      color: #ffffff;
      flex-shrink: 0;
    }

    .serial-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #334155;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .serial-pill:hover {
      background: #e0e7ff;
      color: #4338ca;
    }

    .type-chip {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
      white-space: nowrap;
      border: 1px solid #e2e8f0;
    }
    .type-chip.curtain {
      background: #ecfdf5;
      color: #059669;
      border-color: #a7f3d0;
    }

    .prog-cell { display: flex; flex-direction: column; gap: 4px; }
    .prog-wrap {
      background: #f1f5f9;
      border-radius: 9999px;
      height: 7px;
      width: 110px;
      overflow: hidden;
    }
    .prog-bar {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.4s ease;
    }
    .prog-bar-done { background: linear-gradient(90deg, #34d399, #059669) !important; }
    .prog-bar-mid  { background: linear-gradient(90deg, #38bdf8, #0284c7) !important; }
    .prog-bar-low  { background: linear-gradient(90deg, #fbbf24, #d97706) !important; }
    .prog-bar-zero { background: #cbd5e1 !important; }

    .prog-label { font-size: 0.72rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 4px; }
    .done-check { color: #059669; font-weight: 800; font-size: 0.75rem; }

    .bal-due   { font-weight: 800; color: #e11d48; }
    .bal-clear { font-weight: 800; color: #059669; }
    .text-muted { color: #94a3b8; }
  `]
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filters = { serial: '', company: '', productType: '', quoteStatus: '', paymentStatus: '' };
  exporting = false;

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }

  load() { this.api.getProducts(this.filters).subscribe(p => this.products = p); }
  hasFilters() { return Object.values(this.filters).some(v => v !== ''); }
  clearFilters() { 
    this.filters = { serial: '', company: '', productType: '', quoteStatus: '', paymentStatus: '' }; 
    this.load(); 
  }
  setQuoteStatusFilter(status: string) { this.filters.quoteStatus = status; this.load(); }

  getAvatarClass(name: string): string {
    const classes = ['avatar-emerald', 'avatar-indigo', 'avatar-violet', 'avatar-amber', 'avatar-rose', 'avatar-cyan', 'avatar-teal'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return classes[Math.abs(hash) % classes.length];
  }

  getProgBarClass(p: Product): string {
    if (!p.totalStages || p.completedStages === 0) return 'prog-bar-zero';
    if (p.completedStages === p.totalStages) return 'prog-bar-done';
    const pct = (p.completedStages / p.totalStages) * 100;
    return pct >= 50 ? 'prog-bar-mid' : 'prog-bar-low';
  }

  copySerial(serial: string, e: Event) {
    e.stopPropagation();
    if (navigator.clipboard) navigator.clipboard.writeText(serial);
    this.toast.success(`Copied serial number: ${serial}`);
  }

  exportExcel() {
    this.exporting = true;
    this.toast.info('Generating Excel export...');
    this.api.exportExcel().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'PFC_Products.xlsx'; a.click();
        URL.revokeObjectURL(url);
        this.exporting = false;
        this.toast.success('Downloaded PFC_Products.xlsx');
      },
      error: () => {
        this.exporting = false;
        this.toast.error('Failed to export to Excel');
      }
    });
  }
}
