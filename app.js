// ==================== CARD DATA ====================
// 卡池配置：ranges = [卡牌类型, 稀有度, 起始编号, 结束编号]，同稀有度跨类型连续编号
const POOLS = {
  xiari: {
    name: '🏖️ 夏日池',
    imgDir: 'images/夏日池',
    ranges: [
      ['日常卡', 'r', 1, 9],
      ['日常卡', 'pr', 1, 3],
      ['音乐卡', 'sr', 1, 10],
      ['音乐卡', 'pr', 4, 8],
      ['涂鸦卡', 'ssr', 1, 5],
      ['路透卡', 'pr', 9, 18],
      ['拍立得', 'ur', 1, 4],
      ['镂空卡', 'hr', 1, 3],
      ['衣料卡', 'hr', 4, 4],
    ],
    specials: ['签名照', '晞咘咘', '泡泡玛特盲盒'],
    // 特典名 → 图片文件名（不含扩展名）映射；未列出的同名取图片
    specialImgs: {
      签名照: '签名照',
      晞咘咘: '棉花娃娃',
      泡泡玛特盲盒: '泡泡玛特盲盒',
    },
  },
  junuan: {
    name: '🍊 橘暖池',
    imgDir: 'images/橘暖池',
    ranges: [
      ['角色卡', 'r', 1, 14],
      ['角色卡', 'pr', 1, 9],
      ['拼图卡', 'sr', 1, 9],
      ['月历卡', 'ssr', 1, 12],
      ['工艺卡', 'sp', 1, 3],
      ['未公开角色卡', 'ur', 1, 2],
    ],
    specials: ['未公开亲签拍立得', '阿玛尼手链', '阿玛尼墨镜', '安热沙防晒'],
    specialImgs: {
      未公开亲签拍立得: '拍立得',
      阿玛尼手链: '手链',
      阿玛尼墨镜: '眼镜',
      安热沙防晒: '防晒',
    },
  },
};

const RARITY_INFO = {
  r: { label: 'R', icon: '🎵' },
  pr: { label: 'PR', icon: '📸' },
  sr: { label: 'SR', icon: '👗' },
  ssr: { label: 'SSR', icon: '💎' },
  ur: { label: 'UR', icon: '🏆' },
  hr: { label: 'HR', icon: '🎴' },
  sp: { label: 'SP', icon: '✨' },
  ex: { label: '特殊奖励', icon: '🎁' },
};

// 稳定渲染顺序
const RARITY_ORDER = ['r', 'pr', 'sr', 'ssr', 'sp', 'ur', 'hr', 'ex'];

// 缓存：每池的卡牌数组 / id 列表 / 稀有度顺序 / 卡牌类型顺序
const _poolCardsCache = {};
// 橘暖池 png 扩展名的卡（其余编号卡为 jpg）
const PNG_IDS = new Set(['r10', 'r11', 'r12', 'r13']);
// 编号卡图片路径：两池统一小写（橘暖池 r10-14 为 png 其余 jpg）
function numberedImgPath(pool, id) {
  const dir = POOLS[pool].imgDir;
  const ext = PNG_IDS.has(id) ? 'png' : 'jpg';
  return `${dir}/${id}.${ext}`;
}
// 特典卡图片路径
function specialImgPath(pool, name) {
  const def = POOLS[pool];
  const file = (def.specialImgs && def.specialImgs[name]) || name;
  return `${def.imgDir}/${file}.jpg`;
}
function poolCards(pool) {
  if (_poolCardsCache[pool]) return _poolCardsCache[pool];
  const def = POOLS[pool];
  const cards = [];
  for (const [type, rarity, start, end] of def.ranges) {
    for (let n = start; n <= end; n++) {
      const id = rarity + n;
      cards.push({
        id,
        type,
        rarity,
        num: n,
        name: type,
        img: numberedImgPath(pool, id),
      });
    }
  }
  def.specials.forEach((name, i) => {
    cards.push({
      id: 'ex' + (i + 1),
      type: '特殊奖励',
      rarity: 'ex',
      num: i + 1,
      name,
      img: specialImgPath(pool, name),
    });
  });
  _poolCardsCache[pool] = cards;
  return cards;
}
function poolIDs(pool) {
  return poolCards(pool).map(c => c.id);
}
// 该池出现的稀有度（按 RARITY_ORDER 排序）
function poolRarities(pool) {
  const set = new Set(poolCards(pool).map(c => c.rarity));
  return RARITY_ORDER.filter(r => set.has(r));
}
// 该池出现的卡牌类型（按 ranges 首次出现顺序，特典排末尾）
function poolTypes(pool) {
  const types = [];
  for (const [type] of POOLS[pool].ranges) {
    if (!types.includes(type)) types.push(type);
  }
  return types;
}
function cardByID(pool, id) {
  return poolCards(pool).find(c => c.id === id);
}
function maxNumForRarity(pool, rarity) {
  let max = 0;
  for (const c of poolCards(pool)) {
    if (c.rarity === rarity && c.num > max) max = c.num;
  }
  return max;
}

// ==================== STATE ====================
let cardCounts = { xiari: {}, junuan: {} };
let history = [];
let cardImages = { xiari: {}, junuan: {} };

// 个人满赠档位 — pool 字段为空=双池合计判定；指定 pool=单池抽数判定
// TR1=夏日池10抽, TR2=橘暖池10抽；其余按双池合计
const PERSONAL_BONUS = [
  { draws: 10, rewards: ['TR1'], pool: 'xiari' },
  { draws: 10, rewards: ['TR2'], pool: 'junuan' },
  { draws: 20, rewards: ['TR3'] },
  { draws: 30, rewards: ['TR4'] },
  { draws: 40, rewards: ['TR5', 'TR6'] },
  { draws: 50, rewards: ['TR7'] },
  { draws: 60, rewards: ['TR8'] },
  { draws: 70, rewards: ['TR9'] },
  { draws: 80, rewards: ['TR10'] },
  { draws: 90, rewards: ['TR11'] },
  { draws: 120, rewards: ['白瓷卡'] },
  { draws: 150, rewards: ['水敏卡'] },
  { draws: 180, rewards: ['仿真cd'] },
  { draws: 210, rewards: ['卡套'] },
  { draws: 240, rewards: ['仿真拍立得1'] },
  { draws: 270, rewards: ['仿真拍立得2'] },
  { draws: 300, rewards: ['许愿卡'] },
];
const PERSONAL_BONUS_TOTAL = 18; // TR1+TR2+TR5+TR6 等

// 奖励卡名 → 图片文件名映射（不含扩展名）
const REWARD_IMGS = {
  TR1: 'tr1',
  TR2: 'tr2',
  TR3: 'tr3',
  TR4: 'tr4',
  TR5: 'tr5',
  TR6: 'tr6',
  TR7: 'tr7',
  TR8: 'tr8',
  TR9: 'tr9',
  TR10: 'tr10',
  TR11: 'tr11',
  TR12: 'tr12',
  白瓷卡: 'tr12',
  水敏卡: '水敏卡',
  仿真cd: '仿真cd',
  卡套: '卡套',
  仿真拍立得1: '仿真拍立得',
  仿真拍立得2: '仿真拍立得2',
  许愿卡: '许愿卡',
  特典卡1: '特典1',
  特典卡2: '特典 2',
  特典卡3: '特典 3',
  特典卡4: '特典 4',
  特典卡5: '特典 5',
  特典卡6: '特典 6',
  特典卡7: '特典 7',
  限时卡1: '限时1',
  限时卡2: '限时2',
  限时卡3: '限时3',
  宣传卡: '宣传',
};
function rewardImg(name) {
  const dir = name.startsWith('特典')
    ? '全员满赠'
    : name.startsWith('限时') || name.startsWith('宣传')
      ? '额外奖励'
      : '个人满赠';
  return `images/${dir}/${REWARD_IMGS[name] || name}.jpg`;
}

// 全员满赠档位（全员抽数达标 + 个人双池合计>10抽 才解锁）— 特典卡1-7
const GLOBAL_BONUS = [
  { draws: 30000, card: '特典卡1' },
  { draws: 60000, card: '特典卡2' },
  { draws: 90000, card: '特典卡3' },
  { draws: 120000, card: '特典卡4' },
  { draws: 150000, card: '特典卡5' },
  { draws: 180000, card: '特典卡6' },
  { draws: 210000, card: '特典卡7' },
];
// 全员抽数（代码常量，手动更新）— 全员满赠按此值判定
const GLOBAL_TOTAL_DRAWS = 0;
// 个人满赠门槛：全员达标后还需个人双池合计 > 此值才有资格获取特典卡
const GLOBAL_PERSONAL_MIN = 10;
let currentPool = 'xiari';
let currentTab = 'collection';
let groupMode = 'type'; // 'rarity' | 'type'
let ocrCounts = {}; // OCR检测到的每张卡的数量 { pr2: 2, r3: 1 }
let ocrSelected = {}; // 用户调整后的数量 { pr2: 2, r3: 1 }，0 表示剔除
let ocrExpectedTotal = 0; // 从奖品编号检测到的本轮总抽数
let modalCard = null;
// 额外奖励（限时礼 / 宣传礼）用户确认状态
let extraRewards = { 限时时段: null, 宣传达标: false, 宣传下单时间: '' };

// ==================== PERSISTENCE ====================
function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem('ccg2_data') || '{}');
    cardCounts = d.cardCounts || { xiari: {}, junuan: {} };
    history = d.history || [];
    cardImages = d.cardImages || { xiari: {}, junuan: {} };
    extraRewards = d.extraRewards || {
      限时时段: null,
      宣传达标: false,
      宣传下单时间: '',
    };
  } catch (e) {}
  // 迁移：删除新卡池中不存在的旧 id（如旧 xiari 的 r9/r10/r11）
  for (const pool of ['xiari', 'junuan']) {
    const valid = new Set(poolIDs(pool));
    if (cardCounts[pool]) {
      for (const id of Object.keys(cardCounts[pool])) {
        if (!valid.has(id)) delete cardCounts[pool][id];
      }
    }
    if (cardImages[pool]) {
      for (const id of Object.keys(cardImages[pool])) {
        if (!valid.has(id)) delete cardImages[pool][id];
      }
    }
  }
}
function saveData() {
  localStorage.setItem(
    'ccg2_data',
    JSON.stringify({
      cardCounts,
      history,
      cardImages,
      extraRewards,
      version: 3,
    }),
  );
}

// ==================== HELPERS ====================
function catOf(id) {
  return id.replace(/\d+/, '');
}
function numOf(id) {
  return parseInt(id.replace(/[a-zA-Z]+/, ''));
}
function cardInfo(id) {
  return cardByID(currentPool, id);
}

// 双池合计抽数（按下单 id 合并计算，即所有卡的计数总和）
function totalDraws() {
  let total = 0;
  for (const pool of ['xiari', 'junuan']) {
    for (const cnt of Object.values(cardCounts[pool] || {})) total += cnt;
  }
  return total;
}
// 双池合计去重收集数（不含 ex 特典卡）
function collectedCount() {
  let count = 0;
  for (const pool of ['xiari', 'junuan']) {
    const c = cardCounts[pool] || {};
    for (const card of poolCards(pool)) {
      if (card.rarity === 'ex') continue;
      if ((c[card.id] || 0) > 0) count++;
    }
  }
  return count;
}
// 双池普通卡总数（不含 ex）
function poolTotalCount() {
  let count = 0;
  for (const pool of ['xiari', 'junuan']) {
    for (const card of poolCards(pool)) {
      if (card.rarity === 'ex') continue;
      count++;
    }
  }
  return count;
}
// 单池抽数
function poolDraws(pool) {
  let n = 0;
  for (const cnt of Object.values(cardCounts[pool] || {})) n += cnt;
  return n;
}
// 个人满赠档位是否解锁：单池档位按该池抽数，双池档位按合计
function personalTierUnlocked(m) {
  const val = m.pool ? poolDraws(m.pool) : totalDraws();
  return val >= m.draws;
}
// 个人满赠已解锁奖励卡数
function personalUnlockedCount() {
  let n = 0;
  for (const m of PERSONAL_BONUS) {
    if (personalTierUnlocked(m)) n += m.rewards.length;
  }
  return n;
}
// 全员满赠已解锁特典卡数（全员抽数达标 且 个人>10抽 才解锁）
function globalUnlockedCount() {
  const personalEligible = totalDraws() > GLOBAL_PERSONAL_MIN;
  let n = 0;
  for (const m of GLOBAL_BONUS) {
    if (GLOBAL_TOTAL_DRAWS >= m.draws && personalEligible) n++;
  }
  return n;
}
// 限时卡是否解锁（按用户确认的下单时段）
function limitedUnlocked(name) {
  const t = extraRewards.限时时段;
  if (!t) return false;
  const set =
    t === '0-2'
      ? ['限时卡1', '限时卡2', '限时卡3']
      : t === '3-6'
        ? ['限时卡1', '限时卡2']
        : t === '7-24'
          ? ['限时卡3']
          : [];
  return set.includes(name);
}
// 宣传卡是否解锁（有抽卡记录 + 用户自勾达标）
function promoUnlocked() {
  return totalDraws() > 0 && !!extraRewards.宣传达标;
}
// 限时礼已解锁卡数（0/2/3）
function limitedUnlockedCount() {
  const t = extraRewards.限时时段;
  if (t === '0-2') return 3;
  if (t === '3-6') return 2;
  if (t === '7-24') return 1;
  return 0;
}
// 额外奖励已解锁总数（限时 + 宣传）
function extraUnlockedCount() {
  return limitedUnlockedCount() + (promoUnlocked() ? 1 : 0);
}
const EXTRA_TOTAL = 4; // 限时3 + 宣传1

// ==================== POOL & TAB ====================
function switchPool(pool) {
  currentPool = pool;
  document
    .querySelectorAll('.pool-tab')
    .forEach(b => b.classList.toggle('active', b.dataset.pool === pool));
  renderCollection();
  updateStats();
  renderPanels();
  if (currentTab === 'entry') renderEntry();
}
function switchTab(tab) {
  currentTab = tab;
  // 切换页面时滚动到顶部
  const content = document.getElementById('mainContent');
  if (content) content.scrollTop = 0;
  document
    .querySelectorAll('.tab-page')
    .forEach(p => p.classList.remove('active'));
  document
    .querySelectorAll('.tab-item')
    .forEach(t => t.classList.remove('active'));
  const p = document.getElementById('tab-' + tab);
  if (p) p.classList.add('active');
  const b = document.querySelector(`.tab-item[data-tab="${tab}"]`);
  if (b) b.classList.add('active');
  // 分组切换图标仅在收藏页显示
  const gm = document.getElementById('groupMenu');
  if (gm) gm.style.display = tab === 'collection' ? '' : 'none';
  if (tab === 'collection') {
    renderCollection();
    updateStats();
    renderPanels();
  }
  if (tab === 'history') renderHistory();
  if (tab === 'entry' && currentSubTab === 'input') renderEntry();
}

// 录入页子页签切换
let currentSubTab = 'input';
function switchSubTab(sub) {
  currentSubTab = sub;
  document
    .querySelectorAll('.sub-tab')
    .forEach(t => t.classList.toggle('active', t.dataset.sub === sub));
  document
    .querySelectorAll('.sub-page')
    .forEach(p => p.classList.remove('active'));
  const p = document.getElementById('sub-' + sub);
  if (p) p.classList.add('active');
  if (sub === 'input') renderEntry();
}

// ==================== STATS ====================
function updateStats() {
  const c = cardCounts[currentPool] || {};
  // 两池总抽数
  let total = 0;
  for (const pool of ['xiari', 'junuan']) {
    for (const cnt of Object.values(cardCounts[pool] || {})) total += cnt;
  }

  // 渲染统计行：总抽数 + 当前池按分组维度统计
  const row = document.getElementById('statsRow');
  if (!row) return;
  let html = `<div class="stat-card"><div class="num orange">${total}</div><div class="lbl">总抽数</div></div>`;

  if (groupMode === 'rarity') {
    // 按稀有度
    const totals = {};
    for (const [id, cnt] of Object.entries(c)) {
      const card = cardByID(currentPool, id);
      if (!card) continue;
      totals[card.rarity] = (totals[card.rarity] || 0) + cnt;
    }
    for (const r of poolRarities(currentPool)) {
      html += `<div class="stat-card"><div class="num ${r}-num">${totals[r] || 0}</div><div class="lbl">${RARITY_INFO[r].label}</div></div>`;
    }
  } else {
    // 按卡牌类型（不含特典）
    const totals = {};
    for (const [id, cnt] of Object.entries(c)) {
      const card = cardByID(currentPool, id);
      if (!card || card.rarity === 'ex') continue;
      totals[card.type] = (totals[card.type] || 0) + cnt;
    }
    for (const t of poolTypes(currentPool)) {
      html += `<div class="stat-card"><div class="num">${totals[t] || 0}</div><div class="lbl">${t}</div></div>`;
    }
  }
  row.innerHTML = html;
}

// 渲染所有进度板块
function renderPanels() {
  renderOverview();
  renderBonus();
  renderRewardPool();
}

// ==================== REWARD POOL (奖励卡池) ====================
function renderRewardPool() {
  const panel = document.getElementById('rewardPool');
  if (!panel) return;
  const total = totalDraws();
  const personalEligible = total > GLOBAL_PERSONAL_MIN;

  // 个人满赠奖励卡
  const personalCards = [];
  PERSONAL_BONUS.forEach(m => {
    const unlocked = personalTierUnlocked(m);
    const tierLabel = m.pool
      ? `${m.pool === 'xiari' ? '夏日' : '橘暖'}池${m.draws}抽`
      : `${m.draws}抽`;
    m.rewards.forEach(name =>
      personalCards.push({
        name,
        source: '个人满赠',
        tier: tierLabel,
        unlocked,
      }),
    );
  });
  // 全员满赠奖励卡
  const globalCards = GLOBAL_BONUS.map(m => ({
    name: m.card,
    source: '全员满赠',
    tier: fmtWan(m.draws) + '抽',
    unlocked: GLOBAL_TOTAL_DRAWS >= m.draws && personalEligible,
  }));

  const renderGroup = (title, sub, cards, colorClass) => {
    const cells = cards
      .map(c => {
        const img = rewardImg(c.name);
        const phHTML = c.unlocked
          ? `<img src="${img}" alt="${c.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="reward-ph" style="display:none;">🎁</span>`
          : `<img src="${img}" alt="${c.name}" class="locked-img"><span class="reward-ph locked-emoji">🔒</span>`;
        return `<div class="reward-cell ${c.unlocked ? 'unlocked' : 'locked'} ${colorClass}" onclick="openRewardModal('${c.name}','${title.replace(/'/g, '')}','${c.tier}',${c.unlocked})">
        <div class="reward-ph-wrap">${phHTML}</div>
        <div class="reward-name">${c.name}</div>
        <div class="reward-tier">${c.unlocked ? '已解锁' : c.tier}</div>
      </div>`;
      })
      .join('');
    return `<div class="reward-group">
      <div class="reward-group-head"><span>${title}</span><span class="reward-group-sub">${sub}</span></div>
      <div class="reward-grid">${cells}</div>
    </div>`;
  };

  const pUnlocked = personalCards.filter(c => c.unlocked).length;
  const gUnlocked = globalCards.filter(c => c.unlocked).length;

  // 限时礼 / 宣传礼（带确认按钮的分组）
  const limitedCards = [
    {
      name: '限时卡1',
      tier: '0-2h / 3-6h',
      unlocked: limitedUnlocked('限时卡1'),
    },
    {
      name: '限时卡2',
      tier: '0-2h / 3-6h',
      unlocked: limitedUnlocked('限时卡2'),
    },
    {
      name: '限时卡3',
      tier: '0-2h / 7-24h',
      unlocked: limitedUnlocked('限时卡3'),
    },
  ];
  const promoCards = [
    { name: '宣传卡', tier: '达标+有记录', unlocked: promoUnlocked() },
  ];
  const lUnlocked = limitedCards.filter(c => c.unlocked).length;
  const rUnlocked = promoCards.filter(c => c.unlocked).length;
  const lConfirmed = !!extraRewards.限时时段;
  const rConfirmed = !!extraRewards.宣传达标;

  const renderConfirmGroup = (
    title,
    sub,
    cards,
    colorClass,
    confirmed,
    onConfirm,
  ) => `
    <div class="reward-group">
      <div class="reward-group-head">
        <span>${title}</span>
        <button class="reward-confirm-btn${confirmed ? ' done' : ''}" onclick="${onConfirm}">${confirmed ? '已确认 ✓' : '去确认'}</button>
      </div>
      <div class="reward-grid">${cards
        .map(c => {
          const img = rewardImg(c.name);
          const phHTML = c.unlocked
            ? `<img src="${img}" alt="${c.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="reward-ph" style="display:none;">🎁</span>`
            : `<img src="${img}" alt="${c.name}" class="locked-img"><span class="reward-ph locked-emoji">🔒</span>`;
          return `<div class="reward-cell ${c.unlocked ? 'unlocked' : 'locked'} ${colorClass}" onclick="openRewardModal('${c.name}','${title.replace(/'/g, '').replace(/🍏|🍉/g, '').trim()}','${c.tier}',${c.unlocked})">
          <div class="reward-ph-wrap">${phHTML}</div>
          <div class="reward-name">${c.name}</div>
          <div class="reward-tier">${c.unlocked ? '已解锁' : c.tier}</div>
        </div>`;
        })
        .join('')}</div>
    </div>`;

  panel.innerHTML = `
    <div class="panel-title"><span class="title-bar"></span>奖励卡池 <span class="panel-sub">满赠自动解锁，不可手动加减</span></div>
    ${renderGroup('个人满赠', `${pUnlocked}/${PERSONAL_BONUS_TOTAL}`, personalCards, 'rw-personal')}
    ${renderGroup('全员满赠', `${gUnlocked}/${GLOBAL_BONUS.length}`, globalCards, 'rw-global')}
    ${renderConfirmGroup('限时礼', `${lUnlocked}/3`, limitedCards, 'rw-limited', lConfirmed, 'openLimitedConfirm()')}
    ${renderConfirmGroup('宣传礼', `${rUnlocked}/1`, promoCards, 'rw-promo', rConfirmed, 'openPromoConfirm()')}
  `;
}

// ==================== OVERVIEW (总统计) ====================
function renderOverview() {
  const panel = document.getElementById('overviewPanel');
  if (!panel) return;
  const total = totalDraws();
  const collected = collectedCount();
  const poolTotal = poolTotalCount();
  const rewardUnlocked =
    personalUnlockedCount() + globalUnlockedCount() + extraUnlockedCount();
  const rewardTotal = PERSONAL_BONUS_TOTAL + GLOBAL_BONUS.length + EXTRA_TOTAL; // 18 + 7 + 4 = 29

  const poolPct = poolTotal ? Math.round((collected / poolTotal) * 100) : 0;
  const rewardPct = Math.round((rewardUnlocked / rewardTotal) * 100);

  panel.innerHTML = `
    <div class="panel-title"><span class="title-bar"></span>总统计<button class="overview-btn" onclick="openOverviewModal()">📋 总览</button></div>
    <div class="overview-grid">
      <div class="ov-card">
        <div class="ov-label">双池总抽数</div>
        <div class="ov-num orange">${total}</div>
      </div>
      <div class="ov-card">
        <div class="ov-label">双池图鉴总进度</div>
        <div class="ov-num">${collected}<span class="ov-slash">/${poolTotal}</span></div>
        <div class="ov-bar-wrap"><div class="ov-bar" style="width:${poolPct}%"></div></div>
        <div class="ov-pct">${poolPct}%</div>
        <div class="ov-note">不含特殊奖励</div>
      </div>
      <div class="ov-card">
        <div class="ov-label">奖励卡池总进度</div>
        <div class="ov-num">${rewardUnlocked}<span class="ov-slash">/${rewardTotal}</span></div>
        <div class="ov-bar-wrap"><div class="ov-bar reward" style="width:${rewardPct}%"></div></div>
        <div class="ov-pct">${rewardPct}%</div>
        <div class="ov-note">含满赠 + 限时礼 + 宣传礼</div>
      </div>
    </div>
  `;
}

// ==================== OVERVIEW MODAL (总览弹窗) ====================
let overviewTab = 'owned';
// 汇总所有展示卡：双池普通卡(不含ex) + 奖励卡
function overviewCards() {
  const list = [];
  // 双池普通卡（不含特典）
  for (const pool of ['xiari', 'junuan']) {
    const c = cardCounts[pool] || {};
    for (const card of poolCards(pool)) {
      if (card.rarity === 'ex') continue;
      list.push({
        name: card.name,
        img: card.img,
        owned: (c[card.id] || 0) > 0,
        sub: POOLS[pool].name,
      });
    }
  }
  // 奖励卡（个人满赠）
  PERSONAL_BONUS.forEach(m => {
    m.rewards.forEach(name =>
      list.push({
        name,
        img: rewardImg(name),
        owned: personalTierUnlocked(m),
        sub: '个人满赠',
      }),
    );
  });
  // 全员满赠
  const personalEligible = totalDraws() > GLOBAL_PERSONAL_MIN;
  GLOBAL_BONUS.forEach(m => {
    list.push({
      name: m.card,
      img: rewardImg(m.card),
      owned: GLOBAL_TOTAL_DRAWS >= m.draws && personalEligible,
      sub: '全员满赠',
    });
  });
  // 限时礼
  ['限时卡1', '限时卡2', '限时卡3'].forEach(name =>
    list.push({
      name,
      img: rewardImg(name),
      owned: limitedUnlocked(name),
      sub: '限时礼',
    }),
  );
  // 宣传礼
  list.push({
    name: '宣传卡',
    img: rewardImg('宣传卡'),
    owned: promoUnlocked(),
    sub: '宣传礼',
  });
  return list;
}

function renderOverviewTab() {
  const body = document.getElementById('overviewBody');
  if (!body) return;
  const all = overviewCards();
  const filtered =
    overviewTab === 'owned'
      ? all.filter(c => c.owned)
      : all.filter(c => !c.owned);
  const cells = filtered
    .map(
      c => `
    <div class="ov-card-cell">
      <div class="ov-card-img-wrap"><img src="${c.img}" alt="${c.name}" onerror="this.style.display='none'"></div>
      <div class="ov-card-name">${c.name}</div>
      <div class="ov-card-sub">${c.sub}</div>
    </div>`,
    )
    .join('');
  body.innerHTML = `<div class="ov-count">${overviewTab === 'owned' ? '✅ 已拥有' : '🔒 未拥有'} ${filtered.length} 张</div>
    <div class="ov-grid">${filtered.length ? cells : '<div style="text-align:center;color:var(--brown-200);padding:30px;grid-column:1/-1;">暂无</div>'}</div>`;
}

function openOverviewModal() {
  overviewTab = 'owned';
  document
    .querySelectorAll('.overview-tab')
    .forEach(t => t.classList.toggle('active', t.dataset.otab === 'owned'));
  renderOverviewTab();
  document.getElementById('overviewModal').style.display = 'flex';
}
function switchOvTab(tab) {
  overviewTab = tab;
  document
    .querySelectorAll('.overview-tab')
    .forEach(t => t.classList.toggle('active', t.dataset.otab === tab));
  renderOverviewTab();
}
function closeOverviewModal() {
  document.getElementById('overviewModal').style.display = 'none';
}

// ==================== BONUS (个人 + 全员 满赠) ====================
// 个人下一档：所有未解锁档位中，还差抽数最少的（单池档按该池，双池档按合计）
function nextPersonalTier() {
  const total = totalDraws();
  let best = null,
    bestGap = Infinity;
  for (const m of PERSONAL_BONUS) {
    const val = m.pool ? poolDraws(m.pool) : total;
    if (val >= m.draws) continue; // 已解锁
    const gap = m.draws - val;
    if (gap < bestGap) {
      bestGap = gap;
      best = m;
    }
  }
  return best;
}
function nextGlobalTier() {
  return GLOBAL_BONUS.find(m => GLOBAL_TOTAL_DRAWS < m.draws) || null;
}
function fmtWan(n) {
  return n / 10000 + '万';
}

function renderBonus() {
  const panel = document.getElementById('bonusPanel');
  if (!panel) return;
  const total = totalDraws();
  const personalEligible = total > GLOBAL_PERSONAL_MIN;
  const pUnlocked = personalUnlockedCount();
  const gUnlocked = globalUnlockedCount();

  // 个人下一档
  const pNext = nextPersonalTier();
  let pCard;
  if (pNext) {
    const pVal = pNext.pool ? poolDraws(pNext.pool) : total;
    const pct = Math.min(100, Math.round((pVal / pNext.draws) * 100));
    const pLabel = pNext.pool
      ? `${pNext.pool === 'xiari' ? '夏日' : '橘暖'}池${pNext.draws}`
      : `${pNext.draws}`;
    pCard = `<div class="bn-next">
      <div class="bn-next-head"><span class="bn-next-label">下一档</span><span class="bn-next-draws">${pLabel}抽</span></div>
      <div class="bn-next-reward">🔒 ${pNext.rewards.join(' + ')}</div>
      <div class="bn-bar-wrap"><div class="bn-bar" style="width:${pct}%"></div></div>
      <div class="bn-next-foot"><span>${pVal}/${pNext.draws}</span><span>还差 ${pNext.draws - pVal} 抽</span></div>
    </div>`;
  } else {
    pCard = `<div class="bn-next done"><div class="bn-next-reward">✅ 全部解锁</div></div>`;
  }

  // 全员下一档
  const gNext = nextGlobalTier();
  let gCard;
  if (gNext) {
    const pct = Math.min(
      100,
      Math.round((GLOBAL_TOTAL_DRAWS / gNext.draws) * 100),
    );
    const blocked = GLOBAL_TOTAL_DRAWS >= gNext.draws && !personalEligible;
    const foot = blocked
      ? `待个人 > ${GLOBAL_PERSONAL_MIN} 抽`
      : personalEligible
        ? `还差 ${fmtWan(gNext.draws - GLOBAL_TOTAL_DRAWS)}`
        : `还需个人 > ${GLOBAL_PERSONAL_MIN} 抽`;
    gCard = `<div class="bn-next">
      <div class="bn-next-head"><span class="bn-next-label">下一档</span><span class="bn-next-draws">${fmtWan(gNext.draws)}抽</span></div>
      <div class="bn-next-reward">🔒 ${gNext.card}</div>
      <div class="bn-bar-wrap"><div class="bn-bar" style="width:${pct}%"></div></div>
      <div class="bn-next-foot"><span>${fmtWan(GLOBAL_TOTAL_DRAWS)}/${fmtWan(gNext.draws)}</span><span>${foot}</span></div>
    </div>`;
  } else {
    gCard = `<div class="bn-next done"><div class="bn-next-reward">✅ 全部解锁</div></div>`;
  }

  panel.innerHTML = `
    <div class="bn-grid">
      <div class="bn-cell">
        <div class="bn-cell-head"><span>个人满赠</span><button class="bn-detail-btn" onclick="openBonusDetail('personal')">详情</button></div>
        <div class="bn-cell-sub">已解锁 ${pUnlocked}/${PERSONAL_BONUS_TOTAL} · 双池合计 ${total} 抽</div>
        ${pCard}
      </div>
      <div class="bn-cell">
        <div class="bn-cell-head"><span>全员满赠</span><button class="bn-detail-btn" onclick="openBonusDetail('global')">详情</button></div>
        <div class="bn-cell-sub">已解锁 ${gUnlocked}/${GLOBAL_BONUS.length} · 全员 ${fmtWan(GLOBAL_TOTAL_DRAWS)}</div>
        ${gCard}
      </div>
    </div>
    <div class="bn-note">全员满赠数据每日24点更新</div>
  `;
}

function openBonusDetail(type) {
  const total = totalDraws();
  const personalEligible = total > GLOBAL_PERSONAL_MIN;
  let title, body;

  if (type === 'personal') {
    title = '个人满赠详情';
    body = `<div class="bm-sub">双池合计 ${total} 抽（夏日 ${poolDraws('xiari')} / 橘暖 ${poolDraws('junuan')}）· 已解锁 ${personalUnlockedCount()}/${PERSONAL_BONUS_TOTAL}</div>`;
    body += PERSONAL_BONUS.map(m => {
      const unlocked = personalTierUnlocked(m);
      const val = m.pool ? poolDraws(m.pool) : total;
      const label = m.pool
        ? `${m.pool === 'xiari' ? '夏日' : '橘暖'}${m.draws}`
        : `${m.draws}`;
      const pct = Math.min(100, Math.round((val / m.draws) * 100));
      const countText = unlocked
        ? `${m.rewards.length}张已解锁`
        : `${val}/${m.draws}`;
      return `<div class="ms-row ${unlocked ? 'done' : ''}">
        <span class="ms-label">${label}抽</span>
        <div class="ms-bar-wrap"><div class="ms-bar-fill${unlocked ? ' done' : ''}" style="width:${pct}%"></div></div>
        <span class="ms-reward">${unlocked ? '✅ ' : '🔒 '}${m.rewards.join(' + ')}</span>
        <span class="ms-count">${countText}</span>
      </div>`;
    }).join('');
  } else {
    title = '全员满赠详情';
    body = `<div class="bm-sub">全员抽数 ${fmtWan(GLOBAL_TOTAL_DRAWS)} · 个人 ${total} 抽${personalEligible ? '' : '（未达 ' + GLOBAL_PERSONAL_MIN + ' 抽门槛）'} · 已解锁 ${globalUnlockedCount()}/${GLOBAL_BONUS.length}</div>`;
    if (!personalEligible) {
      body += `<div class="ms-hint">⚠️ 全员达标后还需个人双池合计 &gt; ${GLOBAL_PERSONAL_MIN} 抽才有资格解锁</div>`;
    }
    body += GLOBAL_BONUS.map(m => {
      const globalDone = GLOBAL_TOTAL_DRAWS >= m.draws;
      const unlocked = globalDone && personalEligible;
      const pct = Math.min(
        100,
        Math.round((GLOBAL_TOTAL_DRAWS / m.draws) * 100),
      );
      const countText = unlocked
        ? '已解锁'
        : globalDone
          ? '待个人达标'
          : `${fmtWan(GLOBAL_TOTAL_DRAWS)}/${fmtWan(m.draws)}`;
      return `<div class="ms-row ${unlocked ? 'done' : ''}">
        <span class="ms-label">${fmtWan(m.draws)}抽</span>
        <div class="ms-bar-wrap"><div class="ms-bar-fill${unlocked ? ' done' : ''}" style="width:${pct}%"></div></div>
        <span class="ms-reward">${unlocked ? '✅ ' : '🔒 '}${m.card}</span>
        <span class="ms-count">${countText}</span>
      </div>`;
    }).join('');
  }

  document.getElementById('bonusModalTitle').textContent = title;
  document.getElementById('bonusModalBody').innerHTML = body;
  document.getElementById('bonusModal').style.display = 'flex';
}
function closeBonusModal() {
  document.getElementById('bonusModal').style.display = 'none';
}

// ==================== 额外奖励确认（限时礼 / 宣传礼）====================
let extraModalMode = null; // 'limited' | 'promo'
const LIMITED_TIERS = [
  { key: '0-2', label: '开售 0-2 小时', rewards: '限时卡1、2、3' },
  { key: '3-6', label: '开售 3-6 小时', rewards: '限时卡1、2' },
  { key: '7-24', label: '开售 7-24 小时', rewards: '限时卡3' },
];

function openLimitedConfirm() {
  extraModalMode = 'limited';
  const cur = extraRewards.限时时段;
  const opts = LIMITED_TIERS.map(
    t => `
    <label class="extra-opt ${cur === t.key ? 'active' : ''}" data-val="${t.key}">
      <input type="radio" name="limitedTier" value="${t.key}" ${cur === t.key ? 'checked' : ''}>
      <div class="extra-opt-main"><div class="extra-opt-label">${t.label}</div><div class="extra-opt-sub">赠 ${t.rewards}</div></div>
    </label>`,
  ).join('');
  document.getElementById('extraModalTitle').textContent = '限时礼';
  document.getElementById('extraModalBody').innerHTML = `
    <div class="bm-sub">选择你的下单时段，解锁对应限时卡</div>
    <div class="extra-opts">${opts}</div>`;
  document.getElementById('extraModal').style.display = 'flex';
}

function openPromoConfirm() {
  extraModalMode = 'promo';
  const hasRecord = totalDraws() > 0;
  const cur = extraRewards;
  document.getElementById('extraModalTitle').textContent = '宣传礼';
  document.getElementById('extraModalBody').innerHTML = `
    <div class="bm-sub">在 xhs/dy/ks 发布奇妙浆果园 ccl 相关内容并满 52👍，且需有盲盒下单记录</div>
    ${hasRecord ? '' : '<div class="ms-hint">⚠️ 当前无抽卡记录，需先在录入页添加至少 1 张卡</div>'}
    <label class="extra-opt ${cur.宣传达标 ? 'active' : ''}" data-val="promo">
      <input type="checkbox" id="promoDone" ${cur.宣传达标 ? 'checked' : ''} ${hasRecord ? '' : 'disabled'}>
      <div class="extra-opt-main"><div class="extra-opt-label">宣传已达标（满 52👍）</div></div>
    </label>`;
  document.getElementById('extraModal').style.display = 'flex';
}

function confirmExtraModal() {
  if (extraModalMode === 'limited') {
    const checked = document.querySelector('input[name="limitedTier"]:checked');
    extraRewards.限时时段 = checked ? checked.value : null;
  } else if (extraModalMode === 'promo') {
    extraRewards.宣传达标 = !!document.getElementById('promoDone').checked;
  }
  saveData();
  closeExtraModal();
  renderRewardPool();
  showToast('✅ 已保存');
}

function closeExtraModal() {
  document.getElementById('extraModal').style.display = 'none';
  extraModalMode = null;
}

// ==================== COLLECTION ====================
function toggleGroupMenu(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('groupDropdown');
  if (dd) dd.classList.toggle('show');
}
function closeGroupMenu() {
  const dd = document.getElementById('groupDropdown');
  if (dd) dd.classList.remove('show');
}
function setGroupMode(mode) {
  groupMode = mode;
  document.getElementById('groupIconLabel').textContent =
    mode === 'rarity' ? '稀有度' : '卡牌类型';
  document
    .querySelectorAll('.group-option')
    .forEach(o => o.classList.toggle('active', o.dataset.group === mode));
  closeGroupMenu();
  renderCollection();
  updateStats();
}

function renderCollection() {
  const grid = document.getElementById('collectionGrid');
  const c = cardCounts[currentPool] || {};
  const cards = poolCards(currentPool);

  // 分组定义：[组标题, 过滤谓词]
  let groups;
  if (groupMode === 'rarity') {
    groups = poolRarities(currentPool).map(r => ({
      title: `${RARITY_INFO[r].icon} ${RARITY_INFO[r].label}`,
      cls: r + '-title',
      cards: cards.filter(card => card.rarity === r),
    }));
  } else {
    // 按卡牌类型
    groups = poolTypes(currentPool).map(t => ({
      title: t,
      cls: 'type-title',
      cards: cards.filter(card => card.type === t),
    }));
  }
  // 特殊卡牌（特典）独立放最末，仅在按稀有度模式已被含入；按类型模式单独成组
  if (groupMode === 'type') {
    const exCards = cards.filter(card => card.rarity === 'ex');
    if (exCards.length) {
      groups.push({ title: '🎁 特殊奖励', cls: 'ex-title', cards: exCards });
    }
  }

  let html = '';
  for (const g of groups) {
    const total = g.cards.length;
    const collected = g.cards.filter(card => (c[card.id] || 0) > 0).length;
    const allDone = collected === total;
    html += `<div class="rarity-section"><div class="rarity-title ${g.cls}">${g.title}<span class="group-count${allDone ? ' all' : ''}">${collected}/${total}</span></div><div class="card-grid">`;
    html += g.cards
      .map(card => {
        const imgs =
          cardImages[currentPool] && cardImages[currentPool][card.id];
        const idText = card.rarity === 'ex' ? '★' : card.id.toUpperCase();
        const imgSrc = (imgs && imgs.front) || card.img;
        const imgHTML = imgSrc
          ? `<img src="${imgSrc}" alt="${card.id}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;">${idText}</span>`
          : `<span>${idText}</span>`;
        const nameText = card.rarity === 'ex' ? card.name : card.name;
        return `<div class="card-cell ${card.rarity} ${(c[card.id] || 0) > 0 ? 'has' : 'zero'}" data-count="${c[card.id] || 0}" onclick="openModal('${card.id}')">
        <div class="placeholder" data-cid="${idText}">${imgHTML}</div>
        <div class="cid">${idText}</div>
        <div class="cname">${nameText}</div>
        <div class="badge">${c[card.id] || 0}</div>
      </div>`;
      })
      .join('');
    html += '</div></div>';
  }
  grid.innerHTML = html;
}

// ==================== MODAL ====================
function openModal(id) {
  modalCard = id;
  const c = cardCounts[currentPool] || {};
  const card = cardByID(currentPool, id);
  if (!card) return;
  // 清除奖励卡详情可能残留的样式
  document.getElementById('modalFrontImg').classList.remove('locked-img');
  document.getElementById('modalFrontPH').classList.remove('locked-emoji-ph');

  document.getElementById('modalCid').textContent =
    card.rarity === 'ex' ? '★' : id.toUpperCase();
  document.getElementById('modalName').textContent = card.name;
  document.getElementById('modalRarity').textContent =
    `${RARITY_INFO[card.rarity].icon} ${RARITY_INFO[card.rarity].label}`;
  document.getElementById('modalCount').textContent = c[id] || 0;
  document.getElementById('modalCountLine').innerHTML =
    `持有 <span id="modalCount">${c[id] || 0}</span> 张`;

  const front = document.getElementById('modalFront');
  front.className = 'modal-face front ' + card.rarity + '-face';
  const imgs = cardImages[currentPool] && cardImages[currentPool][id];
  const imgSrc = (imgs && imgs.front) || card.img;
  const frontImg = document.getElementById('modalFrontImg');
  if (imgSrc) {
    frontImg.src = imgSrc;
    frontImg.style.display = 'block';
    frontImg.onerror = function () {
      this.style.display = 'none';
      document.getElementById('modalFrontPH').style.display = 'flex';
      document.getElementById('modalFrontPH').textContent =
        card.rarity === 'ex' ? '🎁' : RARITY_INFO[card.rarity].icon || '🃏';
    };
    document.getElementById('modalFrontPH').style.display = 'none';
  } else {
    frontImg.style.display = 'none';
    document.getElementById('modalFrontPH').style.display = 'block';
    document.getElementById('modalFrontPH').textContent =
      card.rarity === 'ex' ? '🎁' : RARITY_INFO[card.rarity].icon || '🃏';
  }
  document.getElementById('cardModal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('cardModal').style.display = 'none';
  modalCard = null;
}

// 奖励卡详情（复用 cardModal，结构与双卡池一致）
function openRewardModal(name, source, tier, unlocked) {
  document.getElementById('modalCid').textContent = name;
  document.getElementById('modalName').textContent = source;
  document.getElementById('modalRarity').textContent = unlocked
    ? '✅ 已解锁'
    : '🔒 未解锁';
  document.getElementById('modalCountLine').textContent = unlocked
    ? `解锁条件：${tier}`
    : `解锁条件：${tier}`;

  const front = document.getElementById('modalFront');
  front.className = 'modal-face front reward-face';
  const frontImg = document.getElementById('modalFrontImg');
  const ph = document.getElementById('modalFrontPH');
  const img = rewardImg(name);
  frontImg.src = img;
  frontImg.style.display = 'block';
  frontImg.onerror = function () {
    this.style.display = 'none';
    ph.textContent = '🎁';
    ph.style.display = 'flex';
  };
  if (unlocked) {
    frontImg.classList.remove('locked-img');
    ph.classList.remove('locked-emoji-ph');
    ph.style.display = 'none';
  } else {
    // 未解锁：图片半透明 + 🔒 叠加
    frontImg.classList.add('locked-img');
    ph.textContent = '🔒';
    ph.classList.add('locked-emoji-ph');
    ph.style.display = 'flex';
  }
  document.getElementById('cardModal').style.display = 'flex';
}

// ==================== SCREENSHOT OCR（中文识别版）====================
let tessWorker = null;

// 中文卡名 → 稀有度映射（仅保留中文卡牌类型名，不含英文缩写以避免子串误匹配）
const CN_CAT_MAP = {
  日常卡: 'r',
  音乐卡: 'sr',
  涂鸦卡: 'ssr',
  路透卡: 'pr',
  拍立得: 'ur',
  镂空卡: 'hr',
  衣料卡: 'hr',
  角色卡: 'r',
  拼图卡: 'sr',
  月历卡: 'ssr',
  工艺卡: 'sp',
  未公开角色卡: 'ur',
};

// 中文卡名 + 数字 正则（宽松匹配，允许中间有分隔符）
const CN_CARD_PATTERNS = [
  { pattern: /日\s*常\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'r' },
  { pattern: /音\s*乐\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'sr' },
  { pattern: /涂\s*鸦\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'ssr' },
  { pattern: /路\s*透\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'pr' },
  { pattern: /拍\s*立\s*得\s*[·.]?\s*(\d{1,2})/g, cat: 'ur' },
  { pattern: /镂\s*空\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'hr' },
  { pattern: /衣\s*料\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'hr' },
  { pattern: /角\s*色\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'r' },
  { pattern: /拼\s*图\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'sr' },
  { pattern: /月\s*历\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'ssr' },
  { pattern: /工\s*艺\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'sp' },
  { pattern: /未\s*公\s*开\s*角\s*色\s*卡\s*[·.]?\s*(\d{1,2})/g, cat: 'ur' },
];

// 图片预处理：放大+增强对比度
function preprocessImage(imgData, callback) {
  const img = new Image();
  img.onload = function () {
    const canvas = document.createElement('canvas');
    const scale = Math.max(2.0, 1500 / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const enhanced = Math.min(255, Math.max(0, (gray - 50) * 2.0));
      d[i] = d[i + 1] = d[i + 2] = enhanced;
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
        document.getElementById('ocrStatus').textContent =
          '🔧 下载中文语言包...';
      } else if (m.status === 'recognizing text') {
        document.getElementById('ocrStatus').textContent =
          `🤖 正在识别... ${Math.round(m.progress * 100)}%`;
      }
    },
  });

  await w.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
  });
  tessWorker = w;
  return w;
}

// 通过文本里的卡牌类型名判断属于哪个池
function detectPool(text) {
  // 去空格，避免「音乐 卡」之类漏匹配
  const t = text.replace(/\s+/g, '');
  const xiariTypes = ['日常卡', '音乐卡', '涂鸦卡', '路透卡', '拍立得', '镂空卡', '衣料卡'];
  const junuanTypes = ['角色卡', '拼图卡', '月历卡', '工艺卡', '未公开角色卡'];
  let xiariHits = 0, junuanHits = 0;
  for (const name of xiariTypes) {
    let i = 0;
    while ((i = t.indexOf(name, i)) !== -1) { xiariHits++; i += name.length; }
  }
  for (const name of junuanTypes) {
    let i = 0;
    while ((i = t.indexOf(name, i)) !== -1) { junuanHits++; i += name.length; }
  }
  if (xiariHits > junuanHits) return 'xiari';
  if (junuanHits > xiariHits) return 'junuan';
  return null; // 无法判断
}

// 对单段文本跑 4 策略匹配，返回 {id: count}（每卡取各策略最大值）
function matchCardCounts(text, words, validIDs) {
  const results = [];
  // 策略A：中文卡名 + 数字
  const cntA = {};
  for (const { pattern, cat } of CN_CARD_PATTERNS) {
    let m; pattern.lastIndex = 0;
    while ((m = pattern.exec(text)) !== null) {
      const id = cat + parseInt(m[1]);
      if (validIDs.has(id)) cntA[id] = (cntA[id] || 0) + 1;
    }
  }
  results.push(cntA);
  // 策略B：英文缩写 + 数字
  const cntB = {};
  const enPatterns = [
    /\b(pr|PR|Pr)\s*(\d{1,2})\b/g, /\b(sr|SR|Sr)\s*(\d{1,2})\b/g,
    /\b(ssr|SSR|Ssr)\s*(\d{1,2})\b/g, /\b(ur|UR|Ur)\s*(\d{1,2})\b/g,
    /\b(hr|HR|Hr)\s*(\d{1,2})\b/g, /\b(sp|SP|Sp)\s*(\d{1,2})\b/g,
    /\b(r|R)\s*(\d{1,2})\b/g,
  ];
  for (const pat of enPatterns) {
    let m; pat.lastIndex = 0;
    while ((m = pat.exec(text)) !== null) {
      const id = m[1].toLowerCase() + parseInt(m[2]);
      if (validIDs.has(id)) cntB[id] = (cntB[id] || 0) + 1;
    }
  }
  results.push(cntB);
  // 策略C：单词级（置信度 > 40）
  const cntC = {};
  if (words) {
    for (const w of words) {
      if (w.confidence < 40) continue;
      const cleaned = w.text.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (validIDs.has(cleaned)) cntC[cleaned] = (cntC[cleaned] || 0) + 1;
    }
  }
  results.push(cntC);
  // 策略D：中文宽松匹配
  const cntD = {};
  const compact = text.replace(/[\s,，.。、·:：\-\+\=\(\)（）\[\]【】<>《》""''""！!？?｀`~@#$%^&*_/|\\]/g, '');
  for (const [cnName, cat] of Object.entries(CN_CAT_MAP)) {
    if (cnName.length < 2) continue;
    let idx = 0;
    while ((idx = compact.indexOf(cnName, idx)) !== -1) {
      const after = compact.slice(idx + cnName.length, idx + cnName.length + 3);
      const numMatch = after.match(/^(\d{1,2})/);
      if (numMatch) {
        const id = cat + parseInt(numMatch[1]);
        if (validIDs.has(id)) cntD[id] = (cntD[id] || 0) + 1;
      }
      idx += cnName.length;
    }
  }
  results.push(cntD);
  // 每卡取各策略最大值
  const out = {};
  for (const id of validIDs) {
    let mx = 0;
    for (const r of results) if (r[id] && r[id] > mx) mx = r[id];
    if (mx > 0) out[id] = mx;
  }
  return out;
}

async function handleScreenshots(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  event.target.value = '';

  document.getElementById('uploadPreview').classList.add('show');
  document.getElementById('ocrLoading').style.display = 'block';
  document.getElementById('ocrNumbers').innerHTML = '';
  document.getElementById('ocrStatus').textContent =
    `🔧 处理 ${files.length} 张截图...`;
  document.getElementById('ocrCount').textContent = '0';
  ocrCounts = {};
  ocrSelected = {};
  ocrExpectedTotal = 0;

  const accumulated = {};
  let grandExpected = 0;
  const allDebug = [];
  let detectedPool = null; // 自动判断的池（第一张图确定后切换）

  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    document.getElementById('ocrStatus').textContent =
      `🤖 处理第 ${fi + 1}/${files.length} 张...`;

    const rawImgData = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });

    if (fi === 0) document.getElementById('previewImg').src = rawImgData;

    await new Promise(resolve => {
      preprocessImage(rawImgData, async processedImgData => {
        const allTexts = [];
        const allWords = [];

        try {
          const worker = await getWorker();

          // 第1轮：预处理图
          document.getElementById('ocrStatus').textContent =
            '🤖 第1轮识别（预处理图）...';
          const ret1 = await worker.recognize(processedImgData);
          allTexts.push(ret1.data.text);
          if (ret1.data.words) allWords.push(...ret1.data.words);

          // 第2轮：原图
          document.getElementById('ocrStatus').textContent =
            '🤖 第2轮识别（原图）...';
          const ret2 = await worker.recognize(rawImgData);
          allTexts.push(ret2.data.text);
          if (ret2.data.words) allWords.push(...ret2.data.words);

          const fullText = allTexts.join('\n');
          console.log('=== OCR 原始输出 ===');
          console.log(fullText);
          console.log('=== 单词 ===');
          console.log(
            allWords.map(w => `"${w.text}"(${w.confidence}%)`).join(', '),
          );

          // 判断本张图属于哪个池（每张都判，取首个能判出的池；判不出则沿用已判出的或当前池）
          const imgPoolDetected = detectPool(fullText);
          if (imgPoolDetected) {
            if (!detectedPool) {
              detectedPool = imgPoolDetected;
              if (detectedPool !== currentPool) {
                switchPool(detectedPool); // 自动切换到识别出的池
              }
            } else if (detectedPool !== imgPoolDetected) {
              // 跨池图：以已判出的池为准，忽略不同池的卡
            }
          }
          const poolForMatch = detectedPool || currentPool;
          const validIDs = new Set(poolIDs(poolForMatch));

          // 两轮分别匹配，每张卡取两轮中的最大值（避免拼接文本导致重复计数）
          const cnt1 = matchCardCounts(ret1.data.text, ret1.data.words, validIDs);
          const cnt2 = matchCardCounts(ret2.data.text, ret2.data.words, validIDs);
          const strategyResults = [cnt1, cnt2];

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
          for (const id of validIDs) {
            let maxCnt = 0;
            for (const sr of strategyResults) {
              if (sr[id] && sr[id] > maxCnt) maxCnt = sr[id];
            }
            if (maxCnt > 0)
              imgCounts[id] = Math.min(maxCnt, expectedTotal || 10);
          }

          // 奖品位校验修正
          const rawTotal = Object.values(imgCounts).reduce((s, c) => s + c, 0);
          if (expectedTotal > 0 && rawTotal > expectedTotal) {
            const scale = expectedTotal / rawTotal;
            for (const id of Object.keys(imgCounts))
              imgCounts[id] = Math.max(1, Math.round(imgCounts[id] * scale));
            let adjTotal = Object.values(imgCounts).reduce((s, c) => s + c, 0);
            const sortedIds = Object.keys(imgCounts).sort(
              (a, b) => imgCounts[b] - imgCounts[a],
            );
            for (const id of sortedIds) {
              while (imgCounts[id] > 1 && adjTotal > expectedTotal) {
                imgCounts[id]--;
                adjTotal--;
              }
            }
          }

          // 累加到全局
          for (const [id, cnt] of Object.entries(imgCounts)) {
            accumulated[id] = (accumulated[id] || 0) + cnt;
          }
          grandExpected += expectedTotal;
          allDebug.push(fullText.replace(/\n/g, ' ').slice(0, 80));
        } catch (err) {
          console.error(`第${fi + 1}张识别失败:`, err);
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

  const finalTotal = Object.values(ocrCounts).reduce((s, c) => s + c, 0);
  const debugInfo = allDebug.join(' | ').slice(0, 200);

  if (finalTotal === 0) {
    document.getElementById('ocrStatus').innerHTML =
      `⚠️ 处理了 ${files.length} 张截图，未识别到卡号<br><small style="font-size:10px;">${debugInfo}...</small>`;
  } else {
    document.getElementById('ocrStatus').innerHTML =
      `✅ 处理 ${files.length} 张截图，奖品位共 <b>${grandExpected || '?'}</b>，识别 <b>${finalTotal}</b> 张卡<br><small style="font-size:10px;">${debugInfo}</small>`;
  }
  document.getElementById('ocrLoading').style.display = 'none';
  renderOCR();
}

function renderOCR() {
  const container = document.getElementById('ocrNumbers');

  let totalSelected = 0;
  let html = '';
  // 顶部显示所属卡池
  html += `<div class="ocr-pool-label">${POOLS[currentPool].name}</div>`;

  // 按卡牌类型分组（不含特典）
  const typeOrder = poolTypes(currentPool).map(t => ({
    type: t,
    ids: poolCards(currentPool).filter(c => c.type === t && c.rarity !== 'ex').map(c => c.id),
  }));

  for (const group of typeOrder) {
    html += `<div class="ocr-group-title">${group.type}</div>`;
    html += '<div class="ocr-grid">';
    for (const id of group.ids) {
      const detected = ocrCounts[id] || 0;
      const selected = ocrSelected[id] || 0;
      totalSelected += selected;
      const active = detected > 0 || selected > 0;
      if (active) {
        html += `<div class="ocr-cell has">
          <span class="ocr-cell-id">${id.toUpperCase()}</span>
          <div class="ocr-cell-ctrl">
            <button class="ocr-adj-btn" onclick="adjustOCR('${id}', -1)">−</button>
            <span class="ocr-cell-cnt">${selected}</span>
            <button class="ocr-adj-btn" onclick="adjustOCR('${id}', 1)">+</button>
          </div>
        </div>`;
      } else {
        html += `<div class="ocr-cell" onclick="adjustOCR('${id}', 1)"><span class="ocr-cell-id">${id.toUpperCase()}</span></div>`;
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
  const newVal = Math.max(0, Math.min(10, cur + delta));
  if (newVal === 0) {
    delete ocrSelected[id];
  } else {
    ocrSelected[id] = newVal;
  }
  renderOCR();
}

function selectAllOCR() {
  for (const id of poolIDs(currentPool)) {
    if (id.startsWith('ex')) continue; // 特典不可 OCR
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
  if (cards.length === 0) {
    showToast('⚠️ 请先调整每张卡的数量（点 + 增加）');
    return;
  }
  addCards(cards, 'ocr');
  clearOCR();
  showToast(`✅ 已添加 ${cards.length} 张卡`);
}

function clearOCR() {
  document.getElementById('uploadPreview').classList.remove('show');
  document.getElementById('previewImg').src = '';
  document.getElementById('ocrLoading').style.display = 'none';
  document.getElementById('ocrStatus').textContent =
    '🤖 识别到的卡号（点击 ± 调整数量）：';
  ocrCounts = {};
  ocrSelected = {};
  ocrExpectedTotal = 0;
  document.getElementById('ocrNumbers').innerHTML = '';
  document.getElementById('ocrCount').textContent = '0';
  const hint = document.getElementById('ocrExpectedHint');
  if (hint) hint.innerHTML = '';
}

// ==================== MANUAL INPUT (录入网格) ====================
// 录入页：双卡池页签 + 分组卡片网格，每卡可加减数量
function renderEntry() {
  // 渲染卡池页签
  const tabs = document.getElementById('entryPoolTabs');
  if (tabs) {
    tabs.innerHTML = Object.entries(POOLS)
      .map(
        ([key, def]) =>
          `<button class="pool-tab${key === currentPool ? ' active' : ''}" data-pool="${key}" onclick="switchPool('${key}')">${def.name}</button>`,
      )
      .join('');
  }

  const grid = document.getElementById('entryGrid');
  if (!grid) return;
  const c = cardCounts[currentPool] || {};
  const cards = poolCards(currentPool);

  // 分组（与收藏页一致：按稀有度 / 按卡牌类型）
  let groups;
  if (groupMode === 'rarity') {
    groups = poolRarities(currentPool).map(r => ({
      key: r,
      title: `${RARITY_INFO[r].icon} ${RARITY_INFO[r].label}`,
      cls: r + '-title',
      cards: cards.filter(card => card.rarity === r),
    }));
  } else {
    groups = poolTypes(currentPool).map(t => ({
      key: t,
      title: t,
      cls: 'type-title',
      cards: cards.filter(card => card.type === t),
    }));
    const exCards = cards.filter(card => card.rarity === 'ex');
    if (exCards.length)
      groups.push({
        key: 'ex',
        title: '🎁 特殊奖励',
        cls: 'ex-title',
        cards: exCards,
      });
  }

  let html = '';
  for (const g of groups) {
    const total = g.cards.length;
    const collected = g.cards.filter(card => (c[card.id] || 0) > 0).length;
    html += `<div class="rarity-section"><div class="rarity-title ${g.cls}">${g.title}<span class="group-count" id="gcount-${g.key}">${collected}/${total}</span></div><div class="card-grid entry-grid">`;
    html += g.cards.map(card => entryCellHTML(card, c)).join('');
    html += '</div></div>';
  }
  grid.innerHTML = html;
}

// 单张录入卡 HTML（key 用于 DOM id，便于局部更新）
function entryCellHTML(card, c) {
  const imgs = cardImages[currentPool] && cardImages[currentPool][card.id];
  const idText = card.rarity === 'ex' ? '★' : card.id.toUpperCase();
  const imgSrc = (imgs && imgs.front) || card.img;
  const imgHTML = imgSrc
    ? `<img src="${imgSrc}" alt="${card.id}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;">${idText}</span>`
    : `<span>${idText}</span>`;
  const cnt = c[card.id] || 0;
  return `<div class="card-cell entry-cell ${card.rarity} ${cnt > 0 ? 'has' : 'zero'}" id="ecell-${card.id}">
    <div class="placeholder" data-cid="${idText}">${imgHTML}</div>
    <div class="cid">${idText}</div>
    <div class="cname">${card.name}</div>
    <div class="entry-ctrl">
      <button class="entry-btn" onclick="adjustEntry('${card.id}', -1)">−</button>
      <input class="entry-input" type="text" inputmode="numeric" pattern="[0-9]*" value="${cnt}" data-id="${card.id}" onfocus="this.select()" onchange="setEntryCount('${card.id}', this.value)">
      <button class="entry-btn" onclick="adjustEntry('${card.id}', 1)">+</button>
    </div>
  </div>`;
}

// 局部更新单张录入卡（不重建整网格，避免图片重载闪烁）
function updateEntryCell(id) {
  const cell = document.getElementById('ecell-' + id);
  if (!cell) return;
  const c = cardCounts[currentPool] || {};
  const cnt = c[id] || 0;
  cell.classList.toggle('has', cnt > 0);
  cell.classList.toggle('zero', cnt === 0);
  const input = cell.querySelector('.entry-input');
  if (input && document.activeElement !== input) input.value = cnt;
}

// 局部更新某组收集进度 X/Y
function updateGroupCount(key) {
  const el = document.getElementById('gcount-' + key);
  if (!el) return;
  const c = cardCounts[currentPool] || {};
  const cards = poolCards(currentPool);
  let grp;
  if (groupMode === 'rarity') {
    grp = cards.filter(card => card.rarity === key);
  } else {
    grp = cards.filter(
      card => (card.rarity === 'ex' && key === 'ex') || card.type === key,
    );
  }
  const collected = grp.filter(card => (c[card.id] || 0) > 0).length;
  el.textContent = `${collected}/${grp.length}`;
}

// 找到某卡在当前分组模式下所属的 group key（用于局部更新组计数）
function groupKeyOf(card) {
  if (groupMode === 'rarity') return card.rarity;
  return card.rarity === 'ex' ? 'ex' : card.type;
}

// 录入页卡片加减（直接修改数量，记录到 history）
function adjustEntry(id, delta) {
  const card = cardByID(currentPool, id);
  if (!card) return;
  if (!cardCounts[currentPool]) cardCounts[currentPool] = {};
  const cur = cardCounts[currentPool][id] || 0;
  const next = Math.max(0, cur + delta);
  cardCounts[currentPool][id] = next;
  if (delta > 0) {
    pushHistory({
      time: new Date().toISOString(),
      pool: currentPool,
      cards: [id],
      type: 'manual',
    });
  } else if (delta < 0 && cur > 0) {
    pushHistory({
      time: new Date().toISOString(),
      pool: currentPool,
      cards: [id],
      type: 'adjust',
    });
  }
  saveData();
  // 局部更新：只改这一张卡 + 它所在组的计数，不重建整网格
  updateEntryCell(id);
  updateGroupCount(groupKeyOf(card));
  updateStats();
  renderPanels();
  if (currentTab === 'history') renderHistory();
}

// 录入页手动输入数量（直接设为指定值，差异记为单抽/调整）
function setEntryCount(id, val) {
  const card = cardByID(currentPool, id);
  if (!card) return;
  if (!cardCounts[currentPool]) cardCounts[currentPool] = {};
  const cur = cardCounts[currentPool][id] || 0;
  let next = parseInt(val);
  if (isNaN(next) || next < 0) next = 0;
  if (next === cur) {
    updateEntryCell(id);
    return;
  } // 无变化
  cardCounts[currentPool][id] = next;
  const type = next > cur ? 'manual' : 'adjust';
  const diff = Math.abs(next - cur);
  const cards = Array(diff).fill(id);
  pushHistory({
    time: new Date().toISOString(),
    pool: currentPool,
    cards,
    type,
  });
  saveData();
  updateEntryCell(id);
  updateGroupCount(groupKeyOf(card));
  updateStats();
  renderPanels();
  if (currentTab === 'history') renderHistory();
}

// 记录入历史：每次操作独立存储，渲染层按 1 分钟分组展示
function pushHistory(entry) {
  history.unshift(entry);
}

function undoLast() {
  const last = history[0];
  if (!last) {
    showToast('⚠️ 没有可撤销的记录');
    return;
  }
  history.shift();
  const isDecrement = last.type === 'adjust';
  const delta = isDecrement ? 1 : -1;
  for (const id of last.cards) {
    if (!cardCounts[last.pool]) cardCounts[last.pool] = {};
    cardCounts[last.pool][id] = Math.max(
      0,
      (cardCounts[last.pool][id] || 0) + delta,
    );
  }
  saveData();
  updateStats();
  renderCollection();
  renderHistory();
  renderPanels();
  if (currentTab === 'entry' && currentSubTab === 'input') renderEntry();
  showToast('↩ 已撤销');
}

// ==================== ADD CARDS ====================
function addCards(cards, type) {
  if (!cardCounts[currentPool]) cardCounts[currentPool] = {};
  for (const id of cards) {
    cardCounts[currentPool][id] = (cardCounts[currentPool][id] || 0) + 1;
  }
  pushHistory({
    time: new Date().toISOString(),
    pool: currentPool,
    cards,
    type,
  });
  saveData();
  updateStats();
  renderCollection();
  renderHistory();
  renderPanels();
}

// ==================== HISTORY ====================
function renderHistory() {
  const container = document.getElementById('historyList');
  if (history.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--brown-200);">🃏 还没有抽卡记录</div>';
    return;
  }
  // 分组：手动操作(manual/adjust)按「所在分钟」+ 池子归组；OCR/十连各自独立成组
  const groups = [];
  for (const h of history) {
    const isManual = h.type === 'manual' || h.type === 'adjust';
    const t = new Date(h.time);
    // 分钟桶 key：年月日时分子
    const bucketKey = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}-${t.getMinutes()}`;
    const last = groups[groups.length - 1];
    if (
      isManual &&
      last &&
      last.isManual &&
      last.pool === h.pool &&
      last.bucketKey === bucketKey
    ) {
      last.items.push(h);
      last.startMs = Math.min(last.startMs, t.getTime());
    } else {
      groups.push({
        isManual,
        pool: h.pool,
        bucketKey,
        startMs: t.getTime(),
        items: [h],
      });
    }
  }

  container.innerHTML = groups
    .map(g => {
      const pn = g.pool === 'xiari' ? '🏖️ 夏日池' : '🍊 橘暖池';
      // 组时间标签：取组内最早时间
      const t = new Date(g.startMs);
      const ts = `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
      // 组内各卡净变化：manual 计正、adjust 计负
      const delta = {};
      for (const it of g.items) {
        const sign = it.type === 'adjust' ? -1 : 1;
        for (const id of it.cards) delta[id] = (delta[id] || 0) + sign;
      }
      const chips = Object.entries(delta)
        .map(([id, n]) => {
          const card = cardByID(g.pool, id);
          const cat = card ? card.rarity : catOf(id);
          const name = card ? card.name : '?';
          const idText = cat === 'ex' ? '★' : id.toUpperCase();
          const sign = n > 0 ? '+' : '';
          const cls = n > 0 ? 'chip-up' : 'chip-down';
          return `<span class="history-chip chip-${cat} ${cls}">${idText} ${name} ${sign}${n}</span>`;
        })
        .join('');
      const label = g.isManual
        ? '🂡手动'
        : g.items[0].type === 'ocr'
          ? '📸截图'
          : '🔟十连';
      return `<div class="history-item">
      <div class="history-header"><span class="history-pool">${pn} · ${label}</span><span class="history-time">${ts}</span></div>
      <div class="history-cards">${chips}</div>
    </div>`;
    })
    .join('');
}
function clearHistory() {
  if (confirm('确定要清空所有记录吗？（卡牌数量不会丢失）')) {
    history = [];
    saveData();
    renderHistory();
    showToast('🗑 记录已清空');
  }
}

// ==================== EXPORT ====================
function exportData() {
  const json = JSON.stringify(
    { cardCounts, history, cardImages, extraRewards, version: 3 },
    null,
    2,
  );
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  if (navigator.share) {
    const file = new File(
      [json],
      '抽抽乐备份_' + new Date().toISOString().slice(0, 10) + '.json',
      { type: 'application/json' },
    );
    navigator.share({ files: [file], title: '抽抽乐数据备份' }).catch(() => {
      const a = document.createElement('a');
      a.href = url;
      a.download = '抽抽乐备份.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = '抽抽乐备份.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  showToast('💾 数据已备份');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.cardCounts) {
          showToast('⚠️ 无效的备份文件');
          return;
        }
        cardCounts = data.cardCounts || { xiari: {}, junuan: {} };
        history = data.history || [];

        cardImages = data.cardImages || { xiari: {}, junuan: {} };
        extraRewards = data.extraRewards || {
          限时时段: null,
          宣传达标: false,
          宣传下单时间: '',
        };
        saveData();
        // 迁移导入的旧数据
        loadData();
        updateStats();
        renderCollection();
        renderHistory();
        renderPanels();
        showToast('📥 数据已导入');
      } catch (err) {
        showToast('⚠️ 文件格式错误');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAllData() {
  if (
    !confirm(
      '⚠️ 确定要清空所有数据吗？（包括卡牌数量、记录、卡图）\n\n此操作不可恢复！建议先备份。',
    )
  )
    return;
  cardCounts = { xiari: {}, junuan: {} };
  history = [];
  cardImages = { xiari: {}, junuan: {} };
  extraRewards = { 限时时段: null, 宣传达标: false, 宣传下单时间: '' };
  saveData();
  updateStats();
  renderCollection();
  renderHistory();
  renderPanels();
  showToast('🗑 所有数据已清空');
}

// ==================== TOAST ====================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2000);
}

// ==================== IMAGE API ====================
function setCardImage(pool, id, frontBase64, backBase64) {
  if (!cardImages[pool]) cardImages[pool] = {};
  cardImages[pool][id] = { front: frontBase64, back: backBase64 || null };
  saveData();
  renderCollection();
}

// ==================== STARTUP ====================
loadData();
switchTab('collection');
switchPool('xiari');
renderPanels();
// 点外部收起分组下拉
document.addEventListener('click', e => {
  const menu = document.getElementById('groupMenu');
  if (menu && !menu.contains(e.target)) closeGroupMenu();
});

// 关闭悬浮抽奖入口
function closeFloatDraw(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const el = document.getElementById('floatDraw');
  if (el) el.style.display = 'none';
}

// 悬浮抽奖入口：可拖动 + 点击跳转
(function initFloatDraw() {
  const el = document.getElementById('floatDraw');
  if (!el) return;
  const STORAGE_KEY = 'ccg_float_pos';
  // 恢复位置：有保存则用保存值，否则初始定位到「双池总抽数」卡右侧
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && saved.left != null) {
      el.style.left = saved.left + 'px';
      el.style.top = saved.top + 'px';
      el.style.right = 'auto';
    } else {
      const ovCards = document.querySelectorAll('#overviewPanel .ov-card');
      if (ovCards.length) {
        const r = ovCards[0].getBoundingClientRect();
        let left = r.right - el.offsetWidth - 4;
        let top = r.top + (r.height - el.offsetHeight) / 2;
        left = Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, left));
        top = Math.max(4, Math.min(window.innerHeight - el.offsetHeight - 4, top));
        el.style.left = left + 'px';
        el.style.top = top + 'px';
        el.style.right = 'auto';
      }
    }
  } catch (e) {}

  let dragging = false,
    moved = false;
  let startX = 0,
    startY = 0,
    origLeft = 0,
    origTop = 0;
  let lastTouchEnd = 0; // 阻止 touch 后合成的 mouse 事件重复触发

  function getXY(e) {
    if (e.touches && e.touches[0])
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }
  function start(e) {
    // 点关闭按钮不启动拖拽
    if (e.target && e.target.id === 'floatDrawClose') return;
    // 忽略 touch 后合成的 mouse 事件
    if (e.type === 'mousedown' && Date.now() - lastTouchEnd < 800) return;
    const p = getXY(e);
    dragging = true;
    moved = false;
    startX = p.x;
    startY = p.y;
    const rect = el.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;
    el.style.right = 'auto';
    el.style.transition = 'none';
  }
  function move(e) {
    if (!dragging) return;
    const p = getXY(e);
    const dx = p.x - startX,
      dy = p.y - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      moved = true;
      e.preventDefault();
    }
    if (!moved) return;
    let left = origLeft + dx,
      top = origTop + dy;
    // 约束在视口内
    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;
    left = Math.max(4, Math.min(maxX - 4, left));
    top = Math.max(4, Math.min(maxY - 4, top));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }
  function end(e) {
    if (!dragging) return;
    // 忽略 touch 后合成的 mouse 事件
    if (e && e.type === 'mouseup' && Date.now() - lastTouchEnd < 800) return;
    dragging = false;
    if (e && e.type === 'touchend') lastTouchEnd = Date.now();
    el.style.transition = '';
    if (moved) {
      // 保存位置
      const rect = el.getBoundingClientRect();
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ left: rect.left, top: rect.top }),
        );
      } catch (e) {}
    } else {
      // 点击跳转
      const href = el.dataset.href;
      if (href) window.open(href, '_blank', 'noopener');
    }
  }
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchmove', move, { passive: false });
  el.addEventListener('touchend', end);
  el.addEventListener('mousedown', start);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
})();
