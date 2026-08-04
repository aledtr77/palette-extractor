// The two ways text leaves the app: the clipboard and a downloaded file. Both
// report success as a boolean and say nothing to the user — the caller owns the
// message.

const OBJECT_URL_GRACE_MS = 500;

// Falls back to a hidden textarea plus execCommand when the Clipboard API is
// missing or refused, which is what happens outside a secure context.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithSelection(text);
  }
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  // Revoked on a delay: pulling the URL out from under the click cancels the
  // download in some browsers.
  setTimeout(() => URL.revokeObjectURL(link.href), OBJECT_URL_GRACE_MS);
}

function copyWithSelection(text) {
  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  return copied;
}
