// plant-selection.js
// Quản lý chọn cây và modal chi tiết

(() => {
  const STORAGE_KEY = 'pvz_plant_selection_v2';
  const STORAGE_TIME_KEY = 'pvz_plant_selection_time_v2';
  const STORAGE_EXPIRE_MS = 24 * 60 * 60 * 1000;
  const MAX_SELECTION = 15;
  const BASIC_SUGGESTION = ['sunflower', 'pea', 'wallnut'];

  const dom = {
    startScreen: document.getElementById('startScreen'),
    plantSelectScreen: document.getElementById('plantSelectScreen'),
    startBtn: document.getElementById('startBtn'),
    autoSelectBtn: document.getElementById('autoSelectBtn'),
    selectionGrid: document.getElementById('plantSelectionGrid'),
    selectedCount: document.getElementById('selectedCount'),
    confirmBtn: document.getElementById('confirmPlantsBtn'),
    resetPlantsBtn: document.getElementById('resetPlantsBtn'),
    modal: document.getElementById('plantDetailModal'),
    closeDetailBtn: document.getElementById('closeDetailBtn'),
    detailPlantName: document.getElementById('detailPlantName'),
    detailPlantRole: document.getElementById('detailPlantRole'),
    detailPlantImage: document.getElementById('detailPlantImage'),
    plantDetailInfo: document.getElementById('plantDetailInfo'),
  };

  function getSelectablePlants() {
    return PLANT_ORDER.filter((type) => type !== 'shovel');
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
    if (config.limitPerRow) extraLines.push(`Giới hạn: tối đa ${config.limitPerRow} cây mỗi hàng.`);
    if (type === 'cay19') extraLines.push('Mở khóa: hạ ít nhất 1 Sứ giả khe nứt trong trận.');

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
    const payload = Array.from(ensureSelectionSet()).filter((type) => type !== 'shovel');
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
      window.selectedPlants = new Set((Array.isArray(parsed) ? parsed : []).filter((type) => type !== 'shovel'));
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
      const shouldShow = type === 'shovel' || selected.has(type) || (type === 'cay19' && window.PVZGame?.state?.cay19Unlocked);
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

  function promptStartFlow() {
    const hadSaved = loadPlantSelection();
    if (hadSaved) {
      const count = ensureSelectionSet().size;
      const useSaved = confirm(`Phát hiện đội hình cũ gồm ${count} cây.\n\nNhấn OK để dùng lại.\nNhấn Cancel để chọn đội hình mới.`);
      if (useSaved) {
        ensureSelectionSet().add('shovel');
        dom.startScreen.classList.remove('visible');
        dom.startScreen.classList.add('hidden');
        updateShopWithSelectedPlants();
        window.PVZGame?.startGame();
        dom.resetPlantsBtn.classList.remove('hidden');
        return;
      }
    }

    resetSelectionSet();
    showPlantSelectionScreen();
  }

  function bindEvents() {
    dom.startBtn.addEventListener('click', promptStartFlow);
    dom.confirmBtn.addEventListener('click', confirmPlantSelection);
    dom.autoSelectBtn.addEventListener('click', () => {
      resetSelectionSet();
      applySuggestedBasicSelection();
    });
    dom.closeDetailBtn.addEventListener('click', closePlantDetail);
    dom.modal.addEventListener('click', (event) => {
      if (event.target === dom.modal) closePlantDetail();
    });
    dom.resetPlantsBtn.addEventListener('click', () => {
      if (!confirm('Bạn muốn xóa đội hình đã lưu và chọn lại từ đầu?')) return;
      clearSavedPlantSelection();
      location.reload();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dom.modal.classList.contains('visible')) closePlantDetail();
    });
  }

  bindEvents();

  window.showPlantSelectionScreen = showPlantSelectionScreen;
  window.showPlantDetail = showPlantDetail;
  window.closePlantDetail = closePlantDetail;
  window.updateShopWithSelectedPlants = updateShopWithSelectedPlants;
  window.loadPlantSelection = loadPlantSelection;
  window.savePlantSelection = savePlantSelection;
  window.clearSavedPlantSelection = clearSavedPlantSelection;
})();
