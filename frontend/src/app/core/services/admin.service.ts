import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminCustomer, AdminCustomerDetail, ApiDataResponse, DashboardStats, Order, OrderStatus, PaginatedResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  constructor(private readonly http: HttpClient) {}

  dashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/dashboard`);
  }

  listOrders(status?: OrderStatus | '', page = 1, limit = 20): Observable<PaginatedResponse<Order>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params['status'] = status;
    return this.http.get<PaginatedResponse<Order>>(`${this.baseUrl}/orders`, { params });
  }

  getOrder(id: number): Observable<ApiDataResponse<Order>> {
    return this.http.get<ApiDataResponse<Order>>(`${this.baseUrl}/orders/${id}`);
  }

  updateOrderStatus(id: number, status: OrderStatus): Observable<ApiDataResponse<Order>> {
    return this.http.put<ApiDataResponse<Order>>(`${this.baseUrl}/orders/${id}/status`, { status });
  }

  listCustomers(page = 1, limit = 20): Observable<PaginatedResponse<AdminCustomer>> {
    return this.http.get<PaginatedResponse<AdminCustomer>>(`${this.baseUrl}/customers`, {
      params: { page: String(page), limit: String(limit) },
    });
  }

  getCustomer(id: number): Observable<ApiDataResponse<AdminCustomerDetail>> {
    return this.http.get<ApiDataResponse<AdminCustomerDetail>>(`${this.baseUrl}/customers/${id}`);
  }
}
