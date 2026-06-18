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
  // Eventos para avisarle a la página principal (padre) qué hacer
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

  // Inicializamos el formulario estructurando las validaciones según el DER
  private initForm(): void {
    this.productForm = this.fb.group({
      codigo_barras: ['', [Validators.required, Validators.minLength(3)]],
      nombre_producto: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: [''],
      precio_actual: [0, [Validators.required, Validators.min(0.01)]],
      activo: [true],
      id_tipo_producto: [1, [Validators.required]], // Valores iniciales por defecto
      id_editorial_sello: [1, [Validators.required]],
      id_rango_etario: [1, [Validators.required]],
    });
  }

  // Método para enviar los datos al hacer submit
  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched(); // Marca los errores visuales si intentan mandar el formulario incompleto
      return;
    }

    this.isSubmitting = true;
    const newProduct = this.productForm.value;

    // Cuando el método POST del backend esté listo, usaremos el servicio:
    console.log('Enviando nuevo producto al backend:', newProduct);

    // Simulamos una respuesta exitosa por ahora:
    setTimeout(() => {
      this.isSubmitting = false;
      this.saved.emit(); // Le avisa al padre que recargue el listado
      this.close.emit(); // Cierra el modal
    }, 800);
  }

  onCancel(): void {
    this.close.emit();
  }
}
