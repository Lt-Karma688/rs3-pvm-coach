(function(){
"use strict";
const A=()=>window.alt1,H=()=>!!A(),P=()=>H()&&!!A().permissionPixel,O=()=>H()&&!!A().permissionOverlay,$=i=>document.getElementById(i);
const BUILD="v0.2.0";
let profile=null,timer=null,audio=false,debug=false,phaseId="p1";
let locked=false,trackX=0,trackY=0,box=104,refHist=null,lastGray=null,trackConf=0;
let motionBase=null,motionPeak=false,lastAttackAt=0,attackIndex=0,lastCallAt=0;
const P1=["AUTO","AUTO","HURRICANE","AUTO","AUTO","DRAGONFIRE","AUTO","AUTO","AUTO","HURRICANE"];
const P2=["AUTO","RANGED","AUTO","FIRE"];
const size=()=>H()?{width:+(A().rsWidth||1280),height:+(A().rsHeight||720)}:{width:1280,height:720};
function rgba(r,g,b,a=255){return ((r&255)|((g&255)<<8)|((b&255)<<16)|((a&255)<<24))|0}
function overlayText(t,ms=1800){if(!O())return;let a=A(),x=Math.round((a.rsX||0)+(a.rsWidth||1280)/2),y=Math.round((a.rsY||0)+Math.max(100,(a.rsHeight||720)*.17));a.overLaySetGroup("pvmcoach-call");a.overLayClearGroup("pvmcoach-call");if(typeof a.overLayTextEx==="function")a.overLayTextEx(t,rgba(255,255,255),28,x,y,ms,"",true,true);else a.overLayText(t,rgba(255,255,255),28,x,y,ms)}
function overlayBox(){if(!debug||!O()||!locked)return;let a=A(),sx=(a.rsX||0)+Math.round(trackX-box/2),sy=(a.rsY||0)+Math.round(trackY-box/2);a.overLaySetGroup("pvmcoach-track");a.overLayClearGroup("pvmcoach-track");a.overLayRect(rgba(255,255,255),sx,sy,box,box,140,2)}
function announce(t,conf=1,isTest=false){$("primaryAlert").textContent=t;$("confidence").textContent=Math.round(conf*100)+"%";overlayText(t);if(isTest&&H()&&typeof A().showNotification==="function"){try{A().showNotification("RS3 PvM Coach",t,"")}catch(e){}}if(audio&&window.speechSynthesis){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(t.replace("DRAGONFIRE — MOVE","Move").replace("GORVEK FIRE — MOVE","Move").replace("RANGE — RESONANCE / PRAY RANGE","Range").replace("HURRICANE — DEFENSIVE","Defensive")))}setTimeout(()=>{if($("primaryAlert").textContent===t)$("primaryAlert").textContent="Tracking…"},2200)}
function getRaw(cx,cy,w,h){if(!P())return null;let z=size(),x=Math.max(0,Math.min(z.width-w,Math.round(cx-w/2))),y=Math.max(0,Math.min(z.height-h,Math.round(cy-h/2)));try{return A().getRegion(x,y,w,h)}catch(e){return null}}
function bytes(raw){let s=atob(raw),d=new Uint8Array(s.length);for(let i=0;i<s.length;i++)d[i]=s.charCodeAt(i);return d}
function feature(raw){let d=bytes(raw),hist=new Float32Array(24),gray=new Uint8Array(Math.floor(d.length/16));let gi=0,total=0;for(let i=0;i+3<d.length;i+=16){let b=d[i],g=d[i+1],r=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx?((mx-mn)/mx):0,val=mx/255,h=0,dd=mx-mn;if(dd){if(mx===r)h=60*(((g-b)/dd)%6);else if(mx===g)h=60*((b-r)/dd+2);else h=60*((r-g)/dd+4);if(h<0)h+=360}let hb=Math.min(11,Math.floor(h/30)),sb=sat>.32?1:0;hist[hb*2+sb]++;gray[gi++]=Math.round(.299*r+.587*g+.114*b);total++}if(total)for(let i=0;i<hist.length;i++)hist[i]/=total;return{hist,gray}}
function cosine(a,b){let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return aa&&bb?dot/Math.sqrt(aa*bb):0}
function motion(a,b){if(!a||!b||a.length!==b.length)return 0;let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/(a.length*255)}
function lockCenter(){let z=size();trackX=z.width*.50;trackY=z.height*.42;let raw=getRaw(trackX,trackY,box,box);if(!raw){$("trackerStatus").textContent="Lock failed: no pixels";return}let f=feature(raw);refHist=f.hist;lastGray=f.gray;locked=true;trackConf=1;attackIndex=0;motionBase=null;motionPeak=false;lastAttackAt=0;$("trackerStatus").textContent="LOCKED · center seed";$("primaryAlert").textContent="Boss locked — testing tracker"}
function resetFight(){attackIndex=0;motionBase=null;motionPeak=false;lastAttackAt=0;lastCallAt=0;$("primaryAlert").textContent=locked?"Tracking…":"Lock boss first";renderSequence()}
function renderSequence(){let seq=phaseId==="p2"?P2:P1,cur=seq[attackIndex%seq.length];$("rotationCurrent").textContent=cur;$("upcoming").innerHTML="";for(let k=0;k<5;k++){let s=seq[(attackIndex+k)%seq.length],li=document.createElement("li");li.textContent=(k?"+"+k:"NEXT")+" · "+s;$("upcoming").appendChild(li)}}
function callFor(step){if(Date.now()-lastCallAt<800)return;lastCallAt=Date.now();if(step==="HURRICANE")announce("HURRICANE — DEFENSIVE",.78);else if(step==="DRAGONFIRE")announce("DRAGONFIRE — MOVE",.82);else if(step==="RANGED")announce("RANGE — RESONANCE / PRAY RANGE",.82);else if(step==="FIRE")announce("GORVEK FIRE — MOVE",.84)}
function onAttackEvent(){let seq=phaseId==="p2"?P2:P1,step=seq[attackIndex%seq.length];callFor(step);attackIndex=(attackIndex+1)%seq.length;renderSequence()}
function tick(){if(!P()){$("metric").textContent="capture unavailable";return}if(!locked){$("metric").textContent="UNLOCKED — put boss near screen center and press Lock boss";return}
 let offsets=[[-20,0],[20,0],[0,-20],[0,20],[0,0],[-20,-20],[20,-20],[-20,20],[20,20]],best=null;
 for(const o of offsets){let cx=trackX+o[0],cy=trackY+o[1],raw=getRaw(cx,cy,box,box);if(!raw)continue;let f=feature(raw),sim=cosine(refHist,f.hist);if(!best||sim>best.sim)best={cx,cy,sim,f}}
 if(!best){$("metric").textContent="tracker capture error";return}
 trackX=trackX*.7+best.cx*.3;trackY=trackY*.7+best.cy*.3;trackConf=best.sim;let m=motion(lastGray,best.f.gray);lastGray=best.f.gray;
 if(best.sim>.91){for(let i=0;i<refHist.length;i++)refHist[i]=refHist[i]*.985+best.f.hist[i]*.015}
 if(motionBase===null)motionBase=m;else if(!motionPeak)motionBase=motionBase*.97+m*.03;
 let hi=Math.max(.050,motionBase*2.4+.012),lo=Math.max(.025,motionBase*1.45+.006),now=Date.now();
 if(!motionPeak&&m>=hi&&now-lastAttackAt>380){motionPeak=true}
 if(motionPeak&&m<=lo){motionPeak=false;lastAttackAt=now;onAttackEvent()}
 if(best.sim<.72){$("trackerStatus").textContent="TRACK WEAK — re-lock boss"}else $("trackerStatus").textContent="TRACKED · "+Math.round(best.sim*100)+"%";
 $("metric").textContent="Track "+Math.round(best.sim*100)+"% · motion "+m.toFixed(3)+" · base "+(motionBase||0).toFixed(3)+" · event "+attackIndex;
 overlayBox();
}
window.addEventListener("DOMContentLoaded",async()=>{
 if(H())A().identifyAppUrl("./appconfig.json");
 $("alt1Status").textContent=H()?"Alt1 detected":"Browser preview";$("pixelStatus").textContent=P()?"Pixel: OK":"Pixel: unavailable";$("overlayStatus").textContent=O()?"Overlay: OK":"Overlay: unavailable";
 profile=await(await fetch("./profiles/vindicta.json?v=020")).json();$("bossName").textContent=profile.name+" · Build "+BUILD;
 const sel=$("phaseSelect");sel.innerHTML="";[{id:"p1",name:"Phase 1"},{id:"p2",name:"Mounted Gorvek"}].forEach(p=>{let o=document.createElement("option");o.value=p.id;o.textContent=p.name;sel.appendChild(o)});phaseId="p1";renderSequence();
 $("startBtn").onclick=()=>{if(!timer)timer=setInterval(tick,70);$("runState").textContent="RUNNING"};$("pauseBtn").onclick=()=>{clearInterval(timer);timer=null;$("runState").textContent="PAUSED"};
 $("testBtn").onclick=()=>announce("TEST — COACH WORKING",1,true);$("audioToggle").onchange=e=>audio=e.target.checked;$("debugToggle").onchange=e=>{debug=e.target.checked;$("debugPanel").classList.toggle("hidden",!debug)};
 sel.onchange=e=>{phaseId=e.target.value;resetFight()};$("nextBtn").onclick=()=>{attackIndex=(attackIndex+1)%((phaseId==="p2"?P2:P1).length);renderSequence()};$("prevBtn").onclick=()=>{let n=(phaseId==="p2"?P2:P1).length;attackIndex=(attackIndex-1+n)%n;renderSequence()};$("callCurrentBtn").onclick=()=>callFor((phaseId==="p2"?P2:P1)[attackIndex]);
 $("lockBossBtn").onclick=lockCenter;$("resetFightBtn").onclick=resetFight;
 $("sampleBtn").onclick=()=>{$("calResult").textContent="v0.2.0 uses boss-local tracking and animation-event state advancement. Old arena-wide purple detector is disabled."};$("exportDetectorBtn").onclick=()=>{};$("exportLogsBtn").onclick=()=>{};
 if(!H()){$("installBox").classList.remove("hidden");$("installLink").href="alt1://addapp/"+new URL("./appconfig.json",location.href).href}
 $("startBtn").click();
});
})();