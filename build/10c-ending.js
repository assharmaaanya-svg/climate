/* ============================================================================
   THE ENDING
   ============================================================================

   Everything before this is a place. This is not a place, and that is the whole
   design: after the colouring goes out there is no image, no montage, no
   silhouette, no particle, no texture and no grain. A black rectangle for forty
   seconds, and the memories arrive as SOUND, because the argument the ending is
   making — that you did not notice because nothing happened all at once — cannot
   be made by showing somebody a picture of it.

   THE SOUNDS ARE NOT NEW. Every fragment here is a recording the visitor has
   already spent minutes inside: the cloth on the washing line, the birds the
   binoculars find, the child in the field, the insects under the stars, the town
   heard from the hill. Recognition is the mechanism. A new recording of "birds"
   would be a sound effect; THIS one is a place they have been, and the difference
   is the entire point of reusing them.

   WHY IT RUNS ON A CLOCK AND NOT ON THE SCROLL. Every other beat in the piece is
   a property of where the visitor's scroll is, which is right for a memory you are
   allowed to move around inside. An ending is not that. Six sentences with pauses
   between them, timed against reading speed and against the sounds leaving one at
   a time, cannot survive being scrubbed — a fast trackpad would turn the whole
   argument into a flicker. So the beat pins the playhead the moment it is entered
   and runs on its own seconds, both directions locked, and lets go when it is
   finished. No message says so. The screen is black; there is nothing there to
   suggest scrolling would do anything.

   THE PACING. Written out, the score is about forty-five seconds, and the arithmetic is
   why: six text moments, each needing about a second to become legible, about two to be
   read and about a second to leave, is twenty-four seconds of type before a single pause,
   and the held black at the top, the beat between every thought, the sounds leaving one
   at a time, the silence before the key line and the hold before the turn are the rest.
   `E_RATE` is what makes it land where it actually lands; at 0.75 that is about
   thirty-four seconds, with every interval in the proportion it was authored in.

   THE OLD NOTE ON WHY IT COULD NOT BE 20-25 SECONDS, WHICH STILL HOLDS.
   Six text moments, each needing about a second to become legible, about two to be
   read, and about a second to leave, is already twenty-four seconds of type before
   a single pause. On top of that the brief asks for a two-second black at the top,
   a beat of silence between every thought, four sounds leaving one at a time, a
   second silence before the key line, and another two-second hold before the turn.
   Those are not decoration, they ARE the ending. Compressing to twenty-five would
   mean cutting sentences or making them unreadable. `E_RATE` scales the whole
   score if it ever needs to be tightened; the shape survives.  */

/* HOW LONG THE ENDING RUNS, AS A FRACTION OF THE SCORE AS WRITTEN.
   Every number below this line is in SCORE seconds. `E_RATE` is the only place the
   score meets the clock: at 1 a score second is a real second, and at 0.75 the whole
   thing lands in three quarters of the time with every interval inside it in exactly
   the proportion it was authored in. Nothing else in this file changes when it does.

   It is a DURATION, not a speed, and the clock therefore divides rather than
   multiplies — written the other way round, which is how it started, 0.75 made the
   ending half a minute longer instead of eight seconds shorter. */
const E_RATE = 0.75;

const END = {
  on: 0, done: 0, t: 0,
  /* the drawing going out. Separate from `t` only so the fade can be read at a
     glance when tuning it */
  black: 0,
  started: {}, stopped: {}
};

/* the two colours the ending is allowed. The ivory is the narration's own, and the
   red is the piece's single red — the one "Leave it closed." and "None came." use,
   and nothing else in the work is permitted to. */
const E_INK = [251,250,245];
const E_RED = [166,50,50];
const E_SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif';

/* ---------------------------------------------------------------- the score */

/* THE DRAWING LEAVES BEFORE ANYTHING ELSE HAPPENS.
   Two and a half seconds of the colouring dimming, with the polluted air going with
   it, and then two full seconds of black before a single sound or word. The visitor
   is supposed to wonder whether it is over. That doubt is doing work: it is what
   makes the first remembered sound arrive as a memory rather than as the next cue. */
const E_FADE = 2.5;          // the drawing to black
const E_HOLD = 2.0;          // and then nothing at all
/* AND THEN SOMETHING, UNAMBIGUOUSLY.
   The silence at the top is doing real work — the visitor is meant to wonder whether the
   piece has finished — but there is a point a few seconds later where that doubt has to
   be answered or it stops being doubt and becomes a visitor reaching for the reload
   button. So the first fragment is not eased in over two seconds from nothing, which is
   what it was: it starts the instant the held black is over, rises in about half the time
   it used to, and sits a little higher than the rest. Still quiet, still a memory rather
   than a cue, but never a sound you have to strain to be sure you heard. */
const E_FIRST = E_FADE + E_HOLD;

/* THE MEMORIES, AS SOUND.
   `at` when it starts, `off` when it begins to go, `up`/`down` how long each takes.
   They deliberately do not arrive together and do not leave together: two at a time
   at most is the ceiling, because three recognisable places at once stops being
   remembering and becomes a mix. Levels are all low. This is what something sounds
   like when you have not heard it for years, not what it sounded like at the time. */
const EMEM = [
  { key:"sheets", src:()=>RUS,          at:E_FIRST, up:1.5, off:10.6, down:1.5,
    vol:0.34, lp:6200, cc:"sheets on the line" },
  { key:"birds",  src:()=>LOOKA.birds,  at: 6.6, up:2.4, off:12.4, down:1.6,
    vol:0.32, lp:8200, cc:"birds calling" },
  { key:"night",  src:()=>CRICK,        at:10.2, up:2.6, off:14.2, down:1.7,
    vol:0.26, lp:9000, cc:"insects, after dark" },
  { key:"town",   src:()=>LOOKA.town,   at:12.6, up:2.6, off:14.8, down:1.6,
    vol:0.20, lp:2400, cc:"the town, from the hill" }
];
/* the child is a one-shot and always was — four seconds of a real boy, which there is
   no honest way to loop. It plays once, quietly, in the middle of the first two beds,
   and it is the one fragment allowed to hold the caption while it is sounding: it is
   the most recognisable thing in the ending and a bed coming up underneath should not
   take the words off it. */
/* `len` is how long the laugh holds the CAPTION, not how long it sounds — the recording
   runs its own four seconds out underneath. Three seconds of priority pushed the insects'
   caption late enough that the town's arrived less than a second behind it, and two
   captions a second apart is a caption track flickering rather than naming things. */
const ELAUGH = { at: 8.7, vol:0.26, cc:"a child laughing, far off", len:1.9 };
/* AND IT MUST NOT SOUND LIKE RELIEF ARRIVING.
   The temptation with a hopeful last line is to let the one clean sound under it swell,
   and that would turn "now you noticed" into "everything is fine now", which is not what
   the piece has earned and not what happened. So it is the quietest thing in the whole
   ending — below every memory fragment — and it takes over five score seconds to get
   there, which at any sensible rate is longer than it takes to stop noticing that it
   started. It is set ONCE and never lifted: the final sentence does not raise it. */
const EOPEN = { at: 37.4, up:5.4, off:46.8, down:2.0, vol:0.13, lp:5200,
                cc:"wind through the grass" };

/* THE SENTENCES.
   `t0` is when the words begin to become legible, `in` how long that takes, `hold` how
   long the whole sentence sits at full strength, `out` how long a word takes to go.

   `keepFrom` is the index of the first word that is allowed to outlive the rest of its
   sentence, and `keepHold` is by how much. `grade` staggers the words BEFORE it by a
   fraction of a second across the whole run, so the sentence lets go from the left
   rather than switching off — small enough that most visitors will not see it happen
   and will only notice that a few words are still there.

   `red` is a word and the window over which it takes the piece's red. It emerges; it
   does not flash, and the sentence around it never changes colour.

   THE HOLDS ARE SET FROM A READING WINDOW, NOT BY FEEL. A word is readable from about
   0.6 of its alpha, which for these envelopes means comprehension starts roughly 0.65 of
   the way through `in` and ends roughly 0.4 of the way into `out` — so the window is
   `hold` plus about half a second of score, and at the rate this runs at it wants to
   clear three words a second. Measured against that, two of these sentences were being
   read at nearly four, which is a sentence you have finished before you have taken it in.
   Every `hold` here now buys its own word count and the gaps between them were moved to
   match rather than absorbed. */
const ESCORE = [
  /* THE FIRST FIVE RUN LONGER THAN THE LAST TWO, DELIBERATELY.
     Read at three words a second, the five sentences that carry the argument were being
     PERFORMED rather than thought — each one arriving on the heels of the last with no
     room around it, which is the difference between somebody working something out and
     somebody reciting it. They now clear about two and a quarter words a second, and the
     gap between thoughts went with them. The turn at the end keeps its old pace: by then
     the visitor is not working anything out, they are being told. They arrive on a black screen
     out of a silence, which is the one place in the piece where the visitor is not yet
     reading — they are still working out that there is something there to read, and the
     time that takes comes out of the sentence unless it is given to it. */
  { t0: 4.6,  in:1.6, hold:3.1, out:1.1,
    text:"I thought I was remembering places." },

  /* THE REALIZATION. Only the last word turns, and it turns slowly enough that the
     change is over before it can be seen starting. It also outlives the sentence it
     is in by three quarters of a second, which is the first moment in the ending
     where the typography is saying something the words are not. */
  { t0: 11.7, in:1.6, hold:3.2, out:1.3,
    text:"I was remembering things that disappeared.",
    red:{ i:5, from:2.0, to:4.6 }, keepFrom:5, keepHold:0.95 },

  /* THE KEY LINE, and the one place the fading itself is the argument. The sentence
     must be READ first — the stagger begins only after two full seconds at strength —
     and then it comes apart from the left until "all at once." is alone. Nothing about
     it is difficult to read; the effect happens entirely after comprehension. */
  { t0: 20.6, in:1.6, hold:3.0, out:1.1, grade:0.85, keepFrom:4, keepHold:2.0,
    text:"None of it disappeared all at once." },

  /* and the line the whole interaction has been building to. No animation, no colour,
     no sound cue. "notice." is left alone in the dark for a second, because that is
     the word for what the visitor has spent the entire piece doing. */
  { t0: 29.4, in:1.5, hold:2.9, out:1.0, keepFrom:4, keepHold:1.8,
    text:"That's why we didn't notice." },

  /* THE TURN. Not "everything is fine now" — nothing in the world outside has changed
     and the piece would be lying if it said so. Back to the ivory the memories were
     written in, because the direction has changed and the colour is how the piece says
     which way it is facing. */
  { t0: 37.6, in:1.3, hold:1.9, out:0.8,
    text:"But remembering what was there…" },
  { t0: 42.6, in:1.3, hold:2.4, out:0.9, keepFrom:6, keepHold:1.5,
    text:"…is how we know what's worth saving." }
];

/* THE BLACK AFTER THE LAST WORD, WHICH IS PART OF THE ENDING AND NOT THE GAP AFTER IT.
   "saving." going out is not the end of the sequence — releasing the scroll the frame it
   disappears would put the interface back in the visitor's hands on the same breath as
   the last word, and a piece that spends forty seconds asking somebody to sit still
   should not then snap out of it. Two and a bit score seconds of nothing: the last word
   gone, the one clean sound already gone under it, and no state change of any kind until
   they are over. */
const E_REST = 2.4;
/* when the whole thing is over. Computed rather than typed so editing the score cannot
   leave it stale, and taken from the LAST WORD rather than the last sound, because the
   rest above is measured from the word. */
const E_TOTAL = (()=>{
  let words = 0;
  for (const L of ESCORE){
    const end = L.t0 + L.in + L.hold + (L.keepHold||0) + (L.grade||0) + L.out;
    if (end > words) words = end;
  }
  return Math.max(words + E_REST, EOPEN.off + EOPEN.down + 0.6);
})();

/* ------------------------------------------------------------ the memory bus
   Fresh sources, not the scene layers.

   The layers are owned by their chapters: each one is started once, looped forever,
   and driven by a queue that fades it out when its scene stops asking. Borrowing them
   here would mean fighting four queues at once for control of four gain nodes, and
   losing the argument every time a queue happened to tick first. So the ending reads
   the BUFFERS — which is the part that carries the recognition — and plays them on its
   own nodes into `postBus`, below the master fader that is taking the rest of the world
   away. Nothing here can be turned off by a scene that has been left behind. */
const EBUS = {};
function eVoice(key, layer, o){
  if (!AC || !soundOn || !layer || !layer.buf) return null;
  if (EBUS[key]) return EBUS[key];
  const s = AC.createBufferSource();
  s.buffer = layer.buf; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = "lowpass";
  f.frequency.value = o.lp || 8000; f.Q.value = 0.4;
  const g = AC.createGain(); g.gain.value = 0.0001;
  s.connect(f); f.connect(g); g.connect(postBus || AC.destination);
  // never at the same point in the recording twice, so a second listen is not a rerun
  s.start(0, Math.random() * layer.buf.duration);
  return (EBUS[key] = { s, f, g });
}
function eVoiceSet(key, v, tc){
  const V = EBUS[key];
  if (V) V.g.gain.setTargetAtTime(Math.max(0.0001, v), AC.currentTime, tc||1.0);
}
function eVoiceStop(key){
  const V = EBUS[key];
  if (!V) return;
  try { V.s.stop(AC.currentTime + 0.1); } catch(e){}
  delete EBUS[key];
}
function endingSoundOff(){
  for (const k in EBUS) eVoiceStop(k);
  ENDMUTE = 0;
}
/* the child, once. Faded up over a second because that is how a sound arrives across a
   field — you are hearing it before you notice it started — and this one has to arrive
   as something remembered rather than as something triggered. */
function eLaugh(vol){
  if (!AC || !soundOn || !LAUGH.buf) return;
  const s = AC.createBufferSource(); s.buffer = LAUGH.buf;
  const g = AC.createGain();
  const now = AC.currentTime, d = LAUGH.buf.duration;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), now + 1.15);
  g.gain.setValueAtTime(Math.max(0.0002, vol), now + Math.max(1.2, d - 1.6));
  g.gain.exponentialRampToValueAtTime(0.0001, now + d);
  s.connect(g); g.connect(postBus || AC.destination);
  s.start(now); s.stop(now + d + 0.05);
}

/* -------------------------------------------------------------- typography
   Laid out on the canvas rather than in the caption element, and the reason is
   per-word timing: the last three lines each need individual words to outlive the
   rest of their sentence by a measured amount, which in the DOM would mean building
   a span for every word and animating each one. On a black screen with nothing else
   on it the canvas is simply the better instrument. The face, the size, the tracking
   and the ivory are all the narration's own, taken from the same values `#cap` uses,
   so this reads as the same voice that has been speaking the whole time. */
let ELAY = null, elayKey = "";
function eLayout(L){
  const fs = Math.min(28, Math.max(17.6, W*0.035));
  const key = L.text + "|" + Math.round(W) + "x" + Math.round(H);
  if (elayKey === key && ELAY) return ELAY;
  ctx.save();
  ctx.font = fs + "px " + E_SERIF;
  const maxW = Math.min(W*0.86, fs*18.5);
  const words = L.text.split(" ");
  const sp = ctx.measureText(" ").width;
  const rows = []; let row = [], rw = 0;
  for (let i=0;i<words.length;i++){
    const w = ctx.measureText(words[i]).width;
    if (row.length && rw + sp + w > maxW){ rows.push({ items:row, w:rw }); row = []; rw = 0; }
    if (row.length) rw += sp;
    row.push({ i, text:words[i], w });
    rw += w;
  }
  if (row.length) rows.push({ items:row, w:rw });
  ctx.restore();
  elayKey = key;
  return (ELAY = { fs, rows, sp, lh: fs*1.4 });
}
/* how alive each word is, in seconds since the beat began */
function eWordAlpha(L, i, t){
  const a = sm(t, L.t0, L.t0 + L.in);
  if (a <= 0) return 0;
  const base = L.t0 + L.in + L.hold;
  let delay = 0;
  if (L.keepFrom !== undefined && i >= L.keepFrom) delay = L.keepHold || 0;
  else if (L.grade){
    /* the stagger, across the words that are going: small, even, and left to right.
       Divided by the count rather than by count-1 so the last of them still starts
       fractionally before the kept tail does, and the sentence never appears to
       hesitate in the middle. */
    const n = (L.keepFrom !== undefined ? L.keepFrom : L.text.split(" ").length);
    delay = L.grade * (i/Math.max(1, n));
  }
  return a * (1 - sm(t, base + delay, base + delay + L.out));
}
function eDrawLine(L, t){
  const lay = eLayout(L);
  const y0 = H*0.5 - (lay.rows.length-1)*lay.lh*0.5;
  ctx.save();
  ctx.font = lay.fs + "px " + E_SERIF;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  /* the narration's own shadow. Invisible against black, and that is fine — it is here
     so the type is identical to the type everywhere else rather than nearly identical,
     and it does its work on any screen where the black is not quite black. */
  ctx.shadowColor = "rgba(6,10,16,0.85)";
  ctx.shadowBlur = lay.fs*0.5;
  for (let r=0;r<lay.rows.length;r++){
    const row = lay.rows[r];
    let x = (W - row.w)/2;
    for (const it of row.items){
      const a = eWordAlpha(L, it.i, t);
      if (a > 0.002){
        let col = E_INK;
        if (L.red && L.red.i === it.i){
          const q = ease.io(cl01((t - (L.t0 + L.red.from)) / Math.max(0.001, L.red.to - L.red.from)));
          col = [ Math.round(lerp(E_INK[0], E_RED[0], q)),
                  Math.round(lerp(E_INK[1], E_RED[1], q)),
                  Math.round(lerp(E_INK[2], E_RED[2], q)) ];
        }
        ctx.fillStyle = rgba(col, a);
        ctx.fillText(it.text, x, y0 + r*lay.lh);
      }
      x += it.w + lay.sp;
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ the beat */
function endBeatIndex(){
  for (let i=0;i<N;i++) if (BEATS[i].id === "end") return i;
  return -1;
}
/* what the scroll asks: is this still running, and may the playhead move.
   Both directions are pinned while it is — forward so the sentences cannot be scrubbed
   past, backward so a flick of the wheel cannot drop the visitor back into the colouring
   halfway through. It lets go on its own, and there is never a message about it. */
function endingHolding(){ return !!(END.on && !END.done); }
function endingPlayed(){ return !!END.done; }

function resetEnding(){
  endingSoundOff();
  END.on = 1; END.done = 0; END.t = 0; END.black = 0;
  END.started = {}; END.stopped = {};
  ELAY = null; elayKey = "";
}

function drawEnding(dt){
  if (!END.on) resetEnding();
  if (!END.done) END.t += dt / Math.max(0.05, E_RATE);
  const t = END.t;

  /* ------------------------------------------------------- the picture leaving */
  if (t < E_FADE + 0.35){
    drawDrawing(performance.now()/1000, { town:true });
    END.black = ease.io(cl01(t / E_FADE));
    ctx.fillStyle = rgba([0,0,0], END.black);
    ctx.fillRect(0, 0, W, H);
  } else {
    END.black = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------------------------------------------------------------- the world going
     The mix comes down at the fader over the same two and a half seconds the picture
     takes, so the polluted air of the last chapter leaves WITH it rather than after it,
     and by the time the black is complete there is nothing playing at all. */
  ENDMUTE = cl01(t / (E_FADE + 0.9));

  /* ------------------------------------------------------------- the memories */
  let caption = "", capAt = -1;
  for (const M of EMEM){
    const on = t >= M.at, going = t >= M.off;
    if (on && !END.started[M.key]){
      END.started[M.key] = 1;
      eVoice(M.key, M.src(), { lp:M.lp });
      eVoiceSet(M.key, M.vol, M.up/2.4);
    }
    if (going && !END.stopped[M.key]){
      END.stopped[M.key] = 1;
      eVoiceSet(M.key, 0, M.down/2.4);
    }
    /* the caption belongs to whichever memory came up last and is still up, so two
       overlapping sounds do not produce two lines of text fighting for one slot */
    if (on && t < M.off + M.down && M.at > capAt){ capAt = M.at; caption = M.cc; }
  }
  if (t >= ELAUGH.at && !END.started.laugh){
    END.started.laugh = 1;
    eLaugh(ELAUGH.vol);
  }
  if (t >= ELAUGH.at && t < ELAUGH.at + ELAUGH.len){
    capAt = 1e9; caption = ELAUGH.cc;
  }
  /* and the one that comes back */
  if (t >= EOPEN.at && !END.started.open){
    END.started.open = 1;
    eVoice("open", AMB2, { lp:EOPEN.lp });
    eVoiceSet("open", EOPEN.vol, EOPEN.up/2.4);
  }
  if (t >= EOPEN.off && !END.stopped.open){
    END.stopped.open = 1;
    eVoiceSet("open", 0, EOPEN.down/2.4);
  }
  if (t >= EOPEN.at + 1.4 && t < EOPEN.off + EOPEN.down){ caption = EOPEN.cc; }
  if (caption) ccHold(caption);

  /* ---------------------------------------------------------------- the words */
  for (const L of ESCORE){
    if (t < L.t0 - 0.05) continue;
    if (t > L.t0 + L.in + L.hold + (L.keepHold||0) + (L.grade||0) + L.out + 0.2) continue;
    eDrawLine(L, t);
  }

  /* -------------------------------------------------------------------- and out.
     The scroll is given back, quietly. There is nothing to scroll to — the screen is
     black and stays black — but a visitor left on a page that will not move is a
     visitor who thinks the piece has crashed, and the lock has done its job by now. */
  if (t >= E_TOTAL && !END.done){
    END.done = 1;
    for (const k in EBUS) eVoiceStop(k);
  }
}
function endingProgress(){ return cl01(END.t / E_TOTAL); }
/* WHAT "SKIP" MEANS HERE.
   Not a jump to the end frame: the sounds are real nodes with real envelopes, and cutting
   them dead leaves a click and a caption still on screen. The clock is pushed to just
   inside the last second instead, and everything currently sounding is given a fast but
   genuine fade — so the sequence ENDS rather than stops, and it ends on the same black
   and the same silence it would have reached on its own. */
function endingSkip(){
  if (!END.on || END.done) return;
  for (const k in EBUS) eVoiceSet(k, 0, 0.28);
  END.t = Math.max(END.t, E_TOTAL - 0.9);
}
