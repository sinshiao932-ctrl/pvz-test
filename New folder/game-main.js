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
    selectionCursor: null,
    selectionCursorMedia: null,
    selectionCursorLabel: null,
  };

  const emojiMap = {
    sunflower: '🌻', bigsun: '🌞', pea: '🟢', peaice: '❄️', pea2: '🌱', wallnut: '🥥', cherry: '🍒', azami: '🌸',
    shovel: '🛠️', cay10: '🔴', cay11: '🪞', cay12: '✨', cay13: '🪨', cay14: '🐕', cay15: '🔥', cay16: '💣',
    cay17: '🧄', cay18: '🌈', cay19: '👹',
    normal: '🧟', red: '🟥', big: '🧌', smart: '🧠', purple: '👾', thayma2: '👻', thayma3: '🧱', thayma4: '💥',
    thayma5: '⚔️', thayma6: '☠️', thayma7: '🕳️', thayma8: '🐉', thayma9: '😈', thayma10: '👹'
  };

  function ensureSelectionCursor() {
    if (dom.selectionCursor) return dom.selectionCursor;

    const cursor = document.createElement('div');
    cursor.id = 'selectionCursor';
    cursor.className = 'selection-cursor hidden';

    const media = document.createElement('div');
    media.className = 'selection-cursor-media';

    const label = document.createElement('div');
    label.className = 'selection-cursor-label';

    cursor.appendChild(media);
    cursor.appendChild(label);
    document.body.appendChild(cursor);

    dom.selectionCursor = cursor;
    dom.selectionCursorMedia = media;
    dom.selectionCursorLabel = label;
    return cursor;
  }

  function updateSelectionCursorPosition(clientX, clientY) {
    const cursor = ensureSelectionCursor();
    cursor.style.left = `${clientX}px`;
    cursor.style.top = `${clientY}px`;
  }

  function renderSelectionCursorContent(type) {
    ensureSelectionCursor();
    const config = PLANT_CONFIG.plants[type];
    if (!config) return;

    dom.selectionCursorMedia.innerHTML = '';
    const img = document.createElement('img');
    img.src = config.image || '';
    img.alt = config.name;
    img.onerror = () => {
      img.remove();
      const fallback = document.createElement('div');
      fallback.className = 'fallback-face';
      fallback.textContent = emojiMap[type] || '🌿';
      dom.selectionCursorMedia.appendChild(fallback);
    };
    dom.selectionCursorMedia.appendChild(img);
    dom.selectionCursorLabel.textContent = config.name;
  }

  function updateSelectionCursor() {
    const cursor = ensureSelectionCursor();
    const active = state.running && !!state.selectedPlant;
    cursor.classList.toggle('hidden', !active);
    if (!active) return;
    renderSelectionCursorContent(state.selectedPlant);
  }

  function handlePointerMove(event) {
    updateSelectionCursorPosition(event.clientX, event.clientY);
  }

  function handleGlobalContextCancel(event) {
    if (!state.running || !state.selectedPlant) return;
    if (event.target.closest('#plantDetailModal, #plantSelectScreen, #startScreen')) return;

    event.preventDefault();
    event.stopPropagation();
    deselectPlant();
    setBanner('Đã hủy chọn cây.', 'info', 1200);
  }

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

  function formatTime(totalSeconds) {
    const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const sec = String(totalSeconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }

  function elapsedMs() {
    if (!state.running) return 0;
    if (state.paused) {
      return state.pauseStartedAt - state.startTime - state.totalPausedMs;
    }
    return performance.now() - state.startTime - state.totalPausedMs;
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
      const shouldShow = type === 'shovel' || window.selectedPlants.has(type) || (type === 'cay19' && state.cay19Unlocked);
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

  function selectPlant(type) {
    if (!state.running) return;
    if (type === 'cay19' && !state.cay19Unlocked) {
      setBanner('Cây 19 chưa mở khóa.', 'danger');
      return;
    }
    state.selectedPlant = type;
    updateHUD();
    updateShopAvailability();
    updateSelectionCursor();
  }

  function deselectPlant() {
    state.selectedPlant = null;
    updateHUD();
    updateShopAvailability();
    updateSelectionCursor();
  }

  function findPlantAt(row, col) {
    return state.plants.find((plant) => plant.r === row && plant.c === col) || null;
  }

  function getPlantsInRadius(row, col, radius) {
    return state.plants.filter((plant) => Math.abs(plant.r - row) <= radius && Math.abs(plant.c - col) <= radius);
  }

  function getZombiesInRadius(row, x, radius) {
    return state.zombies.filter((zombie) => Math.abs(zombie.r - row) <= radius && Math.abs(zombie.x - x) <= radius);
  }

  function hasZombieInLane(row, maxRange = Infinity) {
    return state.zombies.some((zombie) => zombie.r === row && zombie.x >= 0 && zombie.x - 0.4 <= maxRange);
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
      .filter((zombie) => zombie !== fromZombie && !exclude.has(zombie))
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
    const rows = [];
    if (zombie.r > 0) rows.push(zombie.r - 1);
    if (zombie.r < state.rows - 1) rows.push(zombie.r + 1);
    if (!rows.length) return;
    zombie.r = rows[Math.floor(Math.random() * rows.length)];
    updateZombieVisuals(zombie);
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
  }

  function damagePlant(plant, damage, zombie = null) {
    if (!plant || plant.removed) return;

    let finalDamage = damage;
    const action = plant.config.action || {};
    if (action.damageReduction) {
      finalDamage *= (1 - action.damageReduction);
    }

    plant.hp -= finalDamage;

    if (plant.type === 'cay19') {
      healPlant(plant, action.healOnHit || 0);
    }

    applyPlantDefenseTrigger(plant, zombie);
    updatePlantVisuals(plant);

    if (plant.hp <= 0) {
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

  function awardZombieDeath(zombie) {
    const config = zombie.config;
    addSun(config.sunReward || 0);
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

    updateHUD();
    playSound('dieSound');
  }

  function killZombie(zombie) {
    if (zombie.removed) return;
    awardZombieDeath(zombie);
    removeZombie(zombie);
  }

  function spawnLinearProjectile({ team, row, x, power, style, freeze = false, knock = false, knockDistance = 0.2, sourceType = 'plant', speed = null, enhanced = false }) {
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
      removed: false,
    };

    state.projectiles.push(projectile);
    return projectile;
  }

  function spawnThrowProjectile(plant) {
    const action = plant.config.action;
    const bullet = action.bullet;
    const targets = state.zombies.filter((zombie) => zombie.r === plant.r && zombie.x > plant.c).sort((a, b) => a.x - b.x);
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
    const targetExists = state.zombies.some((zombie) => zombie.r === plant.r && zombie.x > plant.c && (zombie.x - plant.c) <= maxRange);
    if (!targetExists) return;

    if (action.cost && !spendSun(action.cost)) return;

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
      });
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
      removed: false,
      purchaseCost: type === 'cay19' ? state.cay19CurrentCost : config.cost,
    };

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

    if (existing) return;

    const config = PLANT_CONFIG.plants[state.selectedPlant];
    if (!config) return;

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

    const row = forcedRow ?? (type === 'smart' ? determineSmartZombieRow() : Math.floor(Math.random() * state.rows));
    const size = type === 'purple' ? 100 : type === 'thayma8' ? 110 : type === 'thayma6' ? 100 : type === 'big' ? 88 : 78;
    const image = options.image || `${type}.png`;
    const { wrapper } = createEntityShell(type, 'zombie', size, size, image, config.name);
    const hp = options.hpOverride ?? config.baseHp + (type === 'red' ? (config.hpBonusPerKill || 0) * Math.min(state.redKills, 10) : 0);
    const hpTag = createStatTag('hp-tag', `${Math.ceil(hp)} HP`);
    wrapper.appendChild(hpTag);

    const zombie = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${type}-${Date.now()}-${Math.random()}`,
      type,
      config,
      r: row,
      x: state.cols - 0.25,
      hp,
      el: wrapper,
      hpTag,
      baseSpeed: config.speed,
      lastAttackAt: 0,
      lastShotAt: 0,
      lastSpecialAt: 0,
      permanentSlow: 0,
      tempSlowFactor: 1,
      tempSlowUntil: 0,
      removed: false,
    };

    const pos = cellToPixel(row, zombie.x);
    wrapper.style.left = `${pos.x}px`;
    wrapper.style.top = `${pos.y}px`;
    dom.game.appendChild(wrapper);
    state.zombies.push(zombie);

    if (type === 'thayma8') {
      state.baronAlive += 1;
      if (config.spawnOnAppearance) {
        spawnZombieByType('thayma7', row, { hpOverride: config.spawnedThayma7Hp || 300000 });
      }
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
    if (zombie.type === 'thayma7' && state.baronAlive > 0) {
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
    });
  }

  function handleZombieCombat(zombie, dt) {
    const frontPlant = getFrontPlant(zombie);
    const now = performance.now();

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

    if (frontPlant && Math.abs(zombie.x - frontPlant.c) < 0.48) {
      if (zombie.config.canAttack !== false) {
        if (now - zombie.lastAttackAt >= zombieAttackInterval(zombie)) {
          damagePlant(frontPlant, zombie.config.attackDamage || 0, zombie);
          zombie.lastAttackAt = now;
        }
      }
      if (zombie.config.canShoot && now - zombie.lastShotAt >= (zombie.config.shootInterval || 800)) {
        enemyShoot(zombie);
        zombie.lastShotAt = now;
      }
      return;
    }

    if (zombie.config.stopsAtPlant && frontPlant && (zombie.x - frontPlant.c) < 0.65) {
      return;
    }

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

      if (action.type === 'sunProducer' && now >= plant.nextActionAt) {
        addSun(action.amount);
        plant.nextActionAt = now + action.interval;
      }

      if ((action.type === 'shooter' || action.type === 'hellCannon') && now >= plant.nextActionAt) {
        shooterTryAttack(plant, action.type === 'hellCannon' ? { ...action, type: 'shooter' } : action);
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
      const target = state.zombies.find((zombie) => zombie.r === projectile.row && Math.abs(zombie.x - projectile.x) < 0.28);
      if (target) {
        target.hp -= projectile.power;
        if (projectile.freeze) applyTemporarySlow(target, 0.7, 2500, 'slowed');
        if (projectile.knock && !target.config.immuneToKnockback) target.x += projectile.knockDistance || 0.2;
        updateZombieVisuals(target);
        removeProjectile(projectile);
        return;
      }
      if (projectile.x > state.cols + 1) removeProjectile(projectile);
      return;
    }

    const plant = state.plants.find((ally) => ally.r === projectile.row && Math.abs(ally.c - projectile.x) < 0.28);
    if (plant) {
      if (plant.type === 'cay11') {
        damagePlant(plant, 1);
        removeProjectile(projectile);
        spawnLinearProjectile({
          team: 'ally', row: plant.r, x: plant.c + 0.15, power: projectile.power, style: 'red', enhanced: true,
        });
      } else {
        damagePlant(plant, projectile.power);
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

  function updateProjectiles(dt) {
    state.projectiles.slice().forEach((projectile) => {
      if (projectile.removed) return;
      if (projectile.type === 'linear') updateLinearProjectile(projectile, dt);
      if (projectile.type === 'throw') updateArcProjectile(projectile);
      if (projectile.type === 'bounce') updateBounceProjectile(projectile);
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
      if (zombie.hp <= 0) killZombie(zombie);
      else if (zombie.x <= -0.2) finishGame(false, `💀 ${zombie.config.name} đã vào nhà!`);
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

    if (!state.paused) {
      updateSpawners(now);
      updatePlants(now, dt);
      state.zombies.slice().forEach((zombie) => handleZombieCombat(zombie, dt));
      updateProjectiles(dt);
      cleanupDeadEntities();
      cleanupEffects(now);
    }

    updateHUD();
    state.rafId = requestAnimationFrame(frame);
  }

  function resetStateForNewRun() {
    state.sun = GAME_SETTINGS.startingSun;
    state.score = 0;
    state.selectedPlant = null;
    updateSelectionCursor();
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
    state.plants = [];
    state.zombies = [];
    state.projectiles = [];
    state.effects = [];
    state.lastTimerSecond = -1;
    createSpawners();
    updateHUD();
    updateShopAvailability();
  }

  function startGame() {
    resetStateForNewRun();
    state.running = true;
    state.paused = false;
    state.startTime = performance.now();
    state.pauseStartedAt = 0;
    state.totalPausedMs = 0;
    state.lastFrameAt = 0;
    dom.pauseScreen.classList.add('hidden');
    updateSelectionCursor();
    dom.pauseScreen.classList.remove('visible');
    dom.pauseBtn.textContent = '⏸️ Tạm dừng';
    setBanner('Trận đấu bắt đầu. Chúc bạn giữ vững 5 hàng!', 'info');

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
    updateSelectionCursor();
  }

  function handleBoardClick(event) {
    if (!state.running || state.paused) return;
    const { r, c } = boardPixelToCell(event.clientX, event.clientY);
    placeSelectedPlant(r, c);
  }

  function bindEvents() {
    dom.pauseBtn.addEventListener('click', togglePause);
    dom.noSelectBtn.addEventListener('click', deselectPlant);
    dom.game.addEventListener('click', handleBoardClick);
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('contextmenu', handleGlobalContextCancel, true);
  }

  function initialize() {
    renderBoardGrid();
    buildShop();
    ensureSelectionCursor();
    bindEvents();
    updateHUD();
    updateShopAvailability();
    updateSelectionCursor();
  }

  initialize();

  window.PVZGame = {
    state,
    startGame,
    togglePause,
    selectPlant,
    deselectPlant,
    addPlant,
  };

  window.startGame = startGame;
  window.togglePause = togglePause;
  window.selectPlant = selectPlant;
  window.deselectPlant = deselectPlant;
  window.updateCay19ShopItem = updateShopAvailability;
})();
