import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SALE_ORIGIN_OPTIONS, SaleOriginOption } from '../../../../core/constants/business-options';

@Component({
  selector: 'app-admin-sale-page',
  imports: [CommonModule],
  templateUrl: './admin-sale.page.html',
  styleUrl: './admin-sale.page.css',
})
export class AdminSalePage {
  readonly saleOriginOptions = SALE_ORIGIN_OPTIONS;
  selectedSaleOrigin: SaleOriginOption = SALE_ORIGIN_OPTIONS[1];

  onSaleOriginChange(rawValue: string): void {
    if (this.saleOriginOptions.includes(rawValue as SaleOriginOption)) {
      this.selectedSaleOrigin = rawValue as SaleOriginOption;
    }
  }
}
