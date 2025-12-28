import '@testing-library/jest-dom';
import { randomUUID } from 'crypto';

// Polyfill crypto.randomUUID for Node.js test environment
if (typeof global.crypto === 'undefined') {
  global.crypto = {} as any;
}
if (typeof global.crypto.randomUUID === 'undefined') {
  global.crypto.randomUUID = randomUUID;
}

// Polyfill URL.createObjectURL and URL.revokeObjectURL for Jest
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = jest.fn((blob: Blob) => `blob:${Math.random()}`);
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = jest.fn();
} 