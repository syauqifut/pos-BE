/**
 * Print configuration utility
 * Centralizes all print-related settings from environment variables
 */

export interface PrintConfig {
  storeName: string;
  storeAddress: string;
  footerMessage: string;
}

/**
 * Get print configuration from environment variables
 * @returns PrintConfig object with all print settings
 */
export function getPrintConfig(): PrintConfig {
  return {
    storeName: process.env.PRINT_STORE_NAME || '',
    storeAddress: process.env.PRINT_STORE_ADDRESS || '',
    footerMessage: process.env.PRINT_FOOTER_MESSAGE || ''
  };
}
