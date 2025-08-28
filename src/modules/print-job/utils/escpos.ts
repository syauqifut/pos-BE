import { Buffer } from 'buffer';
import { HttpException } from '../../../exceptions/HttpException';

/**
 * Convert HTML struk menjadi ESC/POS base64 string.
 * Saat ini versi sederhana: HTML → plain text → ESC/POS bytes.
 * Nanti bisa diganti dengan render image via Puppeteer untuk styling kompleks.
 */
export async function htmlToEscpos(html: string): Promise<string> {
  try {
    // Validate input
    if (!html || typeof html !== 'string') {
      throw new HttpException(400, 'HTML content is required and must be a string');
    }

    if (html.trim().length === 0) {
      throw new HttpException(400, 'HTML content cannot be empty');
    }

    if (html.length > 10000) {
      throw new HttpException(400, 'HTML content is too long (maximum 10,000 characters)');
    }

    // 1. Sederhanakan HTML jadi text (bisa pakai library HTML parser)
    const plainText = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?[^>]+(>|$)/g, ''); // hapus tag HTML

    // 2. Tambahkan header/footer sederhana
    const struk = `*** STRUK ***\n${plainText}\n\n`;

    // 3. Convert ke buffer
    const buffer = Buffer.from(struk, 'utf-8');

    // 4. Encode ke base64 untuk disimpan di DB
    return buffer.toString('base64');
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    console.error('Error converting HTML to ESC/POS:', error);
    throw new HttpException(500, 'Internal server error while converting HTML to ESC/POS format');
  }
}
