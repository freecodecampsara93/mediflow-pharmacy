import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse, PaginatedResponse, Supplier, SupplierPayload } from '../../models';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly baseUrl = `${environment.apiUrl}/suppliers`;

  constructor(private readonly http: HttpClient) {}

  list(page = 1, limit = 20): Observable<PaginatedResponse<Supplier>> {
    return this.http.get<PaginatedResponse<Supplier>>(this.baseUrl, {
      params: { page: String(page), limit: String(limit) },
    });
  }

  get(id: number): Observable<ApiDataResponse<Supplier>> {
    return this.http.get<ApiDataResponse<Supplier>>(`${this.baseUrl}/${id}`);
  }

  create(payload: SupplierPayload): Observable<ApiDataResponse<Supplier>> {
    return this.http.post<ApiDataResponse<Supplier>>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<SupplierPayload>): Observable<ApiDataResponse<Supplier>> {
    return this.http.put<ApiDataResponse<Supplier>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
