// plant-selection.js
// Quản lý chọn cây và modal chi tiết

(() => {
  const STORAGE_KEY = 'pvz_plant_selection_v2';
  const STORAGE_TIME_KEY = 'pvz_plant_selection_time_v2';
  const STORAGE_EXPIRE_MS = 24 * 60 * 60 * 1000;
  const MAX_SELECTION = 15;
  const BASIC_SUGGESTION = ['sunflower', 'pea', 'wallnut'];
  const DIFFICULTY_PRESETS = {
    day: {
      key: 'day',
      name: 'Ban ngày',
      description: 'Mặc định',
      startingSun: GAME_SETTINGS.startingSun,
      zombieHpMultiplier: 1,
      zombieSpeedMultiplier: 1,
      setupDurationMs: 0,
      timelineJumpTargetMs: 0,
      bodyClass: ''
    },
    night: {
      key: 'night',
      name: 'Ban đêm',
      description: 'Zombie +100% máu, +10% tốc chạy',
      startingSun: 1000,
      zombieHpMultiplier: 2,
      zombieSpeedMultiplier: 1.1,
      setupDurationMs: 0,
      timelineJumpTargetMs: 0,
      bodyClass: 'difficulty-night-active'
    },
    hell: {
      key: 'hell',
      name: 'Siêu ác quỷ',
      description: '7000 mặt trời, setup 2 phút rồi nhảy mốc 10:00',
      startingSun: 7000,
      zombieHpMultiplier: 1,
      zombieSpeedMultiplier: 1,
      setupDurationMs: 120000,
      timelineJumpTargetMs: 600000,
      bodyClass: 'difficulty-hell-active'
    },
    endless_night: {
      key: 'endless_night',
      name: 'Màn đêm vô tận',
      description: '10 hàng, sống sót vô hạn, miniboss dày đặc',
      startingSun: 1500,
      zombieHpMultiplier: 1,
      zombieSpeedMultiplier: 1,
      setupDurationMs: 0,
      timelineJumpTargetMs: 0,
      rows: 10,
      cols: GAME_SETTINGS.cols,
      bodyClass: 'difficulty-night-active'
    }
  };

  const dom = {
    startScreen: document.getElementById('startScreen'),
    difficultySelectScreen: document.getElementById('difficultySelectScreen'),
    plantSelectScreen: document.getElementById('plantSelectScreen'),
    startBtn: document.getElementById('startBtn'),
    showGuideBtn: document.getElementById('showGuideBtn'),
    difficultyBackBtn: document.getElementById('difficultyBackBtn'),
    difficultyButtons: Array.from(document.querySelectorAll('[data-difficulty]')),
    autoSelectBtn: document.getElementById('autoSelectBtn'),
    showFusionListBtn: document.getElementById('showFusionListBtn'),
    selectionGrid: document.getElementById('plantSelectionGrid'),
    selectedCount: document.getElementById('selectedCount'),
    confirmBtn: document.getElementById('confirmPlantsBtn'),
    resetPlantsBtn: document.getElementById('resetPlantsBtn'),
    guideModal: document.getElementById('guideModal'),
    closeGuideBtn: document.getElementById('closeGuideBtn'),
    modal: document.getElementById('plantDetailModal'),
    closeDetailBtn: document.getElementById('closeDetailBtn'),
    detailPlantName: document.getElementById('detailPlantName'),
    detailPlantRole: document.getElementById('detailPlantRole'),
    detailPlantImage: document.getElementById('detailPlantImage'),
    plantDetailInfo: document.getElementById('plantDetailInfo'),
    fusionModal: document.getElementById('fusionListModal'),
    closeFusionListBtn: document.getElementById('closeFusionListBtn'),
    fusionListContainer: document.getElementById('fusionListContainer'),
    showZombieListBtn: document.getElementById('showZombieListBtn'),
    zombieModal: document.getElementById('zombieListModal'),
    closeZombieListBtn: document.getElementById('closeZombieListBtn'),
    zombieListContainer: document.getElementById('zombieListContainer'),
  };


  function setSelectedDifficulty(key) {
    const preset = DIFFICULTY_PRESETS[key] || DIFFICULTY_PRESETS.day;
    window.PVZDifficulty = { ...preset };
    return window.PVZDifficulty;
  }

  function showDifficultySelectionScreen() {
    setSelectedDifficulty(window.PVZDifficulty?.key || 'day');
    dom.startScreen.classList.remove('visible');
    dom.startScreen.classList.add('hidden');
    dom.difficultySelectScreen?.classList.remove('hidden');
    dom.difficultySelectScreen?.classList.add('visible');
  }

  function hideDifficultySelectionScreen(showStartAgain = false) {
    dom.difficultySelectScreen?.classList.remove('visible');
    dom.difficultySelectScreen?.classList.add('hidden');
    if (showStartAgain) {
      dom.startScreen.classList.remove('hidden');
      dom.startScreen.classList.add('visible');
    }
  }

  function continueStartFlowAfterDifficulty() {
    const hadSaved = loadPlantSelection();
    if (hadSaved) {
      const count = ensureSelectionSet().size;
      const difficultyName = (window.PVZDifficulty?.name || 'Ban ngày');
      const useSaved = confirm(`Độ khó: ${difficultyName}\n\nPhát hiện đội hình cũ gồm ${count} cây.\n\nNhấn OK để dùng lại.\nNhấn Cancel để chọn đội hình mới.`);
      if (useSaved) {
        ensureSelectionSet().add('shovel');
        hideDifficultySelectionScreen(false);
        updateShopWithSelectedPlants();
        window.PVZGame?.startGame();
        dom.resetPlantsBtn.classList.remove('hidden');
        return;
      }
    }

    hideDifficultySelectionScreen(false);
    resetSelectionSet();
    showPlantSelectionScreen();
  }

  function getSelectablePlants() {
    return PLANT_ORDER.filter((type) => type !== 'shovel' && type !== 'cay14');
  }
  function getFusionRecipes() {
    if (Array.isArray(window.FUSION_RECIPES) && window.FUSION_RECIPES.length) {
      return window.FUSION_RECIPES;
    }

    return [{
      result: 'cay27',
      ingredients: ['sunflower', 'sunflower'],
      formulaText: 'Hướng dương + Hướng dương = Hướng Dương 2 đầu'
    }, {
      result: 'cay28',
      ingredients: ['pea2', 'pea2'],
      formulaText: 'Pea 2 đầu + Pea 2 đầu = Peashooter 6 nòng'
    }, {
      result: 'cay29',
      ingredients: ['cay28', 'cay28'],
      formulaText: 'Peashooter 6 nòng + Peashooter 6 nòng = Gatling Pea Turret'
    }, {
      result: 'cay30',
      ingredients: ['pea', 'wallnut'],
      formulaText: 'Pea + Óc chó = Óc Chó Pea'
    }, {
      result: 'cay31',
      ingredients: ['wallnut', 'cherry'],
      formulaText: 'Óc chó + Cherry = Óc Chó Lửa',
      cardHint: 'Cách tạo đặc biệt: chọn Cherry rồi trồng trực tiếp lên ô của Óc chó để dung hợp.'
    }, {
      result: 'cay32',
      ingredients: ['cay30', 'cay31'],
      formulaText: 'Óc Chó Pea + Óc Chó Lửa = Óc Chó Ăn Thịt'
    }, {
      result: 'cay33',
      ingredients: ['wallnut', 'wallnut'],
      formulaText: 'Óc chó + Óc chó = Óc Chó Cấp 2'
    }, {
      result: 'cay34',
      ingredients: ['cay28', 'pea'],
      formulaText: 'Peashooter 6 nòng + Pea = Sniper'
    }, {
      result: 'cay20',
      ingredients: ['sunflower', 'pea'],
      formulaText: 'Hướng dương + Pea → Cây dung hợp 20'
    }, {
      result: 'cay21',
      ingredients: ['cay17', 'peaice'],
      formulaText: 'Tỏi biến dị + Pea băng → Rồng Băng Tỏi'
    }, {
      result: 'cay14',
      ingredients: ['cay13', 'cay16'],
      formulaText: 'Hắc diệp thạch + Mìn hắc diệp thạch → Óc chó siêu khuyển'
    }, {
      result: 'cay22',
      ingredients: ['wallnut', 'sunflower'],
      formulaText: 'Óc chó + Hướng dương → Óc Chó Tỏa Sáng'
    }, {
      result: 'cay23',
      ingredients: ['cay21', 'cay14'],
      formulaText: 'Rồng Băng Tỏi + Óc chó siêu khuyển → Rồng Băng'
    }, {
      result: 'cay26',
      ingredients: ['cay25', 'cherry'],
      formulaText: 'Nấm Thôi niên + Cherry → Nấm Thiên Thần',
      cardHint: 'Cách tạo đặc biệt: đặt Nấm Thôi niên trên sân, rồi chọn Cherry trồng trực tiếp lên ô của Nấm để kích nổ dung hợp.'
    }];
  }

  function getSpecialPlantInfos() {
    if (Array.isArray(window.SPECIAL_PLANT_INFOS) && window.SPECIAL_PLANT_INFOS.length) {
      return window.SPECIAL_PLANT_INFOS;
    }

    return [{
      kind: 'evolution',
      source: 'cay22',
      result: 'cay24',
      formulaText: 'Óc Chó Tỏa Sáng → đủ 100 mana → Óc Chó Thăng Hoa'
    }];
  }

  function renderFusionList() {
    if (!dom.fusionListContainer) return;

    const recipes = getFusionRecipes();
    const specialInfos = getSpecialPlantInfos();
    dom.fusionListContainer.innerHTML = '';

    recipes.forEach((recipe) => {
      const resultConfig = PLANT_CONFIG.plants[recipe.result];
      if (!resultConfig) return;

      const ingredientsText = recipe.ingredients.map((type) => PLANT_CONFIG.plants[type]?.name || type).join(' + ');
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'fusion-card';
      card.innerHTML = `
        <div class="fusion-thumb">${createImageTag(resultConfig.image, resultConfig.name)}</div>
        <div class="fusion-info">
          <div class="fusion-name">${resultConfig.name}</div>
          <div class="fusion-formula">${ingredientsText} → ${resultConfig.name}</div>
          <div class="fusion-meta">${recipe.cardHint || 'Không chọn trực tiếp trong trận · Giữ Shift rồi kéo một nguyên liệu vào nguyên liệu còn lại trên sân.'}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        closeFusionListModal();
        showPlantDetail(recipe.result);
      });
      dom.fusionListContainer.appendChild(card);
    });

    specialInfos.forEach((entry) => {
      const resultConfig = PLANT_CONFIG.plants[entry.result];
      const sourceName = PLANT_CONFIG.plants[entry.source]?.name || entry.source;
      if (!resultConfig) return;

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'fusion-card evolution-card';
      card.innerHTML = `
        <div class="fusion-thumb">${createImageTag(resultConfig.image, resultConfig.name)}</div>
        <div class="fusion-info">
          <div class="fusion-name">${resultConfig.name}</div>
          <div class="fusion-formula">${entry.formulaText || `${sourceName} → ${resultConfig.name}`}</div>
          <div class="fusion-meta">Cây đặc biệt không dung hợp trực tiếp · tiến hóa từ ${sourceName} sau khi tích đủ mana.</div>
        </div>
      `;
      card.addEventListener('click', () => {
        closeFusionListModal();
        showPlantDetail(entry.result);
      });
      dom.fusionListContainer.appendChild(card);
    });
  }

  function showFusionListModal() {
    renderFusionList();
    dom.fusionModal.classList.remove('hidden');
    dom.fusionModal.classList.add('visible');
  }

  function closeFusionListModal() {
    dom.fusionModal.classList.remove('visible');
    dom.fusionModal.classList.add('hidden');
  }


  function zombieImageTag(type, name) {
    return createImageTag(`${type}.png`, name || type);
  }

  function formatZombieStat(label, value) {
    return `<div><strong>${label}:</strong> ${value}</div>`;
  }

  function collectZombieTraits(type, config) {
    const traits = [];
    if (config.canAttack === false) traits.push('Không cắn trực tiếp');
    if (config.canShoot) traits.push(`Bắn xa mỗi ${(config.shootInterval || 0) / 1000} giây`);
    if (config.rangedAttack) traits.push(`Đánh xa mỗi ${(config.rangedInterval || 0) / 1000} giây`);
    if (config.passThroughPlants) traits.push('Đi xuyên qua cây');
    if (config.stopsAtPlant) traits.push('Đứng chặn đường');
    if (config.explosionOnDeath) traits.push(`Nổ khi chết, bán kính ${config.explosionRange || 1.5} ô`);
    if (config.forceMiddleRow) traits.push('Ưu tiên hàng giữa');
    if (Number.isFinite(config.stopAfterCells)) traits.push(`Đi ${config.stopAfterCells} ô rồi dừng`);
    if (Number.isFinite(config.stopAtColFromZombieSide)) traits.push(`Dừng tại ô thứ ${config.stopAtColFromZombieSide} từ phía zombie`);
    if (config.pushPlantsAway) traits.push('Hất cây chạm phải khỏi bản đồ');
    if (config.randomRowShift) traits.push(`Đổi hàng ngẫu nhiên mỗi ${(config.rowShiftInterval || 0) / 1000}s`);
    if (config.summonType) traits.push(`Triệu hồi ${ZOMBIE_CONFIG.zombies[config.summonType]?.name || config.summonType} mỗi ${(config.summonInterval || 0) / 1000}s`);
    if (config.rearSpeedAura) traits.push(`Aura tăng ${(config.rearSpeedAura || 0) * 100}% tốc chạy cho zombie đứng sau`);
    if (Number.isFinite(config.shieldHp)) traits.push(`Có thanh máu xanh ${config.shieldHp} HP, mất trước máu chính`);
    if (Number.isFinite(config.phaseTransitionDelay)) traits.push(`Mất sạch máu xanh: bất động ${(config.phaseTransitionDelay || 0) / 1000}s rồi hóa cuồng`);
    if (Number.isFinite(config.phase2Speed)) traits.push(`Giai đoạn 2: tốc chạy ${config.phase2Speed}`);
    if (Number.isFinite(config.shootRange) && !Number.isFinite(config.stopAfterCells)) traits.push(`Tầm bắn: ${config.shootRange === Infinity ? 'toàn lane' : config.shootRange + ' ô'}`);
    if (config.immuneToControl) traits.push('Miễn nhiễm khống chế');
    if (config.immuneToKnockback) traits.push('Miễn nhiễm đẩy lùi');
    if (config.immuneToExplosion) traits.push('Miễn nhiễm nổ');
    if (config.immuneToEffectKill) traits.push('Miễn hiệu ứng kết liễu');
    if (config.immuneToHypnosis) traits.push('Miễn thôi miên');
    if (config.hardImmunity) traits.push('Miễn nhiễm cứng');
    if (config.buffsThayma7) traits.push('Tăng sức mạnh cho Thây ma 7');
    if (config.spawnsThayma7OnDeath) traits.push('Khi chết gọi Thây ma 7');
    if (Number.isFinite(config.rowSpan) && config.rowSpan > 1) traits.push(`Chiếm ${config.rowSpan} hàng`);
    if (Number.isFinite(config.hitHalfWidth)) traits.push(`Hitbox ngang: ${config.hitHalfWidth}`);
    if (Number.isFinite(config.sizeMultiplier) || Number.isFinite(config.sizeMultiplierX) || Number.isFinite(config.sizeMultiplierY)) {
      const sx = config.sizeMultiplierX || config.sizeMultiplier || 1;
      const sy = config.sizeMultiplierY || config.sizeMultiplier || 1;
      traits.push(`Kích thước hiển thị: ${sx.toFixed(2)}× ngang · ${sy.toFixed(2)}× dọc`);
    }
    if (type === 'miniboss1spawn') traits.push('Bản hộ tống của Zombie tương lai');
    return traits;
  }

  function renderZombieList() {
    if (!dom.zombieListContainer) return;
    dom.zombieListContainer.innerHTML = '';

    Object.entries(ZOMBIE_CONFIG.zombies).forEach(([type, config]) => {
      const traits = collectZombieTraits(type, config);
      const stats = [
        formatZombieStat('Máu gốc', `${config.baseHp ?? 0} HP`),
        formatZombieStat('Máu xanh', Number.isFinite(config.shieldHp) ? `${config.shieldHp} HP` : 'Không có'),
        formatZombieStat('Tốc chạy', config.speed ?? 0),
        formatZombieStat('Sát thương cắn', config.canAttack === false ? 'Không có' : (config.attackDamage ?? 0)),
        formatZombieStat('Sát thương bắn', config.canShoot || config.rangedAttack ? (config.shootDamage ?? config.rangedDamage ?? 0) : 'Không có'),
        formatZombieStat('Phần thưởng mặt trời', config.sunReward ?? 0),
        formatZombieStat('Điểm thưởng', config.scoreReward ?? 0),
      ];

      const card = document.createElement('article');
      card.className = 'zombie-card';
      card.innerHTML = `
        <div class="zombie-card-head">
          <div class="zombie-card-thumb">${zombieImageTag(type, config.name)}</div>
          <div>
            <h3>${config.name || type}</h3>
            <div class="selection-meta">Mã: ${type}</div>
          </div>
        </div>
        <div class="detail-grid zombie-stats-grid">
          <div class="detail-card">${stats.slice(0, 3).join('')}</div>
          <div class="detail-card">${stats.slice(3).join('')}</div>
        </div>
        <div class="detail-card">
          <strong>Kỹ năng & chỉ số khác</strong>
          <ul class="detail-list zombie-trait-list">
            ${(traits.length ? traits : ['Không có nội tại đặc biệt.']).map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
      dom.zombieListContainer.appendChild(card);
    });
  }

  function showZombieListModal() {
    renderZombieList();
    dom.zombieModal?.classList.remove('hidden');
    dom.zombieModal?.classList.add('visible');
  }

  function closeZombieListModal() {
    dom.zombieModal?.classList.remove('visible');
    dom.zombieModal?.classList.add('hidden');
  }


  function resetSelectionSet() {
    window.selectedPlants = new Set();
  }

  function ensureSelectionSet() {
    if (!(window.selectedPlants instanceof Set)) {
      window.selectedPlants = new Set();
    }
    return window.selectedPlants;
  }

  function createImageTag(src, alt) {
    return `<img src="${src}" alt="${alt}" onerror="this.remove(); this.parentNode.innerHTML='🌿';">`;
  }

  function showPlantSelectionScreen() {
    ensureSelectionSet();
    dom.startScreen.classList.remove('visible');
    dom.startScreen.classList.add('hidden');
    dom.plantSelectScreen.classList.remove('hidden');
    dom.plantSelectScreen.classList.add('visible');
    renderSelectionCards();
    applySuggestedBasicSelection();
    updateSelectedCount();
  }

  function renderSelectionCards() {
    dom.selectionGrid.innerHTML = '';

    getSelectablePlants().forEach((type) => {
      const config = PLANT_CONFIG.plants[type];
      const card = document.createElement('article');
      card.className = 'plant-select-card';
      card.dataset.type = type;
      card.innerHTML = `
        <div class="thumb">${createImageTag(config.image, config.name)}</div>
        <div>
          <h3>${config.name}</h3>
          <div class="selection-meta">${config.role} · ${config.cost} ☀️ · ${config.maxHp || config.hp} HP</div>
          <p>${config.description}</p>
          <div class="selection-actions">
            <button type="button" class="ghost-btn toggle-btn">Chọn</button>
            <button type="button" class="ghost-btn info-btn">Chi tiết</button>
          </div>
        </div>
      `;

      card.querySelector('.toggle-btn').addEventListener('click', () => togglePlantSelection(type));
      card.querySelector('.info-btn').addEventListener('click', () => showPlantDetail(type));
      dom.selectionGrid.appendChild(card);
    });
  }

  function getActionSummary(config) {
    const action = config.action || {};
    const bullet = action.bullet || {};

    switch (action.type) {
      case 'sunProducer':
        return `Tạo ${action.amount} mặt trời mỗi ${(action.interval / 1000).toFixed(action.interval % 1000 === 0 ? 0 : 1)} giây.`;
      case 'manaSunProducer':
        return `Mỗi ${(action.manaInterval / 1000).toFixed(0)} giây nhận ${action.manaPerTick || 1} mana. Đủ ${action.manaThreshold || 100} mana sẽ tạo ${action.sunReward || 300} mặt trời rồi quay về 0 mana.`;
      case 'manaRapidShooter':
        return `${bullet.count || 1} viên / ${(action.interval / 1000).toFixed(1)} giây, ${bullet.power || 0} sát thương/viên. Mỗi viên cho ${action.manaGainPerBullet || 1} mana riêng. Đủ ${action.manaThreshold || 100} mana lần đầu sẽ giảm còn ${( (action.boostedInterval || (action.interval || 1000) / 2) / 1000).toFixed(1)} giây mỗi lượt bắn.`;
      case 'turretBurst':
        return `Mỗi ${(action.interval / 1000).toFixed(0)} giây xả ${(action.bullet?.rowCount || 3) * (action.bullet?.countPerRow || 10)} viên đạn trong cùng lane. Mỗi viên gây ${action.bullet?.power || 0} sát thương.`;
      case 'shooter':
        return `${bullet.count || 1} viên / ${(action.interval / 1000).toFixed(1)} giây, ${bullet.power || 0} sát thương/viên${bullet.freeze ? ', có làm chậm' : ''}${bullet.knock ? ', có đẩy lùi' : ''}${action.cost ? `, tốn thêm ${action.cost} mặt trời mỗi phát` : ''}.`;
      case 'exploder':
        return `Kích nổ sau ${(action.delay / 1000).toFixed(1)} giây, gây ${action.damage} sát thương trong bán kính ${action.range} ô.`;
      case 'reflector':
        return 'Phản lại đạn của địch. Mỗi lần phản đạn tiêu hao 1 máu của cây.';
      case 'enhancer':
        return `Tăng ${(Math.round((action.multiplier - 1) * 100))}% sát thương cho xạ thủ trong phạm vi ${action.radius} ô.`;
      case 'blocker':
        return `Tự hồi ${action.healPerSecond} máu mỗi giây.`;
      case 'areaHealer':
        return `Nhận giảm ${Math.round(action.damageReduction * 100)}% sát thương, phát xung ${action.damage} sát thương mỗi ${(action.interval / 1000).toFixed(1)} giây trong bán kính ${action.range} ô.`;
      case 'hellCannon':
        return `Bắn nhanh mỗi ${(action.interval / 1000).toFixed(1)} giây, ${bullet.power} sát thương, có đẩy lùi.`;
      case 'mine':
        return `Hồi ${action.healPerSecond} máu mỗi giây cho toàn đội, mỗi lần bị đánh phản kích ${action.explosionDamage} sát thương toàn sân.`;
      case 'garlic':
        return `Tấn công trong ${bullet.range} ô, mỗi phát ${bullet.power} sát thương. Khi bị đánh, ép zombie đổi hàng và làm chậm mạnh.`;
      case 'thrower':
        return `Đạn chính ${bullet.mainDamage} sát thương, nảy ${bullet.bounceCount} lần, mỗi lần ${bullet.bounceDamage} sát thương. Tích lũy làm chậm vĩnh viễn.`;
      case 'hellfireWalnut':
        return `Nhận giảm ${Math.round(action.damageReduction * 100)}% sát thương, bị đánh sẽ hồi ${action.healOnHit} máu, và tăng ${action.bulletEnhanceDamage} sát thương cho đạn đồng minh khi cây còn sống.`;
      case 'fusionShooter':
        return `Bắn 1 viên / ${(action.interval / 1000).toFixed(1)} giây, ${bullet.power || 0} sát thương/viên. Có ${(Math.round((bullet.instaKillChance || 0) * 100))}% tỉ lệ kết liễu ngay Thây ma 1-6, mỗi phát thứ 10 cho ${(action.sunPerTenShots || 100)} mặt trời.`;
      case 'dragonGarlic':
        return `Đánh gần trong chính ô đứng và 1 ô phía trước, mỗi ${(action.interval / 1000).toFixed(1)} giây gây ${action.damage || bullet.power || 0} sát thương. Mỗi đòn có ${Math.round((action.killChance || 0) * 100)}% kết liễu ngay. Khi bị cắn sẽ ép zombie đổi hàng và đóng băng ${((action.defenseEffect?.freezeDuration || 0) / 1000).toFixed(0)} giây. Khi chết phát nổ gây ${action.deathExplosionDamage || 0} sát thương quanh mình và trả lại ${action.sunOnDeath || 0} mặt trời.`;
      case 'dragonBreath':
        return `Mỗi ${(action.interval / 1000).toFixed(0)} giây phun một làn băng phủ toàn bộ các ô phía trước trong ${(action.duration / 1000).toFixed(1)} giây. Zombie chạm vào mất tối đa ${action.damage || 70} máu, bị chậm ${Math.round((1 - (action.slowFactor || 0.5)) * 100)}% trong ${((action.slowDuration || 1000) / 1000).toFixed(0)} giây, và nếu bị kết liễu có ${Math.round((action.spawnChance || 0.01) * 100)}% cơ hội mọc ra ${PLANT_CONFIG.plants[action.spawnType || 'wallnut']?.name || 'Óc chó'} ở ô vừa chết.`;
      case 'evolvedSunProducer':
        return `Mỗi ${(action.interval / 1000).toFixed(0)} giây tạo ${action.amount || 25} mặt trời. Mỗi lần bị đánh cho ${action.sunOnHit || 100} mặt trời. Khi chết sẽ lăn về phía trước gây ${action.deathRollDamage || 500} sát thương trên đường lăn.`;
      case 'hypnoFungus':
        return `Có 1 máu. Zombie nào tấn công cây này sẽ đổi phe với lượng máu hiện tại và bị giảm ${Math.round((1 - (action.convertDamageMultiplier || 0.75)) * 100)}% sát thương gây ra.`;
      case 'angelMushroom':
        return `Cứ 10 giây triệu hồi 1 ${ZOMBIE_CONFIG.zombies[action.summonType || 'thayma5']?.name || 'Thây ma 5'} phe mình với 100% sức mạnh. Mỗi 5 giây bắn 1 mũi tên xuyên mọi mục tiêu gây ${action.arrowDamage || 500} sát thương. Khi bị tấn công sẽ thôi niên kẻ đánh và chỉ bị phá hủy sau ${action.hitShieldCount || 10} lần trúng đòn.`;
      case 'tool':
        return 'Đào cây đã trồng và trả lại 50% giá gốc.';
      default:
        return 'Không có hành động chủ động.';
    }
  }

  function showPlantDetail(type) {
    const config = PLANT_CONFIG.plants[type];
    if (!config) return;

    dom.detailPlantName.textContent = config.name;
    dom.detailPlantRole.textContent = config.role || 'Vai trò chưa xác định';
    dom.detailPlantImage.innerHTML = createImageTag(config.image, config.name);

    const extraLines = [];
    if (type !== 'shovel') extraLines.push('Hồi chiêu mặc định: 3 giây sau mỗi lần trồng. Nếu cây có hồi chiêu riêng dài hơn thì sẽ dùng hồi chiêu dài hơn.');
    if (config.limitPerRow) extraLines.push(`Giới hạn: tối đa ${config.limitPerRow} cây mỗi hàng.`);
    if (type === 'cay19') extraLines.push('Mở khóa: hạ ít nhất 1 Sứ giả khe nứt trong trận.');
    if (type === 'cay27') {
      extraLines.push('Chỉ có thể tạo trên sân bằng dung hợp, không xuất hiện trong danh sách chọn cây.');
      extraLines.push('Công thức: Hướng Dương + Hướng Dương = Hướng Dương 2 đầu.');
      extraLines.push('Thao tác: giữ Shift rồi kéo 1 Hướng Dương vào Hướng Dương còn lại để dung hợp.');
      extraLines.push('Cây có 25 máu, mỗi 1 giây nhận 10 mana. Đủ 100 mana sẽ tiêu hết 100 mana và tạo 300 mặt trời rồi tích lại từ đầu.');
    }
    if (type === 'cay28') {
      extraLines.push('Chỉ có thể tạo trên sân bằng dung hợp, không xuất hiện trong danh sách chọn cây.');
      extraLines.push('Công thức: Pea 2 đầu + Pea 2 đầu = Peashooter 6 nòng.');
      extraLines.push('Thao tác: giữ Shift rồi kéo 1 Pea 2 đầu vào Pea 2 đầu còn lại để dung hợp.');
      extraLines.push('Cây có 25 máu, mỗi 1 giây bắn 4 viên đạn, mỗi viên gây 5 sát thương và cho cây 1 mana riêng.');
      extraLines.push('Khi đủ 100 mana lần đầu, riêng cây đó sẽ bắn nhanh gấp đôi vĩnh viễn. Mana không dùng chung giữa nhiều cây.');
    }
    if (type === 'cay29') {
      extraLines.push('Chỉ có thể tạo trên sân bằng dung hợp, không xuất hiện trong danh sách chọn cây.');
      extraLines.push('Công thức: cay27 + cay27 = Gatling Pea Turret (tức Hướng Dương 2 đầu + Hướng Dương 2 đầu).');
      extraLines.push('Thao tác: giữ Shift rồi kéo 1 Hướng Dương 2 đầu vào cây Hướng Dương 2 đầu còn lại để dung hợp.');
      extraLines.push('Cây có 1000 máu, cứ 10 giây xả 1 loạt đạn cực dày trong cùng lane.');
      extraLines.push('Mỗi loạt gồm 3 hàng đạn xếp sát nhau, mỗi hàng 10 viên, mỗi viên gây 20 sát thương.');
    }
    if (type === 'cay20') {
      extraLines.push('Chỉ có thể tạo trên sân bằng dung hợp, không xuất hiện trong danh sách chọn cây.');
      extraLines.push('Công thức: Hướng dương + Pea → Cây dung hợp 20.');
      extraLines.push('Thao tác: giữ Shift rồi kéo 1 nguyên liệu vào nguyên liệu còn lại để dung hợp.');
    }
    if (type === 'cay21') {
      extraLines.push('Chỉ có thể tạo trên sân bằng dung hợp, không xuất hiện trong danh sách chọn cây.');
      extraLines.push('Công thức: Tỏi biến dị + Pea băng → Rồng Băng Tỏi.');
      extraLines.push('Thao tác: giữ Shift rồi kéo 1 nguyên liệu vào nguyên liệu còn lại để dung hợp.');
      extraLines.push('Khi bắn, cây sẽ đổi tạm sang ảnh cay21a.png rồi trở lại cay21.png.');
    }
    if (type === 'cay22') {
      extraLines.push('Chỉ có thể tạo trên sân bằng dung hợp, không xuất hiện trong danh sách chọn cây.');
      extraLines.push('Công thức: Óc chó + Hướng dương → Óc Chó Tỏa Sáng.');
      extraLines.push('Thao tác: giữ Shift rồi kéo 1 nguyên liệu vào nguyên liệu còn lại để dung hợp.');
      extraLines.push('Animation: bình thường dùng ảnh cay22.png, khi hoạt động sẽ đổi tạm sang cay22a.png rồi trở lại.');
      extraLines.push('Khi chết sẽ tạo 500 mặt trời.');
      extraLines.push('Tiến hóa: cây tự nhận 1 mana mỗi giây. Đủ 100 mana sẽ tiến hóa thành Óc Chó Thăng Hoa.');
    }
    if (type === 'cay23') {
      extraLines.push('Chỉ có thể tạo trên sân bằng dung hợp, không xuất hiện trong danh sách chọn cây.');
      extraLines.push('Công thức: Rồng Băng Tỏi + Óc chó siêu khuyển → Rồng Băng.');
      extraLines.push('Thao tác: giữ Shift rồi kéo 1 nguyên liệu vào nguyên liệu còn lại để dung hợp.');
      extraLines.push('Khi tấn công, cây đổi tạm sang ảnh cay23a.png rồi trở về cay23.png.');
      extraLines.push('Làn phun dùng ảnh cay23b.png, to đúng 1 ô, phủ toàn bộ các ô phía trước trong 0.5 giây.');
      extraLines.push('Mỗi zombie chạm làn phun sẽ mất tối đa 1000 máu và bị chậm 50% trong 1 giây.');
      extraLines.push('Nếu chính đòn phun kết liễu zombie thì có 1% cơ hội mọc ra một Óc chó ở ô trống nơi zombie chết.');
    }
    if (type === 'cay24') {
      extraLines.push('Không xuất hiện trong danh sách chọn cây và cũng không dung hợp trực tiếp.');
      extraLines.push('Tiến hóa: Óc Chó Tỏa Sáng tích 1 mana mỗi giây, đủ 100 mana sẽ biến thành cay24.png.');
      extraLines.push('Sau khi tiến hóa, cây có 3000 máu, cứ mỗi 5 giây cho 25 mặt trời.');
      extraLines.push('Mỗi lần bị đánh, cây lập tức tạo 100 mặt trời cho người chơi.');
      extraLines.push('Khi chết, cây lăn thẳng về phía trước trong lane và gây 500 sát thương trên đường lăn.');
    }
    if (type === 'cay25') {
      extraLines.push('Đây là cây thường có thể mua trực tiếp với giá 100 mặt trời.');
      extraLines.push('Zombie miễn nhiễm cứng như Thây ma 6-10 sẽ không thể bị thôi niên bởi cây này.');
      extraLines.push('Có thể dùng Cherry trồng trực tiếp lên chính cây này để kích nổ dung hợp thành Nấm Thiên Thần.');
    }
    if (type === 'cay26') {
      extraLines.push('Không xuất hiện trong danh sách chọn cây, chỉ tạo bằng cách đặc biệt.');
      extraLines.push('Cách tạo: đặt Nấm Thôi niên trên sân, chọn Cherry rồi trồng trực tiếp lên ô của Nấm để nổ xung quanh gây 300 sát thương và dung hợp thành Nấm Thiên Thần.');
      extraLines.push('Cứ mỗi 10 giây cây sẽ gọi 1 Thây ma 5 phe mình với 100% sức mạnh gốc.');
      extraLines.push('Khi bị bất kỳ zombie nào tấn công, cây sẽ thôi niên kẻ đánh nếu mục tiêu không có miễn nhiễm cứng.');
      extraLines.push('Cây chỉ bị phá hủy sau đúng 10 lần trúng đòn, không chết theo lượng damage của từng hit.');
    }

    dom.plantDetailInfo.innerHTML = `
      <div class="detail-grid">
        <div class="detail-card">
          <strong>Thông số</strong>
          <div>Giá: ${config.cost} ☀️</div>
          <div>Máu: ${config.maxHp || config.hp} HP</div>
          <div>Kích thước: ${config.width} × ${config.height}px</div>
        </div>
        <div class="detail-card">
          <strong>Cơ chế chính</strong>
          <div>${getActionSummary(config)}</div>
        </div>
      </div>
      <div class="detail-card">
        <strong>Mô tả</strong>
        <div>${config.description}</div>
      </div>
      <div class="detail-card">
        <strong>Mẹo dùng</strong>
        <ul class="detail-list">
          ${(config.tips || []).map((tip) => `<li>${tip}</li>`).join('')}
          ${extraLines.map((tip) => `<li>${tip}</li>`).join('')}
        </ul>
      </div>
    `;

    dom.modal.classList.remove('hidden');
    dom.modal.classList.add('visible');
  }

  function closePlantDetail() {
    dom.modal.classList.remove('visible');
    dom.modal.classList.add('hidden');
  }

  function togglePlantSelection(type) {
    const selected = ensureSelectionSet();
    const card = dom.selectionGrid.querySelector(`[data-type="${type}"]`);

    if (selected.has(type)) {
      selected.delete(type);
    } else {
      if (selected.size >= MAX_SELECTION) {
        alert(`Bạn chỉ có thể chọn tối đa ${MAX_SELECTION} loại cây.`);
        return;
      }
      selected.add(type);
    }

    if (card) {
      card.classList.toggle('selected', selected.has(type));
      const toggleBtn = card.querySelector('.toggle-btn');
      if (toggleBtn) toggleBtn.textContent = selected.has(type) ? 'Bỏ chọn' : 'Chọn';
    }

    updateSelectedCount();
  }

  function applySuggestedBasicSelection() {
    const selected = ensureSelectionSet();
    if (selected.size > 0) {
      syncSelectionUI();
      return;
    }

    BASIC_SUGGESTION.forEach((type) => {
      if (getSelectablePlants().includes(type)) {
        selected.add(type);
      }
    });
    syncSelectionUI();
  }

  function syncSelectionUI() {
    const selected = ensureSelectionSet();
    dom.selectionGrid.querySelectorAll('.plant-select-card').forEach((card) => {
      const active = selected.has(card.dataset.type);
      card.classList.toggle('selected', active);
      const btn = card.querySelector('.toggle-btn');
      if (btn) btn.textContent = active ? 'Bỏ chọn' : 'Chọn';
    });
    updateSelectedCount();
  }

  function updateSelectedCount() {
    const selected = ensureSelectionSet();
    dom.selectedCount.textContent = `Đã chọn: ${selected.size}/${MAX_SELECTION}`;
    dom.selectedCount.style.color = selected.size >= 1 ? 'var(--good)' : 'var(--danger)';
    dom.confirmBtn.disabled = selected.size < 1 || selected.size > MAX_SELECTION;
  }

  function savePlantSelection() {
    const payload = Array.from(ensureSelectionSet()).filter((type) => type !== 'shovel' && type !== 'cay14');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(STORAGE_TIME_KEY, String(Date.now()));
  }

  function loadPlantSelection() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const savedAt = Number(localStorage.getItem(STORAGE_TIME_KEY));
    if (!raw || !savedAt || Number.isNaN(savedAt)) return false;
    if (Date.now() - savedAt > STORAGE_EXPIRE_MS) return false;

    try {
      const parsed = JSON.parse(raw);
      window.selectedPlants = new Set((Array.isArray(parsed) ? parsed : []).filter((type) => type !== 'shovel' && type !== 'cay14'));
      return window.selectedPlants.size > 0;
    } catch (error) {
      console.error('Không thể đọc dữ liệu chọn cây đã lưu:', error);
      return false;
    }
  }

  function clearSavedPlantSelection() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIME_KEY);
  }

  function updateShopWithSelectedPlants() {
    const selected = ensureSelectionSet();
    document.querySelectorAll('.shop-card[data-type]').forEach((card) => {
      const type = card.dataset.type;
      const shouldShow = type === 'shovel' || (type !== 'cay14' && selected.has(type)) || (type === 'cay19' && window.PVZGame?.state?.cay19Unlocked);
      card.classList.toggle('hidden', !shouldShow);
    });
  }

  function confirmPlantSelection() {
    const selected = ensureSelectionSet();
    if (selected.size < 1 || selected.size > MAX_SELECTION) {
      alert('Hãy chọn từ 1 đến 15 loại cây trước khi bắt đầu.');
      return;
    }

    savePlantSelection();
    selected.add('shovel');
    dom.plantSelectScreen.classList.remove('visible');
    dom.plantSelectScreen.classList.add('hidden');
    closePlantDetail();
    updateShopWithSelectedPlants();
    window.PVZGame?.startGame();
    dom.resetPlantsBtn.classList.remove('hidden');
  }

  function showGuideModal() {
    dom.guideModal?.classList.remove('hidden');
    dom.guideModal?.classList.add('visible');
  }

  function closeGuideModal() {
    dom.guideModal?.classList.remove('visible');
    dom.guideModal?.classList.add('hidden');
  }

  function promptStartFlow() {
    showDifficultySelectionScreen();
  }

  function bindEvents() {
    dom.startBtn.addEventListener('click', promptStartFlow);
    dom.showGuideBtn?.addEventListener('click', showGuideModal);
    dom.closeGuideBtn?.addEventListener('click', closeGuideModal);
    dom.guideModal?.addEventListener('click', (event) => {
      if (event.target === dom.guideModal) closeGuideModal();
    });
    dom.difficultyBackBtn?.addEventListener('click', () => hideDifficultySelectionScreen(true));
    dom.difficultyButtons?.forEach((button) => {
      button.addEventListener('click', () => {
        setSelectedDifficulty(button.dataset.difficulty || 'day');
        continueStartFlowAfterDifficulty();
      });
    });
    dom.confirmBtn.addEventListener('click', confirmPlantSelection);
    dom.autoSelectBtn.addEventListener('click', () => {
      resetSelectionSet();
      applySuggestedBasicSelection();
    });
    dom.showFusionListBtn?.addEventListener('click', showFusionListModal);
    dom.showZombieListBtn?.addEventListener('click', showZombieListModal);
    dom.closeDetailBtn.addEventListener('click', closePlantDetail);
    dom.modal.addEventListener('click', (event) => {
      if (event.target === dom.modal) closePlantDetail();
    });
    dom.closeFusionListBtn?.addEventListener('click', closeFusionListModal);
    dom.fusionModal?.addEventListener('click', (event) => {
      if (event.target === dom.fusionModal) closeFusionListModal();
    });
    dom.closeZombieListBtn?.addEventListener('click', closeZombieListModal);
    dom.zombieModal?.addEventListener('click', (event) => {
      if (event.target === dom.zombieModal) closeZombieListModal();
    });
    dom.resetPlantsBtn.addEventListener('click', () => {
      if (!confirm('Bạn muốn xóa đội hình đã lưu và chọn lại từ đầu?')) return;
      clearSavedPlantSelection();
      location.reload();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dom.modal.classList.contains('visible')) closePlantDetail();
      if (event.key === 'Escape' && dom.guideModal?.classList.contains('visible')) closeGuideModal();
      if (event.key === 'Escape' && dom.fusionModal?.classList.contains('visible')) closeFusionListModal();
      if (event.key === 'Escape' && dom.zombieModal?.classList.contains('visible')) closeZombieListModal();
      if (event.key === 'Escape' && dom.difficultySelectScreen?.classList.contains('visible')) hideDifficultySelectionScreen(true);
    });
  }

  setSelectedDifficulty('day');
  bindEvents();

  window.showGuideModal = showGuideModal;
  window.closeGuideModal = closeGuideModal;
  window.showPlantSelectionScreen = showPlantSelectionScreen;
  window.showPlantDetail = showPlantDetail;
  window.closePlantDetail = closePlantDetail;
  window.showFusionListModal = showFusionListModal;
  window.closeFusionListModal = closeFusionListModal;
  window.showZombieListModal = showZombieListModal;
  window.closeZombieListModal = closeZombieListModal;
  window.updateShopWithSelectedPlants = updateShopWithSelectedPlants;
  window.loadPlantSelection = loadPlantSelection;
  window.savePlantSelection = savePlantSelection;
  window.clearSavedPlantSelection = clearSavedPlantSelection;
  window.PVZDifficultyCatalog = DIFFICULTY_PRESETS;
})();
