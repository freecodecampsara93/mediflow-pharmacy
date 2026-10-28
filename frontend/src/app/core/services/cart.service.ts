import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse, Cart } from '../../models';

const EMPTY_CART: Cart = { cartId: 0, items: [], total: 0 };

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly baseUrl = `${environment.apiUrl}/cart`;
  private readonly cartSignal = signal<Cart>(EMPTY_CART);

  readonly cart = this.cartSignal.asReadonly();
  readonly itemCount = computed(() =>
    this.cartSignal().items.reduce((sum, item) => sum + item.quantity, 0)
  );

  constructor(private readonly http: HttpClient) {}

  refresh(): Observable<ApiDataResponse<Cart>> {
    return this.http
      .get<ApiDataResponse<Cart>>(this.baseUrl)
      .pipe(tap((res) => this.cartSignal.set(res.data)));
  }

  addItem(medicineId: number, quantity: number): Observable<ApiDataResponse<Cart>> {
    return this.http
      .post<ApiDataResponse<Cart>>(`${this.baseUrl}/items`, { medicineId, quantity })
      .pipe(tap((res) => this.cartSignal.set(res.data)));
  }

  updateItem(medicineId: number, quantity: number): Observable<ApiDataResponse<Cart>> {
    return this.http
      .put<ApiDataResponse<Cart>>(`${this.baseUrl}/items/${medicineId}`, { quantity })
      .pipe(tap((res) => this.cartSignal.set(res.data)));
  }

  removeItem(medicineId: number): Observable<ApiDataResponse<Cart>> {
    return this.http
      .delete<ApiDataResponse<Cart>>(`${this.baseUrl}/items/${medicineId}`)
      .pipe(tap((res) => this.cartSignal.set(res.data)));
  }

  clear(): Observable<void> {
    return this.http.delete<void>(this.baseUrl).pipe(tap(() => this.cartSignal.set(EMPTY_CART)));
  }

  reset(): void {
    this.cartSignal.set(EMPTY_CART);
  }
}
