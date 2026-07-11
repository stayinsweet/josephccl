// ==================== CARD DATA ====================
const CATEGORIES = {
  pr:  { name: '拍立得', icon: '📸', max: 4,  rarity: 'pr',  color: 'pr' },
  r:   { name: '音乐卡', icon: '🎵', max: 11, rarity: 'r',   color: 'r' },
  sr:  { name: '米兰卡', icon: '👗', max: 4,  rarity: 'sr',  color: 'sr' },
  ssr: { name: '双面卡', icon: '💎', max: 2,  rarity: 'ssr', color: 'ssr' },
};

// 所有有效卡片的 ID 列表
function allCardIDs() {
  const ids = [];
  for (const [cat, def] of Object.entries(CATEGORIES)) {
    for (let i = 1; i <= def.max; i++) {
      ids.push(cat + i);
    }
  }
  return ids;
}

const ALL_CARD_IDS = allCardIDs(); // ["pr1","pr2","pr3","pr4","r1","r2","r3","r4","r5","sr1","sr2","sr3","sr4"]

// 卡牌名称数据（按池子区分，尚未填入的用 ?）
const CARD_NAMES = {
  xiari: {
    pr1:'?', pr2:'?', pr3:'?', pr4:'?',
    r1:'?', r2:'?', r3:'?', r4:'?', r5:'?', r6:'?', r7:'?', r8:'?', r9:'?', r10:'?', r11:'?',
    sr1:'?', sr2:'?', sr3:'?', sr4:'?',
    ssr1:'?', ssr2:'?',
  },
  junuan: {
    pr1:'?', pr2:'?', pr3:'?', pr4:'?',
    r1:'?', r2:'?', r3:'?', r4:'?', r5:'?', r6:'?', r7:'?', r8:'?', r9:'?', r10:'?', r11:'?',
    sr1:'?', sr2:'?', sr3:'?', sr4:'?',
    ssr1:'?', ssr2:'?',
  }
};

// ==================== STATE ====================
let cardCounts = { xiari: {}, junuan: {} };
let history = [];
let milestones = [
  { draws: 10, reward: '送未公开卡' },
];
let cardImages = { xiari: {}, junuan: {} };
let currentPool = 'xiari';
let currentTab = 'collection';
let inputMode = 'single';
let batchCards = [];
let selectedCat = 'pr';
let currentNum = '';
let ocrCounts = {};   // OCR检测到的每张卡的数量 { pr2: 2, r3: 1 }
let ocrSelected = {}; // 用户调整后的数量 { pr2: 2, r3: 1 }，0 表示剔除
let ocrExpectedTotal = 0; // 从奖品编号检测到的本轮总抽数
let modalCard = null;

// ==================== PERSISTENCE ====================
function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem('ccg2_data') || '{}');
    cardCounts = d.cardCounts || { xiari: {}, junuan: {} };
    history = d.history || [];
    milestones = d.milestones || milestones;
    cardImages = d.cardImages || { xiari: {}, junuan: {} };
  } catch(e) {}
}
function saveData() {
  localStorage.setItem('ccg2_data', JSON.stringify({ cardCounts, history, milestones, cardImages }));
}

// ==================== HELPERS ====================
function catOf(id) { return id.replace(/\d+/, ''); }
function numOf(id) { return parseInt(id.replace(/[a-z]+/, '')); }
function catDef(id) { return CATEGORIES[catOf(id)]; }

// ==================== POOL & TAB ====================
function switchPool(pool) {
  currentPool = pool;
  document.querySelectorAll('.pool-btn').forEach(b => b.classList.toggle('active', b.dataset.pool === pool));
  renderCollection(); updateStats(); renderBonus();
}
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  const p = document.getElementById('tab-' + tab); if (p) p.classList.add('active');
  const b = document.querySelector(`.tab-item[data-tab="${tab}"]`); if (b) b.classList.add('active');
  if (tab === 'collection') { renderCollection(); updateStats(); renderBonus(); }
  if (tab === 'history') renderHistory();
  if (tab === 'input') renderNumpad();
}

// ==================== STATS ====================
function updateStats() {
  const c = cardCounts[currentPool] || {};
  let total = 0, prTotal = 0, rTotal = 0, srTotal = 0, ssrTotal = 0;
  for (const [id, cnt] of Object.entries(c)) {
    total += cnt;
    const cat = catOf(id);
    if (cat === 'pr') prTotal += cnt;
    else if (cat === 'r') rTotal += cnt;
    else if (cat === 'sr') srTotal += cnt;
    else if (cat === 'ssr') ssrTotal += cnt;
  }
  // 加上另一个池子的总抽数
  const other = currentPool === 'xiari' ? 'junuan' : 'xiari';
  const oc = cardCounts[other] || {};
  for (const cnt of Object.values(oc)) total += cnt;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPR').textContent = prTotal;
  document.getElementById('statR').textContent = rTotal;
  document.getElementById('statSR').textContent = srTotal;
  document.getElementById('statSSR').textContent = ssrTotal;
  document.getElementById('bonusTotal').textContent = total + ' 抽';
}

// ==================== BONUS ====================
function renderBonus() {
  const container = document.getElementById('bonusMilestones');
  let total = 0;
  for (const pool of ['xiari', 'junuan']) {
    for (const cnt of Object.values(cardCounts[pool] || {})) total += cnt;
  }
  container.innerHTML = milestones.map(m => {
    const pct = Math.min(100, Math.round((total / m.draws) * 100));
    const done = total >= m.draws;
    return `<div class="bonus-milestone">
      <span class="bonus-label">${m.draws}抽</span>
      <div class="bonus-bar-wrap"><div class="bonus-bar-fill${done?' done':''}" style="width:${pct}%"></div></div>
      <span class="bonus-reward">${done?'✅ ':''}${m.reward}</span>
      <span class="bonus-count">${total}/${m.draws}</span>
    </div>`;
  }).join('');
}
function editMilestones() {
  const input = prompt('满赠档位（每行一个：抽数,奖励名称）\n例：30,自选卡×1',
    milestones.map(m => m.draws + ',' + m.reward).join('\n'));
  if (input !== null) {
    milestones = input.trim().split('\n').filter(l=>l.trim()).map(l => {
      const [d, ...r] = l.split(','); return { draws: parseInt(d), reward: r.join(',').trim() };
    }).filter(m => m.draws > 0);
    saveData(); renderBonus(); showToast('✅ 满赠档位已更新');
  }
}

// ==================== COLLECTION ====================
function renderCollection() {
  const grid = document.getElementById('collectionGrid');
  const c = cardCounts[currentPool] || {};
  const names = CARD_NAMES[currentPool] || {};

  // 按类别分组
  let html = '';
  const order = ['pr', 'r', 'sr', 'ssr'];
  const titles = { pr: '📸 拍立得 PR', r: '🎵 音乐卡 R', sr: '👗 米兰卡 SR', ssr: '💎 双面卡 SSR' };
  const titleCls = { pr: 'pr-title', r: 'r-title', sr: 'sr-title', ssr: 'ssr-title' };

  for (const cat of order) {
    const def = CATEGORIES[cat];
    const cards = [];
    for (let i = 1; i <= def.max; i++) {
      const id = cat + i;
      cards.push({ id, name: names[id] || '?', cat, count: c[id] || 0 });
    }
    html += `<div class="rarity-section"><div class="rarity-title ${titleCls[cat]}">${titles[cat]}</div><div class="card-grid">`;
    html += cards.map(card => {
      const imgs = cardImages[currentPool] && cardImages[currentPool][card.id];
      const imgHTML = imgs && imgs.front
        ? `<img src="${imgs.front}" alt="${card.id}">`
        : `<span>${card.id.toUpperCase()}</span>`;
      return `<div class="card-cell ${card.cat} ${card.count>0?'has':'zero'}" onclick="openModal('${card.id}')">
        <div class="placeholder">${imgHTML}</div>
        <div class="cid">${card.id.toUpperCase()}</div>
        <div class="cname">${card.name}</div>
        <div class="badge">${card.count}</div>
      </div>`;
    }).join('');
    html += '</div></div>';
  }
  grid.innerHTML = html;
}

// ==================== MODAL ====================
function openModal(id) {
  modalCard = id;
  const names = CARD_NAMES[currentPool];
  const c = cardCounts[currentPool] || {};
  const cat = catOf(id);
  const def = CATEGORIES[cat];

  document.getElementById('modalCid').textContent = id.toUpperCase();
  document.getElementById('modalName').textContent = (names && names[id]) || '?';
  document.getElementById('modalRarity').textContent = def.icon + ' ' + def.name;
  document.getElementById('modalCount').textContent = c[id] || 0;

  const front = document.getElementById('modalFront');
  front.className = 'modal-face front ' + cat + '-face';
  const imgs = cardImages[currentPool] && cardImages[currentPool][id];
  if (imgs && imgs.front) {
    document.getElementById('modalFrontImg').src = imgs.front; document.getElementById('modalFrontImg').style.display='block';
    document.getElementById('modalFrontPH').style.display='none';
  } else {
    document.getElementById('modalFrontImg').style.display='none';
    document.getElementById('modalFrontPH').style.display='block';
  }
  if (imgs && imgs.back) {
    document.getElementById('modalBackImg').src = imgs.back; document.getElementById('modalBackImg').style.display='block';
    document.getElementById('modalBackPH').style.display='none';
  } else {
    document.getElementById('modalBackImg').style.display='none';
    document.getElementById('modalBackPH').style.display='block';
  }
  document.getElementById('cardModal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('cardModal').style.display = 'none';
  modalCard = null;
  renderCollection(); updateStats();
}
function adjustCard(delta) {
  if (!modalCard) return;
  if (!cardCounts[currentPool]) cardCounts[currentPool] = {};
  const k = modalCard;
  const cur = cardCounts[currentPool][k] || 0;
  cardCounts[currentPool][k] = Math.max(0, cur + delta);
  if (delta > 0) {
    history.unshift({ time: new Date().toISOString(), pool: currentPool, cards: [k], type: 'adjust' });
  }
  saveData();
  document.getElementById('modalCount').textContent = cardCounts[currentPool][k];
  updateStats(); renderCollection(); renderBonus();
}

// ==================== SCREENSHOT OCR（中文识别版）====================
let tessWorker = null;

// 中文卡名 → ID 前缀映射
const CN_CAT_MAP = {
  '拍立得': 'pr', '音乐卡': 'r', '米兰卡': 'sr', '双面卡': 'ssr',
  '音乐': 'r', '米兰': 'sr', '拍立': 'pr', '双面': 'ssr',
  'pr': 'pr', 'PR': 'pr', 'Pr': 'pr',
  'sr': 'sr', 'SR': 'sr', 'Sr': 'sr',
  'ssr': 'ssr', 'SSR': 'ssr', 'Ssr': 'ssr',
  'r': 'r', 'R': 'r',
};

// 已知所有有效卡号的中文名列表（用于匹配）
const CN_CARD_PATTERNS = [
  { pattern: /拍\s*立\s*得\s*[·.]?\s*(\d{1,2})/g, cat: 'pr' },
  { pattern: /音\s*乐\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'r' },
  { pattern: /米\s*兰\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'sr' },
  { pattern: /双\s*面\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'ssr' },
];

// 图片预处理：放大+增强对比度
function preprocessImage(imgData, callback) {
  const img = new Image();
  img.onload = function() {
    const canvas = document.createElement('canvas');
    const scale = Math.max(2.0, 1500 / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
      const enhanced = Math.min(255, Math.max(0, (gray - 50) * 2.0));
      d[i] = d[i+1] = d[i+2] = enhanced;
    }
    ctx.putImageData(imageData, 0, 0);
    callback(canvas.toDataURL('image/png'));
  };
  img.src = imgData;
}

async function getWorker() {
  if (tessWorker) return tessWorker;
  showToast('🔧 首次加载中英文识别引擎（约8MB）...');

  // 使用 chi_sim+eng 同时识别中文和英文
  const w = await Tesseract.createWorker('chi_sim+eng', 1, {
    logger: m => {
      if (m.status === 'loading tesseract core') {
        document.getElementById('ocrStatus').textContent = '🔧 加载核心引擎...';
      } else if (m.status === 'initializing tesseract') {
        document.getElementById('ocrStatus').textContent = '🔧 初始化...';
      } else if (m.status === 'loading language traineddata') {
        document.getElementById('ocrStatus').textContent = '🔧 下载中文语言包...';
      } else if (m.status === 'recognizing text') {
        document.getElementById('ocrStatus').textContent = `🤖 正在识别... ${Math.round(m.progress*100)}%`;
      }
    },
  });

  await w.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
  });
  tessWorker = w;
  return w;
}

async function handleScreenshots(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  event.target.value = '';

  document.getElementById('uploadPreview').classList.add('show');
  document.getElementById('ocrLoading').style.display = 'block';
  document.getElementById('ocrNumbers').innerHTML = '';
  document.getElementById('ocrStatus').textContent = `🔧 处理 ${files.length} 张截图...`;
  document.getElementById('ocrCount').textContent = '0';
  ocrCounts = {}; ocrSelected = {}; ocrExpectedTotal = 0;

  const accumulated = {};
  let grandExpected = 0;
  const allDebug = [];

  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    document.getElementById('ocrStatus').textContent = `🤖 处理第 ${fi+1}/${files.length} 张...`;

    const rawImgData = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });

    if (fi === 0) document.getElementById('previewImg').src = rawImgData;

    await new Promise(resolve => {
    preprocessImage(rawImgData, async (processedImgData) => {
      const allTexts = [];
      const allWords = [];

      try {
        const worker = await getWorker();

        // 第1轮：预处理图
        document.getElementById('ocrStatus').textContent = '🤖 第1轮识别（预处理图）...';
        const ret1 = await worker.recognize(processedImgData);
        allTexts.push(ret1.data.text);
        if (ret1.data.words) allWords.push(...ret1.data.words);

        // 第2轮：原图
        document.getElementById('ocrStatus').textContent = '🤖 第2轮识别（原图）...';
        const ret2 = await worker.recognize(rawImgData);
        allTexts.push(ret2.data.text);
        if (ret2.data.words) allWords.push(...ret2.data.words);

        const fullText = allTexts.join('\n');
        console.log('=== OCR 原始输出 ===');
        console.log(fullText);
        console.log('=== 单词 ===');
        console.log(allWords.map(w => `"${w.text}"(${w.confidence}%)`).join(', '));

        const found = new Set();

        // 每个策略独立计数，最后取最大值（避免重复计数）
        const strategyResults = [];

        // === 策略A：匹配中文卡名 + 数字（最可靠）===
        const cntA = {};
        for (const { pattern, cat } of CN_CARD_PATTERNS) {
          let m; pattern.lastIndex = 0;
          while ((m = pattern.exec(fullText)) !== null) {
            const num = parseInt(m[1]);
            const id = cat + num;
            if (ALL_CARD_IDS.includes(id)) cntA[id] = (cntA[id] || 0) + 1;
          }
        }
        strategyResults.push(cntA);

        // === 策略B：匹配英文缩写 PR1, R3, SR2 等 ===
        const cntB = {};
        const enPatterns = [
          /(pr|PR|Pr)\s*(\d{1,2})/g,
          /(sr|SR|Sr)\s*(\d{1,2})/g,
          /(ssr|SSR|Ssr)\s*(\d{1,2})/g,
          /\b(r|R)\s*(\d{1,2})\b/g,
        ];
        for (const pat of enPatterns) {
          let m; pat.lastIndex = 0;
          while ((m = pat.exec(fullText)) !== null) {
            const cat = m[1].toLowerCase();
            const num = parseInt(m[2]);
            const id = cat + num;
            if (ALL_CARD_IDS.includes(id)) cntB[id] = (cntB[id] || 0) + 1;
          }
        }
        strategyResults.push(cntB);

        // === 策略C：单词级（置信度 > 40）===
        const cntC = {};
        for (const w of allWords) {
          if (w.confidence < 40) continue;
          const cleaned = w.text.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (ALL_CARD_IDS.includes(cleaned)) cntC[cleaned] = (cntC[cleaned] || 0) + 1;
        }
        strategyResults.push(cntC);

        // === 策略D：中文宽松匹配 ===
        const cntD = {};
        const compact = fullText.replace(/[\s,，.。、·:：\-\+\=\(\)（）\[\]【】<>《》""''""！!？?｀`~@#$%^&*_/|\\]/g, '');
        for (const [cnName, cat] of Object.entries(CN_CAT_MAP)) {
          if (cnName.length < 2) continue;
          let idx = 0;
          while ((idx = compact.indexOf(cnName, idx)) !== -1) {
            const after = compact.slice(idx + cnName.length, idx + cnName.length + 3);
            const numMatch = after.match(/^(\d)/);
            if (numMatch) {
              const num = parseInt(numMatch[1]);
              const id = cat + num;
              if (ALL_CARD_IDS.includes(id)) cntD[id] = (cntD[id] || 0) + 1;
            }
            idx += cnName.length;
          }
        }
        strategyResults.push(cntD);

        // === 检测奖品编号：奖品1, 奖品2, ... 确定本轮总抽数 ===
        let expectedTotal = 0;
        const prizePattern = /奖品\s*(\d{1,2})/g;
        let pm;
        while ((pm = prizePattern.exec(fullText)) !== null) {
          const n = parseInt(pm[1]);
          if (n > expectedTotal) expectedTotal = n;
        }
        // 也检查 "Prize" 英文写法
        const prizePatternEN = /prize\s*(\d{1,2})/gi;
        while ((pm = prizePatternEN.exec(fullText)) !== null) {
          const n = parseInt(pm[1]);
          if (n > expectedTotal) expectedTotal = n;
        }
        console.log('检测到奖品总数: ' + expectedTotal);
        ocrExpectedTotal = expectedTotal; // 存为全局变量

        // 合并：每张卡取各策略的最大值
        const imgCounts = {};
        for (const id of ALL_CARD_IDS) {
          let maxCnt = 0;
          for (const sr of strategyResults) {
            if (sr[id] && sr[id] > maxCnt) maxCnt = sr[id];
          }
          if (maxCnt > 0) imgCounts[id] = Math.min(maxCnt, expectedTotal || 10);
        }

        // 奖品位校验修正
        const rawTotal = Object.values(imgCounts).reduce((s,c) => s+c, 0);
        if (expectedTotal > 0 && rawTotal > expectedTotal) {
          const scale = expectedTotal / rawTotal;
          for (const id of Object.keys(imgCounts)) imgCounts[id] = Math.max(1, Math.round(imgCounts[id] * scale));
          let adjTotal = Object.values(imgCounts).reduce((s,c) => s+c, 0);
          const sortedIds = Object.keys(imgCounts).sort((a,b) => imgCounts[b] - imgCounts[a]);
          for (const id of sortedIds) {
            while (imgCounts[id] > 1 && adjTotal > expectedTotal) { imgCounts[id]--; adjTotal--; }
          }
        }

        // 累加到全局
        for (const [id, cnt] of Object.entries(imgCounts)) {
          accumulated[id] = (accumulated[id] || 0) + cnt;
        }
        grandExpected += expectedTotal;
        allDebug.push(fullText.replace(/\n/g, ' ').slice(0, 80));

      } catch(err) {
        console.error(`第${fi+1}张识别失败:`, err);
      }

      document.getElementById('ocrLoading').style.display = 'none';
      resolve();
    });
    }); // end preprocessImage + Promise
  } // end for loop

  // 所有截图处理完毕，设置全局结果
  ocrCounts = accumulated;
  ocrExpectedTotal = grandExpected;

  ocrSelected = {};
  for (const [id, cnt] of Object.entries(ocrCounts)) {
    if (cnt > 0) ocrSelected[id] = cnt;
  }

  const finalTotal = Object.values(ocrCounts).reduce((s,c) => s+c, 0);
  const debugInfo = allDebug.join(' | ').slice(0, 200);

  if (finalTotal === 0) {
    document.getElementById('ocrStatus').innerHTML =
      `⚠️ 处理了 ${files.length} 张截图，未识别到卡号<br><small style="font-size:10px;">${debugInfo}...</small>`;
  } else {
    document.getElementById('ocrStatus').innerHTML =
      `✅ 处理 ${files.length} 张截图，奖品位共 <b>${grandExpected||'?'}</b>，识别 <b>${finalTotal}</b> 张卡<br><small style="font-size:10px;">${debugInfo}</small>`;
  }
  document.getElementById('ocrLoading').style.display = 'none';
  renderOCR();
}

function renderOCR() {
  const container = document.getElementById('ocrNumbers');
  const names = CARD_NAMES[currentPool] || {};

  const order = [
    { cat: 'pr',  icon: '📸', label: '拍立得', ids: ['pr1','pr2','pr3','pr4'] },
    { cat: 'r',   icon: '🎵', label: '音乐卡', ids: ['r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11'] },
    { cat: 'sr',  icon: '👗', label: '米兰卡', ids: ['sr1','sr2','sr3','sr4'] },
    { cat: 'ssr', icon: '💎', label: '双面卡', ids: ['ssr1','ssr2'] },
  ];

  let totalSelected = 0;
  let html = '';

  for (const group of order) {
    html += `<div style="font-size:11px;color:var(--brown-200);margin:6px 0 2px;">${group.icon} ${group.label}</div>`;
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;">';
    for (const id of group.ids) {
      const detected = ocrCounts[id] || 0;
      const selected = ocrSelected[id] || 0;
      totalSelected += selected;

      if (detected > 0 || selected > 0) {
        // 有检测到或被手动选中的卡：显示计数调节器
        html += `<div style="display:flex;align-items:center;gap:2px;background:var(--white);border-radius:12px;padding:3px 4px 3px 10px;border:2px solid var(--orange-300);">
          <span style="font-weight:700;font-size:13px;text-transform:uppercase;min-width:28px;">${id}</span>
          <button class="ocr-adj-btn" onclick="adjustOCR('${id}', -1)" style="width:28px;height:28px;border:none;border-radius:8px;background:var(--orange-50);font-size:18px;font-weight:700;color:var(--orange-600);cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
          <span style="min-width:18px;text-align:center;font-weight:800;font-size:15px;color:${selected>0?'var(--orange-600)':'var(--brown-200)'};">${selected}</span>
          <button class="ocr-adj-btn" onclick="adjustOCR('${id}', 1)" style="width:28px;height:28px;border:none;border-radius:8px;background:var(--orange-100);font-size:18px;font-weight:700;color:var(--orange-600);cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
        </div>`;
      } else {
        // 没检测到的卡：显示为可点击添加的小标签
        html += `<span class="ocr-chip" onclick="adjustOCR('${id}', 1)" style="opacity:0.5;">${id.toUpperCase()}</span>`;
      }
    }
    html += '</div>';
  }

  container.innerHTML = html;
  document.getElementById('ocrCount').textContent = totalSelected;

  // 显示奖品位比对提示
  const hint = document.getElementById('ocrExpectedHint');
  if (hint && ocrExpectedTotal > 0) {
    if (totalSelected === ocrExpectedTotal) {
      hint.innerHTML = '✅ 与奖品位一致';
      hint.style.color = '#4CAF50';
    } else if (totalSelected < ocrExpectedTotal) {
      hint.innerHTML = `⚠️ 还差 ${ocrExpectedTotal - totalSelected} 张`;
      hint.style.color = 'var(--danger)';
    } else {
      hint.innerHTML = `⚠️ 多了 ${totalSelected - ocrExpectedTotal} 张`;
      hint.style.color = 'var(--danger)';
    }
  } else if (hint) {
    hint.innerHTML = '';
  }
}

function adjustOCR(id, delta) {
  const cur = ocrSelected[id] || 0;
  const max = CATEGORIES[catOf(id)].max;
  const newVal = Math.max(0, Math.min(10, cur + delta));
  if (newVal === 0) {
    delete ocrSelected[id];
  } else {
    ocrSelected[id] = newVal;
  }
  renderOCR();
}

function selectAllOCR() {
  for (const id of ALL_CARD_IDS) {
    ocrSelected[id] = ocrCounts[id] || 0;
  }
  renderOCR();
}
function deselectAllOCR() {
  ocrSelected = {};
  renderOCR();
}

function confirmOCR() {
  const cards = [];
  for (const [id, cnt] of Object.entries(ocrSelected)) {
    if (cnt > 0) {
      for (let i = 0; i < cnt; i++) cards.push(id);
    }
  }
  if (cards.length === 0) { showToast('⚠️ 请先调整每张卡的数量（点 + 增加）'); return; }
  addCards(cards, 'ocr');
  clearOCR();
  showToast(`✅ 已添加 ${cards.length} 张卡`);
}

function clearOCR() {
  document.getElementById('uploadPreview').classList.remove('show');
  document.getElementById('previewImg').src = '';
  document.getElementById('ocrLoading').style.display = 'none';
  document.getElementById('ocrStatus').textContent = '🤖 识别到的卡号（点击 ± 调整数量）：';
  ocrCounts = {}; ocrSelected = {}; ocrExpectedTotal = 0;
  document.getElementById('ocrNumbers').innerHTML = '';
  document.getElementById('ocrCount').textContent = '0';
  const hint = document.getElementById('ocrExpectedHint');
  if (hint) hint.innerHTML = '';
}

// ==================== MANUAL INPUT ====================
function selectCategory(cat) {
  selectedCat = cat;
  currentNum = '';
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  renderNumpad();
  updateInputDisplay();
}

function renderNumpad() {
  const container = document.getElementById('numpadContainer');
  const maxNum = CATEGORIES[selectedCat].max;
  const nums = [];
  for (let i = 1; i <= maxNum; i++) nums.push(i);

  let html = '';
  for (const n of nums) {
    html += `<button class="numpad-btn" onclick="pressNum('${n}')">${n}</button>`;
  }
  // Fill remaining grid slots if any
  while (nums.length < 7) { html += '<div></div>'; nums.push(null); }
  html += `<button class="numpad-btn del" onclick="pressDel()">⌫</button>`;
  html += `<button class="numpad-btn add" onclick="pressAdd()">＋添加</button>`;

  container.innerHTML = html;
}

function pressNum(n) {
  currentNum = n;
  updateInputDisplay();
  // 在单抽模式下，选了数字后高亮，再次点添加
}
function pressDel() {
  currentNum = '';
  updateInputDisplay();
}
function updateInputDisplay() {
  const display = document.getElementById('inputDisplay');
  if (!currentNum) {
    display.innerHTML = '<span style="color:var(--brown-200);font-size:18px;">选类别 → 点数字 → 添加</span>';
  } else {
    const id = selectedCat + currentNum;
    const names = CARD_NAMES[currentPool];
    const def = CATEGORIES[selectedCat];
    const name = (names && names[id]) || '?';
    display.innerHTML = `<span>${id.toUpperCase()}</span><div class="preview">${def.icon} ${def.name} · ${name}</div>`;
  }
  document.getElementById('batchCnt').textContent = batchCards.length;
}

function pressAdd() {
  if (!currentNum) { showToast('⚠️ 请先选择数字'); return; }
  const id = selectedCat + currentNum;
  if (!ALL_CARD_IDS.includes(id)) { showToast('⚠️ 无效卡号'); return; }

  if (inputMode === 'single') {
    addCards([id], 'manual');
    showToast(`✅ 已添加 ${id.toUpperCase()}`);
  } else {
    batchCards.push(id);
    document.getElementById('batchCnt').textContent = batchCards.length;
    showToast(`✅ 已录 ${id.toUpperCase()}（${batchCards.length}/10）`);
    if (batchCards.length >= 10) {
      addCards([...batchCards], 'batch');
      showToast('✅ 十连已记录！');
      batchCards = [];
      document.getElementById('batchCnt').textContent = '0';
    }
  }
  currentNum = '';
  updateInputDisplay();
}

function setInputMode(mode) {
  inputMode = mode;
  document.getElementById('modeSingle').classList.toggle('active', mode === 'single');
  document.getElementById('modeBatch').classList.toggle('active', mode === 'batch');
  document.getElementById('batchInfo').style.display = mode === 'batch' ? 'block' : 'none';
  batchCards = [];
  document.getElementById('batchCnt').textContent = '0';
}

function undoLast() {
  const last = history[0];
  if (!last) { showToast('⚠️ 没有可撤销的记录'); return; }
  if (last.type === 'adjust') { showToast('⚠️ 请在卡片详情中调整'); return; }
  history.shift();
  for (const id of last.cards) {
    if (cardCounts[last.pool] && cardCounts[last.pool][id]) {
      cardCounts[last.pool][id] = Math.max(0, (cardCounts[last.pool][id] || 0) - 1);
    }
  }
  saveData(); updateStats(); renderCollection(); renderHistory(); renderBonus();
  showToast('↩ 已撤销');
}

// ==================== ADD CARDS ====================
function addCards(cards, type) {
  if (!cardCounts[currentPool]) cardCounts[currentPool] = {};
  for (const id of cards) {
    cardCounts[currentPool][id] = (cardCounts[currentPool][id] || 0) + 1;
  }
  history.unshift({ time: new Date().toISOString(), pool: currentPool, cards, type });
  saveData(); updateStats(); renderCollection(); renderHistory(); renderBonus();
}

// ==================== HISTORY ====================
function renderHistory() {
  const container = document.getElementById('historyList');
  if (history.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--brown-200);">🃏 还没有抽卡记录</div>';
    return;
  }
  container.innerHTML = history.map(h => {
    const t = new Date(h.time);
    const ts = `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    const pn = h.pool === 'xiari' ? '🏖️ 夏日池' : '🍊 橘暖池';
    const tl = { ocr:'📸截图', batch:'🔟十连', manual:'🂡单抽', adjust:'✏️调整' }[h.type] || h.type;
    const names = CARD_NAMES[h.pool] || {};
    return `<div class="history-item">
      <div class="history-header"><span class="history-pool">${pn} · ${tl}</span><span class="history-time">${ts}</span></div>
      <div class="history-cards">${h.cards.map(id => {
        const cat = catOf(id);
        return `<span class="history-chip chip-${cat}">${id.toUpperCase()} ${names[id]||'?'}</span>`;
      }).join('')}</div>
    </div>`;
  }).join('');
}
function clearHistory() {
  if (confirm('确定要清空所有记录吗？（卡牌数量不会丢失）')) { history = []; saveData(); renderHistory(); showToast('🗑 记录已清空'); }
}

// ==================== EXPORT ====================
function exportData() {
  const json = JSON.stringify({ cardCounts, history, milestones, cardImages, version: 2 }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  if (navigator.share) {
    const file = new File([json], '抽抽乐备份_' + new Date().toISOString().slice(0,10) + '.json', { type: 'application/json' });
    navigator.share({ files: [file], title: '抽抽乐数据备份' }).catch(() => {
      const a = document.createElement('a'); a.href = url; a.download = '抽抽乐备份.json'; a.click(); URL.revokeObjectURL(url);
    });
  } else {
    const a = document.createElement('a'); a.href = url; a.download = '抽抽乐备份.json'; a.click(); URL.revokeObjectURL(url);
  }
  showToast('💾 数据已备份');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.cardCounts) { showToast('⚠️ 无效的备份文件'); return; }
        cardCounts = data.cardCounts || { xiari: {}, junuan: {} };
        history = data.history || [];
        milestones = data.milestones || milestones;
        cardImages = data.cardImages || { xiari: {}, junuan: {} };
        saveData();
        updateStats(); renderCollection(); renderHistory(); renderBonus();
        showToast('📥 数据已导入');
      } catch(err) { showToast('⚠️ 文件格式错误'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAllData() {
  if (!confirm('⚠️ 确定要清空所有数据吗？（包括卡牌数量、记录、卡图）\n\n此操作不可恢复！建议先备份。')) return;
  cardCounts = { xiari: {}, junuan: {} };
  history = [];
  cardImages = { xiari: {}, junuan: {} };
  saveData();
  updateStats(); renderCollection(); renderHistory(); renderBonus();
  showToast('🗑 所有数据已清空');
}

// ==================== TOAST ====================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tid); t._tid = setTimeout(() => t.classList.remove('show'), 2000);
}

// ==================== IMAGE API ====================
function setCardImage(pool, id, frontBase64, backBase64) {
  if (!cardImages[pool]) cardImages[pool] = {};
  cardImages[pool][id] = { front: frontBase64, back: backBase64 || null };
  saveData(); renderCollection();
}

// ==================== STARTUP ====================
loadData();
switchTab('collection');
switchPool('xiari');
renderNumpad();
renderBonus();
