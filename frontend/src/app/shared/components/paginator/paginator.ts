import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Pagination } from '../../../models';

@Component({
  selector: 'app-paginator',
  standalone: true,
  templateUrl: './paginator.html',
  styleUrl: './paginator.css',
})
export class Paginator {
  @Input({ required: true }) pagination!: Pagination;
  @Output() pageChange = new EventEmitter<number>();

  get hasPrev(): boolean {
    return this.pagination.page > 1;
  }

  get hasNext(): boolean {
    return this.pagination.page < this.pagination.totalPages;
  }

  goTo(page: number): void {
    if (page < 1 || page > this.pagination.totalPages || page === this.pagination.page) return;
    this.pageChange.emit(page);
  }
}
