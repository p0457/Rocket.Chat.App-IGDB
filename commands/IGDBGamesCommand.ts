import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IGDBApp } from '../IGDBApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { getAndSendGames } from '../lib/helpers/request';

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
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'No arguments provided!');
      return;
    }
    const searchArg = args.join(' ').trim();

    if (searchArg === '') {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'No query provided!');
      return;
    }

    if (searchArg.length < 3) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Search Query must be greater than 3 letters!');
      return;
    }

    const query = 'search "' + searchArg + '";fields name,slug,summary,url;where version_parent = null;limit 50;';

    await getAndSendGames(key, query, {
      simple: true,
      resultsText: 'Results for query "' + searchArg + '"',
      getCovers: true,
    }, http, read, modify, context.getSender(), context.getRoom());
  }
}
