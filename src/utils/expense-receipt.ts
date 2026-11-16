import { Roboto_400Regular } from './font-assets';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { jsPDF } from 'jspdf';
import { Platform } from 'react-native';
import { money, type Entry } from '@/db/reporting';

import { receiptPeriodLabel, receiptSummary, type ReceiptPeriod } from './receipt-details';

async function receiptFont() {
  const asset = await Asset.fromModule(Roboto_400Regular).downloadAsync();
  if (Platform.OS !== 'web') return new File(asset.localUri ?? asset.uri).base64();

  const response = await fetch(asset.localUri ?? asset.uri);
  if (!response.ok) throw new Error('Could not load the receipt font.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const pieces: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    pieces.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  }
  return btoa(pieces.join(''));
}

export function buildReceiptPdf(period: ReceiptPeriod, entries: Entry[], currency: string, font: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('Roboto-Regular.ttf', font);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto');
  const label = receiptPeriodLabel(period);
  doc.setProperties({ title: 'Spend Pocket expense receipt - ' + label });
  const { total, categories: subtotalRows } = receiptSummary(entries);
  const left = 18;
  const right = 192;
  const bottom = 274;
  let y = 20;

  function heading() {
    doc.setTextColor('#245341').setFontSize(10).text('Spend Pocket', left, y);
    doc.setTextColor('#19382e').setFontSize(24).text('Expense receipt', left, y + 12);
    doc.setTextColor('#496255').setFontSize(11).text(label + '  |  ' + currency, left, y + 21);
    y += 30;
  }

  function section(title: string, breakdown: boolean) {
    if (y + 23 > bottom) {
      doc.addPage();
      y = 20;
      heading();
    }
    doc.setFontSize(13).setTextColor('#19382e').text(title, left, y + 5);
    y += 8;
    doc.setFillColor('#eaf3e8').rect(left, y, right - left, 8, 'F');
    doc.setFontSize(9).setTextColor('#29483b');
    doc.text(breakdown ? 'Category' : 'Date', left + 2, y + 5);
    if (!breakdown) doc.text('Category / note', 49, y + 5);
    doc.text(breakdown ? 'Subtotal' : 'Amount', right - 2, y + 5, { align: 'right' });
    y += 8;
  }

  function row(title: string, amount: number, sectionTitle: string, date?: string) {
    const breakdown = date === undefined;
    const x = breakdown ? left + 2 : 49;
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(title, right - x - 46) as string[];
    let line = 0;
    while (line < lines.length) {
      if (y + 10 > bottom) {
        doc.addPage();
        y = 20;
        heading();
        section(sectionTitle + ' (continued)', breakdown);
      }
      const count = Math.min(lines.length - line, Math.floor((bottom - y - 5) / 5));
      doc.setFontSize(10).setTextColor('#19382e');
      doc.text(lines.slice(line, line + count), x, y + 5, { lineHeightFactor: 1.4 });
      if (line === 0) {
        if (date) doc.text(date, left + 2, y + 5);
        doc.text(money(amount, currency), right - 2, y + 5, { align: 'right' });
      }
      y += count * 5 + 4;
      doc.setDrawColor('#dce7dc').line(left, y, right, y);
      line += count;
    }
  }

  heading();
  doc.setFillColor('#e1efe0').roundedRect(left, y, right - left, 21, 3, 3, 'F');
  doc.setFontSize(10).text('Total expenses', left + 4, y + 8);
  doc.setFontSize(16).text(money(total, currency), right - 4, y + 13, { align: 'right' });
  doc.setFontSize(9).text(entries.length + (entries.length === 1 ? ' expense' : ' expenses'), left + 4, y + 16);
  y += 30;

  if (entries.length) {
    section('Category breakdown', true);
    for (const category of subtotalRows) row(category.name, category.amount, 'Category breakdown');
    y += 8;
    section('Itemized expenses', false);
    for (const entry of entries) {
      row(entry.note ? entry.name + ' / ' + entry.note : entry.name, entry.amount, 'Itemized expenses', entry.day);
    }
  } else {
    doc.setFontSize(11).text('No expenses recorded for this period.', left, y + 4);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(9).setTextColor('#496255');
    doc.text('Spend Pocket', left, 285);
    doc.text(page + ' / ' + pages, right, 285, { align: 'right' });
  }
  return doc;
}

export async function downloadReceipt(period: ReceiptPeriod, entries: Entry[], currency: string) {
  const doc = buildReceiptPdf(period, entries, currency, await receiptFont());
  const filename = 'spend-pocket-' + period.kind + '-' + period.key + '.pdf';
  if (Platform.OS === 'web') {
    doc.save(filename);
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('PDF sharing is unavailable on this device.');
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(new Uint8Array(doc.output('arraybuffer')));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
