const fs = require('fs');
const path = require('path');

async function run() {
    let sharp;
    try {
        sharp = require('sharp');
    } catch (e) {
        console.error('Error: "sharp" library is not installed. Please run "npm install sharp" first.');
        process.exit(1);
    }

    const srcDir = path.join(__dirname, '..', 'assets', 'images_backup');
    const destDir = path.join(__dirname, '..', 'assets', 'images_hd');

    // Ensure destination directory exists
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    try {
        const files = fs.readdirSync(srcDir);
        const imageExtensions = ['.jpg', '.jpeg', '.png'];
        const filesToConvert = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return imageExtensions.includes(ext);
        });

        console.log(`Found ${filesToConvert.length} images to convert.`);

        for (const file of filesToConvert) {
            const srcPath = path.join(srcDir, file);
            // We want to write the output filename in lowercase with .webp extension
            const baseName = path.basename(file, path.extname(file)).toLowerCase();
            const destPath = path.join(destDir, `${baseName}.webp`);

            console.log(`Converting: ${file} -> ${baseName}.webp`);
            try {
                const info = await sharp(srcPath)
                    .rotate() // Auto-orient image based on EXIF orientation
                    .webp({ quality: 100 })
                    .toFile(destPath);
                
                const srcSize = fs.statSync(srcPath).size;
                const destSize = fs.statSync(destPath).size;
                
                const srcSizeMB = (srcSize / 1024 / 1024).toFixed(2);
                const destSizeMB = (destSize / 1024 / 1024).toFixed(2);
                const percent = ((destSize / srcSize) * 100).toFixed(1);
                
                console.log(`  [Done] ${srcSizeMB} MB -> ${destSizeMB} MB (${percent}%)`);
            } catch (error) {
                console.error(`  [Error] Failed to convert ${file}:`, error.message);
            }
        }
        console.log('\nAll image conversions finished successfully.');
    } catch (err) {
        console.error('Error scanning source directory:', err.message);
    }
}

run();
