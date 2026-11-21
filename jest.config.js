module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@react-native-vector-icons|react-native-nitro-sqlite|immer|react-redux|@reduxjs/toolkit|redux|redux-thunk|reselect)/)',
  ],
};
