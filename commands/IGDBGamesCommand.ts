import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { IGDBApp } from '../IGDBApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { getGames, setRequest } from '../lib/helpers/request';

export class IGDBGamesCommand implements ISlashCommand {
  public command = 'igdb-games';
  public i18nParamsExample = 'slashcommand_games_params';
  public i18nDescription = 'slashcommand_games_description';
  public providesPreview = false;

  public constructor(private readonly app: IGDBApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const key = await read.getEnvironmentReader().getSettings().getValueById('igdb_key');
    if (!key) {
      await msgHelper.sendBadApiKey(read, modify, context.getSender(), context.getRoom());
      return;
    }

    const args = context.getArguments();
    if (args.length === 0) {
      await this.sendUsage(read, modify, context.getSender(), context.getRoom());
      return;
    }
    const searchArg = args.join(' ').trim();

    if (searchArg === '') {
      await this.sendUsage(read, modify, context.getSender(), context.getRoom());
      return;
    }

    if (searchArg.length < 3) {
      await this.sendUsage(read, modify, context.getSender(), context.getRoom(), 'Search Query must be greater than 3 letters!');
      return;
    }

    const query = 'search "' + searchArg + '";fields name,slug,summary,url;where version_parent = null;limit 50;';

    await getGames(key, query, {
      simple: true,
      resultsText: 'Results for query "' + searchArg + '"',
      getCovers: true,
    }, http, read, modify, context.getSender(), context.getRoom());
  }

  private async sendUsage(read: IRead, modify: IModify, user: IUser, room: IRoom, additionalText?) {
    await msgHelper.sendNotification(additionalText ? additionalText + '\n' : '' + 'Usage: `/igdb-games [QUERY]`', read, modify, user, room);
    return;
  }
}