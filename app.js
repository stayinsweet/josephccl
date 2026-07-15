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
  { draws: 300, rewards: ['许愿卡'], note: '可许愿三张，可叠加', stack: true },
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

// 全员满赠档位（全员抽数达标 + 个人双池合计>=10抽 才解锁）— 特典卡1-7
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
const GLOBAL_TOTAL_DRAWS = 157454;
// 个人满赠门槛：全员达标后还需个人双池合计 >= 此值才有资格获取特典卡
const GLOBAL_PERSONAL_MIN = 10;
let currentPool = 'xiari';
let currentTab = 'collection';
let groupMode = 'type'; // 'rarity' | 'type'
let ocrCounts = { xiari: {}, junuan: {} }; // OCR检测到的每张卡的数量（分池）
let ocrSelected = { xiari: {}, junuan: {} }; // 用户调整后的数量（分池）
let ocrExpectedTotal = 0; // 从奖品编号检测到的本轮总抽数
let imgResults = []; // 每张图识别明细（全局，供单图编辑用）
let modalCard = null;
// 一键保留模式：标记两池卡片「保留」并导出
let purgeMode = false;
let purgeSnapshot = null; // 进入模式前的 cardCounts 快照
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
// 个人满赠已解锁奖励卡数（按「卡位」计：叠加档位如许愿卡只算1个卡位，
// 实际张数 ×N 仅在卡片上展示，不计入进度计数）
function personalUnlockedCount() {
  let n = 0;
  for (const m of PERSONAL_BONUS) {
    if (m.stack) {
      // 叠加档位：达到 1 倍即视为该卡位解锁，只计 1 张
      const val = m.pool ? poolDraws(m.pool) : totalDraws();
      if (Math.floor(val / m.draws) > 0) n += m.rewards.length;
    } else if (personalTierUnlocked(m)) {
      n += m.rewards.length;
    }
  }
  return n;
}
// 许愿卡叠加数量（已解锁几张）
function wishCardCount() {
  return Math.floor(totalDraws() / 300);
}
// 全员满赠已解锁特典卡数（全员抽数达标 且 个人>=10抽 才解锁）
function globalUnlockedCount() {
  const personalEligible = totalDraws() >= GLOBAL_PERSONAL_MIN;
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
// 单池已收集去重数（不含 ex）
function poolCollected(pool) {
  const c = cardCounts[pool] || {};
  let n = 0;
  for (const card of poolCards(pool)) {
    if (card.rarity === 'ex') continue;
    if ((c[card.id] || 0) > 0) n++;
  }
  return n;
}
// 单池普通卡总数（不含 ex）
function poolCardTotal(pool) {
  let n = 0;
  for (const card of poolCards(pool)) {
    if (card.rarity === 'ex') continue;
    n++;
  }
  return n;
}
function updateStats() {
  const c = cardCounts[currentPool] || {};
  // 当前池总抽数
  const total = poolDraws(currentPool);
  // 当前池已收集进度
  const collected = poolCollected(currentPool);
  const poolTotal = poolCardTotal(currentPool);
  const pct = poolTotal ? Math.round((collected / poolTotal) * 100) : 0;

  // 渲染统计行：总抽数 + 已收集 + 当前池按分组维度统计
  const row = document.getElementById('statsRow');
  if (!row) return;
  let html = `<div class="stat-card"><div class="num orange">${total}</div><div class="lbl">总抽数</div></div>`;
  html += `<div class="stat-card stat-collect"><div class="num">${collected}<span class="collect-slash">/${poolTotal}</span></div><div class="lbl">已收集</div><div class="collect-bar"><div class="collect-bar-fill" style="width:${pct}%"></div></div></div>`;

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
  const personalEligible = total >= GLOBAL_PERSONAL_MIN;

  // 个人满赠奖励卡
  const personalCards = [];
  PERSONAL_BONUS.forEach(m => {
    const unlocked = personalTierUnlocked(m);
    const tierLabel = m.pool
      ? `${m.pool === 'xiari' ? '夏日' : '橘暖'}池${m.draws}抽`
      : `${m.draws}抽`;
    m.rewards.forEach(name => {
      // 许愿卡叠加：显示已获张数 + 备注
      if (m.stack) {
        const cnt = Math.floor(total / m.draws);
        personalCards.push({
          name: cnt > 0 ? `${name} ×${cnt}` : name,
          source: '个人满赠',
          tier: m.note || tierLabel,
          unlocked: cnt > 0,
        });
      } else {
        personalCards.push({
          name,
          source: '个人满赠',
          tier: m.note ? `${tierLabel} · ${m.note}` : tierLabel,
          unlocked,
        });
      }
    });
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
  const personalEligible = totalDraws() >= GLOBAL_PERSONAL_MIN;
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
  const personalEligible = total >= GLOBAL_PERSONAL_MIN;
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
      ? `待个人 >= ${GLOBAL_PERSONAL_MIN} 抽`
      : personalEligible
        ? `还差 ${fmtWan(gNext.draws - GLOBAL_TOTAL_DRAWS)}`
        : `还需个人 >= ${GLOBAL_PERSONAL_MIN} 抽`;
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
  const personalEligible = total >= GLOBAL_PERSONAL_MIN;
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
      let countText, rewardText;
      if (m.stack) {
        const cnt = Math.floor(val / m.draws);
        countText = cnt > 0 ? `×${cnt}已解锁` : `${val}/${m.draws}`;
        rewardText = `${cnt > 0 ? '✅ ' : '🔒 '}${m.rewards.join(' + ')}${m.note ? `（${m.note}）` : ''}`;
      } else {
        countText = unlocked
          ? `${m.rewards.length}张已解锁`
          : `${val}/${m.draws}`;
        rewardText = `${unlocked ? '✅ ' : '🔒 '}${m.rewards.join(' + ')}${m.note ? `（${m.note}）` : ''}`;
      }
      return `<div class="ms-row ${unlocked ? 'done' : ''}">
        <span class="ms-label">${label}抽</span>
        <div class="ms-bar-wrap"><div class="ms-bar-fill${unlocked ? ' done' : ''}" style="width:${pct}%"></div></div>
        <span class="ms-reward">${rewardText}</span>
        <span class="ms-count">${countText}</span>
      </div>`;
    }).join('');
  } else {
    title = '全员满赠详情';
    body = `<div class="bm-sub">全员抽数 ${fmtWan(GLOBAL_TOTAL_DRAWS)} · 个人 ${total} 抽${personalEligible ? '' : '（未达 ' + GLOBAL_PERSONAL_MIN + ' 抽门槛）'} · 已解锁 ${globalUnlockedCount()}/${GLOBAL_BONUS.length}</div>`;
    if (!personalEligible) {
      body += `<div class="ms-hint">⚠️ 全员达标后还需个人双池合计 &gt;= ${GLOBAL_PERSONAL_MIN} 抽才有资格解锁</div>`;
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

// 稀有度 → 中文卡名集合（一个卡名可能对应多个稀有度，如日常卡→r+pr）
const RARITY_CARDS = {
  r: ['日常卡', '角色卡'],
  pr: ['日常卡', '音乐卡', '路透卡', '角色卡'],
  sr: ['音乐卡', '拼图卡'],
  ssr: ['涂鸦卡', '月历卡'],
  ur: ['拍立得', '未公开角色卡'],
  hr: ['镂空卡', '衣料卡'],
  sp: ['工艺卡'],
};
// 稀有度 → 英文缩写正则片段（含大小写变体）
const RARITY_LETTERS = {
  r: 'r|R',
  pr: 'pr|PR|Pr',
  sr: 'sr|SR|Sr',
  ssr: 'ssr|SSR|Ssr',
  ur: 'ur|UR|Ur',
  hr: 'hr|HR|Hr',
  sp: 'sp|SP|Sp',
};
// 合并正则：可选中文卡名 + 稀有度字母 + 数字（稀有度由字母决定，不由卡名决定）
// 数字部分容忍 OCR 把 1→l/I、0→O
const numCls = '[0-9lIoO]';
const COMBINED_PATTERNS = Object.entries(RARITY_CARDS)
  .map(([cat, names]) => {
    // 卡名正则片段：日\s*常\s*卡 这种允许中间空格
    const nameAlt = names.map(n => n.split('').join('\\s*')).join('|');
    // 普通字符串拼接，\\s 转义为正则 \s，\\b 转义为词边界
    return {
      pattern: new RegExp(
        '(?:' +
          nameAlt +
          ')?\\s*(?:' +
          RARITY_LETTERS[cat] +
          ')\\s*(' +
          numCls +
          '{1,2})\\b',
        'g',
      ),
      cat,
    };
  })
  .sort((a, b) => b.cat.length - a.cat.length); // ssr 在 sr 前匹配，避免 SSR1 被 sr 吃掉

// 图片预处理：放大 + 灰度增强/二值化（mode: 'gray' | 'binary'）
function preprocessImage(imgData, callback, mode = 'gray') {
  const img = new Image();
  img.onload = function () {
    const canvas = document.createElement('canvas');
    const scale = Math.max(2.5, 2000 / img.width); // 放大到宽度≥2000px
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (mode === 'binary') {
        // 二值化：阈值 128
        const v = gray >= 128 ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
      } else {
        // 灰度增强对比度
        const enhanced = Math.min(255, Math.max(0, (gray - 50) * 2.0));
        d[i] = d[i + 1] = d[i + 2] = enhanced;
      }
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
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });
  tessWorker = w;
  return w;
}

// 通过文本里的卡牌类型名判断属于哪个池
function detectPool(text) {
  // 去空格，避免「音乐 卡」之类漏匹配
  const t = text.replace(/\s+/g, '');
  const xiariTypes = [
    '日常卡',
    '音乐卡',
    '涂鸦卡',
    '路透卡',
    '拍立得',
    '镂空卡',
    '衣料卡',
  ];
  const junuanTypes = ['角色卡', '拼图卡', '月历卡', '工艺卡', '未公开角色卡'];
  let xiariHits = 0,
    junuanHits = 0;
  for (const name of xiariTypes) {
    let i = 0;
    while ((i = t.indexOf(name, i)) !== -1) {
      xiariHits++;
      i += name.length;
    }
  }
  for (const name of junuanTypes) {
    let i = 0;
    while ((i = t.indexOf(name, i)) !== -1) {
      junuanHits++;
      i += name.length;
    }
  }
  if (xiariHits > junuanHits) return 'xiari';
  if (junuanHits > xiariHits) return 'junuan';
  return null; // 无法判断
}

// 对单段文本跑 4 策略匹配，返回 {id: count}（每卡取各策略最大值）
function matchCardCounts(text, words, validIDs) {
  // 文本归一化：
  // 1) OCR 常把 SSR 的 S 识成 9（9SR），还原为 SSR
  // 2) OCR 常把两位数拆开（SSR11→SSR1 1），行内合并「字母+数字+空格+数字」
  text = text.replace(/9(?=s[r])/gi, 'S');
  text = text.replace(/^.*$/gm, line => {
    // 只合并稀有度字母后的「数字 空格 数字」（如 SSR1 1 → SSR11）
    return line.replace(/([sSpPuUhHrR]{1,3})(\d)\s+(\d)\b/gi, '$1$2$3');
  });
  if (words) {
    words = words.map(w => ({
      ...w,
      text: w.text.replace(/9(?=s[r])/gi, 'S'),
    }));
  }
  const results = [];
  const fixNum = s =>
    s.replace(/l/gi, '1').replace(/I/g, '1').replace(/O/gi, '0');
  // 策略AB：可选中文卡名 + 稀有度字母 + 数字（合并旧A+B，稀有度由字母决定）
  // 按稀有度长度降序匹配（ssr 在 sr 前），长匹配优先占用区间，短匹配重叠则跳过
  // 避免 SSR1 被同时匹配为 ssr1 + sr1 + r1
  const cntAB = {};
  const used = []; // 已占用的字符区间 [start, end)
  for (const { pattern, cat } of COMBINED_PATTERNS) {
    let m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(text)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      // 检查是否与已占用区间重叠（仅看稀有度字母+数字部分，卡名不互斥）
      if (used.some(([s, e]) => start < e && end > s)) continue;
      const id = cat + parseInt(fixNum(m[1]));
      if (validIDs.has(id)) {
        cntAB[id] = (cntAB[id] || 0) + 1;
        used.push([start, end]);
      }
    }
  }
  results.push(cntAB);
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
  // 策略D：中文宽松匹配（仅单稀有度卡名，卡名+直接数字无字母的情况）
  // 多稀有度卡名（日常卡/音乐卡/角色卡）跳过，避免歧义
  const cntD = {};
  const compact = text.replace(
    /[\s,，.。、·:：\-\+\=\(\)（）\[\]【】<>《》""''""！!？?｀`~@#$%^&*_/|\\]/g,
    '',
  );
  // 反查：卡名 → 稀有度列表，只取唯一稀有度的卡名
  const cardToRarities = {};
  for (const [rarity, names] of Object.entries(RARITY_CARDS)) {
    for (const n of names)
      (cardToRarities[n] = cardToRarities[n] || []).push(rarity);
  }
  for (const [cnName, rarities] of Object.entries(cardToRarities)) {
    if (rarities.length !== 1) continue; // 跳过多稀有度卡名
    const cat = rarities[0];
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

// 预览图翻阅
let previewImgs = [];
let previewIdx = 0;
function showPreview(idx) {
  previewIdx = idx;
  const img = document.getElementById('previewImg');
  const indexEl = document.getElementById('previewIndex');
  const prevBtn = document.getElementById('previewPrev');
  const nextBtn = document.getElementById('previewNext');
  if (previewImgs.length === 0) {
    img.src = '';
    if (indexEl) indexEl.textContent = '';
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    return;
  }
  img.src = previewImgs[idx];
  if (indexEl) indexEl.textContent = `${idx + 1} / ${previewImgs.length}`;
  if (prevBtn) prevBtn.style.display = previewImgs.length > 1 ? '' : 'none';
  if (nextBtn) nextBtn.style.display = previewImgs.length > 1 ? '' : 'none';
}
function switchPreview(delta) {
  if (previewImgs.length === 0) return;
  let n = (previewIdx + delta + previewImgs.length) % previewImgs.length;
  showPreview(n);
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
  previewImgs = [];
  ocrCounts = { xiari: {}, junuan: {} };
  ocrSelected = { xiari: {}, junuan: {} };
  ocrExpectedTotal = 0;

  let grandExpected = 0;
  const allDebug = [];
  imgResults = []; // 每张图识别明细 {idx, pool, counts, detected, expected}（全局，供编辑用）
  const detectedPools = new Set(); // 记录所有图判出的池

  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    document.getElementById('ocrStatus').textContent =
      `🤖 处理第 ${fi + 1}/${files.length} 张...`;

    const rawImgData = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });

    // 收集预览图，更新翻阅
    previewImgs.push(rawImgData);
    showPreview(previewImgs.length - 1);

    await new Promise(resolve => {
      preprocessImage(rawImgData, async grayImgData => {
        preprocessImage(rawImgData, async binaryImgData => {
          const allTexts = [];
          const allWords = [];

          try {
            const worker = await getWorker();

            // 第1轮：灰度增强图
            document.getElementById('ocrStatus').textContent =
              '🤖 第1轮识别（灰度增强）...';
            const ret1 = await worker.recognize(grayImgData);
            allTexts.push(ret1.data.text);
            if (ret1.data.words) allWords.push(...ret1.data.words);

            // 第2轮：原图
            document.getElementById('ocrStatus').textContent =
              '🤖 第2轮识别（原图）...';
            const ret2 = await worker.recognize(rawImgData);
            allTexts.push(ret2.data.text);
            if (ret2.data.words) allWords.push(...ret2.data.words);

            // 第3轮：二值化图
            document.getElementById('ocrStatus').textContent =
              '🤖 第3轮识别（二值化）...';
            const ret3 = await worker.recognize(binaryImgData);
            allTexts.push(ret3.data.text);
            if (ret3.data.words) allWords.push(...ret3.data.words);

            const fullText = allTexts.join('\n');
            console.log('=== OCR 原始输出 ===');
            console.log(fullText);
            console.log('=== 单词 ===');
            console.log(
              allWords.map(w => `"${w.text}"(${w.confidence}%)`).join(', '),
            );

            // 判断本张图属于哪个池（逐图判池，混合上传时各图归各自池）
            const imgPool = detectPool(fullText) || currentPool;
            detectedPools.add(imgPool);
            const validIDs = new Set(poolIDs(imgPool));

            // 三轮分别匹配，每张卡取三轮中的最大值（避免拼接文本导致重复计数）
            const cnt1 = matchCardCounts(
              ret1.data.text,
              ret1.data.words,
              validIDs,
            );
            const cnt2 = matchCardCounts(
              ret2.data.text,
              ret2.data.words,
              validIDs,
            );
            const cnt3 = matchCardCounts(
              ret3.data.text,
              ret3.data.words,
              validIDs,
            );
            const strategyResults = [cnt1, cnt2, cnt3];

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
            const rawTotal = Object.values(imgCounts).reduce(
              (s, c) => s + c,
              0,
            );
            if (expectedTotal > 0 && rawTotal > expectedTotal) {
              const scale = expectedTotal / rawTotal;
              for (const id of Object.keys(imgCounts))
                imgCounts[id] = Math.max(1, Math.round(imgCounts[id] * scale));
              let adjTotal = Object.values(imgCounts).reduce(
                (s, c) => s + c,
                0,
              );
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

            grandExpected += expectedTotal;
            allDebug.push(fullText.replace(/\n/g, ' ').slice(0, 80));
            // 记录本张图识别明细（用于异常定位 + 单图编辑）
            const detectedCnt = Object.values(imgCounts).reduce(
              (s, c) => s + c,
              0,
            );
            imgResults.push({
              idx: fi,
              pool: imgPool,
              counts: { ...imgCounts },
              detected: detectedCnt,
              expected: expectedTotal,
            });
          } catch (err) {
            console.error(`第${fi + 1}张识别失败:`, err);
          }

          document.getElementById('ocrLoading').style.display = 'none';
          resolve();
        }); // end binary preprocessImage callback
      }); // end gray preprocessImage callback
    }); // end Promise
  } // end for loop

  // 所有截图处理完毕，从 imgResults 派生总结果
  ocrExpectedTotal = grandExpected;
  rebuildOcrCounts();
  let finalTotal = 0;
  for (const pool of ['xiari', 'junuan']) {
    for (const cnt of Object.values(ocrCounts[pool] || {})) finalTotal += cnt;
  }
  const debugInfo = allDebug.join(' | ').slice(0, 200);

  if (finalTotal === 0) {
    document.getElementById('ocrStatus').innerHTML =
      `⚠️ 处理了 ${files.length} 张截图，未识别到卡号<br><small style="font-size:10px;">${debugInfo}...</small>`;
  } else {
    document.getElementById('ocrStatus').innerHTML =
      `✅ 处理 ${files.length} 张截图，奖品位共 <b>${grandExpected || '?'}</b>，识别 <b>${finalTotal}</b> 张卡<br><small style="font-size:10px;">${debugInfo}</small>`;
  }
  document.getElementById('ocrLoading').style.display = 'none';
  renderOcrWarnings();
  renderOCR();
}

// 从 imgResults 重新汇总 ocrCounts + ocrSelected
function rebuildOcrCounts() {
  const acc = { xiari: {}, junuan: {} };
  for (const r of imgResults) {
    for (const [id, cnt] of Object.entries(r.counts || {})) {
      if (cnt > 0) acc[r.pool][id] = (acc[r.pool][id] || 0) + cnt;
    }
  }
  ocrCounts = acc;
  ocrSelected = { xiari: {}, junuan: {} };
  for (const pool of ['xiari', 'junuan']) {
    for (const [id, cnt] of Object.entries(ocrCounts[pool] || {})) {
      if (cnt > 0) ocrSelected[pool][id] = cnt;
    }
  }
}

// 刷新异常警告区
function renderOcrWarnings() {
  const warnEl = document.getElementById('ocrWarnings');
  if (!warnEl) return;
  const abnormals = imgResults.filter(
    r => r.expected > 0 && r.detected !== r.expected,
  );
  if (abnormals.length) {
    warnEl.innerHTML =
      '<div style="font-size:11px;color:var(--danger);margin-bottom:8px;">⚠️ 以下截图识别张数与奖位数不一致，点击修改：</div>' +
      abnormals
        .map(
          r =>
            `<span class="ocr-warn-chip" onclick="openImgEditModal(${r.idx})">第${r.idx + 1}张 ${r.detected}/${r.expected}</span>`,
        )
        .join('');
  } else {
    warnEl.innerHTML = '';
  }
}

// 单图编辑弹窗
let imgEditIdx = -1;
function openImgEditModal(idx) {
  const r = imgResults[idx];
  if (!r) return;
  imgEditIdx = idx;
  updateImgEditModal();
  document.getElementById('imgEditModal').style.display = 'flex';
}
// 刷新单图编辑弹窗内容（标题+图片+卡号列表+异常图切换导航）
function updateImgEditModal() {
  const r = imgResults[imgEditIdx];
  if (!r) return;
  const pn = r.pool === 'xiari' ? '🏖️ 夏日池' : '🍊 橘暖池';
  document.getElementById('imgEditTitle').innerHTML =
    `第 ${r.idx + 1} 张识别结果 <span style="font-size:11px;color:var(--brown-200);font-weight:500;">${pn} · 识别 ${r.detected}/${r.expected}</span>`;
  // 显示该图图片
  const imgEl = document.getElementById('imgEditImg');
  if (imgEl) imgEl.src = previewImgs[r.idx] || '';
  renderImgEditBody();
  // 异常图切换导航
  const navEl = document.getElementById('imgEditNav');
  if (navEl) {
    const abnormals = imgResults.filter(
      x => x.expected > 0 && x.detected !== x.expected,
    );
    if (abnormals.length > 1) {
      const curPos = abnormals.findIndex(x => x.idx === r.idx);
      const prev =
        abnormals[(curPos - 1 + abnormals.length) % abnormals.length].idx;
      const next = abnormals[(curPos + 1) % abnormals.length].idx;
      navEl.innerHTML = `<button class="btn btn-sm btn-outline" onclick="jumpImgEdit(${prev})">‹ 上一异常</button><span style="font-size:11px;color:var(--brown-200);">${curPos + 1}/${abnormals.length}</span><button class="btn btn-sm btn-outline" onclick="jumpImgEdit(${next})">下一异常 ›</button>`;
    } else {
      navEl.innerHTML = '';
    }
  }
}
function jumpImgEdit(idx) {
  imgEditIdx = idx;
  updateImgEditModal();
}
function renderImgEditBody() {
  const r = imgResults[imgEditIdx];
  if (!r) return;
  const body = document.getElementById('imgEditBody');
  const entries = Object.entries(r.counts || {}).filter(([, c]) => c > 0);
  if (entries.length === 0) {
    body.innerHTML =
      '<div style="text-align:center;color:var(--brown-200);padding:20px;">该图未识别到卡号</div>';
    return;
  }
  body.innerHTML = entries
    .map(([id, cnt]) => {
      const card = cardByID(r.pool, id);
      const name = card ? card.name : '?';
      const idText = id.toUpperCase();
      return `<div class="img-edit-cell">
      <span class="img-edit-id">${idText}</span>
      <span class="img-edit-name">${name}</span>
      <button class="ocr-adj-btn" onclick="adjustImgCard('${id}', -1)">−</button>
      <span class="img-edit-cnt">${cnt}</span>
      <button class="ocr-adj-btn" onclick="adjustImgCard('${id}', 1)">+</button>
    </div>`;
    })
    .join('');
}
function adjustImgCard(id, delta) {
  const r = imgResults[imgEditIdx];
  if (!r) return;
  const cur = r.counts[id] || 0;
  r.counts[id] = Math.max(0, cur + delta);
  if (r.counts[id] === 0) delete r.counts[id];
  r.detected = Object.values(r.counts).reduce((s, c) => s + c, 0);
  updateImgEditModal();
}
function confirmImgEdit() {
  document.getElementById('imgEditModal').style.display = 'none';
  rebuildOcrCounts();
  renderOcrWarnings();
  renderOCR();
  showToast('✅ 已更新总结果');
}

function renderOCR() {
  const container = document.getElementById('ocrNumbers');

  let totalSelected = 0;
  let html = '';

  // 两池分区展示，只显示有识别到卡的池
  for (const pool of ['xiari', 'junuan']) {
    const counts = ocrCounts[pool] || {};
    const hasCards = Object.values(counts).some(c => c > 0);
    if (!hasCards) continue;
    html += `<div class="ocr-pool-label">${POOLS[pool].name}</div>`;

    // 按卡牌类型分组（不含特典）
    const typeOrder = poolTypes(pool).map(t => ({
      type: t,
      ids: poolCards(pool)
        .filter(c => c.type === t && c.rarity !== 'ex')
        .map(c => c.id),
    }));

    for (const group of typeOrder) {
      html += `<div class="ocr-group-title">${group.type}</div>`;
      html += '<div class="ocr-grid">';
      for (const id of group.ids) {
        const detected = counts[id] || 0;
        const selected = (ocrSelected[pool] && ocrSelected[pool][id]) || 0;
        totalSelected += selected;
        const active = detected > 0 || selected > 0;
        if (active) {
          html += `<div class="ocr-cell has">
            <span class="ocr-cell-id">${id.toUpperCase()}</span>
            <div class="ocr-cell-ctrl">
              <button class="ocr-adj-btn" onclick="adjustOCR('${pool}','${id}', -1)">−</button>
              <span class="ocr-cell-cnt">${selected}</span>
              <button class="ocr-adj-btn" onclick="adjustOCR('${pool}','${id}', 1)">+</button>
            </div>
          </div>`;
        } else {
          html += `<div class="ocr-cell" onclick="adjustOCR('${pool}','${id}', 1)"><span class="ocr-cell-id">${id.toUpperCase()}</span></div>`;
        }
      }
      html += '</div>';
    }
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

function adjustOCR(pool, id, delta) {
  if (!ocrSelected[pool]) ocrSelected[pool] = {};
  const cur = ocrSelected[pool][id] || 0;
  const newVal = Math.max(0, Math.min(10, cur + delta));
  if (newVal === 0) {
    delete ocrSelected[pool][id];
  } else {
    ocrSelected[pool][id] = newVal;
  }
  renderOCR();
}

function selectAllOCR() {
  for (const pool of ['xiari', 'junuan']) {
    if (!ocrSelected[pool]) ocrSelected[pool] = {};
    for (const id of poolIDs(pool)) {
      if (id.startsWith('ex')) continue; // 特典不可 OCR
      ocrSelected[pool][id] = (ocrCounts[pool] && ocrCounts[pool][id]) || 0;
    }
  }
  renderOCR();
}
function deselectAllOCR() {
  ocrSelected = { xiari: {}, junuan: {} };
  renderOCR();
}

function confirmOCR() {
  let total = 0;
  for (const pool of ['xiari', 'junuan']) {
    const sel = ocrSelected[pool] || {};
    const cards = [];
    for (const [id, cnt] of Object.entries(sel)) {
      if (cnt > 0) {
        for (let i = 0; i < cnt; i++) cards.push(id);
      }
    }
    if (cards.length > 0) {
      addCardsToPool(pool, cards, 'ocr');
      total += cards.length;
    }
  }
  if (total === 0) {
    showToast('⚠️ 请先调整每张卡的数量（点 + 增加）');
    return;
  }
  clearOCR();
  showToast(`✅ 已添加 ${total} 张卡`);
}

function clearOCR() {
  document.getElementById('uploadPreview').classList.remove('show');
  previewImgs = [];
  showPreview(0);
  document.getElementById('ocrLoading').style.display = 'none';
  document.getElementById('ocrStatus').textContent =
    '🤖 识别到的卡号（点击 ± 调整数量）：';
  ocrCounts = { xiari: {}, junuan: {} };
  ocrSelected = { xiari: {}, junuan: {} };
  ocrExpectedTotal = 0;
  imgResults = [];
  document.getElementById('ocrNumbers').innerHTML = '';
  const warnEl = document.getElementById('ocrWarnings');
  if (warnEl) warnEl.innerHTML = '';
  document.getElementById('ocrCount').textContent = '0';
  const hint = document.getElementById('ocrExpectedHint');
  if (hint) hint.innerHTML = '';
}

// ==================== MANUAL INPUT (录入网格) ====================
// 一键保留模式：切换标记状态
function togglePurgeMode() {
  purgeMode = !purgeMode;
  const selectBtn = document.getElementById('purgeSelectBtn');
  const exportBtn = document.getElementById('purgeExportBtn');
  if (purgeMode) {
    // 进入模式：快照当前 cardCounts
    purgeSnapshot = JSON.parse(JSON.stringify(cardCounts));
  } else {
    // 取消模式：恢复 cardCounts 到快照
    if (purgeSnapshot) {
      cardCounts = JSON.parse(JSON.stringify(purgeSnapshot));
      purgeSnapshot = null;
      saveData();
      updateStats();
      renderPanels();
    }
  }
  if (selectBtn)
    selectBtn.textContent = purgeMode ? '取消一键保留' : '选择一键保留数据';
  if (exportBtn) exportBtn.disabled = !purgeMode;
  const quickEl = document.getElementById('purgeQuick');
  if (quickEl) quickEl.style.display = purgeMode ? '' : 'none';
  updatePurgeBadge();
  renderEntry();
}
// 一键设置两池所有普通卡为指定张数（保留模式快捷操作）
// 一键设置两池所有普通卡为指定张数（保留模式快捷操作）
function applyPurgeQuick() {
  if (!purgeMode) return;
  const inputEl = document.getElementById('purgeQuickInput');
  if (!inputEl) return;
  let n = parseInt(inputEl.value);
  if (isNaN(n) || n < 0) {
    showToast('⚠️ 请输入有效数字');
    return;
  }
  if (n > 99) n = 99;
  for (const pool of ['xiari', 'junuan']) {
    if (!cardCounts[pool]) cardCounts[pool] = {};
    for (const card of poolCards(pool)) {
      if (card.rarity === 'ex') continue; // 特殊奖励不设
      // 原数字小于设定值时保留原数字（不放大）
      const cur = cardCounts[pool][card.id] || 0;
      cardCounts[pool][card.id] = cur < n ? cur : n;
    }
  }
  saveData();
  renderEntry();
  updateStats();
  renderPanels();
  updatePurgeBadge();
  showToast(`✅ 已应用：每张卡最多保留 ${n} 张`);
}
// 计算正常模式总张数（快照）与保留模式总张数（当前）的差额，更新角标
function updatePurgeBadge() {
  const badge = document.getElementById('purgeBadge');
  if (!badge) return;
  if (!purgeMode || !purgeSnapshot) {
    badge.textContent = '';
    return;
  }
  let normalTotal = 0,
    purgeTotal = 0;
  for (const pool of ['xiari', 'junuan']) {
    for (const cnt of Object.values(purgeSnapshot[pool] || {}))
      normalTotal += cnt;
    for (const cnt of Object.values(cardCounts[pool] || {})) purgeTotal += cnt;
  }
  const diff = normalTotal - purgeTotal;
  if (diff > 0) {
    badge.textContent = '已消除' + diff + '张';
    badge.className = 'purge-badge up';
  } else if (diff < 0) {
    badge.textContent = '多出' + -diff + '张';
    badge.className = 'purge-badge down';
  } else {
    badge.textContent = '';
  }
}
// 导出一键保留数据（用保留模式下修改后的数字生成 JSON，退出时恢复原始数据）
async function exportPurgeData() {
  if (!purgeMode) return;
  // 计算差额：正常模式 - 保留模式
  let normalTotal = 0,
    purgeTotal = 0;
  for (const pool of ['xiari', 'junuan']) {
    for (const cnt of Object.values(purgeSnapshot[pool] || {}))
      normalTotal += cnt;
    for (const cnt of Object.values(cardCounts[pool] || {})) purgeTotal += cnt;
  }
  const diff = normalTotal - purgeTotal;
  // 保留模式比正常多 → 确认
  if (diff < 0) {
    const ok = await showConfirmModal({
      title: '⚠️ 提示',
      body: `导出数据比持有卡池数据多 ${-diff} 张，确实导出吗？`,
      buttons: [
        { text: '取消', type: 'outline', value: false },
        { text: '确定导出', type: 'primary', value: true },
      ],
    });
    if (!ok) return;
  }
  // 默认不覆盖：导出后恢复原始数据
  // 用当前 cardCounts（保留模式下用户修改后的数字）生成 JSON
  const data = {
    cardCounts,
    version: 3,
    exportedAt: new Date().toISOString(),
    type: 'purge',
  };
  const json = JSON.stringify(data);
  // 往记录页生成一条 purge 记录
  history.unshift({
    time: new Date().toISOString(),
    pool: currentPool,
    cards: [],
    type: 'purge',
    json,
  });
  // 默认不覆盖：恢复原始数据
  if (purgeSnapshot) {
    cardCounts = JSON.parse(JSON.stringify(purgeSnapshot));
    purgeSnapshot = null;
  }
  saveData();
  updateStats();
  renderPanels();
  renderHistory();
  // 自动复制到剪切板
  copyToClipboard(json, '✅ 已生成记录并复制到剪切板');
  // 退出标记模式，回到初始状态（隐藏角标、快捷操作区）
  exitPurgeMode();
}

// 退出保留模式，重置所有 UI 状态
function exitPurgeMode() {
  purgeMode = false;
  const selectBtn = document.getElementById('purgeSelectBtn');
  const exportBtn = document.getElementById('purgeExportBtn');
  const quickEl = document.getElementById('purgeQuick');
  const badge = document.getElementById('purgeBadge');
  if (selectBtn) selectBtn.textContent = '选择一键保留数据';
  if (exportBtn) exportBtn.disabled = true;
  if (quickEl) quickEl.style.display = 'none';
  if (badge) badge.textContent = '';
  renderEntry();
}

// 复制文本到剪切板（带提示）
function copyToClipboard(text, successMsg) {
  const done = () => {
    if (successMsg) showToast(successMsg);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(done)
      .catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done) {
  let ta;
  try {
    ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    done && done();
  } catch (e) {
    // 复制失败不影响主流程（记录页已有 JSON 可手动复制）
    done && done();
  } finally {
    if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
  }
}

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
  const keepBadge = purgeMode ? '<div class="keep-badge">保留</div>' : '';
  return `<div class="card-cell entry-cell ${card.rarity} ${cnt > 0 ? 'has' : 'zero'}" id="ecell-${card.id}">
    <div class="placeholder" data-cid="${idText}">${imgHTML}</div>
    ${keepBadge}
    <div class="cid">${idText}</div>
    <div class="cname">${card.name}</div>
    <div class="entry-ctrl">
      <button class="entry-btn" onclick="adjustEntry('${card.id}', -1)">−</button>
      <input class="entry-input" type="text" inputmode="numeric" pattern="[0-9]*" value="${cnt}" data-id="${card.id}" onfocus="this.select()" onchange="setEntryCount('${card.id}', this.value)">
      <button class="entry-btn" onclick="adjustEntry('${card.id}', 1)">+</button>
    </div>
    <div class="entry-over-hint" id="eohint-${card.id}"></div>
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
  // 保留模式下：当前数 > 原始数（快照）时显示红字提示
  const hint = cell.querySelector('.entry-over-hint');
  if (hint) {
    if (purgeMode && purgeSnapshot) {
      const orig =
        (purgeSnapshot[currentPool] && purgeSnapshot[currentPool][id]) || 0;
      if (cnt > orig) {
        hint.textContent = '超出原' + (cnt - orig) + '张';
        hint.style.display = 'block';
      } else {
        hint.style.display = 'none';
      }
    } else {
      hint.style.display = 'none';
    }
  }
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
  if (!purgeMode) {
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
  }
  saveData();
  // 局部更新：只改这一张卡 + 它所在组的计数，不重建整网格
  updateEntryCell(id);
  updateGroupCount(groupKeyOf(card));
  updateStats();
  renderPanels();
  updatePurgeBadge();
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
  if (!purgeMode) {
    const type = next > cur ? 'manual' : 'adjust';
    const diff = Math.abs(next - cur);
    const cards = Array(diff).fill(id);
    pushHistory({
      time: new Date().toISOString(),
      pool: currentPool,
      cards,
      type,
    });
  }
  saveData();
  updateEntryCell(id);
  updateGroupCount(groupKeyOf(card));
  updateStats();
  renderPanels();
  updatePurgeBadge();
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
  addCardsToPool(currentPool, cards, type);
}
// 指定池添加（OCR 混合上传时两池分别加）
function addCardsToPool(pool, cards, type) {
  if (!cardCounts[pool]) cardCounts[pool] = {};
  for (const id of cards) {
    cardCounts[pool][id] = (cardCounts[pool][id] || 0) + 1;
  }
  pushHistory({
    time: new Date().toISOString(),
    pool,
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
      const t = new Date(g.startMs);
      const ts = `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
      // 含 JSON 的导出记录（全量导出 / 一键保留导出）：独立展示 + 复制按钮
      if (
        g.items[0] &&
        (g.items[0].type === 'purge' || g.items[0].type === 'export')
      ) {
        const it = g.items[0];
        const isExport = it.type === 'export';
        const title = isExport ? '💾 全量数据导出' : '📤 一键保留导出';
        const preview =
          it.json.length > 120 ? it.json.slice(0, 120) + '...' : it.json;
        const applyBtn =
          it.type === 'purge'
            ? `<button class="btn btn-sm btn-outline purge-apply" onclick="viewPurgeCollection(${history.indexOf(it)})">📖 查看保留图鉴</button>`
            : '';
        return `<div class="history-item purge-item">
          <div class="history-header"><span class="history-pool">${title}</span><span class="history-time">${ts}</span></div>
          <div class="purge-json">${preview}</div>
          <div class="purge-actions">
            <button class="btn btn-sm btn-outline purge-copy" onclick="copyPurgeJson(${history.indexOf(it)})">📋 复制完整数据</button>
            ${applyBtn}
          </div>
        </div>`;
      }
      const pn = g.pool === 'xiari' ? '🏖️ 夏日池' : '🍊 橘暖池';
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
          ? `📸截图 ${g.items.reduce((s, it) => s + it.cards.length, 0)}张`
          : '🔟十连';
      return `<div class="history-item">
      <div class="history-header"><span class="history-pool">${pn} · ${label}</span><span class="history-time">${ts}</span></div>
      <div class="history-cards">${chips}</div>
    </div>`;
    })
    .join('');
}
// 复制某条 purge 记录的完整 JSON
function copyPurgeJson(idx) {
  const it = history[idx];
  if (!it || !it.json) return;
  copyToClipboard(it.json, '✅ 已复制到剪切板');
}
// 查看保留图鉴：弹窗展示该 purge 记录的两池卡牌及张数
function viewPurgeCollection(idx) {
  const it = history[idx];
  if (!it || !it.json) return;
  try {
    const data = JSON.parse(it.json);
    const counts = data.cardCounts || {};
    let html = '';
    const poolTotals = { xiari: 0, junuan: 0 };
    for (const pool of ['xiari', 'junuan']) {
      const c = counts[pool] || {};
      const poolTotal = Object.values(c).reduce((s, n) => s + n, 0);
      poolTotals[pool] = poolTotal;
      html += `<div class="purge-view-pool">${POOLS[pool].name}（${poolTotal}张）</div>`;
      if (poolTotal === 0) {
        html +=
          '<div style="font-size:12px;color:var(--brown-200);padding:8px 0;">无保留卡牌</div>';
        continue;
      }
      // 按卡牌类型分组
      for (const t of poolTypes(pool)) {
        const typeCards = poolCards(pool).filter(
          card => card.type === t && (c[card.id] || 0) > 0,
        );
        if (typeCards.length === 0) continue;
        html += `<div class="purge-view-type">${t}</div>`;
        html += '<div class="purge-view-grid">';
        for (const card of typeCards) {
          const cnt = c[card.id] || 0;
          if (cnt === 0) continue;
          html += `<div class="purge-view-cell ${card.rarity}">
            <div class="purge-view-img"><img src="${card.img}" alt="${card.id}"></div>
            <div class="purge-view-cnt">×${cnt}</div>
          </div>`;
        }
        html += '</div>';
      }
    }
    // 已获得奖励卡牌：直接用当前实时抽数/确认状态计算（查看历史保留图鉴时也是最新）
    const liveTotal = totalDraws();
    const personalEligible = liveTotal >= GLOBAL_PERSONAL_MIN;
    const rewardItems = [];
    PERSONAL_BONUS.forEach(m => {
      const val = m.pool ? poolDraws(m.pool) : liveTotal;
      if (m.stack) {
        const cnt = Math.floor(val / m.draws);
        if (cnt > 0)
          m.rewards.forEach(name =>
            rewardItems.push({ displayName: `${name} ×${cnt}`, imgName: name }),
          );
      } else if (val >= m.draws) {
        m.rewards.forEach(name =>
          rewardItems.push({ displayName: name, imgName: name }),
        );
      }
    });
    GLOBAL_BONUS.forEach(m => {
      if (GLOBAL_TOTAL_DRAWS >= m.draws && personalEligible)
        rewardItems.push({ displayName: m.card, imgName: m.card });
    });
    ['限时卡1', '限时卡2', '限时卡3'].forEach(name => {
      if (limitedUnlocked(name))
        rewardItems.push({ displayName: name, imgName: name });
    });
    if (promoUnlocked())
      rewardItems.push({ displayName: '宣传卡', imgName: '宣传卡' });

    if (rewardItems.length) {
      html += `<div class="purge-view-pool">🎁 已获得奖励卡牌（${rewardItems.length} 张）</div>`;
      html += '<div class="purge-view-grid">';
      for (const r of rewardItems) {
        html += `<div class="purge-view-cell">
          <div class="purge-view-img"><img src="${rewardImg(r.imgName)}" alt="${r.displayName}" onerror="this.style.display='none'"></div>
          <div class="purge-view-name">${r.displayName}</div>
        </div>`;
      }
      html += '</div>';
    }
    if (!html)
      html =
        '<div style="text-align:center;color:var(--brown-200);padding:30px;">无卡牌数据</div>';
    document.getElementById('bonusModalTitle').innerHTML =
      `📖 保留图鉴 <span style="font-size:12px;color:var(--brown-200);font-weight:500;">夏日池${poolTotals.xiari}张，橘暖池${poolTotals.junuan}张，奖励卡${rewardItems.length}张</span>`;
    document.getElementById('bonusModalBody').innerHTML = html;
    document.getElementById('bonusModal').style.display = 'flex';
  } catch (e) {
    showToast('⚠️ 数据解析失败');
  }
}
async function clearHistory() {
  const ok = await showConfirmModal({
    title: '清空记录',
    body: '确定要清空所有记录吗？（卡牌数量不会丢失）',
    buttons: [
      { text: '取消', type: 'outline', value: false },
      { text: '清空', type: 'primary', value: true },
    ],
  });
  if (ok) {
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
  // 往记录页生成一条导出记录（含 JSON 字符串，便于复制）
  history.unshift({
    time: new Date().toISOString(),
    pool: currentPool,
    cards: [],
    type: 'export',
    json,
  });
  saveData();
  renderHistory();
  // 先尝试下载文件（部分手机不支持则忽略），再做剪切板（避免剪切板操作打断下载）
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({
        files: [new File([json], 'x.json', { type: 'application/json' })],
      })
    ) {
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
  } catch (e) {}
  showToast('💾 数据已备份');
}

function importData() {
  // 打开导入弹窗（上传 / 粘贴）
  switchImportTab('file');
  document.getElementById('importPasteText').value = '';
  document.getElementById('importFileInput').value = '';
  document.getElementById('importModal').style.display = 'flex';
}
function switchImportTab(tab) {
  document
    .getElementById('importTabFile')
    .classList.toggle('active', tab === 'file');
  document
    .getElementById('importTabPaste')
    .classList.toggle('active', tab === 'paste');
  document.getElementById('importFileArea').style.display =
    tab === 'file' ? '' : 'none';
  document.getElementById('importPasteArea').style.display =
    tab === 'paste' ? '' : 'none';
}
function closeImportModal() {
  document.getElementById('importModal').style.display = 'none';
}
function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    if (applyImportData(ev.target.result)) {
      closeImportModal();
    }
  };
  reader.readAsText(file);
}
function confirmImportPaste() {
  const text = document.getElementById('importPasteText').value.trim();
  if (!text) {
    showToast('⚠️ 请先粘贴 JSON 文本');
    return;
  }
  if (applyImportData(text)) {
    closeImportModal();
  }
}
// 应用导入的 JSON 文本，成功返回 true
function applyImportData(text) {
  try {
    const data = JSON.parse(text);
    if (!data.cardCounts) {
      showToast('⚠️ 无效的备份数据');
      return false;
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
    loadData(); // 迁移导入的旧数据
    updateStats();
    renderCollection();
    renderHistory();
    renderPanels();
    showToast('📥 数据已导入');
    return true;
  } catch (err) {
    showToast('⚠️ 数据格式错误');
    return false;
  }
}

async function clearAllData() {
  const ok = await showConfirmModal({
    title: '⚠️ 清空所有数据',
    body: '确定要清空所有数据吗？（包括卡牌数量、记录、卡图）<br><br><strong style="color:var(--danger);">此操作不可恢复！建议先备份。</strong>',
    buttons: [
      { text: '取消', type: 'outline', value: false },
      { text: '清空', type: 'primary', value: true },
    ],
  });
  if (!ok) return;
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
// 通用确认弹窗（替代系统 confirm）
// opts: { title, body, buttons: [{text, type, value}] }
// 返回 Promise，resolve 用户点击的 value
let _confirmResolve = null;
function showConfirmModal(opts) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = opts.title || '提示';
    document.getElementById('confirmBody').innerHTML = opts.body || '';
    const actions = document.getElementById('confirmActions');
    const btns = opts.buttons || [
      { text: '确定', type: 'primary', value: true },
    ];
    actions.innerHTML = btns
      .map(
        (b, i) =>
          `<button class="btn ${b.type === 'primary' ? 'btn-primary' : 'btn-outline'}" style="flex:1;" onclick="closeConfirmModal(${i})">${b.text}</button>`,
      )
      .join('');
    // 存按钮值供 closeConfirmModal 取
    actions._btnValues = btns.map(b => b.value);
    document.getElementById('confirmModal').style.display = 'flex';
  });
}
function closeConfirmModal(btnIdx) {
  document.getElementById('confirmModal').style.display = 'none';
  if (_confirmResolve) {
    const val =
      btnIdx >= 0
        ? document.getElementById('confirmActions')._btnValues[btnIdx]
        : null;
    _confirmResolve(val);
    _confirmResolve = null;
  }
}

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
// 启动时弹出存储提醒（版本升级或未选"不再提醒"时弹出）
const NOTICE_VERSION = '1.3'; // 更新此版本号会让弹窗重新弹出
const NOTICE_UPDATES = [
  '修复全员满赠下个人抽数要求的逻辑错误',
  '新增多图上传识别异常时，异常图修改功能',
];
(function showNoticeIfNeeded() {
  const lastDismissed = localStorage.getItem('ccg_notice_version') || '';
  const dismissed = localStorage.getItem('ccg_notice_dismiss') === '1';
  // 版本升级 或 未选不再提醒 → 弹出
  if (lastDismissed !== NOTICE_VERSION || !dismissed) {
    document.getElementById('noticeVer').textContent = 'v' + NOTICE_VERSION;
    document.getElementById('noticeUpdateList').innerHTML = NOTICE_UPDATES.map(
      u => `<li>${u}</li>`,
    ).join('');
    document.getElementById('noticeModal').style.display = 'flex';
  }
})();
function closeNotice(dontRemind) {
  document.getElementById('noticeModal').style.display = 'none';
  if (dontRemind) {
    try {
      localStorage.setItem('ccg_notice_dismiss', '1');
      localStorage.setItem('ccg_notice_version', NOTICE_VERSION);
    } catch (e) {}
  }
}
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
        left = Math.max(
          4,
          Math.min(window.innerWidth - el.offsetWidth - 4, left),
        );
        top = Math.max(
          4,
          Math.min(window.innerHeight - el.offsetHeight - 4, top),
        );
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
