import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse, Batch, Inventory, InventoryUpdatePayload } from '../../models';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly baseUrl = `${environment.apiUrl}/inventory`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<ApiDataResponse<Inventory[]>> {
    return this.http.get<ApiDataResponse<Inventory[]>>(this.baseUrl);
  }

  lowStock(): Observable<ApiDataResponse<Inventory[]>> {
    return this.http.get<ApiDataResponse<Inventory[]>>(`${this.baseUrl}/low-stock`);
  }

  expiringSoon(days?: number): Observable<ApiDataResponse<Batch[]>> {
    const params: Record<string, string> = {};
    if (days) params['days'] = String(days);
    return this.http.get<ApiDataResponse<Batch[]>>(`${this.baseUrl}/expiring-soon`, { params });
  }

  expired(): Observable<ApiDataResponse<Batch[]>> {
    return this.http.get<ApiDataResponse<Batch[]>>(`${this.baseUrl}/expired`);
  }

  update(medicineId: number, payload: InventoryUpdatePayload): Observable<ApiDataResponse<Inventory>> {
    return this.http.put<ApiDataResponse<Inventory>>(`${this.baseUrl}/${medicineId}`, payload);
  }
}
