import Clipboard from '@react-native-clipboard/clipboard';

/**
 * Copy plain text to the clipboard. Resolves `true` only when the text is
 * confirmed to be on the clipboard, and never throws.
 *
 * The write is checked by reading the clipboard back, because the library's
 * `setString` returns nothing, and on Android its native code catches any
 * error and only prints it (`ClipboardModule.setString`). A failed write is
 * therefore invisible to JavaScript, and a plain try/catch would report false
 * success.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) {
    return false;
  }
  try {
    Clipboard.setString(text);
    return (await Clipboard.getString()) === text;
  } catch {
    return false;
  }
}
