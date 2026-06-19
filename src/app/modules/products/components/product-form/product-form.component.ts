import { Component, EventEmitter, Output, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
})
export class ProductFormComponent implements OnInit {
  @Input() productToEdit: Product | null = null;
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
    // Si viene un producto para editar, se cargan los datos en el formulario
    if (this.productToEdit) {
      this.productForm.patchValue(this.productToEdit);
    }
  }

  private initForm(): void {
    this.productForm = this.fb.group({
      codigoBarras: ['', [Validators.required, Validators.minLength(8)]],
      nombreProducto: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: [''],
      precioActual: [1, [Validators.required, Validators.min(0.01)]],
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
    const productData = this.productForm.value;

    if (this.productToEdit && this.productToEdit.idProducto) {
      // MODO EDICIÓN: Ejecuta el PUT
      this.productService.updateProduct(this.productToEdit.idProducto, productData).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => this.handleError(err),
      });
    } else {
      // MODO CREACIÓN: Ejecuta el POST
      this.productService.createProduct(productData).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => this.handleError(err),
      });
    }
  }

  private handleSuccess(): void {
    this.isSubmitting = false;
    this.saved.emit();
    this.close.emit();
  }

  private handleError(err: any): void {
    console.error('Error en la operación:', err);
    this.isSubmitting = false;
    alert('Error en la API. Verifica que las claves foráneas existan en el backend.');
  }

  onCancel(): void {
    this.close.emit();
  }
}
