// game-main.js
// Engine gameplay đã refactor sạch hơn và gom logic theo state

(() => {
  const state = {
    rows: GAME_SETTINGS.rows,
    cols: GAME_SETTINGS.cols,
    sun: GAME_SETTINGS.startingSun,
    score: 0,
    selectedPlant: null,
    plants: [],
    zombies: [],
    projectiles: [],
    effects: [],
    running: false,
    paused: true,
    rafId: null,
    startTime: 0,
    pauseStartedAt: 0,
    totalPausedMs: 0,
    lastFrameAt: 0,
    redKills: 0,
    bossSpawned: false,
    thayma7Kills: 0,
    cay19Unlocked: false,
    cay19PurchaseCount: 0,
    cay19CurrentCost: PLANT_CONFIG.plants.cay19.baseCost || 0,
    baronAlive: 0,
    spawners: [],
    lastTimerSecond: -1,
    elapsedOffsetMs: 0,
    setupPhaseUntilMs: 0,
    timelineJumpTargetMs: 0,
    timeJumpApplied: true,
    activeDifficultyKey: 'day',
    godMode: false,
    mowers: [],
  };

  const dom = {
    game: document.getElementById('game'),
    shop: document.getElementById('shop'),
    sun: document.getElementById('sun'),
    score: document.getElementById('score'),
    timer: document.getElementById('timer'),
    pauseBtn: document.getElementById('pauseBtn'),
    pauseScreen: document.getElementById('pauseScreen'),
    noSelectBtn: document.getElementById('noSelectBtn'),
    selectedLabel: document.getElementById('selectedPlantLabel'),
    messageBanner: document.getElementById('messageBanner'),
    panelWrap: document.getElementById('panelWrap'),
    chatLog: document.getElementById('chatLog'),
    chatForm: document.getElementById('chatForm'),
    chatInput: document.getElementById('chatInput'),
  };


  const DIFFICULTY_DEFAULTS = {
    key: 'day',
    name: 'Ban ngày',
    startingSun: GAME_SETTINGS.startingSun,
    zombieHpMultiplier: 1,
    zombieSpeedMultiplier: 1,
    setupDurationMs: 0,
    timelineJumpTargetMs: 0,
    bodyClass: ''
  };

  function getCurrentDifficulty() {
    return { ...DIFFICULTY_DEFAULTS, ...(window.PVZDifficulty || {}) };
  }

  function applyDifficultyBodyClass(difficulty) {
    document.body.classList.remove('difficulty-night-active', 'difficulty-hell-active');
    if (difficulty?.bodyClass) {
      document.body.classList.add(difficulty.bodyClass);
    }
  }

  const emojiMap = {
    sunflower: '🌻', bigsun: '🌞', pea: '🟢', peaice: '❄️', pea2: '🌱', wallnut: '🥥', cherry: '🍒', azami: '🌸',
    shovel: '🛠️', cay10: '🔴', cay11: '🪞', cay12: '✨', cay13: '🪨', cay14: '🐕', cay15: '🔥', cay16: '💣',
    dancay8: '🚜',
    cay17: '🧄', cay18: '🌈', cay19: '👹', cay20: '🧬', cay21: '🐉', cay22: '🐶', cay23: '🐲', cay24: '🌟', cay25: '🍄', cay26: '😇',
    normal: '🧟', red: '🟥', big: '🧌', smart: '🧠', purple: '👾', thayma2: '👻', thayma3: '🧱', thayma4: '💥',
    thayma5: '⚔️', thayma6: '☠️', thayma7: '🕳️', thayma8: '🐉', thayma9: '😈', thayma10: '👹'
  };

  const FUSION_RECIPES = [
    {
      id: 'sunflower_pea_to_cay20',
      ingredients: ['sunflower', 'pea'],
      result: 'cay20',
      formulaText: 'Hướng dương + Pea → Cây dung hợp 20'
    },
    {
      id: 'cay17_peaice_to_cay21',
      ingredients: ['cay17', 'peaice'],
      result: 'cay21',
      formulaText: 'Tỏi biến dị + Pea băng → Rồng Băng Tỏi'
    },
    {
      id: 'cay13_cay16_to_cay14',
      ingredients: ['cay13', 'cay16'],
      result: 'cay14',
      formulaText: 'Hắc diệp thạch + Mìn hắc diệp thạch → Óc chó siêu khuyển'
    },
    {
      id: 'wallnut_sunflower_to_cay22',
      ingredients: ['wallnut', 'sunflower'],
      result: 'cay22',
      formulaText: 'Óc chó + Hướng dương → Óc Chó Tỏa Sáng'
    },
    {
      id: 'cay21_cay14_to_cay23',
      ingredients: ['cay21', 'cay14'],
      result: 'cay23',
      formulaText: 'Rồng Băng Tỏi + Óc chó siêu khuyển → Rồng Băng'
    },
    {
      id: 'cay25_cherry_to_cay26',
      ingredients: ['cay25', 'cherry'],
      result: 'cay26',
      formulaText: 'Nấm Thôi niên + Cherry → Nấm Thiên Thần',
      cardHint: 'Cách tạo đặc biệt: đặt Nấm Thôi niên trên sân, rồi chọn Cherry trồng trực tiếp lên ô của Nấm để kích nổ dung hợp.'
    }
  ];

  window.FUSION_RECIPES = FUSION_RECIPES;
  window.SPECIAL_PLANT_INFOS = [
    {
      id: 'evolution_cay22_to_cay24',
      kind: 'evolution',
      source: 'cay22',
      result: 'cay24',
      formulaText: 'Óc Chó Tỏa Sáng → đủ 100 mana → Óc Chó Thăng Hoa'
    }
  ];

  if (!PLANT_CONFIG.plants.cay20) {
    PLANT_CONFIG.plants.cay20 = {
      name: 'Cây dung hợp 20',
      role: 'Dung hợp / tài nguyên kết liễu',
      cost: 0,
      hp: 10,
      maxHp: 10,
      image: 'cay20.png',
      width: 66,
      height: 66,
      description: 'Chỉ có thể tạo bằng cách dung hợp Hướng dương với Pea ngay trên sân. Bắn rất nhanh, mỗi phát gây 2 sát thương. Có 10% tỉ lệ kết liễu ngay Thây ma 1-6; khi kết liễu thành công, zombie đổi thành 500 mặt trời. Mỗi phát bắn thứ 10 cho thêm 100 mặt trời.',
      tips: [
        'Không thể chọn trong màn chọn cây, chỉ tạo ra bằng dung hợp trên sân.',
        'Giữ cây này sống ở hàng đông quái để tận dụng nội tại kết liễu và tạo tài nguyên.',
        'Vì chỉ có 10 máu nên nên đặt sau tường hoặc tạo ra ở hàng đã có bảo kê.'
      ],
      action: {
        type: 'fusionShooter',
        interval: 500,
        bullet: {
          style: 'fusion',
          power: 2,
          count: 1,
          instaKillChance: 0.1,
          instaKillEligible: ['normal', 'thayma2', 'thayma3', 'thayma4', 'thayma5', 'thayma6']
        },
        sunPerTenShots: 100
      }
    };
  }

  if (!PLANT_CONFIG.plants.cay21) {
    PLANT_CONFIG.plants.cay21 = {
      name: 'Rồng Băng Tỏi',
      role: 'Dung hợp / cận chiến khống chế cực mạnh',
      cost: 0,
      hp: 100,
      maxHp: 100,
      image: 'cay21.png',
      attackImage: 'cay21a.png',
      width: 68,
      height: 68,
      description: 'Chỉ có thể tạo bằng dung hợp Tỏi biến dị với Pea băng trên sân. Cây này chỉ tấn công zombie ở ngay ô nó đứng và 1 ô phía trước. Mỗi lần tấn công gây 2 sát thương và có 50% kết liễu ngay lập tức. Khi bị cắn, nó ép zombie sang hàng trên hoặc dưới và đóng băng mục tiêu 5 giây. Khi chết sẽ phát nổ cực mạnh, gây 1000 sát thương quanh mình và hoàn lại 500 mặt trời.',
      tips: [
        'Đây là cây dung hợp tuyến đầu: để gần điểm va chạm để tận dụng nội tại đẩy hàng và đóng băng.',
        'Do có 50% kết liễu ngay nên cực mạnh khi giữ ở cửa choke ngắn.',
        'Khi sắp chết vẫn có giá trị vì vụ nổ sau cùng gây sát thương lớn và trả lại mặt trời.'
      ],
      action: {
        type: 'dragonGarlic',
        interval: 700,
        damage: 2,
        killChance: 0.5,
        range: 1,
        defenseEffect: { freezeDuration: 5000 },
        deathExplosionDamage: 1000,
        deathExplosionRange: 1.8,
        sunOnDeath: 500,
      }
    };
  }

  if (!PLANT_CONFIG.plants.cay22) {
    PLANT_CONFIG.plants.cay22 = {
      name: 'Óc Chó Tỏa Sáng',
      role: 'Dung hợp / kinh tế phòng thủ',
      cost: 0,
      hp: 100,
      maxHp: 100,
      image: 'cay22.png',
      blinkImage: 'cay22a.png',
      width: 68,
      height: 68,
      description: 'Chỉ có thể tạo bằng dung hợp Óc chó với Hướng dương trên sân. Mỗi 1 giây tạo 5 mặt trời. Bình thường cây dùng ảnh cay22.png, khi hoạt động sẽ nhắm mắt bằng ảnh cay22a.png trong chốc lát để tạo cảm giác animation. Khi bị phá hủy, cây trả lại 500 mặt trời.',
      tips: [
        'Đây là cây kinh tế chịu đòn tốt hơn Hướng dương thường, phù hợp giữ giữa trận.',
        'Nên đặt ở hàng đang thiếu kinh tế nhưng vẫn có nguy cơ bị đột phá.',
        'Dù bị phá hủy, cây vẫn hoàn lại 500 mặt trời nên rất đáng để đầu tư dung hợp.'
      ],
      action: {
        type: 'sunProducer',
        interval: 1000,
        amount: 5,
        sunOnDeath: 500,
      }
    };
  }


  if (!PLANT_CONFIG.plants.cay23) {
    PLANT_CONFIG.plants.cay23 = {
      name: 'Rồng Băng',
      role: 'Dung hợp / khống chế toàn hàng cực mạnh',
      cost: 0,
      hp: 10000,
      maxHp: 10000,
      image: 'cay23.png',
      attackImage: 'cay23a.png',
      breathImage: 'cay23b.png',
      width: 84,
      height: 84,
      description: 'Chỉ có thể tạo bằng dung hợp Rồng Băng Tỏi với Óc chó siêu khuyển trên sân. Mỗi 5 giây cây phun một làn hơi băng phủ toàn bộ các ô phía trước bằng ảnh cay23b.png, mỗi zombie chạm vào mất tới 1000 máu và bị chậm 50% trong 1 giây. Khi chính đòn này kết liễu zombie, có 1% cơ hội mọc ra một Óc chó ngay tại ô trống nơi zombie vừa chết.',
      tips: [
        'Đây là cây late-game cực đắt công tạo ra, mạnh nhất khi đặt ở hàng đông quái và có tầm bắn dài.',
        'Vì đòn đánh phủ cả hàng nên rất mạnh trước các đợt quái dồn lane.',
        'Nội tại 1% mọc Óc chó chỉ kích hoạt nếu chính làn phun của cây kết liễu mục tiêu.'
      ],
      action: {
        type: 'dragonBreath',
        interval: 5000,
        damage: 1000,
        duration: 500,
        slowFactor: 0.5,
        slowDuration: 1000,
        spawnChance: 0.01,
        spawnType: 'wallnut',
      }
    };
  }

  if (!PLANT_CONFIG.plants.cay24) {
    PLANT_CONFIG.plants.cay24 = {
      name: 'Óc Chó Thăng Hoa',
      role: 'Tiến hóa / kinh tế phản kích siêu cao cấp',
      cost: 0,
      hp: 3000,
      maxHp: 3000,
      image: 'cay24.png',
      width: 78,
      height: 78,
      description: 'Không dung hợp trực tiếp. Cây này tiến hóa từ Óc Chó Tỏa Sáng: mỗi 1 giây nhận 1 mana, đủ 100 mana sẽ biến thành cay24.png. Sau khi tiến hóa, cây có 3000 máu, mỗi 5 giây cho 25 mặt trời, mỗi lần bị tấn công cho ngay 100 mặt trời, và khi chết sẽ lăn về phía trước gây 500 sát thương trên toàn đường lăn.',
      tips: [
        'Hãy bảo kê Óc Chó Tỏa Sáng đủ lâu để tích đủ 100 mana rồi mới bùng nổ giá trị.',
        'Dạng tiến hóa này rất hợp để đứng ở lane nóng vì mỗi lần bị cắn lại nhả thêm mặt trời.',
        'Ngay cả khi chết, đường lăn cuối cùng vẫn quét sạch lane phía trước.'
      ],
      action: {
        type: 'evolvedSunProducer',
        interval: 5000,
        amount: 25,
        sunOnHit: 100,
        deathRollDamage: 500,
      }
    };
  }



if (!PLANT_CONFIG.plants.cay26) {
  PLANT_CONFIG.plants.cay26 = {
    name: 'Nấm Thiên Thần',
    role: 'Dung hợp / triệu hồi / thôi niên huyền thoại',
    cost: 0,
    hp: 10,
    maxHp: 10,
    image: 'cay26.png',
    width: 76,
    height: 76,
    description: 'Chỉ có thể tạo bằng cách đặc biệt: đặt Nấm Thôi niên trên sân, rồi dùng Cherry trồng trực tiếp lên ô đó để gây nổ 300 sát thương xung quanh và dung hợp thành Nấm Thiên Thần. Cứ 10 giây cây gọi 1 Thây ma 5 phe mình chỉ còn 10% sức mạnh và 5% máu tối đa, mỗi 5 giây bắn 1 mũi tên xuyên mọi mục tiêu gây 30 sát thương. Khi bị tấn công sẽ thôi niên kẻ đánh, và cây chỉ bị phá hủy sau đúng 10 lần trúng đòn.',
    tips: [
      'Đây là cây late-game siêu hiếm, tạo ra bằng cách trồng Cherry trực tiếp lên Nấm Thôi niên.',
      'Bản cân bằng mới: mũi tên của cây chỉ còn 30 sát thương và zombie triệu hồi chỉ còn 10% sức mạnh, 5% máu.',
      'Zombie miễn nhiễm cứng như Thây ma 6-10 không thể bị thôi niên bởi cây này.'
    ],
    action: {
      type: 'angelMushroom',
      summonInterval: 10000,
      summonType: 'thayma5',
      arrowInterval: 5000,
      arrowDamage: 30,
      summonDamageMultiplier: 0.1,
      summonHpMultiplier: 0.05,
      hitShieldCount: 10,
      convertDamageMultiplier: 0.75,
    }
  };
}

const FUSION_ONLY_PLANTS = new Set(['cay14', 'cay23', 'cay24', 'cay26']);

const HARD_IMMUNE_ZOMBIE_TYPES = new Set(['thayma6', 'thayma7', 'thayma8', 'thayma9', 'thayma10']);

HARD_IMMUNE_ZOMBIE_TYPES.forEach((type) => {
  const cfg = ZOMBIE_CONFIG.zombies[type];
  if (!cfg) return;
  cfg.hardImmunity = true;
  cfg.immuneToControl = true;
  cfg.immuneToKnockback = true;
  cfg.immuneToEffectKill = true;
  cfg.immuneToHypnosis = true;
});

function isEnemyZombie(zombie) {
  return !!zombie && !zombie.removed && zombie.team !== 'ally';
}

function isAllyZombie(zombie) {
  return !!zombie && !zombie.removed && zombie.team === 'ally';
}

function isHardImmuneZombie(zombie) {
  return !!zombie && (zombie.config?.hardImmunity || HARD_IMMUNE_ZOMBIE_TYPES.has(zombie.type));
}


  const fusionState = {
    dragging: false,
    sourcePlant: null,
    ghostEl: null,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function playSound(id) {
    const audio = document.getElementById(id);
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  function setBanner(text, variant = 'info', duration = 2400) {
    dom.messageBanner.textContent = text;
    dom.messageBanner.className = `flash-message-${variant}`;
    dom.messageBanner.classList.remove('hidden');
    clearTimeout(setBanner.timer);
    setBanner.timer = setTimeout(() => dom.messageBanner.classList.add('hidden'), duration);
  }

  function appendChatMessage(author, text, variant = 'user') {
    if (!dom.chatLog) return;

    const entry = document.createElement('div');
    entry.className = `chat-msg ${variant}`;

    const authorEl = document.createElement('strong');
    authorEl.textContent = author;

    const textEl = document.createElement('div');
    textEl.textContent = text;

    entry.append(authorEl, textEl);
    dom.chatLog.appendChild(entry);

    while (dom.chatLog.children.length > 24) {
      dom.chatLog.removeChild(dom.chatLog.firstChild);
    }

    dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
  }

  function setGodMode(enabled) {
    state.godMode = !!enabled;
    setBanner(state.godMode ? '🛡️ God mode đã bật: toàn bộ cây bất tử.' : '🛡️ God mode đã tắt.', state.godMode ? 'win' : 'info', 2400);
    appendChatMessage('Hệ thống', state.godMode ? 'Đã bật bất tử cho toàn bộ cây.' : 'Đã tắt bất tử cho toàn bộ cây.', 'system');
  }

  function advanceTimelineByMinutes(minutes) {
    const safeMinutes = Number.parseInt(minutes, 10);
    if (!Number.isFinite(safeMinutes) || safeMinutes <= 0) return false;
    state.elapsedOffsetMs += safeMinutes * 60 * 1000;
    if (!state.timeJumpApplied && state.setupPhaseUntilMs > 0) {
      state.timeJumpApplied = true;
      state.setupPhaseUntilMs = 0;
    }
    state.lastTimerSecond = -1;
    updateHUD();
    setBanner(`⏩ Đã tua thêm ${safeMinutes} phút.`, 'info', 2200);
    appendChatMessage('Hệ thống', `Đã tua thêm ${safeMinutes} phút thời gian trận đấu.`, 'system');
    return true;
  }

  function handleAdminChatCommand(rawText) {
    const adminMatch = rawText.match(/^\/admin\s*\+(\d+)$/i);
    if (adminMatch) {
      const amount = Number.parseInt(adminMatch[1], 10);
      if (!Number.isFinite(amount) || amount <= 0) {
        appendChatMessage('Hệ thống', 'Lệnh không hợp lệ.', 'error');
        return true;
      }

      addSun(amount);
      setBanner(`Admin: +${amount} mặt trời`, 'win', 1600);
      appendChatMessage('Hệ thống', `Đã cộng ${amount} mặt trời.`, 'system');
      return true;
    }

    const godMatch = rawText.match(/^\/god\s+([01])$/i);
    if (godMatch) {
      setGodMode(godMatch[1] === '1');
      return true;
    }

    const skipMatch = rawText.match(/^\/skip\s+(\d+)$/i);
    if (skipMatch) {
      if (!advanceTimelineByMinutes(skipMatch[1])) {
        appendChatMessage('Hệ thống', 'Lệnh không hợp lệ.', 'error');
      }
      return true;
    }

    return false;
  }

  function handleChatSubmit(event) {
    event.preventDefault();
    if (!dom.chatInput) return;

    const rawText = dom.chatInput.value.trim();
    if (!rawText) return;

    if (handleAdminChatCommand(rawText)) {
      dom.chatInput.value = '';
      return;
    }

    appendChatMessage('Bạn', rawText, 'user');
    dom.chatInput.value = '';
  }

  function formatTime(totalSeconds) {
    const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const sec = String(totalSeconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }

  function rawElapsedMs() {
    if (!state.running) return 0;
    if (state.paused) {
      return state.pauseStartedAt - state.startTime - state.totalPausedMs;
    }
    return performance.now() - state.startTime - state.totalPausedMs;
  }

  function elapsedMs() {
    return Math.max(0, rawElapsedMs() + (state.elapsedOffsetMs || 0));
  }

  function elapsedSeconds() {
    return Math.max(0, Math.floor(elapsedMs() / 1000));
  }

  function cellToPixel(row, col) {
    return {
      x: col * GAME_SETTINGS.cellWidth + GAME_SETTINGS.cellWidth / 2,
      y: row * GAME_SETTINGS.cellHeight + GAME_SETTINGS.cellHeight / 2,
    };
  }

  function boardPixelToCell(clientX, clientY) {
    const rect = dom.game.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const c = clamp(Math.floor(x / GAME_SETTINGS.cellWidth), 0, state.cols - 1);
    const r = clamp(Math.floor(y / GAME_SETTINGS.cellHeight), 0, state.rows - 1);
    return { r, c };
  }

  function createEntityShell(type, entityType, width, height, image, name) {
    const wrapper = document.createElement('div');
    wrapper.className = `entity ${entityType} ${type}`;
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;

    const shell = document.createElement('div');
    shell.className = `${entityType}-shell`;
    shell.style.width = '100%';
    shell.style.height = '100%';

    const img = document.createElement('img');
    img.src = image || '';
    img.alt = name;
    img.onerror = () => {
      img.remove();
      const fallback = document.createElement('div');
      fallback.className = 'fallback-face';
      fallback.textContent = emojiMap[type] || (entityType === 'plant' ? '🌿' : '🧟');
      shell.appendChild(fallback);
    };
    shell.appendChild(img);
    wrapper.appendChild(shell);
    return { wrapper, shell };
  }

  function createStatTag(className, topText) {
    const tag = document.createElement('div');
    tag.className = className;
    tag.textContent = topText;
    return tag;
  }


  function renderBoardGrid() {
    dom.game.innerHTML = '';
    for (let r = 0; r < state.rows; r += 1) {
      for (let c = 0; c < state.cols; c += 1) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.style.left = `${c * GAME_SETTINGS.cellWidth}px`;
        cell.style.top = `${r * GAME_SETTINGS.cellHeight}px`;
        cell.style.width = `${GAME_SETTINGS.cellWidth}px`;
        cell.style.height = `${GAME_SETTINGS.cellHeight}px`;
        dom.game.appendChild(cell);
      }
    }
  }

  function updateMowerVisual(mower) {
    if (!mower || !mower.el) return;
    const pos = cellToPixel(mower.row, mower.x);
    mower.el.style.left = `${pos.x}px`;
    mower.el.style.top = `${pos.y}px`;
    mower.el.classList.toggle('active', !!mower.active);
    mower.el.classList.toggle('spent', !!mower.used && !mower.active);
  }

  function createLaneMowers() {
    state.mowers.forEach((mower) => mower.el?.remove());
    state.mowers = [];
    for (let row = 0; row < state.rows; row += 1) {
      const { wrapper } = createEntityShell('dancay8', 'mower', 64, 64, 'dancay8.png', 'Dàn cày bảo hộ');
      wrapper.classList.add('lane-mower');
      const mower = {
        row,
        x: -0.55,
        speed: 9,
        active: false,
        used: false,
        el: wrapper,
      };
      updateMowerVisual(mower);
      dom.game.appendChild(wrapper);
      state.mowers.push(mower);
    }
  }

  function triggerLaneMower(row) {
    const mower = state.mowers.find((item) => item.row === row);
    if (!mower || mower.used) return false;
    mower.used = true;
    mower.active = true;
    updateMowerVisual(mower);
    setBanner(`Dàn cày hàng ${row + 1} đã kích hoạt!`, 'danger', 1800);
    playSound('boomSound');
    return true;
  }

  function updateMowers(dt) {
    state.mowers.forEach((mower) => {
      if (!mower.active) return;
      mower.x += mower.speed * dt;
      state.zombies.forEach((zombie) => {
        if (zombie.removed || !isEnemyZombie(zombie) || zombie.r !== mower.row) return;
        if (zombie.type === 'thayma6') return;
        if (zombie.x < mower.x - 0.45 || zombie.x > mower.x + 0.55) return;
        zombie.hp = 0;
        updateZombieVisuals(zombie);
      });
      if (mower.x > state.cols + 0.9) {
        mower.active = false;
        updateMowerVisual(mower);
      } else {
        updateMowerVisual(mower);
      }
    });
  }

  function buildShop() {
    dom.shop.innerHTML = '';

    PLANT_ORDER.forEach((type) => {
      const config = PLANT_CONFIG.plants[type];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'shop-card';
      card.dataset.type = type;
      card.innerHTML = `
        <span class="badge">${config.cost} ☀️</span>
        <div class="thumb"><img src="${config.image}" alt="${config.name}" onerror="this.remove(); this.parentNode.textContent='${emojiMap[type] || '🌿'}';"></div>
        <div class="name">${config.name}</div>
        <div class="meta">${config.role}</div>
      `;
      card.addEventListener('click', () => selectPlant(type));
      card.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        window.showPlantDetail?.(type);
      });
      dom.shop.appendChild(card);
    });

    updateShopAvailability();
  }

  function updateHUD() {
    dom.sun.textContent = Math.floor(state.sun);
    dom.score.textContent = state.score;
    dom.selectedLabel.textContent = state.selectedPlant ? (PLANT_CONFIG.plants[state.selectedPlant]?.name || state.selectedPlant) : 'Không chọn';

    const seconds = elapsedSeconds();
    if (seconds !== state.lastTimerSecond) {
      state.lastTimerSecond = seconds;
      dom.timer.textContent = formatTime(seconds);
    }
  }

  function updateShopAvailability() {
    document.querySelectorAll('.shop-card').forEach((card) => {
      const type = card.dataset.type;
      const config = PLANT_CONFIG.plants[type];
      const baseCost = type === 'cay19' ? state.cay19CurrentCost : config.cost;
      const shouldShow = type === 'shovel' || (!FUSION_ONLY_PLANTS.has(type) && window.selectedPlants.has(type)) || (type === 'cay19' && state.cay19Unlocked);
      card.classList.toggle('hidden', !shouldShow);
      card.classList.toggle('selected', state.selectedPlant === type);
      card.classList.toggle('locked', type === 'cay19' && !state.cay19Unlocked);
      card.classList.toggle('disabled', (!shouldShow) || (type === 'cay19' && !state.cay19Unlocked) || (type !== 'shovel' && state.sun < baseCost));
      const badge = card.querySelector('.badge');
      if (badge) badge.textContent = `${baseCost} ☀️`;
      card.title = config.description;
    });

    window.updateShopWithSelectedPlants?.();
  }

  function setPlantImage(plant, imageSrc) {
    if (!plant || plant.removed) return;
    const img = plant.imgEl;
    if (!img) return;
    img.src = imageSrc;
    img.alt = plant.config.name;
  }

  function triggerPlantAnimation(plant, activeImage, duration = 180) {
    if (!plant || plant.removed) return;
    clearTimeout(plant.attackVisualTimeout);
    setPlantImage(plant, activeImage || plant.config.attackImage || plant.config.blinkImage || plant.config.image);
    plant.attackVisualTimeout = setTimeout(() => {
      if (!plant.removed) setPlantImage(plant, plant.config.image);
    }, duration);
  }

  function triggerPlantAttackVisual(plant) {
    if (!plant || plant.removed) return;
    if (plant.type === 'cay21') {
      triggerPlantAnimation(plant, plant.config.attackImage || plant.config.image, 180);
      return;
    }
    if (plant.type === 'cay23') {
      triggerPlantAnimation(plant, plant.config.attackImage || plant.config.image, 320);
    }
  }

  function explodePlantOnDeath(plant) {
    if (!plant || plant.removed) return;
    const action = plant.config.action || {};
    const victims = getZombiesInRadius(plant.r, plant.c, action.deathExplosionRange || 1.8).filter((zombie) => !zombie.config.immuneToExplosion);
    victims.forEach((zombie) => {
      zombie.hp -= action.deathExplosionDamage || 0;
      updateZombieVisuals(zombie);
    });
    const pos = cellToPixel(plant.r, plant.c);
    spawnEffect('boom', pos.x, pos.y, 760);
    playSound('boomSound');
    if (action.sunOnDeath) addSun(action.sunOnDeath);
  }

  function spawnLaneRollEffect(row, startCol, imageSrc) {
    const wrapper = document.createElement('div');
    wrapper.className = 'roll-wave';
    for (let c = startCol; c < state.cols; c += 1) {
      const cell = document.createElement('div');
      cell.className = 'roll-cell';
      cell.style.left = `${c * GAME_SETTINGS.cellWidth}px`;
      cell.style.top = `${row * GAME_SETTINGS.cellHeight}px`;
      cell.style.width = `${GAME_SETTINGS.cellWidth}px`;
      cell.style.height = `${GAME_SETTINGS.cellHeight}px`;
      cell.style.backgroundImage = `url(${imageSrc || 'cay24.png'})`;
      wrapper.appendChild(cell);
    }
    dom.game.appendChild(wrapper);
    state.effects.push({ el: wrapper, expiresAt: performance.now() + 650 });
  }

  function rollForwardOnDeath(plant) {
    if (!plant || plant.removed) return;
    const action = plant.config.action || {};
    state.zombies.forEach((zombie) => {
      if (!isEnemyZombie(zombie)) return;
      if (zombie.removed) return;
      if (zombie.r !== plant.r) return;
      if (zombie.x < plant.c - 0.2) return;
      zombie.hp -= action.deathRollDamage || 500;
      updateZombieVisuals(zombie);
    });
    spawnLaneRollEffect(plant.r, plant.c, plant.config.image);
    const pos = cellToPixel(plant.r, plant.c);
    spawnEffect('boom', pos.x, pos.y, 700);
    playSound('boomSound');
  }

  function evolvePlantInPlace(plant, nextType) {
    if (!plant || plant.removed) return null;
    const row = plant.r;
    const col = plant.c;
    const oldName = plant.config.name;
    removePlant(plant);
    const evolved = addPlant(row, col, nextType);
    if (!evolved) return null;
    evolved.mana = 100;
    updatePlantVisuals(evolved);
    const pos = cellToPixel(row, col);
    spawnEffect('heal', pos.x, pos.y, 700);
    setBanner(`${oldName} đã tiến hóa thành ${evolved.config.name}!`, 'win', 2200);
    return evolved;
  }

  function dragonGarlicTryAttack(plant, action) {
    const closeTargets = state.zombies
      .filter((zombie) => isEnemyZombie(zombie) && zombie.r === plant.r && zombie.x >= plant.c - 0.2 && zombie.x <= plant.c + (action.range || 1))
      .sort((a, b) => a.x - b.x);
    const target = closeTargets[0];
    if (!target) return;

    triggerPlantAttackVisual(plant);
    if (!target.config.immuneToEffectKill && !isHardImmuneZombie(target) && Math.random() < (action.killChance || 0)) {
      target.hp = 0;
      const pos = cellToPixel(target.r, target.x);
      spawnEffect('flash', pos.x, pos.y, 520);
      setBanner(`${plant.config.name} kết liễu ${target.config.name}!`, 'win', 1200);
    } else {
      target.hp -= action.damage || 0;
    }
    updateZombieVisuals(target);
    playSound('shootSound');
  }


  function spawnBreathWaveProjectile({ plant, action }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'projectile breath-wave';
    dom.game.appendChild(wrapper);

    const projectile = {
      team: 'ally',
      type: 'breathWave',
      row: plant.r,
      startCol: plant.c + 1,
      damage: action.damage || 70,
      slowFactor: action.slowFactor || 0.5,
      slowDuration: action.slowDuration || 1000,
      spawnChance: action.spawnChance || 0.01,
      spawnType: action.spawnType || 'wallnut',
      duration: action.duration || 500,
      expiresAt: performance.now() + (action.duration || 500),
      hitZombies: new Set(),
      el: wrapper,
      removed: false,
    };

    for (let c = projectile.startCol; c < state.cols; c += 1) {
      const cell = document.createElement('div');
      cell.className = 'breath-cell';
      cell.style.left = `${c * GAME_SETTINGS.cellWidth}px`;
      cell.style.top = `${plant.r * GAME_SETTINGS.cellHeight}px`;
      cell.style.width = `${GAME_SETTINGS.cellWidth}px`;
      cell.style.height = `${GAME_SETTINGS.cellHeight}px`;
      cell.style.backgroundImage = `url(${plant.config.breathImage || 'cay23b.png'})`;
      wrapper.appendChild(cell);
    }

    state.projectiles.push(projectile);
    return projectile;
  }

  function dragonBreathTryAttack(plant, action) {
    const hasTargetAhead = state.zombies.some((zombie) => zombie.r === plant.r && zombie.x > plant.c + 0.1);
    if (!hasTargetAhead) return;

    triggerPlantAttackVisual(plant);
    spawnBreathWaveProjectile({ plant, action });
    playSound('hellfireSound');
  }

  function getFusionRecipeByPlants(typeA, typeB) {
    return FUSION_RECIPES.find((recipe) => {
      const set = new Set(recipe.ingredients);
      return set.has(typeA) && set.has(typeB) && typeA !== typeB;
    }) || null;
  }

  function canStartFusionDrag(plant) {
    return FUSION_RECIPES.some((recipe) => recipe.ingredients.includes(plant.type));
  }

  function ensureFusionPanel() {
    if (!dom.panelWrap || document.getElementById('fusionPanel')) return;
    const panel = document.createElement('section');
    panel.id = 'fusionPanel';
    panel.innerHTML = `
      <div class="fusion-panel-head">
        <div>
          <h3>🧬 Danh sách cây dung hợp</h3>
          <p>Các cây ở đây không xuất hiện trong danh sách chọn cây. Chúng chỉ được tạo bằng công thức dung hợp ngay trên sân.</p>
        </div>
      </div>
      <div id="fusionList" class="fusion-list"></div>
    `;
    dom.panelWrap.appendChild(panel);

    const fusionList = panel.querySelector('#fusionList');
    FUSION_RECIPES.forEach((recipe) => {
      const resultConfig = PLANT_CONFIG.plants[recipe.result];
      const ingredientsText = recipe.ingredients.map((type) => PLANT_CONFIG.plants[type]?.name || type).join(' + ');
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'fusion-card';
      card.innerHTML = `
        <div class="fusion-thumb"><img src="${resultConfig.image}" alt="${resultConfig.name}" onerror="this.remove(); this.parentNode.textContent='${emojiMap[recipe.result] || '🧬'}';"></div>
        <div class="fusion-info">
          <div class="fusion-name">${resultConfig.name}</div>
          <div class="fusion-formula">${ingredientsText} → ${resultConfig.name}</div>
          <div class="fusion-meta">Không thể chọn trực tiếp · Giữ Shift rồi kéo nguyên liệu trên sân để dung hợp</div>
        </div>
      `;
      card.addEventListener('click', () => window.showPlantDetail?.(recipe.result));
      fusionList.appendChild(card);
    });
  }

  function createFusionGhost(plant) {
    destroyFusionGhost();
    const ghost = document.createElement('div');
    ghost.className = 'fusion-drag-ghost';
    ghost.innerHTML = `<img src="${plant.config.image}" alt="${plant.config.name}" onerror="this.remove(); this.parentNode.textContent='${emojiMap[plant.type] || '🌿'}';">`;
    document.body.appendChild(ghost);
    fusionState.ghostEl = ghost;
    positionFusionGhost(window.__lastMouseX || 0, window.__lastMouseY || 0);
  }

  function destroyFusionGhost() {
    if (fusionState.ghostEl) {
      fusionState.ghostEl.remove();
      fusionState.ghostEl = null;
    }
  }

  function positionFusionGhost(clientX, clientY) {
    window.__lastMouseX = clientX;
    window.__lastMouseY = clientY;
    if (!fusionState.ghostEl) return;
    fusionState.ghostEl.style.left = `${clientX}px`;
    fusionState.ghostEl.style.top = `${clientY}px`;
  }

  function startFusionDrag(plant, event) {
    if (!plant || plant.removed || !canStartFusionDrag(plant)) return;
    fusionState.dragging = true;
    fusionState.sourcePlant = plant;
    createFusionGhost(plant);
    positionFusionGhost(event.clientX, event.clientY);
    setBanner(`Đang kéo ${plant.config.name}. Thả vào nguyên liệu phù hợp để dung hợp.`, 'info', 1800);
  }

  function cancelFusionDrag() {
    fusionState.dragging = false;
    fusionState.sourcePlant = null;
    destroyFusionGhost();
  }

  function completeFusionAt(clientX, clientY) {
    if (!fusionState.dragging || !fusionState.sourcePlant || fusionState.sourcePlant.removed) {
      cancelFusionDrag();
      return;
    }

    const rect = dom.game.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      cancelFusionDrag();
      return;
    }

    const { r, c } = boardPixelToCell(clientX, clientY);
    const targetPlant = findPlantAt(r, c);
    const sourcePlant = fusionState.sourcePlant;

    if (!targetPlant || targetPlant === sourcePlant || targetPlant.removed) {
      cancelFusionDrag();
      return;
    }

    const recipe = getFusionRecipeByPlants(sourcePlant.type, targetPlant.type);
    if (!recipe) {
      setBanner('Hai cây này không có công thức dung hợp.', 'danger');
      cancelFusionDrag();
      return;
    }

    const resultType = recipe.result;
    const spawnRow = targetPlant.r;
    const spawnCol = targetPlant.c;
    removePlant(sourcePlant);
    removePlant(targetPlant);
    addPlant(spawnRow, spawnCol, resultType);
    setBanner(`Dung hợp thành công: ${PLANT_CONFIG.plants[resultType].name}!`, 'win', 2400);
    cancelFusionDrag();
  }


  function selectPlant(type) {
    if (!state.running) return;
    if (type === 'cay19' && !state.cay19Unlocked) {
      setBanner('Cây 19 chưa mở khóa.', 'danger');
      return;
    }
    state.selectedPlant = type;
    updateHUD();
    updateShopAvailability();
  }

  function deselectPlant() {
    state.selectedPlant = null;
    updateHUD();
    updateShopAvailability();
  }

  function findPlantAt(row, col) {
    return state.plants.find((plant) => plant.r === row && plant.c === col) || null;
  }

  function getPlantsInRadius(row, col, radius) {
    return state.plants.filter((plant) => Math.abs(plant.r - row) <= radius && Math.abs(plant.c - col) <= radius);
  }

  function getZombiesInRadius(row, x, radius) {
    return state.zombies.filter((zombie) => isEnemyZombie(zombie) && Math.abs(zombie.r - row) <= radius && Math.abs(zombie.x - x) <= radius);
  }

  function hasZombieInLane(row, maxRange = Infinity) {
    return state.zombies.some((zombie) => isEnemyZombie(zombie) && zombie.r === row && zombie.x >= 0 && zombie.x - 0.4 <= maxRange);
  }

  function getPlantsInLane(row) {
    return state.plants.filter((plant) => plant.r === row).sort((a, b) => a.c - b.c);
  }

  function getFrontPlant(zombie) {
    const lanePlants = getPlantsInLane(zombie.r).filter((plant) => plant.c <= zombie.x + 0.4 && plant.c >= zombie.x - 1.2);
    if (!lanePlants.length) return null;
    return lanePlants.sort((a, b) => b.c - a.c)[0];
  }

  function countPlantsOfTypeInRow(row, type) {
    return state.plants.filter((plant) => plant.r === row && plant.type === type).length;
  }

  function nearestZombies(fromZombie, count, exclude = new Set()) {
    return state.zombies
      .filter((zombie) => isEnemyZombie(zombie) && zombie !== fromZombie && !exclude.has(zombie))
      .map((zombie) => ({ zombie, dist: Math.hypot(zombie.r - fromZombie.r, zombie.x - fromZombie.x) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, count)
      .map((entry) => entry.zombie);
  }

  function currentProjectileBonus(plant) {
    let bonus = 0;

    if (state.plants.some((p) => p.type === 'cay19')) {
      bonus += PLANT_CONFIG.plants.cay19.action.bulletEnhanceDamage;
    }

    const enhancers = getPlantsInRadius(plant.r, plant.c, 1).filter((p) => p.type === 'cay12');
    let multiplier = 1;
    enhancers.forEach((enhancer) => {
      multiplier *= enhancer.config.action.multiplier;
    });

    return { bonus, multiplier };
  }

  function addSun(amount) {
    state.sun += amount;
    updateHUD();
    updateShopAvailability();
  }

  function spendSun(amount) {
    if (state.sun < amount) return false;
    state.sun -= amount;
    updateHUD();
    updateShopAvailability();
    return true;
  }

  function spawnEffect(className, x, y, duration = 450) {
    const el = document.createElement('div');
    el.className = `effect ${className}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    dom.game.appendChild(el);
    const effect = { el, expiresAt: performance.now() + duration };
    state.effects.push(effect);
    return effect;
  }

  function removePlant(plant) {
    if (plant.removed) return;
    plant.removed = true;
    if (plant.attackVisualTimeout) clearTimeout(plant.attackVisualTimeout);
    plant.el.remove();
    state.plants = state.plants.filter((item) => item !== plant);
  }

  function removeZombie(zombie) {
    if (zombie.removed) return;
    zombie.removed = true;
    zombie.el.remove();
    state.zombies = state.zombies.filter((item) => item !== zombie);
  }

  function removeProjectile(projectile) {
    if (projectile.removed) return;
    projectile.removed = true;
    projectile.el.remove();
    state.projectiles = state.projectiles.filter((item) => item !== projectile);
  }

  function healPlant(plant, amount) {
    if (!plant || plant.removed || amount <= 0) return;
    let finalAmount = amount;
    if (plant.type === 'cay14') finalAmount *= plant.config.action.healMultiplier || 1;
    const before = plant.hp;
    plant.hp = Math.min(plant.maxHp, plant.hp + finalAmount);
    if (plant.hp > before) {
      updatePlantVisuals(plant);
      const pos = cellToPixel(plant.r, plant.c);
      spawnEffect('heal', pos.x, pos.y, 600);
    }
  }

  function applyTemporarySlow(zombie, factor, duration, variant = 'slowed') {
    if (zombie.config.immuneToControl) return;
    zombie.tempSlowFactor = Math.min(zombie.tempSlowFactor ?? 1, factor);
    zombie.tempSlowUntil = Math.max(zombie.tempSlowUntil || 0, performance.now() + duration);
    zombie.el.classList.add(variant);
  }

  function applyPermanentSlow(zombie, amount, maxSlow) {
    if (zombie.config.immuneToControl) return;
    zombie.permanentSlow = clamp((zombie.permanentSlow || 0) + amount, 0, maxSlow);
    zombie.el.classList.add('slowed');
  }

  function moveZombieToAdjacentRow(zombie) {
    if (zombie.config.immuneToControl || zombie.config.immuneToKnockback || isHardImmuneZombie(zombie)) return;
    const rows = [];
    if (zombie.r > 0) rows.push(zombie.r - 1);
    if (zombie.r < state.rows - 1) rows.push(zombie.r + 1);
    if (!rows.length) return;
    zombie.r = rows[Math.floor(Math.random() * rows.length)];
    updateZombieVisuals(zombie);
  }

  function damageZombie(zombie, damage, source = null) {
    if (!zombie || zombie.removed || damage <= 0) return;
    zombie.hp -= damage;
    updateZombieVisuals(zombie);
  }

  function hypnotizeZombie(zombie, sourcePlant = null) {
    if (!zombie || zombie.removed) return false;
    if (isHardImmuneZombie(zombie) || zombie.config.immuneToHypnosis) return false;
    if (isAllyZombie(zombie)) return false;
    zombie.team = 'ally';
    zombie.damageMultiplier = sourcePlant?.config?.action?.convertDamageMultiplier || 0.75;
    zombie.tempSlowUntil = 0;
    zombie.tempSlowFactor = 1;
    zombie.permanentSlow = 0;
    zombie.finalBlowData = null;
    zombie.el.classList.remove('slowed', 'extreme-slow', 'buffed');
    zombie.el.classList.add('allied', 'hypnotized');
    setBanner(`${zombie.config.name} đã bị thôi niên và đổi phe!`, 'win', 1600);
    return true;
  }

  function getFrontAllyZombie(enemyZombie) {
    const laneAllies = state.zombies.filter((zombie) => isAllyZombie(zombie) && zombie.r === enemyZombie.r && zombie.x <= enemyZombie.x + 0.4 && zombie.x >= enemyZombie.x - 1.2);
    if (!laneAllies.length) return null;
    return laneAllies.sort((a, b) => b.x - a.x)[0];
  }

  function getFrontEnemyZombie(allyZombie) {
    const laneEnemies = state.zombies.filter((zombie) => isEnemyZombie(zombie) && zombie.r === allyZombie.r && zombie.x >= allyZombie.x - 0.2 && zombie.x <= allyZombie.x + 1.2);
    if (!laneEnemies.length) return null;
    return laneEnemies.sort((a, b) => a.x - b.x)[0];
  }

  function applyPlantDefenseTrigger(plant, zombie) {
    if (!plant || !zombie) return;

    if (plant.type === 'cay16') {
      const damage = plant.config.action.explosionDamage;
      state.zombies.forEach((enemy) => {
        if (!enemy.removed) enemy.hp -= damage;
      });
      const pos = cellToPixel(plant.r, plant.c);
      spawnEffect('boom', pos.x, pos.y, 700);
      playSound('boomSound');
    }

    if (plant.type === 'cay17') {
      moveZombieToAdjacentRow(zombie);
      applyTemporarySlow(zombie, 0.2, plant.config.action.defenseEffect.slowDuration, 'slowed');
      playSound('garlicSound');
    }

    if (plant.type === 'cay18') {
      moveZombieToAdjacentRow(zombie);
      applyTemporarySlow(zombie, 0.01, plant.config.action.defenseEffect.extremeSlowDuration, 'extreme-slow');
      playSound('throwSound');
    }

    if (plant.type === 'cay21') {
      moveZombieToAdjacentRow(zombie);
      applyTemporarySlow(zombie, 0.001, plant.config.action.defenseEffect.freezeDuration, 'extreme-slow');
      playSound('garlicSound');
    }

    if ((plant.type === 'cay25' || plant.type === 'cay26') && zombie) {
      const converted = hypnotizeZombie(zombie, plant);
      if (converted) playSound('garlicSound');
    }
  }


function damagePlant(plant, damage, zombie = null) {
  if (!plant || plant.removed) return;
  if (state.godMode) return;

  if (plant.type === 'cay26') {
    plant.hitShieldRemaining = Math.max(0, (plant.hitShieldRemaining ?? (plant.config.action?.hitShieldCount || 10)) - 1);
    plant.hp = plant.hitShieldRemaining;
    applyPlantDefenseTrigger(plant, zombie);
    updatePlantVisuals(plant);
    if (plant.hitShieldRemaining <= 0) removePlant(plant);
    return;
  }

  let finalDamage = damage;
  const action = plant.config.action || {};
  if (action.damageReduction) {
    finalDamage *= (1 - action.damageReduction);
  }

  plant.hp -= finalDamage;

  if (plant.type === 'cay19') {
    healPlant(plant, action.healOnHit || 0);
  }

  if (plant.type === 'cay24' && (action.sunOnHit || 0) > 0) {
    addSun(action.sunOnHit);
    const pos = cellToPixel(plant.r, plant.c);
    spawnEffect('flash', pos.x, pos.y, 260);
  }

  applyPlantDefenseTrigger(plant, zombie);
  updatePlantVisuals(plant);

  if (plant.hp <= 0) {
    if (plant.type === 'cay21') {
      explodePlantOnDeath(plant);
    } else if (plant.type === 'cay24') {
      rollForwardOnDeath(plant);
    } else if (action.sunOnDeath) {
      addSun(action.sunOnDeath);
      const pos = cellToPixel(plant.r, plant.c);
      spawnEffect('heal', pos.x, pos.y, 520);
      setBanner(`${plant.config.name} để lại ${action.sunOnDeath} mặt trời khi bị phá hủy.`, 'info', 1800);
    }
    removePlant(plant);
  }
}

function updatePlantVisuals(plant) {
    if (plant.removed) return;
    plant.hpTag.textContent = `${Math.max(0, Math.ceil(plant.hp))} HP`;
    if (plant.manaFill) {
      plant.manaFill.style.width = `${clamp(plant.mana, 0, 100)}%`;
    }
  }

  function updateZombieVisuals(zombie) {
    if (zombie.removed) return;
    const pos = cellToPixel(zombie.r, zombie.x);
    zombie.el.style.left = `${pos.x}px`;
    zombie.el.style.top = `${pos.y}px`;
    zombie.hpTag.textContent = `${Math.max(0, Math.ceil(zombie.hp))} HP`;
  }

  function trySpawnPlantFromZombieDeath(zombie) {
    const data = zombie.finalBlowData;
    if (!data || data.sourcePlant !== 'cay23') return;
    if (Math.random() >= (data.spawnChance || 0)) return;

    const spawnType = data.spawnType || 'wallnut';
    const spawnCol = clamp(Math.round(zombie.x), 0, state.cols - 1);
    if (findPlantAt(zombie.r, spawnCol)) return;

    const spawned = addPlant(zombie.r, spawnCol, spawnType);
    if (!spawned) return;
    const pos = cellToPixel(zombie.r, spawnCol);
    spawnEffect('heal', pos.x, pos.y, 620);
    setBanner(`${PLANT_CONFIG.plants.cay23?.name || 'Rồng Băng'} đã hóa xác zombie thành ${spawned.config.name}!`, 'win', 1800);
  }

  function awardZombieDeath(zombie) {
    if (isAllyZombie(zombie)) {
      updateHUD();
      playSound('dieSound');
      return;
    }
    const config = zombie.config;
    const sunReward = zombie.instantKillSunOverride ?? (config.sunReward || 0);
    addSun(sunReward);
    state.score += config.scoreReward || 0;

    if (zombie.type === 'red') {
      state.redKills += 1;
      if (state.redKills >= 20 && !state.bossSpawned) {
        state.bossSpawned = true;
        spawnZombieByType('purple');
        setBanner('Boss đã xuất hiện vì bạn đã hạ 20 Thây ma đỏ!', 'info', 3000);
      }
    }

    if (zombie.type === 'thayma7') {
      state.thayma7Kills += 1;
      if (!state.cay19Unlocked) {
        state.cay19Unlocked = true;
        setBanner('✨ Đã mở khóa Cây 19!', 'win', 3000);
      }
      updateShopAvailability();
    }

    if (zombie.type === 'thayma8') {
      state.baronAlive = Math.max(0, state.baronAlive - 1);
      if (zombie.config.spawnsThayma7OnDeath) {
        spawnZombieByType('thayma7', zombie.r, { hpOverride: zombie.config.spawnedThayma7Hp || 300000 });
      }
    }

    if (zombie.type === 'thayma4' && zombie.config.explosionOnDeath) {
      const victims = getPlantsInRadius(zombie.r, zombie.x, zombie.config.explosionRange || 1.5);
      victims.forEach((plant) => damagePlant(plant, 999, zombie));
      const pos = cellToPixel(zombie.r, zombie.x);
      spawnEffect('boom', pos.x, pos.y, 700);
      playSound('boomSound');
    }

    if (zombie.type === 'thayma6' && zombie.config.winOnKill) {
      finishGame(true, '🎉 Bạn đã tiêu diệt Quái vật tối thượng!');
    }

    trySpawnPlantFromZombieDeath(zombie);
    updateHUD();
    playSound('dieSound');
  }

  function killZombie(zombie) {
    if (zombie.removed) return;
    awardZombieDeath(zombie);
    removeZombie(zombie);
  }

  function spawnLinearProjectile({ team, row, x, power, style, freeze = false, knock = false, knockDistance = 0.2, sourceType = 'plant', speed = null, enhanced = false, instaKillChance = 0, instaKillEligible = [], sourceZombieId = null, pierce = false }) {
    const el = document.createElement('div');
    el.className = `projectile linear ${team === 'enemy' ? 'enemy' : style || 'yellow'}${enhanced ? ' enhanced' : ''}`;
    const pos = cellToPixel(row, x);
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    dom.game.appendChild(el);

    const projectile = {
      team,
      type: 'linear',
      row,
      x,
      power,
      style,
      freeze,
      knock,
      knockDistance,
      sourceType,
      speed: speed || (team === 'enemy' ? GAME_SETTINGS.enemyProjectileSpeed : GAME_SETTINGS.projectileSpeed),
      el,
      enhanced,
      instaKillChance,
      instaKillEligible,
      sourceZombieId,
      pierce,
      hitZombies: new Set(),
      removed: false,
    };

    state.projectiles.push(projectile);
    return projectile;
  }

  function spawnThrowProjectile(plant) {
    const action = plant.config.action;
    const bullet = action.bullet;
    const targets = state.zombies.filter((zombie) => isEnemyZombie(zombie) && zombie.r === plant.r && zombie.x > plant.c).sort((a, b) => a.x - b.x);
    const target = targets[0];
    if (!target) return;

    const el = document.createElement('div');
    el.className = 'projectile throw';
    const start = cellToPixel(plant.r, plant.c + 0.2);
    el.style.left = `${start.x}px`;
    el.style.top = `${start.y}px`;
    dom.game.appendChild(el);

    const projectile = {
      team: 'ally',
      type: 'throw',
      row: plant.r,
      startX: plant.c + 0.2,
      startY: plant.r,
      x: plant.c + 0.2,
      y: plant.r,
      startAt: performance.now(),
      duration: 650,
      target,
      mainDamage: bullet.mainDamage,
      bounceDamage: bullet.bounceDamage,
      bounceCount: bullet.bounceCount,
      slowAmount: bullet.slowAmount,
      maxSlow: bullet.maxSlow,
      el,
      visited: new Set(),
      removed: false,
    };

    state.projectiles.push(projectile);
    playSound('throwSound');
  }

  function spawnBounceProjectile(fromZombie, targetZombie, damage, slowAmount, maxSlow, visited) {
    if (!targetZombie) return;
    const el = document.createElement('div');
    el.className = 'projectile bounce';
    const start = cellToPixel(fromZombie.r, fromZombie.x);
    el.style.left = `${start.x}px`;
    el.style.top = `${start.y}px`;
    dom.game.appendChild(el);

    const projectile = {
      team: 'ally',
      type: 'bounce',
      startX: fromZombie.x,
      startR: fromZombie.r,
      x: fromZombie.x,
      row: fromZombie.r,
      startAt: performance.now(),
      duration: 420,
      target: targetZombie,
      power: damage,
      slowAmount,
      maxSlow,
      el,
      visited,
      removed: false,
    };

    state.projectiles.push(projectile);
    const pos = cellToPixel(fromZombie.r, fromZombie.x);
    spawnEffect('bounce-ring', pos.x, pos.y, 360);
    playSound('bounceSound');
  }

  function shooterTryAttack(plant, action) {
    const bullet = action.bullet;
    const maxRange = bullet.range ?? Infinity;
    const minOffset = bullet.minOffset ?? 0;
    const targetExists = state.zombies.some((zombie) => {
      const offset = zombie.x - plant.c;
      return isEnemyZombie(zombie) && zombie.r === plant.r && offset >= minOffset && offset <= maxRange;
    });
    if (!targetExists) return;

    if (action.cost && !spendSun(action.cost)) return;

    if (plant.type === 'cay21') {
      triggerPlantAttackVisual(plant);
    }

    const enhancement = currentProjectileBonus(plant);
    const finalPower = Math.round(((bullet.power || 0) + enhancement.bonus) * enhancement.multiplier);
    for (let i = 0; i < (bullet.count || 1); i += 1) {
      spawnLinearProjectile({
        team: 'ally',
        row: plant.r,
        x: plant.c + 0.18 + i * 0.06,
        power: finalPower,
        style: bullet.style,
        freeze: !!bullet.freeze,
        knock: !!bullet.knock,
        knockDistance: bullet.knockDistance || 0.2,
        enhanced: enhancement.bonus > 0 || enhancement.multiplier > 1,
        instaKillChance: bullet.instaKillChance || 0,
        instaKillEligible: bullet.instaKillEligible || [],
      });

      if (plant.type === 'cay20') {
        plant.shotsFired = (plant.shotsFired || 0) + 1;
        if (plant.shotsFired % 10 === 0) {
          addSun(action.sunPerTenShots || 100);
          const pos = cellToPixel(plant.r, plant.c);
          spawnEffect('heal', pos.x, pos.y, 520);
          setBanner(`${plant.config.name} tạo thêm ${action.sunPerTenShots || 100} mặt trời sau 10 phát bắn.`, 'info', 1400);
        }
      }
    }
    playSound(action.type === 'hellCannon' ? 'hellfireSound' : 'shootSound');
  }

  function addPlant(row, col, type) {
    const config = PLANT_CONFIG.plants[type];
    const { wrapper } = createEntityShell(type, 'plant', config.width, config.height, config.image, config.name);
    const hpTag = createStatTag('hp-tag', `${config.maxHp || config.hp} HP`);
    const manaBar = document.createElement('div');
    manaBar.className = 'mana-bar';
    const manaFill = document.createElement('div');
    manaFill.className = 'mana-fill';
    manaBar.appendChild(manaFill);

    wrapper.appendChild(hpTag);
    wrapper.appendChild(manaBar);

    const plant = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${type}-${Date.now()}-${Math.random()}`,
      type,
      config,
      r: row,
      c: col,
      x: col,
      hp: config.maxHp || config.hp,
      maxHp: config.maxHp || config.hp,
      mana: 0,
      nextActionAt: performance.now() + (config.action?.delay || config.action?.interval || 0),
      lastTick: performance.now(),
      lastGlobalHealAt: performance.now(),
      el: wrapper,
      hpTag,
      manaFill,
      imgEl: wrapper.querySelector('img'),
      removed: false,
      purchaseCost: type === 'cay19' ? state.cay19CurrentCost : config.cost,
      shotsFired: 0,
    };

    if (type === 'cay24') {
      plant.mana = 100;
    }
    if (type === 'cay26') {
      plant.hitShieldRemaining = config.action?.hitShieldCount || 10;
      plant.hp = plant.hitShieldRemaining;
      plant.maxHp = plant.hitShieldRemaining;
      plant.nextSummonAt = performance.now() + (config.action?.summonInterval || 10000);
      plant.nextArrowAt = performance.now() + (config.action?.arrowInterval || 5000);
    }

    const pos = cellToPixel(row, col);
    wrapper.style.left = `${pos.x}px`;
    wrapper.style.top = `${pos.y}px`;
    dom.game.appendChild(wrapper);
    state.plants.push(plant);
    updatePlantVisuals(plant);

    return plant;
  }

  function explodePlant(plant) {
    const action = plant.config.action;
    const victims = getZombiesInRadius(plant.r, plant.c, action.range || 1.5).filter((zombie) => !zombie.config.immuneToExplosion);
    victims.forEach((zombie) => {
      zombie.hp -= action.damage;
      updateZombieVisuals(zombie);
    });
    const pos = cellToPixel(plant.r, plant.c);
    spawnEffect('boom', pos.x, pos.y, 700);
    playSound('boomSound');
    removePlant(plant);
  }

  function fuseCherryIntoHypnoFungus(targetPlant) {
    const row = targetPlant.r;
    const col = targetPlant.c;
    const victims = getZombiesInRadius(row, col, 1.5).filter((zombie) => !zombie.config.immuneToExplosion);
    victims.forEach((zombie) => {
      zombie.hp -= 300;
      updateZombieVisuals(zombie);
    });
    const pos = cellToPixel(row, col);
    spawnEffect('boom', pos.x, pos.y, 760);
    playSound('boomSound');
    removePlant(targetPlant);
    addPlant(row, col, 'cay26');
    setBanner('Dung hợp đặc biệt thành công: Nấm Thiên Thần!', 'win', 2200);
  }

  function placeSelectedPlant(row, col) {
    if (!state.running || state.paused || !state.selectedPlant) return;
    const existing = findPlantAt(row, col);

    if (state.selectedPlant === 'shovel') {
      if (existing) {
        addSun(Math.floor((existing.purchaseCost || existing.config.cost || 0) * 0.5));
        removePlant(existing);
      }
      return;
    }

    const config = PLANT_CONFIG.plants[state.selectedPlant];
    if (!config) return;

    if (existing) {
      if (state.selectedPlant === 'cherry' && existing.type === 'cay25') {
        if (!spendSun(config.cost)) {
          setBanner('Không đủ mặt trời.', 'danger');
          return;
        }
        fuseCherryIntoHypnoFungus(existing);
      }
      return;
    }

    if (config.limitPerRow && countPlantsOfTypeInRow(row, state.selectedPlant) >= config.limitPerRow) {
      setBanner(`Mỗi hàng chỉ được đặt tối đa ${config.limitPerRow} ${config.name}.`, 'danger');
      return;
    }

    const cost = state.selectedPlant === 'cay19' ? state.cay19CurrentCost : config.cost;
    if (!spendSun(cost)) {
      setBanner('Không đủ mặt trời.', 'danger');
      return;
    }

    addPlant(row, col, state.selectedPlant);
    if (state.selectedPlant === 'cay19') {
      state.cay19PurchaseCount += 1;
      state.cay19CurrentCost += 3000;
      updateShopAvailability();
    }
  }

  function determineSmartZombieRow() {
    let bestRow = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let r = 0; r < state.rows; r += 1) {
      const lanePlants = getPlantsInLane(r);
      const score = lanePlants.reduce((sum, plant) => sum + plant.hp + plant.c * 35, 0);
      if (score < bestScore) {
        bestScore = score;
        bestRow = r;
      }
    }
    return bestRow;
  }


function spawnZombieByType(type, forcedRow = null, options = {}) {
  const config = ZOMBIE_CONFIG.zombies[type];
  if (!config) return null;

  const difficulty = getCurrentDifficulty();
  const team = options.team === 'ally' ? 'ally' : 'enemy';
  const row = forcedRow ?? (type === 'smart' && team !== 'ally' ? determineSmartZombieRow() : Math.floor(Math.random() * state.rows));
  const size = type === 'purple' ? 100 : type === 'thayma8' ? 110 : type === 'thayma6' ? 100 : type === 'big' ? 88 : 78;
  const image = options.image || `${type}.png`;
  const { wrapper } = createEntityShell(type, 'zombie', size, size, image, config.name);
  const rawHp = options.hpOverride ?? config.baseHp + (type === 'red' && team !== 'ally' ? (config.hpBonusPerKill || 0) * Math.min(state.redKills, 10) : 0);
  const hp = team === 'enemy' ? Math.ceil(rawHp * (difficulty.zombieHpMultiplier || 1)) : rawHp;
  const hpTag = createStatTag('hp-tag', `${Math.ceil(hp)} HP`);
  wrapper.appendChild(hpTag);

  const zombie = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${type}-${Date.now()}-${Math.random()}`,
    type,
    config,
    team,
    damageMultiplier: options.damageMultiplier ?? 1,
    r: row,
    x: options.x ?? (team === 'ally' ? 0.2 : state.cols - 0.25),
    hp,
    el: wrapper,
    hpTag,
    baseSpeed: config.speed * (team === 'enemy' ? (difficulty.zombieSpeedMultiplier || 1) : 1),
    lastAttackAt: 0,
    lastShotAt: 0,
    lastSpecialAt: 0,
    permanentSlow: 0,
    tempSlowFactor: 1,
    tempSlowUntil: 0,
    removed: false,
  };

  if (team === 'ally') wrapper.classList.add('allied', 'hypnotized');

  const pos = cellToPixel(row, zombie.x);
  wrapper.style.left = `${pos.x}px`;
  wrapper.style.top = `${pos.y}px`;
  dom.game.appendChild(wrapper);
  state.zombies.push(zombie);

  if (type === 'thayma8' && team !== 'ally') {
    state.baronAlive += 1;
    if (config.spawnOnAppearance) spawnZombieByType('thayma7', row, { hpOverride: config.spawnedThayma7Hp || 300000 });
  }

  return zombie;
}

function createSpawners() {
    const every = (type, startSec, intervalSec, rowResolver = null) => ({
      type,
      nextAt: startSec * 1000,
      interval: intervalSec * 1000,
      rowResolver,
      condition: () => true,
    });

    state.spawners = [
      every('normal', 2, 3),
      every('red', 35, 12),
      every('big', 65, 16),
      every('smart', 12, 15, () => determineSmartZombieRow()),
      every('thayma2', 45, 60),
      every('thayma3', 60, 80),
      every('thayma4', 90, 90),
      every('thayma5', 120, 120),
      every('thayma6', 600, 999999),
      every('thayma7', 600, 180),
      { type: 'thayma8', nextAt: 180000, interval: 420000, rowResolver: null, condition: () => true },
      every('thayma9', 300, 120),
      every('thayma10', 600, 180),
    ];
  }

  function updateSpawners(now) {
    const elapsed = elapsedMs();
    state.spawners.forEach((spawner) => {
      if (elapsed < spawner.nextAt) return;
      if (spawner.condition && !spawner.condition()) {
        spawner.nextAt = elapsed + 1000;
        return;
      }
      spawnZombieByType(spawner.type, spawner.rowResolver ? spawner.rowResolver() : null);
      spawner.nextAt = elapsed + spawner.interval;
    });
  }

  function canZombieShoot(zombie) {
    return state.plants.some((plant) => plant.r === zombie.r && plant.c < zombie.x + 2);
  }

  function zombieAttackInterval(zombie) {
    let interval = zombie.config.attackInterval || GAME_SETTINGS.attackInterval;
    if (zombie.type === 'thayma7' && state.baronAlive > 0) interval *= 0.5;
    return interval;
  }

  function zombieSpeed(zombie) {
    let speed = zombie.baseSpeed;
    if (isEnemyZombie(zombie) && zombie.type === 'thayma7' && state.baronAlive > 0) {
      speed *= 1 + (ZOMBIE_CONFIG.zombies.thayma8.buffSpeedAmount || 0);
      zombie.el.classList.add('buffed');
    } else {
      zombie.el.classList.remove('buffed');
    }
    if (zombie.tempSlowUntil && zombie.tempSlowUntil < performance.now()) {
      zombie.tempSlowUntil = 0;
      zombie.tempSlowFactor = 1;
      zombie.el.classList.remove('slowed', 'extreme-slow');
    }
    return Math.max(0.01, speed * (1 - (zombie.permanentSlow || 0)) * (zombie.tempSlowFactor || 1));
  }

  function enemyShoot(zombie) {
    if (!canZombieShoot(zombie)) return;
    spawnLinearProjectile({
      team: 'enemy',
      row: zombie.r,
      x: zombie.x - 0.1,
      power: zombie.config.shootDamage || zombie.config.rangedDamage || 20,
      style: 'enemy',
      speed: GAME_SETTINGS.enemyProjectileSpeed,
      sourceType: zombie.type,
      sourceZombieId: zombie.id,
    });
  }


function handleZombieCombat(zombie, dt) {
  const now = performance.now();

  if (isAllyZombie(zombie)) {
    const frontEnemy = getFrontEnemyZombie(zombie);
    if (frontEnemy && Math.abs(frontEnemy.x - zombie.x) < 0.48) {
      if ((zombie.config.canAttack !== false) && now - zombie.lastAttackAt >= zombieAttackInterval(zombie)) {
        damageZombie(frontEnemy, (zombie.config.attackDamage || 0) * (zombie.damageMultiplier || 1), zombie);
        zombie.lastAttackAt = now;
      }
      return;
    }
    zombie.x += zombieSpeed(zombie) * dt;
    updateZombieVisuals(zombie);
    return;
  }

  const frontPlant = getFrontPlant(zombie);
  const frontAllyZombie = getFrontAllyZombie(zombie);

  if (zombie.config.passThroughPlants) {
    zombie.x -= zombieSpeed(zombie) * dt;
    updateZombieVisuals(zombie);
    return;
  }

  if (zombie.config.stopsAtDistance && frontPlant) {
    const dist = zombie.x - frontPlant.c;
    if (dist <= zombie.config.stopsAtDistance + 0.2) {
      if (zombie.config.rangedAttack && now - zombie.lastShotAt >= (zombie.config.rangedInterval || 5000)) {
        enemyShoot(zombie);
        zombie.lastShotAt = now;
      }
      return;
    }
  }

  if (frontAllyZombie && Math.abs(zombie.x - frontAllyZombie.x) < 0.48) {
    if (zombie.config.canAttack !== false && now - zombie.lastAttackAt >= zombieAttackInterval(zombie)) {
      damageZombie(frontAllyZombie, zombie.config.attackDamage || 0, zombie);
      zombie.lastAttackAt = now;
    }
    if (zombie.config.canShoot && now - zombie.lastShotAt >= (zombie.config.shootInterval || 800)) {
      enemyShoot(zombie);
      zombie.lastShotAt = now;
    }
    return;
  }

  if (frontPlant && Math.abs(zombie.x - frontPlant.c) < 0.48) {
    if (zombie.config.canAttack !== false && now - zombie.lastAttackAt >= zombieAttackInterval(zombie)) {
      damagePlant(frontPlant, zombie.config.attackDamage || 0, zombie);
      zombie.lastAttackAt = now;
    }
    if (zombie.config.canShoot && now - zombie.lastShotAt >= (zombie.config.shootInterval || 800)) {
      enemyShoot(zombie);
      zombie.lastShotAt = now;
    }
    return;
  }

  if (zombie.config.stopsAtPlant && frontPlant && (zombie.x - frontPlant.c) < 0.65) return;

  if (zombie.config.canShoot && canZombieShoot(zombie) && now - zombie.lastShotAt >= (zombie.config.shootInterval || 800)) {
    enemyShoot(zombie);
    zombie.lastShotAt = now;
  }

  zombie.x -= zombieSpeed(zombie) * dt;
  updateZombieVisuals(zombie);
}

function updatePlants(now, dt) {
    state.plants.forEach((plant) => {
      if (plant.removed) return;
      const action = plant.config.action || { type: 'none' };

      if (plant.type === 'cay13') {
        healPlant(plant, action.healPerSecond * dt);
      }

      if (plant.type === 'cay16') {
        if (!plant.nextGlobalHealAt) plant.nextGlobalHealAt = now + 1000;
        if (now >= plant.nextGlobalHealAt) {
          state.plants.forEach((ally) => healPlant(ally, action.healPerSecond));
          plant.nextGlobalHealAt = now + 1000;
        }
      }

      if (plant.type === 'cay19') {
        if (!plant.nextSunBurstAt) plant.nextSunBurstAt = now + 4000;
        if (now >= plant.nextSunBurstAt) {
          addSun(action.sunPerMana || 300);
          plant.nextSunBurstAt = now + 4000;
        }
      }

      if (plant.type === 'cay22') {
        if (!plant.nextManaTickAt) plant.nextManaTickAt = now + 1000;
        while (!plant.removed && now >= plant.nextManaTickAt) {
          plant.mana = clamp((plant.mana || 0) + 1, 0, 100);
          plant.nextManaTickAt += 1000;
          updatePlantVisuals(plant);
          if (plant.mana >= 100) {
            evolvePlantInPlace(plant, 'cay24');
            return;
          }
        }
      }

      if (plant.type === 'cay26') {
        if (!plant.nextSummonAt) plant.nextSummonAt = now + (action.summonInterval || 10000);
        if (now >= plant.nextSummonAt) {
          spawnZombieByType(action.summonType || 'thayma5', plant.r, {
            team: 'ally',
            x: plant.c + 0.35,
            damageMultiplier: action.summonDamageMultiplier || 0.1,
            hpOverride: Math.max(1, Math.ceil((ZOMBIE_CONFIG.zombies[action.summonType || 'thayma5']?.baseHp || 100) * (action.summonHpMultiplier || 0.05)))
          });
          plant.nextSummonAt = now + (action.summonInterval || 10000);
          const pos = cellToPixel(plant.r, plant.c + 0.3);
          spawnEffect('heal', pos.x, pos.y, 520);
        }
        if (!plant.nextArrowAt) plant.nextArrowAt = now + (action.arrowInterval || 5000);
        if (now >= plant.nextArrowAt) {
          const targets = state.zombies.filter((zombie) => isEnemyZombie(zombie) && zombie.r === plant.r && zombie.x > plant.c);
          if (targets.length) {
            spawnLinearProjectile({ team: 'ally', row: plant.r, x: plant.c + 0.2, power: action.arrowDamage || 500, style: 'angel', speed: 10, pierce: true });
            playSound('shootSound');
          }
          plant.nextArrowAt = now + (action.arrowInterval || 5000);
        }
      }

      if (action.type === 'sunProducer' && now >= plant.nextActionAt) {
        addSun(action.amount);
        if (plant.type === 'cay22') {
          triggerPlantAnimation(plant, plant.config.blinkImage || plant.config.image, 220);
        }
        plant.nextActionAt = now + action.interval;
      }

      if ((action.type === 'shooter' || action.type === 'hellCannon' || action.type === 'fusionShooter') && now >= plant.nextActionAt) {
        shooterTryAttack(plant, action.type === 'hellCannon' ? { ...action, type: 'shooter' } : action);
        plant.nextActionAt = now + action.interval;
      }

      if (action.type === 'dragonGarlic' && now >= plant.nextActionAt) {
        dragonGarlicTryAttack(plant, action);
        plant.nextActionAt = now + action.interval;
      }

      if (action.type === 'dragonBreath' && now >= plant.nextActionAt) {
        dragonBreathTryAttack(plant, action);
        plant.nextActionAt = now + action.interval;
      }

      if (action.type === 'evolvedSunProducer' && now >= plant.nextActionAt) {
        addSun(action.amount || 25);
        plant.nextActionAt = now + action.interval;
      }

      if (action.type === 'exploder' && now >= plant.nextActionAt) {
        explodePlant(plant);
      }

      if (action.type === 'areaHealer' && now >= plant.nextActionAt) {
        getZombiesInRadius(plant.r, plant.c, action.range).forEach((zombie) => {
          zombie.hp -= action.damage;
          updateZombieVisuals(zombie);
        });
        const pos = cellToPixel(plant.r, plant.c);
        spawnEffect('flash', pos.x, pos.y, 450);
        plant.nextActionAt = now + action.interval;
      }

      if (action.type === 'garlic' && now >= plant.nextActionAt) {
        shooterTryAttack(plant, action);
        plant.nextActionAt = now + action.interval;
      }

      if (action.type === 'thrower' && now >= plant.nextActionAt) {
        spawnThrowProjectile(plant);
        plant.nextActionAt = now + action.interval;
      }

      updatePlantVisuals(plant);
    });
  }


function updateLinearProjectile(projectile, dt) {
  projectile.x += (projectile.team === 'enemy' ? -1 : 1) * projectile.speed * dt;
  const pos = cellToPixel(projectile.row, projectile.x);
  projectile.el.style.left = `${pos.x}px`;
  projectile.el.style.top = `${pos.y}px`;

  if (projectile.team === 'ally') {
    const targets = state.zombies.filter((zombie) => isEnemyZombie(zombie) && zombie.r === projectile.row && Math.abs(zombie.x - projectile.x) < 0.28);
    if (targets.length) {
      targets.forEach((target) => {
        if (projectile.hitZombies.has(target.id)) return;
        projectile.hitZombies.add(target.id);
        const canEffectKill = !target.config.immuneToEffectKill && !isHardImmuneZombie(target);
        if (projectile.instaKillChance > 0 && canEffectKill && ((projectile.instaKillEligible || []).length === 0 || projectile.instaKillEligible.includes(target.type)) && Math.random() < projectile.instaKillChance) {
          target.instantKillSunOverride = 500;
          target.hp = 0;
          const pos2 = cellToPixel(target.r, target.x);
          spawnEffect('flash', pos2.x, pos2.y, 520);
          setBanner('Kết liễu thành công! Zombie biến thành 500 mặt trời.', 'win', 1600);
        } else {
          target.hp -= projectile.power;
        }
        if (projectile.freeze) applyTemporarySlow(target, 0.7, 2500, 'slowed');
        if (projectile.knock && !target.config.immuneToKnockback && !isHardImmuneZombie(target)) target.x += projectile.knockDistance || 0.2;
        updateZombieVisuals(target);
      });
      if (!projectile.pierce) {
        removeProjectile(projectile);
        return;
      }
    }
    if (projectile.x > state.cols + 1) removeProjectile(projectile);
    return;
  }

  const sourceZombie = projectile.sourceZombieId ? state.zombies.find((z) => z.id === projectile.sourceZombieId) : null;
  const allyZombie = state.zombies.find((ally) => isAllyZombie(ally) && ally.r === projectile.row && Math.abs(ally.x - projectile.x) < 0.28);
  if (allyZombie) {
    damageZombie(allyZombie, projectile.power, sourceZombie);
    removeProjectile(projectile);
    return;
  }

  const plant = state.plants.find((ally) => ally.r === projectile.row && Math.abs(ally.c - projectile.x) < 0.28);
  if (plant) {
    if (plant.type === 'cay11') {
      damagePlant(plant, 1, sourceZombie);
      removeProjectile(projectile);
      spawnLinearProjectile({ team: 'ally', row: plant.r, x: plant.c + 0.15, power: projectile.power, style: 'red', enhanced: true });
    } else {
      damagePlant(plant, projectile.power, sourceZombie);
      removeProjectile(projectile);
    }
    return;
  }

  if (projectile.x < -1) removeProjectile(projectile);
}

function updateArcProjectile(projectile) {
    const target = projectile.target;
    if (!target || target.removed) {
      removeProjectile(projectile);
      return;
    }

    const now = performance.now();
    const progress = clamp((now - projectile.startAt) / projectile.duration, 0, 1);
    const targetX = target.x;
    const targetRow = target.r;
    const start = cellToPixel(projectile.startY, projectile.startX);
    const end = cellToPixel(targetRow, targetX);
    const midX = (start.x + end.x) / 2;
    const lift = PLANT_CONFIG.plants.cay18.action.bullet.throwHeight || 60;

    const x = (1 - progress) * start.x + progress * end.x;
    const curve = 4 * progress * (1 - progress) * lift;
    const y = (1 - progress) * start.y + progress * end.y - curve;

    projectile.el.style.left = `${x}px`;
    projectile.el.style.top = `${y}px`;

    if (progress >= 1) {
      target.hp -= projectile.mainDamage;
      applyPermanentSlow(target, projectile.slowAmount, projectile.maxSlow);
      updateZombieVisuals(target);
      const visited = new Set([target]);
      nearestZombies(target, projectile.bounceCount, visited).forEach((nextTarget) => {
        visited.add(nextTarget);
        spawnBounceProjectile(target, nextTarget, projectile.bounceDamage, projectile.slowAmount, projectile.maxSlow, visited);
      });
      removeProjectile(projectile);
    }
  }

  function updateBounceProjectile(projectile) {
    const target = projectile.target;
    if (!target || target.removed) {
      removeProjectile(projectile);
      return;
    }

    const now = performance.now();
    const progress = clamp((now - projectile.startAt) / projectile.duration, 0, 1);
    const start = cellToPixel(projectile.startR, projectile.startX);
    const end = cellToPixel(target.r, target.x);
    const x = (1 - progress) * start.x + progress * end.x;
    const y = (1 - progress) * start.y + progress * end.y - (4 * progress * (1 - progress) * 35);
    projectile.el.style.left = `${x}px`;
    projectile.el.style.top = `${y}px`;

    if (progress >= 1) {
      target.hp -= projectile.power;
      applyPermanentSlow(target, projectile.slowAmount, projectile.maxSlow);
      updateZombieVisuals(target);
      removeProjectile(projectile);
    }
  }


  function updateBreathWaveProjectile(projectile) {
    const now = performance.now();
    if (now >= projectile.expiresAt) {
      removeProjectile(projectile);
      return;
    }

    const progress = clamp((projectile.expiresAt - now) / Math.max(1, (projectile.duration || 500)), 0, 1);
    projectile.el.style.opacity = `${0.68 + progress * 0.22}`;

    state.zombies.forEach((zombie) => {
      if (zombie.removed) return;
      if (zombie.r !== projectile.row) return;
      if (zombie.x < projectile.startCol - 0.45) return;
      if (projectile.hitZombies.has(zombie.id)) return;

      projectile.hitZombies.add(zombie.id);
      zombie.hp -= projectile.damage;
      applyTemporarySlow(zombie, projectile.slowFactor, projectile.slowDuration, 'slowed');
      if (zombie.hp <= 0) {
        zombie.finalBlowData = {
          sourcePlant: 'cay23',
          spawnType: projectile.spawnType,
          spawnChance: projectile.spawnChance,
        };
      }
      updateZombieVisuals(zombie);
      const pos = cellToPixel(zombie.r, zombie.x);
      spawnEffect('flash', pos.x, pos.y, 280);
    });
  }

  function updateProjectiles(dt) {
    state.projectiles.slice().forEach((projectile) => {
      if (projectile.removed) return;
      if (projectile.type === 'linear') updateLinearProjectile(projectile, dt);
      if (projectile.type === 'throw') updateArcProjectile(projectile);
      if (projectile.type === 'bounce') updateBounceProjectile(projectile);
      if (projectile.type === 'breathWave') updateBreathWaveProjectile(projectile);
    });
  }

  function cleanupEffects(now) {
    state.effects = state.effects.filter((effect) => {
      if (now >= effect.expiresAt) {
        effect.el.remove();
        return false;
      }
      return true;
    });
  }

  function cleanupDeadEntities() {
    state.zombies.slice().forEach((zombie) => {
      if (zombie.hp <= 0) {
        killZombie(zombie);
      } else if (isEnemyZombie(zombie) && zombie.x <= -0.2) {
        const mower = state.mowers.find((item) => item.row === zombie.r);
        if (mower && !mower.used) {
          triggerLaneMower(zombie.r);
        } else if (mower && mower.active) {
          return;
        } else {
          finishGame(false, `💀 ${zombie.config.name} đã vào nhà!`);
        }
      } else if (isAllyZombie(zombie) && zombie.x >= state.cols + 0.5) {
        removeZombie(zombie);
      }
    });

    state.plants.slice().forEach((plant) => {
      if (plant.hp <= 0) removePlant(plant);
    });
  }

  function finishGame(win, message) {
    if (!state.running) return;
    state.running = false;
    state.paused = true;
    cancelAnimationFrame(state.rafId);
    setBanner(`${message} Tổng điểm: ${state.score}`, win ? 'win' : 'danger', 4500);
    setTimeout(() => {
      alert(`${message}\nTổng điểm: ${state.score}`);
      location.reload();
    }, 120);
  }

  function frame(now) {
    if (!state.running) return;
    if (!state.lastFrameAt) state.lastFrameAt = now;
    const dt = Math.min((now - state.lastFrameAt) / 1000, GAME_SETTINGS.tickClamp);
    state.lastFrameAt = now;

    const rawElapsed = rawElapsedMs();
    const inSetupPhase = !state.timeJumpApplied && state.setupPhaseUntilMs > 0 && rawElapsed < state.setupPhaseUntilMs;

    if (!state.paused) {
      if (!state.timeJumpApplied && state.setupPhaseUntilMs > 0 && rawElapsed >= state.setupPhaseUntilMs) {
        state.elapsedOffsetMs += Math.max(0, state.timelineJumpTargetMs - state.setupPhaseUntilMs);
        state.timeJumpApplied = true;
        setBanner('😈 Hết thời gian setup. Trận đấu được tua thẳng tới phút 10!', 'danger', 4200);
      }

      if (!inSetupPhase) {
        updateSpawners(now);
        state.zombies.slice().forEach((zombie) => handleZombieCombat(zombie, dt));
      }
      updatePlants(now, dt);
      updateProjectiles(dt);
      updateMowers(dt);
      cleanupDeadEntities();
      cleanupEffects(now);
    }

    updateHUD();
    state.rafId = requestAnimationFrame(frame);
  }

  function resetStateForNewRun() {
    const difficulty = getCurrentDifficulty();
    state.activeDifficultyKey = difficulty.key || 'day';
    state.sun = difficulty.startingSun ?? GAME_SETTINGS.startingSun;
    state.score = 0;
    state.selectedPlant = null;
    state.redKills = 0;
    state.bossSpawned = false;
    state.thayma7Kills = 0;
    state.cay19Unlocked = false;
    state.cay19PurchaseCount = 0;
    state.cay19CurrentCost = PLANT_CONFIG.plants.cay19.baseCost || 0;
    state.baronAlive = 0;
    state.plants.forEach((plant) => plant.el.remove());
    state.zombies.forEach((zombie) => zombie.el.remove());
    state.projectiles.forEach((projectile) => projectile.el.remove());
    state.effects.forEach((effect) => effect.el.remove());
    state.mowers.forEach((mower) => mower.el?.remove());
    state.plants = [];
    state.zombies = [];
    state.projectiles = [];
    state.effects = [];
    state.mowers = [];
    state.lastTimerSecond = -1;
    state.elapsedOffsetMs = 0;
    state.setupPhaseUntilMs = difficulty.setupDurationMs || 0;
    state.timelineJumpTargetMs = difficulty.timelineJumpTargetMs || 0;
    state.timeJumpApplied = state.setupPhaseUntilMs <= 0;
    applyDifficultyBodyClass(difficulty);
    createLaneMowers();
    createSpawners();
    updateHUD();
    updateShopAvailability();
  }

  function startGame() {
    resetStateForNewRun();
    const difficulty = getCurrentDifficulty();
    state.running = true;
    state.paused = false;
    state.startTime = performance.now();
    state.pauseStartedAt = 0;
    state.totalPausedMs = 0;
    state.lastFrameAt = 0;
    dom.pauseScreen.classList.add('hidden');
    dom.pauseScreen.classList.remove('visible');
    dom.pauseBtn.textContent = '⏸️ Tạm dừng';
    if (difficulty.key === 'hell') {
      setBanner('😈 Siêu ác quỷ: bạn có 2 phút để setup. Sau đó trận đấu nhảy thẳng tới phút 10!', 'danger', 4200);
    } else {
      setBanner(`Bắt đầu chế độ ${difficulty.name}. Chúc bạn giữ vững 5 hàng!`, 'info');
    }

    cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(frame);
  }

  function togglePause() {
    if (!state.running) return;
    if (state.paused) {
      state.paused = false;
      state.totalPausedMs += performance.now() - state.pauseStartedAt;
      dom.pauseBtn.textContent = '⏸️ Tạm dừng';
      dom.pauseScreen.classList.add('hidden');
      dom.pauseScreen.classList.remove('visible');
    } else {
      state.paused = true;
      state.pauseStartedAt = performance.now();
      dom.pauseBtn.textContent = '▶️ Tiếp tục';
      dom.pauseScreen.classList.remove('hidden');
      dom.pauseScreen.classList.add('visible');
    }
  }

  function handleBoardClick(event) {
    if (state.suppressNextBoardClick) {
      state.suppressNextBoardClick = false;
      return;
    }
    if (!state.running || state.paused || fusionState.dragging) return;
    const { r, c } = boardPixelToCell(event.clientX, event.clientY);
    placeSelectedPlant(r, c);
  }

  function handleGameMouseDown(event) {
    if (!state.running || state.paused) return;
    if (event.button !== 0 || !event.shiftKey) return;

    const { r, c } = boardPixelToCell(event.clientX, event.clientY);
    const plant = findPlantAt(r, c);
    if (!plant || !canStartFusionDrag(plant)) return;

    event.preventDefault();
    startFusionDrag(plant, event);
  }

  function bindEvents() {
    dom.pauseBtn.addEventListener('click', togglePause);
    dom.noSelectBtn.addEventListener('click', deselectPlant);
    dom.game.addEventListener('click', handleBoardClick);
    dom.game.addEventListener('mousedown', handleGameMouseDown);
    document.addEventListener('mousemove', (event) => {
      positionFusionGhost(event.clientX, event.clientY);
    });
    document.addEventListener('mouseup', (event) => {
      if (event.button !== 0 || !fusionState.dragging) return;
      state.suppressNextBoardClick = true;
      completeFusionAt(event.clientX, event.clientY);
    });
    document.addEventListener('contextmenu', (event) => {
      if (!fusionState.dragging) return;
      event.preventDefault();
      cancelFusionDrag();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && fusionState.dragging) cancelFusionDrag();
    });
    if (dom.chatForm) {
      dom.chatForm.addEventListener('submit', handleChatSubmit);
    }
  }

  function initialize() {
    applyDifficultyBodyClass(getCurrentDifficulty());
    renderBoardGrid();
    createLaneMowers();
    buildShop();
    bindEvents();
    updateHUD();
    updateShopAvailability();
    appendChatMessage('Hệ thống', 'Khung chat thử nghiệm đã sẵn sàng.', 'system');
  }

  initialize();

  window.PVZGame = {
    state,
    startGame,
    togglePause,
    selectPlant,
    deselectPlant,
    addPlant,
    addSun,
  };

  window.startGame = startGame;
  window.togglePause = togglePause;
  window.selectPlant = selectPlant;
  window.deselectPlant = deselectPlant;
  window.updateCay19ShopItem = updateShopAvailability;
})();
