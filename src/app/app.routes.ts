import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { clienteGuard } from './core/guards/cliente.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-shell/main-shell.component').then((m) => m.MainShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/storefront/pages/catalog/catalog.page').then((m) => m.CatalogPage),
      },
      {
        path: 'mis-ordenes',
        canActivate: [clienteGuard],
        loadComponent: () =>
          import('./modules/storefront/pages/orders/orders.page').then((m) => m.OrdersPage),
      },
      {
        path: 'checkout',
        canActivate: [clienteGuard],
        loadComponent: () =>
          import('./modules/storefront/pages/checkout/checkout.page').then((m) => m.CheckoutPage),
      },
      {
        path: 'producto/:id',
        loadComponent: () =>
          import('./modules/storefront/pages/product-detail/product-detail.page').then(
            (m) => m.ProductDetailPage,
          ),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/admin/pages/admin-master/admin-master.page').then(
            (m) => m.AdminMasterPage,
          ),
      },
      {
        path: 'admin/ordenes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/admin/pages/admin-orders/admin-orders.page').then(
            (m) => m.AdminOrdersPage,
          ),
      },
      {
        path: 'admin/venta',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/admin/pages/admin-sale/admin-sale.page').then((m) => m.AdminSalePage),
      },
      {
        path: 'admin/inventario',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/admin/pages/admin-stock/admin-stock.page').then(
            (m) => m.AdminStockPage,
          ),
      },
    ],
  },
  {
    path: 'ingresar',
    loadComponent: () =>
      import('./modules/auth/pages/auth-page/auth-page.component').then((m) => m.AuthPageComponent),
  },
  {
    path: 'productos',
    redirectTo: 'admin',
    pathMatch: 'full',
  },
  {
    path: 'logistica',
    redirectTo: 'admin/ordenes',
    pathMatch: 'full',
  },
  {
    path: 'usuarios',
    redirectTo: 'admin',
    pathMatch: 'full',
  },
  {
    path: 'roles',
    redirectTo: 'admin',
    pathMatch: 'full',
  },
  {
    path: 'articulos',
    redirectTo: 'admin',
    pathMatch: 'full',
  },
  { path: '**', redirectTo: '' },
];
