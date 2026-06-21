// Initial library, used only on first load (afterwards saved storage wins).
// Each child is a page/tab. Videos were parsed from the first pasted batch;
// titles are the real YouTube titles, so titleResolved skips a refetch.
export const SEED = {
  children: [
    {
      id: 'aubrielle',
      name: 'Aubrielle',
      emoji: '🌸',
      accent: 'pink',
      videos: [
        { id: 'vycR2IjEg7c', title: "Let's Learn Blending CVC Short Vowel Words", addedAt: 1, titleResolved: true },
        { id: 'Ovg_izXg-6Q', title: 'Jump Out Words! | Jack Hartmann Sight Words', addedAt: 2, titleResolved: true },
      ],
    },
    {
      id: 'elizabelle',
      name: 'Elizabelle',
      emoji: '🦋',
      accent: 'violet',
      videos: [
        { id: 'bGetqbqDVaA', title: 'Big Numbers Song | Count to 100 Song | The Singing Walrus', addedAt: 1, titleResolved: true },
        { id: '0iMyzZDi4a4', title: "Numberblocks | Maths Addition and Subtraction Skills | Let's add and subtract up to Five", addedAt: 2, titleResolved: true },
      ],
    },
  ],
}
