const DEFAULT_DATA = { bestScore: 0, totalMerges: 0, formsOpened: [], soundOn: true, musicOn: true, firstRun: true };
const KEYS = Object.keys(DEFAULT_DATA);
function normalize(data) {
  const out = Object.assign({}, DEFAULT_DATA);
  if (data && typeof data === 'object') KEYS.forEach(k => { if (data[k] !== undefined) out[k] = data[k]; });
  out.bestScore = Math.max(0, Number(out.bestScore) || 0);
  out.totalMerges = Math.max(0, Number(out.totalMerges) || 0);
  out.formsOpened = Array.from(new Set((Array.isArray(out.formsOpened) ? out.formsOpened : []).map(Number).filter(n => Number.isInteger(n) && n > 0)));
  out.soundOn = out.soundOn !== false; out.musicOn = out.musicOn !== false;
  return out;
}
export const Storage = {
  data: normalize(DEFAULT_DATA), _player: null, _cloudReady: false, _localLoaded: false, _saveChain: Promise.resolve(),
  load() { try { const raw=localStorage.getItem('gm30'); if(raw) { this._localLoaded=true; this.data=normalize(Object.assign({},this.data,JSON.parse(raw))); } } catch(_) {} return this.data; },
  initPlayer(sdk) {
    if(!sdk || typeof sdk.getPlayer!=='function') return Promise.resolve();
    return Promise.resolve().then(()=>sdk.getPlayer({scopes:false})).then(player=>{this._player=player;return player.getData();}).then(cloud=>{
      const local=this.data, remote=cloud||{};
      const merged=normalize(Object.assign({},remote,this._localLoaded?local:{}));
      merged.bestScore=Math.max(Number(remote.bestScore)||0,local.bestScore);
      merged.totalMerges=Math.max(Number(remote.totalMerges)||0,local.totalMerges);
      merged.formsOpened=Array.from(new Set([...(Array.isArray(remote.formsOpened)?remote.formsOpened:[]),...local.formsOpened])).map(Number).filter(n=>Number.isInteger(n)&&n>0);
      if(!this._localLoaded){merged.soundOn=remote.soundOn!==false;merged.musicOn=remote.musicOn!==false;merged.firstRun=remote.firstRun!==false;}
      this.data=merged;this._cloudReady=true;this.save();
    }).catch(()=>{});
  },
  save() {
    const snapshot=normalize(this.data);
    try{localStorage.setItem('gm30',JSON.stringify(snapshot));}catch(_){}
    if(this._player&&this._cloudReady) this._saveChain=this._saveChain.catch(()=>{}).then(()=>this._player.setData(snapshot)).catch(()=>{});
  },
  updateBest(score){const value=Math.max(0,Number(score)||0);if(value>this.data.bestScore){this.data.bestScore=value;this.save();return true;}return false;},
  addForm(level){if(!this.data.formsOpened.includes(level)){this.data.formsOpened.push(level);this.save();return true;}return false;},
  maxUnlocked(){return this.data.formsOpened.length?Math.max(...this.data.formsOpened):1;}
};
