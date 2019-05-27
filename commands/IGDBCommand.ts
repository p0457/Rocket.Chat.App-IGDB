import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IGDBApp } from '../IGDBApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { sendGamesResults, sendNotificationSingleAttachment } from '../lib/helpers/messageHelper';
import { getGames, setRequest } from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';

enum Command {
  Help = 'help',
  Games = 'games',
  Game = 'game',
}

export class IGDBCommand implements ISlashCommand {
  public command = 'igdb';
  public i18nParamsExample = 'slashcommand_params';
  public i18nDescription = 'slashcommand_description';
  public providesPreview = false;

  public constructor(private readonly app: IGDBApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [command] = context.getArguments();

    switch (command) {
      case Command.Help:
        await this.processHelpCommand(context, read, modify, http, persis);
        break;
      case Command.Games:
        await this.processGamesCommand(context, read, modify, http, persis);
        break;
      case Command.Game:
        await this.processGameCommand(context, read, modify, http, persis);
        break;
      default:
        await this.processHelpCommand(context, read, modify, http, persis);
        break;
    }
  }

  private async processHelpCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: 'IGDB App Help Commands',
      },
      text: '`/igdb help`\n>Show this help menu\n'
        + '`/igdb games [QUERY]`\n>Search for games\n'
        + '`\igdb game [ID OR SLUG]`\n>Get details for a game',
      }, read, modify, context.getSender(), context.getRoom());
    return;
  }

  private async processGamesCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const key = await read.getEnvironmentReader().getSettings().getValueById('igdb_key');
    if (!key) {
      await msgHelper.sendBadApiKey(read, modify, context.getSender(), context.getRoom());
      return;
    }

    const args = context.getArguments();
    if (args.length < 2) {
      await msgHelper.sendNotification('Usage: `/igdb games [QUERY]`', read, modify, context.getSender(), context.getRoom());
    }
    let searchArg = '';
    // tslint:disable-next-line:prefer-for-of
    for (let x = 1; x < args.length; x++) {
      searchArg += args[x] + ' ';
    }
    searchArg = searchArg.trim();

    if (searchArg === '') {
      await msgHelper.sendNotification('Usage: `/igdb games [QUERY]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const query = 'search "' + searchArg + '";fields name,slug,summary;where version_parent = null;';

    await getGames(key, query, {
      getCovers: true,
    }, http, read, modify, context.getSender(), context.getRoom());
  }

  private async processGameCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const key = await read.getEnvironmentReader().getSettings().getValueById('igdb_key');
    if (!key) {
      await msgHelper.sendBadApiKey(read, modify, context.getSender(), context.getRoom());
      return;
    }

    const [, id] = context.getArguments();
    if (!id) {
      await msgHelper.sendNotification('Usage: `/igdb game [ID OR SLUG]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    let query = 'fields *;where ';

    // tslint:disable-next-line:radix
    if (isNaN(parseInt(id))) {
      query += 'slug="' + id + '";';
    } else {
      query += 'id=' + id + ';';
    }

    await getGames(key, query, {
      getCovers: true,
      getPlatforms: true,
      getGenres: true,
      getGameModes: true,
      getCompanies: true,
      getGameEngines: true,
      getPlayerPerspectives: true,
      getThemes: true,
      getWebsites: true,
      getFranchises: true,
      getAlternativeNames: true,
      getReleaseDates: true,
    }, http, read, modify, context.getSender(), context.getRoom());
  }
}
