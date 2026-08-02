const fs = require('fs');
const path = require('path');

/**
 * Convert manually-cropped gallery images to webp (mobile + HD).
 *
 * INPUT (manual crops, user-prepared):
 *   assets/crops/carousel/gallery_1..9.<ext>   — 16:10 crop for the carousel
 *   assets/crops/mosaic/gallery_1..9.<ext>     — per-tile crop for the masonry grid
 *
 * OUTPUT:
 *   assets/images/carousel/gallery_N.webp   (mobile, q80)
 *   assets/images/mosaic/gallery_N.webp     (mobile, q80)
 *   assets/images_hd/carousel/gallery_N.webp (HD, q100)
 *   assets/images_hd/mosaic/gallery_N.webp   (HD, q100)
 *
 * The crop aspect ratio is PRESERVED (no forced crop) so the user's manual
 * framing stays intact. EXIF orientation is auto-applied via .rotate().
 */

const SRC_ROOT = path.join(__dirname, '..', 'assets', 'crops');
const OUT_DIRS = [
    { dir: path.join(__dirname, '..', 'assets', 'images'),    quality: 80 },  // mobile
    { dir: path.join(__dirname, '..', 'assets', 'images_hd'), quality: 100 }, // HD
];
const SETS = ['carousel', 'mosaic'];
const COUNT = 9; // gallery_1 .. gallery_9
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'];

async function run() {
    let sharp;
    try {
        sharp = require('sharp');
    } catch (e) {
        console.error('Error: "sharp" library is not installed. Please run "npm install sharp" first.');
        process.exit(1);
    }

    // Ensure output directories exist
    for (const set of SETS) {
        for (const d of OUT_DIRS) {
            const out = path.join(d.dir, set);
            if (!fs.existsSync(out)) {
                fs.mkdirSync(out, { recursive: true });
            }
        }
    }

    let done = 0, skipped = 0;

    for (const set of SETS) {
        const srcDir = path.join(SRC_ROOT, set);
        if (!fs.existsSync(srcDir)) {
            console.error(`[WARN] Input folder not found: ${srcDir}`);
            continue;
        }

        for (let i = 1; i <= COUNT; i++) {
            const base = `gallery_${i}`;

            // Find the source file regardless of extension
            let srcPath = null;
            for (const ext of IMAGE_EXTS) {
                const candidate = path.join(srcDir, `${base}${ext}`);
                if (fs.existsSync(candidate)) {
                    srcPath = candidate;
                    break;
                }
            }

            if (!srcPath) {
                console.warn(`[SKIP] ${set}/${base}: no source crop found (missing or wrong extension).`);
                skipped++;
                continue;
            }

            for (const d of OUT_DIRS) {
                const destPath = path.join(d.dir, set, `${base}.webp`);
                try {
                    const info = await sharp(srcPath)
                        .rotate() // auto-orient from EXIF
                        .resize({ width: 1200, height: 1200, fit: 'inside' }) // preserve ratio, cap at 1200 longest side
                        .webp({ quality: d.quality })
                        .toFile(destPath);
                    const sizeKB = (info.size / 1024).toFixed(0);
                    console.log(`[DONE] ${set}/${base}.webp (${d.quality}) ${info.width}x${info.height} -> ${sizeKB}KB`);
                } catch (error) {
                    console.error(`[ERROR] ${set}/${base}.webp (${d.quality}):`, error.message);
                }
            }
            done++;
        }
    }

    console.log(`\nFinished. Converted: ${done} photos. Skipped: ${skipped}.`);
}

run();
