import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const sourceImage = path.resolve('Imagens/Logo.png');
const publicDir = path.resolve('public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generate() {
  console.log('Generating favicons from', sourceImage);

  // 1. favicon-96x96.png
  await sharp(sourceImage)
    .resize(96, 96)
    .png()
    .toFile(path.join(publicDir, 'favicon-96x96.png'));

  // 2. favicon.png (32x32)
  const png32Buffer = await sharp(sourceImage)
    .resize(32, 32)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), png32Buffer);

  // 3. apple-touch-icon.png (180x180)
  await sharp(sourceImage)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 4. web-app-manifest-192x192.png
  await sharp(sourceImage)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'web-app-manifest-192x192.png'));

  // 5. web-app-manifest-512x512.png
  await sharp(sourceImage)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'web-app-manifest-512x512.png'));

  // 6. favicon.ico containing 32x32 PNG
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // ICO type
  icoHeader.writeUInt16LE(1, 4); // 1 image

  const icoDirEntry = Buffer.alloc(16);
  icoDirEntry.writeUInt8(32, 0); // width
  icoDirEntry.writeUInt8(32, 1); // height
  icoDirEntry.writeUInt8(0, 2); // color palette
  icoDirEntry.writeUInt8(0, 3); // reserved
  icoDirEntry.writeUInt16LE(1, 4); // color planes
  icoDirEntry.writeUInt16LE(32, 6); // bits per pixel
  icoDirEntry.writeUInt32LE(png32Buffer.length, 8); // size of image data
  icoDirEntry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

  const icoBuffer = Buffer.concat([icoHeader, icoDirEntry, png32Buffer]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  // 7. site.webmanifest
  const manifest = {
    name: 'ZION ProService',
    short_name: 'ZION',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    theme_color: '#080b10',
    background_color: '#080b10',
    display: 'standalone',
  };
  fs.writeFileSync(
    path.join(publicDir, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('Favicons generated successfully in public/');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
