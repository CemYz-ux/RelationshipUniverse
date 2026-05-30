import { generateShareURL, importNetworkFromURL } from './storage.js';

// ── My QR modal ───────────────────────────────────────────────────────────────

export async function showQRCode() {
  const container = document.getElementById('qr-code');
  container.innerHTML = '';
  try {
    const url = await generateShareURL();
    new QRCode(container, {
      text:         url,
      width:        280,
      height:       280,
      colorDark:    '#000000',
      colorLight:   '#ffffff',
      correctLevel: QRCode.CorrectLevel.L  // lowest error correction = least dense = easier to scan
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

// ── Import modal ──────────────────────────────────────────────────────────────

let _importNodeId = null;
let _scanStream   = null;
let _scanTimer    = null;

export function showImportModal(nodeId) {
  _importNodeId = nodeId;
  document.getElementById('import-url-input').value    = '';
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

  try {
    // 'ideal' is permissive — works on desktop too, prefers back camera on mobile
    _scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    });
    video.srcObject = _scanStream;
    await video.play();
    status.textContent = 'Looking for QR code…';
  } catch (err) {
    status.textContent = 'Camera unavailable — paste a URL above instead.';
    return;
  }

  // Prefer native BarcodeDetector (Android Chrome, desktop Chrome 88+)
  // — far more reliable than jsQR on mobile
  if ('BarcodeDetector' in window) {
    _scanWithBarcodeDetector(video, status);
  } else {
    _scanWithJsQR(video, status);
  }
}

async function _scanWithBarcodeDetector(video, status) {
  let detector;
  try {
    detector = new BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    _scanWithJsQR(video, status);
    return;
  }

  async function tick() {
    if (!_scanStream) return;
    try {
      const codes = await detector.detect(video);
      for (const code of codes) {
        if (code.rawValue.includes('#share=')) {
          _onCodeFound(code.rawValue, status);
          return;
        }
      }
    } catch (_) {}
    _scanTimer = setTimeout(tick, 200);
  }
  tick();
}

function _scanWithJsQR(video, status) {
  // willReadFrequently: true tells the browser to optimise for frequent reads
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d', { willReadFrequently: true });

  function tick() {
    if (!_scanStream) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      try {
        const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code && code.data.includes('#share=')) {
          _onCodeFound(code.data, status);
          return;
        }
      } catch (_) {}
    }

    _scanTimer = requestAnimationFrame(tick);
  }

  _scanTimer = requestAnimationFrame(tick);
}

function _onCodeFound(url, status) {
  _stopScan();
  status.textContent = '✓ QR code detected!';
  setTimeout(() => {
    hideImportModal();
    importNetworkFromURL(_importNodeId, url);
  }, 400);
}

function _stopScan() {
  if (_scanTimer !== null) {
    cancelAnimationFrame(_scanTimer);
    clearTimeout(_scanTimer);
    _scanTimer = null;
  }
  if (_scanStream) {
    _scanStream.getTracks().forEach(t => t.stop());
    _scanStream = null;
  }
  const video = document.getElementById('import-video');
  if (video) video.srcObject = null;
}
