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
| `assets/amb-open.wav` | what arrives when the window opens |
| `assets/line-cloth.wav` | the washing, almost still |
| `assets/line-gust.wav` | the washing in a gust, layered over the first, never crossfaded |
| `assets/line-hum.wav` | her, once you have touched her, running down over half a minute |
| `assets/kite-wind.wav` | open wind off the water |
| `assets/kite-laugh.wav` | him, played whole and occasionally, never looped |
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

## The star cards

Tapping any of the five named stars opens a card: what the star is in one line, then what it has
meant to people. The little chart on each card is generated from the same coordinates the sky
itself is drawn from, so it is the constellation the visitor is actually looking at.
