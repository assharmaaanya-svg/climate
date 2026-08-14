/* ============================================================================
   THE SKY, AFTER
   ============================================================================
   The same field, the same hour, the same reason to be standing in it. What is gone is
   the sky — and the chapter's whole argument is that it is gone by SUBTRACTION. There is
   no effect here. There is a painting, a handful of stars that are not really making it
   through, and five sentences with silence between them.

   WHAT THE PAINTING ALREADY DOES
   afterpollutionstarscene.png arrives with the work mostly done: a brown-grey haze lit
   from underneath by the city, a moon with a halo round it instead of an edge, two or
   three faint stars near the top right, and no Milky Way at all. It is 1672x941, which is
   close enough to a widescreen frame that it needs almost no crop — so it is a plate like
   every other painting here, in bands with their own parallax, and it fills the frame and
   drifts rather than sitting on the page as a picture.

   WHAT IS ADDED, AND HOW LITTLE
   Eleven stars. Not a field: eleven. Most of the sky has none, which is the point and not
   an oversight. They are graded, because losing a sky is graded — the faint ones go first
   and the bright ones only dim:

     - seven that are barely there at all (peak alpha 0.05 to 0.13), soft-edged, no core
     - three that hold on (0.18 to 0.30), with a bloom around them rather than a point
     - one that is nearly the star it was, and still nowhere near white

   Nothing is drawn as a crisp point. Every one of them is a small radial bloom in dirty
   cream, because a star seen through particulate is not a point source any more — it is
   a smeared one, and what reaches you is scattered as much as direct.

   AND THEY DO NOT TWINKLE
   Twinkling is beautiful and this must not be. What some of them do instead is fade: a
   star that was just about visible becomes harder to see over ten or twenty seconds and
   then comes back, or nearly does. Each one that does this has its own period, and those
   periods do not divide into each other, so the sky never moves as one thing and nothing
   in it is ever on a beat. Four of the eleven are held perfectly still on purpose, so
   there is always something that is definitely not moving to compare the rest against.

   WHAT IS NOT HERE
   No shooting star — that is the chapter. No fireflies, no glow in the grass, nothing
   that could be mistaken for one. No constellation to find, no star to tap, no card. The
   sky the chapter before this one had is not hiding somewhere in this file.
   ========================================================================== */

const SKYA = {
  seq: -1,        // the sequence clock, -1 until the scene is entered
  line: -1,       // which sentence is showing, -1 for none
  over: 0
};

/* THE ELEVEN.
   `x`,`y` are fractions of the frame. Nothing is placed in the top left, because the moon
   is painted there and a star beside a moon is a star nobody looks at. `m` is how much of
   it survives — peak alpha. `r` is its bloom radius as a fraction of the smaller screen
   dimension. `f` is its own fading period in seconds, or 0 for one that does not fade;
   the periods are chosen not to divide into one another. `p` is its phase. */
const SKYA_STARS = [
  /* the seven that are barely there */
  { x:0.552, y:0.104, m:0.070, r:0.0085, f:23.7, p:0.00 },
  { x:0.618, y:0.318, m:0.055, r:0.0080, f: 0,   p:0.00 },
  { x:0.769, y:0.152, m:0.092, r:0.0092, f:31.1, p:1.90 },
  { x:0.836, y:0.352, m:0.061, r:0.0082, f:41.3, p:0.70 },
  { x:0.404, y:0.213, m:0.084, r:0.0090, f: 0,   p:0.00 },
  { x:0.912, y:0.238, m:0.128, r:0.0100, f:29.3, p:2.60 },
  { x:0.331, y:0.086, m:0.058, r:0.0080, f:37.9, p:1.15 },
  /* the three that hold on */
  { x:0.688, y:0.196, m:0.205, r:0.0135, f:53.1, p:0.45 },
  { x:0.474, y:0.291, m:0.181, r:0.0126, f: 0,   p:0.00 },
  { x:0.884, y:0.108, m:0.238, r:0.0142, f:47.3, p:3.10 },
  /* and the one that is nearly what it was */
  { x:0.604, y:0.078, m:0.302, r:0.0168, f: 0,   p:0.00 }
];
/* dirty cream, not white. The brighter a star is the less of the haze's colour it has
   taken, which is the one thing about this that is flattering to any of them. */
const SKYA_DIM  = [188, 178, 158];
const SKYA_LIT  = [226, 216, 192];

/* THE SEQUENCE, AND THE SILENCE IN THE MIDDLE OF IT.
   Five sentences. The gap between the fourth and the fifth is the longest thing in the
   chapter and it is the reason the chapter exists: it is exactly long enough that somebody
   who remembers the sky before this one starts watching for something to cross it. Nothing
   does. Only then does the last sentence arrive, and it is left alone afterwards — nothing
   follows it, and the empty sky finishes the thought.

   (There is an optional sixth line in the brief for this — "After a while, you stopped
   waiting." — to be used only if the scene needs one more beat. It does not. Five sentences
   ending on two words is a stronger ending than six.) */
const SKYA_SAY = [
  { at: 1.2,  hold: 4.4, text:"You still looked for them." },
  { at: 6.6,  hold: 4.8, text:"Most nights, there were only a few left." },
  { at: 12.8, hold: 4.8, text:"Even those seemed to fade if you looked too long." },
  { at: 19.0, hold: 4.4, text:"You kept waiting for a shooting star." },
  /* 4.8 seconds of nothing at all across an empty sky */
  { at: 29.4, hold: 6.0, text:"None came." }
];
const SKYA_END = 36.5;          // and then the scroll opens

function resetStarsAfter(){
  SKYA.seq = -1; SKYA.line = -1; SKYA.over = 0;
}

function updStarsAfter(dt){
  SKYA.seq = SKYA.seq < 0 ? 0 : SKYA.seq + dt;
  const s = SKYA.seq;
  for (let i = 0; i < SKYA_SAY.length; i++){
    const L = SKYA_SAY[i];
    if (s >= L.at && SKYA.line < i){
      SKYA.line = i;
      if (typeof sayLine === "function") sayLine(L.text, L.hold);
    }
  }
  if (s >= SKYA_END) SKYA.over = 1;
}

/* how far through the wait the visitor is. This one matters more than most: the scroll is
   held for the whole sequence and the sky does not change while it is, so the moving bar is
   the only thing telling somebody the piece is still running rather than stuck. */
function starsAfterProgress(){
  if (SKYA.over) return 1;
  return SKYA.seq < 0 ? 0 : cl01(SKYA.seq / SKYA_END);
}

/* one star, as a bloom rather than a point */
function drawFaintStar(t, st, air){
  let a = st.m;
  /* its own slow extinction, on its own period. Two waves whose ratio is irrational, so
     the shape never repeats exactly, biased low so it spends longer being hard to see than
     being easy to. It never reaches zero and never reaches full: what happens to a star in
     dirty air is not a switch. */
  if (st.f > 0){
    const w = Math.sin(t*(TAU/st.f) + st.p)*0.62
            + Math.sin(t*(TAU/(st.f*0.6180339)) + st.p*1.7)*0.38;
    a *= 0.34 + 0.66*cl01(0.5 + w*0.5);
  }
  a *= air;
  if (a <= 0.004) return;
  const cx = AP.x + st.x*AP.w, cy = AP.y + st.y*AP.h;
  const R = MIN*st.r;
  ctx.save();
  /* additive, because this is light arriving through something rather than paint sitting
     on top of it — but at these alphas it never brightens the sky into a hole */
  ctx.globalCompositeOperation = "lighter";
  const col = mixL(SKYA_DIM, SKYA_LIT, cl01((st.m - 0.05)/0.28));
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0.00, rgba(col, a));
  g.addColorStop(0.35, rgba(col, a*0.42));
  g.addColorStop(1.00, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  /* the brighter ones get a small centre, still soft and still not white */
  if (st.m > 0.16){
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R*0.30);
    g2.addColorStop(0, rgba(SKYA_LIT, a*0.80));
    g2.addColorStop(1, rgba(SKYA_LIT, 0));
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(cx, cy, R*0.30, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawStarsAfter(t, dt, o){
  o = o || {};
  apFull();
  if (!getPlate("starsAfter")){ ctx.fillStyle = "#2a241d"; ctx.fillRect(0,0,W,H); return; }

  updStarsAfter(dt);

  /* the painting, in its bands, drifting. It is the scene — nothing is drawn under it and
     nothing reconstructs any part of it. */
  drawPlate("starsAfter", { air: 0 });

  /* the air itself, thin and even. This is the only particle field in the chapter and it
     is deliberately weak: the sky is already carrying the pollution in paint, and a visible
     drift of motes over the top of it would be the scene explaining itself twice. */
  partRole = 2;
  drawParticles(t, 0.30, { x:W*0.5, y:H*0.28, r:H*1.2 });

  /* and the eleven. Nothing else goes in this sky: no constellation, no meteor, and
     nothing in the grass — see the header. */
  for (const st of SKYA_STARS) drawFaintStar(t, st, 1);

  /* the city under the horizon is the only sound, and it is a hum rather than a place */
  cityNight(dt, 1);
  cv.className = "";
  if (o.gate && SKYA.over) meet(o.gate);
}
