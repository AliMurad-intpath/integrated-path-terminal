'use strict';
let officeMapLibrary;
function loadOfficeMap(){
 if(window.L)return Promise.resolve(window.L);
 if(officeMapLibrary)return officeMapLibrary;
 officeMapLibrary=new Promise((resolve,reject)=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.append(css);
  const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.onload=()=>resolve(window.L);script.onerror=()=>{script.remove();css.remove();officeMapLibrary=null;reject(Error('Map unavailable'));};document.head.append(script);
 });return officeMapLibrary;
}
async function officeLocation(){
 const destination=[33.3186734,44.4147758];
 const {body,panel}=activityPanel(activityText('Drive to Integrated Path','الطريق إلى المسار المتكامل'));panel.classList.add('location-dialog');
 body.append(activityNode('p',activityText('Al Saadoon Street, near Baghdad Hotel, Baghdad.','شارع السعدون، قرب فندق بغداد، بغداد.')));
 const status=activityNode('p',activityText('Loading the office map…','جارٍ تحميل خريطة المكتب…'),'activity-meta');body.append(status);
 const host=activityNode('div','','office-map');host.setAttribute('aria-label',activityText('Choose a starting point on the map','اختر نقطة الانطلاق على الخريطة'));body.append(host);
 const controls=activityNode('div','','map-actions');body.append(controls);
 const directions=activityNode('a',activityText('Driving directions in Google Maps ↗','اتجاهات القيادة في Google Maps ↗'),'button');directions.href='https://www.google.com/maps/dir/?api=1&destination=33.3186734%2C44.4147758&travelmode=driving';directions.target='_blank';directions.rel='noopener';controls.append(directions);
 const replay=activityButton(controls,activityText('Replay drive','إعادة عرض المسار'),()=>animate(),true);replay.disabled=true;
 const stop=activityButton(controls,activityText('Stop animation','إيقاف الحركة'),()=>cancelAnimationFrame(frame),true);stop.disabled=true;
 body.append(activityNode('p',activityText('Choose a point on the map, or pan with the arrow keys and use “Start from map center”. Selected points are sent to the routing service. This preview has no live traffic and is not turn-by-turn navigation.','اختر نقطة على الخريطة، أو حرّكها بمفاتيح الأسهم ثم اضغط «الانطلاق من مركز الخريطة». تُرسل النقطة المختارة إلى خدمة المسارات. المعاينة لا تعرض حركة المرور المباشرة وليست إرشاداً خطوة بخطوة.'),'activity-meta'));
 let map,routeLayer,startMarker,vehicle,frame=0,controller,coordinates=[],distances=[],request=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 panel.addEventListener('close',()=>{request++;controller?.abort();cancelAnimationFrame(frame);map?.remove();});
 function animate(){cancelAnimationFrame(frame);if(!vehicle||coordinates.length<2)return;stop.disabled=false;let began;const duration=reduced?0:9000;
  function tick(now){if(!panel.open)return;if(began===undefined)began=now;const progress=duration?Math.min(1,(now-began)/duration):1;const target=distances.at(-1)*progress;let i=1;while(i<distances.length-1&&distances[i]<target)i++;const span=distances[i]-distances[i-1],t=span?(target-distances[i-1])/span:1;const a=coordinates[i-1],b=coordinates[i];vehicle.setLatLng([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);if(progress<1)frame=requestAnimationFrame(tick);else stop.disabled=true;}
  frame=requestAnimationFrame(tick);
 }
 async function routeFrom(point){
  const ticket=++request;controller?.abort();controller=new AbortController();const activeController=controller;cancelAnimationFrame(frame);replay.disabled=true;stop.disabled=true;
  [routeLayer,startMarker,vehicle].forEach(layer=>layer&&map.removeLayer(layer));routeLayer=startMarker=vehicle=null;
  const origin=[point.lat,point.lng];startMarker=L.circleMarker(origin,{radius:7,color:'#fff',fillColor:'#2e529c',fillOpacity:1}).addTo(map);
  directions.href='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin.join(','))+'&destination=33.3186734%2C44.4147758&travelmode=driving';
  status.textContent=activityText('Finding a driving route…','جارٍ البحث عن مسار قيادة…');
  const timeout=setTimeout(()=>activeController.abort(),12000);
  try{const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${point.lng},${point.lat};44.4147758,33.3186734?overview=full&geometries=geojson&steps=false`,{signal:activeController.signal});if(!response.ok)throw Error();const result=await response.json();if(ticket!==request||!panel.open)return;const route=result.routes?.[0];if(result.code!=='Ok'||!route||route.geometry.coordinates.length<2)throw Error();coordinates=route.geometry.coordinates.map(([lng,lat])=>[lat,lng]);distances=[0];for(let i=1;i<coordinates.length;i++)distances.push(distances[i-1]+map.distance(coordinates[i-1],coordinates[i]));routeLayer=L.polyline(coordinates,{color:'#2e529c',weight:5,opacity:.9}).addTo(map);vehicle=L.marker(coordinates[0],{icon:L.divIcon({className:'drive-marker',html:'<span aria-hidden="true">➤</span>',iconSize:[26,26],iconAnchor:[13,13]}),keyboard:false}).addTo(map);map.fitBounds(routeLayer.getBounds(),{padding:[30,30],maxZoom:17,animate:!reduced});status.textContent=activityText(`Route preview: ${(route.distance/1000).toFixed(1)} km. Animation speed is illustrative.`,`معاينة المسار: ${(route.distance/1000).toFixed(1)} كم. سرعة الحركة توضيحية.`);replay.disabled=false;animate();}
  catch{if(ticket===request&&panel.open)status.textContent=activityText('A route preview is unavailable. Use Google Maps for directions, or choose another starting point.','تعذّرت معاينة المسار. استخدم Google Maps للاتجاهات أو اختر نقطة انطلاق أخرى.');}finally{clearTimeout(timeout);}
 }
 try{await loadOfficeMap();if(!panel.open)return;map=L.map(host,{scrollWheelZoom:false,zoomAnimation:!reduced}).setView(destination,14);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);L.circleMarker(destination,{radius:10,color:'#fff',weight:3,fillColor:'#2e529c',fillOpacity:1}).addTo(map).bindTooltip(activityText('Integrated Path · Office','المسار المتكامل · المكتب'),{permanent:true,direction:'top',offset:[0,-10]});host.querySelector('.leaflet-control-zoom-in')?.setAttribute('aria-label',activityText('Zoom in','تكبير'));host.querySelector('.leaflet-control-zoom-out')?.setAttribute('aria-label',activityText('Zoom out','تصغير'));map.on('click',e=>routeFrom(e.latlng));activityButton(controls,activityText('Start from map center','الانطلاق من مركز الخريطة'),()=>routeFrom(map.getCenter()),true);status.textContent=activityText('Office located. Select a starting point to preview the drive.','تم تحديد المكتب. اختر نقطة انطلاق لمعاينة الطريق.');requestAnimationFrame(()=>{if(panel.open)map.invalidateSize();});}
 catch{if(panel.open){host.hidden=true;status.textContent=activityText('The map could not load. You can still open driving directions below.','تعذّر تحميل الخريطة. يمكنك فتح اتجاهات القيادة أدناه.');}}
}
