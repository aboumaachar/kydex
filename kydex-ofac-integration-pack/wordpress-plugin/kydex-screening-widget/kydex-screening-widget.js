(function () {
  const labels = {
    clear: 'No material match found',
    weak_possible_match: 'Possible match — review suggested',
    review_required: 'Possible match — review required',
    strong_potential_match: 'Strong potential match — manual verification required',
  };

  function getField(widget, name) {
    return widget.querySelector(`[data-kydex-field="${name}"]`)?.value?.trim() || '';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderResult(container, payload) {
    const rows = (payload.matches || [])
      .map((match) => `
        <tr>
          <td>${escapeHtml(match.primaryName || match.matchedName || '')}</td>
          <td>${escapeHtml(match.listName || 'OFAC')}</td>
          <td>${escapeHtml((match.programs || []).join(', ') || '—')}</td>
          <td>${escapeHtml(match.score)}</td>
          <td>${escapeHtml(labels[match.riskLevel] || match.riskLevel)}</td>
        </tr>
      `)
      .join('');

    container.hidden = false;
    container.innerHTML = `
      <div class="kydex-widget__status">
        <strong>${escapeHtml(labels[payload.status] || payload.status)}</strong>
        <span>Highest score: ${escapeHtml(payload.highestScore || 0)}</span>
        <small>Audit: ${escapeHtml(payload.auditId || '')}</small>
      </div>
      ${
        rows
          ? `<table class="kydex-widget__table">
              <thead>
                <tr><th>Matched name</th><th>List</th><th>Program</th><th>Score</th><th>Status</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`
          : ''
      }
      <p>${escapeHtml(payload.disclaimer || '')}</p>
    `;
  }

  async function submit(widget) {
    const endpoint = widget.dataset.kydexEndpoint;
    const apiKey = widget.dataset.kydexApiKey;
    const result = widget.querySelector('[data-kydex-result]');
    const button = widget.querySelector('[data-kydex-action="submit"]');

    const query = getField(widget, 'query');
    if (!query) {
      result.hidden = false;
      result.innerHTML = '<div class="kydex-widget__error">Please enter a full name.</div>';
      return;
    }

    button.disabled = true;
    button.textContent = 'Screening…';
    result.hidden = true;
    result.innerHTML = '';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-kydex-notary-key': apiKey,
        },
        body: JSON.stringify({
          query,
          dateOfBirth: getField(widget, 'dateOfBirth') || undefined,
          nationality: getField(widget, 'nationality') || undefined,
          clientReference: getField(widget, 'clientReference') || undefined,
          source: 'notary_webpage',
          screeningType: 'ofac',
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'Screening request failed.');
      }

      renderResult(result, payload);
    } catch (error) {
      result.hidden = false;
      result.innerHTML = `<div class="kydex-widget__error">${escapeHtml(error.message)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = 'Run KYDEX screening';
    }
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-kydex-action="submit"]');
    if (!button) return;

    const widget = button.closest('.kydex-widget');
    if (widget) submit(widget);
  });
})();
