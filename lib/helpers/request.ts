import { IHttp, IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { sendBadApiKey, sendGamesResults, sendNotification, sendNotificationSingleAttachment } from './messageHelper';

export function setRequest(key, query) {
  return {
    headers: {
      'user-key': key,
      'Accept': '*/*',
      'User-Agent': 'Rocket.Chat App',
    },
    content: query,
  };
}

export async function getMetadata(searchResults, key: string, scope: string, resultField: string, resultProperty: string, http: IHttp, fieldsOverride?) {
  let ids = new Array();
  searchResults.forEach(async (searchResult) => {
    if (searchResult[resultField]) {
      ids = ids.concat(searchResult[resultField]);
    }
  });
  ids = [...new Set(ids)]; // Make unique
  if (ids.length > 0) {
    // tslint:disable-next-line:max-line-length
    let fields = 'fields name';
    if (fieldsOverride) {
      fields = 'fields ' + fieldsOverride;
    }
    try {
      // TODO: Fix this mess (make sure it works with release dates
      let maxIterations = 1;
      if (ids.length > 10) {
        maxIterations = Math.floor(ids.length / 10);
      }
      for (let x = 0; x < maxIterations; x++) { // For each iteration
        const j = (10 * x); // 0, 10, 20, ...
        const tempIds = new Array(); // Holds ids in iteration, max of 10
        for (let y = 0; y < 9; y++) {
          if (ids[j + y]) {
            tempIds[y] = ids[j + y];
          }
        }

        const response = await http.post('https://api-v3.igdb.com/' + scope, setRequest(key, fields + ';where id=(' + tempIds.join(',') + ');'));
        let responseResult = new Array();
        if (response && response.content) {
          responseResult = JSON.parse(response.content);
        }
        searchResults.forEach(async (searchResult) => {
          try {
            const metaForGame = new Array();
            responseResult.forEach((result) => {
              if (searchResult[resultField].includes(result.id)) {
                metaForGame.push(result);
              }
            });
            if (metaForGame) {
              searchResult[resultProperty] = metaForGame;
            }
          } catch (e) {
            console.log('Failed to get ' + scope + ' for game id ' + searchResult.id, e);
          }
        });
      }
    } catch (e) {
      console.log('Failed to get ' + scope + ' for multiple games', e);
    }
  }
}

export async function getGames(key, query, options, http: IHttp, read: IRead, modify: IModify, user: IUser, room: IRoom) {
  const url = 'https://api-v3.igdb.com/games';

  const response = await http.post(url, setRequest(key, query));

  if (!response || !response.content || response.statusCode === 500) {
    await sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e10000',
      title: {
        value: 'Failed to get a response!',
      },
      text: 'Please try again.',
    }, read, modify, user, room);
  }

  if (response.statusCode === 401) {
    await sendBadApiKey(read, modify, user, room);
    return;
  }

  try {
    const searchResults = JSON.parse(response.content || '');
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      const ids = searchResults.map((searchResult) => {
        return searchResult.id;
      });
      if (options) {
        // COVERS
        if (options.getCovers) {
          const coverResponse = await http.post('https://api-v3.igdb.com/covers', setRequest(key, 'fields *;where game=(' + ids.join(',') + ');'));
          let coverResponseResult = new Array();
          if (coverResponse && coverResponse.content) {
            coverResponseResult = JSON.parse(coverResponse.content);
          }

          searchResults.forEach(async (searchResult) => {
            try {
              const thumbForGame = coverResponseResult.find((cover) => {
                return cover.game === searchResult.id;
              });
              if (thumbForGame) {
                searchResult.thumbUrl = 'https:' + thumbForGame.url;
              }
            } catch (e) {
              console.log('Failed to get thumbnail for game id ' + searchResult.id, e);
            }
          });
        }
        if (options.getPlatforms) {
          await getMetadata(searchResults, key, 'platforms', 'platforms', 'platformsDisplay', http);
        }
        if (options.getGenres) {
          await getMetadata(searchResults, key, 'genres', 'genres', 'genresDisplay', http);
        }
        if (options.getGameModes) {
          await getMetadata(searchResults, key, 'game_modes', 'game_modes', 'gameModesDisplay', http);
        }
        if (options.getCompanies) {
          await getMetadata(searchResults, key, 'companies', 'involved_companies', 'companiesDisplay', http, 'name,url');
        }
        if (options.getGameEngines) {
          await getMetadata(searchResults, key, 'game_engines', 'game_engines', 'gameEnginesDisplay', http, 'name,url');
        }
        if (options.getPlayerPerspectives) {
          await getMetadata(searchResults, key, 'player_perspectives', 'player_perspectives', 'playerPerspectivesDisplay', http);
        }
        if (options.getThemes) {
          await getMetadata(searchResults, key, 'themes', 'themes', 'themesDisplay', http);
        }
        if (options.getWebsites) {
          await getMetadata(searchResults, key, 'websites', 'websites', 'websitesDisplay', http, 'trusted,url');
        }
        if (options.getFranchises) {
          await getMetadata(searchResults, key, 'franchises', 'franchises', 'franchisesDisplay', http);
        }
        if (options.getAlternativeNames) {
          await getMetadata(searchResults, key, 'alternative_names', 'alternative_names', 'alternativeNamesDisplay', http, 'name,comment');
        }
        if (options.getKeywords) {
          await getMetadata(searchResults, key, 'keywords', 'keywords', 'keywordsDisplay', http);
        }
        if (options.getReleaseDates) {
          await getMetadata(searchResults, key, 'release_dates', 'release_dates', 'releaseDatesDisplay', http, 'platform,human');

          try {
            let releaseDates = new Array();
            searchResults.forEach((searchResult) => {
              releaseDates = releaseDates.concat(searchResult.releaseDatesDisplay);
            });
            releaseDates = [...new Set(releaseDates)]; // Make unique
            const releaseDatePlatforms = new Array();
            releaseDates.forEach((releaseDate) => {
              releaseDatePlatforms.push(releaseDate.platform);
            });
            let maxIterations = 1;
            if (releaseDatePlatforms.length > 10) {
              maxIterations = Math.floor(releaseDatePlatforms.length / 10);
            }
            for (let x = 0; x < maxIterations; x++) {
              const j = (10 * x); // 0, 10, 20, ...
              const releaseDatePlatformsTemp = new Array();
              for (let y = 0; y < 10; y++) {
                if (releaseDatePlatforms[j + y]) {
                  releaseDatePlatformsTemp[y] = releaseDatePlatforms[j + y];
                }
              }

              // tslint:disable-next-line:max-line-length
              const platformsResponse = await http.post('https://api-v3.igdb.com/platforms',
                setRequest(key, 'fields name;where id=(' + releaseDatePlatformsTemp.join(',') + ');'));
              let platformsResponseResult = new Array();
              if (platformsResponse && platformsResponse.content) {
                platformsResponseResult = JSON.parse(platformsResponse.content);
              }
              searchResults.forEach(async (searchResult) => {
                try {
                  searchResult.releaseDatesDisplay.forEach((releaseDate) => {
                    platformsResponseResult.forEach((platformResponseResult) => {
                      if (platformResponseResult.id === releaseDate.platform) {
                        releaseDate.platformDisplay = platformResponseResult.name;
                      }
                    });
                  });
                } catch (e) {
                  console.log('Failed to get release date platform for game id ' + searchResult.id, e);
                }
              });
            }
          } catch (e) {
            console.log('Failed to get release date platform for one or more games', e);
          }
        }
      }
      await sendGamesResults(searchResults, read, modify, user, room);
    } else {
      await sendNotification('No results!', read, modify, user, room);
    }
  } catch (e) {
    console.log('Failed to parse response.', e);
    await sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e10000',
      title: {
        value: 'Failed to parse response!',
      },
      text: 'Please try again.',
    }, read, modify, user, room);
  }
}
