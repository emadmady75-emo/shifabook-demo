const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  const srcStatic = path.join(__dirname, '../.next/static');

  // 1. Copy .next/static to public/_next/static (fallback routing)
  const destPublicStatic = path.join(__dirname, '../public/_next/static');
  if (fs.existsSync(srcStatic)) {
    if (fs.existsSync(destPublicStatic)) {
      fs.rmSync(destPublicStatic, { recursive: true, force: true });
    }
    copyDir(srcStatic, destPublicStatic);
    console.log('Successfully copied .next/static to public/_next/static');
  }

  // 2. Copy .next/static to .next/standalone/.next/static (standalone serving)
  const destStandaloneStatic = path.join(__dirname, '../.next/standalone/.next/static');
  if (fs.existsSync(srcStatic)) {
    if (fs.existsSync(destStandaloneStatic)) {
      fs.rmSync(destStandaloneStatic, { recursive: true, force: true });
    }
    copyDir(srcStatic, destStandaloneStatic);
    console.log('Successfully copied .next/static to .next/standalone/.next/static');
  }

  // 3. Copy public folder to .next/standalone/public (standalone serving)
  const srcPublic = path.join(__dirname, '../public');
  const destStandalonePublic = path.join(__dirname, '../.next/standalone/public');
  
  if (!fs.existsSync(srcPublic)) {
    fs.mkdirSync(srcPublic, { recursive: true });
  }

  if (fs.existsSync(destStandalonePublic)) {
    fs.rmSync(destStandalonePublic, { recursive: true, force: true });
  }
  copyDir(srcPublic, destStandalonePublic);
  console.log('Successfully copied public/ folder to .next/standalone/public');

} catch (err) {
  console.error('Error during postbuild static assets copy:', err);
}
