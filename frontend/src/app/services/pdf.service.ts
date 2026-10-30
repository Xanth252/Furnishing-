import { Injectable } from '@angular/core';
import { Quotation, QuotationItem, BusinessProfile, BankDetails, Customer } from '../models/models';
import { PFC_LOGO_BASE64 } from './logo.data';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface QuotationPdfData {
  quotation: Quotation;
  customer?: Customer | { name: string; contactNumber?: string; address?: string };
  business?: BusinessProfile;
  bank?: BankDetails;
  filename?: string;
}

interface PageChunk {
  items: QuotationItem[];
  pageIndex: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
}

@Injectable({ providedIn: 'root' })
export class PdfService {

  // Convert numbers to Indian Rupees Words (Title Case)
  numberToWords(num: number): string {
    if (!num || num === 0) return 'Zero Rupees Only';
    
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      const digit = n % 10;
      return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    };

    const convert = (n: number): string => {
      if (n === 0) return '';
      if (n < 100) return inWords(n);
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
    };

    const rounded = Math.round(num);
    const result = convert(rounded).trim();
    return result ? result + ' Rupees Only' : '';
  }

  // Format currency with Indian Comma grouping
  formatCurrency(num: number, decimals: number = 2): string {
    return Number(num || 0).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // Generate Multi-Page HTML matching user template
  generateQuotationHtml(data: QuotationPdfData): string {
    const q = data.quotation;
    const cust = data.customer || {
      name: q.customerName || 'Valued Customer',
      contactNumber: q.customerContactNumber || '',
      address: q.customerAddress || ''
    };
    const biz = data.business || {
      firmName: 'PUKALE FURNISHING CENTRE',
      address: 'SHOP NO-121/122, S.S.HIGH SCHOOL\nCOMPLEX B.L.D.E.A. HOSPITAL\nROAD, VIJAYPURA,\nKarnataka, India - 586101',
      contactNumber: '+91 99026 25960',
      email: 'adityabondge20@gmail.com',
      gstNumber: '29AAGFP3063J1ZZ',
      panNumber: 'AAGFP3063J',
      logoUrl: ''
    };
    const bank = data.bank || {
      bankName: 'AXIS BANK',
      accountName: 'PUKALE FURNISHING CENTRE',
      accountNumber: '925020051982106',
      ifscCode: 'UTIB0000525',
      branch: 'Main Branch',
      termsAndConditions: 'WORK WILL BE STARTED AFTER AN ADVANCE PAYMENT OF 50%.\nGOODS ONCE DELIVERED WILL NOT BE REPLACED OR RETURNED.\nTHIS ESTIMATE IS VALID ONLY FOR THE NEXT 8 DAYS.\nENTIRE PAYMENT HAS TO BE CLEARED BEFORE THE INSTALLATION OF ANY PRODUCTS.'
    };

    const logoSrc = biz.logoUrl && biz.logoUrl.trim() ? this.escapeHtml(biz.logoUrl) : PFC_LOGO_BASE64;
    
    // Normalize line items
    let rawItems: QuotationItem[] = [];
    if (q.items && q.items.length > 0) {
      rawItems = q.items;
    } else if (q.products && q.products.length > 0) {
      rawItems = q.products.map((p, idx) => ({
        srNo: idx + 1,
        particular: p.productName,
        quantity: p.quantity,
        unit: 'pcs',
        rate: p.quotationAmount / (p.quantity || 1),
        total: p.quotationAmount
      }));
    }

    if (rawItems.length === 0) {
      rawItems = [{
        srNo: 1,
        particular: 'Furnishing Work & Materials',
        quantity: 1,
        unit: 'set',
        rate: q.finalAmount || q.totalFinalAmount || 0,
        total: q.finalAmount || q.totalFinalAmount || 0
      }];
    }

    // Financial calculations
    const subTotal = q.subTotal || rawItems.reduce((s, i) => s + (i.total || (i.quantity * i.rate)), 0);
    const discountAmount = q.discountAmount || 0;
    const preRoundFinal = Math.max(0, subTotal - discountAmount);
    const roundUp = Math.round(preRoundFinal) - preRoundFinal;
    const finalAmount = Math.round(preRoundFinal);
    const amountInWords = this.numberToWords(finalAmount);

    const formattedDate = q.createdAt 
      ? new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const footerFormattedDate = q.createdAt
      ? new Date(q.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Pagination chunking
    const pageChunks = this.chunkItemsForPages(rawItems);
    const totalPages = pageChunks.length;

    return pageChunks.map((chunk, index) => {
      const pageNum = index + 1;
      const isFirst = chunk.isFirstPage;
      const isLast = chunk.isLastPage;

      return `
      <div class="pdf-page-container">
        ${totalPages > 1 ? `<div class="pdf-page-indicator">Page ${pageNum} of ${totalPages}</div>` : ''}
        <div class="pdf-page" data-page="${pageNum}">
          <div class="page-content-flow">

          ${isFirst ? `
          <!-- ═══════════════════════════════════════════════════════════ -->
          <!-- 1. TOP BLUE HERO HEADER (PAGE 1 ONLY) -->
          <!-- ═══════════════════════════════════════════════════════════ -->
          <div class="top-blue-header">
            <div class="hero-quotation-title">Quotation</div>

            <!-- White Floating Information Card -->
            <div class="header-floating-card">
              <div class="hfc-left">
                <!-- Black Logo Square -->
                <div class="pfc-black-logo-box">
                  <img src="${logoSrc}" alt="PFC Logo" class="pfc-logo-img" />
                </div>

                <!-- Business Info -->
                <div class="pfc-biz-details">
                  <h1 class="pfc-biz-name">${this.escapeHtml(biz.firmName || 'PUKALE FURNISHING CENTRE')}</h1>
                  <div class="pfc-biz-address">
                    ${(biz.address || 'SHOP NO-121/122, S.S.HIGH SCHOOL\nCOMPLEX B.L.D.E.A. HOSPITAL\nROAD, VIJAYPURA,\nKarnataka, India - 586101').replace(/\r?\n/g, '<br/>')}
                  </div>
                  <div class="pfc-biz-taxes">
                    ${biz.gstNumber ? `<div>GSTIN: ${this.escapeHtml(biz.gstNumber)}</div>` : ''}
                    ${biz.panNumber ? `<div>PAN: ${this.escapeHtml(biz.panNumber)}</div>` : ''}
                  </div>
                </div>
              </div>

              <!-- Customer Details (Quotation For) -->
              <div class="hfc-right">
                <div class="quotation-for-label">QUOTATION FOR</div>
                <div class="customer-hero-name">${this.escapeHtml(cust.name || 'Valued Customer')}</div>
                <div class="customer-address-line">
                  ${cust.address ? `<div>${this.escapeHtml(cust.address)}</div>` : '<div>India</div>'}
                  ${cust.contactNumber ? `<div style="margin-top:2px;">📞 ${this.escapeHtml(cust.contactNumber)}</div>` : ''}
                </div>
              </div>
            </div>

            <!-- Blue Sub-header Meta Strip -->
            <div class="header-meta-strip">
              <div class="meta-strip-col">
                <div class="meta-col-lbl">Quotation No</div>
                <div class="meta-col-val font-mono">${this.escapeHtml(q.quotationNumber || 'A00063')}</div>
              </div>
              <div class="meta-strip-col">
                <div class="meta-col-lbl">Quotation Date</div>
                <div class="meta-col-val">${formattedDate}</div>
              </div>
            </div>
          </div>
          ` : `
          <!-- Page 2+ Top Spacing -->
          <div style="height: 24px;"></div>
          `}

          <!-- ═══════════════════════════════════════════════════════════ -->
          <!-- 2. PARTICULARS TABLE -->
          <!-- ═══════════════════════════════════════════════════════════ -->
          <div class="table-card-container">
            <table class="template-table">
              <thead>
                <tr>
                  <th class="th-part">PARTICULARS</th>
                  <th class="th-qty text-center">Quantity</th>
                  <th class="th-rate text-right">Rate</th>
                  <th class="th-tot text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${chunk.items.map((item, i) => `
                <tr>
                  <td class="td-part">
                    <div class="part-title-line">
                      <span class="part-sr">${item.srNo || (index * 15 + i + 1)}.</span>
                      <span class="part-text">${this.escapeHtml(item.particular)}</span>
                    </div>
                    ${item.description && item.description.trim() ? `
                    <div class="part-desc-line">
                      ${this.escapeHtml(item.description).replace(/\r?\n/g, '<br/>')}
                    </div>` : ''}
                  </td>
                  <td class="td-qty text-center font-mono">${item.quantity} ${item.unit ? `(${this.escapeHtml(item.unit)})` : ''}</td>
                  <td class="td-rate text-right font-mono">₹${this.formatCurrency(item.rate, item.rate % 1 === 0 ? 0 : 2)}</td>
                  <td class="td-tot text-right font-mono">₹${this.formatCurrency(item.total || (item.quantity * item.rate), 2)}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${isLast ? `
          <!-- ═══════════════════════════════════════════════════════════ -->
          <!-- 3. FINAL PAGE BOTTOM SECTION (BANK + TERMS & SUMMARY) -->
          <!-- ═══════════════════════════════════════════════════════════ -->
          <div class="bottom-financials-layout">
            <!-- Left: Bank Details & Terms -->
            <div class="bf-left">
              <div class="section-blue-title">BANK DETAILS</div>
              <table class="bank-details-mini-table">
                <tr>
                  <td class="bk-lbl">Account Name</td>
                  <td class="bk-val"><strong>${this.escapeHtml(bank.accountName || 'PUKALE FURNISHING CENTRE')}</strong></td>
                </tr>
                <tr>
                  <td class="bk-lbl">Account Number</td>
                  <td class="bk-val font-mono"><strong>${this.escapeHtml(bank.accountNumber || '925020051982106')}</strong></td>
                </tr>
                <tr>
                  <td class="bk-lbl">IFSC</td>
                  <td class="bk-val font-mono"><strong>${this.escapeHtml(bank.ifscCode || 'UTIB0000525')}</strong></td>
                </tr>
                <tr>
                  <td class="bk-lbl">Account Type</td>
                  <td class="bk-val">${this.escapeHtml((bank as any).accountType || 'Current')}</td>
                </tr>
                <tr>
                  <td class="bk-lbl">Bank</td>
                  <td class="bk-val"><strong>${this.escapeHtml(bank.bankName || 'AXIS BANK')}</strong></td>
                </tr>
              </table>

              <div class="section-blue-title" style="margin-top: 18px;">TERMS AND CONDITIONS</div>
              <div class="terms-text-block">
                ${(bank.termsAndConditions || 'WORK WILL BE STARTED AFTER AN ADVANCE PAYMENT OF 50%.\nGOODS ONCE DELIVERED WILL NOT BE REPLACED OR RETURNED.\nTHIS ESTIMATE IS VALID ONLY FOR THE NEXT 8 DAYS.\nENTIRE PAYMENT HAS TO BE CLEARED BEFORE THE INSTALLATION OF ANY PRODUCTS.')
                  .split('\n')
                  .map(t => t.trim())
                  .filter(t => t.length > 0)
                  .map(t => `<div>${this.escapeHtml(t)}</div>`)
                  .join('')}
              </div>
            </div>

            <!-- Right: Calculations & Total (INR) -->
            <div class="bf-right">
              <table class="summary-breakdown-table">
                <tr>
                  <td class="sum-lbl">Amount</td>
                  <td class="sum-val font-mono font-bold">₹${this.formatCurrency(subTotal, 2)}</td>
                </tr>
                <tr>
                  <td class="sum-lbl">Tax</td>
                  <td class="sum-val font-mono">₹0.00</td>
                </tr>
                ${discountAmount > 0 ? `
                <tr>
                  <td class="sum-lbl" style="color:#d97706;">Discounts</td>
                  <td class="sum-val font-mono" style="color:#d97706;">- ₹${this.formatCurrency(discountAmount, 2)}</td>
                </tr>` : `
                <tr>
                  <td class="sum-lbl">Discounts</td>
                  <td class="sum-val font-mono">₹0.00</td>
                </tr>`}
                <tr>
                  <td class="sum-lbl">Round Up</td>
                  <td class="sum-val font-mono">₹${this.formatCurrency(roundUp, 2)}</td>
                </tr>
              </table>

              <!-- Blue Total Banner -->
              <div class="total-blue-row">
                <span class="tbr-lbl">Total (INR)</span>
                <span class="tbr-val font-mono">₹${this.formatCurrency(finalAmount, 2)}</span>
              </div>

              <!-- Total in Words -->
              <div class="words-summary-box">
                <div class="words-heading">TOTAL (IN WORDS) :</div>
                <div class="words-body">${amountInWords}</div>
              </div>
            </div>
          </div>

          <!-- Enquiry Box -->
          <div class="enquiry-card-wrapper">
            For any enquiry, reach out via email at ${this.escapeHtml(biz.email || 'adityabondge20@gmail.com')}, call on ${this.escapeHtml(biz.contactNumber || '+91 99026 25960')}
          </div>
          ` : ''}

        </div>

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- 4. RUNNING FOOTER (ON EVERY PAGE) -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div class="page-footer-container">
          <div class="footer-meta-row">
            <div class="fm-col">
              <div class="fm-label">Quotation No</div>
              <div class="fm-val font-mono">${this.escapeHtml(q.quotationNumber || 'A00063')}</div>
            </div>
            <div class="fm-col">
              <div class="fm-label">Quotation Date</div>
              <div class="fm-val">${footerFormattedDate}</div>
            </div>
            <div class="fm-col">
              <div class="fm-label">Quotation For</div>
              <div class="fm-val">${this.escapeHtml(cust.name || 'LONI')}</div>
            </div>
            <div class="fm-col page-num-col">
              Page ${pageNum} of ${totalPages}
            </div>
          </div>
          <div class="footer-disclaimer-row">
            This is an electronically generated document, no signature is required.
          </div>
        </div>

      </div>
      </div>
      `;
    }).join('');
  }

  // Chunk items into exact A4 pages
  private chunkItemsForPages(items: QuotationItem[]): PageChunk[] {
    const getItemWeight = (item: QuotationItem) => {
      if (!item.description || !item.description.trim()) return 1;
      const lines = item.description.trim().split('\n').length;
      return 1 + Math.min(lines * 0.45, 1.4);
    };

    const totalWeight = items.reduce((sum, item) => sum + getItemWeight(item), 0);
    if (totalWeight <= 11) {
      // Entire quote fits on 1 page
      return [{
        items,
        pageIndex: 0,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true
      }];
    }

    const chunks: PageChunk[] = [];
    const remaining = [...items];

    // Page 1 takes up to 13 weight
    let p1Weight = 0;
    const p1Items: QuotationItem[] = [];
    while (remaining.length > 0 && (p1Weight + getItemWeight(remaining[0]) <= 13 || p1Items.length === 0)) {
      const item = remaining.shift()!;
      p1Items.push(item);
      p1Weight += getItemWeight(item);
      if (p1Weight >= 12.5) break;
    }

    chunks.push({
      items: p1Items,
      pageIndex: 0,
      totalPages: 0,
      isFirstPage: true,
      isLastPage: remaining.length === 0
    });

    while (remaining.length > 0) {
      const remWeight = remaining.reduce((sum, item) => sum + getItemWeight(item), 0);
      if (remWeight <= 10) {
        chunks.push({
          items: remaining.splice(0, remaining.length),
          pageIndex: chunks.length,
          totalPages: 0,
          isFirstPage: false,
          isLastPage: true
        });
      } else {
        let pageWeight = 0;
        const pageItems: QuotationItem[] = [];
        while (remaining.length > 0 && (pageWeight + getItemWeight(remaining[0]) <= 18 || pageItems.length === 0)) {
          const item = remaining.shift()!;
          pageItems.push(item);
          pageWeight += getItemWeight(item);
          if (pageWeight >= 17.5) break;
        }
        chunks.push({
          items: pageItems,
          pageIndex: chunks.length,
          totalPages: 0,
          isFirstPage: false,
          isLastPage: remaining.length === 0
        });
      }
    }

    const totalPages = chunks.length;
    chunks.forEach(c => c.totalPages = totalPages);
    return chunks;
  }

  getStyles(): string {
    return `
      .pdf-preview-wrapper {
        display: flex;
        flex-direction: column;
        gap: 32px;
        align-items: center;
        background: transparent;
        padding: 12px 0 40px 0;
        width: 100%;
      }
      .pdf-page-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
      }
      .pdf-page-indicator {
        font-size: 11px;
        font-weight: 700;
        color: #cbd5e1;
        margin-bottom: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: rgba(15, 23, 42, 0.65);
        padding: 4px 14px;
        border-radius: 9999px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .pdf-page {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #1e293b;
        background: #ffffff;
        font-size: 11.5px;
        line-height: 1.4;
        width: 794px;
        min-height: 1123px;
        max-height: 1123px;
        height: 1123px;
        box-sizing: border-box;
        margin: 0 auto;
        padding: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(0,0,0,0.35);
        border-radius: 4px;
      }
      .page-content-flow {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .font-mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
      .font-bold { font-weight: 800; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }

      /* Top Blue Header (Page 1) */
      .top-blue-header {
        background: #0284c7;
        padding: 26px 28px 18px 28px;
        color: #ffffff;
      }
      .hero-quotation-title {
        font-size: 32px;
        font-weight: 500;
        color: #ffffff;
        letter-spacing: -0.5px;
        margin-bottom: 14px;
        line-height: 1;
      }

      /* Header Floating White Card */
      .header-floating-card {
        background: #ffffff;
        border-radius: 6px;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .hfc-left {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        flex: 1.3;
      }
      .pfc-black-logo-box {
        width: 84px;
        height: 84px;
        background: #09090b;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
        padding: 4px;
      }
      .pfc-logo-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .pfc-biz-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .pfc-biz-name {
        font-size: 13.5px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: 0.3px;
        margin: 0 0 3px 0;
        line-height: 1.2;
      }
      .pfc-biz-address {
        font-size: 9.5px;
        color: #334155;
        line-height: 1.35;
        margin-bottom: 4px;
      }
      .pfc-biz-taxes {
        font-size: 9.5px;
        font-weight: 700;
        color: #1e293b;
        line-height: 1.35;
      }

      .hfc-right {
        flex: 0.9;
        text-align: left;
        padding-left: 10px;
      }
      .quotation-for-label {
        font-size: 9.5px;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-bottom: 3px;
      }
      .customer-hero-name {
        font-size: 13px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        margin-bottom: 2px;
        line-height: 1.2;
      }
      .customer-address-line {
        font-size: 9.5px;
        color: #334155;
        line-height: 1.35;
      }

      /* Header Meta Strip */
      .header-meta-strip {
        display: flex;
        gap: 48px;
        margin-top: 14px;
        padding-left: 2px;
      }
      .meta-strip-col {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .meta-col-lbl {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.85);
      }
      .meta-col-val {
        font-size: 13px;
        color: #ffffff;
        font-weight: 500;
      }

      /* Table Container */
      .table-card-container {
        margin: 20px 28px 16px 28px;
        border: 1.5px solid #bae6fd;
        border-radius: 4px;
        overflow: hidden;
      }
      .template-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11.5px;
      }
      .template-table th {
        background: #e0f2fe;
        color: #0369a1;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 9px 12px;
        border-bottom: 1.5px solid #bae6fd;
      }
      .th-part { width: 55%; text-align: left; }
      .th-qty  { width: 15%; }
      .th-rate { width: 15%; }
      .th-tot  { width: 15%; }

      .template-table td {
        padding: 7.5px 12px;
        border-bottom: 1px solid #f0f9ff;
        vertical-align: top;
      }
      .part-title-line {
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
      .part-sr {
        font-weight: 700;
        color: #0f172a;
        min-width: 18px;
      }
      .part-text {
        font-weight: 700;
        color: #0f172a;
        text-transform: uppercase;
        font-size: 11px;
      }
      .part-desc-line {
        font-size: 9.5px;
        color: #475569;
        font-weight: 500;
        margin-top: 3px;
        margin-left: 24px;
        line-height: 1.35;
        white-space: pre-line;
      }
      .td-qty {
        color: #0f172a;
        font-size: 11px;
      }
      .td-rate, .td-tot {
        color: #0f172a;
        font-size: 11.5px;
      }

      /* Bottom Financials Layout */
      .bottom-financials-layout {
        padding: 8px 28px 0 28px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 28px;
      }
      .bf-left {
        flex: 1.2;
      }
      .section-blue-title {
        font-size: 11px;
        font-weight: 800;
        color: #0284c7;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .bank-details-mini-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10.5px;
      }
      .bank-details-mini-table td {
        padding: 2.5px 4px 2.5px 0;
      }
      .bk-lbl {
        color: #475569;
        width: 110px;
      }
      .bk-val {
        color: #0f172a;
      }
      .terms-text-block {
        font-size: 9.5px;
        color: #334155;
        line-height: 1.45;
        font-weight: 500;
      }

      .bf-right {
        width: 320px;
      }
      .summary-breakdown-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11.5px;
      }
      .summary-breakdown-table td {
        padding: 3px 4px;
      }
      .sum-lbl {
        color: #475569;
      }
      .sum-val {
        text-align: right;
        color: #0f172a;
      }

      /* Total Blue Banner */
      .total-blue-row {
        background: #0284c7;
        color: #ffffff;
        padding: 9px 12px;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
      }
      .tbr-lbl {
        font-size: 12.5px;
        font-weight: 700;
        color: #ffffff;
      }
      .tbr-val {
        font-size: 14px;
        font-weight: 800;
        color: #ffffff;
      }

      .words-summary-box {
        margin-top: 10px;
        text-align: right;
      }
      .words-heading {
        font-size: 10px;
        font-weight: 800;
        color: #0284c7;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .words-body {
        font-size: 10.5px;
        color: #0f172a;
        line-height: 1.4;
        font-weight: 500;
      }

      /* Enquiry Box */
      .enquiry-card-wrapper {
        margin: 20px 28px 0 28px;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 8px 14px;
        text-align: center;
        font-size: 10.5px;
        color: #334155;
        font-weight: 500;
      }

      /* Running Page Footer */
      .page-footer-container {
        border-top: 1px dashed #cbd5e1;
        padding: 10px 28px 12px 28px;
        background: #ffffff;
      }
      .footer-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10px;
        color: #475569;
      }
      .fm-col {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .fm-label {
        font-size: 9px;
        color: #94a3b8;
      }
      .fm-val {
        font-weight: 600;
        color: #1e293b;
      }
      .page-num-col {
        font-weight: 600;
        color: #1e293b;
        text-align: right;
        font-size: 10px;
      }
      .footer-disclaimer-row {
        font-size: 9px;
        color: #64748b;
        text-align: center;
        margin-top: 6px;
      }
    `;
  }

  // Generate jsPDF Blob with exact multi-page rendering
  async generatePdfBlob(data: QuotationPdfData, customFilename?: string): Promise<{ doc: jsPDF; blob: Blob; filename: string }> {
    const htmlContent = this.generateQuotationHtml(data);
    const styles = this.getStyles();

    // Create an off-screen render container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '794px';
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-9999';
    container.innerHTML = `<style>${styles}</style>${htmlContent}`;
    document.body.appendChild(container);

    try {
      const pageElements = Array.from(container.querySelectorAll('.pdf-page')) as HTMLElement[];
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        if (i > 0) {
          doc.addPage();
        }
        doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const filename = customFilename?.trim() 
        ? (customFilename.endsWith('.pdf') ? customFilename : `${customFilename}.pdf`)
        : this.getDefaultFilename(data);

      const blob = doc.output('blob');
      return { doc, blob, filename };
    } finally {
      document.body.removeChild(container);
    }
  }

  // Direct download PDF without printer preview
  async downloadPdf(data: QuotationPdfData, customFilename?: string): Promise<string> {
    const { doc, filename } = await this.generatePdfBlob(data, customFilename);
    doc.save(filename);
    return filename;
  }

  // Share actual PDF Document via WhatsApp & Web Share API
  async shareViaWhatsApp(data: QuotationPdfData, customFilename?: string): Promise<{ sharedViaNative: boolean; filename: string }> {
    const { doc, blob, filename } = await this.generatePdfBlob(data, customFilename);
    const cust = data.customer || {
      name: data.quotation.customerName || '',
      contactNumber: data.quotation.customerContactNumber || ''
    };
    const cleanPhone = (cust.contactNumber || '').replace(/[^0-9]/g, '');

    // Web Share API with actual PDF file
    if (navigator.share) {
      try {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Quotation ${data.quotation.quotationNumber || ''}`,
            files: [file]
          });
          return { sharedViaNative: true, filename };
        }
      } catch (e) {
        // User cancelled share or browser fallback
      }
    }

    // Fallback on desktop: Download PDF directly to machine and open WhatsApp chat
    doc.save(filename);

    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(`*Attached: ${filename}*`)}`
      : `https://wa.me/?text=${encodeURIComponent(`*Attached: ${filename}*`)}`;
    
    window.open(waUrl, '_blank');
    return { sharedViaNative: false, filename };
  }

  // Print quotation using browser print dialog if user explicitly clicks preview/print
  printQuotation(data: QuotationPdfData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quotation - ${this.escapeHtml(data.quotation.quotationNumber || 'QT')}</title><style>${this.getStyles()} @media print { body { padding: 0; background: #fff; } .pdf-preview-wrapper { padding: 0; gap: 0; background: #fff; } .pdf-page { box-shadow: none; page-break-after: always; } }</style></head><body><div class="pdf-preview-wrapper">${this.generateQuotationHtml(data)}</div></body></html>`;
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups to preview PDF');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  }

  getPreviewHtmlWithStyles(data: QuotationPdfData): string {
    return `<div class="pdf-preview-wrapper"><style>${this.getStyles()}</style>${this.generateQuotationHtml(data)}</div>`;
  }

  getDefaultFilename(data: QuotationPdfData): string {
    const custName = (data.customer?.name || data.quotation.customerName || 'Customer')
      .replace(/[^a-zA-Z0-9]/g, '_');
    const quoteNo = (data.quotation.quotationNumber || 'QT')
      .replace(/[^a-zA-Z0-9]/g, '_');
    return `Quotation_${custName}_${quoteNo}.pdf`;
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
