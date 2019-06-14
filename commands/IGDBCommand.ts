import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IGDBApp } from '../IGDBApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import usage from '../lib/helpers/usage';

export class IGDBCommand implements ISlashCommand {
  public command = 'igdb';
  public i18nParamsExample = 'slashcommand_params';
  public i18nDescription = 'slashcommand_description';
  public providesPreview = false;

  public constructor(private readonly app: IGDBApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    let text = '';

    for (const p in usage) {
      if (usage.hasOwnProperty(p)) {
        if (usage[p].command && usage[p].usage && usage[p].description) {
          text += usage[p].usage + '\n>' + usage[p].description + '\n';
        }
      }
    }

    text += '\n\nThis application is not created by, affiliated with, or supported by IGDB.';

    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: 'Commands',
      },
      text,
      }, read, modify, context.getSender(), context.getRoom());
    return;
  }
}
