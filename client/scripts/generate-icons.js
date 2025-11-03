// Script to generate PWA icons in various sizes
// This creates a simple mood tracking icon programmatically

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple SVG icon for each size
const generateSVGIcon = (size) => {
  const scale = size / 512;
  const radius = 160 * scale;
  const center = size / 2;
  const eyeRadius = 20 * scale;
  const eyeY = 226 * scale;
  const eyeLeftX = 206 * scale;
  const eyeRightX = 306 * scale;
  const smileY = 286 * scale;
  const smileStartX = 176 * scale;
  const smileEndX = 336 * scale;
  const strokeWidth = 20 * scale;

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${100 * scale}" fill="#6200ee"/>

  <!-- Smiling face -->
  <circle cx="${center}" cy="${center}" r="${radius}" fill="#ffffff"/>

  <!-- Eyes -->
  <circle cx="${eyeLeftX}" cy="${eyeY}" r="${eyeRadius}" fill="#6200ee"/>
  <circle cx="${eyeRightX}" cy="${eyeY}" r="${eyeRadius}" fill="#6200ee"/>

  <!-- Smile -->
  <path d="M ${smileStartX} ${smileY} Q ${center} ${286 * scale + 60 * scale} ${smileEndX} ${smileY}"
        stroke="#6200ee" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round"/>

  <!-- Calendar indicator at bottom -->
  <rect x="${196 * scale}" y="${360 * scale}" width="${120 * scale}" height="${90 * scale}"
        rx="${10 * scale}" fill="#ffffff" opacity="0.3"/>
  <rect x="${196 * scale}" y="${360 * scale}" width="${120 * scale}" height="${30 * scale}"
        rx="${10 * scale}" fill="#ffffff" opacity="0.5"/>
</svg>`;
};

// Generate icons
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

sizes.forEach((size) => {
  const svg = generateSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);

  fs.writeFileSync(filepath, svg);
  console.log(`Generated: ${filename}`);
});

// Also create favicon.ico sized icon
const faviconSvg = generateSVGIcon(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSvg);
console.log('Generated: favicon.svg');

console.log('\nAll icons generated successfully!');
console.log('\nNote: SVG icons work great for modern browsers.');
console.log('If you need PNG versions, you can convert these SVGs using an online tool');
console.log('or a library like sharp or imagemagick.');
