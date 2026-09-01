/**
 * ML-SPMS General Client Interactivity & Table Filtering
 */

document.addEventListener('DOMContentLoaded', () => {
  // Table Search / Filter
  const searchInput = document.getElementById('tableSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('.mlspms-searchable-table tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
      });
    });
  }

  // Risk Level Filter Dropdown
  const riskFilter = document.getElementById('riskLevelFilter');
  if (riskFilter) {
    riskFilter.addEventListener('change', (e) => {
      const selected = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('.mlspms-searchable-table tbody tr');
      rows.forEach(row => {
        const rowRisk = row.getAttribute('data-risk') || '';
        if (!selected || selected === 'all' || rowRisk === selected) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // Score Input Max Validator / Dynamic Helper
  const scoreInput = document.getElementById('scoreInput');
  const typeSelect = document.getElementById('assessmentTypeSelect');
  const maxHelper = document.getElementById('maxScoreHelper');

  function updateMaxScore() {
    if (!typeSelect || !scoreInput) return;
    const type = typeSelect.value;
    if (type === 'test') {
      scoreInput.max = '30';
      if (maxHelper) maxHelper.textContent = 'Maximum mark: 30';
    } else if (type === 'assignment') {
      scoreInput.max = '20';
      if (maxHelper) maxHelper.textContent = 'Maximum mark: 20';
    } else if (type === 'examination') {
      scoreInput.max = '70';
      if (maxHelper) maxHelper.textContent = 'Maximum mark: 70';
    }
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', updateMaxScore);
    updateMaxScore();
  }
});
