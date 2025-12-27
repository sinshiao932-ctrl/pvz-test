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
    plantItem.onclick = () => togglePlantSelection(type);
    
    // Tạo nội dung cây
    plantItem.innerHTML = `
      <img src="${config.image}" alt="${config.name}" onerror="this.src='https://via.placeholder.com/60x60?text=Cây'" />
      <div class="plant-select-info">
        <div class="plant-name">${config.name}</div>
        <div class="plant-cost">Giá: ${config.cost} ☀️</div>
        <div class="plant-hp">Máu: ${config.hp} ❤️</div>
      </div>
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
    plantItem.classList.remove("selected");
  } else {
    // Kiểm tra số lượng đã chọn
    if (selectedPlants.size >= 15) {
      alert("Bạn chỉ có thể chọn tối đa 15 loại cây!");
      return;
    }
    
    // Chọn cây
    selectedPlants.add(plantType);
    plantItem.classList.add("selected");
  }
  
  updateSelectedCount();
}

// Hàm cập nhật số lượng cây đã chọn
function updateSelectedCount() {
  const countElement = document.getElementById("selectedCount");
  const confirmBtn = document.getElementById("confirmPlantsBtn");
  
  const count = selectedPlants.size;
  countElement.textContent = `Đã chọn: ${count}/15`;
  countElement.style.color = count >= 1 ? "lime" : "red";
  
  // Bật/tắt nút xác nhận
  confirmBtn.disabled = count < 1 || count > 15;
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
  
  // Ẩn màn hình chọn cây
  document.getElementById("plantSelectScreen").style.display = "none";
  
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
  if (selectedPlants.has("cay19")) {
    cay19Item.style.display = "inline-block";
  } else {
    cay19Item.style.display = "none";
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
    resetButton.onclick = function() {
      if (confirm("Bạn có muốn chọn lại cây? Trận đấu hiện tại sẽ kết thúc.")) {
        localStorage.removeItem('pvz_plant_selection');
        localStorage.removeItem('pvz_plant_selection_time');
        location.reload();
      }
    };
    
    // Thêm vào panel sau nút tạm dừng
    const pauseBtn = document.getElementById("pauseBtn");
    pauseBtn.parentNode.insertBefore(resetButton, pauseBtn.nextSibling);
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