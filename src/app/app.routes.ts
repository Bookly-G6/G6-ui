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
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./modules/users/pages/user-list/user-list.page').then((m) => m.UserListPage),
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./modules/roles/pages/role-list/role-list.page').then((m) => m.RoleListPage),
  },
  {
    path: 'articulos',
    loadComponent: () =>
      import('./modules/articulos/pages/articulo-list/articulo-list.page').then(
        (m) => m.ArticuloListPage,
      ),
  },
];
