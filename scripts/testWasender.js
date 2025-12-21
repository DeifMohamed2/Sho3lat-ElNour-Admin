/*
  Usage:
  node scripts/testWasender.js 01123456789 "Hello from test" 
  Environment variables:
    - DEFAULT_ADMIN_PHONE (optional) sender session owner, defaults to 01092257120
    - APP_BASE_URL (optional) public base URL serving /public
*/

const ExcelJS = require('exceljs');
const waService = require('../utils/waService');

async function main() {
  const [, , phoneArg, messageArg] = process.argv;
  const targetPhone = phoneArg || '01092257120';
  const textMessage = messageArg || 'Test message from waService';

  console.log('Testing text message ...');
  const textResp = await waService.sendWasenderMessage(textMessage, targetPhone, waService.DEFAULT_ADMIN_PHONE);
  console.log('Text response:', textResp);

  console.log('Testing QR send ...');
  const qrResp = await waService.sendQRMessage('G1234', targetPhone, waService.DEFAULT_ADMIN_PHONE, '20', 'Test QR');
  console.log('QR response:', qrResp);

  console.log('Building small Excel and sending ...');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Test');
  sheet.addRow(['Hello', 'World']);
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Test_${Date.now()}.xlsx`;
  const excelResp = await waService.sendExcelFile(Buffer.from(buffer), fileName, targetPhone, waService.DEFAULT_ADMIN_PHONE, '20', 'Test Excel');
  console.log('Excel response:', excelResp);

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


