// js/core/config.js
export const CFG = Object.freeze({
  COLS: 20, ROWS: 20, CELL: 18,
  BG: '#f4f1ec', FG: '#111110', MUTED: '#a8a49d', GRID: 'rgba(17,17,16,0.04)',
  SPEED_MIN: 50, SPEED_MAX: 200,
  COMBO_WINDOW: 2200, COMBO_MAX: 8,
  POWERUP_CHANCE: 0.10, POWERUP_MIN_SCORE: 3,
  PARTICLE_MAX: 120,
  STORAGE_KEY: 'snake_v2_',
  PORTAL_MODE_SCORE: 500,
});

export const MODES = Object.freeze({
  classic:   { id:'classic',   label:'Clássico', baseSpeed:145, speedUp:3, wrap:false, desc:'Morra nas paredes' },
  wrap:      { id:'wrap',      label:'Portal',   baseSpeed:130, speedUp:2, wrap:true,  desc:'Atravesse as paredes' },
  speed:     { id:'speed',     label:'Veloz',    baseSpeed:80,  speedUp:6, wrap:false, desc:'Bem mais rápido' },
  challenge: { id:'challenge', label:'Desafio',  baseSpeed:140, speedUp:2, wrap:false, desc:'Fases com obstáculos' },
});

export const FOOD_TYPES = Object.freeze([
  { type:'cherry',    weight:30, pts:20,  shape:'cherry',    r:4, ttl:null,  trail:false, label:'Cereja',    color:'#e63950' },
  { type:'apple',     weight:25, pts:50,  shape:'apple',     r:5, ttl:null,  trail:false, label:'Maçã',      color:'#34c759' },
  { type:'cake',      weight:15, pts:100, shape:'cake',      r:5, ttl:9000,  trail:false, label:'Bolo',      color:'#ff9f0a' },
  { type:'grape',     weight:10, pts:200, shape:'grape',     r:5, ttl:7000,  trail:true,  label:'Uva',       color:'#9b59b6' },
  { type:'chocolate', weight:12, pts:30,  shape:'chocolate', r:4, ttl:null,  trail:false, label:'Chocolate', color:'#7c4a1e' },
  { type:'mouse',     weight:4,  pts:350, shape:'mouse',     r:6, ttl:5000,  trail:true,  label:'Ratinho',   color:'#b0a09a' },
  { type:'human',     weight:4,  pts:250, shape:'human',     r:6, ttl:6000,  trail:true,  label:'Humano',    color:'#ffcc00' },
]);

export const POWERUP_TYPES = Object.freeze([
  { kind:'slow',        label:'S',   duration:7000,  desc:'Reduz velocidade por 7s',        color:'#5e5ce6' },
  { kind:'ghost',       label:'G',   duration:5000,  desc:'Atravessa o próprio corpo',       color:'#bf5af2' },
  { kind:'magnet',      label:'M',   duration:6000,  desc:'Atrai comida próxima',            color:'#ff9f0a' },
  { kind:'x2',          label:'×2',  duration:8000,  desc:'Dobra pontos por 8s',             color:'#ff2d55' },
  { kind:'shrink',      label:'><',  duration:0,     desc:'Reduz o corpo pela metade',       color:'#30b0c0' },
  { kind:'time_warp',   label:'T',   duration:0,     desc:'+15s no timer',                   color:'#ff6482' },
  { kind:'portal_mode', label:'⬡',   duration:20000, desc:'Atravessa paredes por 20s',       color:'#00d2ff' },
  { kind:'slow_shrink', label:'½S',  duration:0,     desc:'Slow + metade do corpo [500pts]', color:'#ff6b35', forced:true },
  // ── 4 novos poderes ──────────────────────────────────────────
  { kind:'freeze',      label:'❄',   duration:4000,  desc:'Comidas ficam paradas 4s',        color:'#7dd3fc' },
  { kind:'shield',      label:'🛡',   duration:6000,  desc:'Ignora 1 colisão fatal',          color:'#fde68a' },
  { kind:'x3',          label:'×3',  duration:5000,  desc:'Triplo de pontos por 5s',         color:'#f43f5e' },
  { kind:'dash',        label:'▶▶',  duration:3000,  desc:'Velocidade 2× por 3s',            color:'#34d399' },
]);

// helpers
function hLine(y,x1,x2){const c=[];for(let x=x1;x<=x2;x++)c.push({x,y});return c;}
function vLine(x,y1,y2){const c=[];for(let y=y1;y<=y2;y++)c.push({x,y});return c;}
function rect(x,y,w,h){const c=[];for(let i=x;i<x+w;i++){c.push({x:i,y});c.push({x:i,y:y+h-1});}for(let j=y+1;j<y+h-1;j++){c.push({x,y:j});c.push({x:x+w-1,y:j});}return c;}
function cross(cx,cy,arm){const c=[];for(let i=-arm;i<=arm;i++){c.push({x:cx+i,y:cy});c.push({x:cx,y:cy+i});}return c;}
function scatter(pairs){return pairs.map(([x,y])=>({x,y})).filter(p=>p.x>=0&&p.x<20&&p.y>=0&&p.y<20);}
function diamond(cx,cy,r){const c=[];for(let dx=-r;dx<=r;dx++){const dy=r-Math.abs(dx);c.push({x:cx+dx,y:cy+dy});if(dy!==0)c.push({x:cx+dx,y:cy-dy});}return c;}
function ring(cx,cy,r){const c=[];const seen=new Set();for(let a=0;a<360;a+=8){const x=Math.round(cx+r*Math.cos(a*Math.PI/180)),y=Math.round(cy+r*Math.sin(a*Math.PI/180)),k=`${x},${y}`;if(!seen.has(k)&&x>=0&&x<20&&y>=0&&y<20){seen.add(k);c.push({x,y});}}return c;}
function comb(y,x1,x2,step){const c=[...hLine(y,x1,x2)];for(let x=x1;x<=x2;x+=step)c.push({x,y:y+1},{x,y:y+2});return c;}

export const LEVELS = Object.freeze([
  {id:1, label:'Campo Aberto',  target:5,  timeLimit:null,   bonus:10,  speedOverride:170, walls:[], message:'Bem-vindo. Come 5 para avançar.'},
  {id:2, label:'Colunas',       target:8,  timeLimit:null,   bonus:15,  speedOverride:160, walls:[...vLine(5,3,8),...vLine(14,11,16)], message:'Desvie das colunas.'},
  {id:3, label:'Cruz',          target:10, timeLimit:null,   bonus:20,  speedOverride:155, walls:[...cross(10,10,3)], message:'Cruz no centro.'},
  {id:4, label:'Corredores',    target:12, timeLimit:50000,  bonus:25,  speedOverride:150, walls:[...hLine(6,1,12),...hLine(13,7,18)], message:'50s. Dois corredores.'},
  {id:5, label:'Dupla Cruz',    target:14, timeLimit:null,   bonus:30,  speedOverride:148, walls:[...cross(6,6,2),...cross(14,14,2)], message:'Duas cruzes.'},
  {id:6, label:'Caixas',        target:14, timeLimit:null,   bonus:35,  speedOverride:145, walls:[...rect(2,2,5,5),...rect(13,2,5,5),...rect(2,13,5,5),...rect(13,13,5,5)], message:'Quatro caixas.'},
  {id:7, label:'Labirinto I',   target:16, timeLimit:null,   bonus:40,  speedOverride:140, walls:[...hLine(4,2,8),...hLine(4,12,17),...vLine(9,4,9),...vLine(10,10,15),...hLine(15,3,9),...hLine(15,11,17)], message:'Labirinto simples.'},
  {id:8, label:'Espiral',       target:18, timeLimit:65000,  bonus:50,  speedOverride:135, walls:[...hLine(3,3,16),...vLine(16,3,16),...hLine(16,3,16),...vLine(3,4,15),...hLine(6,6,13),...vLine(13,6,13),...hLine(13,6,12)], message:'65s. Espiral.'},
  {id:9, label:'Xadrez',        target:20, timeLimit:null,   bonus:55,  speedOverride:130, walls:scatter([[3,3],[3,7],[3,11],[3,15],[7,1],[7,5],[7,9],[7,13],[7,17],[11,3],[11,7],[11,11],[11,15],[15,1],[15,5],[15,9],[15,13],[15,17],[19,3],[19,7],[19,11],[19,15]]), message:'Padrão xadrez.'},
  {id:10,label:'Diamante',      target:20, timeLimit:null,   bonus:60,  speedOverride:128, walls:[...diamond(10,10,5)], message:'Diamante central.'},
  {id:11,label:'Pente',         target:22, timeLimit:70000,  bonus:65,  speedOverride:125, walls:[...comb(4,2,16,2),...comb(14,2,16,2).map(w=>({x:w.x,y:19-w.y}))], message:'70s. Pentes duplos.'},
  {id:12,label:'Labirinto II',  target:22, timeLimit:75000,  bonus:70,  speedOverride:120, walls:[...vLine(5,2,12),...hLine(7,5,14),...vLine(14,7,17),...hLine(12,5,14),...vLine(9,2,6),...vLine(9,12,17)], message:'75s. Labirinto denso.'},
  {id:13,label:'Anel',          target:24, timeLimit:null,   bonus:75,  speedOverride:118, walls:[...ring(10,10,7)], message:'Anel externo.'},
  {id:14,label:'Dois Anéis',    target:24, timeLimit:80000,  bonus:80,  speedOverride:115, walls:[...ring(5,5,4),...ring(15,15,4)], message:'80s. Dois anéis.'},
  {id:15,label:'Cruz Dupla',    target:26, timeLimit:null,   bonus:85,  speedOverride:112, walls:[...cross(5,10,3),...cross(15,10,3),...vLine(10,2,8),...vLine(10,12,17)], message:'Cruzes laterais.'},
  {id:16,label:'Prisão',        target:26, timeLimit:85000,  bonus:90,  speedOverride:110, walls:[...rect(1,1,18,18),...hLine(10,3,8),...hLine(10,12,16)], message:'85s. Corra nas bordas.'},
  {id:17,label:'Osso',          target:28, timeLimit:null,   bonus:95,  speedOverride:107, walls:[...hLine(5,2,8),...hLine(5,12,17),...hLine(14,2,8),...hLine(14,12,17),...vLine(2,5,14),...vLine(17,5,14)], message:'Osso.'},
  {id:18,label:'Labirinto III', target:28, timeLimit:90000,  bonus:100, speedOverride:104, walls:[...hLine(2,0,18),...hLine(17,1,19),...vLine(0,2,16),...vLine(19,2,17),...vLine(5,2,12),...hLine(7,5,14),...vLine(14,7,17),...hLine(12,5,14)], message:'90s.'},
  {id:19,label:'Espinha',       target:30, timeLimit:null,   bonus:105, speedOverride:101, walls:[...vLine(10,2,17),...hLine(5,3,9),...hLine(8,11,16),...hLine(12,3,9),...hLine(15,11,16)], message:'Espinha de peixe.'},
  {id:20,label:'Túnel',         target:30, timeLimit:95000,  bonus:110, speedOverride:98,  walls:[...hLine(7,0,7),...hLine(7,13,19),...hLine(12,0,7),...hLine(12,13,19)], message:'95s. Túnel.'},
  {id:21,label:'Grade',         target:32, timeLimit:null,   bonus:115, speedOverride:95,  walls:scatter([[5,5],[5,10],[5,15],[10,5],[10,15],[15,5],[15,10],[15,15]]), message:'Grade esparsa.'},
  {id:22,label:'Tridente',      target:32, timeLimit:100000, bonus:120, speedOverride:92,  walls:[...vLine(10,3,16),...hLine(10,3,8),...hLine(10,12,16),...vLine(5,3,9),...vLine(15,3,9)], message:'100s. Tridente.'},
  {id:23,label:'Labirinto IV',  target:34, timeLimit:null,   bonus:125, speedOverride:89,  walls:[...rect(3,3,14,14),...hLine(3,5,9),...hLine(3,11,16),...vLine(3,5,9),...vLine(16,5,9),...vLine(16,11,16),...vLine(3,11,16)], message:'Labirinto IV.'},
  {id:24,label:'Flecha',        target:34, timeLimit:105000, bonus:130, speedOverride:86,  walls:[...vLine(10,3,17),...scatter([[8,5],[9,4],[11,4],[12,5],[7,6],[13,6]])], message:'105s. Flecha.'},
  {id:25,label:'Pontes',        target:36, timeLimit:null,   bonus:135, speedOverride:83,  walls:[...hLine(6,0,7),...hLine(6,13,19),...hLine(13,0,7),...hLine(13,13,19),...vLine(6,0,7),...vLine(6,13,19),...vLine(13,0,7),...vLine(13,13,19)], message:'Pontes.'},
  {id:26,label:'Labirinto V',   target:36, timeLimit:110000, bonus:140, speedOverride:80,  walls:[...vLine(4,2,10),...vLine(4,14,18),...vLine(8,4,14),...vLine(12,2,10),...vLine(12,14,18),...vLine(16,4,14),...hLine(2,4,12),...hLine(18,4,16)], message:'110s. Labirinto V.'},
  {id:27,label:'Teia',          target:38, timeLimit:null,   bonus:145, speedOverride:77,  walls:[...diamond(10,10,7),...cross(10,10,3)], message:'Teia de aranha.'},
  {id:28,label:'Zigzag',        target:38, timeLimit:115000, bonus:150, speedOverride:74,  walls:[...hLine(4,0,8),...hLine(7,5,13),...hLine(10,8,15),...hLine(13,5,13),...hLine(16,0,8)], message:'115s. Zigzag.'},
  {id:29,label:'Armadilha',     target:40, timeLimit:null,   bonus:155, speedOverride:71,  walls:[...rect(4,4,12,12),...rect(7,7,6,6),...hLine(10,4,7),...hLine(10,13,16),...vLine(10,4,7),...vLine(10,13,16)], message:'Armadilha dupla.'},
  {id:30,label:'Pesadelo I',    target:40, timeLimit:120000, bonus:160, speedOverride:68,  walls:[...rect(1,1,18,18),...cross(10,10,4),...hLine(5,4,8),...hLine(5,12,15),...hLine(14,4,8),...hLine(14,12,15)], message:'120s. Pesadelo I.'},
  {id:31,label:'Espiral II',    target:42, timeLimit:null,   bonus:165, speedOverride:65,  walls:[...hLine(2,2,17),...vLine(17,2,17),...hLine(17,2,17),...vLine(2,3,16),...hLine(5,5,14),...vLine(14,5,14),...hLine(14,5,13),...vLine(5,6,13)], message:'Espiral II.'},
  {id:32,label:'Célula',        target:42, timeLimit:125000, bonus:170, speedOverride:62,  walls:[...ring(10,10,8),...ring(10,10,4),...vLine(10,6,8)], message:'125s. Célula.'},
  {id:33,label:'Labirinto VI',  target:44, timeLimit:null,   bonus:175, speedOverride:59,  walls:[...hLine(3,0,15),...hLine(6,4,19),...hLine(9,0,15),...hLine(12,4,19),...hLine(15,0,15),...hLine(18,4,19)], message:'Labirinto VI.'},
  {id:34,label:'Tesouro',       target:44, timeLimit:130000, bonus:180, speedOverride:56,  walls:[...rect(0,0,20,20),...rect(4,4,12,12),...scatter([[4,10],[15,10],[10,4],[10,15]])], message:'130s. Tesouro.'},
  {id:35,label:'Pesadelo II',   target:46, timeLimit:null,   bonus:185, speedOverride:53,  walls:[...cross(10,10,6),...diamond(10,10,4),...ring(10,10,8)], message:'Pesadelo II.'},
  {id:36,label:'Caos I',        target:46, timeLimit:135000, bonus:190, speedOverride:50,  walls:[...vLine(3,0,9),...vLine(3,11,19),...vLine(7,0,4),...vLine(7,6,14),...vLine(11,4,9),...vLine(11,11,19),...vLine(15,0,8),...vLine(15,10,14)], message:'135s. Caos I.'},
  {id:37,label:'DNA',           target:48, timeLimit:null,   bonus:195, speedOverride:48,  walls:scatter([[2,0],[4,1],[6,2],[8,1],[10,0],[12,1],[14,2],[16,1],[18,0],[2,4],[4,3],[6,4],[8,5],[10,4],[12,3],[14,4],[16,5],[18,4],[2,8],[4,9],[6,8],[8,7],[10,8],[12,9],[14,8],[16,7],[18,8],[2,12],[4,11],[6,12],[8,13],[10,12],[12,11],[14,12],[16,13],[18,12],[2,16],[4,17],[6,16],[8,15],[10,16],[12,17],[14,16],[16,15],[18,16]]), message:'Estrutura DNA.'},
  {id:38,label:'Labirinto VII', target:48, timeLimit:140000, bonus:200, speedOverride:46,  walls:[...hLine(1,0,18),...hLine(3,1,8),...hLine(3,10,18),...vLine(9,3,8),...hLine(8,1,8),...vLine(1,3,7),...hLine(5,3,7),...vLine(5,5,7),...hLine(7,5,8),...vLine(12,3,8),...hLine(5,12,18),...vLine(18,1,4)], message:'140s. Labirinto VII.'},
  {id:39,label:'Abismo',        target:50, timeLimit:null,   bonus:205, speedOverride:44,  walls:[...rect(0,0,20,20),...vLine(5,4,15),...vLine(10,0,8),...vLine(10,12,19),...vLine(15,4,15),...hLine(5,5,14),...hLine(14,5,14)], message:'Abismo.'},
  {id:40,label:'Pesadelo III',  target:50, timeLimit:145000, bonus:210, speedOverride:42,  walls:[...rect(1,1,18,18),...diamond(10,10,5),...cross(10,10,3),...hLine(5,4,8),...hLine(5,12,15),...hLine(14,4,8),...hLine(14,12,15)], message:'145s. Pesadelo III.'},
  {id:41,label:'Fractal I',     target:52, timeLimit:null,   bonus:220, speedOverride:40,  walls:[...cross(5,5,2),...cross(15,5,2),...cross(5,15,2),...cross(15,15,2),...cross(10,10,2),...hLine(10,3,7),...hLine(10,13,17),...vLine(10,3,7),...vLine(10,13,17)], message:'Fractal I.'},
  {id:42,label:'Caixa Russa',   target:52, timeLimit:150000, bonus:225, speedOverride:38,  walls:[...rect(0,0,20,20),...rect(3,3,14,14),...rect(6,6,8,8),...hLine(9,6,13)], message:'150s. Caixas dentro de caixas.'},
  {id:43,label:'Labirinto VIII',target:54, timeLimit:null,   bonus:230, speedOverride:36,  walls:[...hLine(2,0,14),...vLine(14,2,8),...hLine(8,8,14),...vLine(8,8,14),...hLine(14,2,8),...vLine(2,2,8),...hLine(5,2,6),...vLine(6,5,7),...hLine(17,6,18),...vLine(18,5,17),...hLine(5,15,19),...vLine(15,5,8)], message:'Labirinto VIII.'},
  {id:44,label:'Caos II',       target:54, timeLimit:155000, bonus:235, speedOverride:34,  walls:[...vLine(2,0,6),...vLine(2,8,13),...vLine(2,15,19),...vLine(6,2,7),...vLine(6,9,17),...vLine(10,0,5),...vLine(10,7,12),...vLine(10,14,19),...vLine(14,2,6),...vLine(14,8,13),...vLine(14,15,19),...vLine(18,0,7),...vLine(18,9,17)], message:'155s. Caos II.'},
  {id:45,label:'Pesadelo IV',   target:56, timeLimit:null,   bonus:240, speedOverride:32,  walls:[...rect(0,0,20,20),...ring(10,10,7),...ring(10,10,4),...cross(10,10,2),...hLine(10,7,9),...hLine(10,11,13)], message:'Pesadelo IV.'},
  {id:46,label:'Mestre I',      target:58, timeLimit:160000, bonus:250, speedOverride:30,  walls:[...rect(1,1,18,18),...rect(4,4,12,12),...rect(7,7,6,6),...hLine(10,4,7),...hLine(10,13,16),...vLine(4,10,13),...vLine(15,7,10)], message:'160s. Mestre I.'},
  {id:47,label:'Mestre II',     target:58, timeLimit:null,   bonus:255, speedOverride:28,  walls:[...cross(10,10,7),...diamond(10,10,5),...ring(10,10,3),...scatter([[10,3],[10,17],[3,10],[17,10]])], message:'Mestre II.'},
  {id:48,label:'Labirinto IX',  target:60, timeLimit:165000, bonus:260, speedOverride:26,  walls:[...hLine(2,0,14),...vLine(14,2,8),...hLine(8,8,14),...vLine(8,8,14),...hLine(14,2,8),...vLine(2,2,8),...hLine(5,2,6),...vLine(6,5,7),...hLine(17,6,18),...vLine(18,5,17),...hLine(5,15,19),...vLine(15,5,8),...hLine(11,15,18),...vLine(12,11,14)], message:'165s. O penúltimo.'},
  {id:49,label:'Lenda',         target:60, timeLimit:null,   bonus:270, speedOverride:24,  walls:[...rect(0,0,20,20),...diamond(10,10,7),...cross(10,10,5),...ring(10,10,3),...scatter([[10,3],[10,17],[3,10],[17,10],[5,5],[15,5],[5,15],[15,15]])], message:'Quase lá.'},
  {id:50,label:'DIMEN6',        target:66, timeLimit:170000, bonus:500, speedOverride:22,  walls:[...rect(0,0,20,20),...rect(3,3,14,14),...rect(6,6,8,8),...cross(10,10,2),...hLine(10,3,6),...hLine(10,14,17),...vLine(10,3,6),...vLine(10,14,17),...scatter([[5,5],[14,5],[5,14],[14,14]])], message:'170s. DIMEN6. Boa sorte.'},
]);

export const DIR_VECTORS = Object.freeze({UP:{dx:0,dy:-1},DOWN:{dx:0,dy:1},LEFT:{dx:-1,dy:0},RIGHT:{dx:1,dy:0}});
export const OPPOSITE    = Object.freeze({UP:'DOWN',DOWN:'UP',LEFT:'RIGHT',RIGHT:'LEFT'});

export const Ease = Object.freeze({
  linear:    t=>t,
  easeOut:   t=>1-Math.pow(1-t,3),
  easeIn:    t=>t*t*t,
  easeInOut: t=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  bounce:    t=>{const n1=7.5625,d1=2.75;if(t<1/d1)return n1*t*t;if(t<2/d1)return n1*(t-=1.5/d1)*t+0.75;if(t<2.5/d1)return n1*(t-=2.25/d1)*t+0.9375;return n1*(t-=2.625/d1)*t+0.984375;},
});

export const Color = {
  hex2rgb(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return{r,g,b};},
  rgba(hex,a){const{r,g,b}=Color.hex2rgb(hex);return`rgba(${r},${g},${b},${a})`;},
  lerp(c1,c2,t){const a=Color.hex2rgb(c1),b=Color.hex2rgb(c2);return`rgb(${Math.round(a.r+(b.r-a.r)*t)},${Math.round(a.g+(b.g-a.g)*t)},${Math.round(a.b+(b.b-a.b)*t)})`;},
};
