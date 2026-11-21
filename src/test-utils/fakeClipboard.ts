import Clipboard from '@react-native-clipboard/clipboard';

/**
 * How the fake clipboard behaves:
 * - `working`: a write is stored and can be read back.
 * - `silentFailure`: the write does nothing and does not throw. This is what
 *   Android's `ClipboardModule.setString` does when the native write fails (it
 *   catches the exception and only prints it), so JS cannot see the error.
 * - `throwOnWrite`: the write throws.
 * - `rejectOnRead`: the write works, but reading the clipboard rejects.
 */
export type FakeClipboardMode =
  | 'working'
  | 'silentFailure'
  | 'throwOnWrite'
  | 'rejectOnRead';

/** Replaces the (globally mocked) clipboard with a small in-memory fake. */
export function installFakeClipboard(mode: FakeClipboardMode = 'working') {
  let content = '';
  jest
    .mocked(Clipboard.setString)
    .mockReset()
    .mockImplementation(text => {
      if (mode === 'throwOnWrite') {
        throw new Error('The clipboard write failed');
      }
      if (mode !== 'silentFailure') {
        content = text;
      }
    });
  jest
    .mocked(Clipboard.getString)
    .mockReset()
    .mockImplementation(async () => {
      if (mode === 'rejectOnRead') {
        throw new Error('The clipboard read failed');
      }
      return content;
    });
  return {
    /** What is on the fake clipboard right now. */
    get content() {
      return content;
    },
    setString: jest.mocked(Clipboard.setString),
  };
}
