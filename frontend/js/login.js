/**
 * login.js — Password gate + first-time setup.
 */

(function () {
  'use strict';

  const me = document.currentScript;
  const TARGET  = me.dataset.target  || 'index.html';
  const SESSION = me.dataset.session || 'eventreg_session';

  const card = document.getElementById('gateCard');
  if (!card) return;

  if (sessionStorage.getItem(SESSION) === '1') {
    window.location.replace(TARGET);
    return;
  }

  const BRAND_HTML = ''
    + '<a class="brand brand--center" href="index.html">'
    +   '<span class="brand__mark">ER</span>'
    +   '<span>EventReg</span>'
    + '</a>';

  const ICON_HTML = ''
    + '<div class="gate__icon" aria-hidden="true">'
    +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
    +   'stroke-linecap="round" stroke-linejoin="round">'
    +     '<rect x="3" y="11" width="18" height="11" rx="2"></rect>'
    +     '<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>'
    +   '</svg>'
    + '</div>';

  boot();

  async function boot() {
    card.innerHTML = BRAND_HTML + ICON_HTML
      + '<p class="gate__text" style="text-align:center;">Connecting…</p>';

    let configured = true;

    try {
      const res = await apiCall('setupStatus', {}, 'GET');
      if (res && res.success && res.data) {
        configured = res.data.passwordConfigured === true;
      }
    } catch (err) {
      // Can't reach server — fall through to login form (it will show its own error).
    }

    if (!configured) renderSetupForm();
    else renderLoginForm();
  }

  /* ------------------------------------------------------------------ */

  function renderLoginForm() {
    card.innerHTML = BRAND_HTML + ICON_HTML
      + '<h1 class="gate__title">Admin login</h1>'
      + '<p class="gate__text">Enter the admin password to continue.</p>'
      + '<form id="loginForm" novalidate>'
      +   '<div class="field">'
      +     '<label for="password">Admin password</label>'
      +     '<input type="password" id="password" autocomplete="current-password" '
      +     'placeholder="••••••••" required />'
      +   '</div>'
      +   '<div class="form__alert" id="loginAlert" hidden></div>'
      +   '<button type="submit" class="btn btn--primary btn--block" id="loginBtn">Sign in</button>'
      + '</form>'
      + '<p class="gate__footnote">Restricted area.</p>';

    const form  = document.getElementById('loginForm');
    const input = document.getElementById('password');
    const btn   = document.getElementById('loginBtn');
    const alert = document.getElementById('loginAlert');

    setTimeout(function () { input.focus(); }, 50);

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      alert.hidden = true;

      const password = input.value;
      if (!password) return;

      setButtonLoading(btn, true, 'Verifying…');

      try {
        const res = await apiCall('verifyAdmin', { password: password }, 'POST');

        if (!res || !res.success) {
          alert.textContent = (res && res.message) || 'Incorrect password.';
          alert.hidden = false;
          input.value = '';
          input.focus();
          return;
        }

        sessionStorage.setItem(SESSION, '1');
        window.location.replace(TARGET);
      } catch (err) {
        alert.textContent = err.message || 'Could not reach server.';
        alert.hidden = false;
      } finally {
        setButtonLoading(btn, false);
      }
    });
  }

  /* ------------------------------------------------------------------ */

  function renderSetupForm() {
    card.innerHTML = BRAND_HTML + ICON_HTML
      + '<h1 class="gate__title">Set admin password</h1>'
      + '<p class="gate__text">First-time setup. Choose a password of at least 6 characters. '
      + 'This same password will be used for both admin and check-in.</p>'
      + '<form id="setupForm" novalidate>'
      +   '<div class="field">'
      +     '<label for="newPassword">New password</label>'
      +     '<input type="password" id="newPassword" autocomplete="new-password" '
      +     'placeholder="At least 6 characters" required />'
      +   '</div>'
      +   '<div class="field">'
      +     '<label for="confirmPassword">Confirm password</label>'
      +     '<input type="password" id="confirmPassword" autocomplete="new-password" '
      +     'placeholder="Type it again" required />'
      +   '</div>'
      +   '<div class="form__alert" id="setupAlert" hidden></div>'
      +   '<button type="submit" class="btn btn--primary btn--block" id="setupBtn">'
      +     'Set password &amp; sign in'
      +   '</button>'
      + '</form>'
      + '<p class="gate__footnote">One-time setup.</p>';

    const form    = document.getElementById('setupForm');
    const newPwd  = document.getElementById('newPassword');
    const confPwd = document.getElementById('confirmPassword');
    const btn     = document.getElementById('setupBtn');
    const alert   = document.getElementById('setupAlert');

    setTimeout(function () { newPwd.focus(); }, 50);

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      alert.hidden = true;

      const p1 = newPwd.value;
      const p2 = confPwd.value;

      if (p1.length < 6) {
        alert.textContent = 'Password must be at least 6 characters.';
        alert.hidden = false;
        newPwd.focus();
        return;
      }
      if (p1 !== p2) {
        alert.textContent = 'Passwords do not match.';
        alert.hidden = false;
        confPwd.value = '';
        confPwd.focus();
        return;
      }

      setButtonLoading(btn, true, 'Setting…');

      try {
        const res = await apiCall('setupPassword', { password: p1, confirmPassword: p2 }, 'POST');

        if (!res || !res.success) {
          alert.textContent = (res && res.message) || 'Could not set password.';
          alert.hidden = false;
          return;
        }

        showToast('Password set. Signing you in…', 'success');
        sessionStorage.setItem(SESSION, '1');
        setTimeout(function () { window.location.replace(TARGET); }, 700);
      } catch (err) {
        alert.textContent = err.message || 'Could not reach server.';
        alert.hidden = false;
      } finally {
        setButtonLoading(btn, false);
      }
    });
  }
})();