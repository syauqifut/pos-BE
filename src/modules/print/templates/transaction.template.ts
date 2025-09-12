import { SaleTransaction, SaleTransactionItem } from '../../transaction/sale/sale.repository';
import { getPrintConfig } from '../print.config';

/**
 * Transaction receipt template for sale transactions
 * This template generates ESC/POS commands directly for thermal printer
 */

export interface TransactionPrintData extends SaleTransaction {
  items: (SaleTransactionItem & { unit_price: number })[];
}

export function generateTransactionTemplate(transaction: TransactionPrintData): string {
  const printConfig = getPrintConfig();
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  let receipt = '';
  
  // Header
  receipt += '\x1B\x61\x01'; // Center
  receipt += '\x1B\x21\x10'; // Double width
  receipt += `${printConfig.storeName}\n`;
  receipt += '\x1B\x21\x00'; // Normal width
  receipt += `${printConfig.storeAddress}\n`;
  receipt += '\n';
  
  // Transaction Info
  receipt += '\x1B\x61\x01'; // Center
  receipt += '\x1B\x61\x00'; // Left
  receipt += `No. Transaksi: ${transaction.no}\n`;
  receipt += `Tanggal: ${dateStr}\n`;
  receipt += `Waktu: ${timeStr}\n`;
//   receipt += `Kasir: ${transaction.created_by_name || 'Unknown'}\n`;

  receipt += '################################\n';
  
  // Items
  receipt += '\x1B\x61\x00'; // Left
  transaction.items.forEach((item, index) => {
    receipt += `${item.product_name}\n`;
    
    // receipt += `  ${item.qty} ${item.unit_name} x ${formatCurrency(item.unit_price)} = Rp ${formatCurrency(item.qty * item.unit_price)}\n`;

    // Format: qty unit x price = subtotal (with proper alignment)
    const qtyUnit = `${item.qty} ${item.unit_name}`;
    const price = formatCurrency(item.unit_price);
    const subtotal = formatCurrency(item.qty * item.unit_price);
    
    // Calculate spaces needed for alignment (assuming 32 char width)
    const leftPart = `  ${qtyUnit} x ${price}`;
    const rightPart = `${subtotal}`;
    const totalWidth = 32;
    const spacesNeeded = totalWidth - leftPart.length - rightPart.length;
    
    receipt += leftPart + ' '.repeat(Math.max(1, spacesNeeded)) + rightPart;
    receipt += '\n';
  });
  
  receipt += '################################\n';
  
  // Total
  receipt += '\x1B\x61\x02'; // Right align
  receipt += `Total: Rp ${formatCurrency(transaction.total_amount)}\n`;
  receipt += `Bayar: Rp ${formatCurrency(transaction.paid_amount)}\n`;
  receipt += `Kembali: Rp ${formatCurrency(transaction.change)}\n`;
  
  receipt += '################################\n';

  // Footer
  receipt += '\x1B\x61\x01'; // Center
  receipt += `${printConfig.footerMessage}\n`;
  receipt += '\n';
  receipt += '\n';
  receipt += '\x1B\x61\x01'; // Center
  
  return receipt;
}

/**
 * Format currency to Indonesian Rupiah format
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
