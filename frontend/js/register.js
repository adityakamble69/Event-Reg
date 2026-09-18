(function () {
  'use strict';

  const form         = document.getElementById('registerForm');
  const formCard     = document.getElementById('formCard');
  const successCard  = document.getElementById('successCard');
  const submitBtn    = document.getElementById('submitBtn');
  const formAlert    = document.getElementById('formAlert');
  const heroMeta     = document.getElementById('heroMeta');
  const successQr    = document.getElementById('successQr');
  const successRegId = document.getElementById('successRegId');
  const successTeam  = document.getElementById('successTeamName');
  const emailNote    = document.getElementById('emailNote');
  const registerAgain = document.getElementById('registerAnotherBtn');
  const paymentQr    = document.getElementById('paymentQr');
  const upiText      = document.getElementById('upiText');
  const upiCopyBtn   = document.getElementById('upiCopyBtn');
  const fileInput    = document.getElementById('paymentScreenshot');
  const fileDrop     = document.getElementById('fileDrop');
  const fileDropText = document.getElementById('fileDropText');
  const filePreview  = document.getElementById('filePreview');

  const QR_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/';

  /* Fields to validate: id → kind */
  const FIELDS = [
    { id: 'leaderName',    kind: 'name'  },
    { id: 'leaderEmail',   kind: 'email' },
    { id: 'leaderPhone',   kind: 'phone' },
    { id: 'teamName',      kind: 'text'  },
    { id: 'college',       kind: 'text'  },
    { id: 'yearOfStudy',   kind: 'select'},
    { id: 'branch',        kind: 'text'  },
    { id: 'member1Name',   kind: 'name'  },
    { id: 'member1Email',  kind: 'email' },
    { id: 'member1Phone',  kind: 'phone' },
    { id: 'member2Name',   kind: 'name'  },
    { id: 'member2Email',  kind: 'email' },
    { id: 'member2Phone',  kind: 'phone' },
    { id: 'member3Name',   kind: 'name'  },
    { id: 'member3Email',  kind: 'email' },
    { id: 'member3Phone',  kind: 'phone' }
  ];

  let screenshotFile = null;      // { base64, mime, name }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ================================================================== *
   * Boot
   * ================================================================== */

  function init() {
    setupPaymentBox();
    bindEvents();
    loadEventInfo().then(renderHeroMeta);
  }

  function setupPaymentBox() {
    paymentQr.src = CONFIG.PAYMENT_QR_URL || 'assets/payment-qr.png';
    upiText.textContent = CONFIG.PAYMENT_UPI || '—';

    upiCopyBtn.addEventListener('click', function () {
      const text = CONFIG.PAYMENT_UPI || '';
      if (!text || text === '—') return;
      navigator.clipboard.writeText(text).then(function () {
        showToast('UPI ID copied.', 'success');
      }).catch(function () {
        showToast('UPI: ' + text, 'info');
      });
    });
  }

  function renderHeroMeta(event) {
    if (!event || !heroMeta) return;
    const items = [];
    if (event.eventDate)   items.push(event.eventDate);
    if (event.eventVenue)  items.push(event.eventVenue);
    if (event.maxCapacity) items.push('Limited to ' + event.maxCapacity + ' teams');
    if (!items.length) return;
    heroMeta.innerHTML = items.map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('');
    heroMeta.hidden = false;
  }

  function bindEvents() {
    form.addEventListener('submit', handleSubmit);

    FIELDS.forEach(function (f) {
      const el = document.getElementById(f.id);
      if (!el) return;
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, function () { clearFieldError(f.id); hideAlert(); });
    });

    fileInput.addEventListener('change', handleFileSelect);
    registerAgain.addEventListener('click', resetToForm);
  }

  /* ================================================================== *
   * Validation
   * ================================================================== */

  function validateKind(kind, value, label) {
    const v = String(value || '').trim();
    switch (kind) {
      case 'name':
        if (!v) return 'Please enter ' + label + '.';
        if (v.length < 2) return 'Name looks too short.';
        return null;
      case 'email':
        if (!v) return 'Please enter an email address.';
        if (!EMAIL_RE.test(v)) return 'Enter a valid email address.';
        return null;
      case 'phone': {
        if (!v) return 'Please enter a phone number.';
        const d = v.replace(/\D/g, '');
        if (d.length < 10 || d.length > 15) return 'Phone must be 10–15 digits.';
        return null;
      }
      case 'select':
        if (!v) return 'Please select an option.';
        return null;
      case 'text':
        if (!v) return 'This field is required.';
        return null;
      default:
        return null;
    }
  }

  function labelFor(id) {
    return id.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); }).toLowerCase();
  }

  function validateForm() {
    let firstInvalid = null;

    FIELDS.forEach(function (f) {
      const el = document.getElementById(f.id);
      const label = labelFor(f.id);
      const error = validateKind(f.kind, el.value, label);
      if (error) {
        showFieldError(f.id, error);
        if (!firstInvalid) firstInvalid = el;
      } else {
        clearFieldError(f.id);
      }
    });

    // Duplicate email/phone within team
    const emails = FIELDS.filter(function (f) { return f.kind === 'email'; })
      .map(function (f) { return String(document.getElementById(f.id).value || '').trim().toLowerCase(); })
      .filter(Boolean);
    const phones = FIELDS.filter(function (f) { return f.kind === 'phone'; })
      .map(function (f) { return String(document.getElementById(f.id).value || '').replace(/\D/g, ''); })
      .filter(Boolean);

    if (new Set(emails).size !== emails.length) {
      showAlert('Each team member must use a different email address.');
      return false;
    }
    if (new Set(phones).size !== phones.length) {
      showAlert('Each team member must use a different phone number.');
      return false;
    }

    // Screenshot
    if (!screenshotFile) {
      showFieldError('paymentScreenshot', 'Please upload a payment screenshot.');
      const drop = document.getElementById('fileDrop');
      if (!firstInvalid) firstInvalid = drop;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  function showFieldError(id, message) {
    const el = document.getElementById(id);
    const errorEl = document.querySelector('[data-error-for="' + id + '"]');
    if (el) el.setAttribute('aria-invalid', 'true');
    if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
  }

  function clearFieldError(id) {
    const el = document.getElementById(id);
    const errorEl = document.querySelector('[data-error-for="' + id + '"]');
    if (el) el.removeAttribute('aria-invalid');
    if (errorEl) { errorEl.textContent = ''; errorEl.hidden = true; }
  }

  function showAlert(message) { formAlert.textContent = message; formAlert.hidden = false; }
  function hideAlert() { formAlert.hidden = true; formAlert.textContent = ''; }

  /* ================================================================== *
   * File selection
   * ================================================================== */

  function handleFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    clearFieldError('paymentScreenshot');

    if (CONFIG.ALLOWED_IMAGE_TYPES.indexOf(file.type) === -1) {
      showFieldError('paymentScreenshot', 'Please upload a JPG, PNG, or WEBP image.');
      resetFileInput();
      return;
    }
    if (file.size > CONFIG.MAX_SCREENSHOT_BYTES) {
      showFieldError('paymentScreenshot', 'File is too big. Max ' + Math.round(CONFIG.MAX_SCREENSHOT_BYTES / 1024 / 1024) + ' MB.');
      resetFileInput();
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      const result = reader.result;
      const comma = result.indexOf(',');
      const base64 = result.slice(comma + 1);

      screenshotFile = { base64: base64, mime: file.type, name: file.name };

      filePreview.src = result;
      filePreview.hidden = false;
      fileDrop.classList.add('has-file');
      fileDropText.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
    };
    reader.onerror = function () {
      showFieldError('paymentScreenshot', 'Could not read the file. Try again.');
    };
    reader.readAsDataURL(file);
  }

  function resetFileInput() {
    screenshotFile = null;
    fileInput.value = '';
    filePreview.src = '';
    filePreview.hidden = true;
    fileDrop.classList.remove('has-file');
    fileDropText.textContent = 'Tap to upload screenshot (JPG/PNG, max 3 MB)';
  }

  /* ================================================================== *
   * Submit
   * ================================================================== */

  async function handleSubmit(event) {
    event.preventDefault();
    hideAlert();

    if (!validateForm()) return;

    const get = function (id) { return document.getElementById(id).value.trim(); };

    const payload = {
      leaderName:   get('leaderName'),
      leaderEmail:  get('leaderEmail'),
      leaderPhone:  get('leaderPhone'),
      teamName:     get('teamName'),
      college:      get('college'),
      yearOfStudy:  get('yearOfStudy'),
      branch:       get('branch'),
      member1Name:  get('member1Name'),
      member1Email: get('member1Email'),
      member1Phone: get('member1Phone'),
      member2Name:  get('member2Name'),
      member2Email: get('member2Email'),
      member2Phone: get('member2Phone'),
      member3Name:  get('member3Name'),
      member3Email: get('member3Email'),
      member3Phone: get('member3Phone'),
      paymentScreenshotBase64: screenshotFile.base64,
      paymentScreenshotMime:   screenshotFile.mime,
      paymentScreenshotName:   screenshotFile.name
    };

    setButtonLoading(submitBtn, true, 'Uploading & registering…');

    try {
      const res = await apiCall('register', payload, 'POST');
      if (!res || !res.success) {
        showAlert((res && res.message) || 'Registration failed. Try again.');
        return;
      }
      showSuccess(res.data);
    } catch (err) {
      showAlert(err.message || 'Network error. Try a smaller screenshot.');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  function showSuccess(data) {
    successRegId.textContent = data.regId;
    successTeam.textContent = data.teamName || '';
    successQr.src = QR_ENDPOINT + '?size=400x400&margin=10&data=' + encodeURIComponent(data.regId);

    emailNote.textContent = data.emailSent
      ? 'Confirmation email sent to ' + data.leaderEmail + '. Check spam folder if not visible.'
      : 'Could not send email — please screenshot this QR code.';

    formCard.hidden = true;
    successCard.hidden = false;
    successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Team registered — ' + data.regId, 'success');
  }

  function resetToForm() {
    form.reset();
    FIELDS.forEach(function (f) { clearFieldError(f.id); });
    clearFieldError('paymentScreenshot');
    hideAlert();
    resetFileInput();

    successCard.hidden = true;
    formCard.hidden = false;
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('leaderName').focus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();