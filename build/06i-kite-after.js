/* ============================================================================
   THE KITE, AFTER
   ============================================================================
   The same field, the same boy, the same kite on the same string, and the same one
   verb: hold, and it comes closer. Nothing about the interaction is new, and that is
   the entire point of the chapter — what has changed is the air it happens in.

   NOTHING HERE IS A SECOND IMPLEMENTATION.
   The flight model, the layout arithmetic, the sprite darkening, the line and the hold
   signal all come from build/06f-kite.js, unchanged, called with a second flight state.
   `KSKY_A` differs from `KSKY` in exactly two ways: which painting of the boy it draws,
   and that it carries this chapter's own clocks. His position, his scale, his fingertip,
   the kite's two places, its sizes and the string between them are shared values, not
   copied numbers — so they cannot drift apart from the evening chapter later.

   WHY HIS PLACEMENT IS THE SAME PLACEMENT
   childkiteafterpollution.png is the same 1536x1024 canvas as the sprite it replaces and
   he is painted in the same spot on it: measured, his ink runs x 728..1054, y 149..838
   against the old one's x 731..1051, y 151..838, and the single topmost pixel — his
   fingertips, which is where the string leaves — is 0.8px from where it was. So the box
   below is the new sprite measured rather than the old sprite's numbers reused, and it
   lands him within a pixel and a half of where he has always stood. The two polluted
   skies are also the same 1448x1086 as the two clean ones and the same composition,
   which is why `cx`, `bottom` and `h` — where he stands in the PAINTING, not in his own
   canvas — carry across untouched, and why the plate can keep the same crop and bands.

   THE AIR
   Two things happen to the kite as it gets further away, and they are different things.
   It goes BEHIND cloudhazetohidekite.png, which is a real layer drawn over it — and the
   boy is cut back out of that layer, so not one pixel of haze lands on him. And it goes
   INTO the air, losing contrast toward the haze's own colour the further out it is,
   which is what distance does to anything. Neither has a threshold in it. Holding the
   line brings it back through both.
   ========================================================================== */

/* the flight state, and the chapter's clocks */
const KSKY_A = {
  child: {
    img: "childkiteafterpollution.png",
    box: [0.4740, 0.1455, 0.2129, 0.6738],   // measured off the supplied sprite
    hand:[0.6074, 0.1455],                   // his fingertips, the topmost pixel of him
    /* where he stands in the PAINTING's frame — shared with the evening chapter */
    cx: 0.3291, bottom: 0.7324, h: 0.1847
  },
  /* the same kite. Not a copy of its numbers: the same object, so it is impossible for
     the two chapters' kites to become different kites by accident. */
  kite: KSKY.kite,
  /* its own darkSprite cache slots. Sharing "kid" with the evening chapter would be a
     real bug and not a slow one: that cache is keyed on size and strength but NOT on
     which image went into it, so at any moment the two sprites happened to want the
     same size and the same darkness, this chapter would draw the wrong boy. */
  bufKey: "kidAfter", kiteKey: "kiteAfter",

  reel: 0, held: 0, best: 0, joy: 0, wobX: 0, wobY: 0, sway: 0, hint: 1,

  night: 0,        // polluted evening -> polluted night, on a clock of its own
  flew: 0,         // he has had his turn with it
  goT: -1,         // the ending's clock, -1 until it starts
  kiteA: 1, childA: 1,
  told: 0, over: 0,
  coughT: 0        // when the next cough may happen
};

/* HOW LONG THE LIGHT TAKES.
   Slow enough that nobody watches it happen — the brief for this asks for a transition
   that is almost unnoticed while you are busy with the string, and half a minute is
   about the shortest that reads as time passing rather than as a dissolve. It runs on
   its own clock and not on the scroll, because the scroll is held here anyway and a
   crossfade that only advances when somebody pushes the wheel is a slider, not an
   evening. */
const KA_NIGHT = 28.0;
/* and how much of a pull counts as having flown it. Lower than the evening chapter's
   0.52, because by now the visitor has already learnt this gesture and being made to
   prove it twice is worse than letting them get on. */
const KA_FLEW = 0.40;

/* THE ENDING, AS A TIMETABLE.
   Same shape and same restraint as the washing line's, in build/06h-sheets-after.js: a
   held stillness, then things leaving one at a time with the gaps doing the work, then an
   empty frame held long enough to be felt, then one sentence and nothing after it.

   The kite goes first and the string goes with it, so there is never a line hanging off
   nothing. He starts a second later and takes longer, so the two are not one event. */
const KA_GO = { settle:2.6, kiteDur:2.2, childAt:1.0, childDur:3.4, empty:2.0, lineHold:7.0 };
const KA_T1 = KA_GO.settle;                       // the kite starts to go
const KA_T2 = KA_T1 + KA_GO.childAt;              // and then he does
const KA_T3 = Math.max(KA_T1 + KA_GO.kiteDur, KA_T2 + KA_GO.childDur);   // nothing left
const KA_T4 = KA_T3 + KA_GO.empty;                // the line arrives over the empty field
const KA_T5 = KA_T4 + KA_GO.lineHold;             // and only then does the scroll open
const KA_LINE = "Some things disappeared so slowly, you only noticed when they were gone.";

/* how far into the haze the kite is allowed to get. Not 1: the layer over the top of it
   finishes the job, and a sprite driven to zero alpha by arithmetic is a switch, not
   weather. */
const KA_LOSE = 0.88;

function resetKiteAfter(){
  const S = KSKY_A;
  S.reel = 0; S.held = 0; S.best = 0; S.joy = 0;
  S.wobX = 0; S.wobY = 0; S.sway = 0; S.hint = 1;
  S.night = 0; S.flew = 0; S.goT = -1;
  S.kiteA = 1; S.childA = 1; S.told = 0; S.over = 0;
  S.coughT = 3.5 + Math.random()*3.0;
}

/* ---------------------------------------------------------------------------
   The clocks. One function, so the order things happen in is readable in one place.
   ------------------------------------------------------------------------- */
function updKiteAfterGoing(dt){
  const S = KSKY_A;
  S.night = cl01(S.night + dt/KA_NIGHT);
  if (S.best >= KA_FLEW) S.flew = 1;

  /* THE CHILD AND THE KITE STAY THROUGH THE WHOLE TRANSITION.
     The ending is not allowed to begin until the night is fully arrived AND he has had
     his turn with the string. Both conditions, because a visitor who dawdled through the
     evening without touching it would otherwise watch the memory leave before they had
     been given it, and a visitor who flew it in the first ten seconds would otherwise
     lose him in daylight. */
  if (S.night >= 1 && S.flew) S.goT = S.goT < 0 ? 0 : S.goT + dt;
  const g = S.goT;
  if (g < 0) return;

  /* smoothstep rather than a ramp: it leaves and arrives at nothing gently at both ends,
     which is the difference between fading and being turned off */
  S.kiteA  = 1 - sm(g, KA_T1, KA_T1 + KA_GO.kiteDur);
  S.childA = 1 - sm(g, KA_T2, KA_T2 + KA_GO.childDur);

  if (g >= KA_T4 && !S.told){ S.told = 1; sayLine(KA_LINE, KA_GO.lineHold); }
  if (g >= KA_T5) S.over = 1;
}

/* ---------------------------------------------------------------------------
   THE HAZE.
   A real layer at a real depth, not an opacity on the whole scene. It goes over the
   sky and over the kite, and the boy is erased back out of it — which is not a trick
   to satisfy a rule but what is actually true: the haze is the couple of miles of air
   between here and the city, and he is standing four feet away, so there is none of it
   in front of him. The near grass is drawn after this for the same reason.

   The layer's own alpha is blobby and its edges feather to nothing, so the kite moving
   through it is obscured unevenly and never at an edge you could point to. It drifts,
   slowly enough to be air rather than motion — the two backgrounds underneath it never
   move, only dissolve.
   ------------------------------------------------------------------------- */
function drawKiteHaze(t, o){
  const img = IMG["cloudhazetohidekite.png"];
  if (!imgReady(img)) return;
  const a = cl01(o.alpha);
  if (a <= 0.004) return;
  /* about ten pixels of travel in a minute, on two periods that do not divide */
  const dx = Math.sin(t*0.041)*W*0.009 + Math.sin(t*0.017 + 1.3)*W*0.005;
  const dy = Math.sin(t*0.033 + 2.1)*H*0.004;
  offscreen(()=>{
    /* it is hung a little above the frame and a little wide, so its feathered edges are
       always outside the picture and it never reads as a rectangle with a soft border */
    ctx.drawImage(img, -W*0.06 + dx, -H*0.10 + dy, W*1.12, H*1.16);
    if (o.cut) o.cut();
  });
  ctx.save();
  ctx.globalAlpha = a;
  ctx.drawImage(TMP, 0, 0);
  ctx.restore();
}

/* ---------------------------------------------------------------------------
   The scene.
   ------------------------------------------------------------------------- */
function drawKiteSkyAfter(t, dt, o){
  o = o || {};
  const S = KSKY_A;
  if (!getPlate("kiteSkyAfter")){ ctx.fillStyle = "#3a3028"; ctx.fillRect(0,0,W,H); return; }

  updKiteAfterGoing(dt);
  const night = S.night;

  /* everything but the near grass, exactly as the evening chapter does it: he goes down
     in front of that band and it comes back over him, which is how he is standing in the
     meadow rather than on it. `air` here is the plate's own clean-to-hazed dissolve, and
     what those two paintings are is polluted evening and polluted night — so this single
     number is the whole crossfade, and both images are the same size and the same
     composition, so nothing in the landscape moves while it happens. */
  const FRONT = PLATES.kiteSkyAfter.bands.length - 1;
  drawPlate("kiteSkyAfter", { air: night, skipBand: FRONT });

  /* the air itself, as particles: this chapter has plenty of it, and unlike the evening
     it does not get less */
  partRole = 2;
  drawParticles(t, 0.62, { x:W*0.26, y:H*0.30, r:H*1.1 });

  updKiteFlight(t, dt, S);

  const camG = roomCam(0.085), camS = roomCam(0.012);
  const rect  = { x: camG.x, y: camG.y, w: W, h: H };
  const rectS = { x: camS.x, y: camS.y, w: W, h: H };
  const L = kiteLayout(S, { plate:"kiteSkyAfter", rect, rectS });

  /* HOW FAR AWAY IT IS, WHICH IS THE ONLY THING THE VISITOR CHANGES.
     `reel` is 0 with the line all the way out and 1 with the kite hauled in close, so
     `far` is the distance, eased so there is no point along it where anything steps. */
  const far = 1 - ease.io(cl01(S.reel));
  const extinct = KA_LOSE * far;

  /* the colour everything dissolves toward out here. It is the haze's own colour, warm
     and dirty at dusk and much darker once the light has gone, rather than the blue the
     evening chapter fades into. */
  const hazeCol = mixL([132,104,84], [40,36,38], night);
  const tint = hazeCol;
  const dChild = 0.06 + night*0.52;
  /* the kite takes the night like the boy does, and the distance on top of it: at the far
     end of its line it is most of the way to being just a patch of the air it is in.

     HOW FAR THIS IS ALLOWED TO GO, AND WHY IT IS NOT ALL THE WAY.
     It was further. Driven harder, the kite at the far end of its line at full night was
     already invisible before the ending began — which quietly cost the ending its first
     beat, because a kite that has nothing left to lose cannot be seen to lose it. So the
     far end is faint and findable rather than gone, and what finishes it is the ending. */
  const dKite  = 0.05 + night*0.40 + extinct*0.34;

  drawKiteChild(S, L, { dark:dChild, tint, alpha:S.childA });
  /* the string goes with the kite, and thins along its own length into the murk */
  drawKiteLine(t, S, L, { night, rect, alpha:S.kiteA, fade:extinct*0.78 });
  drawKiteBody(t, S, L, { dark:dKite, tint, alpha:S.kiteA * (1 - extinct*0.52) });

  /* and then the air, over the top of the kite, with him cut back out of it.

     THE VEIL IS LIGHTER THAN IT WAS.
     At half again this strength it did hide the kite, but it also flattened the painting
     underneath it — the sun went out of the polluted evening and the city lights went out
     of the polluted night, and both of those are in the supplied paintings on purpose. The
     kite is hidden by DISTANCE, above; this layer's job is only to be the thing the
     distance is measured through, and to be blobby and uneven while it does it. */
  drawKiteHaze(t, {
    alpha: 0.30 + night*0.12,
    cut: () => {
      if (!L.ok || S.childA <= 0.004) return;
      /* his own alpha, not a box: destination-out takes exactly the shape of him. It is
         the sprite as painted rather than the darkened copy, because all that matters
         here is where he is, and it is scaled by how much of him is left so the haze
         closes over the space as he goes. */
      ctx.save();
      ctx.globalAlpha = S.childA;
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(IMG[S.child.img], L.bx, L.by, L.sw, L.sh);
      ctx.restore();
    }
  });

  /* the hold signal last, so it is legible even when the kite it is pointing at is not.
     It goes the instant they hold, and it never comes back. */
  if (!S.told) drawKiteRing(t, S, L, 0.55);

  /* the meadow he is standing in, back over the top of everything */
  drawPlate("kiteSkyAfter", { air: night, onlyBand: FRONT });

  /* ---- sound ---- */
  /* no coughs are scheduled once he has started to go; one already sounding is left to
     finish on its own, which is what `going` does */
  kiteAfterSound(dt, 1, S.goT >= KA_T1);

  cv.className = P.down ? "grabbing" : "grabbable";
  if (o.gate && S.flew) meet(o.gate);
}

/* what the scroll bar shows while all of this is held: his turn with the kite first, and
   then the light and the leaving, which is most of the wait */
function kiteAfterProgress(){
  const S = KSKY_A;
  if (S.over) return 1;
  if (!S.flew) return 0.34 * cl01(S.best/KA_FLEW);
  return 0.34 + 0.30*S.night + 0.36*cl01(S.goT < 0 ? 0 : S.goT/KA_T5);
}
