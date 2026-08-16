/* ============================================================================
   THE RETURN
   The same bedroom, afterwards. It comes straight out of the black at the end of
   the statistics, and its whole job is recognition: this is the room the piece
   started in, and the only thing that has changed is what is outside it.

   THE PAINTING IS THE SOURCE OF TRUTH and nothing here redesigns it. No purifier,
   no mask on the bed, no warning sign taped to the glass, no dust to wipe. The
   artist painted a child's bedroom in bad air and the correct thing to do with it
   is get out of its way. Everything this file adds is either something the code
   already owned in the opening room — the rod, the curtains, the light they let in
   — or the two interactions, and nothing else.

   TWO INTERACTIONS. Pull the curtains apart. Try the window. That is all there is,
   and the restraint is the content: the visitor should spend far more of this scene
   looking than doing.

   ATMOSPHERE BY ABSENCE. The opening room answered when it was opened: birds on the
   wire shuffling, leaves, a gust coming through, motes turning in a shaft of light.
   This one barely answers. There are no birds on that wire in the painting and none
   are added; the air holds a little dust that drifts rather than dances; nothing
   gusts, because the window does not open. The contrast is meant to land as a
   memory of how alive the same room was an hour ago, not as a derelict set. It is
   still somebody's ordinary bedroom, which is the whole reason it is upsetting.
   ========================================================================== */

const PRET = {
  reveal: 0,        // 0 black, 1 the room is fully up
  pulling: 0,       // the cord is in hand this frame
  seen: 0,          // seconds with the curtains open, for pacing the window
  hover: 0,         // the handle, under the pointer
  tried: 0,         // how many times the window has been asked
  give: 0,          // the millimetre it moves and comes back
  look: 0,          // seconds since the outside was revealed, before the cord is offered
  noteT: -1,        // countdown to the notification
  dotsT: -1,        // and then to the silence that comes before the answer
  lineT: -1,        // and then to the answer itself
  redT: -1,         // and then the colour drifting, and the hold after it
  note: 0,          // 0 nothing, 1 the reading
  said: 0,          // the line has been spoken
  settled: 0,       // the whole moment is over, and the scroll may go on
  begun: 0,         // the scene has been set up; do not set it up again
  wasDown: 0,       // the pointer last frame, to catch the instant of a press
  arm: 0,           // this press began on the handle, so it is a try at the window
  hold: 0,          // and how long it has stayed there, so a passing drag is not a pull
  snap: 0           // the recoil, just after the attempt
};

/* The reveal is four seconds. It is the slowest thing in the piece and it should
   be: the visitor has just come out of the statistics into nothing at all, and
   the room has to arrive quietly enough that recognising it is their own thought
   rather than a cut. */
const PRET_REVEAL = 4.0;
/* HOW LONG EACH PART OF THE CLOSING SEQUENCE LASTS.
   `LOOK` is the beat after the curtains open before the cord is offered, so the polluted
   view is looked at rather than skipped past on the way to the next instruction. `PAUSE`
   is the silence between the phone and the answer, and it is the most important number
   here: the two must not share the moment or the phone reads as speaking for her. `RED`
   is the colour drift, shortened from nineteen seconds to ten so that it is certain to
   finish inside the sequence rather than being scrolled away from half done — still slow
   enough that most visitors will not catch it happening. `BREATH` is the room afterwards,
   with everything said and nothing to do. */
const PRET_LOOK   = 3.4;
const PRET_PAUSE  = 2.6;
/* THE SILENCE IS WRITTEN DOWN. Between the phone telling him the number and somebody in the
   house answering it there is an ellipsis, alone, in the narration's own place and type for
   three seconds. It is not a placeholder and it does not animate: it is the pause before
   someone decides what to say, and the piece says it out loud rather than leaving a gap the
   visitor might read as nothing happening. */
const PRET_DOTS   = 3.0;
const PRET_RED    = 6.5;
/* AND THE SCROLL OPENS ONE SECOND AFTER THE SENTENCE ARRIVES, not at the end of its colour.
   It used to wait for the whole drift and then a four-second breath on top: ten and a half
   seconds of a page that does not respond, which does not read as a pause somebody is
   sitting in — it reads as broken. Nothing is lost by opening early, because the drift is a
   CSS transition on the sentence itself and goes on drifting whether the visitor moves or
   not, and the sentence is allowed to follow them into the next beat (see `evLineBeat`), so
   the red still lands. What changes is only that they are never held while it does. */
const PRET_BREATH = 1.0;

/* WHAT THE TIMELINE ASKS BEFORE IT WILL LET ANYONE LEAVE.
   The polluted bedroom is not one interaction, it is a sequence, and it holds the scroll
   until the sequence is over rather than until the first thing in it is done. Otherwise a
   visitor who opened the curtains could scroll on mid-notification and the whole point of
   the chapter would happen off screen behind them. */
function returnDone(){
  if (!getPlate("roomAfter")) return true;      // nothing to wait for if it never loaded
  return !!PRET.settled;
}
function returnProgress(){
  if (PRET.settled) return 1;
  if (!gateMet("pcurtain")) return 0.34*cl01(gateProgress("pcurtain"));
  if (!PRET.tried)          return 0.34 + 0.26*cl01(PRET.give/RCORD_FIRE);
  /* and through the phone, the pause, the answer and the breath */
  /* the bar counts what the scroll is actually waiting for, which no longer includes the
     colour drift — that finishes in its own time with the visitor free to go */
  const total = 1.2 + PRET_PAUSE + PRET_DOTS + PRET_BREATH;
  let left = PRET_BREATH;
  if (PRET.noteT > 0)      left = 1.2 + PRET_PAUSE + PRET_DOTS + PRET_BREATH;
  else if (PRET.dotsT > 0) left = PRET_PAUSE + PRET_DOTS + PRET_BREATH;
  else if (PRET.lineT > 0) left = PRET_DOTS + PRET_BREATH;
  else if (PRET.redT > 0)  left = PRET.redT;
  return 0.60 + 0.40*cl01(1 - left/total);
}

function resetReturn(){
  /* ONCE. THIS WAS THE GLITCH.
     onEnter fires every time the eased playhead crosses into this beat, and the
     playhead crosses back and forth freely whenever the visitor is anywhere near the
     boundary — a scroll that overshoots and settles is enough. So this ran again and
     again, and each time it set the reveal back to zero and PULLED THE CURTAINS SHUT
     AGAIN. Standing near the top of the scene, the room strobed between black and
     half-lit and the curtains would not stay open, which is exactly the "huge glitch,
     cannot even get into the scene" that came back from review. It has to happen on
     arrival and never again. */
  if (PRET.begun) return;
  PRET.begun = 1;
  PRET.reveal = 0; PRET.seen = 0; PRET.hover = 0;
  PRET.tried = 0; PRET.give = 0;
  PRET.noteT = -1; PRET.dotsT = -1; PRET.lineT = -1; PRET.redT = -1;
  PRET.note = 0; PRET.said = 0; PRET.settled = 0; PRET.look = 0;
  PRET.wasDown = 0; PRET.arm = 0; PRET.hold = 0; PRET.snap = 0;
  /* The curtains start shut, exactly as they did at the beginning. The opening
     room's own state is reused rather than duplicated, so the drag is not a
     lookalike of the first one, it is the same code with the same weight and the
     same follow on the far panel. By this point the piece cannot be scrolled back
     into the opening, so there is nothing to disturb. */
  PROOM.cL = 0; PROOM.cR = 0; PROOM.open = 0;
  PROOM.grab = 0; PROOM.nudgeTo = 0; PROOM.idle = 0; PROOM.demo = 0; PROOM.tug = 0;
  PROOM.everMoved = 0; PROOM.sash = 0; PROOM.breeze = 0;
  hideNote();
}

/* ============================================================================
   THE SECOND INTERACTION IS THE CORD.
   It used to be the casement handle: you pressed the middle of the window and the
   window declined. That was wrong twice over. The handle is painted on the mullion,
   dead centre, exactly where both curtains are grabbed, so the two targets fought each
   other and needed a stack of arming rules to tell a window pull from a curtain drag.
   And more importantly it is the wrong object. The room already has a thing that hangs
   in front of the glass and exists to be pulled — the bulb's cord, which is what opened
   this window in the first chapter. Reaching for the same cord in the same room and
   having nothing happen is the whole point of the scene. Clicking a pane of glass is
   not.

   So the handle interaction is gone, along with its hit test and its arming flags, and
   the cord does the work. The target is the painted ball itself, using the opening
   room's own geometry, so it is the same object in the same place.

   IT DOES NOT JAM. The cord takes the pull and lengthens under it, up to about a third
   of its travel, and comes back when let go. Nothing rattles, nothing sticks, nothing
   has to be tried twice. The sash is never allowed near the value that would open
   anything — it is capped well below it and always decays — so the window does not
   fight the visitor, it simply is not going to be opened today.
   ========================================================================== */
const RCORD_CAP = 0.30;        // how far the cord may ever come down here
const RCORD_FIRE = 0.52;       // how much of a pull counts as having asked

function returnCord(t, dt, live){
  const b = cordBall();
  const near = live && P.active && Math.hypot(P.x-b.x, P.y-b.y) < MIN*0.075;
  PRET.hover = lerp(PRET.hover, near ? 1 : 0, Math.min(1, dt*6));

  /* the press has to begin on the ball, and wandering off gives up the claim — the
     curtains are open by now and their cloth is gathered at the sides, but the cord
     hangs in the middle of the window where a stray drag could still cross it */
  const fresh = P.down && !PRET.wasDown;
  if (fresh) PRET.arm = near ? 1 : 0;
  if (!P.down || (PRET.arm && !near && !PRET.pulling)) { PRET.arm = 0; }
  if (PRET.arm) PROOM.grab = 0;
  PRET.wasDown = P.down;

  PRET.pulling = 0;
  if (PRET.arm && P.down){
    PRET.pulling = 1;
    cv.className = "grabbing";
    /* downward drag lengthens it; sideways drag swings it, as it always did */
    if (P.dy > 0) PRET.give = Math.min(1, PRET.give + P.dy/(H*0.115));
    CORD.swingV += (P.dx/W)*5.0;
    if (PRET.give > RCORD_FIRE && !PRET.tried){
      PRET.tried = 1;
      /* A RESTRAINED PHYSICAL ANSWER, SO THE ATTEMPT PLAINLY REGISTERED.
         Not a judder, not a rattle, nothing stuck. The cord itself takes the whole of the
         response: it comes back faster than a slow release would, and the weight on the
         end swings, which is exactly what a pull cord does when the thing at the other end
         of it does not move. One soft catch of a sound underneath. The window is not
         broken and never behaves as though it is — all the weight of this moment is in
         what arrives afterwards. */
      PRET.snap = 1;
      CORD.swingV += 1.5;
      sfx.cloth(0.20);
      if (sfx.dull) sfx.dull(0.9);
      /* THE PHONE FIRST, THEN THE ANSWER.
         The order matters and it was the other way round. A phone tells you the number
         and only then does anybody say anything, so the reading arrives on its own,
         impersonally, and the line follows it as the response to it. Said first, the
         line made the notification look like it was explaining her. */
      PRET.noteT = 1.2;
    }
  } else {
    if (near && !P.down) cv.className = "grabbable";
    /* it comes back. Slowly enough to read as weight rather than as a spring, and once,
       just after the attempt, a little faster, because that is the recoil. */
    PRET.give = Math.max(0, PRET.give - dt*(PRET.snap > 0 ? 2.6 : 1.15));
    if (PRET.snap > 0) PRET.snap = Math.max(0, PRET.snap - dt*1.4);
    if (!PRET.tried && !near) PRET.arm = 0;
  }
  /* the cord's own length, which is all the sash does in this scene: no casement is
     drawn here, so this only moves the ball down the cord */
  PROOM.sash = cl01(PRET.give) * RCORD_CAP;

  /* ---- the affordance ----
     Clear but quiet. The ball brightens under the pointer, and if it has not been
     pulled after a few seconds with the curtains open it gathers a faint ring and one
     short stroke below it in the direction it wants to go. No pulse, no bounce: the
     same ivory as the instruction plaque, at the same low opacity. */
  const idle = cl01((PRET.seen - 3.0)/2.2) * (PRET.tried ? 0 : 1);
  const glow = 0.05 + PRET.hover*0.20 + idle*0.11;
  if (glow > 0.012){
    ctx.save();
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r*3.4);
    g.addColorStop(0,    rgba([255,244,224], glow));
    g.addColorStop(0.45, rgba([255,238,214], glow*0.40));
    g.addColorStop(1,    rgba([255,236,210], 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r*3.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  if (idle > 0.01){
    const br = 0.5 + 0.5*Math.sin(t*1.4);
    ctx.save();
    ctx.strokeStyle = rgba([244,239,228], idle*(0.15 + 0.13*br));
    ctx.lineWidth = Math.max(1, MIN*0.0015);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r*1.75 + MIN*0.002*br, 0, TAU); ctx.stroke();
    const y0 = b.y + b.r*2.5, y1 = y0 + MIN*0.018 + MIN*0.004*br;
    ctx.strokeStyle = rgba([244,239,228], idle*0.26);
    ctx.beginPath();
    ctx.moveTo(b.x, y0); ctx.lineTo(b.x, y1);
    ctx.moveTo(b.x - MIN*0.0038, y1 - MIN*0.005); ctx.lineTo(b.x, y1);
    ctx.lineTo(b.x + MIN*0.0038, y1 - MIN*0.005);
    ctx.stroke();
    ctx.restore();
  }
}

/* ----------------------------------------------------------------- the scene */
function drawReturn(t, dt, o){
  o = o||{};
  const phase = o.phase || "room";       // "room" while the curtains are the thing
  const pl = getPlate("roomAfter");
  if (!pl){ ctx.fillStyle="#000"; ctx.fillRect(0,0,W,H); return; }

  PRET.reveal = cl01(PRET.reveal + dt/PRET_REVEAL);
  const rv = ease.io(PRET.reveal);

  /* the room. Same air everywhere, because the air is in the paint. */
  drawPlate("roomAfter", { air:0 });

  /* the rod and the curtains, from the opening room, unchanged */
  PROOM.open = lerp(PROOM.open, Math.min(PROOM.cL, PROOM.cR), Math.min(1, dt*3.0));
  const rev = ease.io(cl01(PROOM.open));
  curtainGeom(t, rev, 0.86);

  /* EVERYTHING IN THE ROOM IS DRAWN FIRST, AND THEN THE ROOM IS LIT.
     This is the whole of the curtain-brightness fix and it is an ordering problem, not a
     shading one. The room's exposure is a multiply pass over the frame, and the cloth, the
     rod, the cord and the taped drawing were all drawn AFTER it — so every one of them
     escaped the darkness the room was under and the curtains in particular read as
     self-illuminated: a bright red pair of panels hanging in a room lit at a fifth of
     daylight. Nothing was wrong with the cloth. It simply was not in the room.

     Drawing them before the pass puts them inside the same exposure as the paint, which
     also makes the whole thing respond coherently for free: the panels lighten exactly as
     far as the room does as they are drawn back, because it is one multiply over both. The
     slit of light between them gets darkened too, which is correct — a shut curtain in an
     unlit room shows a thin line, not a lamp.

     A transparent overlay on top of the cloth would have produced the flat, pasted-on
     result the brief warned against. This is the exposure itself. */
  drawTapedDrawing(t, rev, 0.86);
  updCord(dt, t);
  drawCord(t, dt, { rev, quiet:true });
  drawRod(t, rev, 0.86);
  drawCurtains(t, dt, { rev, air:0.86 });

  const dark = 1 - rev;
  if (dark > 0.004){
    const gp = curtainGap();
    const fe = W*0.028;
    offscreen(()=>{
      const dg = tc.createLinearGradient(0, 0, 0, H);
      /* DARKER THAN THE OPENING ROOM WAS, because this one has to read as dark.
         At 0.40 and 0.29 the room was dim but plainly legible, which made the curtains a
         formality rather than a reveal. Down to a fifth of the light: the bed, the wardrobe
         and the cord are all still readable, so the room can be understood and reached
         into, but nothing about it looks like daytime until it is opened. */
      const k0 = lerp(1, 0.21, dark), k1 = lerp(1, 0.14, dark);
      dg.addColorStop(0,    rgb([255*k0, 244*k0, 232*k0]));
      dg.addColorStop(0.62, rgb([255*k1, 240*k1, 230*k1]));
      dg.addColorStop(1,    rgb([255*k1*0.92, 238*k1*0.92, 232*k1*0.92]));
      tc.fillStyle = dg; tc.fillRect(0,0,W,H);
      if (gp.x1-gp.x0 > 1){
        tc.globalCompositeOperation = "destination-out";
        const eg = tc.createLinearGradient(gp.x0-fe, 0, gp.x1+fe, 0);
        const span = (gp.x1-gp.x0) + fe*2;
        eg.addColorStop(0, "rgba(0,0,0,0)");
        eg.addColorStop(cl01(fe/span),   "rgba(0,0,0,1)");
        eg.addColorStop(cl01(1-fe/span), "rgba(0,0,0,1)");
        eg.addColorStop(1, "rgba(0,0,0,0)");
        tc.fillStyle = eg; tc.fillRect(gp.x0-fe, 0, span, H);
        tc.globalCompositeOperation = "source-over";
      }
    });
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(TMP, 0, 0);
    ctx.restore();
  }

  /* THE CORD IS LIVE THE MOMENT THE CURTAINS ARE OPEN, IN EITHER BEAT.
     Both interactions belong to the same beat, so nothing in this sequence is behind a
     scroll: the visitor is placed in the room, opens the curtains, and the cord is
     already there. It used to require the second beat, which meant the second half of
     the chapter did not exist until somebody scrolled into it. */
  /* FAR ENOUGH TO SEE OUT OF, WHICH IS NOT ALL THE WAY.
     This asked for 0.93 and that was too much: it made the visitor drag both panels to the
     very end of the rod before the room would go on, which is not something anybody does to
     a curtain and not something this moment needs. What it actually needs is that the
     visitor has been shown the view before the cord is offered, and the view is the glass.

     The panels meet at 0.523 and draw back to 0.378 and 0.664; the glass runs 0.382 to
     0.658. So the gap between them uncovers 1.04 of the glass for every unit of pull, and
     0.72 leaves about three quarters of the window clear — plainly open, the whole horizon
     visible, and reached with an ordinary pull rather than a determined one. The curtain
     gate itself is unchanged at CTR.need. */
  const PRET_SEEN = 0.72;
  const open = Math.min(PROOM.cL, PROOM.cR);
  const wide = open > PRET_SEEN;
  if (wide){ PRET.seen += dt; PRET.look += dt; }
  /* the cord waits its turn. The curtains have just come apart on a view the visitor has
     not seen yet, and putting the next instruction up on top of that would make the
     polluted landscape something they scrolled past on the way to a task. */
  const live = wide && PRET.reveal > 0.985 && PRET.look > PRET_LOOK;
  if (open > 0.6) returnCord(t, dt, live);

  /* THE AIR, MADE VISIBLE ONCE AND QUIETLY.
     Barely anything: a slow dust that hangs rather than drifts, only in the light
     from the window, and only when the curtains are open. It is the one atmospheric
     addition in the scene and it is here because it is what the painting is about. */
  if (rev > 0.1){
    partRole = 2;
    drawParticles(t, 0.10 + 0.16*rev, { x:W*0.52, y:H*0.34, r:H*0.85 });
  }

  /* the reveal out of the black sits over everything, so the room arrives whole */
  if (rv < 0.999){
    ctx.fillStyle = rgba([0,0,0], 1 - rv);
    ctx.fillRect(0,0,W,H);
  }

  /* the hands, only after a long wait and never during the reveal */
  if (phase === "room" && PRET.reveal > 0.999) curtainHelp(t, dt);

  /* ---- THE CHAIN, AND THE SCROLL IS SHUT FOR ALL OF IT ----
     Four waits, each arriving on its own so that none of them reads as the cause of the
     one before. The cord is let go; a beat later the phone says what the air is; two and
     a half seconds of nothing, which is the part that does the work; then somebody in the
     house answers; then the answer loses its colour while it sits there; then a breath.
     Only after the breath does `settled` go up and the scroll open again. */
  if (PRET.noteT > 0){
    PRET.noteT -= dt;
    if (PRET.noteT <= 0){ PRET.note = 1; showNote(); PRET.dotsT = PRET_PAUSE; }
  }
  /* the notification lands, a moment goes by, and then the ellipsis — on its own, in the
     narration's place, for three seconds and nothing else */
  if (PRET.dotsT > 0){
    PRET.dotsT -= dt;
    if (PRET.dotsT <= 0){
      if (typeof sayLine === "function") sayLine("…", PRET_DOTS);
      PRET.lineT = PRET_DOTS;
    }
  }
  if (PRET.lineT > 0){
    PRET.lineT -= dt;
    if (PRET.lineT <= 0 && typeof sayLine === "function"){
      PRET.said = 1;
      /* it holds for the whole of the colour drift and the breath after it, and goes out
         on its own — the last thing said in the chapter */
      /* exactly as long as the drift and the breath after it, and no longer. With an extra
         second and a half on the end the sentence was still on screen, fully red, once the
         scroll had opened — so it sat over the top of the next chapter's washing line. It
         begins its own fade at the moment the scroll is released. */
      /* the sentence stays for the whole of its colour drift; the SCROLL only waits a
         second of it. The two used to be the same number and that was the freeze. */
      sayLine("Leave it closed.", PRET_RED, { red:true });
      PRET.redT = PRET_BREATH;
    }
  }
  if (PRET.redT > 0){
    PRET.redT -= dt;
    if (PRET.redT <= 0) PRET.settled = 1;
  }

  /* A closed room with bad air outside it. Quiet, muffled, and no gust: there is
     nothing coming through that window. */
  OUTSIDE = 0;
  MUFFLE = 1;
  /* WHAT IS OUTSIDE IS A CITY NOW, AND YOU CAN HEAR IT THROUGH THE GLASS.
     This used to be the garden bed at a tenth of its level, which is the same room the
     chapter before it had, only fainter — so the one place the contrast should have been
     unmissable was the one place nothing had changed. It is the city recording instead,
     already low-passed when it was built and low-passed again on the way out, held well
     under the room. It comes up a little as the curtains are opened, because that is when
     you would notice it, and it never gets loud: the point is not traffic, it is that the
     quiet the room used to have is gone and something is always there behind it. */
  cityIndoors(0.16 + 0.10*rev, 1 - 0.35*rev);
  if (!PRET.pulling && PRET.hover < 0.2) cv.className = wide ? "" : "grabbable";
}

/* ------------------------------------------------------------ the notification
   The artist's own design, rebuilt as markup rather than drawn from the PNG. The
   supplied file is a flattened render on a grey field with its glow baked into the
   pixels, so it cannot be composited over a room; and more to the point the card
   has to change what it says, from the air reading to her, which a picture of a
   card cannot do. Same white pill, same emoji, same bold line over a hairline over
   two lines of body text, same words.

   It slides in from the right and stays. No sound: everything else in this scene
   has been taken down to nothing and a chime here would be the loudest thing in
   the chapter. */
const noteEl = document.getElementById("note");
function showNote(){
  if (!noteEl) return;
  /* IT IS THE AIR APP, AND SHE ANSWERS SEPARATELY.
     There was a version where this card itself became a message from his mother reading
     "Leave it closed." That conflated two different things. The phone is impersonal and
     tells you a number; the line is a person in the house responding to it a moment
     later, and it belongs in the piece's own voice, not inside a notification. So the
     card only ever says what the air is. */
  noteEl.querySelector(".nt").textContent = "Unhealthy: PM2.5 levels elevated";
  noteEl.querySelector(".nb").textContent =
    "Keep windows closed. Consider limiting outdoor activity until conditions improve.";
  noteEl.classList.add("on");
  noteEl.setAttribute("aria-hidden", "false");
}
function hideNote(){
  if (!noteEl) return;
  noteEl.classList.remove("on");
  noteEl.setAttribute("aria-hidden", "true");
}
