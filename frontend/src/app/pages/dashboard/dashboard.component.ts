import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
import { ApiService } from '../../services/api.service';
import { Dashboard, Quotation } from '../../models/models';
import { PdfService, QuotationPdfData } from '../../services/pdf.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  template: `
    <div class="page-wrapper">
      <app-header />
      <main class="main-content">

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- 1. TOP GREETING & PRIMARY ACTIONS -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="dash-top-bar">
          <div class="top-bar-left">
            <div class="date-chip">
              <span class="chip-dot"></span>
              <span>{{ todayFormatted }}</span>
              <span class="chip-sep">·</span>
              <span>{{ getGreeting() }}</span>
            </div>
            <h1 class="page-title">Furnishing Dashboard</h1>
            <p class="page-desc">Overview of sales quotations, customer pipeline, and payment performance</p>
          </div>

          <div class="top-bar-actions">
            <a routerLink="/quotation-maker" target="_blank" class="btn-primary-action" title="Create a new quotation in a new tab">
              <span class="btn-action-icon">✨</span>
              <span>Create Quotation</span>
              <span class="btn-action-badge">New Tab ↗</span>
            </a>

            <a routerLink="/calculation" class="btn btn-secondary btn-calc-action">
              <span class="btn-icon">📐</span>
              <span>Window Calculator</span>
            </a>

            <button class="btn btn-secondary btn-refresh" (click)="load()" [disabled]="loading" title="Refresh dashboard data">
              <span [class.spinning]="loading">↻</span>
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="loading-wrap">
          <div class="loader"></div>
          <span>Loading furnishing analytics &amp; recent quotations...</span>
        </div>

        <ng-container *ngIf="!loading && data">

          <!-- ═══════════════════════════════════════════════════════════════ -->
          <!-- 2. KEY FINANCIAL & SALES KPI CARDS -->
          <!-- ═══════════════════════════════════════════════════════════════ -->
          <div class="kpi-grid">
            <!-- Metric 1: Total Quotations -->
            <div class="metric-card">
              <div class="metric-top">
                <span class="metric-label">Total Quotations</span>
                <span class="metric-icon-badge">📋</span>
              </div>
              <div class="metric-value-row">
                <div class="metric-value">{{ data.totalQuotations }}</div>
                <span class="approval-badge" *ngIf="data.totalQuotations > 0">
                  {{ pct(data.approvedQuotations, data.totalQuotations) | number:'1.0-0' }}% Approved
                </span>
              </div>
              <div class="metric-pills-row">
                <span class="badge-pill green">{{ data.approvedQuotations }} Approved</span>
                <span class="badge-pill amber">{{ data.pendingQuotations }} Pending</span>
                <span class="badge-pill red" *ngIf="data.rejectedQuotations > 0">{{ data.rejectedQuotations }} Rejected</span>
              </div>
              <div class="metric-progress-track">
                <div class="metric-progress-fill green-bar" [style.width.%]="data.totalQuotations ? (data.approvedQuotations / data.totalQuotations * 100) : 0"></div>
              </div>
            </div>

            <!-- Metric 2: Net Quoted Value -->
            <div class="metric-card">
              <div class="metric-top">
                <span class="metric-label">Quoted Business Value</span>
                <span class="metric-icon-badge">💎</span>
              </div>
              <div class="metric-value-row">
                <div class="metric-value font-mono">₹{{ data.totalFinalAmount | number:'1.0-0' }}</div>
              </div>
              <div class="metric-subtext">
                Gross: ₹{{ data.totalQuotedAmount | number:'1.0-0' }}
                <span class="discount-sub" *ngIf="data.totalDiscountAmount > 0">
                  (disc: -₹{{ data.totalDiscountAmount | number:'1.0-0' }})
                </span>
              </div>
              <div class="metric-progress-track">
                <div class="metric-progress-fill blue-bar" style="width: 100%;"></div>
              </div>
            </div>

            <!-- Metric 3: Payments Cleared -->
            <div class="metric-card">
              <div class="metric-top">
                <span class="metric-label">Payments Cleared</span>
                <span class="metric-icon-badge green-badge">✓</span>
              </div>
              <div class="metric-value-row">
                <div class="metric-value green font-mono">₹{{ data.totalPaymentsCleared | number:'1.0-0' }}</div>
              </div>
              <div class="metric-subtext">
                <strong class="green">{{ pct(data.totalPaymentsCleared, data.totalFinalAmount) | number:'1.0-0' }}%</strong> of total quoted revenue cleared
              </div>
              <div class="metric-progress-track">
                <div class="metric-progress-fill green-bar" [style.width.%]="pct(data.totalPaymentsCleared, data.totalFinalAmount)"></div>
              </div>
            </div>

            <!-- Metric 4: Outstanding Receivables -->
            <div class="metric-card">
              <div class="metric-top">
                <span class="metric-label">Outstanding Balance</span>
                <span class="metric-icon-badge amber-badge">⏳</span>
              </div>
              <div class="metric-value-row">
                <div class="metric-value font-mono" [class.danger]="data.totalPendingPayments > 0" [class.green]="data.totalPendingPayments === 0">
                  ₹{{ data.totalPendingPayments | number:'1.0-0' }}
                </div>
              </div>
              <div class="metric-subtext">
                <span *ngIf="data.totalAdvanceReceived > 0">Advance received: ₹{{ data.totalAdvanceReceived | number:'1.0-0' }}</span>
                <span *ngIf="data.totalAdvanceReceived === 0">Pending on installation</span>
              </div>
              <div class="metric-progress-track">
                <div class="metric-progress-fill amber-bar" [style.width.%]="pct(data.totalPendingPayments, data.totalFinalAmount)"></div>
              </div>
            </div>
          </div>

          <!-- ═══════════════════════════════════════════════════════════════ -->
          <!-- 3. RECENT QUOTATIONS TABLE & SEARCH -->
          <!-- ═══════════════════════════════════════════════════════════════ -->
          <div class="dash-section">
            <div class="section-header-bar">
              <div>
                <h2 class="section-heading">Recent Quotations</h2>
                <span class="section-subheading">Preview, download styled PDF, or share directly via WhatsApp</span>
              </div>

              <div class="section-header-right">
                <div class="search-box">
                  <span class="search-icon">🔍</span>
                  <input
                    type="text"
                    [(ngModel)]="searchQuery"
                    placeholder="Search by customer, quote no..."
                    class="search-input-field"
                  />
                  <button *ngIf="searchQuery" (click)="searchQuery = ''" class="search-clear-btn">✕</button>
                </div>

                <a routerLink="/quotations" class="view-archive-link">
                  <span>View All Archive</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            <div class="table-card">
              <div *ngIf="filteredQuotations.length === 0" class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-text">{{ searchQuery ? 'No matching quotations found' : 'No quotations created yet' }}</div>
                <a routerLink="/quotation-maker" target="_blank" class="btn btn-primary btn-sm" style="margin-top:12px;">
                  ✨ Create Quotation ↗
                </a>
              </div>

              <div *ngIf="filteredQuotations.length > 0" class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Quotation Ref</th>
                      <th>Customer Details</th>
                      <th>Date</th>
                      <th class="text-right">Net Amount</th>
                      <th class="text-center">Status</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let q of filteredQuotations">
                      <td>
                        <div class="q-ref-stack">
                          <span class="q-ref-code font-mono">{{ q.quotationNumber || ('QT-' + q.id) }}</span>
                          <span class="q-ref-name" *ngIf="q.title">{{ q.title }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="q-cust-stack">
                          <a [routerLink]="['/customers', q.customerId]" class="q-cust-link" title="View customer profile">
                            {{ q.customerName || 'Valued Customer' }}
                          </a>
                          <span class="q-cust-phone" *ngIf="q.customerContactNumber">📞 {{ q.customerContactNumber }}</span>
                        </div>
                      </td>
                      <td class="text-muted font-sm">
                        {{ q.createdAt | date:'dd MMM yyyy' }}
                      </td>
                      <td class="text-right font-mono font-bold q-amt">
                        ₹{{ (q.finalAmount || q.totalFinalAmount) | number:'1.2-2' }}
                      </td>
                      <td class="text-center">
                        <span [class]="'badge badge-' + (q.quotationStatus || 'approved').toLowerCase()">
                          {{ q.quotationStatus || 'Approved' }}
                        </span>
                      </td>
                      <td class="text-right">
                        <div class="action-buttons-wrap">
                          <button type="button" class="btn btn-secondary btn-xs btn-preview" (click)="openQuotationPreview(q)" title="Smooth preview of styled quotation PDF">
                            👁️ Preview
                          </button>
                          <button type="button" class="btn btn-secondary btn-xs" (click)="downloadQuotationPdf(q)" title="Download PDF directly to machine">
                            📥 PDF
                          </button>
                          <button type="button" class="btn btn-whatsapp btn-xs" (click)="shareQuotationWhatsApp(q)" title="Share PDF via WhatsApp">
                            💬 WhatsApp
                          </button>
                          <a [routerLink]="['/quotation-maker', q.id]" target="_blank" class="btn btn-primary btn-xs" title="Edit in Quotation Maker (New Tab)">
                            Edit ↗
                          </a>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ═══════════════════════════════════════════════════════════════ -->
          <!-- 4. QUICK TOOLS & WORKSPACE (CLEAN FOOTER CARDS) -->
          <!-- ═══════════════════════════════════════════════════════════════ -->
          <div class="dash-section" style="margin-top: 36px;">
            <div class="section-header-bar" style="margin-bottom: 14px;">
              <div>
                <h2 class="section-heading">Furnishing Operations &amp; Tools</h2>
                <span class="section-subheading">Access window measurements, client directory, production stages &amp; analytics</span>
              </div>
            </div>

            <div class="tools-grid">
              <a routerLink="/calculation" class="tool-card">
                <div class="tool-icon-wrap icon-calc-wrap">📐</div>
                <div class="tool-content">
                  <h3 class="tool-title">Window Calculator</h3>
                  <p class="tool-desc">Calculate fabric requirements, roman blinds, wallpapers, and track hardware</p>
                </div>
                <span class="tool-arrow">→</span>
              </a>

              <a routerLink="/customers" class="tool-card">
                <div class="tool-icon-wrap icon-cust-wrap">👥</div>
                <div class="tool-content">
                  <h3 class="tool-title">Customer Directory</h3>
                  <p class="tool-desc">Manage customer profiles, site addresses, phone numbers, and quotation history</p>
                </div>
                <span class="tool-arrow">→</span>
              </a>

              <a routerLink="/products" class="tool-card">
                <div class="tool-icon-wrap icon-prod-wrap">📦</div>
                <div class="tool-content">
                  <h3 class="tool-title">Orders &amp; Production Stages</h3>
                  <p class="tool-desc">Track stitching, procurement, dispatch, installation, and balance payments</p>
                </div>
                <span class="tool-arrow">→</span>
              </a>

              <a routerLink="/monthly-report" class="tool-card">
                <div class="tool-icon-wrap icon-rep-wrap">📈</div>
                <div class="tool-content">
                  <h3 class="tool-title">Monthly Business Reports</h3>
                  <p class="tool-desc">Analyze monthly quotation volume, cleared revenue, and product categories</p>
                </div>
                <span class="tool-arrow">→</span>
              </a>
            </div>
          </div>

        </ng-container>
      </main>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- PDF PREVIEW MODAL (SMOOTH CONTINUOUS SCROLL + ZOOM TOOLBAR) -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div class="modal-overlay" *ngIf="previewingQuotation" (click)="closeQuotationPreview()">
      <div class="modal-card modal-preview" (click)="$event.stopPropagation()">
        
        <!-- Modal Header with Zoom Toolbar & Quick Actions -->
        <div class="modal-header-preview">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:1.3rem;">👁️</span>
            <div>
              <h2 style="font-size:1.05rem; font-weight:800; color:#0f172a; margin:0;">
                Quotation Preview
              </h2>
              <span style="font-size:0.75rem; color:#64748b;">
                {{ previewingQuotation.quotationNumber || 'QT' }} · {{ previewingQuotation.customerName }}
              </span>
            </div>
          </div>

          <!-- Zoom & Actions Toolbar -->
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="preview-zoom-bar">
              <button type="button" class="btn-zoom" (click)="setZoom(previewZoom - 0.1)" [disabled]="previewZoom <= 0.6" title="Zoom out">−</button>
              <span class="zoom-level">{{ (previewZoom * 100) | number:'1.0-0' }}%</span>
              <button type="button" class="btn-zoom" (click)="setZoom(previewZoom + 0.1)" [disabled]="previewZoom >= 1.4" title="Zoom in">+</button>
              <button type="button" class="btn-zoom-reset" (click)="resetZoom()" title="Reset zoom to 100%">100%</button>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" (click)="downloadQuotationPdf(previewingQuotation)" title="Download PDF">
              <span>📥</span> <span>Download PDF</span>
            </button>
            <button type="button" class="btn btn-whatsapp btn-sm" (click)="shareQuotationWhatsApp(previewingQuotation)" title="Share via WhatsApp">
              <span>💬</span> <span>WhatsApp</span>
            </button>
            <button type="button" class="btn-close" (click)="closeQuotationPreview()" title="Close (Esc)">✕</button>
          </div>
        </div>

        <!-- Scrollable Modal Body -->
        <div class="preview-scroll-body">
          <div class="preview-paper-container" [style.transform]="'scale(' + previewZoom + ')'">
            <div [innerHTML]="previewHtml"></div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.82rem; color:#475569;">
            Quotation Total: <strong style="color:#0f172a; font-size:0.95rem;">₹{{ (previewingQuotation.finalAmount || previewingQuotation.totalFinalAmount) | number:'1.2-2' }}</strong>
          </span>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-secondary" (click)="closeQuotationPreview()">Close</button>
            <button type="button" class="btn btn-secondary" (click)="downloadQuotationPdf(previewingQuotation)">
              <span>📥</span> <span>Download PDF</span>
            </button>
            <button type="button" class="btn btn-whatsapp" (click)="shareQuotationWhatsApp(previewingQuotation)">
              <span>💬</span> <span>Share PDF via WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* ── Top Bar / Greeting ── */
    .dash-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 20px;
      flex-wrap: wrap;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    }
    .date-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 9999px;
      font-size: 0.74rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 8px;
    }
    .chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }
    .chip-sep { color: #cbd5e1; font-weight: bold; }
    .page-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.025em;
      line-height: 1.2;
    }
    .page-desc {
      font-size: 0.84rem;
      color: #64748b;
      margin-top: 4px;
    }

    .top-bar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-primary-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
      color: #ffffff;
      font-weight: 800;
      font-size: 0.88rem;
      padding: 9px 16px;
      border-radius: 9px;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.28);
      border: 1px solid #3730a3;
      transition: all 0.18s ease;
    }
    .btn-primary-action:hover {
      background: linear-gradient(135deg, #4338ca 0%, #312e81 100%);
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
      transform: translateY(-1px);
    }
    .btn-action-icon { font-size: 1rem; }
    .btn-action-badge {
      font-size: 0.62rem;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .btn-calc-action {
      padding: 9px 14px;
      border-radius: 9px;
      font-weight: 600;
      font-size: 0.84rem;
    }
    .btn-refresh {
      padding: 9px 12px;
      border-radius: 9px;
    }

    /* ── KPI Grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .metric-card:hover {
      box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.08);
      transform: translateY(-1.5px);
    }
    .metric-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .metric-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .metric-icon-badge {
      font-size: 0.88rem;
    }
    .green-badge { color: #10b981; }
    .amber-badge { color: #f59e0b; }

    .metric-value-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .metric-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    .approval-badge {
      font-size: 0.7rem;
      font-weight: 700;
      color: #059669;
      background: #ecfdf5;
      padding: 2px 7px;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
    }
    .metric-pills-row {
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .badge-pill {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .badge-pill.green { background: #ecfdf5; color: #059669; }
    .badge-pill.amber { background: #fffbeb; color: #d97706; }
    .badge-pill.red { background: #fff1f2; color: #e11d48; }

    .metric-subtext {
      font-size: 0.74rem;
      color: #64748b;
      margin-bottom: 10px;
    }
    .discount-sub {
      color: #e11d48;
      font-weight: 600;
    }

    .metric-progress-track {
      height: 4px;
      background: #f1f5f9;
      border-radius: 9999px;
      overflow: hidden;
      margin-top: auto;
    }
    .metric-progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.4s ease;
    }
    .green-bar { background: #10b981; }
    .blue-bar { background: #4f46e5; }
    .amber-bar { background: #f59e0b; }

    /* ── Sections ── */
    .dash-section {
      margin-bottom: 28px;
    }
    .section-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .section-heading {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.015em;
    }
    .section-subheading {
      font-size: 0.78rem;
      color: #64748b;
    }
    .section-header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Search Box */
    .search-box {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 5px 10px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      min-width: 250px;
    }
    .search-box:focus-within {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }
    .search-icon { font-size: 0.82rem; color: #94a3b8; }
    .search-input-field {
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.82rem;
      color: #1e293b;
      width: 100%;
      font-family: inherit;
    }
    .search-clear-btn {
      background: none;
      border: none;
      font-size: 0.75rem;
      color: #94a3b8;
      cursor: pointer;
      padding: 0 2px;
    }
    .search-clear-btn:hover { color: #0f172a; }

    .view-archive-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #4f46e5;
      text-decoration: none;
    }
    .view-archive-link:hover { text-decoration: underline; }

    /* ── Table Card ── */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    }
    .table-responsive {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;
    }
    .data-table th {
      background: #f8fafc;
      padding: 10px 16px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .data-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: #f8fafc; }

    .q-ref-stack { display: flex; flex-direction: column; gap: 2px; }
    .q-ref-code {
      font-weight: 800;
      color: #0f172a;
      background: #f1f5f9;
      padding: 2px 7px;
      border-radius: 5px;
      display: inline-block;
      width: fit-content;
      font-size: 0.78rem;
    }
    .q-ref-name { font-size: 0.74rem; color: #64748b; }

    .q-cust-stack { display: flex; flex-direction: column; gap: 2px; }
    .q-cust-link {
      font-weight: 700;
      color: #0f172a;
      text-decoration: none;
    }
    .q-cust-link:hover { color: #4f46e5; text-decoration: underline; }
    .q-cust-phone { font-size: 0.72rem; color: #64748b; }

    .q-amt { font-size: 0.92rem; color: #0f172a; }
    .font-sm { font-size: 0.78rem; }
    .text-muted { color: #64748b; }
    .action-buttons-wrap {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }

    /* ── Tools Grid ── */
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .tool-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
      transition: all 0.18s ease;
      position: relative;
    }
    .tool-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.08);
    }
    .tool-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
    }
    .icon-calc-wrap { background: #eef2ff; color: #4f46e5; }
    .icon-cust-wrap { background: #ecfdf5; color: #059669; }
    .icon-prod-wrap { background: #fdf4ff; color: #a855f7; }
    .icon-rep-wrap  { background: #fff7ed; color: #ea580c; }

    .tool-content { flex: 1; min-width: 0; }
    .tool-title {
      font-size: 0.86rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .tool-desc {
      font-size: 0.74rem;
      color: #64748b;
      line-height: 1.35;
    }
    .tool-arrow {
      color: #94a3b8;
      font-size: 0.9rem;
      transition: transform 0.15s;
    }
    .tool-card:hover .tool-arrow {
      color: #4f46e5;
      transform: translateX(2px);
    }

    /* ── Empty & Loading ── */
    .empty-state {
      text-align: center;
      padding: 48px 20px;
      color: #64748b;
    }
    .empty-icon { font-size: 2rem; margin-bottom: 8px; }
    .empty-text { font-size: 0.88rem; font-weight: 600; }

    .loading-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 80px 20px;
      justify-content: center;
      color: #64748b;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .loader {
      width: 20px;
      height: 20px;
      border: 2px solid #e2e8f0;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinning { display: inline-block; animation: spin 0.7s linear infinite; }

    @media (max-width: 1120px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .tools-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 680px) {
      .kpi-grid { grid-template-columns: 1fr; }
      .tools-grid { grid-template-columns: 1fr; }
      .dash-top-bar { padding: 16px; }
      .top-bar-actions { width: 100%; justify-content: space-between; }
      .btn-primary-action { width: 100%; justify-content: center; }
      .section-header-right { width: 100%; }
      .search-box { width: 100%; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  data: Dashboard | null = null;
  recentQuotations: any[] = [];
  loading = true;
  todayFormatted = '';
  searchQuery = '';

  previewingQuotation: any = null;
  previewHtml: SafeHtml = '';
  previewZoom: number = 1.0;

  constructor(
    private api: ApiService,
    private pdfService: PdfService,
    private toast: ToastService,
    private sanitizer: DomSanitizer
  ) {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    this.todayFormatted = new Date().toLocaleDateString('en-IN', options);
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getDashboard().subscribe({
      next: d => {
        this.data = d;
        this.loadRecentQuotations();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadRecentQuotations() {
    this.api.getQuotationsSummary().subscribe({
      next: res => {
        this.recentQuotations = res || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get filteredQuotations(): any[] {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return this.recentQuotations.slice(0, 8);
    }
    const q = this.searchQuery.toLowerCase().trim();
    return this.recentQuotations.filter(item => {
      const num = (item.quotationNumber || '').toLowerCase();
      const name = (item.customerName || '').toLowerCase();
      const phone = (item.customerContactNumber || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      return num.includes(q) || name.includes(q) || phone.includes(q) || title.includes(q);
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  pct(part: number, total: number): number {
    return total > 0 ? Math.min((part / total) * 100, 100) : 0;
  }

  async buildPdfData(q: any): Promise<QuotationPdfData> {
    let biz: any = null;
    let bank: any = null;
    try {
      biz = await this.api.getBusinessProfile().toPromise();
      bank = await this.api.getBankDetails().toPromise();
    } catch (err) {}

    const fullQuote: Quotation = {
      id: q.id,
      customerId: q.customerId,
      customerName: q.customerName,
      customerContactNumber: q.customerContactNumber,
      customerAddress: q.customerAddress,
      quotationNumber: q.quotationNumber,
      title: q.title,
      createdAt: q.createdAt,
      remarks: q.remarks,
      advancePayment: q.advancePayment || 0,
      advancePaymentDate: null,
      discountType: q.discountType || 'percent',
      discountValue: q.discountValue || 0,
      discountAmount: q.discountAmount || 0,
      subTotal: q.subTotal || q.totalFinalAmount || 0,
      finalAmount: q.finalAmount || q.totalFinalAmount || 0,
      items: q.items || [],
      products: q.products || [],
      totalFinalAmount: q.totalFinalAmount || q.finalAmount || 0,
      totalProductAdvance: 0,
      totalAdvance: q.advancePayment || 0,
      totalBalance: q.totalBalance || 0,
      quotationStatus: q.quotationStatus || 'Approved',
      paymentStatus: (q.totalBalance || 0) <= 0 ? 'Full payment cleared' : 'Pending'
    };

    return {
      quotation: fullQuote,
      customer: {
        id: q.customerId,
        name: q.customerName || 'Valued Customer',
        contactNumber: q.customerContactNumber,
        address: q.customerAddress
      } as any,
      business: biz || undefined,
      bank: bank || undefined
    };
  }

  async openQuotationPreview(q: any) {
    try {
      this.previewingQuotation = q;
      this.previewZoom = 1.0;
      const pdfData = await this.buildPdfData(q);
      const rawHtml = this.pdfService.getPreviewHtmlWithStyles(pdfData);
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    } catch (e) {
      this.toast.error('Failed to load quotation preview');
    }
  }

  setZoom(z: number) {
    this.previewZoom = Math.min(Math.max(Number(z.toFixed(1)), 0.6), 1.4);
  }

  resetZoom() {
    this.previewZoom = 1.0;
  }

  closeQuotationPreview() {
    this.previewingQuotation = null;
    this.previewHtml = '';
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.previewingQuotation) {
      this.closeQuotationPreview();
    }
  }

  async downloadQuotationPdf(q: any) {
    try {
      this.toast.info('Generating PDF document...');
      const pdfData = await this.buildPdfData(q);
      const filename = await this.pdfService.downloadPdf(pdfData);
      this.toast.success(`Downloaded "${filename}" directly to your device!`);
    } catch (e) {
      this.toast.error('Failed to generate PDF.');
    }
  }

  async shareQuotationWhatsApp(q: any) {
    try {
      this.toast.info('Preparing PDF document for WhatsApp...');
      const pdfData = await this.buildPdfData(q);
      const res = await this.pdfService.shareViaWhatsApp(pdfData);
      if (res.sharedViaNative) {
        this.toast.success('Sharing PDF document directly to WhatsApp...');
      } else {
        this.toast.success('PDF downloaded to device & WhatsApp opened!');
      }
    } catch (e) {
      this.toast.error('Could not complete WhatsApp sharing.');
    }
  }
}
