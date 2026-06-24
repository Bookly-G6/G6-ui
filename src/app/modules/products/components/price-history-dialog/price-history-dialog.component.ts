import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../../services/product.services';
import { HistorialPrecio } from '../../../../models/product.model';

@Component({
  selector: 'app-price-history-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-history-dialog.component.html',
  styleUrl: './price-history-dialog.component.css',
})
export class PriceHistoryDialogComponent implements OnInit {
  private readonly productService = inject(ProductService);

  @Input({ required: true }) productId!: string;
  @Input({ required: true }) productName!: string;
  @Output() close = new EventEmitter<void>();

  readonly history = signal<HistorialPrecio[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading.set(true);
    this.productService.getProductPriceHistory(this.productId).subscribe({
      next: (data) => {
        // Ordenar por fecha descendente (más reciente primero)
        const sorted = (data || []).sort((a, b) => 
          new Date(b.fechaCambio).getTime() - new Date(a.fechaCambio).getTime()
        );
        this.history.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.history.set([]);
        this.loading.set(false);
      },
    });
  }

  closeDialog(): void {
    this.close.emit();
  }

  getPriceDiff(prev: number, current: number): number {
    return current - prev;
  }
}
