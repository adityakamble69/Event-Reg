const CONFIG = {
  /* Deployed Apps Script Web App URL — ends in /exec */
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxNzGePtoDpyuya13uRHey5Miusmp6bi-lubXl3ogXuKCKRpFys7bDBVtI6_5X6gYup/exec',

  EVENT_NAME: 'EventReg',
  EVENT_TAGLINE: 'Register your team in under two minutes.',

  /* Payment info shown on the form */
  PAYMENT_QR_URL: 'assets/payment-qr.png',
  PAYMENT_UPI: 'yourupi@bank',     // <-- apna UPI ID yahan

  /* Max upload size for payment screenshot (bytes) */
  MAX_SCREENSHOT_BYTES: 3 * 1024 * 1024,

  /* Allowed screenshot types */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
};

/* ================================================================== *
 * API wrapper with 15s timeout
 * ================================================================== */

async function apiCall(action, payload, method) {
  if (!CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.indexOf('PASTE_') === 0) {
    throw new Error('Backend URL not configured. Set GAS_WEB_APP_URL in js/config.js.');
  }

  const data = Object.assign({ action: action }, payload || {});
  const usePost = (method || 'POST') === 'POST';

  const controller = new AbortController();
  const timeoutId = setTimeout(function () { controller.abort(); }, 60000); // 60s for uploads

  let response;
  try {
    if (usePost) {
      response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
        redirect: 'follow',
        signal: controller.signal
      });
    } else {
      const qs = Object.keys(data).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
      }).join('&');
      response = await fetch(CONFIG.GAS_WEB_APP_URL + '?' + qs, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Server timed out. Try again, or use a smaller screenshot.');
    }
    throw new Error('Could not reach server. Check internet and config.js URL.');
  }
  clearTimeout(timeoutId);

  if (!response.ok) throw new Error('Network error (HTTP ' + response.status + ').');

  const text = await response.text();

  if (text.trim().charAt(0) === '<') {
    throw new Error('Server returned HTML. Set deployment access to "Anyone" in Apps Script.');
  }

  try { return JSON.parse(text); }
  catch (err) { throw new Error('Bad response: ' + text.slice(0, 80)); }
}

/* ================================================================== *
 * Shared helpers
 * ================================================================== */

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(message, type) {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const toast = document.createElement('div');
  toast.className = 'toast toast--' + (type || 'info');
  toast.textContent = message;
  host.appendChild(toast);
  requestAnimationFrame(function () { toast.classList.add('is-visible'); });
  setTimeout(function () {
    toast.classList.remove('is-visible');
    setTimeout(function () { toast.remove(); }, 300);
  }, 4200);
}

function setButtonLoading(button, isLoading, loadingLabel) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> ' + escapeHtml(loadingLabel || 'Working…');
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
  }
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function applyEventBranding(event) {
  const name = (event && event.eventName) || CONFIG.EVENT_NAME;
  document.querySelectorAll('[data-event-name]').forEach(function (el) { el.textContent = name; });

  const tagline = (event && event.eventTagline) || CONFIG.EVENT_TAGLINE;
  document.querySelectorAll('[data-event-tagline]').forEach(function (el) { el.textContent = tagline; });
}

async function loadEventInfo() {
  try {
    const res = await apiCall('eventInfo', {}, 'GET');
    if (res.success && res.data) { applyEventBranding(res.data); return res.data; }
  } catch (err) { applyEventBranding(null); }
  return null;
}