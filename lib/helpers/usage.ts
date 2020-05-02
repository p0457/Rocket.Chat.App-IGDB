export default {
  game: {
    command: 'igdb-game',
    usage: '`/igdb-game [ID OR SLUG] (artworks|bundles|expansions|screenshots|similar|dlc|videos|feeds|pulses)`',
    description: 'Get details for a game. Second parameter is for sub-details',
  },
  games: {
    command: 'igdb-games',
    usage: '`/igdb-games [QUERY]`',
    description: 'Search for games',
  },
  gameSearch: {
    command: 'igdb-game-search',
    usage: '`/igdb-game-search [QUERY]`',
    description: 'Search for games using poster previews',
  },
};
