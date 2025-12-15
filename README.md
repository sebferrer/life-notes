# Life Notes

Life Notes is an open-source mobile application designed to help people track chronic symptoms and daily habits over time, in order to better understand how they evolve and identify potential patterns.

The application is available at:
https://life-notes.fr/

## About

Life Notes allows users to record symptoms on a daily basis, along with lifestyle data such as sleep, meals, treatments, and free-form notes. The goal is to provide a simple, privacy-friendly tool to help users better understand their health on a day-to-day basis.

All data is stored locally on the user’s device. No data is collected, transmitted, or shared.

This project is maintained voluntarily, on my personal time, and is developed as an open-source project with no commercial intent.

## Features

- Daily tracking of customizable symptoms
- Lifestyle and habit logging
- Simple statistics and trends
- Local-only data storage
- Free to use, no ads
- English and French support

## Tech Stack

- Ionic
- Angular
- Cordova
- TypeScript

## Development

### Requirements

- Node.js (recent version recommended)
- npm
- Ionic CLI
- Android Studio and Android SDK (for Android builds)

### Setup

```bash
git clone https://github.com/sebferrer/life-notes.git
cd life-notes
npm install
```

### Run in development mode

```bash
ionic serve
```

### Build and run on Android

```bash
ionic cordova platform add android
ionic cordova run android
ionic cordova build android --release
```

## Contributing

Contributions are welcome through issues, pull requests, or feedback.

## Author

Maintained by Sébastien Ferrer as a voluntary, personal open-source project.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
