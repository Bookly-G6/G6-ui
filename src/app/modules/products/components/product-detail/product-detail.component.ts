import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../models/product.model';
import { ProductService } from '../../../../services/product.services';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent implements OnChanges, OnInit {
  @Input() productId: string | null = null;
  @Output() close = new EventEmitter<void>();

  product: Product | null = null;
  isLoading = false;

  constructor(
    private productService: ProductService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.productId) this.loadProduct();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && this.productId) this.loadProduct();
  }

  private loadProduct(): void {
    if (!this.productId) return;
    this.isLoading = true;
    this.productService.getProductById(this.productId).subscribe({
      next: (response) => {
        const payload = (response as Product & { data?: Product }).data ?? response;
        this.product = payload as Product;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.product = null;
        this.cdr.detectChanges();
        this.notification.show('No se pudo cargar la información del producto.', 'error');
      },
    });
  }

  // atributosEspecificos puede venir vacío {} o con datos variables
  get atributos(): { key: string; value: string }[] {
    const attrs = this.product?.atributosEspecificos ?? {};
    return Object.entries(attrs).map(([key, value]) => ({
      key: key.replace(/_/g, ' '),
      value: typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value),
    }));
  }

  onClose(): void {
    this.close.emit();
  }
}
