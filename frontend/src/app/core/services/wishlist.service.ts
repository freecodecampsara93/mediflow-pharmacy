import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse, WishlistItem } from '../../models';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly baseUrl = `${environment.apiUrl}/wishlist`;
  private readonly itemsSignal = signal<WishlistItem[]>([]);

  readonly items = this.itemsSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  refresh(): Observable<ApiDataResponse<WishlistItem[]>> {
    return this.http
      .get<ApiDataResponse<WishlistItem[]>>(this.baseUrl)
      .pipe(tap((res) => this.itemsSignal.set(res.data)));
  }

  add(medicineId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${medicineId}`, {});
  }

  remove(medicineId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${medicineId}`).pipe(
      tap(() => this.itemsSignal.update((list) => list.filter((i) => i.medicineId !== medicineId)))
    );
  }

  isWishlisted(medicineId: number): boolean {
    return this.itemsSignal().some((i) => i.medicineId === medicineId);
  }

  reset(): void {
    this.itemsSignal.set([]);
  }
}
