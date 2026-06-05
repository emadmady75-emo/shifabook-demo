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
  const src = path.join(__dirname, '../.next/static');
  const dest = path.join(__dirname, '../public/_next/static');
  
  if (fs.existsSync(src)) {
    // Clean dest if it exists
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    copyDir(src, dest);
    console.log('Successfully copied .next/static to public/_next/static for Hostinger static routing.');
  } else {
    console.warn('Warning: .next/static folder not found. Make sure "next build" has run.');
  }
} catch (err) {
  console.error('Error during postbuild static assets copy:', err);
}
