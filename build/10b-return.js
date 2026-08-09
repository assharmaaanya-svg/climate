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
  noteT: -1,        // countdown to the notification
  lineT: -1,        // and then to the answer that follows it
  note: 0,          // 0 nothing, 1 the reading
  begun: 0,         // the scene has been set up; do not set it up again
  wasDown: 0,       // the pointer last frame, to catch the instant of a press
  arm: 0,           // this press began on the handle, so it is a try at the window
  hold: 0           // and how long it has stayed there, so a passing drag is not a pull
};

/* The reveal is four seconds. It is the slowest thing in the piece and it should
   be: the visitor has just come out of the statistics into nothing at all, and
   the room has to arrive quietly enough that recognising it is their own thought
   rather than a cut. */
const PRET_REVEAL = 4.0;

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
  PRET.noteT = -1; PRET.lineT = -1; PRET.note = 0;
  PRET.wasDown = 0; PRET.arm = 0; PRET.hold = 0;
  /* The curtains start shut, exactly as they did at the beginning. The opening
     room's own state is reused rather than duplicated, so the drag is not a
     lookalike of the first one, it is the same code with the same weight and the
     same follow on the far panel. By this point the piece cannot be scrolled back
     into the opening, so there is nothing to disturb. */
  PROOM.cL = 0; PROOM.cR = 0; PROOM.open = 0;
  PROOM.grab = 0; PROOM.nudgeTo = 0; PROOM.idle = 0; PROOM.demo = 0;
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
      sfx.cloth(0.22);
      /* THE PHONE FIRST, THEN THE ANSWER.
         The order matters and it was the other way round. A phone tells you the number
         and only then does anybody say anything, so the reading arrives on its own,
         impersonally, and the line follows it as the response to it. Said first, the
         line made the notification look like it was explaining her. */
      PRET.noteT = 1.6;
    }
  } else {
    if (near && !P.down) cv.className = "grabbable";
    /* it comes back. Slowly enough to read as weight rather than as a spring. */
    PRET.give = Math.max(0, PRET.give - dt*1.15);
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

  /* the room is as dark as the curtains are still shut, exactly as before */
  const dark = 1 - rev;
  if (dark > 0.004){
    const gp = curtainGap();
    const fe = W*0.028;
    offscreen(()=>{
      const dg = tc.createLinearGradient(0, 0, 0, H);
      const k0 = lerp(1, 0.40, dark), k1 = lerp(1, 0.29, dark);
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

  /* THE ROOM IS THE SAME ROOM, so it keeps the things that were in it.
     Both of these were simply missing, and their absence is exactly the kind of
     absence this scene cannot afford: the whole argument is that nothing here has
     changed except what is outside the glass, and a bedroom that has quietly lost
     its light pull and the picture over its bed argues the opposite.

     The drawing is the one he is handed years later, still taped where it has been
     since the first frame. The bulb's pull hangs in the window recess as before.
     Neither is wired to anything — this scene has two interactions and gets no more
     — but they are furniture, not interactions, and they belong to the room. */
  drawTapedDrawing(t, rev, 0.86);
  updCord(dt, t);
  drawCord(t, dt, { rev, quiet:true });

  drawRod(t, rev, 0.86);
  drawCurtains(t, dt, { rev, air:0.86 });

  /* THE CORD IS LIVE THE MOMENT THE CURTAINS ARE OPEN, IN EITHER BEAT.
     Both interactions belong to the same beat, so nothing in this sequence is behind a
     scroll: the visitor is placed in the room, opens the curtains, and the cord is
     already there. It used to require the second beat, which meant the second half of
     the chapter did not exist until somebody scrolled into it. */
  const open = Math.min(PROOM.cL, PROOM.cR);
  const live = open > 0.80 && PRET.reveal > 0.985;
  if (open > 0.6) returnCord(t, dt, live);
  if (open > CTR.need) PRET.seen += dt;

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

  /* ---- the phone, and then the answer ----
     Two waits, not one. The cord is let go, and after a beat and a half the phone says
     what the air is; a moment after that, somebody in the house answers. Each arrives
     on its own so neither reads as the cause of the other. */
  if (PRET.noteT > 0){
    PRET.noteT -= dt;
    if (PRET.noteT <= 0){ PRET.note = 1; showNote(); PRET.lineT = 1.25; }
  }
  if (PRET.lineT > 0){
    PRET.lineT -= dt;
    if (PRET.lineT <= 0 && typeof sayLine === "function"){
      /* it holds a long time and reddens while it holds, then goes out on its own and
         leaves the room quiet — the last thing said in the chapter */
      sayLine("Leave it closed.", 24.0, { red:true });
    }
  }

  /* A closed room with bad air outside it. Quiet, muffled, and no gust: there is
     nothing coming through that window. */
  OUTSIDE = 0;
  MUFFLE = 1;
  ambience(0.09 + 0.05*rev, 0.10);
  if (!PRET.pulling && PRET.hover < 0.2) cv.className = open > CTR.need ? "" : "grabbable";
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
