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
import { Rol } from '../../../../models/rol.model';
import { RolService } from '../../../../services/rol.services';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-detail.component.html',
  styleUrl: './role-detail.component.css',
})
export class RoleDetailComponent implements OnInit, OnChanges {
  @Input() roleId: number | string | null = null;
  @Output() close = new EventEmitter<void>();

  role: Rol | null = null;
  isLoading = false;

  constructor(
    private rolService: RolService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.roleId !== null && this.roleId !== undefined) {
      this.loadRole();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roleId'] && this.roleId !== null && this.roleId !== undefined) {
      this.loadRole();
    }
  }

  private loadRole(): void {
    if (this.roleId === null || this.roleId === undefined) return;

    this.isLoading = true;
    this.rolService.getRoleById(this.roleId).subscribe({
      next: (response) => {
        this.role = response;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.role = null;
        this.cdr.detectChanges();
        this.notification.show('No se pudo cargar la información del rol.', 'error');
      },
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
