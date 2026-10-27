/**
 * src/utils/zipGenerator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-dependency client-side ZIP generator following the PKZIP 2.0 standard.
 * Creates uncompressed (STORE mode) ZIP archives directly in the browser
 * as a downloadable Uint8Array / Blob for local desktop storage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ZipFileInput {
  path: string;
  content: string | Uint8Array;
}

// CRC32 table for ZIP checksums
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dateToDosTime(date: Date): { time: number; date: number } {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const dosTime = (hours << 11) | (minutes << 5) | seconds;

  const year = Math.max(1980, date.getFullYear()) - 1980;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dosDate = (year << 9) | (month << 5) | day;

  return { time: dosTime, date: dosDate };
}

/**
 * Creates a standard ZIP archive from a list of virtual files.
 */
export function generateZipArchive(files: ZipFileInput[]): Blob {
  const encoder = new TextEncoder();
  const fileEntries: Array<{
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc32: number;
    offset: number;
    dosTime: number;
    dosDate: number;
  }> = [];

  const parts: Uint8Array[] = [];
  let currentOffset = 0;
  const now = new Date();
  const { time: dosTime, date: dosDate } = dateToDosTime(now);

  // 1. Write Local File Headers and Data
  for (const file of files) {
    const cleanPath = file.path.replace(/^\/+/, '');
    const nameBytes = encoder.encode(cleanPath);
    const dataBytes =
      typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
    const crc = computeCrc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true);         // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8)
    view.setUint16(8, 0, true);          // Compression method (0 = Store)
    view.setUint16(10, dosTime, true);   // DOS time
    view.setUint16(12, dosDate, true);   // DOS date
    view.setUint32(14, crc, true);       // CRC-32
    view.setUint32(18, dataBytes.length, true); // Compressed size
    view.setUint32(22, dataBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // Filename length
    view.setUint16(28, 0, true);         // Extra field length

    localHeader.set(nameBytes, 30);

    fileEntries.push({
      nameBytes,
      dataBytes,
      crc32: crc,
      offset: currentOffset,
      dosTime,
      dosDate,
    });

    parts.push(localHeader);
    parts.push(dataBytes);
    currentOffset += localHeader.length + dataBytes.length;
  }

  // 2. Write Central Directory Entries
  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(centralHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory header signature
    view.setUint16(4, 20, true);         // Version made by
    view.setUint16(6, 20, true);         // Version needed to extract
    view.setUint16(8, 0x0800, true);     // General purpose bit flag (UTF-8)
    view.setUint16(10, 0, true);         // Compression method
    view.setUint16(12, entry.dosTime, true);
    view.setUint16(14, entry.dosDate, true);
    view.setUint32(16, entry.crc32, true);
    view.setUint32(20, entry.dataBytes.length, true);
    view.setUint32(24, entry.dataBytes.length, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);         // Extra field length
    view.setUint16(32, 0, true);         // File comment length
    view.setUint16(34, 0, true);         // Disk number start
    view.setUint16(36, 0, true);         // Internal file attributes
    view.setUint32(38, 0, true);         // External file attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header

    centralHeader.set(entry.nameBytes, 46);

    parts.push(centralHeader);
    centralDirSize += centralHeader.length;
    currentOffset += centralHeader.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Number of this disk
  eocdView.setUint16(6, 0, true);          // Disk with central directory
  eocdView.setUint16(8, fileEntries.length, true);  // Number of entries on this disk
  eocdView.setUint16(10, fileEntries.length, true); // Total number of entries
  eocdView.setUint32(12, centralDirSize, true);     // Size of central directory
  eocdView.setUint32(16, centralDirStart, true);    // Offset of central directory
  eocdView.setUint16(20, 0, true);         // ZIP comment length

  parts.push(eocd);

  return new Blob(parts as unknown as BlobPart[], { type: 'application/zip' });
}

/**
 * Triggers a browser download of a generated file to the user's local desktop.
 */
export function downloadFileToDesktop(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
