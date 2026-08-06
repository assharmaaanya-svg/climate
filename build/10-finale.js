/* ============================================================================
   THE ENDING
   The same room. Nothing announces itself. What has changed is the light, the
   weight of the cloth, the sound, and the fact that a few objects are missing
   and one object is new.

   Deliberate choices, all of them quiet:
     · the curtains have almost no sway left in them — the same drag, less answer
     · the sash sticks, so lifting it takes several pulls instead of one
     · the toys are gone from the floor and the bed is made too neatly
     · there is an air purifier in the corner that was not there in childhood
     · no birds arrive, and the birdsong layer never comes back
     · the drawing has come off the wall and is propped by the window
   ========================================================================== */
const FIN = {
  cL:0, cR:0, grab:0,
  latchHold:0, memory:0, memPeak:0, opened:0, sashPulls:0, sash:0,
  crayon:false, patch:0, lastX:0, lastY:0,
  purifier:0, seen:0, restLine:0
};

function drawFinaleRoom(t, dt, o){
  o=o||{};
  const wr = winRect();
  const inx=wr.x+wr.w*0.055, iny=wr.y+wr.h*0.05, inw=wr.w*0.89, inh=wr.h*0.82;
  const openAmt = Math.min(FIN.cL, FIN.cR);
  const sashY = iny+inh*0.5 - inh*0.46*FIN.sash;
  const lx=inx+inw*0.5, ly=iny+inh*0.5-MIN*0.004;

  /* ---------------- outside: everything from the whole work, at once ---------------- */
  setAp({ mode:"rect", x:inx, y:iny, w:inw, h:inh, hf:0.70 });
  ctx.save(); clipAp(ctx);

  const s = drawSky();
  const sp = drawSun(t,s);
  drawClouds(s);
  drawLand(t,{});
  drawWires(t, AP.hy-AP.h*0.16, { a:0.75 });
  // the washing line is still there. The pegs are still on it. Nothing hangs.
  const ly2 = AP.hy + AP.h*0.10;
  ctx.strokeStyle=rgba(farColour([64,54,46],26),0.55); ctx.lineWidth=Math.max(1,MIN*0.0015);
  ctx.beginPath();
  for (let i=0;i<=14;i++){ const u=i/14; ctx.lineTo(AP.x+u*AP.w, ly2+Math.sin(u*PI)*MIN*0.012); }
  ctx.stroke();
  for (const u of [0.18,0.34,0.46,0.62,0.78]){
    const x=AP.x+u*AP.w, y=ly2+Math.sin(u*PI)*MIN*0.012;
    ctx.fillStyle=rgba(farColour([148,112,80],26),0.7);
    ctx.fillRect(x-2,y-MIN*0.004,4,MIN*0.013);
  }
  partRole=2;
  drawParticles(t, 0.55, sp?{x:sp.x,y:sp.y,r:H}:null);

  /* ------- the memory, while the latch is held. Both worlds, one frame. ------- */
  if (FIN.memory>0.015){
    const m = FIN.memory;
    // the old air, in this window, over this same landscape
    pastLens(t, AP.cx, AP.cy, Math.max(AP.w,AP.h)*0.85, m*0.92, (tt,ss)=>{
      // the hills are already back because the air is. Add what used to be in it.
      // sheets on the line
      for (let k=0;k<4;k++){
        const u=0.16+k*0.20;
        cloth({ ax:AP.x+u*AP.w, ay:ly2, bx:AP.x+(u+0.15)*AP.w, by:ly2,
                h:AP.h*0.17, col:[248,246,238], ph:k*2.1, folds:4,
                amp:MIN*0.006, windAmp:MIN*0.012, thin:0.8, light:sp, pegs:true, seed:k*13 }, tt);
      }
      // the kite, above the rooftops, exactly where it used to sit
      const kx=AP.x+AP.w*0.66, ky=AP.y+AP.h*0.24;
      ctx.save(); ctx.translate(kx,ky); ctx.rotate(0.16+Math.sin(tt*1.4)*0.05);
      const kz=MIN*0.030;
      ctx.beginPath(); ctx.moveTo(0,-kz); ctx.lineTo(kz*0.66,0); ctx.lineTo(0,kz*1.15); ctx.closePath();
      ctx.fillStyle="rgba(186,56,64,0.95)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,-kz); ctx.lineTo(-kz*0.66,0); ctx.lineTo(0,kz*1.15); ctx.closePath();
      ctx.fillStyle="rgba(214,64,72,0.95)"; ctx.fill();
      ctx.restore();
      ctx.strokeStyle="rgba(60,58,64,0.4)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(kx,ky+kz);
      ctx.quadraticCurveTo(AP.x+AP.w*0.5, AP.y+AP.h*0.62, AP.x+AP.w*0.3, AP.y+AP.h*0.78); ctx.stroke();
      // birds, which no longer come
      for (let k=0;k<5;k++){
        const bx2=AP.x+AP.w*(0.24+k*0.07)+Math.sin(tt*0.5+k)*MIN*0.01;
        const by2=AP.y+AP.h*(0.16+Math.sin(k*1.7)*0.04);
        const f=Math.sin(tt*7+k), wv=MIN*0.008;
        ctx.strokeStyle="rgba(48,50,58,0.6)"; ctx.lineWidth=1.4; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(bx2-wv,by2+f*wv*0.5);
        ctx.quadraticCurveTo(bx2,by2-f*wv,bx2,by2);
        ctx.quadraticCurveTo(bx2,by2-f*wv,bx2+wv,by2+f*wv*0.5); ctx.stroke();
      }
      // and stars, still up there in the daylight, which is impossible and true
      for (let k=0;k<40;k++){
        const hx=hash(k*3.3), hy=hash(k*7.7+1);
        ctx.fillStyle=rgba([255,255,250], 0.5*Math.abs(Math.sin(tt*1.4+k)));
        ctx.beginPath(); ctx.arc(AP.x+hx*AP.w, AP.y+hy*AP.h*0.55, MIN*0.0013,0,TAU); ctx.fill();
      }
    });
  }

  /* particles in the beam, once it is actually open */
  if (FIN.opened>0.08){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    for (let i=0;i<(LOW?26:52);i++){
      const hx=hash(i*4.7+t*0.03), hy=hash(i*9.1+t*0.02);
      ctx.fillStyle=rgba([236,230,214], 0.22*FIN.opened);
      ctx.beginPath(); ctx.arc(AP.x+hx*AP.w, AP.y+hy*AP.h, rnd(0.7,2.1),0,TAU); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
  apFull();

  /* ---------------- the room ---------------- */
  // the light: pale, flat, no warmth in it. This is the whole point.
  const key = mixL([255,204,148], [216,214,206], 0.80);       // was gold, is grey
  const L = { open: openAmt, warm: key, k: 0.26 + openAmt*0.62 };
  const wallBase = mixL([150,142,148],[172,166,164], 0.5);
  const wall = mixL(shade(wallBase, 0.34+L.k*0.62), key, 0.10);

  ctx.save();
  ctx.beginPath(); ctx.rect(0,0,W,H); ctx.rect(inx,iny,inw,inh);
  ctx.fillStyle=rgb(wall); ctx.fill("evenodd");
  ctx.clip("evenodd");

  // the same wallpaper, a little more tired
  ctx.globalAlpha=0.08;
  for (let x=0;x<W;x+=MIN*0.052){ ctx.fillStyle=rgb(shade(wall,0.86)); ctx.fillRect(x,0,MIN*0.026,H); }
  ctx.globalAlpha=0.10;
  for (let y=H*0.02;y<H*0.86;y+=MIN*0.086){
    for (let x=MIN*0.02;x<W;x+=MIN*0.104){
      const yy=y+((x/(MIN*0.104))|0)%2*MIN*0.043;
      ctx.strokeStyle=rgb(shade(wall,0.74)); ctx.lineWidth=1.3;
      ctx.beginPath(); ctx.moveTo(x,yy+MIN*0.010); ctx.lineTo(x,yy-MIN*0.008); ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
  ctx.fillStyle=rgb(shade(wall,0.78)); ctx.fillRect(0,H*0.085,W,MIN*0.008);
  ctx.fillStyle=rgb(shade(wall,0.70)); ctx.fillRect(0,H*0.795,W,MIN*0.016);

  // the pale rectangle on the wall where the drawing used to be taped
  const gx0=W*0.80, gy0=H*0.24, gw0=MIN*0.135, gh0=MIN*0.105;
  ctx.save(); ctx.translate(gx0,gy0); ctx.rotate(0.035);
  ctx.fillStyle=rgba(shade(wall,1.07), 0.75);
  ctx.fillRect(-gw0/2,-gh0/2,gw0,gh0);
  ctx.fillStyle="rgba(238,228,196,0.20)";
  ctx.fillRect(-gw0/2-MIN*0.006,-gh0/2-MIN*0.006,MIN*0.024,MIN*0.011);
  ctx.fillRect(gw0/2-MIN*0.018,-gh0/2-MIN*0.006,MIN*0.024,MIN*0.011);
  ctx.restore();
  spot("gap", gx0, gy0, MIN*0.08, ()=>{
    whisper("It isn't lost. It's over there, by the window.");
    curiosity+=0.3;
  });

  // floor
  const fy=H*0.81;
  const floor=mixL([124,96,72],[136,110,84], L.k*0.4);
  const fg=ctx.createLinearGradient(0,fy,0,H);
  fg.addColorStop(0,rgb(shade(floor,0.70))); fg.addColorStop(1,rgb(shade(floor,0.98)));
  ctx.fillStyle=fg; ctx.fillRect(0,fy,W,H-fy);
  ctx.strokeStyle="rgba(56,38,26,0.28)"; ctx.lineWidth=1;
  for (let i=-3;i<=12;i++){
    const bx2=W*0.5+(i-4.5)*MIN*0.10;
    ctx.beginPath(); ctx.moveTo(lerp(W*0.5,bx2,0.34),fy); ctx.lineTo(lerp(W*0.5,bx2,2.4),H); ctx.stroke();
  }
  // the rug, faded
  ctx.save(); ctx.translate(W*0.5,H*0.93); ctx.scale(1,0.34);
  const rg=ctx.createRadialGradient(0,0,0,0,0,MIN*0.34);
  rg.addColorStop(0,"rgba(156,96,88,0.85)"); rg.addColorStop(0.72,"rgba(132,80,74,0.82)");
  rg.addColorStop(1,"rgba(104,62,60,0.8)");
  ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(0,0,MIN*0.34,0,TAU); ctx.fill();
  ctx.restore();

  // the beam, which is thin and grey now
  const beamA = openAmt*(0.09+FIN.sash*0.16);
  if (beamA>0.008){
    const bx0=inx+inw*0.14, bx1=inx+inw*0.86;
    shaft({ ax:bx0, ay:iny+inh*0.10, bx:bx1, by:iny+inh*0.10,
            cx:bx1-W*0.16, cy:H*1.02, dx:bx0-W*0.30, dy:H*1.02,
            col:mixL(key,[230,228,222],0.5), a:beamA });
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bx0,iny+inh*0.10); ctx.lineTo(bx1,iny+inh*0.10);
    ctx.lineTo(bx1-W*0.16,H*1.02); ctx.lineTo(bx0-W*0.30,H*1.02); ctx.closePath(); ctx.clip();
    partRole=2.4;
    drawParticles(t, 0.85, { x:(bx0+bx1)/2, y:iny, r:H*1.1 }, true);
    ctx.restore();
  }

  /* --- the bed, made. Too neatly. Nobody has slept in it for a while. --- */
  const bx=-W*0.04, by=H*0.60, bw=W*0.40, bh=H*0.21;
  groundShadow(bx+bw*0.5, by+bh+MIN*0.01, bw*0.6, MIN*0.03, 0.24);
  ctx.fillStyle=rgb(shade([88,62,46],0.45+L.k*0.5));
  ctx.fillRect(bx+bw*0.02, by-H*0.13, MIN*0.020, H*0.34);
  ctx.fillRect(bx+bw*0.02, by-H*0.13, bw*0.5, MIN*0.014);
  const blank=mixL([186,190,196], key, 0.14);
  ctx.fillStyle=rgb(shade(blank,0.52+L.k*0.44)); ctx.fillRect(bx,by,bw,bh);
  // one crisp fold, dead straight
  ctx.fillStyle=rgb(shade([238,236,232],0.56+L.k*0.4));
  ctx.fillRect(bx,by+bh*0.10,bw,bh*0.14);
  ctx.strokeStyle="rgba(120,118,120,0.34)"; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.moveTo(bx,by+bh*0.24); ctx.lineTo(bx+bw,by+bh*0.24); ctx.stroke();
  ctx.fillStyle=rgb(shade([242,240,236],0.56+L.k*0.4));
  ctx.beginPath(); ctx.ellipse(bx+bw*0.30,by-MIN*0.004,bw*0.20,MIN*0.030,-0.02,0,TAU); ctx.fill();

  /* --- the bedside table. The clock has stopped. --- */
  const tx=W*0.415, ty=H*0.615, tw=W*0.115, th=H*0.20;
  groundShadow(tx+tw*0.5,ty+th,tw*0.7,MIN*0.022,0.26);
  ctx.fillStyle=rgb(shade([108,80,56],0.46+L.k*0.5)); ctx.fillRect(tx,ty,tw,th);
  ctx.fillStyle=rgb(shade([122,90,62],0.5+L.k*0.46)); ctx.fillRect(tx-MIN*0.006,ty-MIN*0.008,tw+MIN*0.012,MIN*0.012);
  const kx=tx+tw*0.28, ky=ty-MIN*0.030, kr=MIN*0.030;
  ctx.fillStyle=rgb(shade([228,222,210],0.55+L.k*0.42));
  ctx.beginPath(); ctx.arc(kx,ky,kr,0,TAU); ctx.fill();
  ctx.strokeStyle=rgb(shade([86,72,56],0.55+L.k*0.4)); ctx.lineWidth=Math.max(2,kr*0.13); ctx.stroke();
  ctx.fillStyle=rgba([70,62,54],0.6);
  for (let i=0;i<12;i++){ const a=i/12*TAU;
    ctx.beginPath(); ctx.arc(kx+Math.sin(a)*kr*0.76,ky-Math.cos(a)*kr*0.76,kr*(i%3?0.035:0.06),0,TAU); ctx.fill(); }
  // the hands do not move
  ctx.strokeStyle="rgba(56,50,44,0.8)"; ctx.lineWidth=Math.max(2,kr*0.10); ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(kx,ky); ctx.lineTo(kx+Math.sin(1.1)*kr*0.44,ky-Math.cos(1.1)*kr*0.44); ctx.stroke();
  ctx.lineWidth=Math.max(1.4,kr*0.07);
  ctx.beginPath(); ctx.moveTo(kx,ky); ctx.lineTo(kx+Math.sin(3.9)*kr*0.66,ky-Math.cos(3.9)*kr*0.66); ctx.stroke();
  spot("clock2", kx, ky, kr*1.7, ()=>{
    whisper("Nobody wound it."); sfx.chime(523); curiosity+=0.3;
  });
  // the photograph is still there
  const fx2=tx+tw*0.74, fy2=ty-MIN*0.020, fw2=MIN*0.046, fh2=MIN*0.058;
  ctx.save(); ctx.translate(fx2,fy2); ctx.rotate(-0.06);
  ctx.fillStyle=rgb(shade([96,70,48],0.5+L.k*0.44)); ctx.fillRect(-fw2/2,-fh2/2,fw2,fh2);
  const pg2=ctx.createLinearGradient(0,-fh2/2,0,fh2/2);
  pg2.addColorStop(0,"#93b3bc"); pg2.addColorStop(0.52,"#7699a8"); pg2.addColorStop(0.56,"#bfb08a"); pg2.addColorStop(1,"#ad9e78");
  ctx.fillStyle=pg2; ctx.fillRect(-fw2/2+fw2*0.09,-fh2/2+fh2*0.09,fw2*0.82,fh2*0.82);
  ctx.restore();
  spot("photo2", fx2, fy2, MIN*0.05, ()=>{
    memFlash("sea",W*0.5,H*0.42); sfx.chime(784);
    whisper("The same sea. You still haven't been back.");
    curiosity+=0.4;
  });

  /* --- the shelf. Fewer books, tidied. --- */
  const sx=W*0.40, sy=H*0.34, sw=W*0.20;
  ctx.fillStyle=rgb(shade([112,84,58],0.5+L.k*0.44)); ctx.fillRect(sx,sy,sw,MIN*0.012);
  ctx.fillStyle="rgba(0,0,0,0.14)"; ctx.fillRect(sx,sy+MIN*0.012,sw,MIN*0.006);
  let bxx=sx+MIN*0.008;
  for (let i=0;i<5;i++){
    const b=BOOKS[i], bwid=MIN*0.010*b.w, bhh=MIN*0.070*b.h;
    ctx.fillStyle=rgb(shade(gray(b.col,0.3),0.46+L.k*0.46));
    ctx.fillRect(bxx,sy-bhh,bwid,bhh);
    bxx+=bwid+MIN*0.0016;
  }

  /* --- the plant. Still alive. Only just. --- */
  const px2=W*0.935, py2=H*0.74;
  groundShadow(px2,py2+MIN*0.012,MIN*0.06,MIN*0.016,0.28);
  ctx.fillStyle=rgb(shade([136,98,72],0.5+L.k*0.44));
  ctx.beginPath(); ctx.moveTo(px2-MIN*0.030,py2); ctx.lineTo(px2+MIN*0.030,py2);
  ctx.lineTo(px2+MIN*0.024,py2+MIN*0.058); ctx.lineTo(px2-MIN*0.024,py2+MIN*0.058); ctx.closePath(); ctx.fill();
  for (let i=0;i<7;i++){                                  // was eleven
    const droop = 0.30 + (i%3)*0.10;
    const a=-1.75+i*0.26+droop + Math.sin(t*0.9+i)*(0.012+FIN.opened*0.03);
    const len=MIN*(0.055+((i*37)%11)/11*0.032);
    const g2=ctx.createLinearGradient(px2,py2,px2+Math.cos(a)*len,py2+Math.sin(a)*len);
    g2.addColorStop(0,rgb(shade([62,74,48],0.5+L.k*0.44)));
    g2.addColorStop(1,rgb(shade([104,116,68],0.5+L.k*0.44)));
    ctx.strokeStyle=g2; ctx.lineWidth=MIN*0.0065; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(px2,py2-MIN*0.004);
    ctx.quadraticCurveTo(px2+Math.cos(a)*len*0.45,py2+Math.sin(a)*len*0.85,px2+Math.cos(a)*len,py2+Math.sin(a)*len);
    ctx.stroke();
  }
  // dropped leaves on the floor beside it
  for (let i=0;i<4;i++){
    ctx.save();
    ctx.translate(px2-MIN*0.05+i*MIN*0.022, py2+MIN*0.075+Math.sin(i)*MIN*0.006);
    ctx.rotate(i*1.3);
    ctx.fillStyle="rgba(120,108,62,0.7)";
    ctx.beginPath(); ctx.ellipse(0,0,MIN*0.010,MIN*0.004,0,0,TAU); ctx.fill();
    ctx.restore();
  }

  /* --- the object that was never here before --- */
  const ax2=W*0.245, ay2=H*0.905;
  FIN.purifier = lerp(FIN.purifier, 1, 0.02);
  groundShadow(ax2, ay2+MIN*0.008, MIN*0.045, MIN*0.011, 0.3);
  ctx.save();
  ctx.globalAlpha = FIN.purifier;
  const ag=ctx.createLinearGradient(ax2-MIN*0.035,0,ax2+MIN*0.035,0);
  ag.addColorStop(0,"#8e9298"); ag.addColorStop(0.4,"#c3c7cc"); ag.addColorStop(1,"#82868c");
  ctx.fillStyle=ag;
  ctx.beginPath();
  ctx.moveTo(ax2-MIN*0.030,ay2); ctx.lineTo(ax2+MIN*0.030,ay2);
  ctx.lineTo(ax2+MIN*0.026,ay2-MIN*0.115); ctx.lineTo(ax2-MIN*0.026,ay2-MIN*0.115);
  ctx.closePath(); ctx.fill();
  // the grille
  ctx.strokeStyle="rgba(60,64,70,0.55)"; ctx.lineWidth=Math.max(1,MIN*0.0014);
  for (let i=0;i<11;i++){
    const yy=ay2-MIN*0.014-i*MIN*0.0088;
    ctx.beginPath(); ctx.moveTo(ax2-MIN*0.022,yy); ctx.lineTo(ax2+MIN*0.022,yy); ctx.stroke();
  }
  // one small light, breathing
  const lit=0.55+0.45*Math.sin(t*0.9);
  ctx.fillStyle=rgba([120,200,170], 0.5+lit*0.5);
  ctx.beginPath(); ctx.arc(ax2, ay2-MIN*0.104, MIN*0.0035,0,TAU); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation="lighter";
  const lg=ctx.createRadialGradient(ax2,ay2-MIN*0.104,0,ax2,ay2-MIN*0.104,MIN*0.022);
  lg.addColorStop(0,rgba([120,200,170],0.28*lit)); lg.addColorStop(1,rgba([120,200,170],0));
  ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(ax2,ay2-MIN*0.104,MIN*0.022,0,TAU); ctx.fill(); ctx.restore();
  ctx.restore();
  spot("purifier", ax2, ay2-MIN*0.06, MIN*0.07, ()=>{
    sfx.chime(392);
    whisper("This wasn't in the room when you were small.");
    curiosity+=0.5;
  });

  ctx.restore();  // wall clip

  /* ---------------- the window: joinery, dirt, breath ---------------- */
  const frameCol=rgb(shade([58,46,38],0.42+L.k*0.5));
  ctx.save();
  ctx.fillStyle=rgba([18,14,12],0.32);
  ctx.beginPath(); ctx.moveTo(inx,iny); ctx.lineTo(inx+inw,iny);
  ctx.lineTo(inx+inw-MIN*0.012,iny+MIN*0.014); ctx.lineTo(inx+MIN*0.012,iny+MIN*0.014); ctx.closePath(); ctx.fill();
  ctx.restore();

  // grime on the glass, and the marks of somebody wiping it
  ctx.save();
  ctx.beginPath(); ctx.rect(inx,iny,inw,inh*(1-FIN.sash*0.46)); ctx.clip();
  drawGrime(inx,iny,inw,inh, 0.30*(1-FIN.sash*0.4));
  const sheen=ctx.createLinearGradient(inx,iny,inx+inw*0.8,iny+inh);
  sheen.addColorStop(0,"rgba(255,255,255,0.07)"); sheen.addColorStop(1,"rgba(255,255,255,0.03)");
  ctx.fillStyle=sheen; ctx.fillRect(inx,iny,inw,inh);
  // breath, and whatever was drawn in it
  drawFog(inx, iny, inw, inh, 0.85);
  ctx.restore();

  /* ---- the blue patch, and the world that shows through it ---- */
  if (FIN.patch>0.001){
    ctx.save();
    ctx.beginPath(); ctx.rect(inx,iny,inw,inh); ctx.clip();
    // render the remembered world offscreen, then keep only the crayoned pixels
    offscreen(()=>{
      const pm0=AIR.pm, g0=AIR.glow;
      AIR.pm=PAST.pm; AIR.glow=PAST.glow; updateAir();
      setAp({ mode:"rect", x:inx, y:iny, w:inw, h:inh, hf:0.70 });
      const s2=drawSky(); drawSun(t,s2); drawClouds(s2); drawLand(t,{});
      // sheets and kite, in the memory
      for (let k=0;k<4;k++){
        const u=0.16+k*0.20;
        cloth({ ax:AP.x+u*AP.w, ay:ly2, bx:AP.x+(u+0.15)*AP.w, by:ly2,
                h:AP.h*0.17, col:[248,246,238], ph:k*2.1, folds:4, amp:MIN*0.006,
                windAmp:MIN*0.012, thin:0.8, pegs:true, seed:k*13 }, t);
      }
      const kx2=AP.x+AP.w*0.66, ky2=AP.y+AP.h*0.24, kz=MIN*0.030;
      ctx.save(); ctx.translate(kx2,ky2); ctx.rotate(0.16+Math.sin(t*1.4)*0.05);
      ctx.beginPath(); ctx.moveTo(0,-kz); ctx.lineTo(kz*0.66,0); ctx.lineTo(0,kz*1.15); ctx.closePath();
      ctx.fillStyle="rgba(200,58,66,0.96)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,-kz); ctx.lineTo(-kz*0.66,0); ctx.lineTo(0,kz*1.15); ctx.closePath();
      ctx.fillStyle="rgba(220,68,76,0.96)"; ctx.fill();
      ctx.restore();
      AIR.pm=pm0; AIR.glow=g0; updateAir();
      apFull();
    });
    tc.globalCompositeOperation="destination-in";
    tc.drawImage(GLASS,0,0);
    tc.globalCompositeOperation="source-over";
    ctx.drawImage(TMP,0,0);
    // and over the top, the wax itself — you can see it is crayon on glass
    ctx.globalAlpha=0.36; ctx.drawImage(GLASS,0,0); ctx.globalAlpha=1;
    ctx.restore();
  }

  // sash + frame
  ctx.fillStyle=frameCol;
  ctx.fillRect(inx, sashY-MIN*0.011, inw, MIN*0.022);
  ctx.fillRect(inx, iny+inh*0.5+MIN*0.001, inw, MIN*0.008);
  ctx.fillRect(inx+inw*0.5-MIN*0.004, iny, MIN*0.008, inh*0.5);
  ctx.lineWidth=Math.max(10,MIN*0.026); ctx.strokeStyle=frameCol;
  ctx.strokeRect(inx,iny,inw,inh);
  // sill, with what has settled on it
  ctx.fillStyle=rgb(shade([70,56,46],0.46+L.k*0.48));
  ctx.fillRect(wr.x-MIN*0.014, iny+inh, inw+MIN*0.056, MIN*0.026);
  ctx.fillStyle=rgb(shade([86,70,58],0.5+L.k*0.44));
  ctx.fillRect(wr.x-MIN*0.014, iny+inh, inw+MIN*0.056, MIN*0.008);
  drawGrime(wr.x-MIN*0.014, iny+inh, inw+MIN*0.056, MIN*0.026, 0.6);

  // the latch
  if (FIN.sash<0.04){
    ctx.save(); ctx.translate(lx,ly); ctx.rotate(cl01(FIN.latchHold)*PI*0.12);
    const bg2=ctx.createLinearGradient(-MIN*0.02,0,MIN*0.02,0);
    bg2.addColorStop(0,"#6f5730"); bg2.addColorStop(0.45,"#b99f64"); bg2.addColorStop(1,"#67512a");
    ctx.fillStyle=bg2;
    ctx.beginPath(); ctx.ellipse(0,0,MIN*0.011,MIN*0.011,0,0,TAU); ctx.fill();
    ctx.fillRect(-MIN*0.004,-MIN*0.030,MIN*0.008,MIN*0.030);
    ctx.beginPath(); ctx.arc(0,-MIN*0.030,MIN*0.007,0,TAU); ctx.fill();
    ctx.restore();
  }

  /* ---- her hand over yours, while you hold it ---- */
  if (FIN.memory>0.05){
    const m=FIN.memory;
    ctx.save();
    ctx.globalAlpha=m*0.62;
    // your hand
    ctx.fillStyle="rgba(48,40,36,0.55)";
    ctx.beginPath(); ctx.ellipse(lx,ly+MIN*0.008,MIN*0.019,MIN*0.026,0.2,0,TAU); ctx.fill();
    // hers, larger, over it
    ctx.fillStyle="rgba(38,32,34,0.42)";
    ctx.beginPath(); ctx.ellipse(lx-MIN*0.006,ly-MIN*0.004,MIN*0.028,MIN*0.036,0.16,0,TAU); ctx.fill();
    // and her arm, going off the frame
    ctx.strokeStyle="rgba(38,32,34,0.30)"; ctx.lineWidth=MIN*0.030; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(lx-MIN*0.020,ly-MIN*0.006);
    ctx.quadraticCurveTo(W*0.16, H*0.62, W*0.02, H*0.94); ctx.stroke();
    ctx.restore();
  }

  /* ---- the curtains. Same drag. Almost no answer. ---- */
  const rodY=wr.y-MIN*0.014;
  ctx.fillStyle="#6d5238";
  ctx.fillRect(wr.x-MIN*0.036, rodY-MIN*0.006, wr.w+MIN*0.072, MIN*0.010);
  ctx.beginPath(); ctx.arc(wr.x-MIN*0.036,rodY-MIN*0.001,MIN*0.011,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(wr.x+wr.w+MIN*0.036,rodY-MIN*0.001,MIN*0.011,0,TAU); ctx.fill();

  const curCol = mixL(gray([176,74,66],0.22), key, 0.10);   // the red has gone dusty
  const panelW = wr.w*0.56;
  const sway = MIN*0.007*FIN.opened;                        // it was MIN*0.030
  const lA=wr.x-MIN*0.030-FIN.cL*panelW*0.62, lB=lA+panelW*(1-FIN.cL*0.42);
  cloth({ ax:lA, ay:rodY, bx:lB, by:rodY, h:wr.h*1.045,
          col:shade(curCol,0.46+L.k*0.5), ph:0.4, folds:6,
          amp:MIN*0.017*(1-FIN.cL*0.35), windAmp:sway, thin:0.24,
          part:0.55+FIN.cL*0.35, gatherDir:-1, backlit:openAmt*0.5, dust:0.22, seed:1,
          push:(FIN.grab===1&&P.down)?{x:P.x,y:P.y,r:MIN*0.14,k:MIN*0.020}:null }, t);
  const rB=wr.x+wr.w+MIN*0.030+FIN.cR*panelW*0.62, rA=rB-panelW*(1-FIN.cR*0.42);
  cloth({ ax:rA, ay:rodY, bx:rB, by:rodY, h:wr.h*1.045,
          col:shade(curCol,0.44+L.k*0.52), ph:2.6, folds:6,
          amp:MIN*0.017*(1-FIN.cR*0.35), windAmp:sway, thin:0.24,
          part:0.55+FIN.cR*0.35, gatherDir:1, backlit:openAmt*0.5, dust:0.22, seed:2,
          push:(FIN.grab===2&&P.down)?{x:P.x,y:P.y,r:MIN*0.14,k:-MIN*0.020}:null }, t);

  /* ---- the drawing, propped against the wall beside the window ---- */
  if (FIN.seen>0.01){
    buildPaper();
    const dw=MIN*0.28, dh=dw*(PH/PW);
    const dx=W*0.085, dy=H*0.70;
    ctx.save();
    ctx.globalAlpha=FIN.seen;
    ctx.translate(dx,dy); ctx.rotate(-0.10);
    ctx.fillStyle="rgba(0,0,0,0.35)";
    ctx.fillRect(-dw/2+MIN*0.008,-dh/2+MIN*0.010,dw,dh);
    ctx.drawImage(PAPER,-dw/2,-dh/2,dw,dh);
    // the room's flat light on it — but the blue survives it
    ctx.fillStyle=rgba([26,26,32],(1-L.k)*0.34); ctx.fillRect(-dw/2,-dh/2,dw,dh);
    ctx.restore();
    spot("drawing-late", dx, dy, dw*0.45, ()=>{
      memFlash("blue",dx,dy); ripple(dx,dy,[52,120,210],MIN*0.18); sfx.paper();
      whisper("She had it in a drawer this whole time.");
      curiosity+=0.5;
    });

    // the blue crayon, on the sill, waiting
    const cx2=inx+inw*0.16, cy2=iny+inh+MIN*0.006;
    ctx.save();
    ctx.globalAlpha=FIN.seen;
    ctx.translate(cx2,cy2); ctx.rotate(-1.50);
    ctx.fillStyle="#1f5cba"; ctx.fillRect(-MIN*0.010,-MIN*0.030,MIN*0.020,MIN*0.046);
    ctx.fillStyle="rgba(255,255,255,0.18)"; ctx.fillRect(-MIN*0.010,-MIN*0.018,MIN*0.020,MIN*0.007);
    ctx.fillStyle="#2f6fd0";
    ctx.beginPath(); ctx.moveTo(-MIN*0.010,MIN*0.016); ctx.lineTo(MIN*0.010,MIN*0.016);
    ctx.lineTo(MIN*0.004,MIN*0.030); ctx.lineTo(-MIN*0.004,MIN*0.030); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (FIN.crayon){
      ctx.save(); ctx.globalCompositeOperation="lighter";
      const g=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,MIN*0.05);
      g.addColorStop(0,rgba([70,150,240],0.22+0.14*Math.sin(t*2.4))); g.addColorStop(1,rgba([70,150,240],0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx2,cy2,MIN*0.05,0,TAU); ctx.fill(); ctx.restore();
    }
    FIN.crayonAt = { x:cx2, y:cy2 };
  }

  return { wr, inx, iny, inw, inh, sashY, lx, ly, openAmt };
}

/* ---------------------------------------------------------------- interaction */
function finaleInteract(bid, t, dt, geo){
  const { inx, iny, inw, inh, sashY, lx, ly } = geo;

  // ---- part the curtains
  if (bid==="f-curtain"){
    if (P.down && P.active){
      if (!FIN.grab) FIN.grab = P.x<W*0.5 ? 1 : 2;
      if (FIN.grab===1){
        FIN.cL = cl01(Math.max(FIN.cL*0.9, (wrFrom(1)-P.x)/(winRect().w*0.42)));
        if (Math.abs(P.dx)>2 && Math.random()<0.25) sfx.cloth(0.3);
      } else {
        FIN.cR = cl01(Math.max(FIN.cR*0.9, (P.x-wrFrom(2))/(winRect().w*0.42)));
        if (Math.abs(P.dx)>2 && Math.random()<0.25) sfx.cloth(0.3);
      }
    } else FIN.grab=0;
    if (Math.min(FIN.cL,FIN.cR)>0.55) meet("fcurtain");
  }

  // ---- hold the latch. Both worlds. This beat is deliberately long.
  if (bid==="f-both"){
    const near = Math.hypot(P.x-lx,P.y-ly) < MIN*0.14;
    if (P.down && (near || FIN.latchHold>0.05)) FIN.latchHold = Math.min(1.6, FIN.latchHold+dt*0.55);
    else FIN.latchHold = Math.max(0, FIN.latchHold-dt*0.30);
    FIN.memory = lerp(FIN.memory, cl01(FIN.latchHold), 0.045);
    FIN.memPeak = Math.max(FIN.memPeak, FIN.memory);
    if (FIN.memPeak>0.8){
      meet("fhold");
      if (!FOUND["both"]){ FOUND["both"]=true; foundN++; }
    }
  } else if (bid!=="f-curtain"){
    FIN.memory = lerp(FIN.memory, 0, 0.02);
  }

  // ---- open it. It sticks. It takes more than one pull.
  if (bid==="f-open" || bid==="f-crayon" || bid==="f-rest" || bid==="f-end"){
    if (bid==="f-open"){
      if (P.down && P.active && Math.abs(P.y-sashY)<MIN*0.10 && P.x>inx && P.x<inx+inw){
        if (P.dy < -3){
          FIN.sashPulls += -P.dy/H*2.4;
          if (Math.random()<0.10) sfx.thud();
        }
      }
      const want = cl01(FIN.sashPulls/1.8) * 0.40;         // it will not go far
      FIN.sash = lerp(FIN.sash, want, 0.10);
      if (FIN.sash>0.16){
        FIN.opened = lerp(FIN.opened, 1, 0.02);
        meet("fopen");
        if (!FOUND["opened"]){ FOUND["opened"]=true; foundN++; sfx.gust(); }
      }
    } else {
      FIN.opened = lerp(FIN.opened, 1, 0.02);
    }
  }

  // ---- the crayon, on the glass
  if (bid==="f-crayon" || bid==="f-rest" || bid==="f-end"){
    FIN.seen = lerp(FIN.seen, 1, 0.025);
    if (FIN.crayonAt && !FIN.crayon){
      if (P.down && Math.hypot(P.x-FIN.crayonAt.x, P.y-FIN.crayonAt.y)<MIN*0.075){
        FIN.crayon = true; sfx.crayon();
        whisper("Go on.");
      }
    }
    if (bid==="f-crayon" && FIN.patch>0.22) meet("fdraw");
  }

  // breath on the glass whenever you are just standing there
  const onGlass = P.x>inx && P.x<inx+inw && P.y>iny && P.y<iny+inh;
  if (onGlass && !P.down && P.still>1.1 && FIN.sash<0.2){
    const fx=(P.x-inx)/inw*360, fy=(P.y-iny)/inh*360;
    breathe(fx, fy, 46);
    if (BREATH.amt>0.3 && !FOUND["breath"]){ FOUND["breath"]=true; foundN++; sfx.breath(); whisper("You always used to do this."); }
  }
  if (onGlass && P.down && !FIN.crayon && BREATH.amt>0.12){
    const fx=(P.x-inx)/inw*360, fy=(P.y-iny)/inh*360;
    const qx=(P.px-inx)/inw*360, qy=(P.py-iny)/inh*360;
    fogWipe(qx,qy,fx,fy,11);
  }
  fogFade(dt);
}
function wrFrom(side){ const wr=winRect(); return side===1 ? wr.x+wr.w*0.10 : wr.x+wr.w*0.90; }

/* the blue on the glass */
function glassDown(x,y){
  if (!FIN.crayon) return false;
  FIN.lastX=x; FIN.lastY=y; glassTo(x,y); return true;
}
function glassTo(x,y){
  const wr=winRect();
  const inx=wr.x+wr.w*0.055, iny=wr.y+wr.h*0.05, inw=wr.w*0.89, inh=wr.h*0.82;
  if (x<inx||x>inx+inw||y<iny||y>iny+inh){ FIN.lastX=x; FIN.lastY=y; return; }
  // crayon on glass: it skips, it does not flow
  const steps=Math.max(2, Math.ceil(Math.hypot(x-FIN.lastX,y-FIN.lastY)/4));
  for (let i=0;i<=steps;i++){
    const f=i/steps;
    const jx=(Math.random()-0.5)*3, jy=(Math.random()-0.5)*3;
    const xx=lerp(FIN.lastX,x,f)+jx, yy=lerp(FIN.lastY,y,f)+jy;
    gc.fillStyle="rgba(38,104,200,"+rnd(0.30,0.72)+")";
    const r=MIN*(mobile?0.016:0.020)*rnd(0.7,1.15);
    gc.beginPath(); gc.arc(xx,yy,r,0,TAU); gc.fill();
    // wax flecks around the edge
    for (let k=0;k<2;k++){
      gc.fillStyle="rgba(38,104,200,"+rnd(0.1,0.4)+")";
      gc.fillRect(xx+rnd(-r,r), yy+rnd(-r,r), rnd(1,3), rnd(1,3));
    }
  }
  FIN.patch = Math.min(1, FIN.patch + Math.hypot(x-FIN.lastX,y-FIN.lastY)/(MIN*7));
  FIN.lastX=x; FIN.lastY=y;
  if (Math.random()<0.3) sfx.crayon();
}
