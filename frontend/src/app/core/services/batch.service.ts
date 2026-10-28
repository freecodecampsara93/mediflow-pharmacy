import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse, Batch, BatchPayload } from '../../models';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly baseUrl = `${environment.apiUrl}/batches`;

  constructor(private readonly http: HttpClient) {}

  list(medicineId?: number, supplierId?: number): Observable<ApiDataResponse<Batch[]>> {
    const params: Record<string, string> = {};
    if (medicineId !== undefined) params['medicineId'] = String(medicineId);
    if (supplierId !== undefined) params['supplierId'] = String(supplierId);
    return this.http.get<ApiDataResponse<Batch[]>>(this.baseUrl, { params });
  }

  get(id: number): Observable<ApiDataResponse<Batch>> {
    return this.http.get<ApiDataResponse<Batch>>(`${this.baseUrl}/${id}`);
  }

  create(payload: BatchPayload): Observable<ApiDataResponse<Batch>> {
    return this.http.post<ApiDataResponse<Batch>>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<BatchPayload>): Observable<ApiDataResponse<Batch>> {
    return this.http.put<ApiDataResponse<Batch>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
