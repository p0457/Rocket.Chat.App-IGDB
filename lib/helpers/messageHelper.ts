import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAction, IMessageAttachment, MessageActionButtonsAlignment, MessageActionType, MessageProcessingType } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import usage from './usage';

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

export async function sendUsage(read: IRead, modify: IModify, user: IUser, room: IRoom, scope: string, additionalText?): Promise<void> {
  let text = '';

  let usageObj = usage[scope];
  if (!usageObj) {
    for (const p in usage) {
      if (usage.hasOwnProperty(p)) {
        if (usage[p].command === scope) {
          usageObj = usage[p];
        }
      }
    }
  }
  if (usageObj && usageObj.command && usageObj.usage && usageObj.description) {
    text = '*Usage: *' + usageObj.usage + '\n>' + usageObj.description;
  }

  if (additionalText) {
    text = additionalText + '\n' + text;
  }

  // tslint:disable-next-line:max-line-length
  await this.sendNotification(text, read, modify, user, room);
  return;
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

    // Wanted to do actions for approve/mark available, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    // For multiple results, a search is being performed. Show the quick command to use for convenience
    if (results.length > 1) {
      actions.push({
        type: MessageActionType.BUTTON,
        text: 'Get Details',
        msg: '/igdb-game ' + result.id,
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });
    }

    prepMetaDisplay(result, fields, 'id', 'Id', { url: false });

    if (result.slug) {
      prepMetaDisplay(result, fields, 'slug', 'Slug', { url: false });
    }

    prepMetaDisplay(result, fields, 'franchisesDisplay', 'Franchise(s)');
    prepMetaDisplay(result, fields, 'genresDisplay', 'Genres', { list: true });
    prepMetaDisplay(result, fields, 'gameModesDisplay', 'Game Modes', { list: true });
    prepMetaDisplay(result, fields, 'multiplayerModesDisplay', 'Multiplayer Modes', { list: false, multiplayerModes: true });
    prepMetaDisplay(result, fields, 'playerPerspectivesDisplay', 'Player Perspectives', { list: true });
    prepMetaDisplay(result, fields, 'timeToBeatDisplay', 'Time to Beat', { url: false, short: false, list: false, timeToBeat: true });
    prepMetaDisplay(result, fields, 'alternativeNamesDisplay', 'Alternative Names', { url: false, short: false, list: true });
    prepMetaDisplay(result, fields, 'themesDisplay', 'Themes', { short: false });
    prepMetaDisplay(result, fields, 'gameEnginesDisplay', 'Game Engines', { short: false });
    prepMetaDisplay(result, fields, 'companiesDisplay', 'Companies', { short: false, list: true });
    prepMetaDisplay(result, fields, 'platformsDisplay', 'Platforms', { short: false, list: true });
    prepMetaDisplay(result, fields, 'keywordsDisplay', 'Keywords', { url: false, short: false });

    if (result.rating && !isNaN(result.rating) && result.rating_count && !isNaN(result.rating_count)) {
      let ratingText = '\n*Rating: *' + Number(result.rating).toFixed(1) + ' _(of ' + Number(result.rating_count) + ')_ ';
      if (result.aggregated_rating && !isNaN(result.aggregated_rating) && result.aggregated_rating_count && !isNaN(result.aggregated_rating_count)) {
        ratingText += '*Aggregate: *' + Number(result.aggregated_rating).toFixed(1) + ' _(of ' + Number(result.aggregated_rating_count) + ')_ ';
      }
      if (result.total_rating && !isNaN(result.total_rating) && result.total_rating_count && !isNaN(result.total_rating_count)) {
        ratingText += '*Total: *' + Number(result.total_rating).toFixed(1) + ' _(of ' + Number(result.total_rating_count) + ')_ ';
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
      if (result.similar_games && Array.isArray(result.similar_games)) {
        actions.push({
          type: MessageActionType.BUTTON,
          text: 'Get Similar Games (' + result.similar_games.length + ')',
          msg: '/igdb-game ' + result.id + ' similar',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage,
        });
      }

      if (result.bundles && Array.isArray(result.bundles)) {
        actions.push({
          type: MessageActionType.BUTTON,
          text: 'Get Bundles (' + result.bundles.length + ')',
          msg: '/igdb-game ' + result.id + ' bundles',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage,
        });
      }

      if (result.expansions && Array.isArray(result.expansions)) {
        actions.push({
          type: MessageActionType.BUTTON,
          text: 'Get Expansions (' + result.expansions.length + ')',
          msg: '/igdb-game ' + result.id + ' expansions',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage,
        });
      }

      if (result.dlc && Array.isArray(result.dlc)) {
        actions.push({
          type: MessageActionType.BUTTON,
          text: 'Get DLC (' + result.dlc.length + ')',
          msg: '/igdb-game ' + result.id + ' dlc',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage,
        });
      }

      if (result.feedsDisplay && Array.isArray(result.feedsDisplay)) {
        actions.push({
          type: MessageActionType.BUTTON,
          text: 'Get Feeds (' + result.feedsDisplay.length + ')',
          msg: '/igdb-game ' + result.id + ' feeds',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage,
        });
      }

      if (result.pulsesDisplay && Array.isArray(result.pulsesDisplay)) {
        actions.push({
          type: MessageActionType.BUTTON,
          text: 'Get Pulses (' + result.pulsesDisplay.length + ')',
          msg: '/igdb-game ' + result.id + ' pulses',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage,
        });
      }
    }

    // If only one result, show other commands
    if (results.length === 1) {
      const otherCommands = ['artworks', 'screenshots', 'videos', 'feeds', 'pulses'];
      // tslint:disable-next-line:prefer-for-of
      for (let y = 0; y < otherCommands.length; y++) {
        const display = otherCommands[y].charAt(0).toUpperCase() + otherCommands[y].slice(1);
        actions.push({
          type: MessageActionType.BUTTON,
          text: 'Get ' + display,
          msg: '/igdb-game ' + result.id + ' ' + otherCommands[y],
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage,
        });
      }
      // text += '\n*Other Commands: *`(artworks|bundles|expansions|screenshots|similar|dlc|videos|feeds|pulses)`';
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

    actions.push({
      type: MessageActionType.BUTTON,
      url: result.url,
      text: 'View on IGDB',
      msg_in_chat_window: false,
      msg_processing_type: MessageProcessingType.SendMessage,
    });

    attachments.push({
      collapsed: options && options.simple === true ? true : false,
      color: '##3eb87a',
      title: {
        value: result.name,
        link: result.url,
      },
      thumbnailUrl: result.thumbUrl,
      actions,
      actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
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
          text: 'Video for ' + result.name + ' ...(can\'t embed!) ' + video.url,
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
          const similarDisplayActions = new Array<IMessageAction>();
          similarDisplayActions.push({
            type: MessageActionType.BUTTON,
            text: 'View Details',
            msg: '/igdb-game ' + similar.id,
            msg_in_chat_window: true,
            msg_processing_type: MessageProcessingType.RespondWithMessage,
          });
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: similar.name,
              link: similar.url,
            },
            actions: similarDisplayActions,
            actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
            thumbnailUrl: similar.thumbUrl,
            text: 'Similar to *' + result.name + '* \n*Id: *' + similar.id + '\n*Slug: *' + similar.slug,
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
          const bundlesActions = new Array<IMessageAction>();
          bundlesActions.push({
            type: MessageActionType.BUTTON,
            text: 'Get Details',
            msg: '/igdb-game ' + bundle.id,
            msg_in_chat_window: true,
            msg_processing_type: MessageProcessingType.RespondWithMessage,
          });
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: bundle.name,
              link: bundle.url,
            },
            actions: bundlesActions,
            actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
            thumbnailUrl: bundle.thumbUrl,
            text: 'Bundle includes *' + result.name + '* \n*Id: *' + bundle.id + '\n*Slug: *' + bundle.slug,
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
          const expansionsActions = new Array<IMessageAction>();
          expansionsActions.push({
            type: MessageActionType.BUTTON,
            text: 'Get Details',
            msg: '/igdb-game ' + expansion.id,
            msg_in_chat_window: true,
            msg_processing_type: MessageProcessingType.RespondWithMessage,
          });
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: expansion.name,
              link: expansion.url,
            },
            actions: expansionsActions,
            actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
            thumbnailUrl: expansion.thumbUrl,
            text: 'Expansion for *' + result.name + '* \n*Id: *' + expansion.id + '\n*Slug: *' + expansion.slug,
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
          const dlcActions = new Array<IMessageAction>();
          dlcActions.push({
            type: MessageActionType.BUTTON,
            text: 'Get Details',
            msg: '/igdb-game ' + dlc.id,
            msg_in_chat_window: true,
            msg_processing_type: MessageProcessingType.RespondWithMessage,
          });
          attachments.push({
            collapsed: false,
            color: '##3eb87a',
            title: {
              value: dlc.name,
              link: dlc.url,
            },
            actions: dlcActions,
            actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
            thumbnailUrl: dlc.thumbUrl,
            text: 'DLC for *' + result.name + '* \n*Id: *' + dlc.id + '\n*Slug: *' + dlc.slug,
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
