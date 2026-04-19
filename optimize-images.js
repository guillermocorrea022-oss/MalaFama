/**
 * Optimizador de imagenes para Mala Fama.
 *
 * Estrategia (conservadora — prioriza calidad visual):
 *  - JPG: recompresion con mozjpeg quality 85, cap de ancho a 2000px.
 *  - PNG: se intenta quantizacion de paleta (quality 82-90). Si el
 *    resultado es < 60% del original y el ancho es < 2200px, se usa
 *    la version quantizada. Sino, se deja el original intacto.
 *  - Todos los originales se respaldan en _img_originals/ con la misma
 *    estructura de carpetas, antes de sobreescribir.
 *  - Solo se reemplaza un archivo si el nuevo pesa menos que el original.
 *
 * Uso:  node optimize-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOTS = ['img', 'assets'];
const BACKUP_DIR = '_img_originals';
const MAX_WIDTH = 2000;        // cap superior para imagenes gigantes
const JPEG_QUALITY = 85;       // mozjpeg quality
const PNG_PALETTE_QUALITY = 88; // quantizacion de paleta para PNG
const MIN_SAVINGS_PCT = 5;     // solo reemplazar si ahorra >= 5%

sharp.cache(false);

function fmtBytes(n) {
  if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  if (n > 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === BACKUP_DIR || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(jpg|jpeg|png)$/i.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

function backupOriginal(srcPath) {
  const dest = path.join(BACKUP_DIR, srcPath);
  if (fs.existsSync(dest)) return; // ya respaldado antes
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(srcPath, dest);
}

async function optimizeJPG(filePath) {
  const orig = fs.statSync(filePath).size;
  const meta = await sharp(filePath).metadata();
  let pipeline = sharp(filePath).rotate(); // respeta EXIF orientation
  if (meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  const buf = await pipeline
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true })
    .toBuffer();

  const savings = ((orig - buf.length) / orig) * 100;
  if (buf.length < orig && savings >= MIN_SAVINGS_PCT) {
    backupOriginal(filePath);
    fs.writeFileSync(filePath, buf);
    return { status: 'optimized', orig, now: buf.length, savings };
  }
  return { status: 'skipped', orig, now: orig, savings: 0 };
}

async function optimizePNG(filePath) {
  const orig = fs.statSync(filePath).size;
  const meta = await sharp(filePath).metadata();
  let pipeline = sharp(filePath);
  if (meta.width > MAX_WIDTH + 200) {
    // solo redimensiono si realmente es gigante (PNG suelen ser vectoriales/UI)
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  // Intento 1: palette quantization (mejor ratio para ilustraciones/UI)
  const paletteBuf = await pipeline
    .clone()
    .png({
      palette: true,
      quality: PNG_PALETTE_QUALITY,
      effort: 10,
      compressionLevel: 9,
    })
    .toBuffer();

  // Intento 2: re-encode sin palette (para fotos/degradados finos)
  const plainBuf = await pipeline
    .clone()
    .png({ compressionLevel: 9, effort: 10, palette: false })
    .toBuffer();

  // Elegimos el mas chico que tenga ahorro aceptable
  const best = paletteBuf.length <= plainBuf.length ? paletteBuf : plainBuf;
  const savings = ((orig - best.length) / orig) * 100;

  if (best.length < orig && savings >= MIN_SAVINGS_PCT) {
    backupOriginal(filePath);
    fs.writeFileSync(filePath, best);
    return { status: 'optimized', orig, now: best.length, savings };
  }
  return { status: 'skipped', orig, now: orig, savings: 0 };
}

async function run() {
  const files = [];
  for (const r of ROOTS) {
    if (fs.existsSync(r)) walk(r, files);
  }
  console.log(`Encontradas ${files.length} imagenes.\n`);

  let totalOrig = 0, totalNow = 0, optimized = 0, skipped = 0;
  const biggest = [];

  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    let res;
    try {
      if (ext === '.jpg' || ext === '.jpeg') res = await optimizeJPG(f);
      else if (ext === '.png') res = await optimizePNG(f);
      else continue;

      totalOrig += res.orig;
      totalNow += res.now;
      if (res.status === 'optimized') {
        optimized++;
        biggest.push({ f, saved: res.orig - res.now, pct: res.savings });
        console.log(
          `OK  ${f}  ${fmtBytes(res.orig)} -> ${fmtBytes(res.now)}  (-${res.savings.toFixed(1)}%)`
        );
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`ERR ${f}  ${e.message}`);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Optimizadas: ${optimized}  ·  Sin cambios: ${skipped}`);
  console.log(`Total original : ${fmtBytes(totalOrig)}`);
  console.log(`Total optimizado: ${fmtBytes(totalNow)}`);
  console.log(`Ahorro total   : ${fmtBytes(totalOrig - totalNow)}  (${(((totalOrig - totalNow) / totalOrig) * 100).toFixed(1)}%)`);
  console.log('\nTop 10 que mas se redujeron:');
  biggest.sort((a, b) => b.saved - a.saved).slice(0, 10).forEach(b => {
    console.log(`  -${fmtBytes(b.saved)} (${b.pct.toFixed(1)}%)  ${b.f}`);
  });
  console.log(`\nOriginales respaldados en ${BACKUP_DIR}/`);
}

run().catch(e => { console.error(e); process.exit(1); });
