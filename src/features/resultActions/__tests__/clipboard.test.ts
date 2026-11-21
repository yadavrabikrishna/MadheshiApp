import { installFakeClipboard } from '../../../test-utils/fakeClipboard';
import { copyTextToClipboard } from '../clipboard';

describe('copyTextToClipboard', () => {
  it('writes the text and reports success once it is on the clipboard', async () => {
    const clipboard = installFakeClipboard();

    await expect(copyTextToClipboard('Principal: Rs. 1,000')).resolves.toBe(
      true,
    );

    expect(clipboard.setString).toHaveBeenCalledTimes(1);
    expect(clipboard.setString).toHaveBeenCalledWith('Principal: Rs. 1,000');
    expect(clipboard.content).toBe('Principal: Rs. 1,000');
  });

  it('keeps line breaks and Devanagari text exactly', async () => {
    const clipboard = installFakeClipboard();
    const text = 'मूलधन: रु. 1,00,000\n\nजम्मा रकम: रु. 1,06,000';

    await expect(copyTextToClipboard(text)).resolves.toBe(true);

    expect(clipboard.content).toBe(text);
  });

  it('reports failure when the write silently does nothing (Android swallows native errors)', async () => {
    installFakeClipboard('silentFailure');

    await expect(copyTextToClipboard('summary')).resolves.toBe(false);
  });

  it('reports failure when the clipboard still holds something else', async () => {
    const clipboard = installFakeClipboard();
    await copyTextToClipboard('older text');
    // The next write does not take effect.
    clipboard.setString.mockImplementationOnce(() => {});

    await expect(copyTextToClipboard('new text')).resolves.toBe(false);
  });

  it.each(['throwOnWrite', 'rejectOnRead'] as const)(
    'resolves false and does not throw when the clipboard fails (%s)',
    async mode => {
      installFakeClipboard(mode);

      await expect(copyTextToClipboard('summary')).resolves.toBe(false);
    },
  );

  it('does not write an empty text', async () => {
    const clipboard = installFakeClipboard();

    await expect(copyTextToClipboard('')).resolves.toBe(false);

    expect(clipboard.setString).not.toHaveBeenCalled();
  });
});
