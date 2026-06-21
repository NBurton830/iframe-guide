// Initial library, used only on first load (afterwards localStorage wins).
// Each child is a page/tab. Videos were parsed from the first pasted batch.
export const SEED = {
  children: [
    {
      id: 'aubrielle',
      name: 'Aubrielle',
      emoji: '🌸',
      accent: 'pink',
      videos: [
        { id: 'vycR2IjEg7c', title: 'Phonics: Blending CVC Words', addedAt: 1 },
        { id: 'Ovg_izXg-6Q', title: 'Sight Words — Kindergarten & First Grade', addedAt: 2 },
      ],
    },
    {
      id: 'elizabelle',
      name: 'Elizabelle',
      emoji: '🦋',
      accent: 'violet',
      videos: [
        { id: 'bGetqbqDVaA', title: 'Story & Song Time', addedAt: 1 },
        { id: '0iMyzZDi4a4', title: 'Learning Adventure', addedAt: 2 },
      ],
    },
  ],
}
