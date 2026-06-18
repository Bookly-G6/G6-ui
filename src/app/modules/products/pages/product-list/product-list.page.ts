import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
// componente hijo que se mostrará como modal para crear/editar productos
import { ProductFormComponent } from '../../components/product-form/product-form.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductFormComponent],
  templateUrl: './product-list.page.html',
  styleUrl: './product-list.page.css',
})
export class ProductListPage implements OnInit {
  // Datos de prueba temporales para diseñar la interfaz
  products: Product[] = [
    {
      id_producto: '11111111-2222-3333-4444-555555555555',
      codigo_barras: '9789507319854',
      nombre_producto: 'El Aleph',
      descripcion: 'Una de las obras cumbre de la literatura hispanoamericana.',
      precio_actual: 14500.0,
      activo: true,
      id_tipo_producto: 1, // Libro Físico
      id_editorial_sello: 10, // Emecé Editores
      id_rango_etario: 3, // Adultos
    },
    {
      id_producto: '66666666-7777-8888-9999-000000000000',
      codigo_barras: '9788415618775',
      nombre_producto: 'Cuentos Completos - Edgar Allan Poe',
      descripcion: 'Compilación de relatos de terror y misterio.',
      precio_actual: 18200.0,
      activo: true,
      id_tipo_producto: 1,
      id_editorial_sello: 12,
      id_rango_etario: 3,
    },
  ];

  // Variable para controlar la visibilidad del modal del formulario (Paso 3)
  isModalOpen = false;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    // Cuando el backend esté listo, reemplazará los datos de prueba:
    // this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => (this.products = data),
      error: (err) => console.error('Error al cargar productos desde la API:', err),
    });
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }
}
