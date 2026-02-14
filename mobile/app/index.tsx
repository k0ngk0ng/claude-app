/**
 * Expo Router layout — wraps the app with providers.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import App from '../src/App';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <App />
    </>
  );
}
