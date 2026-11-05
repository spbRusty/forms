export const Storage ={
  data:{bestScore:0,totalMerges:0,formsOpened:[],soundOn:true,musicOn:true,firstRun:true},_player:null,
  initPlayer:function(sdk){try{sdk.getPlayer({scopes:false}).then(function(p){Storage._player=p;p.getData().then(function(d){if(d){['bestScore','totalMerges','formsOpened','soundOn','musicOn','firstRun'].forEach(function(k){if(d[k]!==undefined)Storage.data[k]=d[k];});}}).catch(function(){});}).catch(function(){});}catch(e){}},
  load:function(){try{var r=localStorage.getItem('gm30');if(r)Storage.data=Object.assign(Storage.data,JSON.parse(r));}catch(e){}},
  save:function(){try{localStorage.setItem('gm30',JSON.stringify(Storage.data));}catch(e){}if(Storage._player){try{Storage._player.setData(Storage.data);}catch(e){}}},
  updateBest:function(s){if(s>Storage.data.bestScore){Storage.data.bestScore=s;Storage.save();return true;}return false;},
  addForm:function(lvl){if(Storage.data.formsOpened.indexOf(lvl)===-1){Storage.data.formsOpened.push(lvl);Storage.save();return true;}return false;},
  maxUnlocked:function(){if(!Storage.data.formsOpened.length)return 1;return Math.max.apply(null,Storage.data.formsOpened);}
};
