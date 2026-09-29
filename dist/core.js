(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WaypointCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
  const clone=x=>JSON.parse(JSON.stringify(x));
  const vehicles=[
    {id:'VEH036',type:'Refrigerated van',depot:'Peliyagoda',temp:'reefer',van:true,kg:1040,m3:7,kpl:10.3,fuel:20,available:true},
    {id:'VEH035',type:'Refrigerated van',depot:'Peliyagoda',temp:'reefer',van:true,kg:1040,m3:7,kpl:10.3,fuel:20,available:false},
    {id:'VEH001',type:'Refrigerated truck',depot:'Peliyagoda',temp:'reefer',van:false,kg:5510,m3:26.4,kpl:4.7,fuel:40,available:true}
  ];
  const outlets=[{id:'OUT001',open:'05:00',close:'07:30',eta:'05:15'},{id:'OUT002',open:'05:30',close:'08:00',eta:'05:55'},{id:'OUT003',open:'05:00',close:'07:30',eta:'06:30'}];
  const mins=s=>Number(s.split(':')[0])*60+Number(s.split(':')[1]);
  const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const assert=(v,msg)=>{if(!v)throw Error(msg);};
  const active=o=>o.vehicle&&!['confirmed','deferred'].includes(o.status);
  const freshOrder=(id,outlet,ambient=false)=>({id,outlet,brand:'Fresh',district:'Colombo',depot:'Peliyagoda',temp:ambient?'ambient':'chilled',access:'Van only',dock:'Street',run:'2026-06-22',kg:ambient?100:250,m3:ambient?1.5:2,cases:ambient?20:54,lines:ambient?[{name:'Ambient goods',qty:20}]:[{name:'Milk cartons',qty:24},{name:'Yogurt cartons',qty:18},{name:'Butter cartons',qty:12}],status:'confirmed',history:['Order confirmed for Monday 22 June'],version:1,ack:false,published:false,previousDeferrals:0});
  const initial=()=>({version:2,orders:[freshOrder('DEMO001','OUT001'),freshOrder('DEMO002','OUT002'),freshOrder('DEMO003','OUT003'),freshOrder('DEMO004','OUT002',true)],queue:[],applied:[],offline:false,nextId:5,revision:1});
  function model(state=initial()){
    const m={state};
    const order=id=>{const o=m.state.orders.find(x=>x.id===id);assert(o,'Order not found.');return o;};
    const group=o=>m.state.orders.filter(x=>active(x)&&x.vehicle===o.vehicle&&x.trip===o.trip&&x.run===o.run).sort((a,b)=>a.sequence-b.sequence);
    const history=(o,s)=>o.history.unshift(s);
    const estimate=(o,all=m.state.orders)=>{
      const ref=outlets.find(x=>x.id===o.outlet);
      if(o.trip===1)return ref.eta;
      const first=all.filter(x=>active(x)&&x.vehicle===o.vehicle&&x.run===o.run&&x.trip===1);
      const departure=first.length?Math.max(...first.map(x=>mins(outlets.find(y=>y.id===x.outlet).eta)))+16+24+30:mins('05:00');
      return time(Math.max(mins(ref.open),departure+24+(o.sequence-1)*35));
    };
    function validate(all){
      const keys=new Set();
      for(const o of all.filter(active)){
        const v=vehicles.find(x=>x.id===o.vehicle),ref=outlets.find(x=>x.id===o.outlet);
        assert(v&&v.available,`${o.vehicle} is in the workshop and cannot be assigned.`);
        assert(o.trip===1||o.trip===2,'A vehicle may run only two trips per day.');
        assert(v.depot===o.depot,'Vehicle and outlet must belong to the same depot.');
        assert(o.temp!=='chilled'||v.temp==='reefer','Chilled goods need a refrigerated vehicle.');
        assert(o.access!=='Van only'||v.van,`${o.outlet} only accepts vans; this truck cannot access it.`);
        const eta=mins(estimate(o,all));
        assert(eta>=mins(ref.open)&&eta+16<=mins(ref.close)&&eta+16<=480,`Trip ${o.trip} reaches ${o.outlet} at ${time(eta)} and cannot complete its 16-minute allowance before ${ref.close}.`);
        keys.add(`${o.vehicle}|${o.run}|${o.trip}`);
      }
      for(const key of keys){
        const [id,date,t]=key.split('|'),v=vehicles.find(x=>x.id===id),g=all.filter(x=>active(x)&&x.vehicle===id&&x.run===date&&x.trip===Number(t));
        assert(g.every(x=>x.brand===g[0].brand&&x.district===g[0].district),'Each trip serves one brand and district.');
        const kg=g.reduce((s,x)=>s+x.kg,0),vol=g.reduce((s,x)=>s+x.m3,0);
        assert(kg<=v.kg,`Weight limit exceeded: ${kg} / ${v.kg} kg.`);
        assert(vol<=v.m3,`Volume limit exceeded: ${vol.toFixed(1)} / ${v.m3.toFixed(1)} m³. Spare weight does not make this load fit.`);
        const vehicleOrders=all.filter(x=>active(x)&&x.vehicle===id);
        const trips=[...new Set(vehicleOrders.map(x=>x.run+'|'+x.trip))].map(key=>vehicleOrders.filter(x=>x.run+'|'+x.trip===key));
        const litres=trips.reduce((s,x)=>s+(x.length?(24+4*(x.length-1))/v.kpl:0),0);
        assert(litres<=v.fuel,'Trips exceed the illustrative remaining fuel balance, including return travel.');
      }
      return true;
    }
    function resequence(all){const keys=new Set(all.filter(active).map(x=>x.vehicle+'|'+x.run+'|'+x.trip));for(const key of keys)all.filter(x=>active(x)&&x.vehicle+'|'+x.run+'|'+x.trip===key).sort((a,b)=>CETA(a)-CETA(b)||a.id.localeCompare(b.id)).forEach((o,i)=>o.sequence=i+1);}
    const CETA=o=>mins(outlets.find(x=>x.id===o.outlet).eta);
    function invalidate(){m.state.revision++;for(const o of m.state.orders.filter(x=>['planned','loading_issue'].includes(x.status))){o.published=false;o.ack=false;o.version=m.state.revision;}}
    m.order=order;m.group=group;m.estimate=estimate;m.validate=()=>validate(m.state.orders);
    m.checkCandidate=(id,vehicle,trip)=>{try{const all=clone(m.state.orders),o=all.find(x=>x.id===id);Object.assign(o,{vehicle,trip,status:'planned',sequence:all.filter(x=>active(x)&&x.vehicle===vehicle&&x.run===o.run&&x.trip===trip).length+1});resequence(all);validate(all);return '';}catch(e){return e.message;}};
    m.allocate=(id,vehicle,trip)=>{const o=order(id);assert(o.status==='confirmed','Only confirmed orders can be allocated.');const error=m.checkCandidate(id,vehicle,trip);assert(!error,error);invalidate();Object.assign(o,{vehicle,trip,sequence:m.state.orders.filter(x=>active(x)&&x.vehicle===vehicle&&x.run===o.run&&x.trip===trip).length+1,status:'planned',published:false,ack:false,version:m.state.revision});resequence(m.state.orders);history(o,`Assigned to ${vehicle}, trip ${trip}; awaiting publication`);};
    m.defer=(id,reason)=>{const o=order(id);assert(['confirmed','planned','loading_issue'].includes(o.status),'This order has already left the planning and loading stage.');assert(reason.trim(),'A deferral reason is required.');invalidate();o.status='deferred';o.reason=reason.trim();o.previousDeferrals++;o.published=false;delete o.vehicle;delete o.trip;history(o,'Deferred: '+reason.trim());};
    m.reopen=id=>{const o=order(id);assert(o.status==='deferred','Only deferred orders can be reopened.');o.status='confirmed';history(o,'Returned to planning; previous deferral retained');};
    m.publish=()=>{assert(!m.state.orders.some(x=>x.status==='confirmed'),'Every confirmed order needs an allocation or a deferral before publication.');validate(m.state.orders);assert(m.state.orders.some(x=>x.status==='planned'),'Allocate at least one order first.');for(const o of m.state.orders.filter(x=>x.status==='planned')){o.published=true;history(o,`Plan v${o.version} published to loader`);}};
    m.acknowledge=id=>{const o=order(id);assert(o.published&&o.status==='planned','Wait for a published loading plan.');o.ack=true;history(o,`Loader acknowledged plan v${o.version}`);};
    m.countLoad=(id,counts)=>{const o=order(id);assert(o.status==='planned'&&o.published&&o.ack,'Acknowledge the current published plan first.');assert(!m.state.offline,'Final handover needs a connection and a current plan.');assert(counts.length===o.lines.length&&counts.every(n=>Number.isInteger(n)&&n>=0),'Enter a whole-number count for every line.');o.counts=counts;const mismatch=o.lines.map((l,i)=>counts[i]===l.qty?null:`${l.name}: expected ${l.qty}, counted ${counts[i]}`).filter(Boolean);if(mismatch.length){o.status='loading_issue';o.shortfall=mismatch.join('; ');history(o,'Loading blocked: '+o.shortfall);}else{o.status='ready';history(o,'All quantities checked; ready for driver');}};
    m.replenish=id=>{const o=order(id);assert(o.status==='loading_issue','No loading issue to resolve.');o.status='planned';o.ack=false;o.version=++m.state.revision;history(o,'Replacement goods arranged; loader must acknowledge and recount');delete o.counts;};
    m.start=id=>{const o=order(id),g=group(o);assert(g.length&&g.every(x=>x.status==='ready'),'Every order on this trip must be loaded before departure.');for(const x of g){x.status='in_transit';history(x,'Driver accepted handover and started trip');}};
    const localEvent=(id,type)=>m.state.queue.find(x=>x.orderId===id&&x.type===type);
    m.localEvent=localEvent;
    function apply(e){if(m.state.applied.includes(e.id))return;const o=order(e.orderId);assert(o.version===e.version,'The plan changed. Dispatch must review this saved event.');if(e.type==='arrival'){assert(o.status==='in_transit','Arrival conflicts with the current order state.');o.arrival=e.eventTime;history(o,`Arrival recorded at ${e.eventTime}`);}else{assert(o.status==='in_transit','Delivery conflicts with the current order state.');assert(o.arrival,'Record arrival before the outcome.');o.status=e.failed?'delivery_failed':'delivered';o.delivery=clone(e);history(o,e.failed?'Delivery unsuccessful: '+e.note:`Driver reported ${e.qty} cartons at ${e.eventTime}; receipt pending`);}m.state.applied.push(e.id);}
    function record(id,type,values={}){const o=order(id);assert(o.status==='in_transit','Start the loaded trip before recording this stop.');assert(!localEvent(id,type),'This event is already saved on this device.');const e={id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,orderId:id,type,version:o.version,eventTime:time(mins(estimate(o))+(type==='arrival'?5:15)),...values};if(m.state.offline)m.state.queue.push(e);else apply(e);return e;}
    m.arrive=id=>{const o=order(id);assert(!o.arrival,'Arrival already recorded.');return record(id,'arrival');};
    m.deliver=(id,qty,recipient,proof,note='',failed=false)=>{const o=order(id);assert(o.arrival||localEvent(id,'arrival'),'Record arrival first.');assert(failed?note.trim():recipient.trim(),'Enter the recipient or the reason delivery failed.');assert(Number.isInteger(qty)&&qty>=0&&qty<=o.cases,'Actual quantity must be between zero and the ordered quantity.');return record(id,'delivery',{qty,recipient,proof,note,failed});};
    m.sync=()=>{assert(!m.state.offline,'Reconnect before uploading pending events.');const remaining=[];for(const e of m.state.queue){try{apply(e);}catch(error){e.conflict=error.message;remaining.push(e);}}m.state.queue=remaining;return remaining.length;};
    m.reviewConflict=eventId=>{const e=m.state.queue.find(x=>x.id===eventId);assert(e,'Event not found.');const o=order(e.orderId);history(o,'Dispatcher reviewed saved event against current plan');e.version=o.version;delete e.conflict;};
    m.receive=(id,qty,note)=>{const o=order(id);assert(o.status==='delivered','A driver delivery report is needed before receipt confirmation.');assert(Number.isInteger(qty)&&qty>=0&&qty<=o.cases,'Enter a valid received quantity.');const mismatch=qty!==o.cases||qty!==o.delivery.qty;assert(!mismatch||note.trim(),'Explain the quantity discrepancy.');o.receipt={qty,note};o.status=mismatch?'receipt_issue':'received';history(o,mismatch?`Store reported receipt mismatch: ${qty} cartons; ${note}`:`Store confirmed receipt: ${qty} cartons`);};
    m.resolveReceipt=(id,note)=>{const o=order(id);assert(o.status==='receipt_issue'&&note.trim(),'Add a resolution note for this receipt issue.');o.status='received';o.resolution=note;history(o,'Receipt issue reviewed: '+note);};
    m.newOrder=(outlet,cases,temp,submitted)=>{assert(outlets.some(x=>x.id===outlet),'Choose a valid outlet.');assert(Number.isInteger(cases)&&cases>=1&&cases<=150,'Quantity must be between 1 and 150 cartons.');const o=freshOrder('DEMO'+String(m.state.nextId++).padStart(3,'0'),outlet,temp==='ambient');o.cases=cases;o.kg=Number((cases*250/54).toFixed(1));o.m3=Number((cases*2/54).toFixed(2));o.lines=[{name:temp==='chilled'?'Chilled goods':'Ambient goods',qty:cases}];o.run=mins(submitted)<960?'2026-06-23':'2026-06-24';o.history=[`Order confirmed at ${submitted}; eligible run ${o.run}`];m.state.orders.push(o);return o;};
    return m;
  }
  return {model,initial,vehicles,outlets,mins,time};
});
