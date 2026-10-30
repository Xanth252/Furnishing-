import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { PdfService } from '../../services/pdf.service';
import { Customer, Quotation, QuotationItem, SavedParticular, BusinessProfile, BankDetails } from '../../models/models';

interface EditableItem {
  id?: number;
  srNo: number;
  particular: string;
  description?: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  showSuggestions?: boolean;
}

@Component({
  selector: 'app-quotation-maker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  template: `
    <div class="page-wrapper">
      <app-header />
      <main class="main-content">

        <!-- Top Header Bar -->
        <div class="qm-top-header">
          <div>
            <div class="header-pretitle">Sales &amp; Estimations Engine</div>
            <h1 class="pg-title">Quotation Maker</h1>
            <p class="pg-sub">Create professional client quotations with instant calculations, combined quantity &amp; units, and direct WhatsApp sharing</p>
          </div>
          <div class="header-actions">
            <button type="button" class="btn btn-secondary" (click)="resetForm()">
              <span>↺</span> <span>New Draft</span>
            </button>
            <button type="button" class="btn btn-secondary" (click)="openBusinessModal()" title="Manage Business Details">
              <span>🏢</span> <span>Business Info</span>
            </button>
            <button type="button" class="btn btn-secondary" (click)="openPreviewModal()" [disabled]="items.length === 0" title="Preview styled quotation document">
              <span>👁️</span> <span>Preview</span>
            </button>
            <button type="button" class="btn btn-secondary" (click)="directDownloadPdf()" [disabled]="items.length === 0">
              <span>📥</span> <span>Download PDF</span>
            </button>
            <button type="button" class="btn btn-whatsapp" (click)="openShareModal()" [disabled]="items.length === 0">
              <span>💬</span> <span>Share via WhatsApp</span>
            </button>
            <button type="button" class="btn btn-primary" (click)="saveQuotation()" [disabled]="saving || items.length === 0">
              <span>💾</span> <span>{{ saving ? 'Saving...' : (quotationId ? 'Update Quotation' : 'Save Quotation') }}</span>
            </button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- SECTION 1: BUSINESS BANNER & QUOTATION HEADER -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="card biz-bar-card">
          <div class="biz-bar-left">
            <div class="biz-logo-avatar">
              <img *ngIf="business.logoUrl" [src]="business.logoUrl" alt="Logo" class="biz-avatar-img" />
              <span *ngIf="!business.logoUrl" class="biz-avatar-icon">🛋️</span>
            </div>
            <div>
              <div class="biz-name-row">
                <span class="biz-name-title">{{ business.firmName || 'PUKALE FURNISHING CENTRE' }}</span>
                <button type="button" class="edit-biz-link" (click)="openBusinessModal()">✏️ Edit Info</button>
              </div>
              <div class="biz-sub-info">
                <span>📍 {{ business.address || 'Commercial Complex' }}</span>
                <span>· 📞 {{ business.contactNumber }}</span>
                <span>· ✉️ {{ business.email }}</span>
              </div>
              <div class="biz-tax-row" *ngIf="business.gstNumber || business.panNumber">
                <span *ngIf="business.gstNumber" class="tax-tag">GST: {{ business.gstNumber }}</span>
                <span *ngIf="business.panNumber" class="tax-tag">PAN: {{ business.panNumber }}</span>
              </div>
            </div>
          </div>

          <div class="biz-bar-right">
            <div class="quote-meta-grid">
              <div class="form-group mb-0">
                <label class="meta-label">Quote Number</label>
                <div class="input-with-action">
                  <input 
                    type="text" 
                    class="form-control font-mono bold-text" 
                    [(ngModel)]="quotationNumber" 
                    placeholder="QT-202609-001" />
                  <button type="button" class="btn-icon" title="Regenerate number" (click)="fetchNextQuotationNumber()">↻</button>
                </div>
              </div>
              <div class="form-group mb-0">
                <label class="meta-label">Quotation Date</label>
                <input type="date" class="form-control" [(ngModel)]="quotationDate" />
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- SECTION 2: CUSTOMER DETAILS (EXISTING / NEW) -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="step-card">
          <div class="step-header">
            <div class="step-indicator">
              <span class="step-num">1</span>
              <div>
                <h2 class="step-title">Customer Details</h2>
                <p class="step-desc">Select an existing client or enter new customer details to automatically save for future quotations</p>
              </div>
            </div>
            <div class="toggle-tabs">
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="custMode === 'existing'" 
                (click)="custMode = 'existing'">
                🔍 Select Existing Customer
              </button>
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="custMode === 'new'" 
                (click)="custMode = 'new'">
                ➕ Add New Customer
              </button>
            </div>
          </div>

          <!-- Existing Customer Mode -->
          <div *ngIf="custMode === 'existing'" class="existing-cust-section">
            <div class="form-group search-box mb-0">
              <label>Search Client Name or Contact Number</label>
              <div class="search-input-wrap">
                <span class="search-icon">🔍</span>
                <input 
                  type="text" 
                  class="form-control search-input" 
                  [(ngModel)]="searchCustQuery" 
                  (input)="filterCustomers()" 
                  placeholder="Type to search saved customers..." />
                <button 
                  *ngIf="searchCustQuery" 
                  type="button" 
                  class="clear-btn" 
                  (click)="searchCustQuery = ''; filterCustomers()">✕</button>
              </div>
            </div>

            <!-- Customer Picked Banner -->
            <div *ngIf="selectedCustomer" class="selected-cust-banner">
              <div class="cust-banner-left">
                <div class="cust-avatar-circle" [ngClass]="getAvatarClass(selectedCustomer.name)">
                  {{ selectedCustomer.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="cust-banner-name">
                    <strong>{{ selectedCustomer.name }}</strong>
                    <span class="badge-cust-selected">✓ Selected Customer</span>
                  </div>
                  <div class="cust-banner-sub">
                    <span *ngIf="selectedCustomer.contactNumber">📞 {{ selectedCustomer.contactNumber }}</span>
                    <span *ngIf="selectedCustomer.alternateContactNumber"> · Alt: {{ selectedCustomer.alternateContactNumber }}</span>
                    <span *ngIf="selectedCustomer.address"> · 📍 {{ selectedCustomer.address }}</span>
                  </div>
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" (click)="clearSelectedCustomer()">Switch Customer</button>
            </div>

            <!-- Customer Search Results Grid -->
            <div class="cust-results-grid" *ngIf="!selectedCustomer && filteredCustomers.length > 0">
              <div 
                *ngFor="let c of filteredCustomers" 
                class="cust-result-card" 
                (click)="selectCustomer(c)">
                <div class="cust-avatar-circle" [ngClass]="getAvatarClass(c.name)">{{ c.name.charAt(0).toUpperCase() }}</div>
                <div class="cust-result-meta">
                  <div class="cust-res-name">{{ c.name }}</div>
                  <div class="cust-res-phone" *ngIf="c.contactNumber">📞 {{ c.contactNumber }}</div>
                  <div class="cust-res-addr" *ngIf="c.address">📍 {{ c.address }}</div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm">Select →</button>
              </div>
            </div>

            <div *ngIf="!selectedCustomer && filteredCustomers.length === 0" class="no-results-box">
              <span>No customers found matching "{{ searchCustQuery }}".</span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="custMode = 'new'">+ Add As New Customer</button>
            </div>
          </div>

          <!-- New Customer Mode -->
          <div *ngIf="custMode === 'new'" class="new-cust-form">
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label>Customer Name <span class="required-star">*</span></label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="newCust.name" 
                  placeholder="e.g. Rajesh Patil" />
              </div>
              <div class="form-group">
                <label>Contact Number</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="newCust.contactNumber" 
                  placeholder="e.g. 9876543210" />
              </div>
              <div class="form-group">
                <label>Alternate Number</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="newCust.alternateContactNumber" 
                  placeholder="Optional phone" />
              </div>
            </div>
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label>Site Address / Location</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="newCust.address" 
                  placeholder="Delivery or Installation site address" />
              </div>
              <div class="form-group">
                <label>Quotation Title / Subject</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="quotationTitle" 
                  placeholder="e.g. 3BHK Curtains & Blinds Proposal" />
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- SECTION 3: QUOTATION ITEMS & PARTICULARS TABLE -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="step-card">
          <div class="step-header">
            <div class="step-indicator">
              <span class="step-num">2</span>
              <div>
                <h2 class="step-title">Quotation Items &amp; Particulars</h2>
                <p class="step-desc">Add line items, select/enter particulars with units (e.g. <strong>92 (mtr)</strong>), and reorder easily</p>
              </div>
            </div>
            <div class="header-table-actions">
              <button type="button" class="btn btn-primary btn-sm" (click)="addItem()">
                <span>+</span> <span>Add Line Item</span>
              </button>
            </div>
          </div>

          <!-- Items Table -->
          <div class="table-wrap">
            <table class="items-table-edit">
              <thead>
                <tr>
                  <th style="width: 50px; text-align:center;">Sr.</th>
                  <th>Particulars / Item Description</th>
                  <th style="width: 110px; text-align:right;">Quantity</th>
                  <th style="width: 110px;">Unit</th>
                  <th style="width: 140px; text-align:center;">Display (Qty+Unit)</th>
                  <th style="width: 120px; text-align:right;">Rate (₹)</th>
                  <th style="width: 130px; text-align:right;">Total (₹)</th>
                  <th style="width: 120px; text-align:center;">Reorder &amp; Delete</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of items; let idx = index; let isFirst = first; let isLast = last" class="item-row">
                  
                  <!-- Sr. No -->
                  <td class="text-center font-mono sr-cell">
                    <span class="sr-badge">{{ item.srNo }}</span>
                  </td>

                  <!-- Particulars with Autocomplete Suggestion Dropdown & Product Description -->
                  <td class="particular-cell">
                    <div class="particular-input-wrap">
                      <input 
                        type="text" 
                        class="form-control particular-input" 
                        [(ngModel)]="item.particular" 
                        (focus)="item.showSuggestions = true"
                        (input)="onParticularInput(item)"
                        placeholder="Enter item name (e.g. Curtain Fabric, Track Rail)..." />
                      
                      <!-- Autocomplete Suggestions Menu -->
                      <div 
                        class="autocomplete-dropdown" 
                        *ngIf="item.showSuggestions && getFilteredParticulars(item.particular).length > 0">
                        <div class="dropdown-title">Saved Particulars:</div>
                        <div 
                          *ngFor="let sp of getFilteredParticulars(item.particular)" 
                          class="autocomplete-item"
                          (mousedown)="selectParticular(item, sp)">
                          <span class="sp-name">{{ sp.particular }}</span>
                          <span class="sp-unit-badge">{{ sp.defaultUnit || 'mtr' }}</span>
                          <span class="sp-rate" *ngIf="sp.defaultRate > 0">₹{{ sp.defaultRate }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Product Description Field -->
                    <div class="item-desc-wrap">
                      <textarea 
                        rows="1"
                        class="form-control item-desc-input" 
                        [(ngModel)]="item.description" 
                        placeholder="📝 Product description (e.g. Fabric code, shade, pleated style, brand)..."></textarea>
                    </div>
                  </td>

                  <!-- Quantity -->
                  <td>
                    <input 
                      type="number" 
                      min="0" 
                      step="any"
                      class="form-control text-right font-mono" 
                      [(ngModel)]="item.quantity" 
                      (ngModelChange)="calcItemTotal(item)"
                      placeholder="Qty" />
                  </td>

                  <!-- Unit (Select with saved units or Custom Enter) -->
                  <td>
                    <div class="unit-select-wrap">
                      <select class="form-control unit-select" [(ngModel)]="item.unit">
                        <option *ngFor="let u of availableUnits" [value]="u">{{ u }}</option>
                      </select>
                      <button 
                        type="button" 
                        class="btn-custom-unit" 
                        title="Add custom unit" 
                        (click)="promptCustomUnit(item)">+</button>
                    </div>
                  </td>

                  <!-- Combined Qty & Unit Preview Badge -->
                  <td class="text-center">
                    <span class="combined-qty-chip">
                      <strong>{{ item.quantity || 0 }}</strong>
                      <span class="chip-unit">({{ item.unit || 'mtr' }})</span>
                    </span>
                  </td>

                  <!-- Rate (₹) -->
                  <td>
                    <div class="rate-input-wrap">
                      <span class="currency-symbol">₹</span>
                      <input 
                        type="number" 
                        min="0" 
                        step="any"
                        class="form-control text-right font-mono" 
                        [(ngModel)]="item.rate" 
                        (ngModelChange)="calcItemTotal(item)"
                        placeholder="0.00" />
                    </div>
                  </td>

                  <!-- Total (₹) -->
                  <td class="text-right font-mono total-cell">
                    ₹{{ (item.total || (item.quantity * item.rate)) | number:'1.2-2' }}
                  </td>

                  <!-- Actions (Up, Down, Delete) -->
                  <td class="text-center actions-cell">
                    <div class="action-btn-group">
                      <button 
                        type="button" 
                        class="btn-icon-move" 
                        [disabled]="isFirst" 
                        (click)="moveItemUp(idx)" 
                        title="Move Up">▲</button>
                      <button 
                        type="button" 
                        class="btn-icon-move" 
                        [disabled]="isLast" 
                        (click)="moveItemDown(idx)" 
                        title="Move Down">▼</button>
                      <button 
                        type="button" 
                        class="btn-icon-del" 
                        (click)="removeItem(idx)" 
                        title="Delete line">🗑</button>
                    </div>
                  </td>
                </tr>

                <!-- Empty state if no rows -->
                <tr *ngIf="items.length === 0">
                  <td colspan="8" class="empty-table-cell">
                    <div class="empty-table-msg">
                      <span>📋 No particulars added yet. Click "+ Add Line Item" to begin.</span>
                      <button type="button" class="btn btn-primary btn-sm" (click)="addItem()">+ Add First Line</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Bottom Table Bar: Add Row & Quick Preset Items -->
          <div class="table-bottom-bar">
            <button type="button" class="btn btn-secondary btn-sm" (click)="addItem()">
              <span>+ Add Line Item</span>
            </button>
            <div class="quick-presets-row" *ngIf="savedParticulars.length > 0">
              <span class="preset-label">Quick add saved particular:</span>
              <button 
                type="button" 
                *ngFor="let sp of savedParticulars.slice(0, 5)" 
                class="preset-chip" 
                (click)="addFromPreset(sp)">
                + {{ sp.particular }}
              </button>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- SECTION 4: TOTALS, DISCOUNT & IN WORDS -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="step-card totals-card">
          <div class="totals-layout">

            <!-- Left: Notes & In Words -->
            <div class="totals-left">
              <div class="form-group">
                <label>Quotation Remarks / Notes</label>
                <textarea 
                  class="form-control" 
                  rows="2" 
                  [(ngModel)]="quotationRemarks" 
                  placeholder="e.g. Free home delivery and installation included. Valid for 30 days."></textarea>
              </div>

              <div class="amount-words-card">
                <div class="words-title">Amount in Words (INR):</div>
                <div class="words-text">{{ getAmountInWords() }}</div>
              </div>

              <!-- Optional Advance Payment tracker -->
              <div class="form-grid form-grid-2" style="margin-top: 12px;">
                <div class="form-group mb-0">
                  <label>Advance Payment (₹)</label>
                  <input 
                    type="number" 
                    min="0" 
                    class="form-control font-mono" 
                    [(ngModel)]="advancePayment" 
                    placeholder="0.00" />
                </div>
                <div class="form-group mb-0">
                  <label>Balance Due (₹)</label>
                  <div class="balance-display font-mono" [class.danger]="getBalanceAmount() > 0">
                    ₹{{ getBalanceAmount() | number:'1.2-2' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Calculation Box -->
            <div class="totals-right">
              <div class="calc-box-card">
                <div class="calc-row">
                  <span class="calc-lbl">Subtotal ({{ items.length }} item{{ items.length !== 1 ? 's' : '' }}):</span>
                  <span class="calc-val font-mono">₹{{ getSubTotal() | number:'1.2-2' }}</span>
                </div>

                <!-- Discount Input Row -->
                <div class="discount-edit-row">
                  <div class="discount-toggle">
                    <span class="calc-lbl">Discount:</span>
                    <div class="toggle-pill-sm">
                      <button 
                        type="button" 
                        class="toggle-btn-sm" 
                        [class.active]="discountType === 'percent'" 
                        (click)="discountType = 'percent'">%</button>
                      <button 
                        type="button" 
                        class="toggle-btn-sm" 
                        [class.active]="discountType === 'flat'" 
                        (click)="discountType = 'flat'">₹</button>
                    </div>
                  </div>
                  <div class="discount-input-wrap">
                    <input 
                      type="number" 
                      min="0" 
                      [max]="discountType === 'percent' ? 100 : getSubTotal()"
                      class="form-control text-right font-mono disc-input" 
                      [(ngModel)]="discountValue" 
                      placeholder="0" />
                    <span class="disc-sign">{{ discountType === 'percent' ? '%' : '₹' }}</span>
                  </div>
                </div>

                <div class="calc-row text-rose" *ngIf="getDiscountAmount() > 0">
                  <span class="calc-lbl">Discount Deducted:</span>
                  <span class="calc-val font-mono">- ₹{{ getDiscountAmount() | number:'1.2-2' }}</span>
                </div>

                <div class="grand-total-row">
                  <div>
                    <div class="grand-lbl">FINAL QUOTATION AMOUNT</div>
                    <div class="grand-sub">Net Payable Amount</div>
                  </div>
                  <div class="grand-val font-mono">
                    ₹{{ getFinalAmount() | number:'1.2-2' }}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- SECTION 5: BANK DETAILS & TERMS & CONDITIONS -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="step-card">
          <div class="step-header">
            <div class="step-indicator">
              <span class="step-num">3</span>
              <div>
                <h2 class="step-title">Bank Details &amp; Terms &amp; Conditions</h2>
                <p class="step-desc">Payment bank information and terms that will be printed on the bottom of the PDF quotation</p>
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" (click)="saveDefaultBankDetails()">
              💾 Save As Default Bank Info
            </button>
          </div>

          <div class="form-grid form-grid-2">
            <!-- Bank Details Column -->
            <div class="bank-inputs-card">
              <h3 class="card-subtitle">🏦 Bank Account Information</h3>
              <div class="form-grid form-grid-2">
                <div class="form-group">
                  <label>Bank Name</label>
                  <input type="text" class="form-control" [(ngModel)]="bankDetails.bankName" placeholder="e.g. State Bank of India" />
                </div>
                <div class="form-group">
                  <label>Account Name</label>
                  <input type="text" class="form-control" [(ngModel)]="bankDetails.accountName" placeholder="e.g. Pukale Furnishing Centre" />
                </div>
              </div>
              <div class="form-grid form-grid-3">
                <div class="form-group">
                  <label>Account Number</label>
                  <input type="text" class="form-control font-mono" [(ngModel)]="bankDetails.accountNumber" placeholder="123456789012" />
                </div>
                <div class="form-group">
                  <label>IFSC Code</label>
                  <input type="text" class="form-control font-mono" [(ngModel)]="bankDetails.ifscCode" placeholder="SBIN0001234" />
                </div>
                <div class="form-group">
                  <label>Branch</label>
                  <input type="text" class="form-control" [(ngModel)]="bankDetails.branch" placeholder="Main Branch" />
                </div>
              </div>
            </div>

            <!-- Terms & Conditions Column -->
            <div class="terms-inputs-card">
              <h3 class="card-subtitle">📜 Terms &amp; Conditions</h3>
              <div class="form-group mb-0">
                <textarea 
                  class="form-control font-mono terms-textarea" 
                  rows="5" 
                  [(ngModel)]="bankDetails.termsAndConditions" 
                  placeholder="Enter quotation terms (one per line)..."></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- ACTION BAR -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="bottom-action-bar">
          <div class="bar-summary">
            <span class="bar-items-count">{{ items.length }} Items</span>
            <span class="bar-divider">·</span>
            <span class="bar-total">Final Amount: <strong>₹{{ getFinalAmount() | number:'1.2-2' }}</strong></span>
          </div>
          <div class="bar-buttons">
            <button type="button" class="btn btn-secondary" (click)="openPreviewModal()" [disabled]="items.length === 0" title="Preview styled quotation document">
              <span>👁️</span> <span>Preview</span>
            </button>
            <button type="button" class="btn btn-secondary" (click)="directDownloadPdf()" [disabled]="items.length === 0">
              <span>📥</span> <span>Download PDF</span>
            </button>
            <button type="button" class="btn btn-whatsapp" (click)="openShareModal()" [disabled]="items.length === 0">
              <span>💬</span> <span>Share via WhatsApp</span>
            </button>
            <button type="button" class="btn btn-primary btn-lg" (click)="saveQuotation()" [disabled]="saving || items.length === 0">
              <span>💾</span> <span>{{ saving ? 'Saving...' : (quotationId ? '✓ Update Quotation' : '✓ Save Quotation') }}</span>
            </button>
          </div>
        </div>

      </main>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- MODAL 1: BUSINESS DETAILS EDITOR -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div class="modal-overlay" *ngIf="showBusinessModal" (click)="showBusinessModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">🏢 Business &amp; Firm Profile</h2>
          <button type="button" class="btn-close" (click)="showBusinessModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label>Firm / Business Name <span class="required-star">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="business.firmName" />
            </div>
            <div class="form-group">
              <label>Contact Phone Number</label>
              <input type="text" class="form-control" [(ngModel)]="business.contactNumber" />
            </div>
          </div>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label>Business Email</label>
              <input type="email" class="form-control" [(ngModel)]="business.email" />
            </div>
            <div class="form-group">
              <label>Business Logo URL</label>
              <input type="text" class="form-control" [(ngModel)]="business.logoUrl" placeholder="Optional image URL or leave empty for default PFC logo" />
            </div>
          </div>
          <div class="form-group">
            <label>Business Address</label>
            <input type="text" class="form-control" [(ngModel)]="business.address" />
          </div>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label>GSTIN Number</label>
              <input type="text" class="form-control font-mono" [(ngModel)]="business.gstNumber" />
            </div>
            <div class="form-group">
              <label>PAN Number</label>
              <input type="text" class="form-control font-mono" [(ngModel)]="business.panNumber" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="showBusinessModal = false">Cancel</button>
          <button type="button" class="btn btn-primary" (click)="saveBusinessDetails()">Save Business Profile</button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- MODAL 2: WHATSAPP SHARE & PDF FILENAME CUSTOMIZATION -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div class="modal-overlay" *ngIf="showShareModal" (click)="showShareModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">💬 Share Quotation &amp; Download PDF</h2>
          <button type="button" class="btn-close" (click)="showShareModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="share-info-banner">
            <div class="share-icon">📄</div>
            <div>
              <div class="share-client-name">Quotation for: <strong>{{ getCustomerDisplayName() }}</strong></div>
              <div class="share-total">Total: <strong>₹{{ getFinalAmount() | number:'1.2-2' }}</strong> ({{ items.length }} items)</div>
            </div>
          </div>

          <div class="form-group">
            <label>Customize PDF Filename <span class="required-star">*</span></label>
            <div class="input-unit-wrap">
              <input type="text" class="form-control font-mono" [(ngModel)]="customPdfFilename" />
            </div>
            <small class="text-muted">You can edit the filename before downloading or sharing.</small>
          </div>

          <div class="form-group">
            <label>Customer WhatsApp Contact</label>
            <input 
              type="text" 
              class="form-control font-mono" 
              [(ngModel)]="sharePhone" 
              placeholder="e.g. 9876543210" />
            <small class="text-muted">WhatsApp message and PDF proposal will be sent to this number.</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="openPreviewModal()">
            <span>👁️</span> <span>Preview Document</span>
          </button>
          <button type="button" class="btn btn-secondary" (click)="downloadPdfOnly()">
            <span>📥</span> <span>Download PDF</span>
          </button>
          <button type="button" class="btn btn-whatsapp" (click)="confirmWhatsAppShare()">
            <span>💬</span> <span>Share via WhatsApp</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- MODAL 3: QUOTATION DOCUMENT PREVIEW -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div class="modal-overlay" *ngIf="showPreviewModal" (click)="closePreviewModal()">
      <div class="modal-card modal-preview" (click)="$event.stopPropagation()">
        
        <div class="modal-header-preview">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:1.3rem;">👁️</span>
            <div>
              <h2 style="font-size:1.05rem; font-weight:800; color:#0f172a; margin:0;">Quotation Preview</h2>
              <span style="font-size:0.75rem; color:#64748b;">
                {{ quotationNumber || 'QT-DRAFT' }} · {{ getCustomerDisplayName() }}
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

            <button type="button" class="btn btn-secondary btn-sm" (click)="directDownloadPdf()">
              <span>📥</span> <span>Download PDF</span>
            </button>
            <button type="button" class="btn btn-whatsapp btn-sm" (click)="openShareModal(); closePreviewModal();">
              <span>💬</span> <span>Share via WhatsApp</span>
            </button>
            <button type="button" class="btn-close" (click)="closePreviewModal()" title="Close (Esc)">✕</button>
          </div>
        </div>

        <div class="preview-scroll-body">
          <div class="preview-paper-container" [style.transform]="'scale(' + previewZoom + ')'">
            <div [innerHTML]="previewHtml"></div>
          </div>
        </div>

        <div class="modal-footer" style="justify-content:space-between; align-items:center;">
          <span style="font-size:0.82rem; color:#475569;">
            Quotation Total: <strong style="color:#0f172a; font-size:0.95rem;">₹{{ getFinalAmount() | number:'1.2-2' }}</strong> ({{ items.length }} items)
          </span>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-secondary" (click)="closePreviewModal()">Close</button>
            <button type="button" class="btn btn-secondary" (click)="directDownloadPdf()">
              <span>📥</span> <span>Download PDF</span>
            </button>
            <button type="button" class="btn btn-whatsapp" (click)="openShareModal(); closePreviewModal();">
              <span>💬</span> <span>Share via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .qm-top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .header-pretitle {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6366f1;
      margin-bottom: 3px;
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
      margin-top: 2px;
    }
    .header-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    /* Business Bar Card */
    .biz-bar-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      margin-bottom: 18px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      gap: 20px;
      flex-wrap: wrap;
    }
    .biz-bar-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      min-width: 300px;
    }
    .biz-logo-avatar {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: #f1f5f9;
      border: 1.5px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .biz-avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .biz-avatar-icon { font-size: 24px; }
    .biz-name-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .biz-name-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .edit-biz-link {
      background: none;
      border: none;
      font-size: 0.75rem;
      color: #4f46e5;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }
    .biz-sub-info {
      font-size: 0.78rem;
      color: #64748b;
      margin-top: 2px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .biz-tax-row {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }
    .tax-tag {
      font-size: 0.7rem;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    .biz-bar-right {
      display: flex;
      gap: 12px;
    }
    .quote-meta-grid {
      display: flex;
      gap: 12px;
    }
    .meta-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    /* Step Card */
    .step-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 18px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }
    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 14px;
      flex-wrap: wrap;
    }
    .step-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: #4f46e5;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.9rem;
      flex-shrink: 0;
    }
    .step-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: #0f172a;
    }
    .step-desc {
      font-size: 0.78rem;
      color: #64748b;
      margin-top: 1px;
    }

    /* Customer Selection UI */
    .toggle-tabs {
      display: flex;
      gap: 4px;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 6px 14px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #64748b;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tab-btn.active {
      background: #ffffff;
      color: #4f46e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      color: #94a3b8;
    }
    .search-input {
      padding-left: 36px !important;
    }
    .clear-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
    }

    .selected-cust-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 12px;
    }
    .cust-banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cust-avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #10b981;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.95rem;
      flex-shrink: 0;
    }
    .cust-banner-name {
      font-size: 0.95rem;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-cust-selected {
      font-size: 0.68rem;
      font-weight: 800;
      background: #dcfce7;
      color: #166534;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #86efac;
    }
    .cust-banner-sub {
      font-size: 0.78rem;
      color: #475569;
      margin-top: 2px;
    }

    .cust-results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 10px;
      margin-top: 12px;
      max-height: 240px;
      overflow-y: auto;
    }
    .cust-result-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      cursor: pointer;
      background: #fafcff;
      transition: all 0.15s;
    }
    .cust-result-card:hover {
      border-color: #4f46e5;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
    }
    .cust-result-meta { flex: 1; min-width: 0; }
    .cust-res-name { font-weight: 700; font-size: 0.88rem; color: #0f172a; }
    .cust-res-phone, .cust-res-addr { font-size: 0.74rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .no-results-box {
      padding: 16px;
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    /* Items Table */
    .items-table-edit {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .items-table-edit th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    .items-table-edit td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .item-row:hover { background: #fafcff; }

    .sr-cell { font-weight: 700; color: #64748b; }
    .sr-badge {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 24px;
      border-radius: 6px;
      background: #f1f5f9;
      font-size: 0.78rem;
    }

    .particular-input-wrap {
      position: relative;
    }
    .particular-input {
      width: 100%;
      font-weight: 600;
    }
    .item-desc-wrap {
      margin-top: 5px;
    }
    .item-desc-input {
      width: 100%;
      font-size: 0.76rem;
      color: #475569;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      min-height: 28px;
      resize: vertical;
      line-height: 1.35;
      font-family: inherit;
      transition: all 0.15s ease;
    }
    .item-desc-input:focus {
      background: #ffffff;
      border-color: #3b82f6;
      border-style: solid;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
      color: #0f172a;
    }
    .autocomplete-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
      z-index: 50;
      max-height: 220px;
      overflow-y: auto;
      margin-top: 2px;
    }
    .dropdown-title {
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      color: #94a3b8;
      padding: 6px 10px 3px;
      letter-spacing: 0.05em;
    }
    .autocomplete-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 10px;
      cursor: pointer;
      font-size: 0.82rem;
      border-bottom: 1px solid #f8fafc;
    }
    .autocomplete-item:hover {
      background: #eef2ff;
      color: #4f46e5;
    }
    .sp-name { font-weight: 700; flex: 1; }
    .sp-unit-badge {
      font-size: 0.7rem;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #475569;
      font-weight: 600;
      margin-right: 6px;
    }
    .sp-rate { font-weight: 700; color: #059669; font-family: monospace; }

    .unit-select-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .unit-select {
      font-weight: 600;
      padding: 6px 8px;
      font-size: 0.82rem;
    }
    .btn-custom-unit {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      width: 26px;
      height: 32px;
      font-weight: 800;
      cursor: pointer;
      font-size: 0.85rem;
      color: #475569;
    }
    .btn-custom-unit:hover { background: #e0e7ff; color: #4338ca; }

    .combined-qty-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-family: monospace;
    }
    .chip-unit {
      font-weight: 700;
      color: #15803d;
    }

    .rate-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .currency-symbol {
      position: absolute;
      left: 8px;
      font-size: 0.8rem;
      color: #94a3b8;
      pointer-events: none;
    }
    .rate-input-wrap input { padding-left: 20px !important; }

    .total-cell {
      font-weight: 800;
      color: #0f172a;
      font-size: 0.92rem;
    }

    .action-btn-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .btn-icon-move {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      width: 26px;
      height: 26px;
      font-size: 0.65rem;
      cursor: pointer;
      color: #475569;
    }
    .btn-icon-move:hover:not(:disabled) { background: #e0e7ff; color: #4338ca; }
    .btn-icon-move:disabled { opacity: 0.3; cursor: not-allowed; }
    .btn-icon-del {
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      width: 26px;
      height: 26px;
      font-size: 0.75rem;
      cursor: pointer;
      color: #dc2626;
    }
    .btn-icon-del:hover { background: #fca5a5; color: #991b1b; }

    .empty-table-cell {
      padding: 32px 20px;
      text-align: center;
    }
    .empty-table-msg {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #64748b;
    }

    .table-bottom-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #e2e8f0;
      flex-wrap: wrap;
      gap: 12px;
    }
    .quick-presets-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .preset-label {
      font-size: 0.74rem;
      font-weight: 700;
      color: #64748b;
    }
    .preset-chip {
      font-size: 0.74rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
    .preset-chip:hover {
      background: #eef2ff;
      border-color: #a5b4fc;
      color: #4338ca;
    }

    /* Totals Layout */
    .totals-layout {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }
    .totals-left { flex: 1.2; min-width: 320px; }
    .totals-right { width: 340px; }

    .amount-words-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      padding: 10px 14px;
    }
    .words-title {
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 2px;
    }
    .words-text {
      font-size: 0.86rem;
      font-weight: 700;
      color: #1e293b;
      font-style: italic;
    }

    .balance-display {
      padding: 8px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-weight: 800;
      font-size: 0.95rem;
      color: #059669;
    }
    .balance-display.danger { color: #e11d48; }

    /* Calc Box Card */
    .calc-box-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.88rem;
    }
    .calc-lbl { color: #64748b; font-weight: 600; }
    .calc-val { font-weight: 800; color: #0f172a; font-size: 0.95rem; }

    .discount-edit-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid #f1f5f9;
      background: #fafcff;
    }
    .discount-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toggle-pill-sm {
      display: flex;
      background: #e2e8f0;
      padding: 2px;
      border-radius: 6px;
    }
    .toggle-btn-sm {
      background: none;
      border: none;
      padding: 2px 7px;
      font-size: 0.72rem;
      font-weight: 800;
      color: #64748b;
      cursor: pointer;
      border-radius: 4px;
    }
    .toggle-btn-sm.active {
      background: #ffffff;
      color: #4f46e5;
    }
    .discount-input-wrap {
      position: relative;
      width: 100px;
    }
    .disc-input { padding-right: 22px !important; }
    .disc-sign {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.8rem;
      font-weight: 700;
      color: #94a3b8;
      pointer-events: none;
    }
    .text-rose { color: #e11d48 !important; }

    .grand-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #ffffff;
    }
    .grand-lbl {
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .grand-sub {
      font-size: 0.65rem;
      opacity: 0.75;
    }
    .grand-val {
      font-size: 1.25rem;
      font-weight: 900;
      color: #ffffff;
    }

    /* Bank & Terms */
    .card-subtitle {
      font-size: 0.92rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .bank-inputs-card, .terms-inputs-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
    }
    .terms-textarea {
      font-size: 0.8rem;
      line-height: 1.5;
    }

    /* Bottom Action Bar */
    .bottom-action-bar {
      position: sticky;
      bottom: 0;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(10px);
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
      z-index: 30;
      margin-top: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .bar-summary {
      font-size: 0.95rem;
      color: #334155;
    }
    .bar-items-count { font-weight: 600; color: #64748b; }
    .bar-divider { margin: 0 8px; color: #cbd5e1; }
    .bar-total { font-weight: 700; }
    .bar-total strong { color: #0f172a; font-size: 1.15rem; font-family: monospace; }
    .bar-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Modals */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 560px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      animation: modalPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes modalPop {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      padding: 16px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.1rem;
      color: #94a3b8;
      cursor: pointer;
    }
    .btn-close:hover { color: #0f172a; }
    .modal-body { padding: 20px; }
    .modal-footer {
      padding: 14px 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .share-info-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 16px;
    }
    .share-icon { font-size: 2rem; }
    .share-client-name { font-size: 0.95rem; color: #1e1b4b; }
    .share-total { font-size: 0.85rem; color: #4338ca; margin-top: 2px; }

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

    @media (max-width: 768px) {
      .totals-layout { flex-direction: column; }
      .totals-right { width: 100%; }
      .bottom-action-bar { flex-direction: column; align-items: stretch; }
      .bar-buttons { justify-content: stretch; }
      .bar-buttons button { flex: 1; }
    }
  `]
})
export class QuotationMakerComponent implements OnInit {
  quotationId: number | null = null;
  quotationNumber = '';
  quotationTitle = 'Furnishing & Interior Proposal';
  quotationDate = new Date().toISOString().substring(0, 10);
  quotationRemarks = '';

  // Customers
  custMode: 'existing' | 'new' = 'existing';
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  searchCustQuery = '';
  selectedCustomer: Customer | null = null;
  newCust = {
    name: '',
    contactNumber: '',
    alternateContactNumber: '',
    address: '',
    notes: ''
  };

  // Particulars & Items
  items: EditableItem[] = [];
  savedParticulars: SavedParticular[] = [];
  availableUnits: string[] = ['mtr', 'pcs', 'sq ft', 'ft', 'set', 'pair', 'roll', 'kg', 'inch'];
  discountType: 'percent' | 'flat' = 'percent';
  discountValue = 0;
  advancePayment = 0;

  // Settings
  business: BusinessProfile = {
    firmName: 'PUKALE FURNISHING CENTRE',
    address: 'SHOP NO-121/122, S.S.HIGH SCHOOL COMPLEX\nB.L.D.E.A. HOSPITAL ROAD, VIJAYPURA,\nKarnataka, India - 586101',
    contactNumber: '+91 99026 25960',
    email: 'contact@pukalefurnishing.com',
    gstNumber: '29AAGFP3063J1ZZ',
    panNumber: 'AAGFP3063J',
    logoUrl: ''
  };
  bankDetails: BankDetails = {
    bankName: 'State Bank of India',
    accountName: 'Pukale Furnishing Centre',
    accountNumber: '123456789012',
    ifscCode: 'SBIN0001234',
    branch: 'Main Branch',
    termsAndConditions: '1. Quotation valid for 30 days from issue date.\n2. 50% advance payment along with confirmed purchase order.\n3. Delivery and installation within 7-10 working days after final measurement.\n4. GST and applicable customization charges included as stated.'
  };

  // State
  saving = false;
  showBusinessModal = false;
  showShareModal = false;
  showPreviewModal = false;
  previewHtml: SafeHtml = '';
  previewZoom = 1.0;
  customPdfFilename = '';
  sharePhone = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private pdfService: PdfService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadInitialData();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.quotationId = Number(id);
        this.loadExistingQuotation(this.quotationId);
      } else {
        this.fetchNextQuotationNumber();
        // Check query param for customerId
        this.route.queryParams.subscribe(qp => {
          if (qp['customerId']) {
            this.preselectCustomer(Number(qp['customerId']));
          }
        });
      }
    });
  }

  loadInitialData() {
    // Load Customers
    this.api.getCustomers().subscribe({
      next: (custs) => {
        this.customers = custs;
        this.filteredCustomers = custs.slice(0, 8);
      }
    });

    // Load Saved Particulars
    this.api.getParticulars().subscribe({
      next: (pts) => {
        this.savedParticulars = pts;
      }
    });

    // Load Units
    this.api.getUnits().subscribe({
      next: (units) => {
        if (units && units.length > 0) this.availableUnits = units;
      }
    });

    // Load Business Profile
    this.api.getBusinessProfile().subscribe({
      next: (biz) => {
        if (biz && biz.firmName) this.business = biz;
      }
    });

    // Load Bank Details
    this.api.getBankDetails().subscribe({
      next: (bank) => {
        if (bank && bank.bankName) this.bankDetails = bank;
      }
    });

    // Add 1 default empty item row if creating new
    if (!this.quotationId && this.items.length === 0) {
      this.addItem();
    }
  }

  fetchNextQuotationNumber() {
    this.api.getNextQuotationNumber().subscribe({
      next: (res) => {
        if (res?.quotationNumber) this.quotationNumber = res.quotationNumber;
      }
    });
  }

  loadExistingQuotation(id: number) {
    this.api.getQuotation(id).subscribe({
      next: (q) => {
        this.quotationNumber = q.quotationNumber || '';
        this.quotationTitle = q.title || '';
        this.quotationRemarks = q.remarks || '';
        this.quotationDate = q.createdAt ? q.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
        this.discountType = (q.discountType as any) || 'percent';
        this.discountValue = q.discountValue || 0;
        this.advancePayment = q.advancePayment || 0;

        if (q.customerId) {
          this.preselectCustomer(q.customerId);
        }

        if (q.items && q.items.length > 0) {
          this.items = q.items.map((it, idx) => ({
            id: it.id,
            srNo: it.srNo || (idx + 1),
            particular: it.particular,
            description: it.description || '',
            quantity: it.quantity,
            unit: it.unit || 'mtr',
            rate: it.rate,
            total: it.total || (it.quantity * it.rate)
          }));
        } else if (q.products && q.products.length > 0) {
          this.items = q.products.map((p, idx) => ({
            srNo: idx + 1,
            particular: `${p.productName} (${p.productType})`,
            description: '',
            quantity: p.quantity,
            unit: 'pcs',
            rate: p.quotationAmount / (p.quantity || 1),
            total: p.quotationAmount
          }));
        }

        if (this.items.length === 0) {
          this.addItem();
        }
      },
      error: () => {
        this.toast.error('Could not load quotation details');
      }
    });
  }

  preselectCustomer(customerId: number) {
    this.api.getCustomer(customerId).subscribe({
      next: (cust) => {
        this.selectedCustomer = cust;
        this.custMode = 'existing';
      }
    });
  }

  filterCustomers() {
    if (!this.searchCustQuery.trim()) {
      this.filteredCustomers = this.customers.slice(0, 8);
      return;
    }
    const q = this.searchCustQuery.toLowerCase();
    this.filteredCustomers = this.customers.filter(c => 
      c.name.toLowerCase().includes(q) || (c.contactNumber && c.contactNumber.includes(q))
    ).slice(0, 10);
  }

  selectCustomer(c: Customer) {
    this.selectedCustomer = c;
    this.searchCustQuery = '';
  }

  clearSelectedCustomer() {
    this.selectedCustomer = null;
    this.filterCustomers();
  }

  getAvatarClass(name: string): string {
    const classes = ['avatar-emerald', 'avatar-indigo', 'avatar-violet', 'avatar-amber', 'avatar-rose', 'avatar-cyan'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return classes[Math.abs(hash) % classes.length];
  }

  // Particulars & Table
  addItem() {
    const nextSr = this.items.length + 1;
    this.items.push({
      srNo: nextSr,
      particular: '',
      description: '',
      quantity: 1,
      unit: 'mtr',
      rate: 0,
      total: 0,
      showSuggestions: false
    });
  }

  removeItem(index: number) {
    this.items.splice(index, 1);
    this.reindexSrNumbers();
  }

  moveItemUp(index: number) {
    if (index <= 0) return;
    const temp = this.items[index];
    this.items[index] = this.items[index - 1];
    this.items[index - 1] = temp;
    this.reindexSrNumbers();
  }

  moveItemDown(index: number) {
    if (index >= this.items.length - 1) return;
    const temp = this.items[index];
    this.items[index] = this.items[index + 1];
    this.items[index + 1] = temp;
    this.reindexSrNumbers();
  }

  reindexSrNumbers() {
    this.items.forEach((item, idx) => {
      item.srNo = idx + 1;
    });
  }

  calcItemTotal(item: EditableItem) {
    item.total = Math.round(((item.quantity || 0) * (item.rate || 0)) * 100) / 100;
  }

  onParticularInput(item: EditableItem) {
    item.showSuggestions = true;
  }

  getFilteredParticulars(query: string): SavedParticular[] {
    if (!query || !query.trim()) return this.savedParticulars.slice(0, 6);
    const q = query.toLowerCase();
    return this.savedParticulars.filter(p => p.particular.toLowerCase().includes(q)).slice(0, 8);
  }

  selectParticular(item: EditableItem, sp: SavedParticular) {
    item.particular = sp.particular;
    if (sp.defaultUnit) item.unit = sp.defaultUnit;
    if (sp.defaultRate > 0) {
      item.rate = sp.defaultRate;
      this.calcItemTotal(item);
    }
    item.showSuggestions = false;
  }

  addFromPreset(sp: SavedParticular) {
    const nextSr = this.items.length + 1;
    const newItem: EditableItem = {
      srNo: nextSr,
      particular: sp.particular,
      description: '',
      quantity: 1,
      unit: sp.defaultUnit || 'mtr',
      rate: sp.defaultRate || 0,
      total: sp.defaultRate || 0,
      showSuggestions: false
    };
    this.items.push(newItem);
    this.toast.info(`Added ${sp.particular}`);
  }

  promptCustomUnit(item: EditableItem) {
    const unit = prompt('Enter custom unit name (e.g. roll, bundle, box):');
    if (unit && unit.trim()) {
      const clean = unit.trim().toLowerCase();
      if (!this.availableUnits.includes(clean)) {
        this.availableUnits.push(clean);
        this.api.addUnit(clean).subscribe();
      }
      item.unit = clean;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    // Close autocomplete when clicking outside
    this.items.forEach(it => it.showSuggestions = false);
  }

  // Calculations
  getSubTotal(): number {
    return this.items.reduce((s, it) => s + (it.total || (it.quantity * it.rate)), 0);
  }

  getDiscountAmount(): number {
    const sub = this.getSubTotal();
    if (!this.discountValue || this.discountValue <= 0) return 0;
    if (this.discountType === 'percent') {
      return Math.round((sub * (this.discountValue / 100)) * 100) / 100;
    }
    return Math.min(sub, this.discountValue);
  }

  getFinalAmount(): number {
    const sub = this.getSubTotal();
    const disc = this.getDiscountAmount();
    return Math.max(0, Math.round((sub - disc) * 100) / 100);
  }

  getBalanceAmount(): number {
    return Math.max(0, this.getFinalAmount() - (this.advancePayment || 0));
  }

  getAmountInWords(): string {
    return this.pdfService.numberToWords(this.getFinalAmount());
  }

  getCustomerDisplayName(): string {
    if (this.custMode === 'existing' && this.selectedCustomer) {
      return this.selectedCustomer.name;
    }
    return this.newCust.name || 'Valued Customer';
  }

  // Save Quotation
  async saveQuotation() {
    if (this.items.length === 0) {
      this.toast.error('Please add at least one line item');
      return;
    }

    const invalidItem = this.items.find(it => !it.particular.trim());
    if (invalidItem) {
      this.toast.error('Please enter a description for all particulars');
      return;
    }

    this.saving = true;

    try {
      let customerId = this.selectedCustomer?.id;

      // If new customer mode, create customer first
      if (this.custMode === 'new' || !customerId) {
        if (!this.newCust.name.trim()) {
          this.toast.error('Please enter customer name');
          this.saving = false;
          return;
        }

        const createdCust = await this.api.createCustomer({
          name: this.newCust.name.trim(),
          contactNumber: this.newCust.contactNumber.trim(),
          alternateContactNumber: this.newCust.alternateContactNumber.trim(),
          address: this.newCust.address.trim(),
          notes: this.newCust.notes.trim()
        }).toPromise();

        if (createdCust) {
          customerId = createdCust.id;
          this.selectedCustomer = createdCust;
          this.custMode = 'existing';
          this.toast.success(`Customer "${createdCust.name}" saved!`);
        }
      }

      if (!customerId) {
        this.toast.error('Please select or create a customer');
        this.saving = false;
        return;
      }

      const payload = {
        customerId,
        quotationNumber: this.quotationNumber,
        title: this.quotationTitle || 'Quotation',
        remarks: this.quotationRemarks,
        createdAt: this.quotationDate ? new Date(this.quotationDate) : new Date(),
        discountType: this.discountType,
        discountValue: this.discountValue || 0,
        discountAmount: this.getDiscountAmount(),
        subTotal: this.getSubTotal(),
        finalAmount: this.getFinalAmount(),
        advancePayment: this.advancePayment || 0,
        items: this.items.map((it, idx) => ({
          srNo: idx + 1,
          particular: it.particular.trim(),
          description: it.description?.trim() || null,
          quantity: it.quantity || 0,
          unit: it.unit || 'mtr',
          rate: it.rate || 0,
          total: it.total || (it.quantity * it.rate)
        }))
      };

      if (this.quotationId) {
        await this.api.updateQuotation(this.quotationId, payload).toPromise();
        this.toast.success('Quotation updated successfully!');
      } else {
        const saved = await this.api.createQuotation(payload).toPromise();
        if (saved) {
          this.quotationId = saved.id;
          this.toast.success(`Quotation ${saved.quotationNumber} saved successfully!`);
        }
      }

      // Refresh saved particulars in background
      this.api.getParticulars().subscribe(pts => this.savedParticulars = pts);
    } catch (err: any) {
      this.toast.error('Failed to save quotation. Please check inputs.');
    } finally {
      this.saving = false;
    }
  }

  // Direct PDF Download (no print preview)
  async directDownloadPdf() {
    try {
      this.toast.info('Generating PDF document...');
      const pdfData = this.buildPdfData();
      const filename = await this.pdfService.downloadPdf(pdfData);
      this.toast.success(`Downloaded "${filename}" directly to your device!`);
    } catch (e) {
      this.toast.error('Failed to generate PDF. Please try again.');
    }
  }

  // Document Preview
  openPreviewModal() {
    if (this.items.length === 0) {
      this.toast.warning('Please add at least one line item to preview');
      return;
    }
    const pdfData = this.buildPdfData();
    const rawHtml = this.pdfService.getPreviewHtmlWithStyles(pdfData);
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    this.previewZoom = 1.0;
    this.showPreviewModal = true;
  }

  setPreviewZoom(z: number) {
    this.previewZoom = Math.min(Math.max(Number(z.toFixed(1)), 0.6), 1.4);
  }

  resetPreviewZoom() {
    this.previewZoom = 1.0;
  }

  closePreviewModal() {
    this.showPreviewModal = false;
    this.previewHtml = '';
  }

  // Print Preview
  openPrintPreview() {
    const pdfData = this.buildPdfData();
    this.pdfService.printQuotation(pdfData);
  }

  // WhatsApp & Share Modal
  openShareModal() {
    const cust = this.selectedCustomer || (this.newCust.name ? this.newCust : null);
    this.sharePhone = cust?.contactNumber || '';
    this.customPdfFilename = this.pdfService.getDefaultFilename(this.buildPdfData());
    this.showShareModal = true;
  }

  async downloadPdfOnly() {
    try {
      this.toast.info('Downloading PDF document...');
      const pdfData = this.buildPdfData();
      const filename = await this.pdfService.downloadPdf(pdfData, this.customPdfFilename);
      this.showShareModal = false;
      this.toast.success(`Downloaded "${filename}" directly to your device!`);
    } catch (e) {
      this.toast.error('Failed to download PDF.');
    }
  }

  async confirmWhatsAppShare() {
    try {
      this.toast.info('Preparing PDF document for WhatsApp...');
      const pdfData = this.buildPdfData();
      if (this.sharePhone) {
        if (pdfData.customer) pdfData.customer.contactNumber = this.sharePhone;
      }
      const res = await this.pdfService.shareViaWhatsApp(pdfData, this.customPdfFilename);
      this.showShareModal = false;
      if (res.sharedViaNative) {
        this.toast.success('Sharing PDF document directly to WhatsApp...');
      } else {
        this.toast.success(`PDF downloaded to device & WhatsApp opened!`);
      }
    } catch (e) {
      this.toast.error('Could not complete WhatsApp sharing.');
    }
  }

  buildPdfData(): import('../../services/pdf.service').QuotationPdfData {
    const currentQuote: Quotation = {
      id: this.quotationId || 0,
      customerId: this.selectedCustomer?.id || 0,
      customerName: this.getCustomerDisplayName(),
      customerContactNumber: this.selectedCustomer?.contactNumber || this.newCust.contactNumber,
      customerAddress: this.selectedCustomer?.address || this.newCust.address,
      quotationNumber: this.quotationNumber || 'QT-DRAFT',
      title: this.quotationTitle,
      createdAt: this.quotationDate,
      remarks: this.quotationRemarks,
      advancePayment: this.advancePayment,
      advancePaymentDate: null,
      discountType: this.discountType,
      discountValue: this.discountValue,
      discountAmount: this.getDiscountAmount(),
      subTotal: this.getSubTotal(),
      finalAmount: this.getFinalAmount(),
      items: this.items.map((it, idx) => ({
        srNo: idx + 1,
        particular: it.particular,
        description: it.description?.trim() || undefined,
        quantity: it.quantity,
        unit: it.unit,
        rate: it.rate,
        total: it.total || (it.quantity * it.rate)
      })),
      products: [],
      totalFinalAmount: this.getFinalAmount(),
      totalProductAdvance: 0,
      totalAdvance: this.advancePayment,
      totalBalance: this.getBalanceAmount(),
      quotationStatus: 'Approved',
      paymentStatus: this.getBalanceAmount() <= 0 ? 'Full payment cleared' : 'Pending'
    };

    return {
      quotation: currentQuote,
      customer: this.selectedCustomer || {
        name: this.newCust.name || 'Valued Customer',
        contactNumber: this.newCust.contactNumber,
        address: this.newCust.address
      },
      business: this.business,
      bank: this.bankDetails
    };
  }

  // Business & Bank Modal Helpers
  openBusinessModal() {
    this.showBusinessModal = true;
  }

  saveBusinessDetails() {
    this.api.saveBusinessProfile(this.business).subscribe({
      next: () => {
        this.toast.success('Business profile updated successfully!');
        this.showBusinessModal = false;
      },
      error: () => this.toast.error('Failed to save business details')
    });
  }

  saveDefaultBankDetails() {
    this.api.saveBankDetails(this.bankDetails).subscribe({
      next: () => this.toast.success('Bank details & terms saved as default!'),
      error: () => this.toast.error('Failed to save bank details')
    });
  }

  resetForm() {
    if (confirm('Start a new blank quotation draft?')) {
      this.quotationId = null;
      this.selectedCustomer = null;
      this.newCust = { name: '', contactNumber: '', alternateContactNumber: '', address: '', notes: '' };
      this.quotationTitle = 'Furnishing & Interior Proposal';
      this.quotationRemarks = '';
      this.discountValue = 0;
      this.advancePayment = 0;
      this.items = [];
      this.fetchNextQuotationNumber();
      this.addItem();
      this.router.navigate(['/quotation-maker']);
    }
  }
}
