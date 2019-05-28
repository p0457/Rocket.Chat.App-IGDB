import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAction, IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { AppPersistence } from '../persistence';

export async function sendNotification(text: string, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('igdb_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('igdb_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      text,
      groupable: false,
      alias: username,
      avatarUrl: icon,
  }).getMessage());
}

export async function sendNotificationSingleAttachment(attachment: IMessageAttachment, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('igdb_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('igdb_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      groupable: false,
      alias: username,
      avatarUrl: icon,
      attachments: [attachment],
  }).getMessage());
}

export async function sendNotificationMultipleAttachments(attachments: Array<IMessageAttachment>, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('igdb_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('igdb_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      groupable: false,
      alias: username,
      avatarUrl: icon,
      attachments,
  }).getMessage());
}

export async function sendBadApiKey(read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  await sendNotificationSingleAttachment({
    collapsed: false,
    color: '#e10000',
    title: {
      value: 'No API Key!',
    },
    text: 'Please set the API Key in the App Settings.',
  }, read, modify, user, room);
}

export function prepMetaDisplay(result, fields, scope, title, options?) {
  if (result[scope]) {
    let text = '';
    if (Array.isArray(result[scope])) { // Assume array of objects
      result[scope].forEach((resultItem) => {
        if (options && options.multiplayerModes) {
          const multiplayerMode = resultItem;
          const platformName = multiplayerMode.platformDisplay ? multiplayerMode.platformDisplay : 'Default';
          text += '*[' + platformName + ']*\n';
          if (multiplayerMode.campaigncoop) {
            text += 'Campaign Co-op';
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
          if (multiplayerMode.dropin) {
            text += 'Drop-in';
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
          if (multiplayerMode.lancoop) {
            text += 'LAN Co-op';
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          } else if (multiplayerMode.offlinecoop) {
            text += 'Offline Co-op';
            if (multiplayerMode.offlinecoopmax) {
              text += ' (max ' + multiplayerMode.offlinecoopmax + ')';
            }
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
          if (multiplayerMode.onlinecoop) {
            text += 'Online Co-op';
            if (multiplayerMode.onlinecoopmax) {
              text += ' (max ' + multiplayerMode.onlinecoopmax + ')';
            }
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
          if (multiplayerMode.onlinemax) {
            text += 'Online Max ' + multiplayerMode.onlinemax;
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
          if (multiplayerMode.offlinemax) {
            text += 'Offline Max ' + multiplayerMode.offlinemax;
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
          if (multiplayerMode.splitscreen) {
            text += 'Split-Screen';
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
          if (text.endsWith(', ')) {
            text = text.substring(0, text.length - 2); // Remove last ', '
          }
          text += '\n'; // To split for each platform
        } else if (options && options.timeToBeat) {
          if (resultItem.normallyDisplay) {
            text += '*Normally *' + resultItem.normallyDisplay + ' hours';
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
          if (resultItem.hastlyDisplay) {
            text += '*Hastily *' + resultItem.hastlyDisplay + ' hours';
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
        } else {
          if (typeof resultItem === 'string' || !isNaN(result[scope])) { // Assumed simple string
            text += resultItem;
          } else { // Assumed object
            text += resultItem.name;
            if (resultItem.comment && (!options || !options.comment)) {
              text += ' _(' + resultItem.comment + ')_';
            }
            if (resultItem.url && (!options || !options.url)) {
              if (resultItem.url.indexOf('_') !== -1) {
                text += ' (' + resultItem.url + ')';
              } else {
                text += ' _(' + resultItem.url + ')_';
              }
            }
            if (options && options.list === true) {
              text += ' \n';
            } else {
              text += ', ';
            }
          }
        }
      });

      if (options && options.multiplayerModes) {
        result[scope].sort((multiplayerMode) => {
          return multiplayerMode.platformDisplay === 'Default';
        });
      }

      if (text.endsWith(', ')) {
        text = text.substring(0, text.length - 2); // Remove last ', '
      } else if (text.endsWith('\n')) {
        text = text.substring(0, text.length - 1); // Remove last '\n'
      }
    } else if (typeof result[scope] === 'string' || !isNaN(result[scope])) { // Assumed simple string
      text += result[scope];
    } else { // Assumbed single object
      if (result[scope].name) {
        text += result[scope].name;
      }
      if (result[scope].comment && (!options || !options.comment)) {
        text += ' _(' + result[scope].comment + ')_ ';
      }
      if (result[scope].url && (!options || !options.url)) {
        if (result[scope].url.indexOf('_') !== -1) {
          text += ' (' + result[scope].url + ') ';
        } else {
          text += ' _(' + result[scope].url + ')_ ';
        }
      }
    }
    fields.push({
      short: (options && options.short === false) ? false : true,
      title,
      value: text,
    });
  } else {
    return;
  }
}

export async function sendGamesResults(results, options, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  let resultsText = 'Results';
  if (options && options.resultsText) {
    resultsText = options.resultsText;
  }
  if (results && results.length > 1) {
    attachments.push({
      collapsed: false,
      color: '#00CE00',
      title: {
        value: resultsText + ' (' + results.length + ')',
      },
    });
  }

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < results.length; x++) {
    const result = results[x];

    let text = '';

    const fields = new Array();

    prepMetaDisplay(result, fields, 'id', 'Id', { url: false });

    if (result.slug) {
      prepMetaDisplay(result, fields, 'slug', 'Slug', { url: false });
    }

    prepMetaDisplay(result, fields, 'franchisesDisplay', 'Franchise(s)');
    prepMetaDisplay(result, fields, 'genresDisplay', 'Genres', { list: true });
    prepMetaDisplay(result, fields, 'gameModesDisplay', 'Game Modes', { list: true });
    prepMetaDisplay(result, fields, 'multiplayerModesDisplay', 'Multiplayer Modes', { list: false, multiplayerModes: true });
    prepMetaDisplay(result, fields, 'playerPerspectivesDisplay', 'Player Perspectives', { list: true });
    console.log('****timetobeatdisplay', result.timeToBeatDisplay);
    prepMetaDisplay(result, fields, 'timeToBeatDisplay', 'Time to Beat', { url: false, short: false, list: false, timeToBeat: true });
    prepMetaDisplay(result, fields, 'alternativeNamesDisplay', 'Alternative Names', { url: false, short: false, list: true });
    prepMetaDisplay(result, fields, 'themesDisplay', 'Themes', { short: false });
    prepMetaDisplay(result, fields, 'gameEnginesDisplay', 'Game Engines', { short: false });
    prepMetaDisplay(result, fields, 'companiesDisplay', 'Companies', { short: false, list: true });
    prepMetaDisplay(result, fields, 'platformsDisplay', 'Platforms', { short: false, list: true });
    prepMetaDisplay(result, fields, 'keywordsDisplay', 'Keywords', { url: false, short: false });

    if (result.rating && result.rating_count) {
      let ratingText = '\n*Rating: *' + result.rating + ' _(of ' + result.rating_count + ')_ ';
      if (result.aggregated_rating && result.aggregated_rating_count) {
        ratingText += '*Aggregate: *' + result.aggregated_rating + ' _(of ' + result.aggregated_rating_count + ')_ ';
      }
      if (result.total_rating && result.total_rating_count) {
        ratingText += '*Total: *' + result.total_rating + ' _(of ' + result.total_rating_count + ')_ ';
      }
      text += ratingText;
    }

    if (result.releaseDatesDisplay) {
      text += '\n*Release Dates: *\n';
      result.releaseDatesDisplay.forEach((releaseDate) => {
        text += '--';
        if (releaseDate.platformDisplay) {
          text += '*' + releaseDate.platformDisplay + ': *';
        }
        text += releaseDate.human + '\n';
      });
      text = text.substring(0, text.length - 1); // Remove last '\n'
    }

    if (!options || !options.simple) {
      text += '\n*Similar Games: *';
      if (result.similar_games && Array.isArray(result.similar_games)) {
        text += result.similar_games.length;
        if (result.similar_games.length > 0) {
          text += ' _(to see results, run `/igdb game ' + result.id + ' similar` or `/igdb game ' + result.slug + ' similar`)_';
        }
      } else {
        text += '0';
      }

      text += '\n*Bundles: *';
      if (result.bundles && Array.isArray(result.bundles)) {
        text += result.bundles.length;
        if (result.bundles.length > 0) {
          text += ' _(to see results, run `/igdb game ' + result.id + ' bundles` or `/igdb game ' + result.slug + ' bundles`)_';
        }
      } else {
        text += '0';
      }

      text += '\n*Expansions: *';
      if (result.expansions && Array.isArray(result.expansions)) {
        text += result.expansions.length;
        if (result.expansions.length > 0) {
          text += ' _(to see results, run `/igdb game ' + result.id + ' expansions` or `/igdb game ' + result.slug + ' expansions`)_';
        }
      } else {
        text += '0';
      }

      text += '\n*DLCs: *';
      if (result.dlc && Array.isArray(result.dlc)) {
        text += result.dlc.length;
        if (result.dlc.length > 0) {
          text += ' _(to see results, run `/igdb game ' + result.id + ' dlc` or `/igdb game ' + result.slug + ' dlc`)_';
        }
      } else {
        text += '0';
      }

      if (result.feedsDisplay) {
        text += '\n*Feeds: *';
        if (result.feedsDisplay && Array.isArray(result.feedsDisplay)) {
          text += result.feedsDisplay.length;
          if (result.feedsDisplay.length > 0) {
            text += ' _(to see results, run `/igdb game ' + result.id + ' feeds` or `/igdb game ' + result.slug + ' feeds`)_';
          }
        } else {
          text += '0';
        }
      }

      if (result.pulsesDisplay) {
        text += '\n*Pulses: *';
        if (result.pulsesDisplay && Array.isArray(result.pulsesDisplay)) {
          text += result.pulsesDisplay.length;
          if (result.pulsesDisplay.length > 0) {
            text += ' _(to see results, run `/igdb game ' + result.id + ' pulses` or `/igdb game ' + result.slug + ' pulses`)_';
          }
        } else {
          text += '0';
        }
      }
    }

    if (result.summary) {
      if (text.length > 0) {
        text += '\n\n';
      }
      text += '*Summary: *' + result.summary + '\n';
    }

    if (result.websitesDisplay) {
      let websitesText = '';
      result.websitesDisplay.forEach((website) => {
        websitesText += '--' + website.url;
        if (website.trusted) {
          websitesText += ' _(Trusted)_';
        }
        websitesText += '\n';
      });
      websitesText = websitesText.substring(0, websitesText.length - 1); // Remove last '\n'
      text += '\n*Websites: *\n' + websitesText;
    }

    if (result.storyline) {
      fields.push({
        title: 'Storyline',
        value: result.storyline,
      });
    }

    // Wanted to do actions for approve/mark available, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    attachments.push({
      collapsed: options && options.simple === true ? true : false,
      color: '##3eb87a',
      title: {
        value: result.name,
        link: result.url,
      },
      thumbnailUrl: result.thumbUrl,
      actions,
      fields,
      text,
    });

    if (result.artworksDisplay) {
      result.artworksDisplay.forEach((artwork) => {
        attachments.push({
          collapsed: false,
          color: '##3eb87a',
          imageUrl: artwork.url,
          text: 'Artwork for ' + result.name,
        });
      });
    }

    if (result.screenshotsDisplay) {
      result.screenshotsDisplay.forEach((screenshot) => {
        attachments.push({
          collapsed: false,
          color: '##3eb87a',
          imageUrl: screenshot.url,
          text: 'Screenshot for ' + result.name,
        });
      });
    }

    if (result.videosDisplay) {
      result.videosDisplay.forEach((video) => {
        attachments.push({
          collapsed: false,
          color: '##3eb87a',
          imageUrl: 'Can\'t embed this video!\n' + video.url,
          text: 'Video for ' + result.name,
        });
      });
    }

    if (result.similarDisplay) {
      if (result.similarDisplay.length === 0) {
        attachments.push({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'No Similar Games found for game ' + result.name + '!',
          },
        });
      } else {
        result.similarDisplay.forEach((similar) => {
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: similar.name,
              link: similar.url,
            },
            thumbnailUrl: similar.thumbUrl,
            text: 'Similar to *' + result.name + '* \n*Id: *' + similar.id + '\n*Slug: *' + similar.slug
              + '\n\nTo view details, run `/igdb game ' + similar.id + '` or `/igdb game ' + similar.slug + '`',
          });
        });
      }
    }

    if (result.bundlesDisplay) {
      if (result.bundlesDisplay.length === 0) {
        attachments.push({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'No Bundles found for game ' + result.name + '!',
          },
        });
      } else {
        result.bundlesDisplay.forEach((bundle) => {
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: bundle.name,
              link: bundle.url,
            },
            thumbnailUrl: bundle.thumbUrl,
            text: 'Bundle includes *' + result.name + '* \n*Id: *' + bundle.id + '\n*Slug: *' + bundle.slug
            + '\n\nTo view details, run `/igdb game ' + bundle.id + '` or `/igdb game ' + bundle.slug + '`',
          });
        });
      }
    }

    if (result.expansionsDisplay) {
      if (result.expansionsDisplay.length === 0) {
        attachments.push({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'No Expansions found for game ' + result.name + '!',
          },
        });
      } else {
        result.expansionsDisplay.forEach((expansion) => {
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: expansion.name,
              link: expansion.url,
            },
            thumbnailUrl: expansion.thumbUrl,
            text: 'Expansion for *' + result.name + '* \n*Id: *' + expansion.id + '\n*Slug: *' + expansion.slug
            + '\n\nTo view details, run `/igdb game ' + expansion.id + '` or `/igdb game ' + expansion.slug + '`',
          });
        });
      }
    }

    if (result.dlcsDisplay) {
      if (result.dlcsDisplay.length === 0) {
        attachments.push({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'No DLCs found for game ' + result.name + '!',
          },
        });
      } else {
        result.dlcsDisplay.forEach((dlc) => {
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: dlc.name,
              link: dlc.url,
            },
            thumbnailUrl: dlc.thumbUrl,
            text: 'DLC for *' + result.name + '* \n*Id: *' + dlc.id + '\n*Slug: *' + dlc.slug
            + '\n\nTo view details, run `/igdb game ' + dlc.id + '` or `/igdb game ' + dlc.slug + '`',
          });
        });
      }
    }

    if (result.feedsDisplay) {
      if (result.feedsDisplay.length === 0) {
        attachments.push({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'No Feeds found for game ' + result.name + '!',
          },
        });
      } else {
        attachments.push({
          collapsed: false,
          color: '#00CE00',
          title: {
            value: 'Feed Results (' + result.feedsDisplay.length + ')',
          },
        });
        result.feedsDisplay.forEach((feed) => {
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: feed.name,
              link: feed.url,
            },
            text: '*Category: *' + feed.categoryDisplay + '\n*Updated: *' + feed.updatedDateDisplay + '\n*Content: *' + feed.content,
          });
        });
      }
    }

    if (result.pulsesDisplay) {
      if (result.pulsesDisplay.length === 0) {
        attachments.push({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'No Pulses found for game ' + result.name + '!',
          },
        });
      } else {
        attachments.push({
          collapsed: false,
          color: '#00CE00',
          title: {
            value: 'Pulse Results (' + result.pulsesDisplay.length + ')',
          },
        });
        result.pulsesDisplay.forEach((pulse) => {
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: pulse.title,
              link: pulse.urlDisplay ? pulse.urlDisplay.url : '',
            },
            thumbnailUrl: pulse.image,
            text:
              '*Source: *' + (pulse.sourceDisplay ? pulse.sourceDisplay.name : '') +
              '\n*Updated: *' + pulse.updatedDateDisplay +
              '\n*Author: *' + pulse.author +
              '\n\n*Summary: *' + pulse.summary,
          });
        });
      }
    }
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}
