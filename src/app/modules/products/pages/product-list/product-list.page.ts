import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { ProductFormComponent } from '../../components/product-form/product-form.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductFormComponent],
  templateUrl: './product-list.page.html',
  styleUrl: './product-list.page.css',
})
export class ProductListPage implements OnInit {
  products: Product[] = []; // Lista limpia que se llenará con datos del backend

  // Variable para controlar la visibilidad del modal del formulario (Paso 3)
  isModalOpen = false;
  selectedProduct: Product | null = null; // Guarda el producto temporal para edición

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    // CONEXION CON EL GET DEL BACKEND AL INICIAR
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => (this.products = data),
      error: (err) => console.error('Error al cargar productos desde la API:', err),
    });
  }

  openModal(product: Product | null = null): void {
    this.selectedProduct = product; // Si viene un producto es Editar, si viene null es Nuevo
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedProduct = null;
  }

  // Borrar producto (DELETE)
  deleteProduct(id: string | undefined): void {
    if (!id) return;

    if (confirm('¿Estás seguro de que deseas eliminar (desactivar) este producto?')) {
      this.productService.deleteProduct(id).subscribe({
        next: () => {
          console.log('Producto desactivado correctamente');
          this.loadProducts(); // Recarga la tabla de inmediato
        },
        error: (err) => console.error('Error al eliminar el producto:', err),
      });
    }
  }
}
