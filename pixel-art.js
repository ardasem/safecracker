/* Original, deterministic pixel artwork. No external images or runtime dependencies. */
(() => {
  'use strict';
  const GLYPHS = {"A":["01110","10001","10001","11111","10001","10001","10001"],"B":["11110","10001","10001","11110","10001","10001","11110"],"C":["01111","10000","10000","10000","10000","10000","01111"],"D":["11110","10001","10001","10001","10001","10001","11110"],"E":["11111","10000","10000","11110","10000","10000","11111"],"F":["11111","10000","10000","11110","10000","10000","10000"],"G":["01111","10000","10000","10111","10001","10001","01111"],"H":["10001","10001","10001","11111","10001","10001","10001"],"I":["111","010","010","010","010","010","111"],"J":["00111","00010","00010","00010","10010","10010","01100"],"K":["10001","10010","10100","11000","10100","10010","10001"],"L":["10000","10000","10000","10000","10000","10000","11111"],"M":["10001","11011","10101","10101","10001","10001","10001"],"N":["10001","11001","10101","10011","10001","10001","10001"],"O":["01110","10001","10001","10001","10001","10001","01110"],"P":["11110","10001","10001","11110","10000","10000","10000"],"Q":["01110","10001","10001","10001","10101","10010","01101"],"R":["11110","10001","10001","11110","10100","10010","10001"],"S":["01111","10000","10000","01110","00001","00001","11110"],"T":["11111","00100","00100","00100","00100","00100","00100"],"U":["10001","10001","10001","10001","10001","10001","01110"],"V":["10001","10001","10001","10001","10001","01010","00100"],"W":["10001","10001","10001","10101","10101","10101","01010"],"X":["10001","10001","01010","00100","01010","10001","10001"],"Y":["10001","10001","01010","00100","00100","00100","00100"],"Z":["11111","00001","00010","00100","01000","10000","11111"],"0":["01110","10001","10011","10101","11001","10001","01110"],"1":["010","110","010","010","010","010","111"],"2":["01110","10001","00001","00010","00100","01000","11111"],"3":["11110","00001","00001","01110","00001","00001","11110"],"4":["00010","00110","01010","10010","11111","00010","00010"],"5":["11111","10000","10000","11110","00001","00001","11110"],"6":["01110","10000","10000","11110","10001","10001","01110"],"7":["11111","00001","00010","00100","01000","01000","01000"],"8":["01110","10001","10001","01110","10001","10001","01110"],"9":["01110","10001","10001","01111","00001","00001","01110"],".":["0","0","0","0","0","0","1"],",":["00","00","00","00","00","01","10"],":":["0","1","1","0","1","1","0"],"-":["000","000","000","111","000","000","000"],"/":["00001","00001","00010","00100","01000","10000","10000"],"!":["1","1","1","1","1","0","1"],"?":["1110","0001","0001","0010","0100","0000","0100"],"'":["1","1","0","0","0","0","0"],"+":["00000","00100","00100","11111","00100","00100","00000"],"$":["00100","01111","10100","01110","00101","11110","00100"],"&":["01100","10010","10100","01000","10101","10010","01101"],"(":["001","010","100","100","100","010","001"],")":["100","010","001","001","001","010","100"],"%":["11001","11010","00010","00100","01000","01011","10011"],"=":["000","000","111","000","111","000","000"]," ":["000","000","000","000","000","000","000"]};
  const scene = document.querySelector('.scene');
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-scene'; canvas.setAttribute('aria-hidden', 'true');
  scene.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const world = document.createElement('canvas');
  const base = document.createElement('canvas'); base.width = 204; base.height = 205;
  const door = document.createElement('canvas'); door.width = 204; door.height = 205;
  let metrics, dirty = true, previousKey = '', openedAt = null, retractAt = null;
  let seed = 1984;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const rect = (c,x,y,w,h,color) => { c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
  function line(c,x0,y0,x1,y1,color,size=1) {
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;
    for(;;){rect(c,x0,y0,size,size,color);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}
  }
  function box(c,x,y,w,h,fill,light='#586268',dark='#101416',thick=2) {
    rect(c,x,y,w,h,dark);rect(c,x+thick,y+thick,w-thick*2,h-thick*2,fill);
    rect(c,x+thick,y,w-thick*2,thick,light);rect(c,x,y+thick,thick,h-thick*2,light);
    rect(c,x+w-thick,y+thick,thick,h-thick*2,dark);rect(c,x+thick,y+h-thick,w-thick*2,thick,dark);
  }
  function text(c,str,x,y,color,scale=1,center=false) {
    str=String(str).toUpperCase();const width=[...str].reduce((n,ch)=>n+((GLYPHS[ch]?.[0].length||3)+1)*scale,0);
    if(center)x-=width/2;
    for(const ch of str){const glyph=GLYPHS[ch];if(glyph)glyph.forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v==='1')rect(c,x+xx*scale,y+yy*scale,scale,scale,color);}));x+=((glyph?.[0].length||3)+1)*scale;}
  }
  function disc(c,cx,cy,r,palette,ring=false) {
    for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
      const d=Math.sqrt(x*x+y*y);if(d>r||ring&&d<r-3)continue;
      let light=(-x/r*.4-y/r*.7+1)/2;
      if(d>r-1.5)light-=.25;else if(d>r-3.5)light+=.25;
      const index=Math.max(0,Math.min(palette.length-1,Math.floor(light*palette.length+((x+y)%2)*.15)));
      rect(c,cx+x,cy+y,1,1,palette[index]);
    }
  }
  const copper=['#30201c','#49312a','#624435','#80563e','#a4714b','#c68f60','#e6b57c'];
  const iron=['#0b1517','#122025','#1d2c30','#293a3c','#3e4b4a','#5a6256'];
  function bolt(c,x,y,r=3){disc(c,x,y,r,['#202025','#3e4140','#666153','#b0956b']);line(c,x-1,y,x+1,y,'#27282a');}
  function flecks(c,x,y,w,h,count,colors){for(let i=0;i<count;i++){rect(c,x+random()*w,y+random()*h,random()>.85?3:1,random()>.93?2:1,colors[Math.floor(random()*colors.length)]);}}
  function pipe(c,points,size=5){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];line(c,a[0]+2,a[1]+3,b[0]+2,b[1]+3,'#080e11',size+2);line(c,a[0],a[1],b[0],b[1],'#3b4545',size);line(c,a[0],a[1],b[0],b[1],'#657066',1);}for(const [x,y]of points){box(c,x-2,y-2,size+5,size+5,'#303b3c','#737367','#111a1d',1);}}
  function gear(c,x,y,r){for(let i=0;i<12;i++){let a=i*Math.PI/6;rect(c,x+Math.cos(a)*r-2,y+Math.sin(a)*r-2,4,4,'#78563c');}disc(c,x,y,r,copper,true);disc(c,x,y,Math.max(2,Math.floor(r/3)),copper);for(let i=0;i<4;i++){let a=i*Math.PI/2;line(c,x,y,x+Math.cos(a)*r,y+Math.sin(a)*r,'#916342',2);}}
  function drawWorld(){
    seed=1984;const c=world.getContext('2d'),w=world.width,h=world.height;
    rect(c,0,0,w,h,'#0c171b');
    for(let row=0;row<h/22;row++)for(let col=-1;col<w/49;col++){
      let x=col*49+(row%2)*23,y=row*22;rect(c,x,y,47,20,['#142124','#17262a','#1b292b','#172329'][Math.floor(random()*4)]);rect(c,x+2,y+1,43,1,'#2c3735');flecks(c,x+2,y+2,41,16,12,['#1a272a','#293230','#0e1c20']);
    }
    // Conduit, hanging cables, and brackets are deliberately stepped one-pixel lines.
    pipe(c,[[7,48],[w-17,48],[w-17,h-50]],4);pipe(c,[[13,56],[13,h-64],[w-9,h-64]],5);
    for(let k=0;k<3;k++){let py=29;for(let x=0;x<w;x++){const y=29+Math.sin(x/w*Math.PI*3+k*.18)*15+k*3;line(c,x-1,py,x,y,k===1?'#66503c':'#090f12',2);py=y;}}
    for(let x=35;x<w;x+=61){box(c,x,43,7,14,'#344140','#687064','#10191c',1);bolt(c,x+3,49,1);}
    // Workshop shelves, jars, parts bins, yellowing papers and a task light.
    const floor=Math.min(h-28,metrics.y+metrics.h+8);
    for(let side=0;side<2;side++){
      const x=side?w-40:0;
      for(let row=0;row<3;row++){
        const y=77+row*57;
        box(c,x,y+34,39,5,'#694b36','#a07b51','#241d1d',1);
        for(let i=0;i<3;i++){const bx=x+3+i*11;const bh=13+Math.floor(random()*16);box(c,bx,y+33-bh,9,bh,i===1?'#6b503b':'#34413d','#82745a','#111b1d',1);rect(c,bx+2,y+24-bh,5,4,'#302c25');rect(c,bx+2,y+31-bh,5,5,'#a6956d');}
      }
    }
    gear(c,29,62,11);gear(c,w-22,69,8);
    pipe(c,[[w-49,52],[w-49,74],[w-70,87]],3);
    rect(c,w-83,84,23,5,'#302722');rect(c,w-86,89,29,4,'#80684a');rect(c,w-83,93,23,3,'#f4cf8b');
    for(let y=98;y<floor;y++)for(let x=w-103;x<w-22;x++)if((x+y)%4===0&&Math.abs(x-(w-72))<(y-85)*.32)rect(c,x,y,1,1,'#9a744620');
    // Heavy wooden worktop, plank seams, scattered filings, and a steel grate.
    rect(c,0,floor,w,h-floor,'#312520');
    for(let x=0;x<w;x+=31){box(c,x,floor,30,h-floor,'#6e4533','#a76d45','#2e2422',1);flecks(c,x+2,floor+3,25,h-floor-3,18,['#86563a','#b17a4d','#51392b']);}
    box(c,w*.28,floor+7,w*.44,17,'#22292a','#8a7b5d','#151a1c',2);
    for(let x=w*.28+6;x<w*.72-5;x+=5)rect(c,x,floor+11,2,9,'#070f12');
    box(c,0,floor-17,35,32,'#383c33','#73765e','#111a1a',2);box(c,2,floor-25,29,10,'#3e4237','#9c9272','#161d1b',1);rect(c,8,floor-24,3,8,'#b3a177');
    for(let i=0;i<5;i++){const x=w-31+i%2*3,y=floor-6-i*4;box(c,x,y,32,5,'#766245','#ba9c6b','#332c23',1);}
    rect(c,w-25,floor-39,18,16,'#85513a');rect(c,w-25,floor-40,18,3,'#c18553');line(c,w-22,floor-38,w-27,floor-52,'#7a8071',2);line(c,w-15,floor-38,w-11,floor-55,'#a18f69',2);
    for(let i=0;i<8;i++){let x=40+random()*(w-80),y=floor+random()*23;rect(c,x,y,3+random()*5,2,'#c2a274');}
    disc(c,w-49,floor+18,5,copper);disc(c,45,floor+10,4,copper);
  }
  function buildDoor(){
    seed=6084;const c=base.getContext('2d');c.clearRect(0,0,204,205);
    // Worn, warm metal face, with a thick black gasket and stepped bevels.
    box(c,6,6,192,193,'#382c27','#e0ad75','#131c1d',4);
    box(c,10,10,184,185,'#75503a','#b88458','#422e27',3);
    box(c,14,14,176,177,'#875c41','#d7a16a','#3c2d28',2);
    for(let y=16;y<189;y++){const bands=['#a5734e','#966646','#895d42','#7a523c','#704936','#674331'];rect(c,16,y,172,1,bands[Math.min(5,Math.floor((y-16)/31))]);}
    rect(c,17,17,3,169,'#c68d5c');rect(c,21,19,1,163,'#aa7954');rect(c,183,19,4,169,'#563a2e');
    flecks(c,20,19,161,165,950,['#8e6041','#644735','#4d362d','#bc8959','#ad7951']);
    for(let i=0;i<24;i++){const x=24+random()*153,y=20+random()*163;line(c,x,y,x+2+random()*6,y+1,'#3c3029');line(c,x,y-1,x+random()*5,y-1,'#b38356');}
    box(c,65,23,75,19,'#312b25','#c59964','#261e1b',2);text(c,'HAWTHORNE',102,27,'#e4bd7d',1,true);text(c,'H-03',102,36,'#8d7b56',.5,true);
    for(const [x,y]of[[25,26],[178,26],[25,181],[178,181]])bolt(c,x,y,4);
    // Concentric machined rings, drawn with a restricted palette, no antialiasing.
    disc(c,102,120,74,['#152023','#1e2222','#2e2724','#47352b']);
    disc(c,102,116,73,copper);disc(c,102,116,68,['#2e2522','#3b2b25','#6a4935','#ad7c50','#d9a76e']);
    disc(c,102,116,64,['#172124','#272421','#382a24','#5a3e2e']);
    disc(c,102,116,61,['#3c2d26','#5c4030','#8f6441','#bc8a5a','#e9bb7f']);
    disc(c,102,116,57,['#302623','#3c2c25','#513a2c','#795237']);
    disc(c,102,116,44,['#251e1d','#3a2a24','#59402f','#aa7a4c']);
    disc(c,102,116,41,['#131b1d','#1c2221','#322b24','#51402d']);
    disc(c,102,116,36,copper,true);
    for(let i=0;i<10;i++){const a=i*Math.PI/5;const x=102+Math.cos(a)*69,y=116+Math.sin(a)*69;bolt(c,x,y,2);}
    for(let i=0;i<4;i++){const a=i*Math.PI/2+.25,x=102+Math.cos(a)*75,y=116+Math.sin(a)*75;box(c,x-3,y-4,7,9,'#6d513b','#d7a772','#342b28',1);}
    box(c,87,194,31,4,'#302c27','#95784f','#211c1b',1);
  }
  function drawDoor(angle,stage,bolts){
    const c=door.getContext('2d');c.clearRect(0,0,204,205);c.drawImage(base,0,0);
    const radians=angle*Math.PI/50;
    for(let n=0;n<100;n++){
      const a=-Math.PI/2-n*Math.PI/50+radians,major=n%10===0,r=57;
      line(c,102+Math.cos(a)*r,116+Math.sin(a)*r,102+Math.cos(a)*(r-(major?5:2)),116+Math.sin(a)*(r-(major?5:2)),major?'#f5cf8f':'#bc9565');
      if(major)text(c,String(n).padStart(2,'0'),102+Math.cos(a)*48,113+Math.sin(a)*48,'#e8c48a',.65,true);
    }
    // Rotating five-spoke handle and riveted center.
    for(let i=0;i<5;i++){
      const a=radians+i*Math.PI*2/5;
      const x=102+Math.cos(a)*32,y=116+Math.sin(a)*32;
      line(c,103,119,x+1,y+3,'#0b1518',5);line(c,102,116,x,y,'#b08356',4);line(c,101,114,x-1,y-2,'#e5b87e',1);bolt(c,x,y,3);
    }
    disc(c,102,116,15,copper);disc(c,102,116,11,['#503529','#7f5237','#b47e50','#e0ad6f']);disc(c,102,116,7,copper);
    // Fixed index and tumbler lights live on the casing, not on the spinning wheel.
    for(let i=0;i<4;i++)rect(c,100-i,49-i,4+i*2,1,'#ffe0a0');
    for(let i=0;i<3;i++){box(c,88+i*10,15,7,4,i<stage?'#b9c481':'#3a2c26','#392d28','#332723',1);}
    for(const y of [45,106,167])box(c,197-bolts*8,y,8,11,'#8f8c6c','#dad0a2','#403e35',1);
  }
  function drawLoot(c,kind,x,y){
    if(kind==='watch'){box(c,x-5,y-22,10,40,'#a7783c','#f1c475','#4e3b27',1);disc(c,x,y,14,copper);disc(c,x,y,10,['#ceb882','#e8d6a1']);line(c,x,y,x,y-7,'#423b2c');line(c,x,y,x+5,y+3,'#423b2c');}
    else if(kind==='coin'){disc(c,x,y,18,copper);disc(c,x,y,14,copper,true);text(c,'$',x,y-5,'#f5d38d',1.5,true);}
    else if(kind==='key'){disc(c,x-15,y-4,10,copper,true);line(c,x-6,y,x+24,y+12,'#e1af65',4);line(c,x+15,y+9,x+12,y+16,'#bd8c47',4);line(c,x+23,y+12,x+20,y+19,'#bd8c47',4);box(c,x-3,y-23,23,15,'#cdb07a','#edcf91','#7c603e',1);text(c,'09',x+8,y-19,'#493e2e',1,true);}
    else if(kind==='jewel'){for(let i=0;i<28;i++){const a=i/27*Math.PI;rect(c,x+Math.cos(a)*27,y-20+Math.sin(a)*26,3,3,i%2?'#e3b871':'#a37744');}for(let yy=0;yy<22;yy++){const w=11-Math.abs(yy-10);rect(c,x-w/2,y+3+yy,w,1,yy<10?'#b3c782':'#496c54');}}
    else if(kind==='letters'){for(let i=3;i>=0;i--)box(c,x-30+i,y-17+i*3,57,35,'#b79f70','#e4c794','#665238',1);line(c,x-29,y-16,x,y+4,'#92764e');line(c,x,y+4,x+26,y-16,'#92764e');rect(c,x-3,y-16,7,34,'#9c5039');rect(c,x-29,y-1,56,5,'#9c5039');disc(c,x,y+1,6,['#6b352b','#a8563c','#d58352']);}
    else{for(let i=2;i>=0;i--)box(c,x-30+i*3,y-17+i*7,57,24,'#6a7950','#b7b47c','#344531',1);rect(c,x-4,y-15,10,35,'#d6bd83');text(c,'$',x-18,y-4,'#c6c58e',1,true);}
    for(const [sx,sy]of[[-35,-23],[30,-18],[20,23]]){line(c,x+sx-2,y+sy,x+sx+2,y+sy,'#fff0b8');line(c,x+sx,y+sy-2,x+sx,y+sy+2,'#fff0b8');}
  }
  function resize(){
    const sceneRect=scene.getBoundingClientRect(),safeRect=document.getElementById('safe-wrap').getBoundingClientRect();
    const pixel=window.innerWidth<=760?1.5:2;
    canvas.width=world.width=Math.round(sceneRect.width/pixel);canvas.height=world.height=Math.round(sceneRect.height/pixel);
    const ratio=canvas.width/sceneRect.width;
    metrics={x:Math.round((safeRect.left-sceneRect.left)*ratio),y:Math.round((safeRect.top-sceneRect.top)*ratio),w:safeRect.width*ratio,h:safeRect.height*ratio*410/427};
    ctx.imageSmoothingEnabled=false;drawWorld();dirty=false;previousKey='';
  }
  new ResizeObserver(()=>{dirty=true;}).observe(scene);
  window.addEventListener('resize',()=>{dirty=true;});
  buildDoor();
  const iconCache = new Map();
  window.SafecrackerArt={
  itemIcon(kind) {
    const key = 'item-' + kind;
    if (!iconCache.has(key)) { const image = document.createElement('canvas'); image.width = 90; image.height = 74; drawLoot(image.getContext('2d'), kind, 45, 37); iconCache.set(key, image.toDataURL()); }
    return iconCache.get(key);
  },
  safeIcon(tier) {
    const key = 'safe-' + tier;
    if (!iconCache.has(key)) { const image = document.createElement('canvas'); image.width = 112; image.height = 114; const c = image.getContext('2d'); c.imageSmoothingEnabled = false; box(c,0,0,112,114,'#263438','#687267','#0b141a',3); drawDoor(0,0,0); c.drawImage(door,3,3,106,106); box(c,43,4,26,7,tier === 2 ? '#a45d44' : tier === 1 ? '#82784a' : '#40514a','#b8a271','#1a2225',1); iconCache.set(key,image.toDataURL()); }
    return iconCache.get(key);
  },
  draw(state){
    if(dirty)resize();
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const now=Number.isFinite(state.animationTime)?state.animationTime:performance.now(),isOpen=scene.classList.contains('open'),retract=scene.classList.contains('retracting');
    if(isOpen&&openedAt===null)openedAt=now;if(!isOpen)openedAt=null;
    if(retract&&retractAt===null)retractAt=now;if(!retract)retractAt=null;
    const progress=openedAt===null?0:reducedMotion?1:Math.min(1,(now-openedAt)/1800),open=1-Math.pow(1-progress,3);
    const boltProgress=retractAt===null?0:reducedMotion?1:Math.min(1,(now-retractAt)/500);
    const key=[canvas.width,canvas.height,state.angle.toFixed(2),state.stage,state.loot,state.owned,open.toFixed(3),boltProgress.toFixed(2),state.sweet,document.activeElement?.id].join('|');
    if(key===previousKey&&!scene.classList.contains('failed')&&!scene.classList.contains('unlock-shake'))return;previousKey=key;
    ctx.drawImage(world,0,0);const {x,y,w,h}=metrics,s=w/204;
    let shake=reducedMotion?0:scene.classList.contains('failed')?Math.sin(now/22)*2:scene.classList.contains('unlock-shake')?Math.sin(now/25):0;
    ctx.save();ctx.translate(Math.round(x+shake),Math.round(y));ctx.scale(s,s);ctx.imageSmoothingEnabled=false;
    // Deep teal frame around a warmly lit interior.
    box(ctx,-10,-10,224,226,'#131f23','#515b55','#080e12',4);
    box(ctx,-6,-6,216,218,'#273639','#49554f','#0b161b',3);
    box(ctx,0,0,204,207,'#0b1418','#52605a','#0a1116',3);
    box(ctx,7,7,190,192,'#624130','#a0764f','#0d171b',3);
    box(ctx,16,16,172,174,'#96633d','#d9a76b','#48382b',2);
    for(let i=0;i<8;i++){rect(ctx,20+i*21,21,1,159,'#714b31');rect(ctx,23+i*21,22,1,157,'#ad794b');}
    rect(ctx,23,23,157,4,'#f5ce83');rect(ctx,26,28,151,2,'#d99b58');
    box(ctx,23,155,156,8,'#604a34','#d8ac68','#322a25',2);
    for(let i=0;i<5;i++){box(ctx,29+i*26,166,22,15,'#63533a','#a98b58','#423b2c',1);}
    if(open>.2){text(ctx,state.owned?'YOUR DISCOVERY':'FOUND & RETURNED',102,47,'#f2ce8b',1,true);drawLoot(ctx,state.loot||'cash',102,126);}
    for(const [bx,by]of[[-5,12],[208,12],[-5,193],[208,193]])bolt(ctx,bx,by,3);
    drawDoor(state.angle,state.stage,boltProgress);
    const projection=Math.cos(open*1.94);
    ctx.save();ctx.scale(projection,1);ctx.drawImage(door,0,0);ctx.restore();
    // Hinge barrels remain fixed as the door swings around them.
    for(const hy of[31,90,154]){box(ctx,-7,hy,12,29,'#634a35','#b58e5b','#192021',2);rect(ctx,-3,hy+3,2,22,'#a27d4f');rect(ctx,-8,hy+9,14,3,'#352d26');}
    box(ctx,16,207,29,7,'#31332b','#73735c','#10191b',1);box(ctx,160,207,29,7,'#31332b','#73735c','#10191b',1);
    if(!open&&state.sweet){for(let i=0;i<5;i++)rect(ctx,99-i,47-i,6+i*2,1,'#cbdc97');}
    if(!open&&document.activeElement?.id==='dial'){for(const [a,b]of[[30,55],[169,55],[30,178],[169,178]])rect(ctx,a,b,4,2,'#dbb47a');}
    ctx.restore();
  }};
})();
