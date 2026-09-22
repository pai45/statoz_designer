import assert from "node:assert/strict";
import test from "node:test";
import { pngMetadata } from "../src/server/runtime";

function pngHeader(width: number, height: number, colorType: number) {
  const bytes = Buffer.alloc(45);
  Buffer.from("89504e470d0a1a0a", "hex").copy(bytes, 0);
  bytes.writeUInt32BE(13, 8); Buffer.from("IHDR").copy(bytes, 12);
  bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20); bytes[24] = 8; bytes[25] = colorType;
  bytes.writeUInt32BE(0, 33); Buffer.from("IEND").copy(bytes, 37);
  return bytes;
}

test("PNG metadata identifies dimensions and alpha-bearing color types", () => {
  assert.deepEqual(pngMetadata(pngHeader(1024, 1024, 2)), { width: 1024, height: 1024, hasAlpha: false });
  assert.deepEqual(pngMetadata(pngHeader(512, 512, 6)), { width: 512, height: 512, hasAlpha: true });
  assert.throws(() => pngMetadata(Buffer.from("not a png")));
});
