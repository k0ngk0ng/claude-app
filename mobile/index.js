// Polyfill crypto.getRandomValues BEFORE any module that uses @noble/* loads.
// ES import statements get hoisted, so we must use inline code here,
// not depend on any imported module.

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {};
}
if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = (array) => {
    // Initial polyfill — will be upgraded to expo-crypto below
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

// Now require everything (not import — imports get hoisted above the polyfill)
const { registerRootComponent } = require('expo');
const ExpoCrypto = require('expo-crypto');
const { default: App } = require('./src/App');

// Upgrade to secure random now that expo-crypto is loaded
globalThis.crypto.getRandomValues = (array) => {
  const bytes = ExpoCrypto.getRandomBytes(array.byteLength);
  const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  u8.set(new Uint8Array(bytes));
  return array;
};

registerRootComponent(App);
