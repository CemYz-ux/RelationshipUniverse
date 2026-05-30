import { generateShareURL, importNetworkFromURL, checkShareURL } from './storage.js';

// ── My QR modal ───────────────────────────────────────────────────────────────

export async function showQRCode() {
  const container = document.getElementById('qr-code');
  container.innerHTML = '';
  try {
    const url = await generateShareURL();
    new QRCode(container, {
      text:         url,
      width:        220,
      height:       220,
      colorDark:    '#0d0d12',
      colorLight:   '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (err) {
    container.textContent = 'Could not generate QR: ' + err.message;
  }
  document.getElementById('qr-modal').classList.add('visible');
}

export function hideQRCode() {
  document.getElementById('qr-modal').classList.remove('visible');
  document.getElementById('qr-code').innerHTML = '';
}

// ── Import modal (URL input + camera scanner) ─────────────────────────────────

let _importNodeId  = null;
let _scanStream    = null;
let _scanAnimFrame = null;

export function showImportModal(nodeId) {
  _importNodeId = nodeId;
  document.getElementById('import-url-input').value = '';
  document.getElementById('import-scan-status').textContent = 'Starting camera…';
  document.getElementById('import-modal').classList.add('visible');
  _startScan();
}

export function hideImportModal() {
  _stopScan();
  document.getElementById('import-modal').classList.remove('visible');
  _importNodeId = null;
}

export function importFromURLInput() {
  const url = document.getElementById('import-url-input').value.trim();
  if (!url) return;
  hideImportModal();
  importNetworkFromURL(_importNodeId, url);
}

// ── Camera scanner ────────────────────────────────────────────────────────────

async function _startScan() {
  const video  = document.getElementById('import-video');
  const status = document.getElementById('import-scan-status');
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');

  try {
    _scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    video.srcObject = _scanStream;
    await video.play();
    status.textContent = 'Looking for QR code…';
  } catch (err) {
    status.textContent = 'Camera unavailable — paste a URL above instead.';
    return;
  }

  function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data.includes('#share=')) {
        _stopScan();
        status.textContent = '✓ QR detected — importing…';
        setTimeout(() => {
          hideImportModal();
          importNetworkFromURL(_importNodeId, code.data);
        }, 400);
        return;
      }
    }
    _scanAnimFrame = requestAnimationFrame(tick);
  }

  _scanAnimFrame = requestAnimationFrame(tick);
}

function _stopScan() {
  if (_scanAnimFrame) { cancelAnimationFrame(_scanAnimFrame); _scanAnimFrame = null; }
  if (_scanStream)    { _scanStream.getTracks().forEach(t => t.stop()); _scanStream = null; }
  const video = document.getElementById('import-video');
  if (video) video.srcObject = null;
}
