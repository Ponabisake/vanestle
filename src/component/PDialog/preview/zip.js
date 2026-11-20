// Minimal ZIP reader for the file preview (docx / pptx / zip listing). No dependency: entries are inflated with the
// browser's DecompressionStream("deflate-raw"). ZIP64 and encrypted archives are not supported (readZip throws).

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

const utf8 = new TextDecoder("utf-8");

const findEndOfCentralDirectory = (view) => {
  // the record is 22 bytes plus a comment of at most 65535 bytes, at the very end of the file
  const stop = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let i = view.byteLength - 22; i >= stop; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) return i;
  }
  return -1;
};

const inflateRaw = async (bytes) => {
  if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot unzip files");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/**
 * Reads the central directory of a ZIP archive.
 * Returns a Map of entry name → { name, size, compressedSize, isDirectory, read(): Promise<Uint8Array> }.
 */
export function readZip(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  if (eocd < 0) throw new Error("Not a ZIP archive");

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  if (offset === 0xffffffff || count === 0xffff) throw new Error("ZIP64 archives are not supported");

  const entries = new Map();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break;
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = utf8.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    const encrypted = (flags & 1) === 1;
    entries.set(name, {
      name,
      size,
      compressedSize,
      encrypted,
      isDirectory: name.endsWith("/"),
      read: async () => {
        if (encrypted) throw new Error("Encrypted ZIP entries are not supported");
        if (view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) throw new Error("Damaged ZIP archive");
        const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
        const data = bytes.subarray(start, start + compressedSize);
        if (method === 0) return data;
        if (method === 8) return inflateRaw(data);
        throw new Error(`Unsupported ZIP compression method ${method}`);
      },
    });
  }
  return entries;
}

/** Text of an entry (UTF-8), or null when the archive has no such entry. */
export async function readZipText(entries, name) {
  const entry = entries.get(name);
  return entry ? utf8.decode(await entry.read()) : null;
}

/** True when the bytes start like a ZIP archive ("PK\x03\x04"). */
export const isZip = (bytes) => bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
