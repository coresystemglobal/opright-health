import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { Invoice, InvoiceLineItem } from './invoice.model';
import { Patient } from '@modules/patients/patient.model';
import { Doctor } from '@modules/doctors/doctor.model';
import { Hospital } from '@modules/hospital/hospital.model';

// Clinical Blue design system colours
const NAVY       = '#1e3a8a';
const BLUE       = '#1d4ed8';
const LIGHT_BLUE = '#dbeafe';
const SLATE      = '#475569';
const NEAR_BLACK = '#0f172a';
const BORDER     = '#e2e8f0';
const BG_ROW_ALT = '#f8fafc';
const SUCCESS    = '#16a34a';
const WARNING    = '#d97706';
const ERROR      = '#dc2626';

const STATUS_COLOUR: Record<string, string> = {
  paid:      SUCCESS,
  partial:   WARNING,
  overdue:   ERROR,
  cancelled: SLATE,
  refunded:  SLATE,
  pending:   WARNING
};

interface PdfInvoiceOptions {
  invoice: Invoice & {
    patient?: Patient;
    doctor?: Doctor;
    line_items?: InvoiceLineItem[];
  };
  hospital?: Hospital | null;
}

function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(amount);
}

function formatDate(d: Date | string | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Generates a PDF invoice buffer using PDFKit.
 * Returns the completed buffer wrapped in a Promise so callers can
 * await it directly without managing stream events.
 */
export async function generateInvoicePdf(opts: PdfInvoiceOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc  = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const pass = new PassThrough();
    const chunks: Buffer[] = [];

    pass.on('data', (chunk: Buffer) => chunks.push(chunk));
    pass.on('end', () => resolve(Buffer.concat(chunks)));
    pass.on('error', reject);
    doc.pipe(pass);

    const { invoice, hospital } = opts;
    const patient = invoice.patient;
    const doctor  = invoice.doctor;
    const W       = doc.page.width - 100;   // usable width

    // ── Header bar ──────────────────────────────────────────────────────────
    doc
      .rect(50, 50, doc.page.width - 100, 70)
      .fill(NAVY);

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(hospital?.name || 'Hospital Management System', 70, 68)
      .font('Helvetica')
      .fontSize(9)
      .text(hospital?.full_address || hospital?.address || '', 70, 90)
      .text(hospital?.phone || '', 70, 102);

    // Invoice label — top right of header
    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('INVOICE', 0, 68, { align: 'right' });

    doc
      .font('Helvetica')
      .fontSize(9)
      .text(invoice.invoice_number, 0, 93, { align: 'right' });

    // ── Invoice meta block ──────────────────────────────────────────────────
    const metaY = 140;
    doc
      .fillColor(NEAR_BLACK)
      .font('Helvetica-Bold')
      .fontSize(9);

    const leftCol  = 50;
    const rightCol = 350;

    // Left: bill-to
    doc.text('BILL TO', leftCol, metaY);
    doc
      .font('Helvetica')
      .fillColor(SLATE)
      .text(patient ? `${patient.first_name} ${patient.last_name}` : '—', leftCol, metaY + 14)
      .text(patient?.phone || '', leftCol, metaY + 26)
      .text(patient?.email || '', leftCol, metaY + 38)
      .text(patient?.address || '', leftCol, metaY + 50);

    // Right: invoice details grid
    const detail = (label: string, value: string, y: number) => {
      doc.font('Helvetica-Bold').fillColor(NEAR_BLACK).text(label, rightCol, y, { width: 90 });
      doc.font('Helvetica').fillColor(SLATE).text(value, rightCol + 95, y, { width: 155 });
    };

    detail('Invoice Number:',  invoice.invoice_number,                  metaY);
    detail('Invoice Date:',    formatDate(invoice.invoice_date),         metaY + 16);
    detail('Due Date:',        formatDate(invoice.due_date),             metaY + 32);
    detail('Doctor:',          doctor ? `Dr. ${(doctor as any).full_name || (doctor as any).last_name || '—'}` : '—', metaY + 48);
    detail('Type:',            invoice.invoice_type.toUpperCase(),       metaY + 64);

    // Status badge
    const statusColour = STATUS_COLOUR[invoice.payment_status] || SLATE;
    const statusText   = invoice.payment_status.toUpperCase();
    const badgeX       = rightCol + 95;
    const badgeY       = metaY + 82;
    doc.fontSize(8);
    const badgeW       = doc.widthOfString(statusText) + 16;

    doc.roundedRect(badgeX, badgeY - 2, badgeW, 16, 4).fill(statusColour);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text(statusText, badgeX + 8, badgeY + 1);

    // ── Divider ─────────────────────────────────────────────────────────────
    const tableY = metaY + 120;
    doc.moveTo(50, tableY - 10).lineTo(50 + W, tableY - 10).strokeColor(BORDER).stroke();

    // ── Line items table ─────────────────────────────────────────────────────
    const cols = { desc: 50, qty: 300, unit: 370, total: 460 };

    // Table header
    doc.rect(50, tableY, W, 20).fill(NAVY);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    doc.text('Description',     cols.desc + 4,  tableY + 6);
    doc.text('Qty',             cols.qty,        tableY + 6, { width: 60, align: 'right' });
    doc.text('Unit Price',      cols.unit,       tableY + 6, { width: 80, align: 'right' });
    doc.text('Amount',          cols.total,      tableY + 6, { width: 80, align: 'right' });

    const lineItems: InvoiceLineItem[] = invoice.line_items && invoice.line_items.length > 0
      ? invoice.line_items
      : [{ id: '1', description: invoice.description || 'Medical consultation', quantity: 1, unit_price: parseFloat(invoice.subtotal.toString()), total_price: parseFloat(invoice.subtotal.toString()) }];

    let rowY = tableY + 22;
    lineItems.forEach((item, i) => {
      const rowBg = i % 2 === 0 ? '#ffffff' : BG_ROW_ALT;
      const rowH  = 18;
      doc.rect(50, rowY, W, rowH).fill(rowBg);

      doc.font('Helvetica').fontSize(9).fillColor(NEAR_BLACK);
      doc.text(item.description,                        cols.desc + 4,  rowY + 5, { width: 240, ellipsis: true });
      doc.text(item.quantity.toString(),                cols.qty,        rowY + 5, { width: 60,  align: 'right' });
      doc.text(formatNGN(item.unit_price),              cols.unit,       rowY + 5, { width: 80,  align: 'right' });
      doc.text(formatNGN(item.total_price ?? item.unit_price * item.quantity), cols.total, rowY + 5, { width: 80, align: 'right' });

      rowY += rowH;
    });

    // Table bottom border
    doc.moveTo(50, rowY).lineTo(50 + W, rowY).strokeColor(BORDER).stroke();

    // ── Totals block ─────────────────────────────────────────────────────────
    const totalsX = 360;
    let totY = rowY + 14;

    const totLine = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor(bold ? NEAR_BLACK : SLATE)
        .text(label, totalsX, totY, { width: 120 })
        .text(value,  totalsX + 120, totY, { width: 90, align: 'right' });
      totY += 16;
    };

    totLine('Subtotal',         formatNGN(parseFloat(invoice.subtotal.toString())));

    const taxAmount = parseFloat(invoice.tax_amount?.toString() || '0');
    const taxRate   = parseFloat(invoice.tax_rate?.toString() || '0');
    if (taxAmount > 0) {
      totLine(`VAT (${(taxRate * 100).toFixed(0)}%)`, formatNGN(taxAmount));
    }

    const discount = parseFloat(invoice.discount_amount?.toString() || '0');
    if (discount > 0) {
      totLine('Discount', `(${formatNGN(discount)})`);
    }

    doc.moveTo(totalsX, totY).lineTo(totalsX + 210, totY).strokeColor(BORDER).stroke();
    totY += 6;

    totLine('Total',            formatNGN(parseFloat(invoice.total_amount.toString())), true);

    const paid = parseFloat(invoice.paid_amount?.toString() || '0');
    if (paid > 0) {
      totLine('Paid',           formatNGN(paid));
      totLine('Balance Due',    formatNGN(Math.max(0, parseFloat(invoice.total_amount.toString()) - paid)), true);
    }

    // ── Notes ────────────────────────────────────────────────────────────────
    if (invoice.notes) {
      const notesY = totY + 20;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(NEAR_BLACK).text('Notes', 50, notesY);
      doc.font('Helvetica').fontSize(9).fillColor(SLATE).text(invoice.notes, 50, notesY + 14, { width: W });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const pageH   = doc.page.height;
    const footerY = pageH - 60;

    doc.rect(50, footerY, W, 1).fill(LIGHT_BLUE);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(SLATE)
      .text('Thank you for choosing our healthcare services.', 50, footerY + 8, { width: W, align: 'center' })
      .text(`Generated on ${new Date().toLocaleString('en-GB')}`, 50, footerY + 20, { width: W, align: 'center' });

    doc.end();
  });
}
