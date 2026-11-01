// Downloads the stock photos from Unsplash, crops them, gives them one consistent dark grade,
// compresses them into /public/images and writes /public/images/CREDITS.md.
// Run: npm run photos   (only needed again if you change the list below)
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../public/images/", import.meta.url));

// file, Unsplash photo id (page), image key (CDN), photographer handle, size
const photos = [
  ["hero-chair.jpg", "EW_rqoSdDes", "1585747860715-2ba37e788b70", "onatecan", 2400, 1600],
  ["barber-razor.jpg", "1Pmp9uxK8X8", "1599351431202-1e0f0137899a", "agustinfernandez", 1600, 2000],
  ["tools.jpg", "MNu0n-3BIKs", "1621605815971-fbc98d665033", "andreadonato", 1600, 1067],
  ["clipper-closeup.jpg", "MRCdF3qUbp0", "1635273051839-003bf06a8751", "salaheregouane", 1600, 1067],
  ["gallery-1.jpg", "tgPrIYnW3g4", "1647140655214-e4a2d914971f", "natejohnston", 1200, 1500],
  ["gallery-2.jpg", "YDOc9F6HUFA", "1648221122323-572c13a31663", "tafocandofotoefilme", 1200, 1500],
  ["gallery-3.jpg", "02yJ27pwyAs", "1701891123509-e983d6c45259", "deivii", 1200, 1500],
  ["gallery-4.jpg", "IvQeAVeJULw", "1503951914875-452162b0f3f1", "seteph", 1200, 1500],
  ["gallery-5.jpg", "t34TLxxmwws", "1705976062088-5433328c2dcd", "xbmpro", 1200, 1500],
  ["gallery-6.jpg", "PDDvMlScofU", "1672642150228-3fcd5826ec26", "reddfrancisco", 1200, 1500],
  ["gallery-7.jpg", "g4lupAofR9c", "1788328155052-e02abe9ba983", "firephotos", 1200, 1500],
  ["gallery-8.jpg", "fE42nRlBcG8", "1517832606299-7ae9b720a186", "onatecan", 1200, 1500],
];

await mkdir(OUT, { recursive: true });

for (const [file, , key, , w, h] of photos) {
  const res = await fetch(`https://images.unsplash.com/photo-${key}?w=${Math.max(w, h) + 400}&q=90&fm=jpg`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  await sharp(input)
    .resize(w, h, { fit: "cover", position: sharp.strategy.attention })
    // One shared grade so the set feels consistent: a touch darker, less saturated, warm shadows.
    .modulate({ brightness: 0.9, saturation: 0.82 })
    .tint({ r: 255, g: 240, b: 220 })
    .linear(1.12, -14)
    .jpeg({ quality: 78, mozjpeg: true, progressive: true })
    .toFile(OUT + file);
  console.log("saved", file);
}

const credits = [
  "# Photo credits",
  "",
  "All photos are from [Unsplash](https://unsplash.com) and used under the [Unsplash License](https://unsplash.com/license) (free to use, attribution appreciated).",
  "They were cropped, colour-graded and compressed by `scripts/fetch-photos.mjs`. Replace them with Shlomo's own photos by changing `src/config/images.ts`.",
  "",
  "| File | Photographer | Source |",
  "| --- | --- | --- |",
  ...photos.map(([file, id, , user]) => `| ${file} | [@${user}](https://unsplash.com/@${user}) | https://unsplash.com/photos/${id} |`),
  "",
];
await writeFile(OUT + "CREDITS.md", credits.join("\n"));
console.log("wrote CREDITS.md");
