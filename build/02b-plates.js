/* ============================================================================
   PLATES — the paintings, as living layers
   ============================================================================
   Each painting is a PLATE. A plate is never drawn as one flat picture. It is
   sliced into horizontal bands with feathered seams, the bands are moved apart
   by parallax, and the whole thing is cross-dissolved against its polluted twin
   as the air changes.

   Three techniques do the heavy lifting:

   [1] FEATHERED BANDS. A hard slice would show its seam the moment parallax
       moved it. Every band is cut with a soft alpha ramp top and bottom, so
       neighbouring bands overlap and the joins are invisible even at several
       hundred pixels of separation.

   [2] EDGE EXTENSION. Moving a band sideways opens a gap at the frame edge.
       Each band canvas is built wider than the frame and its outermost columns
       are stretched outward, so there is always material to slide in.

   [3] MESH WARP. The painted pixels can be pushed through the same cloth mesh
       the procedural cloth uses. That is what makes a painted bedsheet actually
       billow and part when you walk into it, instead of being a picture of a
       bedsheet.

   Measured alignment of the clean/hazed pairs (structural NCC, 1.0 = identical):
       bedroomopen / bedroompostpollution   0.947  → straight dissolve
       moresheets  / moresheetspolluted     0.803  → straight dissolve
       kiteevening / kitenight              0.773  → straight dissolve
       sheetswithmother / ...polluted       0.745  → dissolve sky, hold detail
       viewoftown / ...afterpollution       0.687  → dissolve sky, hold detail
       stargaze   / pollutedstargaze        0.536  → separate, stars procedural
   Bands whose detail moved between generations are dissolved only in their
   low-frequency content; their detail is re-lit procedurally instead, which
   avoids ghosting.
   ========================================================================== */

const ASSET_DIR = "assets/";
const IMG = Object.create(null);     // filename -> HTMLImageElement
let imgPending = 0, imgFailed = [];

function loadImg(name){
  if (IMG[name]) return IMG[name];
  const im = new Image();
  IMG[name] = im;
  imgPending++;
  im.onload = ()=>{ imgPending--; im._ok = true; PLATE_CACHE.key = ""; };
  im.onerror = ()=>{ imgPending--; im._ok = false; imgFailed.push(name); };
  im.src = ASSET_DIR + encodeURIComponent(name);
  return im;
}
const imgReady = im => im && im._ok && im.naturalWidth>0;

/* ------------------------------------------------------------------ plate defs
   `bands` are cut at these y-fractions of the source image. `p` is the parallax
   factor for the band below each cut: 0 barely moves, 1 moves with the pointer.
   `crop` picks the region of the 4:3 source that fills a widescreen frame, and
   is panned slowly so the camera is never quite still.
*/
const PLATES = {
  bedroomClosed: {
    clean:"bedroomclosed.png",
    // the same crop and the same band cuts as bedroomOpen, so the two plates
    // are the same room to the pixel and can be laid straight over each other
    crop:{ x:0.0, y:0.05, w:1.0, h:0.82 },
    bands:[ {to:0.13,p:0.02}, {to:0.60,p:0.05}, {to:0.78,p:0.10}, {to:1.0,p:0.18} ]
  },
  bedroomOpen: {
    clean:"bedroomopen.png",
    hazed:"bedroompostpollution.png",
    dissolve:"full",                        // ncc 0.947 — safe to dissolve entirely
    crop:{ x:0.0, y:0.05, w:1.0, h:0.82 },
    bands:[ {to:0.13,p:0.02}, {to:0.60,p:0.05}, {to:0.78,p:0.10}, {to:1.0,p:0.18} ],
    repair:[ { x:0.549, y:0.243, w:0.036, h:0.062 } ]
  },
  /* ------------------------------------------------------------------ the room
     Two plates of the same bedroom, painted with nothing in them that the code
     needs to own: no curtains, no rod, no pull cord, no birds. Outside the
     window they are identical to the pixel, so they can be laid straight over
     each other and only the casement moves. Everything else in this chapter is
     a sprite or is drawn. */
  roomShut: {
    clean:"updatedbedroomwithnotoys.jpg",
    crop:{ x:0.0, y:0.045, w:1.0, h:0.830 },
    bands:[ {to:0.16,p:0.015}, {to:0.62,p:0.04}, {to:0.80,p:0.09}, {to:1.0,p:0.17} ]
  },
  roomOpen: {
    // the casement cracked open, not flung wide — measured against roomShut, the
    // two differ by 4/255 outside the window and 14/255 inside it, which is to
    // say they are the same room and only the window moved
    clean:"updatedbedroomwithwindowslightlyopenwithnotoys.jpg",
    crop:{ x:0.0, y:0.045, w:1.0, h:0.830 },
    bands:[ {to:0.16,p:0.015}, {to:0.62,p:0.04}, {to:0.80,p:0.09}, {to:1.0,p:0.17} ]
  },
  bedroomOpenAlt: {
    clean:"bedroomopenver2.png",
    crop:{ x:0.0, y:0.05, w:1.0, h:0.82 },
    bands:[ {to:0.13,p:0.02}, {to:0.60,p:0.05}, {to:0.78,p:0.10}, {to:1.0,p:0.18} ],
    repair:[ { x:0.549, y:0.243, w:0.036, h:0.062 } ]
  },
  /* the washing line, painted with its pins and nothing hanging on them */
  lineScene: {
    clean:"sheetsscencefor5ssheetsandmom.png",
    crop:{ x:0.0, y:0.0, w:1.0, h:1.0 },
    bands:[ {to:0.30,p:0.012}, {to:0.62,p:0.035}, {to:0.80,p:0.09}, {to:1.0,p:0.20} ]
  },
  /* the laundry, in four versions. `sheetBand` marks the rows that will be fed
     through the cloth mesh so the painted washing moves. */
  laundry: {
    clean:"moresheets.png",
    hazed:"moresheetspolluted.png",
    dissolve:"full",                        // ncc 0.803
    crop:{ x:0.0, y:0.02, w:1.0, h:0.86 },
    bands:[ {to:0.16,p:0.03}, {to:0.58,p:0.07}, {to:0.74,p:0.13}, {to:0.86,p:0.24}, {to:1.0,p:0.42} ],
    sheetBand:1
  },
  laundryMother: {
    clean:"sheetswithmother.png",
    hazed:"sheetspollutedwithmother.png",
    dissolve:"sky",                         // ncc 0.745 — detail moved
    crop:{ x:0.0, y:0.02, w:1.0, h:0.86 },
    bands:[ {to:0.16,p:0.03}, {to:0.58,p:0.07}, {to:0.74,p:0.13}, {to:0.86,p:0.24}, {to:1.0,p:0.42} ],
    sheetBand:1
  },
  laundryBasket: {
    clean:"sheetspostpollution with basket.png",
    crop:{ x:0.0, y:0.02, w:1.0, h:0.86 },
    bands:[ {to:0.16,p:0.03}, {to:0.58,p:0.07}, {to:0.74,p:0.13}, {to:0.86,p:0.24}, {to:1.0,p:0.42} ],
    sheetBand:1
  },
  laundryGone: {
    clean:"sheetspostpollution.png",
    crop:{ x:0.0, y:0.02, w:1.0, h:0.86 },
    bands:[ {to:0.16,p:0.03}, {to:0.58,p:0.07}, {to:0.74,p:0.13}, {to:0.86,p:0.24}, {to:1.0,p:0.42} ]
  },
  /* the hilltop and the town — the widest view, and the one the binoculars use */
  town: {
    clean:"viewoftown.png",
    hazed:"viewoftownafterpollution.png",
    dissolve:"sky",                         // ncc 0.687
    crop:{ x:0.0, y:0.0, w:1.0, h:0.88 },
    bands:[ {to:0.42,p:0.015}, {to:0.60,p:0.04}, {to:0.70,p:0.08}, {to:0.82,p:0.17}, {to:1.0,p:0.38} ]
  },
  /* The field, empty. Two paintings of the same place at two times of day,
     framed identically, so the evening can dissolve into the night without a
     cut and the child and his kite can be put back on top as things that move. */
  kiteSky: {
    clean:"eveningkite.png",
    hazed:"night kite sky.png",
    dissolve:"full",
    crop:{x:0, y:0.02, w:1, h:0.90},
    /* The near band is cut at 0.87 rather than the usual 0.78 because this one
       has a job beyond parallax: the boy is drawn between it and the rest, and
       where it starts is where the grass swallows his legs. In the painting that
       happens at his ankles, and 0.87 — with the band's own soft top edge above
       it — is where the tall grass actually begins in this frame. Cut higher and
       he loses his legs to a field he is supposed to be standing in. */
    bands:[{to:0.46,p:0.012},{to:0.64,p:0.035},{to:0.87,p:0.085},{to:1.0,p:0.24}]
  },
  /* the kite, in four lights */
  kiteDay:     { clean:"childflykite.png",         hazed:"pollutedkitefly.png", dissolve:"sky",
                 crop:{x:0,y:0,w:1,h:0.88},
                 bands:[{to:0.46,p:0.015},{to:0.64,p:0.04},{to:0.76,p:0.09},{to:1.0,p:0.30}] },
  kiteEvening: { clean:"childflykiteevening.png",  hazed:"childflykite night.png", dissolve:"full",
                 crop:{x:0,y:0,w:1,h:0.92},
                 bands:[{to:0.50,p:0.015},{to:0.66,p:0.04},{to:0.78,p:0.09},{to:1.0,p:0.30}] },
  kiteHazed:   { clean:"pollutedkitefly.png",
                 crop:{x:0,y:0,w:1,h:0.88},
                 bands:[{to:0.46,p:0.015},{to:0.64,p:0.04},{to:0.76,p:0.09},{to:1.0,p:0.30}] },
  /* the night sky. The pair is too different to dissolve, so these are two
     separate plates and the stars themselves are drawn procedurally on top —
     which is what the named interactive stars need anyway. */
  stars:       { clean:"stargaze.png",
                 crop:{x:0,y:0,w:1,h:0.94},
                 bands:[{to:0.62,p:0.010},{to:0.78,p:0.05},{to:1.0,p:0.26}] },
  starsHazed:  { clean:"pollutedstargaze.png",
                 crop:{x:0,y:0,w:1,h:0.94},
                 bands:[{to:0.62,p:0.010},{to:0.78,p:0.05},{to:1.0,p:0.26}] }
};

/* preload everything the piece will need, in rough order of appearance */
function preloadPlates(){
  const order = ["updatedbedroomwithnotoys.jpg",
    "updatedbedroomwithwindowslightlyopenwithnotoys.jpg",
    "bulb latch png transparent.png","birdsonthedistanceinbedroom.png",
    "sheetsscencefor5ssheetsandmom.png","sheet1.png","sheet2.png","sheet3.png","sheet4.png","sheet5.png",
    "sheetsss6.png","sheetsss7.png","sheetsss8.png","sheetsss9.png",
    "momshadowsillhoutecroppedbutnotperfectly.png","momsskirt.png",
    "eveningkite.png","night kite sky.png","child, kite .png","kite image.png",
    "basketforbedroom.png","childrenstoyforbedroom.png","childrenstoyforbedroom2.png",
    "childrenstoyforbedroom3.png","childrensbedroomtoy4.png",
    "bedroomclosed.png","bedroomopen.png","bedroompostpollution.png",
    "moresheets.png","moresheetspolluted.png","sheetswithmother.png","sheetspollutedwithmother.png",
    "childflykite.png","childflykiteevening.png","childflykite night.png","pollutedkitefly.png",
    "stargaze.png","pollutedstargaze.png","viewoftown.png","viewoftownafterpollution.png",
    "sheetspostpollution.png","sheetspostpollution with basket.png","bedroomopenver2.png",
    "binoculras png.avif"];
  for (const n of order) loadImg(n);
}

/* =========================================================================
   BAND SLICING
   Each band becomes its own canvas, wider than the frame so parallax has
   material to slide, with feathered top and bottom edges so seams never show.
   ========================================================================= */
const PLATE_CACHE = { key:"", plates:Object.create(null) };
const OVERSCAN = 0.22;                 // extra width, as a fraction of the frame

function sliceBands(def, which){
  const src = which==="hazed" ? def.hazed : def.clean;
  if (!src) return null;
  const im = loadImg(src);
  if (!imgReady(im)) return null;

  const cw = Math.max(2, (W*(1+OVERSCAN))|0);
  const out = [];
  const crop = def.crop || {x:0,y:0,w:1,h:1};
  const sx0 = crop.x*im.naturalWidth, sw = crop.w*im.naturalWidth;
  const sy0 = crop.y*im.naturalHeight, sh = crop.h*im.naturalHeight;

  let prev = 0;
  for (let i=0;i<def.bands.length;i++){
    const b = def.bands[i];
    // feather: bands overlap their neighbours by this much of the frame height
    const fe = H*0.075;
    const yTop = prev*H, yBot = b.to*H;
    const y0 = Math.max(0, yTop - (i>0?fe:0));
    const y1 = Math.min(H, yBot + (i<def.bands.length-1?fe:0));
    const bh2 = Math.max(2, (y1-y0)|0);

    const c = document.createElement("canvas");
    c.width = cw; c.height = bh2;
    const g = c.getContext("2d");

    // the slice of source that corresponds to these rows
    const ssy = sy0 + (y0/H)*sh;
    const ssh = ((y1-y0)/H)*sh;
    const dx = (cw - W)/2;
    g.drawImage(im, sx0, ssy, sw, ssh, dx, 0, W, bh2);

    // extend the outer columns so sliding never reveals emptiness
    if (dx>0){
      g.drawImage(c, dx, 0, 2, bh2, 0, 0, dx, bh2);
      g.drawImage(c, dx+W-2, 0, 2, bh2, dx+W, 0, dx, bh2);
    }

    // painted elements the code has to take over — the brass window pull has to
    // be draggable, so the painted one is stretched out of the sky first
    if (def.repair){
      for (const r of def.repair){
        const rx = dx + (r.x-r.w*0.5)*W, ry = (r.y-r.h*0.5)*H - y0;
        const rw = r.w*W, rh = r.h*H;
        if (ry+rh > 0 && ry < bh2) patchOut(c, rx, ry, rw, rh);
      }
    }

    // feather the joins with a destination-out ramp
    if (i>0){
      const gr = g.createLinearGradient(0,0,0,fe);
      gr.addColorStop(0,"rgba(0,0,0,1)"); gr.addColorStop(1,"rgba(0,0,0,0)");
      g.globalCompositeOperation="destination-out";
      g.fillStyle=gr; g.fillRect(0,0,cw,fe);
      g.globalCompositeOperation="source-over";
    }
    if (i<def.bands.length-1){
      const gr = g.createLinearGradient(0,bh2-fe,0,bh2);
      gr.addColorStop(0,"rgba(0,0,0,0)"); gr.addColorStop(1,"rgba(0,0,0,1)");
      g.globalCompositeOperation="destination-out";
      g.fillStyle=gr; g.fillRect(0,bh2-fe,cw,fe);
      g.globalCompositeOperation="source-over";
    }

    out.push({ cv:c, y:y0, h:bh2, p:b.p, dx });
    prev = b.to;
  }
  return out;
}

function getPlate(name){
  const key = (W|0)+"x"+(H|0);
  if (PLATE_CACHE.key !== key){ PLATE_CACHE.key = key; PLATE_CACHE.plates = Object.create(null); }
  let e = PLATE_CACHE.plates[name];
  if (e && e.done) return e;
  const def = PLATES[name];
  if (!def) return null;
  const clean = sliceBands(def, "clean");
  if (!clean) return null;                        // still loading
  const hazed = def.hazed ? sliceBands(def, "hazed") : null;
  e = { def, clean, hazed, done:true };
  PLATE_CACHE.plates[name] = e;
  return e;
}

/* =========================================================================
   DRAWING A PLATE
   `air` 0..1 cross-dissolves toward the polluted twin. `cam` is a small
   pointer-driven offset; each band takes it multiplied by its own parallax.
   ========================================================================= */
const PCAM = { x:0, y:0, tx:0, ty:0, drift:0 };
function updPlateCam(dt, t){
  // the camera answers the pointer, but lazily, and never quite settles
  const px2 = P.active ? (P.x/W - 0.5) : 0;
  const py2 = P.active ? (P.y/H - 0.5) : 0;
  PCAM.tx = px2*0.5;
  PCAM.ty = py2*0.32;
  PCAM.x += (PCAM.tx - PCAM.x)*Math.min(1, dt*1.6);
  PCAM.y += (PCAM.ty - PCAM.y)*Math.min(1, dt*1.6);
  PCAM.drift = t;
}

function drawPlate(name, o){
  o = o||{};
  const pl = getPlate(name);
  if (!pl) return false;
  const air = cl01(o.air===undefined?0:o.air);
  const mode = pl.def.dissolve || "none";
  const camx = (o.camx===undefined?PCAM.x:o.camx);
  const camy = (o.camy===undefined?PCAM.y:o.camy);
  // a slow involuntary drift, so a still frame is never quite still
  const dr = o.drift===false ? 0 : 1;
  const dx0 = Math.sin(PCAM.drift*0.06)*W*0.006*dr;
  const dy0 = Math.cos(PCAM.drift*0.045)*H*0.004*dr;
  const alpha = o.a===undefined?1:o.a;
  const skipBand = o.skipBand;
  /* draw one band and nothing else, so a sprite can be put behind the
     foreground: plate without its near band, sprite, then the near band on top */
  const onlyBand = o.onlyBand;

  for (let i=0;i<pl.clean.length;i++){
    if (skipBand===i) continue;
    if (onlyBand!==undefined && onlyBand!==i) continue;
    const b = pl.clean[i];
    const ox = -b.dx + (camx*b.p*W*0.36) + dx0*b.p*6;
    const oy = (camy*b.p*H*0.22) + dy0*b.p*6;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(b.cv, ox, b.y+oy);
    // the polluted twin, over the top
    if (air>0.004 && pl.hazed && pl.hazed[i]){
      // "sky" mode dissolves only the far bands, where nothing moved between
      // generations; nearer bands keep their clean detail and get re-lit instead
      const far = i <= 1;
      const aa = (mode==="full" || (mode==="sky" && far)) ? air : 0;
      if (aa>0.004){
        ctx.globalAlpha = alpha*aa;
        const hb = pl.hazed[i];
        ctx.drawImage(hb.cv, ox, hb.y+oy);
      }
    }
    ctx.restore();
  }
  // for "sky" plates the near bands must still lose their colour, or the
  // foreground stays summer-green under a dead sky
  if (air>0.01 && mode==="sky"){
    relight(air, pl, camx, camy, dx0, dy0, alpha, skipBand);
  }
  return true;
}

/* Re-light the bands that were not dissolved: drain saturation and push toward
   the hazed sky's own colour, clipped to the band's own pixels so it reads as
   the light changing rather than a wash over the top. */
const RL = document.createElement("canvas"); const rlx = RL.getContext("2d");
function relight(air, pl, camx, camy, dx0, dy0, alpha, skipBand){
  const tint = hazeTint();
  for (let i=2;i<pl.clean.length;i++){
    if (skipBand===i) continue;
    const b = pl.clean[i];
    if (RL.width!==b.cv.width || RL.height!==b.cv.height){ RL.width=b.cv.width; RL.height=b.cv.height; }
    rlx.setTransform(1,0,0,1,0,0);
    rlx.globalCompositeOperation="source-over";
    rlx.clearRect(0,0,RL.width,RL.height);
    rlx.drawImage(b.cv,0,0);
    rlx.globalCompositeOperation="saturation";
    rlx.fillStyle="rgb(128,128,128)";
    rlx.globalAlpha=cl01(air*0.80);
    rlx.fillRect(0,0,RL.width,RL.height);
    rlx.globalCompositeOperation="source-atop";
    rlx.globalAlpha=cl01(air*0.42);
    rlx.fillStyle=rgb(tint);
    rlx.fillRect(0,0,RL.width,RL.height);
    rlx.globalAlpha=1;
    rlx.globalCompositeOperation="source-over";
    const ox = -b.dx + (camx*b.p*W*0.36) + dx0*b.p*6;
    const oy = (camy*b.p*H*0.22) + dy0*b.p*6;
    ctx.save(); ctx.globalAlpha=alpha; ctx.drawImage(RL, ox, b.y+oy); ctx.restore();
  }
}
/* the colour the polluted air pushes everything toward — warm, never neutral */
function hazeTint(){ return [206,196,176]; }

/* =========================================================================
   MESH WARP — painted pixels through the cloth mesh
   This is what makes a painted bedsheet billow. The band's pixels are drawn as
   a grid of quads, each transformed to follow the same mesh the procedural
   cloth builds, so the painting itself deforms under the pointer.
   ========================================================================= */
function warpImage(img, sx, sy, sw, sh, dstFn, cols, rows){
  cols = cols||10; rows = rows||8;
  const cw = sw/cols, ch = sh/rows;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      // destination corners from the caller's deformation function
      const p00 = dstFn(c/cols,     r/rows);
      const p10 = dstFn((c+1)/cols, r/rows);
      const p01 = dstFn(c/cols,     (r+1)/rows);
      // affine from the three corners — enough for a smooth cloth
      const ax = (p10.x-p00.x)/cw, ay = (p10.y-p00.y)/cw;
      const bx = (p01.x-p00.x)/ch, by = (p01.y-p00.y)/ch;
      ctx.save();
      ctx.transform(ax, ay, bx, by, p00.x, p00.y);
      // a hair of bleed stops seams between quads
      ctx.drawImage(img, sx+c*cw, sy+r*ch, cw+1.1, ch+1.1, 0, 0, cw+1.1, ch+1.1);
      ctx.restore();
    }
  }
}

/* ---------------------------------------------------------------- REPAIR
   Sometimes a painted element has to go, because the code needs control of it —
   the kite has to be flyable, so the painted one cannot stay. This paints a
   region out by stretching the pixels either side of it inward, which on sky and
   open ground is invisible. Only ever used on small areas over simple gradients.
*/
function patchOut(cv, x, y, w, h, o){
  o = o||{};
  const g = cv.getContext("2d");
  const feather = o.feather===undefined ? Math.max(6, w*0.30) : o.feather;
  // sample a column from each side and cross-fade them across the hole
  const lw = Math.max(2, (w*0.22)|0);
  g.save();
  // left source stretched right, right source stretched left, blended in the middle
  g.drawImage(cv, x-lw, y, lw, h, x, y, w, h);
  g.globalAlpha = 0.5;
  g.drawImage(cv, x+w, y, lw, h, x, y, w, h);
  g.globalAlpha = 1;
  // soften the join so the seam does not read as an edge
  const gr = g.createLinearGradient(x, y, x, y+h);
  g.restore();
  // feather the patch boundary by redrawing the original ring over it
  g.save();
  g.beginPath();
  g.rect(x-feather, y-feather, w+feather*2, h+feather*2);
  g.rect(x, y, w, h);
  g.clip("evenodd");
  g.restore();
}
