const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#dc2626' : '';
}

function sanitizeFilename(input) {
  return input
    .toLowerCase()
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function extractHtmlFromTab(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.documentElement.outerHTML
  });

  if (!results || !results.length) {
    throw new Error('Could not read HTML from current tab.');
  }

  return results[0].result;
}

async function downloadHtmlAsText(html, baseName) {
  const blob = new Blob([html], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    await chrome.downloads.download({
      url,
      filename: `${baseName || 'page'}-source.txt`,
      saveAs: true
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

saveBtn.addEventListener('click', async () => {
  saveBtn.disabled = true;
  setStatus('Reading page HTML...');

  try {
    const tab = await getCurrentTab();

    if (!tab?.id) {
      throw new Error('No active tab found.');
    }

    if (!tab.url || !/^https?:/i.test(tab.url)) {
      throw new Error('Open an http(s) page and try again.');
    }

    const html = await extractHtmlFromTab(tab.id);
    const fileBaseName = sanitizeFilename(tab.title || new URL(tab.url).hostname);
    await downloadHtmlAsText(html, fileBaseName);
    setStatus('Done! Your TXT file download has started.');
  } catch (error) {
    setStatus(error.message || 'Something went wrong.', true);
  } finally {
    saveBtn.disabled = false;
  }
});
