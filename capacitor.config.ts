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
            launchShowDuration: 3000,
            backgroundColor: "#ffffff"
        }
    }
};

export default config;
