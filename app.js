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

// ===================== RENDER =====================
function renderApp() {
  renderHome();
  renderTransactions();
  renderFixed();
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
  drawDonut(donutCanvas, catData.map(c=>c[1]), catData.map(c => getCatById(c[0]).color));

  // Donut legend
  const legend = document.getElementById('donut-legend');
  legend.innerHTML = catData.length ? catData.map(([cid, val]) => {
    const cat = getCatById(cid);
    return `<div class="pie-legend-item"><div class="pie-dot" style="background:${cat.color}"></div><span>${cat.name}: <b style="color:var(--text-1)">₺${fmtShort(val)}</b></span></div>`;
  }).join('') : '<span style="color:var(--text-3);font-size:12px">Kayıt yok</span>';

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
  drawBarChart(document.getElementById('bar-chart'), monthLabels, monthInc, monthExp);

  // Recent transactions
  const recentEl = document.getElementById('recent-txs');
  const recent = [...state.transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,4);
  recentEl.innerHTML = recent.length ? recent.map(tx => txHTML(tx)).join('') : '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="receipt" style="width:40px;height:40px;color:var(--text-3);stroke-width:1.5"></i></div><p>İşlem bulunamadı</p></div>';

  // Insights
  const insightEl = document.getElementById('insights');
  const insights = generateInsights(filterByPeriod(state.transactions, 'month'), filterByPeriod(state.transactions, 'day'));
  insightEl.innerHTML = insights.map(i => `<div class="insight-chip ic-${i.color}"><i data-lucide="${i.icon}" style="width:14px;height:14px"></i> ${i.text}</div>`).join('');

  // Budget Progress
  const budEl = document.getElementById('budget-widget');
  if (state.monthlyBudget > 0 && period === 'month') {
    budEl.style.display = 'block';
    const spentStr = fmt(expense);
    const rem = state.monthlyBudget - expense;
    const pct = Math.min(100, Math.round((expense / state.monthlyBudget) * 100));
    
    document.getElementById('budget-desc').textContent = `Kullanılan: %${pct}`;
    const remEl = document.getElementById('budget-rem');
    remEl.textContent = (rem >= 0 ? `₺${fmtShort(rem)} Kaldı` : `₺${fmtShort(Math.abs(rem))} Aşıldı`);
    remEl.style.color = rem < 0 ? 'var(--red)' : 'var(--text-1)';
    
    const bar = document.getElementById('budget-bar');
    setTimeout(() => {
      bar.style.width = pct + '%';
      bar.className = 'prog-fill ' + (pct >= 90 ? 'danger' : '');
    }, 100);
  } else {
    budEl.style.display = 'none';
  }

  renderFixedWarnings();
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
  listEl.innerHTML = txs.length ? txs.map(tx => txHTML(tx)).join('') : '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="ghost" style="width:40px;height:40px;color:var(--text-3);stroke-width:1.5"></i></div><p>Kayıt bulunamadı</p></div>';

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

function renderFixed() {
  const el = document.getElementById('fixed-list');
  const fixTotEl = document.getElementById('fixed-total');
  
  const totalFixed = state.fixedExpenses.reduce((s,f)=>s+f.amount,0);
  if (fixTotEl) fixTotEl.textContent = '₺' + fmt(totalFixed);
  if (!el) return;

  el.innerHTML = state.fixedExpenses.length ? state.fixedExpenses.map(f => {
    const days = daysUntilPayment(f.payDay);
    const isWarning = days <= 2;
    const cat = getCatById(f.categoryId);
    return `<div class="card ${isWarning ? 'warning-blink' : ''}" style="${isWarning?'border:1.5px solid var(--red)':''}; margin-bottom:12px; cursor:default">
      <div style="display:flex;align-items:center;gap:14px;">
        <div class="tx-avatar" style="background:${cat.color}25;color:${cat.color}">
          ${cat.image ? `<img src="${cat.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : `<i data-lucide="${cat.icon}" style="width:20px;height:20px"></i>`}
        </div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px;color:var(--text-1)">${f.name}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px">Ayın ${f.payDay}. günü</div>
          <div style="font-size:12px;color:${isWarning?'var(--red)':'var(--text-2)'};font-weight:600;margin-top:4px;display:flex;align-items:center;gap:4px">
            <i data-lucide="clock" style="width:12px;height:12px"></i> ${days} gün kaldı
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800;font-size:16px;color:var(--red);letter-spacing:-0.3px">₺${fmtShort(f.amount)}</div>
          <button class="btn-util edit" onclick="openEditFixed('${f.id}')" style="margin-left:auto;margin-top:6px"><i data-lucide="pencil-line"></i></button>
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="calendar-off" style="width:40px;height:40px;color:var(--text-3);stroke-width:1.5"></i></div><p>Sabit ödeme yok</p></div>';

  const catMap = {};
  state.fixedExpenses.forEach(f => { catMap[f.categoryId] = (catMap[f.categoryId]||0) + f.amount; });
  const chartEl = document.getElementById('fixed-chart');
  if (chartEl) {
    if (Object.keys(catMap).length > 0) {
      const labels = Object.keys(catMap).map(id => getCatById(id).name);
      const vals = Object.values(catMap);
      drawBarChart(chartEl, labels, vals.map(()=>0), vals);
    } else {
      const ctx = chartEl.getContext('2d'); ctx.clearRect(0,0,chartEl.width,chartEl.height);
    }
  }
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
  document.getElementById('fixed-cat-select').innerHTML = state.categories.map(c => `<option value="${c.id}" ${c.id===f.categoryId?'selected':''}>${c.name}</option>`).join('');
  document.getElementById('del-fixed-btn').style.display = 'flex';
  document.getElementById('modal-fixed').classList.add('open');
}
function saveFixed() {
  const name = document.getElementById('fixed-name').value.trim();
  const amount = parseFloat(document.getElementById('fixed-amount').value);
  const payDay = parseInt(document.getElementById('fixed-payday').value);
  const categoryId = document.getElementById('fixed-cat-select').value;
  if (!name || !amount || !payDay) { alert('Lütfen tüm alanları doldurun.'); return; }
  
  if (editFixedId) {
    const idx = state.fixedExpenses.findIndex(x => x.id === editFixedId);
    if (idx !== -1) state.fixedExpenses[idx] = { ...state.fixedExpenses[idx], name, amount, payDay, categoryId };
  } else {
    state.fixedExpenses.push({ id: uid(), name, amount, payDay, categoryId, createdAt: new Date().toISOString() });
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
