/* ============================================================================
   THE PAINT LAYER
   What made the first pass look like an SVG illustration was not a lack of
   photographs. It was flat fills, hard edges, no texture inside a shape, and no
   bloom. This module fixes those four things for the whole piece at once.

     TEXTURE   tileable multi-octave noise, composited as overlay/soft-light on
               every large surface so nothing is one flat colour
     BAKING    terrain is painted once, richly — noise-broken silhouettes,
               internal value breakup, canopies, roof planes, ambient occlusion —
               into offscreen layers, then blitted. Detail becomes free, so it
               can be lavish.
     AIRLIGHT  each baked layer is veiled by its own distance through a scratch
               buffer, which is what gives real aerial perspective
     BLOOM     a downsampled bright-pass, blurred and added back. This is the
               single largest difference between "canvas demo" and "cinematic".
   ========================================================================== */

/* ------------------------------------------------------------------ noise */
function makeNoise(size, oct, gain, warm){
  const c = document.createElement("canvas"); c.width=c.height=size;
  const g = c.getContext("2d");
  const im = g.createImageData(size,size), d = im.data;
  // periodic value noise so the tile wraps
  const per = (x,y,f)=>{
    const xi=Math.floor(x*f), yi=Math.floor(y*f);
    const xf=x*f-xi, yf=y*f-yi;
    const m=(size*f)|0;
    const h=(a,b)=>hash(((a%m)+m)%m*157.31 + ((b%m)+m)%m*311.7);
    const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
    return lerp(lerp(h(xi,yi),h(xi+1,yi),u), lerp(h(xi,yi+1),h(xi+1,yi+1),u), v);
  };
  for (let y=0;y<size;y++){
    for (let x=0;x<size;x++){
      let a=0, amp=0.5, f=4/size;
      for (let o=0;o<(oct||4);o++){ a += per(x,y,f)*amp; amp*=(gain||0.5); f*=2; }
      a = cl01((a-0.5)*1.6+0.5);
      const i=(y*size+x)*4;
      const v=(a*255)|0;
      d[i]   = warm ? Math.min(255,v+14) : v;
      d[i+1] = v;
      d[i+2] = warm ? Math.max(0,v-12) : v;
      d[i+3] = 255;
    }
  }
  g.putImageData(im,0,0);
  return c;
}
let NZ_MOTTLE=null, NZ_FINE=null, NZ_CLOUD=null;
function buildNoise(){
  NZ_MOTTLE = makeNoise(LOW?128:256, 5, 0.52, true);
  NZ_FINE   = makeNoise(128, 3, 0.42, false);
  NZ_CLOUD  = makeNoise(LOW?128:256, 6, 0.58, false);
}
/* lay texture over a region. mode 'overlay' breaks up value; 'soft-light' is
   gentler; 'multiply' adds grime. */
function texture(nz, x,y,w,h, a, scale, mode, ox, oy){
  if (a<0.012) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = mode||"overlay";
  ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
  const s = (nz.width)*(scale||1);
  const x0 = x - ((ox||0)%s) - s, y0 = y - ((oy||0)%s) - s;
  for (let yy=y0; yy<y+h+s; yy+=s)
    for (let xx=x0; xx<x+w+s; xx+=s)
      ctx.drawImage(nz, xx, yy, s, s);
  ctx.restore();
}

/* ------------------------------------------------------------------ scratch */
const SC = document.createElement("canvas"); const sctx = SC.getContext("2d");
let BAKE_S = 0.62;
function scFit(){
  const w = Math.max(2,(W*BAKE_S)|0), h = Math.max(2,(H*BAKE_S)|0);
  if (SC.width!==w || SC.height!==h){ SC.width=w; SC.height=h; }
}

/* ============================================================================
   BAKED TERRAIN
   Four layers, painted properly, once.
   ========================================================================== */
const TERR = { key:"", hills:null, town:null, trees:null, roofs:null, hy:0 };

function newLayer(){
  const c=document.createElement("canvas");
  c.width=Math.max(2,(W*BAKE_S)|0); c.height=Math.max(2,(H*BAKE_S)|0);
  return c;
}
/* an edge broken by noise, so no silhouette is ever a clean curve */
function ridgeLine(g, pts, yBase, rough, seed){
  g.beginPath();
  g.moveTo(pts[0][0], yBase);
  for (let i=0;i<pts.length;i++){
    const p=pts[i];
    g.lineTo(p[0], p[1] + (fbm(p[0]*0.02+seed,4)-0.5)*rough);
  }
  g.lineTo(pts[pts.length-1][0], yBase);
  g.closePath();
}

/* ------------------------------------------------------------------ trees
   A tree is a trunk, a few boughs, and foliage built from many small irregular
   masses that are lighter where the sky reaches them. Never a cone or a circle.
   Five species, because a row of identical trees is the thing that most makes a
   landscape look drawn rather than found.
*/
function paintTree(g, x, base, h, kind, tint){
  const w = h*(kind==="poplar"?0.16: kind==="pine"?0.42: kind==="willow"?0.62:0.72);
  const dark = mixL([34,52,38],[56,74,42], tint);
  const mid  = mixL([58,88,50],[98,122,56], tint);
  const lite = mixL([126,152,74],[176,188,98], tint);

  // trunk, tapering, never straight
  const lean = sr(-0.10,0.10);
  g.strokeStyle=rgb(mixL([56,44,36],[86,70,54],tint));
  g.lineWidth=Math.max(1, h*(kind==="poplar"?0.030:0.052));
  g.lineCap="round";
  g.beginPath();
  g.moveTo(x, base);
  g.quadraticCurveTo(x+lean*h*0.3, base-h*0.30, x+lean*h*0.5, base-h*0.52);
  g.stroke();
  // boughs
  const nb = kind==="poplar"?3:5;
  g.lineWidth=Math.max(1,h*0.020);
  for (let i=0;i<nb;i++){
    const f=0.30+i/nb*0.52;
    const dir = (i%2?1:-1)*sr(0.5,1);
    g.beginPath();
    g.moveTo(x+lean*h*f*0.9, base-h*f);
    g.quadraticCurveTo(x+dir*w*0.24, base-h*(f+0.10), x+dir*w*0.40, base-h*(f+0.16));
    g.stroke();
  }

  // foliage masses
  const n = kind==="poplar"? 34 : 54;
  const puffs=[];
  for (let i=0;i<n;i++){
    let fx, fy, rr;
    if (kind==="poplar"){
      const f=sr(0,1);
      fx = x + sr(-w,w)*(1.05-Math.abs(f-0.4)*0.7);
      fy = base - h*(0.30+f*0.70);
      rr = h*sr(0.045,0.085)*(1-f*0.25);
    } else if (kind==="pine"){
      const tier=(sr(0,4))|0;
      const f=0.32+tier*0.17;
      fx = x + sr(-w,w)*(1-f*0.55);
      fy = base - h*(f+sr(-0.03,0.03));
      rr = h*sr(0.05,0.10)*(1-f*0.4);
    } else if (kind==="willow"){
      const f=sr(0,1);
      fx = x + sr(-w,w);
      fy = base - h*(0.34+f*0.52);
      rr = h*sr(0.05,0.10);
    } else {
      // broadleaf: a lumpy dome, wider than tall, with gaps
      const a=sr(0,TAU), rad=Math.pow(srnd(),0.62);
      fx = x + Math.cos(a)*w*rad;
      fy = base - h*0.66 + Math.sin(a)*h*0.24*rad;
      rr = h*sr(0.055,0.115)*(1-rad*0.3);
    }
    puffs.push({fx,fy,rr, k:sr(0,1)});
  }
  puffs.sort((a,b)=>b.fy-a.fy);      // lower/darker first
  for (const p of puffs){
    const up = cl01((base-h*0.30 - p.fy)/(h*0.62));
    const col = up>0.62 ? mixL(mid,lite,(up-0.62)/0.38) : mixL(dark,mid,up/0.62);
    g.fillStyle=rgba(col, 0.92);
    g.beginPath();
    g.ellipse(p.fx, p.fy, p.rr*sr(1.0,1.4), p.rr*sr(0.7,1.0), sr(-0.6,0.6), 0, TAU);
    g.fill();
  }
  // willows weep
  if (kind==="willow"){
    g.strokeStyle=rgba(mid,0.5); g.lineWidth=Math.max(1,h*0.008);
    for (let i=0;i<16;i++){
      const sx=x+sr(-w,w), sy=base-h*sr(0.55,0.80);
      g.beginPath(); g.moveTo(sx,sy);
      g.quadraticCurveTo(sx+sr(-4,4), sy+h*0.18, sx+sr(-8,8), sy+h*sr(0.24,0.40));
      g.stroke();
    }
  }
  // a couple of sky holes punched through, which is what stops it reading solid
  for (let i=0;i<3;i++){
    const a=sr(0,TAU), rad=sr(0.2,0.7);
    g.save(); g.globalCompositeOperation="destination-out";
    g.beginPath();
    g.ellipse(x+Math.cos(a)*w*rad, base-h*0.64+Math.sin(a)*h*0.20*rad,
              h*sr(0.012,0.028), h*sr(0.010,0.022), sr(0,PI),0,TAU);
    g.fill(); g.restore();
  }
  // ambient occlusion under the canopy and at the root
  const ao=g.createRadialGradient(x,base,0,x,base,w*1.5);
  ao.addColorStop(0,"rgba(22,30,20,0.40)"); ao.addColorStop(1,"rgba(22,30,20,0)");
  g.fillStyle=ao; g.beginPath(); g.ellipse(x,base,w*1.5,h*0.05,0,0,TAU); g.fill();
}

/* a hedgerow: a long lumpy mass with the odd tree standing out of it */
function paintHedge(g, y, x0, x1, thick, tint, withTrees){
  const dark=mixL([40,58,34],[54,70,38],tint), mid=mixL([64,90,44],[92,114,50],tint);
  for (let x=x0; x<x1; x+=thick*0.34){
    const bump = fbm(x*0.02, 4);
    const hh = thick*(0.62+bump*0.9);
    const up = srnd();
    g.fillStyle=rgba(up>0.55?mid:dark, 0.95);
    g.beginPath();
    g.ellipse(x, y-hh*0.4, thick*sr(0.35,0.62), hh*sr(0.5,0.8), sr(-0.4,0.4),0,TAU);
    g.fill();
  }
  // a lighter top edge, where the sky hits it
  for (let x=x0; x<x1; x+=thick*0.5){
    const bump=fbm(x*0.02,4);
    g.fillStyle=rgba(mixL(mid,[168,184,98],0.5),0.5);
    g.beginPath();
    g.ellipse(x, y-thick*(0.62+bump*0.9)*0.78, thick*0.30, thick*0.18, 0,0,TAU); g.fill();
  }
  if (withTrees){
    for (let x=x0+sr(0,thick*8); x<x1; x+=sr(thick*7, thick*20))
      paintTree(g, x, y+thick*0.2, thick*sr(3.2,6.0), pick(["oak","oak","willow","pine"]), sr(0,1));
  }
}

function bakeTerrain(){
  const key = (W|0)+"x"+(H|0);
  if (TERR.key===key) return;
  TERR.key=key;
  const bw = Math.max(2,(W*BAKE_S)|0), bh = Math.max(2,(H*BAKE_S)|0);
  const hy = bh*0.66;
  TERR.hy = hy;

  /* ================================================== distant hills + farmland
     Not three green humps. Ranges with woodland on their flanks, fields divided
     by hedgerows, a pale lane switchbacking up one of them, and a quarry scar —
     the sort of country somebody actually grew up looking at.
  */
  {
    const c = TERR.hills = newLayer();
    const g = c.getContext("2d");
    _sd = 8891;
    for (let band=0; band<4; band++){
      const depth = band/3;
      const base = hy - band*bh*0.010;
      const amp  = bh*(0.100 - band*0.017);
      // hue steps, not just value steps: the farthest range is frankly blue,
      // the nearest frankly green. This is what makes depth read at a glance.
      const col  = mixL([58,92,104],[122,146,124], (1-depth)*0.85);
      const pts=[];
      for (let x=-20; x<=bw+20; x+=5){
        const n  = fbm(x*0.0014 + band*7.7, 5);
        const n2 = fbm(x*0.0058 + band*3.1, 4);
        const n3 = fbm(x*0.0210 + band*5.5, 3);
        pts.push([x, base - (n*amp + n2*amp*0.34 + n3*amp*0.10) - amp*0.22]);
      }
      ridgeLine(g, pts, hy+bh*0.04, bh*0.006, band*11);
      const lg = g.createLinearGradient(0, base-amp*1.5, 0, hy+bh*0.03);
      lg.addColorStop(0,   rgb(shade(col,1.14)));
      lg.addColorStop(0.30,rgb(col));
      lg.addColorStop(1,   rgb(shade(col,0.70)));
      g.fillStyle=lg; g.fill();

      g.save(); g.clip();
      // ---- fields: irregular quadrilateral patches at slightly different values
      const nf = 26 - band*5;
      for (let i=0;i<nf;i++){
        const fx=sr(-bw*0.05,bw*1.05), fy=base-sr(amp*0.05, amp*1.15);
        const fw2=sr(bw*0.03,bw*0.11), fh2=sr(bh*0.006,bh*0.024);
        const crop = srnd();
        const fc = crop<0.30 ? mixL(col,[176,168,104],0.42)      // stubble
                 : crop<0.55 ? mixL(col,[104,130,68],0.34)       // pasture
                 : crop<0.78 ? mixL(col,[86,104,60],0.30)        // dark crop
                             : mixL(col,[142,150,96],0.30);      // hay
        g.fillStyle=rgba(fc, 0.55);
        g.beginPath();
        g.moveTo(fx, fy);
        g.lineTo(fx+fw2*sr(0.8,1.2), fy+sr(-fh2*0.4,fh2*0.4));
        g.lineTo(fx+fw2*sr(0.7,1.1), fy+fh2);
        g.lineTo(fx+sr(-fw2*0.1,fw2*0.2), fy+fh2*sr(0.8,1.2));
        g.closePath(); g.fill();
        // the hedge along its lower edge
        g.strokeStyle=rgba(mixL(col,[38,54,32],0.6), 0.5);
        g.lineWidth=Math.max(0.7, bh*0.0016);
        g.beginPath(); g.moveTo(fx, fy+fh2*sr(0.8,1.2));
        g.lineTo(fx+fw2*sr(0.7,1.1), fy+fh2); g.stroke();
      }
      // ---- woodland massing on the flanks
      const nw = 16 - band*3;
      for (let i=0;i<nw;i++){
        const wx=sr(0,bw), wy=base-sr(0, amp*0.95);
        const wr=sr(bh*0.008, bh*0.030);
        g.fillStyle=rgba(mixL(col,[40,60,38],0.55), 0.55);
        for (let k=0;k<10;k++){
          g.beginPath();
          g.ellipse(wx+sr(-wr,wr)*1.6, wy+sr(-wr,wr)*0.45, wr*sr(0.3,0.6), wr*sr(0.2,0.4), 0,0,TAU);
          g.fill();
        }
      }
      // ---- a lane, pale, going up and over
      if (band===1){
        g.strokeStyle="rgba(214,204,176,0.28)";
        g.lineWidth=Math.max(1,bh*0.0026);
        g.beginPath();
        let lx=sr(bw*0.2,bw*0.7), ly=hy+bh*0.01;
        g.moveTo(lx,ly);
        for (let k=0;k<7;k++){
          lx += sr(-bw*0.05, bw*0.07); ly -= amp*0.16;
          g.lineTo(lx,ly);
        }
        g.stroke();
      }
      // ---- a quarry face on one hill: bare pale rock, which reads as human use
      if (band===0){
        const qx=sr(bw*0.55,bw*0.85), qy=base-amp*0.55;
        g.fillStyle="rgba(196,186,166,0.30)";
        g.beginPath();
        g.moveTo(qx,qy);
        g.lineTo(qx+bw*0.045, qy-bh*0.006);
        g.lineTo(qx+bw*0.052, qy+bh*0.016);
        g.lineTo(qx-bw*0.004, qy+bh*0.020);
        g.closePath(); g.fill();
        g.strokeStyle="rgba(150,140,124,0.28)"; g.lineWidth=1;
        for (let k=1;k<4;k++){
          g.beginPath();
          g.moveTo(qx+bw*0.002, qy+bh*0.005*k);
          g.lineTo(qx+bw*0.048, qy+bh*0.005*k-bh*0.002); g.stroke();
        }
      }
      // ---- value breakup and hollows
      g.globalAlpha=0.46; g.globalCompositeOperation="overlay";
      const s=NZ_MOTTLE.width*(1.5-depth*0.6);
      for (let yy=base-amp*1.7; yy<hy+bh*0.04; yy+=s)
        for (let xx=-s; xx<bw+s; xx+=s) g.drawImage(NZ_MOTTLE,xx,yy,s,s);
      g.globalAlpha=1; g.globalCompositeOperation="source-over";
      for (let i=0;i<44;i++){
        const x=sr(0,bw), y=base-sr(0,amp*1.1), r=sr(bh*0.010,bh*0.052);
        const rg=g.createRadialGradient(x,y,0,x,y,r);
        rg.addColorStop(0, rgba(shade(col,0.68), 0.30)); rg.addColorStop(1, rgba(col,0));
        g.fillStyle=rg; g.beginPath(); g.ellipse(x,y,r*1.7,r*0.6,0,0,TAU); g.fill();
      }
      // ---- crest rim light
      g.globalCompositeOperation="lighter";
      g.strokeStyle=rgba([255,246,220], 0.11-depth*0.03); g.lineWidth=1.5;
      g.beginPath();
      for (let i=0;i<pts.length;i++){ const p=pts[i];
        const yy=p[1]+(fbm(p[0]*0.02+band*11,4)-0.5)*bh*0.006;
        if(i===0)g.moveTo(p[0],yy); else g.lineTo(p[0],yy); }
      g.stroke();
      g.restore();
    }
  }

  /* ================================================== the town
     A place with a history: a church, a mill chimney, a water tower, terraces,
     a gasholder, pylons, and a school with a flag. Buildings have extensions and
     lean-tos, because nothing real is one rectangle.
  */
  {
    const c = TERR.town = newLayer();
    const g = c.getContext("2d");
    _sd = 4407;
    const base = hy + bh*0.040;

    // a treeline behind the town, so it sits in something
    paintHedge(g, base-bh*0.004, -bw*0.05, bw*1.05, bh*0.011, 0.35, false);

    const blocks=[];
    for (let i=0;i<46;i++)
      blocks.push({ x:sr(-0.06,1.06)*bw, w:sr(0.010,0.038)*bw, h:sr(0.014,0.058)*bh,
                    k:sr(0,1), ext:srnd()<0.45, kind:"block" });
    blocks.push({ x:0.505*bw, w:0.026*bw, h:0.086*bh, kind:"tower" });
    blocks.push({ x:0.775*bw, w:0.070*bw, h:0.036*bh, kind:"school" });
    blocks.push({ x:0.190*bw, w:0.011*bw, h:0.104*bh, kind:"chimney" });
    blocks.push({ x:0.345*bw, w:0.028*bw, h:0.070*bh, kind:"church" });
    blocks.push({ x:0.635*bw, w:0.040*bw, h:0.030*bh, kind:"gasholder" });
    blocks.push({ x:0.880*bw, w:0.020*bw, h:0.062*bh, kind:"pylon" });
    blocks.push({ x:0.070*bw, w:0.020*bw, h:0.058*bh, kind:"pylon" });
    blocks.sort((a,b)=>a.h-b.h);

    for (const b of blocks){
      const col = mixL([86,104,124],[128,130,140], b.k||0.5);
      const top = base-b.h;
      if (b.kind==="tower"){
        g.strokeStyle=rgb(shade(col,0.78)); g.lineWidth=Math.max(1,b.w*0.09);
        g.beginPath();
        g.moveTo(b.x-b.w*0.44,base); g.lineTo(b.x-b.w*0.13,base-b.h*0.58);
        g.moveTo(b.x+b.w*0.44,base); g.lineTo(b.x+b.w*0.13,base-b.h*0.58);
        g.moveTo(b.x-b.w*0.32,base-b.h*0.28); g.lineTo(b.x+b.w*0.32,base-b.h*0.28);
        g.moveTo(b.x-b.w*0.38,base-b.h*0.14); g.lineTo(b.x+b.w*0.24,base-b.h*0.42);
        g.stroke();
        const tg=g.createLinearGradient(b.x-b.w*0.6,0,b.x+b.w*0.6,0);
        tg.addColorStop(0,rgb(shade(col,0.66))); tg.addColorStop(0.42,rgb(shade(col,1.14)));
        tg.addColorStop(1,rgb(shade(col,0.74)));
        g.fillStyle=tg;
        g.beginPath();
        g.moveTo(b.x-b.w*0.58, base-b.h*0.58);
        g.quadraticCurveTo(b.x-b.w*0.64, base-b.h*0.86, b.x-b.w*0.38, base-b.h*0.95);
        g.lineTo(b.x+b.w*0.38, base-b.h*0.95);
        g.quadraticCurveTo(b.x+b.w*0.64, base-b.h*0.86, b.x+b.w*0.58, base-b.h*0.58);
        g.closePath(); g.fill();
        g.fillStyle=rgb(shade(col,1.24));
        g.beginPath(); g.ellipse(b.x, base-b.h*0.95, b.w*0.40, b.h*0.045,0,0,TAU); g.fill();
        // streaked with rust
        g.strokeStyle="rgba(126,86,56,0.22)"; g.lineWidth=1;
        for (let k=0;k<5;k++){
          const sx=b.x+sr(-b.w*0.5,b.w*0.5);
          g.beginPath(); g.moveTo(sx, base-b.h*0.90); g.lineTo(sx+sr(-1,1), base-b.h*0.60); g.stroke();
        }
      } else if (b.kind==="church"){
        // nave + a spire with a weathercock
        g.fillStyle=rgb(shade(col,0.92));
        g.fillRect(b.x-b.w*0.5, base-b.h*0.42, b.w, b.h*0.42);
        g.fillStyle=rgb(shade(col,0.80));
        g.beginPath(); g.moveTo(b.x-b.w*0.54,base-b.h*0.42);
        g.lineTo(b.x, base-b.h*0.58); g.lineTo(b.x+b.w*0.54, base-b.h*0.42); g.closePath(); g.fill();
        // tower
        g.fillStyle=rgb(shade(col,1.06));
        g.fillRect(b.x-b.w*0.20, base-b.h*0.80, b.w*0.40, b.h*0.80);
        g.fillStyle=rgb(shade(col,0.72));
        g.beginPath(); g.moveTo(b.x-b.w*0.24,base-b.h*0.80);
        g.lineTo(b.x, base-b.h*1.34); g.lineTo(b.x+b.w*0.24, base-b.h*0.80); g.closePath(); g.fill();
        g.strokeStyle=rgb(shade(col,1.3)); g.lineWidth=1;
        g.beginPath(); g.moveTo(b.x,base-b.h*1.34); g.lineTo(b.x,base-b.h*1.42); g.stroke();
        g.fillStyle=rgba(shade(col,0.5),0.8);
        g.fillRect(b.x-b.w*0.06, base-b.h*0.72, b.w*0.12, b.h*0.16);
      } else if (b.kind==="gasholder"){
        // a lattice drum, the sort of thing that gets demolished
        g.strokeStyle=rgba(shade(col,0.7),0.85); g.lineWidth=1;
        g.beginPath(); g.ellipse(b.x, base-b.h, b.w*0.5, b.h*0.16, 0,0,TAU); g.stroke();
        g.beginPath(); g.ellipse(b.x, base, b.w*0.5, b.h*0.16, 0,0,TAU); g.stroke();
        for (let k=0;k<=8;k++){
          const a=k/8*PI - PI*0.5;
          const sx=b.x+Math.sin(a)*b.w*0.5;
          g.beginPath(); g.moveTo(sx, base-b.h+Math.cos(a)*0); g.lineTo(sx, base); g.stroke();
        }
        g.fillStyle=rgba(shade(col,0.9),0.28);
        g.fillRect(b.x-b.w*0.5, base-b.h, b.w, b.h);
      } else if (b.kind==="pylon"){
        g.strokeStyle=rgba(shade(col,0.66),0.8); g.lineWidth=Math.max(0.8,b.w*0.05);
        const tw=b.w*0.5, tw2=b.w*0.16;
        g.beginPath();
        g.moveTo(b.x-tw, base); g.lineTo(b.x-tw2, base-b.h);
        g.moveTo(b.x+tw, base); g.lineTo(b.x+tw2, base-b.h);
        for (let k=1;k<6;k++){
          const f=k/6, yy=base-b.h*f;
          const ww=lerp(tw,tw2,f);
          g.moveTo(b.x-ww,yy); g.lineTo(b.x+ww,yy);
        }
        // cross arms
        g.moveTo(b.x-b.w*0.8, base-b.h*0.62); g.lineTo(b.x+b.w*0.8, base-b.h*0.62);
        g.moveTo(b.x-b.w*0.62, base-b.h*0.84); g.lineTo(b.x+b.w*0.62, base-b.h*0.84);
        g.stroke();
      } else if (b.kind==="school"){
        const sg=g.createLinearGradient(b.x-b.w/2,0,b.x+b.w/2,0);
        sg.addColorStop(0,rgb(shade(col,0.70))); sg.addColorStop(1,rgb(shade(col,1.08)));
        g.fillStyle=sg; g.fillRect(b.x-b.w/2, top, b.w, b.h);
        g.fillStyle=rgb(shade(col,0.84));
        g.beginPath(); g.moveTo(b.x-b.w*0.56,top); g.lineTo(b.x,top-b.h*0.44);
        g.lineTo(b.x,top); g.closePath(); g.fill();
        g.fillStyle=rgb(shade(col,1.16));
        g.beginPath(); g.moveTo(b.x+b.w*0.56,top); g.lineTo(b.x,top-b.h*0.44);
        g.lineTo(b.x,top); g.closePath(); g.fill();
        g.fillStyle=rgb(shade(col,0.9));
        g.fillRect(b.x+b.w*0.42, top-b.h*1.0, Math.max(1,b.w*0.018), b.h*1.0);
        g.fillStyle="rgba(190,90,80,0.5)";
        g.fillRect(b.x+b.w*0.435, top-b.h*1.0, b.w*0.05, b.h*0.14);
        g.fillStyle=rgba(shade(col,0.54),0.68);
        for (let i=0;i<8;i++) g.fillRect(b.x-b.w*0.44+i*b.w*0.112, top+b.h*0.30, b.w*0.048, b.h*0.32);
      } else if (b.kind==="chimney"){
        const cg=g.createLinearGradient(b.x-b.w/2,0,b.x+b.w/2,0);
        cg.addColorStop(0,rgb(shade(col,0.62))); cg.addColorStop(0.48,rgb(shade(col,1.06)));
        cg.addColorStop(1,rgb(shade(col,0.70)));
        g.fillStyle=cg;
        g.beginPath();
        g.moveTo(b.x-b.w*0.78,base); g.lineTo(b.x-b.w*0.32,top);
        g.lineTo(b.x+b.w*0.32,top); g.lineTo(b.x+b.w*0.78,base);
        g.closePath(); g.fill();
        g.fillStyle=rgb(shade(col,1.12)); g.fillRect(b.x-b.w*0.40,top-b.h*0.03,b.w*0.80,b.h*0.030);
        // brick courses
        g.strokeStyle="rgba(40,44,52,0.12)"; g.lineWidth=1;
        for (let k=1;k<9;k++){
          const f=k/9, yy=lerp(base,top,f), ww=lerp(b.w*0.78,b.w*0.32,f);
          g.beginPath(); g.moveTo(b.x-ww,yy); g.lineTo(b.x+ww,yy); g.stroke();
        }
      } else {
        // an ordinary building, with a lean-to on one side and a pitched roof
        const bg=g.createLinearGradient(b.x-b.w/2,0,b.x+b.w/2,0);
        bg.addColorStop(0,rgb(shade(col,0.66)));
        bg.addColorStop(0.52,rgb(shade(col,1.06)));
        bg.addColorStop(1,rgb(shade(col,0.78)));
        g.fillStyle=bg; g.fillRect(b.x-b.w/2, top, b.w, b.h);
        if (b.k>0.5){
          // pitched
          g.fillStyle=rgb(shade(col,0.74));
          g.beginPath(); g.moveTo(b.x-b.w*0.56,top); g.lineTo(b.x,top-b.h*0.30);
          g.lineTo(b.x,top); g.closePath(); g.fill();
          g.fillStyle=rgb(shade(col,1.14));
          g.beginPath(); g.moveTo(b.x+b.w*0.56,top); g.lineTo(b.x,top-b.h*0.30);
          g.lineTo(b.x,top); g.closePath(); g.fill();
        } else {
          g.fillStyle=rgb(shade(col,1.18));
          g.fillRect(b.x-b.w*0.54, top-b.h*0.04, b.w*1.08, Math.max(1,b.h*0.05));
        }
        if (b.ext){
          const ew=b.w*sr(0.35,0.6), eh=b.h*sr(0.35,0.6);
          const side = srnd()<0.5?-1:1;
          g.fillStyle=rgb(shade(col,0.86));
          g.fillRect(b.x+side*b.w*0.5 - (side<0?ew:0), base-eh, ew, eh);
          g.fillStyle=rgb(shade(col,1.0));
          g.fillRect(b.x+side*b.w*0.5 - (side<0?ew:0), base-eh-b.h*0.02, ew, b.h*0.03);
        }
        g.fillStyle=rgba(shade(col,0.50),0.55);
        const cols=Math.max(1,(b.w/(bw*0.0058))|0);
        for (let cx2=0;cx2<cols;cx2++)
          for (let ry=0;ry<4;ry++){
            if (hash(b.x*31+cx2*7+ry*13)<0.42) continue;
            g.fillRect(b.x-b.w*0.40+cx2*(b.w*0.80/cols), top+b.h*(0.14+ry*0.20), b.w*0.5/cols, b.h*0.12);
          }
      }
      const ao=g.createLinearGradient(0,base-b.h*0.12,0,base+bh*0.012);
      ao.addColorStop(0,"rgba(24,28,36,0)"); ao.addColorStop(1,"rgba(24,28,36,0.36)");
      g.fillStyle=ao; g.fillRect(b.x-b.w*0.9, base-b.h*0.12, b.w*1.8, b.h*0.12+bh*0.012);
    }
    // the wires between the pylons
    g.strokeStyle="rgba(60,66,76,0.34)"; g.lineWidth=1;
    for (let k=0;k<3;k++){
      const yy=base-bh*0.062*0.62-k*bh*0.006;
      g.beginPath(); g.moveTo(0.070*bw, yy);
      g.quadraticCurveTo(0.475*bw, yy+bh*0.020, 0.880*bw, yy); g.stroke();
    }
    g.save(); g.globalAlpha=0.32; g.globalCompositeOperation="overlay";
    const s=NZ_FINE.width*0.85;
    for (let yy=hy-bh*0.14; yy<base+bh*0.02; yy+=s)
      for (let xx=-s; xx<bw+s; xx+=s) g.drawImage(NZ_FINE,xx,yy,s,s);
    g.restore();
  }

  /* ================================================== the middle distance
     Trees of several species, a hedgerow, and the allotments — the layer that
     stops the town sitting straight on the hills.
  */
  {
    const c = TERR.trees = newLayer();
    const g = c.getContext("2d");
    _sd = 60613;
    const base = hy + bh*0.062;
    paintHedge(g, base, -bw*0.06, bw*1.06, bh*0.014, 0.5, false);
    // the poplar row — still there, but now among other things
    for (let i=0;i<15;i++){
      const x=(0.30+i*0.0172)*bw + sr(-0.004,0.004)*bw;
      paintTree(g, x, base+bh*0.004, bh*sr(0.070,0.098), "poplar", sr(0.2,0.8));
    }
    // and other species scattered along the field edge
    const kinds=["oak","oak","willow","pine","oak"];
    for (let i=0;i<13;i++){
      const x=sr(-0.04,1.04)*bw;
      if (x>0.28*bw && x<0.56*bw) continue;         // leave the poplars alone
      paintTree(g, x, base+bh*sr(0,0.008), bh*sr(0.042,0.088), kinds[(sr(0,kinds.length))|0], sr(0,1));
    }
    // allotments: sheds, a greenhouse, bean rows, a water butt
    const ax=sr(0.60,0.72)*bw;
    for (let i=0;i<5;i++){
      const sx=ax+i*bw*0.026+sr(-4,4), sy=base+bh*0.004;
      const sw2=bw*sr(0.010,0.017), sh2=bh*sr(0.010,0.017);
      g.fillStyle=rgb(mixL([96,80,62],[128,108,80],sr(0,1)));
      g.fillRect(sx,sy-sh2,sw2,sh2);
      g.fillStyle=rgb([70,60,50]);
      g.beginPath(); g.moveTo(sx-sw2*0.12,sy-sh2); g.lineTo(sx+sw2*0.5,sy-sh2*1.34);
      g.lineTo(sx+sw2*1.12,sy-sh2); g.closePath(); g.fill();
    }
    g.fillStyle="rgba(206,224,226,0.42)";
    g.fillRect(ax-bw*0.020, base-bh*0.014, bw*0.017, bh*0.014);
    g.strokeStyle="rgba(120,130,126,0.5)"; g.lineWidth=1;
    g.strokeRect(ax-bw*0.020, base-bh*0.014, bw*0.017, bh*0.014);
    for (let i=0;i<7;i++){
      const bx=ax+bw*0.028+i*bw*0.004;
      g.strokeStyle="rgba(80,104,58,0.6)"; g.lineWidth=1;
      g.beginPath(); g.moveTo(bx, base+bh*0.003); g.lineTo(bx+sr(-2,2), base-bh*0.011); g.stroke();
    }
  }

  /* ================================================== the near street
     Where people are. Aerials, satellite dishes, a lean-to, a neighbour's
     washing line with two things on it, a wheelie bin, moss on the tiles.
  */
  {
    const c = TERR.roofs = newLayer();
    const g = c.getContext("2d");
    _sd = 31337;
    const base = hy + bh*0.092;
    const hs=[];
    for (let i=0;i<22;i++)
      hs.push({ x:sr(-0.08,1.08)*bw, w:sr(0.042,0.110)*bw, h:sr(0.022,0.052)*bh,
                pitch:sr(0.36,0.70), flat:srnd()<0.18, k:sr(0,1),
                aerial:srnd()<0.55, dish:srnd()<0.35, wash:srnd()<0.28 });
    hs.sort((a,b)=>a.h-b.h);
    for (const r of hs){
      const wall = mixL([88,80,74],[126,110,94], r.k);
      const roof = mixL([66,60,62],[112,86,74], r.k);
      const top = base - r.h;
      const wg=g.createLinearGradient(0,top,0,base);
      wg.addColorStop(0,rgb(shade(wall,1.08))); wg.addColorStop(1,rgb(shade(wall,0.68)));
      g.fillStyle=wg; g.fillRect(r.x-r.w/2, top, r.w, r.h);
      // brickwork
      g.strokeStyle="rgba(40,34,30,0.10)"; g.lineWidth=1;
      for (let k=1;k<7;k++){
        const yy=top+r.h*k/7;
        g.beginPath(); g.moveTo(r.x-r.w/2,yy); g.lineTo(r.x+r.w/2,yy); g.stroke();
      }
      if (r.flat){
        g.fillStyle=rgb(shade(roof,1.12)); g.fillRect(r.x-r.w*0.54, top-r.h*0.06, r.w*1.08, r.h*0.08);
      } else {
        const rh=r.h*r.pitch;
        g.fillStyle=rgb(shade(roof,0.78));
        g.beginPath(); g.moveTo(r.x-r.w*0.56,top); g.lineTo(r.x,top-rh); g.lineTo(r.x,top); g.closePath(); g.fill();
        g.fillStyle=rgb(shade(roof,1.18));
        g.beginPath(); g.moveTo(r.x+r.w*0.56,top); g.lineTo(r.x,top-rh); g.lineTo(r.x,top); g.closePath(); g.fill();
        // tile courses, and moss in the shaded valley
        g.strokeStyle=rgba(shade(roof,0.60),0.34); g.lineWidth=1;
        for (let k=1;k<6;k++){
          const f=k/6;
          g.beginPath();
          g.moveTo(lerp(r.x-r.w*0.56,r.x,f), lerp(top,top-rh,f));
          g.lineTo(lerp(r.x+r.w*0.56,r.x,f), lerp(top,top-rh,f));
          g.stroke();
        }
        g.fillStyle="rgba(96,120,72,0.20)";
        for (let k=0;k<5;k++)
          g.fillRect(r.x-r.w*0.5+sr(0,r.w*0.4), top-rh*sr(0,0.5), r.w*sr(0.03,0.10), r.h*0.03);
        g.strokeStyle=rgb(shade(roof,1.34)); g.lineWidth=Math.max(1,r.h*0.04);
        g.beginPath(); g.moveTo(r.x-2,top-rh); g.lineTo(r.x+2,top-rh); g.stroke();
        // chimney with pots
        if (r.k>0.35){
          const chx=r.x+r.w*0.22, chy=top-rh*0.58;
          g.fillStyle=rgb(shade(wall,0.82));
          g.fillRect(chx, chy-r.h*0.24, r.w*0.075, r.h*0.26);
          g.fillStyle=rgb(shade(wall,1.10));
          g.fillRect(chx-r.w*0.008, chy-r.h*0.26, r.w*0.091, r.h*0.03);
          g.fillStyle=rgb(shade([140,110,88],0.9));
          g.fillRect(chx+r.w*0.012, chy-r.h*0.32, r.w*0.020, r.h*0.06);
          g.fillRect(chx+r.w*0.044, chy-r.h*0.30, r.w*0.020, r.h*0.05);
        }
        // a television aerial
        if (r.aerial){
          g.strokeStyle="rgba(46,48,54,0.7)"; g.lineWidth=1;
          const axx=r.x-r.w*0.24, ayy=top-rh;
          g.beginPath(); g.moveTo(axx,ayy); g.lineTo(axx, ayy-r.h*0.34); g.stroke();
          for (let k=0;k<5;k++){
            const yy=ayy-r.h*(0.12+k*0.055);
            g.beginPath(); g.moveTo(axx-r.w*0.045+k*r.w*0.004, yy); g.lineTo(axx+r.w*0.045-k*r.w*0.004, yy); g.stroke();
          }
        }
        if (r.dish){
          g.fillStyle="rgba(214,210,202,0.6)";
          g.beginPath(); g.ellipse(r.x+r.w*0.40, top+r.h*0.16, r.w*0.030, r.w*0.040, 0.4,0,TAU); g.fill();
        }
      }
      // windows: some lit, some with curtains
      for (const wx of [r.x-r.w*0.26, r.x+r.w*0.12]){
        if (hash(wx)<0.35) continue;
        g.fillStyle=rgba([38,40,48],0.55);
        g.fillRect(wx, top+r.h*0.30, r.w*0.16, r.h*0.34);
        g.fillStyle=rgba([206,200,190],0.30);
        g.fillRect(wx, top+r.h*0.30, r.w*0.05, r.h*0.34);
        g.strokeStyle=rgba(shade(wall,1.2),0.5); g.lineWidth=1;
        g.strokeRect(wx, top+r.h*0.30, r.w*0.16, r.h*0.34);
      }
      // a neighbour's washing, two things on a short line
      if (r.wash){
        const lx=r.x-r.w*0.34, rx2=r.x+r.w*0.30, ly=base-r.h*0.10;
        g.strokeStyle="rgba(60,56,50,0.5)"; g.lineWidth=1;
        g.beginPath(); g.moveTo(lx,ly); g.quadraticCurveTo((lx+rx2)/2, ly+r.h*0.05, rx2,ly); g.stroke();
        for (let k=0;k<2;k++){
          const wx=lerp(lx,rx2,0.3+k*0.34);
          g.fillStyle=rgb(pick([[228,224,214],[198,210,224],[226,206,200]]));
          g.fillRect(wx, ly+r.h*0.02, r.w*0.05, r.h*0.14);
        }
      }
      // a bin
      if (r.k>0.7){
        g.fillStyle="rgba(52,68,58,0.85)";
        g.fillRect(r.x+r.w*0.40, base-r.h*0.16, r.w*0.06, r.h*0.16);
      }
      const ao=g.createLinearGradient(0,base-r.h*0.22,0,base+bh*0.016);
      ao.addColorStop(0,"rgba(20,22,28,0)"); ao.addColorStop(1,"rgba(20,22,28,0.42)");
      g.fillStyle=ao; g.fillRect(r.x-r.w*0.8, base-r.h*0.22, r.w*1.6, r.h*0.22+bh*0.016);
    }
    // a couple of near trees breaking the roofline
    for (const fx of [0.14, 0.86]) paintTree(g, fx*bw, base, bh*sr(0.10,0.14), "oak", sr(0.3,0.7));
    g.save(); g.globalAlpha=0.28; g.globalCompositeOperation="overlay";
    const s=NZ_FINE.width*0.6;
    for (let yy=hy; yy<base+bh*0.02; yy+=s)
      for (let xx=-s; xx<bw+s; xx+=s) g.drawImage(NZ_FINE,xx,yy,s,s);
    g.restore();
  }
}

/* blit one baked layer, veiled by its own distance. The veil is applied through
   the scratch buffer with source-atop, so only the layer's own pixels are
   tinted — which is exactly what aerial perspective does. */
function blitLayer(img, L, dx, dy, extraA){
  const T0 = reads(L.d);
  const veil = 1-T0;
  if (T0 < 0.008) return;
  scFit();
  const bw=SC.width, bh=SC.height;
  sctx.setTransform(1,0,0,1,0,0);
  sctx.globalCompositeOperation="source-over";
  sctx.clearRect(0,0,bw,bh);
  sctx.drawImage(img,0,0);
  if (veil>0.004){
    sctx.globalCompositeOperation="source-atop";
    sctx.fillStyle=rgba(airlight(), Math.min(0.985, veil));
    sctx.fillRect(0,0,bw,bh);
    // an explicit cool push on top of the veil. Aerial perspective is a hue
    // shift as much as a contrast loss, and stating it plainly reads better than
    // letting the maths do it alone.
    if (veil>0.05 && AIR.h<0.55){
      sctx.globalCompositeOperation="source-atop";
      sctx.fillStyle=rgba([96,140,182], Math.min(0.34, veil*0.30)*(1-AIR.h*1.4));
      sctx.fillRect(0,0,bw,bh);
    }
  }
  ctx.save();
  ctx.globalAlpha = cl01(T0*3.4)*(extraA===undefined?1:extraA);
  // the bake was made with the horizon at 0.66 of its own height; place it so
  // that line lands on this aperture's horizon
  const sc = AP.w/bw*CAM.zoom;
  const ox = AP.cx - (bw*sc)/2 - (CAM.x*L.p)*AP.w*CAM.zoom + (dx||0);
  const oy = AP.hy - TERR.hy*sc - (CAM.y*L.p)*AP.h + (dy||0) + L.y*AP.h*CAM.zoom*0.5;
  ctx.drawImage(SC, ox, oy, bw*sc, bh*sc);
  ctx.restore();
}

/* ============================================================================
   GRASS
   A baked field of individual blades — thousands of them, each with its own
   colour, lean and length — plus a live near-row that actually moves. Baked
   detail means the field can be dense enough to read as grass rather than as a
   green rectangle with a few strokes on it.
   ========================================================================== */
const GRASS = { key:"", img:null, h:0 };
function bakeGrass(){
  const key=(W|0)+"x"+(H|0);
  if (GRASS.key===key) return;
  GRASS.key=key;
  const gw=Math.max(2,(W*BAKE_S)|0), gh=Math.max(2,(H*0.46*BAKE_S)|0);
  const c=document.createElement("canvas"); c.width=gw; c.height=gh;
  const g=c.getContext("2d");
  GRASS.img=c; GRASS.h=gh;
  _sd=99117;

  // the ground under the grass: soil showing through, warm at the front
  const bg=g.createLinearGradient(0,0,0,gh);
  bg.addColorStop(0,   "#6f8a52");
  bg.addColorStop(0.22,"#688a4a");
  bg.addColorStop(0.60,"#55793e");
  bg.addColorStop(1,   "#3d5c30");
  g.fillStyle=bg; g.fillRect(0,0,gw,gh);
  // patchiness: dry areas, mown lines, damp hollows
  for (let i=0;i<190;i++){
    const x=sr(0,gw), y=sr(0,gh), r=sr(gh*0.03,gh*0.22);
    const dry=srnd()<0.5;
    const rg=g.createRadialGradient(x,y,0,x,y,r);
    rg.addColorStop(0, dry?"rgba(168,164,96,0.20)":"rgba(44,72,38,0.24)");
    rg.addColorStop(1, dry?"rgba(168,164,96,0)":"rgba(44,72,38,0)");
    g.fillStyle=rg; g.beginPath(); g.ellipse(x,y,r*1.7,r*0.5,sr(-0.3,0.3),0,TAU); g.fill();
  }
  g.save(); g.globalAlpha=0.42; g.globalCompositeOperation="overlay";
  const s=NZ_MOTTLE.width*0.8;
  for (let yy=0;yy<gh+s;yy+=s) for (let xx=0;xx<gw+s;xx+=s) g.drawImage(NZ_MOTTLE,xx,yy,s,s);
  g.restore();

  // the blades. Density and size both grow toward the viewer.
  const N = LOW ? 9000 : 24000;
  const blades=[];
  for (let i=0;i<N;i++){
    const v = Math.pow(srnd(), 0.62);          // more of them near the front
    blades.push({ x:sr(-8,gw+8), v, k:sr(0,1), lean:sr(-1,1), bend:sr(0.3,1) });
  }
  blades.sort((a,b)=>a.v-b.v);                 // back to front
  for (const b of blades){
    const y = b.v*gh;
    const len = gh*(0.012+0.085*b.v*b.v)*(0.6+b.bend*0.7);
    const wd  = Math.max(0.6, gh*0.0022*(0.3+b.v*1.5));
    // colour: yellower and lighter at the tips, bluer deep in the sward
    const base = mixL([46,68,34],[104,140,58], cl01(b.v*0.5+b.k*0.6));
    const tip  = mixL(base, [186,196,104], 0.30+b.k*0.42);
    const lg = g.createLinearGradient(b.x, y, b.x+b.lean*len*0.5, y-len);
    lg.addColorStop(0, rgb(shade(base, 0.72)));
    lg.addColorStop(1, rgb(tip));
    g.strokeStyle=lg; g.lineWidth=wd; g.lineCap="round";
    g.beginPath();
    g.moveTo(b.x, y);
    g.quadraticCurveTo(b.x+b.lean*len*0.22, y-len*0.62, b.x+b.lean*len*0.62, y-len);
    g.stroke();
  }
  // seed heads on some of the taller ones
  for (let i=0;i<(LOW?260:700);i++){
    const v=0.5+srnd()*0.5, x=sr(0,gw), y=v*gh, len=gh*(0.012+0.085*v*v);
    g.strokeStyle=rgba([196,190,132],0.5); g.lineWidth=Math.max(1,gh*0.0026);
    g.beginPath(); g.moveTo(x,y-len*0.95); g.lineTo(x+sr(-3,3), y-len*1.22); g.stroke();
  }
  // depth: the back of the field softens
  const fade=g.createLinearGradient(0,0,0,gh*0.30);
  fade.addColorStop(0,"rgba(150,168,132,0.42)"); fade.addColorStop(1,"rgba(150,168,132,0)");
  g.fillStyle=fade; g.fillRect(0,0,gw,gh*0.30);
}

/* the field on screen, with a live front row that moves in the wind */
function drawGrassField(t, topY, opt){
  opt=opt||{};
  bakeGrass();
  const h = AP.y+AP.h-topY;
  if (h<=0 || !GRASS.img) return;
  const img=GRASS.img;
  ctx.save();
  ctx.beginPath(); ctx.rect(AP.x-2, topY, AP.w+4, h+4); ctx.clip();
  // the baked field, veiled toward the sky at its far edge
  ctx.drawImage(img, 0,0,img.width,img.height, AP.x-2, topY, AP.w+4, h+4);
  // aerial perspective across the near ground, which is subtle but present
  const al=airlight();
  const vg=ctx.createLinearGradient(0,topY,0,topY+h*0.42);
  vg.addColorStop(0, rgba(al, 0.30*AIR.h+0.06));
  vg.addColorStop(1, rgba(al, 0));
  ctx.fillStyle=vg; ctx.fillRect(AP.x-2,topY,AP.w+4,h*0.42);
  // warm bounce light from the ground into the air, low sun only
  const sp=sunPos(AP);
  if (sp.up>0.06){
    ctx.globalCompositeOperation="lighter";
    const bg2=ctx.createLinearGradient(0,topY,0,AP.y+AP.h);
    const bc=mixL(skyStops().sun,[186,200,120],0.5);
    bg2.addColorStop(0, rgba(bc, 0.05*(1-AIR.h*0.5)));
    bg2.addColorStop(1, rgba(bc, 0));
    ctx.fillStyle=bg2; ctx.fillRect(AP.x-2,topY,AP.w+4,h);
    ctx.globalCompositeOperation="source-over";
  }
  // the live front row: real motion, drawn over the bake
  const w8=(AIR.wind+AIR.gust);
  const n = LOW?90:220;
  for (let i=0;i<n;i++){
    const hx=hash(i*2.7), hk=hash(i*5.3+11), hv=hash(i*9.1+3);
    const v = 0.72+hv*0.28;
    const x = AP.x + hx*AP.w;
    const y = topY + v*h;
    const len = h*(0.055+0.10*hk);
    const sway = Math.sin(t*1.7 + hx*24)*len*0.30*w8 + Math.sin(t*3.9+hx*11)*len*0.08*w8;
    const base=mixL([44,66,32],[100,136,56], hk);
    const tip=mixL(base,[192,200,110],0.34+hk*0.4);
    const lg=ctx.createLinearGradient(x,y,x+sway,y-len);
    lg.addColorStop(0,rgb(shade(base,0.7))); lg.addColorStop(1,rgb(tip));
    ctx.strokeStyle=lg;
    ctx.lineWidth=Math.max(1, h*0.0042*(0.5+hk));
    ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(x,y);
    ctx.quadraticCurveTo(x+sway*0.3, y-len*0.6, x+sway, y-len);
    ctx.stroke();
  }
  if (opt.dust>0.02) drawGrime(AP.x, topY, AP.w, h, opt.dust*0.45);
  ctx.restore();
}

/* ============================================================================
   BLOOM
   Bright-pass, downsampled, blurred, added back. Cheap because it happens at a
   fraction of the resolution, and it is the difference between flat canvas fills
   and light that feels like it is in the air.
   ========================================================================== */
const BL1 = document.createElement("canvas"), b1 = BL1.getContext("2d");
const BL2 = document.createElement("canvas"), b2 = BL2.getContext("2d");
function bloom(amount, thresholdLift){
  if (amount<0.012 || REDUCE) return;
  const bw = Math.max(8,(W*0.20)|0), bh = Math.max(8,(H*0.20)|0);
  if (BL1.width!==bw){ BL1.width=bw; BL1.height=bh; BL2.width=bw; BL2.height=bh; }
  // bright pass: draw the frame small, then crush the darks away
  b1.setTransform(1,0,0,1,0,0);
  b1.globalCompositeOperation="source-over";
  b1.clearRect(0,0,bw,bh);
  b1.drawImage(cv, 0,0, bw,bh);
  // multiply by itself twice to keep only the highlights
  b1.globalCompositeOperation="multiply";
  b1.drawImage(BL1,0,0);
  if (thresholdLift) b1.drawImage(BL1,0,0);
  b1.globalCompositeOperation="source-over";
  // blur it
  b2.setTransform(1,0,0,1,0,0);
  b2.clearRect(0,0,bw,bh);
  b2.filter = "blur("+(LOW?5:8)+"px)";
  b2.drawImage(BL1,0,0);
  b2.filter="none";
  // add back
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  ctx.globalAlpha=amount;
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(BL2, 0,0, W,H);
  ctx.restore();
}

/* ============================================================================
   FOREGROUND FRINGE
   The single biggest cinematic difference between a diagram of a field and the
   memory of standing in one: a band of near-black vegetation across the bottom
   of the frame, close enough to be out of focus, catching a thread of rim light
   on the sun's side, moving all the time. The sky and the light behind it do the
   emotional work; this is what makes them read as *depth* rather than as layers.
   Grasses, seedheads and cow parsley, because a fringe of identical blades is
   just a comb.
   ========================================================================== */
const FRINGE = [];
function buildFringe(){
  FRINGE.length=0;
  _sd = 5150221;
  const n = LOW ? 90 : 190;
  for (let i=0;i<n;i++){
    const kind = srnd();
    FRINGE.push({
      x: sr(-0.04, 1.04),
      // depth: 0 is right against the lens, 1 is a few metres back
      z: Math.pow(srnd(), 0.7),
      h: sr(0.045, 0.30),
      lean: sr(-1, 1),
      ph: sr(0, TAU),
      sp: sr(0.7, 1.5),
      kind: kind<0.26 ? "blade" : kind<0.44 ? "seed" : kind<0.54 ? "parsley"
          : kind<0.60 ? "dock"  : kind<0.80 ? "cosmos" : kind<0.93 ? "daisy" : "echinacea",
      k: sr(0,1),
      hue: sr(0,1),
      bokeh: srnd()<0.16
    });
  }
  FRINGE.sort((a,b)=>b.z-a.z);        // far ones first
}

function drawFringe(t, opt){
  opt = opt||{};
  if (!FRINGE.length) buildFringe();
  const baseY = AP.y + AP.h*(opt.base===undefined?1.03:opt.base);
  const sp = sunPos(AP);
  const w8 = AIR.wind + AIR.gust;
  const amount = opt.a===undefined?1:opt.a;
  if (amount<0.02) return;

  ctx.save();
  for (const f of FRINGE){
    // nearer stems are bigger, darker and softer
    const near = 1-f.z;
    const x = AP.x + f.x*AP.w;
    const hgt = AP.h*f.h*(0.55+near*0.95);
    const tipY = baseY - hgt;
    if (tipY > AP.y+AP.h) continue;

    // silhouette value: almost black in front, lifting toward airlight behind
    const dark = mixL([16,20,18], [40,48,42], f.k*0.6);
    const col = mixL(dark, airlight(), f.z*0.42 + AIR.h*0.18);
    const a = (0.40 + near*0.30) * amount;

    const sway = Math.sin(t*f.sp + f.ph)*hgt*0.10*w8
               + Math.sin(t*f.sp*2.3 + f.ph)*hgt*0.03*w8;
    const tipX = x + f.lean*hgt*0.20 + sway;
    const lw = Math.max(0.8, AP.h*0.0022*(0.35+near*1.4));

    // the stem
    ctx.strokeStyle = rgba(col, a);
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + f.lean*hgt*0.06 + sway*0.35, baseY-hgt*0.58, tipX, tipY);
    ctx.stroke();

    if (f.kind==="blade"){
      // a broad grass blade folding over
      ctx.fillStyle = rgba(col, a*0.9);
      ctx.beginPath();
      ctx.moveTo(x-lw*0.6, baseY);
      ctx.quadraticCurveTo(x + f.lean*hgt*0.10 + sway*0.4, baseY-hgt*0.60, tipX, tipY);
      ctx.quadraticCurveTo(x + f.lean*hgt*0.02 + sway*0.4 + lw*2.2, baseY-hgt*0.56, x+lw*0.6, baseY);
      ctx.closePath(); ctx.fill();
    } else if (f.kind==="seed"){
      // a feathered seedhead — the thing that catches the light
      const sl = hgt*0.26, dir = Math.atan2(tipY-(baseY-hgt*0.6), tipX-x);
      for (let k=0;k<16;k++){
        const fk = k/15;
        const px2 = tipX + Math.cos(dir)*sl*fk*0.5;
        const py2 = tipY + Math.sin(dir)*sl*fk*0.5;
        const spread = sl*0.30*Math.sin(fk*PI);
        ctx.strokeStyle = rgba(col, a*0.55);
        ctx.lineWidth = Math.max(1, lw*0.5);
        ctx.beginPath();
        ctx.moveTo(px2, py2);
        ctx.lineTo(px2 + (hash(k*3.1+f.ph)-0.5)*spread*2.4, py2 - spread*1.5);
        ctx.stroke();
      }
    } else if (f.kind==="parsley"){
      // cow parsley: an umbel of tiny rays
      const n2 = 13;
      for (let k=0;k<n2;k++){
        const a2 = -PI*0.5 + (k/(n2-1)-0.5)*PI*0.95;
        const rl = hgt*0.10*(0.6+hash(k*5.7+f.ph)*0.7);
        ctx.strokeStyle = rgba(col, a*0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        const ex = tipX+Math.cos(a2)*rl, ey = tipY+Math.sin(a2)*rl;
        ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = rgba(col, a*0.7);
        ctx.beginPath(); ctx.arc(ex, ey, Math.max(1, lw*0.55), 0, TAU); ctx.fill();
      }
    } else if (f.kind==="dock"){
      // a dock head: a dense dark spike
      ctx.fillStyle = rgba(col, a);
      for (let k=0;k<9;k++){
        const fk=k/8;
        ctx.beginPath();
        ctx.ellipse(tipX + (hash(k*7.7+f.ph)-0.5)*lw*2.5,
                    tipY + fk*hgt*0.16,
                    lw*1.1, lw*1.7, 0, 0, TAU);
        ctx.fill();
      }
    } else {
      /* A flower head. These are not silhouettes — they are the things that
         catch the low sun and glow, which is what the references all do. So they
         keep their colour, lift toward the light, and the nearest ones go soft. */
      const petalCols = {
        cosmos:    [[240,182,206],[248,214,226],[232,152,186],[252,236,240]],
        daisy:     [[252,248,238],[246,240,224],[255,252,246]],
        echinacea: [[228,168,196],[214,146,180],[238,190,210]]
      }[f.kind];
      const base = petalCols[(f.hue*petalCols.length)|0];
      // backlight: petals are thin, so they transmit
      const lit  = mixL(base, mixL(skyStops().sun,[255,255,250],0.4), 0.30+near*0.26);
      const petalCol = mixL(lit, airlight(), f.z*0.30);
      const R = hgt*(f.kind==="daisy"?0.055:0.075);
      const np = f.kind==="daisy" ? 14 : f.kind==="cosmos" ? 8 : 13;
      const softness = near;                    // nearest ones are out of focus
      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(Math.sin(t*f.sp*0.7+f.ph)*0.10);
      if (f.kind==="echinacea"){
        // petals sweep back and down
        for (let k=0;k<np;k++){
          const a2 = k/np*TAU + f.ph;
          ctx.fillStyle = rgba(petalCol, a*0.42*(0.62+0.3*Math.abs(Math.cos(a2))));
          ctx.save(); ctx.rotate(a2);
          ctx.beginPath();
          ctx.ellipse(0, R*0.62, R*0.16, R*0.60, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        // the dark cone in the middle
        ctx.fillStyle = rgba(mixL([166,86,44], airlight(), f.z*0.3), a*0.55);
        ctx.beginPath(); ctx.ellipse(0,0,R*0.30,R*0.26,0,0,TAU); ctx.fill();
      } else {
        for (let k=0;k<np;k++){
          const a2 = k/np*TAU + f.ph;
          ctx.fillStyle = rgba(petalCol, a*0.42*(0.70+0.26*Math.abs(Math.cos(a2))));
          ctx.save(); ctx.rotate(a2);
          ctx.beginPath();
          ctx.ellipse(0, -R*0.56, R*(f.kind==="daisy"?0.11:0.24), R*0.56, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = rgba(mixL([246,204,88], [255,238,170], near*0.5), a*0.5);
        ctx.beginPath(); ctx.arc(0,0,R*(f.kind==="daisy"?0.24:0.20),0,TAU); ctx.fill();
      }
      // a glow around it, because it is between you and the sun
      if (sp.up>0.02){
        ctx.globalCompositeOperation="lighter";
        const gg=ctx.createRadialGradient(0,0,0,0,0,R*2.1);
        gg.addColorStop(0, rgba(mixL(petalCol,[255,252,242],0.6), a*0.16*(1-AIR.h*0.5)));
        gg.addColorStop(1, rgba(petalCol,0));
        ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(0,0,R*2.1,0,TAU); ctx.fill();
      }
      ctx.restore();
      // and a couple of them are so close they are only a disc of light
      if (f.bokeh && sp.up>0.02){
        ctx.save(); ctx.globalCompositeOperation="lighter";
        const br=R*2.4;
        const bg=ctx.createRadialGradient(tipX,tipY,0,tipX,tipY,br);
        bg.addColorStop(0, rgba(mixL(petalCol,[255,250,238],0.5), a*0.20));
        bg.addColorStop(0.7, rgba(petalCol, a*0.10));
        bg.addColorStop(1, rgba(petalCol,0));
        ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(tipX,tipY,br,0,TAU); ctx.fill();
        ctx.restore();
      }
    }

    // rim light on the sun's side — this is what stops it reading as a black mask
    if (sp.up > 0.02 && f.z < 0.62){
      const dir = sp.x > x ? 1 : -1;
      ctx.strokeStyle = rgba(mixL(skyStops().sun, [255,255,244], 0.35), a*0.34*(1-AIR.h*0.5));
      ctx.lineWidth = Math.max(1, lw*0.42);
      ctx.beginPath();
      ctx.moveTo(x + dir*lw*0.45, baseY);
      ctx.quadraticCurveTo(x + f.lean*hgt*0.06 + sway*0.35 + dir*lw*0.45, baseY-hgt*0.58,
                           tipX + dir*lw*0.4, tipY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ============================================================================
   PRESENCE WITHOUT PEOPLE
   The reference that settles this: two figures seen only as soft shadows thrown
   onto a sunlit sheet. You read the gesture instantly and you never see a face.
   So nobody in this work is ever drawn as a body in the light — they are drawn
   as shadows on cloth, shadows on a floor, a hand at the edge of frame.
   ========================================================================== */

/* a soft shadow cast onto a cloth region, in multiply, so it belongs to the
   fabric rather than sitting on top of it */
function shadowOnCloth(o){
  const { x, y, s, t } = o;
  const a = (o.a===undefined?1:o.a);
  if (a<0.02) return;
  ctx.save();
  if (o.clip) o.clip();
  ctx.globalCompositeOperation = "multiply";
  // three passes at increasing offset = a penumbra without a filter
  const passes = [[0,0,0.30,1.00],[-5,-3,0.16,1.06],[6,4,0.14,1.09],[-11,7,0.09,1.14]];
  for (const p of passes){
    ctx.save();
    ctx.globalAlpha = a*p[2];
    ctx.fillStyle = o.col ? rgb(o.col) : "rgb(96,78,72)";
    const sc = p[3];
    ctx.translate(x+p[0], y+p[1]);
    ctx.scale(sc, sc);
    ctx.translate(-x, -y);
    // a figure reduced to its gesture: head, shoulders, one raised arm
    const HEAD = s*0.070;
    const shY = y - s*0.78, neck = y - s*0.845;
    ctx.beginPath();
    ctx.ellipse(x, neck-HEAD*0.95, HEAD*0.92, HEAD*1.06, 0.05, 0, TAU); ctx.fill();
    // hair, loose, moving
    ctx.beginPath();
    ctx.ellipse(x-s*0.014, neck-HEAD*0.86, HEAD*1.10, HEAD*1.22,
                0.08+Math.sin(t*0.8)*0.05, 0, TAU); ctx.fill();
    // torso, tapering
    ctx.beginPath();
    ctx.moveTo(x-s*0.095, shY);
    ctx.quadraticCurveTo(x-s*0.070, y-s*0.56, x-s*0.085, y-s*0.44);
    ctx.lineTo(x+s*0.085, y-s*0.44);
    ctx.quadraticCurveTo(x+s*0.070, y-s*0.56, x+s*0.095, shY);
    ctx.quadraticCurveTo(x, shY-s*0.026, x-s*0.095, shY);
    ctx.closePath(); ctx.fill();
    // a skirt, which the wind gets under
    const sw = Math.sin(t*1.2)*s*0.030*(AIR.wind+AIR.gust);
    ctx.beginPath();
    ctx.moveTo(x-s*0.085, y-s*0.46);
    ctx.lineTo(x+s*0.085, y-s*0.46);
    ctx.quadraticCurveTo(x+s*0.160+sw, y-s*0.20, x+s*0.120+sw, y);
    ctx.quadraticCurveTo(x+sw*0.6, y+s*0.02, x-s*0.120+sw, y);
    ctx.quadraticCurveTo(x-s*0.160+sw, y-s*0.20, x-s*0.085, y-s*0.46);
    ctx.closePath(); ctx.fill();
    // the arm that is doing something — reaching up to the line
    const up = o.reach===undefined ? 0.85 : o.reach;
    ctx.strokeStyle = ctx.fillStyle; ctx.lineCap="round";
    ctx.lineWidth = s*0.048;
    const shx = x+s*0.088;
    const ex = shx + s*0.070, ey = shY - s*0.14*up + s*0.10*(1-up);
    const hx = ex + s*0.030, hy = ey - s*0.30*up + s*0.22*(1-up);
    ctx.beginPath(); ctx.moveTo(shx, shY+s*0.010); ctx.lineTo(ex,ey); ctx.lineTo(hx,hy); ctx.stroke();
    // and the other, down
    ctx.beginPath();
    ctx.moveTo(x-s*0.088, shY+s*0.010);
    ctx.lineTo(x-s*0.120, y-s*0.56); ctx.lineTo(x-s*0.108, y-s*0.40); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/* a small child's shadow, running */
function childShadowOnGround(o){
  const { x, y, s, t } = o;
  const a = o.a===undefined?0.26:o.a;
  ctx.save();
  ctx.globalCompositeOperation="multiply";
  ctx.globalAlpha=a;
  ctx.fillStyle="rgb(78,86,62)";
  // foreshortened onto the grass, stretched away from the sun
  ctx.translate(x,y);
  ctx.transform(1, 0, o.skew===undefined?-0.85:o.skew, 0.34, 0, 0);
  const run = Math.sin(t*6)*0.5;
  ctx.beginPath(); ctx.ellipse(0,-s*0.86,s*0.10,s*0.11,0,0,TAU); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s*0.075,-s*0.74); ctx.lineTo(s*0.075,-s*0.74);
  ctx.lineTo(s*0.060,-s*0.40); ctx.lineTo(-s*0.060,-s*0.40); ctx.closePath(); ctx.fill();
  ctx.strokeStyle="rgb(78,86,62)"; ctx.lineCap="round"; ctx.lineWidth=s*0.048;
  ctx.beginPath(); ctx.moveTo(-s*0.02,-s*0.40); ctx.lineTo(-s*0.10-run*s*0.10, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( s*0.02,-s*0.40); ctx.lineTo( s*0.10+run*s*0.10, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s*0.06,-s*0.68); ctx.lineTo(-s*0.15+run*s*0.08,-s*0.50); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( s*0.06,-s*0.68); ctx.lineTo( s*0.16-run*s*0.08,-s*0.56); ctx.stroke();
  ctx.restore();
}

/* a hand at the very edge of frame, placing a peg. Never an arm, never a body. */
function handAtEdge(o){
  const { x, y, s, t } = o;
  ctx.save();
  ctx.globalAlpha = o.a===undefined?0.9:o.a;
  ctx.fillStyle = rgb(o.col || farColour([52,46,50], 8));
  ctx.translate(x,y); ctx.rotate(o.rot||0);
  // forearm running off the edge
  ctx.beginPath();
  ctx.moveTo(-s*1.6, s*0.30); ctx.lineTo(-s*1.6,-s*0.24);
  ctx.quadraticCurveTo(-s*0.5,-s*0.30, 0,-s*0.16);
  ctx.quadraticCurveTo(s*0.10, s*0.02, 0, s*0.20);
  ctx.quadraticCurveTo(-s*0.5, s*0.34, -s*1.6, s*0.30);
  ctx.closePath(); ctx.fill();
  // two fingers, pinching
  const pinch = 0.5+0.5*Math.sin(t*0.8);
  ctx.strokeStyle=ctx.fillStyle; ctx.lineCap="round"; ctx.lineWidth=s*0.17;
  ctx.beginPath(); ctx.moveTo(-s*0.06,-s*0.10);
  ctx.quadraticCurveTo(s*0.26,-s*0.18, s*0.40,-s*0.04-pinch*s*0.05); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s*0.04, s*0.12);
  ctx.quadraticCurveTo(s*0.24, s*0.18, s*0.38, s*0.02+pinch*s*0.05); ctx.stroke();
  ctx.restore();
}

/* ============================================================================
   DAPPLE
   Branch shadows moving across a wall, a bed, a floor. In the reference this is
   the single detail that makes an empty bedroom feel like somewhere real, so it
   gets its own baked canopy and a projection.
   ========================================================================== */
const CANOPY = { img:null };
function bakeCanopy(){
  if (CANOPY.img) return;
  const S = LOW?256:384;
  const c=document.createElement("canvas"); c.width=c.height=S;
  const g=c.getContext("2d");
  _sd = 771;
  g.clearRect(0,0,S,S);
  g.fillStyle="#000";
  // boughs, forking outward from one corner
  function bough(x,y,ang,len,wd,depth){
    if (depth>4 || len<S*0.03) return;
    const ex=x+Math.cos(ang)*len, ey=y+Math.sin(ang)*len;
    g.strokeStyle="#000"; g.lineWidth=wd; g.lineCap="round";
    g.beginPath(); g.moveTo(x,y);
    g.quadraticCurveTo(x+Math.cos(ang+0.3)*len*0.5, y+Math.sin(ang+0.3)*len*0.5, ex,ey);
    g.stroke();
    // leaf clusters along it
    const nl = 3+((srnd()*4)|0);
    for (let i=0;i<nl;i++){
      const f=sr(0.35,1.0);
      const lx=lerp(x,ex,f), ly=lerp(y,ey,f);
      const lr=S*sr(0.020,0.052);
      for (let k=0;k<7;k++){
        g.beginPath();
        g.ellipse(lx+sr(-lr,lr), ly+sr(-lr,lr)*0.8, lr*sr(0.28,0.5), lr*sr(0.16,0.30),
                  sr(0,PI), 0, TAU);
        g.fill();
      }
    }
    bough(ex,ey, ang+sr(0.20,0.70), len*sr(0.52,0.74), wd*0.62, depth+1);
    bough(ex,ey, ang-sr(0.20,0.70), len*sr(0.52,0.74), wd*0.62, depth+1);
    if (srnd()<0.4) bough(lerp(x,ex,0.6), lerp(y,ey,0.6), ang+sr(-1.2,1.2), len*0.44, wd*0.5, depth+1);
  }
  bough(S*0.04, S*0.10, 0.62, S*0.42, S*0.030, 0);
  bough(S*0.30, S*0.02, 1.05, S*0.38, S*0.026, 0);
  bough(S*0.72, S*0.06, 1.60, S*0.34, S*0.022, 0);
  CANOPY.img = c;
}
/* project the canopy onto a region. `warp` skews it so it reads as light thrown
   at an angle rather than a decal. */
function dapple(t, x, y, w, h, amount, warp){
  if (amount<0.015 || REDUCE) return;
  bakeCanopY_safe();
  ctx.save();
  ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
  ctx.globalCompositeOperation="multiply";
  const sway = Math.sin(t*0.42)*w*0.012 + Math.sin(t*0.27)*w*0.006;
  const sway2 = Math.cos(t*0.35)*h*0.008;
  const S = Math.max(w,h)*1.45;
  // two passes at different scales and offsets: near leaves and far leaves
  for (const p of [[0.0,1.00,0.62],[0.5,1.34,0.30]]){
    ctx.save();
    ctx.globalAlpha = amount*p[2];
    ctx.translate(x+w*0.5+sway*(1+p[0]), y+h*0.42+sway2);
    ctx.transform(1, 0, warp===undefined?0.28:warp, 1, 0, 0);
    ctx.rotate(0.06+p[0]*0.1);
    ctx.drawImage(CANOPY.img, -S*p[1]*0.5, -S*p[1]*0.5, S*p[1], S*p[1]);
    ctx.restore();
  }
  ctx.restore();
}
function bakeCanopY_safe(){ if(!CANOPY.img) bakeCanopy(); }

/* ============================================================================
   FLARE
   Every reference shot into the sun has it: a warm veil, prismatic ghosts along
   the axis through the frame centre, and one hard streak. It is what tells the
   eye there is a real light source in front of the camera.
   ========================================================================== */
function flare(sx, sy, amount){
  if (amount<0.012 || REDUCE) return;
  const cxx=W*0.5, cyy=H*0.5;
  const dx=cxx-sx, dy=cyy-sy;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  // the veil, straight off the source
  const veil=ctx.createRadialGradient(sx,sy,0,sx,sy,MIN*1.1);
  veil.addColorStop(0, rgba([255,246,224], amount*0.16));
  veil.addColorStop(0.25, rgba([255,238,208], amount*0.05));
  veil.addColorStop(1, "rgba(255,238,208,0)");
  ctx.fillStyle=veil; ctx.fillRect(0,0,W,H);
  // prismatic ghosts along the axis
  const ghosts = [
    [0.34, 0.055, [255,214,170], 0.10],
    [0.62, 0.030, [180,232,214], 0.09],
    [0.88, 0.075, [214,190,255], 0.07],
    [1.22, 0.042, [255,196,186], 0.08],
    [1.62, 0.100, [196,222,255], 0.05]
  ];
  for (const g of ghosts){
    const gx=sx+dx*g[0]*2, gy=sy+dy*g[0]*2;
    const gr=MIN*g[1];
    const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
    rg.addColorStop(0, rgba(g[2], amount*g[3]*0.5));
    rg.addColorStop(0.72, rgba(g[2], amount*g[3]));
    rg.addColorStop(0.94, rgba(g[2], amount*g[3]*0.7));
    rg.addColorStop(1, rgba(g[2],0));
    ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(gx,gy,gr,0,TAU); ctx.fill();
  }
  // one anamorphic streak
  const st=ctx.createLinearGradient(sx-MIN*0.5,sy, sx+MIN*0.5,sy);
  st.addColorStop(0,"rgba(255,240,214,0)");
  st.addColorStop(0.5, rgba([255,244,222], amount*0.14));
  st.addColorStop(1,"rgba(255,240,214,0)");
  ctx.fillStyle=st; ctx.fillRect(sx-MIN*0.5, sy-MIN*0.0035, MIN, MIN*0.007);
  ctx.restore();
}

/* ============================================================================
   CANOPY FRAMING
   The compositional device the game references all use and this piece was
   missing entirely: foliage entering the top of the frame. It does three things
   at once — it gives the sky an edge to be measured against, it puts something
   very near the lens so the distance reads as distance, and it makes an ordinary
   view feel composed rather than surveyed.
   ========================================================================== */
const BOUGHS = [];
function buildBoughs(){
  BOUGHS.length=0;
  _sd = 313377;
  // two clusters, top-left and top-right, of different species and depth
  for (const side of [-1, 1]){
    const n = LOW?2:3;
    for (let i=0;i<n;i++){
      BOUGHS.push({
        side,
        ax: side<0 ? sr(-0.10,0.16) : sr(0.84,1.10),
        ay: sr(-0.16,-0.02),
        len: sr(0.34,0.70),
        ang: side<0 ? sr(0.18,0.72) : sr(PI-0.72, PI-0.18),
        z: sr(0,1),
        ph: sr(0,TAU),
        sp: sr(0.5,0.9),
        k: sr(0,1),
        leaves: []
      });
    }
  }
  for (const b of BOUGHS){
    const nl = LOW?34:78;
    for (let i=0;i<nl;i++){
      b.leaves.push({ f: sr(0.12,1.10), off: sr(-1.5,1.5), r: sr(0.45,1.5),
                      rot: sr(0,PI), k: sr(0,1), ph: sr(0,TAU) });
    }
  }
}
function drawCanopy(t, opt){
  opt = opt||{};
  if (!BOUGHS.length) buildBoughs();
  const amount = opt.a===undefined?1:opt.a;
  if (amount<0.02) return;
  const sp = sunPos(AP);
  const w8 = AIR.wind + AIR.gust;
  const s = skyStops();

  ctx.save();
  for (const b of BOUGHS){
    const near = 1-b.z;
    const ox = AP.x + b.ax*AP.w, oy = AP.y + b.ay*AP.h;
    const L  = AP.h*b.len*(0.7+near*0.7);
    const sway = Math.sin(t*b.sp + b.ph)*0.030*w8 + Math.sin(t*b.sp*2.1+b.ph)*0.010*w8;
    const ang = b.ang + sway;
    const ex = ox + Math.cos(ang)*L, ey = oy + Math.sin(ang)*L;

    // foliage is nearly black in front of a bright sky, warmer when it is nearer
    const dark  = mixL([18,26,20],[38,50,30], b.k*0.7);
    const col   = mixL(dark, airlight(), b.z*0.30 + AIR.h*0.22);
    const a     = (0.72+near*0.26)*amount;

    // the bough
    ctx.strokeStyle = rgba(mixL(col,[42,32,26],0.4), a);
    ctx.lineWidth = Math.max(2, AP.h*0.010*(0.4+near));
    ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(ox,oy);
    ctx.quadraticCurveTo(lerp(ox,ex,0.5)+Math.sin(ang)*L*0.10,
                         lerp(oy,ey,0.5)-Math.cos(ang)*L*0.10, ex, ey);
    ctx.stroke();
    // a couple of side twigs
    for (const tf of [0.42, 0.68, 0.86]){
      const tx=lerp(ox,ex,tf), ty=lerp(oy,ey,tf);
      const ta=ang+(b.side<0?1:-1)*sr(0.5,1.1)*0+ (b.k>0.5?0.7:-0.7);
      ctx.lineWidth = Math.max(1, AP.h*0.004*(0.4+near));
      ctx.beginPath(); ctx.moveTo(tx,ty);
      ctx.lineTo(tx+Math.cos(ta)*L*0.22, ty+Math.sin(ta)*L*0.22); ctx.stroke();
    }
    // the leaves
    for (const lf of b.leaves){
      const lx = lerp(ox,ex,lf.f) + lf.off*L*0.16 + Math.sin(t*b.sp*1.4+lf.ph)*L*0.010*w8;
      const ly = lerp(oy,ey,lf.f) + lf.off*L*0.11 + Math.cos(t*b.sp*1.6+lf.ph)*L*0.008*w8;
      const lr = AP.h*0.026*lf.r*(0.5+near*0.9);
      const lc = mixL(col, mixL(dark,[74,96,48],0.6), lf.k*0.5);
      ctx.fillStyle = rgba(lc, a*(0.82+lf.k*0.18));
      ctx.save();
      ctx.translate(lx,ly);
      ctx.rotate(lf.rot + Math.sin(t*b.sp+lf.ph)*0.16);
      // a leaf, not a circle: a pointed ellipse with a midrib
      ctx.beginPath();
      ctx.moveTo(-lr,0);
      ctx.quadraticCurveTo(0,-lr*0.62, lr,0);
      ctx.quadraticCurveTo(0, lr*0.62, -lr,0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      // sunlight coming through the leaf, which is what makes a canopy glow
      if (sp.up>0.02 && b.z<0.7){
        const d = Math.hypot(lx-sp.x, ly-sp.y);
        const g2 = 1-cl01(d/(MIN*0.55));
        if (g2>0.02){
          ctx.save();
          ctx.globalCompositeOperation="lighter";
          ctx.fillStyle = rgba(mixL([132,176,74], s.sun, 0.45), a*g2*g2*0.40*(1-AIR.h*0.6));
          ctx.beginPath(); ctx.ellipse(lx,ly,lr*0.9,lr*0.55,lf.rot,0,TAU); ctx.fill();
          ctx.restore();
        }
      }
    }
  }
  ctx.restore();
}

/* ============================================================================
   HARD LIGHT PATCH
   A window throws a shape, not a glow. The reference interior has a crisp
   quadrilateral of sun on the floorboards with the glazing bars printed across
   it. That hard edge is what makes the light feel like it is coming from
   somewhere specific.
   ========================================================================== */
function lightPatch(o){
  const a = o.a;
  if (a<0.01) return;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  // the patch, keystoned as a real projection would be
  const g = ctx.createLinearGradient(o.x0,o.y0,o.x3,o.y3);
  g.addColorStop(0, rgba(o.col, a));
  g.addColorStop(0.72, rgba(o.col, a*0.82));
  g.addColorStop(1, rgba(o.col, a*0.10));
  ctx.fillStyle=g;
  ctx.beginPath();
  ctx.moveTo(o.x0,o.y0); ctx.lineTo(o.x1,o.y1); ctx.lineTo(o.x2,o.y2); ctx.lineTo(o.x3,o.y3);
  ctx.closePath();
  ctx.fill();
  // the glazing bars printed across it as darker gaps
  ctx.globalCompositeOperation="source-over";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(o.x0,o.y0); ctx.lineTo(o.x1,o.y1); ctx.lineTo(o.x2,o.y2); ctx.lineTo(o.x3,o.y3);
  ctx.closePath(); ctx.clip();
  ctx.globalCompositeOperation="destination-out";
  ctx.globalAlpha = a*2.2;
  // vertical bar
  const mvx0=lerp(o.x0,o.x1,0.5), mvy0=lerp(o.y0,o.y1,0.5);
  const mvx1=lerp(o.x3,o.x2,0.5), mvy1=lerp(o.y3,o.y2,0.5);
  ctx.lineWidth=Math.max(3, MIN*0.010);
  ctx.strokeStyle="#000"; ctx.lineCap="butt";
  ctx.beginPath(); ctx.moveTo(mvx0,mvy0); ctx.lineTo(mvx1,mvy1); ctx.stroke();
  // horizontal bar, further down the projection
  const hax=lerp(o.x0,o.x3,0.46), hay=lerp(o.y0,o.y3,0.46);
  const hbx=lerp(o.x1,o.x2,0.46), hby=lerp(o.y1,o.y2,0.46);
  ctx.lineWidth=Math.max(4, MIN*0.013);
  ctx.beginPath(); ctx.moveTo(hax,hay); ctx.lineTo(hbx,hby); ctx.stroke();
  ctx.restore();
  ctx.restore();
}
