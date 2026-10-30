import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
import { ApiService } from '../../services/api.service';
import { CustomerDetail, Product, WorkStage, Quotation, QuotationWindow, RoomCalculationGroup } from '../../models/models';
import { isRomanBlind, isOtherBlind, isBlind } from '../calculation/curtain-calculation';
import { ToastService } from '../../services/toast.service';
import { PdfService, QuotationPdfData } from '../../services/pdf.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  template: `
    <div class="page-wrapper">
      <app-header />
      <main class="main-content" *ngIf="customer">

        <!-- Page Header -->
        <!-- Page Header -->
        <div class="cd-header">
          <div class="cd-back">
            <a routerLink="/customers" class="back-link">
              <span>←</span>
              <span>Back to Customer Directory</span>
            </a>
            <div class="cd-profile-row">
              <div class="cd-avatar" [ngClass]="getAvatarClass(customer.name)">{{ customer.name.charAt(0).toUpperCase() }}</div>
              <div>
                <h1 class="cd-name">{{ customer.name }}</h1>
                <div class="cd-contact">
                  <a *ngIf="customer.contactNumber" [href]="'tel:' + customer.contactNumber" class="cd-phone-link">
                    <span>📞</span>
                    <span>{{ customer.contactNumber }}</span>
                  </a>
                  <button *ngIf="customer.contactNumber" type="button" class="btn-copy" (click)="copyPhone(customer.contactNumber, customer.name)" title="Copy phone number">
                    📋 Copy
                  </button>
                  <a *ngIf="customer.contactNumber" [href]="getWhatsAppUrl(customer.contactNumber, customer.name)" target="_blank" class="btn btn-whatsapp btn-sm" style="padding:3px 10px; font-size:0.75rem;">
                    <span>💬 WhatsApp</span>
                  </a>
                  <span *ngIf="customer.alternateContactNumber" class="cd-alt-phone">· Alt: {{ customer.alternateContactNumber }}</span>
                  <span *ngIf="customer.address" class="cd-addr">· 📍 {{ customer.address }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="cd-header-actions">
            <a [routerLink]="['/calculation']" [queryParams]="{ customerId: customer.id }" class="btn btn-primary">
              <span>📐</span>
              <span>New Window Calculation</span>
            </a>
            <button class="btn btn-secondary" (click)="openAddProduct()">
              <span>+</span>
              <span>Add Product</span>
            </button>
            <button class="btn btn-secondary" (click)="openEditCustomer()" title="Edit Customer Profile">
              <span>✏️</span>
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        <!-- Customer Summary Metric Cards -->
        <div class="info-card">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Site Address</div>
              <div class="info-value">{{ customer.address || '—' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Preferences / Notes</div>
              <div class="info-value italic-notes">{{ customer.notes || 'No special notes recorded' }}</div>
            </div>
            <div class="info-item metric-box">
              <div class="info-label">Total Products</div>
              <div class="info-value bold font-mono">{{ customer.products.length }}</div>
            </div>
            <div class="info-item metric-box">
              <div class="info-label">Total Order Value</div>
              <div class="info-value bold font-mono">₹{{ totalFinal() | number:'1.0-0' }}</div>
            </div>
            <div class="info-item metric-box green-box">
              <div class="info-label">Payments Cleared</div>
              <div class="info-value success font-mono">₹{{ totalCleared() | number:'1.0-0' }}</div>
            </div>
            <div class="info-item metric-box" [class.danger-box]="totalOutstanding() > 0" [class.clear-box]="totalOutstanding() <= 0">
              <div class="info-label">Outstanding Balance</div>
              <div class="info-value font-mono" [class.danger]="totalOutstanding() > 0" [class.success]="totalOutstanding() <= 0">
                ₹{{ totalOutstanding() | number:'1.0-0' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Segmented Tab Navigation -->
        <div class="tabs-nav" style="margin-top:24px; margin-bottom:20px;">
          <button 
            type="button" 
            class="tab-link" 
            [class.active]="activeTab === 'quotations'" 
            (click)="activeTab = 'quotations'">
            <span>📋 Quotations &amp; Estimates</span>
            <span class="tab-badge">{{ customer.quotations.length }}</span>
          </button>
          <button 
            type="button" 
            class="tab-link" 
            [class.active]="activeTab === 'orders'" 
            (click)="activeTab = 'orders'">
            <span>📦 Orders &amp; Work Stages</span>
            <span class="tab-badge">{{ customer.products.length }}</span>
          </button>
          <button 
            type="button" 
            class="tab-link" 
            [class.active]="activeTab === 'profile'" 
            (click)="activeTab = 'profile'">
            <span>ℹ️ Client Profile &amp; Notes</span>
          </button>
        </div>

        <!-- ── TAB 1: QUOTATIONS & CALCULATIONS ── -->
        <div *ngIf="activeTab === 'quotations'" class="tab-pane">
          <div class="quotations-section">
            <div class="section-header">
              <div class="section-title">Quotations ({{ customer.quotations.length }})</div>
              <div class="cd-quote-actions">
                <a [routerLink]="['/quotation-maker']" [queryParams]="{ customerId: customer.id }" target="_blank" class="btn btn-primary btn-sm">
                  🧾 Quotation Maker ↗
                </a>
                <a [routerLink]="['/calculation']" [queryParams]="{ customerId: customer.id }" class="btn btn-secondary btn-sm">
                  📐 Window Calculation
                </a>
              </div>
            </div>

          <div *ngIf="!customer || customer.quotations.length === 0" class="empty-card">
            <div class="empty-icon">📋</div>
            <div>No quotations created yet.</div>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:12px;">
              <a [routerLink]="['/quotation-maker']" [queryParams]="{ customerId: customer.id }" target="_blank" class="btn btn-primary">
                🧾 Open Quotation Maker ↗
              </a>
              <a [routerLink]="['/calculation']" [queryParams]="{ customerId: customer.id }" class="btn btn-secondary">
                📐 Start Window Calculation
              </a>
            </div>
          </div>

          <div *ngFor="let q of customer?.quotations ?? []" 
            class="quotation-card" 
            [class.selected]="selectedQuotation?.id === q.id" 
            [class.quote-approved]="q.quotationStatus === 'Approved'"
            [class.quote-pending]="q.quotationStatus === 'Pending'"
            [class.quote-rejected]="q.quotationStatus === 'Rejected'"
            (click)="selectedQuotation = (selectedQuotation?.id === q.id ? null : q)">
            <div class="quotation-header">
              <div class="quotation-title-wrap">
                <div class="quote-title-line">
                  <span class="quote-num-pill font-mono" *ngIf="q.quotationNumber" (click)="copyQuotationNumber(q.quotationNumber, $event)" title="Click to copy quotation number">
                    📋 {{ q.quotationNumber }}
                  </span>
                  <span class="quotation-title">{{ q.title }}</span>
                </div>
                <div class="quotation-meta">
                  <span>{{ q.createdAt | date:'dd MMM yyyy' }}</span>
                  <span class="meta-dot">·</span>
                  <span *ngIf="q.items && q.items.length > 0" class="meta-win-tag">{{ q.items.length }} item{{ q.items.length !== 1 ? 's' : '' }} · </span>
                  <span *ngIf="q.windows && countWindowsExcludingWallpaper(q) > 0" class="meta-win-tag">{{ countWindowsExcludingWallpaper(q) }} window{{ countWindowsExcludingWallpaper(q) !== 1 ? 's' : '' }} · </span>
                  <span *ngIf="q.windows && wallpaperArea(q) > 0" class="meta-wallpaper-tag">{{ wallpaperArea(q) | number:'1.2-2' }} sq ft wallpaper · </span>
                  <span *ngIf="q.products && q.products.length > 0">{{ q.products.length }} product{{ q.products.length !== 1 ? 's' : '' }} · </span>
                  <span [class]="'badge badge-' + q.quotationStatus.toLowerCase()">{{ q.quotationStatus }}</span>
                </div>
              </div>
              <div class="quotation-actions">
                <button class="btn btn-secondary btn-sm" (click)="openQuotationPreview(q, $event)" title="Preview styled quotation document">
                  👁️ Preview
                </button>
                <a [routerLink]="['/quotation-maker', q.id]" target="_blank" class="btn btn-primary btn-sm" (click)="$event.stopPropagation()" title="Open in Quotation Maker (New Tab)">
                  🧾 Open ↗
                </a>
                <button class="btn btn-secondary btn-sm" (click)="downloadQuotationPdf(q, $event)" title="Download PDF directly to device">
                  📥 PDF
                </button>
                <button class="btn btn-whatsapp btn-sm" (click)="shareQuotationWhatsApp(q, $event)" title="Share PDF file via WhatsApp">
                  💬 WhatsApp
                </button>
                <button class="btn btn-secondary btn-sm" (click)="deleteQuotation(q); $event.stopPropagation()">Delete</button>
              </div>
            </div>
            <div *ngIf="selectedQuotation?.id === q.id" class="quotation-details">
              <div class="quotation-summary">
                <div class="sum-item">
                  <span class="sum-label">Total Amount</span>
                  <span class="sum-value">₹{{ q.totalFinalAmount | number:'1.0-0' }}</span>
                </div>
                <div class="sum-item">
                  <span class="sum-label">Total Advance</span>
                  <span class="sum-value success">₹{{ q.totalProductAdvance | number:'1.0-0' }}</span>
                </div>
                <div class="sum-item">
                  <span class="sum-label">Balance</span>
                  <span class="sum-value" [class.danger]="q.totalBalance > 0">₹{{ q.totalBalance | number:'1.0-0' }}</span>
                </div>
              </div>
              <div class="quotation-remarks" *ngIf="q.remarks">
                <span class="remarks-label">Remarks:</span>
                <span class="remarks-text">{{ q.remarks }}</span>
              </div>

              <!-- Itemized Quotation Line Items (Particulars Table) -->
              <div *ngIf="q.items && q.items.length > 0" class="q-items-block" style="margin-top:16px;">
                <div class="calc-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                  <div class="detail-title" style="margin-top:0; font-weight:800; color:#4338ca;">
                    ITEMIZED PARTICULARS &amp; BILLING ({{ q.items.length }} ITEMS)
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button class="btn btn-secondary btn-sm" (click)="openQuotationPreview(q, $event)" title="Preview styled quotation document">
                      👁️ Preview
                    </button>
                    <button class="btn btn-secondary btn-sm" (click)="downloadQuotationPdf(q, $event)" title="Direct download PDF file">
                      📥 Download PDF
                    </button>
                    <button class="btn btn-whatsapp btn-sm" (click)="shareQuotationWhatsApp(q, $event)" title="Share PDF document via WhatsApp">
                      💬 Share via WhatsApp
                    </button>
                    <a [routerLink]="['/quotation-maker', q.id]" target="_blank" class="btn btn-primary btn-sm" (click)="$event.stopPropagation()">
                      ✏️ Edit in Maker ↗
                    </a>
                  </div>
                </div>

                <div class="table-wrap q-win-table-wrap">
                  <table class="q-win-table">
                    <thead>
                      <tr>
                        <th style="width:50px;" class="text-center">Sr.</th>
                        <th>Particulars</th>
                        <th class="text-center">Quantity (Unit)</th>
                        <th class="text-right">Rate</th>
                        <th class="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of q.items">
                        <td class="text-center font-mono font-bold text-muted">{{ item.srNo }}</td>
                        <td>
                          <strong>{{ item.particular }}</strong>
                          <div *ngIf="item.description" class="item-table-desc text-muted" style="font-size:0.75rem; margin-top:2px; white-space:pre-line; color:#64748b; font-weight:normal;">
                            {{ item.description }}
                          </div>
                        </td>
                        <td class="text-center">
                          <span class="combined-qty-chip font-mono">
                            <strong>{{ item.quantity }}</strong> ({{ item.unit || 'mtr' }})
                          </span>
                        </td>
                        <td class="text-right font-mono">₹{{ item.rate | number:'1.2-2' }}</td>
                        <td class="text-right font-mono font-bold">₹{{ item.total | number:'1.2-2' }}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr class="tfoot-summary-row" *ngIf="q.subTotal">
                        <td colspan="4" class="text-right bold-foot">Subtotal:</td>
                        <td class="text-right font-mono bold-foot">₹{{ (q.subTotal || q.totalFinalAmount) | number:'1.2-2' }}</td>
                      </tr>
                      <tr class="tfoot-summary-row" *ngIf="q.discountAmount && q.discountAmount > 0">
                        <td colspan="4" class="text-right bold-foot" style="color:#b45309;">
                          Discount ({{ q.discountType === 'percent' ? (q.discountValue + '%') : 'Flat' }}):
                        </td>
                        <td class="text-right font-mono bold-foot" style="color:#b45309;">- ₹{{ q.discountAmount | number:'1.2-2' }}</td>
                      </tr>
                      <tr class="tfoot-summary-row" style="background:#f0fdf4;">
                        <td colspan="4" class="text-right bold-foot" style="color:#15803d; font-size:0.95rem;">FINAL NET AMOUNT:</td>
                        <td class="text-right font-mono bold-foot" style="color:#15803d; font-size:1.05rem;">₹{{ (q.finalAmount || q.totalFinalAmount) | number:'1.2-2' }}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <!-- Room-wise Window Measurements & Calculation Summary -->
              <div *ngIf="q.windows && q.windows.length > 0" class="q-windows-block">
                <div class="calc-header">
                  <div class="detail-title" style="margin-top:14px;">
                    CALCULATION SUMMARY ({{ countRooms(q) }} ROOMS · {{ countWindowsExcludingWallpaper(q) }} WINDOWS<span *ngIf="wallpaperArea(q) > 0"> · {{ wallpaperArea(q) | number:'1.2-2' }} SQ FT WALLPAPER</span>)
                  </div>
                  <button class="btn btn-secondary btn-sm" (click)="editQuotationCalculations(q); $event.stopPropagation()">✏️ Edit Calculations</button>
                </div>

                <!-- KPI Summary Grid -->
                <div class="q-kpi-grid">
                  <div class="q-kpi-card">
                    <span class="q-kpi-val">{{ countSingleCurtainWindows(q) }} <span class="unit-xs">windows</span></span>
                    <span class="q-kpi-lbl">Single Curtain Windows</span>
                    <span *ngIf="countSingleSheerCurtainWindows(q) > 0" style="font-size:0.68rem; color:#6d28d9; margin-top:2px;">
                      {{ countSingleMainCurtainWindows(q) }} Main · {{ countSingleSheerCurtainWindows(q) }} Sheer
                    </span>
                  </div>
                  <div class="q-kpi-card highlight-double">
                    <span class="q-kpi-val">{{ countDoubleCurtainWindows(q) }} <span class="unit-xs">windows</span></span>
                    <span class="q-kpi-lbl">Double Curtain Windows</span>
                    <span style="font-size:0.68rem; color:#6d28d9; margin-top:2px;">1 window only (Main + Sheer)</span>
                  </div>
                  <div class="q-kpi-card highlight-blinds" *ngIf="countBlindWindows(q) > 0">
                    <span class="q-kpi-val">{{ countBlindWindows(q) }} <span class="unit-xs">windows</span></span>
                    <span class="q-kpi-lbl">Total Blind Windows</span>
                    <span style="font-size:0.68rem; color:#0369a1; margin-top:2px;">{{ countRomanBlindWindows(q) }} Roman · {{ countOtherBlindWindows(q) }} Other</span>
                  </div>
                  <div class="q-kpi-card" *ngIf="mainCurtainMeters(q) > 0">
                    <span class="q-kpi-val">{{ mainCurtainMeters(q) | number:'1.2-2' }} <span class="unit-xs">m</span></span>
                    <span class="q-kpi-lbl">Main Curtain Quantity</span>
                  </div>
                  <div class="q-kpi-card highlight-double" *ngIf="sheerCurtainMeters(q) > 0">
                    <span class="q-kpi-val">{{ sheerCurtainMeters(q) | number:'1.2-2' }} <span class="unit-xs">m</span></span>
                    <span class="q-kpi-lbl">Sheer Curtain Quantity</span>
                  </div>
                  <div class="q-kpi-card highlight-curtain" *ngIf="curtainMeters(q) > 0">
                    <span class="q-kpi-val">{{ curtainMeters(q) | number:'1.2-2' }} <span class="unit-xs">m</span></span>
                    <span class="q-kpi-lbl">Total Curtain Cloth</span>
                    <span *ngIf="sheerCurtainMeters(q) > 0 && mainCurtainMeters(q) > 0" style="font-size:0.68rem; color:#166534; font-weight:600; margin-top:2px;">
                      Main: {{ mainCurtainMeters(q) | number:'1.2-2' }} m + Sheer: {{ sheerCurtainMeters(q) | number:'1.2-2' }} m
                    </span>
                  </div>
                  <div class="q-kpi-card" *ngIf="romanBlindsArea(q) > 0">
                    <span class="q-kpi-val">{{ romanBlindsArea(q) | number:'1.2-2' }} <span class="unit-xs">sq ft</span></span>
                    <span class="q-kpi-lbl">Roman Blinds Total</span>
                  </div>
                  <div class="q-kpi-card" *ngIf="otherBlindsArea(q) > 0">
                    <span class="q-kpi-val">{{ otherBlindsArea(q) | number:'1.2-2' }} <span class="unit-xs">sq ft</span></span>
                    <span class="q-kpi-lbl">Other Blinds Total</span>
                  </div>
                  <div class="q-kpi-card highlight-blinds" *ngIf="blindsArea(q) > 0">
                    <span class="q-kpi-val">{{ blindsArea(q) | number:'1.2-2' }} <span class="unit-xs">sq ft</span></span>
                    <span class="q-kpi-lbl">Grand Total Blinds Area</span>
                    <span *ngIf="countRomanBlindWindows(q) > 0 && countOtherBlindWindows(q) > 0" style="font-size:0.68rem; color:#0369a1; margin-top:2px;">
                      Roman: {{ romanBlindsArea(q) | number:'1.2-2' }} + Other: {{ otherBlindsArea(q) | number:'1.2-2' }} sq ft
                    </span>
                  </div>
                  <div class="q-kpi-card" *ngIf="countWindowsExcludingWallpaper(q) > 0">
                    <span class="q-kpi-val">{{ countRooms(q) }} <span class="unit-xs">rooms</span> · {{ countWindowsExcludingWallpaper(q) }} <span class="unit-xs">windows</span></span>
                    <span class="q-kpi-lbl">Total Windows</span>
                  </div>
                  <div class="q-kpi-card highlight-wallpaper" *ngIf="wallpaperArea(q) > 0">
                    <span class="q-kpi-val">{{ wallpaperArea(q) | number:'1.2-2' }} <span class="unit-xs">sq ft</span></span>
                    <span class="q-kpi-lbl">Total Wallpaper Area</span>
                  </div>
                </div>

                <div class="table-wrap q-win-table-wrap">
                  <table class="q-win-table">
                    <thead>
                      <tr>
                        <th>Room / Location</th>
                        <th>Window</th>
                        <th>Type</th>
                        <th class="text-right">Width</th>
                        <th class="text-right">Height</th>
                        <th class="text-center">Panels</th>
                        <th class="text-right">Requirement</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ng-container *ngFor="let group of getRoomGroups(q)">
                        <!-- Room Header Row -->
                        <tr class="room-hdr-row">
                          <td colspan="7">
                            <span class="room-hdr-name">🏠 {{ group.roomName }}</span>
                            <span class="room-hdr-count">({{ roomWindowCount(group) }} window{{ roomWindowCount(group) !== 1 ? 's' : '' }}<span *ngIf="group.totalWallpaperArea > 0"> · {{ group.totalWallpaperArea | number:'1.2-2' }} sq ft wallpaper</span>)</span>
                          </td>
                        </tr>

                        <!-- Window Rows under this Room -->
                        <ng-container *ngFor="let w of group.windows; let wi = index">
                          <tr>
                            <td class="text-muted indent-cell">↳ {{ group.roomName }}</td>
                            <td>
                              <strong>{{ w.windowName || ('Window ' + (wi + 1)) }}</strong>
                              <span *ngIf="w.isDoubleCurtain" class="double-curtain-badge">Double (1 Window)</span>
                              <span *ngIf="!w.isDoubleCurtain && w.treatmentType === 'Curtain' && w.curtainType === 'Sheer'" class="sheer-curtain-badge">Sheer Only</span>
                            </td>
                            <td>
                              <span class="win-type-pill" 
                                [class.type-curtain]="w.treatmentType === 'Curtain' && (w.isDoubleCurtain || w.curtainType !== 'Sheer')" 
                                [class.type-sheer]="w.treatmentType === 'Curtain' && !w.isDoubleCurtain && w.curtainType === 'Sheer'"
                                [class.type-wallpaper]="w.treatmentType === 'Wallpaper'" 
                                [class.type-blind]="w.treatmentType !== 'Curtain' && w.treatmentType !== 'Wallpaper'">
                                {{ w.treatmentType === 'Curtain' ? (!w.isDoubleCurtain && w.curtainType === 'Sheer' ? '✨ Sheer Curtain' : '🪟 Curtain') : w.treatmentType === 'Wallpaper' ? '🖼️ Wallpaper' : ('📐 ' + w.treatmentType) }}
                                <span *ngIf="w.isDoubleCurtain" class="main-label">(Main)</span>
                                <span *ngIf="!w.isDoubleCurtain && w.treatmentType === 'Curtain' && w.curtainType !== 'Sheer'" class="main-label">(Main)</span>
                              </span>
                            </td>
                            <td class="text-right font-mono">{{ w.width }}"</td>
                            <td class="text-right font-mono">{{ w.height }}"</td>
                            <td class="text-center font-mono">
                              <span *ngIf="w.treatmentType === 'Curtain'" class="badge-panel">{{ w.panels }}</span>
                              <span *ngIf="w.treatmentType !== 'Curtain'" class="text-muted">—</span>
                            </td>
                            <td class="text-right font-mono">
                              <strong>{{ (w.isDoubleCurtain && w.treatmentType === 'Curtain' ? getMainRequirement(w) : w.requirement) | number:'1.2-2' }}</strong> {{ w.unit }}
                              <span *ngIf="w.isDoubleCurtain && w.treatmentType === 'Curtain'" class="sub-label">(Main Curtain)</span>
                              <span *ngIf="!w.isDoubleCurtain && w.treatmentType === 'Curtain'" class="sub-label" [style.color]="w.curtainType === 'Sheer' ? '#6d28d9' : '#15803d'">
                                ({{ w.curtainType === 'Sheer' ? 'Sheer Curtain' : 'Main Curtain' }})
                              </span>
                            </td>
                          </tr>
                          <!-- Sheer Curtain Row (if Double Curtain) -->
                          <tr *ngIf="w.isDoubleCurtain && w.treatmentType === 'Curtain'" class="sheer-row">
                            <td class="text-muted indent-cell">  ↳ Sheer</td>
                            <td><span class="text-muted italic">Sheer: {{ w.sheerWidth ?? w.width }}" × {{ w.sheerHeight ?? w.height }}" · {{ w.sheerPanels ?? w.panels }} panels</span></td>
                            <td>
                              <span class="win-type-pill type-curtain sheer-label">
                                🪟 Sheer Curtain
                              </span>
                            </td>
                            <td class="text-right font-mono text-muted">{{ w.sheerWidth ?? w.width }}"</td>
                            <td class="text-right font-mono text-muted">{{ w.sheerHeight ?? w.height }}"</td>
                            <td class="text-center font-mono text-muted">{{ w.sheerPanels ?? w.panels }}</td>
                            <td class="text-right font-mono text-muted">
                              <strong>{{ getSheerRequirement(w) | number:'1.2-2' }}</strong> {{ w.unit }}
                              <span class="sub-label">(Sheer Curtain)</span>
                            </td>
                          </tr>
                          <!-- Double Curtain Total Row -->
                          <tr *ngIf="w.isDoubleCurtain && w.treatmentType === 'Curtain'" class="double-total-row">
                            <td colspan="5" class="text-right text-muted" style="font-size:0.78rem;">{{ w.windowName || 'Window' }} Total Quantity (1 Window = Main + Sheer):</td>
                            <td colspan="2" class="text-right font-mono" style="font-weight:800; color:#166534;">{{ w.requirement | number:'1.2-2' }} {{ w.unit }}</td>
                          </tr>
                        </ng-container>

                        <!-- Room Subtotal Row -->
                        <tr class="room-subtotal-table-row">
                          <td colspan="5" class="text-right font-bold text-muted">
                            {{ group.roomName }} Total:
                          </td>
                          <td colspan="2" class="text-right font-mono font-bold">
                            <span *ngIf="group.totalCurtainMeters > 0" class="green-text">
                              {{ group.totalCurtainMeters | number:'1.2-2' }} m
                            </span>
                            <span *ngIf="group.totalCurtainMeters > 0 && (group.totalBlindsArea > 0 || group.totalWallpaperArea > 0)"> · </span>
                            <span *ngIf="group.totalBlindsArea > 0" class="blue-text">
                              {{ group.totalBlindsArea | number:'1.2-2' }} sq ft (blinds<span *ngIf="(group.totalRomanBlindsArea ?? 0) > 0 && (group.totalOtherBlindsArea ?? 0) > 0">: {{ group.totalRomanBlindsArea | number:'1.2-2' }} Roman + {{ group.totalOtherBlindsArea | number:'1.2-2' }} Other</span>)
                            </span>
                            <span *ngIf="group.totalBlindsArea > 0 && group.totalWallpaperArea > 0"> · </span>
                            <span *ngIf="group.totalWallpaperArea > 0" class="orange-text">
                              {{ group.totalWallpaperArea | number:'1.2-2' }} sq ft (wallpaper)
                            </span>
                          </td>
                        </tr>
                      </ng-container>
                    </tbody>
                    <tfoot *ngIf="curtainMeters(q) > 0 || blindsArea(q) > 0 || wallpaperArea(q) > 0 || totalCurtainPanels(q) > 0 || countBlindWindows(q) > 0">
                      <tr *ngIf="countCurtainWindows(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">SINGLE CURTAIN WINDOWS:</td>
                        <td colspan="2" class="text-right font-mono bold-foot">
                          {{ countSingleCurtainWindows(q) }} window{{ countSingleCurtainWindows(q) !== 1 ? 's' : '' }}
                          <span *ngIf="countSingleSheerCurtainWindows(q) > 0" style="font-size:0.75rem; color:#71717a; font-weight:normal; margin-left:6px;">
                            ({{ countSingleMainCurtainWindows(q) }} Main · {{ countSingleSheerCurtainWindows(q) }} Sheer)
                          </span>
                        </td>
                      </tr>
                      <tr *ngIf="countDoubleCurtainWindows(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">DOUBLE CURTAIN WINDOWS:</td>
                        <td colspan="2" class="text-right font-mono bold-foot purple-text">{{ countDoubleCurtainWindows(q) }} window{{ countDoubleCurtainWindows(q) !== 1 ? 's' : '' }} <span style="font-size:0.75rem; font-weight:normal; color:#6d28d9;">(1 window only)</span></td>
                      </tr>
                      <tr *ngIf="mainCurtainMeters(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">MAIN CURTAIN QUANTITY:</td>
                        <td colspan="2" class="text-right font-mono bold-foot">{{ mainCurtainMeters(q) | number:'1.2-2' }} meters</td>
                      </tr>
                      <tr *ngIf="sheerCurtainMeters(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">SHEER CURTAIN QUANTITY:</td>
                        <td colspan="2" class="text-right font-mono bold-foot purple-text">{{ sheerCurtainMeters(q) | number:'1.2-2' }} meters</td>
                      </tr>
                      <tr *ngIf="curtainMeters(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">GRAND TOTAL CURTAIN CLOTH:</td>
                        <td colspan="2" class="text-right font-mono bold-foot green-text">
                          {{ curtainMeters(q) | number:'1.2-2' }} meters
                          <div *ngIf="sheerCurtainMeters(q) > 0 && mainCurtainMeters(q) > 0" class="sub-split-foot">
                            (Main: {{ mainCurtainMeters(q) | number:'1.2-2' }} m + Sheer: {{ sheerCurtainMeters(q) | number:'1.2-2' }} m)
                          </div>
                        </td>
                      </tr>
                      <tr *ngIf="countWindowsExcludingWallpaper(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">TOTAL WINDOWS COUNT:</td>
                        <td colspan="2" class="text-right font-mono bold-foot">
                          {{ countWindowsExcludingWallpaper(q) }} window{{ countWindowsExcludingWallpaper(q) !== 1 ? 's' : '' }}
                          <span style="font-size:0.75rem; color:#71717a; font-weight:normal; margin-left:6px;">
                            ({{ countSingleCurtainWindows(q) }} Single · {{ countDoubleCurtainWindows(q) }} Double<span *ngIf="countBlindWindows(q) > 0"> · {{ countBlindWindows(q) }} Blinds ({{ countRomanBlindWindows(q) }} Roman, {{ countOtherBlindWindows(q) }} Other)</span>)
                          </span>
                        </td>
                      </tr>
                      <tr *ngIf="totalCurtainPanels(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">GRAND TOTAL CURTAIN PANELS:</td>
                        <td colspan="2" class="text-right font-mono bold-foot purple-text">{{ totalCurtainPanels(q) }} panels</td>
                      </tr>
                      <tr *ngIf="countBlindWindows(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">TOTAL BLIND WINDOWS:</td>
                        <td colspan="2" class="text-right font-mono bold-foot blue-text">
                          {{ countBlindWindows(q) }} window{{ countBlindWindows(q) !== 1 ? 's' : '' }}
                          <span style="font-size:0.75rem; font-weight:normal; margin-left:6px; color:#0369a1;">({{ countRomanBlindWindows(q) }} Roman · {{ countOtherBlindWindows(q) }} Other)</span>
                        </td>
                      </tr>
                      <tr *ngIf="romanBlindsArea(q) > 0 || countRomanBlindWindows(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">ROMAN BLINDS TOTAL:</td>
                        <td colspan="2" class="text-right font-mono bold-foot">
                          {{ romanBlindsArea(q) | number:'1.2-2' }} sq ft
                          <span style="font-size:0.75rem; font-weight:normal; color:#71717a; margin-left:6px;">({{ countRomanBlindWindows(q) }} window{{ countRomanBlindWindows(q) !== 1 ? 's' : '' }})</span>
                        </td>
                      </tr>
                      <tr *ngIf="otherBlindsArea(q) > 0 || countOtherBlindWindows(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">OTHER BLINDS TOTAL:</td>
                        <td colspan="2" class="text-right font-mono bold-foot">
                          {{ otherBlindsArea(q) | number:'1.2-2' }} sq ft
                          <span style="font-size:0.75rem; font-weight:normal; color:#71717a; margin-left:6px;">({{ countOtherBlindWindows(q) }} window{{ countOtherBlindWindows(q) !== 1 ? 's' : '' }})</span>
                        </td>
                      </tr>
                      <tr *ngIf="blindsArea(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">GRAND TOTAL BLINDS AREA:</td>
                        <td colspan="2" class="text-right font-mono bold-foot blue-text">
                          {{ blindsArea(q) | number:'1.2-2' }} sq ft
                          <div *ngIf="countRomanBlindWindows(q) > 0 && countOtherBlindWindows(q) > 0" class="sub-split-foot" style="color:#0284c7;">
                            (Roman: {{ romanBlindsArea(q) | number:'1.2-2' }} sq ft + Other: {{ otherBlindsArea(q) | number:'1.2-2' }} sq ft)
                          </div>
                        </td>
                      </tr>
                      <tr *ngIf="wallpaperArea(q) > 0" class="tfoot-summary-row">
                        <td colspan="5" class="text-right bold-foot">GRAND TOTAL WALLPAPER AREA:</td>
                        <td colspan="2" class="text-right font-mono bold-foot orange-text">{{ wallpaperArea(q) | number:'1.2-2' }} sq ft</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <!-- Products inside this quotation -->
              <div *ngIf="q.products.length > 0" class="q-products-list">
                <div class="detail-title" style="margin-top:14px;">PRODUCTS</div>
                <div *ngFor="let p of q.products" class="q-product-card">
                  <div class="q-product-top">
                    <div class="q-product-info">
                      <span class="q-product-name">{{ p.productName }}</span>
                      <span class="q-product-meta">{{ p.productType }}<span *ngIf="p.company"> · {{ p.company }}</span></span>
                    </div>
                    <div class="q-product-finance">
                      <span class="q-product-amount">₹{{ p.finalAmount | number:'1.0-0' }}</span>
                      <span [class]="'badge badge-' + p.quotationStatus.toLowerCase()">{{ p.quotationStatus }}</span>
                      <span [class]="p.paymentStatus === 'Full payment cleared' ? 'badge badge-cleared' : 'badge badge-pending'">
                        {{ p.paymentStatus === 'Full payment cleared' ? '✓ Cleared' : '⏳ Pending' }}
                      </span>
                      <button class="btn btn-secondary btn-sm" (click)="openEditProduct(p); $event.stopPropagation()">Edit</button>
                      <button class="btn btn-danger btn-sm" (click)="deleteProduct(p); $event.stopPropagation()">Delete</button>
                    </div>
                  </div>
                  <!-- Progress Bar -->
                  <div class="progress-section" style="margin:8px 0 6px;">
                    <div class="progress-info">
                      <span>Work Progress</span>
                      <span class="progress-count">{{ p.completedStages }}/{{ p.totalStages }} stages complete</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill" [style.width.%]="p.totalStages ? (p.completedStages / p.totalStages * 100) : 0"></div>
                    </div>
                  </div>
                  <!-- Work Stages -->
                  <div *ngIf="p.workStages.length > 0" class="stages-grid" (click)="$event.stopPropagation()">
                    <div *ngFor="let s of p.workStages" class="stage-row" [class.stage-done]="s.isCompleted">
                      <label class="stage-check-wrap">
                        <input type="checkbox" [checked]="s.isCompleted" (change)="toggleStage(p, s, $event); $event.stopPropagation()" />
                        <span class="stage-checkmark"></span>
                      </label>
                      <div class="stage-info">
                        <span class="stage-label" [class.done]="s.isCompleted">{{ s.stageName }}</span>
                        <span class="stage-date" *ngIf="s.isCompleted && s.dateCompleted">{{ s.dateCompleted | date:'dd MMM yyyy' }}</span>
                      </div>
                      <input class="stage-note" [(ngModel)]="s.remarks" placeholder="Add note..." (click)="$event.stopPropagation()" (blur)="saveStageRemarks(p, s)" />
                    </div>
                  </div>
                </div>
              </div>
              <div *ngIf="q.products.length === 0" class="q-empty">
                No products yet. <button class="btn-link" (click)="openAddProductToQuotation(q); $event.stopPropagation()">+ Add one</button>
              </div>
            </div>
          </div>
        </div>
        </div> <!-- End Tab 1 (Quotations) -->

        <!-- ── TAB 2: ORDERS & WORK STAGES ── -->
        <div *ngIf="activeTab === 'orders'" class="tab-pane">
          <div class="section-header">
            <div>
              <div class="section-title">Production &amp; Fulfillment Stages ({{ customer.products.length }})</div>
              <p style="font-size:0.8rem; color:var(--text-3); margin-top:2px;">Track manufacturing, tailoring, and delivery milestones</p>
            </div>
            <button class="btn btn-primary btn-sm" (click)="openAddProduct()">+ Add Product / Item</button>
          </div>

          <div *ngIf="customer.products.length === 0" class="empty-card">
            <div class="empty-icon">📦</div>
            <div>No products or order items recorded for this customer yet.</div>
            <button class="btn btn-primary" style="margin-top:12px;" (click)="openAddProduct()">+ Add First Product</button>
          </div>

          <div *ngFor="let p of customer.products" class="product-card">
            <!-- Product Top Bar -->
            <div class="product-top">
              <div class="product-title-wrap">
                <div class="product-name">{{ p.productName }}</div>
                <div class="product-meta">
                  <span *ngIf="p.company">{{ p.company }}</span>
                  <span class="meta-dot" *ngIf="p.company && p.productType">·</span>
                  <span>{{ p.productType }}</span>
                  <span class="meta-dot" *ngIf="p.serialNumber">·</span>
                  <span *ngIf="p.serialNumber" style="font-family:monospace;">S/N: {{ p.serialNumber }}</span>
                </div>
              </div>
              <div class="product-badges">
                <span [class]="'badge badge-' + p.quotationStatus.toLowerCase()">{{ p.quotationStatus }}</span>
                <span [class]="p.paymentStatus === 'Full payment cleared' ? 'badge badge-cleared' : 'badge badge-pending'">
                  {{ p.paymentStatus === 'Full payment cleared' ? '✓ Cleared' : '⏳ Pending' }}
                </span>
                <button class="btn btn-secondary btn-sm" (click)="openEditProduct(p)">Edit</button>
                <button class="btn btn-danger btn-sm" (click)="deleteProduct(p)">Delete</button>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-section">
              <div class="progress-info">
                <span>Work Progress</span>
                <span class="progress-count">{{ p.completedStages }}/{{ p.totalStages }} stages complete</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="p.totalStages ? (p.completedStages / p.totalStages * 100) : 0"></div>
              </div>
            </div>

            <!-- Two column layout: Details + Financials -->
            <div class="product-body">
              <!-- Left: Product Details -->
              <div class="detail-section">
                <div class="detail-title">PRODUCT DETAILS</div>
                <div class="detail-grid">
                  <div class="detail-row"><span class="dl">Quantity</span><span class="dv">{{ p.quantity }}</span></div>
                  <div class="detail-row"><span class="dl">Colour</span><span class="dv">{{ p.colour || '—' }}</span></div>
                  <div class="detail-row"><span class="dl">Measurement</span><span class="dv">{{ p.measurement || '—' }}</span></div>
                  <div class="detail-row"><span class="dl">Date Ordered</span><span class="dv">{{ p.dateOrdered ? (p.dateOrdered | date:'dd MMM yyyy') : '—' }}</span></div>
                  <div class="detail-row"><span class="dl">Expected Delivery</span><span class="dv">{{ p.expectedDeliveryDate ? (p.expectedDeliveryDate | date:'dd MMM yyyy') : '—' }}</span></div>
                  <div class="detail-row"><span class="dl">Remarks</span><span class="dv">{{ p.internalRemarks || '—' }}</span></div>
                </div>
              </div>

              <!-- Right: Financials -->
              <div class="finance-section">
                <div class="detail-title">FINANCIALS</div>
                <div class="finance-rows">
                  <div class="finance-row">
                    <span class="fl">Quotation Amount</span>
                    <span class="fv">₹{{ p.quotationAmount | number:'1.0-0' }}</span>
                  </div>
                  <div class="finance-row">
                    <span class="fl">Discount</span>
                    <span class="fv discount">− ₹{{ p.discountAmount | number:'1.0-0' }}</span>
                  </div>
                  <div class="finance-row final-row">
                    <span class="fl">Final Amount</span>
                    <span class="fv final">₹{{ p.finalAmount | number:'1.0-0' }}</span>
                  </div>
                  <div class="finance-divider"></div>
                  <div class="finance-row">
                    <span class="fl">Advance Paid</span>
                    <span class="fv success">₹{{ p.advancePayment | number:'1.0-0' }}</span>
                  </div>
                  <div class="finance-row">
                    <span class="fl">Balance Due</span>
                    <span class="fv" [class.danger]="effectiveBalance(p) > 0" [class.success]="effectiveBalance(p) === 0">
                      ₹{{ effectiveBalance(p) | number:'1.0-0' }}
                      <span *ngIf="effectiveBalance(p) === 0" class="cleared-tag">✓ Cleared</span>
                    </span>
                  </div>
                  <div class="finance-row" *ngIf="p.paymentDate">
                    <span class="fl">Payment Date</span>
                    <span class="fv">{{ p.paymentDate | date:'dd MMM yyyy' }}</span>
                  </div>
                  <div class="finance-row" *ngIf="p.paymentRemarks">
                    <span class="fl">Payment Note</span>
                    <span class="fv">{{ p.paymentRemarks }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Work Stages -->
            <div class="stages-section">
              <div class="detail-title">WORK STAGES</div>
              <div class="stages-grid">
                <div *ngFor="let s of p.workStages" class="stage-row" [class.stage-done]="s.isCompleted">
                  <label class="stage-check-wrap">
                    <input type="checkbox" [checked]="s.isCompleted" (change)="toggleStage(p, s, $event)" />
                    <span class="stage-checkmark"></span>
                  </label>
                  <div class="stage-info">
                    <span class="stage-label" [class.done]="s.isCompleted">{{ s.stageName }}</span>
                    <span class="stage-date" *ngIf="s.isCompleted && s.dateCompleted">{{ s.dateCompleted | date:'dd MMM yyyy' }}</span>
                  </div>
                  <input class="stage-note" [(ngModel)]="s.remarks" placeholder="Add note..." (blur)="saveStageRemarks(p, s)" />
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ── TAB 3: CLIENT PROFILE & NOTES ── -->
        <div *ngIf="activeTab === 'profile'" class="tab-pane">
          <div class="card" style="max-width:800px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
              <h3 style="font-size:1.1rem; font-weight:700;">Customer Information</h3>
              <button class="btn btn-secondary btn-sm" (click)="openEditCustomer()">✏️ Edit Profile</button>
            </div>
            <div class="form-grid form-grid-2">
              <div>
                <div class="info-label">Full Name</div>
                <div style="font-weight:700; font-size:1.05rem; margin-top:2px;">{{ customer.name }}</div>
              </div>
              <div>
                <div class="info-label">Primary Phone</div>
                <div style="font-weight:600; margin-top:2px;">
                  <a *ngIf="customer.contactNumber" [href]="'tel:' + customer.contactNumber" style="color:var(--primary); text-decoration:none;">
                    📞 {{ customer.contactNumber }}
                  </a>
                  <span *ngIf="!customer.contactNumber" style="color:var(--text-4);">Not provided</span>
                </div>
              </div>
              <div>
                <div class="info-label">Alternate Phone / WhatsApp</div>
                <div style="font-weight:600; margin-top:2px;">
                  <span *ngIf="customer.alternateContactNumber">📱 {{ customer.alternateContactNumber }}</span>
                  <span *ngIf="!customer.alternateContactNumber" style="color:var(--text-4);">None</span>
                </div>
              </div>
              <div>
                <div class="info-label">Site Address</div>
                <div style="margin-top:2px;">
                  <span *ngIf="customer.address">📍 {{ customer.address }}</span>
                  <span *ngIf="!customer.address" style="color:var(--text-4);">No address entered</span>
                </div>
              </div>
            </div>
            <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--border-lt);">
              <div class="info-label">Customer Notes &amp; Preferences</div>
              <p style="margin-top:6px; color:var(--text-2); font-size:0.9rem; line-height:1.6; white-space:pre-wrap;">
                {{ customer.notes || 'No special notes or preferences recorded for this customer.' }}
              </p>
            </div>
          </div>
        </div>
      </main>
      <main class="main-content" *ngIf="!customer">
        <div class="empty-card"><div class="empty-icon">⏳</div><div>Loading customer...</div></div>
      </main>
    </div>

    <!-- Product Modal -->
    <div class="modal-overlay" *ngIf="showProductModal" (click)="closeModal($event)" (keydown.enter)="saveProduct()">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingProduct ? 'Edit Product' : 'Add Product' }}</h2>
          <button class="btn-close" (click)="showProductModal=false">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-section-title">SELECT QUOTATION (OPTIONAL)</div>
          <div class="form-grid form-grid-1">
            <div class="form-group">
              <label>Assign to Quotation</label>
              <select class="form-control" [(ngModel)]="selectedQuotation">
                <option [ngValue]="null">— No Quotation (Direct Product) —</option>
                <option *ngFor="let q of customer?.quotations ?? []" [ngValue]="q">{{ q.title }} ({{ q.products.length }} items)</option>
              </select>
            </div>
          </div>

          <div class="modal-section-divider"></div>
          <div class="modal-section-title">PRODUCT INFO</div>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label>Product Name *</label>
              <input class="form-control" [(ngModel)]="pForm.productName" placeholder="e.g. Curtain Set" />
            </div>
            <div class="form-group">
              <label>Serial Number</label>
              <input class="form-control" [(ngModel)]="pForm.serialNumber" placeholder="S/N" />
            </div>
            <div class="form-group">
              <label>Company / Brand</label>
              <input class="form-control" [(ngModel)]="pForm.company" placeholder="Brand name" />
            </div>
            <div class="form-group">
              <label>Product Type *</label>
              <select class="form-control" [(ngModel)]="pForm.productType">
                <option value="">Select type</option>
                <option value="Curtain Fabric">Curtain Fabric</option>
                <option value="Blinds">Blinds</option>
                <option value="Wallpaper">Wallpaper</option>
                <option value="Flooring">Flooring</option>
                <option value="Sofa">Sofa</option>
                <option value="Furniture">Furniture</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Quantity</label>
              <input class="form-control" type="number" [(ngModel)]="pForm.quantity" min="1" />
            </div>
            <div class="form-group">
              <label>Colour</label>
              <input class="form-control" [(ngModel)]="pForm.colour" placeholder="Colour" />
            </div>
            <div class="form-group">
              <label>Measurement / Size</label>
              <input class="form-control" [(ngModel)]="pForm.measurement" placeholder="e.g. 2.5m x 1.8m" />
            </div>
            <div class="form-group">
              <label>Date Ordered</label>
              <input class="form-control" type="date" [(ngModel)]="pForm.dateOrdered" />
            </div>
            <div class="form-group">
              <label>Expected Delivery</label>
              <input class="form-control" type="date" [(ngModel)]="pForm.expectedDeliveryDate" />
            </div>
            <div class="form-group">
              <label>Internal Remarks</label>
              <input class="form-control" [(ngModel)]="pForm.internalRemarks" placeholder="Internal notes" />
            </div>
          </div>

          <div class="modal-section-divider"></div>
          <div class="modal-section-title">QUOTATION</div>
          <div class="form-grid form-grid-3">
            <div class="form-group">
              <label>Quotation Amount (₹)</label>
              <input class="form-control" type="number" [(ngModel)]="pForm.quotationAmount" min="0" />
            </div>
            <div class="form-group">
              <label>Discount Amount (₹)</label>
              <input class="form-control" type="number" [(ngModel)]="pForm.discountAmount" min="0" />
            </div>
            <div class="form-group">
              <label>Final Amount (₹)</label>
              <input class="form-control" [value]="(pForm.quotationAmount - pForm.discountAmount) | number:'1.0-0'" readonly />
            </div>
            <div class="form-group">
              <label>Quotation Status</label>
              <select class="form-control" [(ngModel)]="pForm.quotationStatus">
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div class="modal-section-divider"></div>
          <div class="modal-section-title">PAYMENT</div>
          <div class="form-grid form-grid-3">
            <div class="form-group">
              <label>Advance Payment (₹)</label>
              <input class="form-control" type="number" [(ngModel)]="pForm.advancePayment" min="0" />
            </div>
            <div class="form-group">
              <label>Balance (₹)</label>
              <input class="form-control" [value]="pForm.paymentStatus === 'Full payment cleared' ? '0' : ((pForm.quotationAmount - pForm.discountAmount) - pForm.advancePayment) | number:'1.0-0'" readonly />
            </div>
            <div class="form-group">
              <label>Payment Status</label>
              <select class="form-control" [(ngModel)]="pForm.paymentStatus">
                <option value="Pending">Pending</option>
                <option value="Full payment cleared">Full payment cleared</option>
              </select>
            </div>
            <div class="form-group">
              <label>Payment Date</label>
              <input class="form-control" type="date" [(ngModel)]="pForm.paymentDate" />
            </div>
            <div class="form-group" style="grid-column:span 2;">
              <label>Payment Remarks</label>
              <input class="form-control" [(ngModel)]="pForm.paymentRemarks" placeholder="Payment notes" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showProductModal=false">Cancel</button>
          <button class="btn btn-primary" (click)="saveProduct()" [disabled]="saving">{{ saving ? 'Saving...' : 'Save Product' }}</button>
        </div>
      </div>
    </div>

    <!-- Quotation Modal -->
    <div class="modal-overlay" *ngIf="showQuotationModal" (click)="closeModal($event)" (keydown.enter)="saveQuotation()">
      <div class="modal" style="max-width:500px;">
        <div class="modal-header">
          <h2>{{ editingQuotation ? 'Edit Quotation' : 'Create New Quotation' }}</h2>
          <button class="btn-close" (click)="showQuotationModal=false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Quotation Number</label>
            <input class="form-control" [(ngModel)]="qForm.quotationNumber" placeholder="e.g. QT-202608-001" />
          </div>
          <div class="form-group">
            <label>Quotation Title / Reference *</label>
            <input class="form-control" [(ngModel)]="qForm.title" placeholder="e.g. Living Room & Master Bed, Curtain Project, etc." />
          </div>
          <div class="form-group">
            <label>Date</label>
            <input class="form-control" type="date" [(ngModel)]="qForm.createdAt" />
          </div>
          <div class="form-group">
            <label>Remarks</label>
            <textarea class="form-control" [(ngModel)]="qForm.remarks" placeholder="Any notes about this quotation..." style="min-height:80px; resize:vertical;"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showQuotationModal=false">Cancel</button>
          <button class="btn btn-primary" (click)="saveQuotation()" [disabled]="savingQuotation">{{ savingQuotation ? 'Saving...' : (editingQuotation ? 'Save Changes' : 'Create Quotation') }}</button>
        </div>
      </div>
    </div>

    <!-- Edit Customer Modal -->
    <div class="modal-overlay" *ngIf="showCustomerModal" (click)="closeModal($event)" (keydown.enter)="saveCustomer()">
      <div class="modal" style="max-width:560px;">
        <div class="modal-header">
          <h2>Edit Customer Profile</h2>
          <button class="btn-close" (click)="showCustomerModal=false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label>Customer Full Name <span style="color:#e11d48;">*</span></label>
              <input class="form-control" [(ngModel)]="cForm.name" placeholder="Full name" />
            </div>
            <div class="form-group">
              <label>Contact Number</label>
              <input class="form-control" [(ngModel)]="cForm.contactNumber" placeholder="Primary phone" />
            </div>
            <div class="form-group">
              <label>Alternate Contact</label>
              <input class="form-control" [(ngModel)]="cForm.alternateContactNumber" placeholder="WhatsApp / alternate" />
            </div>
            <div class="form-group">
              <label>Site Address / Location</label>
              <input class="form-control" [(ngModel)]="cForm.address" placeholder="Flat / Building / Area" />
            </div>
          </div>
          <div class="form-group">
            <label>Notes / Site Remarks</label>
            <textarea class="form-control" [(ngModel)]="cForm.notes" rows="3" placeholder="Preferences, site visit notes..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showCustomerModal=false">Cancel</button>
          <button class="btn btn-primary" (click)="saveCustomer()" [disabled]="savingCustomer || !cForm.name.trim()">
            {{ savingCustomer ? 'Saving...' : 'Update Customer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- PREVIEW MODAL: VISUAL QUOTATION PREVIEW -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div class="modal-overlay" *ngIf="previewingQuotation" (click)="closeQuotationPreview()">
      <div class="modal-card modal-preview" (click)="$event.stopPropagation()">
        
        <div class="modal-header-preview">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:1.3rem;">👁️</span>
            <div>
              <h2 style="font-size:1.05rem; font-weight:800; color:#0f172a; margin:0;">Quotation Preview</h2>
              <span style="font-size:0.75rem; color:#64748b;">
                {{ previewingQuotation.quotationNumber || 'QT' }} · {{ customer?.name }}
              </span>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <div class="preview-zoom-bar">
              <button type="button" class="btn-zoom" (click)="setPreviewZoom(previewZoom - 0.1)" [disabled]="previewZoom <= 0.6" title="Zoom out">−</button>
              <span class="zoom-level">{{ (previewZoom * 100) | number:'1.0-0' }}%</span>
              <button type="button" class="btn-zoom" (click)="setPreviewZoom(previewZoom + 0.1)" [disabled]="previewZoom >= 1.4" title="Zoom in">+</button>
              <button type="button" class="btn-zoom-reset" (click)="resetPreviewZoom()" title="Reset zoom to 100%">100%</button>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" (click)="downloadQuotationPdf(previewingQuotation, $event)">
              <span>📥</span> <span>Download PDF</span>
            </button>
            <button type="button" class="btn btn-whatsapp btn-sm" (click)="shareQuotationWhatsApp(previewingQuotation, $event)">
              <span>💬</span> <span>Share via WhatsApp</span>
            </button>
            <button type="button" class="btn-close" (click)="closeQuotationPreview()" title="Close (Esc)">✕</button>
          </div>
        </div>

        <div class="preview-scroll-body">
          <div class="preview-paper-container" [style.transform]="'scale(' + previewZoom + ')'">
            <div [innerHTML]="previewHtml"></div>
          </div>
        </div>

        <div class="modal-footer" style="justify-content:space-between; align-items:center;">
          <span style="font-size:0.82rem; color:#475569;">
            Total: <strong style="color:#0f172a; font-size:0.95rem;">₹{{ (previewingQuotation.finalAmount || previewingQuotation.totalFinalAmount) | number:'1.2-2' }}</strong>
          </span>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-secondary" (click)="closeQuotationPreview()">Close</button>
            <button type="button" class="btn btn-secondary" (click)="downloadQuotationPdf(previewingQuotation, $event)">
              <span>📥</span> <span>Download PDF</span>
            </button>
            <button type="button" class="btn btn-whatsapp" (click)="shareQuotationWhatsApp(previewingQuotation, $event)">
              <span>💬</span> <span>Share PDF via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-preview {
      max-width: 860px;
      width: 95%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .preview-scroll-body {
      background: #f1f5f9;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      justify-content: center;
    }
    .preview-paper-container {
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
      width: 100%;
      max-width: 800px;
    }
    .cd-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
    .cd-header-actions { display:flex; gap:10px; align-items:center; }
    .cd-quote-actions { display:flex; gap:8px; align-items:center; }
    .back-link {
      font-size:0.8rem; color:#64748b; text-decoration:none; display:inline-flex;
      align-items:center; gap:6px; margin-bottom:8px; font-weight:600;
      padding:4px 10px; background:#ffffff; border:1px solid #e2e8f0; border-radius:9999px;
      transition:all 0.15s;
    }
    .back-link:hover { color:#0f172a; border-color:#cbd5e1; background:#f8fafc; }
    .cd-profile-row { display:flex; align-items:center; gap:14px; }
    .cd-avatar {
      width:48px; height:48px; border-radius:14px;
      background:linear-gradient(135deg, #334155 0%, #0f172a 100%);
      color:#fff; display:flex; align-items:center; justify-content:center;
      font-size:1.3rem; font-weight:800; flex-shrink:0;
      box-shadow:0 2px 8px rgba(15,23,42,0.15);
    }
    .cd-name { font-size:1.75rem; font-weight:800; color:#0f172a; letter-spacing:-0.025em; line-height:1.2; }
    .cd-contact { display:flex; align-items:center; gap:8px; margin-top:4px; font-size:0.82rem; color:#64748b; flex-wrap:wrap; }
    .cd-phone-link { color:#0284c7; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px; }
    .cd-phone-link:hover { text-decoration:underline; }
    .cd-alt-phone { color:#94a3b8; }
    .cd-addr { color:#475569; }

    .info-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px 24px; margin-bottom:28px; box-shadow:0 1px 3px rgba(15,23,42,0.04); }
    .info-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:16px; }
    .info-item { display:flex; flex-direction:column; }
    .info-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; margin-bottom:4px; }
    .info-value { font-size:0.9rem; color:#0f172a; }
    .italic-notes { font-style:italic; color:#64748b; font-size:0.85rem; }
    .metric-box {
      background:#f8fafc; border:1px solid #f1f5f9; border-radius:10px; padding:10px 14px;
    }
    .metric-box.green-box { background:#ecfdf5; border-color:#a7f3d0; }
    .metric-box.danger-box { background:#fff1f2; border-color:#fecdd3; }
    .metric-box.clear-box { background:#ecfdf5; border-color:#a7f3d0; }
    .info-value.bold { font-weight:800; font-size:1.15rem; color:#0f172a; }
    .info-value.success { color:#059669; font-weight:800; font-size:1.15rem; }
    .info-value.danger { color:#e11d48; font-weight:800; font-size:1.15rem; }

    @media(max-width:1024px) {
      .info-grid { grid-template-columns:repeat(3, 1fr); }
    }
    @media(max-width:640px) {
      .info-grid { grid-template-columns:1fr; }
      .cd-header { flex-direction:column; }
    }
    
    .q-windows-block { margin-top:8px; margin-bottom:14px; }
    .q-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:12px; }
    .q-kpi-card { background:#fafafa; border:1px solid #e4e4e7; border-radius:8px; padding:10px 14px; display:flex; flex-direction:column; }
    .q-kpi-val { font-size:1.15rem; font-weight:800; color:#111118; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .unit-xs { font-size:0.75rem; font-weight:600; color:#71717a; font-family:inherit; }
    .q-kpi-lbl { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#71717a; margin-top:2px; }
    .q-kpi-card.highlight-curtain { background:#f0fdf4; border-color:#86efac; }
    .q-kpi-card.highlight-double { background:#f5f3ff; border-color:#c4b5fd; }
    .q-kpi-card.highlight-blinds { background:#eff6ff; border-color:#93c5fd; }
    .q-kpi-card.highlight-wallpaper { background:#fffbeb; border-color:#fcd34d; }
    .sub-split-foot { font-size:0.75rem; font-weight:600; color:#16a34a; margin-top:2px; font-family:inherit; }
    .q-win-table-wrap { margin-top:6px; border:1px solid #e4e4e7; border-radius:8px; background:#fff; overflow:hidden; }
    .q-win-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
    .q-win-table th { padding:8px 12px; font-size:0.68rem; background:#f9f9fb; }
    .q-win-table td { padding:8px 12px; border-bottom:1px solid #f0f0f2; }
    .calc-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; margin-top:14px; flex-wrap:wrap; }
    .room-hdr-row td { background:#f4f4f5; padding:8px 12px; font-weight:700; border-top:1px solid #e4e4e7; border-bottom:1px solid #e4e4e7; }
    .room-hdr-name { font-size:0.85rem; color:#18181b; }
    .room-hdr-count { font-size:0.72rem; color:#71717a; margin-left:6px; font-weight:600; }
    .indent-cell { padding-left:22px !important; font-size:0.75rem; }
    .room-subtotal-table-row td { background:#fafafa; border-bottom:1px solid #e4e4e7; padding:7px 12px; font-size:0.8rem; }
    .win-type-pill { display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; font-weight:600; padding:2px 6px; border-radius:4px; }
    .type-curtain { background:#f4f4f5; color:#18181b; }
    .type-blind { background:#e0f2fe; color:#0369a1; }
    .type-wallpaper { background:#fef3c7; color:#92400e; }
    .badge-panel { background:#111118; color:#fff; font-weight:700; font-size:0.75rem; padding:1px 6px; border-radius:3px; }
    .tfoot-summary-row td { background:#fafafa; border-top:1px solid #e4e4e7; padding:8px 12px; }
    .bold-foot { font-weight:700; font-size:0.82rem; color:#111118; }
    .green-text { color:#16a34a; }
    .purple-text { color:#7c3aed; }
    .blue-text { color:#0284c7; }
    .orange-text { color:#ea580c; }
    .double-curtain-badge { display:inline-block; background:#dcfce7; color:#166534; font-size:0.65rem; font-weight:700; padding:1px 5px; border-radius:3px; margin-left:6px; }
    .sheer-curtain-badge { display:inline-block; background:#ede9fe; color:#6d28d9; font-size:0.65rem; font-weight:700; padding:1px 5px; border-radius:3px; margin-left:6px; }
    .type-sheer { background:#f5f3ff; color:#6d28d9; border:1px dashed #c4b5fd; }
    .main-label { font-size:0.65rem; font-weight:600; opacity:0.8; }
    .sheer-label { opacity:0.85; border-style:dashed !important; }
    .sheer-row { background:#fafafa; opacity:0.85; }
    .sheer-row td { border-bottom:1px dashed #e4e4e7; padding:6px 12px; }
    .double-total-row td { background:#f0fdf4; font-size:0.78rem; padding:4px 12px; border-bottom:1px solid #bbf7d0; }
    .italic { font-style:italic; }

    .q-products-list { margin-top:8px; }
    .q-product-card { border:1px solid #f0f0f0; border-radius:8px; padding:12px 14px; margin-bottom:8px; background:#fff; }
    .q-product-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:4px; }
    .q-product-info { flex:1; min-width:120px; }
    .q-product-name { font-size:0.88rem; font-weight:600; color:#1a1a1a; display:block; }
    .q-product-meta { font-size:0.75rem; color:#aaa; }
    .q-product-finance { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .q-product-amount { font-size:0.88rem; font-weight:700; color:#333; }
    .q-empty { font-size:0.82rem; color:#aaa; margin-top:10px; }
    .btn-link { background:none; border:none; color:#555; cursor:pointer; font-size:0.82rem; text-decoration:underline; padding:0; }
    .sum-item { display:flex; flex-direction:column; gap:2px; }
    .sum-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; color:#aaa; }
    .sum-value { font-size:0.9rem; font-weight:700; color:#333; }
    .sum-value.success { color:#2e7d32; }
    .sum-value.danger { color:#c62828; }
    .quotation-remarks { font-size:0.8rem; color:#555; }
    .remarks-label { font-weight:600; }
    .remarks-text { color:#888; }
    .quotation-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 22px;
      margin-bottom: 14px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border-left: 5px solid #cbd5e1;
    }
    .quotation-card:hover {
      box-shadow: 0 10px 26px -4px rgba(15, 23, 42, 0.09);
      transform: translateY(-2px);
    }
    .quotation-card.quote-approved { border-left-color: #10b981; }
    .quotation-card.quote-pending  { border-left-color: #f59e0b; }
    .quotation-card.quote-rejected { border-left-color: #ef4444; }
    .quotation-card.selected {
      border-color: #818cf8;
      box-shadow: 0 10px 25px -4px rgba(99, 102, 241, 0.12);
    }
    .quote-num-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 9px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #334155;
      font-size: 0.78rem;
      font-weight: 700;
      transition: all 0.15s;
      cursor: pointer;
    }
    .quote-num-pill:hover {
      background: #e0e7ff;
      color: #4338ca;
    }
    .quotation-actions { display:flex; gap:6px; align-items:center; }

    .empty-card { background:#fff; border:1px solid #e8e8e8; border-radius:12px; padding:48px; text-align:center; color:#aaa; }
    .empty-icon { font-size:2rem; margin-bottom:8px; }

    .product-card { background:#fff; border:1px solid #e8e8e8; border-radius:12px; padding:20px 24px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }

    .product-top { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:16px; }
    .product-name { font-size:1.05rem; font-weight:700; color:#1a1a1a; }
    .product-meta { font-size:0.8rem; color:#999; margin-top:3px; display:flex; gap:4px; flex-wrap:wrap; }
    .meta-dot { color:#ddd; }
    .product-badges { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

    .progress-section { margin-bottom:16px; }
    .progress-info { display:flex; justify-content:space-between; font-size:0.75rem; color:#aaa; margin-bottom:5px; }
    .progress-count { font-weight:600; }
    .progress-track { background:#f0f0f0; border-radius:99px; height:6px; overflow:hidden; }
    .progress-fill { height:100%; background:linear-gradient(90deg,#555,#333); border-radius:99px; transition:width 0.4s ease; }

    .product-body { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #f5f5f5; }
    .detail-title { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#bbb; margin-bottom:10px; }
    .detail-grid { display:flex; flex-direction:column; gap:6px; }
    .detail-row { display:flex; justify-content:space-between; font-size:0.85rem; }
    .dl { color:#aaa; }
    .dv { color:#333; font-weight:500; text-align:right; }

    .finance-rows { display:flex; flex-direction:column; gap:6px; }
    .finance-row { display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; }
    .fl { color:#aaa; }
    .fv { font-weight:600; color:#333; }
    .fv.discount { color:#b45309; }
    .fv.final { color:#1a1a1a; font-size:1rem; }
    .fv.success { color:#2e7d32; }
    .fv.danger { color:#c62828; }
    .finance-divider { border-top:1px dashed #eee; margin:6px 0; }
    .final-row { padding:6px 0; border-top:1px solid #eee; border-bottom:1px solid #eee; margin:2px 0; }
    .cleared-tag { background:#e8f5e9; color:#2e7d32; font-size:0.7rem; padding:2px 6px; border-radius:99px; margin-left:6px; }

    .stages-section { }
    .stages-grid { display:flex; flex-direction:column; gap:6px; }
    .stage-row { display:flex; align-items:center; gap:12px; padding:9px 12px; border:1px solid #f0f0f0; border-radius:8px; background:#fafafa; transition:background 0.15s; }
    .stage-row.stage-done { background:#f9fdf9; border-color:#e8f5e9; }
    .stage-check-wrap { position:relative; width:18px; height:18px; flex-shrink:0; }
    .stage-check-wrap input { position:absolute; opacity:0; width:100%; height:100%; cursor:pointer; margin:0; }
    .stage-checkmark { display:block; width:18px; height:18px; border:2px solid #ddd; border-radius:4px; background:#fff; transition:all 0.15s; }
    .stage-check-wrap input:checked ~ .stage-checkmark { background:#333; border-color:#333; }
    .stage-check-wrap input:checked ~ .stage-checkmark::after { content:'✓'; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:11px; font-weight:700; }
    .stage-info { flex:1; display:flex; align-items:center; gap:10px; }
    .stage-label { font-size:0.85rem; font-weight:500; color:#333; }
    .stage-label.done { color:#aaa; text-decoration:line-through; }
    .stage-date { font-size:0.72rem; color:#aaa; background:#f0f0f0; padding:2px 6px; border-radius:4px; }
    .stage-note { padding:5px 8px; border:1px solid #e8e8e8; border-radius:6px; font-size:0.78rem; width:160px; background:#fff; color:#555; }
    .stage-note:focus { outline:none; border-color:#bbb; }

    .modal-section-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#aaa; margin-bottom:14px; }
    .modal-section-divider { border:none; border-top:1px solid #f0f0f0; margin:20px 0; }

    @media(max-width:768px) {
      .info-grid { grid-template-columns:repeat(2,1fr); }
      .product-body { grid-template-columns:1fr; }
      .product-top { flex-direction:column; }
    }
    @media(max-width:480px) {
      .info-grid { grid-template-columns:1fr 1fr; }
    }
  `]
})
export class CustomerDetailComponent implements OnInit {
  customer: CustomerDetail | null = null;
  activeTab: 'quotations' | 'orders' | 'profile' = 'quotations';
  targetQuotationId: number | null = null;

  showProductModal = false; editingProduct: Product | null = null; saving = false;
  pForm: any = this.emptyForm();
  
  showQuotationModal = false; savingQuotation = false; editingQuotation: Quotation | null = null;
  qForm: any = this.emptyQuotationForm();
  selectedQuotation: Quotation | null = null;

  showCustomerModal = false;
  savingCustomer = false;
  cForm = { name: '', contactNumber: '', alternateContactNumber: '', address: '', notes: '' };

  previewingQuotation: any = null;
  previewHtml: SafeHtml = '';
  previewZoom = 1.0;

  constructor(
    private api: ApiService, 
    private route: ActivatedRoute, 
    private router: Router,
    private toast: ToastService,
    private pdfService: PdfService,
    private sanitizer: DomSanitizer
  ) {}

  getAvatarClass(name: string): string {
    const classes = ['avatar-emerald', 'avatar-indigo', 'avatar-violet', 'avatar-amber', 'avatar-rose', 'avatar-cyan', 'avatar-teal'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return classes[Math.abs(hash) % classes.length];
  }

  getWhatsAppUrl(phone?: string, name?: string): string {
    if (!phone) return '#';
    const clean = phone.replace(/[^0-9]/g, '');
    const num = clean.length === 10 ? '91' + clean : clean;
    const text = encodeURIComponent(`Hello ${name || 'Customer'}, greetings from Pukale Furnishing Centre! We are following up regarding your interior furnishing requirements.`);
    return `https://wa.me/${num}?text=${text}`;
  }

  copyPhone(phone: string, name: string) {
    if (navigator.clipboard) navigator.clipboard.writeText(phone);
    this.toast.success(`Copied ${name}'s contact: ${phone}`);
  }

  copyQuotationNumber(num: string, e: Event) {
    e.stopPropagation();
    if (navigator.clipboard) navigator.clipboard.writeText(num);
    this.toast.success(`Copied quotation reference: ${num}`);
  }

  async buildPdfDataForQuotation(q: Quotation): Promise<QuotationPdfData> {
    let biz: any = null;
    let bank: any = null;
    try {
      biz = await this.api.getBusinessProfile().toPromise();
      bank = await this.api.getBankDetails().toPromise();
    } catch (err) {}

    return {
      quotation: q,
      customer: this.customer || {
        name: q.customerName || 'Valued Customer',
        contactNumber: q.customerContactNumber,
        address: q.customerAddress
      },
      business: biz || undefined,
      bank: bank || undefined
    };
  }

  async openQuotationPreview(q: Quotation, e?: Event) {
    if (e) e.stopPropagation();
    try {
      this.previewingQuotation = q;
      this.previewZoom = 1.0;
      const pdfData = await this.buildPdfDataForQuotation(q);
      const rawHtml = this.pdfService.getPreviewHtmlWithStyles(pdfData);
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    } catch (err) {
      this.toast.error('Failed to generate preview');
    }
  }

  setPreviewZoom(z: number) {
    this.previewZoom = Math.min(Math.max(Number(z.toFixed(1)), 0.6), 1.4);
  }

  resetPreviewZoom() {
    this.previewZoom = 1.0;
  }

  closeQuotationPreview() {
    this.previewingQuotation = null;
    this.previewHtml = '';
  }

  async downloadQuotationPdf(q: Quotation, e: Event) {
    e.stopPropagation();
    try {
      this.toast.info('Generating PDF document...');
      const pdfData = await this.buildPdfDataForQuotation(q);
      const filename = await this.pdfService.downloadPdf(pdfData);
      this.toast.success(`Downloaded "${filename}" directly to your device!`);
    } catch (err) {
      this.toast.error('Failed to generate PDF. Please try again.');
    }
  }

  async shareQuotationWhatsApp(q: Quotation, e: Event) {
    e.stopPropagation();
    try {
      this.toast.info('Preparing PDF document for WhatsApp...');
      const pdfData = await this.buildPdfDataForQuotation(q);
      const res = await this.pdfService.shareViaWhatsApp(pdfData);
      if (res.sharedViaNative) {
        this.toast.success('Sharing PDF document directly to WhatsApp...');
      } else {
        this.toast.success('PDF downloaded to device & WhatsApp opened!');
      }
    } catch (err) {
      this.toast.error('Could not complete WhatsApp sharing.');
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.targetQuotationId = params['quotationId'] ? +params['quotationId'] : null;
    });
    this.load();
  }

  load() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.api.getCustomer(id).subscribe(c => {
      this.customer = c;
      if (this.targetQuotationId) {
        this.activeTab = 'quotations';
        const found = c.quotations.find(q => q.id === this.targetQuotationId);
        if (found) {
          this.selectedQuotation = found;
          setTimeout(() => {
            const el = document.getElementById('quotation-' + this.targetQuotationId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      }
    });
  }

  openEditCustomer() {
    if (!this.customer) return;
    this.cForm = {
      name: this.customer.name,
      contactNumber: this.customer.contactNumber,
      alternateContactNumber: this.customer.alternateContactNumber,
      address: this.customer.address,
      notes: this.customer.notes
    };
    this.showCustomerModal = true;
  }

  saveCustomer() {
    if (!this.customer || !this.cForm.name.trim()) return;
    this.savingCustomer = true;
    this.api.updateCustomer(this.customer.id, this.cForm).subscribe({
      next: () => {
        this.showCustomerModal = false;
        this.savingCustomer = false;
        this.load();
      },
      error: () => this.savingCustomer = false
    });
  }

  // Balance is 0 when payment is fully cleared
  effectiveBalance(p: Product): number {
    if (p.paymentStatus === 'Full payment cleared') return 0;
    return Number(p.balanceAmount ?? 0);
  }

  totalFinal(): number { return this.customer?.products.filter(p => p.quotationStatus === 'Approved').reduce((s, p) => s + p.finalAmount, 0) ?? 0; }
  totalCleared(): number { return this.customer?.products.filter(p => p.quotationStatus === 'Approved' && p.paymentStatus === 'Full payment cleared').reduce((s, p) => s + p.finalAmount, 0) ?? 0; }
  totalOutstanding(): number { return this.customer?.products.filter(p => p.quotationStatus === 'Approved').reduce((s, p) => s + this.effectiveBalance(p), 0) ?? 0; }

  countRooms(q: Quotation): number {
    return new Set(q.windows?.map(w => (w.location || 'Unassigned').trim() || 'Unassigned')).size;
  }

  countWindowsExcludingWallpaper(q: Quotation): number {
    return q.windows?.filter(w => w.treatmentType !== 'Wallpaper').length ?? 0;
  }

  countSingleCurtainWindows(q: Quotation): number {
    return q.windows?.filter(w => w.treatmentType === 'Curtain' && !w.isDoubleCurtain).length ?? 0;
  }

  countSingleMainCurtainWindows(q: Quotation): number {
    return q.windows?.filter(w => w.treatmentType === 'Curtain' && !w.isDoubleCurtain && w.curtainType !== 'Sheer').length ?? 0;
  }

  countSingleSheerCurtainWindows(q: Quotation): number {
    return q.windows?.filter(w => w.treatmentType === 'Curtain' && !w.isDoubleCurtain && w.curtainType === 'Sheer').length ?? 0;
  }

  countDoubleCurtainWindows(q: Quotation): number {
    return q.windows?.filter(w => w.treatmentType === 'Curtain' && !!w.isDoubleCurtain).length ?? 0;
  }

  countCurtainWindows(q: Quotation): number {
    return q.windows?.filter(w => w.treatmentType === 'Curtain').length ?? 0;
  }

  countBlindWindows(q: Quotation): number {
    return q.windows?.filter(w => isBlind(w.treatmentType)).length ?? 0;
  }

  countRomanBlindWindows(q: Quotation): number {
    return q.windows?.filter(w => isRomanBlind(w.treatmentType)).length ?? 0;
  }

  countOtherBlindWindows(q: Quotation): number {
    return q.windows?.filter(w => isOtherBlind(w.treatmentType)).length ?? 0;
  }

  mainCurtainMeters(q: Quotation): number {
    return Math.round((q.windows?.filter(w => w.treatmentType === 'Curtain')
      .reduce((s, w) => s + (w.isDoubleCurtain ? this.getMainRequirement(w) : (w.curtainType === 'Sheer' ? 0 : (w.requirement ?? 0))), 0) ?? 0) * 100) / 100;
  }

  sheerCurtainMeters(q: Quotation): number {
    return Math.round((q.windows?.filter(w => w.treatmentType === 'Curtain')
      .reduce((s, w) => s + (w.isDoubleCurtain ? this.getSheerRequirement(w) : (w.curtainType === 'Sheer' ? (w.requirement ?? this.getSheerRequirement(w)) : 0)), 0) ?? 0) * 100) / 100;
  }

  roomWindowCount(group: RoomCalculationGroup): number {
    return group.windows.filter(w => w.treatmentType !== 'Wallpaper').length;
  }

  getMainRequirement(w: QuotationWindow): number {
    if (w.treatmentType !== 'Curtain') return 0;
    if (!w.isDoubleCurtain && w.curtainType === 'Sheer') return 0;
    const h = Number(w.height || 0);
    const p = Number(w.panels || 1);
    if (h <= 0 || p <= 0) return 0;
    return Math.round(((h + 10) * p / 39) * 100) / 100;
  }

  getSheerRequirement(w: QuotationWindow): number {
    if (w.treatmentType !== 'Curtain') return 0;
    if (!w.isDoubleCurtain) {
      if (w.curtainType === 'Sheer') {
        const h = Number(w.height || 0);
        const p = Number(w.panels || 1);
        if (h <= 0 || p <= 0) return 0;
        return Math.round(((h + 10) * p / 39) * 100) / 100;
      }
      return 0;
    }
    const h = Number(w.sheerHeight ?? w.height ?? 0);
    let p = Number(w.sheerPanels ?? w.panels ?? 1);
    if (p <= 0) {
      const width = Number(w.sheerWidth ?? w.width ?? 0);
      p = width > 0 ? Math.ceil(width / 20) : 1;
    }
    if (h <= 0 || p <= 0) return 0;
    return Math.round(((h + 10) * p / 39) * 100) / 100;
  }

  getRoomGroups(q: Quotation): RoomCalculationGroup[] {
    const grouped = new Map<string, QuotationWindow[]>();

    for (const w of q.windows ?? []) {
      const roomName = (w.location || 'Unassigned').trim() || 'Unassigned';
      if (!grouped.has(roomName)) {
        grouped.set(roomName, []);
      }
      grouped.get(roomName)!.push(w);
    }

    return Array.from(grouped.entries()).map(([roomName, windows]) => {
      const totalCurtainMeters = Math.round(windows
        .filter(w => w.treatmentType === 'Curtain')
        .reduce((sum, w) => sum + (w.requirement ?? 0), 0) * 100) / 100;

      const totalRomanBlindsArea = Math.round(windows
        .filter(w => isRomanBlind(w.treatmentType))
        .reduce((sum, w) => sum + (w.requirement ?? 0), 0) * 100) / 100;

      const totalOtherBlindsArea = Math.round(windows
        .filter(w => isOtherBlind(w.treatmentType))
        .reduce((sum, w) => sum + (w.requirement ?? 0), 0) * 100) / 100;

      const totalBlindsArea = Math.round(windows
        .filter(w => isBlind(w.treatmentType))
        .reduce((sum, w) => sum + (w.requirement ?? 0), 0) * 100) / 100;

      const totalWallpaperArea = Math.round(windows
        .filter(w => w.treatmentType === 'Wallpaper')
        .reduce((sum, w) => sum + (w.requirement ?? 0), 0) * 100) / 100;

      return {
        roomName,
        windows,
        totalCurtainMeters,
        totalBlindsArea,
        totalRomanBlindsArea,
        totalOtherBlindsArea,
        totalWallpaperArea
      };
    });
  }

  curtainMeters(q: Quotation): number {
    return Math.round((q.windows?.filter(w => w.treatmentType === 'Curtain').reduce((s, w) => s + (w.requirement ?? 0), 0) ?? 0) * 100) / 100;
  }

  romanBlindsArea(q: Quotation): number {
    return Math.round((q.windows?.filter(w => isRomanBlind(w.treatmentType)).reduce((s, w) => s + (w.requirement ?? 0), 0) ?? 0) * 100) / 100;
  }

  otherBlindsArea(q: Quotation): number {
    return Math.round((q.windows?.filter(w => isOtherBlind(w.treatmentType)).reduce((s, w) => s + (w.requirement ?? 0), 0) ?? 0) * 100) / 100;
  }

  blindsArea(q: Quotation): number {
    return Math.round((q.windows?.filter(w => isBlind(w.treatmentType)).reduce((s, w) => s + (w.requirement ?? 0), 0) ?? 0) * 100) / 100;
  }

  wallpaperArea(q: Quotation): number {
    return Math.round((q.windows?.filter(w => w.treatmentType === 'Wallpaper').reduce((s, w) => s + (w.requirement ?? 0), 0) ?? 0) * 100) / 100;
  }

  totalCurtainPanels(q: Quotation): number {
    return q.windows?.filter(w => w.treatmentType === 'Curtain').reduce((s, w) => s + (w.panels ?? 0) + (w.isDoubleCurtain ? (w.sheerPanels ?? w.panels ?? 0) : 0), 0) ?? 0;
  }

  emptyForm() {
    return { productName: '', serialNumber: '', company: '', productType: '', quantity: 1, colour: '', measurement: '', dateOrdered: '', expectedDeliveryDate: '', internalRemarks: '', quotationAmount: 0, discountAmount: 0, quotationStatus: 'Pending', advancePayment: 0, paymentStatus: 'Pending', paymentDate: '', paymentRemarks: '' };
  }

  emptyQuotationForm() {
    return { quotationNumber: '', title: '', remarks: '', createdAt: new Date().toISOString().substring(0, 10) };
  }

  openCreateQuotation() {
    this.editingQuotation = null;
    this.qForm = this.emptyQuotationForm();
    this.api.getNextQuotationNumber().subscribe({
      next: res => { this.qForm.quotationNumber = res.quotationNumber; },
      error: () => {}
    });
    this.showQuotationModal = true;
  }

  openEditQuotation(q: Quotation) {
    this.editingQuotation = q;
    this.qForm = { quotationNumber: q.quotationNumber || '', title: q.title, remarks: q.remarks, createdAt: q.createdAt ? q.createdAt.substring(0, 10) : '' };
    this.showQuotationModal = true;
  }

  openAddProductToQuotation(q: Quotation) {
    this.editingProduct = null;
    this.pForm = this.emptyForm();
    this.selectedQuotation = q;
    this.showProductModal = true;
  }

  saveQuotation() {
    if (!this.qForm.title.trim()) return;
    this.savingQuotation = true;
    const payload = { customerId: this.customer!.id, quotationNumber: this.qForm.quotationNumber?.trim() || undefined, title: this.qForm.title, remarks: this.qForm.remarks, advancePayment: 0, advancePaymentDate: null, createdAt: this.qForm.createdAt || null };
    const obs = this.editingQuotation
      ? this.api.updateQuotation(this.editingQuotation.id, payload)
      : this.api.createQuotation(payload);
    obs.subscribe({
      next: (q: any) => {
        this.showQuotationModal = false;
        this.savingQuotation = false;
        if (!this.editingQuotation) this.selectedQuotation = q;
        this.editingQuotation = null;
        this.load();
      },
      error: () => this.savingQuotation = false
    });
  }

  deleteQuotation(q: Quotation) {
    if (!confirm(`Delete quotation "${q.title}"? (${q.products.length} products will become unattached)`)) return;
    this.api.deleteQuotation(q.id).subscribe(() => this.load());
  }

  directProducts() { return this.customer?.products.filter(p => !p.quotationId) ?? []; }

  openAddProduct() { this.editingProduct = null; this.pForm = this.emptyForm(); this.selectedQuotation = null; this.showProductModal = true; }
  openEditProduct(p: Product) {
    this.editingProduct = p;
    this.pForm = { productName: p.productName, serialNumber: p.serialNumber, company: p.company, productType: p.productType, quantity: p.quantity, colour: p.colour, measurement: p.measurement, dateOrdered: p.dateOrdered ? p.dateOrdered.substring(0, 10) : '', expectedDeliveryDate: p.expectedDeliveryDate ? p.expectedDeliveryDate.substring(0, 10) : '', internalRemarks: p.internalRemarks, quotationAmount: p.quotationAmount, discountAmount: p.discountAmount, quotationStatus: p.quotationStatus, advancePayment: p.advancePayment, paymentStatus: p.paymentStatus, paymentDate: p.paymentDate ? p.paymentDate.substring(0, 10) : '', paymentRemarks: p.paymentRemarks };
    this.showProductModal = true;
  }

  saveProduct() {
    if (!this.pForm.productName.trim() || !this.pForm.productType) return;
    this.saving = true;
    const payload = { ...this.pForm, customerId: this.customer!.id, quotationId: this.selectedQuotation?.id ?? null, dateOrdered: this.pForm.dateOrdered || null, expectedDeliveryDate: this.pForm.expectedDeliveryDate || null, paymentDate: this.pForm.paymentDate || null };
    const obs = this.editingProduct ? this.api.updateProduct(this.editingProduct.id, payload) : this.api.createProduct(payload);
    obs.subscribe({
      next: (savedProduct: any) => {
        this.showProductModal = false;
        this.saving = false;

        if (this.customer) {
          const normalizeProduct = (p: any) => ({
            ...p,
            finalAmount: Number(p.quotationAmount ?? 0) - Number(p.discountAmount ?? 0),
            balanceAmount: p.paymentStatus === 'Full payment cleared' ? 0 : (Number(p.quotationAmount ?? 0) - Number(p.discountAmount ?? 0) - Number(p.advancePayment ?? 0)),
            completedStages: p.workStages?.filter((s: any) => s.isCompleted).length ?? 0,
            totalStages: p.workStages?.length ?? 0
          });

          const merged = normalizeProduct(savedProduct || {
            ...payload,
            id: this.editingProduct?.id,
            customerId: this.customer.id,
            quotationId: this.selectedQuotation?.id ?? null,
            customerName: this.customer.name,
            serialNumber: this.pForm.serialNumber,
            company: this.pForm.company,
            productName: this.pForm.productName,
            quotationStatus: this.pForm.quotationStatus,
            paymentStatus: this.pForm.paymentStatus,
            paymentDate: this.pForm.paymentDate || null,
            paymentRemarks: this.pForm.paymentRemarks,
            advancePayment: this.pForm.advancePayment,
            quotationAmount: this.pForm.quotationAmount,
            discountAmount: this.pForm.discountAmount,
            workStages: this.editingProduct?.workStages ?? []
          });

          const updateProductInTree = (productList: Product[] = []) => {
            const index = productList.findIndex(p => p.id === merged.id);
            if (index >= 0) {
              productList[index] = { ...productList[index], ...merged };
              return true;
            }
            return false;
          };

          if (this.editingProduct) {
            const foundInDirect = updateProductInTree(this.customer.products);
            if (!foundInDirect) {
              for (const q of this.customer.quotations) {
                if (updateProductInTree(q.products)) break;
              }
            }
          } else if (merged.id != null) {
            this.customer.products = [merged, ...this.customer.products];
          }
        }

        this.load();
      },
      error: () => this.saving = false
    });
  }

  deleteProduct(p: Product) {
    if (!confirm(`Delete product "${p.productName}"?`)) return;
    this.api.deleteProduct(p.id).subscribe(() => this.load());
  }

  toggleStage(p: Product, s: WorkStage, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.api.updateStage(p.id, s.id, { isCompleted: checked, dateCompleted: checked ? new Date().toISOString() : null, remarks: s.remarks }).subscribe(() => this.load());
  }

  saveStageRemarks(p: Product, s: WorkStage) {
    this.api.updateStage(p.id, s.id, { isCompleted: s.isCompleted, dateCompleted: s.dateCompleted, remarks: s.remarks }).subscribe();
  }

  editQuotationCalculations(q: Quotation) {
    this.router.navigate(['/calculation'], { queryParams: { quotationId: q.id } });
  }

  closeModal(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showProductModal = false;
      this.showQuotationModal = false;
      this.showCustomerModal = false;
    }
  }
}
