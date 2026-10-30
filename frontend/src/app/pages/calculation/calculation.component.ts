import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { ApiService } from '../../services/api.service';
import { Customer, CustomerDetail, QuotationWindow } from '../../models/models';
import { isRomanBlind, isOtherBlind, isBlind } from './curtain-calculation';
import { ToastService } from '../../services/toast.service';

interface WindowItem {
  id?: string | number;
  windowName: string;
  treatmentType: 'Curtain' | 'Roman Blind' | 'Other Blind' | 'Wallpaper';
  width: number | null;
  height: number | null;
  panels: number | null;
  manualPanelsOverride: boolean;
  isDoubleCurtain?: boolean;
  curtainType?: 'Main' | 'Sheer' | string;
  sheerWidth?: number | null;
  sheerHeight?: number | null;
  sheerPanels?: number | null;
  manualSheerPanelsOverride?: boolean;
  mainRequirement?: number;
  sheerRequirement?: number;
  requirement: number;
  unit: string;
  remarks: string;
}

interface Room {
  id: string;
  name: string;
  windows: WindowItem[];
}

@Component({
  selector: 'app-calculation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  template: `
    <div class="page-wrapper">
      <app-header />
      <main class="main-content">

        <!-- Page Top Header -->
        <div class="calc-page-header">
          <div>
            <div class="badge-pill">Measurement & Quotation Tool</div>
            <h1 class="calc-title">Window Calculation</h1>
            <p class="calc-subtitle">Organize calculations room-by-room with multiple windows, automatic formulas, and room totals</p>
          </div>
          <div class="header-actions" *ngIf="totalItemsCount() > 0">
            <button class="btn btn-secondary" (click)="resetAll()">Reset</button>
            <button class="btn btn-primary" (click)="saveQuotation()" [disabled]="saving">
              {{ saving ? 'Saving...' : '💾 Save Quotation' }}
            </button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- STEP 1: CUSTOMER SELECTION -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="step-card" id="step-customer-card">
          <div class="step-header">
            <div class="step-indicator">
              <span class="step-num">1</span>
              <div>
                <h2 class="step-title">{{ selectedCustomer ? 'Customer: ' + selectedCustomer.name : 'Customer Assignment' }}</h2>
                <p class="step-desc">{{ selectedCustomer ? (selectedCustomer.contactNumber ? '📞 ' + selectedCustomer.contactNumber : 'Customer selected') + (selectedCustomer.address ? ' · 📍 ' + selectedCustomer.address : '') : 'Select an existing customer, register new, or calculate in quick draft mode' }}</p>
              </div>
            </div>
            <div *ngIf="selectedCustomer" class="step-badge">
              ✓ Customer Selected
            </div>
            <div *ngIf="!selectedCustomer" class="badge" style="background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe;">
              ⚡ Quick Estimate Mode
            </div>
          </div>

          <!-- Customer is NOT yet selected -->
          <div *ngIf="!selectedCustomer" class="customer-selection-wrap">
            <!-- Mode Toggle Tabs -->
            <div class="toggle-tabs">
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="custMode === 'existing'" 
                (click)="setCustMode('existing')">
                🔍 Existing Customer
              </button>
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="custMode === 'new'" 
                (click)="setCustMode('new')">
                ➕ New Customer
              </button>
            </div>

            <!-- Existing Customer Search -->
            <div *ngIf="custMode === 'existing'" class="existing-box">
              <div class="form-group search-box">
                <label>Search Customer by Name or Phone</label>
                <div class="search-input-wrap">
                  <span class="search-icon">🔍</span>
                  <input 
                    type="text" 
                    class="form-control search-input" 
                    [(ngModel)]="searchCustQuery" 
                    (input)="filterCustomers()" 
                    placeholder="Type name or phone number..." />
                  <button 
                    *ngIf="searchCustQuery" 
                    type="button" 
                    class="clear-btn" 
                    (click)="searchCustQuery = ''; filterCustomers()">✕</button>
                </div>
              </div>

              <!-- Customer Results List -->
              <div class="cust-results-grid" *ngIf="filteredCustomers.length > 0">
                <div 
                  *ngFor="let c of filteredCustomers" 
                  class="cust-result-card"
                  (click)="selectCustomer(c)">
                  <div class="cust-avatar" [ngClass]="getAvatarClass(c.name)">{{ c.name.charAt(0).toUpperCase() }}</div>
                  <div class="cust-meta">
                    <div class="cust-name">{{ c.name }}</div>
                    <div class="cust-phone" *ngIf="c.contactNumber">📞 {{ c.contactNumber }}</div>
                    <div class="cust-addr" *ngIf="c.address">📍 {{ c.address }}</div>
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm select-btn">Select →</button>
                </div>
              </div>

              <div *ngIf="filteredCustomers.length === 0" class="no-cust-found">
                <p>No customers found matching "{{ searchCustQuery }}"</p>
                <button type="button" class="btn btn-secondary btn-sm" (click)="setCustMode('new')">
                  + Create as New Customer
                </button>
              </div>
            </div>

            <!-- New Customer Form -->
            <div *ngIf="custMode === 'new'" class="new-cust-box">
              <div class="form-grid form-grid-2">
                <div class="form-group">
                  <label>Customer Name <span class="required-star">*</span></label>
                  <input 
                    type="text" 
                    class="form-control" 
                    [(ngModel)]="newCustForm.name" 
                    placeholder="Full name (e.g. Rajesh Patil)" />
                </div>
                <div class="form-group">
                  <label>Contact Number</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    [(ngModel)]="newCustForm.contactNumber" 
                    placeholder="Mobile number (e.g. 9876543210)" />
                </div>
                <div class="form-group">
                  <label>Alternate Contact</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    [(ngModel)]="newCustForm.alternateContactNumber" 
                    placeholder="Alternate phone number" />
                </div>
                <div class="form-group">
                  <label>Address</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    [(ngModel)]="newCustForm.address" 
                    placeholder="Full address / Site location" />
                </div>
              </div>
              <div class="form-group">
                <label>Notes / Site Remarks</label>
                <textarea 
                  class="form-control" 
                  [(ngModel)]="newCustForm.notes" 
                  rows="2" 
                  placeholder="Any customer preferences or notes..."></textarea>
              </div>
              <div class="form-actions-right">
                <button 
                  type="button" 
                  class="btn btn-primary" 
                  (click)="createNewCustomer()" 
                  [disabled]="creatingCustomer || !newCustForm.name.trim()">
                  {{ creatingCustomer ? 'Creating Customer...' : '✓ Create & Start Calculation' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Active Customer Display Banner -->
          <div *ngIf="selectedCustomer" class="active-cust-banner">
            <div class="active-cust-info">
              <div class="active-avatar" [ngClass]="getAvatarClass(selectedCustomer.name)">{{ selectedCustomer.name.charAt(0).toUpperCase() }}</div>
              <div>
                <div class="active-name">{{ selectedCustomer.name }}</div>
                <div class="active-sub">
                  <span *ngIf="selectedCustomer.contactNumber">📞 {{ selectedCustomer.contactNumber }}</span>
                  <span *ngIf="selectedCustomer.alternateContactNumber"> · {{ selectedCustomer.alternateContactNumber }}</span>
                  <span *ngIf="selectedCustomer.address"> · 📍 {{ selectedCustomer.address }}</span>
                </div>
              </div>
            </div>
            <div class="active-actions">
              <a [routerLink]="['/customers', selectedCustomer.id]" class="btn btn-secondary btn-sm" target="_blank">
                View Profile ↗
              </a>
              <button type="button" class="btn btn-secondary btn-sm" (click)="switchCustomer()">
                Switch Customer
              </button>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- STEP 2: QUOTATION DETAILS & ROOM-WISE CALCULATOR -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <ng-container>

          <!-- Quotation Header Info Card -->
          <div class="card quotation-header-card">
            <div class="quote-header-grid">
              <div class="form-group">
                <label>Quotation Number</label>
                <div class="input-with-action">
                  <input 
                    type="text" 
                    class="form-control font-mono bold-text" 
                    [(ngModel)]="quotationNumber" 
                    placeholder="e.g. QT-202608-001" />
                  <button type="button" class="btn-icon" title="Regenerate number" (click)="fetchNextQuotationNumber()">↻</button>
                </div>
              </div>
              <div class="form-group">
                <label>Quotation Title / Reference</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="quotationTitle" 
                  placeholder="e.g. Full Home Curtains & Blinds" />
              </div>
              <div class="form-group">
                <label>Quotation Date</label>
                <input 
                  type="date" 
                  class="form-control" 
                  [(ngModel)]="quotationDate" />
              </div>
              <div class="form-group">
                <label>General Remarks</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="quotationRemarks" 
                  placeholder="Optional notes or terms..." />
              </div>
            </div>
          </div>

          <!-- Room Selection & Creation Bar -->
          <div class="step-card room-manager-card">
            <div class="step-header" style="margin-bottom: 12px;">
              <div class="step-indicator">
                <span class="step-num">2</span>
                <div>
                  <h2 class="step-title">Rooms & Locations</h2>
                  <p class="step-desc">Create rooms (e.g. Master Bedroom, Hall) and add multiple windows under each</p>
                </div>
              </div>
            </div>

            <!-- Quick Add Room Bar -->
            <div class="add-room-inline">
              <div class="room-input-group">
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="newRoomNameInput" 
                  (keydown.enter)="addRoom(newRoomNameInput)"
                  placeholder="Enter room name (e.g. Master Bedroom, Hall, Living Room)..." />
                <button 
                  type="button" 
                  class="btn btn-primary" 
                  (click)="addRoom(newRoomNameInput)"
                  [disabled]="!newRoomNameInput.trim()">
                  + Add Room
                </button>
              </div>

              <!-- Quick Room Chips -->
              <div class="room-chips-list">
                <span class="chip-label">Quick add:</span>
                <button 
                  type="button" 
                  *ngFor="let suggestion of roomSuggestions" 
                  class="room-suggestion-chip"
                  (click)="addRoom(suggestion)">
                  + {{ suggestion }}
                </button>
              </div>
            </div>

            <!-- Active Rooms Tabs / Bar -->
            <div class="active-rooms-bar" *ngIf="rooms.length > 0">
              <div class="rooms-tab-label">Active Rooms:</div>
              <div class="rooms-pill-list">
                <button 
                  type="button" 
                  *ngFor="let r of rooms" 
                  class="room-nav-pill" 
                  [class.pill-active]="activeRoomId === r.id"
                  (click)="setActiveRoom(r.id)">
                  <span class="pill-name">🏠 {{ r.name }}</span>
                  <span class="pill-count">{{ roomWindowCount(r) }} win<span *ngIf="roomWallpaperArea(r) > 0"> · {{ roomWallpaperArea(r) | number:'1.0-0' }} sq ft</span></span>
                </button>
              </div>
            </div>
          </div>

          <!-- Window Entry Form (Interactive Calculator for Active Room) -->
          <div class="step-card window-form-card" id="window-entry-card" *ngIf="activeRoom" [class.edit-highlight]="editingWindowId !== null">
            <div class="window-form-header">
              <div class="step-indicator">
                <span class="step-num">{{ editingWindowId !== null ? '✏' : '3' }}</span>
                <div>
                  <h2 class="step-title">
                    {{ editingWindowId !== null ? 'Edit Window in ' + activeRoom.name : 'Add Window to ' + activeRoom.name }}
                  </h2>
                  <p class="step-desc">Enter window dimensions in inches and select curtain or blind treatment</p>
                </div>
              </div>
              <div *ngIf="editingWindowId !== null" class="edit-badge">
                Currently Editing Window
              </div>
            </div>

            <div class="calc-form-body">

              <!-- 1. Room Switcher & Window Label -->
              <div class="form-grid form-grid-2">
                <div class="form-group">
                  <label>Room / Location</label>
                  <select class="form-control" [(ngModel)]="activeRoomId" (change)="onRoomSwitch()">
                    <option *ngFor="let r of rooms" [value]="r.id">🏠 {{ r.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Window Name / Label <span class="required-star">*</span></label>
                  <input 
                    type="text" 
                    class="form-control" 
                    [(ngModel)]="windowForm.windowName" 
                    placeholder="e.g. Window 1, Left Window, Balcony Glass" />
                </div>
              </div>

              <!-- 2. Window Treatment Selection (Curtain / Roman Blind / Other Blind) -->
              <div class="form-group">
                <label>Window Treatment <span class="required-star">*</span></label>
                <div class="treatment-grid">
                  <div 
                    class="treatment-card treatment-curtain" 
                    [class.active]="windowForm.treatmentType === 'Curtain'"
                    (click)="selectTreatment('Curtain')">
                    <div class="treatment-icon">🪟</div>
                    <div class="treatment-info">
                      <div class="treatment-title">Curtain</div>
                      <div class="treatment-desc">Panels: Ceil(W÷20) · Cloth: (H+10)×Panels÷39</div>
                    </div>
                    <div class="treatment-radio" [class.checked]="windowForm.treatmentType === 'Curtain'"></div>
                  </div>

                  <div 
                    class="treatment-card treatment-roman" 
                    [class.active]="windowForm.treatmentType === 'Roman Blind'"
                    (click)="selectTreatment('Roman Blind')">
                    <div class="treatment-icon">📐</div>
                    <div class="treatment-info">
                      <div class="treatment-title">Roman Blind</div>
                      <div class="treatment-desc">Area: Width × Height ÷ 144 sq ft</div>
                    </div>
                    <div class="treatment-radio" [class.checked]="windowForm.treatmentType === 'Roman Blind'"></div>
                  </div>

                  <div 
                    class="treatment-card treatment-other-blind" 
                    [class.active]="windowForm.treatmentType === 'Other Blind'"
                    (click)="selectTreatment('Other Blind')">
                    <div class="treatment-icon">📏</div>
                    <div class="treatment-info">
                      <div class="treatment-title">Other Blind</div>
                      <div class="treatment-desc">Area: Width × Height ÷ 144 sq ft (Roller, Zebra, Wooden...)</div>
                    </div>
                    <div class="treatment-radio" [class.checked]="windowForm.treatmentType === 'Other Blind'"></div>
                  </div>

                  <div 
                    class="treatment-card treatment-wallpaper" 
                    [class.active]="windowForm.treatmentType === 'Wallpaper'"
                    (click)="selectTreatment('Wallpaper')">
                    <div class="treatment-icon">🖼️</div>
                    <div class="treatment-info">
                      <div class="treatment-title">Wallpaper</div>
                      <div class="treatment-desc">Area: Width × Height ÷ 144 sq ft (min 12 sq ft)</div>
                    </div>
                    <div class="treatment-radio" [class.checked]="windowForm.treatmentType === 'Wallpaper'"></div>
                  </div>
                </div>
              </div>

              <!-- 3. Double / Single Curtain & Layer Selection (only for Curtain) -->
              <div class="form-group" *ngIf="windowForm.treatmentType === 'Curtain'">
                <label>Window Type</label>
                <div class="window-type-toggle">
                  <button type="button" class="wtype-btn" [class.active]="!windowForm.isDoubleCurtain" (click)="setDoubleCurtain(false)">Single Curtain Window</button>
                  <button type="button" class="wtype-btn" [class.active]="windowForm.isDoubleCurtain" (click)="setDoubleCurtain(true)">Double Curtain Window</button>
                </div>
              </div>

              <!-- Single Curtain Type Selector (Main vs Sheer Only) -->
              <div class="form-group" *ngIf="windowForm.treatmentType === 'Curtain' && !windowForm.isDoubleCurtain">
                <label>Curtain Selection</label>
                <div class="curtain-type-subtoggle">
                  <button 
                    type="button" 
                    class="curtain-opt-btn" 
                    [class.active]="windowForm.curtainType !== 'Sheer'" 
                    (click)="setCurtainType('Main')">
                    <span class="opt-icon">🪟</span>
                    <span class="opt-title">Main Curtain</span>
                    <span class="opt-tag default-tag">Default</span>
                  </button>
                  <button 
                    type="button" 
                    class="curtain-opt-btn sheer-opt" 
                    [class.active]="windowForm.curtainType === 'Sheer'" 
                    (click)="setCurtainType('Sheer')">
                    <span class="opt-icon">✨</span>
                    <span class="opt-title">Sheer Curtain only</span>
                    <span class="opt-tag sheer-only-tag">Sheer Only</span>
                  </button>
                </div>
              </div>

              <!-- 4. Dimensions Input -->
              <div class="curtain-section-label" *ngIf="windowForm.treatmentType === 'Curtain' && windowForm.isDoubleCurtain">MAIN CURTAIN</div>
              <div class="curtain-section-label" [class.sheer-label]="windowForm.curtainType === 'Sheer'" *ngIf="windowForm.treatmentType === 'Curtain' && !windowForm.isDoubleCurtain">
                {{ windowForm.curtainType === 'Sheer' ? '✨ SHEER CURTAIN (SINGLE LAYER)' : '🪟 MAIN CURTAIN (SINGLE LAYER)' }}
              </div>
              <div class="form-grid form-grid-3">
                <div class="form-group">
                  <label>Width (inches) <span class="required-star">*</span></label>
                  <div class="input-unit-wrap">
                    <input 
                      type="number" 
                      min="1" 
                      step="0.5" 
                      class="form-control dimension-input" 
                      [(ngModel)]="windowForm.width" 
                      (ngModelChange)="onWidthChange()" 
                      placeholder="e.g. 93" />
                    <span class="unit-tag">inches (")</span>
                  </div>
                </div>

                <div class="form-group">
                  <label>Height (inches) <span class="required-star">*</span></label>
                  <div class="input-unit-wrap">
                    <input 
                      type="number" 
                      min="1" 
                      step="0.5" 
                      class="form-control dimension-input" 
                      [(ngModel)]="windowForm.height" 
                      (ngModelChange)="onHeightChange()" 
                      placeholder="e.g. 96" />
                    <span class="unit-tag">inches (")</span>
                  </div>
                </div>

                <!-- Panels: ONLY for Curtain -->
                <div class="form-group" *ngIf="windowForm.treatmentType === 'Curtain'">
                  <div class="label-with-hint">
                    <label>Panels</label>
                    <span class="hint-tag" *ngIf="!windowForm.manualPanelsOverride">Auto: Ceil(W÷20)</span>
                    <span class="hint-tag custom" *ngIf="windowForm.manualPanelsOverride">Customized</span>
                  </div>
                  <div class="stepper-wrap">
                    <button 
                      type="button" 
                      class="step-btn" 
                      (click)="decrementPanels()" 
                      [disabled]="(windowForm.panels ?? 1) <= 1">−</button>
                    <input 
                      type="number" 
                      min="1" 
                      class="form-control panel-input font-mono" 
                      [(ngModel)]="windowForm.panels" 
                      (ngModelChange)="windowForm.manualPanelsOverride = true" />
                    <button 
                      type="button" 
                      class="step-btn" 
                      (click)="incrementPanels()">+</button>
                  </div>
                </div>

                <!-- Blind note when blinds selected -->
                <div class="form-group blind-info-col" *ngIf="windowForm.treatmentType !== 'Curtain'">
                  <label>Panel Selection</label>
                  <div class="blind-no-panel-box">
                    <span>— Not applicable for blinds</span>
                  </div>
                </div>
              </div>

              <!-- 5. Sheer Curtain Inputs (Double Curtain only) -->
              <ng-container *ngIf="windowForm.treatmentType === 'Curtain' && windowForm.isDoubleCurtain">
                <div class="curtain-section-label sheer-label">SHEER CURTAIN</div>
                <div class="form-grid form-grid-3">
                  <div class="form-group">
                    <label>Width (inches)</label>
                    <div class="input-unit-wrap">
                      <input type="number" min="1" step="0.5" class="form-control dimension-input" [(ngModel)]="windowForm.sheerWidth" (ngModelChange)="onSheerWidthChange()" placeholder="Same as main" />
                      <span class="unit-tag">inches (")</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Height (inches)</label>
                    <div class="input-unit-wrap">
                      <input type="number" min="1" step="0.5" class="form-control dimension-input" [(ngModel)]="windowForm.sheerHeight" (ngModelChange)="onSheerHeightChange()" placeholder="Same as main" />
                      <span class="unit-tag">inches (")</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <div class="label-with-hint">
                      <label>Panels</label>
                      <span class="hint-tag" *ngIf="!windowForm.manualSheerPanelsOverride">Auto: Ceil(W÷20)</span>
                      <span class="hint-tag custom" *ngIf="windowForm.manualSheerPanelsOverride">Customized</span>
                    </div>
                    <div class="stepper-wrap">
                      <button type="button" class="step-btn" (click)="decrementSheerPanels()" [disabled]="(windowForm.sheerPanels ?? 1) <= 1">−</button>
                      <input type="number" min="1" class="form-control panel-input font-mono" [(ngModel)]="windowForm.sheerPanels" (ngModelChange)="windowForm.manualSheerPanelsOverride = true" />
                      <button type="button" class="step-btn" (click)="incrementSheerPanels()">+</button>
                    </div>
                  </div>
                </div>
              </ng-container>

              <!-- 6. Real-time Live Calculation Result Box -->
              <div class="calc-result-box" *ngIf="isCurrentWindowValid()">
                <div class="calc-result-main">
                  <div class="result-label">Calculated Requirement</div>
                  <div class="result-value-large">
                    <span class="res-num">{{ currentWindowRequirement() }}</span>
                    <span class="res-unit">{{ windowForm.treatmentType === 'Curtain' ? 'meters' : 'sq ft' }}</span>
                  </div>
                  <div class="result-split-chips" *ngIf="windowForm.treatmentType === 'Curtain' && windowForm.isDoubleCurtain">
                    <span class="split-chip main-chip">Main: <strong>{{ mainCurtainRequirement() }} m</strong></span>
                    <span class="split-chip sheer-chip">Sheer: <strong>{{ sheerCurtainRequirement() }} m</strong></span>
                  </div>
                  <div class="result-split-chips" *ngIf="windowForm.treatmentType === 'Curtain' && !windowForm.isDoubleCurtain">
                    <span class="split-chip" [class.main-chip]="windowForm.curtainType !== 'Sheer'" [class.sheer-chip]="windowForm.curtainType === 'Sheer'">
                      {{ windowForm.curtainType === 'Sheer' ? '✨ Sheer Curtain Only:' : '🪟 Main Curtain:' }} <strong>{{ currentWindowRequirement() }} m</strong>
                    </span>
                  </div>
                </div>

                <div class="calc-formula-explainer">
                  <!-- Single Curtain -->
                  <div *ngIf="windowForm.treatmentType === 'Curtain' && !windowForm.isDoubleCurtain">
                    <div class="formula-line">
                      <strong>{{ windowForm.curtainType === 'Sheer' ? 'Sheer Curtain Formula:' : 'Main Curtain Formula:' }}</strong> 
                      Adjusted Height = Height + 10" = <span>{{ (windowForm.height || 0) + 10 }}"</span>
                    </div>
                    <div class="formula-line">
                      Required Cloth = ({{ (windowForm.height || 0) + 10 }} × {{ windowForm.panels || 0 }}) ÷ 39 = 
                      <strong class="highlight-math">{{ currentWindowRequirement() }} meters</strong>
                      <span class="sub-label" style="margin-left:6px;" [style.color]="windowForm.curtainType === 'Sheer' ? '#6d28d9' : '#166534'">
                        ({{ windowForm.curtainType === 'Sheer' ? 'Sheer Curtain' : 'Main Curtain' }})
                      </span>
                    </div>
                    <div class="formula-note" *ngIf="windowForm.manualPanelsOverride">ℹ️ Panels manually adjusted to {{ windowForm.panels }}.</div>
                  </div>
                  <!-- Double Curtain -->
                  <div *ngIf="windowForm.treatmentType === 'Curtain' && windowForm.isDoubleCurtain">
                    <div class="formula-line"><strong>Main Curtain:</strong> ({{ (windowForm.height || 0) + 10 }} × {{ windowForm.panels || 0 }}) ÷ 39 = <strong class="highlight-math">{{ mainCurtainRequirement() }} m</strong></div>
                    <div class="formula-line"><strong>Sheer Curtain:</strong> ({{ effectiveSheerHeight() + 10 }} × {{ effectiveSheerPanels() }}) ÷ 39 = <strong class="highlight-math">{{ sheerCurtainRequirement() }} m</strong></div>
                    <div class="formula-line" style="margin-top:4px;">Total Window Cloth = {{ mainCurtainRequirement() }} + {{ sheerCurtainRequirement() }} = <strong class="highlight-math">{{ currentWindowRequirement() }} meters</strong> (Counts as 1 window)</div>
                  </div>
                  <!-- Blinds -->
                  <div *ngIf="windowForm.treatmentType !== 'Curtain'">
                    <div class="formula-line"><strong>{{ windowForm.treatmentType === 'Wallpaper' ? 'Wallpaper' : 'Blinds' }} Formula:</strong> Area = Width × Height ÷ 144 (min 12 sq ft)</div>
                    <div class="formula-line">Required Area = ({{ windowForm.width }} × {{ windowForm.height }}) ÷ 144 = <strong class="highlight-math">{{ currentWindowRequirement() }} sq ft</strong></div>
                    <div class="formula-note">ℹ️ Height is used as-is. Result rounded up to 12 sq ft minimum.</div>
                  </div>
                </div>
              </div>

              <!-- Window Form Actions -->
              <div class="window-form-actions">
                <button 
                  type="button" 
                  class="btn btn-secondary" 
                  *ngIf="editingWindowId !== null" 
                  (click)="cancelEdit()">
                  Cancel Edit
                </button>
                <button 
                  type="button" 
                  class="btn btn-primary btn-lg" 
                  (click)="addOrUpdateWindow()" 
                  [disabled]="!isCurrentWindowValid()">
                  {{ editingWindowId !== null ? '✓ Update Window in ' + activeRoom.name : '+ Add Window to ' + activeRoom.name }}
                </button>
              </div>

            </div>
          </div>

          <!-- ═══════════════════════════════════════════════════════════════ -->
          <!-- STEP 3: ROOM-WISE CARDS & WINDOWS LIST -->
          <!-- ═══════════════════════════════════════════════════════════════ -->
          <div class="rooms-container" *ngIf="rooms.length > 0">
            <div class="section-top-title">
              <h2 class="step-title">Room-wise Breakdown & Subtotals</h2>
              <p class="step-desc">Individual rooms with their respective windows and room totals</p>
            </div>

            <div *ngFor="let room of rooms; let ri = index" class="room-block-card">
              <!-- Room Header Bar -->
              <div class="room-block-header">
                <div class="room-title-wrap">
                  <div class="room-icon-badge">🏠</div>
                  <div>
                    <h3 class="room-title-text">{{ room.name }}</h3>
                    <span class="room-meta-tag">{{ roomWindowCount(room) }} window{{ roomWindowCount(room) !== 1 ? 's' : '' }}<span *ngIf="roomWallpaperArea(room) > 0"> · 🖼️ {{ roomWallpaperArea(room) | number:'1.2-2' }} sq ft</span></span>
                  </div>
                </div>
                <div class="room-header-actions">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="openAddWindowToRoom(room.id)">
                    + Add Window
                  </button>
                  <button type="button" class="btn btn-danger btn-sm" (click)="deleteRoom(room.id)" title="Delete Room">
                    🗑 Remove Room
                  </button>
                </div>
              </div>

              <!-- Windows in this Room -->
              <div *ngIf="room.windows.length > 0" class="table-wrap room-table-wrap">
                <table class="summary-table">
                  <thead>
                    <tr>
                      <th style="width: 40px;">#</th>
                      <th>Window Label</th>
                      <th>Treatment</th>
                      <th class="text-right">Width</th>
                      <th class="text-right">Height</th>
                      <th class="text-center">Panels</th>
                      <th class="text-right">Requirement</th>
                      <th class="text-center" style="width: 130px;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ng-container *ngFor="let w of room.windows; let wi = index">
                      <tr [class.row-editing]="editingWindowId === w.id">
                        <td class="text-muted">{{ wi + 1 }}</td>
                        <td>
                          <strong class="win-label-text">{{ w.windowName }}</strong>
                          <span *ngIf="w.isDoubleCurtain" class="double-tag">Double (1 Window)</span>
                          <span *ngIf="!w.isDoubleCurtain && w.treatmentType === 'Curtain' && w.curtainType === 'Sheer'" class="sheer-tag">Sheer Only</span>
                        </td>
                        <td>
                          <span class="treatment-badge" 
                            [class.badge-curtain]="w.treatmentType === 'Curtain' && (w.isDoubleCurtain || w.curtainType !== 'Sheer')" 
                            [class.badge-sheer]="w.treatmentType === 'Curtain' && !w.isDoubleCurtain && w.curtainType === 'Sheer'"
                            [class.badge-wallpaper]="w.treatmentType === 'Wallpaper'" 
                            [class.badge-blind]="w.treatmentType !== 'Curtain' && w.treatmentType !== 'Wallpaper'">
                            {{ w.treatmentType === 'Curtain' ? '🪟' : w.treatmentType === 'Wallpaper' ? '🖼️' : '📐' }} 
                            {{ w.treatmentType === 'Curtain' ? (!w.isDoubleCurtain && w.curtainType === 'Sheer' ? 'Sheer Curtain' : 'Curtain') : w.treatmentType }}
                            <span *ngIf="w.isDoubleCurtain" class="main-label">(Main)</span>
                            <span *ngIf="!w.isDoubleCurtain && w.treatmentType === 'Curtain' && w.curtainType !== 'Sheer'" class="main-label">(Main)</span>
                          </span>
                        </td>
                        <td class="text-right font-mono">{{ w.width }}"</td>
                        <td class="text-right font-mono">{{ w.height }}"</td>
                        <td class="text-center font-mono">
                          <span *ngIf="w.treatmentType === 'Curtain'" class="panel-badge">{{ w.panels }}</span>
                          <span *ngIf="w.treatmentType !== 'Curtain'" class="text-muted">—</span>
                        </td>
                        <td class="text-right font-mono requirement-cell">
                          <strong class="req-val">{{ (w.isDoubleCurtain ? getMainRequirement(w) : w.requirement) | number:'1.2-2' }}</strong>
                          <span class="req-unit"> {{ w.unit }}</span>
                          <span *ngIf="w.isDoubleCurtain" class="sub-label">(Main Curtain)</span>
                          <span *ngIf="!w.isDoubleCurtain && w.treatmentType === 'Curtain'" class="sub-label" [style.color]="w.curtainType === 'Sheer' ? '#6d28d9' : '#15803d'">
                            ({{ w.curtainType === 'Sheer' ? 'Sheer Curtain' : 'Main Curtain' }})
                          </span>
                        </td>
                        <td class="text-center">
                          <div class="table-actions">
                            <button type="button" class="btn btn-secondary btn-sm" (click)="editWindow(room.id, w)" title="Edit this window">✏ Edit</button>
                            <button type="button" class="btn btn-danger btn-sm" (click)="deleteWindow(room.id, wi)" title="Delete this window">🗑</button>
                          </div>
                        </td>
                      </tr>
                      <tr *ngIf="w.isDoubleCurtain" class="sheer-row">
                        <td></td>
                        <td class="sheer-indent">↳ Sheer: {{ w.sheerWidth ?? w.width }}" × {{ w.sheerHeight ?? w.height }}" · {{ w.sheerPanels ?? w.panels }} panels</td>
                        <td><span class="treatment-badge badge-sheer">🪟 Sheer Curtain</span></td>
                        <td class="text-right font-mono">{{ w.sheerWidth ?? w.width }}"</td>
                        <td class="text-right font-mono">{{ w.sheerHeight ?? w.height }}"</td>
                        <td class="text-center font-mono"><span class="panel-badge">{{ w.sheerPanels ?? w.panels }}</span></td>
                        <td class="text-right font-mono requirement-cell">
                          <strong class="req-val">{{ getSheerRequirement(w) | number:'1.2-2' }}</strong>
                          <span class="req-unit"> {{ w.unit }}</span>
                          <span class="sub-label">(Sheer Curtain)</span>
                        </td>
                        <td></td>
                      </tr>
                      <tr *ngIf="w.isDoubleCurtain" class="double-total-row">
                        <td colspan="6" class="text-right text-muted" style="font-size:0.78rem;">{{ w.windowName }} Total Quantity (1 Window = Main + Sheer):</td>
                        <td class="text-right font-mono" style="font-weight:800; color:#166534;">{{ w.requirement | number:'1.2-2' }} {{ w.unit }}</td>
                        <td></td>
                      </tr>
                    </ng-container>
                  </tbody>
                </table>
              </div>

              <!-- Empty state if no windows in this room -->
              <div *ngIf="room.windows.length === 0" class="room-empty-state">
                <span>No windows added to {{ room.name }} yet.</span>
                <button type="button" class="btn btn-secondary btn-sm" (click)="openAddWindowToRoom(room.id)">
                  + Add First Window
                </button>
              </div>

              <!-- ── ROOM TOTALS BAR ── -->
              <div class="room-subtotal-bar" *ngIf="room.windows.length > 0">
                <div class="subtotal-label">
                  <span class="st-icon">📊</span>
                  <span class="st-room">{{ room.name }} Total:</span>
                </div>
                <div class="subtotal-values">
                  <span *ngIf="roomCurtainMeters(room) > 0" class="st-pill st-curtain">
                    🪟 Curtain: <strong>{{ roomCurtainMeters(room) | number:'1.2-2' }} meters</strong>
                  </span>
                  <span *ngIf="roomRomanBlindsArea(room) > 0" class="st-pill st-blinds">
                    📐 Roman Blinds: <strong>{{ roomRomanBlindsArea(room) | number:'1.2-2' }} sq ft</strong>
                  </span>
                  <span *ngIf="roomOtherBlindsArea(room) > 0" class="st-pill st-blinds">
                    📐 Other Blinds: <strong>{{ roomOtherBlindsArea(room) | number:'1.2-2' }} sq ft</strong>
                  </span>
                  <span *ngIf="roomRomanBlindsArea(room) > 0 && roomOtherBlindsArea(room) > 0" class="st-pill st-blinds" style="background:#e0f2fe; color:#0369a1; font-weight:700;">
                    📐 Total Blinds: <strong>{{ roomBlindsArea(room) | number:'1.2-2' }} sq ft</strong>
                  </span>
                  <span *ngIf="roomBlindsArea(room) > 0 && !(roomRomanBlindsArea(room) > 0 && roomOtherBlindsArea(room) > 0)" class="st-pill st-blinds">
                    📐 Blinds: <strong>{{ roomBlindsArea(room) | number:'1.2-2' }} sq ft</strong>
                  </span>
                  <span *ngIf="roomWallpaperArea(room) > 0" class="st-pill st-wallpaper">
                    🖼️ Wallpaper: <strong>{{ roomWallpaperArea(room) | number:'1.2-2' }} sq ft</strong>
                  </span>
                </div>
              </div>

            </div>
          </div>

          <!-- ═══════════════════════════════════════════════════════════════ -->
          <!-- STEP 4: FINAL CALCULATION SUMMARY & SAVE -->
          <!-- ═══════════════════════════════════════════════════════════════ -->
          <div class="step-card summary-card" *ngIf="totalItemsCount() > 0">
            <div class="summary-card-header">
              <div>
                <h2 class="step-title">Final Calculation Summary</h2>
                <p class="step-desc">Complete overview of all rooms and windows{{ selectedCustomer ? ' for ' + selectedCustomer.name : '' }}</p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" (click)="scrollToRoomManager()">
                + Add Another Room
              </button>
            </div>

            <!-- Grand KPI Totals Bar -->
            <div class="kpi-summary-grid">
              <div class="kpi-mini-card">
                <div class="kpi-mini-lbl">Single Curtain Windows</div>
                <div class="kpi-mini-val">{{ totalSingleCurtainWindowsCount() }} <span class="unit-sm">windows</span></div>
                <div class="kpi-mini-sub" *ngIf="totalSingleSheerCurtainWindowsCount() > 0 && totalSingleMainCurtainWindowsCount() > 0">
                  {{ totalSingleMainCurtainWindowsCount() }} Main · {{ totalSingleSheerCurtainWindowsCount() }} Sheer only
                </div>
                <div class="kpi-mini-sub" *ngIf="totalSingleSheerCurtainWindowsCount() > 0 && totalSingleMainCurtainWindowsCount() === 0">
                  Sheer curtain only
                </div>
                <div class="kpi-mini-sub" *ngIf="totalSingleSheerCurtainWindowsCount() === 0">
                  Single layer (Main curtain)
                </div>
              </div>

              <div class="kpi-mini-card highlight-double-card">
                <div class="kpi-mini-lbl">Double Curtain Windows</div>
                <div class="kpi-mini-val">{{ totalDoubleCurtainWindowsCount() }} <span class="unit-sm">windows</span></div>
                <div class="kpi-mini-sub">Counts as 1 window only (Main + Sheer)</div>
              </div>

              <div class="kpi-mini-card highlight-blinds" *ngIf="totalBlindWindowsCount() > 0">
                <div class="kpi-mini-lbl">Total Blind Windows</div>
                <div class="kpi-mini-val">{{ totalBlindWindowsCount() }} <span class="unit-sm">windows</span></div>
                <div class="kpi-mini-sub">{{ totalRomanBlindWindowsCount() }} Roman · {{ totalOtherBlindWindowsCount() }} Other</div>
              </div>

              <div class="kpi-mini-card" *ngIf="grandTotalMainCurtainMeters() > 0">
                <div class="kpi-mini-lbl">Main Curtain Quantity</div>
                <div class="kpi-mini-val">{{ grandTotalMainCurtainMeters() | number:'1.2-2' }} <span class="unit-sm">m</span></div>
                <div class="kpi-mini-sub">Across {{ totalDoubleCurtainWindowsCount() + totalSingleMainCurtainWindowsCount() }} window{{ (totalDoubleCurtainWindowsCount() + totalSingleMainCurtainWindowsCount()) !== 1 ? 's' : '' }}</div>
              </div>

              <div class="kpi-mini-card highlight-sheer-card" *ngIf="grandTotalSheerCurtainMeters() > 0">
                <div class="kpi-mini-lbl">Sheer Curtain Quantity</div>
                <div class="kpi-mini-val">{{ grandTotalSheerCurtainMeters() | number:'1.2-2' }} <span class="unit-sm">m</span></div>
                <div class="kpi-mini-sub">Across {{ totalDoubleCurtainWindowsCount() + totalSingleSheerCurtainWindowsCount() }} window{{ (totalDoubleCurtainWindowsCount() + totalSingleSheerCurtainWindowsCount()) !== 1 ? 's' : '' }}</div>
              </div>

              <div class="kpi-mini-card highlight-curtain" *ngIf="grandTotalCurtainMeters() > 0">
                <div class="kpi-mini-lbl">Total Curtain Cloth</div>
                <div class="kpi-mini-val">{{ grandTotalCurtainMeters() | number:'1.2-2' }} <span class="unit-sm">meters</span></div>
                <div class="kpi-mini-sub" *ngIf="grandTotalSheerCurtainMeters() > 0 && grandTotalMainCurtainMeters() > 0">
                  Main: <strong>{{ grandTotalMainCurtainMeters() | number:'1.2-2' }} m</strong> + Sheer: <strong>{{ grandTotalSheerCurtainMeters() | number:'1.2-2' }} m</strong>
                </div>
                <div class="kpi-mini-sub" *ngIf="grandTotalSheerCurtainMeters() === 0">
                  Across {{ totalCurtainWindowsCount() }} curtain window{{ totalCurtainWindowsCount() !== 1 ? 's' : '' }} (Main only)
                </div>
                <div class="kpi-mini-sub" *ngIf="grandTotalMainCurtainMeters() === 0">
                  Across {{ totalCurtainWindowsCount() }} curtain window{{ totalCurtainWindowsCount() !== 1 ? 's' : '' }} (Sheer only)
                </div>
              </div>

              <div class="kpi-mini-card" *ngIf="grandTotalRomanBlindsArea() > 0">
                <div class="kpi-mini-lbl">Roman Blinds Total</div>
                <div class="kpi-mini-val">{{ grandTotalRomanBlindsArea() | number:'1.2-2' }} <span class="unit-sm">sq ft</span></div>
                <div class="kpi-mini-sub">Across {{ totalRomanBlindWindowsCount() }} Roman blind window{{ totalRomanBlindWindowsCount() !== 1 ? 's' : '' }}</div>
              </div>

              <div class="kpi-mini-card" *ngIf="grandTotalOtherBlindsArea() > 0">
                <div class="kpi-mini-lbl">Other Blinds Total</div>
                <div class="kpi-mini-val">{{ grandTotalOtherBlindsArea() | number:'1.2-2' }} <span class="unit-sm">sq ft</span></div>
                <div class="kpi-mini-sub">Across {{ totalOtherBlindWindowsCount() }} other blind window{{ totalOtherBlindWindowsCount() !== 1 ? 's' : '' }}</div>
              </div>

              <div class="kpi-mini-card highlight-blinds" *ngIf="grandTotalBlindsArea() > 0">
                <div class="kpi-mini-lbl">Grand Total Blinds Area</div>
                <div class="kpi-mini-val">{{ grandTotalBlindsArea() | number:'1.2-2' }} <span class="unit-sm">sq ft</span></div>
                <div class="kpi-mini-sub" *ngIf="totalRomanBlindWindowsCount() > 0 && totalOtherBlindWindowsCount() > 0">
                  Roman: {{ grandTotalRomanBlindsArea() | number:'1.2-2' }} sq ft + Other: {{ grandTotalOtherBlindsArea() | number:'1.2-2' }} sq ft
                </div>
                <div class="kpi-mini-sub" *ngIf="!(totalRomanBlindWindowsCount() > 0 && totalOtherBlindWindowsCount() > 0)">
                  Across {{ totalBlindWindowsCount() }} blind window{{ totalBlindWindowsCount() !== 1 ? 's' : '' }}
                </div>
              </div>

              <div class="kpi-mini-card">
                <div class="kpi-mini-lbl">Total Windows</div>
                <div class="kpi-mini-val">{{ totalWindowsCount() }} <span class="unit-sm">windows</span></div>
                <div class="kpi-mini-sub">{{ roomsWithWindowsCount() }} room{{ roomsWithWindowsCount() !== 1 ? 's' : '' }} · Double window = 1 window</div>
              </div>

              <div class="kpi-mini-card" style="background:#fffbeb; border-color:#fcd34d;" *ngIf="grandTotalWallpaperArea() > 0">
                <div class="kpi-mini-lbl">Overall Total Wallpaper Area</div>
                <div class="kpi-mini-val">{{ grandTotalWallpaperArea() | number:'1.2-2' }} <span class="unit-sm">sq ft</span></div>
                <div class="kpi-mini-sub">Custom wallpaper (not counted as windows)</div>
              </div>
            </div>

            <!-- Full Master Summary Table -->
            <div class="table-wrap summary-table-wrap">
              <table class="summary-table master-summary-table">
                <thead>
                  <tr>
                    <th>Room / Location</th>
                    <th>Window</th>
                    <th>Treatment</th>
                    <th class="text-right">Width</th>
                    <th class="text-right">Height</th>
                    <th class="text-center">Panels</th>
                    <th class="text-right">Requirement</th>
                  </tr>
                </thead>
                <tbody>
                  <ng-container *ngFor="let room of rooms">
                    <ng-container *ngIf="room.windows.length > 0">
                      <!-- Room Header Row -->
                      <tr class="room-group-header-row">
                        <td colspan="7">
                          <div class="room-group-title">
                            <span>🏠 <strong>{{ room.name }}</strong> ({{ roomWindowCount(room) }} window{{ roomWindowCount(room) !== 1 ? 's' : '' }})</span>
                          </div>
                        </td>
                      </tr>

                      <!-- Window Rows -->
                      <ng-container *ngFor="let w of room.windows; let wi = index">
                        <tr class="window-item-row">
                          <td class="room-col-indent text-muted">↳ {{ room.name }}</td>
                          <td>
                            <strong>{{ w.windowName }}</strong>
                            <span *ngIf="w.isDoubleCurtain" class="double-tag">Double (1 Window)</span>
                            <span *ngIf="!w.isDoubleCurtain && w.treatmentType === 'Curtain' && w.curtainType === 'Sheer'" class="sheer-tag">Sheer Only</span>
                          </td>
                          <td>
                            <span class="treatment-badge" 
                              [class.badge-curtain]="w.treatmentType === 'Curtain' && (w.isDoubleCurtain || w.curtainType !== 'Sheer')" 
                              [class.badge-sheer]="w.treatmentType === 'Curtain' && !w.isDoubleCurtain && w.curtainType === 'Sheer'"
                              [class.badge-wallpaper]="w.treatmentType === 'Wallpaper'" 
                              [class.badge-blind]="w.treatmentType !== 'Curtain' && w.treatmentType !== 'Wallpaper'">
                              {{ w.treatmentType === 'Curtain' ? '🪟' : w.treatmentType === 'Wallpaper' ? '🖼️' : '📐' }} 
                              {{ w.treatmentType === 'Curtain' ? (!w.isDoubleCurtain && w.curtainType === 'Sheer' ? 'Sheer Curtain' : 'Curtain') : w.treatmentType }}
                              <span *ngIf="w.isDoubleCurtain" class="main-label">(Main)</span>
                              <span *ngIf="!w.isDoubleCurtain && w.treatmentType === 'Curtain' && w.curtainType !== 'Sheer'" class="main-label">(Main)</span>
                            </span>
                          </td>
                          <td class="text-right font-mono">{{ w.width }}"</td>
                          <td class="text-right font-mono">{{ w.height }}"</td>
                          <td class="text-center font-mono">
                            <span *ngIf="w.treatmentType === 'Curtain'" class="panel-badge">{{ w.panels }}</span>
                            <span *ngIf="w.treatmentType !== 'Curtain'" class="text-muted">—</span>
                          </td>
                          <td class="text-right font-mono requirement-cell">
                            <span *ngIf="!w.isDoubleCurtain">
                              <strong>{{ w.requirement | number:'1.2-2' }}</strong> {{ w.unit }}
                              <span *ngIf="w.treatmentType === 'Curtain'" class="sub-label" [style.color]="w.curtainType === 'Sheer' ? '#6d28d9' : '#15803d'">
                                ({{ w.curtainType === 'Sheer' ? 'Sheer Curtain' : 'Main Curtain' }})
                              </span>
                            </span>
                            <span *ngIf="w.isDoubleCurtain"><strong>{{ getMainRequirement(w) | number:'1.2-2' }}</strong> m <span class="sub-label">(Main Curtain)</span></span>
                          </td>
                        </tr>
                        <!-- Sheer row for double curtain -->
                        <tr *ngIf="w.isDoubleCurtain" class="sheer-row">
                          <td class="room-col-indent text-muted"></td>
                          <td class="sheer-indent">↳ Sheer: {{ w.sheerWidth ?? w.width }}" × {{ w.sheerHeight ?? w.height }}" · {{ w.sheerPanels ?? w.panels }} panels</td>
                          <td><span class="treatment-badge badge-sheer">🪟 Sheer Curtain</span></td>
                          <td class="text-right font-mono">{{ w.sheerWidth ?? w.width }}"</td>
                          <td class="text-right font-mono">{{ w.sheerHeight ?? w.height }}"</td>
                          <td class="text-center font-mono"><span class="panel-badge">{{ w.sheerPanels ?? w.panels }}</span></td>
                          <td class="text-right font-mono requirement-cell"><strong>{{ getSheerRequirement(w) | number:'1.2-2' }}</strong> m <span class="sub-label">(Sheer Curtain)</span></td>
                        </tr>
                        <!-- Double curtain total row -->
                        <tr *ngIf="w.isDoubleCurtain" class="double-total-row">
                          <td colspan="5" class="text-right text-muted" style="font-size:0.78rem;">{{ w.windowName }} Total Quantity (1 Window = Main + Sheer):</td>
                          <td colspan="2" class="text-right font-mono" style="font-weight:800; color:#166534;">{{ w.requirement | number:'1.2-2' }} m</td>
                        </tr>
                      </ng-container>

                      <!-- Room Total Row -->
                      <tr class="room-total-table-row">
                        <td colspan="5" class="text-right font-bold text-muted">
                          {{ room.name }} Subtotal:
                        </td>
                        <td colspan="2" class="text-right font-mono font-bold">
                          <span *ngIf="roomCurtainMeters(room) > 0" class="st-curtain-text">
                            {{ roomCurtainMeters(room) | number:'1.2-2' }} m
                          </span>
                          <span *ngIf="roomCurtainMeters(room) > 0 && roomBlindsArea(room) > 0"> · </span>
                          <span *ngIf="roomBlindsArea(room) > 0" class="st-blinds-text">
                            {{ roomBlindsArea(room) | number:'1.2-2' }} sq ft (blinds<span *ngIf="roomRomanBlindsArea(room) > 0 && roomOtherBlindsArea(room) > 0">: {{ roomRomanBlindsArea(room) | number:'1.2-2' }} Roman + {{ roomOtherBlindsArea(room) | number:'1.2-2' }} Other</span>)
                          </span>
                          <span *ngIf="(roomCurtainMeters(room) > 0 || roomBlindsArea(room) > 0) && roomWallpaperArea(room) > 0"> · </span>
                          <span *ngIf="roomWallpaperArea(room) > 0" class="st-wallpaper-text">
                            {{ roomWallpaperArea(room) | number:'1.2-2' }} sq ft wallpaper
                          </span>
                        </td>
                      </tr>
                    </ng-container>
                  </ng-container>
                </tbody>
                <tfoot>
                  <tr class="grand-summary-stat-row" *ngIf="totalCurtainWindowsCount() > 0">
                    <td colspan="5" class="text-right stat-lbl">SINGLE CURTAIN WINDOWS:</td>
                    <td colspan="2" class="text-right font-mono stat-val">
                      {{ totalSingleCurtainWindowsCount() }} window{{ totalSingleCurtainWindowsCount() !== 1 ? 's' : '' }}
                      <span *ngIf="totalSingleSheerCurtainWindowsCount() > 0" class="stat-note" style="color:#71717a; margin-left:6px;">
                        ({{ totalSingleMainCurtainWindowsCount() }} Main · {{ totalSingleSheerCurtainWindowsCount() }} Sheer)
                      </span>
                    </td>
                  </tr>
                  <tr class="grand-summary-stat-row" *ngIf="totalDoubleCurtainWindowsCount() > 0">
                    <td colspan="5" class="text-right stat-lbl">DOUBLE CURTAIN WINDOWS:</td>
                    <td colspan="2" class="text-right font-mono stat-val purple-text">{{ totalDoubleCurtainWindowsCount() }} window{{ totalDoubleCurtainWindowsCount() !== 1 ? 's' : '' }} <span class="stat-note">(1 window only)</span></td>
                  </tr>
                  <tr class="grand-summary-stat-row" *ngIf="grandTotalMainCurtainMeters() > 0">
                    <td colspan="5" class="text-right stat-lbl">MAIN CURTAIN QUANTITY:</td>
                    <td colspan="2" class="text-right font-mono stat-val">{{ grandTotalMainCurtainMeters() | number:'1.2-2' }} meters</td>
                  </tr>
                  <tr class="grand-summary-stat-row" *ngIf="grandTotalSheerCurtainMeters() > 0">
                    <td colspan="5" class="text-right stat-lbl">SHEER CURTAIN QUANTITY:</td>
                    <td colspan="2" class="text-right font-mono stat-val purple-text">{{ grandTotalSheerCurtainMeters() | number:'1.2-2' }} meters</td>
                  </tr>
                  <tr class="grand-total-row" *ngIf="grandTotalCurtainMeters() > 0">
                    <td colspan="5" class="text-right grand-lbl">GRAND TOTAL CURTAIN CLOTH:</td>
                    <td colspan="2" class="text-right font-mono grand-val green-text">
                      {{ grandTotalCurtainMeters() | number:'1.2-2' }} meters
                      <div *ngIf="grandTotalSheerCurtainMeters() > 0 && grandTotalMainCurtainMeters() > 0" class="grand-sub-split">
                        (Main: {{ grandTotalMainCurtainMeters() | number:'1.2-2' }} m + Sheer: {{ grandTotalSheerCurtainMeters() | number:'1.2-2' }} m)
                      </div>
                    </td>
                  </tr>
                  <tr class="grand-window-summary-row" *ngIf="totalWindowsCount() > 0">
                    <td colspan="5" class="text-right grand-sub-lbl">TOTAL WINDOWS COUNT:</td>
                    <td colspan="2" class="text-right font-mono grand-sub-val">
                      <strong>{{ totalWindowsCount() }} window{{ totalWindowsCount() !== 1 ? 's' : '' }}</strong>
                      <span class="win-type-breakdown">({{ totalSingleCurtainWindowsCount() }} Single Curtain<span *ngIf="totalSingleSheerCurtainWindowsCount() > 0"> [{{ totalSingleMainCurtainWindowsCount() }} Main, {{ totalSingleSheerCurtainWindowsCount() }} Sheer]</span> · {{ totalDoubleCurtainWindowsCount() }} Double Curtain<span *ngIf="totalBlindWindowsCount() > 0"> · {{ totalBlindWindowsCount() }} Blinds ({{ totalRomanBlindWindowsCount() }} Roman, {{ totalOtherBlindWindowsCount() }} Other)</span>)</span>
                    </td>
                  </tr>
                  <tr class="grand-summary-stat-row" *ngIf="totalBlindWindowsCount() > 0">
                    <td colspan="5" class="text-right stat-lbl">TOTAL BLIND WINDOWS:</td>
                    <td colspan="2" class="text-right font-mono stat-val blue-text">
                      {{ totalBlindWindowsCount() }} window{{ totalBlindWindowsCount() !== 1 ? 's' : '' }}
                      <span class="stat-note" style="color:#7dd3fc; margin-left:6px;">({{ totalRomanBlindWindowsCount() }} Roman · {{ totalOtherBlindWindowsCount() }} Other)</span>
                    </td>
                  </tr>
                  <tr class="grand-summary-stat-row" *ngIf="grandTotalRomanBlindsArea() > 0 || totalRomanBlindWindowsCount() > 0">
                    <td colspan="5" class="text-right stat-lbl">ROMAN BLINDS TOTAL:</td>
                    <td colspan="2" class="text-right font-mono stat-val">
                      {{ grandTotalRomanBlindsArea() | number:'1.2-2' }} sq ft
                      <span class="stat-note" style="margin-left:6px;">({{ totalRomanBlindWindowsCount() }} window{{ totalRomanBlindWindowsCount() !== 1 ? 's' : '' }})</span>
                    </td>
                  </tr>
                  <tr class="grand-summary-stat-row" *ngIf="grandTotalOtherBlindsArea() > 0 || totalOtherBlindWindowsCount() > 0">
                    <td colspan="5" class="text-right stat-lbl">OTHER BLINDS TOTAL:</td>
                    <td colspan="2" class="text-right font-mono stat-val">
                      {{ grandTotalOtherBlindsArea() | number:'1.2-2' }} sq ft
                      <span class="stat-note" style="margin-left:6px;">({{ totalOtherBlindWindowsCount() }} window{{ totalOtherBlindWindowsCount() !== 1 ? 's' : '' }})</span>
                    </td>
                  </tr>
                  <tr class="grand-total-row" *ngIf="grandTotalBlindsArea() > 0">
                    <td colspan="5" class="text-right grand-lbl">GRAND TOTAL BLINDS AREA:</td>
                    <td colspan="2" class="text-right font-mono grand-val blue-text">
                      {{ grandTotalBlindsArea() | number:'1.2-2' }} sq ft
                      <div *ngIf="totalRomanBlindWindowsCount() > 0 && totalOtherBlindWindowsCount() > 0" class="grand-sub-split" style="color:#bae6fd;">
                        (Roman: {{ grandTotalRomanBlindsArea() | number:'1.2-2' }} sq ft + Other: {{ grandTotalOtherBlindsArea() | number:'1.2-2' }} sq ft)
                      </div>
                    </td>
                  </tr>
                  <tr class="grand-total-row" *ngIf="grandTotalWallpaperArea() > 0">
                    <td colspan="5" class="text-right grand-lbl">GRAND TOTAL WALLPAPER AREA:</td>
                    <td colspan="2" class="text-right font-mono grand-val" style="color:#d97706;">
                      {{ grandTotalWallpaperArea() | number:'1.2-2' }} sq ft
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Bottom Save / Quotation Actions Bar -->
            <div class="summary-footer-actions">
              <div class="quote-info-snippet">
                <span class="snippet-label">Quotation No:</span>
                <span class="snippet-val">{{ quotationNumber || 'Auto-generated' }}</span>
                <span class="snippet-dot">·</span>
                <span class="snippet-label">Customer:</span>
                <span class="snippet-val">{{ selectedCustomer?.name || 'Draft (Unassigned)' }}</span>
              </div>
              <div class="footer-btns">
                <button type="button" class="btn btn-secondary" (click)="scrollToRoomManager()">
                  + Add Room / Window
                </button>
                <button type="button" class="btn btn-primary btn-lg" (click)="saveQuotation()" [disabled]="saving">
                  {{ saving ? 'Saving Quotation...' : '💾 Save Quotation' }}
                </button>
              </div>
            </div>

          </div>

        </ng-container>

        <!-- Sticky Floating Summary Dock -->
        <div class="sticky-summary-dock" *ngIf="totalItemsCount() > 0">
          <div class="sticky-summary-content">
            <div class="sticky-metric-group">
              <div class="sticky-metric-item">
                <span class="sticky-metric-lbl">Rooms &amp; Windows</span>
                <span class="sticky-metric-val">{{ rooms.length }} rooms · {{ totalWindowsCount() }} windows</span>
              </div>
              <div class="sticky-metric-item" *ngIf="grandTotalCurtainMeters() > 0">
                <span class="sticky-metric-lbl">Total Curtain Cloth</span>
                <span class="sticky-metric-val green">{{ grandTotalCurtainMeters() | number:'1.2-2' }} m</span>
              </div>
              <div class="sticky-metric-item" *ngIf="grandTotalBlindsArea() > 0">
                <span class="sticky-metric-lbl">Total Blinds</span>
                <span class="sticky-metric-val">{{ grandTotalBlindsArea() | number:'1.2-2' }} sq ft</span>
              </div>
              <div class="sticky-metric-item" *ngIf="grandTotalWallpaperArea() > 0">
                <span class="sticky-metric-lbl">Total Wallpaper</span>
                <span class="sticky-metric-val">{{ grandTotalWallpaperArea() | number:'1.2-2' }} sq ft</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <button type="button" class="btn btn-secondary btn-sm" (click)="resetAll()">Reset</button>
              <button type="button" class="btn btn-primary" (click)="saveQuotation()" [disabled]="saving">
                {{ saving ? 'Saving...' : '💾 Save Quotation' }}
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- SUCCESS CONFIRMATION MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Save Mode Modal (shown when editing an existing quotation) -->
    <div class="modal-overlay" *ngIf="showSaveModeModal">
      <div class="modal" style="max-width:440px; text-align:center; padding:32px 28px;">
        <div style="font-size:2rem; margin-bottom:12px;">💾</div>
        <h2 style="font-size:1.15rem; font-weight:800; margin-bottom:8px;">How would you like to save?</h2>
        <p style="font-size:0.85rem; color:#888; margin-bottom:24px;">You're editing an existing quotation. Choose whether to update it or save as a new one.</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn btn-primary" (click)="performSave('update')">✏️ Update existing quotation</button>
          <button class="btn btn-secondary" (click)="performSave('new')">➕ Save as new quotation</button>
          <button class="btn btn-secondary" style="color:#999;" (click)="showSaveModeModal=false">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div class="modal-overlay" *ngIf="showSuccessModal" (keydown.enter)="goToCustomerProfile()">
      <div class="modal success-modal">
        <div class="success-icon-wrap">
          <div class="success-checkmark">✓</div>
        </div>
        <h2 class="success-title">Quotation Saved Successfully!</h2>
        <p class="success-sub">
          Quotation <strong>{{ savedQuotationNumber }}</strong> with <strong>{{ totalWindowsCount() }} window(s)</strong> across <strong>{{ roomsWithWindowsCount() }} room(s)</strong> has been saved under 
          <strong>{{ selectedCustomer?.name }}</strong>'s profile.
        </p>

        <!-- Summary Preview Box -->
        <div class="success-summary-card">
          <div class="sc-row">
            <span class="sc-lbl">Quotation Number:</span>
            <span class="sc-val font-mono">{{ savedQuotationNumber }}</span>
          </div>
          <div class="sc-row">
            <span class="sc-lbl">Customer:</span>
            <span class="sc-val">{{ selectedCustomer?.name }}</span>
          </div>
          <div class="sc-row">
            <span class="sc-lbl">Total Rooms:</span>
            <span class="sc-val">{{ roomsWithWindowsCount() }}</span>
          </div>
          <div class="sc-row">
            <span class="sc-lbl">Total Windows (All Treatments):</span>
            <span class="sc-val bold">{{ totalWindowsCount() }} window(s)</span>
          </div>
          <div class="sc-row" *ngIf="totalSingleCurtainWindowsCount() > 0">
            <span class="sc-lbl">Single Curtain Windows:</span>
            <span class="sc-val font-bold">
              {{ totalSingleCurtainWindowsCount() }}
              <span *ngIf="totalSingleSheerCurtainWindowsCount() > 0" style="font-size:0.8rem; font-weight:normal; color:#71717a; margin-left:6px;">
                ({{ totalSingleMainCurtainWindowsCount() }} Main · {{ totalSingleSheerCurtainWindowsCount() }} Sheer)
              </span>
            </span>
          </div>
          <div class="sc-row" *ngIf="totalDoubleCurtainWindowsCount() > 0">
            <span class="sc-lbl">Double Curtain Windows:</span>
            <span class="sc-val font-bold" style="color:#6d28d9;">{{ totalDoubleCurtainWindowsCount() }} (1 window only)</span>
          </div>
          <div class="sc-row" *ngIf="totalBlindWindowsCount() > 0">
            <span class="sc-lbl">Total Blind Windows:</span>
            <span class="sc-val font-bold" style="color:#0284c7;">{{ totalBlindWindowsCount() }} window(s) ({{ totalRomanBlindWindowsCount() }} Roman · {{ totalOtherBlindWindowsCount() }} Other)</span>
          </div>
          <div class="sc-row" *ngIf="grandTotalMainCurtainMeters() > 0">
            <span class="sc-lbl">Main Curtain Quantity:</span>
            <span class="sc-val bold">{{ grandTotalMainCurtainMeters() | number:'1.2-2' }} meters</span>
          </div>
          <div class="sc-row" *ngIf="grandTotalSheerCurtainMeters() > 0">
            <span class="sc-lbl">Sheer Curtain Quantity:</span>
            <span class="sc-val bold" style="color:#6d28d9;">{{ grandTotalSheerCurtainMeters() | number:'1.2-2' }} meters</span>
          </div>
          <div class="sc-row" *ngIf="grandTotalCurtainMeters() > 0">
            <span class="sc-lbl">Total Curtain Cloth:</span>
            <span class="sc-val bold green-text">
              {{ grandTotalCurtainMeters() | number:'1.2-2' }} meters
              <span *ngIf="totalDoubleCurtainWindowsCount() > 0" style="display:block; font-size:0.75rem; color:#16a34a; font-weight:600;">
                (Main: {{ grandTotalMainCurtainMeters() | number:'1.2-2' }} m + Sheer: {{ grandTotalSheerCurtainMeters() | number:'1.2-2' }} m)
              </span>
            </span>
          </div>
          <div class="sc-row" *ngIf="grandTotalRomanBlindsArea() > 0">
            <span class="sc-lbl">Roman Blinds Total:</span>
            <span class="sc-val bold">{{ grandTotalRomanBlindsArea() | number:'1.2-2' }} sq ft ({{ totalRomanBlindWindowsCount() }} window(s))</span>
          </div>
          <div class="sc-row" *ngIf="grandTotalOtherBlindsArea() > 0">
            <span class="sc-lbl">Other Blinds Total:</span>
            <span class="sc-val bold">{{ grandTotalOtherBlindsArea() | number:'1.2-2' }} sq ft ({{ totalOtherBlindWindowsCount() }} window(s))</span>
          </div>
          <div class="sc-row" *ngIf="grandTotalBlindsArea() > 0">
            <span class="sc-lbl">Grand Total Blinds Area:</span>
            <span class="sc-val bold" style="color:#0284c7;">
              {{ grandTotalBlindsArea() | number:'1.2-2' }} sq ft
              <span *ngIf="totalRomanBlindWindowsCount() > 0 && totalOtherBlindWindowsCount() > 0" style="display:block; font-size:0.75rem; color:#0284c7; font-weight:600;">
                (Roman: {{ grandTotalRomanBlindsArea() | number:'1.2-2' }} sq ft + Other: {{ grandTotalOtherBlindsArea() | number:'1.2-2' }} sq ft)
              </span>
            </span>
          </div>
          <div class="sc-row" *ngIf="grandTotalWallpaperArea() > 0">
            <span class="sc-lbl">Total Wallpaper Area:</span>
            <span class="sc-val bold">{{ grandTotalWallpaperArea() | number:'1.2-2' }} sq ft</span>
          </div>
        </div>

        <div class="success-modal-actions">
          <button type="button" class="btn btn-primary" (click)="goToCustomerProfile()">
            👤 View in Customer Profile
          </button>
          <button type="button" class="btn btn-secondary" (click)="goToQuotationsList()">
            📋 View All Quotations
          </button>
          <button type="button" class="btn btn-secondary" (click)="startAnotherCalculation()">
            🔄 Start New Calculation
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calc-page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; flex-wrap:wrap; gap:16px; }
    .badge-pill { display:inline-block; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; background:#e4e4e7; color:#3f3f46; padding:3px 10px; border-radius:99px; margin-bottom:6px; }
    .calc-title { font-size:1.55rem; font-weight:800; color:#111118; letter-spacing:-0.4px; }
    .calc-subtitle { font-size:0.82rem; color:#71717a; margin-top:2px; }
    .header-actions { display:flex; gap:10px; align-items:center; }

    /* Step Card */
    .step-card { background:#fff; border:1px solid #e4e4e7; border-radius:14px; padding:24px; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
    .step-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
    .step-indicator { display:flex; align-items:center; gap:12px; }
    .step-num { width:32px; height:32px; border-radius:8px; background:#111118; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.95rem; font-weight:800; flex-shrink:0; }
    .step-title { font-size:1.1rem; font-weight:700; color:#111118; margin:0; }
    .step-desc { font-size:0.78rem; color:#a1a1aa; margin:2px 0 0; }
    .step-badge { font-size:0.75rem; font-weight:700; color:#16a34a; background:#dcfce7; padding:4px 10px; border-radius:99px; }

    /* Tabs */
    .toggle-tabs { display:flex; border:1px solid #e4e4e7; border-radius:8px; overflow:hidden; margin-bottom:18px; max-width:440px; }
    .tab-btn { flex:1; padding:10px; background:#fafafa; border:none; cursor:pointer; font-size:0.85rem; font-weight:600; color:#71717a; font-family:inherit; transition:all 0.15s; }
    .tab-btn.active { background:#111118; color:#fff; }
    .tab-btn:first-child { border-right:1px solid #e4e4e7; }

    /* Customer search box */
    .search-box label { font-size:0.75rem; font-weight:600; color:#71717a; margin-bottom:6px; display:block; }
    .search-input-wrap { position:relative; display:flex; align-items:center; max-width:540px; }
    .search-icon { position:absolute; left:12px; font-size:0.9rem; pointer-events:none; }
    .search-input { padding-left:36px; padding-right:32px; }
    .clear-btn { position:absolute; right:10px; background:none; border:none; color:#a1a1aa; cursor:pointer; font-size:0.9rem; }

    /* Customer results */
    .cust-results-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px; margin-top:14px; max-height:260px; overflow-y:auto; padding:2px; }
    .cust-result-card { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid #e4e4e7; border-radius:10px; background:#fff; cursor:pointer; transition:all 0.15s; }
    .cust-result-card:hover { background:#f9f9fb; border-color:#d4d4d8; transform:translateY(-1px); box-shadow:0 2px 6px rgba(0,0,0,0.04); }
    .cust-avatar { width:38px; height:38px; border-radius:8px; background:#111118; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1rem; font-weight:800; flex-shrink:0; }
    .cust-meta { flex:1; min-width:0; }
    .cust-name { font-size:0.9rem; font-weight:700; color:#111118; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cust-phone { font-size:0.75rem; color:#71717a; margin-top:1px; }
    .cust-addr { font-size:0.72rem; color:#a1a1aa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .select-btn { flex-shrink:0; }
    .no-cust-found { text-align:center; padding:28px 16px; color:#a1a1aa; font-size:0.85rem; }

    /* Active customer banner */
    .active-cust-banner { display:flex; align-items:center; justify-content:space-between; background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:14px 18px; gap:14px; flex-wrap:wrap; }
    .active-cust-info { display:flex; align-items:center; gap:12px; }
    .active-avatar { width:42px; height:42px; border-radius:10px; background:#16a34a; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.1rem; font-weight:800; }
    .active-name { font-size:1rem; font-weight:800; color:#111118; }
    .active-sub { font-size:0.78rem; color:#3f3f46; margin-top:2px; }
    .active-actions { display:flex; gap:8px; align-items:center; }

    /* Quotation Header Card */
    .quotation-header-card { margin-bottom:20px; background:#fafafa; border:1px solid #e4e4e7; }
    .quote-header-grid { display:grid; grid-template-columns:180px 1fr 160px 1fr; gap:14px; }
    .font-mono { font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .bold-text { font-weight:700; }
    .input-with-action { display:flex; gap:4px; }
    .btn-icon { background:#fff; border:1px solid #e4e4e7; border-radius:6px; width:34px; height:34px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.95rem; }
    .btn-icon:hover { background:#f4f4f5; }

    /* Room Manager Card */
    .room-manager-card { margin-bottom:20px; }
    .add-room-inline { display:flex; flex-direction:column; gap:10px; }
    .room-input-group { display:flex; gap:8px; max-width:540px; }
    .room-chips-list { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .chip-label { font-size:0.72rem; color:#a1a1aa; font-weight:600; }
    .room-suggestion-chip { background:#f4f4f5; border:1px solid #e4e4e7; border-radius:99px; padding:4px 11px; font-size:0.75rem; font-weight:600; color:#52525b; cursor:pointer; transition:all 0.15s; font-family:inherit; }
    .room-suggestion-chip:hover { background:#e4e4e7; color:#111118; }

    .active-rooms-bar { display:flex; align-items:center; gap:10px; margin-top:16px; padding-top:14px; border-top:1px solid #f4f4f5; flex-wrap:wrap; }
    .rooms-tab-label { font-size:0.75rem; font-weight:700; color:#71717a; text-transform:uppercase; letter-spacing:0.5px; }
    .rooms-pill-list { display:flex; gap:8px; flex-wrap:wrap; }
    .room-nav-pill { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; background:#f4f4f5; border:1px solid #e4e4e7; border-radius:8px; cursor:pointer; font-family:inherit; transition:all 0.15s; }
    .room-nav-pill:hover { background:#e4e4e7; }
    .room-nav-pill.pill-active { background:#111118; color:#fff; border-color:#111118; }
    .pill-name { font-size:0.82rem; font-weight:700; }
    .pill-count { font-size:0.7rem; background:rgba(0,0,0,0.08); padding:1px 6px; border-radius:4px; font-weight:600; }
    .room-nav-pill.pill-active .pill-count { background:rgba(255,255,255,0.2); color:#fff; }

    /* Window Form Card */
    .window-form-card { transition:border-color 0.2s, box-shadow 0.2s; }
    .window-form-card.edit-highlight { border-color:#d97706; box-shadow:0 0 0 2px rgba(217, 119, 6, 0.15); }
    .window-form-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .edit-badge { font-size:0.75rem; font-weight:700; color:#b45309; background:#fef3c7; padding:4px 10px; border-radius:99px; }

    /* Treatment Cards Grid */
    .treatment-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-top:4px; }
    @media (max-width: 990px) { .treatment-grid { grid-template-columns:repeat(2, 1fr); } }
    @media (max-width: 540px) { .treatment-grid { grid-template-columns:1fr; } }
    .treatment-card { display:flex; align-items:center; gap:12px; padding:14px 16px; border:2px solid #e2e8f0; border-radius:12px; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); background:#fff; position:relative; }
    .treatment-card:hover { transform:translateY(-1.5px); box-shadow:0 6px 16px rgba(15, 23, 42, 0.06); }
    
    .treatment-card.treatment-curtain:hover, .treatment-card.treatment-curtain.active { border-color:#10b981; background:linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); }
    .treatment-card.treatment-curtain.active { box-shadow:0 4px 14px rgba(16, 185, 129, 0.2); }
    .treatment-card.treatment-curtain.active .treatment-radio { border-color:#059669; }
    .treatment-card.treatment-curtain.active .treatment-radio::after { background:#059669; }

    .treatment-card.treatment-roman:hover, .treatment-card.treatment-roman.active { border-color:#f59e0b; background:linear-gradient(135deg, #ffffff 0%, #fffbeb 100%); }
    .treatment-card.treatment-roman.active { box-shadow:0 4px 14px rgba(245, 158, 11, 0.2); }
    .treatment-card.treatment-roman.active .treatment-radio { border-color:#d97706; }
    .treatment-card.treatment-roman.active .treatment-radio::after { background:#d97706; }

    .treatment-card.treatment-other-blind:hover, .treatment-card.treatment-other-blind.active { border-color:#0284c7; background:linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%); }
    .treatment-card.treatment-other-blind.active { box-shadow:0 4px 14px rgba(2, 132, 199, 0.2); }
    .treatment-card.treatment-other-blind.active .treatment-radio { border-color:#0284c7; }
    .treatment-card.treatment-other-blind.active .treatment-radio::after { background:#0284c7; }

    .treatment-card.treatment-wallpaper:hover, .treatment-card.treatment-wallpaper.active { border-color:#8b5cf6; background:linear-gradient(135deg, #ffffff 0%, #faf5ff 100%); }
    .treatment-card.treatment-wallpaper.active { box-shadow:0 4px 14px rgba(139, 92, 246, 0.2); }
    .treatment-card.treatment-wallpaper.active .treatment-radio { border-color:#7c3aed; }
    .treatment-card.treatment-wallpaper.active .treatment-radio::after { background:#7c3aed; }
    .treatment-icon { font-size:1.6rem; flex-shrink:0; }
    .treatment-info { flex:1; }
    .treatment-title { font-size:0.92rem; font-weight:700; color:#111118; }
    .treatment-desc { font-size:0.7rem; color:#71717a; margin-top:2px; line-height:1.3; }
    .treatment-radio { width:16px; height:16px; border:2px solid #d4d4d8; border-radius:50%; flex-shrink:0; position:relative; }
    .treatment-radio.checked { border-color:#111118; }
    .treatment-radio.checked::after { content:''; position:absolute; width:8px; height:8px; background:#111118; border-radius:50%; top:2px; left:2px; }

    /* Dimension Inputs */
    .input-unit-wrap { position:relative; display:flex; align-items:center; }
    .dimension-input { padding-right:75px; font-weight:600; }
    .unit-tag { position:absolute; right:10px; font-size:0.75rem; color:#a1a1aa; pointer-events:none; }
    .label-with-hint { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
    .hint-tag { font-size:0.68rem; color:#71717a; background:#f4f4f5; padding:2px 6px; border-radius:4px; }
    .hint-tag.custom { background:#fef3c7; color:#b45309; font-weight:600; }

    /* Stepper for Panels */
    .stepper-wrap { display:flex; align-items:center; gap:4px; }
    .step-btn { width:36px; height:36px; background:#f4f4f5; border:1px solid #e4e4e7; border-radius:6px; font-size:1.1rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:inherit; }
    .step-btn:hover:not(:disabled) { background:#e4e4e7; }
    .step-btn:disabled { opacity:0.4; cursor:not-allowed; }
    .panel-input { text-align:center; font-weight:700; font-size:0.95rem; }
    .blind-no-panel-box { padding:9px 12px; background:#fafafa; border:1px dashed #e4e4e7; border-radius:6px; color:#a1a1aa; font-size:0.78rem; height:38px; display:flex; align-items:center; }

    /* Live Calculation Box */
    .calc-result-box { background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:16px 20px; margin:20px 0 16px; display:flex; justify-content:space-between; align-items:center; gap:20px; flex-wrap:wrap; }
    .calc-result-main { display:flex; flex-direction:column; }
    .result-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.7px; color:#64748b; margin-bottom:2px; }
    .result-value-large { display:flex; align-items:baseline; gap:6px; }
    .res-num { font-size:2rem; font-weight:800; color:#0f172a; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing:-0.5px; }
    .res-unit { font-size:0.95rem; font-weight:600; color:#475569; }
    .calc-formula-explainer { flex:1; font-size:0.8rem; color:#334155; border-left:1px solid #cbd5e1; padding-left:20px; line-height:1.5; }
    .formula-line { margin-bottom:3px; }
    .highlight-math { color:#0f172a; font-size:0.88rem; }
    .formula-note { font-size:0.72rem; color:#64748b; margin-top:4px; font-style:italic; }

    /* Window Form Actions */
    .window-form-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; padding-top:14px; border-top:1px solid #f4f4f5; }
    .btn-lg { padding:10px 22px; font-size:0.92rem; }

    /* Room Breakdown Section */
    .section-top-title { margin:28px 0 16px; }
    .room-block-card { background:#fff; border:1px solid #e4e4e7; border-radius:14px; margin-bottom:20px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .room-block-header { display:flex; justify-content:space-between; align-items:center; padding:14px 20px; background:#fafafa; border-bottom:1px solid #e4e4e7; gap:12px; flex-wrap:wrap; }
    .room-title-wrap { display:flex; align-items:center; gap:10px; }
    .room-icon-badge { width:34px; height:34px; border-radius:8px; background:#111118; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1rem; }
    .room-title-text { font-size:1.05rem; font-weight:800; color:#111118; margin:0; }
    .room-meta-tag { font-size:0.72rem; color:#71717a; font-weight:600; }
    .room-header-actions { display:flex; gap:8px; align-items:center; }

    .room-table-wrap { border:none; border-radius:0; box-shadow:none; }
    .win-label-text { font-size:0.88rem; color:#111118; }
    .treatment-badge { display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:600; padding:3px 8px; border-radius:6px; }
    .badge-curtain { background:#f4f4f5; color:#18181b; }
    .badge-blind { background:#e0f2fe; color:#0369a1; }
    .badge-wallpaper { background:#fef3c7; color:#92400e; }
    .panel-badge { background:#111118; color:#fff; font-weight:700; font-size:0.78rem; padding:2px 8px; border-radius:4px; }
    .badge-sheer { background:#ede9fe; color:#6d28d9; }
    .double-tag { font-size:0.65rem; font-weight:700; background:#dbeafe; color:#1d4ed8; padding:2px 6px; border-radius:4px; margin-left:6px; vertical-align:middle; }
    .sheer-tag { font-size:0.65rem; font-weight:700; background:#ede9fe; color:#6d28d9; padding:2px 6px; border-radius:4px; margin-left:6px; vertical-align:middle; }
    .sheer-row td { background:#faf5ff; font-size:0.82rem; padding:6px 14px; border-bottom:1px solid #ede9fe; }
    .sheer-indent { color:#6d28d9; font-size:0.82rem; padding-left:24px !important; }
    .double-total-row td { background:#f5f3ff; font-size:0.8rem; padding:5px 14px; border-bottom:1px solid #ddd6fe; }
    .sub-label { font-size:0.68rem; color:#71717a; font-weight:400; margin-left:2px; }
    .window-type-toggle { display:flex; border:1px solid #e4e4e7; border-radius:8px; overflow:hidden; max-width:380px; margin-top:4px; }
    .wtype-btn { flex:1; padding:9px 14px; background:#fafafa; border:none; cursor:pointer; font-size:0.84rem; font-weight:600; color:#71717a; font-family:inherit; transition:all 0.15s; }
    .wtype-btn.active { background:#111118; color:#fff; }
    .wtype-btn:first-child { border-right:1px solid #e4e4e7; }
    .curtain-type-subtoggle { display:flex; gap:10px; margin-top:4px; max-width:480px; }
    .curtain-opt-btn { flex:1; display:flex; align-items:center; gap:8px; padding:10px 14px; border:1.5px solid #e4e4e7; background:#fafafa; border-radius:10px; cursor:pointer; font-family:inherit; font-size:0.85rem; font-weight:600; color:#52525b; transition:all 0.15s; }
    .curtain-opt-btn:hover { background:#f4f4f5; border-color:#d4d4d8; }
    .curtain-opt-btn.active { background:#111118; color:#fff; border-color:#111118; }
    .curtain-opt-btn.sheer-opt.active { background:#6d28d9; color:#fff; border-color:#6d28d9; }
    .opt-icon { font-size:1rem; }
    .opt-title { font-weight:700; }
    .opt-tag { font-size:0.68rem; padding:2px 7px; border-radius:99px; font-weight:700; margin-left:auto; }
    .default-tag { background:#e4e4e7; color:#3f3f46; }
    .curtain-opt-btn.active .default-tag { background:rgba(255,255,255,0.2); color:#fff; }
    .sheer-only-tag { background:#ede9fe; color:#6d28d9; }
    .curtain-opt-btn.sheer-opt.active .sheer-only-tag { background:rgba(255,255,255,0.25); color:#fff; }
    .curtain-section-label { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#71717a; background:#f4f4f5; padding:5px 10px; border-radius:6px; margin-bottom:10px; display:inline-block; }
    .sheer-label { background:#ede9fe; color:#6d28d9; margin-top:16px; }
    .requirement-cell { font-size:0.95rem; }
    .req-val { color:#111118; }
    .req-unit { font-size:0.78rem; color:#71717a; }
    .table-actions { display:flex; gap:6px; justify-content:center; }
    .room-empty-state { padding:24px; text-align:center; color:#a1a1aa; font-size:0.85rem; display:flex; flex-direction:column; align-items:center; gap:8px; }

    /* Room Subtotal Banner */
    .room-subtotal-bar { display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; gap:12px; flex-wrap:wrap; }
    .subtotal-label { display:flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:700; color:#334155; }
    .st-icon { font-size:1rem; }
    .st-room { color:#0f172a; }
    .subtotal-values { display:flex; gap:8px; flex-wrap:wrap; }
    .st-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:6px; font-size:0.82rem; }
    .st-curtain { background:#dcfce7; color:#166534; border:1px solid #86efac; }
    .st-blinds { background:#e0f2fe; color:#075985; border:1px solid #7dd3fc; }
    .st-wallpaper { background:#fef3c7; color:#92400e; border:1px solid #fcd34d; }

    /* Grand Summary Card */
    .summary-card { margin-top:24px; }
    .summary-card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .kpi-summary-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:20px; }
    .kpi-mini-card { background:#fafafa; border:1px solid #e4e4e7; border-radius:10px; padding:14px 18px; }
    .kpi-mini-card.highlight-curtain { background:#f0fdf4; border-color:#86efac; }
    .kpi-mini-card.highlight-double-card { background:#f5f3ff; border-color:#c4b5fd; }
    .kpi-mini-card.highlight-sheer-card { background:#faf5ff; border-color:#d8b4fe; }
    .kpi-mini-card.highlight-blinds { background:#eff6ff; border-color:#93c5fd; }
    .result-split-chips { display:flex; gap:6px; margin-top:6px; }
    .split-chip { font-size:0.75rem; padding:2px 8px; border-radius:4px; font-weight:500; }
    .main-chip { background:#f4f4f5; color:#18181b; }
    .sheer-chip { background:#ede9fe; color:#6d28d9; }
    .grand-sub-split { font-size:0.75rem; font-weight:600; color:#a7f3d0; margin-top:3px; font-family:inherit; }
    .grand-summary-stat-row td { background:#181820; color:#e4e4e7; padding:8px 14px; border-top:1px solid #2d2d38; font-size:0.82rem; }
    .stat-lbl { font-size:0.75rem; font-weight:700; color:#a1a1aa; letter-spacing:0.5px; }
    .stat-val { font-size:0.88rem; font-weight:700; }
    .stat-note { font-size:0.72rem; color:#c4b5fd; font-weight:normal; }
    .purple-text { color:#c084fc; }
    .grand-window-summary-row td { background:#1e1e24; color:#e4e4e7; padding:9px 14px; border-top:1px solid #3f3f46; }
    .grand-sub-lbl { font-size:0.78rem; font-weight:700; color:#a1a1aa; letter-spacing:0.5px; }
    .grand-sub-val { font-size:0.88rem; }
    .win-type-breakdown { font-size:0.75rem; color:#a1a1aa; margin-left:6px; font-weight:400; }
    .kpi-mini-lbl { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#71717a; }
    .kpi-mini-val { font-size:1.55rem; font-weight:800; color:#111118; margin:4px 0 2px; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .unit-sm { font-size:0.85rem; font-weight:600; color:#71717a; font-family:inherit; }
    .kpi-mini-sub { font-size:0.72rem; color:#71717a; }

    /* Master Summary Table */
    .master-summary-table { width:100%; border-collapse:collapse; }
    .room-group-header-row td { background:#f4f4f5; padding:10px 14px; border-top:2px solid #e4e4e7; border-bottom:1px solid #e4e4e7; }
    .room-group-title { font-size:0.88rem; color:#111118; }
    .room-col-indent { padding-left:24px !important; font-size:0.78rem; }
    .room-total-table-row td { background:#fafafa; border-bottom:2px solid #e4e4e7; padding:9px 14px; font-size:0.82rem; }
    .st-curtain-text { color:#16a34a; }
    .st-blinds-text { color:#0284c7; }
    .st-wallpaper-text { color:#d97706; }
    .grand-total-row td { background:#111118; color:#fff; padding:12px 14px; border-top:1px solid #27272a; }
    .grand-lbl { font-size:0.82rem; font-weight:800; letter-spacing:0.5px; }
    .grand-val { font-size:1.15rem; font-weight:800; }
    .grand-val.green-text { color:#86efac; }
    .grand-val.blue-text { color:#7dd3fc; }

    /* Summary Footer */
    .summary-footer-actions { display:flex; justify-content:space-between; align-items:center; padding-top:16px; border-top:1px solid #e4e4e7; flex-wrap:wrap; gap:14px; }
    .quote-info-snippet { font-size:0.8rem; color:#71717a; display:flex; align-items:center; gap:6px; }
    .snippet-label { font-weight:500; }
    .snippet-val { font-weight:700; color:#111118; }
    .snippet-dot { color:#d4d4d8; }
    .footer-btns { display:flex; gap:10px; }

    /* Success Modal */
    .success-modal { text-align:center; padding:36px 32px 28px; max-width:500px; }
    .success-icon-wrap { width:56px; height:56px; border-radius:50%; background:#dcfce7; color:#16a34a; font-size:1.8rem; font-weight:800; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
    .success-title { font-size:1.3rem; font-weight:800; color:#111118; margin-bottom:8px; }
    .success-sub { font-size:0.85rem; color:#71717a; line-height:1.4; margin-bottom:20px; }
    .success-summary-card { background:#f4f4f5; border:1px solid #e4e4e7; border-radius:10px; padding:14px 18px; margin-bottom:24px; text-align:left; font-size:0.82rem; }
    .sc-row { display:flex; justify-content:space-between; padding:4px 0; }
    .sc-lbl { color:#71717a; }
    .sc-val { font-weight:600; color:#111118; }
    .sc-val.bold { font-weight:800; font-size:0.9rem; }
    .success-modal-actions { display:flex; flex-direction:column; gap:8px; }
    .success-modal-actions .btn { justify-content:center; }

    .required-star { color:#dc2626; }
    .form-actions-right { display:flex; justify-content:flex-end; margin-top:10px; }
    .text-center { text-align:center; }
    .text-right { text-align:right; }
    .text-muted { color:#a1a1aa; }
    .font-bold { font-weight:700; }

    @media (max-width: 900px) {
      .quote-header-grid { grid-template-columns:1fr 1fr; }
      .treatment-grid { grid-template-columns:1fr; }
      .calc-result-box { flex-direction:column; align-items:flex-start; }
      .calc-formula-explainer { border-left:none; border-top:1px solid #cbd5e1; padding-left:0; padding-top:12px; width:100%; }
    }
  `]
})
export class CalculationComponent implements OnInit {
  // Customer selection
  custMode: 'existing' | 'new' = 'existing';
  allCustomers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  searchCustQuery = '';
  selectedCustomer: Customer | CustomerDetail | null = null;
  creatingCustomer = false;
  newCustForm = { name: '', contactNumber: '', alternateContactNumber: '', address: '', notes: '' };

  // Quotation header info
  quotationNumber = '';
  quotationTitle = '';
  quotationDate = new Date().toISOString().substring(0, 10);
  quotationRemarks = '';

  // Room management
  roomSuggestions = ['Master Bedroom', 'Hall', 'Living Room', 'Bedroom 2', 'Bedroom 3', 'Dining Room', 'Kitchen', 'Balcony', 'Guest Room', 'Study'];
  newRoomNameInput = '';
  rooms: Room[] = [];
  activeRoomId: string | null = null;

  // Current window entry draft
  windowForm = this.emptyWindowDraft();
  editingWindowId: string | number | null = null;

  // Saving state
  saving = false;
  showSuccessModal = false;
  showSaveModeModal = false;
  savedQuotationId: number | null = null;
  savedQuotationNumber = '';
  editingQuotationId: number | null = null;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  getAvatarClass(name: string): string {
    const classes = ['avatar-emerald', 'avatar-indigo', 'avatar-violet', 'avatar-amber', 'avatar-rose', 'avatar-cyan', 'avatar-teal'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return classes[Math.abs(hash) % classes.length];
  }

  ngOnInit() {
    this.loadCustomers();
    this.fetchNextQuotationNumber();

    // Initialize with a default room
    this.addRoom('Master Bedroom');

    // Check if customerId or quotationId is passed as query param
    this.route.queryParams.subscribe(params => {
      if (params['quotationId']) {
        // Load existing quotation for editing
        const qId = +params['quotationId'];
        this.api.getQuotation(qId).subscribe(q => {
          this.loadQuotationForEditing(q);
        });
      } else if (params['customerId']) {
        const cId = +params['customerId'];
        this.api.getCustomer(cId).subscribe(c => {
          this.selectedCustomer = c;
          if (!this.quotationTitle) {
            this.quotationTitle = `${c.name} - Window Quotation`;
          }
        });
      }
    });
  }

  loadQuotationForEditing(quotation: any) {
    // Load the customer
    this.api.getCustomer(quotation.customerId).subscribe(c => {
      this.selectedCustomer = c;
    });

    // Track which quotation is being edited
    this.editingQuotationId = quotation.id;

    // Set quotation header info
    this.quotationNumber = quotation.quotationNumber || '';
    this.quotationTitle = quotation.title || '';
    this.quotationDate = quotation.createdAt ? quotation.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
    this.quotationRemarks = quotation.remarks || '';

    // Clear existing rooms and windows
    this.rooms = [];
    
    // Group windows by location (room name)
    const roomMap = new Map<string, any[]>();
    for (const w of quotation.windows || []) {
      const location = w.location || 'Unassigned';
      if (!roomMap.has(location)) {
        roomMap.set(location, []);
      }
      roomMap.get(location)!.push(w);
    }

    // Create rooms with windows
    for (const [roomName, windows] of roomMap.entries()) {
      const room: Room = {
        id: 'room_' + roomName.replace(/\s+/g, '_'),
        name: roomName,
        windows: windows.map(w => {
          const isDouble = !!w.isDoubleCurtain;
          const cType = isDouble ? undefined : (w.curtainType || 'Main');
          const h = Number(w.height || 0);
          const p = Number(w.panels || 1);
          let mainReq = undefined;
          let sheerReq = undefined;
          if (w.treatmentType === 'Curtain') {
            if (isDouble) {
              mainReq = h > 0 && p > 0 ? Math.round(((h + 10) * p / 39) * 100) / 100 : undefined;
              const sH = Number(w.sheerHeight ?? w.height ?? 0);
              let sP = Number(w.sheerPanels ?? w.panels ?? 1);
              if (sP <= 0) {
                const sW = Number(w.sheerWidth ?? w.width ?? 0);
                sP = sW > 0 ? Math.ceil(sW / 20) : p;
              }
              sheerReq = sH > 0 && sP > 0 ? Math.round(((sH + 10) * sP / 39) * 100) / 100 : undefined;
            } else if (cType === 'Sheer') {
              mainReq = 0;
              sheerReq = w.requirement;
            } else {
              mainReq = w.requirement;
              sheerReq = 0;
            }
          }

          return {
            id: w.id,
            windowName: w.windowName || '',
            treatmentType: w.treatmentType,
            width: w.width,
            height: w.height,
            panels: w.panels,
            manualPanelsOverride: true,
            isDoubleCurtain: isDouble,
            curtainType: cType,
            sheerWidth: w.sheerWidth ?? null,
            sheerHeight: w.sheerHeight ?? null,
            sheerPanels: w.sheerPanels ?? null,
            manualSheerPanelsOverride: true,
            mainRequirement: mainReq,
            sheerRequirement: sheerReq,
            requirement: w.requirement,
            unit: w.unit,
            remarks: w.remarks || ''
          };
        })
      };
      this.rooms.push(room);
    }

    // Set active room to first room if available
    if (this.rooms.length > 0) {
      this.activeRoomId = this.rooms[0].id;
    }
  }

  loadCustomers() {
    this.api.getCustomers().subscribe(custs => {
      this.allCustomers = custs;
      this.filterCustomers();
    });
  }

  fetchNextQuotationNumber() {
    this.api.getNextQuotationNumber().subscribe({
      next: res => {
        if (!this.quotationNumber) {
          this.quotationNumber = res.quotationNumber;
        }
      },
      error: () => {
        if (!this.quotationNumber) {
          const ym = new Date().toISOString().substring(0, 7).replace('-', '');
          this.quotationNumber = `QT-${ym}-001`;
        }
      }
    });
  }

  setCustMode(mode: 'existing' | 'new') {
    this.custMode = mode;
    this.searchCustQuery = '';
    this.filterCustomers();
  }

  filterCustomers() {
    if (!this.searchCustQuery.trim()) {
      this.filteredCustomers = this.allCustomers;
      return;
    }
    const q = this.searchCustQuery.toLowerCase();
    this.filteredCustomers = this.allCustomers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.contactNumber.includes(q) ||
      c.alternateContactNumber.includes(q)
    );
  }

  selectCustomer(c: Customer) {
    this.selectedCustomer = c;
    if (!this.quotationTitle) {
      this.quotationTitle = `${c.name} - Window Quotation`;
    }
  }

  switchCustomer() {
    this.selectedCustomer = null;
    this.setCustMode('existing');
  }

  createNewCustomer() {
    if (!this.newCustForm.name.trim()) return;
    this.creatingCustomer = true;
    this.api.createCustomer(this.newCustForm).subscribe({
      next: created => {
        this.creatingCustomer = false;
        this.selectedCustomer = created;
        this.quotationTitle = `${created.name} - Window Quotation`;
        this.loadCustomers();
      },
      error: () => {
        this.creatingCustomer = false;
      }
    });
  }

  // ── ROOM MANAGEMENT ──
  addRoom(roomName: string) {
    const trimmed = roomName.trim();
    if (!trimmed) return;

    // Check if room already exists
    const existing = this.rooms.find(r => r.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      this.activeRoomId = existing.id;
      this.newRoomNameInput = '';
      return;
    }

    const newRoom: Room = {
      id: 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: trimmed,
      windows: []
    };
    this.rooms.push(newRoom);
    this.activeRoomId = newRoom.id;
    this.newRoomNameInput = '';
    this.suggestNextWindowName();
  }

  setActiveRoom(roomId: string) {
    this.activeRoomId = roomId;
    if (this.editingWindowId === null) {
      this.suggestNextWindowName();
    }
  }

  get activeRoom(): Room | undefined {
    return this.rooms.find(r => r.id === this.activeRoomId) || this.rooms[0];
  }

  onRoomSwitch() {
    if (this.editingWindowId === null) {
      this.suggestNextWindowName();
    }
  }

  deleteRoom(roomId: string) {
    const r = this.rooms.find(x => x.id === roomId);
    if (!r) return;
    if (confirm(`Remove room "${r.name}" and all its ${r.windows.length} window(s)?`)) {
      this.rooms = this.rooms.filter(x => x.id !== roomId);
      if (this.activeRoomId === roomId) {
        this.activeRoomId = this.rooms.length > 0 ? this.rooms[0].id : null;
      }
      this.cancelEdit();
    }
  }

  openAddWindowToRoom(roomId: string) {
    this.setActiveRoom(roomId);
    this.cancelEdit();
    this.scrollToWindowForm();
  }

  // ── WINDOW DRAFT & FORM ──
  emptyWindowDraft() {
    return {
      windowName: '',
      treatmentType: 'Curtain' as 'Curtain' | 'Roman Blind' | 'Other Blind' | 'Wallpaper',
      width: null as number | null,
      height: null as number | null,
      panels: null as number | null,
      manualPanelsOverride: false,
      isDoubleCurtain: false,
      curtainType: 'Main' as 'Main' | 'Sheer',
      sheerWidth: null as number | null,
      sheerHeight: null as number | null,
      sheerPanels: null as number | null,
      manualSheerWidthOverride: false,
      manualSheerHeightOverride: false,
      manualSheerPanelsOverride: false,
      remarks: ''
    };
  }

  suggestNextWindowName() {
    if (!this.activeRoom) return;
    const count = this.activeRoom.windows.length + 1;
    this.windowForm.windowName = `Window ${count}`;
  }

  selectTreatment(t: 'Curtain' | 'Roman Blind' | 'Other Blind' | 'Wallpaper') {
    this.windowForm.treatmentType = t;
    if (t === 'Curtain') {
      if (this.windowForm.width && !this.windowForm.manualPanelsOverride) {
        this.windowForm.panels = Math.ceil(this.windowForm.width / 20);
      }
      if (!this.windowForm.curtainType) {
        this.windowForm.curtainType = 'Main';
      }
    } else {
      this.windowForm.panels = null;
      this.windowForm.isDoubleCurtain = false;
    }
  }

  setDoubleCurtain(val: boolean) {
    this.windowForm.isDoubleCurtain = val;
    if (val) {
      if (!this.windowForm.manualSheerWidthOverride || this.windowForm.sheerWidth == null) {
        this.windowForm.sheerWidth = this.windowForm.width;
      }
      if (!this.windowForm.manualSheerHeightOverride || this.windowForm.sheerHeight == null) {
        this.windowForm.sheerHeight = this.windowForm.height;
      }
      if (!this.windowForm.manualSheerPanelsOverride) {
        this.windowForm.sheerPanels = this.windowForm.panels ?? (this.windowForm.width ? Math.ceil(this.windowForm.width / 20) : null);
      }
    } else {
      if (!this.windowForm.curtainType) {
        this.windowForm.curtainType = 'Main';
      }
    }
  }

  setCurtainType(type: 'Main' | 'Sheer') {
    this.windowForm.curtainType = type;
  }

  onSheerWidthChange() {
    this.windowForm.manualSheerWidthOverride = true;
    if (!this.windowForm.manualSheerPanelsOverride && this.windowForm.sheerWidth) {
      this.windowForm.sheerPanels = Math.ceil(this.windowForm.sheerWidth / 20);
    }
  }

  onSheerHeightChange() {
    this.windowForm.manualSheerHeightOverride = true;
  }

  incrementSheerPanels() {
    this.windowForm.manualSheerPanelsOverride = true;
    this.windowForm.sheerPanels = (this.windowForm.sheerPanels || 0) + 1;
  }

  decrementSheerPanels() {
    if ((this.windowForm.sheerPanels || 0) > 1) {
      this.windowForm.manualSheerPanelsOverride = true;
      this.windowForm.sheerPanels = (this.windowForm.sheerPanels || 0) - 1;
    }
  }

  effectiveSheerHeight(): number {
    return Number(this.windowForm.sheerHeight ?? this.windowForm.height ?? 0);
  }

  effectiveSheerPanels(): number {
    if (this.windowForm.sheerPanels) return Number(this.windowForm.sheerPanels);
    const w = Number(this.windowForm.sheerWidth ?? this.windowForm.width ?? 0);
    return w > 0 ? Math.ceil(w / 20) : Number(this.windowForm.panels ?? 1);
  }

  mainCurtainRequirement(): number {
    if (!this.windowForm.isDoubleCurtain && this.windowForm.curtainType === 'Sheer') {
      return 0;
    }
    const h = Number(this.windowForm.height ?? 0);
    const p = Number(this.windowForm.panels ?? 0);
    if (h <= 0 || p <= 0) return 0;
    return Math.round(((h + 10) * p / 39) * 100) / 100;
  }

  sheerCurtainRequirement(): number {
    if (!this.windowForm.isDoubleCurtain) {
      if (this.windowForm.curtainType === 'Sheer') {
        const h = Number(this.windowForm.height ?? 0);
        const p = Number(this.windowForm.panels ?? 0);
        if (h <= 0 || p <= 0) return 0;
        return Math.round(((h + 10) * p / 39) * 100) / 100;
      }
      return 0;
    }
    const h = this.effectiveSheerHeight();
    const p = this.effectiveSheerPanels();
    if (h <= 0 || p <= 0) return 0;
    return Math.round(((h + 10) * p / 39) * 100) / 100;
  }

  onWidthChange() {
    if (this.windowForm.treatmentType === 'Curtain' && this.windowForm.width && this.windowForm.width > 0) {
      if (!this.windowForm.manualPanelsOverride) {
        this.windowForm.panels = Math.ceil(this.windowForm.width / 20);
      }
      if (this.windowForm.isDoubleCurtain && !this.windowForm.manualSheerWidthOverride) {
        this.windowForm.sheerWidth = this.windowForm.width;
        if (!this.windowForm.manualSheerPanelsOverride) {
          this.windowForm.sheerPanels = this.windowForm.panels;
        }
      }
    }
  }

  onHeightChange() {
    if (this.windowForm.treatmentType === 'Curtain' && this.windowForm.isDoubleCurtain) {
      if (!this.windowForm.manualSheerHeightOverride) {
        this.windowForm.sheerHeight = this.windowForm.height;
      }
    }
  }

  incrementPanels() {
    this.windowForm.manualPanelsOverride = true;
    this.windowForm.panels = (this.windowForm.panels || 0) + 1;
  }

  decrementPanels() {
    if ((this.windowForm.panels || 0) > 1) {
      this.windowForm.manualPanelsOverride = true;
      this.windowForm.panels = (this.windowForm.panels || 0) - 1;
    }
  }

  isCurrentWindowValid(): boolean {
    if (!this.activeRoom) return false;
    if (!this.windowForm.windowName.trim()) return false;
    if (!this.windowForm.width || this.windowForm.width <= 0) return false;
    if (!this.windowForm.height || this.windowForm.height <= 0) return false;
    if (this.windowForm.treatmentType === 'Curtain' && (!this.windowForm.panels || this.windowForm.panels <= 0)) return false;
    return true;
  }

  currentWindowRequirement(): number {
    const w = this.windowForm.width || 0;
    const h = this.windowForm.height || 0;
    if (w <= 0 || h <= 0) return 0;

    if (this.windowForm.treatmentType === 'Curtain') {
      if (!this.windowForm.isDoubleCurtain) {
        if (this.windowForm.curtainType === 'Sheer') {
          return this.sheerCurtainRequirement();
        }
        return this.mainCurtainRequirement();
      }
      const main = this.mainCurtainRequirement();
      return Math.round((main + this.sheerCurtainRequirement()) * 100) / 100;
    } else {
      let areaSqFt = (w * h) / 144;
      areaSqFt = Math.max(12, areaSqFt);
      return Math.round(areaSqFt * 100) / 100;
    }
  }

  addOrUpdateWindow() {
    if (!this.isCurrentWindowValid() || !this.activeRoom) return;

    const req = this.currentWindowRequirement();
    const unit = this.windowForm.treatmentType === 'Curtain' ? 'm' : 'sq ft';
    const isDouble = this.windowForm.isDoubleCurtain;
    const cType = isDouble ? undefined : (this.windowForm.curtainType || 'Main');

    if (this.editingWindowId !== null) {
      // Find and update the existing window across all rooms
      for (const r of this.rooms) {
        const idx = r.windows.findIndex((w: any) => w.id === this.editingWindowId);
        if (idx !== -1) {
          const item: WindowItem = {
            id: this.editingWindowId as any,
            windowName: this.windowForm.windowName.trim(),
            treatmentType: this.windowForm.treatmentType,
            width: Number(this.windowForm.width),
            height: Number(this.windowForm.height),
            panels: this.windowForm.treatmentType === 'Curtain' ? Number(this.windowForm.panels) : null,
            manualPanelsOverride: this.windowForm.manualPanelsOverride,
            isDoubleCurtain: isDouble,
            curtainType: cType,
            sheerWidth: isDouble ? (this.windowForm.sheerWidth ?? this.windowForm.width ?? null) : null,
            sheerHeight: isDouble ? (this.windowForm.sheerHeight ?? this.windowForm.height ?? null) : null,
            sheerPanels: isDouble ? this.effectiveSheerPanels() : null,
            manualSheerPanelsOverride: this.windowForm.manualSheerPanelsOverride,
            mainRequirement: isDouble ? this.mainCurtainRequirement() : (cType === 'Sheer' ? 0 : req),
            sheerRequirement: isDouble ? this.sheerCurtainRequirement() : (cType === 'Sheer' ? req : 0),
            requirement: req,
            unit: unit,
            remarks: this.windowForm.remarks
          };

          // If room was changed during edit, move window to active room
          if (r.id !== this.activeRoom.id) {
            r.windows.splice(idx, 1);
            this.activeRoom.windows.push(item);
          } else {
            r.windows[idx] = item;
          }
          this.toast.success(`Updated ${item.windowName}`);
          break;
        }
      }
      this.cancelEdit();
    } else {
      // Add new window to active room
      const item: WindowItem = {
        id: 'win_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5) as any,
        windowName: this.windowForm.windowName.trim(),
        treatmentType: this.windowForm.treatmentType,
        width: Number(this.windowForm.width),
        height: Number(this.windowForm.height),
        panels: this.windowForm.treatmentType === 'Curtain' ? Number(this.windowForm.panels) : null,
        manualPanelsOverride: this.windowForm.manualPanelsOverride,
        isDoubleCurtain: isDouble,
        curtainType: cType,
        sheerWidth: isDouble ? (this.windowForm.sheerWidth ?? this.windowForm.width ?? null) : null,
        sheerHeight: isDouble ? (this.windowForm.sheerHeight ?? this.windowForm.height ?? null) : null,
        sheerPanels: isDouble ? this.effectiveSheerPanels() : null,
        manualSheerPanelsOverride: this.windowForm.manualSheerPanelsOverride,
        mainRequirement: isDouble ? this.mainCurtainRequirement() : (cType === 'Sheer' ? 0 : req),
        sheerRequirement: isDouble ? this.sheerCurtainRequirement() : (cType === 'Sheer' ? req : 0),
        requirement: req,
        unit: unit,
        remarks: this.windowForm.remarks
      };
      this.activeRoom.windows.push(item);
      this.toast.success(`Added ${item.windowName} (${item.requirement} ${item.unit}) to ${this.activeRoom.name}`);
      this.windowForm = this.emptyWindowDraft();
      this.suggestNextWindowName();
    }
  }

  editWindow(roomId: string, windowItem: WindowItem) {
    this.activeRoomId = roomId;
    this.editingWindowId = (windowItem.id || windowItem.windowName) as any;
    this.windowForm = {
      windowName: windowItem.windowName,
      treatmentType: windowItem.treatmentType,
      width: windowItem.width,
      height: windowItem.height,
      panels: windowItem.panels,
      manualPanelsOverride: windowItem.manualPanelsOverride || true,
      isDoubleCurtain: windowItem.isDoubleCurtain || false,
      curtainType: (windowItem.curtainType as any) || (windowItem.isDoubleCurtain ? undefined : 'Main'),
      sheerWidth: windowItem.sheerWidth ?? (windowItem.isDoubleCurtain ? windowItem.width : null),
      sheerHeight: windowItem.sheerHeight ?? (windowItem.isDoubleCurtain ? windowItem.height : null),
      sheerPanels: windowItem.sheerPanels ?? (windowItem.isDoubleCurtain ? windowItem.panels : null),
      manualSheerWidthOverride: windowItem.sheerWidth !== undefined && windowItem.sheerWidth !== null && windowItem.sheerWidth !== windowItem.width,
      manualSheerHeightOverride: windowItem.sheerHeight !== undefined && windowItem.sheerHeight !== null && windowItem.sheerHeight !== windowItem.height,
      manualSheerPanelsOverride: windowItem.manualSheerPanelsOverride || false,
      remarks: windowItem.remarks || ''
    };
    this.scrollToWindowForm();
  }

  cancelEdit() {
    this.editingWindowId = null;
    this.windowForm = this.emptyWindowDraft();
    this.suggestNextWindowName();
  }

  deleteWindow(roomId: string, windowIndex: number) {
    const r = this.rooms.find(x => x.id === roomId);
    if (!r) return;
    const w = r.windows[windowIndex];
    if (confirm(`Remove "${w.windowName}" from ${r.name}?`)) {
      r.windows.splice(windowIndex, 1);
      if (this.editingWindowId === w.id) {
        this.cancelEdit();
      }
    }
  }

  scrollToWindowForm() {
    const el = document.getElementById('window-entry-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToRoomManager() {
    window.scrollTo({ top: 400, behavior: 'smooth' });
  }

  // ── ROOM & GRAND TOTALS ──
  roomWindowCount(room: Room): number {
    return room.windows.filter(w => w.treatmentType !== 'Wallpaper').length;
  }

  roomCurtainMeters(room: Room): number {
    return room.windows
      .filter(w => w.treatmentType === 'Curtain')
      .reduce((sum, w) => sum + w.requirement, 0);
  }

  roomRomanBlindsArea(room: Room): number {
    return Math.round(room.windows
      .filter(w => isRomanBlind(w.treatmentType))
      .reduce((sum, w) => sum + Math.max(12, w.requirement), 0) * 100) / 100;
  }

  roomOtherBlindsArea(room: Room): number {
    return Math.round(room.windows
      .filter(w => isOtherBlind(w.treatmentType))
      .reduce((sum, w) => sum + Math.max(12, w.requirement), 0) * 100) / 100;
  }

  roomBlindsArea(room: Room): number {
    return Math.round(room.windows
      .filter(w => isBlind(w.treatmentType))
      .reduce((sum, w) => sum + Math.max(12, w.requirement), 0) * 100) / 100;
  }

  roomWallpaperArea(room: Room): number {
    return room.windows
      .filter(w => w.treatmentType === 'Wallpaper')
      .reduce((sum, w) => sum + Math.max(12, w.requirement), 0);
  }

  roomsWithWindowsCount(): number {
    return this.rooms.filter(r => r.windows.some(w => w.treatmentType !== 'Wallpaper')).length;
  }

  totalWindowsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.filter(w => w.treatmentType !== 'Wallpaper').length, 0);
  }

  totalCurtainWindowsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.filter(w => w.treatmentType === 'Curtain').length, 0);
  }

  totalSingleCurtainWindowsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.filter(w => w.treatmentType === 'Curtain' && !w.isDoubleCurtain).length, 0);
  }

  totalSingleMainCurtainWindowsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.filter(w => w.treatmentType === 'Curtain' && !w.isDoubleCurtain && w.curtainType !== 'Sheer').length, 0);
  }

  totalSingleSheerCurtainWindowsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.filter(w => w.treatmentType === 'Curtain' && !w.isDoubleCurtain && w.curtainType === 'Sheer').length, 0);
  }

  totalDoubleCurtainWindowsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.filter(w => w.treatmentType === 'Curtain' && !!w.isDoubleCurtain).length, 0);
  }

  totalBlindWindowsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.filter(w => isBlind(w.treatmentType)).length, 0);
  }

  totalRomanBlindWindowsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.filter(w => isRomanBlind(w.treatmentType)).length, 0);
  }

  totalOtherBlindWindowsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.filter(w => isOtherBlind(w.treatmentType)).length, 0);
  }

  getMainRequirement(w: WindowItem): number {
    if (w.mainRequirement !== undefined) return w.mainRequirement;
    if (w.treatmentType !== 'Curtain') return 0;
    if (!w.isDoubleCurtain && w.curtainType === 'Sheer') return 0;
    const h = Number(w.height || 0);
    const p = Number(w.panels || 1);
    if (h <= 0 || p <= 0) return 0;
    return Math.round(((h + 10) * p / 39) * 100) / 100;
  }

  getSheerRequirement(w: WindowItem): number {
    if (w.sheerRequirement !== undefined) return w.sheerRequirement;
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

  grandTotalMainCurtainMeters(): number {
    return Math.round(this.rooms.reduce((sum, r) => sum + r.windows
      .filter(w => w.treatmentType === 'Curtain')
      .reduce((rSum, w) => rSum + this.getMainRequirement(w), 0), 0) * 100) / 100;
  }

  grandTotalSheerCurtainMeters(): number {
    return Math.round(this.rooms.reduce((sum, r) => sum + r.windows
      .filter(w => w.treatmentType === 'Curtain')
      .reduce((rSum, w) => rSum + this.getSheerRequirement(w), 0), 0) * 100) / 100;
  }

  grandTotalCurtainMeters(): number {
    let total = 0;
    for (const r of this.rooms) {
      total += this.roomCurtainMeters(r);
    }
    return Math.round(total * 100) / 100;
  }

  grandTotalRomanBlindsArea(): number {
    let total = 0;
    for (const r of this.rooms) {
      total += this.roomRomanBlindsArea(r);
    }
    return Math.round(total * 100) / 100;
  }

  grandTotalOtherBlindsArea(): number {
    let total = 0;
    for (const r of this.rooms) {
      total += this.roomOtherBlindsArea(r);
    }
    return Math.round(total * 100) / 100;
  }

  grandTotalBlindsArea(): number {
    let total = 0;
    for (const r of this.rooms) {
      total += this.roomBlindsArea(r);
    }
    return Math.round(total * 100) / 100;
  }

  grandTotalWallpaperArea(): number {
    let total = 0;
    for (const r of this.rooms) {
      total += this.roomWallpaperArea(r);
    }
    return total;
  }

  totalItemsCount(): number {
    return this.rooms.reduce((sum, r) => sum + r.windows.length, 0);
  }

  // ── SAVE QUOTATION ──
  saveQuotation() {
    if (!this.selectedCustomer) {
      const el = document.getElementById('step-customer-card');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      alert('Please assign or create a customer in Step 1 before saving the quotation.');
      return;
    }
    if (this.totalItemsCount() === 0) {
      alert('Please add at least one window or wallpaper calculation before saving.');
      return;
    }

    if (this.editingQuotationId) {
      this.showSaveModeModal = true;
      return;
    }

    this.performSave('new');
  }

  performSave(mode: 'update' | 'new') {
    this.showSaveModeModal = false;
    this.saving = true;

    const flatWindows: any[] = [];
    for (const r of this.rooms) {
      for (const w of r.windows) {
        flatWindows.push({
          location: r.name,
          windowName: w.windowName,
          treatmentType: w.treatmentType,
          width: w.width,
          height: w.height,
          panels: w.panels,
          isDoubleCurtain: w.isDoubleCurtain ?? false,
          curtainType: w.isDoubleCurtain ? undefined : (w.curtainType || 'Main'),
          sheerWidth: w.isDoubleCurtain ? (w.sheerWidth ?? null) : null,
          sheerHeight: w.isDoubleCurtain ? (w.sheerHeight ?? null) : null,
          sheerPanels: w.isDoubleCurtain ? (w.sheerPanels ?? null) : null,
          requirement: w.requirement,
          unit: w.unit,
          remarks: w.remarks || ''
        });
      }
    }

    const payload = {
      customerId: this.selectedCustomer!.id,
      quotationNumber: this.quotationNumber.trim() || undefined,
      title: this.quotationTitle.trim() || `${this.selectedCustomer!.name} - Quotation`,
      remarks: this.quotationRemarks,
      advancePayment: 0,
      advancePaymentDate: null,
      createdAt: this.quotationDate ? new Date(this.quotationDate).toISOString() : new Date().toISOString(),
      windows: flatWindows
    };

    const obs = mode === 'update' && this.editingQuotationId
      ? this.api.updateQuotation(this.editingQuotationId, payload)
      : this.api.createQuotation(payload);

    obs.subscribe({
      next: (result: any) => {
        this.saving = false;
        this.savedQuotationId = result.id;
        this.savedQuotationNumber = result.quotationNumber || this.quotationNumber;
        this.toast.success(`Quotation ${this.savedQuotationNumber} saved successfully!`);
        this.showSuccessModal = true;
      },
      error: (err) => {
        this.saving = false;
        this.toast.error('Failed to save quotation. Please try again.');
        console.error(err);
      }
    });
  }

  resetAll() {
    if (confirm('Are you sure you want to reset all rooms and windows and start over?')) {
      this.rooms = [];
      this.addRoom('Master Bedroom');
      this.windowForm = this.emptyWindowDraft();
      this.editingWindowId = null;
      this.quotationTitle = '';
      this.quotationRemarks = '';
      this.fetchNextQuotationNumber();
    }
  }

  goToCustomerProfile() {
    if (this.selectedCustomer) {
      this.router.navigate(['/customers', this.selectedCustomer.id]);
    }
  }

  goToQuotationsList() {
    this.router.navigate(['/quotations']);
  }

  startAnotherCalculation() {
    this.showSuccessModal = false;
    this.selectedCustomer = null;
    this.rooms = [];
    this.addRoom('Master Bedroom');
    this.windowForm = this.emptyWindowDraft();
    this.editingWindowId = null;
    this.quotationNumber = '';
    this.quotationTitle = '';
    this.quotationRemarks = '';
    this.fetchNextQuotationNumber();
    this.setCustMode('existing');
  }
}
