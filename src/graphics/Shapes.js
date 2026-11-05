import { SZ, MAX_LEVEL, NUM_FACES } from '../config/constants.js';
export const SHAPE_TYPES=['circle','triangle','square','diamond','star'];
export const LEVEL_COLORS=[
  0xE58F82, // coral
  0x79B8D0, // sky blue
  0xE8AD70, // apricot
  0xA98BCB, // lavender
  0xD9C65F, // warm yellow
  0x82B99A, // sage green
  0xD97872, // rose red
  0x648FC2, // cornflower blue
  0xB7A18A, // warm taupe
  0x55B8A8  // teal
];
export function shapeTypeForLevel(lvl){return SHAPE_TYPES[(lvl-1)%5];}
export function colorForLevel(lvl){
  var shapeIdx=(lvl-1)%5;
  var cycle=Math.floor((lvl-1)/5);
  return LEVEL_COLORS[(shapeIdx+cycle)%LEVEL_COLORS.length];
}
export function hexColor(c){return'#'+('000000'+c.toString(16)).slice(-6);}
export function darkenCol(col,f){
  var r=((col>>16)&0xFF)*f,g=((col>>8)&0xFF)*f,b=(col&0xFF)*f;
  return(Math.floor(r)<<16)|(Math.floor(g)<<8)|Math.floor(b);
}

export function drawFace(g,half,fv){
  var ex=half,ey=half-5;
  if(fv===0){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,8);g.fillCircle(ex+9,ey,8);
    g.fillStyle(0x111122,1);g.fillCircle(ex-7,ey+1,5);g.fillCircle(ex+11,ey+1,5);
    g.fillStyle(0xffffff,.9);g.fillCircle(ex-5,ey-2,2.5);g.fillCircle(ex+13,ey-2,2.5);
  }else if(fv===1){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,9);g.fillCircle(ex+9,ey,9);
    g.fillStyle(0x111122,1);g.fillCircle(ex-8,ey+1,6);g.fillCircle(ex+10,ey+1,6);
    g.fillStyle(0xffffff,.95);g.fillCircle(ex-5,ey-3,3);g.fillCircle(ex+13,ey-3,3);
  }else if(fv===2){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-10,ey,10);g.fillCircle(ex+10,ey,10);
    g.fillStyle(0x111122,1);g.fillCircle(ex-10,ey,6);g.fillCircle(ex+10,ey,6);
    g.fillStyle(0xffffff,.9);g.fillCircle(ex-7,ey-3,2.5);g.fillCircle(ex+13,ey-3,2.5);
  }else if(fv===3){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey+1,8);g.fillCircle(ex+9,ey+1,8);
    g.fillStyle(0x111122,1);g.fillRect(ex-16,ey-4,13,7);g.fillRect(ex+3,ey-4,13,7);
    g.fillStyle(0xffffff,.85);g.fillCircle(ex-7,ey,3);g.fillCircle(ex+11,ey,3);
  }else if(fv===4){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,8);g.fillCircle(ex+9,ey,8);
    g.fillStyle(0x111122,1);g.fillCircle(ex-7,ey+2,5);g.fillCircle(ex+11,ey+2,5);
    g.fillStyle(0x111122,.8);g.fillRect(ex-16,ey-7,12,3.5);g.fillRect(ex+4,ey-7,12,3.5);
    g.fillStyle(0xffffff,.9);g.fillCircle(ex-4,ey-1,2);g.fillCircle(ex+14,ey-1,2);
  }else if(fv===5){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,9);g.fillCircle(ex+9,ey,9);
    g.fillStyle(0xffdd00,1);_miniStar(g,ex-9,ey,5,3.5);_miniStar(g,ex+9,ey,5,3.5);
    g.fillStyle(0x111122,.6);g.fillCircle(ex-9,ey,2.5);g.fillCircle(ex+9,ey,2.5);
  }else if(fv===6){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,8);g.fillCircle(ex+9,ey,8);
    g.fillStyle(0x111122,1);
    g.fillRect(ex-13,ey-4,3.5,11);g.fillRect(ex-16,ey-1,11,3.5);
    g.fillRect(ex+5,ey-4,3.5,11);g.fillRect(ex+3,ey-1,11,3.5);
  }else if(fv===7){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,9);g.fillCircle(ex+9,ey,9);
    g.fillStyle(0xff4466,1);_miniHeart(g,ex-9,ey+1,6);_miniHeart(g,ex+9,ey+1,6);
  }else if(fv===8){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,9);g.fillCircle(ex+9,ey,9);
    g.fillStyle(0x111122,1);g.fillCircle(ex-9,ey,6);g.fillCircle(ex+9,ey,6);
    g.fillStyle(0xffffff,1);g.fillCircle(ex-6,ey-2,3);g.fillCircle(ex+12,ey-2,3);
    g.fillStyle(0x111122,1);g.fillCircle(ex-6,ey-2,1.5);g.fillCircle(ex+12,ey-2,1.5);
  }else if(fv===9){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,8);g.fillCircle(ex+9,ey,8);
    g.fillStyle(0x111122,1);g.fillCircle(ex-7,ey+2,5);g.fillCircle(ex+11,ey+2,5);
    for(var bi=0;bi<5;bi++){g.fillRect(ex-17+bi,ey-9-bi,3,3);}
    for(var bi2=0;bi2<5;bi2++){g.fillRect(ex+4+bi2,ey-9+(4-bi2),3,3);}
  }else if(fv===10){
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,8);
    g.fillStyle(0x111122,1);g.fillCircle(ex-7,ey+1,5);
    g.fillStyle(0xffffff,.9);g.fillCircle(ex-4,ey-2,2.5);
    g.fillStyle(0x111122,1);g.fillRect(ex+3,ey-2,14,3.5);g.fillRect(ex+3,ey-6,4,5);g.fillRect(ex+13,ey-6,4,5);
  }else{
    g.fillStyle(0xffffff,1);g.fillCircle(ex-9,ey,10);g.fillCircle(ex+9,ey,10);
    g.fillStyle(0x111122,1);g.fillCircle(ex-9,ey,6.5);g.fillCircle(ex+9,ey,6.5);
    g.fillStyle(0x6688ff,.7);g.fillCircle(ex-9,ey+2,4.5);g.fillCircle(ex+9,ey+2,4.5);
    g.fillStyle(0xffffff,1);g.fillCircle(ex-6,ey-2,3);g.fillCircle(ex+12,ey-2,3);
    g.fillStyle(0xff8899,.8);g.fillCircle(ex-14,ey+6,4.5);g.fillCircle(ex+14,ey+6,4.5);
  }
  var my2=half+10;
  if(fv===0||fv===8){
    g.fillStyle(0x111122,1);g.fillRect(ex-7,my2,14,3);
  }else if(fv===1||fv===7||fv===11){
    g.fillStyle(0x111122,1);var sp2=[[-8,0],[-5,3],[-1,5],[3,4],[6,1],[8,-1]];
    for(var si=0;si<sp2.length;si++)g.fillCircle(ex+sp2[si][0],my2+sp2[si][1],2.5);
  }else if(fv===2||fv===6){
    g.fillStyle(0x111122,1);g.fillCircle(ex,my2+3,6.5);g.fillStyle(0xff6688,.7);g.fillCircle(ex,my2+3,4.5);
  }else if(fv===3||fv===10){
    g.fillStyle(0x111122,1);var wp=[[-7,2],[-4,0],[-1,2],[2,0],[5,2]];
    for(var wi=0;wi<wp.length;wi++)g.fillCircle(ex+wp[wi][0],my2+wp[wi][1],2.5);
  }else if(fv===4||fv===5){
    g.fillStyle(0x111122,1);g.fillRect(ex-1,my2,11,3);g.fillRect(ex+9,my2-5,3,6);
  }else if(fv===9){
    g.fillStyle(0x111122,1);var fp=[[-6,4],[-3,2],[0,1],[3,2],[6,4]];
    for(var fi=0;fi<fp.length;fi++)g.fillCircle(ex+fp[fi][0],my2+fp[fi][1],2.5);
  }
}
export function _miniStar(g,cx,cy,pts,outerR){
  var innerR=outerR*0.4,step=Math.PI/pts;
  for(var i=0;i<pts*2;i++){
    var a0=i*step-Math.PI/2,r0=(i%2===0)?outerR:innerR,a1=(i+1)*step-Math.PI/2,r1=((i+1)%2===0)?outerR:innerR;
    g.fillTriangle(cx,cy,cx+Math.cos(a0)*r0,cy+Math.sin(a0)*r0,cx+Math.cos(a1)*r1,cy+Math.sin(a1)*r1);
  }
}
export function _miniHeart(g,cx,cy,r){
  g.fillCircle(cx-r*0.55,cy-r*0.25,r*0.6);g.fillCircle(cx+r*0.55,cy-r*0.25,r*0.6);
  g.fillTriangle(cx-r,cy,cx+r,cy,cx,cy+r*1.3);
}

export function _drawShapeOutline(g,half,type,r){
  if(type==='circle'){g.fillCircle(half,half,r);}
  else if(type==='triangle'){var sc=r/(half-5);g.fillTriangle(half,5-(half-5)*(1-sc),6-(6-half)*(1-sc),SZ-8+(SZ-8-half)*(1-sc),SZ-6+(SZ-6-half)*(1-sc),SZ-8+(SZ-8-half)*(1-sc));}
  else if(type==='square'){var d=half-r;g.fillRoundedRect(d,d,(r*2),(r*2),r*0.35);}
  else if(type==='diamond'){g.fillTriangle(half,half-r,half-r,half,half+r,half);g.fillTriangle(half-r,half,half+r,half,half,half+r);}
  else{var oR=r,iR=r*0.38,sC=half,sP=5,sST=Math.PI/sP;for(var si=0;si<sP*2;si++){var sa0=si*sST-Math.PI/2,sr0=(si%2===0)?oR:iR,sa1=(si+1)*sST-Math.PI/2,sr1=((si+1)%2===0)?oR:iR;g.fillTriangle(sC,sC,sC+Math.cos(sa0)*sr0,sC+Math.sin(sa0)*sr0,sC+Math.cos(sa1)*sr1,sC+Math.sin(sa1)*sr1);}}
}

export function buildShapeTexture(scene,lvl,fv){
  var key='sh_'+lvl+'_'+fv;
  if(scene.textures.exists(key))return key;
  var half=SZ/2,col=colorForLevel(lvl),type=shapeTypeForLevel(lvl);
  var g=scene.make.graphics({x:0,y:0,add:false});
  var dk=darkenCol(col,0.62);
  /* drop shadow */
  g.fillStyle(0x66594D,0.14);
  g.fillCircle(half+2,half+3,half-4);
  /* dark outline layer */
  g.fillStyle(dk,1);
  _drawShapeOutline(g,half,type,half-2);
  /* main color fill */
  g.fillStyle(col,1);
  _drawShapeOutline(g,half,type,half-5);
  /* inner lighter shine top-left */
  g.fillStyle(0xFFFFFF,0.38);
  if(type==='circle'){g.fillCircle(half-7,half-7,(half-5)*0.42);}
  else if(type==='triangle'){g.fillCircle(half,half-4,(half-5)*0.28);}
  else if(type==='square'){g.fillCircle(half-4,half-4,(half-5)*0.35);}
  else if(type==='diamond'){g.fillCircle(half,half-5,(half-5)*0.28);}
  else{g.fillCircle(half,half-5,(half-5)*0.28);}
  drawFace(g,half,fv);
  g.generateTexture(key,SZ,SZ);g.destroy();
  return key;
}
export function randomFace(){return Math.floor(Math.random()*NUM_FACES);}
export function prebuildAll(scene){for(var l=1;l<=MAX_LEVEL;l++)for(var f=0;f<NUM_FACES;f++)buildShapeTexture(scene,l,f);}
