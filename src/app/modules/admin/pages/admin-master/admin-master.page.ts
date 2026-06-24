import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductListPage } from '../../../products/pages/product-list/product-list.page';
import { UserListPage } from '../../../users/pages/user-list/user-list.page';
import { CatalogSettingsPanelComponent } from '../../components/catalog-settings-panel/catalog-settings-panel.component';
import { TipoProductoSettingsComponent } from '../../components/tipo-producto-settings/tipo-producto-settings.component';
import { AutoresSettingsComponent } from '../../components/autores-settings/autores-settings.component';

type MasterTab = 'productos' | 'tipos-producto' | 'categorias' | 'autores' | 'usuarios';

@Component({
  selector: 'app-admin-master-page',
  imports: [
    CommonModule,
    ProductListPage,
    UserListPage,
    CatalogSettingsPanelComponent,
    TipoProductoSettingsComponent,
    AutoresSettingsComponent,
  ],
  templateUrl: './admin-master.page.html',
  styleUrl: './admin-master.page.css',
  animations: [
    trigger('sectionSwap', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('280ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('180ms ease', style({ opacity: 0, transform: 'translateY(-6px)' })),
      ]),
    ]),
  ],
})
export class AdminMasterPage {
  readonly currentTab = signal<MasterTab>('productos');

  setTab(tab: MasterTab): void {
    this.currentTab.set(tab);
  }
}
