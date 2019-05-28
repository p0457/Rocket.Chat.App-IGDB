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

export async function getMetadata(searchResults, key: string, scope: string, resultField: string, resultProperty: string, http: IHttp, fieldsOverride?, filterOverride?) {
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

        let filter = 'id';
        if (filterOverride) {
          filter = filterOverride;
        }
        const response = await http.post('https://api-v3.igdb.com/' + scope, setRequest(key, fields + ';where ' + filter + '=(' + tempIds.join(',') + ');'));
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
            console.log('Failed to get covers for multiple games', e);
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
        // FEEDS
        if (options.getFeeds) {
          const daysBack = 60;
          const earliest = new Date();
          earliest.setDate(earliest.getDate() - daysBack);
          const earliestSinceEpoch = ((earliest.getTime() - earliest.getMilliseconds()) / 1000);

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

              // tslint:disable-next-line:max-line-length
              const feedsResponse = await http.post('https://api-v3.igdb.com/feeds', setRequest(key, 'fields *;where games=(' + ids.join(',') + ') & updated_at > ' + earliestSinceEpoch + ';'));
              let feedsResponseResult = new Array();
              if (feedsResponse && feedsResponse.content) {
                feedsResponseResult = JSON.parse(feedsResponse.content);
              }

              if (feedsResponseResult && Array.isArray(feedsResponseResult)) {
                searchResults.forEach(async (searchResult) => {
                  try {
                    const feedsForGame = feedsResponseResult.filter((feed) => {
                      if (feed.games && Array.isArray(feed.games)) {
                        return feed.games.includes(searchResult.id);
                      } else {
                        return false;
                      }
                    });
                    if (feedsForGame) {
                      feedsForGame.forEach((feed) => {
                        let categoryDisplay = '';
                        if (feed.category === 1) {
                          categoryDisplay = 'Pulse Article';
                        } else if (feed.category === 2) {
                          categoryDisplay = 'Coming Soon';
                        } else if (feed.category === 3) {
                          categoryDisplay = 'New Trailer';
                        } else if (feed.category === 5) {
                          categoryDisplay = 'User Contributed Item';
                        } else if (feed.category === 6) {
                          categoryDisplay = 'User Contributions Item';
                        } else if (feed.category === 7) {
                          categoryDisplay = 'Page Contributed Item';
                        }
                        feed.categoryDisplay = categoryDisplay;
                        // Set date time in readable format
                        const readableUpdatedDate = new Date(0); // The 0 there is the key, which sets the date to the epoch
                        readableUpdatedDate.setUTCSeconds(feed.updated_at);
                        feed.updatedDateDisplay = readableUpdatedDate;
                      });
                      feedsForGame.sort((feed) => {
                        return feed.updated_at;
                      });
                      searchResult.feedsDisplay = feedsForGame;
                    }
                  } catch (e) {
                    console.log('Failed to get feeds for game id ' + searchResult.id, e);
                  }
                });
              }
            }
          } catch (e) {
            console.log('Failed to get feeds for multiple games', e);
          }
        }
        // PULSES
        if (options.getPulses) {
          const daysBack = 60;
          const earliest = new Date();
          earliest.setDate(earliest.getDate() - daysBack);
          const earliestSinceEpoch = ((earliest.getTime() - earliest.getMilliseconds()) / 1000);

          // First get pulse groups
          let pulseIds = new Array();
          let pulseGroups = new Array();
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

              // tslint:disable-next-line:max-line-length
              const pulseGroupsResponse = await http.post('https://api-v3.igdb.com/pulse_groups', setRequest(key, 'fields *;where game=(' + ids.join(',') + ') & updated_at > ' + earliestSinceEpoch + ';'));
              let pulseGroupsResponseResult = new Array();
              if (pulseGroupsResponse && pulseGroupsResponse.content) {
                pulseGroupsResponseResult = JSON.parse(pulseGroupsResponse.content);
              }

              if (pulseGroupsResponseResult && Array.isArray(pulseGroupsResponseResult) && pulseGroupsResponseResult.length > 0) {
                pulseGroupsResponseResult.forEach((pulseGroup) => {
                  pulseIds = pulseIds.concat(pulseGroup.pulses);
                  pulseGroups = pulseGroups.concat(pulseGroup);
                });
              }
            }
          } catch (e) {
            console.log('Failed to get pulse groups for multiple games', e);
          }
          pulseIds = [...new Set(pulseIds)]; // Make unique
          pulseGroups = [...new Set(pulseGroups)]; // Make unique

          // Now to get the pulses
          let pulses = new Array();
          try {
            let maxIterations = 1;
            if (pulseIds.length > 10) {
              maxIterations = Math.floor(pulseIds.length / 10);
            }
            for (let x = 0; x < maxIterations; x++) { // For each iteration
              const j = (10 * x); // 0, 10, 20, ...
              const tempIds = new Array(); // Holds ids in iteration, max of 10
              for (let y = 0; y < 9; y++) {
                if (pulseIds[j + y]) {
                  tempIds[y] = pulseIds[j + y];
                }
              }

              if (tempIds.length > 0) {
                // tslint:disable-next-line:max-line-length
                const pulsesResponse = await http.post('https://api-v3.igdb.com/pulses', setRequest(key, 'fields *;where id=(' + tempIds.join(',') + ');'));
                let pulsesResponseResult = new Array();
                if (pulsesResponse && pulsesResponse.content) {
                  pulsesResponseResult = JSON.parse(pulsesResponse.content);
                }

                if (pulsesResponseResult && Array.isArray(pulsesResponseResult) && pulsesResponseResult.length > 0) {
                  pulsesResponseResult.forEach((pulse) => {
                    const pulseGroupGameForPulse = pulseGroups.find((pulseGroup) => {
                      return pulseGroup.pulses.includes(pulse.id);
                    });
                    pulse.group = pulseGroupGameForPulse;
                    pulses.push(pulse);
                  });
                }

                pulses = pulses.concat(pulsesResponseResult);
              }
            }
          } catch (e) {
            console.log('Failed to get pulses for multiple games', e);
          }
          pulses = [...new Set(pulses)]; // Make unique

          // Now to get pulse url
          const pulseUrlIds = pulses.map((pulse) => {
            return pulse.website;
          });
          try {
            let maxIterations = 1;
            if (pulseUrlIds.length > 10) {
              maxIterations = Math.floor(pulseUrlIds.length / 10);
            }
            for (let x = 0; x < maxIterations; x++) { // For each iteration
              const j = (10 * x); // 0, 10, 20, ...
              const tempIds = new Array(); // Holds ids in iteration, max of 10
              for (let y = 0; y < 9; y++) {
                if (pulseUrlIds[j + y]) {
                  tempIds[y] = pulseUrlIds[j + y];
                }
              }

              if (tempIds.length > 0) {
                // tslint:disable-next-line:max-line-length
                const pulsesUrlResponse = await http.post('https://api-v3.igdb.com/pulse_urls', setRequest(key, 'fields *;where id=(' + tempIds.join(',') + ');'));
                let pulsesUrlResponseResult = new Array();
                if (pulsesUrlResponse && pulsesUrlResponse.content) {
                  pulsesUrlResponseResult = JSON.parse(pulsesUrlResponse.content);
                }

                if (pulsesUrlResponseResult && Array.isArray(pulsesUrlResponseResult) && pulsesUrlResponseResult.length > 0) {
                  pulses.forEach((pulse) => {
                    const pulseUrlForPulse = pulsesUrlResponseResult.find((pulseUrl) => {
                      return pulseUrl.id === pulse.website;
                    });
                    if (pulseUrlForPulse) {
                      pulse.urlDisplay = pulseUrlForPulse;
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.log('Failed to get pulse urls for multiple games', e);
          }

          // Now to get pulse source
          const pulseSourceIds = pulses.map((pulse) => {
            return pulse.pulse_source;
          });
          try {
            let maxIterations = 1;
            if (pulseSourceIds.length > 10) {
              maxIterations = Math.floor(pulseSourceIds.length / 10);
            }
            for (let x = 0; x < maxIterations; x++) { // For each iteration
              const j = (10 * x); // 0, 10, 20, ...
              const tempIds = new Array(); // Holds ids in iteration, max of 10
              for (let y = 0; y < 9; y++) {
                if (pulseSourceIds[j + y]) {
                  tempIds[y] = pulseSourceIds[j + y];
                }
              }

              if (tempIds.length > 0) {
                // tslint:disable-next-line:max-line-length
                const pulsesSourceResponse = await http.post('https://api-v3.igdb.com/pulse_sources', setRequest(key, 'fields *;where id=(' + tempIds.join(',') + ');'));
                let pulsesSourceResponseResult = new Array();
                if (pulsesSourceResponse && pulsesSourceResponse.content) {
                  pulsesSourceResponseResult = JSON.parse(pulsesSourceResponse.content);
                }

                if (pulsesSourceResponseResult && Array.isArray(pulsesSourceResponseResult) && pulsesSourceResponseResult.length > 0) {
                  pulses.forEach((pulse) => {
                    const pulseSourceForPulse = pulsesSourceResponseResult.find((pulseSource) => {
                      return pulseSource.id === pulse.pulse_source;
                    });
                    if (pulseSourceForPulse) {
                      pulse.sourceDisplay = pulseSourceForPulse;
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.log('Failed to get pulse sources for multiple games', e);
          }

          pulses.forEach((pulse) => {
            // Set date time in readable format
            const readableUpdatedDate = new Date(0); // The 0 there is the key, which sets the date to the epoch
            readableUpdatedDate.setUTCSeconds(pulse.updated_at);
            pulse.updatedDateDisplay = readableUpdatedDate;
          });

          searchResults.forEach((searchResult) => {
            const pulsesForGame = pulses.filter((pulse) => {
              return pulse.group.game === searchResult.id;
            });
            pulsesForGame.sort((pulse) => {
              return pulse.updated_at;
            });
            if (pulsesForGame) {
              searchResult.pulsesDisplay = pulsesForGame;
            }
          });
        }
        // TIMES TO BEAT
        if (options.getTimeToBeat) {
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

              // tslint:disable-next-line:max-line-length
              const timeToBeatResponse = await http.post('https://api-v3.igdb.com/time_to_beats', setRequest(key, 'fields *;where game=(' + tempIds.join(',') + ');'));
              let timeToBeatResponseResult = new Array();
              if (timeToBeatResponse && timeToBeatResponse.content) {
                timeToBeatResponseResult = JSON.parse(timeToBeatResponse.content);
              }

              console.log('****timeToBeatResponseResult', timeToBeatResponseResult);
              if (timeToBeatResponseResult && Array.isArray(timeToBeatResponseResult) && timeToBeatResponseResult.length > 0) {
                searchResults.forEach(async (searchResult) => {
                  try {
                    const timeToBeatForGame = timeToBeatResponseResult.filter((timeToBeat) => {
                      return timeToBeat.game === searchResult.id;
                    });
                    if (timeToBeatForGame) {
                      timeToBeatForGame.forEach((timeToBeat) => {
                        if (timeToBeat.normally && !isNaN(timeToBeat.normally)) {
                          timeToBeat.normallyDisplay = (timeToBeat.normally / 60 / 60).toFixed(1); // Seconds to hours
                        }
                        if (timeToBeat.hastly && !isNaN(timeToBeat.hastly)) {
                          timeToBeat.hastlyDisplay = (timeToBeat.hastly / 60 / 60).toFixed(1); // Seconds to hours
                        }
                      });
                      searchResult.timeToBeatDisplay = timeToBeatForGame;
                    }
                  } catch (e) {
                    console.log('Failed to get times to beat for game id ' + searchResult.id, e);
                  }
                });
              }
            }
          } catch (e) {
            console.log('Failed to get times to beat for multiple games', e);
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
