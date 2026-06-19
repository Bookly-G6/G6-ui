import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'productos', pathMatch: 'full' },
  {
    path: 'productos',
    loadComponent: () =>
      import('./modules/products/pages/product-list/product-list.page').then(
        (m) => m.ProductListPage,
      ),
  },
  {
    path: 'logistica',
    loadComponent: () =>
      import('./modules/logistica/pages/logistica-list/logistica-list.page').then(
        (m) => m.LogisticaListPage,
      ),
  },
];
