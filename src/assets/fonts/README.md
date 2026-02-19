# Plus Jakarta Sans Font Setup

This app uses **Plus Jakarta Sans** with these weights:

| Weight | Font File | Usage |
|--------|-----------|-------|
| 300 Light | PlusJakartaSans-Light.ttf | Light text |
| 400 Regular | PlusJakartaSans-Regular.ttf | Body text |
| 500 Medium | PlusJakartaSans-Medium.ttf | Captions, sort pills |
| 600 SemiBold | PlusJakartaSans-SemiBold.ttf | Buttons, labels |
| 700 Bold | PlusJakartaSans-Bold.ttf | Emphasis |
| 800 ExtraBold | PlusJakartaSans-ExtraBold.ttf | Headings, prices, names |

## Installation

1. **Download** Plus Jakarta Sans from [Google Fonts](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
2. **Add** the following .ttf files to this folder (`src/assets/fonts/`):
   - PlusJakartaSans-Light.ttf
   - PlusJakartaSans-Regular.ttf
   - PlusJakartaSans-Medium.ttf
   - PlusJakartaSans-SemiBold.ttf
   - PlusJakartaSans-Bold.ttf
   - PlusJakartaSans-ExtraBold.ttf
3. **Link** the fonts by running:
   ```bash
   npx react-native-asset
   ```
4. **Rebuild** the app:
   ```bash
   npx react-native run-ios
   # or
   npx react-native run-android
   ```
