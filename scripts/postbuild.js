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

  // Copy .next/static to public/_next/static (standard deployment routing helper)
  const destPublicStatic = path.join(__dirname, '../public/_next/static');
  if (fs.existsSync(srcStatic)) {
    if (fs.existsSync(destPublicStatic)) {
      fs.rmSync(destPublicStatic, { recursive: true, force: true });
    }
    copyDir(srcStatic, destPublicStatic);
    console.log('Successfully copied .next/static to public/_next/static for standard Hostinger static routing.');
  }

} catch (err) {
  console.error('Error during postbuild static assets copy:', err);
}
