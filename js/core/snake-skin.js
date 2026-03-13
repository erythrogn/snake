// js/core/snake-skin.js — 16 aparências melhoradas
import { Bus } from '../utils/bus.js';
import { CFG } from './config.js';

export const SNAKE_COLORS = Object.freeze([
  { id:'black',    label:'Obsidiana',  body:'#111110', eye:'#f4f1ec', glow:null,      accent:'#333' },
  { id:'red',      label:'Carmesim',   body:'#dc2626', eye:'#fff',    glow:'#dc2626', accent:'#ef4444' },
  { id:'green',    label:'Esmeralda',  body:'#16a34a', eye:'#fff',    glow:'#16a34a', accent:'#22c55e' },
  { id:'blue',     label:'Safira',     body:'#1d4ed8', eye:'#fff',    glow:'#1d4ed8', accent:'#3b82f6' },
  { id:'purple',   label:'Ametista',   body:'#7c3aed', eye:'#fff',    glow:'#7c3aed', accent:'#a78bfa' },
  { id:'orange',   label:'Âmbar',      body:'#d97706', eye:'#fff',    glow:'#d97706', accent:'#fbbf24' },
  { id:'cyan',     label:'Aurora',     body:'#0891b2', eye:'#fff',    glow:'#0891b2', accent:'#22d3ee' },
  { id:'pink',     label:'Nebulosa',   body:'#db2777', eye:'#fff',    glow:'#db2777', accent:'#f472b6' },
  { id:'gold',     label:'Dourada',    body:'#b45309', eye:'#fff',    glow:'#ca8a04', accent:'#fde047' },
  { id:'white',    label:'Ártica',     body:'#d6d3d1', eye:'#111',    glow:null,      accent:'#f5f5f4' },
  { id:'lime',     label:'Radioativa', body:'#65a30d', eye:'#111',    glow:'#84cc16', accent:'#bef264' },
  { id:'blood',    label:'Sangue',     body:'#7f1d1d', eye:'#fca5a5', glow:null,      accent:'#b91c1c' },
]);

// ── Helpers compartilhados ────────────────────────────────────────
const TAU = Math.PI * 2;

function _eye(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function _eyePair(ctx, col, dir, r, off) {
  ctx.fillStyle = col.eye;
  const m = { RIGHT:[off,-off,off,off], LEFT:[-off,-off,-off,off], DOWN:[-off,off,off,off], UP:[-off,-off,off,-off] };
  const [x1,y1,x2,y2] = m[dir] || [off,-off,off,off];
  _eye(ctx,x1,y1,r); _eye(ctx,x2,y2,r);
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function _star5(ctx, r, inner) {
  ctx.beginPath();
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5-Math.PI/2;
    const rad=i%2===0?r:inner;
    i===0?ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);
  }
  ctx.closePath();
}

function _hexPath(ctx, r) {
  ctx.beginPath();
  for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
  ctx.closePath();
}

// ── 16 skins ─────────────────────────────────────────────────────
export const SNAKE_SKINS = Object.freeze([

  // 1 ── Clássica (quadrado sólido, cantos ligeiramente arredondados)
  {
    id:'classic', label:'Clássica', desc:'Quadrado com cantos suaves',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;
      ctx.fillStyle=col.body; _roundRect(ctx,-r,-r,r*2,r*2,3); ctx.fill();
      // Reflexo sutil
      ctx.fillStyle=col.accent; ctx.globalAlpha*=0.25;
      _roundRect(ctx,-r,-r,r*2,r*.5,3); ctx.fill(); ctx.globalAlpha/=0.25;
      _eyePair(ctx,col,dir,2,r*.55);
    },
    drawBody(ctx,c,i,col){
      const s=Math.max(6,c-3-Math.min(i*.04,2));
      ctx.fillStyle=col.body; _roundRect(ctx,-s/2,-s/2,s,s,2); ctx.fill();
    },
  },

  // 2 ── Redonda (círculo com highlight)
  {
    id:'round', label:'Redonda', desc:'Círculos brilhantes',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;
      ctx.fillStyle=col.body; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill();
      // Highlight
      const g=ctx.createRadialGradient(-r*.3,-r*.3,0,0,0,r);
      g.addColorStop(0,'rgba(255,255,255,0.35)'); g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill();
      _eyePair(ctx,col,dir,r*.2,r*.42);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5-i*.035);
      ctx.fillStyle=col.body; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill();
      const g=ctx.createRadialGradient(-r*.3,-r*.3,0,0,0,r);
      g.addColorStop(0,'rgba(255,255,255,0.2)'); g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill();
    },
  },

  // 3 ── Neon (brilho intenso + sombra multicamada)
  {
    id:'neon', label:'Neon', desc:'Brilho elétrico neon',
    drawHead(ctx,c,dir,col){
      const r=c/2-2;
      if(col.glow){ctx.shadowBlur=20;ctx.shadowColor=col.glow;}
      ctx.fillStyle=col.body; _roundRect(ctx,-r,-r,r*2,r*2,3); ctx.fill();
      ctx.shadowBlur=0;
      // Borda neon interna
      if(col.glow){ctx.strokeStyle=col.accent;ctx.lineWidth=1;_roundRect(ctx,-r+1,-r+1,r*2-2,r*2-2,2);ctx.stroke();}
      _eyePair(ctx,col,dir,2,r*.55);
    },
    drawBody(ctx,c,i,col){
      const s=Math.max(5,c-3-i*.04);
      if(col.glow&&i<7){ctx.shadowBlur=Math.max(2,14-i*2);ctx.shadowColor=col.glow;}
      ctx.fillStyle=col.body; _roundRect(ctx,-s/2,-s/2,s,s,2); ctx.fill();
      ctx.shadowBlur=0;
    },
  },

  // 4 ── Pixel Art (blocos 4x4 estilo GB)
  {
    id:'pixel', label:'Pixel', desc:'Estilo Game Boy retrô',
    drawHead(ctx,c,dir,col){
      const s=Math.floor(c/4);
      // Fundo
      ctx.fillStyle=col.body;ctx.fillRect(-c/2,-c/2,c,c);
      // Padrão checkerboard escuro no canto
      ctx.fillStyle=col.accent;
      [[0,0],[2,0],[1,1],[3,1],[0,2],[2,2],[1,3],[3,3]].forEach(([px,py])=>{
        ctx.fillRect(-c/2+px*s,-c/2+py*s,s-1,s-1);
      });
      // Olhos pixel
      ctx.fillStyle=col.eye;
      const eyeM={RIGHT:[[3,0],[3,2]],LEFT:[[0,0],[0,2]],DOWN:[[1,3],[2,3]],UP:[[1,0],[2,0]]}[dir]||[[3,0],[3,2]];
      eyeM.forEach(([px,py])=>ctx.fillRect(-c/2+px*s,-c/2+py*s,s-1,s-1));
    },
    drawBody(ctx,c,i,col){
      const s=Math.floor(c/4);ctx.fillStyle=col.body;ctx.fillRect(-c/2,-c/2,c,c);
      ctx.fillStyle=col.accent;
      for(let px=0;px<4;px++)for(let py=0;py<4;py++){
        if((px+py+i)%2===0)ctx.fillRect(-c/2+px*s,-c/2+py*s,s-1,s-1);
      }
    },
  },

  // 5 ── Diamante (losango com face)
  {
    id:'diamond', label:'Diamante', desc:'Losango facetado',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;
      ctx.fillStyle=col.body;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,0);ctx.lineTo(0,r);ctx.lineTo(-r,0);ctx.closePath();ctx.fill();
      // Faceta clara
      ctx.fillStyle=col.accent;ctx.globalAlpha*=0.35;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,0);ctx.lineTo(0,0);ctx.closePath();ctx.fill();ctx.globalAlpha/=0.35;
      // Olhos
      const dm={RIGHT:[r*.4,-r*.2],LEFT:[-r*.4,-r*.2],DOWN:[0,r*.3],UP:[0,-r*.4]};
      const [ex,ey]=dm[dir]||[r*.4,-r*.2];
      ctx.fillStyle=col.eye;_eye(ctx,ex,ey,2);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5-i*.03);
      ctx.fillStyle=col.body;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,0);ctx.lineTo(0,r);ctx.lineTo(-r,0);ctx.closePath();ctx.fill();
    },
  },

  // 6 ── Triangular (aponta na direção, corpo alterna)
  {
    id:'triangle', label:'Triangular', desc:'Triângulos apontando',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;const a={RIGHT:0,LEFT:Math.PI,DOWN:Math.PI/2,UP:-Math.PI/2}[dir]||0;
      ctx.fillStyle=col.body;ctx.beginPath();
      ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
      ctx.lineTo(Math.cos(a+2.3)*r*.9,Math.sin(a+2.3)*r*.9);
      ctx.lineTo(Math.cos(a-2.3)*r*.9,Math.sin(a-2.3)*r*.9);
      ctx.closePath();ctx.fill();
      ctx.fillStyle=col.eye;_eye(ctx,Math.cos(a)*r*.45,Math.sin(a)*r*.45,2.2);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5-i*.035);
      const rot=i%2===0?0:Math.PI;
      ctx.fillStyle=col.body;ctx.save();ctx.rotate(rot);
      ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.87,r*.5);ctx.lineTo(-r*.87,r*.5);ctx.closePath();ctx.fill();
      ctx.restore();
    },
  },

  // 7 ── Escamas (círculo com escama sombreada)
  {
    id:'scales', label:'Escamas', desc:'Escamas sobrepostas',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;ctx.fillStyle=col.body;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
      // Escama na testa
      const g=ctx.createLinearGradient(0,-r,0,0);g.addColorStop(0,col.accent);g.addColorStop(1,col.body);
      ctx.fillStyle=g;ctx.globalAlpha*=0.4;ctx.beginPath();ctx.arc(0,-r*.25,r*.5,Math.PI,0);ctx.fill();ctx.globalAlpha/=0.4;
      _eyePair(ctx,col,dir,r*.18,r*.38);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5-i*.03);
      ctx.fillStyle=col.body;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
      const prev=ctx.globalAlpha;ctx.globalAlpha=prev*(i%2===0?0.35:0.15);
      ctx.fillStyle=col.accent;ctx.beginPath();ctx.arc(0,-r*.25,r*.55,Math.PI,0);ctx.fill();
      ctx.globalAlpha=prev;
    },
  },

  // 8 ── Ondulada (elipse que oscila)
  {
    id:'wave', label:'Ondulada', desc:'Corpo serpenteia em onda',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;ctx.fillStyle=col.body;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
      const g=ctx.createRadialGradient(-r*.3,-r*.3,0,0,0,r);
      g.addColorStop(0,'rgba(255,255,255,0.25)');g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
      _eyePair(ctx,col,dir,r*.18,r*.38);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5);
      const wave=Math.sin(i*.7)*2.5;
      ctx.fillStyle=col.body;ctx.beginPath();ctx.ellipse(wave,0,r*.82,r,0,0,TAU);ctx.fill();
    },
  },

  // 9 ── Vazada (stroke only, cantos arredondados)
  {
    id:'hollow', label:'Vazada', desc:'Apenas borda visível',
    drawHead(ctx,c,dir,col){
      const r=c/2-2;
      ctx.strokeStyle=col.body;ctx.lineWidth=2.5;_roundRect(ctx,-r,-r,r*2,r*2,3);ctx.stroke();
      // diagonal interna
      ctx.lineWidth=0.8;ctx.globalAlpha*=0.4;ctx.beginPath();ctx.moveTo(-r,-r);ctx.lineTo(r,r);ctx.stroke();ctx.globalAlpha/=0.4;
      _eyePair(ctx,col,dir,2,r*.55);
    },
    drawBody(ctx,c,i,col){
      const s=Math.max(5,c-4-i*.05);
      ctx.strokeStyle=col.body;ctx.lineWidth=Math.max(1,2.5-i*.04);
      _roundRect(ctx,-s/2,-s/2,s,s,2);ctx.stroke();
    },
  },

  // 10 ── Hexágono
  {
    id:'hex', label:'Hexágono', desc:'Células hexagonais',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;ctx.fillStyle=col.body;_hexPath(ctx,r);ctx.fill();
      ctx.strokeStyle=col.accent;ctx.lineWidth=1;_hexPath(ctx,r*.55);ctx.stroke();
      const da={RIGHT:0,LEFT:Math.PI,DOWN:Math.PI/2,UP:-Math.PI/2}[dir]||0;
      ctx.fillStyle=col.eye;_eye(ctx,Math.cos(da)*r*.32,Math.sin(da)*r*.32,2.5);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5-i*.03);ctx.fillStyle=col.body;
      ctx.save();ctx.rotate(i%2===0?0:Math.PI/6);_hexPath(ctx,r);ctx.fill();ctx.restore();
    },
  },

  // 11 ── Robô (parafusos + visor)
  {
    id:'robot', label:'Robô', desc:'Segmentos mecânicos',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;
      ctx.fillStyle=col.body;ctx.fillRect(-r,-r,r*2,r*2);
      // Visor
      ctx.fillStyle=col.accent;ctx.globalAlpha*=0.8;ctx.fillRect(-r*.5,-r*.45,r,r*.5);ctx.globalAlpha/=0.8;
      // Borda visor
      ctx.strokeStyle=col.eye;ctx.lineWidth=0.8;ctx.strokeRect(-r*.5,-r*.45,r,r*.5);
      // Olho LED
      const da={RIGHT:[r*.6,0],LEFT:[-r*.6,0],DOWN:[0,r*.6],UP:[0,-r*.6]};
      const [ex,ey]=da[dir]||[r*.6,0];
      ctx.fillStyle=col.eye;_eye(ctx,ex,ey,2);
      // Parafusos
      ctx.fillStyle=col.accent;
      [[-r*.75,-r*.75],[r*.75,-r*.75],[-r*.75,r*.75],[r*.75,r*.75]].forEach(([px,py])=>{
        ctx.beginPath();ctx.arc(px,py,2,0,TAU);ctx.fill();
        ctx.strokeStyle=col.body;ctx.lineWidth=.5;ctx.stroke();
      });
    },
    drawBody(ctx,c,i,col){
      const s=c-4;ctx.fillStyle=col.body;ctx.fillRect(-s/2,-s/2,s,s);
      ctx.strokeStyle=col.accent;ctx.lineWidth=.8;ctx.strokeRect(-s/2+1,-s/2+1,s-2,s-2);
      if(i%3===0){ctx.fillStyle=col.eye;ctx.fillRect(-1.5,-1.5,3,3);}
    },
  },

  // 12 ── Fantasma (translúcido com "olhinhos" assustados)
  {
    id:'ghost', label:'Fantasma', desc:'Translúcido e assustado',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;const prev=ctx.globalAlpha;
      if(col.glow){ctx.shadowBlur=14;ctx.shadowColor=col.glow;}
      ctx.globalAlpha=prev*.72;ctx.fillStyle=col.body;
      ctx.beginPath();ctx.arc(0,-1,r,Math.PI,0);
      ctx.lineTo(r,r*.8);ctx.lineTo(r*.6,r*.4);ctx.lineTo(r*.2,r*.8);ctx.lineTo(-r*.2,r*.4);ctx.lineTo(-r*.6,r*.8);ctx.lineTo(-r,r*.4);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;ctx.globalAlpha=prev;
      ctx.fillStyle=col.eye;_eye(ctx,-r*.32,-r*.3,2.5);_eye(ctx,r*.32,-r*.3,2.5);
      // pupila
      ctx.fillStyle=col.body;_eye(ctx,-r*.32,-r*.22,1);_eye(ctx,r*.32,-r*.22,1);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5);const prev=ctx.globalAlpha;
      ctx.globalAlpha=prev*Math.max(0.25,0.72-i*.04);
      if(col.glow&&i<4){ctx.shadowBlur=8-i*2;ctx.shadowColor=col.glow;}
      ctx.fillStyle=col.body;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
      ctx.shadowBlur=0;ctx.globalAlpha=prev;
    },
  },

  // 13 ── Estrela (5 pontas com brilho)
  {
    id:'star', label:'Estrela', desc:'5 pontas radiantes',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;
      if(col.glow){ctx.shadowBlur=12;ctx.shadowColor=col.glow;}
      ctx.fillStyle=col.body;_star5(ctx,r,r*.42);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle=col.accent;ctx.globalAlpha*=0.4;_star5(ctx,r*.6,r*.25);ctx.fill();ctx.globalAlpha/=0.4;
      ctx.fillStyle=col.eye;_eye(ctx,0,0,2.2);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5-i*.04);
      ctx.fillStyle=col.body;ctx.save();ctx.rotate(i*.45);_star5(ctx,r,r*.42);ctx.fill();ctx.restore();
    },
  },

  // 14 ── Cápsula
  {
    id:'capsule', label:'Cápsula', desc:'Pílula suave',
    drawHead(ctx,c,dir,col){
      const horiz=dir==='RIGHT'||dir==='LEFT';
      const w=c-3,h=c-6,rx=h/2;
      ctx.fillStyle=col.body;
      if(horiz)_roundRect(ctx,-w/2,-h/2,w,h,rx);else _roundRect(ctx,-h/2,-w/2,h,w,rx);
      ctx.fill();
      const g=ctx.createLinearGradient(0,-w/2,0,0);
      g.addColorStop(0,'rgba(255,255,255,0.2)');g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g;
      if(horiz)_roundRect(ctx,-w/2,-h/2,w,h,rx);else _roundRect(ctx,-h/2,-w/2,h,w,rx);
      ctx.fill();
      _eyePair(ctx,col,dir,1.8,horiz?w*.28:h*.28);
    },
    drawBody(ctx,c,i,col){
      const w=c-4,h=c-6,rx=h/2;
      ctx.fillStyle=col.body;_roundRect(ctx,-w/2,-h/2,w,h,rx);ctx.fill();
    },
  },

  // 15 ── Plasma (orgânico pulsante)
  {
    id:'plasma', label:'Plasma', desc:'Forma viva que pulsa',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;const t=Date.now()*.0018;
      if(col.glow){ctx.shadowBlur=16;ctx.shadowColor=col.glow;}
      ctx.fillStyle=col.body;ctx.beginPath();
      for(let a=0;a<TAU;a+=.18){
        const rad=r+Math.sin(a*4+t)*2.2+Math.cos(a*2-t)*1.2;
        a<.01?ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);
      }
      ctx.closePath();ctx.fill();ctx.shadowBlur=0;
      _eyePair(ctx,col,dir,2,r*.38);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5-i*.03);const t=Date.now()*.0018;
      ctx.fillStyle=col.body;ctx.beginPath();
      for(let a=0;a<TAU;a+=.22){
        const rad=r+Math.sin(a*3+t+i*.6)*1.8;
        a<.01?ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);
      }
      ctx.closePath();ctx.fill();
    },
  },

  // 16 ── Cristal (facetas semitransparentes)
  {
    id:'crystal', label:'Cristal', desc:'Facetas translúcidas',
    drawHead(ctx,c,dir,col){
      const r=c/2-1;
      // Base
      ctx.fillStyle=col.body;_hexPath(ctx,r);ctx.fill();
      // Faceta clara
      ctx.fillStyle=col.accent;ctx.globalAlpha*=0.45;
      ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.87,r*.5);ctx.lineTo(0,0);ctx.closePath();ctx.fill();
      ctx.globalAlpha/=0.45;
      // Faceta escura
      ctx.fillStyle='rgba(0,0,0,0.25)';
      ctx.beginPath();ctx.moveTo(-r*.87,r*.5);ctx.lineTo(r*.87,r*.5);ctx.lineTo(0,0);ctx.closePath();ctx.fill();
      // Contorno nítido
      ctx.strokeStyle=col.accent;ctx.lineWidth=0.8;_hexPath(ctx,r);ctx.stroke();
      ctx.fillStyle=col.eye;_eye(ctx,0,0,2.5);
    },
    drawBody(ctx,c,i,col){
      const r=Math.max(3,c/2-1.5-i*.03);
      ctx.save();ctx.rotate(i%2===0?0:Math.PI/3);
      ctx.fillStyle=col.body;_hexPath(ctx,r);ctx.fill();
      ctx.fillStyle=col.accent;ctx.globalAlpha*=0.25;
      ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.87,r*.5);ctx.lineTo(0,0);ctx.closePath();ctx.fill();
      ctx.globalAlpha/=0.25;
      ctx.strokeStyle=col.accent;ctx.lineWidth=0.5;_hexPath(ctx,r);ctx.stroke();
      ctx.restore();
    },
  },

]);

class SkinManager {
  #skinId='classic'; #colorId='black';
  constructor(){
    try{
      this.#skinId  = localStorage.getItem(CFG.STORAGE_KEY+'skin')  || 'classic';
      this.#colorId = localStorage.getItem(CFG.STORAGE_KEY+'color') || 'black';
    }catch(_){}
  }
  getSkin()    { return SNAKE_SKINS.find(s=>s.id===this.#skinId)  || SNAKE_SKINS[0]; }
  getColor()   { return SNAKE_COLORS.find(c=>c.id===this.#colorId)|| SNAKE_COLORS[0]; }
  getSkinId()  { return this.#skinId; }
  getColorId() { return this.#colorId; }
  setSkin(id)  { this.#skinId=id;  try{localStorage.setItem(CFG.STORAGE_KEY+'skin',id); }catch(_){} Bus.emit('skinChanged',{skinId:id,colorId:this.#colorId}); }
  setColor(id) { this.#colorId=id; try{localStorage.setItem(CFG.STORAGE_KEY+'color',id);}catch(_){} Bus.emit('skinChanged',{skinId:this.#skinId,colorId:id}); }
}

export const SnakeSkin = new SkinManager();
