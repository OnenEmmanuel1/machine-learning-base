/**
 * ML-SPMS Chart.js Dark-Theme Dashboard Visualizations — Tensra Aesthetic
 * Department of Computer Science, University of Calabar
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global Chart.js Dark-Theme Defaults
  if (window.Chart) {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1e2433';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.bodyColor = '#e2e8f0';
    Chart.defaults.plugins.tooltip.borderColor = '#2c3244';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 4;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.padding = 14;
  }

  // ==========================================
  // SCREEN A: Cohort Risk Distribution Bar Chart (Tensra Style)
  // ==========================================
  const riskBarCanvas = document.getElementById('tensraRiskBarChart');
  if (riskBarCanvas) {
    const low = parseInt(riskBarCanvas.dataset.low, 10) || 0;
    const mod = parseInt(riskBarCanvas.dataset.mod, 10) || 0;
    const high = parseInt(riskBarCanvas.dataset.high, 10) || 0;

    new Chart(riskBarCanvas, {
      type: 'bar',
      data: {
        labels: ['Low Risk (Safe)', 'Moderate Risk', 'High Risk'],
        datasets: [{
          label: 'Students in Cohort',
          data: [low, mod, high],
          backgroundColor: '#38bdf8', // Solid Flat Cyan
          hoverBackgroundColor: '#7dd3fc',
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.55
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { weight: '600' } }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#64748b'
            },
            grid: {
              color: '#1e2433',
              drawBorder: false
            }
          }
        }
      }
    });
  }

  // ==========================================
  // SCREEN A: Risk & Performance Trajectory Line Chart (Tensra Style)
  // ==========================================
  const lineCanvas = document.getElementById('tensraTrajectoryLineChart');
  if (lineCanvas) {
    let timeline = [];
    try {
      timeline = JSON.parse(lineCanvas.dataset.timeline || '[]');
    } catch (e) {
      timeline = [];
    }

    let labels = timeline.map(t => {
      const d = new Date(t.eval_date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    let dataPoints = timeline.map(t => parseFloat(t.avg_health_score));

    // Fallback if single date
    if (labels.length <= 1) {
      labels = ['Week 1', 'Week 3', 'Week 6', 'Week 9', 'Week 12', 'Current Week'];
      dataPoints = [65, 70, 72, 78, 80, 84];
    }

    new Chart(lineCanvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cohort Academic Health Score (%)',
          data: dataPoints,
          borderColor: '#38bdf8', // Solid Cyan Line
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointBackgroundColor: '#0d0f14',
          pointBorderColor: '#38bdf8',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#38bdf8',
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: '#161a24' },
            ticks: { color: '#94a3b8' }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              color: '#64748b',
              callback: value => value + '%'
            },
            grid: {
              color: '#1e2433',
              drawBorder: false
            }
          }
        }
      }
    });
  }

  // ==========================================
  // SCREEN B: Feature Importance Bar Chart (Tensra Style)
  // ==========================================
  const featCanvas = document.getElementById('tensraFeatureImportanceChart');
  if (featCanvas) {
    let features = [];
    try {
      features = JSON.parse(featCanvas.dataset.features || '[]');
    } catch (e) {
      features = [];
    }

    const labels = features.map(f => f.name);
    const dataWeights = features.map(f => f.weight);

    new Chart(featCanvas, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Continuous Assessment', 'Class Attendance', 'Assignment Submissions'],
        datasets: [{
          label: 'Attribution Weight (%)',
          data: dataWeights.length ? dataWeights : [40, 35, 25],
          backgroundColor: '#38bdf8',
          hoverBackgroundColor: '#7dd3fc',
          borderRadius: 4,
          barPercentage: 0.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { weight: '600' } }
          },
          y: {
            beginAtZero: true,
            max: 50,
            ticks: {
              stepSize: 10,
              color: '#64748b',
              callback: v => v + '%'
            },
            grid: {
              color: '#1e2433',
              drawBorder: false
            }
          }
        }
      }
    });
  }

  // ==========================================
  // SCREEN B: Algorithm Comparison Chart
  // ==========================================
  const modelCompCanvas = document.getElementById('adminModelComparisonChart');
  if (modelCompCanvas) {
    const dtAcc = parseFloat(modelCompCanvas.dataset.dtAcc) || 0;
    const rfAcc = parseFloat(modelCompCanvas.dataset.rfAcc) || 0;
    const lrAcc = parseFloat(modelCompCanvas.dataset.lrAcc) || 0;

    const dtF1 = parseFloat(modelCompCanvas.dataset.dtF1) || 0;
    const rfF1 = parseFloat(modelCompCanvas.dataset.rfF1) || 0;
    const lrF1 = parseFloat(modelCompCanvas.dataset.lrF1) || 0;

    new Chart(modelCompCanvas, {
      type: 'bar',
      data: {
        labels: ['CART Decision Tree', 'Random Forest', 'Logistic Regression'],
        datasets: [
          {
            label: 'Test Accuracy (%)',
            data: [dtAcc, rfAcc, lrAcc],
            backgroundColor: '#38bdf8', // Solid Cyan
            borderRadius: 4,
            barPercentage: 0.6
          },
          {
            label: 'Macro F1 (%)',
            data: [dtF1, rfF1, lrF1],
            backgroundColor: '#0284c7', // Solid Sky Blue
            borderRadius: 4,
            barPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#e2e8f0' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
              color: '#64748b',
              callback: v => v + '%'
            },
            grid: {
              color: '#1e2433',
              drawBorder: false
            }
          }
        }
      }
    });
  }

  // ==========================================
  // Student Detail & Portal Performance Radar Chart
  // ==========================================
  const radarCanvas = document.getElementById('studentFeatureRadarChart') || document.getElementById('studentPerformanceRadar');
  if (radarCanvas) {
    const studentCa = parseFloat(radarCanvas.dataset.ca) || 0;
    const studentAtt = parseFloat(radarCanvas.dataset.att) || 0;
    const studentSub = parseFloat(radarCanvas.dataset.sub) || 0;

    new Chart(radarCanvas, {
      type: 'radar',
      data: {
        labels: [
          'Continuous Assessment (CA)',
          'Class & Lab Attendance',
          'Assignment Submissions'
        ],
        datasets: [
          {
            label: 'Student Observed Level',
            data: [studentCa, studentAtt, studentSub],
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.25)',
            borderWidth: 2,
            pointBackgroundColor: '#38bdf8',
            pointRadius: 4
          },
          {
            label: 'UNICAL Passing Benchmark',
            data: [50, 75, 70],
            borderColor: '#f87171',
            borderDash: [4, 4],
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointBackgroundColor: '#f87171',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              display: false
            },
            grid: {
              color: '#222634'
            },
            angleLines: {
              color: '#222634'
            },
            pointLabels: {
              color: '#e2e8f0',
              font: { size: 11, weight: '600' }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  // ==========================================
  // Client-Side Table Filtering & Search
  // ==========================================
  const searchInput = document.getElementById('tableSearchInput');
  const riskFilter = document.getElementById('riskLevelFilter');
  const table = document.querySelector('.mlspms-searchable-table tbody');

  function filterTable() {
    if (!table) return;
    const query = (searchInput ? searchInput.value : '').toLowerCase();
    const risk = riskFilter ? riskFilter.value : 'all';

    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const rowRisk = row.dataset.risk || 'none';

      const matchesSearch = text.includes(query);
      const matchesRisk = risk === 'all' || rowRisk === risk;

      if (matchesSearch && matchesRisk) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterTable);
  if (riskFilter) riskFilter.addEventListener('change', filterTable);
});
