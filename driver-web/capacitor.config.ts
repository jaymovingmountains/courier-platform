import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.courier.driver',
  appName: 'DriverApp',
  webDir: 'build',
  server: {
    url: 'http://localhost:3001',
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    scheme: 'DriverApp',
    backgroundColor: '#ffffff'
  }
};

export default config;
