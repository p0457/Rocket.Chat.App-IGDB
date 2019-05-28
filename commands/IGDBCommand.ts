import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IGDBApp } from '../IGDBApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { getGames, setRequest } from '../lib/helpers/request';

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
        + '`/igdb game [ID OR SLUG] (artworks|bundles|expansions|screenshots|similar|dlc|videos)`\n>Get details for a game',
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

    if (searchArg.length < 3) {
      await msgHelper.sendNotification('Search Query must be greater than 3 letters!', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const query = 'search "' + searchArg + '";fields name,slug,summary,url;where version_parent = null;limit 50;';

    await getGames(key, query, {
      simple: true,
      resultsText: 'Results for query "' + searchArg + '"',
      getCovers: true,
    }, http, read, modify, context.getSender(), context.getRoom());
  }

  private async processGameCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const key = await read.getEnvironmentReader().getSettings().getValueById('igdb_key');
    if (!key) {
      await msgHelper.sendBadApiKey(read, modify, context.getSender(), context.getRoom());
      return;
    }

    const [, id, scope] = context.getArguments();
    if (!id) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Usage: `/igdb game [ID OR SLUG] (artworks|bundles|expansions|screenshots|similar|dlc|videos)`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    let query = 'fields *;where ';

    // tslint:disable-next-line:radix
    if (isNaN(parseInt(id))) {
      query += 'slug="' + id + '";';
    } else {
      query += 'id=' + id + ';';
    }

    const getCovers = true;
    if (scope) {
      const scopeTemp = scope.toLowerCase().trim();
      if (scopeTemp === 'artworks') {
        await getGames(key, query, {
          getCovers,
          getArtworks: true,
        }, http, read, modify, context.getSender(), context.getRoom());
      } else if (scopeTemp === 'bundles') {
        await getGames(key, query, {
          getCovers,
          getBundles: true,
        }, http, read, modify, context.getSender(), context.getRoom());
      } else if (scopeTemp === 'expansions') {
        await getGames(key, query, {
          getCovers,
          getExpansions: true,
        }, http, read, modify, context.getSender(), context.getRoom());
      } else if (scopeTemp === 'screenshots') {
        await getGames(key, query, {
          getCovers,
          getScreenshots: true,
        }, http, read, modify, context.getSender(), context.getRoom());
      } else if (scopeTemp === 'similar') {
        await getGames(key, query, {
          getCovers,
          getSimilar: true,
        }, http, read, modify, context.getSender(), context.getRoom());
      } else if (scopeTemp === 'videos') {
        await getGames(key, query, {
          getCovers,
          getVideos: true,
        }, http, read, modify, context.getSender(), context.getRoom());
      } else if (scopeTemp === 'dlc') {
        await getGames(key, query, {
          getCovers,
          getDlcs: true,
        }, http, read, modify, context.getSender(), context.getRoom());
      } else {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendNotification('Usage: `/igdb game [ID OR SLUG] (artworks|bundles|expansions|screenshots|similar|dlc|videos)`', read, modify, context.getSender(), context.getRoom());
        return;
      }
    } else {
      await getGames(key, query, {
        getCovers,
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
        getKeywords: true,
        getMultiplayerModes: true,
      }, http, read, modify, context.getSender(), context.getRoom());
    }
  }
}
