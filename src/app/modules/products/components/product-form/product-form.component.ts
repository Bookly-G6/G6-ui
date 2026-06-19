import { Component, EventEmitter, Output, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { NotificationService } from '../../../../services/notification';

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
    private notification: NotificationService,
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
      this.notification.show('Completa los campos obligatorios.', 'info');
      return;
    }

    this.isSubmitting = true;
    const productData = this.productForm.value;
    const isEditing = Boolean(this.productToEdit && this.productToEdit.idProducto);

    const successMessage = isEditing
      ? '¡Producto actualizado con éxito!'
      : '¡Producto registrado con éxito!';

    const errorMessage = isEditing
      ? 'No se pudo actualizar el producto. Intenta nuevamente.'
      : 'No se pudo crear el producto. Intenta nuevamente.';

    if (isEditing) {
      this.productService.updateProduct(this.productToEdit!.idProducto!, productData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notification.show(successMessage, 'success');
          this.saved.emit();
          this.close.emit();
        },
        error: () => {
          this.isSubmitting = false;
          this.notification.show(errorMessage, 'error');
        },
      });
    } else {
      this.productService.createProduct(productData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notification.show(successMessage, 'success');
          this.saved.emit();
          this.close.emit();
        },
        error: () => {
          this.isSubmitting = false;
          this.notification.show(errorMessage, 'error');
        },
      });
    }
  }

  onCancel(): void {
    this.close.emit();
  }
}
