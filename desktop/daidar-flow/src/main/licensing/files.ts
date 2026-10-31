import type { FileHandle } from "node:fs/promises";
// Hard cap remains valid even if another process grows the file after stat().
export async function readBounded(
  file: FileHandle,
  limit: number,
): Promise<Buffer> {
  const stat = await file.stat();
  if (!stat.isFile() || stat.size > limit)
    throw Error("Invalid file size/type");
  const buffer = Buffer.alloc(limit + 1);
  let total = 0;
  while (total < buffer.length) {
    const { bytesRead } = await file.read(
      buffer,
      total,
      buffer.length - total,
      total,
    );
    if (!bytesRead) break;
    total += bytesRead;
  }
  if (total > limit) throw Error("File grew beyond limit");
  return buffer.subarray(0, total);
}
