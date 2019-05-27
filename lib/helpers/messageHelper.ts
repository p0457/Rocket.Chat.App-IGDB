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

export function prepMetaDisplay(result, fields, scope, title, simple?: boolean) {
  if (result[scope]) {
    let text = '';
    result[scope].forEach((resultItem) => {
      text += resultItem.name;
      if (resultItem.url) {
        text += ' (' + resultItem.url + ')';
      }
      text += ', ';
    });
    text = text.substring(0, text.length - 2); // Remove last ', '
    if (!simple) {
      fields.push({
        title,
        value: text,
      });
      return;
    } else {
      text = '\n*' + title + ': *' + text;
      return text;
    }
  } else {
    return;
  }
}

export async function sendGamesResults(results, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  if (results && results.length > 1) {
    attachments.push({
      collapsed: false,
      color: '#00CE00',
      title: {
        value: 'Results (' + results.length + ')',
      },
    });
  }

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < results.length; x++) {
    const result = results[x];

    let text = '';

    const fields = new Array();

    text += '*Id: *' + result.id;

    if (result.slug) {
      text += '\n*Slug: *' + result.slug;
    }
    if (result.alternativeNamesDisplay) {
      text += '\n*Alternative Names: *';
      result.alternativeNamesDisplay.forEach((alternativeName) => {
        text += alternativeName.name + ' (' + alternativeName.comment + '), ';
      });
      text = text.substring(0, text.length - 2); // Remove last ', '
    }

    if (result.rating && result.rating_count) {
      let ratingText = '\n*Rating: *' + result.rating + ' (of ' + result.rating_count + ') ';
      if (result.aggregated_rating && result.aggregated_rating_count) {
        ratingText += '*Aggregate: *' + result.aggregated_rating + ' (of ' + result.aggregated_rating_count + ') ';
      }
      if (result.total_rating && result.total_rating_count) {
        ratingText += '*Total: *' + result.total_rating + ' (of ' + result.total_rating_count + ') ';
      }
      text += ratingText;
    }

    text += prepMetaDisplay(result, fields, 'gameEnginesDisplay', 'Game Engines', true);
    text += prepMetaDisplay(result, fields, 'companiesDisplay', 'Companies', true);

    if (result.releaseDatesDisplay) {
      text += '\n*Release Dates: *\n';
      result.releaseDatesDisplay.forEach((releaseDate) => {
        text += '--';
        if (releaseDate.platformDisplay) {
          text += releaseDate.platformDisplay + ': ';
        }
        text += releaseDate.human + '\n';
      });
      text = text.substring(0, text.length - 1); // Remove last '\n'
    }

    if (result.summary) {
      text += '\n*Summary: *' + result.summary + '\n';
    }

    prepMetaDisplay(result, fields, 'franchisesDisplay', 'Franchise(s)');
    prepMetaDisplay(result, fields, 'platformsDisplay', 'Platforms');
    prepMetaDisplay(result, fields, 'genresDisplay', 'Genres');
    prepMetaDisplay(result, fields, 'gameModesDisplay', 'Game Modes');
    prepMetaDisplay(result, fields, 'themesDisplay', 'Themes');
    prepMetaDisplay(result, fields, 'playerPerspectivesDisplay', 'Player Perspectives');

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
      collapsed: false,
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
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}
