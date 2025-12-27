// game-main.js
// Logic chính của game

const rows = 8;
const cols = 20;
const game = document.getElementById("game");
const sunSpan = document.getElementById("sun");
const scoreSpan = document.getElementById("score");
let sun = 100, score = 0;
let selectedPlant = null;
let plants = [], zombies = [], bullets = [];
let zombieSpawnRate = 3000, zombieCount = 0, redKills = 0, bossSpawned = false;
let paused = true; // Bắt đầu với trạng thái tạm dừng
let gameStarted = false; // Trạng thái game đã bắt đầu chưa
let startTime = Date.now();
let lastUpdateTime = 0;
let elapsedTime = 0;

// Biến lưu thời gian tạm dừng
let pauseStartTime = 0;
let totalPausedTime = 0;

// Biến điều khiển spawn các loại thây ma đặc biệt
let thayma2Spawned = false;
let thayma3Spawned = false;
let thayma4Spawned = false;
let thayma5Spawned = false;
let thayma6Spawned = false;
let thayma7Spawned = false;
let thayma8Spawned = false;
let thayma8Count = 0;
let thayma7Buffed = false;

// Biến cho cây 19 (xuất ra global)
window.thayma7Kills = 0;
window.cay19Unlocked = false;
window.cay19PurchaseCount = 0;
window.cay19CurrentCost = 0;

// Thời gian spawn các thây ma đặc biệt
const THAYMA2_SPAWN_TIME = 45;
const THAYMA3_SPAWN_TIME = 60;
const THAYMA4_SPAWN_TIME = 90;
const THAYMA5_SPAWN_TIME = 120;
const THAYMA6_SPAWN_TIME = 60;
const THAYMA7_SPAWN_TIME = 600; // 10 phút
const THAYMA8_FIRST_SPAWN_TIME = 180; // 3 phút
const THAYMA8_SECOND_SPAWN_TIME = 600; // 10 phút

// =============== HÀM XỬ LÝ GAME ===============

// Hàm bắt đầu game
function startGame() {
  gameStarted = true;
  paused = false;
  startTime = Date.now();
  totalPausedTime = 0;
  document.getElementById("pauseBtn").textContent = "⏸️ Tạm dừng";
  document.getElementById("pauseScreen").style.display = "none";
  
  // Đảm bảo shovel luôn có sẵn
  if (!selectedPlants.has("shovel")) {
    selectedPlants.add("shovel");
  }
  
  // Kích hoạt các spawner
  setTimeout(spawnZombie, 2000);
  setTimeout(spawnSmartZombie, 5000);
  setTimeout(spawnThayMa2, 1000);
  setTimeout(spawnThayMa3, 1000);
  setTimeout(spawnThayMa4, 1000);
  setTimeout(spawnThayMa5, 1000);
  setTimeout(spawnThayMa6, 1000);
  setTimeout(spawnThayMa7, 1000);
  setTimeout(spawnThayMa8, 1000);
  
  console.log("🚀 Game đã bắt đầu với " + (selectedPlants.size - 1) + " loại cây đã chọn!");
}

// Hàm tạm dừng/tiếp tục game
function togglePause() {
  if (!gameStarted) return;
  
  if (paused) {
    // Tiếp tục game
    paused = false;
    document.getElementById("pauseBtn").textContent = "⏸️ Tạm dừng";
    document.getElementById("pauseScreen").style.display = "none";
    
    // Tính thời gian đã tạm dừng
    const pauseDuration = Date.now() - pauseStartTime;
    totalPausedTime += pauseDuration;
    
    console.log("▶️ Game tiếp tục");
  } else {
    // Tạm dừng game
    paused = true;
    document.getElementById("pauseBtn").textContent = "▶️ Tiếp tục";
    document.getElementById("pauseScreen").style.display = "block";
    pauseStartTime = Date.now();
    
    console.log("⏸️ Game tạm dừng");
  }
}

// Tính thời gian thực (loại trừ thời gian tạm dừng)
function getActualElapsedTime() {
  if (paused) {
    return Math.floor((pauseStartTime - startTime - totalPausedTime) / 1000);
  }
  return Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
}

// Cập nhật cây 19 trong shop
function updateCay19ShopItem() {
  const cay19Item = document.getElementById("cay19");
  if (!cay19Item) return;
  
  if (cay19Unlocked) {
    cay19Item.classList.remove("disabled");
    cay19Item.title = `Đã tiêu diệt Sứ giả khe nứt: ${thayma7Kills}/1 - Giá: ${cay19CurrentCost} (Mỗi lần mua tăng 3000 mặt trời)`;
  } else {
    cay19Item.classList.add("disabled");
    cay19Item.title = `Đã tiêu diệt Sứ giả khe nứt: ${thayma7Kills}/1 - Giá: ${cay19CurrentCost} (Mở khóa khi tiêu diệt 1 Sứ giả khe nứt)`;
  }
}

// =============== CÁC HÀM HỖ TRỢ ===============
function createGarlicTrail(x, y) {
  const trail = document.createElement("div");
  trail.className = "garlic-bullet-trail";
  trail.style.left = x + "px";
  trail.style.top = y + "px";
  game.appendChild(trail);
  
  setTimeout(() => {
    if (trail.parentNode) {
      trail.parentNode.removeChild(trail);
    }
  }, 300);
}

function createThrowEffect(x, y) {
  const effect = document.createElement("div");
  effect.className = "cay18-throw-effect";
  effect.style.left = x + "px";
  effect.style.top = y + "px";
  game.appendChild(effect);
  
  setTimeout(() => {
    if (effect.parentNode) {
      effect.parentNode.removeChild(effect);
    }
  }, 500);
}

function createBounceEffect(x, y) {
  const effect = document.createElement("div");
  effect.className = "cay18-bounce-effect";
  effect.style.left = x + "px";
  effect.style.top = y + "px";
  game.appendChild(effect);
  
  setTimeout(() => {
    if (effect.parentNode) {
      effect.parentNode.removeChild(effect);
    }
  }, 300);
}

function createHellfireHealEffect(x, y) {
  const effect = document.createElement("div");
  effect.className = "hellfire-heal-effect";
  effect.style.left = x + "px";
  effect.style.top = y + "px";
  game.appendChild(effect);
  
  setTimeout(() => {
    if (effect.parentNode) {
      effect.parentNode.removeChild(effect);
    }
  }, 1500);
}

function applyPermanentSlow(zombie, slowAmount, maxSlow) {
  if (zombie.immuneToControl) return;
  
  if (!zombie.totalSlowAmount) {
    zombie.totalSlowAmount = 0;
  }
  
  const newSlowAmount = Math.min(maxSlow, zombie.totalSlowAmount + slowAmount);
  const additionalSlow = newSlowAmount - zombie.totalSlowAmount;
  
  if (additionalSlow > 0) {
    zombie.totalSlowAmount = newSlowAmount;
    zombie.slow = 1 - zombie.totalSlowAmount;
    zombie.el.classList.add("cay18-slow");
    const brightness = 1 - (zombie.totalSlowAmount * 0.5);
    zombie.el.style.filter = `brightness(${brightness}) sepia(1) hue-rotate(-${zombie.totalSlowAmount * 30}deg)`;
  }
}

function applyExtremeSlow(zombie, slowAmount, duration) {
  if (zombie.immuneToControl) return;
  
  if (!zombie.originalSpeed) {
    zombie.originalSpeed = zombie.speed;
  }
  
  zombie.slow = 1 - slowAmount;
  zombie.el.style.boxShadow = "0 0 20px #FF0000";
  zombie.el.style.filter = "brightness(0.5) blur(1px)";
  
  const possibleRows = [];
  if (zombie.r > 0) possibleRows.push(zombie.r - 1);
  if (zombie.r < rows - 1) possibleRows.push(zombie.r + 1);
  
  if (possibleRows.length > 0) {
    const newRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];
    zombie.r = newRow;
    const pos = cellPos(zombie.r, zombie.x);
    zombie.el.style.top = pos.y + "px";
  }
  
  setTimeout(() => {
    if (zombie.el && zombie.el.parentNode) {
      zombie.el.style.boxShadow = "";
      zombie.el.style.filter = "";
      if (zombie.originalSpeed) {
        if (zombie.totalSlowAmount) {
          zombie.slow = 1 - zombie.totalSlowAmount;
        } else {
          zombie.slow = 1;
        }
      }
    }
  }, duration);
}

function findNearestZombies(targetZombie, excludeZombie, count = 3) {
  const distances = [];
  zombies.forEach(z => {
    if (z !== targetZombie && z !== excludeZombie) {
      const distance = Math.sqrt(
        Math.pow(z.r - targetZombie.r, 2) + 
        Math.pow(z.x - targetZombie.x, 2)
      );
      distances.push({ zombie: z, distance });
    }
  });
  distances.sort((a, b) => a.distance - b.distance);
  return distances.slice(0, count).map(item => item.zombie);
}

function createBounceBullet(startX, startY, targetZombie, damage, plant) {
  const bullet = document.createElement("div");
  bullet.className = "bullet cay18-bullet";
  bullet.style.left = startX + "px";
  bullet.style.top = startY + "px";
  bullet.style.zIndex = "960";
  game.appendChild(bullet);
  
  const nextTargets = findNearestZombies(targetZombie, targetZombie, 1);
  let nextTarget = nextTargets[0];
  let targetX = startX;
  let targetY = startY;
  let hasTarget = false;
  
  if (nextTarget) {
    const targetPos = cellPos(nextTarget.r, nextTarget.x);
    targetX = targetPos.x;
    targetY = targetPos.y;
    hasTarget = true;
  } else {
    targetX = startX + 100;
    targetY = startY;
  }
  
  const startTime = Date.now();
  const duration = hasTarget ? 800 : 500;
  const controlY = Math.min(startY, targetY) - 40;
  
  const bulletObj = {
    el: bullet,
    startX: startX,
    startY: startY,
    targetX: targetX,
    targetY: targetY,
    controlY: controlY,
    startTime: startTime,
    duration: duration,
    damage: damage,
    target: nextTarget,
    plant: plant,
    isBounce: true,
    hasHit: false,
    isProcessed: false
  };
  
  bullets.push(bulletObj);
  createBounceEffect(startX, startY);
  if (document.getElementById("bounceSound")) {
    document.getElementById("bounceSound").play();
  }
  return bulletObj;
}

function selectPlant(t) {
  if (t === "cay19" && !cay19Unlocked) {
    alert("Cần tiêu diệt 1 Sứ giả khe nứt (thayma7) để mở khóa cây này!");
    return;
  }
  
  selectedPlant = t;
  document.getElementById("selected").textContent = "→ " + t;
}

function cellPos(r, c) {
  return {
    x: c * 70 + 35,
    y: r * 90 + 45
  };
}

// =============== XỬ LÝ CLICK TRỒNG CÂY ===============
if (game) {
  game.onclick = (e) => {
    if (!gameStarted) {
      alert("Vui lòng chọn cây và bắt đầu game!");
      return;
    }
    
    if (!selectedPlant || paused) return;
    const rect = game.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const c = Math.floor(x / 70), r = Math.floor(y / 90);

    const exist = plants.find(p => p.r === r && p.c === c);
    if (selectedPlant === 'shovel') {
      if (exist) {
        exist.el.remove();
        plants = plants.filter(p => p !== exist);
        const config = PLANT_CONFIG.plants[exist.type];
        sun += Math.floor(config.cost * 0.5);
        sunSpan.textContent = sun;
      }
      return;
    }

    if (exist) return;
    
    const config = PLANT_CONFIG.plants[selectedPlant];
    if (!config) return;
    
    let actualCost = config.cost;
    if (selectedPlant === 'cay19') {
      actualCost = cay19CurrentCost;
    }
    
    if (sun < actualCost) return;
    
    if (selectedPlant === 'azami' || selectedPlant === 'cay10') {
      const plantsInRow = plants.filter(p => p.r === r && p.type === selectedPlant);
      if (plantsInRow.length >= (config.limitPerRow || 1)) {
        alert(`Mỗi hàng chỉ được trồng tối đa ${config.limitPerRow} cây ${config.name}!`);
        return;
      }
    }
    
    sun -= actualCost;
    sunSpan.textContent = sun;
    
    if (selectedPlant === 'cay19') {
      cay19PurchaseCount++;
      cay19CurrentCost += 3000;
      updateCay19ShopItem();
    }
    
    addPlant(r, c, selectedPlant);
  };
}

function deselectPlant() {
  selectedPlant = null;
  document.getElementById("selected").textContent = "→ Không chọn cây";
}

// =============== HÀM THÊM CÂY ===============
function addPlant(r, c, type) {
  const config = PLANT_CONFIG.plants[type];
  if (!config) return;

  const el = document.createElement("div");
  el.className = "plant " + type;
  const pos = cellPos(r, c);
  el.style.left = pos.x + "px";
  el.style.top = pos.y + "px";
  
  el.style.setProperty('--plant-width', config.width + 'px');
  el.style.setProperty('--plant-height', config.height + 'px');
  el.style.width = config.width + 'px';
  el.style.height = config.height + 'px';

  const plantImage = document.createElement("img");
  plantImage.src = config.image;
  plantImage.alt = config.name;
  plantImage.style.width = "100%";
  plantImage.style.height = "100%";
  el.appendChild(plantImage);

  const hpT = document.createElement("div");
  hpT.className = "hp-text";
  hpT.textContent = config.hp;
  el.appendChild(hpT);

  const manaBar = document.createElement("div");
  manaBar.className = "mana-bar";
  const manaFill = document.createElement("div");
  manaFill.className = "mana-fill";
  manaBar.appendChild(manaFill);
  el.appendChild(manaBar);

  game.appendChild(el);

  const p = {
    r,
    c,
    type,
    hp: config.hp,
    maxHp: config.maxHp || config.hp,
    el,
    hpT,
    mana: 0,
    manaFill,
    config: config,
    lastAction: Date.now(),
    lastHealTime: Date.now(),
    lastHitTime: 0,
    cooldown: false,
    reflectionCount: 0,
    lastSkillTime: Date.now(),
    lastAttackTime: 0,
    lastManaIncrease: Date.now(),
    purchaseCost: (type === 'cay19' ? cay19CurrentCost - 3000 : config.cost)
  };

  plants.push(p);

  // Xử lý riêng cho từng loại cây
  if (type === "sunflower" || type === "bigsun") {
    const manaInterval = setInterval(() => {
      if (paused || !gameStarted) return;
      if (p.mana < 100) {
        p.mana += 25;
        p.manaFill.style.width = Math.min(100, p.mana) + "%";
      } else {
        sun += 50;
        sunSpan.textContent = sun;
        p.mana = 0;
        p.manaFill.style.width = "0%";
      }
    }, 1000);
    
    // Lưu interval ID để có thể dừng khi cần
    p.manaIntervalId = manaInterval;
  }

  if (type === "cherry") setTimeout(() => explode(p), 1500);
}

function explode(p) {
  if (paused || !gameStarted) return;
  if (document.getElementById("boomSound")) {
    document.getElementById("boomSound").play();
  }
  
  const config = p.config.action;
  const damage = config.damage || 999;
  const range = config.range || 1.5;
  
  zombies.forEach(z => {
    if (z.type === "thayma6" && z.config.immuneToExplosion) return;
    if (z.type === "thayma8" && z.config.immuneToExplosion) return;
    
    if (Math.abs(z.r - p.r) <= range && Math.abs(z.x - p.c) < range) {
      z.hp -= damage;
    }
  });
  
  p.el.remove();
  plants = plants.filter(x => x !== p);
}

// =============== HIỆU ỨNG ===============
function createHealEffect(x, y) {
  const healEl = document.createElement("div");
  healEl.className = "heal-effect";
  healEl.style.left = x + "px";
  healEl.style.top = y + "px";
  game.appendChild(healEl);
  
  setTimeout(() => {
    if (healEl.parentNode) {
      healEl.parentNode.removeChild(healEl);
    }
  }, 1000);
}

function createMineExplosionEffect(x, y) {
  const explosionEl = document.createElement("div");
  explosionEl.className = "mine-explosion-effect";
  explosionEl.style.left = x + "px";
  explosionEl.style.top = y + "px";
  game.appendChild(explosionEl);
  
  setTimeout(() => {
    if (explosionEl.parentNode) {
      explosionEl.parentNode.removeChild(explosionEl);
    }
  }, 800);
}

function applyGarlicEffect(zombie, plant) {
  if (zombie.immuneToControl) return;
  
  const config = plant.config.action.defenseEffect;
  if (!zombie.originalSpeed) {
    zombie.originalSpeed = zombie.speed;
  }
  zombie.slow = 0.2;
  zombie.el.classList.add("garlic-effect");
  
  const possibleRows = [];
  if (zombie.r > 0) possibleRows.push(zombie.r - 1);
  if (zombie.r < rows - 1) possibleRows.push(zombie.r + 1);
  
  if (possibleRows.length > 0) {
    const newRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];
    zombie.r = newRow;
    const pos = cellPos(zombie.r, zombie.x);
    zombie.el.style.top = pos.y + "px";
  }
  
  setTimeout(() => {
    if (zombie.el && zombie.el.parentNode) {
      zombie.el.classList.remove("garlic-effect");
      if (zombie.originalSpeed) {
        zombie.slow = 1;
      }
    }
  }, config.slowDuration);
}

// =============== SPAWN ZOMBIE THƯỜNG ===============
function spawnZombie() {
  if (paused || !gameStarted) {
    setTimeout(spawnZombie, 1000);
    return;
  }
  
  const elapsed = getActualElapsedTime();
  const r = Math.floor(Math.random() * 5);
  
  let type = "normal";
  if (elapsed > 30 && Math.random() < 0.15) type = "red";
  if (elapsed > 60 && Math.random() < 0.05) type = "big";

  const z = document.createElement("div");
  z.className = "zombie " + (type === "red" ? "red" : type === "big" ? "big" : "");
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";

  const config = ZOMBIE_CONFIG.zombies[type];
  let hp = config.baseHp;
  if (type === "red") hp += 5 * Math.min(zombieCount, 10);
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-20px";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);

  const zombie = {
    r, 
    x: cols, 
    hp, 
    type, 
    speed: config.speed,
    el: z, 
    hpT, 
    attack: null, 
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: config.canAttack || true,
    config: config,
    immuneToControl: config.immuneToControl || false,
    immuneToKnockback: config.immuneToKnockback || false,
    immuneToExplosion: config.immuneToExplosion || false,
    passThroughPlants: config.passThroughPlants || false
  };
  
  zombies.push(zombie);
  zombieCount++;
  setTimeout(spawnZombie, 3000);
}

// =============== SPAWN THÂY MA 2 ===============
function spawnThayMa2() {
  if (paused || !gameStarted || thayma2Spawned) {
    setTimeout(spawnThayMa2, 1000);
    return;
  }
  
  const elapsed = getActualElapsedTime();
  if (elapsed < THAYMA2_SPAWN_TIME) {
    setTimeout(spawnThayMa2, 1000);
    return;
  }
  
  const r = Math.floor(Math.random() * 5);
  const z = document.createElement("div");
  z.className = "zombie thayma2";
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";

  const config = ZOMBIE_CONFIG.zombies.thayma2;
  const hp = config.baseHp;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-20px";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);

  const zombie = {
    r, 
    x: cols, 
    hp, 
    type: "thayma2", 
    speed: config.speed,
    el: z, 
    hpT, 
    attack: null, 
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: config.canAttack,
    passThroughPlants: config.passThroughPlants,
    config: config
  };

  zombies.push(zombie);
  thayma2Spawned = true;
  
  setTimeout(() => {
    thayma2Spawned = false;
    setTimeout(spawnThayMa2, 30000);
  }, 30000);
}

// =============== SPAWN THÂY MA 3 ===============
function spawnThayMa3() {
  if (paused || !gameStarted || thayma3Spawned) {
    setTimeout(spawnThayMa3, 1000);
    return;
  }
  
  const elapsed = getActualElapsedTime();
  if (elapsed < THAYMA3_SPAWN_TIME) {
    setTimeout(spawnThayMa3, 1000);
    return;
  }
  
  const r = Math.floor(Math.random() * 5);
  const z = document.createElement("div");
  z.className = "zombie thayma3";
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";

  const config = ZOMBIE_CONFIG.zombies.thayma3;
  const hp = config.baseHp;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-20px";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);

  const zombie = {
    r, 
    x: cols, 
    hp, 
    type: "thayma3", 
    speed: config.speed,
    el: z, 
    hpT, 
    attack: null, 
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: config.canAttack,
    stopsAtPlant: config.stopsAtPlant,
    stopped: false,
    stuck: false,
    config: config
  };

  zombies.push(zombie);
  thayma3Spawned = true;
  
  setTimeout(() => {
    thayma3Spawned = false;
    setTimeout(spawnThayMa3, 45000);
  }, 45000);
}

// =============== SPAWN THÂY MA 4 ===============
function spawnThayMa4() {
  if (paused || !gameStarted || thayma4Spawned) {
    setTimeout(spawnThayMa4, 1000);
    return;
  }
  
  const elapsed = getActualElapsedTime();
  if (elapsed < THAYMA4_SPAWN_TIME) {
    setTimeout(spawnThayMa4, 1000);
    return;
  }
  
  const r = Math.floor(Math.random() * 5);
  const z = document.createElement("div");
  z.className = "zombie thayma4";
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";

  const config = ZOMBIE_CONFIG.zombies.thayma4;
  const hp = config.baseHp;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-20px";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);

  const zombie = {
    r, 
    x: cols, 
    hp, 
    type: "thayma4", 
    speed: config.speed,
    el: z, 
    hpT, 
    attack: null, 
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: true,
    explosionOnDeath: config.explosionOnDeath,
    explosionRange: config.explosionRange,
    config: config
  };

  zombies.push(zombie);
  thayma4Spawned = true;
  
  setTimeout(() => {
    thayma4Spawned = false;
    setTimeout(spawnThayMa4, 60000);
  }, 60000);
}

// =============== SPAWN THÂY MA 5 ===============
function spawnThayMa5() {
  if (paused || !gameStarted || thayma5Spawned) {
    setTimeout(spawnThayMa5, 1000);
    return;
  }
  
  const elapsed = getActualElapsedTime();
  if (elapsed < THAYMA5_SPAWN_TIME) {
    setTimeout(spawnThayMa5, 1000);
    return;
  }
  
  const r = Math.floor(Math.random() * 5);
  const z = document.createElement("div");
  z.className = "zombie thayma5";
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";

  const config = ZOMBIE_CONFIG.zombies.thayma5;
  const hp = config.baseHp;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-20px";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);

  const zombie = {
    r, 
    x: cols, 
    hp, 
    type: "thayma5", 
    speed: config.speed,
    el: z, 
    hpT, 
    attack: null, 
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: config.canAttack,
    immuneToControl: config.immuneToControl,
    immuneToKnockback: config.immuneToKnockback,
    config: config
  };

  zombies.push(zombie);
  thayma5Spawned = true;
  
  setTimeout(() => {
    thayma5Spawned = false;
    setTimeout(spawnThayMa5, 60000);
  }, 60000);
}

// =============== SPAWN THÂY MA 6 ===============
function spawnThayMa6() {
  if (paused || !gameStarted || thayma6Spawned) {
    setTimeout(spawnThayMa6, 1000);
    return;
  }
  
  const elapsed = getActualElapsedTime();
  if (elapsed < THAYMA6_SPAWN_TIME) {
    setTimeout(spawnThayMa6, 1000);
    return;
  }
  
  const r = 3;
  const z = document.createElement("div");
  z.className = "zombie thayma6";
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";

  const config = ZOMBIE_CONFIG.zombies.thayma6;
  const hp = config.baseHp;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-25px";
  hpT.style.fontSize = "16px";
  hpT.style.color = "gold";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);

  const zombie = {
    r, 
    x: cols, 
    hp, 
    type: "thayma6", 
    speed: config.speed,
    el: z, 
    hpT, 
    attack: null, 
    slow: 1,
    lastAttackTime: 0,
    lastRangedAttack: 0,
    attackDamage: config.attackDamage,
    canAttack: config.canAttack,
    immuneToControl: config.immuneToControl,
    immuneToKnockback: config.immuneToKnockback,
    immuneToExplosion: config.immuneToExplosion,
    stopsAtDistance: config.stopsAtDistance,
    hasStopped: false,
    rangedAttack: config.rangedAttack,
    rangedDamage: config.rangedDamage,
    rangedInterval: config.rangedInterval,
    rangedTarget: config.rangedTarget,
    winOnKill: config.winOnKill,
    config: config
  };

  zombies.push(zombie);
  thayma6Spawned = true;
}

// =============== SPAWN THÂY MA 7 - SỨ GIẢ KHE NỨT ===============
function spawnThayMa7() {
  if (paused || !gameStarted || thayma7Spawned) {
    setTimeout(spawnThayMa7, 1000);
    return;
  }
  
  const elapsed = getActualElapsedTime();
  if (elapsed < THAYMA7_SPAWN_TIME) {
    setTimeout(spawnThayMa7, 1000);
    return;
  }
  
  const r = Math.floor(Math.random() * 5);
  const z = document.createElement("div");
  z.className = "zombie thayma7";
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";

  const config = ZOMBIE_CONFIG.zombies.thayma7;
  const hp = config.baseHp;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-20px";
  hpT.style.fontSize = "14px";
  hpT.style.color = "#ff0000";
  hpT.style.fontWeight = "bold";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);

  const zombie = {
    r, 
    x: cols, 
    hp, 
    type: "thayma7", 
    speed: config.speed,
    el: z, 
    hpT, 
    attack: null, 
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: config.canAttack,
    knockbackOnHit: config.knockbackOnHit,
    knockbackDistance: config.knockbackDistance,
    attackInterval: config.attackInterval || 1000,
    config: config
  };

  zombies.push(zombie);
  thayma7Spawned = true;
  
  setTimeout(() => {
    thayma7Spawned = false;
    setTimeout(spawnThayMa7, 60000);
  }, 60000);
}

// =============== SPAWN THÂY MA 8 - BARON NASHOR ===============
function spawnThayMa8() {
  if (paused || !gameStarted) {
    setTimeout(spawnThayMa8, 1000);
    return;
  }
  
  const elapsed = getActualElapsedTime();
  
  if (elapsed < THAYMA8_FIRST_SPAWN_TIME) {
    setTimeout(spawnThayMa8, 1000);
    return;
  }
  
  if (elapsed >= THAYMA8_FIRST_SPAWN_TIME && elapsed < THAYMA8_SECOND_SPAWN_TIME) {
    if (thayma8Count >= 1) {
      setTimeout(spawnThayMa8, 1000);
      return;
    }
  } else if (elapsed >= THAYMA8_SECOND_SPAWN_TIME) {
    if (thayma8Count >= 2) {
      setTimeout(spawnThayMa8, 1000);
      return;
    }
  }
  
  const r = Math.floor(Math.random() * 5);
  const z = document.createElement("div");
  z.className = "zombie thayma8";
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";

  const config = ZOMBIE_CONFIG.zombies.thayma8;
  const hp = config.baseHp;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-25px";
  hpT.style.fontSize = "16px";
  hpT.style.color = "#8B0000";
  hpT.style.fontWeight = "bold";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);

  const zombie = {
    r, 
    x: cols, 
    hp, 
    type: "thayma8", 
    speed: config.speed,
    el: z, 
    hpT, 
    attack: null, 
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: config.canAttack,
    stopsAtDistance: config.stopsAtDistance,
    hasStopped: false,
    immuneToControl: config.immuneToControl,
    immuneToKnockback: config.immuneToKnockback,
    immuneToExplosion: config.immuneToExplosion,
    buffsThayma7: config.buffsThayma7,
    buffSpeedAmount: config.buffSpeedAmount,
    buffAttackSpeedAmount: config.buffAttackSpeedAmount,
    spawnsThayma7OnDeath: config.spawnsThayma7OnDeath,
    spawnedThayma7Hp: config.spawnedThayma7Hp,
    spawnOnAppearance: config.spawnOnAppearance,
    config: config,
    id: "baron_" + Date.now()
  };

  zombies.push(zombie);
  thayma8Spawned = true;
  thayma8Count++;
  
  console.log("⚠️ BARON NASHOR ĐÃ XUẤT HIỆN! ⚠️");
  
  if (zombie.spawnOnAppearance) {
    setTimeout(() => {
      spawnThayma7ForBaron();
    }, 1000);
  }
  
  setTimeout(() => {
    spawnThayMa8();
  }, 30000);
}

function spawnThayma7ForBaron() {
  if (paused || !gameStarted) return;
  
  const r = Math.floor(Math.random() * 5);
  const z = document.createElement("div");
  z.className = "zombie thayma7";
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";

  const config = ZOMBIE_CONFIG.zombies.thayma7;
  const hp = 5000;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-20px";
  hpT.style.fontSize = "14px";
  hpT.style.color = "#ff0000";
  hpT.style.fontWeight = "bold";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);

  const zombie = {
    r, 
    x: cols, 
    hp, 
    type: "thayma7", 
    speed: config.speed,
    el: z, 
    hpT, 
    attack: null, 
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: config.canAttack,
    knockbackOnHit: config.knockbackOnHit,
    knockbackDistance: config.knockbackDistance,
    attackInterval: config.attackInterval || 1000,
    config: config,
    isBaronSpawn: true
  };

  zombies.push(zombie);
  
  z.style.boxShadow = "0 0 20px purple";
  setTimeout(() => {
    if (z.el) z.el.style.boxShadow = "";
  }, 1000);
}

function spawnSuperThayma7OnBaronDeath(baron) {
  if (paused || !gameStarted) return;
  
  console.log("💀 BARON NASHOR ĐÃ CHẾT! Triệu hồi SỨ GIẢ KHE NỨT SIÊU CẤP! 💀");
  
  for (let r = 0; r < 5; r++) {
    setTimeout(() => {
      const z = document.createElement("div");
      z.className = "zombie thayma7";
      const pos = cellPos(r, cols);
      z.style.left = pos.x + "px";
      z.style.top = pos.y + "px";

      const config = ZOMBIE_CONFIG.zombies.thayma7;
      const hp = baron.spawnedThayma7Hp || 300000;
      
      const hpT = document.createElement("div");
      hpT.style.position = "absolute";
      hpT.style.top = "-25px";
      hpT.style.fontSize = "18px";
      hpT.style.color = "#FF0000";
      hpT.style.fontWeight = "bold";
      hpT.style.textShadow = "0 0 5px #000";
      hpT.textContent = hp;
      z.appendChild(hpT);
      game.appendChild(z);

      const zombie = {
        r, 
        x: cols, 
        hp, 
        type: "thayma7", 
        speed: config.speed * 2,
        el: z, 
        hpT, 
        attack: null, 
        slow: 1,
        lastAttackTime: 0,
        attackDamage: config.attackDamage * 2,
        canAttack: config.canAttack,
        knockbackOnHit: config.knockbackOnHit,
        knockbackDistance: config.knockbackDistance * 2,
        attackInterval: config.attackInterval ? config.attackInterval / 2 : 500,
        config: config,
        isSuperBaronSpawn: true
      };

      zombies.push(zombie);
      
      z.style.boxShadow = "0 0 30px #FF0000";
      z.style.filter = "brightness(1.5)";
      setTimeout(() => {
        if (z.el) {
          z.el.style.boxShadow = "0 0 15px #FF0000";
          z.el.style.filter = "brightness(1.2)";
        }
      }, 1000);
      
      if (document.getElementById("boomSound")) {
        document.getElementById("boomSound").play();
      }
      
    }, r * 500);
  }
}

function applyBaronBuffToThayma7() {
  const baronAlive = zombies.some(z => z.type === "thayma8");
  
  if (baronAlive && !thayma7Buffed) {
    zombies.forEach(z => {
      if (z.type === "thayma7") {
        if (!z.originalSpeed) {
          z.originalSpeed = z.speed;
          z.originalAttackInterval = z.attackInterval;
        }
        z.speed = z.originalSpeed * 2;
        if (z.originalAttackInterval) {
          z.attackInterval = z.originalAttackInterval / 2;
        }
        z.el.style.boxShadow = "0 0 15px #00FF00";
        z.el.style.filter = "brightness(1.3)";
      }
    });
    thayma7Buffed = true;
  } else if (!baronAlive && thayma7Buffed) {
    zombies.forEach(z => {
      if (z.type === "thayma7") {
        if (z.originalSpeed) {
          z.speed = z.originalSpeed;
        }
        if (z.originalAttackInterval) {
          z.attackInterval = z.originalAttackInterval;
        }
        z.el.style.boxShadow = "";
        z.el.style.filter = "";
      }
    });
    thayma7Buffed = false;
  }
}

// =============== SPAWN THÂY MA THÔNG MINH ===============
function spawnSmartZombie() {
  if (paused || !gameStarted) {
    setTimeout(spawnSmartZombie, 1000);
    return;
  }
  if (plants.length === 0) {
    setTimeout(spawnSmartZombie, 5000);
    return;
  }
  let rowCount = new Array(rows).fill(0);
  plants.forEach(p => rowCount[p.r]++);
  const maxCount = Math.max(...rowCount);
  const candidates = [];
  rowCount.forEach((c, i) => {
    if (c === maxCount) candidates.push(i);
  });
  const targetRow = candidates[Math.floor(Math.random() * candidates.length)];
  const z = document.createElement("div");
  z.className = "zombie smart";
  const pos = cellPos(targetRow, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";
  
  const config = ZOMBIE_CONFIG.zombies.smart;
  const hp = config.baseHp;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-20px";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);
  
  const zombie = {
    r: targetRow,
    x: cols,
    hp,
    type: "smart",
    speed: config.speed,
    el: z,
    hpT,
    attack: null,
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: true,
    config: config
  };
  zombies.push(zombie);
  setTimeout(spawnSmartZombie, 5000);
}

// =============== SPAWN BOSS PURPLE ===============
function spawnBoss() {
  if (bossSpawned || !gameStarted) return;
  bossSpawned = true;
  const r = Math.floor(rows / 2);
  const z = document.createElement("div");
  z.className = "zombie purple";
  const pos = cellPos(r, cols);
  z.style.left = pos.x + "px";
  z.style.top = pos.y + "px";
  
  const config = ZOMBIE_CONFIG.zombies.purple;
  const hp = config.baseHp;
  
  const hpT = document.createElement("div");
  hpT.style.position = "absolute";
  hpT.style.top = "-25px";
  hpT.textContent = hp;
  z.appendChild(hpT);
  game.appendChild(z);
  
  zombies.push({
    r,
    x: cols,
    hp,
    type: "purple",
    speed: config.speed,
    el: z,
    hpT,
    attack: null,
    slow: 1,
    lastAttackTime: 0,
    attackDamage: config.attackDamage,
    canAttack: true,
    config: config
  });
}

// =============== HÀM UPDATE CHÍNH ===============
function update() {
  if (paused || !gameStarted) {
    // Cập nhật thời gian khi tạm dừng
    const minutes = Math.floor(getActualElapsedTime() / 60);
    const seconds = getActualElapsedTime() % 60;
    const timerElement = document.getElementById('timer');
    if (timerElement) {
      timerElement.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return;
  }

  elapsedTime = getActualElapsedTime();
  
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  const timerElement = document.getElementById('timer');
  if (timerElement) {
    timerElement.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  if (elapsedTime - lastUpdateTime >= ZOMBIE_CONFIG.timeUpdates.interval) {
    zombies.forEach(z => {
      if (z.type !== "thayma5" && z.type !== "thayma6" && z.type !== "thayma7" && z.type !== "thayma8") {
        z.hp += ZOMBIE_CONFIG.timeUpdates.hpIncrease;
        z.speed += ZOMBIE_CONFIG.timeUpdates.speedIncrease;
        z.hpT.textContent = Math.ceil(z.hp);
      }
    });
    lastUpdateTime = elapsedTime;
  }

  zombies.forEach(z => {
    if (z.type === "thayma6" && !z.hasStopped) {
      if (z.x <= cols - z.stopsAtDistance) {
        z.hasStopped = true;
        z.speed = 0;
      }
    }
    
    if (z.type === "thayma8" && !z.hasStopped) {
      if (z.x <= cols - z.stopsAtDistance) {
        z.hasStopped = true;
        z.speed = 0;
        z.el.style.boxShadow = "0 0 30px #8B0000";
      }
    }
    
    const targetPlant = plants.find(p => p.r === z.r && Math.abs(p.c - z.x) < 0.5);
    
    // Kiểm tra nếu có cây cay19 chặn đường
    const blockingCay19 = plants.find(p => p.type === "cay19" && p.r === z.r && Math.abs(p.c - z.x) < 0.5);
    if (blockingCay19 && z.type !== "thayma2" && !z.passThroughPlants) {
      // Zombie không thể đi qua cây cay19
      if (z.canAttack) {
        const now = Date.now();
        const attackInterval = z.attackInterval || ZOMBIE_CONFIG.attackInterval;
        
        if (now - z.lastAttackTime > attackInterval) {
          const actualDamage = z.attackDamage * (1 - blockingCay19.config.action.damageReduction);
          blockingCay19.hp -= actualDamage;
          blockingCay19.hpT.textContent = Math.ceil(blockingCay19.hp);
          
          // Khi cay19 bị tấn công, hồi máu cho toàn bộ cây
          plants.forEach(plant => {
            if (plant !== blockingCay19) {
              const oldHp = plant.hp;
              plant.hp = Math.min(plant.maxHp, plant.hp + blockingCay19.config.action.healOnHit);
              plant.hpT.textContent = Math.ceil(plant.hp);
              if (plant.hp > oldHp) {
                const pos = cellPos(plant.r, plant.c);
                createHellfireHealEffect(pos.x, pos.y);
              }
            }
          });
          
          blockingCay19.el.classList.add("hit");
          setTimeout(() => {
            if (blockingCay19.el) blockingCay19.el.classList.remove("hit");
          }, 500);
          
          z.lastAttackTime = now;
        }
      }
      z.x = Math.max(z.x, blockingCay19.c + 0.5);
      const pos = cellPos(z.r, z.x);
      z.el.style.left = pos.x + "px";
      return;
    }
    
    if (z.type === "thayma2" && z.passThroughPlants) {
      z.x -= z.speed * z.slow;
      const pos = cellPos(z.r, z.x);
      z.el.style.left = pos.x + "px";
    } else if (targetPlant) {
      let actualDamage = z.attackDamage;
      if (targetPlant.type === "cay14") {
        const config = targetPlant.config;
        actualDamage *= (1 - (config.action.damageReduction || 0));
      }
      
      if (targetPlant.type === "cay13") {
        z.x = Math.max(z.x, targetPlant.c + 0.5);
        const pos = cellPos(z.r, z.x);
        z.el.style.left = pos.x + "px";
      } else {
        if (z.type === "thayma3" && z.stopsAtPlant && !z.stopped) {
          const safeDistance = 0.8;
          if (Math.abs(targetPlant.c - z.x) <= safeDistance) {
            z.stopped = true;
            z.stuck = false;
            z.x = targetPlant.c - safeDistance;
            const pos = cellPos(z.r, z.x);
            z.el.style.left = pos.x + "px";
          }
        }
        
        if (z.canAttack && z.type !== "thayma3" && z.type !== "thayma6" && z.type !== "thayma8") {
          const now = Date.now();
          const attackInterval = z.attackInterval || ZOMBIE_CONFIG.attackInterval;
          
          if (now - z.lastAttackTime > attackInterval) {
            if (targetPlant.type === "cay16" && targetPlant.config.action.explosionOnHit) {
              const now = Date.now();
              if (now - targetPlant.lastHitTime > 1000) {
                const pos = cellPos(targetPlant.r, targetPlant.c);
                createMineExplosionEffect(pos.x, pos.y);
                if (document.getElementById("boomSound")) {
                  document.getElementById("boomSound").play();
                }
                
                const explosionDamage = targetPlant.config.action.explosionDamage || 30;
                zombies.forEach(zombie => {
                  if (!(zombie.type === "thayma6" && zombie.config.immuneToExplosion) && 
                      !(zombie.type === "thayma8" && zombie.config.immuneToExplosion)) {
                    zombie.hp -= explosionDamage;
                    zombie.el.style.boxShadow = "0 0 10px orange";
                    setTimeout(() => {
                      if (zombie.el) zombie.el.style.boxShadow = "";
                    }, 300);
                  }
                });
                
                targetPlant.el.classList.add("hit");
                setTimeout(() => {
                  if (targetPlant.el) targetPlant.el.classList.remove("hit");
                }, 500);
                targetPlant.lastHitTime = now;
              }
            }
            
            if (targetPlant.type === "cay17") {
              applyGarlicEffect(z, targetPlant);
              targetPlant.el.classList.add("garlic-hit");
              setTimeout(() => {
                if (targetPlant.el) targetPlant.el.classList.remove("garlic-hit");
              }, 500);
              if (document.getElementById("garlicSound")) {
                document.getElementById("garlicSound").play();
              }
            }
            
            if (targetPlant.type === "cay18") {
              const config = targetPlant.config.action.defenseEffect;
              applyExtremeSlow(z, config.extremeSlowAmount, config.extremeSlowDuration);
              targetPlant.el.classList.add("hit");
              setTimeout(() => {
                if (targetPlant.el) targetPlant.el.classList.remove("hit");
              }, 500);
              if (document.getElementById("throwSound")) {
                document.getElementById("throwSound").play();
              }
            }
            
            if (targetPlant.type === "cay19") {
              // Cay19 nhận giảm 80% sát thương
              actualDamage *= (1 - targetPlant.config.action.damageReduction);
              
              // Khi cay19 bị tấn công, hồi máu cho toàn bộ cây
              plants.forEach(plant => {
                if (plant !== targetPlant) {
                  const oldHp = plant.hp;
                  plant.hp = Math.min(plant.maxHp, plant.hp + targetPlant.config.action.healOnHit);
                  plant.hpT.textContent = Math.ceil(plant.hp);
                  if (plant.hp > oldHp) {
                    const pos = cellPos(plant.r, plant.c);
                    createHellfireHealEffect(pos.x, pos.y);
                  }
                }
              });
              
              targetPlant.el.classList.add("hit");
              setTimeout(() => {
                if (targetPlant.el) targetPlant.el.classList.remove("hit");
              }, 500);
              
              if (document.getElementById("hellfireSound")) {
                document.getElementById("hellfireSound").play();
              }
            }
            
            targetPlant.hp -= actualDamage;
            targetPlant.hpT.textContent = Math.ceil(targetPlant.hp);
            z.lastAttackTime = now;
            
            if (z.type === "thayma7" && z.knockbackOnHit) {
              z.x += z.knockbackDistance || 1;
              const pos = cellPos(z.r, z.x);
              z.el.style.left = pos.x + "px";
              z.el.style.boxShadow = "0 0 15px red";
              setTimeout(() => {
                if (z.el) z.el.style.boxShadow = "";
              }, 300);
            }
            
            if (targetPlant.hp <= 0) {
              targetPlant.el.remove();
              plants = plants.filter(p => p !== targetPlant);
              z.attack = null;
              if (z.type === "thayma3") {
                z.stopped = false;
                z.stuck = false;
              }
            }
          }
        }
        
        if (z.canAttack || (z.type === "thayma3" && z.stopped) || (z.type === "thayma6" && z.hasStopped) || (z.type === "thayma8" && z.hasStopped)) {
          z.x = z.x;
        }
      }
    } else {
      if (!(z.type === "thayma3" && z.stopped) && !(z.type === "thayma6" && z.hasStopped) && !(z.type === "thayma8" && z.hasStopped)) {
        z.x -= z.speed * z.slow;
        const pos = cellPos(z.r, z.x);
        z.el.style.left = pos.x + "px";
        
        if (z.type === "thayma3") {
          z.stuck = false;
        }
      }
    }
    
    if (z.type === "thayma3" && z.stopped) {
      const currentTarget = plants.find(p => p.r === z.r && Math.abs(p.c - z.x) < 1.5);
      if (!currentTarget) {
        z.stopped = false;
        z.stuck = false;
      } else {
        z.stuck = false;
      }
    }
    
    if (z.type === "thayma6" && z.rangedAttack && z.hasStopped) {
      const now = Date.now();
      if (now - z.lastRangedAttack > z.rangedInterval) {
        const targetRow = Math.floor(Math.random() * 5);
        const bullet = document.createElement("div");
        bullet.className = "bullet red-boss-bullet";
        const pos = cellPos(targetRow, z.x);
        bullet.style.left = pos.x + "px";
        bullet.style.top = pos.y + "px";
        game.appendChild(bullet);
        bullets.push({ 
          r: targetRow, 
          x: z.x, 
          el: bullet, 
          power: z.rangedDamage,
          direction: -1,
          speed: 0.25,
          source: "zombie"
        });
        z.lastRangedAttack = now;
        if (document.getElementById("shootSound")) {
          document.getElementById("shootSound").play();
        }
      }
    }
    
    z.hpT.textContent = Math.ceil(z.hp);
  });

  applyBaronBuffToThayma7();

  plants.forEach(p => {
    const now = Date.now();
    const config = p.config;
    
    // Xử lý cây cay19
    if (p.type === "cay19") {
      // Tăng mana mỗi giây
      if (now - p.lastManaIncrease > 1000) {
        p.mana = Math.min(100, p.mana + config.action.manaPerSecond);
        p.manaFill.style.width = p.mana + "%";
        p.lastManaIncrease = now;
      }
      
      // Nếu đủ mana, cho mặt trời
      if (p.mana >= 100) {
        sun += config.action.sunPerMana;
        sunSpan.textContent = sun;
        p.mana = 0;
        p.manaFill.style.width = "0%";
        p.el.style.boxShadow = "0 0 30px gold";
        setTimeout(() => {
          if (p.el) p.el.style.boxShadow = "";
        }, 1000);
      }
    }
    
    if (p.type === "cay13") {
      if (now - p.lastHealTime > 1000) {
        p.hp = Math.min(p.maxHp, p.hp + (config.action.healPerSecond || 30));
        p.hpT.textContent = Math.ceil(p.hp);
        p.lastHealTime = now;
      }
    }
    
    if (p.type === "cay14") {
      if (now - p.lastSkillTime > (config.action.interval || 3000)) {
        let totalDamage = 0;
        const range = config.action.range || 1;
        zombies.forEach(z => {
          if (Math.abs(z.r - p.r) <= range && Math.abs(z.x - p.c) <= range) {
            z.hp -= config.action.damage;
            totalDamage += config.action.damage;
            z.el.style.boxShadow = "0 0 10px red";
            setTimeout(() => {
              if (z.el) z.el.style.boxShadow = "";
            }, 500);
          }
        });
        if (totalDamage > 0) {
          const healAmount = totalDamage * config.action.healMultiplier;
          plants.forEach(plant => {
            if (plant !== p) {
              const oldHp = plant.hp;
              plant.hp = Math.min(plant.maxHp || plant.hp, plant.hp + healAmount);
              plant.hpT.textContent = Math.ceil(plant.hp);
              if (plant.hp > oldHp) {
                const pos = cellPos(plant.r, plant.c);
                createHealEffect(pos.x, pos.y);
              }
            }
          });
          p.el.style.boxShadow = "0 0 20px gold";
          setTimeout(() => {
            if (p.el) p.el.style.boxShadow = "";
          }, 1000);
        }
        p.lastSkillTime = now;
      }
    }
    
    if (p.type === "cay16") {
      if (now - p.lastHealTime > 1000) {
        plants.forEach(plant => {
          if (plant !== p) {
            const oldHp = plant.hp;
            plant.hp = Math.min(plant.maxHp || plant.hp, plant.hp + (config.action.healPerSecond || 1));
            plant.hpT.textContent = Math.ceil(plant.hp);
            if (plant.hp > oldHp && Math.random() < 0.1) {
              const pos = cellPos(plant.r, plant.c);
              createHealEffect(pos.x, pos.y);
            }
          }
        });
        p.lastHealTime = now;
      }
    }
    
    if (p.type === "cay17") {
      if (now - p.lastAction > (config.action.interval || 2000)) {
        const bulletConfig = config.action.bullet;
        const b = document.createElement("div");
        b.className = "bullet " + bulletConfig.color;
        const pos = cellPos(p.r, p.c);
        b.style.left = (pos.x + 15) + "px";
        b.style.top = pos.y + "px";
        game.appendChild(b);
        bullets.push({
          r: p.r,
          x: p.c,
          el: b,
          power: bulletConfig.power,
          knock: bulletConfig.knock || false,
          knockDistance: bulletConfig.knockDistance || 0.5,
          direction: 1,
          enhanced: false,
          enhancedBy: [],
          maxRange: bulletConfig.range || 2,
          startX: p.c,
          source: "garlic",
          isProcessed: false
        });
        p.lastAction = now;
        if (document.getElementById("shootSound")) {
          document.getElementById("shootSound").play();
        }
        createGarlicTrail(pos.x + 15, pos.y);
      }
    }
    
    if (p.type === "cay18") {
      if (now - p.lastAction > (config.action.interval || 3000)) {
        const bulletConfig = config.action.bullet;
        let targetZombie = null;
        let minDistance = Infinity;
        zombies.forEach(z => {
          if (z.r === p.r) {
            const distance = z.x - p.c;
            if (distance > 0 && distance < minDistance) {
              minDistance = distance;
              targetZombie = z;
            }
          }
        });
        if (!targetZombie && zombies.length > 0) {
          zombies.forEach(z => {
            const distance = Math.sqrt(Math.pow(z.r - p.r, 2) + Math.pow(z.x - p.c, 2));
            if (distance < minDistance) {
              minDistance = distance;
              targetZombie = z;
            }
          });
        }
        if (targetZombie) {
          const bullet = document.createElement("div");
          bullet.className = "bullet cay18-bullet";
          const startPos = cellPos(p.r, p.c);
          bullet.style.left = startPos.x + "px";
          bullet.style.top = startPos.y + "px";
          bullet.style.zIndex = "950";
          game.appendChild(bullet);
          const targetPos = cellPos(targetZombie.r, targetZombie.x);
          const startTime = Date.now();
          const duration = 1500;
          const throwHeight = bulletConfig.throwHeight || 60;
          const controlY = Math.min(startPos.y, targetPos.y) - throwHeight;
          const bulletObj = {
            el: bullet,
            startX: startPos.x,
            startY: startPos.y,
            targetX: targetPos.x,
            targetY: targetPos.y,
            controlY: controlY,
            startTime: startTime,
            duration: duration,
            mainDamage: bulletConfig.mainDamage,
            bounceDamage: bulletConfig.bounceDamage,
            bounceCount: bulletConfig.bounceCount,
            target: targetZombie,
            plant: p,
            isThrown: true,
            hasHit: false,
            bouncesCreated: 0,
            isProcessed: false
          };
          bullets.push(bulletObj);
          createThrowEffect(startPos.x, startPos.y);
          if (document.getElementById("throwSound")) {
            document.getElementById("throwSound").play();
          }
          p.lastAction = now;
        }
      }
    }
    
    if (p.type === "cay15") {
      if (now - p.lastAction > (config.action.interval || 800)) {
        const bulletConfig = config.action.bullet;
        const b = document.createElement("div");
        b.className = "bullet " + bulletConfig.color;
        const pos = cellPos(p.r, p.c);
        b.style.left = (pos.x + 15) + "px";
        b.style.top = pos.y + "px";
        game.appendChild(b);
        bullets.push({
          r: p.r,
          x: p.c,
          el: b,
          power: bulletConfig.power,
          knock: bulletConfig.knock || false,
          direction: 1,
          enhanced: false,
          enhancedBy: [],
          isProcessed: false
        });
        p.lastAction = now;
        if (document.getElementById("shootSound")) {
          document.getElementById("shootSound").play();
        }
      }
    }
    
    if (!config.action) return;
    if (p.cooldown) return;
    
    if (config.action.type === "sunProducer") {
      if (now - p.lastAction > config.action.interval) {
        sun += config.action.amount;
        sunSpan.textContent = sun;
        p.lastAction = now;
      }
    }
    
    if (config.action.type === "shooter") {
      if (now - p.lastAction > config.action.interval) {
        fireWithMana(p, () => {
          const bulletConfig = config.action.bullet;
          if (config.action.cost && sun >= config.action.cost) {
            sun -= config.action.cost;
            sunSpan.textContent = sun;
          }
          shoot(p, bulletConfig.count, bulletConfig.color, bulletConfig.power, 
                bulletConfig.freeze || false, bulletConfig.knock || false);
        });
      }
    }
  });

  // Xử lý đạn bay qua cây cay19 để tăng sát thương
  const cay19Plants = plants.filter(p => p.type === "cay19");
  bullets.forEach((b, index) => {
    if (b.isProcessed) return;
    
    // Kiểm tra nếu đạn bay qua cây cay19
    cay19Plants.forEach(cay19 => {
      if (b.r === cay19.r && Math.abs(b.x - cay19.c) < 0.5 && b.direction === 1) {
        if (!b.hellfireEnhanced) {
          b.hellfireEnhanced = true;
          b.power += cay19.config.action.bulletEnhanceDamage;
          b.el.classList.add("hellfire-enhanced");
          
          // Phát âm thanh lửa địa ngục
          if (document.getElementById("hellfireSound")) {
            document.getElementById("hellfireSound").play();
          }
          
          // Hiệu ứng đặc biệt
          cay19.el.style.boxShadow = "0 0 40px #FF0000";
          setTimeout(() => {
            if (cay19.el) cay19.el.style.boxShadow = "";
          }, 500);
        }
      }
    });
    
    if (b.direction === 1 && !b.source) {
      plants.forEach(p => {
        if (p.type === "cay12" && p.r === b.r && Math.abs(b.x - p.c) < 0.5) {
          const plantId = `${p.r}-${p.c}`;
          if (!b.enhancedBy) b.enhancedBy = [];
          if (!b.enhancedBy.includes(plantId)) {
            b.power *= 3;
            const currentWidth = parseInt(b.el.style.width) || 10;
            const currentHeight = parseInt(b.el.style.height) || 10;
            b.el.style.width = (currentWidth * 2) + "px";
            b.el.style.height = (currentHeight * 2) + "px";
            b.el.className += " enhanced";
            b.enhanced = true;
            b.enhancedBy.push(plantId);
          }
        }
      });
    }
    
    if (b.source === "garlic" && b.maxRange) {
      const distanceTraveled = b.x - b.startX;
      if (distanceTraveled >= b.maxRange) {
        if (b.el && b.el.parentNode) b.el.remove();
        bullets.splice(index, 1);
        return;
      }
    }
    
    if (b.isThrown && !b.hasHit) {
      const elapsed = Date.now() - b.startTime;
      const progress = Math.min(elapsed / b.duration, 1);
      const x = (1 - progress) * (1 - progress) * b.startX + 
                2 * (1 - progress) * progress * ((b.startX + b.targetX) / 2) + 
                progress * progress * b.targetX;
      const y = (1 - progress) * (1 - progress) * b.startY + 
                2 * (1 - progress) * progress * b.controlY + 
                progress * progress * b.targetY;
      b.el.style.left = x + "px";
      b.el.style.top = y + "px";
      if (progress >= 0.95 && b.target && !b.hasHit) {
        b.hasHit = true;
        b.isProcessed = true;
        b.target.hp -= b.mainDamage;
        applyPermanentSlow(b.target, b.plant.config.action.bullet.slowAmount, 
                          b.plant.config.action.bullet.maxSlow);
        if (b.bouncesCreated < b.bounceCount) {
          const targetPos = cellPos(b.target.r, b.target.x);
          for (let i = 0; i < b.bounceCount; i++) {
            setTimeout(() => {
              createBounceBullet(targetPos.x, targetPos.y, b.target, b.bounceDamage, b.plant);
            }, i * 200);
          }
          b.bouncesCreated = b.bounceCount;
        }
        setTimeout(() => {
          if (b.el && b.el.parentNode) b.el.remove();
          const bulletIndex = bullets.findIndex(bullet => bullet === b);
          if (bulletIndex !== -1) bullets.splice(bulletIndex, 1);
        }, 100);
        return;
      }
      if (progress >= 1) {
        b.isProcessed = true;
        if (b.el && b.el.parentNode) b.el.remove();
        bullets.splice(index, 1);
      }
      return;
    }
    
    if (b.isBounce && !b.hasHit) {
      const elapsed = Date.now() - b.startTime;
      const progress = Math.min(elapsed / b.duration, 1);
      const x = (1 - progress) * (1 - progress) * b.startX + 
                2 * (1 - progress) * progress * ((b.startX + b.targetX) / 2) + 
                progress * progress * b.targetX;
      const y = (1 - progress) * (1 - progress) * b.startY + 
                2 * (1 - progress) * progress * b.controlY + 
                progress * progress * b.targetY;
      b.el.style.left = x + "px";
      b.el.style.top = y + "px";
      if (progress >= 0.95 && b.target && !b.hasHit) {
        b.hasHit = true;
        b.isProcessed = true;
        b.target.hp -= b.damage;
        applyPermanentSlow(b.target, b.plant.config.action.bullet.slowAmount, 
                          b.plant.config.action.bullet.maxSlow);
        setTimeout(() => {
          if (b.el && b.el.parentNode) b.el.remove();
          const bulletIndex = bullets.findIndex(bullet => bullet === b);
          if (bulletIndex !== -1) bullets.splice(bulletIndex, 1);
        }, 100);
        return;
      }
      if (progress >= 1) {
        b.isProcessed = true;
        if (b.el && b.el.parentNode) b.el.remove();
        bullets.splice(index, 1);
      }
      return;
    }
    
    if (b.direction === -1) {
      b.x -= b.speed || 0.25;
      const pos = cellPos(b.r, b.x);
      b.el.style.left = pos.x + "px";
      let reflected = false;
      plants.forEach(p => {
        if (p.type === "cay11" && p.r === b.r && Math.abs(b.x - p.c) < 0.5 && !reflected) {
          p.hp -= 1;
          p.hpT.textContent = Math.ceil(p.hp);
          p.reflectionCount++;
          const newBullet = document.createElement("div");
          newBullet.className = b.el.className;
          const pos = cellPos(p.r, p.c);
          newBullet.style.left = pos.x + "px";
          newBullet.style.top = pos.y + "px";
          game.appendChild(newBullet);
          bullets.push({
            r: p.r,
            x: p.c,
            el: newBullet,
            power: b.power,
            direction: 1,
            speed: 0.2,
            source: "reflected",
            enhanced: b.enhanced,
            enhancedBy: b.enhancedBy ? [...b.enhancedBy] : [],
            isProcessed: false
          });
          reflected = true;
          if (b.el && b.el.parentNode) b.el.remove();
          bullets.splice(index, 1);
          if (p.hp <= 0) {
            sun += 1000;
            sunSpan.textContent = sun;
            p.el.remove();
            plants = plants.filter(pl => pl !== p);
          }
          return;
        }
      });
      if (!reflected) {
        let hitPlant = false;
        plants.forEach(p => {
          if (p.r === b.r && Math.abs(b.x - p.c) < 0.5 && !hitPlant && p.type !== "cay11") {
            p.hp -= b.power;
            p.hpT.textContent = Math.ceil(p.hp);
            hitPlant = true;
            if (p.hp <= 0) {
              p.el.remove();
              plants = plants.filter(pl => pl !== p);
            }
          }
        });
        if (hitPlant || b.x < 0) {
          if (b.el && b.el.parentNode) b.el.remove();
          bullets.splice(index, 1);
        }
      }
    } else {
      b.x += 0.2;
      const pos = cellPos(b.r, b.x);
      b.el.style.left = pos.x + "px";
      if (b.source === "garlic" && Math.random() < 0.3) {
        createGarlicTrail(pos.x, pos.y);
      }
      if (b.x > cols) {
        if (b.el && b.el.parentNode) b.el.remove();
        bullets.splice(index, 1);
      }
    }
  });

  bullets.forEach((b, index) => {
    if (b.isProcessed) return;
    if (b.direction === 1 && !b.isThrown && !b.isBounce) {
      let hitZombie = false;
      zombies.forEach(z => {
        if (z.type === "thayma5" || z.type === "thayma6" || z.type === "thayma7" || z.type === "thayma8") {
          let hitRange = (z.type === "purple" ? 1.2 : 0.3);
          if (z.r === b.r && Math.abs(z.x - b.x) < hitRange) {
            z.hp -= b.power;
            hitZombie = true;
          }
        } else {
          let hitRange = (z.type === "purple" ? 1.2 : 0.3);
          if (z.r === b.r && Math.abs(z.x - b.x) < hitRange) {
            if (z.type === "thayma3" && z.stuck) {
              z.stuck = false;
            }
            z.hp -= b.power;
            if (b.knockDistance && b.knock) {
              if (!z.immuneToKnockback) {
                z.x += b.knockDistance || 0.5;
                const pos = cellPos(z.r, z.x);
                z.el.style.left = pos.x + "px";
              }
            } else if (b.knock) {
              if (!z.immuneToKnockback) {
                z.x += 0.2;
              }
            }
            if (b.freeze && !z.frozen) { 
              if (!z.immuneToControl) {
                z.slow = Math.max(0.01, z.slow - 0.1); 
                z.frozen = true; 
              }
            }
            hitZombie = true;
          }
        }
      });
      if (hitZombie) {
        b.isProcessed = true;
        if (b.el && b.el.parentNode) b.el.remove();
        bullets.splice(index, 1);
      }
    }
  });

  zombies = zombies.filter(z => {
    if (z.hp <= 0) {
      if (document.getElementById("dieSound")) {
        document.getElementById("dieSound").play();
      }
      const config = ZOMBIE_CONFIG.zombies[z.type];
      
      // Kiểm tra nếu là thayma7 (Sứ giả khe nứt)
      if (z.type === "thayma7") {
        thayma7Kills++;
        if (thayma7Kills >= 1 && !cay19Unlocked) {
          cay19Unlocked = true;
          updateCay19ShopItem();
          alert("✨ ĐÃ MỞ KHÓA: Óc chó địa ngục sinh đôi! ✨\nĐã tiêu diệt Sứ giả khe nứt!");
        }
      }
      
      if (z.type === "thayma4" && z.explosionOnDeath) {
        if (document.getElementById("boomSound")) {
          document.getElementById("boomSound").play();
        }
        zombies.forEach(otherZombie => {
          if (otherZombie.r === z.r && otherZombie !== z) {
            otherZombie.hp = 0;
          }
        });
      }
      
      if (z.type === "thayma6" && z.winOnKill && z.hp <= 0) {
        setTimeout(() => {
          alert("🎉 BẠN ĐÃ CHIẾN THẮNG! ĐÃ TIÊU DIỆT THÂY MA TỐI THƯỢNG! 🎉\nTổng điểm: " + score);
          location.reload();
        }, 100);
      }
      
      if (z.type === "thayma8") {
        thayma8Count--;
        if (z.spawnsThayma7OnDeath) {
          spawnSuperThayma7OnBaronDeath(z);
        }
        thayma7Buffed = false;
      }
      
      sun += config.sunReward;
      score += config.scoreReward;
      sunSpan.textContent = sun;
      scoreSpan.textContent = score;
      
      if (z.type === "red") {
        redKills++;
        if (redKills >= 20) spawnBoss();
      }
      
      z.el.remove();
      return false;
    }
    if (z.x <= 0) {
      alert("💀 Zombie đã vào nhà! Game over! Tổng điểm: " + score);
      location.reload();
      return false;
    }
    return true;
  });

  plants = plants.filter(p => {
    if (p.hp <= 0) {
      if (p.type === "cay11") {
        sun += 1000;
        sunSpan.textContent = sun;
      }
      p.el.remove();
      return false;
    }
    return true;
  });

  bullets = bullets.filter(b => {
    if (b.isProcessed) return false;
    if (b.isThrown || b.isBounce) return true;
    return b.x < cols && b.x > -5;
  });
}

function fireWithMana(p, action) {
  if (p.cooldown) return;
  action();
  p.lastAction = Date.now();
  p.mana = Math.min(100, p.mana + 25);
  p.manaFill.style.width = p.mana + "%";
  if (p.mana >= 100) {
    p.cooldown = true;
    setTimeout(() => {
      p.mana = 0;
      p.manaFill.style.width = "0%";
      p.cooldown = false;
    }, 5000);
  }
}

function shoot(p, count, color, power, freeze, knock) {
  if (paused || !gameStarted) return;
  if (document.getElementById("shootSound")) {
    document.getElementById("shootSound").play();
  }
  for (let i = 0; i < count; i++) {
    const b = document.createElement("div");
    b.className = "bullet " + color;
    const pos = cellPos(p.r, p.c);
    b.style.left = (pos.x + 15 + i * 5) + "px";
    b.style.top = pos.y + "px";
    game.appendChild(b);
    bullets.push({
      r: p.r,
      x: p.c,
      el: b,
      power,
      freeze,
      knock,
      direction: 1,
      enhanced: false,
      enhancedBy: [],
      isProcessed: false
    });
  }
}

// =============== KHỞI ĐỘNG GAME ===============
setInterval(update, 50);

// Cập nhật trạng thái cây 19 ban đầu
updateCay19ShopItem();