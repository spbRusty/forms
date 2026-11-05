import { DEBUG, GAME_WIDTH, GAME_HEIGHT, CELL_SIZE, GRID_COLS, GRID_ROWS, SZ, MAX_LEVEL, SPAWN_BASE, INTER_THRESHOLD, NUM_FACES } from './config/constants.js';
import { L10N } from './localization/translations.js';
import { Storage } from './systems/Storage.js';
import { createPlatform } from './systems/Platform.js';
import { mkBtn } from './ui/buttons.js';
import { SHAPE_TYPES, LEVEL_COLORS, shapeTypeForLevel, colorForLevel, hexColor, darkenCol, drawFace, _miniStar, _miniHeart, _drawShapeOutline, buildShapeTexture, randomFace } from './graphics/Shapes.js';
'use strict';
window.onerror=function(m,s,l,c,e){var el=document.getElementById('err');if(el)el.textContent=(e&&e.message)||m;};
window.onunhandledrejection=function(e){console.warn('Необработанная ошибка:',e.reason);};
document.addEventListener('contextmenu',function(e){e.preventDefault();return false;});
document.body.oncontextmenu=function(){return false;};
document.addEventListener('selectstart',function(e){e.preventDefault();return false;});
document.addEventListener('touchstart',function(e){if(e.touches.length>1)e.preventDefault();},{passive:false});
window.addEventListener('pagehide',function(){try{var gs=window.game&&window.game.scene&&window.game.scene.getScene('GameScene');if(gs&&gs.scene.isActive())Storage.updateBest(gs._score||0);Storage.save();}catch(_){}});

const Phaser = globalThis.Phaser;
const AudioSystem = globalThis.AudioSystem;
window.currentLang='ru';window.ysdk=null;window.deathCount=0;
(function(){try{var nl=navigator.language||'ru';window.currentLang=nl.toLowerCase().startsWith('ru')?'ru':'en';}catch(_){}})();
function _updatePageTitle(){document.title=t('pageTitle');}

function _ysStop(){try{if(window.ysdk&&window.ysdk.features&&window.ysdk.features.GameplayAPI)window.ysdk.features.GameplayAPI.stop();}catch(_){}}
function _ysStart(){try{if(window.ysdk&&window.ysdk.features&&window.ysdk.features.GameplayAPI)window.ysdk.features.GameplayAPI.start();}catch(_){}}
function _ysStartIfGame(){try{if(window.ysdk&&window.ysdk.features&&window.ysdk.features.GameplayAPI){var _gs=window.game&&window.game.scene&&window.game.scene.getScene('GameScene');if(_gs&&_gs.scene.isActive())window.ysdk.features.GameplayAPI.start();}}catch(_){}}
const LEADERBOARD_ID='best_score';
function _submitLeaderboardScore(score){try{var sdk=window.ysdk;if(!sdk||!sdk.leaderboards||!sdk.isAvailableMethod||!score)return;Promise.resolve(sdk.isAvailableMethod('leaderboards.setScore')).then(function(ok){if(ok)return sdk.leaderboards.setScore(LEADERBOARD_ID,Math.floor(score));}).catch(function(){});}catch(_){}}
function _setGamePaused(value){try{var gs=window.game&&window.game.scene&&window.game.scene.getScene('GameScene');if(gs&&gs.scene.isActive()&&gs.registry.get('isPaused')!==value)gs.registry.set('isPaused',value);}catch(_){}}
function _adPause(){MusicSystem.pause();AudioSystem.muteAll();_setGamePaused(true);_ysStop();}
function _adResume(){AudioSystem.unmuteAll();AudioSystem.resume();_setGamePaused(false);if(window.game&&window.game.scene&&window.game.scene.isActive('GameScene')){MusicSystem.resume();_ysStartIfGame();}}

function isDesktopDevice(){
  try{if(localStorage.getItem('forceDesktop')==='true')return true;}catch(e){}
  try{if(typeof navigator.maxTouchPoints==='number'&&navigator.maxTouchPoints>1)return false;}catch(e){}
  if(/Mobi|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent))return false;
  if(window.innerWidth>=820)return true;
  return false;
}
if(isDesktopDevice())document.body.classList.add('desktop');

function t(k){var ln=window.currentLang||'ru';var v=(L10N[ln]&&L10N[ln][k]!==undefined)?L10N[ln][k]:L10N.ru[k];return v!==undefined?v:k;}
function switchLang(){
  window.currentLang=(window.currentLang==='ru')?'en':'ru';
  document.getElementById('html-root').setAttribute('lang',window.currentLang);
  var lp=document.getElementById('lp-title');if(lp)lp.textContent=t('forms');
  var rbl=document.getElementById('rp-best-lbl');if(rbl)rbl.textContent=t('best');
  var rml=document.getElementById('rp-merges-lbl');if(rml)rml.textContent=t('totalMerges');
  _updatePageTitle();
}

/* ================================================================ STORAGE ================================================================ */
/* ================================================================ AUDIO COMPAT ================================================================ */
// Инициализация после загрузки Storage
function _audioInit(){
  AudioSystem.init();
  _soundOn = Storage.data.soundOn !== false;
  AudioSystem.setSoundEnabled(_soundOn);
  AudioSystem.setMusicEnabled(Storage.data.musicOn !== false);
  MusicSystem._on = Storage.data.musicOn !== false;
}

// Синонимы SFX для совместимости с кодом сцен
AudioSystem.click    = AudioSystem.playClick;
AudioSystem.merge    = function(lvl){ AudioSystem.playJump(); };
AudioSystem.combo    = AudioSystem.playLapComplete;
AudioSystem.newForm  = AudioSystem.playLapComplete;
AudioSystem.ding     = AudioSystem.playJump;
AudioSystem.over     = AudioSystem.playDeath;
AudioSystem.nearMiss = function(){};
var _soundOn = Storage.data.soundOn !== false;
AudioSystem.isEnabled = function(){ return _soundOn; };
AudioSystem.toggle    = function(){
  _soundOn = !_soundOn;
  AudioSystem.setSoundEnabled(_soundOn);
  if(Storage&&Storage.data){Storage.data.soundOn=_soundOn;Storage.save();}
  return _soundOn;
};

// Тонкая обёртка MusicSystem
var MusicSystem = {
  _on: true,
  start:   function(){ if(MusicSystem._on) AudioSystem.startMusic(); },
  stop:    function(){ AudioSystem.stopMusic(); },
  pause:   function(){ AudioSystem.stopMusic(); },
  resume:  function(){ if(MusicSystem._on) AudioSystem.startMusic(); },
  toggle:  function(){
    MusicSystem._on = !MusicSystem._on;
    AudioSystem.setMusicEnabled(MusicSystem._on);
    if(Storage&&Storage.data){Storage.data.musicOn=MusicSystem._on;Storage.save();}
    return MusicSystem._on;
  },
  setFill: function(filled,total){ AudioSystem.setIntensity(total>0?filled/total:0); }
};

/* ================================================================ SIDE PANELS ================================================================ */
var LP_ORDER=[1,6,11,16, 2,7,12,17, 3,8,13,18, 4,9,14,19, 5,10,15,20];
var _lpBuilt=false;

function drawShapeVanilla(ctx,sz,level,unlocked){
  var half=sz/2;
  var col=colorForLevel(level);
  var type=shapeTypeForLevel(level);
  var cr=(col>>16)&0xff,cg=(col>>8)&0xff,cb=col&0xff;
  ctx.clearRect(0,0,sz,sz);
  if(unlocked){
    ctx.shadowColor='rgba('+cr+','+cg+','+cb+',0.7)';
    ctx.shadowBlur=6;
    ctx.fillStyle='rgb('+cr+','+cg+','+cb+')';
  }else{
    ctx.shadowBlur=0;
    ctx.fillStyle='rgb(60,60,80)';
  }
  ctx.globalAlpha=unlocked?1:0.38;
  ctx.beginPath();
  if(type==='circle'){ctx.arc(half,half,half-2,0,Math.PI*2);}
  else if(type==='triangle'){ctx.moveTo(half,3);ctx.lineTo(3,sz-4);ctx.lineTo(sz-3,sz-4);ctx.closePath();}
  else if(type==='square'){
    var rr=4;ctx.roundRect?ctx.roundRect(4,4,sz-8,sz-8,rr):ctx.rect(4,4,sz-8,sz-8);
  }
  else if(type==='diamond'){ctx.moveTo(half,2);ctx.lineTo(sz-2,half);ctx.lineTo(half,sz-2);ctx.lineTo(2,half);ctx.closePath();}
  else{var oR=half-2,iR=oR*0.38;for(var i=0;i<10;i++){var a=i*Math.PI/5-Math.PI/2,rad=i%2===0?oR:iR;if(i===0)ctx.moveTo(half+Math.cos(a)*rad,half+Math.sin(a)*rad);else ctx.lineTo(half+Math.cos(a)*rad,half+Math.sin(a)*rad);}ctx.closePath();}
  ctx.fill();
  ctx.shadowBlur=0;
  if(unlocked){
    ctx.globalAlpha=0.28;ctx.fillStyle='#ffffff';
    ctx.beginPath();ctx.arc(half-4,half-5,half*0.3,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}

function initLeftPanel(){
  if(_lpBuilt)return;_lpBuilt=true;
  var grid=document.getElementById('lp-grid');if(!grid)return;
  for(var i=0;i<LP_ORDER.length;i++){
    var lv=LP_ORDER[i];
    var slot=document.createElement('div');slot.className='shape-slot';slot.id='lp-slot-'+lv;
    var c=document.createElement('canvas');c.width=34;c.height=34;
    slot.appendChild(c);grid.appendChild(slot);
  }
  refreshLeftPanel();
}

function refreshLeftPanel(){
  for(var i=0;i<LP_ORDER.length;i++){drawLpSlot(LP_ORDER[i]);}
}

function drawLpSlot(level){
  var slot=document.getElementById('lp-slot-'+level);if(!slot)return;
  var c=slot.querySelector('canvas');if(!c)return;
  drawShapeVanilla(c.getContext('2d'),34,level,Storage.data.formsOpened.indexOf(level)!==-1);
}

function unlockLpSlot(level){
  drawLpSlot(level);
  var slot=document.getElementById('lp-slot-'+level);if(!slot)return;
  slot.classList.remove('shape-shake');void slot.offsetWidth;
  slot.classList.add('shape-shake');
  slot.addEventListener('animationend',function h(){slot.classList.remove('shape-shake');slot.removeEventListener('animationend',h);});
}

function updateRightPanel(merges){
  var bv=document.getElementById('rp-best-val');if(bv)bv.textContent=Storage.data.bestScore.toLocaleString();
  var mv=document.getElementById('rp-merges-val');if(mv)mv.textContent=(merges||0).toLocaleString();
}

const { Ads, Banner } = createPlatform({ pause: _adPause, resume: _adResume, startIfGame: _ysStartIfGame });

/* ================================================================ BTN ================================================================ */
/* ================================================================ BOOT ================================================================ */
var BootScene=new Phaser.Class({Extends:Phaser.Scene,initialize:function BootScene(){Phaser.Scene.call(this,{key:'BootScene'});},
  create:function(){
    var self=this;
    var bg=this.add.graphics();bg.fillStyle(0x0D0A2E,1);bg.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);
    this.add.text(GAME_WIDTH/2,GAME_HEIGHT/2,t('loading'),{fontSize:'28px',fontStyle:'bold',color:'#cc88ff',fontFamily:'Arial Black,Arial,sans-serif',stroke:'#330066',strokeThickness:3}).setOrigin(0.5);
    document.addEventListener('visibilitychange',function(){
      if(document.hidden){_adPause();}
      else if(!Ads._busy){_adResume();}
    });
    window.addEventListener('blur',_adPause);
    window.addEventListener('focus',function(){if(!document.hidden&&!Ads._busy)_adResume();});
    document.addEventListener('pointerdown',function(){AudioSystem.resume();},{once:true,passive:true});
    document.addEventListener('touchstart',function(){AudioSystem.resume();},{once:true,passive:true});
    window._loadingTimeout=setTimeout(function(){var el=document.getElementById('err');if(el)el.textContent=t('loadingError');},90000);
    var _finish=function(){Storage.load();Storage.addForm(1);_audioInit();_updatePageTitle();self.scene.start('MenuScene');};
    if(typeof YaGames!=='undefined'&&YaGames){
      YaGames.init().then(function(sdk){
        window.ysdk=sdk;
        Storage.initPlayer(sdk).then(function(){_audioInit();});
        try{
          var ln=(sdk.environment&&sdk.environment.i18n&&sdk.environment.i18n&&sdk.environment.i18n.lang)||window.currentLang;
          window.currentLang=ln.toLowerCase().startsWith('ru')?'ru':'en';
          document.getElementById('html-root').setAttribute('lang',window.currentLang);
        }catch(_){}
        try{
          sdk.on('game_api_pause',function(){
            _adPause();
            if(window.game&&window.game.scene){var gs=window.game.scene.getScene('GameScene');if(gs&&gs.scene.isActive())gs.registry.set('isPaused',true);}
          });
          sdk.on('game_api_resume',function(){
            _adResume();_ysStart();
            if(window.game&&window.game.scene){var gs=window.game.scene.getScene('GameScene');if(gs&&gs.scene.isActive())gs.registry.set('isPaused',false);}
          });
        }catch(_){}
      }).catch(function(){
        window.ysdk=null;
      }).finally(function(){_finish();});    }else{
      _finish();
    }
  }
});

/* ================================================================ MENU ================================================================ */
var MenuScene=new Phaser.Class({Extends:Phaser.Scene,initialize:function MenuScene(){Phaser.Scene.call(this,{key:'MenuScene'});},
  create:function(){
    var self=this;this._settingsOpen=false;this._settingsItems=[];
    initLeftPanel();
    refreshLeftPanel();
    updateRightPanel(Storage.data.totalMerges);
    
    var W=GAME_WIDTH,H=GAME_HEIGHT,cx=W/2;
    var bg=this.add.graphics();
    bg.fillGradientStyle(0x0D0A2E,0x0D0A2E,0x1A0A3E,0x1A0A3E,1);bg.fillRect(0,0,W,H);
    var starColors=[0xffffff,0xffccee,0xccddff,0xffeeaa,0xccffee];
    for(var s=0;s<70;s++){bg.fillStyle(starColors[s%5],Math.random()*0.55+0.15);bg.fillCircle(Math.random()*W,Math.random()*H,Math.random()*1.8+0.3);}
    this.add.text(cx,H*0.10,t('gameTitle'),{fontSize:'58px',fontStyle:'bold',color:'#ffffff',stroke:'#FF4466',strokeThickness:4,fontFamily:'Arial Black,Arial,sans-serif',shadow:{offsetX:3,offsetY:3,color:'#330033',blur:8,fill:true}}).setOrigin(0.5);
    this.add.text(cx,H*0.19,t('gameSubtitle'),{fontSize:'22px',color:'#FFD0FF',fontFamily:'Arial,sans-serif',stroke:'#660066',strokeThickness:2}).setOrigin(0.5);
    var shapeSets=[[1,6,11,16],[2,7,12,17],[3,8,13,18],[4,9,14,19],[5,10,15,20]];
    var lvPrev=shapeSets.map(function(set){return set[Math.floor(Math.random()*set.length)];});
    var spacing=74,rowX=cx-(lvPrev.length-1)*spacing/2;
    for(var pi=0;pi<lvPrev.length;pi++){
      (function(idx,lv){
        var fv=randomFace();
        var key=buildShapeTexture(self,lv,fv);
        var sp=self.add.sprite(rowX+idx*spacing,H*0.375,key).setScale(0.72);
        self.tweens.add({targets:sp,y:H*0.375-12,duration:830+idx*190,ease:'Sine.easeInOut',yoyo:true,repeat:-1});
        self.tweens.add({targets:sp,angle:9,duration:1130+idx*160,ease:'Sine.easeInOut',yoyo:true,repeat:-1});
      })(pi,lvPrev[pi]);
    }
    this.add.text(cx,H*0.546,t('best')+': '+Storage.data.bestScore,{fontSize:'22px',color:'#FFD700',fontFamily:'Arial,sans-serif',stroke:'#664400',strokeThickness:2}).setOrigin(0.5);
    this.add.text(cx,H*0.588,t('formsOpened')+': '+Storage.data.formsOpened.length+'/'+MAX_LEVEL,{fontSize:'16px',color:'#AACCFF',fontFamily:'Arial,sans-serif'}).setOrigin(0.5);
    mkBtn(this,cx,H*0.675,t('play'),250,64,0xFF3399,0xCC1177,function(){AudioSystem.click();self.scene.start('GameScene');});
    mkBtn(this,cx,H*0.765,t('leaderboard'),230,44,0x2266AA,0x174477,function(){AudioSystem.click();self._openLeaderboard();});
    var bottomY = H - 40;
    var lbtn=this.add.text(W/2-90,bottomY,t('langBtn'),{fontSize:'22px',fontStyle:'bold',color:'#AAFFCC',stroke:'#003322',strokeThickness:2,fontFamily:'Arial Black,Arial,sans-serif'}).setOrigin(0.5).setInteractive({useHandCursor:true});
    lbtn.on('pointerdown',function(){AudioSystem.click();switchLang();self.scene.restart();});
    var musBtn=this.add.text(W/2,bottomY,'🎵',{fontSize:'26px',alpha:MusicSystem._on?1:0.35}).setOrigin(0.5).setInteractive({useHandCursor:true});
    musBtn.on('pointerdown',function(){AudioSystem.click();var on=MusicSystem.toggle();musBtn.setAlpha(on?1:0.35);});
    var sndTxt=this.add.text(W/2+90,bottomY,AudioSystem.isEnabled()?'🔊':'🔇',{fontSize:'28px'}).setOrigin(0.5).setInteractive({useHandCursor:true});
    sndTxt.on('pointerdown',function(){AudioSystem.click();sndTxt.setText(AudioSystem.toggle()?'🔊':'🔇');});
    clearTimeout(window._loadingTimeout);
    try{if(window.ysdk&&window.ysdk.features&&window.ysdk.features.LoadingAPI)window.ysdk.features.LoadingAPI.ready();}catch(_){}
    Banner.show();
  },
  _openLeaderboard:function(){
    if(this._leaderboardOpen)return;this._leaderboardOpen=true;
    var self=this,W=GAME_WIDTH,H=GAME_HEIGHT,cx=W/2,pY=72,pH=656,items=[];
    var ov=this.add.graphics().setDepth(700);ov.fillStyle(0x000000,0.82);ov.fillRect(0,0,W,H);ov.setInteractive(new Phaser.Geom.Rectangle(0,0,W,H),Phaser.Geom.Rectangle.Contains);ov.on('pointerdown',function(pointer,localX,localY,event){event.stopPropagation();});items.push(ov);
    var pn=this.add.graphics().setDepth(701);pn.fillStyle(0x0D0820,0.99);pn.fillRoundedRect(18,pY,W-36,pH,20);pn.lineStyle(3,0x55AAFF,0.9);pn.strokeRoundedRect(18,pY,W-36,pH,20);items.push(pn);
    items.push(this.add.text(cx,pY+38,t('leaderboard'),{fontSize:'25px',fontStyle:'bold',color:'#ffffff',fontFamily:'Arial Black,Arial,sans-serif',align:'center',wordWrap:{width:350}}).setOrigin(0.5).setDepth(702));
    var status=this.add.text(cx,pY+88,t('leaderboardLoading'),{fontSize:'17px',color:'#AACCFF',fontFamily:'Arial,sans-serif',align:'center'}).setOrigin(0.5).setDepth(702);items.push(status);
    var close=mkBtn(this,cx,pY+pH-42,t('close'),100,40,0x5533BB,0x3322AA,function(){AudioSystem.click();self._closeLeaderboard();});close.forEach(function(o){o.setDepth(703);});items=items.concat(close);
    this._leaderboardItems=items;
    var sdk=window.ysdk;
    if(!sdk||!sdk.leaderboards||typeof sdk.leaderboards.getEntries!=='function'){status.setText(t('leaderboardUnavailable'));return;}
    sdk.leaderboards.getEntries(LEADERBOARD_ID,{quantityTop:10,includeUser:true,quantityAround:2}).then(function(data){
      if(!self.scene.isActive('MenuScene')||!self._leaderboardOpen)return;
      var entries=(data&&data.entries)||[],top=entries.filter(function(e){return e&&e.player;}).sort(function(x,y){return x.rank-y.rank;}),unique=[],seen={};
      top.forEach(function(e){var k=String(e.player.uniqueID||e.rank);if(!seen[k]){seen[k]=true;unique.push(e);}});
      var topTen=unique.filter(function(e){return e.rank<=10;}).slice(0,10);
      var own=data&&data.userRank?unique.find(function(e){return e.rank===data.userRank;}):null;
      if(own&&!topTen.some(function(e){return e.rank===own.rank;}))topTen.push(own);
      unique=topTen;
      if(!unique.length){status.setText(t('leaderboardEmpty'));return;}
      status.setVisible(false);
      unique.forEach(function(e,i){
        var yy=pY+132+i*43,isTop=e.rank<=3;
        var row=self.add.graphics().setDepth(702);row.fillStyle(isTop?0x443366:0xFFFFFF,isTop?0.72:0.07);row.fillRoundedRect(38,yy-16,W-76,36,8);items.push(row);
        var name=(e.player.publicName||t('leaderboardMe')).slice(0,18);
        items.push(self.add.text(52,yy,'#'+e.rank,{fontSize:'16px',fontStyle:'bold',color:isTop?'#FFD966':'#AACCFF',fontFamily:'Arial Black,Arial,sans-serif'}).setOrigin(0,0.5).setDepth(703));
        items.push(self.add.text(112,yy,name,{fontSize:'15px',color:'#ffffff',fontFamily:'Arial,sans-serif'}).setOrigin(0,0.5).setDepth(703));
        items.push(self.add.text(W-52,yy,Math.floor(e.score).toLocaleString(),{fontSize:'16px',fontStyle:'bold',color:'#88FFCC',fontFamily:'Arial Black,Arial,sans-serif'}).setOrigin(1,0.5).setDepth(703));
      });
    }).catch(function(){if(self.scene.isActive('MenuScene')&&self._leaderboardOpen)status.setText(t('leaderboardUnavailable'));});
  },
  _closeLeaderboard:function(){if(!this._leaderboardOpen)return;this._leaderboardOpen=false;var a=this._leaderboardItems||[];this._leaderboardItems=[];for(var i=0;i<a.length;i++)if(a[i]&&a[i].active)a[i].destroy();},
  _openSettings:function(){
    if(this._settingsOpen)return;this._settingsOpen=true;
    var self=this,W=GAME_WIDTH,H=GAME_HEIGHT,cx=W/2,mW=340,mH=280,mx=cx-mW/2,my=H/2-mH/2,items=[];
    var ov=this.add.graphics();ov.fillStyle(0x514B45,0.28);ov.fillRect(0,0,W,H);items.push(ov);
    var pn=this.add.graphics();pn.fillStyle(0x1A0A3E,1);pn.fillRoundedRect(mx,my,mW,mH,18);pn.lineStyle(3,0xFF3399,0.9);pn.strokeRoundedRect(mx,my,mW,mH,18);items.push(pn);
    items.push(this.add.text(cx,my+38,t('settings'),{fontSize:'26px',fontStyle:'bold',color:'#ffffff',fontFamily:'Arial Black,Arial,sans-serif',stroke:'#660033',strokeThickness:2}).setOrigin(0.5));
    var sndLbl=this.add.text(cx,my+100,t('sound')+': '+(AudioSystem.isEnabled()?t('on'):t('off')),{fontSize:'22px',color:'#FFCCEE',fontFamily:'Arial,sans-serif',stroke:'#440022',strokeThickness:2}).setOrigin(0.5).setInteractive({useHandCursor:true});
    sndLbl.on('pointerdown',function(){AudioSystem.click();sndLbl.setText(t('sound')+': '+(AudioSystem.toggle()?t('on'):t('off')));});items.push(sndLbl);
    var musLbl=this.add.text(cx,my+140,t('music')+': '+(MusicSystem._on?t('on'):t('off')),{fontSize:'22px',color:'#DDCCFF',fontFamily:'Arial,sans-serif',stroke:'#220044',strokeThickness:2}).setOrigin(0.5).setInteractive({useHandCursor:true});
    musLbl.on('pointerdown',function(){AudioSystem.click();musLbl.setText(t('music')+': '+(MusicSystem.toggle()?t('on'):t('off')));});items.push(musLbl);
    items.push(this.add.text(cx,my+188,t('best')+': '+Storage.data.bestScore,{fontSize:'18px',color:'#FFD700',fontFamily:'Arial,sans-serif'}).setOrigin(0.5));
    items.push(this.add.text(cx,my+218,t('totalMerges')+': '+Storage.data.totalMerges,{fontSize:'16px',color:'#AAAAFF',fontFamily:'Arial,sans-serif'}).setOrigin(0.5));
    var cls=this.add.text(mx+mW-14,my+12,t('close'),{fontSize:'28px',color:'#FF8888',fontFamily:'Arial Black,Arial,sans-serif'}).setOrigin(1,0).setInteractive({useHandCursor:true});
    items.push(cls);this._settingsItems=items;
    cls.on('pointerdown',function(){self._closeSettings();});
  },
  _closeSettings:function(){if(!this._settingsOpen)return;this._settingsOpen=false;var items=this._settingsItems;this._settingsItems=[];for(var i=0;i<items.length;i++){if(items[i]&&items[i].active)items[i].destroy();}},
  shutdown:function(){this._settingsOpen=false;this._settingsItems=[];this._closeLeaderboard();}
});

/* ================================================================ GAME SCENE ================================================================ */
var GameScene=new Phaser.Class({
  Extends:Phaser.Scene,
  initialize:function GameScene(){Phaser.Scene.call(this,{key:'GameScene'});},
  init:function(data){
    this._resumeState=data&&data.resumeState?data.resumeState:null;
     if(!this._resumeState)window._secondChanceUsed=false;
    this._bgGfx=null;this._gridGfx=null;this._hlGfx=null;
    this._shapes=[];this._grid=[];
    this._drag=null;this._dox=0;this._doy=0;
    this._score=0;this._combo=0;this._maxCombo=0;this._mergeN=0;
    this._praiseProgress=0;this._nextPraise=Phaser.Math.Between(3,5);this._celebrationIndex=0;
    this._phase=0;this._paused=false;
    this._spawnEv=null;this._tickEv=null;this._t0=0;
    this._offerActive=false;this._offerItems=[];
    this._goTriggered=false;this._merging=false;this._tutorialActive=false;
    this._checkPending=false;
  },
  create:function(){
    var self=this,restoring=!!this._resumeState;
    this._cols=GRID_COLS;this._rows=GRID_ROWS;this._cs=CELL_SIZE;
    this._gx=(GAME_WIDTH-this._cols*this._cs)/2;this._gy=GAME_HEIGHT*0.175;
    for(var r=0;r<this._rows;r++){this._grid[r]=[];for(var c=0;c<this._cols;c++)this._grid[r][c]=null;}
    this._bgGfx=this.add.graphics();this._drawBg();
    this._gridGfx=this.add.graphics();this._drawGrid();
    this._hlGfx=this.add.graphics();
    this.input.on('pointerdown',this._pd,this);
    this.input.on('pointermove',this._pm,this);
    this.input.on('pointerup',this._pu,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.shutdown,this);
    this.scene.launch('UIScene');
    this._pauseAt=0;
    this.events.on('pause',function(){self._paused=true;});
    this.events.on('resume',function(){self._paused=false;});
    updateRightPanel(0);
    this.time.delayedCall(50,function(){if(!self.scene.isActive('GameScene'))return;self.registry.set('score',self._resumeState?self._resumeState.score:0);self.registry.set('isPaused',false);self.registry.set('phase',self._resumeState?self._resumeState.phase:0);});
    // В начале поля видна только гарантированно одинаковая пара.
    // Остальные фигуры появляются обычным автоспавном позже.
    // Две стартовые фигуры игрового поля создаются напрямую из одной текстуры.
    // Меню использует отдельную случайную генерацию и на это не влияет.
    var openingLevel=1,openingFace=0;
    var openingTexture=buildShapeTexture(this,openingLevel,openingFace);
    var openingCells=[{r:0,c:0},{r:0,c:1}],openingPair=[];
    for(var oi=0;oi<openingCells.length;oi++){
      var cell=openingCells[oi],pos=this._c2w(cell.r,cell.c);
      var sp=this.add.sprite(pos.x,pos.y,openingTexture);
      sp.level=openingLevel;sp.faceVariant=openingFace;
      sp.gridRow=cell.r;sp.gridCol=cell.c;sp.alive=true;
      sp.setDepth(1).setOrigin(0.5,0.5).setScale(1).setAlpha(1).setAngle(0).clearTint();
      this._grid[cell.r][cell.c]=sp;
      this._shapes.push(sp);
      openingPair.push(sp);
    }
    this._openingPair=openingPair;
    if(this._resumeState&&Array.isArray(this._resumeState.cells)){
      openingPair.forEach(function(sp){if(sp&&sp.active)sp.destroy();});
      this._grid.forEach(function(row){row.fill(null);});
      this._shapes=[];
      this._resumeState.cells.forEach(function(cell){
        if(cell.r<0||cell.r>=self._rows||cell.c<0||cell.c>=self._cols)return;
        var p=self._c2w(cell.r,cell.c),tex=buildShapeTexture(self,cell.level,cell.face);
        var restored=self.add.sprite(p.x,p.y,tex).setDepth(1);
        restored.level=cell.level;restored.faceVariant=cell.face;restored.gridRow=cell.r;restored.gridCol=cell.c;restored.alive=true;
        self._grid[cell.r][cell.c]=restored;self._shapes.push(restored);self._idleAnim(restored);
      });
      this._score=this._resumeState.score||0;this._mergeN=this._resumeState.mergeN||0;
      this._maxCombo=this._resumeState.maxCombo||0;this._phase=this._resumeState.phase||0;
      this._t0=this.time.now-(this._resumeState.elapsed||0);
      this._resumeState=null;
    }
    this._updateMusic();
    this._openingPair=openingPair;
    this._updateMusic();
    this._spawnEv=this.time.addEvent({delay:SPAWN_BASE,callback:this._autoSpawn,callbackScope:this,loop:true});
    this._tickEv=this.time.addEvent({delay:1000,callback:this._tick,callbackScope:this,loop:true});
    if(!restoring)this._t0=this.time.now;
    MusicSystem.start();MusicSystem.setFill(this._shapes.length,GRID_COLS*GRID_ROWS);
    Banner.show();
    _ysStart();
    if(Storage.data.firstRun){Storage.data.firstRun=false;Storage.save();this.time.delayedCall(300,function(){if(self.scene.isActive('GameScene'))self._tut();});}
    if(window._rewardedClearUpper){window._rewardedClearUpper=false;var _self=this;this.time.delayedCall(400,function(){if(_self.scene.isActive('GameScene'))_self._clearUpperHalf();});}
  },
  update:function(){},
  _drawBg:function(){
    if(!this._bgGfx||!this._bgGfx.active)return;
    var g=this._bgGfx;g.clear();
    var c1=this._phase>=3?0x1C2030:0x16192B,c2=this._phase>=3?0x252B40:0x20263A;
    g.fillGradientStyle(c1,c1,c2,c2,1);g.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);
    var sc=[0xffffff,0xffccee,0xccddff,0xffeeaa,0xccffee];
    for(var i=0;i<55;i++){g.fillStyle(sc[i%5],Math.random()*0.5+0.1);g.fillCircle(Math.random()*GAME_WIDTH,Math.random()*GAME_HEIGHT,Math.random()*1.8+0.3);}
  },
  _drawGrid:function(){
    if(!this._gridGfx||!this._gridGfx.active)return;
    var g=this._gridGfx;g.clear();
    for(var r=0;r<this._rows;r++)for(var c=0;c<this._cols;c++){
      var x=this._gx+c*this._cs+3,y=this._gy+r*this._cs+3,s=this._cs-6;
      g.fillStyle(0x252C40,0.76);g.fillRoundedRect(x,y,s,s,10);
      g.lineStyle(1.5,0x52617D,0.42);g.strokeRoundedRect(x,y,s,s,10);
    }
  },
  _c2w:function(r,c){return{x:this._gx+c*this._cs+this._cs/2,y:this._gy+r*this._cs+this._cs/2};},
  _w2c:function(wx,wy){var c=Math.floor((wx-this._gx)/this._cs),r=Math.floor((wy-this._gy)/this._cs);if(r>=0&&r<this._rows&&c>=0&&c<this._cols)return{r:r,c:c};return null;},
  _empty:function(){var a=[];for(var r=0;r<this._rows;r++)for(var c=0;c<this._cols;c++)if(this._grid[r][c]===null)a.push({r:r,c:c});if(!a.length)return null;return a[Math.floor(Math.random()*a.length)];},
  _lvForPhase:function(){var maxU=Storage.maxUnlocked();var cap=this._phase===0?Math.max(1,maxU):Math.min(Math.max(maxU,this._phase+1),MAX_LEVEL);return Phaser.Math.Between(1,cap);},
  _updateMusic:function(){var filled=0;for(var r=0;r<this._rows;r++)for(var c=0;c<this._cols;c++)if(this._grid[r][c]!==null)filled++;MusicSystem.setFill(filled,this._rows*this._cols);},
  _spawnShape:function(instant,forcedLevel,forcedFace,forcedCell,forcedTexture,noIdle){
    if(!this.scene.isActive('GameScene'))return;
    var cell=forcedCell||this._empty();if(!cell||this._grid[cell.r][cell.c]!==null){this._doCheck();return;}
    var lvl=forcedLevel!==undefined?forcedLevel:this._lvForPhase();
    var fv=forcedFace!==undefined?forcedFace:randomFace(),key=forcedTexture||buildShapeTexture(this,lvl,fv);
    var pos=this._c2w(cell.r,cell.c);
    var sp=this.add.sprite(pos.x,pos.y,key);
    sp.level=lvl;sp.faceVariant=fv;sp.gridRow=cell.r;sp.gridCol=cell.c;sp.alive=true;sp.setDepth(1);
    this._grid[cell.r][cell.c]=sp;this._shapes.push(sp);
    var self=this;
    if(noIdle){
      // Стартовая пара появляется сразу в одном и том же визуальном состоянии.
      sp.setScale(1,1);sp.setAlpha(1);sp.setAngle(0);sp.setTint(0xffffff);
    }else if(instant){
      sp.setScale(0.6);this.tweens.add({targets:sp,scaleX:1.08,scaleY:1.08,duration:60,ease:'Power2',onComplete:function(){if(sp&&sp.active)self.tweens.add({targets:sp,scaleX:1,scaleY:1,duration:45});}});
    }else{
      sp.setScale(0);sp.y=pos.y-28;this.tweens.add({targets:sp,y:pos.y,scaleX:1,scaleY:1,duration:130,ease:'Back.easeOut'});
    }
    if(!noIdle)this._idleAnim(sp);this._scheduleCheck();this._updateMusic();
  },
  _autoSpawn:function(){if(!this._paused&&!this._tutorialActive&&!this._offerActive&&!this._goTriggered&&!this._merging&&this.scene.isActive('GameScene'))this._spawnShape(false);},
  _scheduleCheck:function(){
    if(this._checkPending||this._goTriggered||this._offerActive)return;
    this._checkPending=true;var self=this;
    this.time.delayedCall(120,function(){self._checkPending=false;if(self.scene.isActive('GameScene')&&!self._goTriggered&&!self._offerActive)self._doCheck();});
  },
  _doCheck:function(){
    if(this._goTriggered||this._offerActive||!this.scene.isActive('GameScene'))return;
    for(var r=0;r<this._rows;r++)for(var c=0;c<this._cols;c++)if(this._grid[r][c]===null)return;
    var seen={};for(var rr=0;rr<this._rows;rr++)for(var cc=0;cc<this._cols;cc++){var it=this._grid[rr][cc];if(it&&typeof it==='object'){var k=String(it.level);if(seen[k])return;seen[k]=true;}}
    this._showOffer();
  },
  _tick:function(){
    if(!this.scene.isActive('GameScene')||this._paused)return;
    var sec=(this.time.now-this._t0)/1000,np=sec<120?0:sec<300?1:sec<480?2:sec<600?3:4;
    if(np!==this._phase){this._phase=np;this._drawBg();var ni=Math.max(700,SPAWN_BASE-np*320);if(this._spawnEv)this._spawnEv.reset({delay:ni,callback:this._autoSpawn,callbackScope:this,loop:true});var self=this;this.time.delayedCall(50,function(){if(!self.scene.isActive('GameScene'))return;self.registry.set('phase',self._phase);});}
  },
  _idleAnim:function(sp){
    if(!sp||!sp.active)return;var self=this;
    this.time.delayedCall(2800+Math.random()*2200,function(){if(!sp||!sp.active||!sp.alive||!self.scene.isActive('GameScene'))return;self.tweens.add({targets:sp,angle:Phaser.Math.Between(-10,10),duration:270,ease:'Sine.easeInOut',yoyo:true,onComplete:function(){if(sp&&sp.active)sp.setAngle(0);}});self._idleAnim(sp);});
  },
  _pd:function(ptr){
    if(this._paused||this._tutorialActive||this._offerActive||this._goTriggered||this._merging)return;
    var best=null,bestD=9999;
    for(var i=0;i<this._shapes.length;i++){var sp=this._shapes[i];if(!sp||!sp.active||!sp.alive)continue;var d=Phaser.Math.Distance.Between(ptr.x,ptr.y,sp.x,sp.y);if(d<this._cs*0.56&&d<bestD){bestD=d;best=sp;}}
    if(!best)return;
    this._drag=best;this._dox=best.x-ptr.x;this._doy=best.y-ptr.y;best.setDepth(200);
    this.tweens.add({targets:best,scaleX:1.2,scaleY:1.2,duration:90});AudioSystem.click();
  },
  _pm:function(ptr){if(!this._drag)return;this._drag.x=ptr.x+this._dox;this._drag.y=ptr.y+this._doy;this._doHighlight(ptr.x,ptr.y);},
  _doHighlight:function(px,py){
    if(!this._hlGfx||!this._hlGfx.active)return;this._hlGfx.clear();if(!this._drag)return;
    for(var i=0;i<this._shapes.length;i++){
      var sp=this._shapes[i];if(!sp||!sp.active||!sp.alive||sp===this._drag||sp.level!==this._drag.level)continue;
      var d=Phaser.Math.Distance.Between(px,py,sp.x,sp.y);
      if(d<this._cs){
        this._hlGfx.fillStyle(0x00DD55,0.18);this._hlGfx.fillCircle(sp.x,sp.y,this._cs*0.46);
        this._hlGfx.lineStyle(4,0x00FF66,0.95);this._hlGfx.strokeCircle(sp.x,sp.y,this._cs*0.44);
        this.tweens.killTweensOf(sp);sp.setScale(1.14);
      } else if(d<this._cs*1.9){
        this._hlGfx.lineStyle(2,0xFFEE00,0.55);this._hlGfx.strokeCircle(sp.x,sp.y,this._cs*0.40);AudioSystem.nearMiss();
      }
    }
  },
  _pu:function(ptr){
    if(this._merging){this._drag=null;return;}
    if(!this._drag)return;
    var sp=this._drag;this._drag=null;
    if(this._hlGfx&&this._hlGfx.active)this._hlGfx.clear();
    for(var i=0;i<this._shapes.length;i++){var s2=this._shapes[i];if(s2&&s2.active&&s2!==sp)this.tweens.add({targets:s2,scaleX:1,scaleY:1,duration:80});}
    var target=null;
    for(var j=0;j<this._shapes.length;j++){var other=this._shapes[j];if(!other||!other.active||!other.alive||other===sp)continue;if(other.level!==sp.level)continue;if(Phaser.Math.Distance.Between(sp.x,sp.y,other.x,other.y)<this._cs*0.82){target=other;break;}}
    if(target){this._merge(sp,target);return;}
    var tc=this._w2c(ptr.x,ptr.y);
    if(tc&&(tc.r!==sp.gridRow||tc.c!==sp.gridCol)&&this._grid[tc.r][tc.c]===null){
      this._grid[sp.gridRow][sp.gridCol]=null;this._grid[tc.r][tc.c]=sp;sp.gridRow=tc.r;sp.gridCol=tc.c;
      var np2=this._c2w(tc.r,tc.c);this.tweens.add({targets:sp,x:np2.x,y:np2.y,scaleX:1,scaleY:1,duration:140});
    }else{var op=this._c2w(sp.gridRow,sp.gridCol);this.tweens.add({targets:sp,x:op.x,y:op.y,scaleX:1,scaleY:1,duration:200,ease:'Back.easeOut'});}
    sp.setDepth(1);this._combo=0;
  },
  _merge:function(a,b){
    if(this._merging||!a||!b||a===b||!a.alive||!b.alive)return;
    this._merging=true;
    var self=this,tr=b.gridRow,tc2=b.gridCol,tx=b.x,ty=b.y,nl=Math.min(a.level+1,MAX_LEVEL);
    a.alive=false;b.alive=false;
    this._grid[a.gridRow][a.gridCol]=null;this._grid[b.gridRow][b.gridCol]=null;this._grid[tr][tc2]='_';
    var aR=a,bR=b;this._shapes=this._shapes.filter(function(s){return s!==aR&&s!==bR;});
    this.tweens.add({targets:a,x:tx,y:ty,scaleX:0.08,scaleY:0.08,duration:100,ease:'Power2'});
    this.tweens.add({targets:b,scaleX:0.08,scaleY:0.08,duration:100,ease:'Power2',onComplete:function(){
      if(aR&&aR.active)aR.destroy();if(bR&&bR.active)bR.destroy();
      self._merging=false;if(!self.scene.isActive('GameScene'))return;self._spawnMerged(tr,tc2,nl);
    }});
  },
  _spawnMerged:function(r,c,lvl){
    if(!this.scene.isActive('GameScene'))return;
    var self=this,pos=this._c2w(r,c),fv=randomFace(),key=buildShapeTexture(this,lvl,fv);
    var sp=this.add.sprite(pos.x,pos.y,key);
    sp.setScale(0.08).setTintFill(0xFFFFFF);sp.level=lvl;sp.faceVariant=fv;sp.gridRow=r;sp.gridCol=c;sp.alive=true;sp.setDepth(1);
    this._grid[r][c]=sp;this._shapes.push(sp);
    this.time.delayedCall(65,function(){if(sp&&sp.active)sp.clearTint();});
    this.tweens.add({targets:sp,scaleX:1.24,scaleY:0.88,duration:85,ease:'Back.easeOut',yoyo:true,onComplete:function(){if(sp&&sp.active)self.tweens.add({targets:sp,scaleX:1,scaleY:1,duration:65});}});
    this.cameras.main.shake(65+lvl*9,Math.min(lvl*0.0018,0.016));
    this._burst(pos.x,pos.y,colorForLevel(lvl),lvl);
    try{navigator.vibrate(18+lvl*3);}catch(_){}
    AudioSystem.merge(lvl);
    this._combo++;if(this._combo>this._maxCombo)this._maxCombo=this._combo;this._mergeN++;Storage.data.totalMerges++;Storage.save();
    var basePts=lvl*150;
    var comboMult=Math.min(4,1+0.5*(this._combo-1));
    var pts=Math.round(basePts*comboMult);
    var comboBonus=pts-basePts;
    this._score+=pts;
    if(this.scene.isActive('GameScene'))this.registry.set('score',this._score);
    this._floatTxt(pos.x,pos.y-28,'+'+pts,colorForLevel(lvl));
    if(this._combo>=2){
      AudioSystem.combo();
      this._floatTxt(pos.x,pos.y-58,t('combo')+' ×'+this._combo+'  +'+comboBonus,0xFFDD00);
    }
    if(this._combo>=3&&this._combo%3===0){
      var celebration=this._celebrationIndex%5;
      this._celebrationIndex++;
      this._playCelebration(celebration);
    }
    this._praiseProgress++;
    if(this._praiseProgress>=this._nextPraise){
      this._praiseProgress=0;
      this._nextPraise=Phaser.Math.Between(3,5);
      this._showPraise();
      this._celebrateFaces();
    }
    if(Storage.addForm(lvl)){AudioSystem.newForm();this._floatTxt(pos.x,pos.y-88,t('evolvedTo')+lvl+'! \u2728',0xFFDD00);unlockLpSlot(lvl);}
    
    this._idleAnim(sp);
    updateRightPanel(this._mergeN);
    this._updateMusic();
    this._doCheck();
  },
  _burst:function(x,y,col,lvl){
    if(!this.scene.isActive('GameScene'))return;
    var cnt=Math.min(8+lvl*2,18),pts=[];
    for(var i=0;i<cnt;i++){var a=(Math.PI*2/cnt)*i,spd=60+Math.random()*80;pts.push({x:x,y:y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,sz:3.5+Math.random()*3.5});}
    var g=this.add.graphics().setDepth(50),el=0,tot=420,self=this;
    this.time.addEvent({delay:33,repeat:Math.ceil(tot/33),callback:function(){
      if(!g||!g.active||!self.scene.isActive('GameScene'))return;el+=33;g.clear();var al=1-el/tot;
      for(var j=0;j<pts.length;j++){var p=pts[j];p.x+=p.vx*0.033;p.y+=p.vy*0.033;p.vy+=280*0.033;if(al>0){g.fillStyle(col,al);g.fillCircle(p.x,p.y,p.sz*al+0.5);}}
      if(el>=tot&&g&&g.active)g.destroy();
    }});
  },
  _playCelebration:function(type){
    if(!this.scene.isActive('GameScene')||this._paused||this._celebrationActive)return;
    this._celebrationActive=true;
    var self=this,W=GAME_WIDTH,H=GAME_HEIGHT;
    var palette=[0xFF3D9A,0xFFE34A,0x43E8FF,0xB66CFF,0x75FF75,0xFFFFFF,0xFF8B45];
    var particles=[],rings=[],elapsed=0;
    var gfx=this.add.graphics().setDepth(460);
    var maxParticles=170;
    function addParticle(p){if(particles.length<maxParticles)particles.push(p);}
    function burst(x,y,color){
      var count=34,rotation=Math.random()*Math.PI*2;
      for(var i=0;i<count;i++){
        var a=rotation+Math.PI*2*i/count+(Math.random()-0.5)*0.12;
        var speed=75+Math.random()*145,life=850+Math.random()*450;
        addParticle({x:x,y:y,px:x,py:y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
          life:life,max:life,size:1.7+Math.random()*2.1,color:color,kind:'spark'});
      }
      rings.push({x:x,y:y,r:2,life:400,max:400,color:color});
    }
    if(type===0){
      // Пять крупных разноцветных залпов, распределённых по всему полю.
      var points=[0.12,0.31,0.50,0.69,0.88];
      points.forEach(function(px,i){burst(W*px,H*(0.25+(i%2)*0.27),palette[i]);});
      AudioSystem.playFireworks();
      this.cameras.main.flash(100,255,255,255,false);
      this.cameras.main.shake(150,0.0025);
    }else if(type===1){
      // Большой поток сердец поднимается снизу и расходится веером.
      for(var h=0;h<105;h++){
        var x=Math.random()*W,y=H+Math.random()*100,life=1700+Math.random()*900;
        addParticle({x:x,y:y,px:x,py:y,vx:(Math.random()-0.5)*95,vy:-(100+Math.random()*150),
          life:life,max:life,size:5+Math.random()*7,color:palette[h%3],kind:'heart',rot:(Math.random()-0.5)*0.5});
      }
      AudioSystem.playHearts();
      this.cameras.main.flash(90,255,105,170,false);
    }else if(type===2){
      // Золотой звёздный дождь с мерцающими крупными звёздами.
      for(var st=0;st<145;st++){
        var sx=Math.random()*W,sy=-Math.random()*H*0.65,sl=1600+Math.random()*1000;
        addParticle({x:sx,y:sy,px:sx,py:sy,vx:(Math.random()-0.5)*35,vy:100+Math.random()*145,
          life:sl,max:sl,size:2.5+Math.random()*4,color:st%5===0?0xFFFFFF:0xFFD84A,kind:'star'});
      }
      AudioSystem.playStars();
      this.cameras.main.flash(110,255,225,120,false);
    }else if(type===3){
      // Семь цветных лент прокатываются через экран волной.
      for(var band=0;band<7;band++){
        for(var step=0;step<22;step++){
          var rx=-20-step*22,ry=H*0.30+band*24;
          addParticle({x:rx,y:ry,px:rx,py:ry,vx:145+band*5,vy:0,life:2100,max:2100,
            size:3.5,color:palette[band],kind:'wave',phase:band*0.55+step*0.16,baseY:ry});
        }
      }
      AudioSystem.playRainbow();
      this.cameras.main.flash(100,150,100,255,false);
    }else{
      // Плотный разноцветный залп конфетти с лентами.
      for(var cf=0;cf<155;cf++){
        var cx=Math.random()*W,cy=-Math.random()*H*0.8,cl=1800+Math.random()*1200;
        addParticle({x:cx,y:cy,px:cx,py:cy,vx:(Math.random()-0.5)*90,vy:90+Math.random()*170,
          life:cl,max:cl,size:3+Math.random()*5,color:palette[cf%palette.length],kind:'confetti',rot:Math.random()*6.28,spin:(Math.random()-0.5)*0.12});
      }
      AudioSystem.playConfetti();
      this.cameras.main.flash(110,120,255,190,false);
    }
    var ev=this.time.addEvent({delay:33,loop:true,callback:function(){
      if(!gfx.active||!self.scene.isActive('GameScene')||self._paused){
        ev.remove();if(gfx.active)gfx.destroy();self._celebrationActive=false;return;
      }
      elapsed+=33;gfx.clear();
      for(var i=particles.length-1;i>=0;i--){
        var p=particles[i];p.px=p.x;p.py=p.y;p.life-=33;
        if(p.life<=0||p.x<-40||p.x>W+40||p.y>H+70){particles.splice(i,1);continue;}
        if(p.kind==='wave'){
          p.x+=p.vx*0.033;
          p.y=p.baseY+Math.sin(elapsed*0.004+p.phase)*34;
          var wa=Math.min(1,p.life/280)*0.82;
          gfx.fillStyle(p.color,wa);gfx.fillCircle(p.x,p.y,p.size);
          gfx.fillStyle(0xFFFFFF,wa*0.55);gfx.fillCircle(p.x,p.y,1.4);
          continue;
        }
        p.x+=p.vx*0.033;p.y+=p.vy*0.033;
        if(p.kind==='spark'){p.vx*=0.985;p.vy=p.vy*0.985+115*0.033;}
        else if(p.kind==='heart'){p.vx+=Math.sin(elapsed*0.003+p.x*0.02)*5*0.033;p.rot+=0.006;}
        else if(p.kind==='star'){p.rot=(p.rot||0)+0.035;p.x+=Math.sin(elapsed*0.002+p.y)*0.25;}
        else if(p.kind==='confetti'){p.vx+=Math.sin(elapsed*0.004+p.y*0.02)*14*0.033;p.rot+=p.spin;}
        var alpha=Math.min(1,p.life/260)*Math.min(1,p.life/p.max*2);
        if(p.kind==='heart'){
          var hr=p.size,hy=p.y;
          gfx.fillStyle(p.color,alpha);
          gfx.fillCircle(p.x-hr*0.34,hy-hr*0.18,hr*0.38);
          gfx.fillCircle(p.x+hr*0.34,hy-hr*0.18,hr*0.38);
          gfx.fillTriangle(p.x-hr*0.68,hy-hr*0.08,p.x+hr*0.68,hy-hr*0.08,p.x,hy+hr*0.82);
        }else if(p.kind==='star'){
          gfx.lineStyle(2,p.color,alpha);gfx.lineBetween(p.x-p.size*1.8,p.y,p.x+p.size*1.8,p.y);
          gfx.lineBetween(p.x,p.y-p.size*1.8,p.x,p.y+p.size*1.8);
          gfx.fillStyle(0xFFFFFF,alpha);gfx.fillCircle(p.x,p.y,p.size*0.55);
        }else if(p.kind==='confetti'){
          var ca=Math.cos(p.rot),sa=Math.sin(p.rot),hx=p.size,hy=p.size*0.45;
          gfx.fillStyle(p.color,alpha);
          gfx.fillPoints([
            {x:p.x-ca*hx+sa*hy,y:p.y-sa*hx-ca*hy},
            {x:p.x+ca*hx+sa*hy,y:p.y+sa*hx-ca*hy},
            {x:p.x+ca*hx-sa*hy,y:p.y+sa*hx+ca*hy},
            {x:p.x-ca*hx-sa*hy,y:p.y-sa*hx+ca*hy}
          ],true);
        }else{
          gfx.lineStyle(1.7,p.color,alpha*0.8);gfx.lineBetween(p.px,p.py,p.x,p.y);
          gfx.fillStyle(p.color,alpha);gfx.fillCircle(p.x,p.y,p.size*alpha);
        }
      }
      for(var ri=rings.length-1;ri>=0;ri--){
        var ring=rings[ri];ring.life-=33;ring.r+=5;
        if(ring.life<=0){rings.splice(ri,1);continue;}
        gfx.lineStyle(2.5,ring.color,ring.life/ring.max*0.65);gfx.strokeCircle(ring.x,ring.y,ring.r);
      }
      if(elapsed>2500&&particles.length===0&&rings.length===0){
        ev.remove();if(gfx.active)gfx.destroy();self._celebrationActive=false;
      }
      if(elapsed>4200){ev.remove();if(gfx.active)gfx.destroy();self._celebrationActive=false;}
    }});
  },
  _fireworks:function(){this._playCelebration(0);},
  _celebrateFaces:function(){
    // Один общий лёгкий импульс вместо смены текстур и множества тяжёлых tween.
    var self=this,count=0;
    this._shapes.forEach(function(sp){
      if(!sp||!sp.active||!sp.alive||count>=12)return;
      count++;
      self.tweens.add({targets:sp,scaleX:1.10,scaleY:1.10,duration:150,ease:'Sine.easeOut',yoyo:true});
    });
    AudioSystem.playAwe();
  },
  _showPraise:function(){
    if(!this.scene.isActive('GameScene'))return;
    var phrases=t('praise');
    if(!Array.isArray(phrases)||!phrases.length)return;
    var msg=phrases[Phaser.Math.Between(0,phrases.length-1)];
    var x=GAME_WIDTH/2,y=GAME_HEIGHT*0.30;
    var tx=this.add.text(x,y,msg,{fontSize:'30px',fontStyle:'bold',color:'#FFD700',stroke:'#7A2D9B',strokeThickness:7,fontFamily:'Arial Black,Arial,sans-serif',align:'center',wordWrap:{width:GAME_WIDTH-36},shadow:{offsetX:0,offsetY:3,color:'#FF55CC',blur:14,fill:true}}).setOrigin(0.5).setDepth(360).setScale(0.65).setAlpha(0);
    this.tweens.add({targets:tx,scale:1.08,alpha:1,y:y-16,duration:260,ease:'Back.easeOut',onComplete:function(){
      if(!tx||!tx.active)return;
      this.tweens.add({targets:tx,scale:1,alpha:0,y:y-54,delay:850,duration:450,ease:'Sine.easeIn',onComplete:function(){if(tx&&tx.active)tx.destroy();}});
    },callbackScope:this});
  },
  _floatTxt:function(x,y,msg,col){
    if(!this.scene.isActive('GameScene'))return;
    var tx=this.add.text(x,y,msg,{fontSize:'24px',fontStyle:'bold',color:hexColor(col),stroke:'#ffffff',strokeThickness:4,fontFamily:'Arial Black,Arial,sans-serif'}).setOrigin(0.5).setDepth(300);
    this.tweens.add({targets:tx,y:y-70,alpha:0,duration:850,ease:'Power2',onComplete:function(){if(tx&&tx.active)tx.destroy();}});
  },
  _showOffer:function(){
    if(this._offerActive||this._goTriggered)return;
    if(window._secondChanceUsed){this._triggerGO();return;}
    this._offerActive=true;
    var self=this,W=GAME_WIDTH,H=GAME_HEIGHT,cx=W/2,items=[];
    var ov=this.add.graphics().setDepth(500);ov.fillStyle(0x000000,0.78);ov.fillRect(0,0,W,H);items.push(ov);
    var hasSDK=!!window.ysdk,mW=350,mH=hasSDK?228:282,mx=cx-mW/2,my=H/2-mH/2;
    var pn=this.add.graphics().setDepth(500);pn.fillStyle(0x1A0A3E,1);pn.fillRoundedRect(mx,my,mW,mH,20);pn.lineStyle(3,0xFF8800,0.9);pn.strokeRoundedRect(mx,my,mW,mH,20);items.push(pn);
    items.push(this.add.text(cx,my+40,t('boardFull'),{fontSize:'28px',fontStyle:'bold',color:'#FF8800',fontFamily:'Arial Black,Arial,sans-serif',stroke:'#441100',strokeThickness:2}).setOrigin(0.5).setDepth(501));
    items.push(this.add.text(cx,my+80,t('clearUpperHalf'),{fontSize:'17px',color:'#AACCFF',align:'center',wordWrap:{width:310},fontFamily:'Arial,sans-serif'}).setOrigin(0.5).setDepth(501));
    var adItems=mkBtn(this,cx,my+148,t('secondChanceWatch'),268,54,0xFF8800,0xCC5500,function(){AudioSystem.click();self._hideOffer();var gotReward=false;Ads.rewarded(function(){gotReward=true;window._secondChanceUsed=true;self._clearUpperHalf();},function(){if(!gotReward)self._triggerGO();});});
    adItems.forEach(function(x){x.setDepth(502);});items=items.concat(adItems);
    if(!hasSDK){var freeItems=mkBtn(this,cx,my+214,t('freeClear'),210,46,0x00AA55,0x007733,function(){AudioSystem.click();self._hideOffer();window._secondChanceUsed=true;self._clearUpperHalf();});freeItems.forEach(function(x){x.setDepth(502);});items=items.concat(freeItems);}
    var decItems=mkBtn(this,cx,my+mH-30,t('decline'),190,42,0x881133,0x551122,function(){AudioSystem.click();self._hideOffer();self._triggerGO();});
    decItems.forEach(function(x){x.setDepth(502);});items=items.concat(decItems);
    this._offerItems=items;
  },
  _hideOffer:function(){if(!this._offerActive)return;this._offerActive=false;var items=this._offerItems;this._offerItems=[];for(var i=0;i<items.length;i++){if(items[i]&&items[i].active)items[i].destroy();}},
  _clearUpperHalf:function(){
    if(!this.scene.isActive('GameScene'))return;AudioSystem.ding();
    var rem=[],upperRows=Math.ceil(this._rows/2),self=this;
    for(var r=0;r<upperRows;r++)for(var c=0;c<this._cols;c++){
      var sp=this._grid[r][c];
      if(sp&&typeof sp==='object')rem.push({r:r,c:c,sp:sp});
    }
    rem.forEach(function(it){
      self._grid[it.r][it.c]=null;
      self._shapes=self._shapes.filter(function(s){return s!==it.sp;});
      self.tweens.add({targets:it.sp,alpha:0,scaleX:0,scaleY:0,angle:Phaser.Math.Between(-35,35),duration:360,ease:'Back.easeIn',onComplete:function(){if(it.sp&&it.sp.active)it.sp.destroy();}});
    });
    this._updateMusic();
  },
  _triggerGO:function(){
    if(this._goTriggered||!this.scene.isActive('GameScene'))return;
    this._goTriggered=true;if(this.time)this.time.timeScale=1;
    window._lastRunSnapshot={score:this._score,mergeN:this._mergeN,maxCombo:this._maxCombo,phase:this._phase,elapsed:Math.max(0,(this.time.now-this._t0)/1000),cells:[]};
    for(var sr=0;sr<this._rows;sr++)for(var sc=0;sc<this._cols;sc++){var cell=this._grid[sr][sc];if(cell&&typeof cell==='object')window._lastRunSnapshot.cells.push({r:sr,c:sc,level:cell.level,face:cell.faceVariant||0});}
    MusicSystem.stop();
    _ysStop();
    AudioSystem.over();
    var isNew=Storage.updateBest(this._score);
    _submitLeaderboardScore(Storage.data.bestScore);
    Storage.save();
    updateRightPanel(Storage.data.totalMerges);
    window.deathCount++;
    this.cameras.main.shake(320,0.03);
    var self=this;
    this.time.delayedCall(600,function(){if(!self.scene.isActive('GameScene'))return;self.scene.stop('UIScene');self.scene.start('GameOverScene',{score:self._score,best:Storage.data.bestScore,isNew:isNew,merges:self._mergeN,maxCombo:self._maxCombo,forms:Storage.data.formsOpened.length});});
  },
  _tut:function(){
    var self=this,W=GAME_WIDTH,H=GAME_HEIGHT;
    this._tutorialActive=true;
    var ov=this.add.graphics().setDepth(600);ov.fillStyle(0x000000,0.82);ov.fillRect(0,0,W,H);
    var t1=this.add.text(W/2,H/2-30,t('tutorial'),{fontSize:'23px',color:'#ffffff',align:'center',wordWrap:{width:320},fontFamily:'Arial,sans-serif',stroke:'#ffffff',strokeThickness:3}).setOrigin(0.5).setDepth(601);
    var arrow=this.add.text(W/2,H/2+55,'\ud83d\udc46 '+t('hint'),{fontSize:'26px',color:'#FF4466',fontFamily:'Arial,sans-serif',stroke:'#ffffff',strokeThickness:2}).setOrigin(0.5).setDepth(601);
    this.tweens.add({targets:arrow,y:H/2+65,duration:560,ease:'Sine.easeInOut',yoyo:true,repeat:-1});
    var btn=this.add.text(W/2,H/2+120,t('tapStart'),{fontSize:'26px',fontStyle:'bold',color:'#FFD700',stroke:'#ffffff',strokeThickness:3,fontFamily:'Arial Black,Arial,sans-serif'}).setOrigin(0.5).setDepth(601).setInteractive({useHandCursor:true});
    this.tweens.add({targets:btn,alpha:0.5,duration:490,ease:'Sine.easeInOut',yoyo:true,repeat:-1});
    btn.once('pointerdown',function(){AudioSystem.click();self._tutorialActive=false;[ov,t1,arrow,btn].forEach(function(x){if(x&&x.active)x.destroy();});});
  },
  shutdown:function(){
    if(this._score>0)Storage.updateBest(this._score);
    this.input.off('pointerdown',this._pd,this);this.input.off('pointermove',this._pm,this);this.input.off('pointerup',this._pu,this);
    if(this._spawnEv){this._spawnEv.remove();this._spawnEv=null;}if(this._tickEv){this._tickEv.remove();this._tickEv=null;}
    if(this.time)this.time.timeScale=1;MusicSystem.stop();
    this._bgGfx=null;this._gridGfx=null;this._hlGfx=null;this._shapes=[];this._grid=[];this._offerItems=[];
    _ysStop();
  }
});

/* ================================================================ UI SCENE ================================================================ */
var UIScene=new Phaser.Class({Extends:Phaser.Scene,initialize:function UIScene(){Phaser.Scene.call(this,{key:'UIScene'});this._sTx=null;this._bTx=null;this._oCh=null;this._pov=null;this._pItems=null;},
  create:function(){
    var self=this,W=GAME_WIDTH,barH=Math.floor(GAME_HEIGHT*0.165);
    var bar=this.add.graphics();
    bar.fillGradientStyle(0x0D0820,0x0D0820,0x0D0A2E,0x0D0A2E,1);bar.fillRect(0,0,W,barH);
    bar.lineStyle(2,0xFF3399,0.3);bar.lineBetween(0,barH,W,barH);
    this.add.text(W/2,20,t('score'),{fontSize:'14px',color:'#DDCCFF',fontFamily:'Arial,sans-serif',letterSpacing:2}).setOrigin(0.5,0);
    this._sTx=this.add.text(W/2,40,'0',{fontSize:'40px',fontStyle:'bold',color:'#ffffff',fontFamily:'Arial Black,Arial,sans-serif',stroke:'#330033',strokeThickness:3}).setOrigin(0.5,0);
    this._bTx=this.add.text(W-14,16,t('best')+'\n'+Storage.data.bestScore,{fontSize:'14px',color:'#FFD700',align:'right',fontFamily:'Arial,sans-serif'}).setOrigin(1,0);
    var pbtn=this.add.text(18,barH-24,'⏸',{fontSize:'26px'}).setOrigin(0,0.5).setInteractive({useHandCursor:true});
    pbtn.on('pointerdown',function(){AudioSystem.click();var gs=self.scene.get('GameScene');if(!gs)return;gs.registry.set('isPaused',!gs.registry.get('isPaused'));});
    var mbtn=this.add.text(58,barH-24,MusicSystem._on?'🎵':'🎵',{fontSize:'24px',alpha:MusicSystem._on?1:0.35}).setOrigin(0,0.5).setInteractive({useHandCursor:true});
    mbtn.on('pointerdown',function(){AudioSystem.click();var on=MusicSystem.toggle();mbtn.setAlpha(on?1:0.35);});
    this._oCh=function(reg,key,val){
      if(key==='score'&&self._sTx&&self._sTx.active){self._sTx.setText(val);self.tweens.add({targets:self._sTx,scaleX:1.18,scaleY:1.18,duration:70,yoyo:true});}
      if(key==='isPaused'){
        var gs=self.scene.get('GameScene');
        if(val){MusicSystem.pause();self._showPause();if(gs&&gs.scene.isActive()&&!gs.scene.isPaused())self.scene.pause('GameScene');}
        else{if(gs&&gs.scene.isPaused())self.scene.resume('GameScene');MusicSystem.resume();self._hidePause();}
      }
    };
    this.registry.events.on('changedata',this._oCh);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.shutdown,this);
  },
  _showPause:function(){
    if(this._pov)return;var self=this,W=GAME_WIDTH,H=GAME_HEIGHT;
    this._pItems=[];this._pov=this.add.graphics();
    this._pov.fillStyle(0x000000,0.72);this._pov.fillRect(0,0,W,H);this._pItems.push(this._pov);
    var pt=this.add.graphics();pt.fillStyle(0x0D0820,0.96);pt.fillRoundedRect(W/2-170,H/2-100,340,210,24);pt.lineStyle(3,0xFF3399,0.7);pt.strokeRoundedRect(W/2-170,H/2-100,340,210,24);this._pItems.push(pt);
    this._pItems.push(this.add.text(W/2,H/2-60,t('pause'),{fontSize:'44px',fontStyle:'bold',color:'#ffffff',fontFamily:'Arial Black,Arial,sans-serif',stroke:'#330033',strokeThickness:3}).setOrigin(0.5));
    this._pItems=this._pItems.concat(mkBtn(this,W/2,H/2+14,t('resume'),220,54,0x00AA55,0x007733,function(){AudioSystem.click();self.registry.set('isPaused',false);}));
    this._pItems=this._pItems.concat(mkBtn(this,W/2,H/2+84,t('menu'),186,46,0x5533BB,0x3322AA,function(){AudioSystem.click();MusicSystem.stop();self.scene.stop('UIScene');self.scene.stop('GameScene');self.scene.start('MenuScene');}));
  },
  _hidePause:function(){if(!this._pov)return;if(this._pItems)this._pItems.forEach(function(x){if(x&&x.active)x.destroy();});this._pItems=null;this._pov=null;},
  shutdown:function(){if(this.registry&&this.registry.events&&this._oCh)this.registry.events.off('changedata',this._oCh);this._oCh=null;this._sTx=null;this._bTx=null;this._pov=null;this._pItems=null;}
});

/* ================================================================ GAME OVER SCENE ================================================================ */
var GameOverScene=new Phaser.Class({Extends:Phaser.Scene,initialize:function GameOverScene(){Phaser.Scene.call(this,{key:'GameOverScene'});},
  init:function(d){this._score=d.score||0;this._best=d.best||0;this._isNew=d.isNew||false;this._merges=d.merges||0;this._maxCombo=d.maxCombo||0;this._forms=d.forms||0;},
  create:function(){
    var self=this,W=GAME_WIDTH,H=GAME_HEIGHT,cx=W/2;
    refreshLeftPanel();updateRightPanel(Storage.data.totalMerges);
    Banner.show();
    var bg=this.add.graphics();bg.fillGradientStyle(0x0D0A2E,0x0D0A2E,0x1A0A3E,0x1A0A3E,1);bg.fillRect(0,0,W,H);
    var sc=[0xffffff,0xffccee,0xccddff,0xffeeaa,0xccffee];
    for(var s=0;s<55;s++){bg.fillStyle(sc[s%5],Math.random()*0.45+0.15);bg.fillCircle(Math.random()*W,Math.random()*H,Math.random()*1.6+0.4);}
    for(let fi=0;fi<8;fi++){
      var flvl=Phaser.Math.Between(1,Math.min(Storage.maxUnlocked(),MAX_LEVEL));
      var fkey=buildShapeTexture(this,flvl,randomFace());
      var fsp=this.add.sprite(Math.random()*W,H*0.25+Math.random()*H*0.55,fkey).setAlpha(0.12).setScale(0.8+Math.random()*0.7).setDepth(-1);
      this.tweens.add({targets:fsp,y:fsp.y-85-Math.random()*65,alpha:0,duration:3000+Math.random()*2000,delay:Math.random()*800,ease:'Sine.easeIn',onComplete:function(){if(fsp&&fsp.active)fsp.destroy();}});
    }

    var pW=376,pH=Math.min(600,H-32),pY=(H-pH)/2;
    var pn=this.add.graphics();pn.fillStyle(0x0D0820,0.97);pn.fillRoundedRect(cx-pW/2,pY,pW,pH,22);pn.lineStyle(3,0xFF3399,0.8);pn.strokeRoundedRect(cx-pW/2,pY,pW,pH,22);
    pn.setAlpha(0);this.tweens.add({targets:pn,alpha:1,duration:320});

    var titleTx=this.add.text(cx,pY+34,t('gameOver'),{fontSize:'32px',fontStyle:'bold',color:'#FF4466',stroke:'#ffffff',strokeThickness:3,fontFamily:'Arial Black,Arial,sans-serif',align:'center',wordWrap:{width:330}}).setOrigin(0.5);
    titleTx.setAlpha(0);this.tweens.add({targets:titleTx,alpha:1,duration:280,delay:80});

    var sy=pY+(this._isNew?164:144);
    if(this._isNew){
      var nrt=this.add.text(cx,pY+78,t('newRecordShort'),{fontSize:'21px',fontStyle:'bold',color:'#FFD700',fontFamily:'Arial Black,Arial,sans-serif',stroke:'#442200',strokeThickness:2,align:'center',wordWrap:{width:330}}).setOrigin(0.5);
      this.tweens.add({targets:nrt,scaleX:1.06,scaleY:1.06,duration:520,ease:'Sine.easeInOut',yoyo:true,repeat:-1});
    }
    this.add.text(cx,sy-30,t('yourScore'),{fontSize:'14px',color:'#DDCCFF',fontFamily:'Arial,sans-serif'}).setOrigin(0.5);
    var scoreTx=this.add.text(cx,sy,String(this._score),{fontSize:'58px',fontStyle:'bold',color:'#ffffff',stroke:'#FF4466',strokeThickness:3,fontFamily:'Arial Black,Arial,sans-serif'}).setOrigin(0.5);
    scoreTx.setScale(0.5);scoreTx.setAlpha(0);this.tweens.add({targets:scoreTx,scaleX:1,scaleY:1,alpha:1,duration:380,ease:'Back.easeOut',delay:160});

    var statsY=sy+72;
    var stats=[[t('best'),this._best],[t('totalMerges'),this._merges],[t('maxCombo'),this._maxCombo],[t('formsOpened'),this._forms+'/'+MAX_LEVEL]];
    var statsG=this.add.graphics();
    stats.forEach(function(it,idx){
      var ry=statsY+idx*29;
      if(idx%2===0){statsG.fillStyle(0xffffff,0.045);statsG.fillRoundedRect(cx-166,ry-12,332,26,6);}
      self.add.text(cx-153,ry,it[0],{fontSize:'14px',color:'#BBAACC',fontFamily:'Arial,sans-serif',wordWrap:{width:210}}).setOrigin(0,0.5);
      self.add.text(cx+153,ry,String(it[1]),{fontSize:'15px',fontStyle:'bold',color:'#ffffff',fontFamily:'Arial Black,Arial,sans-serif'}).setOrigin(1,0.5);
    });

    var buttonBase=pY+pH-126;
    if(!window._secondChanceUsed){
      this.add.text(cx,buttonBase-91,t('secondChanceInfo'),{fontSize:'13px',color:'#E8DDF5',fontFamily:'Arial,sans-serif',align:'center',wordWrap:{width:340}}).setOrigin(0.5);
      mkBtn(this,cx,buttonBase-52,t('secondChanceButton'),310,42,0xFF8800,0xCC5500,function(){
        AudioSystem.click();
        Ads.rewarded(function(){window._secondChanceUsed=true;window._rewardedClearUpper=true;self.scene.start('GameScene',{resumeState:window._lastRunSnapshot});},function(){});
      });
    }
    mkBtn(this,cx,buttonBase,t('again'),270,48,0xFF3399,0xCC1177,function(){
      AudioSystem.click();
      if(window.deathCount>=INTER_THRESHOLD){window.deathCount=0;Ads.inter(function(){self.scene.start('GameScene');});}
      else self.scene.start('GameScene');
    });
    mkBtn(this,cx,buttonBase+54,t('menu'),230,44,0x5533BB,0x3322AA,function(){
      AudioSystem.click();
      if(window.deathCount>=INTER_THRESHOLD){window.deathCount=0;Ads.inter(function(){self.scene.start('MenuScene');});}
      else self.scene.start('MenuScene');
    });
    var lbtn=this.add.text(W-16,16,t('langBtn'),{fontSize:'18px',fontStyle:'bold',color:'#AAFFCC',stroke:'#003322',strokeThickness:2,fontFamily:'Arial Black,Arial,sans-serif'}).setOrigin(1,0).setInteractive({useHandCursor:true});
    lbtn.on('pointerdown',function(){AudioSystem.click();switchLang();self.scene.restart();});
  }
});
/* ================================================================ PHASER ================================================================ */
window.game=new Phaser.Game({
  type:Phaser.AUTO,parent:'game-container',backgroundColor:'#0D0A2E',
  render:{antialias:false,roundPixels:true,powerPreference:'low-power'},
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:GAME_WIDTH,height:GAME_HEIGHT},
  physics:{default:'arcade',arcade:{gravity:{y:0},debug:DEBUG}},
  scene:[BootScene,MenuScene,GameScene,UIScene,GameOverScene]
});

window.game.events.on('ready',function(){});
