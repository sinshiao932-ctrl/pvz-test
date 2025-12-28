// plant-selection.js
// Quản lý việc chọn cây trước khi bắt đầu game

// Biến lưu cây đã chọn (đã khai báo trong index.html)
// let selectedPlants = new Set(); - Đã khai báo trong index.html
let availablePlants = [];

// Hàm hiển thị màn hình chọn cây
function showPlantSelectionScreen() {
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("plantSelectScreen").style.display = "flex";
  
  // Xóa danh sách cây cũ
  document.getElementById("plantSelectionGrid").innerHTML = "";
  
  // Lấy danh sách cây khả dụng (trừ shovel)
  availablePlants = Object.keys(PLANT_CONFIG.plants).filter(type => type !== "shovel");
  
  // Tạo danh sách cây để chọn
  availablePlants.forEach(type => {
    const config = PLANT_CONFIG.plants[type];
    const plantItem = document.createElement("div");
    plantItem.className = "plant-select-item";
    plantItem.dataset.type = type;
    plantItem.title = `Click đơn để chọn, Double click để xem chi tiết`;
    
    // Xử lý click
    plantItem.onclick = (e) => {
      const now = Date.now();
      const lastClick = plantItem.dataset.lastClick || 0;
      
      // Nếu click trong vòng 300ms sau click trước đó => double click
      if (now - lastClick < 300) {
        // Double click: hiển thị chi tiết
        e.preventDefault();
        e.stopPropagation();
        plantItem.classList.add("double-clicked");
        setTimeout(() => {
          plantItem.classList.remove("double-clicked");
        }, 500);
        showPlantDetail(type);
      } else {
        // Single click: chọn/bỏ chọn cây
        togglePlantSelection(type);
      }
      
      plantItem.dataset.lastClick = now;
    };
    
    // Tạo nội dung cây
    plantItem.innerHTML = `
      <img src="${config.image}" alt="${config.name}" onerror="this.src='https://via.placeholder.com/60x60?text=Cây'" />
      <div class="plant-select-info">
        <div class="plant-name">${config.name}</div>
        <div class="plant-cost">Giá: ${config.cost} ☀️</div>
        <div class="plant-hp">Máu: ${config.hp} ❤️</div>
      </div>
      <div class="plant-detail-hint">Double click để xem chi tiết</div>
    `;
    
    document.getElementById("plantSelectionGrid").appendChild(plantItem);
  });
  
  // Reset danh sách đã chọn
  selectedPlants.clear();
  
  // Tự động chọn một số cây cơ bản để giúp người chơi
  autoSelectBasicPlants();
  
  updateSelectedCount();
  
  // Thiết lập sự kiện cho nút xác nhận
  document.getElementById("confirmPlantsBtn").onclick = confirmPlantSelection;
  
  // Thiết lập sự kiện cho nút đóng modal
  document.getElementById("closeDetailBtn").onclick = closePlantDetail;
  
  // Đóng modal khi click ra ngoài
  document.getElementById("plantDetailModal").onclick = function(e) {
    if (e.target === this) {
      closePlantDetail();
    }
  };
}

// Hàm hiển thị chi tiết cây
function showPlantDetail(plantType) {
  const config = PLANT_CONFIG.plants[plantType];
  if (!config) return;
  
  // Cập nhật thông tin modal
  document.getElementById("detailPlantName").textContent = config.name;
  
  const detailImage = document.getElementById("detailPlantImage");
  detailImage.innerHTML = '';
  
  const img = document.createElement("img");
  img.src = config.image;
  img.alt = config.name;
  img.onerror = function() {
    this.src = 'https://via.placeholder.com/140x140?text=Cây';
    this.classList.remove('loading');
  };
  img.onload = function() {
    this.classList.remove('loading');
  };
  img.classList.add('loading');
  detailImage.appendChild(img);
  
  // Tạo thông tin chi tiết
  let detailHTML = `
    <div class="detail-item">
      <span class="detail-label">Tên cây:</span>
      <span class="detail-value">${config.name}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Giá mặt trời:</span>
      <span class="detail-value">${config.cost} ☀️</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Máu (HP):</span>
      <span class="detail-value">${config.hp} ❤️</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Kích thước:</span>
      <span class="detail-value">${config.width}×${config.height}px</span>
    </div>
  `;
  
  // Thêm thông tin kỹ năng nếu có
  if (config.action && config.action.type !== "none" && config.action.type !== "tool") {
    detailHTML += `<div class="detail-item"><span class="detail-label">Loại kỹ năng:</span><span class="detail-value">${getActionTypeName(config.action.type)}</span></div>`;
    
    const skillDetails = getSkillDetails(config.action);
    if (skillDetails) {
      detailHTML += `<div class="detail-item"><span class="detail-label">Chi tiết kỹ năng:</span><span class="detail-value">${skillDetails}</span></div>`;
    }
  }
  
  // Thêm mô tả
  detailHTML += `
    <div class="detail-description">
      <span class="detail-label">Mô tả chi tiết:</span>
      <p>${config.description || "Cây phòng thủ cơ bản."}</p>
    </div>
  `;
  
  // Thêm ghi chú đặc biệt
  if (config.limitPerRow) {
    detailHTML += `<div class="detail-item"><span class="detail-label">Giới hạn:</span><span class="detail-value">Tối đa ${config.limitPerRow} cây/hàng</span></div>`;
  }
  
  if (plantType === 'cay19') {
    detailHTML += `<div class="detail-item"><span class="detail-label">Điều kiện mở khóa:</span><span class="detail-value">Tiêu diệt 1 Sứ giả khe nứt</span></div>`;
  }
  
  document.getElementById("plantDetailInfo").innerHTML = detailHTML;
  
  // Hiển thị modal
  document.getElementById("plantDetailModal").style.display = "flex";
  
  // Đảm bảo modal ở trên cùng
  document.getElementById("plantDetailModal").style.zIndex = "10000";
}

// Hàm lấy tên loại kỹ năng
function getActionTypeName(actionType) {
  const typeNames = {
    "sunProducer": "Sản xuất mặt trời",
    "shooter": "Bắn đạn",
    "exploder": "Tự nổ",
    "reflector": "Phản đạn",
    "enhancer": "Tăng cường",
    "blocker": "Chặn đường",
    "areaHealer": "Hỗ trợ vùng",
    "hellCannon": "Đại bác địa ngục",
    "mine": "Mìn",
    "garlic": "Tỏi tấn công",
    "thrower": "Ném đạn",
    "hellfireWalnut": "Óc chó địa ngục"
  };
  
  return typeNames[actionType] || "Đặc biệt";
}

// Hàm lấy chi tiết kỹ năng
function getSkillDetails(action) {
  if (!action) return "";
  
  switch(action.type) {
    case "sunProducer":
      return `Sản xuất ${action.amount} ☀️ mỗi ${(action.interval/1000).toFixed(1)} giây`;
    case "shooter":
      const bullet = action.bullet || {};
      let desc = `${bullet.count || 1} đạn/${(action.interval/1000).toFixed(1)}s, ${bullet.power || 1} sát thương`;
      if (bullet.freeze) desc += ", làm chậm";
      if (bullet.knock) desc += ", đẩy lùi";
      if (action.cost) desc += ` (tốn ${action.cost}☀️)`;
      return desc;
    case "exploder":
      return `Nổ sau ${(action.delay/1000).toFixed(1)}s, ${action.damage} sát thương, phạm vi ${action.range} ô`;
    case "blocker":
      if (action.healPerSecond) {
        return `Hồi ${action.healPerSecond} HP/giây`;
      }
      return "Chặn zombie hiệu quả";
    case "areaHealer":
      return `Giảm ${(action.damageReduction*100)}% sát thương, gây ${action.damage} sát thương mỗi ${(action.interval/1000).toFixed(1)}s`;
    case "hellCannon":
      return `${(action.bullet.power || 0)} sát thương, ${(action.interval/1000).toFixed(1)}s/lần`;
    case "mine":
      return `Hồi ${action.healPerSecond} HP/giây, nổ ${action.explosionDamage} sát thương`;
    case "garlic":
      const garlicBullet = action.bullet || {};
      const defense = action.defenseEffect || {};
      let garlicDesc = `Bắn tầm ${garlicBullet.range || 1} ô, ${garlicBullet.power || 0} sát thương`;
      if (defense.slowAmount) {
        garlicDesc += `, làm chậm ${(defense.slowAmount*100)}% khi bị đánh`;
      }
      return garlicDesc;
    case "thrower":
      const throwBullet = action.bullet || {};
      return `${throwBullet.mainDamage || 0} sát thương chính + ${throwBullet.bounceCount || 0} đạn nảy`;
    case "hellfireWalnut":
      return `Giảm ${(action.damageReduction*100)}% sát thương, hồi ${action.healOnHit} HP khi bị đánh`;
    default:
      return "";
  }
}

// Hàm đóng modal chi tiết
function closePlantDetail() {
  const modal = document.getElementById("plantDetailModal");
  modal.classList.add("closing");
  
  setTimeout(() => {
    modal.style.display = "none";
    modal.classList.remove("closing");
  }, 400);
}

// Hàm tự động chọn một số cây cơ bản
function autoSelectBasicPlants() {
  // Các cây cơ bản nên có
  const basicPlants = ['sunflower', 'pea', 'wallnut'];
  
  basicPlants.forEach(plantType => {
    if (availablePlants.includes(plantType)) {
      selectedPlants.add(plantType);
      const plantItem = document.querySelector(`.plant-select-item[data-type="${plantType}"]`);
      if (plantItem) {
        plantItem.classList.add("selected");
      }
    }
  });
}

// Hàm chọn/bỏ chọn cây
function togglePlantSelection(plantType) {
  const plantItem = document.querySelector(`.plant-select-item[data-type="${plantType}"]`);
  
  if (selectedPlants.has(plantType)) {
    // Bỏ chọn
    selectedPlants.delete(plantType);
    if (plantItem) {
      plantItem.classList.remove("selected");
    }
  } else {
    // Kiểm tra số lượng đã chọn
    if (selectedPlants.size >= 15) {
      alert("Bạn chỉ có thể chọn tối đa 15 loại cây!");
      return;
    }
    
    // Chọn cây
    selectedPlants.add(plantType);
    if (plantItem) {
      plantItem.classList.add("selected");
    }
  }
  
  updateSelectedCount();
}

// Hàm cập nhật số lượng cây đã chọn
function updateSelectedCount() {
  const countElement = document.getElementById("selectedCount");
  const confirmBtn = document.getElementById("confirmPlantsBtn");
  
  const count = selectedPlants.size;
  if (countElement) {
    countElement.textContent = `Đã chọn: ${count}/15`;
    countElement.style.color = count >= 1 ? "#00ff00" : "#ff4444";
    countElement.style.fontWeight = "bold";
    countElement.style.fontSize = "18px";
  }
  
  // Bật/tắt nút xác nhận
  if (confirmBtn) {
    confirmBtn.disabled = count < 1 || count > 15;
    if (!confirmBtn.disabled) {
      confirmBtn.style.background = "linear-gradient(145deg, #ffcc00, #ff9900)";
      confirmBtn.style.boxShadow = "0 0 15px rgba(255, 204, 0, 0.5)";
    } else {
      confirmBtn.style.background = "#666";
      confirmBtn.style.boxShadow = "none";
    }
  }
}

// Hàm xác nhận lựa chọn và bắt đầu game
function confirmPlantSelection() {
  if (selectedPlants.size < 1) {
    alert("Vui lòng chọn ít nhất 1 loại cây!");
    return;
  }
  
  if (selectedPlants.size > 15) {
    alert("Chỉ được chọn tối đa 15 loại cây!");
    return;
  }
  
  // Lưu lựa chọn
  savePlantSelection();
  
  // Ẩn màn hình chọn cây và modal nếu đang mở
  document.getElementById("plantSelectScreen").style.display = "none";
  closePlantDetail();
  
  // Cập nhật shop chỉ hiển thị cây đã chọn
  updateShopWithSelectedPlants();
  
  // Khởi tạo và bắt đầu game
  initGameAfterSelection();
}

// Hàm khởi tạo game sau khi chọn cây
function initGameAfterSelection() {
  // Đảm bảo shovel luôn có sẵn
  if (!selectedPlants.has("shovel")) {
    selectedPlants.add("shovel");
  }
  
  // Gọi hàm startGame từ game-main.js
  if (typeof startGame === 'function') {
    startGame();
  } else {
    // Nếu hàm chưa tồn tại, thử lại sau
    setTimeout(() => {
      if (typeof startGame === 'function') {
        startGame();
      }
    }, 100);
  }
  
  // Thêm nút chọn lại cây vào panel
  addResetButtonToGame();
  
  console.log("🚀 Game đã bắt đầu với " + (selectedPlants.size - 1) + " loại cây đã chọn!");
}

// Hàm cập nhật shop chỉ hiển thị cây đã chọn
function updateShopWithSelectedPlants() {
  // Lấy tất cả các item shop
  const shopItems = document.querySelectorAll(".shop-item");
  
  // Ẩn tất cả các cây (trừ shovel và noSelect)
  shopItems.forEach(item => {
    const plantId = item.id;
    if (plantId !== "shovel" && plantId !== "noSelect" && plantId !== "cay19") {
      const plantType = getPlantTypeFromId(plantId);
      if (plantType && !selectedPlants.has(plantType) && plantType !== "shovel") {
        item.style.display = "none";
      } else if (plantType && selectedPlants.has(plantType)) {
        item.style.display = "inline-block";
      }
    }
  });
  
  // Cây cay19 cần xử lý đặc biệt
  const cay19Item = document.getElementById("cay19");
  if (cay19Item) {
    if (selectedPlants.has("cay19")) {
      cay19Item.style.display = "inline-block";
    } else {
      cay19Item.style.display = "none";
    }
  }
}

// Hàm lấy loại cây từ ID
function getPlantTypeFromId(id) {
  const mapping = {
    "sunflower": "sunflower",
    "bigsun": "bigsun", 
    "pea": "pea",
    "peaice": "peaice",
    "pea2": "pea2",
    "wallnut": "wallnut",
    "cherry": "cherry",
    "azami": "azami",
    "cay10": "cay10",
    "cay11": "cay11",
    "cay12": "cay12",
    "cay13": "cay13",
    "cay14": "cay14",
    "cay15": "cay15",
    "cay16": "cay16",
    "cay17": "cay17",
    "cay18": "cay18",
    "cay19": "cay19",
    "shovel": "shovel"
  };
  
  return mapping[id] || id;
}

// Hàm lưu lựa chọn vào localStorage
function savePlantSelection() {
  // Luôn thêm shovel vào danh sách
  selectedPlants.add("shovel");
  
  const selection = Array.from(selectedPlants);
  localStorage.setItem('pvz_plant_selection', JSON.stringify(selection));
  localStorage.setItem('pvz_plant_selection_time', Date.now());
  console.log("Đã lưu lựa chọn cây:", selection);
}

// Hàm tải lựa chọn từ localStorage
function loadPlantSelection() {
  const saved = localStorage.getItem('pvz_plant_selection');
  const savedTime = localStorage.getItem('pvz_plant_selection_time');
  
  // Kiểm tra nếu lựa chọn cũ hơn 1 ngày thì không load
  if (saved && savedTime && (Date.now() - parseInt(savedTime)) < 86400000) {
    try {
      const parsed = JSON.parse(saved);
      selectedPlants = new Set(parsed.filter(type => type !== "shovel")); // Loại bỏ shovel
      return true;
    } catch (e) {
      console.error("Lỗi khi load lựa chọn cây:", e);
    }
  }
  return false;
}

// Thêm nút chọn lại cây vào panel khi game bắt đầu
function addResetButtonToGame() {
  // Kiểm tra xem đã có nút chưa
  if (!document.getElementById('resetPlantsBtn')) {
    const resetButton = document.createElement("button");
    resetButton.id = "resetPlantsBtn";
    resetButton.textContent = "🔄 Chọn lại cây";
    resetButton.style.background = "linear-gradient(145deg, #4a9a4a, #2a6e2a)";
    resetButton.style.color = "white";
    resetButton.style.border = "2px solid gold";
    resetButton.style.borderRadius = "8px";
    resetButton.style.padding = "8px 15px";
    resetButton.style.cursor = "pointer";
    resetButton.style.margin = "0 5px";
    resetButton.onclick = function() {
      if (confirm("Bạn có muốn chọn lại cây? Trận đấu hiện tại sẽ kết thúc.")) {
        localStorage.removeItem('pvz_plant_selection');
        localStorage.removeItem('pvz_plant_selection_time');
        location.reload();
      }
    };
    
    // Thêm vào panel sau nút tạm dừng
    const pauseBtn = document.getElementById("pauseBtn");
    if (pauseBtn && pauseBtn.parentNode) {
      pauseBtn.parentNode.insertBefore(resetButton, pauseBtn.nextSibling);
    }
  }
}

// Hàm cập nhật trạng thái cây 19 trong shop
function updateCay19ShopItem() {
  const cay19Item = document.getElementById("cay19");
  if (!cay19Item) return;
  
  if (window.cay19Unlocked) {
    cay19Item.classList.remove("disabled");
    cay19Item.title = `Đã tiêu diệt Sứ giả khe nứt: ${window.thayma7Kills || 0}/1 - Giá: ${window.cay19CurrentCost || 0} (Mỗi lần mua tăng 3000 mặt trời)`;
  } else {
    cay19Item.classList.add("disabled");
    cay19Item.title = `Đã tiêu diệt Sứ giả khe nứt: ${window.thayma7Kills || 0}/1 - Giá: ${window.cay19CurrentCost || 0} (Mở khóa khi tiêu diệt 1 Sứ giả khe nứt)`;
  }
}

// Xuất các hàm cần thiết ra global scope
window.showPlantSelectionScreen = showPlantSelectionScreen;
window.updateShopWithSelectedPlants = updateShopWithSelectedPlants;
window.addResetButtonToGame = addResetButtonToGame;
window.loadPlantSelection = loadPlantSelection;
window.updateCay19ShopItem = updateCay19ShopItem;
window.initGameAfterSelection = initGameAfterSelection;
window.showPlantDetail = showPlantDetail;
window.closePlantDetail = closePlantDetail;