# FlipTrackr

A React Native mobile app for tracking vehicle flipping business metrics, built with Expo and SQLite.

## Features

- **Vehicle Management**: Track multiple vehicle flips with detailed information (year, make, model, VIN, mileage)
- **Financial Tracking**: Monitor buy/sell prices, costs, profit, and ROI for each flip
- **Expense Management**: Add and categorize line items (parts, labor, fees, misc) for each vehicle
- **Data Export**: Export individual flip data or all flips to CSV format
- **Dual View**: Separate tabs for open flips and sold vehicles
- **Bulk Operations**: Select and delete multiple flips at once

## Screenshots

The app features a clean, iOS-style interface with:
- Home screen showing open and sold vehicle tabs
- Detailed flip sheets for editing vehicle information
- Real-time profit/loss calculations
- Export functionality for tax and business reporting

## Tech Stack

- **Framework**: React Native with Expo SDK 53
- **Database**: SQLite with expo-sqlite
- **Navigation**: React Navigation v7
- **Language**: TypeScript
- **Platform**: iOS and Android

## Prerequisites

- Node.js (v16 or higher)
- Expo CLI
- iOS Simulator or Android Emulator (for development)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/asifchowdhury1/FlipTrackr.git
cd FlipTrackr
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on your preferred platform:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app for physical device

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web browser

## Project Structure

```
src/
├── components/         # Reusable UI components
├── db/                # SQLite database setup and schema
├── screens/           # Main app screens
│   ├── Home.tsx       # Vehicle list and tabs
│   ├── FlipSheet.tsx  # Vehicle detail/edit form
│   └── Settings.tsx   # Export and app settings
├── state/             # Context API for state management
├── types/             # TypeScript type definitions
└── utils/             # Helper functions for currency, dates, etc.
```

## Database Schema

The app uses SQLite with two main tables:
- **flips**: Vehicle information and financial data
- **line_items**: Individual expenses and costs per vehicle

## Building for Production

1. Configure app signing in `app.json`
2. Build using EAS:
```bash
npx eas build --platform ios
npx eas build --platform android
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and not open source.

## Contact

For questions or support, contact the repository owner.