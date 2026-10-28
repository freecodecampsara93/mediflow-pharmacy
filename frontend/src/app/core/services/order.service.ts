import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse, CreateOrderPayload, Order, PaginatedResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly baseUrl = `${environment.apiUrl}/orders`;

  constructor(private readonly http: HttpClient) {}

  create(payload: CreateOrderPayload): Observable<ApiDataResponse<Order>> {
    return this.http.post<ApiDataResponse<Order>>(this.baseUrl, payload);
  }

  listMine(page = 1, limit = 10): Observable<PaginatedResponse<Order>> {
    return this.http.get<PaginatedResponse<Order>>(this.baseUrl, {
      params: { page: String(page), limit: String(limit) },
    });
  }

  getMine(id: number): Observable<ApiDataResponse<Order>> {
    return this.http.get<ApiDataResponse<Order>>(`${this.baseUrl}/${id}`);
  }
}
