import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse, Category, CategoryPayload } from '../../models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly baseUrl = `${environment.apiUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  list(includeInactive = false): Observable<ApiDataResponse<Category[]>> {
    const params: Record<string, string> = {};
    if (includeInactive) params['all'] = 'true';
    return this.http.get<ApiDataResponse<Category[]>>(this.baseUrl, { params });
  }

  get(id: number): Observable<ApiDataResponse<Category>> {
    return this.http.get<ApiDataResponse<Category>>(`${this.baseUrl}/${id}`);
  }

  create(payload: CategoryPayload): Observable<ApiDataResponse<Category>> {
    return this.http.post<ApiDataResponse<Category>>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<CategoryPayload>): Observable<ApiDataResponse<Category>> {
    return this.http.put<ApiDataResponse<Category>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
