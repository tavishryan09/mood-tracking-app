# PWA Icons

This directory should contain the app icons in various sizes for the Progressive Web App.

## Required Icon Sizes

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons

### Option 1: Using Online Tools (Easiest)

1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload your app logo (ideally 512x512 or larger, square)
3. Download the generated icons
4. Place them in this directory

### Option 2: Using ImageMagick (Command Line)

If you have a single source image (e.g., `logo.png`), you can generate all sizes:

```bash
# Install ImageMagick first (if not installed)
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Then run these commands:
convert logo.png -resize 72x72 icon-72x72.png
convert logo.png -resize 96x96 icon-96x96.png
convert logo.png -resize 128x128 icon-128x128.png
convert logo.png -resize 144x144 icon-144x144.png
convert logo.png -resize 152x152 icon-152x152.png
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 384x384 icon-384x384.png
convert logo.png -resize 512x512 icon-512x512.png
```

### Option 3: Using the Expo Asset

You can copy the icon from the assets folder and generate sizes:

```bash
# From the client directory
cd public/icons
cp ../../assets/icon.png source-icon.png

# Then use ImageMagick as shown in Option 2
```

### Option 4: Use PWA Asset Generator (npm package)

```bash
npx @pwa/asset-generator ./assets/icon.png ./public/icons --icon-only --padding "10%" --background "#ffffff"
```

## Temporary Solution

Until you generate proper icons, the app will use the existing assets from the `assets` folder. The manifest.json will need to be updated once you have the icons in place.

## Icon Design Guidelines

- **Size**: Start with at least 512x512px
- **Format**: PNG with transparency
- **Shape**: Square (1:1 ratio)
- **Padding**: Leave some padding around the main content (maskable icons)
- **Background**: Consider how it looks on both light and dark backgrounds
- **Simplicity**: Icons should be recognizable at small sizes
