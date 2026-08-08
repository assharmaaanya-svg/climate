/* ============================================================================
   THE ONSLAUGHT
   The hinge of the whole piece. Everything before it is one remembered morning.
   Everything after it is the same morning with the air gone wrong. Between them,
   for about twenty-seven seconds, the artwork stops being a memory and becomes a
   quantity, and cannot hold it.

   THIS IS THE ONE SEQUENCE THAT RUNS ON A CLOCK.
   Every other beat in the piece is scroll-driven: the visitor's scroll position
   is the playhead, and that is right for a memory you move through at your own
   pace. This one cannot work that way. "Five or six seconds of nothing", "each
   fact arrives before you can read it", "cut instantly", "hold black for two or
   three seconds" are all statements about time, and a scroll-driven version of
   them is a different thing entirely — a visitor scrolling briskly would get four
   facts and a shrug. So the sequence takes the screen, runs its own length, and
   gives it back.

   That is not the same as the interaction gates that used to block the scroll.
   A gate waited for the visitor to DO something and would wait forever. This
   waits for nothing, needs nothing, and ends on its own. Escape leaves it early
   for anyone who needs out.

   THE SHAPE
     0.0 - 1.8    the last image goes to black, slowly
     1.4 - 7.0    "..." where the narration usually sits, and nothing else
     7.0 - 8.0    black. Not even the dots.
     8.0 - 23.0   eleven facts, accelerating, piling up on each other, echoing
    23.0 - 25.0   all of it at once, held, shaking, mostly unreadable
    25.0          cut. Not a fade — a cut.
    25.0 - 27.8   black, and silence
   ========================================================================== */

const ONS_T = {
  fadeEnd:  1.8,
  dotsIn:   1.4,
  dotsOut:  7.0,
  factsAt:  8.0,
  factsFor:15.0,
  /* the wall stands for two full seconds after the last sentence lands. It is the
     only part of the sequence that is allowed to be still, and it is what makes the
     cut afterwards register as a cut rather than as the next thing starting. */
  peakFor:  2.0,
  blackFor: 2.8
};
/* how long one sentence takes to go from white to entirely red, on its own clock */
const ONS_REDDEN = 3.5;
const ONS_CUT = ONS_T.factsAt + ONS_T.factsFor + ONS_T.peakFor;   // 24.1
const ONS_END = ONS_CUT + ONS_T.blackFor;                         // 26.9

const ONS = {
  t: 0,
  running: 0,
  played: 0,
  built: "",
  facts: [],        // one laid-out body per fact
  slots: [],        // every placement of every fact, in arrival order
  noise: null,
  dropT: 0, drop: 0,
  tear: 0
};

/* The eleven, in the artist's words, unchanged. `**...**` marks the figure — the
   thing the sentence is actually about, and the first thing to go red.

   `keys` are the words that turn red in the middle of the escalation, before the
   rest of the sentence follows them. They are chosen, not computed: "dies",
   "innocent", "stolen", "brain" are what these sentences are for, and letting an
   algorithm pick would redden "the" and "of" on the way to them. */
const ONS_FACTS = [
  { s:"**99%** of humanity is forced to breathe air that exceeds standard safety guidelines.",
    keys:["humanity","forced","breathe"] },
  { s:"A child under five dies every single minute from air pollution, taking over **700,000** innocent lives every year before they ever get the chance to grow up.",
    keys:["child","dies","minute","innocent","lives"] },
  { s:"**90%** of all air pollution deaths strike developing nations, forcing those who contribute the least to suffer the absolute most.",
    keys:["deaths","least","suffer","most"] },
  { s:"Despite taking **8 million** lives every single year, clean air receives less than **1%** of international aid funding.",
    keys:["lives","clean","less"] },
  { s:"Air pollution is the **#2** leading cause of death on planet Earth, stealing **1 in every 8** human lives worldwide.",
    keys:["death","Earth","stealing","lives"] },
  { s:"**2.2 years** of human life expectancy are stolen from every person on Earth by ambient air pollution.",
    keys:["life","stolen","every","Earth"] },
  { s:"**86%** of all air pollution deaths are caused by chronic noncommunicable diseases like heart attacks, strokes, and lung cancer.",
    keys:["deaths","heart","strokes","cancer"] },
  { s:"**600,000+** people are pushed into dementia every year because toxified air reaches directly into the human brain.",
    keys:["dementia","toxified","brain"] },
  { s:"Up to **16%** of global staple crops like wheat and rice are destroyed by ground-level ozone, starving millions before food even reaches the table.",
    keys:["destroyed","starving","millions","food"] },
  { s:"**158 countries**, nearly **3 out of every 4** nations, have zero legally binding air quality standards to protect their citizens.",
    keys:["zero","protect","citizens"] },
  { s:"Only **0.1%** of all global philanthropic grant funding goes toward fighting the air we breathe.",
    keys:["Only","breathe"] }
];

/* the scratch frame. The tear bands need a copy of what has just been drawn,
   because a canvas cannot slide pieces of itself sideways in place. */
const ONSBUF = document.createElement("canvas"), onsc = ONSBUF.getContext("2d");

/* Static that works on black, which the piece's own grain does not: drawGrain
   composites with `overlay`, and overlay against a black backdrop stays black. So
   this is a sparse speckle tile drawn straight over the top — bright dust on
   nothing. Two densities, because the late phase needs coarser grain than a
   uniform hiss can give. */
const ONS_TILE = [];
function buildOnsStatic(){
  if (ONS_TILE.length) return;
  for (const spec of [{ n:1900, s:1 }, { n:520, s:2 }]){
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    for (let i=0;i<spec.n;i++){
      const v = 130 + Math.random()*125;
      g.fillStyle = "rgba("+(v|0)+","+(v|0)+","+((v*0.97)|0)+","+(0.35+Math.random()*0.65).toFixed(2)+")";
      g.fillRect((Math.random()*256)|0, (Math.random()*256)|0, spec.s, spec.s);
    }
    ONS_TILE.push(c);
  }
}
function drawOnsStatic(a, coarse){
  if (a < 0.006) return;
  buildOnsStatic();
  const tile = ONS_TILE[coarse ? 1 : 0];
  ctx.save();
  ctx.globalAlpha = Math.min(0.85, a);
  // a different offset every frame, or it reads as a texture rather than as noise
  const ox = -((Math.random()*256)|0), oy = -((Math.random()*256)|0);
  for (let y=oy; y<H; y+=256) for (let x=ox; x<W; x+=256) ctx.drawImage(tile, x, y);
  ctx.restore();
}

const ONS_SERIF = "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif";
/* Near-white rather than white, and a red that starts as old blood and ends hot.
   The colour escalates as well as spreading: at the beginning red is something
   that has already happened, and by the end it is something happening now. */
const ONS_INK  = [242,240,235];
const ONS_RED0 = [150,20,14];
const ONS_RED1 = [255,48,28];

/* ------------------------------------------------------------------- layout
   Each fact is measured and wrapped once per screen size. Later facts are set
   bigger, further off centre, and allowed a wrapping width WIDER than the frame,
   so by the end the sentences genuinely run off the edges and are cropped rather
   than politely fitted. Positions come from a fixed seed: the pile has to look
   composed, not like a different accident on every visit. */
function onsLayout(){
  const key = (W|0)+"x"+(H|0);
  if (ONS.built === key) return;
  ONS.built = key;
  ONS.facts = [];
  _sd = 20260808;

  ctx.save();
  for (let i=0;i<ONS_FACTS.length;i++){
    const f = ONS_FACTS[i];
    const esc = i/(ONS_FACTS.length-1);
    const size = MIN * lerp(0.037, 0.064, esc);
    const maxW = W * lerp(0.70, 1.16, esc);
    const lead = size * 1.30;

    // split into tokens, keeping the ** ** runs together as one word each
    const toks = [];
    const parts = f.s.split("**");
    for (let p=0;p<parts.length;p++){
      const isNum = (p % 2) === 1;
      if (!parts[p]) continue;
      if (isNum){
        toks.push({ text:parts[p], cls:"n" });
      } else {
        for (const w of parts[p].split(/\s+/)){
          if (!w) continue;
          const bare = w.replace(/[^A-Za-z0-9%+#.,]/g,"").replace(/[.,]+$/,"");
          const isKey = f.keys.some(k => k.toLowerCase() === bare.toLowerCase());
          toks.push({ text:w, cls: isKey ? "k" : "p" });
        }
      }
    }
    // measure and wrap
    const spaceW = (()=>{ ctx.font = "400 "+size+"px "+ONS_SERIF; return ctx.measureText(" ").width; })();
    for (const tk of toks){
      ctx.font = (tk.cls==="n" ? "700 " : "400 ") + size + "px " + ONS_SERIF;
      tk.w = ctx.measureText(tk.text).width;
      /* WHERE IN ITS OWN THREE AND A HALF SECONDS THIS WORD TURNS.
         Each sentence flashes up white and is entirely red by the end of its own
         window — but not all at once, and not in reading order. The figure goes
         first, because the figure is what the sentence is; then the words that
         carry it; then everything else, each at its own moment. So the red crosses
         the sentence in patches rather than sweeping through it, which is what
         something spreading looks like and what a wipe does not.

         Because the last facts land less than a second apart, four or five
         sentences are always mid-transition at once, and the pile is a gradient
         from white at the front to fully red behind. */
      tk.thr = tk.cls==="n" ? 0
             : tk.cls==="k" ? 0.24 + srnd()*0.14
             :                0.42 + srnd()*0.46;
    }
    const lines = [];
    let cur = [], curW = 0;
    for (const tk of toks){
      const add = (cur.length ? spaceW : 0) + tk.w;
      if (cur.length && curW + add > maxW){ lines.push({ toks:cur, w:curW }); cur=[]; curW=0; }
      curW += (cur.length ? spaceW : 0) + tk.w;
      cur.push(tk);
    }
    if (cur.length) lines.push({ toks:cur, w:curW });

    ONS.facts.push({ lines, size, lead, spaceW, blockH: lines.length*lead, esc });
  }

  /* ------------------------------------------------------------- placements
     A fact is a body of text; where and when it appears is separate from it, and
     a fact can appear more than once.

     Eleven sentences arriving one after another is a list, and a list is something
     a reader gets on top of. So each one comes back: after its first appearance it
     returns somewhere else on the screen, at a different size, faint, and it keeps
     returning. By the peak there are around thirty-five blocks of type on a screen
     that has room for about four, which is the only honest way to draw a number
     nobody can hold in their head. Most of it cannot be read. That is the content.

     Two kinds of placement:
       MAIN  full strength, one per fact, in spawn order. Always the legible one.
       ECHO  faint, any size, anywhere, arriving from about a third of the way in
             and still arriving during the peak.
     Both are laid out from the same fixed seed, so the wall is composed rather
     than a different accident every time. */
  ONS.slots = [];
  const nf = ONS_FACTS.length;
  for (let i=0;i<nf;i++){
    /* spawn times: the same fifteen seconds, but the gaps shrink from about two and
       a half seconds down to three quarters of one, so the last few land before the
       eye has finished the one before */
    const at = ONS_T.factsAt + ONS_T.factsFor * Math.pow(i/nf, 0.72);
    const esc = i/(nf-1);
    ONS.slots.push({
      f:i, at, main:1, sc:1, dim:1,
      /* Spread across the whole frame, not a band down the middle. Later ones go
         further out, so the pile grows outward from the first sentence and the
         edges start cutting words in half. */
      cx: W*0.5 + (srnd()*2-1) * W * lerp(0.05, 0.34, esc),
      cy: H*0.5 + (srnd()*2-1) * H * lerp(0.10, 0.40, esc),
      rot: (srnd()*2-1) * lerp(0, 0.055, esc),
      jit: srnd()*TAU
    });
  }
  for (let e=0;e<26;e++){
    const u = e/25;
    const f = (srnd()*nf)|0;
    ONS.slots.push({
      f, main:0,
      // from a third of the way in, and still coming while everything shakes
      at: ONS_T.factsAt + ONS_T.factsFor*(0.34 + 0.70*u),
      sc: 0.58 + srnd()*0.72,
      dim: 0.13 + srnd()*0.20,
      cx: W*(0.10 + srnd()*0.80),
      cy: H*(0.08 + srnd()*0.84),
      rot: (srnd()*2-1)*0.075,
      jit: srnd()*TAU
    });
  }
  ONS.slots.sort((a,b) => a.at - b.at);
  ctx.restore();
}

/* --------------------------------------------------------------------- audio
   Static, built from the same noise the rest of the piece uses. It opens rather
   than gets louder: a lowpass climbing from a hiss you would not notice to the
   whole spectrum, which is what something failing sounds like. */
function onsNoise(level, cut){
  if (!AC || !soundOn) return;
  if (!ONS.noise){
    try{
      const s = AC.createBufferSource(); s.buffer = noiseBuf(AC, 3); s.loop = true;
      const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 380; f.Q.value = 0.6;
      const hp = AC.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 120;
      const g = AC.createGain(); g.gain.value = 0;
      s.connect(hp); hp.connect(f); f.connect(g);
      // below the master fader, which is on its way to zero
      g.connect(postBus || AC.destination); s.start();
      ONS.noise = { s, f, g };
    }catch(_){ ONS.noise = { dead:1 }; }
  }
  const n = ONS.noise;
  if (!n || n.dead || !n.gain && !n.g) return;
  const now = AC.currentTime;
  if (cut){
    // the cut is a cut. No ramp, no tail.
    try{ n.g.gain.cancelScheduledValues(now); n.g.gain.setValueAtTime(0, now); }catch(_){}
    return;
  }
  const L = cl01(level);
  try{
    n.g.gain.setTargetAtTime(0.0009 + L*L*0.115, now, 0.22);
    n.f.frequency.setTargetAtTime(380 + L*L*7200, now, 0.30);
  }catch(_){}
}
function onsNoiseStop(){
  if (ONS.noise && ONS.noise.g && AC){
    try{ ONS.noise.g.gain.cancelScheduledValues(AC.currentTime);
         ONS.noise.g.gain.setValueAtTime(0, AC.currentTime); }catch(_){}
  }
}

/* ---------------------------------------------------------------------- reset */
function resetOnslaught(){
  ONS.t = 0;
  ONS.running = ONS.played ? 0 : 1;
  ONS.drop = 0; ONS.dropT = 0; ONS.tear = 0;
  onsNoiseStop();
}
/* Escape leaves. Nothing else does, because a stray click during the one sequence
   the piece has been building toward should not end it. */
function onsSkip(){
  if (!ONS.running) return false;
  ONS.t = ONS_END; ONS.running = 0; ONS.played = 1;
  onsNoiseStop();
  onsHandOff();
  return true;
}

/* THE PIECE PUTS THE VISITOR DOWN SOMEWHERE, RATHER THAN LETTING GO ON BLACK.
   The last three seconds are a held black with the scroll locked, which is the
   intended effect and is also indistinguishable from a page that has crashed. So
   when the clock runs out the sequence does not just unlock and wait to be scrolled
   out of — it moves the playhead into the next beat itself, and the visitor finds
   they are somewhere again. Scrolling is theirs from that moment.

   The scroll position and the eased playhead are both set: leaving T.p to glide
   there on its own would drift through several more seconds of black first, which
   is the problem this is meant to solve. */
function onsHandOff(){
  const oi = onsBeatIndex();
  if (oi < 0 || oi+1 >= N) return;
  const target = ofs[oi+1] + BEATS[oi+1].len*0.10;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo(0, (target/TOTAL) * max);
  T.p = target; T.target = target;
}
/* what the timeline asks, every frame, to know whether to hold the playhead and
   whether the sequence is still ahead of the visitor */
function onslaughtHolding(){ return !!ONS.running && ONS.t < ONS_END; }
function onsPlayed(){ return !!ONS.played; }
let _onsI = -2;
function onsBeatIndex(){
  if (_onsI === -2) _onsI = BEATS.findIndex(b => b.id === "onslaught");
  return _onsI;
}

/* ---------------------------------------------------------------------- draw */
function drawOnslaught(t, dt){
  onsLayout();
  if (ONS.played && !ONS.running){
    // been here before: it does not replay, it is simply black
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,W,H);
    document.body.classList.add("onslaught");
    return;
  }
  document.body.classList.add("onslaught");
  ONS.t += dt;
  const T0 = ONS.t;
  const slow = REDUCE ? 1.35 : 1;              // reduced motion gets more reading time
  const after = ONS_END*slow;
  if (T0 >= after && ONS.running){
    ONS.running = 0; ONS.played = 1; onsNoiseStop();
    onsHandOff();
  }

  /* ---- the world goes, and it is gone before the picture is ----
     A second, so the mix is already silent by the time the screen finishes going
     black at 1.8. Any slower and a bird lands on the black. */
  SILENCE = cl01(T0 / 1.0);
  OUTSIDE = 0;
  if (T0 < ONS_T.fadeEnd){
    /* the last thing the visitor was looking at, going out. It is the valley the
       drawing was a drawing of, which is where the previous beat left them. */
    drawPlate("town", { air:0.16 });
    ctx.fillStyle = rgba([0,0,0], ease.io(cl01(T0/ONS_T.fadeEnd)));
    ctx.fillRect(0,0,W,H);
  } else {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,W,H);
  }

  /* ---- after the cut there is nothing at all ---- */
  if (T0 >= ONS_CUT*slow){
    onsNoise(0, true);
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,W,H);
    return;
  }

  /* ---- the dots, where the narration usually is ----
     The narration's own face at the narration's own size and the narration's own
     place, so it reads as the piece pausing rather than as a new element arriving.
     On instantly and off instantly, like everything else in this sequence: there is
     nothing to ease in a held breath. The size is the CSS clamp #cap uses,
     evaluated here because canvas needs a number. */
  if (T0 >= ONS_T.dotsIn && T0 < ONS_T.dotsOut){
    ctx.save();
    ctx.font = "400 " + cl(W*0.035, 17.6, 28) + "px " + ONS_SERIF;
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = rgba(ONS_INK, 0.82);
    ctx.fillText("...", W*0.5, H - H*0.22);
    ctx.restore();
  }

  /* ---- the facts ---- */
  const fT = (T0 - ONS_T.factsAt*slow) / slow;
  if (fT <= -0.02){ onsNoise(0.03, false); return; }

  /* how far into the pile we are: this drives the red, the static, the shake and
     the size of everything, so all of them escalate together rather than each on
     its own schedule */
  const g = cl01((T0/slow - ONS_T.factsAt) / (ONS_T.factsFor + ONS_T.peakFor));
  const peak = cl01((T0/slow - (ONS_T.factsAt + ONS_T.factsFor)) / ONS_T.peakFor);
  onsNoise(0.05 + g*0.75 + peak*0.25, false);

  const shakeAmt = REDUCE ? 0 : (MIN*0.004*g*g + MIN*0.012*peak);
  const sx = Math.sin(T0*47)*shakeAmt + Math.sin(T0*23.3)*shakeAmt*0.6;
  const sy = Math.cos(T0*41)*shakeAmt*0.8 + Math.cos(T0*19.7)*shakeAmt*0.5;

  /* the red of the moment: old blood at first, hot at the end */
  const redNow = mixL(ONS_RED0, ONS_RED1, cl01(g*1.1));

  ctx.save();
  ctx.translate(sx, sy);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

  const now = T0/slow;
  /* Every placement that has arrived, in arrival order, so the newest is drawn last
     and lands on top of everything before it. The echoes are faint and go
     underneath by virtue of being older, which is what makes a wall with one
     readable sentence on the front of it rather than uniform mush. */
  let mains = 0;
  for (const S of ONS.slots) if (S.main && now >= S.at) mains++;

  let mi = 0;
  for (const S of ONS.slots){
    if (now < S.at) break;                 // sorted by arrival
    const F = ONS.facts[S.f];
    /* It is simply there. No fade in, not even the fifty milliseconds this had at
       first: a fade is an invitation to read and these are not offering one. One
       frame it is not on the screen and the next frame it is.

       A main sinks as the mains after it land on top — not away, just under. An echo
       is faint from the moment it arrives and stays that way. */
    let a;
    if (S.main){ mi++; a = lerp(1, 0.28, cl01((mains - mi)/4.5)); }
    else       { a = S.dim * (0.55 + 0.45*g); }
    /* Its own clock. Every sentence flashes up white and takes three and a half
       seconds to go completely red, wherever it is in the sequence and whether it is
       the first appearance or one of the echoes. */
    const prog = cl01((now - S.at) / ONS_REDDEN);

    ctx.save();
    ctx.translate(S.cx, S.cy);
    if (S.rot) ctx.rotate(S.rot);
    if (S.sc !== 1) ctx.scale(S.sc, S.sc);
    // at the peak each block gets its own tremor, so they collide with each other
    if (peak > 0 && !REDUCE){
      ctx.translate(Math.sin(T0*31 + S.jit)*MIN*0.009*peak/S.sc,
                    Math.cos(T0*27 + S.jit)*MIN*0.007*peak/S.sc);
    }
    const y0 = -F.blockH*0.5 + F.lead*0.78;
    for (let li=0; li<F.lines.length; li++){
      const ln = F.lines[li];
      let x = -ln.w*0.5;
      const y = y0 + li*F.lead;
      for (const tk of ln.toks){
        ctx.font = (tk.cls==="n" ? "700 " : "400 ") + F.size + "px " + ONS_SERIF;
        // each word crosses over on its own, quickly but not instantly
        const r = cl01((prog - tk.thr)/0.11);
        const col = r<=0 ? ONS_INK : mixL(ONS_INK, redNow, r);
        ctx.fillStyle = rgba(col, a);
        ctx.fillText(tk.text, x, y);
        x += tk.w + F.spaceW;
      }
    }
    ctx.restore();
  }
  ctx.restore();

  /* ---- the picture stops being able to hold it ----
     Not a glitch effect. Three things that all mean the same thing: bands of the
     frame slipping out of line, the grain going coarse, and the whole image
     dropping out for a frame or two at a time. Nothing neon, no channel splitting,
     because that reads as style. This should read as failure. */
  /* Clamped, and it matters. Un-clamped this reached 1.85 at the peak, which drove
     the dropout interval negative — so instead of the frame flickering out now and
     then, it dropped out on every single frame and the climax of the whole piece
     was a permanent 72% black veil over its own text. */
  const fail = cl01(g*g*0.85 + peak*0.80);
  if (fail > 0.05 && !REDUCE && !autoLow){
    if (ONSBUF.width !== (W|0) || ONSBUF.height !== (H|0)){
      ONSBUF.width = Math.max(2,W|0); ONSBUF.height = Math.max(2,H|0);
    }
    onsc.setTransform(1,0,0,1,0,0);
    onsc.globalAlpha = 1;
    onsc.clearRect(0,0,ONSBUF.width,ONSBUF.height);
    onsc.drawImage(cv, 0,0, cv.width, cv.height, 0,0, W, H);

    const bands = Math.min(14, Math.round(1 + fail*13));
    ONS.tear += dt*(0.6 + fail*3.2);
    for (let b=0;b<bands;b++){
      const u = ((ONS.tear*0.21 + b*0.137) % 1);
      const by = u*H;
      const bh = H*(0.006 + 0.030*((b*37%11)/11));
      const off = (((b*53)%17)/17*2-1) * W * (0.008 + 0.055*fail);
      /* black the band out before sliding the copy in. Drawing the offset copy
         straight over the top leaves the original showing at both ends, which
         reads as a double exposure; clearing first makes it a displacement. */
      ctx.fillStyle = "#000";
      ctx.fillRect(0, by, W, bh);
      ctx.drawImage(ONSBUF, 0, by, W, bh, off, by, W, bh);
    }
    // and the frame drops out altogether, more and more often
    ONS.dropT -= dt;
    if (ONS.dropT <= 0){
      // a floor on the gap, so this stays a flicker and never becomes a veil
      ONS.dropT = Math.max(0.16, rnd(0.32, 1.55) * (1 - fail*0.60));
      ONS.drop = rnd(0.045, 0.11);
    }
    if (ONS.drop > 0){
      ONS.drop -= dt;
      ctx.fillStyle = rgba([0,0,0], 0.72*Math.min(1, fail*1.6));
      ctx.fillRect(0,0,W,H);
    }
  }
  drawOnsStatic(0.02 + fail*0.30, fail > 0.55);
}
