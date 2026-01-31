const fs = require('fs');
const path = require('path');

// Check if sharp is available, if not, provide instructions
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp package is required. Please install it by running:');
  console.error('npm install --save-dev sharp');
  process.exit(1);
}

const sourceImage = path.join(__dirname, '../src/assets/App-icon.png');
const outputDir = path.join(__dirname, '../');

// iOS icon sizes (in points, need to multiply by scale)
const iosIcons = [
  { size: 20, scale: 2, filename: 'icon-20@2x.png' },      // 40x40
  { size: 20, scale: 3, filename: 'icon-20@3x.png' },      // 60x60
  { size: 29, scale: 2, filename: 'icon-29@2x.png' },      // 58x58
  { size: 29, scale: 3, filename: 'icon-29@3x.png' },       // 87x87
  { size: 40, scale: 2, filename: 'icon-40@2x.png' },      // 80x80
  { size: 40, scale: 3, filename: 'icon-40@3x.png' },      // 120x120
  { size: 60, scale: 2, filename: 'icon-60@2x.png' },      // 120x120
  { size: 60, scale: 3, filename: 'icon-60@3x.png' },      // 180x180
  { size: 1024, scale: 1, filename: 'icon-1024.png' },    // 1024x1024 (App Store)
];

// Android icon sizes (in pixels)
const androidIcons = [
  { density: 'mdpi', size: 48, filename: 'ic_launcher.png' },
  { density: 'hdpi', size: 72, filename: 'ic_launcher.png' },
  { density: 'xhdpi', size: 96, filename: 'ic_launcher.png' },
  { density: 'xxhdpi', size: 144, filename: 'ic_launcher.png' },
  { density: 'xxxhdpi', size: 192, filename: 'ic_launcher.png' },
];

async function generateIcons() {
  if (!fs.existsSync(sourceImage)) {
    console.error(`Error: Source image not found at ${sourceImage}`);
    process.exit(1);
  }

  console.log('Generating app icons from App-icon.png...\n');

  // Generate iOS icons
  console.log('Generating iOS icons...');
  const iosIconDir = path.join(__dirname, '../ios/PropertyApp/Images.xcassets/AppIcon.appiconset');
  
  for (const icon of iosIcons) {
    const pixelSize = icon.size * icon.scale;
    const outputPath = path.join(iosIconDir, icon.filename);
    
    await sharp(sourceImage)
      .resize(pixelSize, pixelSize, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(outputPath);
    
    console.log(`  ✓ Generated ${icon.filename} (${pixelSize}x${pixelSize}px)`);
  }

  // Generate Android icons (square)
  console.log('\nGenerating Android icons (square)...');
  for (const icon of androidIcons) {
    const androidDir = path.join(__dirname, `../android/app/src/main/res/mipmap-${icon.density}`);
    
    if (!fs.existsSync(androidDir)) {
      fs.mkdirSync(androidDir, { recursive: true });
    }
    
    const outputPath = path.join(androidDir, icon.filename);
    
    await sharp(sourceImage)
      .resize(icon.size, icon.size, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(outputPath);
    
    console.log(`  ✓ Generated ${icon.density}/${icon.filename} (${icon.size}x${icon.size}px)`);
  }

  // Generate Android round icons
  console.log('\nGenerating Android round icons...');
  for (const icon of androidIcons) {
    const androidDir = path.join(__dirname, `../android/app/src/main/res/mipmap-${icon.density}`);
    const outputPath = path.join(androidDir, 'ic_launcher_round.png');
    
    // Create a round icon by creating a circular mask
    const roundedCorners = Buffer.from(
      `<svg><rect x="0" y="0" width="${icon.size}" height="${icon.size}" rx="${icon.size / 2}" ry="${icon.size / 2}"/></svg>`
    );
    
    await sharp(sourceImage)
      .resize(icon.size, icon.size, {
        fit: 'cover',
        position: 'center'
      })
      .composite([
        {
          input: roundedCorners,
          blend: 'dest-in'
        }
      ])
      .png()
      .toFile(outputPath);
    
    console.log(`  ✓ Generated ${icon.density}/ic_launcher_round.png (${icon.size}x${icon.size}px)`);
  }

  // Update iOS Contents.json
  console.log('\nUpdating iOS Contents.json...');
  const contentsJson = {
    images: [
      {
        filename: 'icon-20@2x.png',
        idiom: 'iphone',
        scale: '2x',
        size: '20x20'
      },
      {
        filename: 'icon-20@3x.png',
        idiom: 'iphone',
        scale: '3x',
        size: '20x20'
      },
      {
        filename: 'icon-29@2x.png',
        idiom: 'iphone',
        scale: '2x',
        size: '29x29'
      },
      {
        filename: 'icon-29@3x.png',
        idiom: 'iphone',
        scale: '3x',
        size: '29x29'
      },
      {
        filename: 'icon-40@2x.png',
        idiom: 'iphone',
        scale: '2x',
        size: '40x40'
      },
      {
        filename: 'icon-40@3x.png',
        idiom: 'iphone',
        scale: '3x',
        size: '40x40'
      },
      {
        filename: 'icon-60@2x.png',
        idiom: 'iphone',
        scale: '2x',
        size: '60x60'
      },
      {
        filename: 'icon-60@3x.png',
        idiom: 'iphone',
        scale: '3x',
        size: '60x60'
      },
      {
        filename: 'icon-1024.png',
        idiom: 'ios-marketing',
        scale: '1x',
        size: '1024x1024'
      }
    ],
    info: {
      author: 'xcode',
      version: 1
    }
  };

  fs.writeFileSync(
    path.join(iosIconDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  console.log('  ✓ Updated Contents.json');

  console.log('\n✅ All app icons generated successfully!');
  console.log('\nNext steps:');
  console.log('1. Rebuild your iOS app: cd ios && pod install && cd .. && npm run ios');
  console.log('2. Rebuild your Android app: npm run android');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
