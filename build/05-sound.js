/* ============================================================================
   SOUND
   Almost everything is synthesised. The one recording is the nature ambience —
   real birds, which no oscillator is going to talk anyone into. Layers cross-fade with
   the world state, so sound carries across every transition instead of cutting.
   The traffic bed and the wind bed trade places as the air loads: you hear the
   change before you notice you are hearing it.
   ========================================================================== */
let AC = null, soundOn = false, ccOn = false, master = null;
const BED = {};
const ccEl = document.getElementById("cc");
let ccT = 0;

function cc(txt){
  if (!ccOn || !ccEl) return;
  if (ccEl.textContent === "♪ "+txt && ccT>0.7) return;
  ccEl.textContent = "♪ "+txt; ccEl.classList.add("on"); ccT = 2.6;
}
function updCC(dt){ if (ccT>0){ ccT-=dt; if (ccT<=0) ccEl && ccEl.classList.remove("on"); } }

function noiseBuf(ac, secs){
  const n = ac.sampleRate*(secs||2);
  const b = ac.createBuffer(1,n,ac.sampleRate), d = b.getChannelData(0);
  let last=0;
  for (let i=0;i<n;i++){ const w=Math.random()*2-1; last = last*0.86 + w*0.14; d[i]=last*2.4; }
  return b;
}
function bed(ac, dest, type, freq, q, gain){
  const s = ac.createBufferSource(); s.buffer = noiseBuf(ac,3); s.loop=true;
  const f = ac.createBiquadFilter(); f.type=type; f.frequency.value=freq; if(q) f.Q.value=q;
  const g = ac.createGain(); g.gain.value=gain;
  s.connect(f); f.connect(g); g.connect(dest); s.start();
  return { g, f, s };
}
function initAudio(){
  try{
    const A = window.AudioContext||window.webkitAudioContext; if (!A) return false;
    AC = new A();
    master = AC.createGain(); master.gain.value = 0;
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value=-22; comp.ratio.value=3.2;
    master.connect(comp); comp.connect(AC.destination);

    BED.wind    = bed(AC, master, "bandpass", 520, 0.55, 0.0);
    BED.leaves  = bed(AC, master, "bandpass", 2600, 1.1, 0.0);
    BED.traffic = bed(AC, master, "lowpass",  190, 0,    0.0);
    BED.room    = bed(AC, master, "lowpass",  120, 0,    0.0);

    // a slow tuned pad. Two sines that drift apart as the air loads, so the
    // harmony sours by a few cents without ever becoming "sad music".
    const pad = AC.createGain(); pad.gain.value=0;
    const o1=AC.createOscillator(), o2=AC.createOscillator(), o3=AC.createOscillator();
    o1.type=o2.type=o3.type="sine";
    o1.frequency.value=98; o2.frequency.value=147; o3.frequency.value=196.5;
    const lp=AC.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=700;
    o1.connect(pad); o2.connect(pad); o3.connect(pad); pad.connect(lp); lp.connect(master);
    o1.start(); o2.start(); o3.start();
    BED.pad = { g:pad, o2, o3 };

    // crickets: a gated chirp band for the night
    BED.crickets = bed(AC, master, "bandpass", 4400, 6, 0.0);

    /* The recording. It runs from the moment sound is on and never restarts —
       what changes is how much glass is between it and the listener, which is a
       gain and a filter, not a different track. Birds do not begin when a
       window opens; they were always out there. */
    AMB.gain = AC.createGain();  AMB.gain.gain.value = 0;
    AMB.filt = AC.createBiquadFilter(); AMB.filt.type = "lowpass";
    AMB.filt.frequency.value = 700; AMB.filt.Q.value = 0.4;
    AMB.filt.connect(AMB.gain); AMB.gain.connect(master);
    if (OPEN_LAYER){
      AMB2.gain = AC.createGain(); AMB2.gain.gain.value = 0;
      AMB2.filt = AC.createBiquadFilter(); AMB2.filt.type = "lowpass";
      AMB2.filt.frequency.value = 1800; AMB2.filt.Q.value = 0.4;
      AMB2.filt.connect(AMB2.gain); AMB2.gain.connect(master);
    }
    /* The line. Two recordings of the same cloth, one almost still and one
       properly moving, layered rather than crossfaded — a gust brings the
       second one up underneath the first, which is what a gust actually does.
       And her humming, kept deliberately low: it should be something the
       visitor notices they have been hearing, not something that arrives. */
    for (const L of [RUS, RUS2, HUM]){
      L.gain = AC.createGain(); L.gain.gain.value = 0;
      L.filt = AC.createBiquadFilter(); L.filt.type = "lowpass";
      L.filt.frequency.value = 6000; L.filt.Q.value = 0.4;
      L.filt.connect(L.gain); L.gain.connect(master);
    }
    HUM.filt.frequency.value = 2200;      // she is behind a sheet, some way off

    loadAmbience();
    return true;
  } catch(e){ return false; }
}
function envGain(g, to, tc){ if(!AC) return; g.gain.setTargetAtTime(to, AC.currentTime, tc||0.5); }

/* ---------------------------------------------------------------- ambience
   Two recordings, layered, never crossfaded. The first is always there and is
   only ever muffled by whatever is in the way. The second — the open
   countryside — is silent until the window is, and then it arrives underneath
   the first rather than replacing it. Nothing swaps; more of the world simply
   gets in. A crossfade between two field recordings announces itself as a track
   change, which is the one thing this must not sound like.
   OPEN_LAYER can be set false to run on the first recording alone. */
const OPEN_LAYER = true;
const AMB = { buf:null, src:null, gain:null, filt:null, state:"idle", vol:0, open:0 };
const AMB2 = { buf:null, src:null, gain:null, filt:null, state:"idle" };
/* the washing line has its own three: the cloth as it is most of the time, the
   cloth in a gust, and her, humming while she works */
const RUS  = { buf:null, src:null, gain:null, filt:null, state:"idle" };
const RUS2 = { buf:null, src:null, gain:null, filt:null, state:"idle" };
const HUM  = { buf:null, src:null, gain:null, filt:null, state:"idle" };

/* `names` may be a list: the first that decodes wins. Everything ships as
   16-bit PCM wav now, which every browser decodes, so the list is really only
   insurance for a layer whose recording has not been added yet. */
function loadOne(layer, names){
  if (layer.state !== "idle" || !AC) return;
  layer.state = "loading";
  const list = [].concat(names);
  /* XHR, not fetch. fetch() refuses a file:// URL outright, and this is opened
     as a local file at least as often as it is served — which is exactly why
     the room was silent. XHR still reaches a local file in most browsers, and
     where the assets are embedded as data URIs it never has to reach at all. */
  const attempt = k => {
    if (k >= list.length){ layer.state = "failed"; return; }
    const next = () => attempt(k+1);
    const name = list[k];
    const src = (window.__ASSETS && window.__ASSETS[name]) || (ASSET_DIR + encodeURIComponent(name));
    const done = a => AC.decodeAudioData(a)
          .then(b => { layer.buf = b; layer.state = "ready"; layer.name = name; startOne(layer); })
          .catch(next);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", src, true);
      xhr.responseType = "arraybuffer";
      xhr.onload  = () => (xhr.response ? done(xhr.response) : next());
      xhr.onerror = next;
      xhr.send();
    } catch(e){ next(); }        // the piece still works without any of them
  };
  attempt(0);
}
function loadAmbience(){
  loadOne(AMB, "amb-garden.wav");
  if (OPEN_LAYER) loadOne(AMB2, "amb-open.wav");
  loadOne(RUS,  "line-cloth.wav");
  loadOne(RUS2, "line-gust.wav");
  loadOne(HUM,  "line-hum.wav");
}
function startOne(layer){
  if (!AC || !layer.buf || layer.src) return;
  const s = AC.createBufferSource();
  s.buffer = layer.buf; s.loop = true;
  /* The whole buffer, head to tail. Every recording here was cut to length
     beforehand with its own tail folded back over its head under an equal-power
     crossfade, so the seam is already inaudible — trimming a second off each end
     at playback, which is what this used to do, would cut the fade in half and
     put the click back. */
  s.connect(layer.filt);
  s.start(0, Math.random() * layer.buf.duration);   // never in step with the others
  layer.src = s;
}
/* `v` is how loud, `open` is how little is in the way */
function ambience(v, open){
  AMB.vol = v; AMB.open = open;
  if (!AC || !soundOn || !AMB.gain) return;
  if (AMB.state === "ready" && !AMB.src) startOne(AMB);
  envGain(AMB.gain, Math.max(0, v), 0.55);
  // shut, it is muffled through glass; open, nothing is taking the top off it
  AMB.filt.frequency.setTargetAtTime(620 + 8600*cl01(open), AC.currentTime, 0.55);
  if (AMB2.gain){
    if (AMB2.state === "ready" && !AMB2.src) startOne(AMB2);
    // held well under the first, and only present once the window is
    const o = cl01((open-0.34)/0.66);
    envGain(AMB2.gain, Math.max(0, v*0.46*o*o), 0.9);
    AMB2.filt.frequency.setTargetAtTime(1800 + 7000*cl01(open), AC.currentTime, 0.8);
  }
}

/* The washing line. `v` is how loud the scene is, `wind` is the line's own gust
   value, and `mom` is how much of her is still there. */
const LINEQ = { t: 0 };
function lineSound(v, wind, mom){
  LINEQ.t = 0.3;                    // updSound fades the line out when this lapses
  if (!AC || !soundOn || !RUS.gain) return;
  for (const L of [RUS, RUS2, HUM]) if (L.state === "ready" && !L.src) startOne(L);
  const w = cl01((wind - 0.10) / 0.85);
  /* the quiet cloth is always there once you are at the line; the moving cloth
     arrives on top of it as the gust builds, and leaves with it */
  envGain(RUS.gain,  v*0.34, 0.6);
  envGain(RUS2.gain, v*0.42*w*w, 0.35);
  RUS2.filt.frequency.setTargetAtTime(3200 + 4200*w, AC.currentTime, 0.4);
  /* her humming ducks under a gust rather than fighting it, and goes when she
     does. It is quiet on purpose — loud enough to be company, not a presence. */
  envGain(HUM.gain, v*0.085*cl01(mom)*(1 - w*0.45), 1.1);
}

function updSound(dt, t){
  updCC(dt);
  if (!AC || !soundOn) return;
  const h = AIR.h, night = (AIR.tod<0.14||AIR.tod>0.84)?1:0;
  const out = OUTSIDE;                                   // 0 in the room, 1 outdoors
  envGain(BED.wind.g,    (0.030+0.052*out)*(1-h*0.55)*(1-MUFFLE*0.7), 0.7);
  envGain(BED.leaves.g,  0.016*out*(1-h*0.7)*(1-MUFFLE*0.8), 0.7);
  envGain(BED.traffic.g, (0.008 + 0.062*h)*(0.45+0.55*out), 1.1);
  envGain(BED.room.g,    0.020*(1-out*0.7) + MUFFLE*0.03, 0.7);
  envGain(BED.pad.g,     0.030*(1-h*0.30), 1.4);
  envGain(BED.crickets.g, night*0.012*(1-h)*out, 1.2);
  // the pad drifts out of tune with the air
  BED.pad.o2.detune.setTargetAtTime(-h*32, AC.currentTime, 2.0);
  BED.pad.o3.detune.setTargetAtTime( h*21, AC.currentTime, 2.0);
  // filters close as the air thickens — the world gets duller, not louder
  BED.wind.f.frequency.setTargetAtTime(520 - h*230, AC.currentTime, 1.0);
  BED.leaves.f.frequency.setTargetAtTime(2600 - h*1200 - MUFFLE*1400, AC.currentTime, 0.8);
  /* the line's own layers belong to one chapter; when it stops asking for them
     they go, rather than following the visitor into the next room */
  if (LINEQ.t > 0){ LINEQ.t -= dt; }
  else if (RUS.gain){ for (const L of [RUS, RUS2, HUM]) envGain(L.gain, 0, 0.9); }
}

/* ------------------------------------------------------------------ one-shots */
function tone(freq, dur, type, gain, sweep){
  if (!AC||!soundOn) return;
  const now=AC.currentTime;
  const o=AC.createOscillator(); o.type=type||"sine"; o.frequency.setValueAtTime(freq,now);
  if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(20,sweep), now+dur);
  const g=AC.createGain();
  g.gain.setValueAtTime(0.0001,now);
  g.gain.exponentialRampToValueAtTime(gain||0.06, now+Math.min(0.03,dur*0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
  o.connect(g); g.connect(master); o.start(now); o.stop(now+dur+0.02);
}
function burst(freq, q, dur, gain, type){
  if (!AC||!soundOn) return;
  const now=AC.currentTime;
  const s=AC.createBufferSource(); s.buffer=noiseBuf(AC,0.5);
  const f=AC.createBiquadFilter(); f.type=type||"bandpass"; f.frequency.value=freq; f.Q.value=q||1;
  const g=AC.createGain();
  g.gain.setValueAtTime(0.0001,now);
  g.gain.exponentialRampToValueAtTime(gain||0.05, now+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(now); s.stop(now+dur+0.02);
}
const sfx = {
  chime(f){ cc("a small chime"); tone(f||988, 0.85, "sine", 0.05); tone((f||988)*2, 0.5, "sine", 0.018); },
  found(){ cc("a soft bell"); tone(1319,1.1,"sine",0.045); tone(1976,0.7,"sine",0.016); },
  flap(){ cc("wings"); burst(1500, 0.7, 0.22, 0.05); burst(700,1.2,0.3,0.03); },
  cloth(v){ cc("fabric moving"); burst(1100+Math.random()*700, 0.55, 0.30, 0.028*(v===undefined?1:v)); },
  latch(){ cc("a metal latch turning"); burst(3200, 9, 0.09, 0.05); tone(760,0.10,"square",0.016); },
  slide(){ cc("the window sliding up"); burst(340, 0.9, 0.52, 0.055, "lowpass"); },
  thud(){ cc("wood settling"); burst(140, 1.2, 0.20, 0.06, "lowpass"); },
  /* One chirp. `v` is how near it sounds: through a shut window it is faint and
     dull, through an open one it is close and bright — the same birds, the same
     distance, a different amount of glass. */
  bird(v, bright){ if(!AC||!soundOn||AIR.h>0.62) return; cc("birdsong");
    v = v===undefined ? 1 : v;
    bright = bright===undefined ? 1 : bright;
    const f=rnd(1900,3100)*(0.82+0.18*bright), now=AC.currentTime;
    const o=AC.createOscillator(); o.type="sine";
    o.frequency.setValueAtTime(f,now);
    o.frequency.linearRampToValueAtTime(f*rnd(1.15,1.5), now+0.07);
    o.frequency.linearRampToValueAtTime(f*0.95, now+0.15);
    const lp=AC.createBiquadFilter(); lp.type="lowpass";
    lp.frequency.value = 900 + 5200*bright;            // glass in the way
    const g=AC.createGain(); g.gain.setValueAtTime(0.0001,now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0005, 0.035*v*(1-AIR.h)),now+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,now+0.22);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(now); o.stop(now+0.24); },
  /* the casement: a dry hinge, then the sash coming to rest against its stop */
  hinge(){ cc("a window swinging open");
    burst(240, 1.1, 0.62, 0.026, "lowpass");
    tone(150, 0.42, "sine", 0.016, 104); },
  casementRest(){ cc("the window settling open");
    burst(180, 1.4, 0.26, 0.034, "lowpass");
    tone(96, 0.22, "sine", 0.020, 62); },
  crayon(){ cc("wax on paper"); burst(rnd(900,1500), 0.4, 0.13, 0.030, "bandpass"); },
  paper(){ cc("paper"); burst(2400, 0.5, 0.24, 0.032); },
  train(){ cc("a train, somewhere past the town"); burst(150, 0.6, 2.4, 0.030, "lowpass"); tone(196,1.2,"sine",0.012); },
  line(){ cc("the kite line pulling"); burst(620, 3.5, 0.5, 0.022); },
  gust(){ cc("a gust"); burst(700, 0.5, 1.3, 0.05); },
  brush(){ cc("brushing"); burst(2100, 0.4, 0.20, 0.032); },
  breath(){ cc("breathing on the glass"); burst(480, 0.35, 0.95, 0.036, "lowpass"); },
  alarm(){ cc("a soft alert"); tone(660,0.16,"sine",0.05); setTimeout(()=>tone(560,0.30,"sine",0.045),190); },
  wish(){ cc("a long, high shimmer"); tone(1568,1.7,"sine",0.04); tone(2093,1.3,"sine",0.02); tone(2637,1.0,"sine",0.012); }
};
let OUTSIDE = 0;     // 0 = in the room, 1 = outdoors
let MUFFLE = 0;      // 1 = wrapped in cloth
function ping(){ sfx.found(); }

/* ---- buttons ---- */
const bSound = document.getElementById("bSound"), bCC = document.getElementById("bCC"), bSkip = document.getElementById("bSkip");
bSound.addEventListener("click", async ()=>{
  if (!AC){ if (!initAudio()){ bSound.style.display="none"; return; } }
  if (AC.state==="suspended"){ try{ await AC.resume(); }catch(_){} }
  soundOn = !soundOn;
  bSound.setAttribute("aria-pressed", String(soundOn));
  bSound.textContent = soundOn ? "Sound on" : "Sound";
  bSound.setAttribute("aria-label", soundOn?"Turn sound off":"Turn sound on");
  envGain(master, soundOn?0.85:0, 0.6);
  if (soundOn && AC){ if (AC.state==="suspended") AC.resume(); if (AMB.state==="idle") loadAmbience(); }
  if (soundOn && !ccOn) cc("");
});
bCC.addEventListener("click", ()=>{
  ccOn = !ccOn;
  bCC.setAttribute("aria-pressed", String(ccOn));
  if (!ccOn) ccEl.classList.remove("on"); else cc("captions on");
});
bSkip.addEventListener("click", ()=>{
  const g = BEATS[T.i].gate;
  if (g) meet(g);
  else window.scrollBy(0, H*0.9);
  bSkip.blur();
});
