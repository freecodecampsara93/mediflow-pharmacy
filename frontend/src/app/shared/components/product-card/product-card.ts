import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Medicine } from '../../../models';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  @Input({ required: true }) medicine!: Medicine;
  @Input() wishlisted = false;
  @Input() showWishlist = true;
  @Output() addToCart = new EventEmitter<Medicine>();
  @Output() toggleWishlist = new EventEmitter<Medicine>();

  get inStock(): boolean {
    return (this.medicine.totalStock ?? 0) > 0;
  }

  get placeholderInitial(): string {
    return this.medicine.name?.charAt(0)?.toUpperCase() ?? '?';
  }
}
