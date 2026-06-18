import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../../../../services/product.services';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
})
export class ProductFormComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  productForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    // Cambiados a camelCase para emparejar con la clase de Java
    this.productForm = this.fb.group({
      codigoBarras: ['', [Validators.required, Validators.minLength(3)]],
      nombreProducto: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: [''],
      precioActual: [0, [Validators.required, Validators.min(0.01)]],
      activo: [true],
      idTipoProducto: [1, [Validators.required]],
      idEditorialSello: [1, [Validators.required]],
      idRangoEtario: [1, [Validators.required]],
    });
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const newProduct = this.productForm.value;

    // CONEXIÓN CON EL POST DEL BACKEND
    this.productService.createProduct(newProduct).subscribe({
      next: (response) => {
        console.log('Producto creado con éxito en el backend:', response);
        this.isSubmitting = false;
        this.saved.emit(); // Notifica al padre que recargue la lista
        this.close.emit(); // Cierra el modal
      },
      error: (err) => {
        console.error('Error al guardar el producto:', err);
        this.isSubmitting = false;
        alert('Ocurrió un error al conectar con el servidor.');
      },
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}
