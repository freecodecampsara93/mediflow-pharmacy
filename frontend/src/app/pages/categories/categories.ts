import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../shared/utils/error.util';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterLink, LoadingSpinner, EmptyState],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories implements OnInit {
  private readonly categoryService = inject(CategoryService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly categories = signal<Category[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.categoryService.list().subscribe({
      next: (res) => {
        this.categories.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load categories.'));
        this.loading.set(false);
      },
    });
  }
}
