(() => {
  // js/core/config.js
  var CFG = Object.freeze({
    COLS: 20,
    ROWS: 20,
    CELL: 18,
    BG: "#f4f1ec",
    FG: "#111110",
    MUTED: "#a8a49d",
    GRID: "rgba(17,17,16,0.04)",
    SPEED_MIN: 50,
    SPEED_MAX: 200,
    COMBO_WINDOW: 2200,
    COMBO_MAX: 8,
    POWERUP_CHANCE: 0.1,
    POWERUP_MIN_SCORE: 3,
    PARTICLE_MAX: 120,
    STORAGE_KEY: "snake_v2_",
    PORTAL_MODE_SCORE: 500
  });
  var MODES = Object.freeze({
    classic: { id: "classic", label: "Cl\xE1ssico", baseSpeed: 145, speedUp: 3, wrap: false, desc: "Morra nas paredes" },
    wrap: { id: "wrap", label: "Portal", baseSpeed: 130, speedUp: 2, wrap: true, desc: "Atravesse as paredes" },
    speed: { id: "speed", label: "Veloz", baseSpeed: 80, speedUp: 6, wrap: false, desc: "Bem mais r\xE1pido" },
    challenge: { id: "challenge", label: "Desafio", baseSpeed: 140, speedUp: 2, wrap: false, desc: "Fases com obst\xE1culos" }
  });
  var FOOD_TYPES = Object.freeze([
    { type: "cherry", weight: 30, pts: 20, shape: "cherry", r: 4, ttl: null, trail: false, label: "Cereja", color: "#e63950" },
    { type: "apple", weight: 25, pts: 50, shape: "apple", r: 5, ttl: null, trail: false, label: "Ma\xE7\xE3", color: "#34c759" },
    { type: "cake", weight: 15, pts: 100, shape: "cake", r: 5, ttl: 9e3, trail: false, label: "Bolo", color: "#ff9f0a" },
    { type: "grape", weight: 10, pts: 200, shape: "grape", r: 5, ttl: 7e3, trail: true, label: "Uva", color: "#9b59b6" },
    { type: "chocolate", weight: 12, pts: 30, shape: "chocolate", r: 4, ttl: null, trail: false, label: "Chocolate", color: "#7c4a1e" },
    { type: "mouse", weight: 4, pts: 350, shape: "mouse", r: 6, ttl: 5e3, trail: true, label: "Ratinho", color: "#b0a09a" },
    { type: "human", weight: 4, pts: 250, shape: "human", r: 6, ttl: 6e3, trail: true, label: "Humano", color: "#ffcc00" }
  ]);
  var POWERUP_TYPES = Object.freeze([
    { kind: "slow", label: "S", duration: 7e3, desc: "Reduz velocidade por 7s", color: "#5e5ce6" },
    { kind: "ghost", label: "G", duration: 5e3, desc: "Atravessa o pr\xF3prio corpo", color: "#bf5af2" },
    { kind: "magnet", label: "M", duration: 6e3, desc: "Atrai comida pr\xF3xima", color: "#ff9f0a" },
    { kind: "x2", label: "\xD72", duration: 8e3, desc: "Dobra pontos por 8s", color: "#ff2d55" },
    { kind: "shrink", label: "><", duration: 0, desc: "Reduz o corpo pela metade", color: "#30b0c0" },
    { kind: "time_warp", label: "T", duration: 0, desc: "+15s no timer", color: "#ff6482" },
    { kind: "portal_mode", label: "\u2B21", duration: 2e4, desc: "Atravessa paredes por 20s", color: "#00d2ff" },
    { kind: "slow_shrink", label: "\xBDS", duration: 0, desc: "Slow + metade do corpo [500pts]", color: "#ff6b35", forced: true },
    // ── 4 novos poderes ──────────────────────────────────────────
    { kind: "freeze", label: "\u2744", duration: 4e3, desc: "Comidas ficam paradas 4s", color: "#7dd3fc" },
    { kind: "shield", label: "\u{1F6E1}", duration: 6e3, desc: "Ignora 1 colis\xE3o fatal", color: "#fde68a" },
    { kind: "x3", label: "\xD73", duration: 5e3, desc: "Triplo de pontos por 5s", color: "#f43f5e" },
    { kind: "dash", label: "\u25B6\u25B6", duration: 3e3, desc: "Velocidade 2\xD7 por 3s", color: "#34d399" }
  ]);
  function hLine(y, x1, x2) {
    const c = [];
    for (let x = x1; x <= x2; x++) c.push({ x, y });
    return c;
  }
  function vLine(x, y1, y2) {
    const c = [];
    for (let y = y1; y <= y2; y++) c.push({ x, y });
    return c;
  }
  function rect(x, y, w, h) {
    const c = [];
    for (let i = x; i < x + w; i++) {
      c.push({ x: i, y });
      c.push({ x: i, y: y + h - 1 });
    }
    for (let j = y + 1; j < y + h - 1; j++) {
      c.push({ x, y: j });
      c.push({ x: x + w - 1, y: j });
    }
    return c;
  }
  function cross(cx, cy, arm) {
    const c = [];
    for (let i = -arm; i <= arm; i++) {
      c.push({ x: cx + i, y: cy });
      c.push({ x: cx, y: cy + i });
    }
    return c;
  }
  function scatter(pairs) {
    return pairs.map(([x, y]) => ({ x, y })).filter((p) => p.x >= 0 && p.x < 20 && p.y >= 0 && p.y < 20);
  }
  function diamond(cx, cy, r) {
    const c = [];
    for (let dx = -r; dx <= r; dx++) {
      const dy = r - Math.abs(dx);
      c.push({ x: cx + dx, y: cy + dy });
      if (dy !== 0) c.push({ x: cx + dx, y: cy - dy });
    }
    return c;
  }
  function ring(cx, cy, r) {
    const c = [];
    const seen = /* @__PURE__ */ new Set();
    for (let a = 0; a < 360; a += 8) {
      const x = Math.round(cx + r * Math.cos(a * Math.PI / 180)), y = Math.round(cy + r * Math.sin(a * Math.PI / 180)), k = `${x},${y}`;
      if (!seen.has(k) && x >= 0 && x < 20 && y >= 0 && y < 20) {
        seen.add(k);
        c.push({ x, y });
      }
    }
    return c;
  }
  function comb(y, x1, x2, step) {
    const c = [...hLine(y, x1, x2)];
    for (let x = x1; x <= x2; x += step) c.push({ x, y: y + 1 }, { x, y: y + 2 });
    return c;
  }
  var LEVELS = Object.freeze([
    { id: 1, label: "Campo Aberto", target: 5, timeLimit: null, bonus: 10, speedOverride: 170, walls: [], message: "Bem-vindo. Come 5 para avan\xE7ar." },
    { id: 2, label: "Colunas", target: 8, timeLimit: null, bonus: 15, speedOverride: 160, walls: [...vLine(5, 3, 8), ...vLine(14, 11, 16)], message: "Desvie das colunas." },
    { id: 3, label: "Cruz", target: 10, timeLimit: null, bonus: 20, speedOverride: 155, walls: [...cross(10, 10, 3)], message: "Cruz no centro." },
    { id: 4, label: "Corredores", target: 12, timeLimit: 5e4, bonus: 25, speedOverride: 150, walls: [...hLine(6, 1, 12), ...hLine(13, 7, 18)], message: "50s. Dois corredores." },
    { id: 5, label: "Dupla Cruz", target: 14, timeLimit: null, bonus: 30, speedOverride: 148, walls: [...cross(6, 6, 2), ...cross(14, 14, 2)], message: "Duas cruzes." },
    { id: 6, label: "Caixas", target: 14, timeLimit: null, bonus: 35, speedOverride: 145, walls: [...rect(2, 2, 5, 5), ...rect(13, 2, 5, 5), ...rect(2, 13, 5, 5), ...rect(13, 13, 5, 5)], message: "Quatro caixas." },
    { id: 7, label: "Labirinto I", target: 16, timeLimit: null, bonus: 40, speedOverride: 140, walls: [...hLine(4, 2, 8), ...hLine(4, 12, 17), ...vLine(9, 4, 9), ...vLine(10, 10, 15), ...hLine(15, 3, 9), ...hLine(15, 11, 17)], message: "Labirinto simples." },
    { id: 8, label: "Espiral", target: 18, timeLimit: 65e3, bonus: 50, speedOverride: 135, walls: [...hLine(3, 3, 16), ...vLine(16, 3, 16), ...hLine(16, 3, 16), ...vLine(3, 4, 15), ...hLine(6, 6, 13), ...vLine(13, 6, 13), ...hLine(13, 6, 12)], message: "65s. Espiral." },
    { id: 9, label: "Xadrez", target: 20, timeLimit: null, bonus: 55, speedOverride: 130, walls: scatter([[3, 3], [3, 7], [3, 11], [3, 15], [7, 1], [7, 5], [7, 9], [7, 13], [7, 17], [11, 3], [11, 7], [11, 11], [11, 15], [15, 1], [15, 5], [15, 9], [15, 13], [15, 17], [19, 3], [19, 7], [19, 11], [19, 15]]), message: "Padr\xE3o xadrez." },
    { id: 10, label: "Diamante", target: 20, timeLimit: null, bonus: 60, speedOverride: 128, walls: [...diamond(10, 10, 5)], message: "Diamante central." },
    { id: 11, label: "Pente", target: 22, timeLimit: 7e4, bonus: 65, speedOverride: 125, walls: [...comb(4, 2, 16, 2), ...comb(14, 2, 16, 2).map((w) => ({ x: w.x, y: 19 - w.y }))], message: "70s. Pentes duplos." },
    { id: 12, label: "Labirinto II", target: 22, timeLimit: 75e3, bonus: 70, speedOverride: 120, walls: [...vLine(5, 2, 12), ...hLine(7, 5, 14), ...vLine(14, 7, 17), ...hLine(12, 5, 14), ...vLine(9, 2, 6), ...vLine(9, 12, 17)], message: "75s. Labirinto denso." },
    { id: 13, label: "Anel", target: 24, timeLimit: null, bonus: 75, speedOverride: 118, walls: [...ring(10, 10, 7)], message: "Anel externo." },
    { id: 14, label: "Dois An\xE9is", target: 24, timeLimit: 8e4, bonus: 80, speedOverride: 115, walls: [...ring(5, 5, 4), ...ring(15, 15, 4)], message: "80s. Dois an\xE9is." },
    { id: 15, label: "Cruz Dupla", target: 26, timeLimit: null, bonus: 85, speedOverride: 112, walls: [...cross(5, 10, 3), ...cross(15, 10, 3), ...vLine(10, 2, 8), ...vLine(10, 12, 17)], message: "Cruzes laterais." },
    { id: 16, label: "Pris\xE3o", target: 26, timeLimit: 85e3, bonus: 90, speedOverride: 110, walls: [...rect(1, 1, 18, 18), ...hLine(10, 3, 8), ...hLine(10, 12, 16)], message: "85s. Corra nas bordas." },
    { id: 17, label: "Osso", target: 28, timeLimit: null, bonus: 95, speedOverride: 107, walls: [...hLine(5, 2, 8), ...hLine(5, 12, 17), ...hLine(14, 2, 8), ...hLine(14, 12, 17), ...vLine(2, 5, 14), ...vLine(17, 5, 14)], message: "Osso." },
    { id: 18, label: "Labirinto III", target: 28, timeLimit: 9e4, bonus: 100, speedOverride: 104, walls: [...hLine(2, 0, 18), ...hLine(17, 1, 19), ...vLine(0, 2, 16), ...vLine(19, 2, 17), ...vLine(5, 2, 12), ...hLine(7, 5, 14), ...vLine(14, 7, 17), ...hLine(12, 5, 14)], message: "90s." },
    { id: 19, label: "Espinha", target: 30, timeLimit: null, bonus: 105, speedOverride: 101, walls: [...vLine(10, 2, 17), ...hLine(5, 3, 9), ...hLine(8, 11, 16), ...hLine(12, 3, 9), ...hLine(15, 11, 16)], message: "Espinha de peixe." },
    { id: 20, label: "T\xFAnel", target: 30, timeLimit: 95e3, bonus: 110, speedOverride: 98, walls: [...hLine(7, 0, 7), ...hLine(7, 13, 19), ...hLine(12, 0, 7), ...hLine(12, 13, 19)], message: "95s. T\xFAnel." },
    { id: 21, label: "Grade", target: 32, timeLimit: null, bonus: 115, speedOverride: 95, walls: scatter([[5, 5], [5, 10], [5, 15], [10, 5], [10, 15], [15, 5], [15, 10], [15, 15]]), message: "Grade esparsa." },
    { id: 22, label: "Tridente", target: 32, timeLimit: 1e5, bonus: 120, speedOverride: 92, walls: [...vLine(10, 3, 16), ...hLine(10, 3, 8), ...hLine(10, 12, 16), ...vLine(5, 3, 9), ...vLine(15, 3, 9)], message: "100s. Tridente." },
    { id: 23, label: "Labirinto IV", target: 34, timeLimit: null, bonus: 125, speedOverride: 89, walls: [...rect(3, 3, 14, 14), ...hLine(3, 5, 9), ...hLine(3, 11, 16), ...vLine(3, 5, 9), ...vLine(16, 5, 9), ...vLine(16, 11, 16), ...vLine(3, 11, 16)], message: "Labirinto IV." },
    { id: 24, label: "Flecha", target: 34, timeLimit: 105e3, bonus: 130, speedOverride: 86, walls: [...vLine(10, 3, 17), ...scatter([[8, 5], [9, 4], [11, 4], [12, 5], [7, 6], [13, 6]])], message: "105s. Flecha." },
    { id: 25, label: "Pontes", target: 36, timeLimit: null, bonus: 135, speedOverride: 83, walls: [...hLine(6, 0, 7), ...hLine(6, 13, 19), ...hLine(13, 0, 7), ...hLine(13, 13, 19), ...vLine(6, 0, 7), ...vLine(6, 13, 19), ...vLine(13, 0, 7), ...vLine(13, 13, 19)], message: "Pontes." },
    { id: 26, label: "Labirinto V", target: 36, timeLimit: 11e4, bonus: 140, speedOverride: 80, walls: [...vLine(4, 2, 10), ...vLine(4, 14, 18), ...vLine(8, 4, 14), ...vLine(12, 2, 10), ...vLine(12, 14, 18), ...vLine(16, 4, 14), ...hLine(2, 4, 12), ...hLine(18, 4, 16)], message: "110s. Labirinto V." },
    { id: 27, label: "Teia", target: 38, timeLimit: null, bonus: 145, speedOverride: 77, walls: [...diamond(10, 10, 7), ...cross(10, 10, 3)], message: "Teia de aranha." },
    { id: 28, label: "Zigzag", target: 38, timeLimit: 115e3, bonus: 150, speedOverride: 74, walls: [...hLine(4, 0, 8), ...hLine(7, 5, 13), ...hLine(10, 8, 15), ...hLine(13, 5, 13), ...hLine(16, 0, 8)], message: "115s. Zigzag." },
    { id: 29, label: "Armadilha", target: 40, timeLimit: null, bonus: 155, speedOverride: 71, walls: [...rect(4, 4, 12, 12), ...rect(7, 7, 6, 6), ...hLine(10, 4, 7), ...hLine(10, 13, 16), ...vLine(10, 4, 7), ...vLine(10, 13, 16)], message: "Armadilha dupla." },
    { id: 30, label: "Pesadelo I", target: 40, timeLimit: 12e4, bonus: 160, speedOverride: 68, walls: [...rect(1, 1, 18, 18), ...cross(10, 10, 4), ...hLine(5, 4, 8), ...hLine(5, 12, 15), ...hLine(14, 4, 8), ...hLine(14, 12, 15)], message: "120s. Pesadelo I." },
    { id: 31, label: "Espiral II", target: 42, timeLimit: null, bonus: 165, speedOverride: 65, walls: [...hLine(2, 2, 17), ...vLine(17, 2, 17), ...hLine(17, 2, 17), ...vLine(2, 3, 16), ...hLine(5, 5, 14), ...vLine(14, 5, 14), ...hLine(14, 5, 13), ...vLine(5, 6, 13)], message: "Espiral II." },
    { id: 32, label: "C\xE9lula", target: 42, timeLimit: 125e3, bonus: 170, speedOverride: 62, walls: [...ring(10, 10, 8), ...ring(10, 10, 4), ...vLine(10, 6, 8)], message: "125s. C\xE9lula." },
    { id: 33, label: "Labirinto VI", target: 44, timeLimit: null, bonus: 175, speedOverride: 59, walls: [...hLine(3, 0, 15), ...hLine(6, 4, 19), ...hLine(9, 0, 15), ...hLine(12, 4, 19), ...hLine(15, 0, 15), ...hLine(18, 4, 19)], message: "Labirinto VI." },
    { id: 34, label: "Tesouro", target: 44, timeLimit: 13e4, bonus: 180, speedOverride: 56, walls: [...rect(0, 0, 20, 20), ...rect(4, 4, 12, 12), ...scatter([[4, 10], [15, 10], [10, 4], [10, 15]])], message: "130s. Tesouro." },
    { id: 35, label: "Pesadelo II", target: 46, timeLimit: null, bonus: 185, speedOverride: 53, walls: [...cross(10, 10, 6), ...diamond(10, 10, 4), ...ring(10, 10, 8)], message: "Pesadelo II." },
    { id: 36, label: "Caos I", target: 46, timeLimit: 135e3, bonus: 190, speedOverride: 50, walls: [...vLine(3, 0, 9), ...vLine(3, 11, 19), ...vLine(7, 0, 4), ...vLine(7, 6, 14), ...vLine(11, 4, 9), ...vLine(11, 11, 19), ...vLine(15, 0, 8), ...vLine(15, 10, 14)], message: "135s. Caos I." },
    { id: 37, label: "DNA", target: 48, timeLimit: null, bonus: 195, speedOverride: 48, walls: scatter([[2, 0], [4, 1], [6, 2], [8, 1], [10, 0], [12, 1], [14, 2], [16, 1], [18, 0], [2, 4], [4, 3], [6, 4], [8, 5], [10, 4], [12, 3], [14, 4], [16, 5], [18, 4], [2, 8], [4, 9], [6, 8], [8, 7], [10, 8], [12, 9], [14, 8], [16, 7], [18, 8], [2, 12], [4, 11], [6, 12], [8, 13], [10, 12], [12, 11], [14, 12], [16, 13], [18, 12], [2, 16], [4, 17], [6, 16], [8, 15], [10, 16], [12, 17], [14, 16], [16, 15], [18, 16]]), message: "Estrutura DNA." },
    { id: 38, label: "Labirinto VII", target: 48, timeLimit: 14e4, bonus: 200, speedOverride: 46, walls: [...hLine(1, 0, 18), ...hLine(3, 1, 8), ...hLine(3, 10, 18), ...vLine(9, 3, 8), ...hLine(8, 1, 8), ...vLine(1, 3, 7), ...hLine(5, 3, 7), ...vLine(5, 5, 7), ...hLine(7, 5, 8), ...vLine(12, 3, 8), ...hLine(5, 12, 18), ...vLine(18, 1, 4)], message: "140s. Labirinto VII." },
    { id: 39, label: "Abismo", target: 50, timeLimit: null, bonus: 205, speedOverride: 44, walls: [...rect(0, 0, 20, 20), ...vLine(5, 4, 15), ...vLine(10, 0, 8), ...vLine(10, 12, 19), ...vLine(15, 4, 15), ...hLine(5, 5, 14), ...hLine(14, 5, 14)], message: "Abismo." },
    { id: 40, label: "Pesadelo III", target: 50, timeLimit: 145e3, bonus: 210, speedOverride: 42, walls: [...rect(1, 1, 18, 18), ...diamond(10, 10, 5), ...cross(10, 10, 3), ...hLine(5, 4, 8), ...hLine(5, 12, 15), ...hLine(14, 4, 8), ...hLine(14, 12, 15)], message: "145s. Pesadelo III." },
    { id: 41, label: "Fractal I", target: 52, timeLimit: null, bonus: 220, speedOverride: 40, walls: [...cross(5, 5, 2), ...cross(15, 5, 2), ...cross(5, 15, 2), ...cross(15, 15, 2), ...cross(10, 10, 2), ...hLine(10, 3, 7), ...hLine(10, 13, 17), ...vLine(10, 3, 7), ...vLine(10, 13, 17)], message: "Fractal I." },
    { id: 42, label: "Caixa Russa", target: 52, timeLimit: 15e4, bonus: 225, speedOverride: 38, walls: [...rect(0, 0, 20, 20), ...rect(3, 3, 14, 14), ...rect(6, 6, 8, 8), ...hLine(9, 6, 13)], message: "150s. Caixas dentro de caixas." },
    { id: 43, label: "Labirinto VIII", target: 54, timeLimit: null, bonus: 230, speedOverride: 36, walls: [...hLine(2, 0, 14), ...vLine(14, 2, 8), ...hLine(8, 8, 14), ...vLine(8, 8, 14), ...hLine(14, 2, 8), ...vLine(2, 2, 8), ...hLine(5, 2, 6), ...vLine(6, 5, 7), ...hLine(17, 6, 18), ...vLine(18, 5, 17), ...hLine(5, 15, 19), ...vLine(15, 5, 8)], message: "Labirinto VIII." },
    { id: 44, label: "Caos II", target: 54, timeLimit: 155e3, bonus: 235, speedOverride: 34, walls: [...vLine(2, 0, 6), ...vLine(2, 8, 13), ...vLine(2, 15, 19), ...vLine(6, 2, 7), ...vLine(6, 9, 17), ...vLine(10, 0, 5), ...vLine(10, 7, 12), ...vLine(10, 14, 19), ...vLine(14, 2, 6), ...vLine(14, 8, 13), ...vLine(14, 15, 19), ...vLine(18, 0, 7), ...vLine(18, 9, 17)], message: "155s. Caos II." },
    { id: 45, label: "Pesadelo IV", target: 56, timeLimit: null, bonus: 240, speedOverride: 32, walls: [...rect(0, 0, 20, 20), ...ring(10, 10, 7), ...ring(10, 10, 4), ...cross(10, 10, 2), ...hLine(10, 7, 9), ...hLine(10, 11, 13)], message: "Pesadelo IV." },
    { id: 46, label: "Mestre I", target: 58, timeLimit: 16e4, bonus: 250, speedOverride: 30, walls: [...rect(1, 1, 18, 18), ...rect(4, 4, 12, 12), ...rect(7, 7, 6, 6), ...hLine(10, 4, 7), ...hLine(10, 13, 16), ...vLine(4, 10, 13), ...vLine(15, 7, 10)], message: "160s. Mestre I." },
    { id: 47, label: "Mestre II", target: 58, timeLimit: null, bonus: 255, speedOverride: 28, walls: [...cross(10, 10, 7), ...diamond(10, 10, 5), ...ring(10, 10, 3), ...scatter([[10, 3], [10, 17], [3, 10], [17, 10]])], message: "Mestre II." },
    { id: 48, label: "Labirinto IX", target: 60, timeLimit: 165e3, bonus: 260, speedOverride: 26, walls: [...hLine(2, 0, 14), ...vLine(14, 2, 8), ...hLine(8, 8, 14), ...vLine(8, 8, 14), ...hLine(14, 2, 8), ...vLine(2, 2, 8), ...hLine(5, 2, 6), ...vLine(6, 5, 7), ...hLine(17, 6, 18), ...vLine(18, 5, 17), ...hLine(5, 15, 19), ...vLine(15, 5, 8), ...hLine(11, 15, 18), ...vLine(12, 11, 14)], message: "165s. O pen\xFAltimo." },
    { id: 49, label: "Lenda", target: 60, timeLimit: null, bonus: 270, speedOverride: 24, walls: [...rect(0, 0, 20, 20), ...diamond(10, 10, 7), ...cross(10, 10, 5), ...ring(10, 10, 3), ...scatter([[10, 3], [10, 17], [3, 10], [17, 10], [5, 5], [15, 5], [5, 15], [15, 15]])], message: "Quase l\xE1." },
    { id: 50, label: "DIMEN6", target: 66, timeLimit: 17e4, bonus: 500, speedOverride: 22, walls: [...rect(0, 0, 20, 20), ...rect(3, 3, 14, 14), ...rect(6, 6, 8, 8), ...cross(10, 10, 2), ...hLine(10, 3, 6), ...hLine(10, 14, 17), ...vLine(10, 3, 6), ...vLine(10, 14, 17), ...scatter([[5, 5], [14, 5], [5, 14], [14, 14]])], message: "170s. DIMEN6. Boa sorte." }
  ]);
  var DIR_VECTORS = Object.freeze({ UP: { dx: 0, dy: -1 }, DOWN: { dx: 0, dy: 1 }, LEFT: { dx: -1, dy: 0 }, RIGHT: { dx: 1, dy: 0 } });
  var OPPOSITE = Object.freeze({ UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" });
  var Ease = Object.freeze({
    linear: (t) => t,
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeIn: (t) => t * t * t,
    easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    bounce: (t) => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  });
  var Color = {
    hex2rgb(hex) {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    },
    rgba(hex, a) {
      const { r, g, b } = Color.hex2rgb(hex);
      return `rgba(${r},${g},${b},${a})`;
    },
    lerp(c1, c2, t) {
      const a = Color.hex2rgb(c1), b = Color.hex2rgb(c2);
      return `rgb(${Math.round(a.r + (b.r - a.r) * t)},${Math.round(a.g + (b.g - a.g) * t)},${Math.round(a.b + (b.b - a.b) * t)})`;
    }
  };

  // js/utils/math.js
  var MathUtil = {
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2),
    rand: (lo, hi) => lo + Math.random() * (hi - lo),
    randInt: (lo, hi) => Math.floor(lo + Math.random() * (hi - lo + 1)),
    tau: Math.PI * 2,
    weightedRandom(items) {
      const total = items.reduce((s, i) => s + i.weight, 0);
      let r = Math.random() * total;
      for (const item of items) {
        r -= item.weight;
        if (r <= 0) return item;
      }
      return items[items.length - 1];
    }
  };

  // js/utils/bus.js
  var Bus = /* @__PURE__ */ (() => {
    const _listeners = /* @__PURE__ */ new Map();
    return {
      on(event, fn) {
        if (!_listeners.has(event)) _listeners.set(event, []);
        _listeners.get(event).push(fn);
        return () => this.off(event, fn);
      },
      off(event, fn) {
        if (!_listeners.has(event)) return;
        if (!fn) {
          _listeners.delete(event);
          return;
        }
        const fns = _listeners.get(event).filter((f) => f !== fn);
        fns.length > 0 ? _listeners.set(event, fns) : _listeners.delete(event);
      },
      emit(event, data) {
        if (!_listeners.has(event)) return;
        _listeners.get(event).forEach((fn) => {
          try {
            fn(data);
          } catch (e) {
            console.error(`[Bus] Error in "${event}" handler:`, e);
          }
        });
      },
      once(event, fn) {
        const wrap = (data) => {
          fn(data);
          this.off(event, wrap);
        };
        this.on(event, wrap);
      },
      clear() {
        _listeners.clear();
      }
    };
  })();

  // js/core/store.js
  var Store = class _Store {
    static #instance = null;
    #playerId = "";
    #cache = /* @__PURE__ */ new Map();
    constructor() {
      if (_Store.#instance) return _Store.#instance;
      _Store.#instance = this;
    }
    setPlayerId(id) {
      this.#playerId = id;
      Bus.emit("playerIdChanged", id);
    }
    getPlayerId() {
      return this.#playerId;
    }
    #key(k) {
      return CFG.STORAGE_KEY + (this.#playerId ? this.#playerId + "_" : "") + k;
    }
    get(key, fallback = null) {
      const fk = this.#key(key);
      if (this.#cache.has(fk)) return this.#cache.get(fk);
      try {
        const raw = localStorage.getItem(fk);
        const val = raw === null ? fallback : JSON.parse(raw);
        this.#cache.set(fk, val);
        return val;
      } catch {
        return fallback;
      }
    }
    set(key, value) {
      const fk = this.#key(key);
      this.#cache.set(fk, value);
      try {
        localStorage.setItem(fk, JSON.stringify(value));
      } catch (e) {
        console.warn("[Store] save failed:", e);
      }
    }
    getBest(mode) {
      return this.get(`best_${mode}`, 0);
    }
    saveBest(mode, score) {
      if (score > this.getBest(mode)) {
        this.set(`best_${mode}`, score);
        this.syncToCloud();
        Bus.emit("newRecord", { mode, score });
      }
    }
    getLevelBest(level) {
      return this.get(`lvl_${level}`, 0);
    }
    saveLevelBest(level, score) {
      if (score > this.getLevelBest(level)) this.set(`lvl_${level}`, score);
    }
    getUnlocked() {
      return this.get("unlocked", 1);
    }
    unlock(level) {
      if (level > this.getUnlocked()) {
        this.set("unlocked", level);
        this.syncToCloud();
        Bus.emit("levelUnlocked", level);
      }
    }
    getStats() {
      return this.get("stats", { gamesPlayed: 0, totalScore: 0, totalFood: 0, bestCombo: 0, playTime: 0 });
    }
    saveStats(delta) {
      const s = this.getStats();
      this.set("stats", {
        gamesPlayed: s.gamesPlayed + (delta.gamesPlayed || 0),
        totalScore: s.totalScore + (delta.totalScore || 0),
        totalFood: s.totalFood + (delta.totalFood || 0),
        bestCombo: Math.max(s.bestCombo, delta.bestCombo || 0),
        playTime: s.playTime + (delta.playTime || 0)
      });
    }
    // ── Sync com Firebase ────────────────────────────────────────
    syncToCloud() {
      if (!window.FirebaseDB || !this.#playerId) return;
      const data = {
        nick: this.#playerId.replace(/^P_/, ""),
        best_classic: this.get("best_classic", 0),
        best_wrap: this.get("best_wrap", 0),
        best_speed: this.get("best_speed", 0),
        best_challenge: this.get("best_challenge", 0),
        unlocked: this.getUnlocked(),
        stats: this.getStats(),
        lastSync: (/* @__PURE__ */ new Date()).toISOString()
      };
      window.FirebaseDB.saveProfile(this.#playerId, data).catch((e) => console.warn("[Store] cloud sync failed:", e));
    }
    clearCache() {
      this.#cache.clear();
    }
    resetAll() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(CFG.STORAGE_KEY)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
      this.#cache.clear();
      Bus.emit("storeReset");
    }
  };
  var store = new Store();

  // js/core/engine.js
  var state = {
    snake: [],
    dir: "RIGHT",
    nextDir: "RIGHT",
    foods: [],
    powerup: null,
    pwActive: false,
    pwKind: null,
    pwTimer: 0,
    pwDuration: 0,
    score: 0,
    streak: 0,
    combo: 1,
    bestScore: 0,
    mode: "classic",
    level: 1,
    levelEaten: 0,
    timeLeft: null,
    walls: [],
    running: false,
    paused: false,
    phase: "menu",
    sessionStart: 0,
    // Extras dinâmicos
    wrapOverride: false,
    portalScoreTriggered: false,
    _nextSlowShrink: 500,
    shieldActive: false,
    // absorve 1 colisão fatal
    freezeActive: false,
    // comidas não expiram/movem
    dashActive: false
    // velocidade dobrada
  };
  var _gameLoop = null;
  var _timerInterval = null;
  var _eatTimestamp = 0;
  var _currentSpeed = 145;
  var _comboDecayTimer = null;
  var _gracePeriod = false;
  var _LEVELUP_PAUSE = 2e3;
  var STREAK_MILESTONES = Object.freeze([
    { streak: 10, bonus: 5, label: "streak \xD710" },
    { streak: 25, bonus: 15, label: "streak \xD725" },
    { streak: 50, bonus: 40, label: "streak \xD750" },
    { streak: 100, bonus: 100, label: "streak \xD7100" }
  ]);
  function _checkStreak(s) {
    const m = STREAK_MILESTONES.find((x) => x.streak === s);
    if (m) {
      state.score += m.bonus;
      Bus.emit("milestone", m);
    }
  }
  var SessionStats = {
    _foodByType: {},
    _powerupsUsed: {},
    _peakCombo: 1,
    _peakStreak: 0,
    _deathCause: null,
    reset() {
      this._foodByType = {};
      this._powerupsUsed = {};
      this._peakCombo = 1;
      this._peakStreak = 0;
      this._deathCause = null;
    },
    trackFood(t) {
      this._foodByType[t] = (this._foodByType[t] || 0) + 1;
    },
    trackPowerup(k) {
      this._powerupsUsed[k] = (this._powerupsUsed[k] || 0) + 1;
    },
    trackCombo(c) {
      if (c > this._peakCombo) this._peakCombo = c;
    },
    trackStreak(s) {
      if (s > this._peakStreak) this._peakStreak = s;
    },
    setDeathCause(c) {
      this._deathCause = c;
    },
    summary() {
      return { foodByType: this._foodByType, powerupsUsed: this._powerupsUsed, peakCombo: this._peakCombo, peakStreak: this._peakStreak, deathCause: this._deathCause };
    }
  };
  var GhostTrail = {
    _positions: [],
    maxLen: 3,
    push(pos) {
      this._positions.unshift({ ...pos, age: 0 });
      if (this._positions.length > this.maxLen) this._positions.pop();
    },
    tick() {
      this._positions.forEach((p) => p.age++);
      this._positions = this._positions.filter((p) => p.age < 8);
    },
    get positions() {
      return this._positions;
    },
    clear() {
      this._positions.length = 0;
    }
  };
  var InputBuffer = {
    _pending: null,
    push(dir) {
      const cur = this._pending || state.dir;
      if (dir !== OPPOSITE[cur]) this._pending = dir;
    },
    flush() {
      if (this._pending !== null) {
        state.nextDir = this._pending;
        this._pending = null;
      }
    },
    clear() {
      this._pending = null;
    }
  };
  var WallAnimator = {
    _active: [],
    addMoving(wi, axis, range, speed) {
      this._active.push({ wi, axis, range, speed, t: 0, dir: 1 });
    },
    tick() {
      for (const w of this._active) {
        w.t += w.speed * w.dir;
        if (w.t >= w.range || w.t <= 0) w.dir *= -1;
        if (w.wi < state.walls.length) state.walls[w.wi][w.axis] = Math.round(w.t);
      }
    },
    clear() {
      this._active.length = 0;
    }
  };
  var Engine = {
    start(mode = "classic", level = 1) {
      Engine.stop();
      InputBuffer.clear();
      SessionStats.reset();
      GhostTrail.clear();
      if (window._Renderer) window._Renderer.clearEffects();
      state.mode = mode;
      state.level = mode === "challenge" ? level : 1;
      state.phase = "playing";
      state.running = true;
      state.paused = false;
      state.sessionStart = performance.now();
      state.portalScoreTriggered = false;
      state.wrapOverride = false;
      state.shieldActive = false;
      state.freezeActive = false;
      state.dashActive = false;
      state._nextSlowShrink = CFG.PORTAL_MODE_SCORE;
      DynamicWalls.reset();
      _initLevel(state.level);
      _scheduleStep();
      Bus.emit("phaseChange", "playing");
    },
    stop() {
      clearInterval(_gameLoop);
      clearInterval(_timerInterval);
      clearTimeout(_comboDecayTimer);
      _gameLoop = _timerInterval = null;
      state.running = false;
      if (state.phase === "playing") state.phase = "gameover";
    },
    pause() {
      if (!state.running || state.paused) return;
      state.paused = true;
      clearInterval(_gameLoop);
      clearInterval(_timerInterval);
      clearTimeout(_comboDecayTimer);
      Bus.emit("phaseChange", "paused");
    },
    resume() {
      if (!state.paused) return;
      state.paused = false;
      _scheduleStep();
      _resumeTimer();
      _startComboDecay();
      Bus.emit("phaseChange", "playing");
    },
    setDir(d) {
      if (!state.running || state.paused || state.phase !== "playing") return;
      InputBuffer.push(d);
    },
    retryLevel() {
      if (state.mode !== "challenge") return;
      const l = state.level;
      Engine.stop();
      Engine.start("challenge", l);
    },
    getSessionStats: () => SessionStats.summary()
  };
  function _findSafeSpawn(walls) {
    const W = CFG.COLS, H = CFG.ROWS;
    const wallSet = new Set(walls.map((w) => `${w.x},${w.y}`));
    const blocked = (x, y) => x < 0 || x >= W || y < 0 || y >= H || wallSet.has(`${x},${y}`);
    const RUN_MIN = 6;
    const DIRS = [
      { dir: "RIGHT", dx: 1, dy: 0, tx: -1, ty: 0 },
      // cabeça em x, cauda em x-1,x-2
      { dir: "LEFT", dx: -1, dy: 0, tx: 1, ty: 0 },
      { dir: "DOWN", dx: 0, dy: 1, tx: 0, ty: -1 },
      { dir: "UP", dx: 0, dy: -1, tx: 0, ty: 1 }
    ];
    function runLength(hx, hy, ddx, ddy) {
      let n = 0;
      for (let k = 1; k < W; k++) {
        if (blocked(hx + ddx * k, hy + ddy * k)) break;
        n++;
      }
      return n;
    }
    const candidates = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      for (const { dir, dx, dy, tx, ty } of DIRS) {
        if (blocked(x, y) || blocked(x + tx, y + ty) || blocked(x + tx * 2, y + ty * 2)) continue;
        const run = runLength(x, y, dx, dy);
        if (run >= RUN_MIN) candidates.push({ x, y, dir, run });
      }
    }
    if (candidates.length === 0) {
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        for (const { dir, dx, dy, tx, ty } of DIRS) {
          if (blocked(x, y) || blocked(x + tx, y + ty) || blocked(x + tx * 2, y + ty * 2)) continue;
          const run = runLength(x, y, dx, dy);
          if (run >= 3) candidates.push({ x, y, dir, run });
        }
      }
    }
    if (candidates.length === 0) return { x: Math.floor(W / 2), y: Math.floor(H / 2), dir: "RIGHT" };
    const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    candidates.sort((a, b) => {
      const da = Math.abs(a.x - cx) + Math.abs(a.y - cy);
      const db = Math.abs(b.x - cx) + Math.abs(b.y - cy);
      return (b.run - a.run) * 0.5 + (da - db) * 0.5;
    });
    return candidates[0];
  }
  function _initLevel(levelNum) {
    WallAnimator.clear();
    const isChallenge = state.mode === "challenge";
    const levelDef = isChallenge ? LEVELS[levelNum - 1] : null;
    const modeDef = MODES[state.mode];
    const rawWalls = levelDef ? [...levelDef.walls] : [];
    const spawn = _findSafeSpawn(rawWalls);
    const cx = spawn.x, cy = spawn.y;
    const spawnDir = spawn.dir || "RIGHT";
    const bodyOff = { RIGHT: { dx: -1, dy: 0 }, LEFT: { dx: 1, dy: 0 }, DOWN: { dx: 0, dy: -1 }, UP: { dx: 0, dy: 1 } }[spawnDir];
    state.snake = [
      { x: cx, y: cy },
      { x: cx + bodyOff.dx, y: cy + bodyOff.dy },
      { x: cx + bodyOff.dx * 2, y: cy + bodyOff.dy * 2 }
    ];
    state.dir = spawnDir;
    state.nextDir = spawnDir;
    if (levelNum === 1 || !isChallenge) {
      state.score = 0;
      state.streak = 0;
      state.combo = 1;
    }
    state.levelEaten = 0;
    state.foods = [];
    state.powerup = null;
    _clearPowerup();
    state.wrapOverride = false;
    state.walls = rawWalls;
    const spawnSet = new Set(state.snake.map((s) => `${s.x},${s.y}`));
    state.walls = state.walls.filter((w) => !spawnSet.has(`${w.x},${w.y}`));
    _currentSpeed = levelDef?.speedOverride ?? modeDef.baseSpeed;
    state.bestScore = store.getBest(state.mode);
    clearInterval(_timerInterval);
    _gracePeriod = false;
    state.timeLeft = levelDef?.timeLimit ?? null;
    if (state.timeLeft !== null) _startTimer();
    _placeFood();
    _placeFood();
    _eatTimestamp = 0;
    Bus.emit("stateUpdate", state);
  }
  function _startTimer() {
    _timerInterval = setInterval(() => {
      if (state.paused) return;
      state.timeLeft -= 100;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        Bus.emit("stateUpdate", state);
        Bus.emit("timerTick", 0);
      } else Bus.emit("timerTick", state.timeLeft);
    }, 100);
  }
  function _resumeTimer() {
    if (state.timeLeft !== null && state.timeLeft > 0) _startTimer();
  }
  function _gameOverTimeout() {
    clearInterval(_gameLoop);
    clearInterval(_timerInterval);
    SessionStats.setDeathCause("timeout");
    _doGameOver();
  }
  function _scheduleStep() {
    clearInterval(_gameLoop);
    _gameLoop = setInterval(_step, _currentSpeed);
  }
  function _step() {
    if (state.paused || !state.running) return;
    InputBuffer.flush();
    state.dir = state.nextDir;
    WallAnimator.tick();
    const modeDef = MODES[state.mode];
    const head = { ...state.snake[0] };
    const v = DIR_VECTORS[state.dir];
    head.x += v.dx;
    head.y += v.dy;
    const shouldWrap = modeDef.wrap || state.wrapOverride;
    if (shouldWrap) {
      head.x = (head.x + CFG.COLS) % CFG.COLS;
      head.y = (head.y + CFG.ROWS) % CFG.ROWS;
    } else {
      if (head.x < 0 || head.x >= CFG.COLS || head.y < 0 || head.y >= CFG.ROWS) {
        if (state.shieldActive) {
          state.shieldActive = false;
          Bus.emit("shieldBroken");
          head.x = Math.max(0, Math.min(CFG.COLS - 1, head.x));
          head.y = Math.max(0, Math.min(CFG.ROWS - 1, head.y));
          state.snake.pop();
        } else {
          SessionStats.setDeathCause("wall");
          return _doGameOver();
        }
      }
    }
    if (state.walls.some((w) => w.x === head.x && w.y === head.y)) {
      if (state.shieldActive) {
        state.shieldActive = false;
        Bus.emit("shieldBroken");
        state.snake.pop();
        Bus.emit("stateUpdate", state);
        return;
      }
      SessionStats.setDeathCause("obstacle");
      return _doGameOver();
    }
    const ghostActive = state.pwActive && state.pwKind === "ghost";
    if (!ghostActive && state.snake.some((s) => s.x === head.x && s.y === head.y)) {
      if (state.shieldActive) {
        state.shieldActive = false;
        Bus.emit("shieldBroken");
        state.snake.pop();
        Bus.emit("stateUpdate", state);
        return;
      }
      SessionStats.setDeathCause("self");
      return _doGameOver();
    }
    state.snake.unshift(head);
    if (ghostActive) GhostTrail.push({ x: head.x, y: head.y });
    GhostTrail.tick();
    if (state.powerup && head.x === state.powerup.x && head.y === state.powerup.y) {
      _activatePowerup(state.powerup);
      state.powerup = null;
    }
    if (state.pwActive && state.pwKind === "magnet" && !state.freezeActive) _applyMagnet(head);
    const fi = state.foods.findIndex((f) => f.x === head.x && f.y === head.y);
    if (fi !== -1) {
      const food = state.foods[fi];
      state.foods.splice(fi, 1);
      _onFoodEaten(food);
    } else state.snake.pop();
    if (state.pwActive) _tickPowerup();
    _maintainFoodQueue();
    if (state.mode !== "challenge") DynamicWalls.check(state.score);
    if (state.mode === "classic" && state.score >= state._nextSlowShrink) {
      state._nextSlowShrink = (state._nextSlowShrink || CFG.PORTAL_MODE_SCORE) + CFG.PORTAL_MODE_SCORE;
      _forceSlowShrink();
    }
    Bus.emit("stateUpdate", state);
  }
  function _forceSlowShrink() {
    state.powerup = null;
    const pw = POWERUP_TYPES.find((p) => p.kind === "slow_shrink");
    Bus.emit("forcedPowerup", { kind: "slow_shrink", message: "500 pts! SLOW + REDU\xC7\xC3O" });
    const keep = Math.max(3, Math.floor(state.snake.length / 2));
    state.snake = state.snake.slice(0, keep);
    _currentSpeed = Math.min(CFG.SPEED_MAX, _currentSpeed + 55);
    _scheduleStep();
    Bus.emit("powerupStart", { kind: "slow", duration: 7e3 });
    if (window._Renderer) window._Renderer.onPowerup("slow_shrink");
    state.pwActive = true;
    state.pwKind = "slow";
    state.pwDuration = 7e3;
    state.pwTimer = 7e3;
  }
  function _onFoodEaten(food) {
    const now = Date.now(), elapsed = now - _eatTimestamp;
    _eatTimestamp = now;
    if (_eatTimestamp > 0 && elapsed < CFG.COMBO_WINDOW) state.combo = Math.min(state.combo + 1, CFG.COMBO_MAX);
    else state.combo = 1;
    state.streak++;
    state.levelEaten++;
    _checkStreak(state.streak);
    const mult = state.pwActive && state.pwKind === "x3" ? 3 : state.pwActive && state.pwKind === "x2" ? 2 : 1;
    const pts = food.pts * state.combo * mult;
    state.score += pts;
    if (window._Renderer) {
      window._Renderer.onEat(food, state.combo);
      if (state.combo >= 3 && window._Renderer.onCombo) window._Renderer.onCombo(state.combo);
    }
    Bus.emit("foodEaten", { food, pts, combo: state.combo });
    const modeDef = MODES[state.mode];
    const levelDef = LEVELS[state.level - 1];
    const base = levelDef?.speedOverride ?? modeDef.baseSpeed;
    _currentSpeed = MathUtil.clamp(base - state.snake.length * modeDef.speedUp, CFG.SPEED_MIN, CFG.SPEED_MAX);
    _scheduleStep();
    _placeFood();
    _maybePlacePowerup();
    if (state.mode === "challenge") {
      const target = LEVELS[state.level - 1]?.target ?? Infinity;
      if (state.levelEaten >= target) return _completeChallengeLevel();
    }
    store.saveBest(state.mode, state.score);
    state.bestScore = store.getBest(state.mode);
  }
  function _completeChallengeLevel() {
    clearInterval(_gameLoop);
    clearInterval(_timerInterval);
    state.phase = "levelup";
    const ld = LEVELS[state.level - 1];
    let bonus = ld.bonus;
    if (state.timeLeft !== null) bonus += Math.floor(state.timeLeft / 500);
    state.score += bonus;
    store.unlock(state.level + 1);
    store.saveLevelBest(state.level, state.score);
    store.saveBest(state.mode, state.score);
    store.syncToCloud();
    if (window._Renderer) window._Renderer.onLevelUp(state.level);
    Bus.emit("levelComplete", { level: state.level, bonus });
    setTimeout(() => {
      if (state.level < LEVELS.length) {
        state.level++;
        state.phase = "playing";
        _initLevel(state.level);
        _scheduleStep();
        Bus.emit("phaseChange", "playing");
      } else {
        state.phase = "win";
        Bus.emit("phaseChange", "win");
      }
    }, _LEVELUP_PAUSE);
  }
  function _doGameOver() {
    clearInterval(_gameLoop);
    clearInterval(_timerInterval);
    clearTimeout(_comboDecayTimer);
    state.running = false;
    state.phase = "gameover";
    const prevBest = store.getBest(state.mode);
    store.saveBest(state.mode, state.score);
    state.bestScore = store.getBest(state.mode);
    const isNew = state.score > prevBest && state.score > 0;
    const playTime = performance.now() - state.sessionStart;
    store.saveStats({ gamesPlayed: 1, totalScore: state.score, totalFood: state.streak, bestCombo: state.combo, playTime });
    store.syncToCloud();
    if (window._Renderer) window._Renderer.onDeath(state.snake);
    Bus.emit("gameOver", { score: state.score, isNew, streak: state.streak, combo: state.combo });
  }
  function _occupied(x, y) {
    return state.snake.some((s) => s.x === x && s.y === y) || state.foods.some((f) => f.x === x && f.y === y) || state.walls.some((w) => w.x === x && w.y === y) || state.powerup && state.powerup.x === x && state.powerup.y === y;
  }
  function _randomFreeCell() {
    let pos, tries = 0;
    do {
      pos = { x: MathUtil.randInt(0, CFG.COLS - 1), y: MathUtil.randInt(0, CFG.ROWS - 1) };
      tries++;
    } while (_occupied(pos.x, pos.y) && tries < 200);
    return pos;
  }
  function _placeFood() {
    if (state.foods.length >= 3) return;
    const ft = MathUtil.weightedRandom(FOOD_TYPES);
    const pos = _randomFreeCell();
    state.foods.push({ ...pos, ...ft, _phase: Math.random() * MathUtil.tau, _spawnTime: ft.ttl !== null ? Date.now() : null });
  }
  function _maintainFoodQueue() {
    const now = Date.now();
    if (!state.freezeActive)
      state.foods = state.foods.filter((f) => f.ttl === null || f._spawnTime === null || now - f._spawnTime < f.ttl);
    else state.foods.forEach((f) => {
      if (f._spawnTime) f._spawnTime = now;
    });
    while (state.foods.length < 2) _placeFood();
    if (state.foods.length < 3 && state.score > 10 && Math.random() < 0.4) _placeFood();
  }
  function _maybePlacePowerup() {
    if (state.powerup || state.score < CFG.POWERUP_MIN_SCORE || Math.random() > CFG.POWERUP_CHANCE) return;
    const pool = POWERUP_TYPES.filter((p) => !p.forced);
    const kind = pool[MathUtil.randInt(0, pool.length - 1)];
    state.powerup = { ..._randomFreeCell(), ...kind, _phase: 0 };
  }
  function _activatePowerup(pw) {
    if (pw.duration === 0) {
      if (pw.kind === "shrink") {
        const keep = Math.max(3, Math.floor(state.snake.length / 2));
        state.snake = state.snake.slice(0, keep);
      } else if (pw.kind === "time_warp") {
        if (state.timeLeft !== null) state.timeLeft = Math.min(state.timeLeft + 15e3, 999e3);
      }
      Bus.emit("powerupStart", { kind: pw.kind });
      Bus.emit("powerupEnd", { kind: pw.kind });
      if (window._Renderer) window._Renderer.onPowerup(pw.kind);
      return;
    }
    _clearPowerup();
    state.pwActive = true;
    state.pwKind = pw.kind;
    state.pwDuration = pw.duration;
    state.pwTimer = pw.duration;
    _pwLastTick = Date.now();
    if (pw.kind === "slow") {
      _currentSpeed = Math.min(CFG.SPEED_MAX, _currentSpeed + 50);
      _scheduleStep();
    }
    if (pw.kind === "dash") {
      state.dashActive = true;
      _currentSpeed = Math.max(CFG.SPEED_MIN, _currentSpeed / 2);
      _scheduleStep();
    }
    if (pw.kind === "portal_mode") {
      state.wrapOverride = true;
      Bus.emit("portalModeStart");
    }
    if (pw.kind === "shield") {
      state.shieldActive = true;
      Bus.emit("shieldStart");
    }
    if (pw.kind === "freeze") {
      state.freezeActive = true;
      Bus.emit("freezeStart");
    }
    if (pw.kind === "x3") {
    }
    if (window._Renderer) window._Renderer.onPowerup(pw.kind);
    Bus.emit("powerupStart", { kind: pw.kind, duration: pw.duration });
  }
  var _pwLastTick = 0;
  function _tickPowerup() {
    const now = Date.now();
    const elapsed = _pwLastTick > 0 ? Math.min(now - _pwLastTick, 500) : _currentSpeed;
    _pwLastTick = now;
    state.pwTimer -= elapsed;
    Bus.emit("powerupTick", { timer: Math.max(0, state.pwTimer), duration: state.pwDuration });
    if (state.pwTimer <= 0) {
      const wasKind = state.pwKind;
      _clearPowerup();
      if (wasKind === "slow" || wasKind === "portal_mode" || wasKind === "dash") {
        const modeDef = MODES[state.mode];
        const levelDef = LEVELS[state.level - 1];
        const base = levelDef?.speedOverride ?? modeDef.baseSpeed;
        _currentSpeed = MathUtil.clamp(base - state.snake.length * modeDef.speedUp, CFG.SPEED_MIN, CFG.SPEED_MAX);
        _scheduleStep();
      }
      if (wasKind === "portal_mode") {
        state.wrapOverride = false;
        Bus.emit("portalModeEnd");
      }
      if (wasKind === "dash") {
        state.dashActive = false;
      }
      if (wasKind === "freeze") {
        state.freezeActive = false;
        Bus.emit("freezeEnd");
      }
      if (wasKind === "shield") {
        state.shieldActive = false;
      }
      Bus.emit("powerupEnd", { kind: wasKind });
    }
  }
  function _clearPowerup() {
    state.pwActive = false;
    state.pwKind = null;
    state.pwTimer = 0;
    state.pwDuration = 0;
    state.wrapOverride = false;
  }
  var DynamicWalls = {
    _walls: [],
    _nextThreshold: 1e3,
    _TTL: 1e4,
    reset() {
      this._walls = [];
      this._nextThreshold = 1e3;
      Bus.emit("dynWallsReset");
    },
    _SHAPES: [
      (ax, ay) => [{ x: ax, y: ay }, { x: ax + 1, y: ay }, { x: ax + 2, y: ay }],
      (ax, ay) => [{ x: ax, y: ay }, { x: ax, y: ay + 1 }, { x: ax, y: ay + 2 }],
      (ax, ay) => [{ x: ax, y: ay }, { x: ax + 1, y: ay }, { x: ax + 2, y: ay }, { x: ax + 3, y: ay }],
      (ax, ay) => [{ x: ax, y: ay }, { x: ax, y: ay + 1 }, { x: ax, y: ay + 2 }, { x: ax, y: ay + 3 }],
      (ax, ay) => [{ x: ax, y: ay }, { x: ax + 1, y: ay }, { x: ax + 1, y: ay + 1 }, { x: ax + 1, y: ay + 2 }],
      (ax, ay) => [{ x: ax + 1, y: ay }, { x: ax, y: ay }, { x: ax, y: ay + 1 }, { x: ax, y: ay + 2 }],
      (ax, ay) => [{ x: ax, y: ay }, { x: ax + 1, y: ay }, { x: ax + 2, y: ay }, { x: ax + 1, y: ay + 1 }],
      (ax, ay) => [{ x: ax, y: ay }, { x: ax, y: ay + 1 }, { x: ax, y: ay + 2 }, { x: ax + 1, y: ay + 1 }],
      (ax, ay) => [{ x: ax, y: ay }, { x: ax + 1, y: ay }, { x: ax, y: ay + 1 }, { x: ax + 1, y: ay + 1 }],
      (ax, ay) => [{ x: ax + 1, y: ay }, { x: ax + 2, y: ay }, { x: ax, y: ay + 1 }, { x: ax + 1, y: ay + 1 }],
      (ax, ay) => [{ x: ax, y: ay }, { x: ax + 1, y: ay }, { x: ax + 1, y: ay + 1 }, { x: ax + 2, y: ay + 1 }],
      (ax, ay) => [{ x: ax + 1, y: ay }, { x: ax, y: ay + 1 }, { x: ax + 1, y: ay + 1 }, { x: ax + 2, y: ay + 1 }, { x: ax + 1, y: ay + 2 }]
    ],
    _cellFree(cells, snakeSet, foodSet, wallSet) {
      return cells.every(
        (c) => c.x > 0 && c.x < CFG.COLS - 1 && c.y > 0 && c.y < CFG.ROWS - 1 && !snakeSet.has(`${c.x},${c.y}`) && !foodSet.has(`${c.x},${c.y}`) && !wallSet.has(`${c.x},${c.y}`)
      );
    },
    _notBlockingPath(cells, head, dir) {
      if (!head) return true;
      const v = DIR_VECTORS[dir];
      const front = /* @__PURE__ */ new Set();
      for (let k = 1; k <= 4; k++) {
        front.add(`${(head.x + v.dx * k + CFG.COLS) % CFG.COLS},${(head.y + v.dy * k + CFG.ROWS) % CFG.ROWS}`);
      }
      return cells.filter((c) => front.has(`${c.x},${c.y}`)).length < 2;
    },
    spawn() {
      const snakeSet = new Set(state.snake.map((s) => `${s.x},${s.y}`));
      const foodSet = new Set(state.foods.map((f) => `${f.x},${f.y}`));
      const wallSet = new Set(state.walls.map((w) => `${w.x},${w.y}`));
      this._walls.forEach((dw) => dw.cells.forEach((c) => wallSet.add(`${c.x},${c.y}`)));
      const shapeIdx = MathUtil.randInt(0, this._SHAPES.length - 1);
      const shapeFn = this._SHAPES[shapeIdx];
      for (let attempt = 0; attempt < 40; attempt++) {
        const ax = MathUtil.randInt(1, CFG.COLS - 5);
        const ay = MathUtil.randInt(1, CFG.ROWS - 5);
        const cells = shapeFn(ax, ay);
        if (this._cellFree(cells, snakeSet, foodSet, wallSet) && this._notBlockingPath(cells, state.snake[0], state.dir)) {
          const dw = { cells, born: Date.now(), ttl: this._TTL, shapeIdx };
          this._walls.push(dw);
          cells.forEach((c) => state.walls.push({ ...c, _dynamic: true, _born: dw.born, _ttl: dw.ttl }));
          Bus.emit("dynWallSpawned", { cells, ttl: this._TTL });
          return true;
        }
      }
      return false;
    },
    tick() {
      const now = Date.now();
      const expired = this._walls.filter((dw) => now - dw.born >= dw.ttl);
      if (!expired.length) return;
      expired.forEach((dw) => {
        const cellSet = new Set(dw.cells.map((c) => `${c.x},${c.y}`));
        state.walls = state.walls.filter((w) => !cellSet.has(`${w.x},${w.y}`) || !w._dynamic);
        Bus.emit("dynWallExpired", { cells: dw.cells });
      });
      this._walls = this._walls.filter((dw) => now - dw.born < dw.ttl);
    },
    check(score) {
      if (score >= this._nextThreshold) {
        this._nextThreshold += 1e3;
        this.spawn();
      }
      this.tick();
    }
  };
  function _applyMagnet(head) {
    if (!state.foods.length) return;
    let nearest = null, minDist = 5.1;
    for (const f of state.foods) {
      const d = MathUtil.dist(f, head);
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    }
    if (!nearest) return;
    const isFree = (x, y) => x >= 0 && x < CFG.COLS && y >= 0 && y < CFG.ROWS && !_occupied(x, y);
    const dx = head.x - nearest.x, dy = head.y - nearest.y;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    if (Math.abs(dx) > Math.abs(dy)) {
      if (sx !== 0 && isFree(nearest.x + sx, nearest.y)) nearest.x += sx;
      else if (sy !== 0 && isFree(nearest.x, nearest.y + sy)) nearest.y += sy;
    } else {
      if (sy !== 0 && isFree(nearest.x, nearest.y + sy)) nearest.y += sy;
      else if (sx !== 0 && isFree(nearest.x + sx, nearest.y)) nearest.x += sx;
    }
  }
  function _startComboDecay() {
    clearTimeout(_comboDecayTimer);
    _comboDecayTimer = setTimeout(() => {
      if (!state.running || state.paused) return;
      if (state.combo > 1) {
        state.combo = Math.max(1, state.combo - 1);
        Bus.emit("comboDecay", state.combo);
        Bus.emit("stateUpdate", state);
        _startComboDecay();
      }
    }, CFG.COMBO_WINDOW);
  }
  Bus.on("foodEaten", ({ food, combo }) => {
    SessionStats.trackFood(food.type);
    SessionStats.trackCombo(combo);
    SessionStats.trackStreak(state.streak);
    _startComboDecay();
  });
  Bus.on("powerupStart", ({ kind }) => {
    if (kind) SessionStats.trackPowerup(kind);
  });
  Bus.on("timerTick", (timeLeft) => {
    if (timeLeft <= 0 && !_gracePeriod) {
      _gracePeriod = true;
      setTimeout(() => {
        _gracePeriod = false;
        if (state.running && state.timeLeft <= 0) _gameOverTimeout();
      }, 1e3);
    }
  });
  Bus.on("phaseChange", (phase) => {
    if (phase === "paused") Bus.emit("pauseData", { score: state.score, streak: state.streak, combo: state.combo, level: state.level, mode: state.mode, timeLeft: state.timeLeft });
  });
  window.addEventListener("beforeunload", () => {
    if (state.running) store.saveStats({ playTime: performance.now() - state.sessionStart, gamesPlayed: 0 });
  });
  Engine._internals = { GhostTrail, InputBuffer, SessionStats, WallAnimator };

  // js/core/snake-skin.js
  var SNAKE_COLORS = Object.freeze([
    { id: "black", label: "Obsidiana", body: "#111110", eye: "#f4f1ec", glow: null, accent: "#333" },
    { id: "red", label: "Carmesim", body: "#dc2626", eye: "#fff", glow: "#dc2626", accent: "#ef4444" },
    { id: "green", label: "Esmeralda", body: "#16a34a", eye: "#fff", glow: "#16a34a", accent: "#22c55e" },
    { id: "blue", label: "Safira", body: "#1d4ed8", eye: "#fff", glow: "#1d4ed8", accent: "#3b82f6" },
    { id: "purple", label: "Ametista", body: "#7c3aed", eye: "#fff", glow: "#7c3aed", accent: "#a78bfa" },
    { id: "orange", label: "\xC2mbar", body: "#d97706", eye: "#fff", glow: "#d97706", accent: "#fbbf24" },
    { id: "cyan", label: "Aurora", body: "#0891b2", eye: "#fff", glow: "#0891b2", accent: "#22d3ee" },
    { id: "pink", label: "Nebulosa", body: "#db2777", eye: "#fff", glow: "#db2777", accent: "#f472b6" },
    { id: "gold", label: "Dourada", body: "#b45309", eye: "#fff", glow: "#ca8a04", accent: "#fde047" },
    { id: "white", label: "\xC1rtica", body: "#d6d3d1", eye: "#111", glow: null, accent: "#f5f5f4" },
    { id: "lime", label: "Radioativa", body: "#65a30d", eye: "#111", glow: "#84cc16", accent: "#bef264" },
    { id: "blood", label: "Sangue", body: "#7f1d1d", eye: "#fca5a5", glow: null, accent: "#b91c1c" }
  ]);
  var TAU = Math.PI * 2;
  function _eye(ctx2, x, y, r) {
    ctx2.beginPath();
    ctx2.arc(x, y, r, 0, TAU);
    ctx2.fill();
  }
  function _eyePair(ctx2, col, dir, r, off) {
    ctx2.fillStyle = col.eye;
    const m = { RIGHT: [off, -off, off, off], LEFT: [-off, -off, -off, off], DOWN: [-off, off, off, off], UP: [-off, -off, off, -off] };
    const [x1, y1, x2, y2] = m[dir] || [off, -off, off, off];
    _eye(ctx2, x1, y1, r);
    _eye(ctx2, x2, y2, r);
  }
  function _roundRect(ctx2, x, y, w, h, r) {
    ctx2.beginPath();
    ctx2.moveTo(x + r, y);
    ctx2.lineTo(x + w - r, y);
    ctx2.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx2.lineTo(x + w, y + h - r);
    ctx2.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx2.lineTo(x + r, y + h);
    ctx2.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx2.lineTo(x, y + r);
    ctx2.quadraticCurveTo(x, y, x + r, y);
    ctx2.closePath();
  }
  function _star5(ctx2, r, inner) {
    ctx2.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : inner;
      i === 0 ? ctx2.moveTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx2.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx2.closePath();
  }
  function _hexPath(ctx2, r) {
    ctx2.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 - Math.PI / 6;
      ctx2.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx2.closePath();
  }
  var SNAKE_SKINS = Object.freeze([
    // 1 ── Clássica (quadrado sólido, cantos ligeiramente arredondados)
    {
      id: "classic",
      label: "Cl\xE1ssica",
      desc: "Quadrado com cantos suaves",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        _roundRect(ctx2, -r, -r, r * 2, r * 2, 3);
        ctx2.fill();
        ctx2.fillStyle = col.accent;
        ctx2.globalAlpha *= 0.25;
        _roundRect(ctx2, -r, -r, r * 2, r * 0.5, 3);
        ctx2.fill();
        ctx2.globalAlpha /= 0.25;
        _eyePair(ctx2, col, dir, 2, r * 0.55);
      },
      drawBody(ctx2, c, i, col) {
        const s = Math.max(6, c - 3 - Math.min(i * 0.04, 2));
        ctx2.fillStyle = col.body;
        _roundRect(ctx2, -s / 2, -s / 2, s, s, 2);
        ctx2.fill();
      }
    },
    // 2 ── Redonda (círculo com highlight)
    {
      id: "round",
      label: "Redonda",
      desc: "C\xEDrculos brilhantes",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
        const g = ctx2.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        g.addColorStop(0, "rgba(255,255,255,0.35)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx2.fillStyle = g;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
        _eyePair(ctx2, col, dir, r * 0.2, r * 0.42);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.035);
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
        const g = ctx2.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        g.addColorStop(0, "rgba(255,255,255,0.2)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx2.fillStyle = g;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
      }
    },
    // 3 ── Neon (brilho intenso + sombra multicamada)
    {
      id: "neon",
      label: "Neon",
      desc: "Brilho el\xE9trico neon",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 2;
        if (col.glow) {
          ctx2.shadowBlur = 20;
          ctx2.shadowColor = col.glow;
        }
        ctx2.fillStyle = col.body;
        _roundRect(ctx2, -r, -r, r * 2, r * 2, 3);
        ctx2.fill();
        ctx2.shadowBlur = 0;
        if (col.glow) {
          ctx2.strokeStyle = col.accent;
          ctx2.lineWidth = 1;
          _roundRect(ctx2, -r + 1, -r + 1, r * 2 - 2, r * 2 - 2, 2);
          ctx2.stroke();
        }
        _eyePair(ctx2, col, dir, 2, r * 0.55);
      },
      drawBody(ctx2, c, i, col) {
        const s = Math.max(5, c - 3 - i * 0.04);
        if (col.glow && i < 7) {
          ctx2.shadowBlur = Math.max(2, 14 - i * 2);
          ctx2.shadowColor = col.glow;
        }
        ctx2.fillStyle = col.body;
        _roundRect(ctx2, -s / 2, -s / 2, s, s, 2);
        ctx2.fill();
        ctx2.shadowBlur = 0;
      }
    },
    // 4 ── Pixel Art (blocos 4x4 estilo GB)
    {
      id: "pixel",
      label: "Pixel",
      desc: "Estilo Game Boy retr\xF4",
      drawHead(ctx2, c, dir, col) {
        const s = Math.floor(c / 4);
        ctx2.fillStyle = col.body;
        ctx2.fillRect(-c / 2, -c / 2, c, c);
        ctx2.fillStyle = col.accent;
        [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 3], [3, 3]].forEach(([px, py]) => {
          ctx2.fillRect(-c / 2 + px * s, -c / 2 + py * s, s - 1, s - 1);
        });
        ctx2.fillStyle = col.eye;
        const eyeM = { RIGHT: [[3, 0], [3, 2]], LEFT: [[0, 0], [0, 2]], DOWN: [[1, 3], [2, 3]], UP: [[1, 0], [2, 0]] }[dir] || [[3, 0], [3, 2]];
        eyeM.forEach(([px, py]) => ctx2.fillRect(-c / 2 + px * s, -c / 2 + py * s, s - 1, s - 1));
      },
      drawBody(ctx2, c, i, col) {
        const s = Math.floor(c / 4);
        ctx2.fillStyle = col.body;
        ctx2.fillRect(-c / 2, -c / 2, c, c);
        ctx2.fillStyle = col.accent;
        for (let px = 0; px < 4; px++) for (let py = 0; py < 4; py++) {
          if ((px + py + i) % 2 === 0) ctx2.fillRect(-c / 2 + px * s, -c / 2 + py * s, s - 1, s - 1);
        }
      }
    },
    // 5 ── Diamante (losango com face)
    {
      id: "diamond",
      label: "Diamante",
      desc: "Losango facetado",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.moveTo(0, -r);
        ctx2.lineTo(r, 0);
        ctx2.lineTo(0, r);
        ctx2.lineTo(-r, 0);
        ctx2.closePath();
        ctx2.fill();
        ctx2.fillStyle = col.accent;
        ctx2.globalAlpha *= 0.35;
        ctx2.beginPath();
        ctx2.moveTo(0, -r);
        ctx2.lineTo(r, 0);
        ctx2.lineTo(0, 0);
        ctx2.closePath();
        ctx2.fill();
        ctx2.globalAlpha /= 0.35;
        const dm = { RIGHT: [r * 0.4, -r * 0.2], LEFT: [-r * 0.4, -r * 0.2], DOWN: [0, r * 0.3], UP: [0, -r * 0.4] };
        const [ex, ey] = dm[dir] || [r * 0.4, -r * 0.2];
        ctx2.fillStyle = col.eye;
        _eye(ctx2, ex, ey, 2);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.03);
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.moveTo(0, -r);
        ctx2.lineTo(r, 0);
        ctx2.lineTo(0, r);
        ctx2.lineTo(-r, 0);
        ctx2.closePath();
        ctx2.fill();
      }
    },
    // 6 ── Triangular (aponta na direção, corpo alterna)
    {
      id: "triangle",
      label: "Triangular",
      desc: "Tri\xE2ngulos apontando",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        const a = { RIGHT: 0, LEFT: Math.PI, DOWN: Math.PI / 2, UP: -Math.PI / 2 }[dir] || 0;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx2.lineTo(Math.cos(a + 2.3) * r * 0.9, Math.sin(a + 2.3) * r * 0.9);
        ctx2.lineTo(Math.cos(a - 2.3) * r * 0.9, Math.sin(a - 2.3) * r * 0.9);
        ctx2.closePath();
        ctx2.fill();
        ctx2.fillStyle = col.eye;
        _eye(ctx2, Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, 2.2);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.035);
        const rot = i % 2 === 0 ? 0 : Math.PI;
        ctx2.fillStyle = col.body;
        ctx2.save();
        ctx2.rotate(rot);
        ctx2.beginPath();
        ctx2.moveTo(0, -r);
        ctx2.lineTo(r * 0.87, r * 0.5);
        ctx2.lineTo(-r * 0.87, r * 0.5);
        ctx2.closePath();
        ctx2.fill();
        ctx2.restore();
      }
    },
    // 7 ── Escamas (círculo com escama sombreada)
    {
      id: "scales",
      label: "Escamas",
      desc: "Escamas sobrepostas",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
        const g = ctx2.createLinearGradient(0, -r, 0, 0);
        g.addColorStop(0, col.accent);
        g.addColorStop(1, col.body);
        ctx2.fillStyle = g;
        ctx2.globalAlpha *= 0.4;
        ctx2.beginPath();
        ctx2.arc(0, -r * 0.25, r * 0.5, Math.PI, 0);
        ctx2.fill();
        ctx2.globalAlpha /= 0.4;
        _eyePair(ctx2, col, dir, r * 0.18, r * 0.38);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.03);
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
        const prev = ctx2.globalAlpha;
        ctx2.globalAlpha = prev * (i % 2 === 0 ? 0.35 : 0.15);
        ctx2.fillStyle = col.accent;
        ctx2.beginPath();
        ctx2.arc(0, -r * 0.25, r * 0.55, Math.PI, 0);
        ctx2.fill();
        ctx2.globalAlpha = prev;
      }
    },
    // 8 ── Ondulada (elipse que oscila)
    {
      id: "wave",
      label: "Ondulada",
      desc: "Corpo serpenteia em onda",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
        const g = ctx2.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        g.addColorStop(0, "rgba(255,255,255,0.25)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx2.fillStyle = g;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
        _eyePair(ctx2, col, dir, r * 0.18, r * 0.38);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5);
        const wave = Math.sin(i * 0.7) * 2.5;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.ellipse(wave, 0, r * 0.82, r, 0, 0, TAU);
        ctx2.fill();
      }
    },
    // 9 ── Vazada (stroke only, cantos arredondados)
    {
      id: "hollow",
      label: "Vazada",
      desc: "Apenas borda vis\xEDvel",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 2;
        ctx2.strokeStyle = col.body;
        ctx2.lineWidth = 2.5;
        _roundRect(ctx2, -r, -r, r * 2, r * 2, 3);
        ctx2.stroke();
        ctx2.lineWidth = 0.8;
        ctx2.globalAlpha *= 0.4;
        ctx2.beginPath();
        ctx2.moveTo(-r, -r);
        ctx2.lineTo(r, r);
        ctx2.stroke();
        ctx2.globalAlpha /= 0.4;
        _eyePair(ctx2, col, dir, 2, r * 0.55);
      },
      drawBody(ctx2, c, i, col) {
        const s = Math.max(5, c - 4 - i * 0.05);
        ctx2.strokeStyle = col.body;
        ctx2.lineWidth = Math.max(1, 2.5 - i * 0.04);
        _roundRect(ctx2, -s / 2, -s / 2, s, s, 2);
        ctx2.stroke();
      }
    },
    // 10 ── Hexágono
    {
      id: "hex",
      label: "Hex\xE1gono",
      desc: "C\xE9lulas hexagonais",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        _hexPath(ctx2, r);
        ctx2.fill();
        ctx2.strokeStyle = col.accent;
        ctx2.lineWidth = 1;
        _hexPath(ctx2, r * 0.55);
        ctx2.stroke();
        const da = { RIGHT: 0, LEFT: Math.PI, DOWN: Math.PI / 2, UP: -Math.PI / 2 }[dir] || 0;
        ctx2.fillStyle = col.eye;
        _eye(ctx2, Math.cos(da) * r * 0.32, Math.sin(da) * r * 0.32, 2.5);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.03);
        ctx2.fillStyle = col.body;
        ctx2.save();
        ctx2.rotate(i % 2 === 0 ? 0 : Math.PI / 6);
        _hexPath(ctx2, r);
        ctx2.fill();
        ctx2.restore();
      }
    },
    // 11 ── Robô (parafusos + visor)
    {
      id: "robot",
      label: "Rob\xF4",
      desc: "Segmentos mec\xE2nicos",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        ctx2.fillRect(-r, -r, r * 2, r * 2);
        ctx2.fillStyle = col.accent;
        ctx2.globalAlpha *= 0.8;
        ctx2.fillRect(-r * 0.5, -r * 0.45, r, r * 0.5);
        ctx2.globalAlpha /= 0.8;
        ctx2.strokeStyle = col.eye;
        ctx2.lineWidth = 0.8;
        ctx2.strokeRect(-r * 0.5, -r * 0.45, r, r * 0.5);
        const da = { RIGHT: [r * 0.6, 0], LEFT: [-r * 0.6, 0], DOWN: [0, r * 0.6], UP: [0, -r * 0.6] };
        const [ex, ey] = da[dir] || [r * 0.6, 0];
        ctx2.fillStyle = col.eye;
        _eye(ctx2, ex, ey, 2);
        ctx2.fillStyle = col.accent;
        [[-r * 0.75, -r * 0.75], [r * 0.75, -r * 0.75], [-r * 0.75, r * 0.75], [r * 0.75, r * 0.75]].forEach(([px, py]) => {
          ctx2.beginPath();
          ctx2.arc(px, py, 2, 0, TAU);
          ctx2.fill();
          ctx2.strokeStyle = col.body;
          ctx2.lineWidth = 0.5;
          ctx2.stroke();
        });
      },
      drawBody(ctx2, c, i, col) {
        const s = c - 4;
        ctx2.fillStyle = col.body;
        ctx2.fillRect(-s / 2, -s / 2, s, s);
        ctx2.strokeStyle = col.accent;
        ctx2.lineWidth = 0.8;
        ctx2.strokeRect(-s / 2 + 1, -s / 2 + 1, s - 2, s - 2);
        if (i % 3 === 0) {
          ctx2.fillStyle = col.eye;
          ctx2.fillRect(-1.5, -1.5, 3, 3);
        }
      }
    },
    // 12 ── Fantasma (translúcido com "olhinhos" assustados)
    {
      id: "ghost",
      label: "Fantasma",
      desc: "Transl\xFAcido e assustado",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        const prev = ctx2.globalAlpha;
        if (col.glow) {
          ctx2.shadowBlur = 14;
          ctx2.shadowColor = col.glow;
        }
        ctx2.globalAlpha = prev * 0.72;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.arc(0, -1, r, Math.PI, 0);
        ctx2.lineTo(r, r * 0.8);
        ctx2.lineTo(r * 0.6, r * 0.4);
        ctx2.lineTo(r * 0.2, r * 0.8);
        ctx2.lineTo(-r * 0.2, r * 0.4);
        ctx2.lineTo(-r * 0.6, r * 0.8);
        ctx2.lineTo(-r, r * 0.4);
        ctx2.closePath();
        ctx2.fill();
        ctx2.shadowBlur = 0;
        ctx2.globalAlpha = prev;
        ctx2.fillStyle = col.eye;
        _eye(ctx2, -r * 0.32, -r * 0.3, 2.5);
        _eye(ctx2, r * 0.32, -r * 0.3, 2.5);
        ctx2.fillStyle = col.body;
        _eye(ctx2, -r * 0.32, -r * 0.22, 1);
        _eye(ctx2, r * 0.32, -r * 0.22, 1);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5);
        const prev = ctx2.globalAlpha;
        ctx2.globalAlpha = prev * Math.max(0.25, 0.72 - i * 0.04);
        if (col.glow && i < 4) {
          ctx2.shadowBlur = 8 - i * 2;
          ctx2.shadowColor = col.glow;
        }
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
        ctx2.shadowBlur = 0;
        ctx2.globalAlpha = prev;
      }
    },
    // 13 ── Estrela (5 pontas com brilho)
    {
      id: "star",
      label: "Estrela",
      desc: "5 pontas radiantes",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        if (col.glow) {
          ctx2.shadowBlur = 12;
          ctx2.shadowColor = col.glow;
        }
        ctx2.fillStyle = col.body;
        _star5(ctx2, r, r * 0.42);
        ctx2.fill();
        ctx2.shadowBlur = 0;
        ctx2.fillStyle = col.accent;
        ctx2.globalAlpha *= 0.4;
        _star5(ctx2, r * 0.6, r * 0.25);
        ctx2.fill();
        ctx2.globalAlpha /= 0.4;
        ctx2.fillStyle = col.eye;
        _eye(ctx2, 0, 0, 2.2);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.04);
        ctx2.fillStyle = col.body;
        ctx2.save();
        ctx2.rotate(i * 0.45);
        _star5(ctx2, r, r * 0.42);
        ctx2.fill();
        ctx2.restore();
      }
    },
    // 14 ── Cápsula
    {
      id: "capsule",
      label: "C\xE1psula",
      desc: "P\xEDlula suave",
      drawHead(ctx2, c, dir, col) {
        const horiz = dir === "RIGHT" || dir === "LEFT";
        const w = c - 3, h = c - 6, rx = h / 2;
        ctx2.fillStyle = col.body;
        if (horiz) _roundRect(ctx2, -w / 2, -h / 2, w, h, rx);
        else _roundRect(ctx2, -h / 2, -w / 2, h, w, rx);
        ctx2.fill();
        const g = ctx2.createLinearGradient(0, -w / 2, 0, 0);
        g.addColorStop(0, "rgba(255,255,255,0.2)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx2.fillStyle = g;
        if (horiz) _roundRect(ctx2, -w / 2, -h / 2, w, h, rx);
        else _roundRect(ctx2, -h / 2, -w / 2, h, w, rx);
        ctx2.fill();
        _eyePair(ctx2, col, dir, 1.8, horiz ? w * 0.28 : h * 0.28);
      },
      drawBody(ctx2, c, i, col) {
        const w = c - 4, h = c - 6, rx = h / 2;
        ctx2.fillStyle = col.body;
        _roundRect(ctx2, -w / 2, -h / 2, w, h, rx);
        ctx2.fill();
      }
    },
    // 15 ── Plasma (orgânico pulsante)
    {
      id: "plasma",
      label: "Plasma",
      desc: "Forma viva que pulsa",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        const t = Date.now() * 18e-4;
        if (col.glow) {
          ctx2.shadowBlur = 16;
          ctx2.shadowColor = col.glow;
        }
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        for (let a = 0; a < TAU; a += 0.18) {
          const rad = r + Math.sin(a * 4 + t) * 2.2 + Math.cos(a * 2 - t) * 1.2;
          a < 0.01 ? ctx2.moveTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx2.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx2.closePath();
        ctx2.fill();
        ctx2.shadowBlur = 0;
        _eyePair(ctx2, col, dir, 2, r * 0.38);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.03);
        const t = Date.now() * 18e-4;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        for (let a = 0; a < TAU; a += 0.22) {
          const rad = r + Math.sin(a * 3 + t + i * 0.6) * 1.8;
          a < 0.01 ? ctx2.moveTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx2.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx2.closePath();
        ctx2.fill();
      }
    },
    // 16 ── Cristal (facetas semitransparentes)
    {
      id: "crystal",
      label: "Cristal",
      desc: "Facetas transl\xFAcidas",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        _hexPath(ctx2, r);
        ctx2.fill();
        ctx2.fillStyle = col.accent;
        ctx2.globalAlpha *= 0.45;
        ctx2.beginPath();
        ctx2.moveTo(0, -r);
        ctx2.lineTo(r * 0.87, r * 0.5);
        ctx2.lineTo(0, 0);
        ctx2.closePath();
        ctx2.fill();
        ctx2.globalAlpha /= 0.45;
        ctx2.fillStyle = "rgba(0,0,0,0.25)";
        ctx2.beginPath();
        ctx2.moveTo(-r * 0.87, r * 0.5);
        ctx2.lineTo(r * 0.87, r * 0.5);
        ctx2.lineTo(0, 0);
        ctx2.closePath();
        ctx2.fill();
        ctx2.strokeStyle = col.accent;
        ctx2.lineWidth = 0.8;
        _hexPath(ctx2, r);
        ctx2.stroke();
        ctx2.fillStyle = col.eye;
        _eye(ctx2, 0, 0, 2.5);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.03);
        ctx2.save();
        ctx2.rotate(i % 2 === 0 ? 0 : Math.PI / 3);
        ctx2.fillStyle = col.body;
        _hexPath(ctx2, r);
        ctx2.fill();
        ctx2.fillStyle = col.accent;
        ctx2.globalAlpha *= 0.25;
        ctx2.beginPath();
        ctx2.moveTo(0, -r);
        ctx2.lineTo(r * 0.87, r * 0.5);
        ctx2.lineTo(0, 0);
        ctx2.closePath();
        ctx2.fill();
        ctx2.globalAlpha /= 0.25;
        ctx2.strokeStyle = col.accent;
        ctx2.lineWidth = 0.5;
        _hexPath(ctx2, r);
        ctx2.stroke();
        ctx2.restore();
      }
    },
    ,
    // 17 ── Cobra (escamada realista)
    {
      id: "snake_skin",
      label: "Cobra",
      desc: "Escamas realistas em gradiente",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.ellipse(0, 0, r, r * 0.9, 0, 0, TAU);
        ctx2.fill();
        const g = ctx2.createLinearGradient(-r, 0, r, 0);
        g.addColorStop(0, col.body);
        g.addColorStop(0.5, col.accent);
        g.addColorStop(1, col.body);
        ctx2.fillStyle = g;
        ctx2.globalAlpha *= 0.4;
        ctx2.beginPath();
        ctx2.ellipse(0, 0, r * 0.7, r * 0.6, 0, 0, TAU);
        ctx2.fill();
        ctx2.globalAlpha /= 0.4;
        const da = { RIGHT: r, LEFT: -r, DOWN: 0, UP: 0 }[dir] || r;
        const db = { RIGHT: 0, LEFT: 0, DOWN: r, UP: -r }[dir] || 0;
        ctx2.strokeStyle = "#e63950";
        ctx2.lineWidth = 1;
        ctx2.beginPath();
        ctx2.moveTo(da * 0.8, db * 0.8);
        ctx2.lineTo(da * 1.2 + db * 0.3, db * 1.2 + da * 0.3);
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.moveTo(da * 0.8, db * 0.8);
        ctx2.lineTo(da * 1.2 - db * 0.3, db * 1.2 - da * 0.3);
        ctx2.stroke();
        _eyePair(ctx2, col, dir, r * 0.2, r * 0.38);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.025);
        const g = ctx2.createLinearGradient(-r, 0, r, 0);
        g.addColorStop(0, col.body);
        g.addColorStop(0.5, col.accent);
        g.addColorStop(1, col.body);
        ctx2.fillStyle = i % 2 === 0 ? col.body : g;
        ctx2.beginPath();
        ctx2.ellipse(0, 0, r * 0.9, r, 0, 0, TAU);
        ctx2.fill();
        ctx2.fillStyle = col.accent;
        ctx2.globalAlpha *= 0.25;
        ctx2.beginPath();
        ctx2.ellipse(0, r * 0.2, r * 0.35, r * 0.3, 0, 0, TAU);
        ctx2.fill();
        ctx2.globalAlpha /= 0.25;
      }
    },
    // 18 ── Fogo (chamas animadas)
    {
      id: "fire",
      label: "Fogo",
      desc: "Chamas vivas e pulsantes",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        const t = Date.now() * 3e-3;
        ctx2.fillStyle = col.body || "#dc2626";
        ctx2.beginPath();
        for (let a = 0; a < TAU; a += 0.15) {
          const flame = r + Math.sin(a * 5 + t) * 2.5 + Math.cos(a * 3 - t * 1.5) * 1.5;
          a < 0.01 ? ctx2.moveTo(Math.cos(a) * flame, Math.sin(a) * flame) : ctx2.lineTo(Math.cos(a) * flame, Math.sin(a) * flame);
        }
        ctx2.closePath();
        ctx2.fill();
        const g = ctx2.createRadialGradient(0, 0, 0, 0, 0, r * 0.6);
        g.addColorStop(0, "rgba(255,220,50,0.7)");
        g.addColorStop(1, "rgba(255,100,0,0)");
        ctx2.fillStyle = g;
        ctx2.beginPath();
        ctx2.arc(0, 0, r * 0.6, 0, TAU);
        ctx2.fill();
        ctx2.fillStyle = col.eye || "#fff";
        _eye(ctx2, -r * 0.28, -r * 0.2, 2);
        _eye(ctx2, r * 0.28, -r * 0.2, 2);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.03);
        const t = Date.now() * 3e-3;
        const g = ctx2.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, "rgba(255,200,0,0.8)");
        g.addColorStop(0.5, col.body || "#dc2626");
        g.addColorStop(1, "rgba(50,0,0,0.6)");
        ctx2.fillStyle = g;
        ctx2.beginPath();
        for (let a = 0; a < TAU; a += 0.2) {
          const fl = r + Math.sin(a * 4 + t + i * 0.5) * 1.8;
          a < 0.01 ? ctx2.moveTo(Math.cos(a) * fl, Math.sin(a) * fl) : ctx2.lineTo(Math.cos(a) * fl, Math.sin(a) * fl);
        }
        ctx2.closePath();
        ctx2.fill();
      }
    },
    // 19 ── Gelo (cristais facetados e frios)
    {
      id: "ice",
      label: "Gelo",
      desc: "Cristais de gelo frios e afiados",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        ctx2.fillStyle = col.body;
        _hexPath(ctx2, r);
        ctx2.fill();
        ctx2.strokeStyle = "rgba(255,255,255,0.6)";
        ctx2.lineWidth = 0.8;
        [0, 60, 120].forEach((deg) => {
          const a = deg * Math.PI / 180;
          ctx2.beginPath();
          ctx2.moveTo(0, 0);
          ctx2.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx2.stroke();
        });
        ctx2.fillStyle = "rgba(255,255,255,0.35)";
        ctx2.beginPath();
        ctx2.moveTo(0, -r);
        ctx2.lineTo(r * 0.5, -r * 0.3);
        ctx2.lineTo(0, 0);
        ctx2.closePath();
        ctx2.fill();
        ctx2.fillStyle = col.eye;
        _eye(ctx2, -r * 0.28, -r * 0.1, 2);
        _eye(ctx2, r * 0.28, -r * 0.1, 2);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.03);
        ctx2.fillStyle = col.body;
        ctx2.save();
        ctx2.rotate(i * Math.PI / 3);
        _hexPath(ctx2, r);
        ctx2.fill();
        ctx2.strokeStyle = "rgba(255,255,255,0.4)";
        ctx2.lineWidth = 0.7;
        ctx2.beginPath();
        ctx2.moveTo(0, -r * 0.5);
        ctx2.lineTo(0, r * 0.5);
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.moveTo(-r * 0.4, r * 0.25);
        ctx2.lineTo(r * 0.4, -r * 0.25);
        ctx2.stroke();
        ctx2.restore();
      }
    },
    // 20 ── Elétrica (raios e energia)
    {
      id: "electric",
      label: "El\xE9trica",
      desc: "Raios de energia pulsantes",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        const t = Date.now() * 5e-3;
        if (col.glow) {
          ctx2.shadowBlur = 18;
          ctx2.shadowColor = col.glow || "#fde68a";
        }
        ctx2.fillStyle = col.body;
        _roundRect(ctx2, -r, -r, r * 2, r * 2, 3);
        ctx2.fill();
        ctx2.shadowBlur = 0;
        ctx2.strokeStyle = col.accent || "#fde68a";
        ctx2.lineWidth = 1.2;
        for (let k = 0; k < 3; k++) {
          const angle = k * Math.PI * 2 / 3 + t;
          ctx2.beginPath();
          ctx2.moveTo(0, 0);
          let px = 0, py = 0;
          for (let s = 0; s < 4; s++) {
            px += Math.cos(angle + Math.sin(t + s) * 1.2) * r * 0.3;
            py += Math.sin(angle + Math.cos(t + s) * 1.2) * r * 0.3;
            ctx2.lineTo(px, py);
          }
          ctx2.stroke();
        }
        ctx2.fillStyle = col.eye;
        _eye(ctx2, -r * 0.3, -r * 0.2, 2);
        _eye(ctx2, r * 0.3, -r * 0.2, 2);
      },
      drawBody(ctx2, c, i, col) {
        const s = Math.max(5, c - 3 - i * 0.04);
        const t = Date.now() * 5e-3;
        if (col.glow && i < 3) {
          ctx2.shadowBlur = 10 - i * 3;
          ctx2.shadowColor = col.glow || "#fde68a";
        }
        ctx2.fillStyle = col.body;
        _roundRect(ctx2, -s / 2, -s / 2, s, s, 2);
        ctx2.fill();
        ctx2.shadowBlur = 0;
        if (i % 2 === 0) {
          ctx2.strokeStyle = col.accent || "#fde68a";
          ctx2.lineWidth = 0.8;
          ctx2.beginPath();
          ctx2.moveTo(-s * 0.3, Math.sin(t + i) * s * 0.3);
          ctx2.lineTo(s * 0.3, -Math.sin(t + i) * s * 0.3);
          ctx2.stroke();
        }
      }
    },
    // 21 ── Sombra (escura, borrões de fumaça)
    {
      id: "shadow",
      label: "Sombra",
      desc: "Rastro de sombra e fuma\xE7a",
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        const g = ctx2.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.3);
        g.addColorStop(0, col.body);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx2.fillStyle = g;
        ctx2.beginPath();
        ctx2.arc(0, 0, r * 1.3, 0, TAU);
        ctx2.fill();
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.arc(0, 0, r * 0.85, 0, TAU);
        ctx2.fill();
        if (col.glow) {
          ctx2.shadowBlur = 8;
          ctx2.shadowColor = col.glow;
        }
        ctx2.fillStyle = col.eye;
        _eye(ctx2, -r * 0.3, -r * 0.15, 2.5);
        _eye(ctx2, r * 0.3, -r * 0.15, 2.5);
        ctx2.shadowBlur = 0;
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(2, c / 2 - 1.5 - i * 0.035);
        const prev = ctx2.globalAlpha;
        const g = ctx2.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
        g.addColorStop(0, col.body);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx2.globalAlpha = prev * (0.6 - i * 0.03);
        ctx2.fillStyle = g;
        ctx2.beginPath();
        ctx2.arc(0, 0, r * 1.2, 0, TAU);
        ctx2.fill();
        ctx2.globalAlpha = prev;
        ctx2.fillStyle = col.body;
        ctx2.beginPath();
        ctx2.arc(0, 0, r * 0.75, 0, TAU);
        ctx2.fill();
      }
    },
    // 22 ── Arco-íris (gradiente que percorre o corpo)
    {
      id: "rainbow",
      label: "Arco-\xCDris",
      desc: "Cores que percorrem o corpo",
      _hue(i) {
        return (Date.now() * 0.05 + i * 25) % 360;
      },
      drawHead(ctx2, c, dir, col) {
        const r = c / 2 - 1;
        const hue = this._hue(0);
        ctx2.fillStyle = `hsl(${hue},80%,50%)`;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
        ctx2.fillStyle = "rgba(255,255,255,0.3)";
        ctx2.beginPath();
        ctx2.arc(-r * 0.25, -r * 0.25, r * 0.45, 0, TAU);
        ctx2.fill();
        ctx2.fillStyle = "rgba(0,0,0,0.8)";
        _eye(ctx2, -r * 0.32, -r * 0.15, 2.2);
        _eye(ctx2, r * 0.32, -r * 0.15, 2.2);
      },
      drawBody(ctx2, c, i, col) {
        const r = Math.max(3, c / 2 - 1.5 - i * 0.03);
        const hue = this._hue(i);
        ctx2.fillStyle = `hsl(${hue},75%,50%)`;
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, TAU);
        ctx2.fill();
      }
    }
  ]);
  var SkinManager = class {
    #skinId = "classic";
    #colorId = "black";
    constructor() {
      try {
        this.#skinId = localStorage.getItem(CFG.STORAGE_KEY + "skin") || "classic";
        this.#colorId = localStorage.getItem(CFG.STORAGE_KEY + "color") || "black";
      } catch (_) {
      }
    }
    getSkin() {
      return SNAKE_SKINS.find((s) => s.id === this.#skinId) || SNAKE_SKINS[0];
    }
    getColor() {
      return SNAKE_COLORS.find((c) => c.id === this.#colorId) || SNAKE_COLORS[0];
    }
    getSkinId() {
      return this.#skinId;
    }
    getColorId() {
      return this.#colorId;
    }
    setSkin(id) {
      this.#skinId = id;
      try {
        localStorage.setItem(CFG.STORAGE_KEY + "skin", id);
      } catch (_) {
      }
      Bus.emit("skinChanged", { skinId: id, colorId: this.#colorId });
    }
    setColor(id) {
      this.#colorId = id;
      try {
        localStorage.setItem(CFG.STORAGE_KEY + "color", id);
      } catch (_) {
      }
      Bus.emit("skinChanged", { skinId: this.#skinId, colorId: id });
    }
  };
  var SnakeSkin = new SkinManager();

  // js/renderer/renderer.js
  var canvas = null;
  var ctx = null;
  var gameState = null;
  var gameEngine = null;
  function rrect(cx, x, y, w, h, r) {
    if (cx.roundRect) {
      cx.roundRect(x, y, w, h, r);
      return;
    }
    const R = Math.min(r, w / 2, h / 2);
    cx.moveTo(x + R, y);
    cx.lineTo(x + w - R, y);
    cx.quadraticCurveTo(x + w, y, x + w, y + R);
    cx.lineTo(x + w, y + h - R);
    cx.quadraticCurveTo(x + w, y + h, x + w - R, y + h);
    cx.lineTo(x + R, y + h);
    cx.quadraticCurveTo(x, y + h, x, y + h - R);
    cx.lineTo(x, y + R);
    cx.quadraticCurveTo(x, y, x + R, y);
    cx.closePath();
  }
  var Animator = class {
    #t = [];
    #n = /* @__PURE__ */ new Map();
    add({ name, duration, from, to, ease = Ease.easeOut, onUpdate, onDone } = {}) {
      if (name) this.cancel(name);
      const tw = { name, start: performance.now(), duration, from, to, ease, onUpdate, onDone, done: false };
      this.#t.push(tw);
      if (name) this.#n.set(name, tw);
      return tw;
    }
    tick(now) {
      for (let i = this.#t.length - 1; i >= 0; i--) {
        const tw = this.#t[i];
        if (tw.done) {
          this.#t.splice(i, 1);
          continue;
        }
        const raw = Math.min((now - tw.start) / tw.duration, 1);
        tw.onUpdate?.(tw.from + (tw.to - tw.from) * tw.ease(raw), raw);
        if (raw >= 1) {
          tw.done = true;
          tw.onDone?.();
          if (tw.name) this.#n.delete(tw.name);
          this.#t.splice(i, 1);
        }
      }
    }
    cancel(n) {
      const tw = this.#n.get(n);
      if (tw) {
        tw.done = true;
        this.#n.delete(n);
      }
    }
    cancelAll() {
      this.#t.forEach((t) => t.done = true);
      this.#t.length = 0;
      this.#n.clear();
    }
  };
  var ParticleSystem = class {
    #pool = [];
    #max;
    #texts = [];
    constructor(max) {
      this.#max = max || CFG.PARTICLE_MAX;
    }
    #acquire() {
      for (const p of this.#pool) if (p.life <= 0) return p;
      if (this.#pool.length < this.#max) {
        const p = {};
        this.#pool.push(p);
        return p;
      }
      return this.#pool[0];
    }
    #emit(p, wx, wy, { size, life, decay, gravity, color, shape }) {
      p.x = wx;
      p.y = wy;
      p.size = MathUtil.rand(size[0], size[1]);
      p.life = MathUtil.rand(life[0], life[1]);
      p.maxLife = p.life;
      p.decay = MathUtil.rand(decay[0], decay[1]);
      p.gravity = gravity;
      p.color = color;
      p.shape = shape;
      return p;
    }
    burst(wx, wy, {
      count = 8,
      speed = [1.5, 3.5],
      size = [1.5, 3.5],
      life = [0.7, 1],
      decay = [0.04, 0.08],
      gravity = 0.1,
      color = CFG.FG,
      glow = 0,
      shape = "circle",
      spread = Math.PI * 2,
      angle = 0
    } = {}) {
      for (let i = 0; i < count; i++) {
        const p = this.#emit(this.#acquire(), wx, wy, { size, life, decay, gravity, color, shape });
        const a = angle + (Math.random() - 0.5) * spread;
        const s = MathUtil.rand(speed[0], speed[1]);
        p.vx = Math.cos(a) * s;
        p.vy = Math.sin(a) * s;
        p.glow = glow;
      }
    }
    ring(wx, wy, { count = 16, radius = 0, speed = 2.5, size = [1.5, 2.5], color = CFG.FG, glow = 0, decay = [0.03, 0.06] } = {}) {
      for (let i = 0; i < count; i++) {
        const a = i / count * MathUtil.tau;
        const p = this.#emit(
          this.#acquire(),
          wx + Math.cos(a) * radius,
          wy + Math.sin(a) * radius,
          { size, life: [1, 1], decay, gravity: 0, color, shape: "circle" }
        );
        p.vx = Math.cos(a) * speed;
        p.vy = Math.sin(a) * speed;
        p.glow = glow;
      }
    }
    spark(wx, wy, { color = CFG.FG, size = 1.8, glow = 4 } = {}) {
      const p = this.#emit(
        this.#acquire(),
        wx,
        wy,
        { size: [size, size], life: [0.4, 0.6], decay: [0.06, 0.09], gravity: 0, color, shape: "circle" }
      );
      p.vx = MathUtil.rand(-0.5, 0.5);
      p.vy = MathUtil.rand(-0.5, 0.5);
      p.glow = glow;
    }
    // Texto flutuante com pontuação
    addText(x, y, text, color, size = 10) {
      this.#texts.push({ x, y, vy: -1.6, life: 1, text, color, size, born: performance.now() });
    }
    draw(c) {
      c.save();
      for (const p of this.#pool) {
        if (p.life <= 0) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= p.decay;
        if (p.life <= 0) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        c.globalAlpha = alpha;
        c.fillStyle = p.color;
        if (p.glow > 0) {
          c.shadowBlur = p.glow;
          c.shadowColor = p.color;
        }
        if (p.shape === "circle") {
          c.beginPath();
          c.arc(p.x, p.y, p.size / 2, 0, MathUtil.tau);
          c.fill();
        } else {
          c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        if (p.glow > 0) c.shadowBlur = 0;
      }
      const now = performance.now();
      this.#texts = this.#texts.filter((t) => {
        const age = (now - t.born) / 1e3;
        if (age > 1.1) return false;
        t.y += t.vy;
        t.vy *= 0.97;
        const alpha = 1 - Math.pow(age / 1.1, 2);
        const sc = 1 + age * 0.4;
        c.globalAlpha = Math.max(0, alpha);
        c.save();
        c.translate(t.x, t.y);
        c.scale(sc, sc);
        c.font = `bold ${t.size}px "Space Mono",monospace`;
        c.fillStyle = "#fff";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.shadowBlur = 10;
        c.shadowColor = t.color;
        c.strokeStyle = "rgba(0,0,0,0.7)";
        c.lineWidth = 3;
        c.strokeText(t.text, 0, 0);
        c.fillText(t.text, 0, 0);
        c.shadowBlur = 0;
        c.restore();
        return true;
      });
      c.globalAlpha = 1;
      c.restore();
    }
    clear() {
      this.#pool.forEach((p) => p.life = 0);
      this.#texts = [];
    }
  };
  var ScreenShake = class {
    #mag = 0;
    #frames = 0;
    #max = 0;
    x = 0;
    y = 0;
    trigger(m = 6, f = 10) {
      this.#mag = Math.max(this.#mag, m);
      this.#max = Math.max(this.#max, f);
      this.#frames = Math.max(this.#frames, f);
    }
    update() {
      if (this.#frames <= 0) {
        this.x = this.y = 0;
        return;
      }
      const d = this.#frames / this.#max;
      this.x = (Math.random() - 0.5) * 2 * this.#mag * d;
      this.y = (Math.random() - 0.5) * 2 * this.#mag * d;
      if (--this.#frames <= 0) this.#mag = this.#max = 0;
    }
    reset() {
      this.#frames = this.#mag = this.#max = 0;
      this.x = this.y = 0;
    }
  };
  var Renderer = (() => {
    const particles = new ParticleSystem();
    const shake = new ScreenShake();
    const animator = new Animator();
    const orbitMap = /* @__PURE__ */ new WeakMap();
    const foodAnim = /* @__PURE__ */ new WeakMap();
    const _trail = [];
    let _rafId = null, _running = false;
    let flashAlpha = 0, flashColor = "#111", gridPulse = 0;
    let levelText = "", levelAlpha = 0, edgeDanger = 0;
    let crumbleActive = false, crumbleSegs = [];
    let _themeBg = "#f4f1ec", _themeFg = "#111110", _themeFrame = 0;
    function _readTheme(now) {
      if (now - _themeFrame < 500) return;
      _themeFrame = now;
      const root = document.documentElement;
      _themeBg = getComputedStyle(root).getPropertyValue("--bg").trim() || "#f4f1ec";
      _themeFg = getComputedStyle(root).getPropertyValue("--fg").trim() || "#111110";
    }
    const _dynWall = /* @__PURE__ */ new Map();
    const DYN_FADE = 500;
    Bus.on("dynWallSpawned", ({ cells }) => {
      const now = performance.now();
      cells.forEach((c2) => _dynWall.set(`${c2.x},${c2.y}`, { alpha: 0, phase: "in", born: now }));
      if (canvas) {
        const cx = cells.reduce((s, c2) => s + c2.x, 0) / cells.length * CFG.CELL + CFG.CELL / 2;
        const cy = cells.reduce((s, c2) => s + c2.y, 0) / cells.length * CFG.CELL + CFG.CELL / 2;
        particles.ring(cx, cy, { count: 14, speed: 2.8, radius: 5, color: "#ff6b35", glow: 10, decay: [0.035, 0.07] });
        shake.trigger(2, 5);
      }
    });
    Bus.on("dynWallExpired", ({ cells }) => {
      const now = performance.now();
      cells.forEach((c2) => {
        const k = `${c2.x},${c2.y}`;
        const e = _dynWall.get(k);
        _dynWall.set(k, { alpha: e?.alpha ?? 1, phase: "out", born: now });
      });
    });
    Bus.on("dynWallsReset", () => _dynWall.clear());
    const interp = { prev: [], curr: [], lastTick: 0, interval: 145, pos: [] };
    function _snap() {
      if (!gameState?.snake) return;
      interp.prev = [...interp.curr];
      interp.curr = gameState.snake.map((s) => ({ x: s.x, y: s.y }));
      interp.lastTick = performance.now();
    }
    Bus.on("stateUpdate", () => {
      if (gameState?.running && !gameState?.paused) _snap();
    });
    function _computeInterp(now) {
      if (!interp.prev.length || !interp.curr.length) {
        interp.pos = (interp.curr || []).map((s) => ({ px: s.x * CFG.CELL, py: s.y * CFG.CELL }));
        return;
      }
      let t = Math.min((now - interp.lastTick) / Math.max(interp.interval, 50), 1);
      t = Ease.easeOut(t);
      const n = Math.max(interp.prev.length, interp.curr.length);
      interp.pos = [];
      for (let i = 0; i < n; i++) {
        const c = interp.curr[i] || interp.curr[interp.curr.length - 1];
        const p = interp.prev[i] || interp.prev[interp.prev.length - 1] || c;
        let dx = c.x - p.x, dy = c.y - p.y;
        if (Math.abs(dx) > CFG.COLS / 2) dx = dx > 0 ? dx - CFG.COLS : dx + CFG.COLS;
        if (Math.abs(dy) > CFG.ROWS / 2) dy = dy > 0 ? dy - CFG.ROWS : dy + CFG.ROWS;
        interp.pos.push({ px: (p.x + dx * t) * CFG.CELL, py: (p.y + dy * t) * CFG.CELL });
      }
    }
    let _grain = null;
    function _mkGrain() {
      _grain = document.createElement("canvas");
      _grain.width = 64;
      _grain.height = 64;
      const gc = _grain.getContext("2d"), d = gc.createImageData(64, 64);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = Math.random() < 0.5 ? 0 : 255;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        d.data[i + 3] = Math.floor(Math.random() * 7);
      }
      gc.putImageData(d, 0, 0);
    }
    function init(c, stateRef, engineRef) {
      if (!c) return;
      canvas = c;
      ctx = canvas.getContext("2d", { alpha: false });
      canvas.width = CFG.COLS * CFG.CELL;
      canvas.height = CFG.ROWS * CFG.CELL;
      gameState = stateRef;
      gameEngine = engineRef;
      _running = true;
      _mkGrain();
      _loop();
      console.log("[Renderer] %dx%d", canvas.width, canvas.height);
    }
    function stop() {
      _running = false;
      if (_rafId) cancelAnimationFrame(_rafId), _rafId = null;
    }
    function onEat(food, combo) {
      const wx = food.x * CFG.CELL + CFG.CELL / 2, wy = food.y * CFG.CELL + CFG.CELL / 2;
      const tier = food.pts >= 300 ? 3 : food.pts >= 100 ? 2 : food.pts >= 50 ? 1 : 0;
      const counts = [8, 14, 22, 32];
      const speeds = [[1.5, 3], [2, 4.5], [2.5, 5.5], [3, 7]];
      const glows = [0, 8, 14, 20];
      particles.burst(wx, wy, {
        count: counts[tier],
        speed: speeds[tier],
        size: [1.5 + tier, 3 + tier],
        color: food.color || _themeFg,
        glow: glows[tier],
        gravity: tier >= 2 ? 0.05 : 0.1,
        shape: "circle"
      });
      if (tier >= 2) {
        particles.ring(wx, wy, { count: 16 + tier * 4, speed: 3 + tier, radius: 6, color: food.color || _themeFg, glow: glows[tier], decay: [0.03, 0.055] });
      }
      if (tier === 3) shake.trigger(7, 15);
      else if (tier === 2) shake.trigger(4, 9);
      else if (combo >= 5) shake.trigger(2, 6);
      const mult = gameState?.pwActive && gameState.pwKind === "x3" ? 3 : gameState?.pwActive && gameState.pwKind === "x2" ? 2 : 1;
      const displayed = food.pts * (gameState?.combo || 1) * mult;
      particles.addText(wx, wy - 10, `+${displayed}`, food.color || _themeFg, 9 + tier * 2);
      const head = gameState?.snake?.[0];
      if (head) _trail.unshift({ x: head.x, y: head.y, alpha: 0.4, color: SnakeSkin.getColor().body || _themeFg });
      _gridPulse(0.2 + tier * 0.15, 400);
    }
    function onDeath(snakeBody) {
      crumbleActive = true;
      const col = SnakeSkin.getColor().body || _themeFg;
      crumbleSegs = snakeBody.map((seg, i) => ({
        x: seg.x * CFG.CELL + CFG.CELL / 2,
        y: seg.y * CFG.CELL + CFG.CELL / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.3) * 4 - 1,
        rot: 0,
        rotV: (Math.random() - 0.5) * 0.25,
        delay: i * 10,
        born: performance.now(),
        col
      }));
      setTimeout(() => {
        crumbleActive = false;
        crumbleSegs.length = 0;
      }, 1400);
      snakeBody.forEach((seg, i) => {
        if (i % 2) return;
        particles.burst(
          seg.x * CFG.CELL + CFG.CELL / 2,
          seg.y * CFG.CELL + CFG.CELL / 2,
          { count: 5, speed: [2, 5], size: [2, 5], gravity: 0.14, color: col }
        );
      });
      shake.trigger(14, 24);
      _flash(_themeFg, 0.4, 300);
    }
    function onLevelUp(level) {
      const cx = canvas.width / 2, cy = canvas.height / 2;
      particles.ring(cx, cy, { count: 56, speed: 5.5, radius: 30, glow: 18, color: _themeFg });
      particles.burst(cx, cy, { count: 40, size: [2, 5], speed: [2, 5.5], gravity: 0.04, color: _themeFg });
      _flash(_themeFg, 0.22, 700);
      levelText = `FASE ${level}`;
      levelAlpha = 1;
      animator.add({ name: "lv", duration: 2400, from: 1, to: 0, ease: Ease.easeIn, onUpdate: (v) => levelAlpha = v });
      _gridPulse(1.3, 1e3);
    }
    function onCombo(combo) {
      if (combo >= 5) shake.trigger(2 + combo * 0.35, 7);
    }
    function onPowerup() {
      particles.ring(canvas.width / 2, canvas.height / 2, { count: 26, speed: 4, radius: 14, decay: [0.025, 0.05], glow: 14, color: _themeFg });
      _gridPulse(0.6, 600);
    }
    function clearEffects() {
      particles.clear();
      shake.reset();
      animator.cancelAll();
      flashAlpha = gridPulse = levelAlpha = edgeDanger = 0;
      _trail.length = 0;
      crumbleActive = false;
      crumbleSegs = [];
      interp.pos = [];
      interp.prev = [];
      interp.curr = [];
      _dynWall.clear();
    }
    function _flash(col, a, dur) {
      flashColor = col;
      flashAlpha = a;
      animator.add({ name: "fl", duration: dur, from: a, to: 0, ease: Ease.easeOut, onUpdate: (v) => flashAlpha = v });
    }
    function _gridPulse(a, dur) {
      gridPulse = Math.max(gridPulse, a);
      animator.add({ name: "gp", duration: dur, from: a, to: 0, ease: Ease.easeOut, onUpdate: (v) => gridPulse = Math.max(gridPulse, v) });
    }
    function _loop() {
      if (!_running) return;
      _rafId = requestAnimationFrame(_loop);
      const now = performance.now();
      _readTheme(now);
      animator.tick(now);
      shake.update();
      _computeInterp(now);
      ctx.save();
      ctx.translate(shake.x, shake.y);
      _drawBg(now);
      _drawGrain();
      _drawWalls(now);
      _drawEdgeDanger(now);
      _drawTrail();
      particles.draw(ctx);
      _drawFoods(now);
      _drawPowerup(now);
      _drawSnake(now);
      _drawCrumble(now);
      ctx.restore();
      _drawOverlays(now);
    }
    function _drawBg(now) {
      ctx.fillStyle = _themeBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const a = 0.028 + gridPulse * 0.16;
      ctx.strokeStyle = `rgba(128,128,128,${a})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x <= CFG.COLS; x++) {
        ctx.moveTo(x * CFG.CELL, 0);
        ctx.lineTo(x * CFG.CELL, canvas.height);
      }
      for (let y = 0; y <= CFG.ROWS; y++) {
        ctx.moveTo(0, y * CFG.CELL);
        ctx.lineTo(canvas.width, y * CFG.CELL);
      }
      ctx.stroke();
    }
    function _drawGrain() {
      if (!_grain) return;
      if (Math.random() < 0.1) _mkGrain();
      const pat = ctx.createPattern(_grain, "repeat");
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
    function _drawWalls(now) {
      if (!gameState?.walls?.length && !_dynWall.size) return;
      const C = CFG.CELL, head = gameState?.snake?.[0];
      _dynWall.forEach((a, k) => {
        const age = (performance.now() - a.born) / DYN_FADE;
        a.alpha = a.phase === "in" ? Math.min(1, age) : Math.max(0, 1 - age);
        if (a.phase === "out" && a.alpha <= 0) _dynWall.delete(k);
      });
      for (const w of gameState?.walls || []) {
        const isDyn = !!w._dynamic;
        const k = `${w.x},${w.y}`;
        let alpha = 1;
        if (isDyn) {
          const da = _dynWall.get(k);
          alpha = da ? da.alpha : 1;
        } else if (head) {
          const d = Math.abs(w.x - head.x) + Math.abs(w.y - head.y);
          if (d === 1) alpha = 0.82;
          if (d === 0) alpha = 0.55;
        }
        if (alpha < 0.01) continue;
        ctx.globalAlpha = alpha;
        if (isDyn) {
          const pulse = 0.7 + Math.sin(now * 38e-4 + w.x * 0.7 + w.y * 0.5) * 0.3;
          ctx.fillStyle = "#ff6b35";
          ctx.shadowBlur = 7 * alpha * pulse;
          ctx.shadowColor = "#ff6b35";
          ctx.fillRect(w.x * C + 1, w.y * C + 1, C - 2, C - 2);
          ctx.shadowBlur = 0;
          if (w._born && w._ttl) {
            const pct = 1 - Math.min((Date.now() - w._born) / w._ttl, 1);
            ctx.fillStyle = "rgba(255,230,0,.75)";
            ctx.fillRect(w.x * C + 1, w.y * C + 1, Math.max(1, (C - 2) * pct), 2);
          }
        } else {
          ctx.fillStyle = _themeFg;
          ctx.fillRect(w.x * C + 1, w.y * C + 1, C - 2, C - 2);
          ctx.fillStyle = _themeBg;
          ctx.globalAlpha = alpha * 0.1;
          ctx.fillRect(w.x * C + 3, w.y * C + 3, C - 6, C - 6);
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    function _drawFoods(now) {
      if (!gameState?.foods) return;
      for (const f of gameState.foods) {
        if (!foodAnim.has(f)) foodAnim.set(f, { phase: Math.random() * MathUtil.tau, spawnT: now });
        const fa = foodAnim.get(f);
        fa.phase = (fa.phase + 0.052) % MathUtil.tau;
        const wx = f.x * CFG.CELL + CFG.CELL / 2, wy = f.y * CFG.CELL + CFG.CELL / 2;
        const spawnAge = now - fa.spawnT;
        const spawnSc = spawnAge < 350 ? Ease.easeOut(spawnAge / 350) : 1;
        const bobAmp = f.pts >= 300 ? 2.5 : f.pts >= 100 ? 1.8 : 1.1;
        const bob = Math.sin(fa.phase) * bobAmp;
        const pulseSc = 1 + Math.sin(fa.phase * 2) * (f.pts >= 300 ? 0.13 : f.pts >= 100 ? 0.09 : 0.055);
        if (f.pts >= 300) {
          let ang = orbitMap.get(f) || 0;
          ang += 0.065;
          orbitMap.set(f, ang);
          for (let i = 0; i < 4; i++) {
            const a = ang + i / 4 * MathUtil.tau, dist = CFG.CELL * 0.78 + Math.sin(now * 25e-4 + i) * 2;
            particles.spark(wx + Math.cos(a) * dist, wy + bob + Math.sin(a) * dist, { color: f.color || _themeFg, size: 2.5, glow: 9 });
          }
        } else if (f.pts >= 100) {
          let ang = orbitMap.get(f) || 0;
          ang += 0.048;
          orbitMap.set(f, ang);
          for (let i = 0; i < 2; i++) {
            const a = ang + i / 2 * MathUtil.tau;
            particles.spark(wx + Math.cos(a) * CFG.CELL * 0.68, wy + bob + Math.sin(a) * CFG.CELL * 0.68, { color: f.color || _themeFg, size: 1.6, glow: 5 });
          }
        }
        let alpha = 1;
        if (f.ttl !== null && f._spawnTime) {
          const age = now - f._spawnTime, frac = age / f.ttl;
          if (frac > 0.7) {
            const r = (frac - 0.7) / 0.3;
            alpha = 1 - r;
            if (r > 0.5) alpha *= Math.sin(now / 45) > 0 ? 1 : 0.1;
          }
        }
        ctx.globalAlpha = alpha * Math.max(0, spawnSc);
        ctx.fillStyle = f.color || _themeFg;
        ctx.strokeStyle = f.color || _themeFg;
        if (f.pts >= 50) {
          const gv = f.pts >= 300 ? 20 : f.pts >= 100 ? 13 : 7;
          ctx.shadowBlur = gv * (0.8 + Math.sin(fa.phase) * 0.2);
          ctx.shadowColor = f.color || _themeFg;
        }
        ctx.save();
        ctx.translate(wx, wy + bob);
        ctx.scale(pulseSc * spawnSc, pulseSc * spawnSc);
        _drawFoodShape(f);
        _drawFoodBadge(f);
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }
    function _drawFoodShape(f) {
      const r = f.r || 4, col = f.color || _themeFg;
      switch (f.shape) {
        case "cherry":
          [[-2.5, 1], [2.5, 1]].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(dx, dy, r - 1, 0, MathUtil.tau);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,.32)";
            ctx.beginPath();
            ctx.arc(dx - 0.5, dy - 0.8, r * 0.42, Math.PI * 0.9, 0);
            ctx.fill();
            ctx.fillStyle = col;
          });
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-2.5, -r + 2);
          ctx.quadraticCurveTo(0, -r - 4, 2.5, -r + 2);
          ctx.stroke();
          break;
        case "apple":
          ctx.beginPath();
          ctx.arc(0, 1, r, 0, MathUtil.tau);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.28)";
          ctx.beginPath();
          ctx.arc(-r * 0.28, -r * 0.15, r * 0.42, Math.PI * 0.9, 0);
          ctx.fill();
          ctx.fillStyle = col;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -r + 1);
          ctx.lineTo(0, -r - 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(3, -r - 1, 2.5, 1.5, 0.4, 0, MathUtil.tau);
          ctx.fill();
          break;
        case "cake":
          ctx.beginPath();
          rrect(ctx, -r, -1, r * 2, r + 1, 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.28)";
          ctx.beginPath();
          rrect(ctx, -r, -1, r * 2, (r + 1) * 0.38, 2);
          ctx.fill();
          ctx.fillStyle = col;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(-r, -1);
          ctx.lineTo(r, -1);
          ctx.stroke();
          ctx.fillRect(-1.5, -r, 3, r - 1);
          const ft = Date.now() * 3e-3;
          ctx.fillStyle = "#ffcc00";
          ctx.beginPath();
          ctx.arc(0, -r - 1 + Math.sin(ft) * 0.5, 1.9, 0, MathUtil.tau);
          ctx.fill();
          ctx.fillStyle = "rgba(255,140,0,.65)";
          ctx.beginPath();
          ctx.arc(0, -r - 2.2 + Math.cos(ft + 1) * 0.4, 1, 0, MathUtil.tau);
          ctx.fill();
          ctx.fillStyle = col;
          break;
        case "grape":
          [[-2.5, -2.5], [2.5, -2.5], [0, 0.5], [-2.5, 1.5], [2.5, 1.5]].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(dx, dy, r - 2, 0, MathUtil.tau);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,.22)";
            ctx.beginPath();
            ctx.arc(dx - 0.4, dy - 0.6, r * 0.32, Math.PI * 0.8, 0);
            ctx.fill();
            ctx.fillStyle = col;
          });
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(0, -r + 0.5);
          ctx.lineTo(0, -r - 3.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(2.5, -r - 1.2, 2, 1.3, 0.45, 0, MathUtil.tau);
          ctx.fill();
          break;
        case "chocolate":
          ctx.beginPath();
          rrect(ctx, -r, -r + 1, r * 2, r * 2 - 2, 1.5);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,.28)";
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(0, -r + 1);
          ctx.lineTo(0, r - 1);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-r, -r * 0.25);
          ctx.lineTo(r, -r * 0.25);
          ctx.stroke();
          ctx.strokeStyle = col;
          ctx.fillStyle = "rgba(255,255,255,.14)";
          ctx.beginPath();
          rrect(ctx, -r, -r + 1, r, r - 1, 1.5);
          ctx.fill();
          ctx.fillStyle = col;
          break;
        case "mouse":
          ctx.beginPath();
          ctx.ellipse(0, 1, r - 1, r - 2, 0, 0, MathUtil.tau);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-r + 2, -1, 2.9, 0, MathUtil.tau);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(r - 2, -1, 2.9, 0, MathUtil.tau);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.28)";
          ctx.beginPath();
          ctx.arc(-r + 2.6, -1.6, 1.6, Math.PI * 0.8, 0);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(r - 2.6, -1.6, 1.6, Math.PI * 0.8, 0);
          ctx.fill();
          ctx.fillStyle = col;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(r - 2, r - 1);
          ctx.quadraticCurveTo(r + 4, r, r + 2, r + 5);
          ctx.stroke();
          ctx.fillStyle = "#222";
          ctx.beginPath();
          ctx.arc(-r + 3, -0.5, 1.2, 0, MathUtil.tau);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(r - 3, -0.5, 1.2, 0, MathUtil.tau);
          ctx.fill();
          ctx.fillStyle = col;
          break;
        case "human":
          ctx.beginPath();
          ctx.arc(0, -r + 1, 2.8, 0, MathUtil.tau);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.22)";
          ctx.beginPath();
          ctx.arc(-0.5, -r + 0.5, 1.6, Math.PI * 0.8, 0);
          ctx.fill();
          ctx.fillStyle = col;
          ctx.lineWidth = 2.2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, -r + 3.8);
          ctx.lineTo(0, 1.5);
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-r + 1, -0.5);
          ctx.lineTo(r - 1, -0.5);
          ctx.stroke();
          ctx.lineWidth = 1.9;
          ctx.beginPath();
          ctx.moveTo(0, 1.5);
          ctx.lineTo(-r + 2, r + 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, 1.5);
          ctx.lineTo(r - 2, r + 2);
          ctx.stroke();
          ctx.lineCap = "butt";
          break;
        default:
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, MathUtil.tau);
          ctx.fill();
      }
    }
    function _drawFoodBadge(f) {
      if (f.pts < 30) return;
      const r = f.r || 4;
      const sz = f.pts >= 300 ? 11 : f.pts >= 100 ? 10 : 9;
      const label = `+${f.pts}`;
      ctx.font = `bold ${sz}px "Space Mono",monospace`;
      const tw = ctx.measureText(label).width;
      const bx = r + 2, by = -r - sz - 3, bw = tw + 6, bh = sz + 4;
      ctx.fillStyle = f.color || _themeFg;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      rrect(ctx, bx, by, bw, bh, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 3;
      ctx.shadowColor = "rgba(0,0,0,.5)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + bw / 2, by + bh / 2);
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }
    function _drawPowerup(now) {
      if (!gameState?.powerup) return;
      const pw = gameState.powerup;
      const def = POWERUP_TYPES.find((p) => p.kind === pw.kind);
      const C = CFG.CELL, wx = pw.x * C + C / 2, wy = pw.y * C + C / 2;
      if (!pw._phase) pw._phase = 0;
      pw._phase = (pw._phase + 0.052) % MathUtil.tau;
      const sc = 1 + Math.sin(pw._phase) * 0.18;
      const spin = now * 12e-4;
      const col = def?.color || _themeFg;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.scale(sc, sc);
      ctx.rotate(spin);
      ctx.shadowBlur = 16;
      ctx.shadowColor = col;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 6;
        i ? ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9) : ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 6;
        i ? ctx.lineTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5) : ctx.moveTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(-spin);
      ctx.font = `bold 9px "Space Mono",monospace`;
      ctx.fillStyle = col;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pw.label || "?", 0, 0.5);
      ctx.restore();
    }
    function _drawTrail() {
      if (!gameState?.snake?.length) return;
      const C = CFG.CELL;
      if (gameState.pwActive && gameState.pwKind === "ghost" && gameEngine?._internals?.GhostTrail) {
        for (const p of gameEngine._internals.GhostTrail.positions) {
          const a = Math.max(0, 0.28 * (1 - p.age / 8));
          if (a < 0.01) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = _themeFg;
          ctx.fillRect(p.x * C + 3, p.y * C + 3, C - 6, C - 6);
        }
      }
      const maxTrail = gameState.combo >= 3 ? 12 : 4;
      if (_trail.length > maxTrail) _trail.pop();
      _trail.forEach((h, i) => {
        const a = 0.4 * (1 - i / maxTrail);
        if (a < 0.01) return;
        ctx.globalAlpha = a;
        ctx.fillStyle = h.color || _themeFg;
        const pad = 3 + i;
        ctx.fillRect(h.x * C + pad, h.y * C + pad, C - pad * 2, C - pad * 2);
      });
      ctx.globalAlpha = 1;
    }
    function _drawSnake(now) {
      if (!gameState?.snake) return;
      const { dir, pwKind, pwActive } = gameState, C = CFG.CELL;
      const ghost = pwActive && pwKind === "ghost";
      const portal = pwActive && pwKind === "portal_mode";
      const dash = pwActive && pwKind === "dash";
      const freeze = pwActive && pwKind === "freeze";
      const skin = SnakeSkin.getSkin(), color = SnakeSkin.getColor();
      const pos = interp.pos;
      if (!pos.length) return;
      for (let i = pos.length - 1; i >= 0; i--) {
        const p = pos[i];
        ctx.globalAlpha = ghost ? 0.28 : 1;
        ctx.save();
        ctx.translate(p.px + C / 2, p.py + C / 2);
        if (pwActive && !ghost) {
          const def = POWERUP_TYPES.find((d) => d.kind === pwKind);
          if (def) {
            ctx.shadowBlur = 14;
            ctx.shadowColor = def.color;
          }
        }
        if (portal && i < 5) {
          ctx.shadowBlur = 13;
          ctx.shadowColor = "#00d2ff";
        }
        if (freeze && i < 3) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = "#7dd3fc";
        }
        if (dash && i < 3) {
          ctx.shadowBlur = 11;
          ctx.shadowColor = "#34d399";
          ctx.rotate(dir === "RIGHT" ? -0.07 : dir === "LEFT" ? 0.07 : 0);
        }
        if (i === 0) skin.drawHead(ctx, C, dir, color);
        else skin.drawBody(ctx, C, i, color);
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        ctx.globalAlpha = 1;
        ctx.lineCap = "butt";
        ctx.lineWidth = 1;
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    function _drawCrumble(now) {
      if (!crumbleActive || !crumbleSegs.length) return;
      for (const seg of crumbleSegs) {
        const elapsed = now - seg.born - seg.delay;
        if (elapsed < 0) continue;
        const t = Math.min(elapsed / 800, 1);
        const eased = Ease.easeIn(t), alpha = 1 - eased;
        if (alpha < 0.01) continue;
        seg.rot += seg.rotV;
        const x = seg.x + seg.vx * elapsed * 0.055;
        const y = seg.y + seg.vy * elapsed * 0.055 + eased * 35;
        const s = Math.max(1, (CFG.CELL - 5) * (1 - eased * 0.65));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(seg.rot);
        ctx.fillStyle = seg.col;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    function _drawEdgeDanger(now) {
      if (!gameState?.snake || gameState.mode === "wrap") return;
      const h = gameState.snake[0];
      if (!h) return;
      const m = 2, near = h.x < m || h.x >= CFG.COLS - m || h.y < m || h.y >= CFG.ROWS - m;
      edgeDanger = near ? Math.min(edgeDanger + 0.06, 0.24) : Math.max(edgeDanger - 0.05, 0);
      if (edgeDanger < 0.01) return;
      const bw = 4, pulse = edgeDanger * (0.5 + Math.sin(now / 80) * 0.5);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#ff3b30";
      ctx.shadowBlur = 14;
      ctx.shadowColor = "#ff3b30";
      ctx.fillRect(0, 0, canvas.width, bw);
      ctx.fillRect(0, canvas.height - bw, canvas.width, bw);
      ctx.fillRect(0, 0, bw, canvas.height);
      ctx.fillRect(canvas.width - bw, 0, bw, canvas.height);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    function _drawOverlays(now) {
      if (flashAlpha > 1e-3) {
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
      if (levelAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = levelAlpha;
        ctx.fillStyle = _themeFg;
        ctx.shadowBlur = 22 * levelAlpha;
        ctx.shadowColor = _themeFg;
        ctx.font = `bold ${Math.round(CFG.CELL * 2.2)}px "Space Mono",monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(levelText, canvas.width / 2, canvas.height / 2 + (1 - levelAlpha) * -18);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }
    Bus.on("powerupStart", () => {
      _gridPulse(0.55, 500);
    });
    Bus.on("milestone", () => {
      _gridPulse(0.85, 900);
      particles.ring(canvas.width / 2, canvas.height / 2, { count: 38, speed: 4.5, radius: 24, glow: 14, color: _themeFg });
    });
    return { init, stop, clearEffects, onEat, onDeath, onLevelUp, onCombo, onPowerup, shake, particles, animator };
  })();

  // js/ui/ui.js
  function el(id) {
    return document.getElementById(id);
  }
  function qsa(sel) {
    return document.querySelectorAll(sel);
  }
  var _selectedMode = "classic";
  var _selectedLevel = 1;
  var _comboTimeout = null;
  var _lastCombo = 0;
  function _hide(e) {
    if (e) e.classList.add("hidden");
  }
  function _show(e) {
    if (e) e.classList.remove("hidden");
  }
  function _showComboPopup(combo) {
    const p = el("combo-popup");
    if (!p) return;
    if (combo < 3) {
      p.classList.remove("pop");
      return;
    }
    p.textContent = combo >= window.CFG?.COMBO_MAX ? `MAX \xD7${combo}!` : `\xD7${combo}`;
    p.classList.remove("pop");
    void p.offsetWidth;
    p.classList.add("pop");
    clearTimeout(_comboTimeout);
    _comboTimeout = setTimeout(() => p.classList.remove("pop"), 700);
  }
  function _updateHUD(st) {
    const scoreLive = el("score-live");
    const stStreak = el("st-streak");
    const stBest = el("st-best");
    const stCombo = el("st-combo");
    const pwFill = el("pw-fill");
    const pwLabel = el("pw-label");
    const timerBar = el("timer-bar");
    const timerFill = el("timer-fill");
    const levelBar = el("level-bar");
    if (scoreLive) scoreLive.textContent = String(st.score).padStart(2, "0");
    if (stStreak) stStreak.textContent = st.streak;
    if (stBest) stBest.textContent = st.bestScore;
    if (stCombo) {
      stCombo.textContent = st.combo >= 2 ? `\xD7${st.combo}` : "\xD71";
      stCombo.dataset.level = st.combo >= 5 ? "high" : st.combo >= 3 ? "mid" : "low";
    }
    if (pwFill) {
      const pct = st.pwActive && st.pwDuration > 0 ? Math.max(0, st.pwTimer / st.pwDuration * 100) : 0;
      pwFill.style.width = pct + "%";
      pwFill.dataset.kind = st.pwActive ? st.pwKind : "";
    }
    if (pwLabel) {
      const labels = {
        slow: "LENTO",
        ghost: "FANTASMA",
        magnet: "\xCDM\xC3",
        x2: "\xD72",
        x3: "\xD73",
        portal_mode: "PORTAL",
        freeze: "GELO",
        shield: "ESCUDO",
        dash: "TURBO"
      };
      pwLabel.textContent = st.pwActive ? labels[st.pwKind] || st.pwKind.toUpperCase() : "";
    }
    if (timerFill && timerBar) {
      if (st.mode === "challenge" && st.timeLeft !== null) {
        const ld = window.LEVELS?.[st.level - 1];
        const pct = ld ? st.timeLeft / ld.timeLimit * 100 : 0;
        timerFill.style.width = Math.max(0, pct) + "%";
        timerBar.style.display = "block";
      } else {
        timerBar.style.display = "none";
      }
    }
    if (levelBar) {
      if (st.mode === "challenge") {
        const ld = window.LEVELS?.[st.level - 1];
        _show(levelBar);
        const lbl = el("level-label");
        if (lbl) lbl.textContent = `fase ${st.level}`;
        const lpg = el("level-progress");
        if (lpg) lpg.textContent = st.levelEaten;
        const ltg = el("level-target");
        if (ltg) ltg.textContent = ld?.target ?? "?";
      } else {
        _hide(levelBar);
      }
    }
  }
  function _showMenu() {
    const ov = el("overlay");
    if (!ov) return;
    _show(ov);
    ov.dataset.phase = "menu";
    const ovLabel = el("ov-label");
    if (ovLabel) ovLabel.textContent = "snake";
    const ovScore = el("ov-score");
    if (ovScore) ovScore.textContent = "\u2014";
    const ovSub = el("ov-sub");
    if (ovSub) ovSub.textContent = "";
    _hide(el("ov-best"));
    _hide(el("ov-level-badge"));
    const pb = el("play-btn");
    if (pb) pb.textContent = "iniciar";
  }
  function _showGameOver(data) {
    const ov = el("overlay");
    if (!ov) return;
    _show(ov);
    ov.dataset.phase = "gameover";
    const best = window.Store?.getBest(window.state?.mode || "classic") || 0;
    const ovLabel = el("ov-label");
    if (ovLabel) ovLabel.textContent = data.isNew ? "NOVO RECORDE" : "FIM DE JOGO";
    const ovScore = el("ov-score");
    if (ovScore) ovScore.textContent = String(data.score).padStart(2, "0");
    const ovSub = el("ov-sub");
    if (ovSub) ovSub.innerHTML = `${data.streak} comidos \xB7 combo \xD7${data.combo}<br><small>espa\xE7o ou R para reiniciar</small>`;
    const ovBest = el("ov-best");
    if (ovBest) {
      if (!data.isNew && best > 0) {
        ovBest.textContent = `recorde: ${best}`;
        _show(ovBest);
      } else _hide(ovBest);
    }
    const pb = el("play-btn");
    if (pb) pb.textContent = "jogar novamente";
  }
  function _hideOverlay() {
    _hide(el("overlay"));
  }
  var RankPanel = {
    _cache: {},
    // {classic:[], wrap:[], speed:[], challenge:[]}
    _mode: "classic",
    setMode(mode) {
      this._mode = mode;
    },
    async load(force = false) {
      const list = el("rank-list-side");
      const panel = el("side-rank");
      if (!list) return;
      const mode = this._mode;
      if (!force && this._cache[mode]?.length) {
        this._render(this._cache[mode]);
        return;
      }
      list.innerHTML = '<div class="rank-loading">sincronizando...</div>';
      if (panel) _show(panel);
      if (!window.FirebaseDB || !window.FirebaseDB.isOnline) {
        list.innerHTML = '<div class="rank-loading">modo offline</div>';
        return;
      }
      try {
        const rows = await window.FirebaseDB.loadRanking(8, mode);
        this._cache[mode] = rows;
        this._render(rows);
      } catch (e) {
        list.innerHTML = '<div class="rank-loading">erro<br><button class="btn-retry" onclick="window.RankPanel.load(true)">tentar novamente</button></div>';
      }
    },
    _render(rows) {
      const list = el("rank-list-side");
      if (!list) return;
      const currentId = window.Store?.getPlayerId() || "";
      const mode = this._mode;
      const field = { classic: "best_classic", wrap: "best_wrap", speed: "best_speed", challenge: "best_challenge" }[mode] || "best_classic";
      const modeLabels = { classic: "cl\xE1ssico", wrap: "portal", speed: "veloz", challenge: "desafio" };
      const header = el("side-rank")?.querySelector(".rank-mode-label");
      if (header) header.textContent = modeLabels[mode] || mode;
      if (!rows?.length) {
        list.innerHTML = '<div class="rank-loading">sem dados</div>';
        return;
      }
      const icons = ["\u25B2", "\u25C6", "\u2605"];
      list.innerHTML = rows.map((r, i) => {
        const nick = (r.nick || r.id.replace(/^P_/, "")).replace(/</g, "&lt;");
        const score = r[field] || 0;
        if (score === 0) return "";
        const isMe = r.id === currentId;
        const col = isMe && window.SnakeSkin ? window.SnakeSkin.getColor().body : "";
        return `<div class="rank-row${isMe ? " rank-me" : ""}">
        <span class="rank-pos">${icons[i] || i + 1}</span>
        <span class="rank-nick"${col ? ` style="color:${col}"` : ""}>` + nick + `</span>
        <span class="rank-score">${score}</span>
      </div>`;
      }).filter(Boolean).join("") || '<div class="rank-loading">sem dados</div>';
    }
  };
  function _initAuth() {
    const loginPanel = el("login-panel");
    const loginInput = el("player-nick-input");
    const loginBtn = el("login-btn");
    if (!loginPanel) return;
    let savedNick = null;
    try {
      savedNick = localStorage.getItem((window.CFG?.STORAGE_KEY || "snake_v2_") + "last_nick");
    } catch (_) {
    }
    const authenticate = async () => {
      if (loginBtn) loginBtn.classList.add("is-loading");
      try {
        let nick = loginInput ? loginInput.value.trim() : "";
        if (!nick) nick = "JOG" + Math.floor(Math.random() * 9999).toString().padStart(4, "0");
        else nick = nick.toUpperCase().replace(/[^A-Z0-9_\-]/g, "").slice(0, 12) || "JOG0001";
        const id = "P_" + nick;
        try {
          localStorage.setItem((window.CFG?.STORAGE_KEY || "snake_v2_") + "last_nick", nick);
          localStorage.setItem((window.CFG?.STORAGE_KEY || "snake_v2_") + "last_session_id", id);
        } catch (_) {
        }
        window.Store?.setPlayerId(id);
        if (window.FirebaseDB) {
          Promise.race([
            window.FirebaseDB.loadProfile(id),
            new Promise((r) => setTimeout(() => r(null), 3e3))
          ]).then((cloud) => {
            if (cloud) {
              const S = window.Store;
              if ((cloud.best_classic || 0) > S.getBest("classic")) S.set("best_classic", cloud.best_classic);
              if ((cloud.best_challenge || 0) > S.getBest("challenge")) S.set("best_challenge", cloud.best_challenge);
              if ((cloud.unlocked || 1) > S.getUnlocked()) S.set("unlocked", cloud.unlocked);
            }
            window.Store?.syncToCloud();
          }).catch(() => window.Store?.syncToCloud());
        }
        const stBest = el("st-best");
        if (stBest) stBest.textContent = window.Store?.getBest(_selectedMode) || 0;
        loginPanel.style.transition = "opacity 0.25s";
        loginPanel.style.opacity = "0";
        setTimeout(() => {
          loginPanel.style.display = "none";
          loginPanel.style.transition = "";
          loginPanel.style.opacity = "";
          _show(el("side-rank"));
          RankPanel.setMode(_selectedMode);
          RankPanel.load();
          window.Bus?.emit("authComplete", { id, nick });
        }, 280);
      } catch (err) {
        console.error("[Auth]", err);
        loginPanel.style.display = "none";
      } finally {
        if (loginBtn) loginBtn.classList.remove("is-loading");
      }
    };
    if (savedNick) {
      if (loginInput) loginInput.value = savedNick;
      setTimeout(authenticate, 100);
      return;
    }
    if (loginBtn) {
      loginBtn.addEventListener("click", authenticate);
      loginBtn.addEventListener("pointerup", (e) => {
        if (e.pointerType === "touch") authenticate();
      });
    }
    if (loginInput) {
      loginInput.addEventListener("keydown", (e) => e.stopPropagation());
      loginInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          authenticate();
        }
      });
    }
  }
  function _bindKeyboard() {
    const MAP = { ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT", w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT", W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT" };
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (MAP[e.key]) {
        e.preventDefault();
        window.Engine?.setDir(MAP[e.key]);
        return;
      }
      const phase = window.state?.phase;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (phase === "menu" || phase === "gameover") _startGame();
        else if (phase === "playing") window.Engine?.pause();
        else if (phase === "paused") window.Engine?.resume();
      }
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (["gameover", "playing", "paused"].includes(phase)) _startGame();
      }
    });
  }
  function _bindSwipe() {
    let tx = 0, ty = 0;
    const arena = el("arena");
    if (!arena) return;
    arena.addEventListener("touchstart", (e) => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    }, { passive: true });
    arena.addEventListener("touchend", (e) => {
      if (window.state?.phase !== "playing") return;
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      window.Engine?.setDir(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "RIGHT" : "LEFT" : dy > 0 ? "DOWN" : "UP");
    }, { passive: true });
  }
  function _bindDpad() {
    qsa(".dpad-btn").forEach((btn) => {
      const dir = btn.dataset.d;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        window.Engine?.setDir(dir);
        btn.classList.add("pressed");
        if (navigator.vibrate) navigator.vibrate(6);
      }, { passive: false });
      btn.addEventListener("pointerup", () => btn.classList.remove("pressed"));
      btn.addEventListener("pointerleave", () => btn.classList.remove("pressed"));
    });
  }
  function _initTheme() {
    const applyTheme = (dark) => {
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      const meta = el("theme-meta");
      if (meta) meta.content = dark ? "#0f0e0d" : "#f4f1ec";
      try {
        localStorage.setItem((window.CFG?.STORAGE_KEY || "snake_v2_") + "theme", dark ? "dark" : "light");
      } catch (_) {
      }
    };
    const saved = (() => {
      try {
        return localStorage.getItem((window.CFG?.STORAGE_KEY || "snake_v2_") + "theme");
      } catch (_) {
        return null;
      }
    })();
    const sysDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    applyTheme(saved === "dark" || saved === null && sysDark);
    el("theme-btn")?.addEventListener("click", () => {
      applyTheme(document.documentElement.getAttribute("data-theme") !== "dark");
    });
    window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      try {
        if (!localStorage.getItem((window.CFG?.STORAGE_KEY || "snake_v2_") + "theme")) applyTheme(e.matches);
      } catch (_) {
      }
    });
  }
  function _initSkinPanel() {
    const colorGrid = el("color-grid");
    const skinGrid = el("skin-grid");
    const skinPreview = el("skin-preview");
    const skinBody = el("skin-body");
    const skinToggle = el("skin-toggle");
    if (!colorGrid || !skinGrid) return;
    let _rafId = null;
    const pctx = skinPreview?.getContext("2d") || null;
    function _drawPreview(now) {
      if (!pctx || !window.SnakeSkin) {
        _rafId = requestAnimationFrame(_drawPreview);
        return;
      }
      const W = skinPreview.width, H = skinPreview.height;
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#f4f1ec";
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.globalAlpha = 1;
      pctx.shadowBlur = 0;
      pctx.fillStyle = bg;
      pctx.fillRect(0, 0, W, H);
      const skin = window.SnakeSkin.getSkin();
      const color = window.SnakeSkin.getColor();
      const c = 18, segs = 8;
      for (let i = segs - 1; i >= 0; i--) {
        pctx.save();
        pctx.translate(12 + i * (c + 2) + c / 2, H / 2 + Math.sin(now * 2e-3 + i * 0.5) * 4);
        try {
          i === 0 ? skin.drawHead(pctx, c, "RIGHT", color) : skin.drawBody(pctx, c, i, color);
        } catch (_) {
        }
        pctx.restore();
        pctx.setTransform(1, 0, 0, 1, 0, 0);
        pctx.globalAlpha = 1;
        pctx.shadowBlur = 0;
      }
      _rafId = requestAnimationFrame(_drawPreview);
    }
    const startPreview = () => {
      cancelAnimationFrame(_rafId);
      _rafId = requestAnimationFrame(_drawPreview);
    };
    const stopPreview = () => cancelAnimationFrame(_rafId);
    function drawMini(mc, sk) {
      if (!window.SnakeSkin) return;
      const ctx2 = mc.getContext("2d");
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#f4f1ec";
      ctx2.setTransform(1, 0, 0, 1, 0, 0);
      ctx2.globalAlpha = 1;
      ctx2.shadowBlur = 0;
      ctx2.globalCompositeOperation = "source-over";
      ctx2.clearRect(0, 0, mc.width, mc.height);
      ctx2.fillStyle = bg;
      ctx2.fillRect(0, 0, mc.width, mc.height);
      ctx2.save();
      ctx2.translate(mc.width / 2, mc.height / 2);
      try {
        sk.drawHead(ctx2, 24, "RIGHT", window.SnakeSkin.getColor());
      } catch (_) {
        ctx2.fillStyle = window.SnakeSkin.getColor().body;
        ctx2.fillRect(-10, -10, 20, 20);
      }
      ctx2.restore();
      ctx2.setTransform(1, 0, 0, 1, 0, 0);
      ctx2.globalAlpha = 1;
      ctx2.shadowBlur = 0;
    }
    function refreshAllMinis(cards2) {
      cards2.forEach(({ mc, sk }) => drawMini(mc, sk));
    }
    const COLORS = window.SNAKE_COLORS || [];
    COLORS.forEach((col) => {
      const btn = document.createElement("button");
      btn.className = "color-swatch" + (col.id === (window.SnakeSkin?.getColorId() || "black") ? " active" : "");
      btn.style.setProperty("--sw", col.body);
      btn.title = col.label;
      btn.setAttribute("aria-label", col.label);
      btn.addEventListener("click", () => {
        window.SnakeSkin?.setColor(col.id);
        colorGrid.querySelectorAll(".color-swatch").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".rank-row.rank-me .rank-nick").forEach((n) => n.style.color = col.body);
      });
      colorGrid.appendChild(btn);
    });
    const SKINS = window.SNAKE_SKINS || [];
    const COLS = 3;
    const PAGES = Math.ceil(SKINS.length / COLS);
    let _page = 0;
    const cards = [];
    SKINS.forEach((sk, idx) => {
      const card = document.createElement("div");
      card.className = "skin-card" + (sk.id === (window.SnakeSkin?.getSkinId() || "classic") ? " active" : "");
      const mc = document.createElement("canvas");
      mc.width = 44;
      mc.height = 44;
      const lbl = document.createElement("span");
      lbl.textContent = sk.label;
      card.appendChild(mc);
      card.appendChild(lbl);
      card.addEventListener("click", () => {
        window.SnakeSkin?.setSkin(sk.id);
        cards.forEach((c) => c.card.classList.remove("active"));
        card.classList.add("active");
      });
      skinGrid.appendChild(card);
      cards.push({ card, mc, sk });
    });
    refreshAllMinis(cards);
    window.Bus?.on("skinChanged", () => {
      refreshAllMinis(cards);
    });
    const CARD_W = 56;
    function goToPage(p) {
      _page = Math.max(0, Math.min(p, PAGES - 1));
      const x = -_page * COLS * CARD_W;
      skinGrid.style.transform = `translateX(${x}px)`;
      document.querySelectorAll(".carousel-dot").forEach((d, i) => d.classList.toggle("active", i === _page));
    }
    const nav = document.createElement("div");
    nav.className = "carousel-nav";
    const prevBtn = document.createElement("button");
    prevBtn.className = "carousel-arrow";
    prevBtn.textContent = "\u2039";
    const nextBtn = document.createElement("button");
    nextBtn.className = "carousel-arrow";
    nextBtn.textContent = "\u203A";
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "carousel-dots";
    for (let p = 0; p < PAGES; p++) {
      const dot = document.createElement("button");
      dot.className = "carousel-dot" + (p === 0 ? " active" : "");
      dot.addEventListener("click", () => goToPage(p));
      dotsWrap.appendChild(dot);
    }
    prevBtn.addEventListener("click", () => goToPage(_page - 1));
    nextBtn.addEventListener("click", () => goToPage(_page + 1));
    nav.appendChild(prevBtn);
    nav.appendChild(dotsWrap);
    nav.appendChild(nextBtn);
    skinGrid.after(nav);
    let _swx = 0;
    skinGrid.addEventListener("touchstart", (e) => {
      _swx = e.touches[0].clientX;
    }, { passive: true });
    skinGrid.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - _swx;
      if (Math.abs(dx) > 28) goToPage(_page + (dx < 0 ? 1 : -1));
    }, { passive: true });
    function openPanel() {
      if (skinBody) {
        skinBody.style.display = "flex";
        skinBody.classList.remove("hidden");
      }
      if (skinToggle) skinToggle.classList.add("open");
      startPreview();
    }
    function closePanel() {
      if (skinBody) {
        skinBody.classList.add("hidden");
        skinBody.style.display = "";
      }
      if (skinToggle) skinToggle.classList.remove("open");
      stopPreview();
    }
    const header = el("skin-panel")?.querySelector(".skin-header");
    header?.addEventListener("click", () => {
      const closed = skinBody?.classList.contains("hidden");
      if (closed) openPanel();
      else closePanel();
    });
    window.Bus?.on("skinChanged", () => refreshAllMinis(cards));
  }
  function _buildLevelGrid() {
    const grid = el("level-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const unlocked = window.Store?.getUnlocked() || 1;
    (window.LEVELS || []).forEach((lvl, i) => {
      const num = i + 1;
      const locked = num > unlocked;
      const btn = document.createElement("div");
      btn.className = "level-cell" + (locked ? " locked" : "");
      btn.innerHTML = `<span class="lc-num">${num}</span><span class="lc-name">${lvl.label}</span>`;
      if (!locked) btn.addEventListener("click", () => {
        _selectedLevel = num;
        _selectedMode = "challenge";
        qsa(".mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === "challenge"));
        _hide(el("level-panel"));
        _startGame();
      });
      grid.appendChild(btn);
    });
  }
  function _showStats() {
    const s = window.Store?.getStats() || {};
    const set = (id, v) => {
      const e = el(id);
      if (e) e.textContent = v;
    };
    set("stat-games", s.gamesPlayed || 0);
    set("stat-total-score", s.totalScore || 0);
    set("stat-total-food", s.totalFood || 0);
    set("stat-best-combo", `\xD7${s.bestCombo || 0}`);
    const m = Math.floor((s.playTime || 0) / 6e4), sec = Math.floor((s.playTime || 0) % 6e4 / 1e3);
    set("stat-play-time", `${m}m ${sec}s`);
    _show(el("stats-panel"));
  }
  function _bindButtons() {
    el("play-btn")?.addEventListener("click", () => {
      if (el("overlay")?.dataset.phase !== "levelup") _startGame();
    });
    el("levels-btn")?.addEventListener("click", () => {
      _buildLevelGrid();
      _show(el("level-panel"));
    });
    el("level-back")?.addEventListener("click", () => _hide(el("level-panel")));
    el("stats-btn")?.addEventListener("click", () => _showStats());
    el("stats-back")?.addEventListener("click", () => _hide(el("stats-panel")));
    el("rank-refresh-side")?.addEventListener("click", () => RankPanel.load(true));
    el("sound-btn")?.addEventListener("click", () => {
      const on = window.SoundBus?.toggle();
      const off = el("icon-sound-off"), ons = el("icon-sound-on");
      if (off) off.style.display = on ? "none" : "";
      if (ons) ons.style.display = on ? "" : "none";
    });
    qsa(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.state?.phase === "playing") return;
        _selectedMode = btn.dataset.mode;
        qsa(".mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === _selectedMode));
        const stBest = el("st-best");
        if (stBest) stBest.textContent = window.Store?.getBest(_selectedMode) || 0;
        RankPanel.setMode(_selectedMode);
        RankPanel.load();
        if (_selectedMode === "challenge") {
          _buildLevelGrid();
          _show(el("level-panel"));
        }
      });
    });
  }
  function _bindBus() {
    const B = window.Bus;
    if (!B) return;
    B.on("stateUpdate", _updateHUD);
    B.on("foodEaten", ({ combo }) => {
      if (combo !== _lastCombo) {
        _lastCombo = combo;
        _showComboPopup(combo);
      }
      if ((window.state?.score || 0) >= (window.state?._nextSlowShrink || 500)) {
        const sc = el("score-live");
        if (sc) {
          sc.classList.add("milestone");
          setTimeout(() => sc.classList.remove("milestone"), 400);
        }
      }
    });
    B.on("gameOver", (data) => {
      setTimeout(() => _showGameOver(data), 350);
      setTimeout(() => {
        RankPanel.setMode(window.state?.mode || "classic");
        RankPanel.load(true);
      }, 2e3);
    });
    B.on("phaseChange", (phase) => {
      if (phase === "playing") {
        _hideOverlay();
        ["portal-active", "shield-active", "freeze-active", "dash-active"].forEach((c) => el("arena")?.classList.remove(c));
      }
      if (phase === "win") {
        _show(el("overlay"));
        const set = (id, v) => {
          const e = el(id);
          if (e) e.textContent = v;
        };
        set("ov-label", "PARAB\xC9NS!");
        set("ov-score", String(window.state?.score || 0).padStart(2, "0"));
        set("ov-sub", "Todos os setores conclu\xEDdos.");
        const pb = el("play-btn");
        if (pb) pb.textContent = "jogar novamente";
      }
    });
    B.on("levelComplete", ({ level, bonus }) => {
      const ov = el("overlay");
      if (!ov) return;
      _show(ov);
      ov.dataset.phase = "levelup";
      const set = (id, v) => {
        const e = el(id);
        if (e) e.textContent = v;
      };
      set("ov-label", `SETOR ${level} OK`);
      set("ov-score", `+${bonus}`);
      set("ov-sub", "avan\xE7ando...");
    });
    B.on("powerupEnd", () => {
      const p = el("pw-fill");
      if (p) {
        p.style.width = "0%";
        p.dataset.kind = "";
      }
      const lb = el("pw-label");
      if (lb) lb.textContent = "";
    });
    B.on("powerupTick", ({ timer, duration }) => {
      const p = el("pw-fill");
      if (!p || !duration) return;
      p.style.width = Math.max(0, timer / duration * 100) + "%";
    });
    B.on("portalModeStart", () => el("arena")?.classList.add("portal-active"));
    B.on("portalModeEnd", () => el("arena")?.classList.remove("portal-active"));
    B.on("shieldStart", () => el("arena")?.classList.add("shield-active"));
    B.on("shieldBroken", () => {
      el("arena")?.classList.remove("shield-active");
      const a = el("arena");
      if (a) {
        a.style.boxShadow = "inset 0 0 20px #fde68a";
        setTimeout(() => {
          a.style.boxShadow = "";
        }, 400);
      }
    });
    B.on("freezeStart", () => el("arena")?.classList.add("freeze-active"));
    B.on("freezeEnd", () => el("arena")?.classList.remove("freeze-active"));
    B.on("powerupStart", ({ kind }) => {
      if (kind === "dash") el("arena")?.classList.add("dash-active");
      if (kind === "shield") el("arena")?.classList.add("shield-active");
    });
    B.on("powerupEnd", ({ kind }) => {
      if (kind === "dash") el("arena")?.classList.remove("dash-active");
      if (kind === "shield") el("arena")?.classList.remove("shield-active");
    });
    B.on("forcedPowerup", ({ message }) => {
      const fe = el("forced-event");
      if (!fe) return;
      const ft = fe.querySelector(".fe-text");
      if (ft) ft.textContent = message || "500 PTS";
      fe.classList.remove("hidden", "show");
      void fe.offsetWidth;
      fe.classList.remove("hidden");
      fe.classList.add("show");
      setTimeout(() => {
        fe.classList.remove("show");
        fe.classList.add("hidden");
      }, 3500);
    });
    B.on("timerTick", (t) => {
      const tf = el("timer-fill");
      if (tf) tf.classList.toggle("urgent", t !== null && t <= 1e4);
    });
    B.on("foodEaten", ({ food }) => {
      if ((food?.pts || 0) >= 20) {
        const arena = el("arena");
        if (!arena) return;
        const tip = document.createElement("div");
        tip.className = "food-tooltip";
        tip.textContent = `+${food.pts} ${food.label || ""}`;
        tip.style.cssText = `left:${20 + Math.random() * 60}%;top:${20 + Math.random() * 50}%`;
        arena.appendChild(tip);
        setTimeout(() => tip.remove(), 1900);
      }
    });
    B.on("newRecord", () => setTimeout(() => RankPanel.load(true), 3e3));
  }
  function _startGame() {
    _hideOverlay();
    window.Engine?.start(_selectedMode, _selectedMode === "challenge" ? _selectedLevel : 1);
  }
  function UIInit() {
    _initTheme();
    _initAuth();
    _bindBus();
    _bindKeyboard();
    _bindSwipe();
    _bindDpad();
    _bindButtons();
    _showMenu();
    setTimeout(_initSkinPanel, 0);
  }
  window.RankPanel = RankPanel;

  // js/services/firebase-service.js
  var firebaseConfig = {
    apiKey: "AIzaSyBbIgJMr0o1PbhKWrGAJ8sIMfKw_XK0HeA",
    authDomain: "snake-45d1c.firebaseapp.com",
    projectId: "snake-45d1c",
    storageBucket: "snake-45d1c.firebasestorage.app",
    messagingSenderId: "87119635039",
    appId: "1:87119635039:web:f3d88e6abbeee8da8af1ea"
  };
  var FirebaseService = class {
    #db = null;
    #initialized = false;
    #maxRetries = 3;
    constructor() {
      this._tryInit();
    }
    _tryInit() {
      try {
        const firebase2 = window.firebase;
        if (!firebase2) {
          console.warn("[Firebase] SDK n\xE3o carregado ainda");
          return;
        }
        const app = firebase2.initializeApp(firebaseConfig);
        this.#db = firebase2.firestore(app);
        this.#initialized = true;
        console.log("[Firebase] Conectado.");
      } catch (e) {
        try {
          const firebase2 = window.firebase;
          if (firebase2?.app) {
            this.#db = firebase2.firestore(firebase2.app());
            this.#initialized = true;
            console.log("[Firebase] Reconectado.");
          }
        } catch (e2) {
          console.warn("[Firebase] Modo offline:", e2.message);
        }
      }
    }
    get isOnline() {
      return this.#initialized && this.#db !== null;
    }
    async #withRetry(op, fallback = null) {
      if (!this.isOnline) return fallback;
      for (let i = 0; i < this.#maxRetries; i++) {
        try {
          return await op();
        } catch (e) {
          if (i === this.#maxRetries - 1) throw e;
          await new Promise((r) => setTimeout(r, 1e3 * (i + 1)));
        }
      }
    }
    async loadProfile(id, timeout = 5e3) {
      if (!this.isOnline) return null;
      try {
        const db = this.#db;
        const result = await Promise.race([
          this.#withRetry(async () => {
            const snap = await db.collection("dimen6_players").doc(id).get();
            return snap.exists ? snap.data() : null;
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), timeout))
        ]);
        return result;
      } catch (e) {
        console.warn("[Firebase] loadProfile:", e.message);
        return null;
      }
    }
    async saveProfile(id, data) {
      if (!this.isOnline || !id) return false;
      try {
        await this.#withRetry(() => this.#db.collection("dimen6_players").doc(id).set(data, { merge: true }));
        return true;
      } catch (e) {
        console.warn("[Firebase] saveProfile:", e.message);
        return false;
      }
    }
    async loadRanking(topCount = 8, mode = "classic") {
      if (!this.isOnline) throw new Error("Offline");
      const field = { classic: "best_classic", wrap: "best_wrap", speed: "best_speed", challenge: "best_challenge" }[mode] || "best_classic";
      const snap = await this.#withRetry(
        () => this.#db.collection("dimen6_players").orderBy(field, "desc").limit(topCount).get()
      );
      const rank = [];
      snap.forEach((d) => {
        const data = d.data();
        rank.push({
          id: d.id,
          nick: data.nick || d.id.replace(/^P_/, ""),
          best_classic: data.best_classic || 0,
          best_wrap: data.best_wrap || 0,
          best_speed: data.best_speed || 0,
          best_challenge: data.best_challenge || 0,
          unlocked: data.unlocked || 1
        });
      });
      return rank;
    }
  };
  var firebase = new FirebaseService();
  window.FirebaseDB = firebase;

  // js/services/audio-service.js
  var AudioService = class {
    #ctx = null;
    #enabled = false;
    #volume = 0.12;
    constructor() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.#ctx = new AC();
      } catch (e) {
        console.warn("[Audio] Web Audio API indispon\xEDvel.");
      }
      this.#bindBus();
    }
    async #ensureCtx() {
      if (!this.#ctx) return false;
      if (this.#ctx.state === "suspended") await this.#ctx.resume().catch(() => {
      });
      return this.#ctx.state === "running";
    }
    async play(name) {
      if (!this.#enabled || !await this.#ensureCtx()) return;
      const now = this.#ctx.currentTime;
      const v = this.#volume;
      const ctx2 = this.#ctx;
      const tone = (freq, type, dur, attack = 0.01) => {
        const osc = ctx2.createOscillator();
        const g = ctx2.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(v, now + attack);
        g.gain.exponentialRampToValueAtTime(1e-3, now + dur);
        osc.connect(g);
        g.connect(ctx2.destination);
        osc.start(now);
        osc.stop(now + dur);
      };
      switch (name) {
        case "eat":
          tone(600, "sine", 0.1);
          tone(800, "sine", 0.08);
          break;
        case "combo":
          [900, 1200, 1500].forEach((f, i) => setTimeout(() => tone(f, "sine", 0.15), i * 50));
          break;
        case "death":
          [200, 150, 100].forEach((f, i) => setTimeout(() => tone(f, "sawtooth", 0.3), i * 100));
          break;
        case "powerup": {
          const osc = ctx2.createOscillator();
          const g = ctx2.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(v * 0.6, now + 0.05);
          g.gain.exponentialRampToValueAtTime(1e-3, now + 0.4);
          osc.connect(g);
          g.connect(ctx2.destination);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }
        case "levelup":
          [400, 500, 600, 800, 1e3].forEach((f, i) => setTimeout(() => tone(f, "sine", 0.2), i * 80));
          break;
        case "menuMove":
          tone(400, "sine", 0.05, 5e-3);
          break;
        case "menuSelect":
          tone(600, "sine", 0.1);
          break;
      }
    }
    toggle() {
      this.#enabled = !this.#enabled;
      if (this.#enabled && this.#ctx?.state === "suspended") this.#ctx.resume();
      Bus.emit("soundToggled", this.#enabled);
      return this.#enabled;
    }
    get enabled() {
      return this.#enabled;
    }
    setVolume(v) {
      this.#volume = Math.max(0, Math.min(1, v));
    }
    #bindBus() {
      Bus.on("foodEaten", ({ combo }) => this.play(combo >= 3 ? "combo" : "eat"));
      Bus.on("gameOver", () => this.play("death"));
      Bus.on("levelComplete", () => this.play("levelup"));
      Bus.on("powerupStart", () => this.play("powerup"));
    }
  };
  var audio = new AudioService();
  window.SoundBus = { toggle: () => audio.toggle(), isEnabled: false };
  Bus.on("soundToggled", (v) => {
    window.SoundBus.isEnabled = v;
  });

  // js/main.js
  Object.assign(window, {
    CFG,
    MODES,
    LEVELS,
    FOOD_TYPES,
    POWERUP_TYPES,
    Ease,
    Color,
    MathUtil,
    Bus,
    Store: store,
    Engine,
    state,
    SnakeSkin,
    SNAKE_SKINS,
    SNAKE_COLORS
  });
  var canvas2 = document.getElementById("c");
  if (!canvas2) {
    console.error("[Main] Canvas #c n\xE3o encontrado.");
  }
  Renderer.init(canvas2, state, Engine);
  window._Renderer = Renderer;
  UIInit();
  window.SnakeDebug = {
    start: (mode = "classic", level = 1) => Engine.start(mode, level),
    stop: () => Engine.stop(),
    state: () => ({ ...state }),
    stats: () => SessionStats.summary(),
    best: (mode = "classic") => store.getBest(mode),
    unlockAll: () => store.set("unlocked", LEVELS.length),
    reset: () => store.resetAll(),
    addScore: (n = 10) => {
      state.score += n;
      Bus.emit("stateUpdate", state);
    },
    forcePowerup: (kind) => {
      const p = POWERUP_TYPES.find((x) => x.kind === kind);
      if (p) state.powerup = { x: state.snake[0]?.x ?? 5, y: state.snake[0]?.y ?? 5, ...p, _phase: 0 };
    },
    burst: (n = 30) => Renderer.particles.burst(canvas2.width / 2, canvas2.height / 2, { count: n }),
    rank: () => window.RankPanel?.load(true)
  };
  console.log("%c\u{1F40D} Snake Dimen6", "font-size:16px;font-weight:bold");
  console.log("%cDebug: window.SnakeDebug", "color:#888");
})();
