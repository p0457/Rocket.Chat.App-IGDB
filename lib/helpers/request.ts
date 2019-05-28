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

export function createImageUrl(imageId, size) {
  if (!size.startsWith('t_')) {
    size = 't_' + size;
  }
  return 'https://images.igdb.com/igdb/image/upload/' + size + '/' + imageId + '.jpg';
}

export function createVideoUrl(videoId) {
  return 'https://www.youtube.com/watch?v=' + videoId;
}

export async function getRelatedGames(searchResults, searchResultField: string, key: string, http: IHttp) {
  let gameIds = new Array();
  searchResults.forEach((searchResult) => {
    if (searchResult[searchResultField] && Array.isArray(searchResult[searchResultField])) {
      searchResult[searchResultField].forEach((listItem) => {
        if (typeof listItem === 'string' || !isNaN(listItem)) { // Assume id is given
          gameIds.push(listItem);
        } else if (listItem !== undefined && listItem.id) { // Assume object
          gameIds.push(listItem.id);
        }
      });
    } else {
      searchResult[searchResultField] = new Array();
    }
  });

  if (gameIds.length > 0) {
    gameIds = [...new Set(gameIds)]; // Make unique

    try {
      let maxIterations = 1;
      if (gameIds.length > 10) {
        maxIterations = Math.floor(gameIds.length / 10);
      }
      for (let x = 0; x < maxIterations; x++) { // For each iteration
        const j = (10 * x); // 0, 10, 20, ...
        const tempIds = new Array(); // Holds ids in iteration, max of 10
        for (let y = 0; y < 9; y++) {
          if (gameIds[j + y]) {
            tempIds[y] = gameIds[j + y];
          }
        }

        const coverResponse = await http.post('https://api-v3.igdb.com/covers', setRequest(key, 'fields *;where game=(' + tempIds.join(',') + ');'));
        let coverResponseResult = new Array();
        if (coverResponse && coverResponse.content) {
          coverResponseResult = JSON.parse(coverResponse.content);
        }

        searchResults.forEach(async (searchResult) => {
          if (searchResult[searchResultField] && Array.isArray(searchResult[searchResultField]) && searchResult[searchResultField].length > 0) {
            searchResult[searchResultField].forEach((listItem) => {
              try {
                const thumbForGame = coverResponseResult.find((cover) => {
                  if (typeof listItem === 'string' || !isNaN(listItem)) {
                    return cover.game === listItem;
                  } else if (listItem.id) {
                    return cover.game === listItem.id;
                  } else {
                    return false;
                  }
                });
                if (thumbForGame) {
                  const size = 't_logo_med';
                  listItem.thumbUrl = createImageUrl(thumbForGame.image_id, size);
                }
              } catch (e) {
                console.log('Failed to get thumbnail for game id ' + searchResult.id, e);
              }
            });
          } else {
            searchResult[searchResultField] = new Array();
          }
        });
      }
    } catch (e) {
      console.log('Failed to get metadata for multiple games', e);
    }
  }
}

export async function getGames(key: string, query: string, options, http: IHttp, read: IRead, modify: IModify, user: IUser, room: IRoom) {
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
          try {
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

              const coverResponse = await http.post('https://api-v3.igdb.com/covers', setRequest(key, 'fields *;where game=(' + tempIds.join(',') + ');'));
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
                    const size = 'logo_med';
                    searchResult.thumbUrl = createImageUrl(thumbForGame.image_id, size);
                  }
                } catch (e) {
                  console.log('Failed to get thumbnail for game id ' + searchResult.id, e);
                }
              });
            }
          } catch (e) {
            console.log('Failed to get metadata for multiple games', e);
          }
        }
        // PLATFORMS
        if (options.getPlatforms) {
          await getMetadata(searchResults, key, 'platforms', 'platforms', 'platformsDisplay', http);
        }
        // GENRES
        if (options.getGenres) {
          await getMetadata(searchResults, key, 'genres', 'genres', 'genresDisplay', http);
        }
        // GAME MODES
        if (options.getGameModes) {
          await getMetadata(searchResults, key, 'game_modes', 'game_modes', 'gameModesDisplay', http);
        }
        // COMPANIES
        if (options.getCompanies) {
          await getMetadata(searchResults, key, 'companies', 'involved_companies', 'companiesDisplay', http, 'name,url');
        }
        // GAME ENGINES
        if (options.getGameEngines) {
          await getMetadata(searchResults, key, 'game_engines', 'game_engines', 'gameEnginesDisplay', http, 'name,url');
        }
        // PLAYER PERSPECTIVES
        if (options.getPlayerPerspectives) {
          await getMetadata(searchResults, key, 'player_perspectives', 'player_perspectives', 'playerPerspectivesDisplay', http);
        }
        // THEMES
        if (options.getThemes) {
          await getMetadata(searchResults, key, 'themes', 'themes', 'themesDisplay', http);
        }
        // WEBSITES
        if (options.getWebsites) {
          await getMetadata(searchResults, key, 'websites', 'websites', 'websitesDisplay', http, 'trusted,url');
        }
        // FRANCHISES
        if (options.getFranchises) {
          await getMetadata(searchResults, key, 'franchises', 'franchises', 'franchisesDisplay', http);
        }
        // ALTERNATIVE NAMES
        if (options.getAlternativeNames) {
          await getMetadata(searchResults, key, 'alternative_names', 'alternative_names', 'alternativeNamesDisplay', http, 'name,comment');
        }
        // KEYWORDS
        if (options.getKeywords) {
          await getMetadata(searchResults, key, 'keywords', 'keywords', 'keywordsDisplay', http);
        }
        // MULTIPLAYER MODES
        if (options.getMultiplayerModes) {
          await getMetadata(searchResults, key, 'multiplayer_modes', 'multiplayer_modes', 'multiplayerModesDisplay', http, '*');
          let multiplayerModePlatformIds = new Array();
          searchResults.forEach((searchResult) => {
            if (searchResult.multiplayerModesDisplay && Array.isArray(searchResult.multiplayerModesDisplay)) {
              searchResult.multiplayerModesDisplay.forEach((multiplayerMode) => {
                multiplayerModePlatformIds.push(multiplayerMode.platform);
              });
            }
          });

          if (multiplayerModePlatformIds.length > 0) {
            multiplayerModePlatformIds = [...new Set(multiplayerModePlatformIds)]; // Make unique

            try {
              let maxIterations = 1;
              if (multiplayerModePlatformIds.length > 10) {
                maxIterations = Math.floor(multiplayerModePlatformIds.length / 10);
              }
              for (let x = 0; x < maxIterations; x++) { // For each iteration
                const j = (10 * x); // 0, 10, 20, ...
                const tempIds = new Array(); // Holds ids in iteration, max of 10
                for (let y = 0; y < 9; y++) {
                  if (multiplayerModePlatformIds[j + y]) {
                    tempIds.push(multiplayerModePlatformIds[j + y]);
                  }
                }

                // tslint:disable-next-line:max-line-length
                const platformsResponse = await http.post('https://api-v3.igdb.com/platforms', setRequest(key, 'fields *;where id=(' + tempIds.join(',') + ');'));
                let platformsResponseResult = new Array();
                if (platformsResponse && platformsResponse.content) {
                  platformsResponseResult = JSON.parse(platformsResponse.content);
                }

                searchResults.forEach(async (searchResult) => {
                  // tslint:disable-next-line:max-line-length
                  if (searchResult.multiplayerModesDisplay && Array.isArray(searchResult.multiplayerModesDisplay) && searchResult.multiplayerModesDisplay.length > 0) {
                    searchResult.multiplayerModesDisplay.forEach((multiplayerMode) => {
                      try {
                        const platformDisplayForMultiplayerMode = platformsResponseResult.find((platform) => {
                          return platform.id === multiplayerMode.platform;
                        });
                        if (platformDisplayForMultiplayerMode) {
                          multiplayerMode.platformDisplay = platformDisplayForMultiplayerMode.name;
                        }
                      } catch (e) {
                        console.log('Failed to get platform for a multiplayer mode for game id ' + searchResult.id, e);
                      }
                    });
                  } else {
                    searchResult.multiplayerModesDisplay = new Array();
                  }
                });
              }
            } catch (e) {
              console.log('Failed to get metadata for multiple games', e);
            }
          }
        }
        // RELEASE DATES
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
        // ARTWORKS
        if (options.getArtworks) {
          await getMetadata(searchResults, key, 'artworks', 'artworks', 'artworksDisplay', http, 'image_id');
          try {
            searchResults.forEach((searchResult) => {
              searchResult.artworksDisplay.forEach((artwork) => {
                const size = 'screenshot_huge';
                artwork.url = createImageUrl(artwork.image_id, size);
              });
            });
          } catch (e) {
            console.log('Failed to get artworks for one or more games', e);
          }
        }
        // BUNDLES
        if (options.getBundles) {
          await getMetadata(searchResults, key, 'games', 'bundles', 'bundlesDisplay', http, 'name,slug');
          await getRelatedGames(searchResults, 'bundlesDisplay', key, http);
        }
        // EXPANSIONS
        if (options.getExpansions) {
          await getMetadata(searchResults, key, 'games', 'expansions', 'expansionsDisplay', http, 'name,slug');
          await getRelatedGames(searchResults, 'expansionsDisplay', key, http);
        }
        // SIMILAR GAMES
        if (options.getSimilar) {
          await getMetadata(searchResults, key, 'games', 'similar_games', 'similarDisplay', http, 'name,slug');
          await getRelatedGames(searchResults, 'similarDisplay', key, http);
        }
        // DLCS
        if (options.getDlcs) {
          await getMetadata(searchResults, key, 'games', 'dlcs', 'dlcsDisplay', http, 'name,slug');
          await getRelatedGames(searchResults, 'dlcsDisplay', key, http);
        }
        // SCREENSHOTS
        if (options.getScreenshots) {
          await getMetadata(searchResults, key, 'screenshots', 'screenshots', 'screenshotsDisplay', http, 'image_id');
          try {
            searchResults.forEach((searchResult) => {
              searchResult.screenshotsDisplay.forEach((screenshot) => {
                const size = 'screenshot_huge';
                screenshot.url = createImageUrl(screenshot.image_id, size);
              });
            });
          } catch (e) {
            console.log('Failed to get artworks for one or more games', e);
          }
        }
        // VIDEOS
        if (options.getVideos) {
          await getMetadata(searchResults, key, 'game_videos', 'videos', 'videosDisplay', http, 'video_id');
          try {
            searchResults.forEach((searchResult) => {
              searchResult.videosDisplay.forEach((video) => {
                video.url = createVideoUrl(video.video_id);
              });
            });
          } catch (e) {
            console.log('Failed to get videos for one or more games', e);
          }
        }
      }
      await sendGamesResults(searchResults, {
        simple: options.simple,
        resultsText: options.resultsText,
      }, read, modify, user, room);
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
