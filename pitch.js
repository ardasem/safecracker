/* Pitch navigation; the embedded workshop runs the original game and UI. */
(() => {
  'use strict';
  const player=document.getElementById('player');
  const frame=document.getElementById('workshop-frame');
  const menu=document.querySelector('.shell');
  const play=document.getElementById('play');
  let loaded=false;
  function openWorkshop(){
    menu.hidden=true;player.hidden=false;document.body.classList.add('in-workshop');
    if(!loaded){frame.srcdoc=JSON.parse(document.getElementById('workshop-document').textContent);loaded=true;}
    frame.focus();
  }
  function showPitch(){
    if(loaded)frame.contentWindow.postMessage('safecracker:pause','*');
    player.hidden=true;menu.hidden=false;document.body.classList.remove('in-workshop');
    play.focus({preventScroll:true});
  }
  play.addEventListener('click',openWorkshop);
  document.getElementById('return-pitch').addEventListener('click',showPitch);
  window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.data==='safecracker:pitch')showPitch();});
  function draw(){
    if(!menu.hidden)window.SafecrackerArt.draw({angle:0,stage:0,loot:'watch',owned:false,sweet:false});
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
