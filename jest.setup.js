/* eslint-env jest */

// The clipboard library is a native module and cannot load under Jest. Tests
// that need real behavior install a fake with `installFakeClipboard()`.
jest.mock('@react-native-clipboard/clipboard', () =>
  require('@react-native-clipboard/clipboard/jest/clipboard-mock'),
);
