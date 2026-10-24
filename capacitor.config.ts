import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tesisatpro.app',
  appName: 'Tesisat PRO',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false },
}

export default config

