import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.sebferrer.life_notes',
    appName: 'Life Notes',
    webDir: 'www',
    server: {
        androidScheme: 'http',
        cleartext: true,
        hostname: 'localhost'
    },
    android: {
        allowMixedContent: true
    },
    plugins: {
        SplashScreen: {
            // Hidden by the app once the timeline is drawn, at the latest after 3 s (see GlobalService.hideSplashScreen)
            launchAutoHide: false,
            backgroundColor: "#ffffff"
        }
    }
};

export default config;
