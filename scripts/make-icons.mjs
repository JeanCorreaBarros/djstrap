// Genera los íconos PNG (PWA y app de escritorio) sin dependencias externas
import { writeFileSync, mkdirSync } from "fs";
import { deflateSync } from "zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

function draw(size) {
  const px = Buffer.alloc(size * (size * 4 + 1));
  const mix = (a, b, t) => a + (b - a) * t;
  for (let y = 0; y < size; y++) {
    px[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy);
      let col = [14, 11, 10];
      const t = (u + v) / 2;
      const grad = [mix(242, 255, t), mix(180, 61, t), mix(140, 127, t)];
      if (r < 0.36) col = [27, 21, 18];
      if (r < 0.36 && r > 0.31) col = grad;
      if (Math.abs(r - 0.22) < 0.008) col = [58, 46, 41];
      if (r < 0.1) col = grad;
      if (Math.abs(dx) < 0.025 && dy > -0.33 && dy < -0.19) col = [255, 255, 255];
      const i = y * (size * 4 + 1) + 1 + x * 4;
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(px)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("build", { recursive: true });
writeFileSync("public/icon-192.png", draw(192));
writeFileSync("public/icon-512.png", draw(512));
writeFileSync("build/icon.png", draw(512));
console.log("Íconos generados");
