/* Illustrative Overtone curves, not standardized genre definitions. */
const PRESETS = {
  flat: {
    name: "Flat",
    gains: [0, 0, 0, 0, 0, 0],
    why: "The neutral reference: no frequency band is intentionally boosted or cut.",
    hear: "Use it to compare tonal changes. Flat EQ does not guarantee flat speakers or headphones.",
    trade:
      "A recording or listening system may still sound bass-heavy or bright with a flat equalizer.",
  },
  rock: {
    name: "Rock",
    gains: [5, 2, -2, 2, 4, 2],
    why: "The name suggests an energetic presentation associated with amplified bands. Our example adds low-end weight and upper-frequency attack, with a small lower-mid dip.",
    hear: "On music, listen for kick and bass weight, guitar bite, and cymbal attack. Here, compare the same harmonic mixture before and after EQ.",
    trade:
      "Too much low-end boost can mask detail; extra upper mids can make guitars or vocals harsh. Rock does not require a scooped sound.",
  },
  jazz: {
    name: "Jazz",
    gains: [2, 1, 0, 1, 2, 1],
    why: "The label suggests a restrained presentation of acoustic instruments and ensemble detail. Our example uses gentle changes rather than a dramatic smile-shaped curve.",
    hear: "On music, think of double-bass body, piano articulation, and the texture of brushes or cymbals.",
    trade:
      "Jazz spans many recording styles. A well-balanced recording may need no EQ at all. EQ cannot restore dynamics or instrument separation missing from a mix.",
  },
  soul: {
    name: "Soul",
    gains: [3, 2, 0, 2, 0, -1],
    why: "The name points to a warm rhythm section and expressive vocals. Our example adds bass and low-mid body, a little vocal presence, and slightly less high-frequency sparkle.",
    hear: "On music, listen for bass warmth, vocal intelligibility, and a rounded top end.",
    trade:
      "Too much 250 Hz energy can sound muddy. A presence boost can become nasal or tiring, depending on the singer and recording.",
  },
  pop: {
    name: "Pop",
    gains: [3, 0, -1, 3, 2, 2],
    why: "The label suggests an upfront, polished balance. Our example combines a modest low-end lift with presence and brightness.",
    hear: "On music, compare vocal prominence, beat weight, and high-frequency sheen.",
    trade:
      "Many pop recordings already emphasize these regions. Additional boosts may exaggerate sibilance or overwhelm the vocal.",
  },
  electronic: {
    name: "Electronic",
    gains: [6, 1, -3, 0, 3, 4],
    why: "The label suggests pronounced bass and sparkling percussion. Our example uses a stronger low/high emphasis with a lower-mid cut.",
    hear: "On music, think of bass pulses, synth brightness, and hi-hat definition.",
    trade:
      "Our lowest band is 80 Hz, not a dedicated sub-bass control. Large boosts require headroom and do not make small speakers reproduce deep bass.",
  },
  vocal: {
    name: "Vocal",
    gains: [-4, -2, 1, 4, 1, -2],
    why: "This is a task label rather than a genre: reduce low-frequency weight and emphasize the presence region.",
    hear: "On speech or singing, listen for consonants and intelligibility around the upper mids.",
    trade:
      "This does not isolate or extract a voice. It changes every instrument occupying the same frequencies.",
  },
  bass: {
    name: "Warm bass",
    gains: [8, 4, 0, 0, -2, -3],
    why: "A descriptive label: emphasize low-frequency weight while softening the upper end.",
    hear: "Compare the balance of low and high harmonics using a harmonic-rich source.",
    trade: "Heavy low-mid boosts can mask higher-frequency detail.",
  },
  bright: {
    name: "Bright edge",
    gains: [-3, -2, 0, 5, 8, 6],
    why: "A descriptive label: emphasize upper-frequency detail while reducing some low-frequency body.",
    hear: "Listen for a sharper, thinner timbre on the same source.",
    trade:
      "Brightness can also emphasize hiss, sibilance, or harshness already present.",
  },
  scoop: {
    name: "Scoop the mids",
    gains: [3, 0, -9, -6, 3, 3],
    why: "The name describes the curve: a dip through the middle with relatively stronger lows and highs.",
    hear: "Compare the body and presence of the source with EQ bypassed.",
    trade:
      "Deep mid cuts can make vocals and instruments seem distant or hollow.",
  },
};
