(function(){
"use strict";
const A=()=>window.alt1,H=()=>!!A(),P=()=>H()&&!!A().permissionPixel,O=()=>H()&&!!A().permissionOverlay,$=i=>document.getElementById(i);
let profile=null,timer=null,audio=false,idx=0,lastFire=0,active=false,probeBase=[null,null,null,null,null],confirm=0,clearCount=0,armed=false,stableFrames=0;
const BUILD="v0.1.7";
const size=()=>H()?{width:+(A().rsWidth||1280),height:+(A().rsHeight||720)}:{width:1280,height:720};
function overlay(t){if(!O())return;let a=A(),x=Math.round((a.rsX||0)+(a.rsWidth||1280)/2),y=Math.round((a.rsY||0)+Math.max(100,(a.rsHeight||720)*.17)),c=((255)|255<<8|255<<16|255<<24)|0;a.overLaySetGroup("pvmcoach");a.overLayClearGroup("pvmcoach");if(typeof a.overLayTextEx==="function")a.overLayTextEx(t,c,28,x,y,1800,"",true,true);else a.overLayText(t,c,28,x,y,1800)}
function announce(t,conf=1,isTest=false){$("primaryAlert").textContent=t;$("confidence").textContent=Math.round(conf*100)+"%";overlay(t);if(isTest&&H()&&typeof A().showNotification==="function"){try{A().showNotification("RS3 PvM Coach",t,"")}catch(e){}}if(audio&&window.speechSynthesis){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(t))}setTimeout(()=>$("primaryAlert").textContent="Watching…",2200)}
function render(){let p=profile.phases.find(x=>x.id===$("phaseSelect").value)||profile.phases[0],r=p.rotation,c=r[idx%r.length];$("rotationCurrent").textContent=c.label;$("upcoming").innerHTML="";for(let k=0;k<5;k++){let s=r[(idx+k)%r.length],li=document.createElement("li");li.textContent=(k?"+"+k:"NOW")+" · "+s.label+(s.count?" ×"+s.count:"");$("upcoming").appendChild(li)}}
function hsv(r,g,b){r/=255;g/=255;b/=255;let M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m,h=0;if(d){if(M===r)h=60*(((g-b)/d)%6);else if(M===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4)}if(h<0)h+=360;return[h,M?d/M:0,M]}
function ok(v,d){return v[0]>=d.hsv.hMin&&v[0]<=d.hsv.hMax&&v[1]>=d.hsv.sMin&&v[2]>=d.hsv.vMin}
function sampleProbe(x,y,w,h,d){let raw=A().getRegion(x,y,w,h);if(!raw)return null;let s=atob(raw),mA=0,mB=0,n=0;for(let i=0;i+3<s.length;i+=8){let c0=s.charCodeAt(i),c1=s.charCodeAt(i+1),c2=s.charCodeAt(i+2),a=hsv(c2,c1,c0),b=hsv(c0,c1,c2);if(ok(a,d))mA++;if(ok(b,d))mB++;n++}return n?Math.max(mA,mB)/n:0}
function resetDetector(){probeBase=[null,null,null,null,null];confirm=0;clearCount=0;active=false;armed=false;stableFrames=0}
function tick(){
 if(!P()||!profile){$("metric").textContent="capture unavailable";return}
 let d=profile.detectors[0],z=size(),pw=Math.min(140,Math.max(80,Math.floor(z.width*.075))),ph=Math.min(100,Math.max(60,Math.floor(z.height*.085))),pts=[[.38,.30],[.52,.30],[.66,.30],[.45,.48],[.60,.48]],vals=[];
 try{for(const p of pts){let x=Math.max(0,Math.min(z.width-pw,Math.floor(p[0]*z.width-pw/2))),y=Math.max(0,Math.min(z.height-ph,Math.floor(p[1]*z.height-ph/2))),q=sampleProbe(x,y,pw,ph,d);if(q===null){$("metric").textContent="no pixels";return}vals.push(q)}}catch(e){$("metric").textContent="capture error";return}
 let deltas=[];
 for(let i=0;i<vals.length;i++){if(probeBase[i]===null)probeBase[i]=vals[i];let delta=vals[i]-probeBase[i];deltas.push(delta)}
 let maxAbs=Math.max.apply(null,deltas.map(Math.abs));
 if(!armed){
   if(maxAbs<.004){stableFrames++;for(let i=0;i<vals.length;i++)probeBase[i]=probeBase[i]*.94+vals[i]*.06}else{stableFrames=0;for(let i=0;i<vals.length;i++)probeBase[i]=vals[i]}
   let remain=Math.max(0,30-stableFrames);
   $("metric").textContent=stableFrames>=30?"ARMED":"ARMING "+remain;
   if(stableFrames>=30){armed=true;confirm=0;clearCount=0;$("metric").textContent="ARMED · P 0/5 · S 0/5"}
   return;
 }
 for(let i=0;i<vals.length;i++){let delta=vals[i]-probeBase[i];deltas[i]=delta;if(!active&&Math.abs(delta)<.004)probeBase[i]=probeBase[i]*.995+vals[i]*.005}
 let weak=.006,strong=.012,veryStrong=.030,weakHit=deltas.map(x=>x>=weak),strongHit=deltas.map(x=>x>=strong),hits=weakHit.filter(Boolean).length,strongHits=strongHit.filter(Boolean).length,veryStrongHits=deltas.filter(x=>x>=veryStrong).length;
 let pairs=[[0,1],[1,2],[0,3],[1,3],[1,4],[2,4],[3,4]],paired=false,pairedStrong=false;
 for(const p of pairs){if(weakHit[p[0]]&&weakHit[p[1]])paired=true;if((strongHit[p[0]]&&weakHit[p[1]])||(weakHit[p[0]]&&strongHit[p[1]]))pairedStrong=true}
 let broadDeathLike=veryStrongHits>=4,maxDelta=Math.max.apply(null,deltas);
 $("metric").textContent="ARMED · P "+hits+"/5 · S "+strongHits+"/5 · maxΔ "+maxDelta.toFixed(4);
 let wallPattern=hits>=2&&paired&&pairedStrong&&!broadDeathLike;
 if(wallPattern){confirm++;clearCount=0}else{confirm=Math.max(0,confirm-1);clearCount++}
 if(!active&&confirm>=2&&Date.now()-lastFire>d.cooldownMs){active=true;lastFire=Date.now();announce(d.callout,d.confidence)}
 if(active&&clearCount>=10){active=false;confirm=0}
}
window.addEventListener("DOMContentLoaded",async()=>{
 if(H())A().identifyAppUrl("./appconfig.json");
 $("alt1Status").textContent=H()?"Alt1 detected":"Browser preview";$("pixelStatus").textContent=P()?"Pixel: OK":"Pixel: unavailable";$("overlayStatus").textContent=O()?"Overlay: OK":"Overlay: unavailable";
 profile=await(await fetch("./profiles/vindicta.json?v=7")).json();$("bossName").textContent=profile.name+" · Build "+BUILD;
 profile.phases.forEach(p=>{let o=document.createElement("option");o.value=p.id;o.textContent=p.name;$("phaseSelect").appendChild(o)});render();
 $("startBtn").onclick=()=>{if(!timer)timer=setInterval(tick,60);$("runState").textContent="RUNNING"};
 $("pauseBtn").onclick=()=>{clearInterval(timer);timer=null;$("runState").textContent="PAUSED"};
 $("testBtn").onclick=()=>announce("TEST — COACH WORKING",1,true);$("audioToggle").onchange=e=>audio=e.target.checked;$("debugToggle").onchange=e=>$("debugPanel").classList.toggle("hidden",!e.target.checked);
 $("phaseSelect").onchange=()=>{idx=0;resetDetector();render()};$("nextBtn").onclick=()=>{idx++;render()};$("prevBtn").onclick=()=>{idx=Math.max(0,idx-1);render()};
 $("callCurrentBtn").onclick=()=>{let p=profile.phases.find(x=>x.id===$("phaseSelect").value),s=p.rotation[idx%p.rotation.length];if(s.callout)announce(s.callout)};
 $("sampleBtn").onclick=()=>{$("calResult").textContent=armed?"Detector armed and stable.":"Detector is waiting for 30 stable frames before arming."};$("exportDetectorBtn").onclick=()=>{};$("exportLogsBtn").onclick=()=>{};
 if(!H()){$("installBox").classList.remove("hidden");$("installLink").href="alt1://addapp/"+new URL("./appconfig.json",location.href).href}
 $("startBtn").click();
});
})();