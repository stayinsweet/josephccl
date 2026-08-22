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
  // 小卡池：仅随手机号库存同步展示，不参与录入，也不参与任何满赠叠加
  xiaoka: {
    name: '🎴 小卡池',
    imgDir: 'images/小卡池',
    ranges: [
      ['吴老狗', 'ssr', 1, 3],
      ['日常卡', 'ssr', 4, 8],
      ['吴老狗', 'pr', 1, 2],
    ],
    specials: [],
    specialImgs: {},
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
// png 扩展名的编号卡（按池区分，其余编号卡为 jpg）
const POOL_PNG_IDS = {
  junuan: new Set(['r10', 'r11', 'r12', 'r13']),
  xiaoka: new Set(['ssr4', 'ssr5', 'ssr6', 'ssr7', 'ssr8']),
};
// 编号卡图片路径：统一小写（橘暖池 r10-13、小卡池 ssr4-8 为 png 其余 jpg）
function numberedImgPath(pool, id) {
  const dir = POOLS[pool].imgDir;
  const ext = POOL_PNG_IDS[pool] && POOL_PNG_IDS[pool].has(id) ? 'png' : 'jpg';
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

// ── 卡池角色划分 ────────────────────────────────────────────
// 全部卡池（含小卡池）：数据结构、账号合并、清空、手机号库存导入按此遍历
const ALL_POOLS = ['xiari', 'junuan', 'xiaoka'];
// 参与满赠叠加的池（小卡池不参与任何满赠）：totalDraws 等满赠口径按此遍历
const BONUS_POOLS = ['xiari', 'junuan'];
// 参与录入的池（手动输入/截图识别/一键保留网格）：小卡池仅由库存同步，不可录入
const ENTRY_POOLS = ['xiari', 'junuan'];
// 一键保留「一键应用 N 张」仅生效的稀有度，其余稀有度保持原张数
const QUICK_RARITIES = ['r', 'sr', 'ssr', 'pr'];
// 操作页展示的卡池：手动模式=双池（小卡池不参与录入）；
// 库存模式=三池（小卡池可见，普通状态只读展示、保留模式可调）；
// 许愿卡进行中仅双池（每满 300 选 3 的口径不含小卡池）
function entryPoolsForView() {
  if (opMode === 'wish') return ENTRY_POOLS;
  return isStockMode() ? ALL_POOLS : ENTRY_POOLS;
}
// 三池空计数模板
function emptyCounts() {
  return { xiari: {}, junuan: {}, xiaoka: {} };
}

// ==================== STATE ====================
// ── 运行模式开关 ─────────────────────────────────────────────
// 'stock'  = 真实库存模式：库存仅通过手机号远程同步，录入网格只读，
//            可变操作集中在「操作菜单」（一键保留 / 使用许愿卡）
// 'manual' = 手动录入模式：手动 ± / 直填 / 截图 OCR 录入全部开放
// 模式持久化在 localStorage(ccg_app_mode)，可通过顶栏按钮运行时切换
// （toggleAppMode），UI 显隐由 applyAppMode() 同步，业务用 isStockMode() 判断。
let APP_MODE =
  localStorage.getItem('ccg_app_mode') === 'manual' ? 'manual' : 'stock';
function isStockMode() {
  return APP_MODE === 'stock';
}

let cardCounts = emptyCounts();
let history = [];
let cardImages = emptyCounts();

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
  { draws: 100, rewards: ['夏日100'], pool: 'xiari' },
  { draws: 100, rewards: ['橘暖100'], pool: 'junuan' },
  { draws: 120, rewards: ['白瓷卡'] },
  { draws: 150, rewards: ['水敏卡'] },
  { draws: 150, rewards: ['夏日150'], pool: 'xiari' },
  { draws: 150, rewards: ['橘暖150'], pool: 'junuan' },
  { draws: 180, rewards: ['仿真cd'] },
  { draws: 200, rewards: ['夏日200'], pool: 'xiari' },
  { draws: 200, rewards: ['橘暖200'], pool: 'junuan' },
  { draws: 210, rewards: ['卡套'] },
  { draws: 240, rewards: ['仿真拍立得1'] },
  { draws: 270, rewards: ['仿真拍立得2'] },
  { draws: 300, rewards: ['许愿卡'], note: '可许愿三张，可叠加', stack: true },
];
const PERSONAL_BONUS_TOTAL = PERSONAL_BONUS.reduce(
  (s, m) => s + m.rewards.length,
  0,
); // 奖励卡位按数组自动统计（当前 24），避免加档位后忘更新

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
  特典卡8: '特典 8',
  特典卡9: '特典 9',
  限时卡1: '限时1',
  限时卡2: '限时2',
  限时卡3: '限时3',
  宣传卡: '宣传',
  小狗卡: '小狗卡',
  尖叫之夜: '尖叫之夜卡',
  蓝柚子: '蓝柚子',
  绿柚子: '绿柚子',
};
function rewardImg(name) {
  const dir = name.startsWith('特典')
    ? '全员满赠'
    : name.startsWith('限时') ||
        name.startsWith('宣传') ||
        YUZU_REWARDS.includes(name)
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
  { draws: 230000, card: '特典卡8' },
  { draws: 250000, card: '特典卡9' },
];
// 全员抽数（代码常量，手动更新）— 全员满赠按此值判定
const GLOBAL_TOTAL_DRAWS = 252299;
// 个人满赠门槛：全员达标后还需个人双池合计 >= 此值才有资格获取特典卡
const GLOBAL_PERSONAL_MIN = 10;
let currentPool = 'xiari';
let currentTab = 'collection';
let groupMode = 'type'; // 'rarity' | 'type'
let modalCard = null;
// 操作模式：null=普通 / 'purge'=一键保留 / 'wish'=使用许愿卡
// 两者复用同一套录入网格交互（± / 直填 / 分组进度 / 导出记录）
let opMode = null;
let opSnapshot = null; // 进入一键保留前的 cardCounts 快照（退出/导出后恢复）
let wishCounts = null; // 许愿卡草稿选择（不写入 cardCounts，不影响统计）
let wishLimit = 0; // 许愿卡可选张数上限（双池每满 300 张可选 3 张）
// 额外奖励（限时礼 / 宣传礼）用户确认状态
let extraRewards = {
  限时时段: null,
  宣传达标: false,
  宣传下单时间: '',
  柚子夏日10: false,
  柚子夏日20: false,
  柚子橘暖10: false,
  柚子橘暖20: false,
};

// 多账号：accounts = { id: {name, cardCounts, history, cardImages, extraRewards} }
// activeAccountId 为真实 id 或 'all'（合并视图）；accountOrder 为显示顺序
let accounts = {};
let activeAccountId = 'a1';
let accountOrder = [];

// 空账号数据模板
function emptyAccountData() {
  return {
    cardCounts: emptyCounts(),
    history: [],
    cardImages: emptyCounts(),
    extraRewards: {
      限时时段: null,
      宣传达标: false,
      宣传下单时间: '',
      柚子夏日10: false,
      柚子夏日20: false,
      柚子橘暖10: false,
      柚子橘暖20: false,
    },
  };
}
// 默认 extraRewards
function defaultExtraRewards() {
  return {
    限时时段: null,
    宣传达标: false,
    宣传下单时间: '',
    柚子夏日10: false,
    柚子夏日20: false,
    柚子橘暖10: false,
    柚子橘暖20: false,
  };
}

// ==================== PERSISTENCE ====================
// 双模式数据分家：手动/库存各自独立存储，互不共享
function modeStorageKey(mode) {
  return mode === 'stock' ? 'ccg2_stock_data' : 'ccg2_data';
}
function loadData() {
  try {
    // 库存模式首次启动（尚无独立存储）时，以现有 ccg2_data 为底拷贝一份，此后两模式各自独立演化
    if (APP_MODE === 'stock' && !localStorage.getItem('ccg2_stock_data')) {
      const legacy = localStorage.getItem('ccg2_data');
      if (legacy) localStorage.setItem('ccg2_stock_data', legacy);
    }
    const d = JSON.parse(
      localStorage.getItem(modeStorageKey(APP_MODE)) || '{}',
    );
    if (d.accounts && d.version >= 4) {
      // v4 路径
      accounts = d.accounts;
      accountOrder = d.accountOrder || Object.keys(accounts);
      // 校验 activeAccountId 合法
      if (
        d.activeAccountId !== 'all' &&
        !(d.activeAccountId && accounts[d.activeAccountId])
      ) {
        activeAccountId = accountOrder[0] || 'a1';
      } else {
        activeAccountId = d.activeAccountId;
      }
    } else {
      // v3（或更旧）→ 迁移一次：把顶层单用户数据折进 a1
      const acc = emptyAccountData();
      acc.cardCounts = d.cardCounts || emptyCounts();
      acc.cardImages = d.cardImages || emptyCounts();
      acc.extraRewards = d.extraRewards || defaultExtraRewards();
      // 旧 history 每项回填 accountId
      acc.history = (d.history || []).map(h =>
        h.accountId ? h : { ...h, accountId: 'a1' },
      );
      accounts = { a1: { name: '默认账号', ...acc } };
      accountOrder = ['a1'];
      activeAccountId = 'a1';
    }
  } catch (e) {
    // 绝不丢数据：回退一个空默认账号
    accounts = { a1: { name: '默认账号', ...emptyAccountData() } };
    accountOrder = ['a1'];
    activeAccountId = 'a1';
  }
  // 按账号清理无效 id（卡池更新后旧 id 如 xiari 的 r9/r10/r11），并补齐小卡池键
  for (const acc of Object.values(accounts)) {
    if (!acc.cardCounts) acc.cardCounts = emptyCounts();
    if (!acc.cardImages) acc.cardImages = emptyCounts();
    if (!acc.history) acc.history = [];
    if (!acc.extraRewards) acc.extraRewards = defaultExtraRewards();
    for (const pool of ALL_POOLS) {
      if (!acc.cardCounts[pool]) acc.cardCounts[pool] = {};
      if (!acc.cardImages[pool]) acc.cardImages[pool] = {};
      const valid = new Set(poolIDs(pool));
      for (const id of Object.keys(acc.cardCounts[pool] || {})) {
        if (!valid.has(id)) delete acc.cardCounts[pool][id];
      }
      for (const id of Object.keys(acc.cardImages[pool] || {})) {
        if (!valid.has(id)) delete acc.cardImages[pool][id];
      }
    }
  }
  // 装载当前账号（或合并）到活动全局
  loadActiveAccountIntoGlobals();
}
// 把活动全局回写到当前账号（合并视图跳过）
function persistActiveAccount() {
  if (activeAccountId === 'all' || !accounts[activeAccountId]) return;
  accounts[activeAccountId].cardCounts = cardCounts;
  accounts[activeAccountId].history = history;
  accounts[activeAccountId].cardImages = cardImages;
  accounts[activeAccountId].extraRewards = extraRewards;
}
function saveData() {
  persistActiveAccount();
  localStorage.setItem(
    modeStorageKey(APP_MODE),
    JSON.stringify({
      version: 4,
      activeAccountId,
      accountOrder,
      accounts,
    }),
  );
}

// ==================== ACCOUNT SWITCHING（多账号间接层）====================
function isMergedView() {
  return activeAccountId === 'all';
}
function activeAccount() {
  return isMergedView() ? null : accounts[activeAccountId];
}
// 装载当前账号数据到活动全局（单账号=引用写穿；合并=克隆）
function loadActiveAccountIntoGlobals() {
  if (activeAccountId === 'all') {
    computeMergedGlobals();
  } else {
    const a = accounts[activeAccountId];
    if (!a) {
      // 异常兜底
      accounts[activeAccountId] = { name: '默认账号', ...emptyAccountData() };
      const a2 = accounts[activeAccountId];
      cardCounts = a2.cardCounts;
      history = a2.history;
      cardImages = a2.cardImages;
      extraRewards = a2.extraRewards;
      return;
    }
    cardCounts = a.cardCounts;
    history = a.history;
    cardImages = a.cardImages;
    extraRewards = a.extraRewards;
  }
}
// 计算合并视图的全局克隆（cardCounts 求和 / history 拼接排序 / cardImages 首见 / extraRewards 派生）
function computeMergedGlobals() {
  cardCounts = emptyCounts();
  for (const id of accountOrder) {
    const acc = accounts[id];
    if (!acc) continue;
    for (const pool of ALL_POOLS) {
      for (const [cid, cnt] of Object.entries(acc.cardCounts[pool] || {})) {
        cardCounts[pool][cid] = (cardCounts[pool][cid] || 0) + cnt;
      }
    }
  }
  // history 拼接 + 按时间降序
  const all = [];
  for (const id of accountOrder) {
    const acc = accounts[id];
    if (!acc) continue;
    for (const h of acc.history || [])
      all.push(h.accountId ? h : { ...h, accountId: id });
  }
  all.sort((a, b) => new Date(b.time) - new Date(a.time));
  history = all;
  // cardImages 首见优先
  cardImages = emptyCounts();
  for (const id of accountOrder) {
    const acc = accounts[id];
    if (!acc) continue;
    for (const pool of ALL_POOLS) {
      for (const [cid, img] of Object.entries(acc.cardImages[pool] || {})) {
        if (!cardImages[pool][cid]) cardImages[pool][cid] = img;
      }
    }
  }
  // extraRewards 派生并集（仅展示，确认动作被 guard）
  extraRewards = {
    限时时段:
      accountOrder
        .map(id => accounts[id] && accounts[id].extraRewards.限时时段)
        .find(Boolean) || null,
    宣传达标: accountOrder.some(
      id => accounts[id] && accounts[id].extraRewards.宣传达标,
    ),
    宣传下单时间:
      accountOrder
        .map(id => accounts[id] && accounts[id].extraRewards.宣传下单时间)
        .find(Boolean) || '',
  };
}
// 切换账号（单账号或合并视图）
function switchAccount(id) {
  if (id !== 'all' && !accounts[id]) return;
  if (opMode) finishOpMode(); // 操作快照/草稿属上一账号视图，不可串
  activeAccountId = id;
  loadActiveAccountIntoGlobals();
  saveData();
  updateStats();
  renderPanels();
  renderCollection();
  if (currentTab === 'entry') renderEntry();
  if (currentTab === 'history') renderHistory();
  updateAccountSwitcherLabel();
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
// 双池合计抽数（满赠口径：小卡池不参与任何满赠叠加）
function totalDraws() {
  let total = 0;
  for (const pool of BONUS_POOLS) {
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
// 三池合计张数（含小卡池，不含奖励卡）：一键保留的开启门槛口径
function grandTotalDraws() {
  let total = 0;
  for (const pool of ALL_POOLS) {
    for (const cnt of Object.values(cardCounts[pool] || {})) total += cnt;
  }
  return total;
}
// 许愿卡可选张数：双池（不含小卡池）每满 300 张可选 3 张
// 300→3、600→6、400→3（不足 300 为 0，不开放）
function wishQuota() {
  return Math.floor(totalDraws() / 300) * 3;
}
// 个人满赠档位是否解锁：单池档位按该池抽数，双池档位按合计
function personalTierUnlocked(m) {
  const val = m.pool ? poolDraws(m.pool) : totalDraws();
  return val >= m.draws;
}
// 个人满赠已解锁奖励卡数（按「卡位」计：叠加档位如许愿卡只算1个卡位，
// 实际张数 ×N 仅在卡片上展示，不计入进度计数）
function personalUnlockedCount() {
  if (isMergedView()) return mergedUnlockedByCategory().personal.size;
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
  if (isMergedView()) return mergedUnlockedByCategory().global.size;
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
// 柚子限时礼：7.25 当天下单抽卡，用户分四种情况自确认（夏日/橘暖 各 满10/满20）
const YUZU_REWARDS = ['小狗卡', '尖叫之夜', '蓝柚子', '绿柚子'];
const YUZU_CARD_TIERS = {
  小狗卡: '7.25 · 夏日池满10抽',
  尖叫之夜: '7.25 · 夏日池满20抽',
  蓝柚子: '7.25 · 橘暖池满10抽',
  绿柚子: '7.25 · 橘暖池满20抽',
};
const YUZU_TIERS = [
  {
    key: '柚子夏日10',
    label: '7.25 夏日池满 10 抽',
    rewards: ['小狗卡'],
    rewardText: '小狗卡',
  },
  {
    key: '柚子夏日20',
    label: '7.25 夏日池满 20 抽',
    rewards: ['尖叫之夜', '小狗卡'],
    rewardText: '尖叫之夜 + 小狗卡',
  },
  {
    key: '柚子橘暖10',
    label: '7.25 橘暖池满 10 抽',
    rewards: ['蓝柚子'],
    rewardText: '蓝柚子',
  },
  {
    key: '柚子橘暖20',
    label: '7.25 橘暖池满 20 抽',
    rewards: ['蓝柚子', '绿柚子'],
    rewardText: '蓝柚子 + 绿柚子',
  },
];
// 是否勾选过任一柚子档位
function yuzuConfirmed() {
  return YUZU_TIERS.some(t => !!extraRewards[t.key]);
}
// 柚子卡是否解锁（对应档位已自确认；共享卡任一含它的档位勾选即解锁）
function yuzuUnlocked(name) {
  return YUZU_TIERS.some(
    t => !!extraRewards[t.key] && t.rewards.includes(name),
  );
}
// 柚子限时礼已解锁卡数（0-4）
function yuzuUnlockedCount() {
  return YUZU_REWARDS.filter(name => yuzuUnlocked(name)).length;
}
// 额外奖励已解锁总数（限时 + 宣传 + 柚子）
function extraUnlockedCount() {
  if (isMergedView()) {
    const c = mergedUnlockedByCategory();
    return c.limited.size + c.promo.size + c.yuzu.size;
  }
  return (
    limitedUnlockedCount() + (promoUnlocked() ? 1 : 0) + yuzuUnlockedCount()
  );
}
const EXTRA_TOTAL = 8; // 限时3 + 宣传1 + 柚子4

// ==================== 多账号：按账号计算奖励解锁（纯函数，不碰全局）====================
function accountTotalDraws(acc) {
  let t = 0;
  for (const pool of ['xiari', 'junuan'])
    for (const cnt of Object.values((acc.cardCounts || {})[pool] || {}))
      t += cnt;
  return t;
}
function accountPoolDraws(acc, pool) {
  let n = 0;
  for (const cnt of Object.values((acc.cardCounts || {})[pool] || {})) n += cnt;
  return n;
}
function accountPersonalTierUnlocked(acc, m) {
  const val = m.pool ? accountPoolDraws(acc, m.pool) : accountTotalDraws(acc);
  return val >= m.draws;
}
// 返回该账号已解锁的奖励卡名，分四类 Set
function accountUnlockedByCategory(acc) {
  const personal = new Set(),
    global = new Set(),
    limited = new Set(),
    promo = new Set();
  for (const m of PERSONAL_BONUS) {
    const val = m.pool ? accountPoolDraws(acc, m.pool) : accountTotalDraws(acc);
    const unlocked = m.stack ? Math.floor(val / m.draws) > 0 : val >= m.draws;
    if (unlocked) m.rewards.forEach(n => personal.add(n));
  }
  const eligible = accountTotalDraws(acc) >= GLOBAL_PERSONAL_MIN;
  for (const m of GLOBAL_BONUS) {
    if (GLOBAL_TOTAL_DRAWS >= m.draws && eligible) global.add(m.card);
  }
  const t = acc.extraRewards && acc.extraRewards.限时时段;
  const limitedSet =
    t === '0-2'
      ? ['限时卡1', '限时卡2', '限时卡3']
      : t === '3-6'
        ? ['限时卡1', '限时卡2']
        : t === '7-24'
          ? ['限时卡3']
          : [];
  limitedSet.forEach(n => limited.add(n));
  if (
    accountTotalDraws(acc) > 0 &&
    acc.extraRewards &&
    acc.extraRewards.宣传达标
  )
    promo.add('宣传卡');
  // 柚子限时礼：账号自确认的四种档位
  const yuzu = new Set();
  for (const t of YUZU_TIERS) {
    if (acc.extraRewards && acc.extraRewards[t.key])
      t.rewards.forEach(n => yuzu.add(n));
  }
  return { personal, global, limited, promo, yuzu };
}
// 合并视图：各账号四类取并集
function mergedUnlockedByCategory() {
  const agg = {
    personal: new Set(),
    global: new Set(),
    limited: new Set(),
    promo: new Set(),
    yuzu: new Set(),
  };
  for (const id of accountOrder) {
    const acc = accounts[id];
    if (!acc) continue;
    const c = accountUnlockedByCategory(acc);
    for (const k of Object.keys(agg)) for (const n of c[k]) agg[k].add(n);
  }
  return agg;
}
function mergedUnlockedSet() {
  const c = mergedUnlockedByCategory();
  return new Set([
    ...c.personal,
    ...c.global,
    ...c.limited,
    ...c.promo,
    ...c.yuzu,
  ]);
}
// 任一账号该确认字段为真
function anyAccountExtraConfirmed(field) {
  return accountOrder.some(
    id =>
      accounts[id] &&
      accounts[id].extraRewards &&
      accounts[id].extraRewards[field],
  );
}

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
  // 操作模式下切到「我的收藏」或「记录」时，先自动取消（恢复原始数量/丢弃草稿）
  if (opMode && (tab === 'collection' || tab === 'history')) {
    finishOpMode();
  }
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
  if (tab === 'entry') {
    // 当前模式操作页不含该卡池时回落到夏日池（手动模式不含小卡池）
    if (!entryPoolsForView().includes(currentPool)) {
      currentPool = 'xiari';
      document
        .querySelectorAll('.pool-tab')
        .forEach(b =>
          b.classList.toggle('active', b.dataset.pool === currentPool),
        );
    }
    renderOpsBar();
    if (currentSubTab === 'input') renderEntry();
  }
}

// 录入页子页签切换（manual 模式：手动输入 / 截图识别）
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
// 构建当前视图所有奖励卡列表（与 renderRewardPool 的 cell onclick 参数一致）
// 顺序：个人满赠 → 全员满赠 → 限时礼 → 宣传礼；用于详情页左右切换
function buildRewardCards() {
  const list = [];
  if (isMergedView()) {
    const cat = mergedUnlockedByCategory();
    PERSONAL_BONUS.forEach(m => {
      const tierLabel = m.pool
        ? `${m.pool === 'xiari' ? '夏日' : '橘暖'}池${m.draws}抽`
        : `${m.draws}抽`;
      m.rewards.forEach(name => {
        list.push({
          name,
          source: '个人满赠',
          tier: m.note ? `${tierLabel} · ${m.note}` : tierLabel,
          unlocked: cat.personal.has(name),
        });
      });
    });
    GLOBAL_BONUS.forEach(m => {
      list.push({
        name: m.card,
        source: '全员满赠',
        tier: fmtWan(m.draws) + '抽',
        unlocked: cat.global.has(m.card),
      });
    });
    ['限时卡1', '限时卡2', '限时卡3'].forEach((name, i) => {
      list.push({
        name,
        source: '限时礼',
        tier: i < 2 ? '0-2h / 3-6h' : '0-2h / 7-24h',
        unlocked: cat.limited.has(name),
      });
    });
    list.push({
      name: '宣传卡',
      source: '宣传礼',
      tier: '达标+有记录',
      unlocked: cat.promo.has('宣传卡'),
    });
    YUZU_REWARDS.forEach(name =>
      list.push({
        name,
        source: '柚子限时礼',
        tier: YUZU_CARD_TIERS[name],
        unlocked: cat.yuzu.has(name),
      }),
    );
    return list;
  }
  // 单账号视图
  const total = totalDraws();
  PERSONAL_BONUS.forEach(m => {
    const unlocked = personalTierUnlocked(m);
    const tierLabel = m.pool
      ? `${m.pool === 'xiari' ? '夏日' : '橘暖'}池${m.draws}抽`
      : `${m.draws}抽`;
    m.rewards.forEach(name => {
      if (m.stack) {
        const cnt = Math.floor(total / m.draws);
        list.push({
          name: cnt > 0 ? `${name} ×${cnt}` : name,
          source: '个人满赠',
          tier: m.note || tierLabel,
          unlocked: cnt > 0,
        });
      } else {
        list.push({
          name,
          source: '个人满赠',
          tier: m.note ? `${tierLabel} · ${m.note}` : tierLabel,
          unlocked,
        });
      }
    });
  });
  const personalEligible = total >= GLOBAL_PERSONAL_MIN;
  GLOBAL_BONUS.forEach(m => {
    list.push({
      name: m.card,
      source: '全员满赠',
      tier: fmtWan(m.draws) + '抽',
      unlocked: GLOBAL_TOTAL_DRAWS >= m.draws && personalEligible,
    });
  });
  ['限时卡1', '限时卡2', '限时卡3'].forEach((name, i) => {
    list.push({
      name,
      source: '限时礼',
      tier: i < 2 ? '0-2h / 3-6h' : '0-2h / 7-24h',
      unlocked: limitedUnlocked(name),
    });
  });
  list.push({
    name: '宣传卡',
    source: '宣传礼',
    tier: '达标+有记录',
    unlocked: promoUnlocked(),
  });
  YUZU_REWARDS.forEach(name =>
    list.push({
      name,
      source: '柚子限时礼',
      tier: YUZU_CARD_TIERS[name],
      unlocked: yuzuUnlocked(name),
    }),
  );
  return list;
}
function renderRewardPool() {
  const panel = document.getElementById('rewardPool');
  if (!panel) return;
  if (isMergedView()) return renderRewardPoolMerged(panel);
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
  // 柚子限时礼
  const yuzuCards = YUZU_REWARDS.map(name => ({
    name,
    tier: YUZU_CARD_TIERS[name],
    unlocked: yuzuUnlocked(name),
  }));
  const yUnlocked = yuzuCards.filter(c => c.unlocked).length;
  const yConfirmed = yuzuConfirmed();

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
    ${renderConfirmGroup('柚子限时礼', `${yUnlocked}/4`, yuzuCards, 'rw-yuzu', yConfirmed, 'openYuzuConfirm()')}
  `;
}

// 合并视图奖励卡池：各账号解锁取并集，确认按钮展示任一账号确认状态（点击被 guard 拦截）
function renderRewardPoolMerged(panel) {
  const cat = mergedUnlockedByCategory();
  // 个人满赠：每张奖励卡 unlocked = 任一账号解锁
  const personalCards = [];
  PERSONAL_BONUS.forEach(m => {
    const tierLabel = m.pool
      ? `${m.pool === 'xiari' ? '夏日' : '橘暖'}池${m.draws}抽`
      : `${m.draws}抽`;
    m.rewards.forEach(name => {
      personalCards.push({
        name,
        source: '个人满赠',
        tier: m.note ? `${tierLabel} · ${m.note}` : tierLabel,
        unlocked: cat.personal.has(name),
      });
    });
  });
  const globalCards = GLOBAL_BONUS.map(m => ({
    name: m.card,
    source: '全员满赠',
    tier: fmtWan(m.draws) + '抽',
    unlocked: cat.global.has(m.card),
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

  const pUnlocked = cat.personal.size;
  const gUnlocked = cat.global.size;

  const limitedCards = [
    {
      name: '限时卡1',
      tier: '0-2h / 3-6h',
      unlocked: cat.limited.has('限时卡1'),
    },
    {
      name: '限时卡2',
      tier: '0-2h / 3-6h',
      unlocked: cat.limited.has('限时卡2'),
    },
    {
      name: '限时卡3',
      tier: '0-2h / 7-24h',
      unlocked: cat.limited.has('限时卡3'),
    },
  ];
  const promoCards = [
    { name: '宣传卡', tier: '达标+有记录', unlocked: cat.promo.has('宣传卡') },
  ];
  const lUnlocked = cat.limited.size;
  const rUnlocked = cat.promo.size;
  const lConfirmed = anyAccountExtraConfirmed('限时时段');
  const rConfirmed = anyAccountExtraConfirmed('宣传达标');
  // 柚子限时礼（各账号解锁取并集）
  const yuzuCards = YUZU_REWARDS.map(name => ({
    name,
    tier: YUZU_CARD_TIERS[name],
    unlocked: cat.yuzu.has(name),
  }));
  const yUnlocked = cat.yuzu.size;
  const yConfirmed = YUZU_TIERS.some(t => anyAccountExtraConfirmed(t.key));

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
    <div class="panel-title"><span class="title-bar"></span>奖励卡池 <span class="panel-sub">合并视图·各账号解锁取并集</span></div>
    ${renderGroup('个人满赠', `${pUnlocked}/${PERSONAL_BONUS_TOTAL}`, personalCards, 'rw-personal')}
    ${renderGroup('全员满赠', `${gUnlocked}/${GLOBAL_BONUS.length}`, globalCards, 'rw-global')}
    ${renderConfirmGroup('限时礼', `${lUnlocked}/3`, limitedCards, 'rw-limited', lConfirmed, 'openLimitedConfirm()')}
    ${renderConfirmGroup('宣传礼', `${rUnlocked}/1`, promoCards, 'rw-promo', rConfirmed, 'openPromoConfirm()')}
    ${renderConfirmGroup('柚子限时礼', `${yUnlocked}/4`, yuzuCards, 'rw-yuzu', yConfirmed, 'openYuzuConfirm()')}
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
  const rewardTotal = PERSONAL_BONUS_TOTAL + GLOBAL_BONUS.length + EXTRA_TOTAL; // 24 + 9 + 8 = 41

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
        <div class="ov-note">含满赠 + 限时礼 + 宣传礼 + 柚子礼</div>
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
  // 柚子限时礼
  YUZU_REWARDS.forEach(name =>
    list.push({
      name,
      img: rewardImg(name),
      owned: yuzuUnlocked(name),
      sub: '柚子限时礼',
    }),
  );
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
  if (isMergedView()) {
    panel.innerHTML = `<div class="bn-merged-note">满赠按各账号单独计算，请选择具体账号查看进度</div>`;
    return;
  }
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
let extraModalMode = null; // 'limited' | 'promo' | 'yuzu'
const LIMITED_TIERS = [
  { key: '0-2', label: '开售 0-2 小时', rewards: '限时卡1、2、3' },
  { key: '3-6', label: '开售 3-6 小时', rewards: '限时卡1、2' },
  { key: '7-24', label: '开售 7-24 小时', rewards: '限时卡3' },
];

function openLimitedConfirm() {
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
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
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
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

function openYuzuConfirm() {
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
  extraModalMode = 'yuzu';
  const cur = extraRewards;
  document.getElementById('extraModalTitle').textContent = '柚子限时礼';
  const opts = YUZU_TIERS.map(
    (t, i) => `
    <label class="extra-opt ${cur[t.key] ? 'active' : ''}" data-val="yz${i}">
      <input type="checkbox" id="yuzuOpt${i}" ${cur[t.key] ? 'checked' : ''}>
      <div class="extra-opt-main"><div class="extra-opt-label">${t.label}</div><div class="extra-opt-sub">送 ${t.rewardText}</div></div>
    </label>`,
  ).join('');
  document.getElementById('extraModalBody').innerHTML = `
    <div class="bm-sub">7 月 25 日当天是否分别在夏日池 / 橘暖池抽满对应次数？按实际情况勾选（可多选）：</div>
    <div class="extra-opts">${opts}</div>`;
  document.getElementById('extraModal').style.display = 'flex';
}

function confirmExtraModal() {
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
  if (extraModalMode === 'limited') {
    const checked = document.querySelector('input[name="limitedTier"]:checked');
    extraRewards.限时时段 = checked ? checked.value : null;
  } else if (extraModalMode === 'promo') {
    extraRewards.宣传达标 = !!document.getElementById('promoDone').checked;
  } else if (extraModalMode === 'yuzu') {
    YUZU_TIERS.forEach((t, i) => {
      const el = document.getElementById('yuzuOpt' + i);
      extraRewards[t.key] = !!(el && el.checked);
    });
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
  modalKind = 'card';
  // 构建当前卡池可切换列表（含 ex），定位索引，供左右滑动用
  modalCardList = poolCards(currentPool).map(c => c.id);
  modalCardIdx = modalCardList.indexOf(id);
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
  updateModalNav();
  document.getElementById('cardModal').style.display = 'flex';
}
// 详情页左右切换前后卡片（按当前卡池完整顺序，含 ex）
let modalCardList = [];
let modalCardIdx = -1;
// 当前详情页类型：'card'=普通卡池卡，'reward'=奖励卡
let modalKind = 'card';
// 奖励卡切换列表：[{name, source, tier, unlocked}]，按个人→全员→限时→宣传顺序
let rewardModalList = [];
let rewardModalIdx = -1;

function switchModalCard(delta) {
  if (modalKind === 'reward') {
    if (rewardModalList.length === 0) return;
    let n = rewardModalIdx + delta;
    if (n < 0) n = rewardModalList.length - 1;
    if (n >= rewardModalList.length) n = 0;
    if (n === rewardModalIdx) return;
    const r = rewardModalList[n];
    openRewardModal(r.name, r.source, r.tier, r.unlocked);
    return;
  }
  if (modalCardList.length === 0) return;
  let n = modalCardIdx + delta;
  // 循环切换：到头跳到尾、到尾跳到头
  if (n < 0) n = modalCardList.length - 1;
  if (n >= modalCardList.length) n = 0;
  if (n === modalCardIdx) return;
  openModal(modalCardList[n]);
}
// 刷新左右箭头显隐（列表≤1 时隐藏）
function updateModalNav() {
  const prev = document.getElementById('modalPrev');
  const next = document.getElementById('modalNext');
  const len =
    modalKind === 'reward' ? rewardModalList.length : modalCardList.length;
  const multi = len > 1;
  if (prev) prev.style.display = multi ? '' : 'none';
  if (next) next.style.display = multi ? '' : 'none';
}
function closeModal() {
  document.getElementById('cardModal').style.display = 'none';
  modalCard = null;
}

// 奖励卡详情（复用 cardModal，结构与双卡池一致）
function openRewardModal(name, source, tier, unlocked) {
  modalKind = 'reward';
  // 构建当前视图奖励卡切换列表，按 source+name 定位索引
  rewardModalList = buildRewardCards();
  rewardModalIdx = rewardModalList.findIndex(
    r => r.source === source && r.name === name,
  );

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
  updateModalNav();
  document.getElementById('cardModal').style.display = 'flex';
}

// 找到某卡在当前分组模式下所属的 group key（用于局部更新组计数）
function groupKeyOf(card) {
  if (groupMode === 'rarity') return card.rarity;
  return card.rarity === 'ex' ? 'ex' : card.type;
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

// 对单段文本跑 4 策略匹配，返回 {counts, order}（每卡取各策略最大值）
// order 为按文本中首次出现位置排序的 id 列表，供弹窗按识别顺序展示
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
  const firstPos = {}; // id → 文本中首次匹配位置（用于排序）
  const recordPos = (id, pos) => {
    if (firstPos[id] === undefined || pos < firstPos[id]) firstPos[id] = pos;
  };
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
        recordPos(id, start);
        used.push([start, end]);
      }
    }
  }
  results.push(cntAB);
  // 策略C：单词级（置信度 > 40）
  const cntC = {};
  if (words) {
    let pos = 0;
    for (const w of words) {
      const next = pos + 1; // 单词级没有可靠位置，按词序递增近似
      if (w.confidence >= 40) {
        const cleaned = w.text.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (validIDs.has(cleaned)) {
          cntC[cleaned] = (cntC[cleaned] || 0) + 1;
          recordPos(cleaned, next);
        }
      }
      pos = next;
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
        if (validIDs.has(id)) {
          cntD[id] = (cntD[id] || 0) + 1;
          recordPos(id, idx);
        }
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
  // 按文本首次出现位置排序
  const order = Object.keys(out).sort(
    (a, b) => (firstPos[a] ?? Infinity) - (firstPos[b] ?? Infinity),
  );
  return { counts: out, order };
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
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }

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
      (async () => {
        try {
          const worker = await getWorker();

          // 仅对原图识别一轮
          document.getElementById('ocrStatus').textContent =
            '🤖 正在识别（原图）...';
          const ret = await worker.recognize(rawImgData);
          const fullText = ret.data.text;
          const words = ret.data.words || [];

          console.log('=== OCR 原始输出 ===');
          console.log(fullText);
          console.log('=== 单词 ===');
          console.log(
            words.map(w => `"${w.text}"(${w.confidence}%)`).join(', '),
          );

          // 判断本张图属于哪个池（逐图判池，混合上传时各图归各自池）
          const imgPool = detectPool(fullText) || currentPool;
          detectedPools.add(imgPool);
          const validIDs = new Set(poolIDs(imgPool));
          console.log(
            `--- 判池结果：第${fi + 1}张 → ${imgPool}（validIDs ${validIDs.size} 个）---`,
          );

          const matchRes = matchCardCounts(fullText, words, validIDs);
          const imgCounts = matchRes.counts;
          const matchOrder = matchRes.order;
          console.log('=== 匹配结果 imgCounts ===');
          console.log(JSON.stringify(imgCounts));
          console.log('识别顺序:', matchOrder.join(', '));

          // === 检测奖品数量：数以「奖品」开头的行数（每行一个奖品条目）
          // 比取「奖品N」的最大编号更稳健——OCR 易把编号识错（奖品12→奖品1 2）
          let expectedTotal = 0;
          const lines = fullText.split(/\n/);
          for (const line of lines) {
            // 去掉行首空白后判断是否以「奖品」开头；容忍「奖 品」中间空格
            const trimmed = line.replace(/^\s+/, '');
            if (/^奖\s*品/i.test(trimmed)) {
              expectedTotal++;
              continue;
            }
            // 英文 prize 开头兜底
            if (/^prize/i.test(trimmed)) expectedTotal++;
          }
          console.log('检测到奖品总数(按行计): ' + expectedTotal);
          ocrExpectedTotal = expectedTotal; // 存为全局变量

          // 奖位上限约束：单卡数量不超过奖位数
          for (const id of Object.keys(imgCounts)) {
            imgCounts[id] = Math.min(imgCounts[id], expectedTotal || 10);
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

          grandExpected += expectedTotal;
          allDebug.push(fullText.replace(/\n/g, ' ').slice(0, 80));
          console.log(`=== 第${fi + 1}张最终结果（奖位修正后）===`);
          console.log(
            `池=${imgPool} 奖位=${expectedTotal} 识别=${Object.values(imgCounts).reduce((s, c) => s + c, 0)}`,
          );
          console.log(JSON.stringify(imgCounts));
          // 记录本张图识别明细（用于异常定位 + 单图编辑）
          const detectedCnt = Object.values(imgCounts).reduce(
            (s, c) => s + c,
            0,
          );
          imgResults.push({
            idx: fi,
            pool: imgPool,
            counts: { ...imgCounts },
            order: [...matchOrder],
            detected: detectedCnt,
            expected: expectedTotal,
          });
        } catch (err) {
          console.error(`第${fi + 1}张识别失败:`, err);
        }

        document.getElementById('ocrLoading').style.display = 'none';
        resolve();
      })();
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
  const pn = (POOLS[r.pool] && POOLS[r.pool].name) || r.pool;
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
// 生成卡号下拉选项（按卡牌类型 optgroup 分组）
// predicate 过滤可选卡；selectedId 标记当前项；includePlaceholder 加「添加」占位项
function imgEditOptionHTML(pool, predicate, selectedId, includePlaceholder) {
  const cards = poolCards(pool).filter(c => c.rarity !== 'ex' && predicate(c));
  const byType = {};
  for (const c of cards) (byType[c.type] = byType[c.type] || []).push(c);
  let html = includePlaceholder
    ? '<option value="">➕ 添加漏识别的卡…</option>'
    : '';
  for (const t of poolTypes(pool)) {
    if (!byType[t]) continue;
    html += `<optgroup label="${t}">`;
    for (const c of byType[t]) {
      html += `<option value="${c.id}"${c.id === selectedId ? ' selected' : ''}>${c.id.toUpperCase()} ${c.name}</option>`;
    }
    html += '</optgroup>';
  }
  return html;
}
function renderImgEditBody() {
  const r = imgResults[imgEditIdx];
  if (!r) return;
  const body = document.getElementById('imgEditBody');
  const counts = r.counts || {};
  // 按「识别顺序」排序：r.order 中的 id 按其顺序，其余（手动添加/换号新卡）排末尾
  if (!r.order) r.order = [];
  const ordered = r.order.filter(id => counts[id] > 0);
  for (const id of Object.keys(counts)) {
    if (counts[id] > 0 && !ordered.includes(id)) ordered.push(id);
  }
  let html = '';
  if (ordered.length === 0) {
    html +=
      '<div style="text-align:center;color:var(--brown-200);padding:14px;">该图未识别到卡号，可在下方手动添加</div>';
  }
  // 已识别/已添加的卡：可改卡号 + 调张数
  for (const id of ordered) {
    const cnt = counts[id];
    const opts = imgEditOptionHTML(r.pool, () => true, id, false);
    html += `<div class="img-edit-cell">
      <select class="img-edit-select" onchange="changeImgCard('${id}', this.value)">${opts}</select>
      <button class="ocr-adj-btn" onclick="adjustImgCard('${id}', -1)">−</button>
      <span class="img-edit-cnt">${cnt}</span>
      <button class="ocr-adj-btn" onclick="adjustImgCard('${id}', 1)">+</button>
    </div>`;
  }
  // 添加漏识别的卡（已存在的卡不在候选中）
  const presentIds = new Set(ordered);
  const addOpts = imgEditOptionHTML(
    r.pool,
    c => !presentIds.has(c.id),
    null,
    true,
  );
  if (addOpts) {
    html += `<div class="img-edit-cell img-edit-add">
      <select class="img-edit-select" onchange="addImgCard(this.value)">${addOpts}</select>
    </div>`;
  }
  body.innerHTML = html;
}
// 维护识别顺序：添加 id 到末尾（已存在则不动）
function imgEditOrderAdd(r, id) {
  if (!r.order) r.order = [];
  if (!r.order.includes(id)) r.order.push(id);
}
// 维护识别顺序：移除 id
function imgEditOrderRemove(r, id) {
  if (!r.order) return;
  r.order = r.order.filter(x => x !== id);
}
function adjustImgCard(id, delta) {
  const r = imgResults[imgEditIdx];
  if (!r) return;
  const cur = r.counts[id] || 0;
  r.counts[id] = Math.max(0, cur + delta);
  if (r.counts[id] === 0) {
    delete r.counts[id];
    imgEditOrderRemove(r, id);
  }
  r.detected = Object.values(r.counts).reduce((s, c) => s + c, 0);
  updateImgEditModal();
}
// 改卡号：把旧 id 的张数迁移到新 id（若新 id 已存在则合并）
function changeImgCard(oldId, newId) {
  const r = imgResults[imgEditIdx];
  if (!r || !newId || oldId === newId) return;
  const cnt = r.counts[oldId] || 0;
  delete r.counts[oldId];
  imgEditOrderRemove(r, oldId);
  r.counts[newId] = (r.counts[newId] || 0) + cnt;
  imgEditOrderAdd(r, newId);
  r.detected = Object.values(r.counts).reduce((s, c) => s + c, 0);
  updateImgEditModal();
}
// 添加漏识别的卡（默认 +1，若已存在则累加）
function addImgCard(newId) {
  const r = imgResults[imgEditIdx];
  if (!r || !newId) return;
  r.counts[newId] = (r.counts[newId] || 0) + 1;
  imgEditOrderAdd(r, newId);
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
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
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
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
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

// ==================== 操作菜单（一键保留 / 使用许愿卡） ====================
// 渲染操作菜单（原「一键保留」菜单）：
// - 单账号视图（仅 stock 模式展示）：三池总数 ≥ 80 才开放「一键保留」
// - 总账号（合并）视图：双池（不含小卡池）每满 300 张可选 3 张「许愿卡」
function renderOpsBar() {
  const bar = document.getElementById('opsBar');
  if (!bar) return;
  if (opMode) {
    // 操作进行中：取消 + 导出
    const isWish = opMode === 'wish';
    bar.innerHTML = `
      <div class="ops-row">
        <button class="purge-btn" onclick="toggleOpMode()">取消${isWish ? '许愿卡' : '一键保留'}</button>
        <button class="purge-btn primary" onclick="exportOpData()">导出${isWish ? '许愿卡' : '一键保留'}数据<span class="purge-badge" id="purgeBadge"></span></button>
      </div>`;
    updatePurgeBadge();
    return;
  }
  // 一键保留 / 许愿卡均仅真实库存模式提供（手动录入模式不展示操作菜单）
  if (!isStockMode()) {
    bar.innerHTML = '';
    return;
  }
  if (isMergedView()) {
    const quota = wishQuota();
    const total = totalDraws();
    bar.innerHTML = `
      <div class="ops-row">
        <button class="purge-btn" ${quota > 0 ? '' : 'disabled'} onclick="toggleOpMode('wish')">🌟 使用许愿卡</button>
      </div>
      <div class="ops-hint">${quota > 0 ? `双池合计 ${total} 张，本次可选 ${quota} 张许愿卡` : `双池合计每满 300 张可选 3 张许愿卡（当前 ${total} 张）`}</div>`;
  } else {
    const quota = wishQuota();
    const tDraws = totalDraws();
    const wishHint =
      quota > 0
        ? `双池合计 ${tDraws} 张，本次可选 ${quota} 张许愿卡`
        : `双池合计每满 300 张可选 3 张许愿卡（当前 ${tDraws} 张）`;
    const total = grandTotalDraws();
    bar.innerHTML = `
      <div class="ops-row">
        <button class="purge-btn" ${total >= 80 ? '' : 'disabled'} onclick="toggleOpMode('purge')">✂️ 一键保留</button>
        <button class="purge-btn" ${quota > 0 ? '' : 'disabled'} onclick="toggleOpMode('wish')">🌟 使用许愿卡</button>
      </div>
      <div class="ops-hint">${total >= 80 ? `三池合计 ${total} 张` : `三池合计满 80 张才可一键保留（当前 ${total} 张）`}</div>
      <div class="ops-hint">${wishHint}</div>`;
  }
}
// 进入/取消操作模式（'purge'=一键保留 / 'wish'=使用许愿卡）
function toggleOpMode(kind) {
  if (!opMode) {
    if (kind === 'purge') {
      if (!isStockMode()) return; // 一键保留仅真实库存模式提供
      if (isMergedView()) {
        showToast('请先选择具体账号');
        return;
      }
      if (grandTotalDraws() < 80) {
        showToast('⚠️ 三池合计满 80 张才可一键保留');
        return;
      }
      // 进入模式：快照当前 cardCounts，退出/导出后恢复
      opSnapshot = JSON.parse(JSON.stringify(cardCounts));
    } else if (kind === 'wish') {
      if (!isStockMode()) return; // 许愿卡仅真实库存模式提供
      // 许愿卡：单账号 / 总账号视图均可使用，按当前视图双池合计算配额
      const quota = wishQuota();
      if (quota < 1) {
        showToast('⚠️ 双池合计每满 300 张可选 3 张许愿卡');
        return;
      }
      wishLimit = quota;
      wishCounts = emptyCounts(); // 草稿从 0 开始选，不写入 cardCounts
    } else {
      return;
    }
    opMode = kind;
  } else {
    // 取消：purge 恢复快照；wish 丢弃草稿
    finishOpMode();
    return;
  }
  const quickEl = document.getElementById('purgeQuick');
  if (quickEl) quickEl.style.display = opMode === 'purge' ? '' : 'none';
  renderOpsBar();
  renderEntry();
}
// 结束操作模式并复位 UI（purge 总是恢复快照：导出也不覆盖原库存）
function finishOpMode() {
  if (opMode === 'purge' && opSnapshot) {
    cardCounts = JSON.parse(JSON.stringify(opSnapshot));
    opSnapshot = null;
    saveData();
    updateStats();
    renderPanels();
  }
  opMode = null;
  opSnapshot = null;
  wishCounts = null;
  wishLimit = 0;
  const quickEl = document.getElementById('purgeQuick');
  if (quickEl) quickEl.style.display = 'none';
  renderOpsBar();
  renderEntry();
}
// 许愿卡已选张数（双池草稿合计）
function wishSelected() {
  let n = 0;
  for (const pool of ENTRY_POOLS) {
    for (const cnt of Object.values((wishCounts || {})[pool] || {})) n += cnt;
  }
  return n;
}
// 一键应用：所有 R/SR/SSR/PR 卡最多保留 N 张（其他稀有度保持原张数不变）
function applyPurgeQuick() {
  if (opMode !== 'purge') return;
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
  const inputEl = document.getElementById('purgeQuickInput');
  if (!inputEl) return;
  let n = parseInt(inputEl.value);
  if (isNaN(n) || n < 0) {
    showToast('⚠️ 请输入有效数字');
    return;
  }
  if (n > 99) n = 99;
  for (const pool of entryPoolsForView()) {
    if (!cardCounts[pool]) cardCounts[pool] = {};
    for (const card of poolCards(pool)) {
      // 仅作用 R/SR/SSR/PR；其他稀有度（SP/UR/HR 等）保持原来的张数
      if (!QUICK_RARITIES.includes(card.rarity)) continue;
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
  showToast(`✅ 已应用：R/SR/SSR/PR 每张最多保留 ${n} 张（其他稀有度不变）`);
}
// 更新导出按钮角标：purge=与快照的差额；wish=已选/上限
function updatePurgeBadge() {
  const badge = document.getElementById('purgeBadge');
  if (!badge) return;
  if (opMode === 'wish') {
    badge.textContent = `已选${wishSelected()}/${wishLimit}张`;
    badge.className = 'purge-badge';
    return;
  }
  if (opMode !== 'purge' || !opSnapshot) {
    badge.textContent = '';
    return;
  }
  let normalTotal = 0,
    purgeTotal = 0;
  for (const pool of entryPoolsForView()) {
    for (const cnt of Object.values(opSnapshot[pool] || {})) normalTotal += cnt;
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
// 导出操作数据：生成 JSON 记录 + 复制剪切板，随后退出并恢复原状
async function exportOpData() {
  if (!opMode) return;
  const isWish = opMode === 'wish';
  if (!isWish && isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
  const counts = isWish ? wishCounts : cardCounts;
  let total = 0;
  for (const pool of entryPoolsForView()) {
    for (const cnt of Object.values(counts[pool] || {})) total += cnt;
  }
  if (isWish && total === 0) {
    showToast('⚠️ 请先选择许愿卡');
    return;
  }
  if (!isWish) {
    // 与快照比较：保留模式比正常多 → 确认
    let normalTotal = 0;
    for (const pool of entryPoolsForView()) {
      for (const cnt of Object.values(opSnapshot[pool] || {}))
        normalTotal += cnt;
    }
    if (total - normalTotal > 0) {
      const ok = await showConfirmModal({
        title: '⚠️ 提示',
        body: `导出数据比持有卡池数据多 ${total - normalTotal} 张，确实导出吗？`,
        buttons: [
          { text: '取消', type: 'outline', value: false },
          { text: '确定导出', type: 'primary', value: true },
        ],
      });
      if (!ok) return;
    }
  }
  // 导出数据记录来源账号（单账号=该账号 / 总账号=合并视图）
  const accId = activeAccountId;
  const accName = isMergedView()
    ? '总账号（全部合并）'
    : activeAccount()
      ? activeAccount().name
      : '';
  // 用当前选择（保留模式=修改后的数字 / 许愿=草稿）生成 JSON
  const data = {
    cardCounts: counts,
    version: 3,
    exportedAt: new Date().toISOString(),
    type: isWish ? 'wish' : 'purge',
    accountId: accId,
    accountName: accName,
  };
  if (isWish) data.wishLimit = wishLimit;
  const json = JSON.stringify(data);
  // 往记录页生成一条导出记录（合并视图下写入首个账号以持久化，聚合视图同步显示）
  const entry = {
    time: new Date().toISOString(),
    pool: currentPool,
    cards: [],
    type: isWish ? 'wish' : 'purge',
    accountId: accId,
    accountName: accName,
    json,
  };
  if (isMergedView()) {
    const tid = accountOrder.find(id => accounts[id]);
    if (tid) accounts[tid].history.unshift(entry);
    history.unshift(entry);
    saveData(); // 合并视图全局不写穿，直接持久化账号存储
  } else {
    history.unshift(entry);
    saveData(); // 单账号视图：写入该账号并持久化（许愿无快照恢复，需在此落盘）
  }
  copyToClipboard(json, '✅ 已生成记录并复制到剪切板');
  renderHistory();
  // 退出操作模式（purge 恢复原始数据，默认不覆盖）
  finishOpMode();
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

// 操作/录入模式当前池的计数对象：wish 用草稿，其余用 cardCounts
function entryCounts(pool) {
  if (opMode === 'wish') {
    if (!wishCounts) wishCounts = emptyCounts();
    return wishCounts[pool] || {};
  }
  return cardCounts[pool] || {};
}

// 录入页：卡池页签 + 分组卡片网格，每卡可加减数量（展示池随模式/操作变化）
function renderEntry() {
  // 同步操作菜单（门槛/状态随数据与账号变化）
  renderOpsBar();
  // 当前视图不含该卡池时回落到夏日池（如许愿模式不含小卡池）
  const pools = entryPoolsForView();
  if (!pools.includes(currentPool)) currentPool = 'xiari';
  // 渲染卡池页签
  const tabs = document.getElementById('entryPoolTabs');
  if (tabs) {
    tabs.innerHTML = pools
      .map(
        key =>
          `<button class="pool-tab${key === currentPool ? ' active' : ''}" data-pool="${key}" onclick="switchPool('${key}')">${POOLS[key].name}</button>`,
      )
      .join('');
  }

  const grid = document.getElementById('entryGrid');
  if (!grid) return;
  const c = entryCounts(currentPool);
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
// 许愿不可选的卡：特殊奖励（ex）与衣料卡
function wishCardDisabled(card) {
  return card.rarity === 'ex' || card.type === '衣料卡';
}
function entryCellHTML(card, c) {
  const imgs = cardImages[currentPool] && cardImages[currentPool][card.id];
  const idText = card.rarity === 'ex' ? '★' : card.id.toUpperCase();
  const imgSrc = (imgs && imgs.front) || card.img;
  const imgHTML = imgSrc
    ? `<img src="${imgSrc}" alt="${card.id}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;">${idText}</span>`
    : `<span>${idText}</span>`;
  const cnt = c[card.id] || 0;
  const keepBadge = opMode
    ? `<div class="keep-badge">${opMode === 'wish' ? '许愿' : '保留'}</div>`
    : '';
  // 禁用条件：wish 模式特典卡不可选；purge 模式可编辑；
  // 普通状态=合并视图只读，或 stock 模式未进入操作
  let disabled;
  if (opMode === 'wish') disabled = wishCardDisabled(card);
  else if (opMode === 'purge') disabled = false;
  else disabled = isMergedView() || isStockMode();
  const disAttr = disabled ? 'disabled' : '';
  const roAttr = disabled ? 'readonly' : '';
  const mergedCls = disabled ? ' entry-cell-merged' : '';
  return `<div class="card-cell entry-cell ${card.rarity} ${cnt > 0 ? 'has' : 'zero'}${mergedCls}" id="ecell-${card.id}">
    <div class="placeholder" data-cid="${idText}">${imgHTML}</div>
    ${keepBadge}
    <div class="cid">${idText}</div>
    <div class="cname">${card.name}</div>
    <div class="entry-ctrl">
      <button class="entry-btn" ${disAttr} onclick="adjustEntry('${card.id}', -1)">−</button>
      <input class="entry-input" type="text" inputmode="numeric" pattern="[0-9]*" value="${cnt}" data-id="${card.id}" onfocus="this.select()" ${roAttr} onchange="setEntryCount('${card.id}', this.value)">
      <button class="entry-btn" ${disAttr} onclick="adjustEntry('${card.id}', 1)">+</button>
    </div>
    <div class="entry-over-hint" id="eohint-${card.id}"></div>
  </div>`;
}

// 局部更新单张录入卡（不重建整网格，避免图片重载闪烁）
function updateEntryCell(id) {
  const cell = document.getElementById('ecell-' + id);
  if (!cell) return;
  const c = entryCounts(currentPool);
  const cnt = c[id] || 0;
  cell.classList.toggle('has', cnt > 0);
  cell.classList.toggle('zero', cnt === 0);
  const input = cell.querySelector('.entry-input');
  if (input && document.activeElement !== input) input.value = cnt;
  // 保留模式下：当前数 > 原始数（快照）时显示红字提示
  const hint = cell.querySelector('.entry-over-hint');
  if (hint) {
    if (opMode === 'purge' && opSnapshot) {
      const orig =
        (opSnapshot[currentPool] && opSnapshot[currentPool][id]) || 0;
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
  const c = entryCounts(currentPool);
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
// stock 模式：仅操作模式（一键保留/许愿卡）下可调整；manual 模式：始终开放
function adjustEntry(id, delta) {
  if (!opMode && isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
  if (!opMode && isStockMode()) {
    showToast('📦 真实库存模式下不可手动修改，请在「操作菜单」中选择一键保留');
    return;
  }
  const card = cardByID(currentPool, id);
  if (!card) return;
  // 许愿卡：写草稿，不落库不影响统计；特殊奖励/衣料卡不可选
  if (opMode === 'wish') {
    if (wishCardDisabled(card)) return;
    if (!wishCounts) wishCounts = emptyCounts();
    if (!wishCounts[currentPool]) wishCounts[currentPool] = {};
    const cur = wishCounts[currentPool][id] || 0;
    if (delta > 0 && wishSelected() >= wishLimit) {
      showToast(`⚠️ 最多可选 ${wishLimit} 张许愿卡`);
      return;
    }
    wishCounts[currentPool][id] = Math.max(0, cur + delta);
    updateEntryCell(id);
    updateGroupCount(groupKeyOf(card));
    updatePurgeBadge();
    return;
  }
  if (!cardCounts[currentPool]) cardCounts[currentPool] = {};
  const cur = cardCounts[currentPool][id] || 0;
  const next = Math.max(0, cur + delta);
  cardCounts[currentPool][id] = next;
  if (!opMode) {
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
// stock 模式：仅操作模式（一键保留/许愿卡）下可调整；manual 模式：始终开放
function setEntryCount(id, val) {
  if (!opMode && isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
  if (!opMode && isStockMode()) {
    showToast('📦 真实库存模式下不可手动修改，请在「操作菜单」中选择一键保留');
    return;
  }
  const card = cardByID(currentPool, id);
  if (!card) return;
  // 许愿卡：写草稿并按上限收敛；特殊奖励/衣料卡不可选
  if (opMode === 'wish') {
    if (wishCardDisabled(card)) return;
    if (!wishCounts) wishCounts = emptyCounts();
    if (!wishCounts[currentPool]) wishCounts[currentPool] = {};
    const cur = wishCounts[currentPool][id] || 0;
    let next = parseInt(val);
    if (isNaN(next) || next < 0) next = 0;
    const room = wishLimit - (wishSelected() - cur);
    if (next > room) {
      next = Math.max(cur, room);
      showToast(`⚠️ 最多可选 ${wishLimit} 张许愿卡`);
    }
    wishCounts[currentPool][id] = next;
    updateEntryCell(id);
    updateGroupCount(groupKeyOf(card));
    updatePurgeBadge();
    return;
  }
  if (!cardCounts[currentPool]) cardCounts[currentPool] = {};
  const cur = cardCounts[currentPool][id] || 0;
  let next = parseInt(val);
  if (isNaN(next) || next < 0) next = 0;
  if (next === cur) {
    updateEntryCell(id);
    return;
  } // 无变化
  cardCounts[currentPool][id] = next;
  if (!opMode) {
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
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
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
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
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
// 历史 item 所属账号名（合并视图标签用）
function historyItemAccountName(h) {
  const id = h.accountId;
  return id && accounts[id] ? accounts[id].name : '默认账号';
}
function renderHistory() {
  const container = document.getElementById('historyList');
  if (history.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--brown-200);">🃏 还没有抽卡记录</div>';
    return;
  }
  // 分组：手动操作(manual/adjust)按「所在分钟」+ 池子归组；OCR/十连各自独立成组
  // 合并视图下并入 accountId，避免不同账号同分钟同池误合并
  const merged = isMergedView();
  const groups = [];
  for (const h of history) {
    const isManual = h.type === 'manual' || h.type === 'adjust';
    const t = new Date(h.time);
    const accKey = merged ? h.accountId || '' : '';
    // 分钟桶 key：年月日时分子(+账号)
    const bucketKey = `${accKey}|${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}-${t.getMinutes()}`;
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
      // 含 JSON 的导出记录（全量导出 / 一键保留 / 许愿卡）：独立展示 + 复制按钮
      if (
        g.items[0] &&
        (g.items[0].type === 'purge' ||
          g.items[0].type === 'wish' ||
          g.items[0].type === 'export')
      ) {
        const it = g.items[0];
        const isExport = it.type === 'export';
        const isWish = it.type === 'wish';
        const title = isExport
          ? '💾 全量数据导出'
          : isWish
            ? '🌟 许愿卡导出'
            : '📤 一键保留导出';
        // 标注来源账号（单账号名 / 总账号），便于合并视图下区分
        const accTag = it.accountName ? ` · ${it.accountName}` : '';
        const preview =
          it.json.length > 120 ? it.json.slice(0, 120) + '...' : it.json;
        const applyBtn = isExport
          ? ''
          : `<button class="btn btn-sm btn-outline purge-apply" onclick="viewPurgeCollection(${history.indexOf(it)})">📖 ${isWish ? '查看许愿清单' : '查看保留图鉴'}</button>`;
        return `<div class="history-item purge-item">
          <div class="history-header"><span class="history-pool">${title}${accTag}</span><span class="history-time">${ts}</span></div>
          <div class="purge-json">${preview}</div>
          <div class="purge-actions">
            <button class="btn btn-sm btn-outline purge-copy" onclick="copyPurgeJson(${history.indexOf(it)})">📋 复制完整数据</button>
            ${applyBtn}
          </div>
        </div>`;
      }
      const pn = (POOLS[g.pool] && POOLS[g.pool].name) || g.pool;
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
      const accTag = merged
        ? ` · ${escapeHtml(historyItemAccountName(g.items[0]))}`
        : '';
      return `<div class="history-item">
      <div class="history-header"><span class="history-pool">${pn} · ${label}${accTag}</span><span class="history-time">${ts}</span></div>
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
    // 保留导出含小卡池；许愿记录仅双池
    const viewPools = data.type === 'wish' ? ENTRY_POOLS : ALL_POOLS;
    const poolTotals = {};
    for (const pool of viewPools) {
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
    const isWish = it.type === 'wish';
    document.getElementById('bonusModalTitle').innerHTML =
      `${isWish ? '🌟 许愿清单' : '📖 保留图鉴'} <span style="font-size:12px;color:var(--brown-200);font-weight:500;">夏日池${poolTotals.xiari}张，橘暖池${poolTotals.junuan}张${isWish ? '' : `，奖励卡${rewardItems.length}张`}</span>`;
    document.getElementById('bonusModalBody').innerHTML = html;
    document.getElementById('bonusModal').style.display = 'flex';
  } catch (e) {
    showToast('⚠️ 数据解析失败');
  }
}
async function clearHistory() {
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
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
  persistActiveAccount();
  const json = JSON.stringify(
    { version: 4, activeAccountId, accountOrder, accounts },
    null,
    2,
  );
  // 往记录页生成一条导出记录（含完整 JSON 字符串，便于复制）
  // 合并视图只读，跳过记录；单账号视图记录到当前账号
  if (!isMergedView()) {
    history.unshift({
      time: new Date().toISOString(),
      pool: currentPool,
      cards: [],
      type: 'export',
      json,
    });
    saveData();
    renderHistory();
  }
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
    if (data.accounts && data.version >= 4) {
      // v4 多账号备份：整体替换，全量恢复
      accounts = data.accounts;
      accountOrder = data.accountOrder || Object.keys(accounts);
      activeAccountId =
        data.activeAccountId === 'all' ||
        (data.activeAccountId && accounts[data.activeAccountId])
          ? data.activeAccountId
          : accountOrder[0] || 'a1';
      // 兜底：确保每个账号字段完整（含小卡池键）
      for (const acc of Object.values(accounts)) {
        if (!acc.cardCounts) acc.cardCounts = emptyCounts();
        if (!acc.cardImages) acc.cardImages = emptyCounts();
        if (!acc.history) acc.history = [];
        if (!acc.extraRewards) acc.extraRewards = defaultExtraRewards();
        for (const pool of ALL_POOLS) {
          if (!acc.cardCounts[pool]) acc.cardCounts[pool] = {};
          if (!acc.cardImages[pool]) acc.cardImages[pool] = {};
        }
      }
      // 先装载到全局（让全局指向新导入的当前账号数据），再 saveData
      // 否则 persistActiveAccount 会用旧全局覆盖 accounts[activeAccountId]
      loadActiveAccountIntoGlobals();
      saveData();
      updateStats();
      renderCollection();
      renderHistory();
      renderPanels();
      if (currentTab === 'entry') renderEntry();
      updateAccountSwitcherLabel();
      showToast('📥 数据已导入（全部账号）');
      return true;
    }
    // v3 单账号备份：替换当前账号数据（合并视图下拦截）
    if (!data.cardCounts) {
      showToast('⚠️ 无效的备份数据');
      return false;
    }
    if (isMergedView()) {
      showToast('请先选择具体账号');
      return false;
    }
    // 改全局变量（而非 acc.xxx），否则 persistActiveAccount 会用旧全局覆盖 acc
    cardCounts = data.cardCounts || emptyCounts();
    cardImages = data.cardImages || emptyCounts();
    for (const pool of ALL_POOLS) {
      if (!cardCounts[pool]) cardCounts[pool] = {};
      if (!cardImages[pool]) cardImages[pool] = {};
    }
    extraRewards = data.extraRewards || defaultExtraRewards();
    history = (data.history || []).map(h =>
      h.accountId ? h : { ...h, accountId: activeAccountId },
    );
    saveData(); // persistActiveAccount 把新全局回写到当前账号
    loadActiveAccountIntoGlobals();
    updateStats();
    renderCollection();
    renderHistory();
    renderPanels();
    if (currentTab === 'entry') renderEntry();
    showToast('📥 数据已导入（当前账号）');
    return true;
  } catch (err) {
    showToast('⚠️ 数据格式错误');
    return false;
  }
}

async function clearAllData() {
  if (isMergedView()) {
    showToast('请先选择具体账号');
    return;
  }
  const accName = accounts[activeAccountId]
    ? accounts[activeAccountId].name
    : '当前账号';
  const ok = await showConfirmModal({
    title: '⚠️ 清空账号数据',
    body: `确定要清空账号「${accName}」的所有数据吗？（包括卡牌数量、记录、卡图）<br><br><strong style="color:var(--danger);">此操作不可恢复！建议先备份。</strong>`,
    buttons: [
      { text: '取消', type: 'outline', value: false },
      { text: '清空', type: 'primary', value: true },
    ],
  });
  if (!ok) return;
  // 改全局变量（而非 acc.xxx），否则 persistActiveAccount 会用旧全局覆盖 acc
  cardCounts = emptyCounts();
  history = [];
  cardImages = emptyCounts();
  extraRewards = defaultExtraRewards();
  saveData(); // persistActiveAccount 把新全局回写到当前账号
  loadActiveAccountIntoGlobals();
  updateStats();
  renderCollection();
  renderHistory();
  renderPanels();
  if (currentTab === 'entry') renderEntry();
  showToast('🗑 已清空账号「' + accName + '」数据');
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

// ==================== 账号管理（多账号）====================
// 文本输入弹窗（复用 confirm 模式但带输入框），返回 Promise<string|null>
let _promptResolve = null;
function showPromptModal({
  title,
  placeholder = '',
  value = '',
  inputmode = '',
}) {
  return new Promise(resolve => {
    _promptResolve = resolve;
    document.getElementById('promptTitle').textContent = title || '输入';
    const inp = document.getElementById('promptInput');
    inp.value = value;
    inp.placeholder = placeholder;
    if (inputmode) inp.inputMode = inputmode;
    else inp.removeAttribute('inputmode');
    document.getElementById('promptModal').style.display = 'flex';
    setTimeout(() => {
      inp.focus();
      inp.select();
    }, 50);
  });
}
function closePromptModal(val) {
  document.getElementById('promptModal').style.display = 'none';
  const r = _promptResolve;
  _promptResolve = null;
  if (r) r(val && String(val).trim() ? String(val).trim() : null);
}
// 最小 HTML 转义（账号名为用户输入，渲染到 onclick 字符串里需转义引号）
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// 刷新 header 切换器标签
function updateAccountSwitcherLabel() {
  const el = document.getElementById('accountSwitcherLabel');
  if (!el) return;
  el.textContent = isMergedView()
    ? '全部账号'
    : (accounts[activeAccountId] && accounts[activeAccountId].name) || '账号';
}
function openAccountModal() {
  renderAccountList();
  document.getElementById('accountModal').style.display = 'flex';
}
function closeAccountModal() {
  document.getElementById('accountModal').style.display = 'none';
}
function renderAccountList() {
  const body = document.getElementById('accountModalBody');
  let html = `<div class="acc-row ${isMergedView() ? 'active' : ''}" onclick="selectAccount('all')">
    <span class="acc-name">🌐 全部账号（合并）</span>
    <span class="acc-sub">只读汇总</span>
  </div>`;
  accountOrder.forEach((id, i) => {
    const a = accounts[id];
    if (!a) return;
    const nameEsc = escapeHtml(a.name);
    const phoneTag = a.phone ? ` <span class="acc-phone-tag">📱</span>` : '';
    // 库存模式下所有账号可绑定/改绑手机号（提交后自动查询覆盖库存）
    const phoneBtn = isStockMode()
      ? `<button class="acc-mini wide" onclick="changeAccountPhone('${id}')" title="${a.phone ? '修改' : '绑定'}手机号">${a.phone ? '改号' : '绑号'}</button>`
      : '';
    html += `<div class="acc-row ${id === activeAccountId ? 'active' : ''}">
      <span class="acc-name" onclick="selectAccount('${id}')">${nameEsc}${phoneTag}</span>
      <div class="acc-actions">
        ${phoneBtn}
        <button class="acc-mini" onclick="moveAccount('${id}',-1)" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="acc-mini" onclick="moveAccount('${id}',1)" ${i === accountOrder.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="acc-mini" onclick="renameAccount('${id}')">✏️</button>
        <button class="acc-mini danger" onclick="deleteAccount('${id}')">🗑</button>
      </div>
    </div>`;
  });
  body.innerHTML = html;
}
function selectAccount(id) {
  closeAccountModal();
  switchAccount(id);
}
function genAccountId() {
  let max = 0;
  for (const id of Object.keys(accounts)) {
    const n = parseInt(id.slice(1));
    if (!isNaN(n) && n > max) max = n;
  }
  return 'a' + (max + 1);
}
async function addAccount() {
  const name = await showPromptModal({
    title: '添加新账号',
    placeholder: '输入账号名称或下单手机号',
  });
  if (!name) return;
  // 看起来像手机号 → 先建号，再查远程库存替换
  const isPhone = /^1\d{10}$/.test(name);
  const id = genAccountId();
  accounts[id] = {
    name: isPhone ? phoneMask(name) : name,
    ...(isPhone ? { phone: name } : {}),
    ...emptyAccountData(),
  };
  accountOrder.push(id);
  saveData();
  closeAccountModal();
  switchAccount(id);
  if (isPhone) {
    showToast('🔍 正在查询远程库存...');
    const counts = await fetchStockByPhone(name);
    if (counts) {
      accounts[id].cardCounts = counts;
      loadActiveAccountIntoGlobals(); // 新号即激活账号，重载全局防 persistActiveAccount 回写旧引用
      saveData();
      updateStats();
      renderPanels();
      renderCollection();
      if (currentTab === 'entry') renderEntry();
      showToast(`✅ 已创建账号并导入真实库存（双池 ${totalDraws()} 张）`);
    } else {
      showToast('⚠️ 未查到该手机号的库存，已创建空账号');
    }
  } else {
    showToast('✅ 已创建账号 ' + name);
  }
}
async function renameAccount(id) {
  if (!accounts[id]) return;
  const name = await showPromptModal({
    title: '重命名账号',
    value: accounts[id].name,
  });
  if (!name) return;
  accounts[id].name = name;
  saveData();
  updateAccountSwitcherLabel();
  renderAccountList();
  showToast('✅ 已重命名');
}
// 绑定/修改账号手机号（库存模式）：查询该号远程库存并覆盖本账号
async function changeAccountPhone(id) {
  if (!isStockMode()) return;
  const acc = accounts[id];
  if (!acc) return;
  const oldPhone = acc.phone || '';
  const input = await showPromptModal({
    title: oldPhone ? '修改绑定手机号' : '绑定手机号',
    placeholder: '输入下单手机号',
    value: oldPhone,
    inputmode: 'numeric',
  });
  if (!input) return;
  if (!/^1\d{10}$/.test(input)) {
    showToast('⚠️ 请输入 11 位手机号');
    return;
  }
  if (input === oldPhone) {
    showToast('📱 号码未变化');
    return;
  }
  const other = findAccountByPhone(input);
  if (other && other !== id) {
    showToast('⚠️ 该手机号已绑定账号「' + accounts[other].name + '」');
    return;
  }
  showToast('🔍 正在查询远程库存...');
  const counts = await fetchStockByPhone(input);
  if (!counts) {
    showToast('⚠️ 未查到该手机号的库存，绑定未修改');
    return;
  }
  // 覆盖库存并绑定；默认脱敏名跟随号码，用户改过名则保留
  acc.phone = input;
  acc.cardCounts = counts;
  if (oldPhone && acc.name === phoneMask(oldPhone)) acc.name = phoneMask(input);
  else if (!oldPhone && acc.name === '默认账号') acc.name = phoneMask(input);
  // 激活账号的 cardCounts 引用被替换：先重载全局再保存，防止旧引用回写
  if (isMergedView()) computeMergedGlobals();
  else if (activeAccountId === id) loadActiveAccountIntoGlobals();
  saveData();
  updateStats();
  renderPanels();
  renderCollection();
  if (currentTab === 'entry') renderEntry();
  renderAccountList();
  updateAccountSwitcherLabel();
  showToast(
    `✅ 已改绑 ${phoneMask(input)} 并更新库存（双池 ${totalDraws()} 张）`,
  );
}
async function deleteAccount(id) {
  if (!accounts[id]) return;
  if (accountOrder.length <= 1) {
    showToast('⚠️ 至少保留一个账号');
    return;
  }
  const ok = await showConfirmModal({
    title: '删除账号',
    body: `确定删除账号「${accounts[id].name}」吗？<br>该账号的<strong>所有卡牌数据、记录、卡图</strong>将被永久删除，不可恢复。`,
    buttons: [
      { text: '取消', type: 'outline', value: false },
      { text: '删除', type: 'primary', value: true },
    ],
  });
  if (!ok) return;
  delete accounts[id];
  accountOrder = accountOrder.filter(x => x !== id);
  if (activeAccountId === id) {
    activeAccountId = accountOrder[0];
    loadActiveAccountIntoGlobals();
  } else if (isMergedView()) {
    computeMergedGlobals(); // 删除后重算合并视图
  }
  saveData();
  updateAccountSwitcherLabel();
  updateStats();
  renderPanels();
  renderCollection();
  if (currentTab === 'entry') renderEntry();
  if (currentTab === 'history') renderHistory();
  renderAccountList();
  showToast('🗑 已删除账号');
}
function moveAccount(id, dir) {
  const i = accountOrder.indexOf(id);
  const j = i + dir;
  if (j < 0 || j >= accountOrder.length) return;
  [accountOrder[i], accountOrder[j]] = [accountOrder[j], accountOrder[i]];
  saveData();
  if (isMergedView()) {
    computeMergedGlobals();
    updateStats();
    renderPanels();
    renderCollection();
    if (currentTab === 'history') renderHistory();
  }
  renderAccountList();
}

// ==================== IMAGE API ====================
function setCardImage(pool, id, frontBase64, backBase64) {
  if (!cardImages[pool]) cardImages[pool] = {};
  cardImages[pool][id] = { front: frontBase64, back: backBase64 || null };
  saveData();
  renderCollection();
}

// ==================== 真实库存模式（活动结束：按手机号查远程库存）====================
const STOCK_API =
  'https://josephccl-d3go7vizze88241ba-1456400312.ap-shanghai.app.tcloudbase.com/getValue';
// 手机号 → 账号 id 映射，避免重复导入时重复建号
function findAccountByPhone(phone) {
  for (const id of Object.keys(accounts)) {
    if (accounts[id].phone === phone) return id;
  }
  return null;
}
// 调云函数查单个手机号的库存，返回 {xiari:{},junuan:{}}，失败返回 null
async function fetchStockByPhone(phone) {
  try {
    const res = await fetch(STOCK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: phone }),
    });
    const json = await res.json();
    if (json.code !== 0 || !json.data || !json.data.value) return null;
    const counts = JSON.parse(json.data.value);
    if (!counts || typeof counts !== 'object') return null;
    // 规范化：补齐三池 + 过滤无效 id（小卡池库存也随手机号同步）
    const out = emptyCounts();
    for (const pool of ALL_POOLS) {
      const valid = new Set(poolIDs(pool));
      const src = counts[pool] || {};
      for (const [id, cnt] of Object.entries(src)) {
        if (valid.has(id) && cnt > 0) out[pool][id] = cnt;
      }
    }
    return out;
  } catch (e) {
    console.error('查询库存失败:', phone, e);
    return null;
  }
}
// 解析用户输入的多个手机号（换行/逗号/空格分隔，去重保序）
function parsePhones(text) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text || '').split(/[\s,，;；、]+/)) {
    const p = raw.trim();
    if (!p) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}
// 批量导入入口（通知弹窗）：逐号查询，按号建/换账号并替换库存
async function importStockFromNotice() {
  const textarea = document.getElementById('stockPhones');
  const statusEl = document.getElementById('stockImportStatus');
  const btn = document.getElementById('stockImportBtn');
  if (!textarea || !btn) return;
  const phones = parsePhones(textarea.value);
  if (phones.length === 0) {
    if (statusEl) statusEl.textContent = '';
    showToast('⚠️ 请先输入手机号');
    return;
  }
  btn.disabled = true;
  const prevLabel = btn.textContent;
  btn.textContent = '🔍 查询中...';
  const okList = [];
  const failList = [];
  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i];
    if (statusEl)
      statusEl.textContent = `正在查询 ${i + 1}/${phones.length}：${phone}`;
    const counts = await fetchStockByPhone(phone);
    if (counts) okList.push({ phone, counts });
    else failList.push(phone);
  }
  let applied = 0;
  for (const { phone, counts } of okList)
    applied += applyStockToAccount(phone, counts);
  // 汇总反馈
  let msg;
  if (okList.length > 0 && failList.length === 0) {
    msg = `✅ 已导入 ${okList.length} 个号（${applied} 个账号）`;
  } else if (okList.length > 0) {
    msg = `⚠️ 成功 ${okList.length} 个，失败 ${failList.length} 个：${failList.join('、')}`;
  } else {
    msg = `⚠️ 查询失败：${phones.join('、')}（无库存数据或网络错误）`;
  }
  if (statusEl) statusEl.textContent = msg;
  showToast(msg);
  btn.disabled = false;
  btn.textContent = prevLabel;
  if (okList.length > 0) {
    // 激活账号可能被替换了 cardCounts 引用，先重载全局再保存，
    // 否则 persistActiveAccount 会用旧全局覆盖刚导入的库存
    loadActiveAccountIntoGlobals();
    saveData();
    updateStats();
    renderPanels();
    renderCollection();
    if (currentTab === 'entry') renderEntry();
    if (currentTab === 'history') renderHistory();
    updateAccountSwitcherLabel();
  }
}
// 把远程库存落到账号：已有手机号账号→替换库存；否则新建账号。返回账号 id 或 null
function applyStockToAccount(phone, counts) {
  let id = findAccountByPhone(phone);
  if (id) {
    accounts[id].cardCounts = counts;
    accounts[id].phone = phone;
    return id;
  }
  // 未绑定手机号的首个「默认账号」可直接认领（首次导入场景）
  const unclaimed = accountOrder.find(
    aid =>
      accounts[aid] &&
      !accounts[aid].phone &&
      accounts[aid].name === '默认账号',
  );
  if (unclaimed) {
    id = unclaimed;
    accounts[id].name = phoneMask(phone);
    accounts[id].phone = phone;
    accounts[id].cardCounts = counts;
    return id;
  }
  // 新建账号
  id = genAccountId();
  accounts[id] = { name: phoneMask(phone), phone, ...emptyAccountData() };
  accounts[id].cardCounts = counts;
  accountOrder.push(id);
  return id;
}
// 手机号脱敏展示：138****0001
function phoneMask(phone) {
  const p = String(phone);
  if (p.length < 7) return p;
  return p.slice(0, 3) + '****' + p.slice(-4);
}

loadData();
// 按 APP_MODE 同步 UI 显隐（启动与运行时切换都调用；业务函数用 isStockMode() 判断）
function applyAppMode() {
  const stock = isStockMode();
  // 手动/OCR 子页签：仅 manual 模式显示
  const subTabs = document.querySelector('#tab-entry .sub-tabs');
  if (subTabs) subTabs.style.display = stock ? 'none' : '';
  const subOcr = document.getElementById('sub-ocr');
  if (subOcr) subOcr.style.display = 'none'; // 两模式默认都隐藏，manual 下由 switchSubTab 控制
  // stock 模式提示条：仅 stock 模式显示
  const note = document.getElementById('stockModeNote');
  if (note) note.style.display = stock ? '' : 'none';
  // 底部 Tab 文案：stock=操作菜单（一键保留/许愿卡），manual=录入
  const entryTab = document.querySelector('.tab-item[data-tab="entry"]');
  if (entryTab)
    entryTab.innerHTML = stock
      ? '<span class="tab-icon">🛠️</span>操作'
      : '<span class="tab-icon">✍️</span>录入';
  // 顶栏模式按钮文案
  const modeBtn = document.getElementById('modeToggleBtn');
  if (modeBtn) modeBtn.textContent = stock ? '📦 库存' : '✍️ 手动';
  // 小卡池页签：仅 stock 模式显示（小卡只随手机号库存同步，不参与录入）
  const xkTab = document.querySelector('.pool-tab[data-pool="xiaoka"]');
  if (xkTab) {
    xkTab.style.display = stock ? '' : 'none';
    if (!stock && currentPool === 'xiaoka') switchPool('xiari');
  }
  // 撤销按钮：仅 manual 模式显示
  const undoBtn = document.getElementById('undoLastBtn');
  if (undoBtn) undoBtn.style.display = stock ? 'none' : '';
  // 导入按钮：仅 manual 模式显示（库存模式数据随手机号同步，不走导入）
  const importBtn = document.getElementById('importBtn');
  if (importBtn) importBtn.style.display = stock ? 'none' : '';
  // OCR 依赖 tesseract.js（约 8MB 引擎+语言包按需拉取）：仅 manual 模式加载
  if (!stock && !document.getElementById('tesseractScript')) {
    const s = document.createElement('script');
    s.id = 'tesseractScript';
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js';
    document.head.appendChild(s);
  }
  // 操作菜单随模式刷新
  renderOpsBar();
}
// 顶栏按钮：真实库存 ↔ 手动录入 运行时切换（持久化到 localStorage）
async function toggleAppMode() {
  const target = isStockMode() ? 'manual' : 'stock';
  const ok = await showConfirmModal({
    title: '切换模式',
    body: isStockMode()
      ? '切换到 <b>✍️ 手动录入模式</b>？<br>手动 ± / 直填 / 截图识别录入将全部开放。<br><b>两种模式的数据各自独立保存，互不影响。</b>'
      : '切换到 <b>📦 真实库存模式</b>？<br>库存将通过手机号远程同步，手动录入关闭，仅可在「操作菜单」中一键保留 / 使用许愿卡。<br><b>两种模式的数据各自独立保存，互不影响。</b>',
    buttons: [
      { text: '取消', type: 'outline', value: false },
      { text: '切换', type: 'primary', value: true },
    ],
  });
  if (!ok) return;
  if (opMode) finishOpMode(); // 取消进行中的操作（恢复快照/丢弃草稿）
  saveData(); // 当前模式数据落盘（写入当前模式的独立存储键）
  APP_MODE = target;
  localStorage.setItem('ccg_app_mode', APP_MODE);
  loadData(); // 载入另一套独立数据源（账号/库存/记录整套切换）
  applyAppMode();
  updateAccountSwitcherLabel();
  updateStats();
  renderPanels();
  renderCollection();
  renderEntry();
  renderHistory();
  showToast(
    target === 'stock' ? '📦 已切换到真实库存模式' : '✍️ 已切换到手动录入模式',
  );
}
applyAppMode();
updateAccountSwitcherLabel();
switchTab('collection');
switchPool('xiari');
renderPanels();
// 启动时弹出「活动结束 → 真实库存模式」提示（选过"不再提醒"则跳过；仅 stock 模式）
const NOTICE_VERSION = '2.0'; // 更新此版本号会让弹窗重新弹出
(function showNoticeIfNeeded() {
  if (!isStockMode()) return;
  const lastDismissed = localStorage.getItem('ccg_notice_version') || '';
  const dismissed = localStorage.getItem('ccg_notice_dismiss') === '1';
  // 版本升级 或 未选不再提醒 → 弹出
  if (lastDismissed !== NOTICE_VERSION || !dismissed) {
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

// 详情页左右滑动切换前后卡片（触摸 + 鼠标拖拽 + 键盘）
(function initModalSwipe() {
  const preview = document.getElementById('modalCardPreview');
  if (!preview) return;
  let startX = 0,
    startY = 0,
    dragging = false,
    moved = false;

  function getXY(e) {
    if (e.touches && e.touches[0])
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }
  function start(e) {
    const p = getXY(e);
    startX = p.x;
    startY = p.y;
    dragging = true;
    moved = false;
  }
  function move(e) {
    if (!dragging) return;
    const p = getXY(e);
    if (Math.abs(p.x - startX) > 8 || Math.abs(p.y - startY) > 8) moved = true;
    // 触摸滑动时阻止页面滚动
    if (moved && e.cancelable) e.preventDefault();
  }
  function end(e) {
    if (!dragging) return;
    dragging = false;
    if (!moved) return;
    // 用变化的触摸点；touchend 无 touches，用 changedTouches
    let endX = startX;
    if (e.changedTouches && e.changedTouches[0])
      endX = e.changedTouches[0].clientX;
    else if (typeof e.clientX === 'number') endX = e.clientX;
    const dx = endX - startX;
    if (Math.abs(dx) > 40) {
      // 左滑(dx<0)→下一张；右滑(dx>0)→上一张
      switchModalCard(dx < 0 ? 1 : -1);
    }
  }
  preview.addEventListener('touchstart', start, { passive: true });
  preview.addEventListener('touchmove', move, { passive: false });
  preview.addEventListener('touchend', end);
  preview.addEventListener('mousedown', start);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);

  // 键盘左右键切换（详情页打开时）
  document.addEventListener('keydown', e => {
    const modal = document.getElementById('cardModal');
    if (!modal || modal.style.display === 'none') return;
    if (modalCardList.length === 0) return;
    if (e.key === 'ArrowLeft') switchModalCard(-1);
    else if (e.key === 'ArrowRight') switchModalCard(1);
  });
})();

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
