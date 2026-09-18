(function () {
  'use strict';

  const SESSION_KEY = 'eventreg_checkin_session';
  const LOGIN_PAGE = 'checkin-login.html';

  if (sessionStorage.getItem(SESSION_KEY) !== '1') {
    window.location.replace(LOGIN_PAGE);
    return;
  }

  const SAME_CODE_COOLDOWN_MS = 5000;
  const POST_CHECKIN_COOLDOWN_MS = 1200;

  const logoutBtn = document.getElementById('logoutBtn');
  const readerHolder = document.getElementById('readerPlaceholder');
  const startScanBtn = document.getElementById('startScanBtn');
  const stopScanBtn = document.getElementById('stopScanBtn');
  const readerHint = document.getElementById('readerHint');
  const resultEl = document.getElementById('result');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultText = document.getElementById('resultText');
  const resultMeta = document.getElementById('resultMeta');
  const manualForm = document.getElementById('manualForm');
  const manualRegId = document.getElementById('manualRegId');
  const manualBtn = document.getElementById('manualBtn');
  const statTotal = document.getElementById('statTotal');
  const statCheckedIn = document.getElementById('statCheckedIn');
  const statPending = document.getElementById('statPending');
  const recentList = document.getElementById('recentList');
  const refreshStatsBtn = document.getElementById('refreshStatsBtn');

  let scanner = null;
  let isScanning = false;
  let isSubmitting = false;
  let lastCode = '';
  let lastCodeAt = 0;
  let cooldownUntil = 0;
  let recent = [];
  let stats = { total: 0, checkedIn: 0, pending: 0 };

  const ICONS = {
    idle: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
    success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    warning: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
  };

  function init() {
    loadEventInfo();
    bindEvents();
    setResultIcon('idle');
    refreshStats(false);
  }

  function bindEvents() {
    logoutBtn.addEventListener('click', function () {
      stopScanner();
      sessionStorage.removeItem(SESSION_KEY);
      window.location.replace(LOGIN_PAGE);
    });
    startScanBtn.addEventListener('click', startScanner);
    stopScanBtn.addEventListener('click', stopScanner);
    manualForm.addEventListener('submit', handleManualSubmit);
    refreshStatsBtn.addEventListener('click', function () { refreshStats(true); });

    manualRegId.addEventListener('input', function (e) {
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(pos, pos);
    });

    window.addEventListener('beforeunload', function () {
      if (scanner && isScanning) { try { scanner.stop(); } catch (err) { } }
    });
  }

  /* ---------- Scanner ---------- */
  async function startScanner() {
    if (isScanning) return;
    if (typeof Html5Qrcode === 'undefined') {
      readerHint.textContent = 'Scanner library failed to load. Use manual entry below.';
      showToast('Scanner unavailable.', 'error');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      readerHint.textContent = 'Camera not available. Use manual entry below.';
      showToast('Camera not supported.', 'error');
      return;
    }

    setButtonLoading(startScanBtn, true, 'Starting…');
    try {
      scanner = new Html5Qrcode('reader', { verbose: false });
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: function (w, h) {
            const edge = Math.floor(Math.min(w, h) * 0.72);
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0
        },
        onScanSuccess,
        function () { }
      );
      isScanning = true;
      readerHolder.hidden = true;
      startScanBtn.hidden = true;
      stopScanBtn.hidden = false;
      readerHint.textContent = 'Scanning… point a QR code at the camera.';
    } catch (err) {
      const msg = String(err && err.message ? err.message : err);
      readerHint.textContent = (msg.indexOf('Permission') !== -1 || msg.indexOf('NotAllowed') !== -1)
        ? 'Camera permission denied. Use manual entry below.'
        : 'Could not start camera. Use manual entry below.';
      showToast('Camera failed.', 'error');
      scanner = null;
    } finally {
      setButtonLoading(startScanBtn, false);
    }
  }

  async function stopScanner() {
    if (!scanner || !isScanning) return;
    try { await scanner.stop(); scanner.clear(); } catch (err) { }
    isScanning = false;
    scanner = null;
    readerHolder.hidden = false;
    startScanBtn.hidden = false;
    stopScanBtn.hidden = true;
    readerHint.textContent = 'Camera is off.';
  }

  function onScanSuccess(decodedText) {
    const now = Date.now();
    if (now < cooldownUntil) return;
    const code = extractRegId(decodedText);
    if (!code) return;
    if (code === lastCode && (now - lastCodeAt) < SAME_CODE_COOLDOWN_MS) return;
    lastCode = code;
    lastCodeAt = now;
    submitCheckIn(code, false);
  }

  function extractRegId(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    if (/^EVT-[A-Z0-9]{4,10}$/i.test(raw)) return raw.toUpperCase();
    try {
      const obj = JSON.parse(raw);
      if (obj && obj.regId) return String(obj.regId).trim().toUpperCase();
    } catch (err) { }
    return raw.toUpperCase();
  }

  /* ---------- Manual ---------- */
  function handleManualSubmit(event) {
    event.preventDefault();
    const code = manualRegId.value.trim().toUpperCase();
    if (!code) { showToast('Enter a registration ID.', 'error'); manualRegId.focus(); return; }
    submitCheckIn(code, true);
  }

  async function submitCheckIn(regId, fromManual) {
    if (isSubmitting) return;
    isSubmitting = true;
    if (fromManual) setButtonLoading(manualBtn, true, 'Checking…');

    try {
      const res = await apiCall('checkin', { regId: regId }, 'POST');
      if (!res) { renderResult('error', 'No response', 'Server did not respond.'); return; }
      const data = res.data || {};

      if (!res.success) {
        renderResult('error', 'Invalid ID', res.message || 'Not found.');
        return;
      }
      if (data.alreadyCheckedIn) {
        renderResult('warning', 'Already checked in', data.name + ' was checked in earlier.', data);
      } else {
        renderResult('success', 'Checked in', res.message || ('Welcome, ' + data.name + '!'), data);
        pushRecent(data);
        bumpCheckedInCount();
      }
      if (fromManual) manualRegId.value = '';
    } catch (err) {
      renderResult('error', 'Connection error', err.message || 'Could not reach server.');
    } finally {
      isSubmitting = false;
      setButtonLoading(manualBtn, false);
      cooldownUntil = Date.now() + POST_CHECKIN_COOLDOWN_MS;
      if (fromManual) manualRegId.focus();
    }
  }

  /* ---------- Result ---------- */
  function setResultIcon(type) {
    resultIcon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
      + 'stroke-linecap="round" stroke-linejoin="round">' + ICONS[type] + '</svg>';
  }

  function renderResult(type, title, text, data) {
    resultEl.className = 'result result--' + type;
    setResultIcon(type);
    resultTitle.textContent = title;
    resultText.textContent = text;

    const meta = [];
    if (data && data.regId) meta.push(data.regId);
    if (data && data.teamName) meta.push('Team: ' + data.teamName);
    if (data && data.leaderName) meta.push('Leader: ' + data.leaderName);
    if (data && data.college) meta.push(data.college);
    if (data && data.checkinTime && !data.alreadyCheckedIn) meta.push(formatDateTime(data.checkinTime));

    if (meta.length) {
      resultMeta.innerHTML = meta.map(function (m) { return '<span>' + escapeHtml(m) + '</span>'; }).join('');
      resultMeta.hidden = false;
    } else {
      resultMeta.innerHTML = '';
      resultMeta.hidden = true;
    }

    if (type !== 'idle') {
      showToast(title + (text ? ' — ' + text : ''),
        type === 'success' ? 'success' : type === 'error' ? 'error' : 'info');
    }
  }

  /* ---------- Recent ---------- */
  function pushRecent(data) {
    recent.unshift({ name: data.name || 'Unknown', regId: data.regId || '' });
    recent = recent.slice(0, 8);
    renderRecent();
  }

  function renderRecent() {
    if (!recent.length) {
      recentList.innerHTML = '<li class="recent__empty">No check-ins yet this session.</li>';
      return;
    }
    recentList.innerHTML = recent.map(function (r) {
      return '<li><span class="recent__name">' + escapeHtml(r.name) + '</span>'
        + '<span class="recent__id">' + escapeHtml(r.regId) + '</span></li>';
    }).join('');
  }

  /* ---------- Stats ---------- */
  async function refreshStats(announce) {
    try {
      const res = await apiCall('list', {}, 'GET');
      if (!res || !res.success) throw new Error('stats unavailable');
      const s = (res.data && res.data.stats) || {};
      stats = {
        total: s.total || 0, checkedIn: s.checkedIn || 0,
        pending: s.pending !== undefined ? s.pending : (s.total || 0) - (s.checkedIn || 0)
      };
      renderStats();
      if (announce) showToast('Counts refreshed.', 'success');
    } catch (err) { if (announce) showToast('Could not refresh counts.', 'error'); }
  }

  function bumpCheckedInCount() {
    stats.checkedIn += 1;
    stats.pending = Math.max(0, stats.total - stats.checkedIn);
    renderStats();
  }

  function renderStats() {
    statTotal.textContent = stats.total;
    statCheckedIn.textContent = stats.checkedIn;
    statPending.textContent = stats.pending;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();