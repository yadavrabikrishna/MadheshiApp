/* eslint-env jest */

// The clipboard library is a native module and cannot load under Jest. Tests
// that need real behavior install a fake with `installFakeClipboard()`.
jest.mock('@react-native-clipboard/clipboard', () =>
  require('@react-native-clipboard/clipboard/jest/clipboard-mock'),
);

// The native capture and share modules do not exist under Jest. Tests set the
// behavior they need (resolved uri, share result, failures) per test.
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(),
  releaseCapture: jest.fn(),
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn() },
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: { saveAsset: jest.fn() },
}));
