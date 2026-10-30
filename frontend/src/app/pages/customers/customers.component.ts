import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Customer } from '../../models/models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  template: `
    <div class="page-wrapper">
      <app-header />
      <main class="main-content">

        <!-- Page Header -->
        <div class="page-header">
          <div>
            <div class="header-pretitle">Client Relationship Management</div>
            <h1 class="page-header-title">Customer Directory</h1>
            <p class="page-header-sub">{{ filteredCustomers.length }} customer{{ filteredCustomers.length !== 1 ? 's' : '' }} registered · Manage accounts, site locations, and quotations</p>
          </div>
          <div class="page-actions">
            <a routerLink="/calculation" class="btn btn-secondary">
              <span>📐</span>
              <span>Window Calculator</span>
            </a>
            <button class="btn btn-primary" (click)="openAdd()">
              <span>➕</span>
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        <!-- Filter Chips for Quick Category Toggling -->
        <div class="filter-chips" style="margin-bottom: 14px;">
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="quickFilter === 'all'" 
            (click)="setQuickFilter('all')">
            <span>All Clients</span>
            <span class="chip-count">{{ customers.length }}</span>
          </button>
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="quickFilter === 'active'" 
            (click)="setQuickFilter('active')">
            <span>📦 With Products</span>
            <span class="chip-count">{{ countWithProducts() }}</span>
          </button>
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="quickFilter === 'high'" 
            (click)="setQuickFilter('high')">
            <span>✨ High Activity (3+ items)</span>
            <span class="chip-count">{{ countHighActivity() }}</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="filter-bar">
          <div class="search-field-wrap">
            <span class="search-icon">🔍</span>
            <input 
              class="form-control search-input" 
              [(ngModel)]="searchName"
              placeholder="Search by customer name..." 
              (input)="load()" />
            <button 
              *ngIf="searchName" 
              class="clear-input-btn" 
              (click)="searchName=''; load()"
              title="Clear search">✕</button>
          </div>

          <div class="search-field-wrap">
            <span class="search-icon">📞</span>
            <input 
              class="form-control" 
              [(ngModel)]="searchPhone"
              placeholder="Search phone number..." 
              (input)="load()" 
              style="min-width:200px;" />
            <button 
              *ngIf="searchPhone" 
              class="clear-input-btn" 
              (click)="searchPhone=''; load()"
              title="Clear search">✕</button>
          </div>

          <button 
            *ngIf="searchName || searchPhone" 
            class="btn btn-secondary btn-sm" 
            (click)="searchName=''; searchPhone=''; load()">
            <span>✕</span>
            <span>Clear Filters</span>
          </button>

          <span *ngIf="searchName || searchPhone" class="result-count-badge">
            {{ filteredCustomers.length }} match{{ filteredCustomers.length !== 1 ? 'es' : '' }} found
          </span>
        </div>

        <!-- Customer Cards Grid -->
        <div class="cust-grid" *ngIf="filteredCustomers.length > 0">
          <div class="cust-card" *ngFor="let c of filteredCustomers">
            <div class="cust-card-top">
              <div class="cust-avatar" [ngClass]="getAvatarClass(c.name)">
                {{ c.name.charAt(0).toUpperCase() }}
              </div>
              <div class="cust-info">
                <a [routerLink]="['/customers', c.id]" class="cust-name">{{ c.name }}</a>
                
                <!-- Direct Phone & WhatsApp Actions -->
                <div class="cust-contact-row" *ngIf="c.contactNumber">
                  <a [href]="'tel:' + c.contactNumber" class="phone-link" title="Call {{ c.name }}">
                    <span class="phone-icon">📞</span>
                    <span>{{ c.contactNumber }}</span>
                  </a>
                  <button 
                    type="button" 
                    class="btn-copy" 
                    (click)="copyPhone(c.contactNumber, c.name, $event)"
                    title="Copy phone number">
                    📋
                  </button>
                  <a 
                    [href]="getWhatsAppUrl(c.contactNumber, c.name)" 
                    target="_blank" 
                    class="wa-pill" 
                    title="Chat on WhatsApp">
                    <span>💬 WhatsApp</span>
                  </a>
                  <span *ngIf="c.alternateContactNumber" class="alt-phone">· {{ c.alternateContactNumber }}</span>
                </div>
              </div>

              <!-- Product count tag -->
              <span class="cust-prod-badge" [class.has-prod]="c.productCount > 0">
                <span>📦</span>
                <span>{{ c.productCount }} item{{ c.productCount !== 1 ? 's' : '' }}</span>
              </span>
            </div>

            <div class="cust-address" *ngIf="c.address">
              <span class="addr-icon">📍</span>
              <span>{{ c.address }}</span>
            </div>

            <div class="cust-notes" *ngIf="c.notes">
              <span class="notes-icon">📝</span>
              <span class="notes-text">{{ c.notes }}</span>
            </div>

            <!-- Card Bottom Actions -->
            <div class="cust-actions">
              <a [routerLink]="['/customers', c.id]" class="btn btn-secondary btn-sm flex-1">
                <span>View Details</span>
                <span>→</span>
              </a>
              <a [routerLink]="['/calculation']" [queryParams]="{ customerId: c.id }" class="btn btn-secondary btn-sm calc-btn" title="Calculate window treatments for {{ c.name }}">
                <span>📐 Calculate</span>
              </a>
              <button class="btn btn-secondary btn-sm icon-action-btn" (click)="openEdit(c)" title="Edit customer details">
                <span>✏️</span>
              </button>
              <button class="btn btn-danger btn-sm icon-action-btn" (click)="deleteCustomer(c)" title="Delete customer">
                <span>🗑️</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state-card" *ngIf="filteredCustomers.length === 0">
          <div class="empty-icon-wrap">👥</div>
          <h3 class="empty-title">No customers found</h3>
          <p class="empty-sub">
            {{ (searchName || searchPhone || quickFilter !== 'all') ? 'Try adjusting your search criteria or clear the filters.' : 'Get started by adding your first customer to the directory.' }}
          </p>
          <div class="empty-action-wrap">
            <button *ngIf="searchName || searchPhone || quickFilter !== 'all'" class="btn btn-secondary" (click)="searchName=''; searchPhone=''; quickFilter='all'; load()">
              Clear Filters
            </button>
            <button class="btn btn-primary" (click)="openAdd()">
              + Add Customer
            </button>
          </div>
        </div>

      </main>
    </div>

    <!-- Add / Edit Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal($event)" (keydown.enter)="save()">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>{{ editing ? 'Edit Customer Information' : 'Add New Customer' }}</h2>
            <p class="modal-sub">{{ editing ? 'Update contact & site details' : 'Fill in the customer details below' }}</p>
          </div>
          <button class="btn-close" (click)="showModal=false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label>Customer Full Name <span style="color:#e11d48;">*</span></label>
              <input class="form-control" [(ngModel)]="form.name" placeholder="e.g. Rajesh Patil" />
            </div>
            <div class="form-group">
              <label>Contact Number (Mobile / WhatsApp)</label>
              <input class="form-control" [(ngModel)]="form.contactNumber" placeholder="Primary phone (e.g. 9822012345)" />
            </div>
            <div class="form-group">
              <label>Alternate Contact</label>
              <input class="form-control" [(ngModel)]="form.alternateContactNumber" placeholder="Secondary phone / Landline" />
            </div>
            <div class="form-group">
              <label>Site Address / Location</label>
              <input class="form-control" [(ngModel)]="form.address" placeholder="Flat / Bungalow / Area" />
            </div>
          </div>
          <div class="form-group">
            <label>Notes / Site Remarks</label>
            <textarea 
              class="form-control" 
              [(ngModel)]="form.notes" 
              rows="3"
              placeholder="Specific customer preferences, fabric choices, site visit notes..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showModal=false">Cancel</button>
          <button class="btn btn-primary" (click)="save()" [disabled]="saving || !form.name.trim()">
            {{ saving ? 'Saving...' : (editing ? 'Update Customer' : 'Save Customer') }}
          </button>
        </div>
      </div>
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
    .page-header-title {
      font-size: 1.7rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.025em;
    }
    .page-header-sub {
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

    .result-count-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #3730a3;
      background: #e0e7ff;
      padding: 4px 11px;
      border-radius: 9999px;
      margin-left: 4px;
    }

    /* Customer Grid */
    .cust-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 18px;
    }
    .cust-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .cust-card:hover {
      box-shadow: 0 12px 28px -5px rgba(15, 23, 42, 0.09);
      transform: translateY(-2.5px);
      border-color: #cbd5e1;
    }
    .cust-card-top {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .cust-avatar {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 800;
      flex-shrink: 0;
      box-shadow: 0 3px 8px rgba(15, 23, 42, 0.12);
    }
    .cust-info { flex: 1; min-width: 0; }
    .cust-name {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      text-decoration: none;
      display: block;
      line-height: 1.3;
      transition: color 0.15s;
    }
    .cust-name:hover { color: #4f46e5; }
    .cust-contact-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 5px;
      flex-wrap: wrap;
    }
    .phone-link {
      font-size: 0.82rem;
      color: #0284c7;
      text-decoration: none;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .phone-link:hover { text-decoration: underline; }
    .phone-icon { font-size: 0.75rem; }
    .alt-phone { font-size: 0.78rem; color: #94a3b8; }

    .wa-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.15s;
    }
    .wa-pill:hover {
      background: #25d366;
      color: #ffffff;
      border-color: #1ebd5a;
      transform: translateY(-1px);
    }

    .cust-prod-badge {
      font-size: 0.72rem;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      padding: 4px 10px;
      border-radius: 9999px;
      white-space: nowrap;
      flex-shrink: 0;
      border: 1px solid #e2e8f0;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .cust-prod-badge.has-prod {
      background: #f5f3ff;
      color: #7c3aed;
      border-color: #ddd6fe;
    }

    .cust-address {
      font-size: 0.82rem;
      color: #64748b;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      line-height: 1.4;
    }
    .addr-icon { font-size: 0.9rem; line-height: 1; flex-shrink: 0; margin-top: 1px; }

    .cust-notes {
      font-size: 0.78rem;
      color: #475569;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-style: italic;
    }
    .notes-icon { font-size: 0.82rem; flex-shrink: 0; }
    .notes-text {
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .cust-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }
    .calc-btn:hover {
      background: #eef2ff;
      color: #4f46e5;
      border-color: #c7d2fe;
    }
    .icon-action-btn {
      padding: 6px 10px;
    }

    /* Empty state */
    .empty-state-card {
      text-align: center;
      padding: 64px 20px;
      background: #ffffff;
      border: 1.5px dashed #cbd5e1;
      border-radius: 18px;
      max-width: 520px;
      margin: 40px auto;
    }
    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      margin: 0 auto 16px;
    }
    .empty-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .empty-sub { font-size: 0.85rem; color: #64748b; margin-bottom: 20px; line-height: 1.5; }
    .empty-action-wrap { display: flex; gap: 10px; justify-content: center; }

    .modal-sub { font-size: 0.78rem; color: #64748b; margin-top: 2px; }
  `]
})
export class CustomersComponent implements OnInit {
  customers: Customer[] = [];
  searchName = '';
  searchPhone = '';
  quickFilter: 'all' | 'active' | 'high' = 'all';
  showModal = false;
  editing: Customer | null = null;
  saving = false;
  form = { name: '', contactNumber: '', alternateContactNumber: '', address: '', notes: '' };

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.load();
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openAdd();
      }
    });
  }

  load() {
    this.api.getCustomers(this.searchName || undefined, this.searchPhone || undefined).subscribe(c => {
      this.customers = c;
    });
  }

  get filteredCustomers(): Customer[] {
    if (this.quickFilter === 'active') {
      return this.customers.filter(c => c.productCount > 0);
    }
    if (this.quickFilter === 'high') {
      return this.customers.filter(c => c.productCount >= 3);
    }
    return this.customers;
  }

  setQuickFilter(filter: 'all' | 'active' | 'high') {
    this.quickFilter = filter;
  }

  countWithProducts(): number {
    return this.customers.filter(c => c.productCount > 0).length;
  }

  countHighActivity(): number {
    return this.customers.filter(c => c.productCount >= 3).length;
  }

  getAvatarClass(name: string): string {
    const classes = ['avatar-emerald', 'avatar-indigo', 'avatar-violet', 'avatar-amber', 'avatar-rose', 'avatar-cyan', 'avatar-teal'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return classes[Math.abs(hash) % classes.length];
  }

  getWhatsAppUrl(phone?: string, name?: string): string {
    if (!phone) return '#';
    const clean = phone.replace(/[^0-9]/g, '');
    const num = clean.length === 10 ? '91' + clean : clean;
    const text = encodeURIComponent(`Hello ${name || 'Customer'}, greetings from Pukale Furnishing Centre! We are reaching out regarding your interior furnishing requirements.`);
    return `https://wa.me/${num}?text=${text}`;
  }

  copyPhone(phone: string, name: string, e: Event) {
    e.stopPropagation();
    e.preventDefault();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phone);
    }
    this.toast.success(`Copied ${name}'s phone: ${phone}`);
  }

  openAdd() {
    this.editing = null;
    this.form = { name: '', contactNumber: '', alternateContactNumber: '', address: '', notes: '' };
    this.showModal = true;
  }

  openEdit(c: Customer) {
    this.editing = c;
    this.form = {
      name: c.name,
      contactNumber: c.contactNumber,
      alternateContactNumber: c.alternateContactNumber,
      address: c.address,
      notes: c.notes
    };
    this.showModal = true;
  }

  save() {
    if (!this.form.name.trim()) return;

    this.saving = true;
    if (this.editing) {
      this.api.updateCustomer(this.editing.id, this.form).subscribe({
        next: () => {
          this.showModal = false;
          this.saving = false;
          this.toast.success(`Updated details for "${this.form.name}"`);
          this.load();
        },
        error: () => {
          this.saving = false;
          this.toast.error('Failed to update customer');
        }
      });
    } else {
      this.api.createCustomer(this.form).subscribe({
        next: (created: any) => {
          this.showModal = false;
          this.saving = false;
          this.toast.success(`Created customer "${this.form.name}"`);
          this.router.navigate(['/customers', created.id]);
        },
        error: () => {
          this.saving = false;
          this.toast.error('Failed to create customer');
        }
      });
    }
  }

  deleteCustomer(c: Customer) {
    if (!confirm(`Delete "${c.name}"? All their products and quotations will also be deleted.`)) return;
    this.api.deleteCustomer(c.id).subscribe({
      next: () => {
        this.toast.info(`Deleted customer "${c.name}"`);
        this.load();
      },
      error: () => this.toast.error('Failed to delete customer')
    });
  }

  closeModal(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showModal = false;
    }
  }
}
