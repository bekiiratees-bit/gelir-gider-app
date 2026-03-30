// ===================== STATE =====================
const STORAGE_KEY = 'gelir_gider_v3_premium';
let state = {
  theme: 'dark',
  transactions: [],
  categories: [
    { id: 'cat1', name: 'Market', icon: 'shopping-cart', color: '#00f5a0' },
    { id: 'cat2', name: 'Ulaşım', icon: 'car-front', color: '#4a8bff' },
    { id: 'cat3', name: 'Yemek', icon: 'pizza', color: '#ffab4a' },
    { id: 'cat4', name: 'Eğlence', icon: 'gamepad-2', color: '#b35df2' },
    { id: 'cat5', name: 'Sağlık', icon: 'pill', color: '#ff4a70' },
    { id: 'cat6', name: 'Eğitim', icon: 'graduation-cap', color: '#00d9f5' },
    { id: 'cat7', name: 'Maaş', icon: 'banknote', color: '#00f5a0' },
    { id: 'cat8', name: 'Freelance', icon: 'laptop', color: '#ffd710' },
    { id: 'cat9', name: 'Diğer', icon: 'package', color: '#a1a1ba' },
  ],
  fixedExpenses: [],
  planningItems: [],
  period: 'month',
  filterCat: 'all',
  monthlyBudget: 0
};

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const loaded = JSON.parse(raw);
    state = { ...state, ...loaded };
  }
}

// ===================== UTILS =====================
const fmt = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtShort = (n) => {
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+'M';
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+'K';
  return Math.round(n).toString();
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0,10);
const nowDate = () => new Date();

function getDateRange(period) {
  const now = nowDate();
  const d = new Date(now);
  if (period === 'day') {
    const s = new Date(d); s.setHours(0,0,0,0);
    const e = new Date(d); e.setHours(23,59,59,999);
    return { start: s, end: e };
  }
  if (period === 'week') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const s = new Date(d.setDate(diff)); s.setHours(0,0,0,0);
    const e = new Date(nowDate()); e.setHours(23,59,59,999);
    return { start: s, end: e };
  }
  if (period === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59);
    return { start: s, end: e };
  }
  if (period === 'year') {
    const s = new Date(now.getFullYear(), 0, 1);
    const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { start: s, end: e };
  }
}

function filterByPeriod(txs, period) {
  const range = getDateRange(period);
  return txs.filter(tx => {
    const d = new Date(tx.date);
    return d >= range.start && d <= range.end;
  });
}

function getTotals(txs) {
  let income = 0, expense = 0;
  txs.forEach(tx => {
    if (tx.type === 'income') income += tx.amount;
    else expense += tx.amount;
  });
  return { income, expense, balance: income - expense };
}

function getCatById(id) { return state.categories.find(c => c.id === id) || { name: 'Diğer', icon: 'package', color: '#9898b8' }; }

function daysUntilPayment(dayOfMonth) {
  const now = nowDate();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (thisMonth < now) {
    thisMonth.setMonth(thisMonth.getMonth() + 1);
  }
  return Math.ceil((thisMonth - now) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function getDayName(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { weekday: 'long' });
}

// triggers lucide icon parsing
function refreshIcons() {
  if (window.lucide) {
    setTimeout(() => lucide.createIcons(), 10);
  }
}

// ===================== CHART HELPERS =====================
function drawDonut(canvas, data, colors) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 190;
  canvas.width = W; canvas.height = W;
  const cx = W/2, cy = W/2, r = W*0.38, inner = W*0.28;
  ctx.clearRect(0,0,W,W);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (!data || data.length === 0) {
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle = state.theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'; 
    ctx.lineWidth = r-inner; ctx.stroke();
    return;
  }
  const total = data.reduce((a,b) => a+b, 0);
  if (total === 0) return;
  let start = -Math.PI/2;
  const gap = 0.08; // larger gap for a cleaner minimal look

  // Animate drawing
  let progress = 0;
  const drawFrame = () => {
    progress += 0.05;
    if(progress > 1) progress = 1;
    ctx.clearRect(0,0,W,W);
    let currentStart = start;
    data.forEach((val, i) => {
      const angle = (val/total) * Math.PI*2 * progress;
      if(angle > 0) {
        ctx.beginPath();
        // Draw as thick stroke instead of fill for perfect rounded caps
        ctx.arc(cx, cy, (r+inner)/2, currentStart + gap/2, currentStart + Math.max(0, angle - gap/2));
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = r - inner;
        ctx.stroke();
      }
      currentStart += (val/total) * Math.PI*2;
    });
    if(progress < 1) requestAnimationFrame(drawFrame);
  };
  requestAnimationFrame(drawFrame);
}

function drawBarChart(canvas, labels, incomes, expenses) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300; const H = 150;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0,0,W,H);
  const n = labels.length;
  if (n === 0) return;
  const max = Math.max(...incomes, ...expenses, 1);
  const bw = (W / n) * 0.22; // thinner bars
  const gap = (W / n) * 0.08;
  const padX = (W/n - bw*2 - gap) / 2;
  
  let progress = 0;
  const drawFrame = () => {
    progress += 0.06;
    if(progress > 1) progress = 1;
    ctx.clearRect(0,0,W,H);
    for (let i = 0; i < n; i++) {
      const x = (W/n)*i + padX;
      const ih = (incomes[i]/max) * (H-35) * progress;
      const eh = (expenses[i]/max) * (H-35) * progress;
      
      const rad = bw/2; // full pill shape
      
      // income bar
      if (ih > 0) {
        const gI = ctx.createLinearGradient(0, H-30-ih, 0, H-30);
        gI.addColorStop(0, state.theme === 'light' ? '#00d68f' : '#00f5a0'); 
        gI.addColorStop(1, state.theme === 'light' ? '#00b4d8' : '#00d9f5');
        ctx.fillStyle = gI;
        ctx.beginPath(); roundRect(ctx, x, H-30-ih, bw, ih, rad); ctx.fill();
      }
      
      // expense bar
      if (eh > 0) {
        const gE = ctx.createLinearGradient(0, H-30-eh, 0, H-30);
        gE.addColorStop(0, state.theme === 'light' ? '#ff3b60' : '#ff4a70'); 
        gE.addColorStop(1, state.theme === 'light' ? '#ff8c42' : '#ff8c42');
        ctx.fillStyle = gE;
        ctx.beginPath(); roundRect(ctx, x+bw+gap, H-30-eh, bw, eh, rad); ctx.fill();
      }
      
      // label
      ctx.fillStyle = state.theme === 'light' ? '#a1a1ba' : 'rgba(255,255,255,0.3)';
      ctx.font = `700 ${Math.min(10, W/n*0.35)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x+bw+gap/2, H-10);
    }
    if(progress < 1) requestAnimationFrame(drawFrame);
  };
  requestAnimationFrame(drawFrame);
}

function drawLineChart(canvas, labels, values, color) {
  if (!canvas || values.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300; const H = 100;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0,0,W,H);
  const max = Math.max(...values, 1) * 1.1; // 10% headroom
  const pts = values.map((v,i) => ({
    x: (W-30)/(values.length-1||1)*i + 15,
    y: H-18 - (v/max)*(H-30)
  }));
  // fill
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0, color+'50'); grad.addColorStop(1, color+'00');
  ctx.beginPath();
  let progress = 0;
  
  const drawFrame = () => {
    progress += 0.08;
    if(progress > 1) progress = 1;
    ctx.clearRect(0,0,W,H);
    
    // Fill
    ctx.beginPath();
    pts.forEach((p,i) => {
      const py = H - (H - p.y) * progress;
      if (i===0) ctx.moveTo(p.x, py);
      else {
        const prev = pts[i-1];
        const prevY = H - (H - prev.y) * progress;
        const cpX = (prev.x + p.x)/2;
        ctx.bezierCurveTo(cpX, prevY, cpX, py, p.x, py);
      }
    });
    ctx.lineTo(pts[pts.length-1].x, H);
    ctx.lineTo(pts[0].x, H);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    
    // Line
    ctx.beginPath();
    pts.forEach((p,i) => {
      const py = H - (H - p.y) * progress;
      if (i===0) ctx.moveTo(p.x, py);
      else {
        const prev = pts[i-1];
        const prevY = H - (H - prev.y) * progress;
        const cpX = (prev.x + p.x)/2;
        ctx.bezierCurveTo(cpX, prevY, cpX, py, p.x, py);
      }
    });
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    
    // dots
    pts.forEach(p => {
      const py = H - (H - p.y) * progress;
      ctx.beginPath(); ctx.arc(p.x, py, 4, 0, Math.PI*2);
      ctx.fillStyle = state.theme === 'light' ? '#fff' : '#101018';
      ctx.fill();
      ctx.lineWidth=2.5; ctx.stroke();
    });

    // labels
    ctx.fillStyle = state.theme === 'light' ? '#a1a1ba' : 'rgba(255,255,255,0.3)';
    ctx.font = '700 10px Inter, sans-serif'; ctx.textAlign = 'center';
    labels.forEach((l, i) => ctx.fillText(l, pts[i].x, H-2));

    if(progress < 1) requestAnimationFrame(drawFrame);
  };
  requestAnimationFrame(drawFrame);
}

function roundRect(ctx, x, y, w, h, r) {
  if (h < 0) { y += h; h = -h; }
  if (h < r*2) r = h/2;
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
}

// ===================== DOM REFS =====================
let currentScreen = 'home';
let addType = 'expense', addCatSelected = null;
let editTxId = null;
let editFixedId = null;
let editCatId = null;
let addCatImage = null; // for category custom image upload
let addPlanImage = null; // for planning custom image upload

// Calendar state
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

// ===================== RENDER =====================
function renderApp() {
  renderHome();
  renderTransactions();
  renderFixed();
  renderPlanning();
  renderCategories();
  renderSettings();
  refreshIcons();
}

function renderHome() {
  const period = state.period;
  const txs = filterByPeriod(state.transactions, period);
  const { income, expense, balance } = getTotals(txs);

  // Balance card
  document.getElementById('balance-amount').textContent = (balance >= 0 ? '+' : '') + '₺' + fmt(balance);
  document.getElementById('balance-amount').className = 'balance-amount ' + (balance >= 0 ? 'positive' : 'negative');
  document.getElementById('income-total').textContent = '₺' + fmt(income);
  document.getElementById('expense-total').textContent = '₺' + fmt(expense);

  // Debt total calculation
  const totalDebt = (state.fixedExpenses || []).filter(f => !f.isEnded && f.totalDebt > 0).reduce((s, f) => s + f.totalDebt, 0);
  const debtEl = document.getElementById('debt-total');
  if (debtEl) {
    debtEl.textContent = '₺' + fmtShort(totalDebt);
  }

  // Period tabs
  document.querySelectorAll('.period-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.period === period);
  });

  // Quick stats
  const setQS = (id, val) => { const el = document.getElementById(id); if(el) { el.textContent = '₺'+fmtShort(val); el.className='qs-val '+(val>=0?'positive':'negative'); }};
  setQS('qs-day', getTotals(filterByPeriod(state.transactions, 'day')).balance);
  setQS('qs-week', getTotals(filterByPeriod(state.transactions, 'week')).balance);
  setQS('qs-month', getTotals(filterByPeriod(state.transactions, 'month')).balance);
  setQS('qs-year', getTotals(filterByPeriod(state.transactions, 'year')).balance);

  // Donut chart
  const catMap = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
  });
  const catData = Object.entries(catMap).sort((a,b) => b[1]-a[1]).slice(0,5);
  const donutCanvas = document.getElementById('donut-chart');
  if (donutCanvas) {
    drawDonut(donutCanvas, catData.map(c=>c[1]), catData.map(c => getCatById(c[0]).color));
  }

  // Donut legend
  const legend = document.getElementById('donut-legend');
  if (legend) {
    legend.innerHTML = catData.length ? catData.map(([cid, val]) => {
      const cat = getCatById(cid);
      return `<div class="pie-legend-item"><div class="pie-dot" style="background:${cat.color}"></div><span>${cat.name}: <b style="color:var(--text-1)">₺${fmtShort(val)}</b></span></div>`;
    }).join('') : '<span style="color:var(--text-3);font-size:12px">Kayıt yok</span>';
  }

  // Bar chart - monthly per last 6 months
  const monthLabels = [], monthInc = [], monthExp = [];
  for (let i=5; i>=0; i--) {
    const d = new Date(); d.setMonth(d.getMonth()-i);
    const label = d.toLocaleDateString('tr-TR', {month:'short'});
    const txsM = state.transactions.filter(tx => {
      const td = new Date(tx.date);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    });
    const tot = getTotals(txsM);
    monthLabels.push(label); monthInc.push(tot.income); monthExp.push(tot.expense);
  }
  const barChartEl = document.getElementById('bar-chart');
  if (barChartEl) drawBarChart(barChartEl, monthLabels, monthInc, monthExp);

  // Recent transactions
  const recentEl = document.getElementById('recent-txs');
  if (recentEl) {
    const recent = [...state.transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,4);
    recentEl.innerHTML = recent.length ? recent.map(tx => txHTML(tx)).join('') : '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="receipt" style="width:40px;height:40px;color:var(--text-3);stroke-width:1.5"></i></div><p>İşlem bulunamadı</p></div>';
  }

  // Insights
  const insightEl = document.getElementById('insights');
  if (insightEl) {
    const insights = generateInsights(filterByPeriod(state.transactions, 'month'), filterByPeriod(state.transactions, 'day'));
    insightEl.innerHTML = insights.map(i => `<div class="insight-chip ic-${i.color}"><i data-lucide="${i.icon}" style="width:14px;height:14px"></i> ${i.text}</div>`).join('');
  }

  // Budget Progress
  const budEl = document.getElementById('budget-widget');
  if (budEl) {
    if (state.monthlyBudget > 0 && period === 'month') {
      budEl.style.display = 'block';
      const rem = state.monthlyBudget - expense;
      const pct = Math.min(100, Math.round((expense / state.monthlyBudget) * 100));
      document.getElementById('budget-desc').textContent = `Kullanılan: %${pct}`;
      const remEl = document.getElementById('budget-rem');
      remEl.textContent = (rem >= 0 ? `₺${fmtShort(rem)} Kaldı` : `₺${fmtShort(Math.abs(rem))} Aşıldı`);
      remEl.style.color = rem < 0 ? 'var(--red)' : 'var(--text-1)';
      const bar = document.getElementById('budget-bar');
      setTimeout(() => { if(bar) { bar.style.width = pct + '%'; bar.className = 'prog-fill ' + (pct >= 90 ? 'danger' : ''); } }, 100);
    } else {
      budEl.style.display = 'none';
    }
  }

  renderCalendar('home-calendar-grid', 'home-calendar-title');
  renderFixedWarnings();
  renderHomeFixed();
}

function generateInsights(txsMonth, txsDay) {
  const chips = [];
  const { income, expense, balance } = getTotals(txsMonth);
  if (income > 0) {
    const savePct = Math.round((balance/income)*100);
    chips.push({ color: savePct >= 20 ? 'green' : savePct >= 0 ? 'blue' : 'red', icon: savePct >= 0 ? 'trending-up' : 'trending-down', text: `Tasarruf: %${savePct}` });
  }
  const todayTot = getTotals(txsDay);
  if (todayTot.expense > 0) chips.push({ color: 'orange', icon: 'sun', text: `Bugün: ₺${fmtShort(todayTot.expense)}` });
  
  const catMap = {};
  txsMonth.filter(t=>t.type==='expense').forEach(t=>{ catMap[t.categoryId]=(catMap[t.categoryId]||0)+t.amount; });
  const top = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
  if (top) { const cat = getCatById(top[0]); chips.push({ color: 'red', icon: cat.icon, text: `En çok: ${cat.name}` }); }

  if (chips.length === 0) chips.push({ color: 'blue', icon: 'lightbulb', text: 'Finansal takibe başla' });
  return chips;
}

function txHTML(tx) {
  const cat = getCatById(tx.categoryId);
  const isInc = tx.type === 'income';
  const cCls = isInc ? 'inc' : 'exp';
  const cSgn = isInc ? '+' : '-';
  const dateStr = formatDate(tx.date);
  return `<div class="tx-item" onclick="openEditTx('${tx.id}')">
    <div class="tx-avatar" style="background:${cat.color}25;color:${cat.color}">
      ${cat.image ? `<img src="${cat.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : `<i data-lucide="${cat.icon}" style="width:22px;height:22px"></i>`}
    </div>
    <div class="tx-info">
      <div class="tx-name">${tx.note || cat.name}</div>
      <div class="tx-meta">
        <span><i data-lucide="tag" style="width:11px;height:11px"></i> ${cat.name}</span>
        <span style="opacity:0.5;margin:0 4px">•</span>
        <span>${dateStr}</span>
      </div>
    </div>
    <div class="tx-amount ${cCls}">${cSgn}₺${fmtShort(tx.amount)}</div>
    <div style="font-size:10px;color:var(--text-3);margin-left:8px;font-weight:700">${formatTime(tx.createdAt || tx.date)}</div>
  </div>`;
}

function renderFixedWarnings() {
  const el = document.getElementById('fixed-warnings');
  if (!el) return;
  const warnings = state.fixedExpenses.filter(f => daysUntilPayment(f.payDay) <= 2);
  if (warnings.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = warnings.map(f => `
    <div class="card warning-blink" style="border:1.5px solid var(--red); margin-bottom:12px;cursor:pointer" onclick="showScreen('fixed')">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,77,109,0.15);display:flex;align-items:center;justify-content:center;color:var(--red)"><i data-lucide="alert-triangle"></i></div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px;color:var(--text-1)">${f.name}</div>
          <div style="font-size:12px;color:var(--red);font-weight:600;margin-top:2px">${daysUntilPayment(f.payDay)} gün kaldı</div>
        </div>
        <div style="font-weight:800;font-size:18px;color:var(--red);letter-spacing:-0.4px">₺${fmt(f.amount)}</div>
      </div>
    </div>
  `).join('');
}

function renderTransactions() {
  let txs = [...state.transactions].sort((a,b) => new Date(b.date)-new Date(a.date));
  if (state.filterCat !== 'all') {
    if (state.filterCat === 'income') txs = txs.filter(t => t.type === 'income');
    else if (state.filterCat === 'expense') txs = txs.filter(t => t.type === 'expense');
    else txs = txs.filter(t => t.categoryId === state.filterCat);
  }

  // Build filter chips
  const chipEl = document.getElementById('tx-filters');
  const filterOpts = [
    { id: 'all', label: 'Tümü', icon: 'layers' },
    { id: 'income', label: 'Gelir', icon: 'trending-up' },
    { id: 'expense', label: 'Gider', icon: 'trending-down' },
    ...state.categories.map(c => ({ id: c.id, label: c.name, icon: c.icon }))
  ];
  chipEl.innerHTML = filterOpts.map(f => `<div class="filter-chip ${state.filterCat===f.id?'active':''}" onclick="setFilter('${f.id}')"><i data-lucide="${f.icon}"></i> ${f.label}</div>`).join('');

  const listEl = document.getElementById('tx-list');
  if (txs.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="ghost" style="width:40px;height:40px;color:var(--text-3);stroke-width:1.5"></i></div><p>Kayıt bulunamadı</p></div>';
  } else {
    // Grouping logic
    const groups = {};
    txs.forEach(t => {
      const d = t.date.slice(0,10);
      if (!groups[d]) groups[d] = { txs: [], total: 0 };
      groups[d].txs.push(t);
      groups[d].total += (t.type === 'expense' ? -t.amount : t.amount);
    });

    let html = '';
    Object.keys(groups).sort((a,b) => new Date(b) - new Date(a)).forEach(date => {
      const g = groups[date];
      const dateObj = new Date(date);
      const isToday = date === today();
      const label = isToday ? 'Bugün' : formatDate(date);
      const dayName = getDayName(date);
      html += `
        <div class="tx-group-header">
          <span>${label} <small style="margin-left:4px;opacity:0.6">${dayName}</small></span>
          <span class="tx-group-total" style="color:${g.total>=0?'var(--green)':'var(--red)'}">${g.total>=0?'+':''}₺${fmtShort(g.total)}</span>
        </div>
        ${g.txs.map(tx => txHTML(tx)).join('')}
      `;
    });
    listEl.innerHTML = html;
  }

  // Line chart for spending trend
  const last7 = []; const last7labels = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const dayTxs = state.transactions.filter(t => t.date.slice(0,10) === ds && t.type === 'expense');
    last7.push(dayTxs.reduce((s,t)=>s+t.amount,0));
    last7labels.push(d.toLocaleDateString('tr-TR',{weekday:'short'}));
  }
  drawLineChart(document.getElementById('trend-chart'), last7labels, last7, '#ff4d6d');
  refreshIcons();
}

function migrateFixedExpenses() {
  if (!state.fixedExpenses) return;
  state.fixedExpenses.forEach(f => {
    if (!f.payments) f.payments = {};
    if (f.paidMonths && f.paidMonths.length > 0) {
      f.paidMonths.forEach(m => {
        if (!f.payments[m]) f.payments[m] = f.amount;
      });
      delete f.paidMonths;
    }
  });
}
migrateFixedExpenses();

function renderFixed() {
  const el = document.getElementById('fixed-list');
  const fixTotEl = document.getElementById('fixed-total');
  
  const activeFixed = state.fixedExpenses.filter(x => !x.isEnded);
  const totalFixed = activeFixed.reduce((s,f)=>s+f.amount,0);
  if (fixTotEl) fixTotEl.textContent = '₺' + totalFixed.toLocaleString();
  if (!el) return;

  const now = nowDate();
  const currentMonthYear = now.toISOString().slice(0, 7);
  const currentDay = now.getDate();

  let html = '';

  activeFixed.forEach(f => {
    const cat = getCatById(f.categoryId);
    const startDate = f.startDate || '2024-01-01';
    const startObj = new Date(startDate);
    const endObj = new Date(currentMonthYear + '-01');

    // Iterate through all months from startDate to Current Selection
    let iter = new Date(startObj.getFullYear(), startObj.getMonth(), 1);
    while (iter <= endObj) {
      const iterStr = iter.toISOString().slice(0, 7);
      const isCurrentInstance = (iterStr === currentMonthYear);
      const paidAmt = (f.payments && f.payments[iterStr]) || 0;
      
      let expectedAmount = f.amount;
      let interestAdded = 0;
      // Add interest only if it's the current month AND past due day, OR if it's a past month
      if (f.dailyInterest) {
        if (isCurrentInstance && currentDay > f.payDay && paidAmt < expectedAmount) {
          interestAdded = expectedAmount * (f.dailyInterest / 100) * (currentDay - f.payDay);
        } else if (iter < endObj && paidAmt < expectedAmount) {
          interestAdded = expectedAmount * (f.dailyInterest / 100) * 30; // Approximated for past months
        }
      }
      const totalRequired = expectedAmount + interestAdded;
      const isFullyPaid = paidAmt >= totalRequired;

      if (!isFullyPaid) {
        const remaining = totalRequired - paidAmt;
        const progress = (paidAmt / totalRequired) * 100;
        const isOverdue = !isCurrentInstance;
        const monthLabel = iter.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

        html += `<div class="fixed-ultra-card ${isOverdue ? 'overdue' : ''}" style="cursor:pointer;" onclick="openEditFixed('${f.id}')">
          <!-- HEADER -->
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="tx-avatar" style="width:54px; height:54px; flex-shrink:0; border-radius:18px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);">
              ${cat.image ? `<img src="${cat.image}" style="width:100%;height:100%;object-fit:cover;border-radius:16px">` : `<i data-lucide="${cat.icon}" style="width:24px;height:24px;color:${cat.color}"></i>`}
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-weight:900; font-size:18px; color:var(--text-1); line-height:1.2;">${f.name}</div>
              <div style="font-size:11px; color:#fff; font-weight:900; background:${isOverdue ? 'var(--red)' : 'var(--blue)'}; display:inline-block; padding:2px 8px; border-radius:6px; margin-top:4px;">
                ${isOverdue ? 'GECİKMİŞ: ' + monthLabel : 'BU AYIN ÖDEMESİ'}
              </div>
            </div>
          </div>

          <!-- BODY -->
          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:12px;">
            <div style="flex:1;">
              <div style="font-size:13px; font-weight:800; color:var(--text-2);">${cat.name} <span style="opacity:0.3">|</span> ${f.payDay}. GÜN</div>
              <div class="payment-progress">
                <div class="payment-progress-bar" style="width:${progress}%"></div>
              </div>
              <div style="font-size:11px; margin-top:4px; font-weight:800; color:var(--text-3)">₺${paidAmt.toLocaleString()} / ₺${totalRequired.toLocaleString()} Ödendi</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:900; font-size:22px; color:var(--text-1)">₺${remaining.toLocaleString()}</div>
              <div style="font-size:10px; font-weight:800; color:var(--text-3)">KALAN BORÇ</div>
            </div>
          </div>

          <!-- FOOTER -->
          <div style="display:flex; align-items:center; gap:10px; margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.05);">
            <button class="btn-fixed-end" onclick="event.stopPropagation(); quickPayFixed('${f.id}', '${iterStr}', ${remaining})" style="background:var(--green); color:white; border:none; flex:1; height:44px; font-size:14px;">
              <i data-lucide="wallet"></i> Ödeme Yap (Kısmi/Tam)
            </button>
            <button class="btn-util" onclick="event.stopPropagation(); endFixedPayment('${f.id}')" style="width:44px; height:44px; background:rgba(255,61,113,0.1); color:var(--red); border:1px solid rgba(255,61,113,0.2);">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>`;
      }
      iter.setMonth(iter.getMonth() + 1);
    }
  });

  el.innerHTML = html || '<div class="empty-state">Bu ay için bekleyen ödeme yok</div>';

  const catMap = {};
  activeFixed.forEach(f => { catMap[f.categoryId] = (catMap[f.categoryId]||0) + f.amount; });
  const chartEl = document.getElementById('fixed-chart');
  if (chartEl && Object.keys(catMap).length > 0) {
    drawBarChart(chartEl, Object.keys(catMap).map(id => getCatById(id).name), Object.values(catMap).map(()=>0), Object.values(catMap));
  }
  refreshIcons();
}

function rollbackLastFixedPayment() {
  // Find the last transaction that is a fixed payment
  const lastIdx = [...state.transactions].reverse().findIndex(t => t.note && t.note.includes(' - ') && t.note.includes(' Ödemesi'));
  if (lastIdx === -1) {
    showToast('Geri alınacak ödeme kaydı bulunamadı.');
    return;
  }
  
  const actualIdx = state.transactions.length - 1 - lastIdx;
  const tx = state.transactions[actualIdx];
  const [fixedName, monthPart] = tx.note.split(' - ');
  const monthStr = monthPart.split(' ')[0]; // Extract YYYY-MM
  
  const f = state.fixedExpenses.find(x => x.name === fixedName);
  if (!f || !f.payments || !f.payments[monthStr]) {
    showToast('Ödeme asıl kayıtta bulunamadı.');
    return;
  }
  
  if (!confirm(`${fixedName} için yapılan ₺${tx.amount} tutarındaki ödeme geri alınsın mı?`)) return;

  // Deduct from payments
  f.payments[monthStr] -= tx.amount;
  if (f.payments[monthStr] <= 0) delete f.payments[monthStr];
  
  // Remove transaction
  state.transactions.splice(actualIdx, 1);
  
  saveState();
  renderFixed();
  renderHome();
  showToast('Ödeme başarıyla geri alındı');
}

function quickPayFixed(id, monthStr, remaining) {
  const amount = prompt(`${monthStr} ayı için ödeme tutarını giriniz:`, remaining);
  if (!amount || isNaN(amount) || amount <= 0) return;
  
  const f = state.fixedExpenses.find(x => x.id === id);
  if (!f) return;
  
  if (!f.payments) f.payments = {};
  f.payments[monthStr] = (f.payments[monthStr] || 0) + parseFloat(amount);
  
  // Create transaction
  const cat = getCatById(f.categoryId);
  state.transactions.push({
    id: generateId(),
    date: today(),
    amount: parseFloat(amount),
    categoryId: f.categoryId,
    note: `${f.name} - ${monthStr} Ödemesi`,
    type: 'expense'
  });

  saveState();
  renderFixed();
  renderHome();
  showToast('Ödeme başarıyla kaydedildi');
}

function renderHomeFixed() {
  const el = document.getElementById('home-fixed-list');
  if (!el) return;
  const currentMonthYear = nowDate().toISOString().slice(0, 7);
  el.innerHTML = state.fixedExpenses.filter(x => !x.isEnded).map(f => {
    const days = daysUntilPayment(f.payDay);
    const isToday = days === 0;
    const isWarning = days <= 2;
    const cat = getCatById(f.categoryId);
    const isPaid = f.paidMonths && f.paidMonths.includes(currentMonthYear);

    return `<div class="ultra-plan-card ${isWarning && !isPaid ? 'warning-blink' : ''}" style="margin-right:12px; min-width:200px; opacity:${isPaid ? 0.6 : 1}">
      <div class="tx-avatar" style="width:40px; height:40px; border-radius:12px;">
        ${cat.image ? `<img src="${cat.image}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">` : `<i data-lucide="${cat.icon}" style="width:18px;height:18px;color:${cat.color}"></i>`}
      </div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:800; font-size:13px; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</div>
        <div style="font-size:15px; font-weight:900; color:var(--text-1); margin-top:2px;">₺${f.amount.toLocaleString()}</div>
        <div style="font-size:9px; color:${isWarning && !isPaid ? 'var(--red)' : 'var(--text-3)'}; font-weight:800; text-transform:uppercase;">
          ${isPaid ? 'ÖDENDİ' : (isToday ? 'BUGÜN' : days + ' GÜN')}
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state">Sabit yok</div>';
  refreshIcons();
}

function renderCategories() {
  const el = document.getElementById('cat-list');
  if (!el) return;
  el.innerHTML = state.categories.map(c => {
    const txCount = state.transactions.filter(t=>t.categoryId===c.id).length;
    return `<div class="card" style="margin-bottom:12px;display:flex;align-items:center;gap:14px;padding:16px">
      <div class="tx-avatar" style="background:${c.color}25;color:${c.color}">
        ${c.image ? `<img src="${c.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : `<i data-lucide="${c.icon}" style="width:20px;height:20px"></i>`}
      </div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:15px;color:var(--text-1)">${c.name}</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:2px">${txCount} işlem</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-util edit" onclick="openEditCat('${c.id}')"><i data-lucide="pencil"></i></button>
        <button class="btn-util del" onclick="deleteCat('${c.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
  }).join('');
  refreshIcons();
}

function renderSettings() {
  const tm = document.getElementById('theme-toggle');
  if (tm) tm.classList.toggle('on', state.theme === 'light');
  const thLabel = document.getElementById('theme-label');
  if (thLabel) thLabel.textContent = state.theme === 'light' ? 'Açık Mod' : 'Koyu Mod';
  document.documentElement.setAttribute('data-theme', state.theme);
  
  const bLabel = document.getElementById('budget-set-label');
  if (bLabel) bLabel.textContent = state.monthlyBudget > 0 ? `₺${fmt(state.monthlyBudget)}` : 'Tanımlanmadı';
}

// ===================== NAVIGATION =====================
function showScreen(name) {
  currentScreen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.screen === name));
  if (name === 'home') renderHome();
  if (name === 'transactions') renderTransactions();
  if (name === 'fixed') renderFixed();
  if (name === 'planning') renderPlanning();
  if (name === 'categories') renderCategories();
  if (name === 'settings') renderSettings();
  refreshIcons();
}

// ===================== ADD/EDIT MODAL =====================
function openAddModal(type) {
  addType = type || 'expense';
  editTxId = null;
  document.getElementById('modal-add-title').textContent = 'Gelir - Gider Ekle';
  document.getElementById('add-amount').value = '';
  document.getElementById('add-note').value = '';
  document.getElementById('add-date').value = today();
  addCatSelected = state.categories[0].id;
  updateTypeBtns(); renderCatChips();
  const delBtn = document.getElementById('del-tx-btn');
  if (delBtn) delBtn.style.display = 'none';
  document.getElementById('modal-add').classList.add('open');
}

function openEditTx(id) {
  const tx = state.transactions.find(t=>t.id===id);
  if (!tx) return;
  editTxId = id; addType = tx.type; addCatSelected = tx.categoryId;
  document.getElementById('modal-add-title').textContent = 'İşlemi Düzenle';
  document.getElementById('add-amount').value = tx.amount;
  document.getElementById('add-note').value = tx.note || '';
  document.getElementById('add-date').value = tx.date.slice(0,10);
  updateTypeBtns(); renderCatChips();
  const delBtn = document.getElementById('del-tx-btn');
  if (delBtn) delBtn.style.display = 'flex';
  document.getElementById('modal-add').classList.add('open');
}

function setAddType(t) { addType = t; updateTypeBtns(); }
function updateTypeBtns() {
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === addType);
  });
}

function renderCatChips() {
  const el = document.getElementById('add-cat-chips');
  el.innerHTML = state.categories.map(c => `
    <div class="cat-chip ${addCatSelected===c.id?'selected':''}" onclick="selectCat('${c.id}')" style="${addCatSelected===c.id?`border-color:${c.color};background:${c.color}25;color:${c.color}`:''}">
      ${c.image ? `<img src="${c.image}" style="width:16px;height:16px;border-radius:8px;object-fit:cover;margin-right:2px">` : `<i data-lucide="${c.icon}" style="width:14px;height:14px"></i>`}
      ${c.name}
    </div>
  `).join('');
  refreshIcons();
}

function selectCat(id) { addCatSelected = id; renderCatChips(); }

function saveTransaction() {
  const amountRaw = document.getElementById('add-amount').value;
  const note = document.getElementById('add-note').value.trim();
  const date = document.getElementById('add-date').value;
  const amount = parseFloat(amountRaw);
  if (!amount || amount <= 0) { alert('Lütfen geçerli bir tutar girin'); return; }
  if (editTxId) {
    const idx = state.transactions.findIndex(t=>t.id===editTxId);
    if (idx !== -1) state.transactions[idx] = { ...state.transactions[idx], type: addType, amount, categoryId: addCatSelected, note, date };
  } else {
    state.transactions.push({ id: uid(), type: addType, amount, categoryId: addCatSelected, note, date, createdAt: new Date().toISOString() });
  }
  saveState(); closeModal('modal-add'); renderApp();
}

function deleteTx() {
  if (!editTxId) return;
  if (!confirm('İşlemi kalıcı olarak silmek istiyor musunuz?')) return;
  state.transactions = state.transactions.filter(t=>t.id!==editTxId);
  saveState(); closeModal('modal-add'); renderApp();
}

// ===================== FIXED EXPENSE MODAL =====================
function openFixedModal() {
  editFixedId = null;
  document.getElementById('modal-fixed-title').textContent = 'Sabit Ödeme Ekle';
  document.getElementById('fixed-name').value = '';
  document.getElementById('fixed-amount').value = '';
  document.getElementById('fixed-payday').value = '1';
  document.getElementById('fixed-duration').value = '0';
  document.getElementById('fixed-total-debt').value = '';
  document.getElementById('fixed-interest').value = '';
  document.getElementById('fixed-cat-select').innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('del-fixed-btn').style.display = 'none';
  document.getElementById('modal-fixed').classList.add('open');
}
function openEditFixed(id) {
  const f = state.fixedExpenses.find(x => x.id === id);
  if (!f) return;
  editFixedId = id;
  document.getElementById('modal-fixed-title').textContent = 'Ödemeyi Düzenle';
  document.getElementById('fixed-name').value = f.name;
  document.getElementById('fixed-amount').value = f.amount;
  document.getElementById('fixed-payday').value = f.payDay;
  document.getElementById('fixed-duration').value = f.duration || 0;
  document.getElementById('fixed-total-debt').value = f.totalDebt || '';
  document.getElementById('fixed-interest').value = f.dailyInterest || '';
  document.getElementById('fixed-cat-select').innerHTML = state.categories.map(c => `<option value="${c.id}" ${c.id===f.categoryId?'selected':''}>${c.name}</option>`).join('');
  document.getElementById('del-fixed-btn').style.display = 'flex';
  document.getElementById('modal-fixed').classList.add('open');
}
function saveFixed() {
  const name = document.getElementById('fixed-name').value.trim();
  const amount = parseFloat(document.getElementById('fixed-amount').value);
  const payDay = parseInt(document.getElementById('fixed-payday').value);
  const duration = parseInt(document.getElementById('fixed-duration').value) || 0;
  const totalDebt = parseFloat(document.getElementById('fixed-total-debt').value) || null;
  const dailyInterest = parseFloat(document.getElementById('fixed-interest').value) || null;
  const categoryId = document.getElementById('fixed-cat-select').value;
  if (!name || !amount || !payDay) { alert('Lütfen tüm alanları doldurun.'); return; }
  
  if (editFixedId) {
    const idx = state.fixedExpenses.findIndex(x => x.id === editFixedId);
    if (idx !== -1) state.fixedExpenses[idx] = { ...state.fixedExpenses[idx], name, amount, payDay, duration, totalDebt, dailyInterest, categoryId };
  } else {
    state.fixedExpenses.push({ id: uid(), name, amount, payDay, duration, totalDebt, dailyInterest, categoryId, startDate: today(), createdAt: new Date().toISOString(), paidMonths: [], isEnded: false });
  }
  saveState(); closeModal('modal-fixed'); renderFixed(); renderHome();
}
function deleteFixed(id) {
  const targetId = id || editFixedId;
  if (!targetId) return;
  if (!confirm('Bu sabit ödemeyi silmek istiyor musunuz?')) return;
  state.fixedExpenses = state.fixedExpenses.filter(f => f.id !== targetId);
  saveState(); if(!id) closeModal('modal-fixed'); renderFixed(); renderHome();
}

// ===================== CATEGORY MODAL & IMAGE COMPRESSION =====================
function handleCatImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 128; // WebP, 128x128 max is ~2-4KB. Very safe for localStorage.
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Crop to center square
      const minData = Math.min(img.width, img.height);
      const sx = (img.width - minData) / 2;
      const sy = (img.height - minData) / 2;
      ctx.drawImage(img, sx, sy, minData, minData, 0, 0, size, size);
      
      addCatImage = canvas.toDataURL('image/webp', 0.85);
      
      const p = document.getElementById('cat-img-preview');
      p.style.display = 'flex';
      p.innerHTML = `<img src="${addCatImage}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`;
      document.getElementById('cat-img-remove').style.display = 'flex';
      document.getElementById('cat-icon-in').disabled = true; // disable icon if image is used
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function removeCatImage() {
  addCatImage = null;
  document.getElementById('cat-img-in').value = '';
  document.getElementById('cat-img-preview').style.display = 'none';
  document.getElementById('cat-img-remove').style.display = 'none';
  document.getElementById('cat-icon-in').disabled = false;
}

function openCatModal() {
  editCatId = null;
  document.getElementById('modal-cat').querySelector('.modal-title').textContent = 'Yeni Kategori';
  document.getElementById('cat-name-in').value = '';
  document.getElementById('cat-icon-in').value = 'package'; // default lucide icon
  removeCatImage();
  document.getElementById('modal-cat').classList.add('open');
}

function openEditCat(id) {
  const cat = state.categories.find(c => c.id === id);
  if (!cat) return;
  editCatId = id;
  document.getElementById('modal-cat').querySelector('.modal-title').textContent = 'Kategoriyi Düzenle';
  document.getElementById('cat-name-in').value = cat.name;
  document.getElementById('cat-icon-in').value = cat.icon;
  removeCatImage();
  if (cat.image) {
    addCatImage = cat.image;
    const p = document.getElementById('cat-img-preview');
    p.style.display = 'flex';
    p.innerHTML = `<img src="${addCatImage}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`;
    document.getElementById('cat-img-remove').style.display = 'flex';
    document.getElementById('cat-icon-in').disabled = true;
  }
  document.getElementById('modal-cat').classList.add('open');
}

function saveCat() {
  const name = document.getElementById('cat-name-in').value.trim();
  const icon = document.getElementById('cat-icon-in').value.trim() || 'package';
  if (!name) return;
  
  if (editCatId) {
    const idx = state.categories.findIndex(c => c.id === editCatId);
    if (idx !== -1) {
      state.categories[idx] = { ...state.categories[idx], name, icon, image: addCatImage, color: window.newCatColor || state.categories[idx].color };
    }
  } else {
    state.categories.push({ id: uid(), name, icon, image: addCatImage, color: window.newCatColor || '#00d68f' });
  }
  
  saveState(); 
  closeModal('modal-cat'); 
  renderCategories();
  renderApp(); // Ensure other screens update too
}
function deleteCat(id) {
  if (!confirm('Kategoriyi silmek istiyor musunuz? İlgili işlemler "Diğer" kategorisine aktarılır.')) return;
  state.categories = state.categories.filter(c=>c.id!==id);
  state.transactions = state.transactions.map(t => t.categoryId===id ? {...t, categoryId:'cat9'} : t);
  saveState(); renderCategories(); renderApp();
}

// ===================== PLANNING & CALENDAR =====================
function renderPlanning() {
  const el = document.getElementById('planning-list');
  if (!el) return;

  // Render list
  const items = [...state.planningItems].sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
  
  el.innerHTML = items.length ? items.map(p => {
    const cat = getCatById(p.categoryId);
    const now = nowDate();
    now.setHours(0,0,0,0);
    
    let targetDate = new Date(p.dueDate);
    if (p.isRecurring) {
      const pDay = targetDate.getDate();
      targetDate = new Date(now.getFullYear(), now.getMonth(), pDay);
      if (now.getDate() > pDay) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
    }
    
    const diff = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
    const isToday = diff === 0;
    const isTomorrow = diff === 1;
    const isWarning = diff <= 1;

    return `<div class="ultra-plan-card ${diff <= 1 ? 'urgent plan-neon-red' : 'plan-neon-green'}">
      <div class="tx-avatar" style="width:48px; height:48px; border-radius:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);">
        ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : `<i data-lucide="${cat.icon}" style="width:22px;height:22px; color:${cat.color}; filter: drop-shadow(0 0 6px ${cat.color}50);"></i>`}
      </div>
      
      <div style="flex:1; min-width:0;">
        <div style="font-weight:900; font-size:16px; color:var(--text-1); letter-spacing:-0.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</div>
        <div style="font-size:10px; color:var(--text-3); font-weight:800; text-transform:uppercase; letter-spacing:0.8px; margin-top:2px;">${cat.name}</div>
      </div>

      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
        <div class="plan-date-viz">
          ${p.isRecurring ? `Aylık` : formatDate(p.dueDate).slice(0,6)}
        </div>
        <div class="plan-countdown-viz">
          <div class="countdown-num" style="font-size:18px;">${isToday ? '0' : diff}</div>
          <div class="countdown-label" style="font-size:7px;">GÜN</div>
        </div>
      </div>

      <button class="btn-util edit" onclick="openEditPlanning('${p.id}')" style="width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);">
        <i data-lucide="pencil-line" style="width:18px; height:18px;"></i>
      </button>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="calendar-plus" style="width:40px;height:40px;color:var(--text-3);stroke-width:1.5"></i></div><p>Planlanan ödeme yok</p></div>';

  renderCalendar('plan-calendar-grid', 'plan-calendar-title');
  refreshIcons();
}

function renderCalendar(gridId, titleId) {
  const grid = document.getElementById(gridId);
  const title = document.getElementById(titleId);
  if (!grid || !title) return;

  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  title.textContent = `${monthNames[calMonth]} ${calYear}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  let html = '';
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  days.forEach(d => html += `<div class="calendar-day-label">${d}</div>`);

  for (let i = 0; i < offset; i++) html += `<div></div>`;

  const now = new Date();
  now.setHours(0,0,0,0);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = now.getFullYear() === calYear && now.getMonth() === calMonth && now.getDate() === d;
    
    // Check for events (direct or recurring)
    const dayEvents = state.planningItems.filter(p => {
      const pDate = new Date(p.dueDate);
      return p.dueDate === dateStr || (p.isRecurring && pDate.getDate() === d);
    });
    
    const hasEvent = dayEvents.length > 0;
    
    // Check for alerts (tomorrow or today)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);
    
    const isAlert = dayEvents.some(p => {
      if (!p.isRecurring) return p.dueDate === tomorrowStr || p.dueDate === todayStr;
      const pDay = new Date(p.dueDate).getDate();
      return pDay === tomorrow.getDate() || pDay === now.getDate();
    });

    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" onclick="openPlanDayDetail('${dateStr}')">
        ${d}
        ${hasEvent ? `<div class="day-event-dot" style="${dayEvents.length > 1 ? 'width:12px; border-radius:4px' : ''}"></div>` : ''}
        ${isAlert ? `<div class="day-event-alert"></div>` : ''}
      </div>
    `;
  }

  grid.innerHTML = html;
}

function openPlanDayDetail(dateStr) {
  const dObj = new Date(dateStr);
  const day = dObj.getDate();
  const dayName = getDayName(dateStr);
  const title = document.getElementById('plan-detail-title');
  const list = document.getElementById('plan-detail-list');

  title.innerHTML = `<div style="font-size:14px; opacity:0.6; margin-bottom:4px;">${dayName}</div> ${day} ${title.innerText.split(' ').pop()}`;
  
  const events = state.planningItems.filter(p => {
    const pDate = new Date(p.dueDate);
    return p.dueDate === dateStr || (p.isRecurring && pDate.getDate() === day);
  });

  if (events.length === 0) {
    list.innerHTML = '<div class="empty-state">Bu güne ait planlı ödeme bulunmuyor.</div>';
  } else {
    list.innerHTML = events.map(p => {
      const cat = getCatById(p.categoryId);
      return `
        <div class="card" style="margin-bottom:12px; padding:16px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div class="tx-avatar" style="background:${cat.color}15; color:${cat.color}">
              ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : `<i data-lucide="${cat.icon}" style="width:20px;height:20px"></i>`}
            </div>
            <div style="flex:1">
              <div style="font-weight:800; font-size:16px; color:var(--text-1)">${p.name}</div>
              <div style="font-size:12px; color:var(--text-3); font-weight:600;">${cat.name} ${p.isRecurring ? '(Aylık Tekrarlı)' : ''}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    refreshIcons();
  }
  
  document.getElementById('modal-plan-day-detail').classList.add('open');
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar('home-calendar-grid', 'home-calendar-title');
  renderCalendar('plan-calendar-grid', 'plan-calendar-title');
}

function togglePlanRecurring() {
  const chk = document.getElementById('plan-recurring');
  chk.checked = !chk.checked;
  document.getElementById('plan-recurring-toggle').classList.toggle('on', chk.checked);
}

function openPlanningModal() {
  editPlanningId = null;
  document.getElementById('modal-planning-title').textContent = 'Planlı Ödeme Ekle';
  document.getElementById('plan-name').value = '';
  document.getElementById('plan-date').value = today();
  document.getElementById('plan-recurring').checked = false;
  document.getElementById('plan-recurring-toggle').classList.remove('on');
  document.getElementById('plan-cat-select').innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  removePlanImage();
  document.getElementById('del-plan-btn').style.display = 'none';
  document.getElementById('modal-planning').classList.add('open');
}

function openEditPlanning(id) {
  const p = state.planningItems.find(x => x.id === id);
  if (!p) return;
  editPlanningId = id;
  document.getElementById('modal-planning-title').textContent = 'Ödemeyi Düzenle';
  document.getElementById('plan-name').value = p.name;
  document.getElementById('plan-date').value = p.dueDate;
  document.getElementById('plan-recurring').checked = p.isRecurring || false;
  document.getElementById('plan-recurring-toggle').classList.toggle('on', p.isRecurring);
  document.getElementById('plan-cat-select').innerHTML = state.categories.map(c => `<option value="${c.id}" ${c.id===p.categoryId?'selected':''}>${c.name}</option>`).join('');
  removePlanImage();
  if (p.image) {
    addPlanImage = p.image;
    const prev = document.getElementById('plan-img-preview');
    prev.style.display = 'flex';
    prev.innerHTML = `<img src="${addPlanImage}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`;
    document.getElementById('plan-img-remove').style.display = 'flex';
  }
  document.getElementById('del-plan-btn').style.display = 'flex';
  document.getElementById('modal-planning').classList.add('open');
}

function savePlanning() {
  const name = document.getElementById('plan-name').value.trim();
  const dueDate = document.getElementById('plan-date').value;
  const isRecurring = document.getElementById('plan-recurring').checked;
  const categoryId = document.getElementById('plan-cat-select').value;
  if (!name || !dueDate) { alert('Lütfen tüm alanları doldurun.'); return; }

  if (editPlanningId) {
    const idx = state.planningItems.findIndex(x => x.id === editPlanningId);
    if (idx !== -1) state.planningItems[idx] = { ...state.planningItems[idx], name, dueDate, isRecurring, categoryId, image: addPlanImage };
  } else {
    state.planningItems.push({ id: uid(), name, dueDate, isRecurring, categoryId, image: addPlanImage, createdAt: new Date().toISOString() });
  }
  
  saveState(); closeModal('modal-planning'); renderApp();
}

function deletePlanning() {
  if (!editPlanningId) return;
  if (!confirm('Bu planlı ödemeyi silmek istiyor musunuz?')) return;
  state.planningItems = state.planningItems.filter(p => p.id !== editPlanningId);
  saveState(); closeModal('modal-planning'); renderApp();
}

function handlePlanImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 128;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const minData = Math.min(img.width, img.height);
      const sx = (img.width - minData) / 2;
      const sy = (img.height - minData) / 2;
      ctx.drawImage(img, sx, sy, minData, minData, 0, 0, size, size);
      addPlanImage = canvas.toDataURL('image/webp', 0.85);
      const p = document.getElementById('plan-img-preview');
      p.style.display = 'flex';
      p.innerHTML = `<img src="${addPlanImage}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`;
      document.getElementById('plan-img-remove').style.display = 'flex';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function removePlanImage() {
  addPlanImage = null;
  document.getElementById('plan-img-in').value = '';
  document.getElementById('plan-img-preview').style.display = 'none';
  document.getElementById('plan-img-remove').style.display = 'none';
}

let editPlanningId = null;

function openCatDetail(catId) {
  const cat = getCatById(catId);
  const txs = state.transactions.filter(t=>t.categoryId===catId).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const { income, expense, balance } = getTotals(txs);
  document.getElementById('cat-detail-title').textContent = cat.name;
  document.getElementById('cat-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;margin-bottom:20px">
      <div class="tx-avatar" style="width:64px;height:64px;border-radius:20px;background:${cat.color}25;color:${cat.color}">
        ${cat.image ? `<img src="${cat.image}" style="width:100%;height:100%;object-fit:cover;border-radius:20px">` : `<i data-lucide="${cat.icon}" style="width:32px;height:32px"></i>`}
      </div>
    </div>
    <div class="quick-stats" style="grid-template-columns:1fr 1fr 1fr">
      <div class="qs-card"><div class="qs-label">Toplam Gelir</div><div class="qs-val positive">+₺${fmtShort(income)}</div></div>
      <div class="qs-card"><div class="qs-label">Toplam Gider</div><div class="qs-val negative">-₺${fmtShort(expense)}</div></div>
      <div class="qs-card"><div class="qs-label">Net</div><div class="qs-val ${balance>=0?'positive':'negative'}">₺${fmtShort(balance)}</div></div>
    </div>
    <div class="section-label">İşlem Geçmişi</div>
    <div class="card">${txs.length ? txs.map(tx=>txHTML(tx)).join('') : '<div class="empty-state" style="padding:16px 0"><p style="font-size:12px">İşlem yok</p></div>'}</div>
  `;
  refreshIcons();
  document.getElementById('modal-cat-detail').classList.add('open');
}

// ===================== BUDGET MODAL =====================
function openBudgetModal() {
  document.getElementById('budget-in').value = state.monthlyBudget > 0 ? state.monthlyBudget : '';
  document.getElementById('modal-budget').classList.add('open');
}
function saveBudget() {
  const val = parseFloat(document.getElementById('budget-in').value);
  state.monthlyBudget = isNaN(val) || val < 0 ? 0 : val;
  saveState(); closeModal('modal-budget'); renderSettings(); renderHome();
}

// ===================== GENERAL UTILS =====================
function setFilter(id) { state.filterCat = id; renderTransactions(); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveState(); renderSettings(); renderHome(); renderTransactions(); renderFixed();
}

function exportCSV() {
  const rows = [['Tarih','Tur','Kategori','Not','Tutar']];
  state.transactions.forEach(tx => {
    const cat = getCatById(tx.categoryId);
    rows.push([tx.date, tx.type==='income'?'Gelir':'Gider', cat.name, tx.note||'', tx.amount]);
  });
  const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gelir-gider.csv'; a.click();
}

function clearAllData() {
  if (!confirm('TÜM VERİLER SİLİNECEK! Onaylıyor musunuz?')) return;
  state.transactions = []; state.fixedExpenses = [];
  saveState(); renderApp();
}

// ===================== HELPERS =====================
function getMonthsDiff(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

function markFixedPaid(id) {
  const f = state.fixedExpenses.find(x => x.id === id);
  if (!f) return;
  const currentMonthYear = nowDate().toISOString().slice(0, 7);
  if (!f.paidMonths) f.paidMonths = [];
  if (f.paidMonths.includes(currentMonthYear)) return;
  
  // Calculate current amount (with interest if overdue)
  let finalAmount = f.amount;
  const currentDay = nowDate().getDate();
  if (f.dailyInterest && currentDay > f.payDay) {
    const daysOverdue = currentDay - f.payDay;
    finalAmount += f.amount * (f.dailyInterest / 100) * daysOverdue;
  }

  f.paidMonths.push(currentMonthYear);
  if (f.totalDebt) f.totalDebt = Math.max(0, f.totalDebt - f.amount); // Subtract base amount from debt

  // Also add to transactions
  state.transactions.push({ 
    id: uid(), type: 'expense', amount: finalAmount, categoryId: f.categoryId, 
    note: `${f.name} (Sabit Ödeme)`, date: today(), createdAt: new Date().toISOString() 
  });

  saveState(); renderFixed(); renderHome(); renderTransactions();
}

function endFixedPayment(id) {
  if (!confirm('Bu ödeme planını tamamen bitirmek istediğinize emin misiniz? Gelecek aylarda görünmeyecektir.')) return;
  const f = state.fixedExpenses.find(x => x.id === id);
  if (f) f.isEnded = true;
  saveState(); renderFixed(); renderHome();
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  document.documentElement.setAttribute('data-theme', state.theme);
  
  // Fake splash screen duration
  setTimeout(() => {
    document.getElementById('splash').classList.add('hide');
    document.getElementById('app').classList.add('visible');
    renderApp();
    showScreen('home');
  }, 2200);

  // Period tabs click
  document.querySelectorAll('.period-tab').forEach(t => {
    t.addEventListener('click', () => {
      state.period = t.dataset.period;
      renderHome();
    });
  });
});
