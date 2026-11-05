import { darkenCol } from '../graphics/Shapes.js';

export function mkBtn(scene,x,y,label,w,h,col,colH,cb){
  var items=[],rad=Math.floor(h*0.42);
  var dk=darkenCol(col,0.42);
  var g=scene.add.graphics();
  function _draw(c,lit){
    g.clear();
    g.fillStyle(darkenCol(c,0.35),1);g.fillRoundedRect(x-w/2+2,y-h/2+5,w,h-2,rad);
    g.fillStyle(c,1);g.fillRoundedRect(x-w/2,y-h/2,w,h-3,rad);
    g.lineStyle(3,0xFFFFFF,lit?0.5:0.3);g.strokeRoundedRect(x-w/2,y-h/2,w,h-3,rad);
  }
  _draw(col,false);
  items.push(g);
  var tx=scene.add.text(x,y-1,label,{fontSize:h>=54?'22px':'17px',fontStyle:'bold',color:'#ffffff',fontFamily:'Arial Rounded MT Bold,Arial Black,Arial,sans-serif',stroke:'#000000',strokeThickness:h>=54?3:2}).setOrigin(0.5);
  // Подгоняем надпись под реальные размеры кнопки. Одинаково работает для RU и EN.
  var fitScale=Math.min(1,(w-22)/Math.max(1,tx.width),(h-10)/Math.max(1,tx.height));
  tx.setScale(fitScale);
  items.push(tx);
  var zn=scene.add.zone(x,y,w,h).setInteractive({useHandCursor:true});items.push(zn);
  zn.on('pointerover',function(){_draw(colH,true);tx.setScale(fitScale*1.035);});
  zn.on('pointerout',function(){_draw(col,false);tx.setScale(fitScale);});
  zn.on('pointerdown',function(){g.clear();g.fillStyle(colH,1);g.fillRoundedRect(x-w/2,y-h/2+3,w,h-3,rad);if(cb)cb();});
  return items;
}
