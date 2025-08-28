/**
 * Test print template for printer testing
 * This template generates a comprehensive test print with current date/time
 */

export function generateTestPrintTemplate(): string {
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

  return `
    <div style="text-align: center; font-family: monospace;">
      <h2>*** TEST PRINT ***</h2>
      <br>
      <h3>Printer Check</h3>
      <p>Status: <strong>READY</strong></p>
      <p>Connection: <strong>OK</strong></p>
      <p>Paper: <strong>LOADED</strong></p>
      <br>
      <h3>Date & Time</h3>
      <p>Date: ${dateStr}</p>
      <p>Time: ${timeStr}</p>
      <br>
      <h3>Test Pattern</h3>
      <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
      <p>abcdefghijklmnopqrstuvwxyz</p>
      <p>0123456789</p>
      <p>!@#$%^&*()_+-=[]{}|;':",./<>?</p>
      <br>
      <h3>*** END TEST ***</h3>
    </div>
  `;
}
