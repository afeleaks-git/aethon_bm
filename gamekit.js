/* ============================================================
   GameKit — shared motion & game-feel helpers for both games.
   Pure, dependency-free, additive. Exposes window.GK.
   - haptics on taps (auto-wired)
   - toast notifications
   - win confetti
   - animated number count-up
   All guarded so it never throws on unsupported devices.
   ============================================================ */
(function(){
  'use strict';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Haptics ----
  function haptic(ms){
    try{ if(!reduceMotion && navigator.vibrate) navigator.vibrate(ms||8); }catch(e){}
  }

  // ---- Toasts ----
  function ensureToastHost(){
    let h=document.getElementById('gk-toasts');
    if(!h){ h=document.createElement('div'); h.id='gk-toasts'; document.body.appendChild(h); }
    return h;
  }
  function toast(msg,opts){
    opts=opts||{};
    try{
      const host=ensureToastHost();
      const t=document.createElement('div');
      t.className='gk-toast'; t.textContent=msg;
      host.appendChild(t);
      const dur=opts.duration||2200;
      setTimeout(()=>{ t.classList.add('gk-out'); setTimeout(()=>t.remove(),320); },dur);
      return t;
    }catch(e){ return null; }
  }

  // ---- Confetti ----
  let confettiRunning=false;
  function confetti(opts){
    opts=opts||{};
    if(reduceMotion){ return; }
    if(confettiRunning) return;
    try{
      confettiRunning=true;
      let cv=document.getElementById('gk-confetti');
      if(!cv){ cv=document.createElement('canvas'); cv.id='gk-confetti'; document.body.appendChild(cv); }
      const ctx=cv.getContext('2d');
      const DPR=Math.min(window.devicePixelRatio||1,2);
      const W=window.innerWidth, H=window.innerHeight;
      cv.width=W*DPR; cv.height=H*DPR; cv.style.width=W+'px'; cv.style.height=H+'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
      const colors=opts.colors||['#ffcb05','#ff6b35','#4fc3f7','#66bb6a','#ff6fae','#b06be6','#ffffff'];
      const N=opts.count||140;
      const parts=[];
      for(let i=0;i<N;i++){
        parts.push({
          x:Math.random()*W, y:-20-Math.random()*H*0.5,
          vx:(Math.random()-0.5)*3, vy:2+Math.random()*4,
          w:6+Math.random()*7, h:8+Math.random()*9,
          rot:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.3,
          color:colors[(Math.random()*colors.length)|0],
          sway:Math.random()*Math.PI*2
        });
      }
      const start=performance.now();
      const life=opts.duration||2600;
      function frame(now){
        const t=now-start;
        ctx.clearRect(0,0,W,H);
        parts.forEach(p=>{
          p.sway+=0.05; p.x+=p.vx+Math.sin(p.sway)*0.6; p.y+=p.vy; p.vy+=0.04; p.rot+=p.vr;
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
          ctx.globalAlpha=Math.max(0,1-Math.max(0,t-life*0.7)/(life*0.3));
          ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
          ctx.restore();
        });
        if(t<life){ requestAnimationFrame(frame); }
        else { ctx.clearRect(0,0,W,H); confettiRunning=false; }
      }
      requestAnimationFrame(frame);
    }catch(e){ confettiRunning=false; }
  }

  // ---- Animated number count-up ----
  function countUp(elOrId,to,opts){
    opts=opts||{};
    const el=typeof elOrId==='string'?document.getElementById(elOrId):elOrId;
    if(!el) return;
    const from=(opts.from!=null)?opts.from:(parseFloat(String(el.textContent).replace(/[^0-9.-]/g,''))||0);
    const dur=opts.duration||600;
    const prefix=opts.prefix||'', suffix=opts.suffix||'';
    if(reduceMotion){ el.textContent=prefix+Math.round(to)+suffix; return; }
    const start=performance.now();
    function step(now){
      const k=Math.min(1,(now-start)/dur);
      const e=1-Math.pow(1-k,3);
      el.textContent=prefix+Math.round(from+(to-from)*e)+suffix;
      if(k<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---- Auto-wire light haptic feedback on taps ----
  function autowire(){
    document.addEventListener('click',(e)=>{
      const b=e.target.closest && e.target.closest('button, .btn, .avatar-option, .region-card, .map-opp, .cell, .token-option');
      if(b) haptic(8);
    },{passive:true});
  }

  window.GK={ haptic, toast, confetti, countUp, version:'1.0' };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',autowire);
  else autowire();
})();
