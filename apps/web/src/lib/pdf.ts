import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const INK = rgb(0.09, 0.13, 0.11);
const MUTED = rgb(0.36, 0.42, 0.38);
const LINE = rgb(0.85, 0.84, 0.8);

const money = (kobo: number | string): string => {
  const value = BigInt(kobo);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const minor = (absolute % 100n).toString().padStart(2, '0');
  return `NGN ${negative ? '-' : ''}${whole.toLocaleString('en-NG')}.${minor}`;
};

const wrap = (text: string, max: number): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > max) {
      if (current !== '') lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current !== '') lines.push(current);
  return lines;
};

const shell = async (title: string, subtitle: string) => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText('Tenaville', { x: 50, y: 790, size: 12, font: bold, color: MUTED });
  page.drawText(title, { x: 50, y: 752, size: 24, font: bold, color: INK });
  page.drawText(subtitle, { x: 50, y: 732, size: 10, font, color: MUTED });
  page.drawLine({
    start: { x: 50, y: 716 },
    end: { x: 545, y: 716 },
    thickness: 1,
    color: LINE,
  });
  return { pdf, page, font, bold };
};

export const createReceiptPdf = async (input: {
  readonly organisation: string;
  readonly receiptNumber: string;
  readonly status: string;
  readonly issuedOn: string;
  readonly amountKobo: number;
  readonly tenant: string;
  readonly property: string;
  readonly unit: string;
  readonly leaseReference: string;
  readonly method: string;
  readonly reference: string | null;
  readonly verificationCode: string;
  readonly reversed: boolean;
  readonly reversalReason: string | null;
}): Promise<Uint8Array> => {
  const { pdf, page, font, bold } = await shell(
    `Receipt ${input.receiptNumber}`,
    `${input.organisation} · ${input.status} · issued ${input.issuedOn}`,
  );

  let y = 685;
  const row = (label: string, value: string): void => {
    page.drawText(label.toUpperCase(), { x: 50, y, size: 8, font, color: MUTED });
    page.drawText(value, { x: 190, y: y - 1, size: 11, font, color: INK });
    y -= 28;
  };

  page.drawText(money(input.amountKobo), { x: 50, y: 660, size: 28, font: bold, color: INK });
  y = 620;
  row('Received from', input.tenant);
  row('Property', `${input.property} · ${input.unit}`);
  row('Tenancy', input.leaseReference);
  row('Payment method', input.method);
  row('Payment reference', input.reference ?? '—');
  row('Issued on', input.issuedOn);
  row('Verification code', input.verificationCode);

  if (input.reversed) {
    page.drawText('THIS RECEIPT IS REVERSED', { x: 50, y: y - 10, size: 12, font: bold, color: rgb(0.64, 0.23, 0.17) });
    for (const [index, line] of wrap(input.reversalReason ?? 'The payment was reversed.', 80).entries()) {
      page.drawText(line, { x: 50, y: y - 30 - index * 14, size: 10, font, color: MUTED });
    }
  }

  page.drawText(
    'This receipt is generated from the payment record. A correction reverses the payment and issues a fresh receipt; the number is never reused.',
    { x: 50, y: 70, size: 8, font, color: MUTED, maxWidth: 495, lineHeight: 11 },
  );

  return pdf.save();
};

export interface StatementPdfLine {
  readonly occurredOn: string;
  readonly description: string;
  readonly amountKobo: number;
}

export const createStatementPdf = async (input: {
  readonly organisation: string;
  readonly landlord: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly revision: number;
  readonly status: string;
  readonly openingKobo: number;
  readonly closingKobo: number;
  readonly lines: readonly StatementPdfLine[];
}): Promise<Uint8Array> => {
  const { pdf, font, bold } = await shell(
    'Landlord statement',
    `${input.organisation} · ${input.landlord} · ${input.periodStart} to ${input.periodEnd}`,
  );

  let page = pdf.getPage(0);
  let y = 680;
  const row = (left: string, right: string, strong = false): void => {
    page.drawText(left, { x: 50, y, size: 10, font: strong ? bold : font, color: INK });
    const width = (strong ? bold : font).widthOfTextAtSize(right, 10);
    page.drawText(right, { x: 545 - width, y, size: 10, font: strong ? bold : font, color: INK });
    y -= 18;
  };

  row(`Opening balance`, money(input.openingKobo), true);
  y -= 8;
  for (const line of input.lines) {
    if (y < 90) {
      page = pdf.addPage([595.28, 841.89]);
      y = 780;
    }
    page.drawText(line.occurredOn, { x: 50, y, size: 9, font, color: MUTED });
    const description = wrap(line.description, 56);
    page.drawText(description[0] ?? '', { x: 120, y, size: 9, font, color: INK });
    const amount = money(line.amountKobo);
    const width = font.widthOfTextAtSize(amount, 9);
    page.drawText(amount, { x: 545 - width, y, size: 9, font, color: INK });
    y -= 16;
    for (const extra of description.slice(1)) {
      page.drawText(extra, { x: 120, y, size: 9, font, color: MUTED });
      y -= 13;
    }
  }

  if (y < 100) {
    page = pdf.addPage([595.28, 841.89]);
    y = 780;
  }
  y -= 10;
  page.drawLine({ start: { x: 50, y: y + 10 }, end: { x: 545, y: y + 10 }, thickness: 1, color: LINE });
  row('Closing balance', money(input.closingKobo), true);

  page.drawText(`Revision ${input.revision} · ${input.status}`, {
    x: 50,
    y: 60,
    size: 8,
    font,
    color: MUTED,
  });

  return pdf.save();
};
