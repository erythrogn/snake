// js/renderer/renderer.js
import { CFG, Ease, POWERUP_TYPES } from '../core/config.js';
import { SnakeSkin } from '../core/snake-skin.js';
import { MathUtil } from '../utils/math.js';
import { Bus } from '../utils/bus.js';

let canvas=null, ctx=null, gameState=null, gameEngine=null;

// ── roundRect polyfill (Chrome <99, Firefox <112) ─────────────────
function rrect(cx, x, y, w, h, r) {
  if (cx.roundRect) { cx.roundRect(x,y,w,h,r); return; }
  const R = Math.min(r, w/2, h/2);
  cx.moveTo(x+R, y);
  cx.lineTo(x+w-R, y); cx.quadraticCurveTo(x+w, y, x+w, y+R);
  cx.lineTo(x+w, y+h-R); cx.quadraticCurveTo(x+w, y+h, x+w-R, y+h);
  cx.lineTo(x+R, y+h); cx.quadraticCurveTo(x, y+h, x, y+h-R);
  cx.lineTo(x, y+R); cx.quadraticCurveTo(x, y, x+R, y);
  cx.closePath();
}

// ── Animator ─────────────────────────────────────────────────────
class Animator {
  #t=[]; #n=new Map();
  add({name,duration,from,to,ease=Ease.easeOut,onUpdate,onDone}={}){
    if(name)this.cancel(name);
    const tw={name,start:performance.now(),duration,from,to,ease,onUpdate,onDone,done:false};
    this.#t.push(tw); if(name)this.#n.set(name,tw); return tw;
  }
  tick(now){
    for(let i=this.#t.length-1;i>=0;i--){
      const tw=this.#t[i]; if(tw.done){this.#t.splice(i,1);continue;}
      const raw=Math.min((now-tw.start)/tw.duration,1);
      tw.onUpdate?.(tw.from+(tw.to-tw.from)*tw.ease(raw), raw);
      if(raw>=1){tw.done=true;tw.onDone?.();if(tw.name)this.#n.delete(tw.name);this.#t.splice(i,1);}
    }
  }
  cancel(n){const tw=this.#n.get(n);if(tw){tw.done=true;this.#n.delete(n);}}
  cancelAll(){this.#t.forEach(t=>t.done=true);this.#t.length=0;this.#n.clear();}
}

// ── Partículas ────────────────────────────────────────────────────
class ParticleSystem {
  #pool=[]; #max; #texts=[];
  constructor(max){this.#max=max||CFG.PARTICLE_MAX;}
  #acquire(){
    for(const p of this.#pool)if(p.life<=0)return p;
    if(this.#pool.length<this.#max){const p={};this.#pool.push(p);return p;}
    return this.#pool[0];
  }
  #emit(p,wx,wy,{size,life,decay,gravity,color,shape}){
    p.x=wx;p.y=wy;p.size=MathUtil.rand(size[0],size[1]);
    p.life=MathUtil.rand(life[0],life[1]);p.maxLife=p.life;
    p.decay=MathUtil.rand(decay[0],decay[1]);p.gravity=gravity;
    p.color=color;p.shape=shape;return p;
  }
  burst(wx,wy,{count=8,speed=[1.5,3.5],size=[1.5,3.5],life=[0.7,1.0],decay=[0.04,0.08],
    gravity=0.10,color=CFG.FG,glow=0,shape='circle',spread=Math.PI*2,angle=0}={}){
    for(let i=0;i<count;i++){
      const p=this.#emit(this.#acquire(),wx,wy,{size,life,decay,gravity,color,shape});
      const a=angle+(Math.random()-.5)*spread;const s=MathUtil.rand(speed[0],speed[1]);
      p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s;p.glow=glow;
    }
  }
  ring(wx,wy,{count=16,radius=0,speed=2.5,size=[1.5,2.5],color=CFG.FG,glow=0,decay=[0.03,0.06]}={}){
    for(let i=0;i<count;i++){
      const a=(i/count)*MathUtil.tau;
      const p=this.#emit(this.#acquire(),wx+Math.cos(a)*radius,wy+Math.sin(a)*radius,
        {size,life:[1,1],decay,gravity:0,color,shape:'circle'});
      p.vx=Math.cos(a)*speed;p.vy=Math.sin(a)*speed;p.glow=glow;
    }
  }
  spark(wx,wy,{color=CFG.FG,size=1.8,glow=4}={}){
    const p=this.#emit(this.#acquire(),wx,wy,
      {size:[size,size],life:[0.4,0.6],decay:[0.06,0.09],gravity:0,color,shape:'circle'});
    p.vx=MathUtil.rand(-.5,.5);p.vy=MathUtil.rand(-.5,.5);p.glow=glow;
  }
  // Texto flutuante com pontuação
  addText(x,y,text,color,size=10){
    this.#texts.push({x,y,vy:-1.6,life:1.0,text,color,size,born:performance.now()});
  }
  draw(c){
    c.save();
    for(const p of this.#pool){
      if(p.life<=0)continue;
      p.x+=p.vx;p.y+=p.vy;p.vy+=p.gravity;p.life-=p.decay;if(p.life<=0)continue;
      const alpha=Math.max(0,p.life/p.maxLife);
      c.globalAlpha=alpha;c.fillStyle=p.color;
      if(p.glow>0){c.shadowBlur=p.glow;c.shadowColor=p.color;}
      if(p.shape==='circle'){c.beginPath();c.arc(p.x,p.y,p.size/2,0,MathUtil.tau);c.fill();}
      else{c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}
      if(p.glow>0)c.shadowBlur=0;
    }
    // Textos flutuantes
    const now=performance.now();
    this.#texts=this.#texts.filter(t=>{
      const age=(now-t.born)/1000; if(age>1.1)return false;
      t.y+=t.vy; t.vy*=0.97;
      const alpha=1-Math.pow(age/1.1,2);
      const sc=1+age*.4;
      c.globalAlpha=Math.max(0,alpha);
      c.save();
      c.translate(t.x,t.y); c.scale(sc,sc);
      c.font=`bold ${t.size}px "Space Mono",monospace`;
      c.fillStyle='#fff'; c.textAlign='center'; c.textBaseline='middle';
      c.shadowBlur=10; c.shadowColor=t.color;
      // Contorno escuro para legibilidade
      c.strokeStyle='rgba(0,0,0,0.7)'; c.lineWidth=3;
      c.strokeText(t.text,0,0);
      c.fillText(t.text,0,0);
      c.shadowBlur=0;
      c.restore();
      return true;
    });
    c.globalAlpha=1; c.restore();
  }
  clear(){this.#pool.forEach(p=>p.life=0);this.#texts=[];}
}

class ScreenShake{
  #mag=0;#frames=0;#max=0;x=0;y=0;
  trigger(m=6,f=10){this.#mag=Math.max(this.#mag,m);this.#max=Math.max(this.#max,f);this.#frames=Math.max(this.#frames,f);}
  update(){
    if(this.#frames<=0){this.x=this.y=0;return;}
    const d=this.#frames/this.#max;
    this.x=(Math.random()-.5)*2*this.#mag*d;
    this.y=(Math.random()-.5)*2*this.#mag*d;
    if(--this.#frames<=0)this.#mag=this.#max=0;
  }
  reset(){this.#frames=this.#mag=this.#max=0;this.x=this.y=0;}
}

// ── Renderer ─────────────────────────────────────────────────────
export const Renderer = (() => {
  const particles  = new ParticleSystem();
  const shake      = new ScreenShake();
  const animator   = new Animator();
  const orbitMap   = new WeakMap(); // food → angle
  const foodAnim   = new WeakMap(); // food → {spawnT, phase, bob}
  const _trail     = [];            // snake trail

  let _rafId=null, _running=false;
  let flashAlpha=0, flashColor='#111', gridPulse=0;
  let levelText='', levelAlpha=0, edgeDanger=0;
  let crumbleActive=false, crumbleSegs=[];

  // Cache de cores do tema — atualizado a cada frame quando muda
  let _themeBg='#f4f1ec', _themeFg='#111110', _themeFrame=0;
  function _readTheme(now){
    if(now-_themeFrame < 500) return; // re-lê a cada 500ms
    _themeFrame=now;
    const root=document.documentElement;
    _themeBg=getComputedStyle(root).getPropertyValue('--bg').trim()||'#f4f1ec';
    _themeFg=getComputedStyle(root).getPropertyValue('--fg').trim()||'#111110';
  }

  // Paredes dinâmicas
  const _dynWall = new Map(); // key → {alpha, phase, born}
  const DYN_FADE = 500;
  Bus.on('dynWallSpawned',({cells})=>{
    const now=performance.now();
    cells.forEach(c2=>_dynWall.set(`${c2.x},${c2.y}`,{alpha:0,phase:'in',born:now}));
    if(canvas){
      const cx=cells.reduce((s,c2)=>s+c2.x,0)/cells.length*CFG.CELL+CFG.CELL/2;
      const cy=cells.reduce((s,c2)=>s+c2.y,0)/cells.length*CFG.CELL+CFG.CELL/2;
      particles.ring(cx,cy,{count:14,speed:2.8,radius:5,color:'#ff6b35',glow:10,decay:[.035,.07]});
      shake.trigger(2,5);
    }
  });
  Bus.on('dynWallExpired',({cells})=>{
    const now=performance.now();
    cells.forEach(c2=>{const k=`${c2.x},${c2.y}`;const e=_dynWall.get(k);_dynWall.set(k,{alpha:e?.alpha??1,phase:'out',born:now});});
  });
  Bus.on('dynWallsReset',()=>_dynWall.clear());

  // Interpolação suave da cobra
  const interp={prev:[],curr:[],lastTick:0,interval:145,pos:[]};
  function _snap(){
    if(!gameState?.snake)return;
    interp.prev=[...interp.curr];
    interp.curr=gameState.snake.map(s=>({x:s.x,y:s.y}));
    interp.lastTick=performance.now();
  }
  Bus.on('stateUpdate',()=>{ if(gameState?.running&&!gameState?.paused)_snap(); });

  function _computeInterp(now){
    if(!interp.prev.length||!interp.curr.length){
      interp.pos=(interp.curr||[]).map(s=>({px:s.x*CFG.CELL,py:s.y*CFG.CELL})); return;
    }
    let t=Math.min((now-interp.lastTick)/Math.max(interp.interval,50),1);
    t=Ease.easeOut(t);
    const n=Math.max(interp.prev.length,interp.curr.length);
    interp.pos=[];
    for(let i=0;i<n;i++){
      const c=interp.curr[i]||interp.curr[interp.curr.length-1];
      const p=interp.prev[i]||interp.prev[interp.prev.length-1]||c;
      let dx=c.x-p.x,dy=c.y-p.y;
      if(Math.abs(dx)>CFG.COLS/2)dx=dx>0?dx-CFG.COLS:dx+CFG.COLS;
      if(Math.abs(dy)>CFG.ROWS/2)dy=dy>0?dy-CFG.ROWS:dy+CFG.ROWS;
      interp.pos.push({px:(p.x+dx*t)*CFG.CELL,py:(p.y+dy*t)*CFG.CELL});
    }
  }

  // Grain
  let _grain=null;
  function _mkGrain(){
    _grain=document.createElement('canvas');_grain.width=64;_grain.height=64;
    const gc=_grain.getContext('2d'),d=gc.createImageData(64,64);
    for(let i=0;i<d.data.length;i+=4){
      const v=Math.random()<.5?0:255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=Math.floor(Math.random()*7);
    }
    gc.putImageData(d,0,0);
  }

  // ── Init ─────────────────────────────────────────────────────
  function init(c,stateRef,engineRef){
    if(!c)return;
    canvas=c; ctx=canvas.getContext('2d',{alpha:false});
    canvas.width=CFG.COLS*CFG.CELL; canvas.height=CFG.ROWS*CFG.CELL;
    gameState=stateRef; gameEngine=engineRef;
    _running=true; _mkGrain(); _loop();
    console.log('[Renderer] %dx%d',canvas.width,canvas.height);
  }
  function stop(){_running=false;if(_rafId)cancelAnimationFrame(_rafId),_rafId=null;}

  // ── Callbacks do engine ───────────────────────────────────────
  function onEat(food,combo){
    const wx=food.x*CFG.CELL+CFG.CELL/2, wy=food.y*CFG.CELL+CFG.CELL/2;
    const tier = food.pts>=300?3:food.pts>=100?2:food.pts>=50?1:0;
    const counts=[8,14,22,32];
    const speeds=[[1.5,3],[2,4.5],[2.5,5.5],[3,7]];
    const glows=[0,8,14,20];

    particles.burst(wx,wy,{
      count:counts[tier],speed:speeds[tier],
      size:[1.5+tier,3+tier],color:food.color||_themeFg,
      glow:glows[tier],gravity:tier>=2?.05:.10,shape:'circle'
    });
    if(tier>=2){
      particles.ring(wx,wy,{count:16+tier*4,speed:3+tier,radius:6,color:food.color||_themeFg,glow:glows[tier],decay:[.03,.055]});
    }
    if(tier===3) shake.trigger(7,15);
    else if(tier===2) shake.trigger(4,9);
    else if(combo>=5) shake.trigger(2,6);

    // Texto flutuante com pontos reais (incluindo combo e multiplicador)
    const mult=(gameState?.pwActive&&gameState.pwKind==='x3')?3:(gameState?.pwActive&&gameState.pwKind==='x2')?2:1;
    const displayed=food.pts*(gameState?.combo||1)*mult;
    particles.addText(wx,wy-10,`+${displayed}`,food.color||_themeFg,9+tier*2);

    // Trail
    const head=gameState?.snake?.[0];
    if(head)_trail.unshift({x:head.x,y:head.y,alpha:.4,color:SnakeSkin.getColor().body||_themeFg});
    _gridPulse(.2+tier*.15,400);
  }

  function onDeath(snakeBody){
    crumbleActive=true;
    const col=SnakeSkin.getColor().body||_themeFg;
    crumbleSegs=snakeBody.map((seg,i)=>({
      x:seg.x*CFG.CELL+CFG.CELL/2, y:seg.y*CFG.CELL+CFG.CELL/2,
      vx:(Math.random()-.5)*4, vy:(Math.random()-.3)*4-1,
      rot:0, rotV:(Math.random()-.5)*.25,
      delay:i*10, born:performance.now(), col
    }));
    setTimeout(()=>{crumbleActive=false;crumbleSegs.length=0;},1400);
    snakeBody.forEach((seg,i)=>{
      if(i%2)return;
      particles.burst(seg.x*CFG.CELL+CFG.CELL/2,seg.y*CFG.CELL+CFG.CELL/2,
        {count:5,speed:[2,5],size:[2,5],gravity:.14,color:col});
    });
    shake.trigger(14,24); _flash(_themeFg,.4,300);
  }

  function onLevelUp(level){
    const cx=canvas.width/2,cy=canvas.height/2;
    particles.ring(cx,cy,{count:56,speed:5.5,radius:30,glow:18,color:_themeFg});
    particles.burst(cx,cy,{count:40,size:[2,5],speed:[2,5.5],gravity:.04,color:_themeFg});
    _flash(_themeFg,.22,700); levelText=`FASE ${level}`; levelAlpha=1;
    animator.add({name:'lv',duration:2400,from:1,to:0,ease:Ease.easeIn,onUpdate:v=>levelAlpha=v});
    _gridPulse(1.3,1000);
  }

  function onCombo(combo){ if(combo>=5)shake.trigger(2+combo*.35,7); }
  function onPowerup(){
    particles.ring(canvas.width/2,canvas.height/2,{count:26,speed:4,radius:14,decay:[.025,.05],glow:14,color:_themeFg});
    _gridPulse(.6,600);
  }

  function clearEffects(){
    particles.clear();shake.reset();animator.cancelAll();
    flashAlpha=gridPulse=levelAlpha=edgeDanger=0;
    _trail.length=0;crumbleActive=false;crumbleSegs=[];
    interp.pos=[];interp.prev=[];interp.curr=[];
    _dynWall.clear();
  }

  function _flash(col,a,dur){
    flashColor=col;flashAlpha=a;
    animator.add({name:'fl',duration:dur,from:a,to:0,ease:Ease.easeOut,onUpdate:v=>flashAlpha=v});
  }
  function _gridPulse(a,dur){
    gridPulse=Math.max(gridPulse,a);
    animator.add({name:'gp',duration:dur,from:a,to:0,ease:Ease.easeOut,onUpdate:v=>gridPulse=Math.max(gridPulse,v)});
  }

  // ── Loop ─────────────────────────────────────────────────────
  function _loop(){
    if(!_running)return; _rafId=requestAnimationFrame(_loop);
    const now=performance.now();
    _readTheme(now);
    animator.tick(now); shake.update(); _computeInterp(now);
    ctx.save(); ctx.translate(shake.x,shake.y);
    _drawBg(now); _drawGrain(); _drawWalls(now);
    _drawEdgeDanger(now); _drawTrail();
    particles.draw(ctx);
    _drawFoods(now); _drawPowerup(now); _drawSnake(now); _drawCrumble(now);
    ctx.restore(); _drawOverlays(now);
  }

  // ── Fundo ─────────────────────────────────────────────────────
  function _drawBg(now){
    ctx.fillStyle=_themeBg; ctx.fillRect(0,0,canvas.width,canvas.height);
    const a=.028+gridPulse*.16;
    ctx.strokeStyle=`rgba(128,128,128,${a})`; ctx.lineWidth=.5; ctx.beginPath();
    for(let x=0;x<=CFG.COLS;x++){ctx.moveTo(x*CFG.CELL,0);ctx.lineTo(x*CFG.CELL,canvas.height);}
    for(let y=0;y<=CFG.ROWS;y++){ctx.moveTo(0,y*CFG.CELL);ctx.lineTo(canvas.width,y*CFG.CELL);}
    ctx.stroke();
  }
  function _drawGrain(){
    if(!_grain)return; if(Math.random()<.1)_mkGrain();
    const pat=ctx.createPattern(_grain,'repeat');
    ctx.globalAlpha=.4; ctx.fillStyle=pat; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.globalAlpha=1;
  }

  // ── Paredes ───────────────────────────────────────────────────
  function _drawWalls(now){
    if(!gameState?.walls?.length&&!_dynWall.size)return;
    const C=CFG.CELL, head=gameState?.snake?.[0];
    // Atualiza alphas das paredes dinâmicas
    _dynWall.forEach((a,k)=>{
      const age=(performance.now()-a.born)/DYN_FADE;
      a.alpha=a.phase==='in'?Math.min(1,age):Math.max(0,1-age);
      if(a.phase==='out'&&a.alpha<=0)_dynWall.delete(k);
    });
    for(const w of (gameState?.walls||[])){
      const isDyn=!!w._dynamic;
      const k=`${w.x},${w.y}`;
      let alpha=1;
      if(isDyn){ const da=_dynWall.get(k); alpha=da?da.alpha:1; }
      else if(head){ const d=Math.abs(w.x-head.x)+Math.abs(w.y-head.y); if(d===1)alpha=.82; if(d===0)alpha=.55; }
      if(alpha<.01)continue;
      ctx.globalAlpha=alpha;
      if(isDyn){
        const pulse=.7+Math.sin(now*.0038+w.x*.7+w.y*.5)*.3;
        ctx.fillStyle='#ff6b35';
        ctx.shadowBlur=7*alpha*pulse; ctx.shadowColor='#ff6b35';
        ctx.fillRect(w.x*C+1,w.y*C+1,C-2,C-2); ctx.shadowBlur=0;
        if(w._born&&w._ttl){
          const pct=1-Math.min((Date.now()-w._born)/w._ttl,1);
          ctx.fillStyle='rgba(255,230,0,.75)';
          ctx.fillRect(w.x*C+1,w.y*C+1,Math.max(1,(C-2)*pct),2);
        }
      } else {
        ctx.fillStyle=_themeFg; ctx.fillRect(w.x*C+1,w.y*C+1,C-2,C-2);
        ctx.fillStyle=_themeBg; ctx.globalAlpha=alpha*.1; ctx.fillRect(w.x*C+3,w.y*C+3,C-6,C-6);
      }
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0;
  }

  // ── Comidas ───────────────────────────────────────────────────
  function _drawFoods(now){
    if(!gameState?.foods)return;
    for(const f of gameState.foods){
      if(!foodAnim.has(f))foodAnim.set(f,{phase:Math.random()*MathUtil.tau,spawnT:now});
      const fa=foodAnim.get(f);
      fa.phase=(fa.phase+.052)%MathUtil.tau;

      const wx=f.x*CFG.CELL+CFG.CELL/2, wy=f.y*CFG.CELL+CFG.CELL/2;
      const spawnAge=now-fa.spawnT;
      // Animate-in: bounce de 0→1 em 350ms
      const spawnSc=spawnAge<350?Ease.easeOut(spawnAge/350):1;
      const bobAmp=f.pts>=300?2.5:f.pts>=100?1.8:1.1;
      const bob=Math.sin(fa.phase)*bobAmp;
      const pulseSc=1+Math.sin(fa.phase*2)*(f.pts>=300?.13:f.pts>=100?.09:.055);

      // Partículas orbitando comidas raras
      if(f.pts>=300){
        let ang=orbitMap.get(f)||0; ang+=.065; orbitMap.set(f,ang);
        for(let i=0;i<4;i++){
          const a=ang+(i/4)*MathUtil.tau, dist=CFG.CELL*.78+Math.sin(now*.0025+i)*2;
          particles.spark(wx+Math.cos(a)*dist,wy+bob+Math.sin(a)*dist,{color:f.color||_themeFg,size:2.5,glow:9});
        }
      } else if(f.pts>=100){
        let ang=orbitMap.get(f)||0; ang+=.048; orbitMap.set(f,ang);
        for(let i=0;i<2;i++){
          const a=ang+(i/2)*MathUtil.tau;
          particles.spark(wx+Math.cos(a)*CFG.CELL*.68,wy+bob+Math.sin(a)*CFG.CELL*.68,{color:f.color||_themeFg,size:1.6,glow:5});
        }
      }

      // Fade final por TTL (pisca nos últimos 30%)
      let alpha=1;
      if(f.ttl!==null&&f._spawnTime){
        const age=now-f._spawnTime, frac=age/f.ttl;
        if(frac>.70){const r=(frac-.70)/.30; alpha=1-r; if(r>.5)alpha*=Math.sin(now/45)>.0?1:.1;}
      }

      ctx.globalAlpha=alpha*Math.max(0,spawnSc);
      ctx.fillStyle=f.color||_themeFg; ctx.strokeStyle=f.color||_themeFg;

      // Glow proporcional
      if(f.pts>=50){
        const gv=f.pts>=300?20:f.pts>=100?13:7;
        ctx.shadowBlur=gv*(.8+Math.sin(fa.phase)*.2); ctx.shadowColor=f.color||_themeFg;
      }

      ctx.save();
      ctx.translate(wx,wy+bob);
      ctx.scale(pulseSc*spawnSc,pulseSc*spawnSc);
      _drawFoodShape(f);
      _drawFoodBadge(f);
      ctx.restore();
      ctx.shadowBlur=0; ctx.globalAlpha=1;
    }
  }

  function _drawFoodShape(f){
    const r=f.r||4, col=f.color||_themeFg;
    switch(f.shape){
      case 'cherry':
        // Dois círculos com reflexo
        [[-2.5,1],[2.5,1]].forEach(([dx,dy])=>{
          ctx.beginPath();ctx.arc(dx,dy,r-1,0,MathUtil.tau);ctx.fill();
          ctx.fillStyle='rgba(255,255,255,.32)';ctx.beginPath();ctx.arc(dx-.5,dy-.8,r*.42,Math.PI*.9,0);ctx.fill();
          ctx.fillStyle=col;
        });
        ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-2.5,-r+2);ctx.quadraticCurveTo(0,-r-4,2.5,-r+2);ctx.stroke();
        break;
      case 'apple':
        ctx.beginPath();ctx.arc(0,1,r,0,MathUtil.tau);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.arc(-r*.28,-r*.15,r*.42,Math.PI*.9,0);ctx.fill();
        ctx.fillStyle=col;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(0,-r+1);ctx.lineTo(0,-r-4);ctx.stroke();
        ctx.beginPath();ctx.ellipse(3,-r-1,2.5,1.5,.4,0,MathUtil.tau);ctx.fill();
        break;
      case 'cake':
        ctx.beginPath();rrect(ctx,-r,-1,r*2,r+1,2);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();rrect(ctx,-r,-1,r*2,(r+1)*.38,2);ctx.fill();
        ctx.fillStyle=col;ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(-r,-1);ctx.lineTo(r,-1);ctx.stroke();
        ctx.fillRect(-1.5,-r,3,r-1);
        // Chama
        const ft=Date.now()*.003;
        ctx.fillStyle='#ffcc00';ctx.beginPath();ctx.arc(0,-r-1+Math.sin(ft)*.5,1.9,0,MathUtil.tau);ctx.fill();
        ctx.fillStyle='rgba(255,140,0,.65)';ctx.beginPath();ctx.arc(0,-r-2.2+Math.cos(ft+1)*.4,1,0,MathUtil.tau);ctx.fill();
        ctx.fillStyle=col;
        break;
      case 'grape':
        [[-2.5,-2.5],[2.5,-2.5],[0,.5],[-2.5,1.5],[2.5,1.5]].forEach(([dx,dy])=>{
          ctx.beginPath();ctx.arc(dx,dy,r-2,0,MathUtil.tau);ctx.fill();
          ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.arc(dx-.4,dy-.6,r*.32,Math.PI*.8,0);ctx.fill();
          ctx.fillStyle=col;
        });
        ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(0,-r+.5);ctx.lineTo(0,-r-3.5);ctx.stroke();
        ctx.beginPath();ctx.ellipse(2.5,-r-1.2,2,1.3,.45,0,MathUtil.tau);ctx.fill();
        break;
      case 'chocolate':
        ctx.beginPath();rrect(ctx,-r,-r+1,r*2,r*2-2,1.5);ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=.9;
        ctx.beginPath();ctx.moveTo(0,-r+1);ctx.lineTo(0,r-1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(-r,-r*.25);ctx.lineTo(r,-r*.25);ctx.stroke();
        ctx.strokeStyle=col;
        ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();rrect(ctx,-r,-r+1,r,r-1,1.5);ctx.fill();
        ctx.fillStyle=col;
        break;
      case 'mouse':
        ctx.beginPath();ctx.ellipse(0,1,r-1,r-2,0,0,MathUtil.tau);ctx.fill();
        ctx.beginPath();ctx.arc(-r+2,-1,2.9,0,MathUtil.tau);ctx.fill();
        ctx.beginPath();ctx.arc(r-2,-1,2.9,0,MathUtil.tau);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.28)';
        ctx.beginPath();ctx.arc(-r+2.6,-1.6,1.6,Math.PI*.8,0);ctx.fill();
        ctx.beginPath();ctx.arc(r-2.6,-1.6,1.6,Math.PI*.8,0);ctx.fill();
        ctx.fillStyle=col;
        ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(r-2,r-1);ctx.quadraticCurveTo(r+4,r,r+2,r+5);ctx.stroke();
        ctx.fillStyle='#222';ctx.beginPath();ctx.arc(-r+3,-.5,1.2,0,MathUtil.tau);ctx.fill();
        ctx.beginPath();ctx.arc(r-3,-.5,1.2,0,MathUtil.tau);ctx.fill();
        ctx.fillStyle=col;
        break;
      case 'human':
        ctx.beginPath();ctx.arc(0,-r+1,2.8,0,MathUtil.tau);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.arc(-.5,-r+.5,1.6,Math.PI*.8,0);ctx.fill();
        ctx.fillStyle=col;ctx.lineWidth=2.2;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(0,-r+3.8);ctx.lineTo(0,1.5);ctx.stroke();
        ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-r+1,-.5);ctx.lineTo(r-1,-.5);ctx.stroke();
        ctx.lineWidth=1.9;
        ctx.beginPath();ctx.moveTo(0,1.5);ctx.lineTo(-r+2,r+2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,1.5);ctx.lineTo(r-2,r+2);ctx.stroke();
        ctx.lineCap='butt';
        break;
      default:
        ctx.beginPath();ctx.arc(0,0,r,0,MathUtil.tau);ctx.fill();
    }
  }

  function _drawFoodBadge(f){
    if(f.pts<30)return;
    const r=f.r||4;
    const sz=f.pts>=300?11:f.pts>=100?10:9;
    const label=`+${f.pts}`;
    ctx.font=`bold ${sz}px "Space Mono",monospace`;
    const tw=ctx.measureText(label).width;
    const bx=r+2, by=-r-sz-3, bw=tw+6, bh=sz+4;
    // Fundo badge
    ctx.fillStyle=f.color||_themeFg; ctx.globalAlpha=.9;
    ctx.beginPath(); rrect(ctx,bx,by,bw,bh,3); ctx.fill();
    ctx.globalAlpha=1;
    // Texto
    ctx.fillStyle='#fff'; ctx.shadowBlur=3; ctx.shadowColor='rgba(0,0,0,.5)';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label,bx+bw/2,by+bh/2);
    ctx.shadowBlur=0; ctx.textAlign='left';
  }

  // ── Powerup ───────────────────────────────────────────────────
  function _drawPowerup(now){
    if(!gameState?.powerup)return;
    const pw=gameState.powerup;
    const def=POWERUP_TYPES.find(p=>p.kind===pw.kind);
    const C=CFG.CELL, wx=pw.x*C+C/2, wy=pw.y*C+C/2;
    if(!pw._phase)pw._phase=0; pw._phase=(pw._phase+.052)%MathUtil.tau;
    const sc=1+Math.sin(pw._phase)*.18;
    const spin=now*.0012;
    const col=def?.color||_themeFg;
    ctx.save();ctx.translate(wx,wy);ctx.scale(sc,sc);
    ctx.rotate(spin);
    ctx.shadowBlur=16;ctx.shadowColor=col;ctx.strokeStyle=col;ctx.lineWidth=2;
    // Hexágono externo
    ctx.beginPath();
    for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6;i?ctx.lineTo(Math.cos(a)*9,Math.sin(a)*9):ctx.moveTo(Math.cos(a)*9,Math.sin(a)*9);}
    ctx.closePath();ctx.stroke();
    // Hexágono interno mais fino
    ctx.lineWidth=.8;
    ctx.beginPath();
    for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6;i?ctx.lineTo(Math.cos(a)*5.5,Math.sin(a)*5.5):ctx.moveTo(Math.cos(a)*5.5,Math.sin(a)*5.5);}
    ctx.closePath();ctx.stroke();
    ctx.shadowBlur=0;ctx.rotate(-spin);
    ctx.font=`bold 9px "Space Mono",monospace`;ctx.fillStyle=col;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(pw.label||'?',0,.5);
    ctx.restore();
  }

  // ── Trail ─────────────────────────────────────────────────────
  function _drawTrail(){
    if(!gameState?.snake?.length)return;
    const C=CFG.CELL;
    if(gameState.pwActive&&gameState.pwKind==='ghost'&&gameEngine?._internals?.GhostTrail){
      for(const p of gameEngine._internals.GhostTrail.positions){
        const a=Math.max(0,.28*(1-p.age/8));if(a<.01)continue;
        ctx.globalAlpha=a;ctx.fillStyle=_themeFg;ctx.fillRect(p.x*C+3,p.y*C+3,C-6,C-6);
      }
    }
    const maxTrail=gameState.combo>=3?12:4;
    if(_trail.length>maxTrail)_trail.pop();
    _trail.forEach((h,i)=>{
      const a=.4*(1-i/maxTrail);if(a<.01)return;
      ctx.globalAlpha=a;ctx.fillStyle=h.color||_themeFg;
      const pad=3+i;ctx.fillRect(h.x*C+pad,h.y*C+pad,C-pad*2,C-pad*2);
    });
    ctx.globalAlpha=1;
  }

  // ── Cobra ─────────────────────────────────────────────────────
  function _drawSnake(now){
    if(!gameState?.snake)return;
    const {dir,pwKind,pwActive}=gameState, C=CFG.CELL;
    const ghost=pwActive&&pwKind==='ghost';
    const portal=pwActive&&pwKind==='portal_mode';
    const dash=pwActive&&pwKind==='dash';
    const freeze=pwActive&&pwKind==='freeze';
    const skin=SnakeSkin.getSkin(), color=SnakeSkin.getColor();
    const pos=interp.pos; if(!pos.length)return;

    for(let i=pos.length-1;i>=0;i--){
      const p=pos[i];
      ctx.globalAlpha=ghost?.28:1;
      ctx.save(); ctx.translate(p.px+C/2,p.py+C/2);

      if(pwActive&&!ghost){
        const def=POWERUP_TYPES.find(d=>d.kind===pwKind);
        if(def){ctx.shadowBlur=14;ctx.shadowColor=def.color;}
      }
      if(portal&&i<5){ctx.shadowBlur=13;ctx.shadowColor='#00d2ff';}
      if(freeze&&i<3){ctx.shadowBlur=8;ctx.shadowColor='#7dd3fc';}
      if(dash&&i<3){
        ctx.shadowBlur=11;ctx.shadowColor='#34d399';
        ctx.rotate(dir==='RIGHT'?-.07:dir==='LEFT'?.07:0);
      }

      if(i===0) skin.drawHead(ctx,C,dir,color);
      else      skin.drawBody(ctx,C,i,color);

      ctx.shadowBlur=0;ctx.shadowColor='transparent';
      ctx.globalAlpha=1;ctx.lineCap='butt';ctx.lineWidth=1;
      ctx.restore();
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  }

  // ── Morte ─────────────────────────────────────────────────────
  function _drawCrumble(now){
    if(!crumbleActive||!crumbleSegs.length)return;
    for(const seg of crumbleSegs){
      const elapsed=now-seg.born-seg.delay;if(elapsed<0)continue;
      const t=Math.min(elapsed/800,1);
      const eased=Ease.easeIn(t),alpha=1-eased;if(alpha<.01)continue;
      seg.rot+=seg.rotV;
      const x=seg.x+seg.vx*elapsed*.055;
      const y=seg.y+seg.vy*elapsed*.055+eased*35;
      const s=Math.max(1,(CFG.CELL-5)*(1-eased*.65));
      ctx.save();ctx.globalAlpha=alpha;
      ctx.translate(x,y);ctx.rotate(seg.rot);
      ctx.fillStyle=seg.col;ctx.fillRect(-s/2,-s/2,s,s);
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }

  // ── Borda de perigo ───────────────────────────────────────────
  function _drawEdgeDanger(now){
    if(!gameState?.snake||gameState.mode==='wrap')return;
    const h=gameState.snake[0];if(!h)return;
    const m=2,near=h.x<m||h.x>=CFG.COLS-m||h.y<m||h.y>=CFG.ROWS-m;
    edgeDanger=near?Math.min(edgeDanger+.06,.24):Math.max(edgeDanger-.05,0);
    if(edgeDanger<.01)return;
    const bw=4,pulse=edgeDanger*(.5+Math.sin(now/80)*.5);
    ctx.globalAlpha=pulse;ctx.fillStyle='#ff3b30';
    ctx.shadowBlur=14;ctx.shadowColor='#ff3b30';
    ctx.fillRect(0,0,canvas.width,bw);ctx.fillRect(0,canvas.height-bw,canvas.width,bw);
    ctx.fillRect(0,0,bw,canvas.height);ctx.fillRect(canvas.width-bw,0,bw,canvas.height);
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  }

  // ── Overlays ──────────────────────────────────────────────────
  function _drawOverlays(now){
    if(flashAlpha>.001){ctx.globalAlpha=flashAlpha;ctx.fillStyle=flashColor;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;}
    if(levelAlpha>.01){
      ctx.save();ctx.globalAlpha=levelAlpha;
      ctx.fillStyle=_themeFg;
      ctx.shadowBlur=22*levelAlpha;ctx.shadowColor=_themeFg;
      ctx.font=`bold ${Math.round(CFG.CELL*2.2)}px "Space Mono",monospace`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(levelText,canvas.width/2,canvas.height/2+(1-levelAlpha)*-18);
      ctx.shadowBlur=0;ctx.restore();
    }
  }

  Bus.on('powerupStart',()=>{_gridPulse(.55,500);});
  Bus.on('milestone',  ()=>{_gridPulse(.85,900);particles.ring(canvas.width/2,canvas.height/2,{count:38,speed:4.5,radius:24,glow:14,color:_themeFg});});

  return {init,stop,clearEffects,onEat,onDeath,onLevelUp,onCombo,onPowerup,shake,particles,animator};
})();
