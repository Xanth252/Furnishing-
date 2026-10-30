import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Customer, CustomerDetail, Product, Dashboard, MonthlyReportResponse, Quotation } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private api = environment.apiUrl || '/api';
  constructor(private http: HttpClient) {}

  getDashboard() { return this.http.get<Dashboard>(`${this.api}/dashboard`); }
  getMonthlyReport(year?: number) {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    return this.http.get<MonthlyReportResponse>(`${this.api}/dashboard/monthly`, { params });
  }

  getCustomers(search?: string, phone?: string) {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (phone) params = params.set('phone', phone);
    return this.http.get<Customer[]>(`${this.api}/customers`, { params });
  }
  getCustomer(id: number) { return this.http.get<CustomerDetail>(`${this.api}/customers/${id}`); }
  createCustomer(data: any) { return this.http.post<Customer>(`${this.api}/customers`, data); }
  updateCustomer(id: number, data: any) { return this.http.put(`${this.api}/customers/${id}`, data); }
  deleteCustomer(id: number) { return this.http.delete(`${this.api}/customers/${id}`); }

  getQuotationsByCustomer(customerId: number) { return this.http.get<Quotation[]>(`${this.api}/quotations/customer/${customerId}`); }
  getQuotation(id: number) { return this.http.get<Quotation>(`${this.api}/quotations/${id}`); }
  getQuotationsSummary(search?: string) {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<any[]>(`${this.api}/quotations/summary`, { params });
  }
  getNextQuotationNumber() { return this.http.get<{ quotationNumber: string }>(`${this.api}/quotations/next-number`); }
  createQuotation(data: any) { return this.http.post<Quotation>(`${this.api}/quotations`, data); }
  updateQuotation(id: number, data: any) { return this.http.put(`${this.api}/quotations/${id}`, data); }
  deleteQuotation(id: number) { return this.http.delete(`${this.api}/quotations/${id}`); }

  getProducts(filters?: any) {
    let params = new HttpParams();
    if (filters?.serial) params = params.set('serial', filters.serial);
    if (filters?.company) params = params.set('company', filters.company);
    if (filters?.productType) params = params.set('productType', filters.productType);
    if (filters?.quoteStatus) params = params.set('quoteStatus', filters.quoteStatus);
    if (filters?.paymentStatus) params = params.set('paymentStatus', filters.paymentStatus);
    return this.http.get<Product[]>(`${this.api}/products`, { params });
  }
  getProduct(id: number) { return this.http.get<Product>(`${this.api}/products/${id}`); }
  createProduct(data: any) { return this.http.post<Product>(`${this.api}/products`, data); }
  updateProduct(id: number, data: any) { return this.http.put(`${this.api}/products/${id}`, data); }
  deleteProduct(id: number) { return this.http.delete(`${this.api}/products/${id}`); }
  updateStage(productId: number, stageId: number, data: any) {
    return this.http.put(`${this.api}/products/${productId}/stages/${stageId}`, data);
  }
  exportExcel() { return this.http.get(`${this.api}/products/export/excel`, { responseType: 'blob' }); }

  // Particulars & Units
  getParticulars(search?: string) {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<import('../models/models').SavedParticular[]>(`${this.api}/particulars`, { params });
  }
  saveParticular(data: { particular: string; defaultUnit?: string; defaultRate?: number }) {
    return this.http.post<import('../models/models').SavedParticular>(`${this.api}/particulars`, data);
  }
  deleteParticular(id: number) {
    return this.http.delete(`${this.api}/particulars/${id}`);
  }
  getUnits() {
    return this.http.get<string[]>(`${this.api}/particulars/units`);
  }
  addUnit(unit: string) {
    return this.http.post<{ success: boolean; unit: string }>(`${this.api}/particulars/units`, JSON.stringify(unit), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Business & Bank Settings
  getBusinessProfile() {
    return this.http.get<import('../models/models').BusinessProfile>(`${this.api}/settings/business-profile`);
  }
  saveBusinessProfile(profile: import('../models/models').BusinessProfile) {
    return this.http.post<import('../models/models').BusinessProfile>(`${this.api}/settings/business-profile`, profile);
  }
  getBankDetails() {
    return this.http.get<import('../models/models').BankDetails>(`${this.api}/settings/bank-details`);
  }
  saveBankDetails(bank: import('../models/models').BankDetails) {
    return this.http.post<import('../models/models').BankDetails>(`${this.api}/settings/bank-details`, bank);
  }
}
