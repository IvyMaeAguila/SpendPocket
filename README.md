# Spend Pocket

Spend Pocket is an offline-first personal expense tracker built with Expo and React Native. Log what you spend, see where your money goes, and export an itemized receipt for any day or month.

The app uses PHP (₱) and stores expenses and preferences locally with SQLite. It runs without an app account or a separate backend.

## Features

- **Today** shows daily spending, weekly activity, and quick-add suggestions for frequent expenses.
- **History** has a spending heatmap, daily totals, and expense editing and deletion with Undo.
- **Summary** includes an interactive category chart, daily spending bars, and a filterable expense list.
- **Budgets** tracks monthly and category limits with progress indicators.
- **Receipts and exports** include paper-style previews, daily and monthly PDF receipts with itemized expenses and totals, and CSV export.
- **Personalization** includes editable category icons, light and dark themes, and optional tap and spending sounds.

## Try it locally

Use Node.js 22.13 or newer. From the repository root, run:

```sh
npm ci
npx expo start --web --port 8092
```

Open [Spend Pocket locally](http://localhost:8092) in Chrome or Edge. Use the same browser profile and port to keep access to your entries. Try logging a Food expense, opening its receipt from History, and checking the category total in Summary.

For a phone preview, run `npx expo start` and scan the QR code with an Expo Go version that supports SDK 58. You can also use a compatible development build.

## Portfolio demo

A production web demo has been built and tested locally at three phone widths. The public link is pending deployment.

## Tech stack

- Expo SDK 58, React Native, React Native Web, and TypeScript
- Expo Router for navigation and Expo SQLite for local storage
- NativeWind for styling, Roboto and Noto Serif for typography, and jsPDF for receipts

## Development checks

```sh
npm run lint
npx tsc --noEmit
node --test scripts/spend-pocket.test.cjs
npx expo export --platform android --platform ios
```

The database tests cover migrations, expense operations, budgets, and reporting. The final command checks that Expo can bundle JavaScript and assets for both mobile platforms. If Metro reports missing files in a OneDrive checkout, try running the export from a fresh copy outside the synced folder.

## Build for Android and iPhone

Link the project to your Expo account, then use the internal preview profile to create installable test builds. The Android preview profile produces an APK. An iPhone preview build requires Apple signing credentials and a registered test device.

```sh
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile preview --platform all
```

Android expense entry, offline persistence, and PDF sharing were verified in Expo Go on an emulator. Standalone Android and signed iPhone builds still need physical-phone testing. On each phone, confirm that an expense saved in airplane mode survives a restart, the keypad and note field are usable, daily and monthly receipts can be shared, and the sound toggle works.

After phone testing, use `npx eas-cli@latest build --profile production --platform all` for production builds. Confirm the `com.spendpocket.app` identifier in your developer accounts before store submission.
