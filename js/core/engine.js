// js/core/engine.js
import { CFG, MODES, LEVELS, DIR_VECTORS, OPPOSITE, FOOD_TYPES, POWERUP_TYPES } from './config.js';
import { MathUtil } from '../utils/math.js';
import { store } from './store.js';
import { Bus } from '../utils/bus.js';

export const state = {
  snake:[], dir:'RIGHT', nextDir:'RIGHT',
  foods:[], powerup:null,
  pwActive:false, pwKind:null, pwTimer:0, pwDuration:0,
  score:0, streak:0, combo:1, bestScore:0,
  mode:'classic', level:1, levelEaten:0,
  timeLeft:null, walls:[],
  running:false, paused:false, phase:'menu', sessionStart:0,
  // Extras dinâmicos
  wrapOverride:false,   // true quando portal_mode ativo no clássico
  portalScoreTriggered:false, // garante que o forced powerup só dispara 1x
};

let _gameLoop=null, _timerInterval=null, _eatTimestamp=0, _currentSpeed=145;
let _comboDecayTimer=null, _gracePeriod=false;
const _LEVELUP_PAUSE=2000;

// ── Streak milestones ────────────────────────────────────────────
const STREAK_MILESTONES=Object.freeze([
  {streak:10, bonus:5,   label:'streak ×10'},
  {streak:25, bonus:15,  label:'streak ×25'},
  {streak:50, bonus:40,  label:'streak ×50'},
  {streak:100,bonus:100, label:'streak ×100'},
]);
function _checkStreak(s){const m=STREAK_MILESTONES.find(x=>x.streak===s);if(m){state.score+=m.bonus;Bus.emit('milestone',m);}}

export const SessionStats={
  _foodByType:{},_powerupsUsed:{},_peakCombo:1,_peakStreak:0,_deathCause:null,
  reset(){this._foodByType={};this._powerupsUsed={};this._peakCombo=1;this._peakStreak=0;this._deathCause=null;},
  trackFood(t){this._foodByType[t]=(this._foodByType[t]||0)+1;},
  trackPowerup(k){this._powerupsUsed[k]=(this._powerupsUsed[k]||0)+1;},
  trackCombo(c){if(c>this._peakCombo)this._peakCombo=c;},
  trackStreak(s){if(s>this._peakStreak)this._peakStreak=s;},
  setDeathCause(c){this._deathCause=c;},
  summary(){return{foodByType:this._foodByType,powerupsUsed:this._powerupsUsed,peakCombo:this._peakCombo,peakStreak:this._peakStreak,deathCause:this._deathCause};},
};

export const GhostTrail={
  _positions:[],maxLen:3,
  push(pos){this._positions.unshift({...pos,age:0});if(this._positions.length>this.maxLen)this._positions.pop();},
  tick(){this._positions.forEach(p=>p.age++);this._positions=this._positions.filter(p=>p.age<8);},
  get positions(){return this._positions;},
  clear(){this._positions.length=0;},
};

export const InputBuffer={
  _pending:null,
  push(dir){const cur=this._pending||state.dir;if(dir!==OPPOSITE[cur])this._pending=dir;},
  flush(){if(this._pending!==null){state.nextDir=this._pending;this._pending=null;}},
  clear(){this._pending=null;},
};

export const WallAnimator={
  _active:[],
  addMoving(wi,axis,range,speed){this._active.push({wi,axis,range,speed,t:0,dir:1});},
  tick(){for(const w of this._active){w.t+=w.speed*w.dir;if(w.t>=w.range||w.t<=0)w.dir*=-1;if(w.wi<state.walls.length)state.walls[w.wi][w.axis]=Math.round(w.t);}},
  clear(){this._active.length=0;},
};

// ── Engine API ───────────────────────────────────────────────────
export const Engine={
  start(mode='classic',level=1){
    Engine.stop();
    InputBuffer.clear(); SessionStats.reset(); GhostTrail.clear();
    if(window._Renderer)window._Renderer.clearEffects();
    state.mode=mode; state.level=mode==='challenge'?level:1;
    state.phase='playing'; state.running=true; state.paused=false;
    state.sessionStart=performance.now();
    state.portalScoreTriggered=false; state.wrapOverride=false;
    _initLevel(state.level); _scheduleStep();
    Bus.emit('phaseChange','playing');
  },
  stop(){
    clearInterval(_gameLoop); clearInterval(_timerInterval); clearTimeout(_comboDecayTimer);
    _gameLoop=_timerInterval=null; state.running=false;
    if(state.phase==='playing')state.phase='gameover';
  },
  pause(){
    if(!state.running||state.paused)return;
    state.paused=true; clearInterval(_gameLoop); clearInterval(_timerInterval); clearTimeout(_comboDecayTimer);
    Bus.emit('phaseChange','paused');
  },
  resume(){
    if(!state.paused)return;
    state.paused=false; _scheduleStep(); _resumeTimer(); _startComboDecay();
    Bus.emit('phaseChange','playing');
  },
  setDir(d){if(!state.running||state.paused||state.phase!=='playing')return;InputBuffer.push(d);},
  retryLevel(){if(state.mode!=='challenge')return;const l=state.level;Engine.stop();Engine.start('challenge',l);},
  getSessionStats:()=>SessionStats.summary(),
};

function _initLevel(levelNum){
  WallAnimator.clear();
  const isChallenge=state.mode==='challenge';
  const levelDef=isChallenge?LEVELS[levelNum-1]:null;
  const modeDef=MODES[state.mode];
  const cx=Math.floor(CFG.COLS/2),cy=Math.floor(CFG.ROWS/2);
  state.snake=[{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];
  state.dir='RIGHT'; state.nextDir='RIGHT';
  if(levelNum===1||!isChallenge){state.score=0;state.streak=0;state.combo=1;}
  state.levelEaten=0; state.foods=[]; state.powerup=null; _clearPowerup();
  state.wrapOverride=false;
  state.walls=levelDef?[...levelDef.walls]:[];
  const spawnSet=new Set(state.snake.map(s=>`${s.x},${s.y}`));
  state.walls=state.walls.filter(w=>!spawnSet.has(`${w.x},${w.y}`));
  _currentSpeed=levelDef?.speedOverride??modeDef.baseSpeed;
  state.bestScore=store.getBest(state.mode);
  clearInterval(_timerInterval); _gracePeriod=false;
  state.timeLeft=levelDef?.timeLimit??null;
  if(state.timeLeft!==null)_startTimer();
  _placeFood(); _placeFood(); _eatTimestamp=0;
  Bus.emit('stateUpdate',state);
}

function _startTimer(){_timerInterval=setInterval(()=>{if(state.paused)return;state.timeLeft-=100;if(state.timeLeft<=0){state.timeLeft=0;Bus.emit('stateUpdate',state);Bus.emit('timerTick',0);}else Bus.emit('timerTick',state.timeLeft);},100);}
function _resumeTimer(){if(state.timeLeft!==null&&state.timeLeft>0)_startTimer();}
function _gameOverTimeout(){clearInterval(_gameLoop);clearInterval(_timerInterval);SessionStats.setDeathCause('timeout');_doGameOver();}
function _scheduleStep(){clearInterval(_gameLoop);_gameLoop=setInterval(_step,_currentSpeed);}

function _step(){
  if(state.paused||!state.running)return;
  InputBuffer.flush(); state.dir=state.nextDir; WallAnimator.tick();

  const modeDef=MODES[state.mode];
  const head={...state.snake[0]};
  const v=DIR_VECTORS[state.dir];
  head.x+=v.dx; head.y+=v.dy;

  // Wrap: modo portal OU portal_mode ativo no clássico
  const shouldWrap=modeDef.wrap||state.wrapOverride;
  if(shouldWrap){
    head.x=(head.x+CFG.COLS)%CFG.COLS;
    head.y=(head.y+CFG.ROWS)%CFG.ROWS;
  }else{
    if(head.x<0||head.x>=CFG.COLS||head.y<0||head.y>=CFG.ROWS){
      SessionStats.setDeathCause('wall');return _doGameOver();
    }
  }

  if(state.walls.some(w=>w.x===head.x&&w.y===head.y)){
    SessionStats.setDeathCause('obstacle');return _doGameOver();
  }

  const ghostActive=state.pwActive&&state.pwKind==='ghost';
  if(!ghostActive&&state.snake.some(s=>s.x===head.x&&s.y===head.y)){
    SessionStats.setDeathCause('self');return _doGameOver();
  }

  state.snake.unshift(head);
  if(ghostActive)GhostTrail.push({x:head.x,y:head.y});
  GhostTrail.tick();

  if(state.powerup&&head.x===state.powerup.x&&head.y===state.powerup.y){
    _activatePowerup(state.powerup); state.powerup=null;
  }
  if(state.pwActive&&state.pwKind==='magnet')_applyMagnet(head);

  const fi=state.foods.findIndex(f=>f.x===head.x&&f.y===head.y);
  if(fi!==-1){const food=state.foods[fi];state.foods.splice(fi,1);_onFoodEaten(food);}
  else state.snake.pop();

  if(state.pwActive)_tickPowerup();
  _maintainFoodQueue();

  // Gatilho: 500 pts no clássico → força slow_shrink uma única vez
  if(state.mode==='classic'&&!state.portalScoreTriggered&&state.score>=CFG.PORTAL_MODE_SCORE){
    state.portalScoreTriggered=true;
    _forceSlowShrink();
  }

  Bus.emit('stateUpdate',state);
}

// ── Forced slow_shrink ao atingir 500 pts ────────────────────────
function _forceSlowShrink(){
  // Remove powerup normal que estiver na tela para não sobrepor
  state.powerup=null;
  const pw=POWERUP_TYPES.find(p=>p.kind==='slow_shrink');
  Bus.emit('forcedPowerup',{kind:'slow_shrink',message:'500 pts! SLOW + REDUÇÃO'});
  // Aplica imediatamente
  const keep=Math.max(3,Math.floor(state.snake.length/2));
  state.snake=state.snake.slice(0,keep);
  _currentSpeed=Math.min(CFG.SPEED_MAX,_currentSpeed+55);
  _scheduleStep();
  Bus.emit('powerupStart',{kind:'slow',duration:7000});
  if(window._Renderer)window._Renderer.onPowerup('slow_shrink');
  // slow dura 7s
  state.pwActive=true; state.pwKind='slow'; state.pwDuration=7000; state.pwTimer=7000;
}

function _onFoodEaten(food){
  const now=Date.now(),elapsed=now-_eatTimestamp; _eatTimestamp=now;
  if(_eatTimestamp>0&&elapsed<CFG.COMBO_WINDOW)state.combo=Math.min(state.combo+1,CFG.COMBO_MAX);
  else state.combo=Math.max(1,state.combo-1);
  state.streak++; state.levelEaten++; _checkStreak(state.streak);

  const x2=state.pwActive&&state.pwKind==='x2';
  const pts=food.pts*state.combo*(x2?2:1);
  state.score+=pts;

  if(window._Renderer){window._Renderer.onEat(food,state.combo);if(state.combo>=3&&window._Renderer.onCombo)window._Renderer.onCombo(state.combo);}
  Bus.emit('foodEaten',{food,pts,combo:state.combo});

  const modeDef=MODES[state.mode];
  const levelDef=LEVELS[state.level-1];
  const base=levelDef?.speedOverride??modeDef.baseSpeed;
  _currentSpeed=MathUtil.clamp(base-state.snake.length*modeDef.speedUp,CFG.SPEED_MIN,CFG.SPEED_MAX);
  _scheduleStep(); _placeFood(); _maybePlacePowerup();

  if(state.mode==='challenge'){
    const target=LEVELS[state.level-1]?.target??Infinity;
    if(state.levelEaten>=target)return _completeChallengeLevel();
  }
  store.saveBest(state.mode,state.score); state.bestScore=store.getBest(state.mode);
}

function _completeChallengeLevel(){
  clearInterval(_gameLoop);clearInterval(_timerInterval); state.phase='levelup';
  const ld=LEVELS[state.level-1];
  let bonus=ld.bonus;
  if(state.timeLeft!==null)bonus+=Math.floor(state.timeLeft/500);
  state.score+=bonus;
  store.unlock(state.level+1); store.saveLevelBest(state.level,state.score);
  store.saveBest(state.mode,state.score); store.syncToCloud();
  if(window._Renderer)window._Renderer.onLevelUp(state.level);
  Bus.emit('levelComplete',{level:state.level,bonus});
  setTimeout(()=>{
    if(state.level<LEVELS.length){state.level++;state.phase='playing';_initLevel(state.level);_scheduleStep();Bus.emit('phaseChange','playing');}
    else{state.phase='win';Bus.emit('phaseChange','win');}
  },_LEVELUP_PAUSE);
}

function _doGameOver(){
  clearInterval(_gameLoop);clearInterval(_timerInterval);clearTimeout(_comboDecayTimer);
  state.running=false;state.phase='gameover';
  const prevBest=store.getBest(state.mode);
  store.saveBest(state.mode,state.score); state.bestScore=store.getBest(state.mode);
  const isNew=state.score>prevBest&&state.score>0;
  const playTime=performance.now()-state.sessionStart;
  store.saveStats({gamesPlayed:1,totalScore:state.score,totalFood:state.streak,bestCombo:state.combo,playTime});
  store.syncToCloud();
  if(window._Renderer)window._Renderer.onDeath(state.snake);
  Bus.emit('gameOver',{score:state.score,isNew,streak:state.streak,combo:state.combo});
}

function _occupied(x,y){return state.snake.some(s=>s.x===x&&s.y===y)||state.foods.some(f=>f.x===x&&f.y===y)||state.walls.some(w=>w.x===x&&w.y===y)||(state.powerup&&state.powerup.x===x&&state.powerup.y===y);}
function _randomFreeCell(){let pos,tries=0;do{pos={x:MathUtil.randInt(0,CFG.COLS-1),y:MathUtil.randInt(0,CFG.ROWS-1)};tries++;}while(_occupied(pos.x,pos.y)&&tries<200);return pos;}

function _placeFood(){
  if(state.foods.length>=3)return;
  const ft=MathUtil.weightedRandom(FOOD_TYPES);
  const pos=_randomFreeCell();
  state.foods.push({...pos,...ft,_phase:Math.random()*MathUtil.tau,_spawnTime:ft.ttl!==null?Date.now():null});
}

function _maintainFoodQueue(){
  const now=Date.now();
  state.foods=state.foods.filter(f=>f.ttl===null||f._spawnTime===null||(now-f._spawnTime)<f.ttl);
  while(state.foods.length<2)_placeFood();
  if(state.foods.length<3&&state.score>10&&Math.random()<0.4)_placeFood();
}

function _maybePlacePowerup(){
  if(state.powerup||state.score<CFG.POWERUP_MIN_SCORE||Math.random()>CFG.POWERUP_CHANCE)return;
  // Não coloca slow_shrink aleatório (é sempre forçado)
  const pool=POWERUP_TYPES.filter(p=>!p.forced);
  // No modo clássico portal_mode tem chance extra
  const kind=pool[MathUtil.randInt(0,pool.length-1)];
  state.powerup={..._randomFreeCell(),...kind,_phase:0};
}

function _activatePowerup(pw){
  if(pw.duration===0){
    if(pw.kind==='shrink'){const keep=Math.max(3,Math.floor(state.snake.length/2));state.snake=state.snake.slice(0,keep);}
    else if(pw.kind==='time_warp'){if(state.timeLeft!==null)state.timeLeft=Math.min(state.timeLeft+15000,999000);}
    Bus.emit('powerupStart',{kind:pw.kind}); Bus.emit('powerupEnd',{kind:pw.kind});
    if(window._Renderer)window._Renderer.onPowerup(pw.kind); return;
  }
  _clearPowerup();
  state.pwActive=true; state.pwKind=pw.kind; state.pwDuration=pw.duration; state.pwTimer=pw.duration;
  if(pw.kind==='slow'){_currentSpeed=Math.min(CFG.SPEED_MAX,_currentSpeed+45);_scheduleStep();}
  if(pw.kind==='portal_mode'){state.wrapOverride=true;Bus.emit('portalModeStart');}
  if(window._Renderer)window._Renderer.onPowerup(pw.kind);
  Bus.emit('powerupStart',{kind:pw.kind,duration:pw.duration});
}

function _tickPowerup(){
  state.pwTimer-=_currentSpeed;
  Bus.emit('powerupTick',{timer:state.pwTimer,duration:state.pwDuration});
  if(state.pwTimer<=0){
    const wasKind=state.pwKind; _clearPowerup();
    if(wasKind==='slow'||wasKind==='portal_mode'){
      const modeDef=MODES[state.mode];const levelDef=LEVELS[state.level-1];
      const base=levelDef?.speedOverride??modeDef.baseSpeed;
      _currentSpeed=MathUtil.clamp(base-state.snake.length*modeDef.speedUp,CFG.SPEED_MIN,CFG.SPEED_MAX);
      _scheduleStep();
    }
    if(wasKind==='portal_mode'){state.wrapOverride=false;Bus.emit('portalModeEnd');}
    Bus.emit('powerupEnd',{kind:wasKind});
  }
}

function _clearPowerup(){state.pwActive=false;state.pwKind=null;state.pwTimer=0;state.pwDuration=0;state.wrapOverride=false;}

function _applyMagnet(head){
  if(!state.foods.length)return;
  let nearest=null,minDist=5.1;
  for(const f of state.foods){const d=MathUtil.dist(f,head);if(d<minDist){minDist=d;nearest=f;}}
  if(!nearest)return;
  const isFree=(x,y)=>x>=0&&x<CFG.COLS&&y>=0&&y<CFG.ROWS&&!_occupied(x,y);
  const dx=head.x-nearest.x,dy=head.y-nearest.y;
  const sx=Math.sign(dx),sy=Math.sign(dy);
  if(Math.abs(dx)>Math.abs(dy)){if(sx!==0&&isFree(nearest.x+sx,nearest.y))nearest.x+=sx;else if(sy!==0&&isFree(nearest.x,nearest.y+sy))nearest.y+=sy;}
  else{if(sy!==0&&isFree(nearest.x,nearest.y+sy))nearest.y+=sy;else if(sx!==0&&isFree(nearest.x+sx,nearest.y))nearest.x+=sx;}
}

function _startComboDecay(){
  clearTimeout(_comboDecayTimer);
  _comboDecayTimer=setTimeout(()=>{
    if(!state.running||state.paused)return;
    if(state.combo>1){state.combo=Math.max(1,state.combo-1);Bus.emit('comboDecay',state.combo);Bus.emit('stateUpdate',state);_startComboDecay();}
  },CFG.COMBO_WINDOW);
}

Bus.on('foodEaten',({food,combo})=>{SessionStats.trackFood(food.type);SessionStats.trackCombo(combo);SessionStats.trackStreak(state.streak);_startComboDecay();});
Bus.on('powerupStart',({kind})=>{if(kind)SessionStats.trackPowerup(kind);});
Bus.on('timerTick',(timeLeft)=>{if(timeLeft<=0&&!_gracePeriod){_gracePeriod=true;setTimeout(()=>{_gracePeriod=false;if(state.running&&state.timeLeft<=0)_gameOverTimeout();},1000);}});
Bus.on('phaseChange',phase=>{if(phase==='paused')Bus.emit('pauseData',{score:state.score,streak:state.streak,combo:state.combo,level:state.level,mode:state.mode,timeLeft:state.timeLeft});});

window.addEventListener('beforeunload',()=>{if(state.running)store.saveStats({playTime:performance.now()-state.sessionStart,gamesPlayed:0});});

Engine._internals={GhostTrail,InputBuffer,SessionStats,WallAnimator};
