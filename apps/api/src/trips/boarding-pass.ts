import { readFileSync } from 'node:fs';
import { imageSize } from 'image-size';
// require keeps compatibility with this Nest project's CommonJS configuration.
import type { FlightLeg } from '@moa/domain';
const decoder = require('zxing-wasm/reader') as typeof import('zxing-wasm/reader');
const wasm = readFileSync(require.resolve('zxing-wasm/reader/zxing_reader.wasm'));
decoder.prepareZXingModule({ overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) } });

export type TicketRead = { legs: FlightLeg[]; passenger: string; source: 'BARCODE' | 'OCR' };
/** IATA BCBP mandatory fields. PNR, seat, sequence and raw payload never leave this function. */
export function parseBoardingPass(text: string): TicketRead | null {
  if (!/^M[1-4]/.test(text) || text.length > 4096) return null;
  const count = Number(text[1]);
  const passenger = text.slice(2, 22).trim();
  const legs: FlightLeg[] = [];
  let offset = 23;
  for (let i = 0; i < count; i++) {
    if (offset + 37 > text.length) return null;
    const part = text.slice(offset, offset + 37);
    const from = part.slice(7, 10), to = part.slice(10, 13);
    const carrier = part.slice(13, 16).trim(), flight = part.slice(16, 21).trim();
    const day = part.slice(21, 24), length = part.slice(35, 37);
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || from === to ||
      !/^[A-Z0-9]{2,3}$/.test(carrier) || !/^\d{1,5}[A-Z]?$/.test(flight) ||
      !/^\d{3}$/.test(day) || Number(day) < 1 || Number(day) > 366 || !/^[\dA-F]{2}$/.test(length)) return null;
    offset += 37 + parseInt(length, 16);
    if (offset > text.length) return null;
    legs.push({ from, to, flightNumber: carrier + flight.replace(/^0+(?=\d)/, ''), date: null, dayOfYear: Number(day) });
  }
  return { legs, passenger, source: 'BARCODE' };
}
export async function readBoardingImage(image: string): Promise<TicketRead | null> {
  const bytes = Buffer.from(image.slice(image.indexOf(',') + 1), 'base64');
  const size = imageSize(bytes);
  if (!size.width || !size.height || size.width * size.height > 16_000_000) throw new Error('image too large');
  const codes = await decoder.readBarcodes(bytes, { formats: ['QRCode', 'PDF417', 'Aztec', 'DataMatrix'],
    tryHarder: true, maxNumberOfSymbols: 4 });
  const tickets = codes.map((code) => parseBoardingPass(code.text)).filter((v): v is TicketRead => Boolean(v));
  if (!tickets.length) return null; // A URL QR is not an airline itinerary; never follow it.
  const normalize = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, '');
  if (new Set(tickets.map((t) => normalize(t.passenger))).size !== 1) return null;
  return { ...tickets[0], legs: tickets.flatMap((t) => t.legs).filter((leg, i, all) =>
    all.findIndex((other) => JSON.stringify(other) === JSON.stringify(leg)) === i) };
}
