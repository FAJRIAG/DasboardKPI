// app.js

let rawData = [];
let charts = {};

// Parse simple CSV (assuming no commas inside values)
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, index) => {
        let val = values[index];
        if (['tahun', 'jumlah_bayi', 'jumlah_bayi_diimunisasi', 'cakupan', 'gap'].includes(h)) {
          val = parseFloat(val);
        }
        row[h] = val;
      });
      data.push(row);
    }
  }
  return data;
}

// Format numbers
function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num));
}

// Navigation
function switchPage(pageId) {
  document.querySelectorAll('.view-container').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');
  document.getElementById(`nav-${pageId}`).classList.add('active');
  
  const titles = {
    'overview': 'Ikhtisar (Overview)',
    'tren': 'Tren Capaian',
    'puskesmas': 'Kinerja Puskesmas',
    'gender': 'Demografi Gender',
    'detail': 'Tabel Data Induk'
  };
  document.getElementById('pageTitle').innerText = titles[pageId] || 'Dashboard';
  
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if(overlay) overlay.classList.remove('show');
  }
  
  // Resize charts to fix display issues when switching tabs
  Object.values(charts).forEach(chart => {
    if (chart) chart.resize();
  });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  const overlay = document.getElementById('sidebarOverlay');
  if(overlay) overlay.classList.toggle('show');
}

// Initialize date
const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('currentDate').innerText = new Date().toLocaleDateString('id-ID', dateOpts);

// Fetch data and init
async function initDashboard() {
  try {
    const res = await fetch('data_bersih.csv');
    const csv = await res.text();
    rawData = parseCSV(csv);
    
    // Sort data
    rawData.sort((a, b) => b.tahun - a.tahun || a.nama_puskesmas.localeCompare(b.nama_puskesmas));
    
    // Setup Puskesmas Selector on page "Per Puskesmas"
    setupPuskesmasSelector();
    
    // Render initially
    applyFilters();
    
  } catch (err) {
    console.error("Gagal memuat data:", err);
    alert("Gagal memuat data. Pastikan dijalankan di web server lokal (MAMP/XAMPP).");
  }
}

// Filter logic
let currentFilteredData = [];
function applyFilters() {
  const tahunFilter = document.getElementById('filterTahun').value;
  const genderFilter = document.getElementById('filterGender').value;
  
  currentFilteredData = rawData.filter(d => {
    const matchTahun = tahunFilter === 'all' || d.tahun == tahunFilter;
    const matchGender = genderFilter === 'all' || d.jenis_kelamin === genderFilter;
    return matchTahun && matchGender;
  });
  
  renderOverview();
  renderTren();
  renderGender();
  renderDetail();
  
  // Also trigger re-render of puskesmas view based on its own selector
  renderPuskesmasView();
}

function getAggregatedPuskesmas(data) {
  const map = {};
  data.forEach(d => {
    if (!map[d.nama_puskesmas]) {
      map[d.nama_puskesmas] = { puskesmas: d.nama_puskesmas, sasaran: 0, imunisasi: 0, gap: 0 };
    }
    map[d.nama_puskesmas].sasaran += d.jumlah_bayi;
    map[d.nama_puskesmas].imunisasi += d.jumlah_bayi_diimunisasi;
  });
  return Object.values(map).map(p => {
    p.cakupan = p.sasaran ? (p.imunisasi / p.sasaran * 100) : 0;
    p.gap = p.sasaran - p.imunisasi;
    return p;
  }).sort((a, b) => b.cakupan - a.cakupan);
}

// Chart.js Default Configs
Chart.defaults.color = '#64748B'; // text-muted
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
Chart.defaults.borderColor = '#E2E8F0'; // border-light

function createChart(canvasId, type, data, options) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (charts[canvasId]) {
    charts[canvasId].destroy();
  }
  charts[canvasId] = new Chart(ctx, { type, data, options });
}

// OVERVIEW PAGE
function renderOverview() {
  const totalSasaran = currentFilteredData.reduce((s, d) => s + d.jumlah_bayi, 0);
  const totalImunisasi = currentFilteredData.reduce((s, d) => s + d.jumlah_bayi_diimunisasi, 0);
  const rataCakupan = totalSasaran ? (totalImunisasi / totalSasaran * 100) : 0;
  const totalGap = currentFilteredData.reduce((s, d) => s + d.gap, 0); // using raw gap
  
  // Update KPI Cards
  const kpiGrid = document.getElementById('kpiGrid');
  
  let cakupanTrendHtml = '';
  if(rataCakupan >= 90) cakupanTrendHtml = '<span class="trend-indicator trend-up"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg> Optimal</span>';
  else if (rataCakupan >= 75) cakupanTrendHtml = '<span class="trend-indicator trend-neutral"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg> Sedang</span>';
  else cakupanTrendHtml = '<span class="trend-indicator trend-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg> Kritis</span>';

  kpiGrid.innerHTML = `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Total Target Sasaran</span>
        <div class="metric-icon" style="background-color: var(--brand-primary-light); color: var(--brand-primary);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
      </div>
      <div class="metric-value">${formatNumber(totalSasaran)}</div>
      <div class="metric-footer"><span style="color:var(--text-muted)">Individu Bayi Terdata</span></div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Telah Diimunisasi</span>
        <div class="metric-icon" style="background-color: var(--success-bg); color: var(--success-text);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
      </div>
      <div class="metric-value">${formatNumber(totalImunisasi)}</div>
      <div class="metric-footer"><span style="color:var(--text-muted)">Terealisasi Penuh</span></div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Rasio Cakupan</span>
        <div class="metric-icon" style="background-color: var(--info-bg); color: var(--info-text);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
      </div>
      <div class="metric-value">${rataCakupan.toFixed(1)}%</div>
      <div class="metric-footer">${cakupanTrendHtml}</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Total Defisit Target</span>
        <div class="metric-icon" style="background-color: var(--danger-bg); color: var(--danger-text);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
      </div>
      <div class="metric-value">${formatNumber(Math.abs(totalGap))}</div>
      <div class="metric-footer"><span style="color:var(--text-muted)">Individu Belum Terimunisasi</span></div>
    </div>
  `;

  // Trend Chart (All Years for Trend Line, ignoring year filter for this specific chart to show trend)
  const years = [...new Set(rawData.map(d => d.tahun))].sort();
  const genderFilter = document.getElementById('filterGender').value;
  const trendData = years.map(y => {
    const yrData = rawData.filter(d => d.tahun === y && (genderFilter === 'all' || d.jenis_kelamin === genderFilter));
    const s = yrData.reduce((sum, d) => sum + d.jumlah_bayi, 0);
    const i = yrData.reduce((sum, d) => sum + d.jumlah_bayi_diimunisasi, 0);
    return s ? (i/s*100) : 0;
  });

  createChart('trendLineChart', 'line', {
    labels: years,
    datasets: [{
      label: 'Cakupan (%)',
      data: trendData,
      borderColor: '#4F46E5', // brand-primary
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#4F46E5',
      pointBorderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }, {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0F172A', titleFont: {family: "'Plus Jakarta Sans'"}, bodyFont: {family: "'Plus Jakarta Sans'"} } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#E2E8F0', borderDash: [4,4] } },
      x: { grid: { display: false } }
    }
  });

  // Gender Donut
  const laki = currentFilteredData.filter(d => d.jenis_kelamin === 'LAKI-LAKI').reduce((s, d) => s + d.jumlah_bayi_diimunisasi, 0);
  const perempuan = currentFilteredData.filter(d => d.jenis_kelamin === 'PEREMPUAN').reduce((s, d) => s + d.jumlah_bayi_diimunisasi, 0);
  
  createChart('genderDonutChart', 'doughnut', {
    labels: ['Laki-laki', 'Perempuan'],
    datasets: [{
      data: [laki, perempuan],
      backgroundColor: ['#4F46E5', '#0EA5E9'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  }, {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0F172A' } }
  });
  
  document.getElementById('donutLegend').innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center;">
      <div style="display:flex;align-items:center;gap:6px; font-size:0.875rem; color:var(--text-muted);">
        <div style="width:10px;height:10px;border-radius:50%;background:#4F46E5;"></div> Laki-laki
      </div>
      <div style="font-weight:700; color:var(--text-main); margin-top:4px;">${formatNumber(laki)}</div>
    </div>
    <div style="display:flex; flex-direction:column; align-items:center;">
      <div style="display:flex;align-items:center;gap:6px; font-size:0.875rem; color:var(--text-muted);">
        <div style="width:10px;height:10px;border-radius:50%;background:#0EA5E9;"></div> Perempuan
      </div>
      <div style="font-weight:700; color:var(--text-main); margin-top:4px;">${formatNumber(perempuan)}</div>
    </div>
  `;

  // Top 5 Puskesmas
  const puskAgg = getAggregatedPuskesmas(currentFilteredData);
  const top5 = puskAgg.slice(0, 5);
  
  createChart('topPuskesmasChart', 'bar', {
    labels: top5.map(d => d.puskesmas),
    datasets: [{
      label: 'Cakupan (%)',
      data: top5.map(d => d.cakupan),
      backgroundColor: '#10B981', // success
      borderRadius: 4
    }]
  }, {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0F172A' } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#E2E8F0', borderDash: [4,4] } },
      y: { grid: { display: false } }
    }
  });

  // Gap Chart
  const gapData = [...puskAgg].sort((a, b) => b.gap - a.gap).slice(0, 5); // top 5 highest positive gap
  createChart('gapChart', 'bar', {
    labels: gapData.map(d => d.puskesmas),
    datasets: [{
      label: 'Defisit Target (Orang)',
      data: gapData.map(d => d.gap),
      backgroundColor: '#EF4444', // danger
      borderRadius: 4
    }]
  }, {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0F172A' } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#E2E8F0', borderDash: [4,4] } },
      x: { grid: { display: false } }
    }
  });

  renderSummaryTable(puskAgg);
}

function renderSummaryTable(aggData) {
  const tbody = document.getElementById('summaryTableBody');
  tbody.innerHTML = '';
  
  aggData.forEach(d => {
    let statusClass = 'badge-success';
    let statusText = 'Optimal';
    if (d.cakupan < 80) { statusClass = 'badge-danger'; statusText = 'Kritis'; }
    else if (d.cakupan < 95) { statusClass = 'badge-warning'; statusText = 'Dipantau'; }
    else if (d.cakupan > 100) { statusClass = 'badge-info'; statusText = 'Surplus Target'; }

    tbody.innerHTML += `
      <tr>
        <td class="cell-bold">${d.puskesmas}</td>
        <td>${formatNumber(d.sasaran)}</td>
        <td>${formatNumber(d.imunisasi)}</td>
        <td>
          <div class="progress-wrapper">
            <div class="progress-track">
              <div class="progress-fill" style="width: ${Math.min(d.cakupan, 100)}%; background: ${getStatusColor(statusClass)};"></div>
            </div>
            <div class="progress-text">${d.cakupan.toFixed(1)}%</div>
          </div>
        </td>
        <td>${d.gap > 0 ? `<span style="color:var(--danger)">+${formatNumber(d.gap)}</span>` : `<span style="color:var(--success)">${formatNumber(d.gap)}</span>`}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  });
}

function getStatusColor(statusClass) {
  if (statusClass === 'badge-danger') return 'var(--danger)';
  if (statusClass === 'badge-warning') return 'var(--warning)';
  if (statusClass === 'badge-info') return 'var(--info)';
  return 'var(--success)';
}

function filterTable() {
  const q = document.getElementById('tableSearch').value.toLowerCase();
  const rows = document.getElementById('summaryTableBody').querySelectorAll('tr');
  rows.forEach(row => {
    const pusk = row.querySelector('td').innerText.toLowerCase();
    row.style.display = pusk.includes(q) ? '' : 'none';
  });
}

// TREN PAGE
function renderTren() {
  const years = [...new Set(rawData.map(d => d.tahun))].sort();
  const puskesmasList = [...new Set(rawData.map(d => d.nama_puskesmas))].sort();
  
  const genderFilter = document.getElementById('filterGender').value;
  const tData = rawData.filter(d => genderFilter === 'all' || d.jenis_kelamin === genderFilter);

  // Multi Line Trend
  const datasets = puskesmasList.map((pusk, i) => {
    const data = years.map(y => {
      const pData = tData.filter(d => d.nama_puskesmas === pusk && d.tahun === y);
      const s = pData.reduce((sum, d) => sum + d.jumlah_bayi, 0);
      const im = pData.reduce((sum, d) => sum + d.jumlah_bayi_diimunisasi, 0);
      return s ? (im/s*100) : 0;
    });
    
    // Generate distinct colors
    const hue = (i * 360 / puskesmasList.length) % 360;
    return {
      label: pusk,
      data: data,
      borderColor: `hsl(${hue}, 70%, 60%)`,
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 3,
      hidden: i > 4 // hide some by default to reduce clutter
    };
  });

    createChart('multiLineTrendChart', 'line', {
    labels: years,
    datasets: datasets
  }, {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { position: 'bottom', labels: { color: '#64748B', boxWidth: 12, usePointStyle: true } },
      tooltip: { backgroundColor: '#0F172A' }
    },
    scales: {
      y: { grid: { color: '#E2E8F0', borderDash: [4,4] } },
      x: { grid: { display: false } }
    }
  });

  // Bayi Bar Chart (Sasaran vs Imunisasi per Tahun)
  const sasaranTahunan = years.map(y => tData.filter(d => d.tahun === y).reduce((s, d) => s + d.jumlah_bayi, 0));
  const imunisasiTahunan = years.map(y => tData.filter(d => d.tahun === y).reduce((s, d) => s + d.jumlah_bayi_diimunisasi, 0));

  createChart('bayiBarChart', 'bar', {
    labels: years,
    datasets: [
      { label: 'Target Sasaran', data: sasaranTahunan, backgroundColor: '#E2E8F0', borderRadius: 4 },
      { label: 'Realisasi', data: imunisasiTahunan, backgroundColor: '#4F46E5', borderRadius: 4 }
    ]
  }, {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { color: '#64748B', usePointStyle: true } }, tooltip: { backgroundColor: '#0F172A' } },
    scales: { y: { grid: { color: '#E2E8F0', borderDash: [4,4] } }, x: { grid: { display: false } } }
  });

  // Avg Coverage
  const avgCoverage = sasaranTahunan.map((s, i) => s ? (imunisasiTahunan[i]/s*100) : 0);
  createChart('avgCoverageBarChart', 'line', {
    labels: years,
    datasets: [{
      label: 'Rata-rata Cakupan (%)',
      data: avgCoverage,
      borderColor: '#10B981', // success
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#10B981',
      fill: true,
      tension: 0.3
    }]
  }, {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0F172A' } },
    scales: { y: { grid: { color: '#E2E8F0', borderDash: [4,4] } }, x: { grid: { display: false } } }
  });
}

// PUSKESMAS PAGE
let selectedPuskesmas = '';
function setupPuskesmasSelector() {
  const puskesmasList = [...new Set(rawData.map(d => d.nama_puskesmas))].sort();
  selectedPuskesmas = puskesmasList[0];
  
  const group = document.getElementById('puskBtnGroup');
  group.innerHTML = puskesmasList.map(p => 
    `<button class="pusk-btn ${p === selectedPuskesmas ? 'active' : ''}" onclick="selectPuskesmas('${p}', this)">${p}</button>`
  ).join('');
}

function selectPuskesmas(pusk, btn) {
  document.querySelectorAll('.pusk-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedPuskesmas = pusk;
  renderPuskesmasView();
}

function renderPuskesmasView() {
  if (!selectedPuskesmas) return;
  
  document.getElementById('puskTitleLine').innerText = `Tren Cakupan – ${selectedPuskesmas}`;
  document.getElementById('puskDetailSubtitle').innerText = `${selectedPuskesmas} — Semua Tahun`;

  const years = [...new Set(rawData.map(d => d.tahun))].sort();
  const pData = rawData.filter(d => d.nama_puskesmas === selectedPuskesmas);

  // Line Chart Laki vs Perempuan
  const cakupanL = years.map(y => {
    const d = pData.find(x => x.tahun === y && x.jenis_kelamin === 'LAKI-LAKI');
    return d && d.jumlah_bayi ? (d.jumlah_bayi_diimunisasi / d.jumlah_bayi * 100) : 0;
  });
  const cakupanP = years.map(y => {
    const d = pData.find(x => x.tahun === y && x.jenis_kelamin === 'PEREMPUAN');
    return d && d.jumlah_bayi ? (d.jumlah_bayi_diimunisasi / d.jumlah_bayi * 100) : 0;
  });

    createChart('puskLineChart', 'line', {
    labels: years,
    datasets: [
      { label: 'Laki-laki', data: cakupanL, borderColor: '#4F46E5', tension: 0.3, pointBackgroundColor: '#FFFFFF', pointBorderColor: '#4F46E5', borderWidth: 2 },
      { label: 'Perempuan', data: cakupanP, borderColor: '#0EA5E9', tension: 0.3, pointBackgroundColor: '#FFFFFF', pointBorderColor: '#0EA5E9', borderWidth: 2 }
    ]
  }, {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#64748B', usePointStyle: true } }, tooltip: { backgroundColor: '#0F172A' } },
    scales: { y: { grid: { color: '#E2E8F0', borderDash: [4,4] } }, x: { grid: { display: false } } }
  });

  // Radar Chart
  createChart('puskRadarChart', 'radar', {
    labels: years,
    datasets: [{
      label: 'Konsistensi Capaian Tahunan',
      data: years.map(y => {
        const d = pData.filter(x => x.tahun === y);
        const s = d.reduce((sum, x) => sum + x.jumlah_bayi, 0);
        const i = d.reduce((sum, x) => sum + x.jumlah_bayi_diimunisasi, 0);
        return s ? (i/s*100) : 0;
      }),
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderColor: '#10B981',
      pointBackgroundColor: '#10B981',
      borderWidth: 2
    }]
  }, {
    responsive: true, maintainAspectRatio: false,
    plugins: { tooltip: { backgroundColor: '#0F172A' }, legend: { position: 'bottom' } },
    scales: {
      r: { angleLines: { color: '#E2E8F0' }, grid: { color: '#E2E8F0' }, pointLabels: { color: '#64748B', font: {family: "'Plus Jakarta Sans'"} } }
    }
  });

  // Table
  const tbody = document.getElementById('puskDetailTable');
  tbody.innerHTML = '';
  [...pData].sort((a, b) => b.tahun - a.tahun).forEach(d => {
    let statusClass = 'badge-success'; let statusText = 'Optimal';
    if (d.cakupan < 80) { statusClass = 'badge-danger'; statusText = 'Kritis'; }
    else if (d.cakupan < 95) { statusClass = 'badge-warning'; statusText = 'Dipantau'; }
    else if (d.cakupan > 100) { statusClass = 'badge-info'; statusText = 'Surplus'; }

    tbody.innerHTML += `
      <tr>
        <td>${d.tahun}</td>
        <td>${d.jenis_kelamin}</td>
        <td>${formatNumber(d.jumlah_bayi)}</td>
        <td>${formatNumber(d.jumlah_bayi_diimunisasi)}</td>
        <td><span class="cell-bold">${d.cakupan.toFixed(1)}%</span></td>
        <td>${d.gap}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  });
}

// GENDER PAGE
function renderGender() {
  const years = [...new Set(rawData.map(d => d.tahun))].sort();
  const puskesmasList = [...new Set(rawData.map(d => d.nama_puskesmas))].sort();

  // Gender Bar Year (Average Coverage)
  const avgL = years.map(y => {
    const d = rawData.filter(x => x.tahun === y && x.jenis_kelamin === 'LAKI-LAKI');
    const s = d.reduce((sum, x) => sum + x.jumlah_bayi, 0);
    const i = d.reduce((sum, x) => sum + x.jumlah_bayi_diimunisasi, 0);
    return s ? (i/s*100) : 0;
  });
  const avgP = years.map(y => {
    const d = rawData.filter(x => x.tahun === y && x.jenis_kelamin === 'PEREMPUAN');
    const s = d.reduce((sum, x) => sum + x.jumlah_bayi, 0);
    const i = d.reduce((sum, x) => sum + x.jumlah_bayi_diimunisasi, 0);
    return s ? (i/s*100) : 0;
  });

  createChart('genderBarYearChart', 'bar', {
    labels: years,
    datasets: [
      { label: 'Laki-laki', data: avgL, backgroundColor: '#4F46E5', borderRadius: 4 },
      { label: 'Perempuan', data: avgP, backgroundColor: '#0EA5E9', borderRadius: 4 }
    ]
  }, { responsive: true, maintainAspectRatio: false, plugins: {tooltip: { backgroundColor: '#0F172A' }, legend: {labels: {usePointStyle: true}}}, scales: { y: { grid: { color: '#E2E8F0', borderDash:[4,4] } }, x: { grid: { display: false } } } });

  // Gender Gap Count (How many times gap > 0)
  const gapL = rawData.filter(d => d.jenis_kelamin === 'LAKI-LAKI' && d.gap > 0).length;
  const gapP = rawData.filter(d => d.jenis_kelamin === 'PEREMPUAN' && d.gap > 0).length;

  createChart('genderGapChart', 'doughnut', {
    labels: ['Laki-laki (Gap Positif)', 'Perempuan (Gap Positif)'],
    datasets: [{ data: [gapL, gapP], backgroundColor: ['#4F46E5', '#0EA5E9'], borderWidth: 0 }]
  }, { responsive: true, maintainAspectRatio: false, plugins: {tooltip: { backgroundColor: '#0F172A' }} });

  // Stacked Bar per Puskesmas
  const stL = puskesmasList.map(p => rawData.filter(d => d.nama_puskesmas === p && d.jenis_kelamin === 'LAKI-LAKI').reduce((sum, x) => sum + x.jumlah_bayi_diimunisasi, 0));
  const stP = puskesmasList.map(p => rawData.filter(d => d.nama_puskesmas === p && d.jenis_kelamin === 'PEREMPUAN').reduce((sum, x) => sum + x.jumlah_bayi_diimunisasi, 0));

  createChart('genderStackedChart', 'bar', {
    labels: puskesmasList,
    datasets: [
      { label: 'Laki-laki', data: stL, backgroundColor: '#4F46E5' },
      { label: 'Perempuan', data: stP, backgroundColor: '#0EA5E9' }
    ]
  }, {
    responsive: true, maintainAspectRatio: false,
    plugins: {tooltip: { backgroundColor: '#0F172A' }, legend: {labels: {usePointStyle: true}}},
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: '#E2E8F0', borderDash:[4,4] } } }
  });

  // Render KPI
  const totL = rawData.filter(d => d.jenis_kelamin === 'LAKI-LAKI').reduce((sum, x) => sum + x.jumlah_bayi_diimunisasi, 0);
  const totP = rawData.filter(d => d.jenis_kelamin === 'PEREMPUAN').reduce((sum, x) => sum + x.jumlah_bayi_diimunisasi, 0);
  
  document.getElementById('genderKpiGrid').innerHTML = `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Total Imunisasi Laki-laki</span>
        <div class="metric-icon" style="background-color: var(--brand-primary-light); color: var(--brand-primary);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </div>
      <div class="metric-value">${formatNumber(totL)}</div>
      <div class="metric-footer"><span style="color:var(--text-muted)">Individu Bayi Laki-laki</span></div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Total Imunisasi Perempuan</span>
        <div class="metric-icon" style="background-color: var(--info-bg); color: var(--info-text);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </div>
      <div class="metric-value">${formatNumber(totP)}</div>
      <div class="metric-footer"><span style="color:var(--text-muted)">Individu Bayi Perempuan</span></div>
    </div>
  `;
}

// DETAIL PAGE
let detailSortCol = 'tahun';
let detailSortAsc = false;
let detailPage = 1;
const rowsPerPage = 20;
let filteredDetailData = [];

function renderDetail() {
  filteredDetailData = [...rawData];
  filterDetailTable();
}

function filterDetailTable() {
  const q = document.getElementById('detailSearch').value.toLowerCase();
  let data = rawData.filter(d => 
    d.nama_puskesmas.toLowerCase().includes(q) || 
    d.jenis_kelamin.toLowerCase().includes(q) ||
    d.tahun.toString().includes(q)
  );

  // Sort
  data.sort((a, b) => {
    let valA = a[detailSortCol];
    let valB = b[detailSortCol];
    if (typeof valA === 'string') {
      return detailSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return detailSortAsc ? valA - valB : valB - valA;
  });

  filteredDetailData = data;
  detailPage = 1;
  drawDetailTable();
}

function sortDetail(col) {
  if (detailSortCol === col) detailSortAsc = !detailSortAsc;
  else { detailSortCol = col; detailSortAsc = true; }
  filterDetailTable();
}

function drawDetailTable() {
  const tbody = document.getElementById('detailTableBody');
  const start = (detailPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginated = filteredDetailData.slice(start, end);
  
  tbody.innerHTML = '';
  paginated.forEach(d => {
    let statusClass = 'badge-success'; let statusText = 'Optimal';
    if (d.cakupan < 80) { statusClass = 'badge-danger'; statusText = 'Kritis'; }
    else if (d.cakupan < 95) { statusClass = 'badge-warning'; statusText = 'Dipantau'; }
    else if (d.cakupan > 100) { statusClass = 'badge-info'; statusText = 'Surplus'; }

    tbody.innerHTML += `
      <tr>
        <td class="cell-bold">${d.nama_puskesmas}</td>
        <td>${d.jenis_kelamin}</td>
        <td>${d.tahun}</td>
        <td>${formatNumber(d.jumlah_bayi)}</td>
        <td>${formatNumber(d.jumlah_bayi_diimunisasi)}</td>
        <td>${d.cakupan.toFixed(2)}%</td>
        <td>${d.gap}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  });

  drawPagination();
}

function drawPagination() {
  const totalPages = Math.ceil(filteredDetailData.length / rowsPerPage);
  const pag = document.getElementById('tablePagination');
  
  let html = `<button class="page-btn" ${detailPage === 1 ? 'disabled' : ''} onclick="detailPage--; drawDetailTable()">&lt;</button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= detailPage - 1 && i <= detailPage + 1)) {
      html += `<button class="page-btn ${i === detailPage ? 'active' : ''}" onclick="detailPage=${i}; drawDetailTable()">${i}</button>`;
    } else if (i === detailPage - 2 || i === detailPage + 2) {
      html += `<span style="color:var(--text-muted)">...</span>`;
    }
  }

  html += `<button class="page-btn" ${detailPage === totalPages ? 'disabled' : ''} onclick="detailPage++; drawDetailTable()">&gt;</button>`;
  pag.innerHTML = html;
}

function exportCSV() {
  const headers = ['nama_puskesmas', 'jenis_kelamin', 'tahun', 'jumlah_bayi', 'jumlah_bayi_diimunisasi', 'cakupan', 'gap'];
  const rows = filteredDetailData.map(d => headers.map(h => d[h]).join(','));
  const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "data_imunisasi_filter.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Init
window.onload = initDashboard;
