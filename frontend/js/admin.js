/**
 * admin.js — Dashboard: table render, search/filter, detail modal, check-in, export.
 */

(function () {
  'use strict';

  const SESSION_KEY = 'eventreg_admin_session';
  const LOGIN_PAGE = 'admin-login.html';

  if (sessionStorage.getItem(SESSION_KEY) !== '1') {
    window.location.replace(LOGIN_PAGE);
    return;
  }

  /* ---------- DOM ---------- */
  const logoutBtn = document.getElementById('logoutBtn');
  const statTotal = document.getElementById('statTotal');
  const statCheckedIn = document.getElementById('statCheckedIn');
  const statPending = document.getElementById('statPending');
  const statRate = document.getElementById('statRate');
  const searchInput = document.getElementById('searchInput');
  const tableBody = document.getElementById('tableBody');
  const tableWrap = document.getElementById('tableWrap');
  const tableEmpty = document.getElementById('tableEmpty');
  const tableEmptyText = document.getElementById('tableEmptyText');
  const tableSkeleton = document.getElementById('tableSkeleton');
  const refreshBtn = document.getElementById('refreshBtn');
  const exportBtn = document.getElementById('exportBtn');
  const dashSubtitle = document.getElementById('dashSubtitle');

  const modal = document.getElementById('detailModal');
  const modalContent = document.getElementById('modalContent');

  /* ---------- State ---------- */
  let allRegistrations = [];
  let currentFilter = 'all';
  let currentQuery = '';
  let isBusy = false;

  /* ================================================================== *
   * Boot
   * ================================================================== */

  function init() {
    loadEventInfo();
    bindEvents();
    loadData(false);
  }

  function bindEvents() {
    logoutBtn.addEventListener('click', function () {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.replace(LOGIN_PAGE);
    });

    refreshBtn.addEventListener('click', function () { loadData(true); });
    exportBtn.addEventListener('click', exportCsv);

    searchInput.addEventListener('input', function (e) {
      currentQuery = e.target.value.trim().toLowerCase();
      renderTable();
    });

    document.querySelectorAll('.chip[data-filter]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.querySelectorAll('.chip[data-filter]').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        currentFilter = chip.dataset.filter;
        renderTable();
      });
    });

    // Row actions (delegate)
    tableBody.addEventListener('click', function (event) {
      const teamBtn = event.target.closest('[data-open-team]');
      if (teamBtn) {
        openDetailModal(teamBtn.dataset.openTeam);
        return;
      }
      const actionBtn = event.target.closest('button[data-regid][data-undo]');
      if (actionBtn) handleRowAction(actionBtn);
    });

    // Modal close
    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-close-modal]')) closeDetailModal();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) closeDetailModal();
    });

    // Action buttons inside the modal
    modalContent.addEventListener('click', function (event) {
      const btn = event.target.closest('button[data-modal-action]');
      if (btn) {
        const regId = btn.dataset.regid;
        const undo = btn.dataset.undo === 'true';
        handleCheckIn(regId, undo, btn, true);
      }
    });
  }

  /* ================================================================== *
   * Data
   * ================================================================== */

  async function loadData(announce) {
    if (isBusy) return;
    isBusy = true;

    showSkeleton(true);
    setButtonLoading(refreshBtn, true, 'Loading…');

    try {
      const res = await apiCall('list', {}, 'GET');
      if (!res || !res.success) throw new Error((res && res.message) || 'Failed to load.');
      const payload = res.data || {};
      allRegistrations = payload.registrations || [];
      renderStats(payload.stats || {});
      renderTable();
      renderSubtitle(payload.event || {});
      if (announce) showToast('Refreshed.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not load data.', 'error');
      allRegistrations = [];
      renderStats({});
      renderTable();
    } finally {
      showSkeleton(false);
      setButtonLoading(refreshBtn, false);
      isBusy = false;
    }
  }

  function renderSubtitle(event) {
    const parts = [];
    if (event.eventName) parts.push(event.eventName);
    if (event.eventDate) parts.push(event.eventDate);
    dashSubtitle.textContent = parts.length ? parts.join(' · ') : 'Live registration & attendance data';
  }

  function renderStats(stats) {
    statTotal.textContent = stats.total !== undefined ? stats.total : '—';
    statCheckedIn.textContent = stats.checkedIn !== undefined ? stats.checkedIn : '—';
    statPending.textContent = stats.pending !== undefined ? stats.pending : '—';
    statRate.textContent = stats.checkinRate !== undefined ? stats.checkinRate + '%' : '—';
  }

  /* ================================================================== *
   * Table
   * ================================================================== */

  function getFilteredRows() {
    let rows = allRegistrations;

    if (currentFilter === 'checked') rows = rows.filter(function (r) { return r.checkedIn === true; });
    else if (currentFilter === 'pending') rows = rows.filter(function (r) { return r.checkedIn !== true; });

    if (currentQuery) {
      const q = currentQuery;
      rows = rows.filter(function (r) {
        return [
          r.regId, r.teamName, r.leaderName, r.leaderEmail, r.leaderPhone,
          r.college, r.branch, r.yearOfStudy,
          r.member1Name, r.member1Email, r.member2Name, r.member2Email,
          r.member3Name, r.member3Email
        ].some(function (v) {
          return String(v || '').toLowerCase().indexOf(q) !== -1;
        });
      });
    }

    return rows;
  }

  function renderTable() {
    const rows = getFilteredRows();

    if (!rows.length) {
      tableBody.innerHTML = '';
      tableWrap.hidden = true;
      tableEmpty.hidden = false;
      tableEmptyText.textContent = allRegistrations.length === 0
        ? 'No team registrations yet.'
        : 'No results match your search.';
      return;
    }

    tableEmpty.hidden = true;
    tableWrap.hidden = false;
    tableBody.innerHTML = rows.map(renderRow).join('');
  }

  function renderRow(r) {
    const checked = r.checkedIn === true;

    const statusBadge = checked
      ? '<span class="badge badge--success">Checked in</span>'
      : '<span class="badge badge--muted">Pending</span>';

    const actionLabel = checked ? 'Undo' : 'Check in';
    const actionClass = checked ? 'btn--secondary' : 'btn--primary';

    const teamName = r.teamName || '—';
    const memberCount = [r.member1Name, r.member2Name, r.member3Name].filter(Boolean).length;

    return '<tr>'
      + '<td>' + escapeHtml(r.regId) + '</td>'
      + '<td><button type="button" class="team-link" data-open-team="' + escapeHtml(r.regId) + '">'
      + escapeHtml(teamName) + '</button></td>'
      + '<td class="cell-name">' + escapeHtml(r.leaderName || '—') + '</td>'
      + '<td>' + escapeHtml(r.leaderEmail || '—') + '</td>'
      + '<td>' + escapeHtml(r.college || '—') + '</td>'
      + '<td>' + escapeHtml(r.yearOfStudy || '—') + '</td>'
      + '<td><span class="members-count"><strong>' + memberCount + '</strong> + leader</span></td>'
      + '<td>' + statusBadge + '</td>'
      + '<td class="td-actions"><button type="button" class="btn btn--sm ' + actionClass + '" '
      + 'data-regid="' + escapeHtml(r.regId) + '" data-undo="' + (checked ? 'true' : 'false') + '">'
      + actionLabel + '</button></td>'
      + '</tr>';
  }

  function showSkeleton(show) {
    tableSkeleton.hidden = !show;
    if (show) { tableWrap.hidden = true; tableEmpty.hidden = true; }
  }

  /* ================================================================== *
   * Detail modal
   * ================================================================== */

  function openDetailModal(regId) {
    const row = allRegistrations.find(function (r) { return r.regId === regId; });
    if (!row) { showToast('Team not found.', 'error'); return; }

    modalContent.innerHTML = renderModalContent(row);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function renderModalContent(r) {
    const checked = r.checkedIn === true;

    const statusBadge = checked
      ? '<span class="badge badge--success">Checked in</span>'
      : '<span class="badge badge--muted">Pending</span>';

    /* Header */
    const header = ''
      + '<div class="modal-head">'
      + '<h2 class="modal-head__team" id="modalTitle">' + escapeHtml(r.teamName || 'Untitled team') + '</h2>'
      + '<div class="modal-head__meta">'
      + '<span class="modal-head__regid">' + escapeHtml(r.regId) + '</span>'
      + statusBadge
      + '</div>'
      + '</div>';

    /* Team leader section */
    const leaderSection = ''
      + '<div class="modal-section">'
      + '<div class="modal-section__title">Team Leader</div>'
      + detailRow('Name', escapeHtml(r.leaderName || '—'))
      + detailRow('Email', mailLink(r.leaderEmail))
      + detailRow('Phone', phoneLink(r.leaderPhone))
      + '</div>';

    /* College section */
    const collegeSection = ''
      + '<div class="modal-section">'
      + '<div class="modal-section__title">College &amp; Study</div>'
      + detailRow('College', escapeHtml(r.college || '—'))
      + detailRow('Year', escapeHtml(r.yearOfStudy || '—'))
      + detailRow('Branch', escapeHtml(r.branch || '—'))
      + '</div>';

    /* Members section */
    const members = [1, 2, 3].map(function (i) {
      const name = r['member' + i + 'Name'];
      const email = r['member' + i + 'Email'];
      const phone = r['member' + i + 'Phone'];
      if (!name && !email && !phone) return '';

      return '<div class="member-block">'
        + '<div class="member-block__name">' + escapeHtml(name || 'Member ' + i) + '</div>'
        + '<div class="member-block__contact">'
        + (email ? '<a href="mailto:' + escapeHtml(email) + '">' + escapeHtml(email) + '</a>' : '')
        + (phone ? '<a href="tel:' + escapeHtml(phone) + '">' + escapeHtml(phone) + '</a>' : '')
        + '</div>'
        + '</div>';
    }).filter(Boolean).join('');

    const membersSection = members
      ? '<div class="modal-section"><div class="modal-section__title">Team Members</div>' + members + '</div>'
      : '';

    /* Payment section — FIXED */
    const paymentValue = r.paymentScreenshotUrl
      ? '<a href="' + escapeHtml(r.paymentScreenshotUrl) + '" target="_blank" rel="noopener">View payment screenshot ↗</a>'
      : '<span style="color:#71717a;">Not uploaded</span>';

    const paymentSection = ''
      + '<div class="modal-section">'
      + '<div class="modal-section__title">Payment</div>'
      + detailRow('Screenshot', paymentValue)
      + '</div>';

    /* Timestamps */
    const timeSection = ''
      + '<div class="modal-section">'
      + '<div class="modal-section__title">Registration</div>'
      + detailRow('Registered', escapeHtml(formatDateTime(r.registeredAt)))
      + detailRow('Checked in', checked ? escapeHtml(formatDateTime(r.checkinTime)) : '<span style="color:#71717a;">Not yet</span>')
      + detailRow('Email sent', r.emailSent ? '✓ Yes' : '<span style="color:#71717a;">No</span>')
      + '</div>';

    /* Footer actions */
    const actionLabel = checked ? 'Undo check-in' : 'Mark as checked in';
    const actionClass = checked ? 'btn--secondary' : 'btn--primary';

    const footer = ''
      + '<div class="modal-foot">'
      + '<button type="button" class="btn ' + actionClass + '" '
      + 'data-modal-action="checkin" '
      + 'data-regid="' + escapeHtml(r.regId) + '" '
      + 'data-undo="' + (checked ? 'true' : 'false') + '">'
      + actionLabel
      + '</button>'
      + '<button type="button" class="btn btn--ghost" data-close-modal>Close</button>'
      + '</div>';

    return header
      + '<div class="modal-body">'
      + leaderSection
      + collegeSection
      + membersSection
      + paymentSection
      + timeSection
      + '</div>'
      + footer;
  }

  function detailRow(label, valueHtml) {
    return '<div class="detail-row">'
      + '<div class="detail-row__label">' + escapeHtml(label) + '</div>'
      + '<div class="detail-row__value">' + valueHtml + '</div>'
      + '</div>';
  }

  function mailLink(email) {
    if (!email) return '—';
    return '<a href="mailto:' + escapeHtml(email) + '">' + escapeHtml(email) + '</a>';
  }

  function phoneLink(phone) {
    if (!phone) return '—';
    return '<a href="tel:' + escapeHtml(phone) + '">' + escapeHtml(phone) + '</a>';
  }

  /* ================================================================== *
   * Check-in / undo
   * ================================================================== */

  function handleRowAction(btn) {
    handleCheckIn(btn.dataset.regid, btn.dataset.undo === 'true', btn, false);
  }

  async function handleCheckIn(regId, undo, btn, fromModal) {
    if (isBusy) return;

    setButtonLoading(btn, true, undo ? 'Undoing…' : 'Checking in…');

    try {
      const res = await apiCall('checkin', { regId: regId, undo: undo }, 'POST');
      if (!res || !res.success) {
        showToast((res && res.message) || 'Action failed.', 'error');
        return;
      }

      const data = res.data || {};
      const row = allRegistrations.find(function (r) { return r.regId === regId; });
      if (row) {
        row.checkedIn = data.checkedIn === true;
        row.checkinTime = data.checkinTime || '';
      }

      renderStats(computeStats());
      renderTable();

      // If the modal is open for this team, re-render it
      if (fromModal && !modal.hidden && row) {
        modalContent.innerHTML = renderModalContent(row);
      }

      showToast(res.message || 'Updated.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not update.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function computeStats() {
    let checkedIn = 0;
    allRegistrations.forEach(function (r) { if (r.checkedIn === true) checkedIn++; });
    const total = allRegistrations.length;
    return {
      total: total,
      checkedIn: checkedIn,
      pending: total - checkedIn,
      checkinRate: total > 0 ? Math.round((checkedIn / total) * 1000) / 10 : 0
    };
  }

  /* ================================================================== *
   * CSV export
   * ================================================================== */

  function exportCsv() {
    const rows = getFilteredRows();
    if (!rows.length) { showToast('Nothing to export.', 'error'); return; }

    const headers = [
      'regId', 'teamName',
      'leaderName', 'leaderEmail', 'leaderPhone',
      'college', 'yearOfStudy', 'branch',
      'member1Name', 'member1Email', 'member1Phone',
      'member2Name', 'member2Email', 'member2Phone',
      'member3Name', 'member3Email', 'member3Phone',
      'paymentScreenshotUrl',
      'registeredAt', 'checkedIn', 'checkinTime', 'emailSent'
    ];

    const lines = [headers.join(',')];
    rows.forEach(function (r) {
      const cells = headers.map(function (h) {
        let v = r[h];
        if (v === true) v = 'TRUE';
        else if (v === false) v = 'FALSE';
        else if (v === undefined || v === null) v = '';
        return csvCell(String(v));
      });
      lines.push(cells.join(','));
    });

    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'eventreg-teams-' + stamp + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Exported ' + rows.length + ' teams.', 'success');
  }

  function csvCell(value) {
    if (/[",\r\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
    return value;
  }

  /* ================================================================== */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();