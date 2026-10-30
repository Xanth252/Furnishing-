import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'customers', loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersComponent), canActivate: [authGuard] },
  { path: 'customers/:id', loadComponent: () => import('./pages/customer-detail/customer-detail.component').then(m => m.CustomerDetailComponent), canActivate: [authGuard] },
  { path: 'products', loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent), canActivate: [authGuard] },
  { path: 'calculation', loadComponent: () => import('./pages/calculation/calculation.component').then(m => m.CalculationComponent), canActivate: [authGuard] },
  { path: 'quotation-maker', loadComponent: () => import('./pages/quotation-maker/quotation-maker.component').then(m => m.QuotationMakerComponent), canActivate: [authGuard] },
  { path: 'quotation-maker/:id', loadComponent: () => import('./pages/quotation-maker/quotation-maker.component').then(m => m.QuotationMakerComponent), canActivate: [authGuard] },
  { path: 'monthly-report', loadComponent: () => import('./pages/monthly-report/monthly-report.component').then(m => m.MonthlyReportComponent), canActivate: [authGuard] },
  { path: 'quotations', loadComponent: () => import('./pages/quotations-summary/quotations-summary.component').then(m => m.QuotationsSummaryComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
