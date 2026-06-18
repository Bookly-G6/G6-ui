import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule], // Habilita directivas como *ngIf, *ngFor o el nuevo flujo de control
  templateUrl: './product-list.page.html',
  styleUrl: './product-list.page.css',
})
export class ProductListPage implements OnInit {
  products: Product[] = [];

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    // Cuando el backend de Java Spring Boot esté listo, descomentamos esta línea:
    // this.productService.getProducts().subscribe(data => this.products = data);
  }
}
