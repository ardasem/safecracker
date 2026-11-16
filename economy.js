/* Local, fictional workshop economy. Pure state transitions; no network or real payments. */
(function (root) {
  'use strict';
  const safes = [
    { tier:0, name:'Tenement lockbox', price:90, opening:35, increment:10, estimate:[40,300], level:'EASY', origin:'Cleared from a railway clerk’s attic.', clue:'A soft paper rustle. Something small rolls inside.', note:'One everyday keepsake. Occasionally a second find.' },
    { tier:1, name:'Estate strongbox', price:280, opening:130, increment:25, estimate:[150,720], level:'MEDIUM', origin:'Part of the late Mrs. Whitmore’s estate.', clue:'Velvet lining, a faded monogram, a delicate metallic chime.', note:'One valuable piece, with a chance of an extra keepsake.' },
    { tier:2, name:'Collector’s vault', price:800, opening:390, increment:60, estimate:[500,2700], level:'EXPERT', origin:'An unclaimed lot from a private antiquities collection.', clue:'A numbered seal and two distinct compartments.', note:'At least two finds. Higher stakes, rarer objects.' }
  ];
  const items = [
    { key:'brass-watch',name:'Railway pocket watch',kind:'watch',tier:0,value:105,rarity:'COMMON',story:'The hands stopped at 6:42. The inscription reads: “Never miss the last train.”' },
    { key:'silver-brooch',name:'Swallow brooch',kind:'jewel',tier:0,value:95,rarity:'UNCOMMON',story:'A tiny silver swallow, made to bring a traveler safely home.' },
    { key:'war-letters',name:'Letters from the coast',kind:'letters',tier:0,value:65,rarity:'COMMON',story:'A complete correspondence between a lighthouse keeper and a city seamstress.' },
    { key:'tram-token',name:'Last-service tram token',kind:'coin',tier:0,value:70,rarity:'COMMON',story:'Issued on the city’s final tram route before the rails were pulled up.' },
    { key:'hotel-key',name:'Room 09 brass key',kind:'key',tier:0,value:80,rarity:'UNCOMMON',story:'The hotel is gone. A small circle of collectors still searches for its keys.' },
    { key:'banknotes',name:'Retired banknote set',kind:'cash',tier:0,value:90,rarity:'COMMON',story:'Six obsolete banknotes with consecutive serial numbers. Collectible, not spendable.' },
    { key:'enamel-watch',name:'Blue enamel fob watch',kind:'watch',tier:1,value:310,rarity:'UNCOMMON',story:'Hand-painted stars cover the lid. The maker’s mark is almost worn away.' },
    { key:'emerald-pendant',name:'Whitmore emerald pendant',kind:'jewel',tier:1,value:390,rarity:'RARE',story:'An estate piece with a deep green stone and a hand-engraved setting.' },
    { key:'signed-manuscript',name:'Signed theatre manuscript',kind:'letters',tier:1,value:245,rarity:'UNCOMMON',story:'A playwright’s rejected ending, complete with handwritten corrections.' },
    { key:'silver-crown',name:'1894 silver crown',kind:'coin',tier:1,value:295,rarity:'RARE',story:'An off-center mint strike makes this worn coin unusually interesting.' },
    { key:'master-key',name:'Grand station master key',kind:'key',tier:1,value:230,rarity:'UNCOMMON',story:'A ceremonial key presented to the station’s first superintendent.' },
    { key:'railway-bond',name:'Numbered railway bond',kind:'cash',tier:1,value:330,rarity:'UNCOMMON',story:'An ornate canceled certificate from a railway that never reached the sea.' },
    { key:'chronometer',name:'Mariner’s chronometer',kind:'watch',tier:2,value:820,rarity:'RARE',story:'A precision timepiece from the navigator’s cabin of the Northern Star.' },
    { key:'sapphire',name:'Art Deco sapphire necklace',kind:'jewel',tier:2,value:1350,rarity:'RELIC',story:'Geometric platinum links frame a stone the color of midnight.' },
    { key:'architect-ledger',name:'The architect’s lost ledger',kind:'letters',tier:2,value:690,rarity:'RARE',story:'Original sketches of the old city hall, including an unbuilt eastern wing.' },
    { key:'gold-proof',name:'Royal mint gold proof',kind:'coin',tier:2,value:1040,rarity:'RELIC',story:'A presentation strike that never entered circulation.' },
    { key:'chamber-key',name:'Enamel chamberlain’s key',kind:'key',tier:2,value:650,rarity:'RARE',story:'A badge of office from a vanished court, decorated with blue enamel.' },
    { key:'gold-certificate',name:'Founders’ gold certificate',kind:'cash',tier:2,value:930,rarity:'RARE',story:'A signed, canceled founding certificate. Its value is historical.' }
  ];
  const conditions = [{name:'WORN',factor:.7},{name:'WELL KEPT',factor:1},{name:'PRISTINE',factor:1.3}];
  const buyers = ['Mara Bell · antique dealer','Elias Voss · collector','June Finch · archivist','Mr. Calder · estate buyer'];
  const lookup = key => items.find(item => item.key === key);
  const int = (n,fallback=0) => Number.isSafeInteger(n)&&n>=0 ? n : fallback;
  const pick = (arr,rng) => arr[Math.min(arr.length-1,Math.floor(rng()*arr.length))];
  const result = (ok,message,extra={}) => ({ok,message,...extra});
  const fresh = () => ({ version:1, nextId:1, ownedSafes:[], items:[], opened:0, sold:0, revenue:0, auction:null, sale:null, ledger:[] });
  const uid = (s,prefix) => `${prefix}-${s.nextId++}`;
  const validId = id => typeof id==='string' && /^[a-z]+-\d+$/.test(id);
  function restore(raw) {
    const s=fresh(); if(!raw||typeof raw!=='object')return s;
    const seen=new Set();
    const item = rawItem => {
      if(!rawItem||!validId(rawItem.id)||seen.has(rawItem.id)||!lookup(rawItem.key))return null;
      seen.add(rawItem.id);
      return {id:rawItem.id,key:rawItem.key,condition:Math.min(2,int(rawItem.condition,1)),value:Math.min(100000,int(rawItem.value,lookup(rawItem.key).value)),status:rawItem.status==='listed'?'listed':'kept',source:validId(rawItem.source)?rawItem.source:'safe-0'};
    };
    s.items=(Array.isArray(raw.items)?raw.items:[]).map(item).filter(Boolean);
    s.ownedSafes=(Array.isArray(raw.ownedSafes)?raw.ownedSafes:[]).filter(x=>x&&validId(x.id)&&Number.isInteger(x.tier)&&x.tier>=0&&x.tier<=2).map(x=>({id:x.id,tier:x.tier,cost:int(x.cost),source:x.source==='auction'?'auction':'dealer',contents:(Array.isArray(x.contents)?x.contents:[]).map(item).filter(Boolean)})).filter((x,i,all)=>x.contents.length&&all.findIndex(y=>y.id===x.id)===i).slice(0,8);
    for(const key of ['opened','sold','revenue'])s[key]=int(raw[key]);
    s.nextId=Math.max(int(raw.nextId,1),...s.items.concat(s.ownedSafes,s.ownedSafes.flatMap(x=>x.contents)).map(x=>Number(x.id.split('-')[1])+1),1);
    const bidLog = log => (Array.isArray(log)?log:[]).filter(x=>x&&typeof x.text==='string').slice(-10).map(x=>({text:x.text.slice(0,180)}));
    const rivals = list => (Array.isArray(list)?list:[]).filter(x=>x&&Number.isInteger(x.buyer)&&x.buyer>=0&&x.buyer<buyers.length&&Number.isSafeInteger(x.cap)&&x.cap>=0).slice(0,4).map(x=>({buyer:x.buyer,cap:x.cap}));
    const a=raw.auction;
    if(a&&validId(a.id)&&Number.isInteger(a.tier)&&a.tier>=0&&a.tier<=2&&['active','won','lost','passed'].includes(a.status))s.auction={id:a.id,tier:a.tier,status:a.status,price:int(a.price),leader:a.leader==='you'?'you':Number.isInteger(a.leader)&&buyers[a.leader]?a.leader:null,round:int(a.round),rivals:rivals(a.rivals),log:bidLog(a.log),safeId:validId(a.safeId)?a.safeId:null};
    const sale=raw.sale;
    if(sale&&validId(sale.id)&&['active','sold','unsold'].includes(sale.status)&&lookup(sale.key)) {
      const held=s.items.find(x=>x.id===sale.itemId);
      if(sale.status!=='active'||held)s.sale={id:sale.id,itemId:sale.itemId,key:sale.key,status:sale.status,reserve:int(sale.reserve),price:int(sale.price),round:Math.min(3,int(sale.round)),rivals:rivals(sale.rivals),leader:Number.isInteger(sale.leader)&&buyers[sale.leader]?sale.leader:null,log:bidLog(sale.log),fee:int(sale.fee),net:int(sale.net)};
    }
    // A partially written or older save must never strand an item in consignment.
    for(const x of s.items)x.status=s.sale?.status==='active'&&s.sale.itemId===x.id?'listed':'kept';
    s.ledger=(Array.isArray(raw.ledger)?raw.ledger:[]).filter(x=>x&&typeof x.title==='string'&&Number.isSafeInteger(x.amount)).slice(-12).map(x=>({title:x.title.slice(0,120),amount:x.amount}));
    return s;
  }
  const record=(s,title,amount)=>{s.ledger.push({title,amount});s.ledger=s.ledger.slice(-12);};
  const log=(a,text)=>{a.log.push({text});a.log=a.log.slice(-10);};
  function makeItem(s,tier,source,rng){
    const template=pick(items.filter(x=>x.tier===tier),rng),condition=pick([0,1,1,1,2],rng);
    const value=Math.max(10,Math.round(template.value*conditions[condition].factor*(.9+rng()*.2)/5)*5);
    return {id:uid(s,'item'),key:template.key,condition,value,status:'kept',source};
  }
  function acquire(p,tier,cost,source,rng){
    const s=p.economy,id=uid(s,'safe');const contents=[makeItem(s,tier,id,rng)];
    if(tier===2||rng()<(tier===0?.25:.45))contents.push(makeItem(s,Math.max(0,tier-1),id,rng));
    if(tier===2&&rng()<.25)contents.push(makeItem(s,0,id,rng));
    const safe={id,tier,cost,source,contents};p.cash-=cost;s.ownedSafes.push(safe);record(s,`${source==='auction'?'Won':'Bought'} ${safes[tier].name}`,-cost);return safe;
  }
  function buySafe(p,tier,rng=Math.random){
    const offer=safes[tier];if(!offer)return result(false,'Unknown safe.');
    if(p.economy.ownedSafes.length>=8)return result(false,'Your storage holds eight safes. Open one to make room.');
    if(p.cash<offer.price)return result(false,'Complete a client job to build up your funds.');
    const safe=acquire(p,tier,offer.price,'dealer',rng);return result(true,'Safe delivered to your collection.',{safe});
  }
  function claimSafe(p,id){
    const s=p.economy,index=s.ownedSafes.findIndex(x=>x.id===id);if(index<0)return result(false,'This safe has already been opened.');
    const [safe]=s.ownedSafes.splice(index,1);s.items.push(...safe.contents);s.opened++;p.rep+=8*(safe.tier+1);
    record(s,`Opened ${safes[safe.tier].name} · ${safe.contents.length} find${safe.contents.length===1?'':'s'}`,0);
    return result(true,'The contents are yours.',{safe,items:safe.contents,estimate:safe.contents.reduce((sum,item)=>sum+item.value,0),rep:8*(safe.tier+1)});
  }
  function newAuction(p,tier=0,rng=Math.random){
    if(p.economy.auction?.status==='active')return result(false,'Finish or pass on the current lot first.');
    const offer=safes[tier];if(!offer)return result(false,'Unknown lot.');
    p.economy.auction={id:uid(p.economy,'lot'),tier,status:'active',price:0,leader:null,round:0,safeId:null,rivals:[0,1,3].map(buyer=>({buyer,cap:Math.round(offer.price*(.55+rng()*.95)/offer.increment)*offer.increment})),log:[{text:`${offer.name}. Bidding opens at $${offer.opening}.`} ]};
    return result(true,'The auctioneer opens a new lot.');
  }
  function nextBid(a){return a.price? a.price+safes[a.tier].increment:safes[a.tier].opening;}
  function bid(p,rng=Math.random){
    const a=p.economy.auction;if(!a||a.status!=='active')return result(false,'This lot is closed.');
    const price=nextBid(a);if(p.cash<price)return result(false,'Not enough funds for that bid.');
    if(p.economy.ownedSafes.length>=8)return result(false,'Open one of your eight safes before bidding.');
    a.round++;a.price=price;a.leader='you';log(a,`You bid $${price}.`);
    const eligible=a.rivals.filter(x=>x.cap>=price+safes[a.tier].increment);
    if(eligible.length){const rival=eligible[(a.round-1)%eligible.length];a.price+=safes[a.tier].increment;a.leader=rival.buyer;log(a,`${buyers[rival.buyer]} raises to $${a.price}.`);return result(true,'You have been outbid. Raise or pass.');}
    const safe=acquire(p,a.tier,price,'auction',rng);a.status='won';a.safeId=safe.id;log(a,`Going once, going twice… sold to you for $${price}.`);return result(true,'You won the lot. The safe is now yours.',{safe});
  }
  function pass(p){const a=p.economy.auction;if(!a||a.status!=='active')return result(false,'This lot is closed.');a.status=a.leader===null?'passed':'lost';log(a,a.leader===null?'No bids. The lot is withdrawn.':`Sold to ${buyers[a.leader]} for $${a.price}. You paid nothing.`);return result(true,'You passed. No money was deducted.');}
  function listItem(p,id,pricing='fair',rng=Math.random){
    const s=p.economy;if(s.sale?.status==='active')return result(false,'Finish your current consignment first.');
    const item=s.items.find(x=>x.id===id&&x.status==='kept');if(!item)return result(false,'That item is not available to sell.');
    if(!['quick','fair','bold'].includes(pricing))return result(false,'Choose a valid reserve.');
    const reserve=Math.max(5,Math.round(item.value*({quick:.55,fair:.85,bold:1.25}[pricing])/5)*5);
    const rivals=[0,1,2].map(buyer=>({buyer,cap:Math.round(item.value*(.65+rng()*.9)/5)*5}));
    item.status='listed';s.sale={id:uid(s,'sale'),itemId:id,key:item.key,status:'active',reserve,price:0,round:0,rivals,leader:null,log:[{text:`${lookup(item.key).name} consigned. Reserve $${reserve}.`}],fee:0,net:0};
    return result(true,'Item consigned. Call for bids in the auction house.');
  }
  function advanceSale(p){
    const s=p.economy,a=s.sale;if(!a||a.status!=='active')return result(false,'This consignment is closed.');
    const item=s.items.find(x=>x.id===a.itemId);if(!item)return result(false,'Consigned item is missing.');
    a.round++;const eligible=a.rivals.filter(x=>x.cap>=a.reserve).sort((x,y)=>y.cap-x.cap);
    if(eligible.length){
      const increment=Math.max(5,Math.round(item.value*.07/5)*5),winner=eligible[0];
      const finalPrice=Math.min(winner.cap,eligible.length>1?Math.max(a.reserve,eligible[1].cap+increment):a.reserve);
      const price=a.round===3?finalPrice:Math.min(finalPrice,a.reserve+Math.floor((finalPrice-a.reserve)*a.round/3/5)*5);
      const contenders=eligible.filter(x=>x.cap>=price);
      const bidder=a.round===3?winner:contenders[(a.round===1?1:0)%contenders.length];
      const unchanged=price===a.price&&a.leader===bidder.buyer;
      a.price=price;a.leader=bidder.buyer;
      log(a,unchanged?`${a.round===3?'Final call':'Going once'} at $${a.price}. ${buyers[bidder.buyer]} holds the bid.`:`${a.round===3?'Final call':`Round ${a.round}`} · ${buyers[bidder.buyer]} offers $${a.price}.`);
    }else log(a,`Round ${a.round} · No bidder meets your $${a.reserve} reserve.`);
    if(a.round<3)return result(true,'The bidding continues.');
    if(eligible.length){a.status='sold';a.fee=Math.ceil(a.price*.1);a.net=a.price-a.fee;p.cash+=a.net;s.items=s.items.filter(x=>x.id!==a.itemId);s.sold++;s.revenue+=a.net;record(s,`Sold ${lookup(a.key).name}`,a.net);log(a,`Sold. $${a.price} hammer − $${a.fee} commission = $${a.net} paid to you.`);return result(true,`Sold! $${a.net} added to workshop funds.`);}
    a.status='unsold';item.status='kept';log(a,'Reserve not met. Your item is returned. No commission charged.');return result(true,'Unsold. Try a lower reserve or keep the item.');
  }
  const api={safes,items,conditions,buyers,lookup,fresh,restore,buySafe,claimSafe,newAuction,nextBid,bid,pass,listItem,advanceSale};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SafecrackerEconomy=api;
})(typeof window==='undefined'?globalThis:window);
