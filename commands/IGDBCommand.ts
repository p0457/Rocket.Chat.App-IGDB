import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IGDBApp } from '../IGDBApp';
import * as msgHelper from '../lib/helpers/messageHelper';

export class IGDBCommand implements ISlashCommand {
  public command = 'igdb';
  public i18nParamsExample = 'slashcommand_params';
  public i18nDescription = 'slashcommand_description';
  public providesPreview = false;

  public constructor(private readonly app: IGDBApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: 'Commands',
      },
      text: '`/igdb`\n>Show this help menu\n'
        + '`/igdb-games [QUERY]`\n>Search for games\n'
        // tslint:disable-next-line:max-line-length
        + '`/igdb-game [ID OR SLUG] (artworks|bundles|expansions|screenshots|similar|dlc|videos|feeds|pulses)`\n>Get details for a game. Second parameter is for sub-details',
      }, read, modify, context.getSender(), context.getRoom());
    return;
  }
}
