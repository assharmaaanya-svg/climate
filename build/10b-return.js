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
  seen: 0,          // seconds with the curtains open, for pacing the window
  hover: 0,         // the handle, under the pointer
  tried: 0,         // how many times the window has been asked
  give: 0,          // the millimetre it moves and comes back
  noteT: -1,        // countdown to the notification
  note: 0,          // 0 nothing, 1 the air reading, 2 her
  swapT: -1
};

/* The reveal is four seconds. It is the slowest thing in the piece and it should
   be: the visitor has just come out of the statistics into nothing at all, and
   the room has to arrive quietly enough that recognising it is their own thought
   rather than a cut. */
const PRET_REVEAL = 4.0;

function resetReturn(){
  PRET.reveal = 0; PRET.seen = 0; PRET.hover = 0;
  PRET.tried = 0; PRET.give = 0;
  PRET.noteT = -1; PRET.note = 0; PRET.swapT = -1;
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

/* where the casement handles are in this painting, as screen fractions after the
   plate's crop: the pair on the mullion, a little under half way down */
const PRET_HANDLE = { x:0.5175, y:0.428, w:0.020, h:0.052 };

function returnHandleAt(){
  const c = roomCam(CAM_WALL);
  return { x: W*PRET_HANDLE.x + c.x, y: H*PRET_HANDLE.y + c.y,
           rx: W*PRET_HANDLE.w, ry: H*PRET_HANDLE.h };
}
function onReturnHandle(x, y){
  const h = returnHandleAt();
  return Math.abs(x-h.x) < h.rx*1.9 && Math.abs(y-h.y) < h.ry*1.5;
}

/* --------------------------------------------------------------- the window
   It does not open, and it is important that it does not open for the right
   reason. Nothing is broken here: no rattle, no judder, no stuck-sash puzzle to
   solve. The handle takes the pull, gives about a millimetre, and comes back,
   which is what a window does when somebody on the other side of the house has
   decided it stays shut. The explanation arrives afterwards, from her, and it is
   one sentence long. */
function returnWindow(t, dt, live){
  const h = returnHandleAt();
  const near = live && P.active && onReturnHandle(P.x, P.y);
  PRET.hover = lerp(PRET.hover, near ? 1 : 0, Math.min(1, dt*6));
  if (near) cv.className = P.down ? "grabbing" : "grabbable";

  if (live && near && P.down){
    PRET.give = Math.min(1, PRET.give + dt*5.5);
    if (!PRET.tried){
      PRET.tried = 1;
      /* the beat before the phone. Long enough that the notification is a separate
         event and not a reaction to the click. */
      PRET.noteT = 1.7;
    }
  } else {
    PRET.give = Math.max(0, PRET.give - dt*2.6);
  }

  /* the handle: a soft lozenge, nearly invisible until the pointer finds it, and
     it takes the pull by moving a pixel and a half. That is the whole animation. */
  const a = 0.05 + PRET.hover*0.16;
  const dy = PRET.give * MIN*0.0022;
  ctx.save();
  ctx.translate(h.x, h.y + dy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, h.ry*1.5);
  g.addColorStop(0, rgba([255,246,226], a));
  g.addColorStop(0.55, rgba([255,240,214], a*0.42));
  g.addColorStop(1, rgba([255,238,210], 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, h.rx*1.7, h.ry*1.5, 0, 0, TAU); ctx.fill();
  ctx.restore();
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
  drawRod(t, rev, 0.86);
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

  drawCurtains(t, dt, { rev, air:0.86 });

  /* the window, once the curtains are actually open enough to reach it */
  const open = Math.min(PROOM.cL, PROOM.cR);
  const live = phase === "window" && open > 0.86 && PRET.reveal > 0.999;
  if (open > 0.7) returnWindow(t, dt, live);
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

  /* ---- the phone ---- */
  if (PRET.noteT > 0){
    PRET.noteT -= dt;
    if (PRET.noteT <= 0){ PRET.note = 1; showNote(1); PRET.swapT = 3.6; }
  }
  if (PRET.swapT > 0){
    PRET.swapT -= dt;
    if (PRET.swapT <= 0){ PRET.note = 2; showNote(2); }
  }

  /* A closed room with bad air outside it. Quiet, muffled, and no gust: there is
     nothing coming through that window. */
  OUTSIDE = 0;
  MUFFLE = 1;
  ambience(0.09 + 0.05*rev, 0.10);
  if (!live && !onReturnHandle(P.x, P.y)) cv.className = open > CTR.need ? "" : "grabbable";
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
function showNote(kind){
  if (!noteEl) return;
  const t = noteEl.querySelector(".nt"), b = noteEl.querySelector(".nb"),
        ic = noteEl.querySelector(".ni");
  if (kind === 2){
    /* Her. No icon, because a message from your mother does not come with a weather
       symbol, and no explanation, because the visitor has just been shown the
       statistics and can see out of the window. "Leave it closed." is an ordinary
       thing for a parent to send, and that is the entire point: all of that, and it
       arrives back as one sentence about a window. */
    ic.textContent = "";
    ic.classList.add("off");
    t.textContent = "Mum";
    b.textContent = "Leave it closed.";
    noteEl.classList.add("msg");
  } else {
    ic.textContent = "⚠️🌫️";
    ic.classList.remove("off");
    t.textContent = "Unhealthy: PM2.5 levels elevated";
    b.textContent = "Keep windows closed. Consider limiting outdoor activity until conditions improve.";
    noteEl.classList.remove("msg");
  }
  noteEl.classList.add("on");
  noteEl.setAttribute("aria-hidden", "false");
}
function hideNote(){
  if (!noteEl) return;
  noteEl.classList.remove("on", "msg");
  noteEl.setAttribute("aria-hidden", "true");
}
