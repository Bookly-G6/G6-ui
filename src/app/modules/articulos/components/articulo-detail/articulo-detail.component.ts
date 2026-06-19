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
import { Articulo } from '../../../../models/articulo.model';
import { ArticuloService } from '../../../../services/articulo.services';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-articulo-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './articulo-detail.component.html',
  styleUrl: './articulo-detail.component.css',
})
export class ArticuloDetailComponent implements OnInit, OnChanges {
  @Input() articuloId: string | null = null;
  @Output() close = new EventEmitter<void>();

  articulo: Articulo | null = null;
  isLoading = false;

  constructor(
    private articuloService: ArticuloService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.articuloId) {
      this.loadArticulo();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['articuloId'] && this.articuloId) {
      this.loadArticulo();
    }
  }

  private loadArticulo(): void {
    if (!this.articuloId) return;

    this.isLoading = true;
    this.articuloService.getArticuloById(this.articuloId).subscribe({
      next: (response) => {
        this.articulo = response;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.articulo = null;
        this.cdr.detectChanges();
        this.notification.show('No se pudo cargar la información del artículo.', 'error');
      },
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
