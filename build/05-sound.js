/* ============================================================================
   SOUND
   Almost everything is synthesised. The one recording is the nature ambience —
   real birds, which no oscillator is going to talk anyone into. Layers cross-fade with
   the world state, so sound carries across every transition instead of cutting.
   The traffic bed and the wind bed trade places as the air loads: you hear the
   change before you notice you are hearing it.
   ========================================================================== */
let AC = null, soundOn = false, ccOn = false, master = null, postBus = null;
const BED = {};
const ccEl = document.getElementById("cc");
let ccT = 0;

function cc(txt){
  if (!ccOn || !ccEl) return;
  if (ccEl.textContent === "♪ "+txt && ccT>0.7) return;
  ccEl.textContent = "♪ "+txt; ccEl.classList.add("on"); ccT = 2.6;
}
/* A CAPTION THAT LASTS EXACTLY AS LONG AS ITS SOUND DOES.
   `cc` is for events: something happened, here is what it was, and two and a half seconds
   later it is gone whether the sound is or not. The ending needs the other kind. Its
   memory fragments come up out of silence, sit there, and leave, and the caption has to
   leave WITH the sound rather than on a timer of its own — a caption still reading
   "birds calling" over a silence that is the whole point would be worse than no caption.
   So this is called every frame while the sound is up and given barely more life than a
   frame; the instant the caller stops asking, it lapses and the element fades on its own
   0.45s transition. Nothing ever writes down that a sound has stopped. */
function ccHold(txt){
  if (!ccOn || !ccEl) return;
  if (ccEl.textContent !== "\u266a "+txt){ ccEl.textContent = "\u266a "+txt; ccEl.classList.add("on"); }
  ccT = Math.max(ccT, 0.28);
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
    /* Downstream of the master fader. The onslaught's static needs to be audible
       while the master is being taken to nothing, so it hangs off here instead. */
    postBus = comp;

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

    /* the field: open wind off the water, and a child somewhere in it */
    KWIND.gain = AC.createGain(); KWIND.gain.gain.value = 0;
    KWIND.filt = AC.createBiquadFilter(); KWIND.filt.type = "lowpass";
    KWIND.filt.frequency.value = 5200; KWIND.filt.Q.value = 0.4;
    KWIND.filt.connect(KWIND.gain); KWIND.gain.connect(master);
    LAUGH.gain = AC.createGain(); LAUGH.gain.gain.value = 1;
    LAUGH.gain.connect(master);
    /* the polluted bed, built like the other two: its own lowpass into its own gain, so
       the scene can bring it up on its own without touching the garden. Missing this was why
       the tunnel recording had no gain node at all and the polluted scene played in silence. */
    AMB3.gain = AC.createGain(); AMB3.gain.gain.value = 0;
    AMB3.filt = AC.createBiquadFilter(); AMB3.filt.type = "lowpass";
    AMB3.filt.frequency.value = 5200; AMB3.filt.Q.value = 0.4;
    AMB3.filt.connect(AMB3.gain); AMB3.gain.connect(master);

    COUGH.gain = AC.createGain(); COUGH.gain.gain.value = 1;
    if (AC.createStereoPanner){ COUGH.pan = AC.createStereoPanner();
      COUGH.gain.connect(COUGH.pan); COUGH.pan.connect(master); }
    else COUGH.gain.connect(master);

    /* the field after the air changed. Its own bed and its own child, built the same way
       as the two above so this chapter can set its level without touching anything else. */
    KAMB.gain = AC.createGain(); KAMB.gain.gain.value = 0;
    KAMB.filt = AC.createBiquadFilter(); KAMB.filt.type = "lowpass";
    KAMB.filt.frequency.value = 5000; KAMB.filt.Q.value = 0.4;
    KAMB.filt.connect(KAMB.gain); KAMB.gain.connect(master);
    /* the city from inside the room. Its own filter as well as the baked one, set low, so
       the walls can close a little further as the chapter goes on without re-cutting a file. */
    KROOM.gain = AC.createGain(); KROOM.gain.gain.value = 0;
    KROOM.filt = AC.createBiquadFilter(); KROOM.filt.type = "lowpass";
    KROOM.filt.frequency.value = 900; KROOM.filt.Q.value = 0.5;
    KROOM.filt.connect(KROOM.gain); KROOM.gain.connect(master);
    KNIGHT.gain = AC.createGain(); KNIGHT.gain.gain.value = 0;
    KNIGHT.filt = AC.createBiquadFilter(); KNIGHT.filt.type = "lowpass";
    KNIGHT.filt.frequency.value = 4200; KNIGHT.filt.Q.value = 0.4;
    KNIGHT.filt.connect(KNIGHT.gain); KNIGHT.gain.connect(master);
    KCOUGH.gain = AC.createGain(); KCOUGH.gain.gain.value = 1;
    if (AC.createStereoPanner){ KCOUGH.pan = AC.createStereoPanner();
      KCOUGH.pan.pan.value = -0.30;              // he is standing left of centre
      KCOUGH.gain.connect(KCOUGH.pan); KCOUGH.pan.connect(master); }
    else KCOUGH.gain.connect(master);

    /* The lookout. One layer per place, each of them silent until the visitor is
       looking at that place through the binoculars. */
    for (const k in LOOKA){
      const L = LOOKA[k];
      L.gain = AC.createGain(); L.gain.gain.value = 0;
      L.filt = AC.createBiquadFilter(); L.filt.type = "lowpass";
      L.filt.frequency.value = L.lp; L.filt.Q.value = 0.4;
      L.filt.connect(L.gain); L.gain.connect(master);
    }

    /* the night */
    for (const L of [CRICK, NBIRD]){
      L.gain = AC.createGain(); L.gain.gain.value = 0;
      L.filt = AC.createBiquadFilter(); L.filt.type = "lowpass";
      L.filt.frequency.value = 9000; L.filt.Q.value = 0.4;
      L.filt.connect(L.gain); L.gain.connect(master);
    }
    NBIRD.filt.frequency.value = 4200;    // he is calling from the far treeline

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
/* the field: open wind off the water, and him */
const KWIND = { buf:null, src:null, gain:null, filt:null, state:"idle" };
const LAUGH = { buf:null, gain:null, state:"idle", next: 4 };
/* Her cough, and the air of the place afterwards.
   The cough is a one-shot like the laugh — it happens because somebody touched her, and it
   never loops. It goes through a stereo panner set from where she is standing in the frame,
   so it arrives from her rather than from the middle of the listener's head. */
const COUGH = { buf:null, gain:null, pan:null, state:"idle" };
/* THE FIELD AFTER THE AIR CHANGED.
   Its bed is a loop like any other. Its cough is a one-shot like the laugh and hers, with
   one difference that matters: the recording is not one cough, it is three separate fits
   of coughing with silence between them, so `KCOUGH_CUTS` holds where each of them is and
   the scene plays ONE at a time. That is what keeps it from being the same event on a
   timer — three different coughs, in a random order, at intervals that do not repeat. */
const KAMB = { buf:null, src:null, gain:null, filt:null, state:"idle" };
/* AND THE SAME CITY, HEARD FROM INSIDE THE HOUSE.
   The polluted bedroom used to play the garden bed at a tenth of its level, which is why it
   still sounded like the bedroom before the air changed — it WAS the bedroom before the air
   changed, only quieter. This is the same recording the field outside uses, from a different
   three minutes of it, already low-passed at 700 Hz when it was built. Turning the outdoor
   bed down would not have done it: what makes a sound come from beyond a shut window is the
   top of it missing, not the level. */
const KROOM = { buf:null, src:null, gain:null, filt:null, state:"idle" };
/* AND THE SKY AFTERWARDS, WHICH IS A HUM AND NOT A PLACE.
   72 per cent of this recording's energy is under 250 Hz — it is the bottom of a city heard
   from a field at night, with nothing in it that could be called an event. That is the whole
   requirement: the chapter is about there being nothing, so its sound has to be present
   without ever being interesting, and everything that used to be out here — the crickets,
   the bird that only calls at night — has to be gone rather than quiet. */
const KNIGHT = { buf:null, src:null, gain:null, filt:null, state:"idle" };
const KCOUGH = { buf:null, gain:null, pan:null, state:"idle", until:0, last:-1 };
/* (start, length) in seconds, measured off the supplied recording's envelope */
const KCOUGH_CUTS = [[0.15,1.32],[2.24,0.82],[4.24,0.84]];
/* the flat lift on the outdoor bed, shared by both halves so their relationship holds */
const AMB_LIFT = 1.34;
/* the polluted bed: a distant tunnel field recording, which is what the outside sounds like
   when there is nothing living in it */
const AMB3 = { buf:null, src:null, gain:null, filt:null, state:"idle" };
/* after dark. The birds that sang all afternoon are not out here now — what is
   out here is insects, and one bird that only calls at night. */
const CRICK = { buf:null, src:null, gain:null, filt:null, state:"idle" };
const NBIRD = { buf:null, src:null, gain:null, filt:null, state:"idle" };
/* THE LOOKOUT. Four places that remember themselves.

   Everything else in this piece is scene ambience: it belongs to a chapter and it
   plays for as long as the chapter does. These do not. Each one exists only while
   the visitor has the binoculars on that particular place, comes up over a couple
   of seconds so it is never an event, and goes when they look away. The intended
   effect is not that looking triggers a sound — it is that the place has been
   making that sound the whole time and the lenses are what let you hear it.

   Levels are deliberately low. Every one of these plays UNDER the garden bed, the
   wind bed and the birds, so it reads as something carried up the hill on the air
   rather than something that arrived. Filters do the distance: the school is a
   long way down and across, so it loses its top; the tank is metal, so it keeps
   just enough. */
const LOOKA = {
  /* Not a place: the valley itself. The town as it sounds from a hill a couple of
     kilometres above it — this is what is there when the visitor is not holding on
     anything in particular, so the chapter is never silent and never announces
     that an interaction has started.

     It is also the thing that gets out of the way. When a place does come into
     focus, this ducks almost to nothing, which is what makes a memory of one
     place feel like one place rather than a sound added to a mix. */
  bed:    { buf:null, src:null, gain:null, filt:null, state:"idle",
            file:"look-valley.wav", lp:2600, vol:0.26 },
  /* These four are the point of the chapter and they were mixed like background:
     quiet enough that the water tower, which is the most filtered of them, could
     not be heard at all. A place you have brought into focus should be the loudest
     thing on screen, so they are roughly doubled, and the tower keeps more of its
     top end — water on a steel tank is a bright sound and a 2.4 kHz lid took the
     recognisable part of it away along with the harshness. */
  school: { buf:null, src:null, gain:null, filt:null, state:"idle",
            file:"look-school.wav", lp:2600, vol:0.72 },
  birds:  { buf:null, src:null, gain:null, filt:null, state:"idle",
            file:"look-birds.wav",  lp:8200, vol:0.58 },
  tower:  { buf:null, src:null, gain:null, filt:null, state:"idle",
            file:"look-tower.wav",  lp:4200, vol:0.66 },
  hills:  { buf:null, src:null, gain:null, filt:null, state:"idle",
            file:"look-hills.wav",  lp:1500, vol:0.66 },
  town:   { buf:null, src:null, gain:null, filt:null, state:"idle",
            file:"look-town.wav",   lp:2400, vol:0.52 }
};

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
  loadOne(KWIND, "kite-wind.wav");
  loadOne(LAUGH, "kite-laugh.wav");
  loadOne(COUGH, "cough-mother.wav");
  /* The artist's tunnel field recording, renamed on disk from its original
     839653__guidofm__ambpubl_cinematis_fieldrecording_tunnelambience_distant (1).wav.
     Same audio, untouched; the name is shortened because spaces and parentheses travel
     badly through a pipeline that turns every filename into a URL, and the original
     filename is recorded with its attribution in CREDITS.md where it belongs. */
  loadOne(AMB3, "amb-tunnel-distant.wav");
  /* THE CITY THROUGH A SHUT WINDOW, which is the one polluted bed that is still its own
     recording: 19 s low-passed at 700 Hz with 24 dB an octave when it was built, because
     what puts a sound outside a closed window is the top of it missing rather than the
     level. Stored at 11.025 kHz, which is measured and not assumed — through a 36 dB/octave
     high-pass there is 0.21% of its power above 6 kHz, so the upper half of a 22 kHz file
     would have been empty. */
  /* AND THE TWO POLLUTED OUTDOOR SCENES PLAY THE SHEETS' OWN AIR.
     They were on a separate city recording and it did not belong to this world: the
     polluted washing line established what the outside sounds like after the air changed,
     and then the field and the sky went somewhere else for theirs, which is why they
     sounded like a different piece. All three take the same recording now.

     Playing one buffer through three layers is not playing the same thing three times.
     Each has its own lowpass — the field open at 5 kHz, the hill two kilometres up and
     shut down to 2.4, the sky at 4.2 — its own level, and `startOne` begins every layer at
     a random point in the file, so no two are ever in phase and none of them starts where
     it started last time. What they share is the character, which is the point.

     It also takes two files out of the bundle, which is the only free thing in this
     project. */
  loadOne(KAMB, "amb-tunnel-distant.wav");
  loadOne(KROOM, "city-indoors.wav");
  loadOne(KNIGHT, "amb-tunnel-distant.wav");
  loadOne(KCOUGH, "kite-child-cough.wav");
  loadOne(CRICK, "night-crickets.wav");
  loadOne(NBIRD, "night-birds.wav");
  for (const k in LOOKA) loadOne(LOOKA[k], LOOKA[k].file);
}
/* A one-shot, not a layer. The laugh is four seconds of a child and there is no
   honest way to loop that — looped laughter is a horror-film cue. So it is
   played whole, occasionally, on its own gain node, faded up over the first
   second so it arrives the way a sound arrives across a field: you are hearing
   it before you notice it started. */
function fireLaugh(vol){
  if (!AC || !soundOn || LAUGH.state !== "ready" || !LAUGH.gain) return;
  const s = AC.createBufferSource();
  s.buffer = LAUGH.buf;
  const g = AC.createGain();
  const now = AC.currentTime, d = LAUGH.buf.duration;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), now + 1.05);
  g.gain.setValueAtTime(Math.max(0.0002, vol), now + Math.max(1.1, d-1.5));
  g.gain.exponentialRampToValueAtTime(0.0001, now + d);
  s.connect(g); g.connect(LAUGH.gain);
  s.start(now);
  s.stop(now + d + 0.05);
}
/* HER COUGH.
   Once, when she is touched, at a level that is unmistakable on laptop speakers without
   being startling — it sits above the bed and the cloth and below nothing. No fade-in: a
   cough starts where it starts. Panned very slightly toward where she is standing, which is
   just left of centre, so it is coming from her and not from the interface. */
function coughSound(panX){
  if (!AC || !soundOn || COUGH.state !== "ready" || !COUGH.gain) return;
  if (COUGH.pan) COUGH.pan.pan.setTargetAtTime(
    cl((panX===undefined ? 0.488 : panX)*2 - 1, -1, 1) * 0.45, AC.currentTime, 0.05);
  const s2 = AC.createBufferSource();
  s2.buffer = COUGH.buf;
  const g = AC.createGain();
  const now = AC.currentTime, d = COUGH.buf.duration;
  g.gain.setValueAtTime(0.62, now);
  g.gain.setValueAtTime(0.62, now + Math.max(0.1, d - 0.45));
  g.gain.exponentialRampToValueAtTime(0.0001, now + d);
  s2.connect(g); g.connect(COUGH.gain);
  s2.start(now);
  s2.stop(now + d + 0.05);
}

/* THE POLLUTED BED, AND WHY IT IS LOUDER THAN THE GARDEN EVER WAS.
   The contrast this scene is built on is not "quieter" — it is "emptier". If the polluted
   ambience is mixed so low that a visitor on laptop speakers hears nothing, the scene reads
   as broken audio rather than as a place with less in it. So this bed is set high and kept
   there, and what makes the scene feel emptier is that almost nothing else is playing over
   it: no birds, no gust, the cloth well down, and her only when she is touched. */
const AMB3Q = { t: 0 };
function ambienceAfter(v){
  AMB3Q.t = 0.3;
  v = v * (1 - SILENCE);
  if (!AC || !soundOn || !AMB3.gain) return;
  if (AMB3.state === "ready" && !AMB3.src) startOne(AMB3);
  envGain(AMB3.gain, Math.max(0, v*AMB_LIFT), 0.7);
  if (AMB3.filt) AMB3.filt.frequency.setTargetAtTime(5200, AC.currentTime, 0.8);
  /* and the clean garden gets out of the way entirely */
  if (AMB.gain)  envGain(AMB.gain, 0, 1.1);
  if (AMB2.gain) envGain(AMB2.gain, 0, 1.1);
}
/* ...and the reverse, for every scene that is not this one.
   This existed and nothing ever called it, so the washing line's bed simply kept playing
   once that chapter had been through — audible under everything after it except the
   polluted field, which happened to zero AMB3 by hand. It is on a queue now like every
   other layer: the scene asks for it each frame, and when it stops asking, it goes. */
function ambienceAfterOff(){
  if (AMB3.gain) envGain(AMB3.gain, 0, 1.2);
}

function startOne(layer){
  /* a one-shot has nothing to start. KCOUGH belongs here too: it is played in pieces from
     an offset, and setting it looping would put a child coughing under the whole chapter. */
  if (layer === LAUGH || layer === COUGH || layer === KCOUGH) return;
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
/* HOW MUCH THE BED GETS OUT OF HER WAY.
   Set by the washing line while she is humming. Making her audible by turning her up is the
   wrong instrument: the ambience bed runs at around 0.7 and she was competing with it, so
   raising her far enough to win would have made her an announcement. Ducking the bed by a
   fifth opens a pocket for her instead, which is what a mix does, and it costs the garden
   almost nothing because the ear follows whatever moved. */
let HUMDUCK = 0;
function ambience(v, open){
  v = v * (1 - SILENCE) * (1 - 0.20*cl01(HUMDUCK));   // the onslaught takes the world with it
  AMB.vol = v; AMB.open = open;
  if (!AC || !soundOn || !AMB.gain) return;
  if (AMB.state === "ready" && !AMB.src) startOne(AMB);
  /* AND THE BED SITS HIGHER THAN IT DID, EVERYWHERE.
     The environment was mixed to sit under everything, and the result was that on laptop
     speakers at ordinary volume parts of it were inaudible — a garden you cannot hear is
     not restraint, it is a missing layer, and it also destroys the contrast the polluted
     scene depends on. A flat lift of about a third on the outdoor bed, applied here so both
     halves of the piece move together and their relationship is unchanged. */
  envGain(AMB.gain, Math.max(0, v*AMB_LIFT), 0.55);
  // shut, it is muffled through glass; open, nothing is taking the top off it
  AMB.filt.frequency.setTargetAtTime(620 + 8600*cl01(open), AC.currentTime, 0.55);
  if (AMB2.gain){
    if (AMB2.state === "ready" && !AMB2.src) startOne(AMB2);
    // held well under the first, and only present once the window is
    const o = cl01((open-0.34)/0.66);
    envGain(AMB2.gain, Math.max(0, v*0.46*o*o*AMB_LIFT), 0.9);
    AMB2.filt.frequency.setTargetAtTime(1800 + 7000*cl01(open), AC.currentTime, 0.8);
  }
}

/* The washing line. `v` is how loud the scene is, `wind` is the line's own gust
   value, and `mom` is how much of her there is to hear — which is how much of
   her is still on the line, times whether the visitor has reached out and
   touched her. She does not hum at anyone who has not. */
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
  /* Her humming ducks under a gust rather than fighting it, and goes when she does. It
     comes up over a second and a half, so touching her feels like noticing something that
     was already going on, and it leaves over four, so it is gone before you are sure.

     MAKING HER AUDIBLE IS THREE THINGS, AND ONLY ONE OF THEM IS LEVEL. She was reported as
     easy to miss at ordinary laptop volume, and the level was not the main reason: the
     lowpass sat at 2200 Hz to place her behind a sheet some way off, which keeps the
     fundamentals of a hum and throws away the breath and the edge on top of them — the
     parts the ear actually uses to recognise a person humming rather than a low tone in the
     mix. So the filter opens, the bed ducks to make room, and the level comes up a little.
     Together she is unmistakable; on level alone she would have had to shout. */
  const humOn = cl01(mom);
  HUMDUCK = humOn;
  envGain(HUM.gain, v*0.74*humOn*(1 - w*0.30), mom > 0.02 ? 1.5 : 4.0);
  if (HUM.filt) HUM.filt.frequency.setTargetAtTime(2200 + 1500*humOn, AC.currentTime, 1.2);
}

/* The kite field. `v` is how loud, `night` is how far the evening has gone, and
   `joy` is a nudge — a laugh is more likely just after the visitor has done
   something with the kite than on any fixed clock. */
const KITEQ = { t: 0 };
function kiteSound(dt, v, night, joy){
  KITEQ.t = 0.3;
  if (!AC || !soundOn || !KWIND.gain) return;
  if (KWIND.state === "ready" && !KWIND.src) startOne(KWIND);
  envGain(KWIND.gain, v*0.82, 0.8);
  /* the wind off the water loses its top as the light goes — colder, further */
  KWIND.filt.frequency.setTargetAtTime(5200 - night*2100, AC.currentTime, 1.4);
  /* him: rare, faint, and never on a beat you could predict. He goes quiet as
     it gets dark, because by then he has been out here a long time. */
  LAUGH.next -= dt * (1 + joy*2.2);
  if (LAUGH.next <= 0){
    LAUGH.next = 9 + Math.random()*11;
    fireLaugh(v * (0.20 + Math.random()*0.10) * (1 - night*0.45));
  }
}

/* ONE COUGH, WHOLE, AND NEVER TWO AT ONCE.
   A fit of coughing arrives across a field the way anything does — you are hearing it
   before you notice it started — so it comes up over a quarter of a second and goes back
   down over rather longer, which is also what keeps a cut-out region of a recording from
   clicking at either end. It is loud enough to be unmistakable over the bed and no
   louder: the bed sits at -26 dBFS and this is played at about 0.5, which puts it clearly
   above the air without being an event the interface has staged.

   `until` is when the last one will have finished. Nothing can start before then, so two
   can never overlap however the scene's clock lands. */
function fireChildCough(vol){
  if (!AC || !soundOn || KCOUGH.state !== "ready" || !KCOUGH.gain) return 0;
  const now = AC.currentTime;
  if (now < KCOUGH.until) return 0;              // one is still going
  /* a different one from last time, so it is never the same cough twice running */
  let k = Math.floor(Math.random()*KCOUGH_CUTS.length);
  if (k === KCOUGH.last) k = (k + 1 + Math.floor(Math.random()*(KCOUGH_CUTS.length-1)))
                             % KCOUGH_CUTS.length;
  KCOUGH.last = k;
  const cut = KCOUGH_CUTS[k], off = cut[0], dur = cut[1];
  const s = AC.createBufferSource();
  s.buffer = KCOUGH.buf;
  const g = AC.createGain();
  const up = 0.26, down = 0.42;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), now + up);
  g.gain.setValueAtTime(Math.max(0.0002, vol), now + Math.max(up + 0.05, dur - down));
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.10);
  s.connect(g); g.connect(KCOUGH.gain);
  s.start(now, off, dur + 0.12);
  s.stop(now + dur + 0.20);
  KCOUGH.until = now + dur + 0.25;
  return dur;
}

/* THE FIELD AFTER THE AIR CHANGED.
   The bed is continuous and clearly present — it is the whole environment of the chapter
   and the one thing that is still there at the end of it. It fades in on arrival and out
   on leaving, and it is set well above where the other polluted bed was mixed, because a
   scene whose ambience nobody can hear reads as broken rather than as bad air.

   `going` is the ending: once he has started to disappear, no further coughs are
   SCHEDULED. One already sounding is left alone and finishes on its own, which is why
   this only stops the clock and never touches a playing source. */
const KAFTQ = { t: 0 };
function kiteAfterSound(dt, v, going){
  KAFTQ.t = 0.3;
  v = v * (1 - SILENCE);
  if (!AC || !soundOn || !KAMB.gain) return;
  if (KAMB.state === "ready" && !KAMB.src) startOne(KAMB);
  envGain(KAMB.gain, Math.max(0, v*0.92*AMB_LIFT), 0.9);
  /* the hill borrows this same layer through a much lower filter, so the field has to ask
     for its own back rather than inheriting whichever scene ran last */
  if (KAMB.filt) KAMB.filt.frequency.setTargetAtTime(5000, AC.currentTime, 1.2);
  /* every other bed gets out of the way: this chapter is only this air */
  if (AMB.gain)  envGain(AMB.gain, 0, 1.1);
  if (AMB2.gain) envGain(AMB2.gain, 0, 1.1);
  if (AMB3.gain) envGain(AMB3.gain, 0, 1.2);
  if (KWIND.gain) envGain(KWIND.gain, 0, 1.4);

  if (going){ KSKY_A.coughT = 1e9; return; }
  KSKY_A.coughT -= dt;
  if (KSKY_A.coughT <= 0){
    const dur = fireChildCough(v * 0.50);
    /* the gap is long and it is never the same gap: seven to eighteen seconds of nothing
       after each one, so it returns while the visitor is still here without ever becoming
       something they could count on. If the sound was not ready, try again shortly. */
    KSKY_A.coughT = dur > 0 ? 7 + Math.random()*11 : 1.5;
  }
}
/* ...and the reverse, for every scene that is not this one */
function kiteAfterSoundOff(){
  if (KAMB.gain) envGain(KAMB.gain, 0, 1.3);
}

/* THE ROOM WITH THE WINDOW SHUT.
   `v` is how much of the city gets in, `close` how far the room has shut itself — the second
   one only moves the filter, never the level, because a room going quieter and a room going
   duller are different things and only the second one is what walls do.

   Like every other bed here it fades rather than starts: `envGain` ramps, `startOne` is
   called once and the source then loops forever, so nothing restarts when the visitor moves
   and two copies can never overlap. The garden that used to play here is taken down at the
   same time, over a slower ramp than this one comes up, so the two cross rather than cut. */
const KROOMQ = { t: 0 };
function cityIndoors(v, close){
  KROOMQ.t = 0.3;
  v = v * (1 - SILENCE);
  if (!AC || !soundOn || !KROOM.gain) return;
  if (KROOM.state === "ready" && !KROOM.src) startOne(KROOM);
  envGain(KROOM.gain, Math.max(0, v*AMB_LIFT), 1.1);
  if (KROOM.filt) KROOM.filt.frequency.setTargetAtTime(
    980 - cl01(close||0)*300, AC.currentTime, 1.6);
  /* and nothing else belongs in this room: not the garden it used to have, and not the
     washing line's air either, which is a different outdoors two chapters away */
  if (AMB.gain)  envGain(AMB.gain, 0, 1.8);
  if (AMB2.gain) envGain(AMB2.gain, 0, 1.8);
  if (AMB3.gain) envGain(AMB3.gain, 0, 1.5);
  if (KWIND.gain) envGain(KWIND.gain, 0, 1.5);
}
function cityIndoorsOff(){
  if (KROOM.gain) envGain(KROOM.gain, 0, 1.5);
}

/* THE FIELD AT NIGHT, AFTERWARDS.
   One bed and nothing over it. It is set to be plainly there — the visitor is going to be
   standing in this scene for the better part of a minute reading five sentences, and a
   chapter about absence still has to sound like somewhere rather than like the audio having
   failed. What makes it feel empty is not that it is quiet, it is that everything that used
   to be out here is switched off underneath it: the insects, the bird, the garden, and both
   of the other polluted beds, all of which would otherwise leak in from a neighbouring
   chapter and put life back into a field that is supposed to have none. */
const KNIGHTQ = { t: 0 };
function cityNight(dt, v){
  KNIGHTQ.t = 0.3;
  v = v * (1 - SILENCE);
  if (!AC || !soundOn || !KNIGHT.gain) return;
  if (KNIGHT.state === "ready" && !KNIGHT.src) startOne(KNIGHT);
  envGain(KNIGHT.gain, Math.max(0, v*0.86*AMB_LIFT), 1.2);
  for (const L of [AMB, AMB2, AMB3, KAMB, KROOM, KWIND, CRICK, NBIRD])
    if (L.gain) envGain(L.gain, 0, 1.6);
}
function cityNightOff(){
  if (KNIGHT.gain) envGain(KNIGHT.gain, 0, 1.6);
}

/* After dark: insects, which are everywhere and even, and one bird that only
   calls at night, a long way off in the treeline.

   `deep` is how far into the night it is. `bird` is how much of him is wanted,
   because he is the one sound here with a shape you can predict: a two-note call
   on a loop, and a loop of a call you can hum along to stops being weather and
   becomes a ringtone. At the line and in the field he arrives and leaves and is
   welcome. In the star chapter, where nothing else is happening and the visitor
   is standing still reading, he is the only thing moving and he wears out fast,
   so that chapter asks for none of him and the crickets carry it alone.

   This function used to also push the daytime ambience down, which was wrong in
   a way that took the whole field chapter with it: `deep` is 0 at the start of
   the evening, and it was setting the garden bed to 0.03 regardless, so the
   moment the kite scene opened the world went quiet and only the wind was left.
   Each scene owns its own daylight now; this owns the night and nothing else. */
const NIGHTQ = { t: 0 };
let nbDrift = 0.4, nbT = 0;
function nightSound(dt, v, deep, bird){
  NIGHTQ.t = 0.3;
  if (!AC || !soundOn || !CRICK.gain) return;
  for (const L of [CRICK, NBIRD]) if (L.state === "ready" && !L.src) startOne(L);
  const d = cl01(deep);
  const b = bird === undefined ? 1 : cl01(bird);
  envGain(CRICK.gain, v*0.42*(0.35 + d*0.65), 1.6);
  /* he calls for a while, then stops for a while, on a slow clock of his own, so
     he is never simply on */
  nbT -= dt;
  if (nbT <= 0){ nbT = 9 + Math.random()*14; nbDrift = Math.random() < 0.55 ? 1 : 0; }
  envGain(NBIRD.gain, v*0.26*b*nbDrift*cl01((d-0.30)/0.70), 3.0);
}

/* THE LOOKOUT MIX.
   `place` is the key of whatever is in the middle of the lenses, or null. `focus`
   is how far the memory has come back, because a place you have not brought into
   focus is a place you are not really looking at yet. `open` is how loud the wider
   world should be when nothing in particular is being remembered.

   The whole chapter is one crossfade with two positions. Looking around: the
   valley bed and the garden birds, at ordinary level, the way a hilltop sounds.
   Holding on somewhere: everything else steps back to about a fifth of itself and
   that one place comes up on its own. Not a mix of two things — a shift of
   attention, which is what remembering somewhere actually feels like.

   `LOOKDUCK` is how far into that second position we are, and updSound reads it so
   the wind and leaf beds duck as well. Everything the visitor can hear is inside
   the duck; nothing survives it at full level. */
const LOOKQ = { t: 0 };
let LOOKDUCK = 0;
/* THE ONSLAUGHT TAKES EVERYTHING WITH IT.
   The statistics sequence is not a scene with its own ambience laid over the last
   one — the morning stops. Every bed, every layer and the garden itself go to
   nothing over about a second and a half as the picture goes to black, leaving
   only the static, and after the cut not even that. One number does it, so there
   is no chance of a layer surviving into a sequence that is supposed to be silent. */
let SILENCE = 0;
/* THE ENDING TAKES THE WHOLE MIX DOWN AND KEEPS ITS OWN SOUND BELOW THE FADER.
   Same lesson the onslaught taught, applied the other way round. A layer only gets quiet
   if something calls it, so muting the world scene by scene is a game you lose the next
   time a scene is added — the master fader is the only thing nothing can be forgotten out
   of. But the ending is not silence, it is silence with five remembered sounds in it, so
   those cannot hang off the master or they would go down with everything else. They hang
   off `postBus`, below the fader, exactly where the onslaught's static hangs. */
let ENDMUTE = 0;
function lookSound(dt, v, place, focus, open, after){
  LOOKQ.t = 0.3;
  if (!AC || !soundOn) return;
  /* a place has to be genuinely in focus before it is heard at all: the sound is
     the reward for having held on it, not for having pointed at it */
  const f = cl01((cl01(focus) - 0.20) / 0.58);
  const duck = place ? f : 0;
  // the duck itself is smoothed here rather than by a gain node, because the
  // ambience bed and the noise beds all have to move together
  LOOKDUCK = LOOKDUCK + (duck - LOOKDUCK) * Math.min(1, dt*0.55);
  const away = 1 - LOOKDUCK*0.88;

  for (const k in LOOKA){
    const L = LOOKA[k];
    if (L.state === "idle") loadOne(L, L.file);
    if (L.state === "ready" && !L.src) startOne(L);
    if (!L.gain) continue;
    const want = k === "bed" ? v * L.vol * away
                             : (place === k ? v * L.vol * f : 0);
    /* in over two seconds, out over three: arriving should be slower than a
       fade-in, and leaving slower still, so that a place fades out of hearing at
       about the speed it fades out of focus */
    envGain(L.gain, want, want > 0.0005 ? 2.1 : 3.0);
  }
  // the birds and the open countryside step back with everything else
  const bedV = (open===undefined ? 0.6 : open) * away;
  if (!after){ ambience(bedV, 1); return; }

  /* AND AFTER THE AIR CHANGED, THE HILL HAS A CITY UNDER IT.
     Not a new recording — this is the same air the polluted washing line and the polluted
     field are under, which is already the right thing: it is the sound of an outside with
     nothing living in it, heard from a distance. That is exactly what this is, an open
     hillside with a town a couple of kilometres below it.

     What is different here is the distance. It runs through a lower filter than the field
     does — two kilometres of air is itself a low-pass — and it sits lower, because the
     visitor is above it rather than standing in it. It ducks with everything else when a
     place comes into focus, so a memory still arrives out of a quieter world, and it comes
     back on its own when the lenses come down, because `away` returns to 1. */
  KAFTQ.t = 0.3;
  if (!KAMB.gain) return;
  if (KAMB.state === "ready" && !KAMB.src) startOne(KAMB);
  envGain(KAMB.gain, Math.max(0, bedV*0.62*AMB_LIFT), 1.4);
  if (KAMB.filt) KAMB.filt.frequency.setTargetAtTime(2400, AC.currentTime, 1.8);
  /* and the clean world's beds are not on this hill */
  if (AMB.gain)  envGain(AMB.gain, 0, 1.6);
  if (AMB2.gain) envGain(AMB2.gain, 0, 1.6);
  if (AMB3.gain) envGain(AMB3.gain, 0, 1.6);
}

function updSound(dt, t){
  updCC(dt);
  if (!AC || !soundOn) return;
  /* THE ONSLAUGHT SILENCES THE MASTER, NOT THE LAYERS.
     Scaling each bed by SILENCE individually left birdsong on the black screen,
     because a layer only gets quiet if something calls it, and a scene that has been
     left behind stops calling anything — its gain node simply holds the last value
     it was given. Chasing that layer by layer is a game you lose the next time a
     layer is added. So the whole mix comes down at the fader, which nothing can be
     forgotten out of, and the static hangs off the bus below it. */
  envGain(master, 0.85*(1-SILENCE)*(1-ENDMUTE), SILENCE > 0.02 ? 0.22 : 0.9);
  const h = AIR.h, night = (AIR.tod<0.14||AIR.tod>0.84)?1:0;
  const out = OUTSIDE;                                   // 0 in the room, 1 outdoors
  /* while a place is being remembered through the binoculars, the weather steps
     back too. Otherwise the wind bed sits on top of the memory and nothing has
     actually got quieter. */
  const lk = (1 - LOOKDUCK*0.80) * (1 - SILENCE);
  envGain(BED.wind.g,    (0.030+0.052*out)*(1-h*0.55)*(1-MUFFLE*0.7)*lk, 0.7);
  envGain(BED.leaves.g,  0.016*out*(1-h*0.7)*(1-MUFFLE*0.8)*lk, 0.7);
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
  else if (RUS.gain){ for (const L of [RUS, RUS2, HUM]) envGain(L.gain, 0, 0.9); HUMDUCK = 0; }
  if (KITEQ.t > 0){ KITEQ.t -= dt; }
  else if (KWIND.gain){ envGain(KWIND.gain, 0, 1.1); }
  /* the polluted field's air fades out on the way out of the chapter rather than stopping
     with it, which is the same courtesy every other bed here gets */
  if (KAFTQ.t > 0){ KAFTQ.t -= dt; }
  else kiteAfterSoundOff();
  if (KROOMQ.t > 0){ KROOMQ.t -= dt; }
  else cityIndoorsOff();
  if (AMB3Q.t > 0){ AMB3Q.t -= dt; }
  else ambienceAfterOff();
  if (KNIGHTQ.t > 0){ KNIGHTQ.t -= dt; }
  else cityNightOff();
  if (NIGHTQ.t > 0){ NIGHTQ.t -= dt; }
  else if (CRICK.gain){ for (const L of [CRICK, NBIRD]) envGain(L.gain, 0, 2.0); }
  /* a place's memory does not follow the visitor out of the chapter it belongs to */
  if (LOOKQ.t > 0){ LOOKQ.t -= dt; }
  else if (LOOKA.bed.gain){
    for (const k in LOOKA) envGain(LOOKA[k].gain, 0, 1.4);
    LOOKDUCK = Math.max(0, LOOKDUCK - dt*0.8);           // and the duck lets go
  }
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
  /* a sash taking a pull and not moving. Low, short, and completely undramatic: it is
     the sound of a window declining, not of one jamming. */
  dull(v){ cc("a window not moving"); const g=(v===undefined?1:v);
           burst(210, 0.7, 0.16, 0.030*g, "lowpass"); tone(96, 0.13, "sine", 0.020*g); },
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
const bCC = document.getElementById("bCC"), bSkip = document.getElementById("bSkip");

/* Sound is not optional and there is no switch for it. Half of this work is in
   the ambience: the room behind glass, the cloth, her humming, the field, the
   crickets. A visitor who never finds the button experiences a different, worse
   piece, and one who turns it off is not choosing between two versions, they are
   choosing the one that does not work.

   It is started from the Begin press rather than on load, because a browser will
   not let an audio context run until somebody has clicked something, and Begin
   is the click. */
async function startSound(){
  if (soundOn) return true;
  if (!AC){ if (!initAudio()) return false; }
  if (AC.state === "suspended"){ try{ await AC.resume(); }catch(_){} }
  soundOn = true;
  envGain(master, 0.85, 1.2);
  if (AMB.state === "idle") loadAmbience();
  return true;
}
bCC.addEventListener("click", ()=>{
  ccOn = !ccOn;
  bCC.setAttribute("aria-pressed", String(ccOn));
  if (!ccOn) ccEl.classList.remove("on"); else cc("captions on");
});
/* Skip used to exist because an undone interaction stopped the scroll, and its job
   was to unstick you. Nothing stops the scroll now, so it means the only thing left
   for it to mean: move on. It marks the current beat's action as done so the
   instruction stops offering something the visitor has decided against, and then
   moves the page along. */
bSkip.addEventListener("click", ()=>{
  /* AND IN THE ENDING IT MEANS THE SAME THING WITHOUT LEAVING THE ENDING.
     The last beat pins the scroll in both directions for the length of an authored
     sequence, which is right for the work and wrong for anybody who has decided they
     are finished with it — scrolling harder does nothing there, and a page that will
     not move is a page that looks broken. So the control the interface already has for
     "move on" runs the sequence out instead: the sounds go, the words stop, and it
     lands on the black it was going to land on anyway. No new button, and nothing on
     screen has to announce that the scroll is being held. */
  if (typeof endingHolding === "function" && endingHolding()){
    endingSkip();
    bSkip.blur();
    return;
  }
  const g = BEATS[T.i].gate;
  if (g) meet(g);
  window.scrollBy(0, H*0.9);
  bSkip.blur();
});
