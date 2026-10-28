import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse, Medicine, MedicinePayload, MedicineQuery, PaginatedResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class MedicineService {
  private readonly baseUrl = `${environment.apiUrl}/medicines`;

  constructor(private readonly http: HttpClient) {}

  list(query: MedicineQuery = {}): Observable<PaginatedResponse<Medicine>> {
    const params: Record<string, string> = {};
    if (query.search) params['search'] = query.search;
    if (query.category !== undefined && query.category !== null && query.category !== '') {
      params['category'] = String(query.category);
    }
    if (query.manufacturer) params['manufacturer'] = query.manufacturer;
    if (query.minPrice !== undefined) params['minPrice'] = String(query.minPrice);
    if (query.maxPrice !== undefined) params['maxPrice'] = String(query.maxPrice);
    if (query.inStock !== undefined) params['inStock'] = String(query.inStock);
    params['page'] = String(query.page ?? 1);
    params['limit'] = String(query.limit ?? 12);

    return this.http.get<PaginatedResponse<Medicine>>(this.baseUrl, { params });
  }

  get(id: number): Observable<ApiDataResponse<Medicine>> {
    return this.http.get<ApiDataResponse<Medicine>>(`${this.baseUrl}/${id}`);
  }

  create(payload: MedicinePayload): Observable<ApiDataResponse<Medicine>> {
    return this.http.post<ApiDataResponse<Medicine>>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<MedicinePayload>): Observable<ApiDataResponse<Medicine>> {
    return this.http.put<ApiDataResponse<Medicine>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
