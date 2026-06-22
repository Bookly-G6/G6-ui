import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductListPage } from '../../../products/pages/product-list/product-list.page';
import { UserListPage } from '../../../users/pages/user-list/user-list.page';
import { CatalogSettingsPanelComponent } from '../../components/catalog-settings-panel/catalog-settings-panel.component';

type MasterTab = 'productos' | 'categorias' | 'usuarios';

@Component({
  selector: 'app-admin-master-page',
  imports: [CommonModule, ProductListPage, UserListPage, CatalogSettingsPanelComponent],
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
