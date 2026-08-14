# Credits

**Remember When** — an interactive artwork by **Aanya Sharma**, for the Earth Partner Prize.

Every painting, sheet, silhouette, skirt and sprite in `assets/` is the artist's own work, as are
the recordings of the washing line and the humming.

## A note on links and attribution

The artwork contains no external links, no logos, no organisation names and no citations. That is
deliberate: the competition does not permit third-party branding, sources or links, and a card that
ends in a row of credits stops being part of the piece.

The stated facts stand on their own. The field recordings that are not the artist's own are public
domain dedications, which require no attribution, so nothing is owed and nothing is shown. The
originals are kept at the repository root; `assets/` holds only the loops built from them.

## Built audio

| Built file | Where it plays |
| --- | --- |
| `assets/amb-garden.wav` | the bed under everything, muffled by whatever is in the way |
| `assets/amb-tunnel-distant.wav` | the polluted washing line, in place of the garden |
| `assets/amb-open.wav` | what arrives when the window opens |
| `assets/line-cloth.wav` | the washing, almost still |
| `assets/line-gust.wav` | the washing in a gust, layered over the first, never crossfaded |
| `assets/line-hum.wav` | her, once you have touched her, running down over half a minute |
| `assets/cough-mother.wav` | her, on the same washing line, afterwards |
| `assets/kite-wind.wav` | open wind off the water |
| `assets/kite-laugh.wav` | him, played whole and occasionally, never looped |
| `assets/city-outside.wav` | the same field afterwards, in place of the wind |
| `assets/city-indoors.wav` | the same city again, heard from inside the bedroom with the window shut |
| `assets/kite-child-cough.wav` | him, in that field, three separate fits played one at a time |
| `assets/night-crickets.wav` | from dusk onward |
| `assets/night-birds.wav` | once it is properly dark |
| `assets/look-valley.wav` | the town from the hill, while nothing in particular is being looked at |
| `assets/look-school.wav` | the school, once the binoculars are held on it |
| `assets/look-birds.wav` | the birds on the wire |
| `assets/look-tower.wav` | inside the water tower |
| `assets/look-hills.wav` | the far hills |
| `assets/look-town.wav` | the street below the hill |

Each looping file was decoded, downmixed to mono, resampled to 22.05 kHz, cut to a chosen window,
and then had its own tail folded back over its head under an equal-power crossfade so the loop
point is inaudible. They are deliberately different lengths so the combination does not come back
into phase.

Two of them reached `assets/` without that treatment and were rebuilt with it. The polluted line's
bed was the original recording renamed: sixteen kilohertz, stereo, eight-bit, two minutes long, with
a fade at each end. Its half-second level is flat to within four decibels across the whole recording
except at those two ends, so the chapter opened ten decibels quiet and then dipped and jumped every
two minutes — the only bed in the piece with an audible seam, under the one chapter meant to feel
like a place with less in it rather than a place with a fault in it. It is now thirty-four seconds
cut from the flat middle, downmixed, folded, and left at sixteen kilohertz, because the recording
has nothing above eight and resampling it up would only make the file larger. And the cough was
kept at forty-eight kilohertz in thirty-two-bit float for a sound that plays at two thirds gain
through a low-pass; it is now twenty-two-oh-five and sixteen-bit like everything else, resampled
through a windowed-sinc filter rather than by interpolation, since dropping from forty-eight without
one folds the top of the recording back down into it. Neither was filtered, gained or equalised.

The two polluted city beds come from one recording and deliberately not from the same part of it,
because two scenes playing the same twenty seconds are one scene with the volume changed. The
outdoor one is twenty-four seconds from 79 seconds in: a crest factor of 1.64, so there is nothing
in it that could be recognised on a second pass, and a zero-crossing rate of 509 Hz, which is what a
city sounds like from a long way off rather than from inside one. The indoor one is nineteen seconds
from 265 seconds in — three minutes away in the same recording — and low-passed at 700 Hz at 24 dB
an octave when it was built, because what puts a sound outside a shut window is the top of it
missing, not the level. Their lengths differ so they can never fall into phase.

Both are stored at 11.025 kHz rather than the usual 22.05, and that is measured rather than assumed:
through a 36 dB/octave high-pass the outdoor one has 0.38 per cent of its power above 4 kHz and 0.21
per cent above 6 kHz, so the upper half of a 22 kHz file would have held nothing. They are
normalised to −26 and −29 dBFS, and the step across each loop point measures inside the noise floor
of the file it sits in.

An earlier version of this chapter's bed was cut from a different supplied recording; it was
replaced rather than kept, and the file it produced is gone.

The cough was 44.1 kHz stereo and is now mono at 22.05 like everything else. It is kept whole rather
than cut up, because it is not one cough: it is three separate fits with silence between them, at
0.15, 2.24 and 4.24 seconds. The scene plays one of those at a time, by offset, never the same one
twice running, and never two at once.

The laugh is the exception: four seconds of a child cannot be looped, because looped laughter is a
horror-film cue. It is played whole, occasionally, on its own envelope, faded up over its first
second so it arrives the way a sound arrives across a field.

The six `look-` files are the lookout chapter, where each place remembers itself: a recording exists
only while the binoculars are held on that particular place, and the valley bed steps back to a fifth
of itself while one is playing, so remembering somewhere sounds like attention narrowing rather than
like a layer being added.

`look-valley.wav` needed more than a window and a crossfade. Its source is a small town at street
level, and it arrived carrying machine hum, close-passing motorcycles and throaty cars, footsteps,
sweeping, and people talking a few feet away — none of which belongs in a valley seen from a hill a
couple of kilometres off. Two kilometres of air is itself a filter, so the fix was physics rather
than editing: a 24 dB/octave high-pass at 190 Hz removes the engines and the hum outright, since
almost all of that energy sits below 200 Hz, a dip at 430 Hz takes the growl off anything that
survives, and a low-pass at 3.1 kHz is the softening distance does to the top. What is left is birds,
a general murmur and the bells. The window itself was then chosen by scanning the whole recording for
the longest stretch where nothing spikes above the bed, since a footstep, a sweep and a car going
past are all transients: sixty-seven clean seconds, from which the loop is cut.

Sound is not optional and there is no switch for it. Half of this work is in the ambience, so it
starts from the Begin press, which is also the gesture a browser needs before it will let an audio
context run.

## Renamed source files

Two of the artist's own files reached `assets/` under a different name, because the name they
arrived with would not survive being written into code and a URL:

| In `assets/` | As supplied |
| --- | --- |
| `momshadowcoughingcropped.png` | `momshadowcoughingafterpollution_cropped (2).png` |

The image is byte-for-byte the file that was supplied; only the name is different. (A `(1)` copy
of the same file was also supplied and is identical to it by checksum.)

## The star cards

Tapping any of the five named stars opens a card: what the star is in one line, then what it has
meant to people. The little chart on each card is generated from the same coordinates the sky
itself is drawn from, so it is the constellation the visitor is actually looking at.
