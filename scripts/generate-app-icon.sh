#!/bin/bash

# Script to generate app icons from App-icon.jpg
# Uses macOS built-in sips tool for image conversion

set -e

SOURCE_IMAGE="src/assets/App-icon.jpg"
IOS_ICON_DIR="ios/PropertyApp/Images.xcassets/AppIcon.appiconset"
ANDROID_RES_DIR="android/app/src/main/res"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

echo "Generating app icons from App-icon.jpg..."
echo ""

# Create iOS icon directory if it doesn't exist
mkdir -p "$IOS_ICON_DIR"

# Generate iOS icons
echo "Generating iOS icons..."
sips -s format png -z 40 40 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/icon-20@2x.png" > /dev/null 2>&1
echo "  ✓ Generated icon-20@2x.png (40x40px)"

sips -s format png -z 60 60 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/icon-20@3x.png" > /dev/null 2>&1
echo "  ✓ Generated icon-20@3x.png (60x60px)"

sips -s format png -z 58 58 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/icon-29@2x.png" > /dev/null 2>&1
echo "  ✓ Generated icon-29@2x.png (58x58px)"

sips -s format png -z 87 87 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/icon-29@3x.png" > /dev/null 2>&1
echo "  ✓ Generated icon-29@3x.png (87x87px)"

sips -s format png -z 80 80 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/icon-40@2x.png" > /dev/null 2>&1
echo "  ✓ Generated icon-40@2x.png (80x80px)"

sips -s format png -z 120 120 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/icon-40@3x.png" > /dev/null 2>&1
echo "  ✓ Generated icon-40@3x.png (120x120px)"

sips -s format png -z 120 120 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/icon-60@2x.png" > /dev/null 2>&1
echo "  ✓ Generated icon-60@2x.png (120x120px)"

sips -s format png -z 180 180 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/icon-60@3x.png" > /dev/null 2>&1
echo "  ✓ Generated icon-60@3x.png (180x180px)"

sips -s format png -z 1024 1024 "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/icon-1024.png" > /dev/null 2>&1
echo "  ✓ Generated icon-1024.png (1024x1024px)"

# Generate Android icons
echo ""
echo "Generating Android icons (square)..."

# mdpi (48x48)
mkdir -p "$ANDROID_RES_DIR/mipmap-mdpi"
sips -s format png -z 48 48 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-mdpi/ic_launcher.png" > /dev/null 2>&1
echo "  ✓ Generated mipmap-mdpi/ic_launcher.png (48x48px)"

# hdpi (72x72)
mkdir -p "$ANDROID_RES_DIR/mipmap-hdpi"
sips -s format png -z 72 72 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-hdpi/ic_launcher.png" > /dev/null 2>&1
echo "  ✓ Generated mipmap-hdpi/ic_launcher.png (72x72px)"

# xhdpi (96x96)
mkdir -p "$ANDROID_RES_DIR/mipmap-xhdpi"
sips -s format png -z 96 96 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-xhdpi/ic_launcher.png" > /dev/null 2>&1
echo "  ✓ Generated mipmap-xhdpi/ic_launcher.png (96x96px)"

# xxhdpi (144x144)
mkdir -p "$ANDROID_RES_DIR/mipmap-xxhdpi"
sips -s format png -z 144 144 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-xxhdpi/ic_launcher.png" > /dev/null 2>&1
echo "  ✓ Generated mipmap-xxhdpi/ic_launcher.png (144x144px)"

# xxxhdpi (192x192)
mkdir -p "$ANDROID_RES_DIR/mipmap-xxxhdpi"
sips -s format png -z 192 192 "$SOURCE_IMAGE" --out "$ANDROID_RES_DIR/mipmap-xxxhdpi/ic_launcher.png" > /dev/null 2>&1
echo "  ✓ Generated mipmap-xxxhdpi/ic_launcher.png (192x192px)"

# Generate Android round icons (copy square icons for now, as sips doesn't easily create round icons)
echo ""
echo "Generating Android round icons..."
cp "$ANDROID_RES_DIR/mipmap-mdpi/ic_launcher.png" "$ANDROID_RES_DIR/mipmap-mdpi/ic_launcher_round.png"
echo "  ✓ Generated mipmap-mdpi/ic_launcher_round.png"
cp "$ANDROID_RES_DIR/mipmap-hdpi/ic_launcher.png" "$ANDROID_RES_DIR/mipmap-hdpi/ic_launcher_round.png"
echo "  ✓ Generated mipmap-hdpi/ic_launcher_round.png"
cp "$ANDROID_RES_DIR/mipmap-xhdpi/ic_launcher.png" "$ANDROID_RES_DIR/mipmap-xhdpi/ic_launcher_round.png"
echo "  ✓ Generated mipmap-xhdpi/ic_launcher_round.png"
cp "$ANDROID_RES_DIR/mipmap-xxhdpi/ic_launcher.png" "$ANDROID_RES_DIR/mipmap-xxhdpi/ic_launcher_round.png"
echo "  ✓ Generated mipmap-xxhdpi/ic_launcher_round.png"
cp "$ANDROID_RES_DIR/mipmap-xxxhdpi/ic_launcher.png" "$ANDROID_RES_DIR/mipmap-xxxhdpi/ic_launcher_round.png"
echo "  ✓ Generated mipmap-xxxhdpi/ic_launcher_round.png"

# Update iOS Contents.json
echo ""
echo "Updating iOS Contents.json..."
cat > "$IOS_ICON_DIR/Contents.json" << 'EOF'
{
  "images" : [
    {
      "filename" : "icon-20@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-20@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-29@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-29@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-40@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-40@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-60@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-60@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-1024.png",
      "idiom" : "ios-marketing",
      "scale" : "1x",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF
echo "  ✓ Updated Contents.json"

echo ""
echo "✅ All app icons generated successfully!"
echo ""
echo "Next steps:"
echo "1. Rebuild your iOS app: cd ios && pod install && cd .. && npm run ios"
echo "2. Rebuild your Android app: npm run android"
