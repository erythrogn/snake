// js/renderer/renderer.js
import { CFG, Ease, POWERUP_TYPES } from '../core/config.js';
import { MathUtil } from '../utils/math.js';
import { Bus } from '../utils/bus.js';

let canvas = null, ctx = null, gameState = null, gameEngine = null;

// ── Animator ─────────────────────────────────────────────────────
class Animator {
  constructor() { this._tweens = []; this._byName = new Map(); }
  add({ name, duration, from, to, ease = Ease.easeOut, onUpdate, onDone } = {}) {
    if (name) this.cancel(name);
    const tw = { name, start: performance.now(), duration, from, to, ease, onUpdate, onDone, done: false };
    this._tweens.push(tw); if (name) this._byName.set(name, tw); return tw;
  }
  tick(now = performance.now()) {
    for (let i = this._tweens.length - 1; i >= 0; i--) {
      const tw = this._tweens[i]; if (tw.done) { this._tweens.splice(i, 1); continue; }
      const raw = Math.min((now - tw.start) / tw.duration, 1);
      if (tw.onUpdate) tw.onUpdate(tw.from + (tw.to - tw.from) * tw.ease(raw), tw.ease(raw));
      if (raw >= 1) { tw.done = true; if (tw.onDone) tw.onDone(); if (tw.name) this._byName.delete(tw.name); this._tweens.splice(i, 1); }
    }
  }
  cancel(name)  { const tw = this._byName.get(name); if (tw) { tw.done = true; this._byName.delete(name); } }
  cancelAll()   { this._tweens.forEach(t => (t.done = true)); this._tweens.length = 0; this._byName.clear(); }
}

// ── Particles ────────────────────────────────────────────────────
class ParticleSystem {
  constructor(max) { this._max = max || CFG.PARTICLE_MAX; this._pool = []; }
  _acquire() { for (const p of this._pool) { if (p.life <= 0) return p; } if (this._pool.length < this._max) { const p = {}; this._pool.push(p); return p; } return this._pool[0]; }
  _emit(p, wx, wy, { size, life, decay, gravity, color, shape }) { p.x = wx; p.y = wy; p.size = MathUtil.rand(size[0], size[1]); p.life = MathUtil.rand(life[0], life[1]); p.maxLife = p.life; p.decay = MathUtil.rand(decay[0], decay[1]); p.gravity = gravity; p.color = color; p.shape = shape; return p; }
  burst(wx, wy, { count=8, speed=[1.5,3.5], size=[1.5,3.5], life=[0.7,1.0], decay=[0.04,0.08], gravity=0.10, color=CFG.FG, glow=0, shape='square', spread=Math.PI*2, angle=0 } = {}) { for (let i=0;i<count;i++) { const p=this._emit(this._acquire(),wx,wy,{size,life,decay,gravity,color,shape}); const a=angle+(Math.random()-.5)*spread; const s=MathUtil.rand(speed[0],speed[1]); p.vx=Math.cos(a)*s; p.vy=Math.sin(a)*s; p.glow=glow; } }
  ring(wx, wy, { count=16, radius=0, speed=2.5, size=[1.5,2.5], color=CFG.FG, glow=0, decay=[0.03,0.06] } = {}) { for (let i=0;i<count;i++) { const a=(i/count)*MathUtil.tau; const p=this._emit(this._acquire(),wx+Math.cos(a)*radius,wy+Math.sin(a)*radius,{size,life:[1,1],decay,gravity:0,color,shape:'square'}); p.vx=Math.cos(a)*speed; p.vy=Math.sin(a)*speed; p.glow=glow; } }
  spark(wx, wy, { color=CFG.FG, size=2, glow=5 } = {}) { const p=this._emit(this._acquire(),wx,wy,{size:[size,size],life:[0.5,0.5],decay:[0.07,0.07],gravity:0,color,shape:'circle'}); p.vx=MathUtil.rand(-.4,.4); p.vy=MathUtil.rand(-.4,.4); p.glow=glow; }
  draw(c) { for (const p of this._pool) { if (p.life<=0) continue; p.x+=p.vx; p.y+=p.vy; p.vy+=p.gravity; p.life-=p.decay; if (p.life<=0) continue; c.globalAlpha=Math.max(0,p.life/p.maxLife); c.fillStyle=p.color; if (p.glow>0){c.shadowBlur=p.glow;c.shadowColor=p.color;} if(p.shape==='circle'){c.beginPath();c.arc(p.x,p.y,p.size/2,0,MathUtil.tau);c.fill();}else{const h=p.size;c.fillRect(p.x-h/2,p.y-h/2,h,h);} c.shadowBlur=0; } c.globalAlpha=1; }
  clear() { this._pool.forEach(p => (p.life = 0)); }
}

// ── Screen shake ─────────────────────────────────────────────────
class ScreenShake {
  constructor() { this._mag=0;this._frames=0;this._maxFrames=0;this.x=0;this.y=0; }
  trigger(magnitude=6, frames=10) { this._mag=Math.max(this._mag,magnitude);this._maxFrames=Math.max(this._maxFrames,frames);this._frames=Math.max(this._frames,frames); }
  update() { if(this._frames<=0){this.x=this.y=0;return;} const d=this._frames/this._maxFrames;this.x=(Math.random()-.5)*2*this._mag*d;this.y=(Math.random()-.5)*2*this._mag*d;if(--this._frames<=0){this._mag=this._maxFrames=0;} }
  reset()  { this._frames=this._mag=this._maxFrames=0;this.x=this.y=0; }
}

// ── Renderer ─────────────────────────────────────────────────────
export const Renderer = (() => {
  const particles  = new ParticleSystem();
  const shake      = new ScreenShake();
  const animator   = new Animator();
  const orbitAngles = new WeakMap();
  const _snakeTrail = [];

  let _rafId=null, _running=false, flashAlpha=0, flashColor=CFG.FG, gridPulse=0;
  let levelText='', levelAlpha=0, edgeDanger=0;
  let crumbleActive=false, crumbleSegs=[];
  let spawnAnim=false, spawnStart=0;
  const SPAWN_DUR = 400;

  // grain
  let _grainCanvas = null;
  function _makeGrain() {
    _grainCanvas = document.createElement('canvas'); _grainCanvas.width=64;_grainCanvas.height=64;
    const gc=_grainCanvas.getContext('2d'); const d=gc.createImageData(64,64);
    for(let i=0;i<d.data.length;i+=4){const v=Math.random()<.5?0:255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=Math.floor(Math.random()*8);}
    gc.putImageData(d,0,0);
  }

  function init(targetCanvas, stateRef, engineRef) {
    if (!targetCanvas) return;
    canvas     = targetCanvas;
    ctx        = canvas.getContext('2d', { alpha: false });
    canvas.width  = CFG.COLS * CFG.CELL;
    canvas.height = CFG.ROWS * CFG.CELL;
    gameState  = stateRef;
    gameEngine = engineRef;
    _running   = true;
    _makeGrain();
    _loop();
    console.log('[Renderer] Iniciado. %dx%d px', canvas.width, canvas.height);
  }

  function stop() { _running=false; if(_rafId!==null){cancelAnimationFrame(_rafId);_rafId=null;} }

  // ── Callbacks do engine ───────────────────────────────────────
  function onEat(food, combo) {
    const wx=food.x*CFG.CELL+CFG.CELL/2, wy=food.y*CFG.CELL+CFG.CELL/2;
    const big=combo>=3||food.pts>=5;
    particles.burst(wx,wy,{count:big?16:8,speed:big?[2,4.5]:[1.5,3],size:big?[2,4]:[1.5,3],color:food.color||CFG.FG,glow:big?10:0});
    if(combo>=5) shake.trigger(3,8);
    if(food.type!=='apple'){shake.trigger(4,10);particles.ring(wx,wy,{count:12,speed:2.2,color:food.color||CFG.FG});}
    const head=gameState?.snake?.[0]; if(head) _snakeTrail.unshift({x:head.x,y:head.y,alpha:.3});
  }

  function onDeath(snakeBody) {
    crumbleActive=true;
    crumbleSegs=snakeBody.map((seg,i)=>({x:seg.x*CFG.CELL+CFG.CELL/2,y:seg.y*CFG.CELL+CFG.CELL/2,tx:canvas.width/2,ty:canvas.height/2,delay:i*15,born:performance.now()}));
    setTimeout(()=>{crumbleActive=false;crumbleSegs.length=0;},1000);
    snakeBody.forEach((seg,i)=>{if(i%3!==0)return;particles.burst(seg.x*CFG.CELL+CFG.CELL/2,seg.y*CFG.CELL+CFG.CELL/2,{count:6,speed:[1.5,4],size:[2,4],gravity:.15});});
    shake.trigger(10,20); _flash(CFG.FG,.3,300);
  }

  function onLevelUp(level) {
    const cx=canvas.width/2,cy=canvas.height/2;
    particles.ring(cx,cy,{count:40,speed:4,radius:25,glow:15});
    particles.burst(cx,cy,{count:30});
    _flash(CFG.FG,.2,500);
    levelText=`FASE ${level}`; levelAlpha=1;
    animator.add({name:'levelFade',duration:2000,from:1,to:0,ease:Ease.easeIn,onUpdate:v=>{levelAlpha=v;}});
    _gridPulse(1,800);
  }

  function onCombo(combo)   { if(combo>=5) shake.trigger(2+combo*.3,6); }
  function onPowerup(kind)  { particles.ring(canvas.width/2,canvas.height/2,{count:20,speed:3,radius:10,decay:[.03,.05],glow:10}); _gridPulse(.4,500); }

  function clearEffects() { particles.clear();shake.reset();animator.cancelAll();flashAlpha=gridPulse=levelAlpha=edgeDanger=0;_snakeTrail.length=0;crumbleActive=false;crumbleSegs=[];spawnAnim=false; }

  function _flash(color,maxAlpha,dur) { flashColor=color;flashAlpha=maxAlpha;animator.add({name:'flash',duration:dur,from:maxAlpha,to:0,ease:Ease.easeOut,onUpdate:v=>{flashAlpha=v;}}); }
  function _gridPulse(amount,dur) { gridPulse=amount;animator.add({name:'grid',duration:dur,from:amount,to:0,ease:Ease.easeOut,onUpdate:v=>{gridPulse=v;}}); }

  // ── Loop ──────────────────────────────────────────────────────
  function _loop() {
    if(!_running)return; _rafId=requestAnimationFrame(_loop);
    const now=performance.now(); animator.tick(now); shake.update();
    ctx.save(); ctx.translate(shake.x,shake.y);
    _bg(); _grain(); _walls(); _edgeDanger(now); _trail(); particles.draw(ctx); _foods(now); _powerup(now); _snake(now); _deathCrumble(now);
    ctx.restore(); _overlays();
  }

  function _bg() {
    ctx.fillStyle=CFG.BG; ctx.fillRect(0,0,canvas.width,canvas.height);
    const a=.03+gridPulse*.15; ctx.strokeStyle=`rgba(17,17,16,${a})`; ctx.lineWidth=.5; ctx.beginPath();
    for(let x=0;x<=CFG.COLS;x++){ctx.moveTo(x*CFG.CELL,0);ctx.lineTo(x*CFG.CELL,canvas.height);}
    for(let y=0;y<=CFG.ROWS;y++){ctx.moveTo(0,y*CFG.CELL);ctx.lineTo(canvas.width,y*CFG.CELL);}
    ctx.stroke();
  }

  function _grain() {
    if(!_grainCanvas)return; if(Math.random()<.2) _makeGrain();
    const pat=ctx.createPattern(_grainCanvas,'repeat');
    ctx.globalAlpha=.8; ctx.fillStyle=pat; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.globalAlpha=1;
  }

  function _walls() {
    if(!gameState?.walls?.length)return;
    const c=CFG.CELL, head=gameState.snake?.[0];
    for(const w of gameState.walls){
      let a=1; if(head){const d=Math.abs(w.x-head.x)+Math.abs(w.y-head.y);if(d===1)a=.85;if(d===0)a=.6;}
      ctx.globalAlpha=a; ctx.fillStyle=CFG.FG; ctx.fillRect(w.x*c+1,w.y*c+1,c-2,c-2);
      ctx.globalAlpha=a*.15; ctx.fillStyle=CFG.BG; ctx.fillRect(w.x*c+3,w.y*c+3,c-6,c-6);
    } ctx.globalAlpha=1;
  }

  function _foods(now) {
    if(!gameState?.foods)return;
    for(const f of gameState.foods){
      if(!f._phase) f._phase=Math.random()*MathUtil.tau;
      f._phase=(f._phase+.05)%MathUtil.tau;
      const pulse=1+Math.sin(f._phase)*.08;
      const wx=f.x*CFG.CELL+CFG.CELL/2, wy=f.y*CFG.CELL+CFG.CELL/2;
      if(f.pts>=5){ let angle=orbitAngles.get(f)||0;angle+=.06;orbitAngles.set(f,angle); for(let i=0;i<3;i++){const a=angle+(i/3)*MathUtil.tau;particles.spark(wx+Math.cos(a)*CFG.CELL*.7,wy+Math.sin(a)*CFG.CELL*.7,{color:f.color||CFG.FG,glow:5});} }
      let alpha=1; if(f.ttl!==null&&f._spawnTime){const age=now-f._spawnTime;if(age>f.ttl*.7){alpha=1-(age-f.ttl*.7)/(f.ttl*.3);alpha=MathUtil.clamp(alpha,0,1);if(alpha<.4)alpha*=(Math.sin(now/60)>0?1:.2);}}
      ctx.globalAlpha=alpha; ctx.fillStyle=f.color||CFG.FG; ctx.strokeStyle=f.color||CFG.FG;
      if(f.pts>1){ctx.shadowBlur=10*pulse;ctx.shadowColor=f.color||CFG.FG;}
      ctx.save(); ctx.translate(wx,wy); ctx.scale(pulse,pulse); _foodShape(f); _foodBadge(f,pulse); ctx.restore();
      ctx.shadowBlur=0; ctx.globalAlpha=1;
    }
  }

  function _foodShape(f) {
    const r=f.r||4; const col=f.color||CFG.FG;
    switch(f.shape){
      case 'cherry':
        ctx.beginPath();ctx.arc(-2.5,1,r-1,0,MathUtil.tau);ctx.fill();
        ctx.beginPath();ctx.arc(2.5,1,r-1,0,MathUtil.tau);ctx.fill();
        ctx.lineWidth=1.2;ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(-2.5,-r+2);ctx.quadraticCurveTo(0,-r-2,2.5,-r+2);ctx.stroke();
        break;
      case 'apple':
        ctx.beginPath();ctx.arc(0,1,r,0,MathUtil.tau);ctx.fill();
        ctx.lineWidth=1.5;ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(0,-r+1);ctx.lineTo(0,-r-3);ctx.stroke();
        ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(2.5,-r,2,1.5,0.5,0,MathUtil.tau);ctx.fill();
        break;
      case 'cake':
        ctx.fillRect(-r,-2,r*2,r);
        ctx.fillStyle=CFG.BG;ctx.fillRect(-r+1,-1,r*2-2,r-2);
        ctx.fillStyle=col;ctx.lineWidth=1;ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(-r,-2);ctx.lineTo(r,-2);ctx.stroke();
        ctx.fillRect(-1.5,-r,3,r-3);
        ctx.fillStyle="#ffcc00";ctx.beginPath();ctx.arc(0,-r-1,1.5,0,MathUtil.tau);ctx.fill();
        break;
      case 'grape':
        [[-2.5,-2.5],[2.5,-2.5],[0,0.5],[-2.5,1.5],[2.5,1.5]].forEach(([dx,dy])=>{
          ctx.beginPath();ctx.arc(dx,dy,r-2,0,MathUtil.tau);ctx.fill();
        });
        ctx.lineWidth=1;ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(0,-r+1);ctx.lineTo(0,-r-3);ctx.stroke();
        break;
      case 'chocolate':
        ctx.fillRect(-r,-r+1,r*2,r*2-2);
        ctx.save();ctx.globalAlpha*=0.3;ctx.fillStyle=CFG.BG;
        ctx.fillRect(-r,-r+1,r,r-1);ctx.fillRect(0,0,r,r-1);
        ctx.restore();
        break;
      case 'mouse':
        ctx.beginPath();ctx.ellipse(0,1,r-1,r-2,0,0,MathUtil.tau);ctx.fill();
        ctx.beginPath();ctx.arc(-r+2,-1,2.5,0,MathUtil.tau);ctx.fill();
        ctx.beginPath();ctx.arc(r-2,-1,2.5,0,MathUtil.tau);ctx.fill();
        ctx.lineWidth=1;ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(r-2,r-1);ctx.quadraticCurveTo(r+3,r+2,r+1,r+5);ctx.stroke();
        ctx.fillStyle=CFG.BG;ctx.beginPath();ctx.arc(-r+3,-0.5,1,0,MathUtil.tau);ctx.fill();
        ctx.beginPath();ctx.arc(r-3,-0.5,1,0,MathUtil.tau);ctx.fill();
        break;
      case 'human':
        ctx.beginPath();ctx.arc(0,-r+1,2.5,0,MathUtil.tau);ctx.fill();
        ctx.lineWidth=2;ctx.strokeStyle=col;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(0,-r+3.5);ctx.lineTo(0,1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(-r+1,-1);ctx.lineTo(r-1,-1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(-r+2,r+1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(r-2,r+1);ctx.stroke();
        ctx.lineCap="butt";
        break;
      case 'diamond': ctx.beginPath();ctx.moveTo(0,-(r+2));ctx.lineTo(r+2,0);ctx.lineTo(0,r+2);ctx.lineTo(-(r+2),0);ctx.closePath();ctx.fill();break;
      case 'star':    {let rot=(Math.PI/2)*3,step=Math.PI/5;ctx.beginPath();ctx.moveTo(0,-(r+2));for(let i=0;i<5;i++){ctx.lineTo(Math.cos(rot)*(r+2),Math.sin(rot)*(r+2));rot+=step;ctx.lineTo(Math.cos(rot)*(r-1),Math.sin(rot)*(r-1));rot+=step;}ctx.closePath();ctx.fill();}break;
      case 'bolt':    ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(2,-(r+1));ctx.lineTo(-1.5,0);ctx.lineTo(1.5,0);ctx.lineTo(-2,r+1);ctx.stroke();break;
      case 'skull':   ctx.beginPath();ctx.arc(0,-1,r,Math.PI,0);ctx.lineTo(r,r+1);ctx.lineTo(-r,r+1);ctx.closePath();ctx.fill();ctx.fillStyle=CFG.BG;ctx.beginPath();ctx.arc(-2.5,0,1.5,0,MathUtil.tau);ctx.fill();ctx.beginPath();ctx.arc(2.5,0,1.5,0,MathUtil.tau);ctx.fill();break;
      default: ctx.beginPath();ctx.arc(0,0,r,0,MathUtil.tau);ctx.fill();break;
    }
  }

  function _foodBadge(f,pulse){ if(f.pts<=1)return; ctx.font='bold 8px "Space Mono",monospace';ctx.fillStyle=f.color||CFG.FG;ctx.textAlign='left';ctx.textBaseline='bottom';ctx.scale(1/pulse,1/pulse);ctx.fillText(`+${f.pts}`,(f.r||4)+2,-(f.r||4)-2); }

  function _powerup(now) {
    if(!gameState?.powerup)return;
    const pw=gameState.powerup;
    const def=POWERUP_TYPES.find(p=>p.kind===pw.kind);
    const c=CFG.CELL, wx=pw.x*c+c/2, wy=pw.y*c+c/2;
    if(!pw._phase)pw._phase=0; pw._phase=(pw._phase+.06)%MathUtil.tau;
    const scale=1+Math.sin(pw._phase)*.15;
    const color=def?.color||CFG.FG;
    ctx.save(); ctx.translate(wx,wy); ctx.scale(scale,scale);
    ctx.shadowBlur=12; ctx.shadowColor=color; ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.strokeRect(-7,-7,14,14);
    ctx.lineWidth=.5; ctx.strokeRect(-4,-4,8,8); ctx.shadowBlur=0;
    ctx.font='bold 9px "Space Mono",monospace'; ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(pw.label||'?',0,.5); ctx.restore();
  }

  function _trail() {
    if(!gameState?.snake?.length)return;
    const c=CFG.CELL;
    if(gameState.pwActive&&gameState.pwKind==='ghost'&&gameEngine?._internals?.GhostTrail){
      for(const pos of gameEngine._internals.GhostTrail.positions){
        const a=Math.max(0,.30*(1-pos.age/8)); if(a<.01)continue;
        ctx.globalAlpha=a; ctx.fillStyle=CFG.FG; ctx.fillRect(pos.x*c+3,pos.y*c+3,c-6,c-6);
      }
    }
    if(gameState.combo>=3){if(_snakeTrail.length>8)_snakeTrail.pop();}else{if(_snakeTrail.length>0)_snakeTrail.pop();}
    _snakeTrail.forEach((h,i)=>{ h.alpha=.3*(1-i/8); if(h.alpha<.01)return; ctx.globalAlpha=h.alpha; ctx.fillStyle=CFG.FG; ctx.fillRect(h.x*c+3,h.y*c+3,c-6,c-6); });
    ctx.globalAlpha=1;
  }

  function _snake(now) {
    if(!gameState?.snake)return;
    const {snake,dir,pwKind,pwActive}=gameState; const c=CFG.CELL;
    const ghost=pwActive&&pwKind==='ghost';
    const spawnScale=spawnAnim?Ease.easeOut(Math.min((now-spawnStart)/SPAWN_DUR,1)):1;
    snake.forEach((seg,i)=>{
      ctx.globalAlpha=ghost?.4:1; ctx.save(); ctx.translate(seg.x*c+c/2,seg.y*c+c/2); ctx.scale(spawnScale,spawnScale);
      if(i===0){
        ctx.fillStyle=CFG.FG;
        if(pwActive){const def=POWERUP_TYPES.find(p=>p.kind===pwKind);if(def){ctx.shadowBlur=15;ctx.shadowColor=def.color;}}
        ctx.fillRect(-c/2+1,-c/2+1,c-2,c-2); ctx.shadowBlur=0; ctx.fillStyle=CFG.BG;
        const eo=c/2-3.5,es=2.5;
        if(dir==='RIGHT'||dir==='LEFT'){const ex=dir==='RIGHT'?c/2-4:-c/2+1;ctx.fillRect(ex,-eo,es,es);ctx.fillRect(ex,eo-es,es,es);}
        else{const ey=dir==='DOWN'?c/2-4:-c/2+1;ctx.fillRect(-eo,ey,es,es);ctx.fillRect(eo-es,ey,es,es);}
      }else{const taper=Math.min(i*.05,2),sz=c-3-taper;ctx.fillStyle=CFG.FG;ctx.fillRect(-sz/2,-sz/2,sz,sz);}
      ctx.restore();
    }); ctx.globalAlpha=1;
  }

  function _deathCrumble(now) {
    if(!crumbleActive||!crumbleSegs.length)return;
    const c=CFG.CELL-4;
    for(const seg of crumbleSegs){
      const elapsed=now-seg.born-seg.delay; if(elapsed<0)continue;
      const t=Math.min(elapsed/600,1),eased=Ease.easeIn(t),alpha=1-eased; if(alpha<.01)continue;
      const x=MathUtil.lerp(seg.x,seg.tx,eased),y=MathUtil.lerp(seg.y,seg.ty,eased),s=c*(1-eased*.5);
      ctx.globalAlpha=alpha; ctx.fillStyle=CFG.FG; ctx.fillRect(x-s/2,y-s/2,s,s);
    } ctx.globalAlpha=1;
  }

  function _edgeDanger(now) {
    if(!gameState?.snake||gameState.mode==='wrap')return;
    const head=gameState.snake[0]; if(!head)return;
    const margin=2,near=head.x<margin||head.x>=CFG.COLS-margin||head.y<margin||head.y>=CFG.ROWS-margin;
    if(near) edgeDanger=Math.min(edgeDanger+.05,.2); else edgeDanger=Math.max(edgeDanger-.04,0);
    if(edgeDanger<.01)return;
    const bw=3; ctx.globalAlpha=edgeDanger*(.6+Math.sin(now/100)*.4); ctx.fillStyle='#ff3b30';
    ctx.shadowBlur=10; ctx.shadowColor='#ff3b30';
    ctx.fillRect(0,0,canvas.width,bw); ctx.fillRect(0,canvas.height-bw,canvas.width,bw);
    ctx.fillRect(0,0,bw,canvas.height); ctx.fillRect(canvas.width-bw,0,bw,canvas.height);
    ctx.globalAlpha=1; ctx.shadowBlur=0;
  }

  function _overlays() {
    if(flashAlpha>.001){ctx.globalAlpha=flashAlpha;ctx.fillStyle=flashColor;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;}
    if(levelAlpha>.01){ctx.globalAlpha=levelAlpha;ctx.fillStyle=CFG.FG;ctx.font=`bold ${Math.round(CFG.CELL*2)}px "Space Mono",monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(levelText,canvas.width/2,canvas.height/2-15*(1-levelAlpha)*15);ctx.globalAlpha=1;}
  }

  // Bus hooks
  Bus.on('powerupStart', ()   => { _gridPulse(.5,500); });
  Bus.on('milestone',   ()   => { _gridPulse(.6,800); particles.ring(canvas.width/2,canvas.height/2,{count:30,speed:3.5,radius:20,glow:10}); });

  return { init, stop, clearEffects, onEat, onDeath, onLevelUp, onCombo, onPowerup, shake, particles, animator };
})();
