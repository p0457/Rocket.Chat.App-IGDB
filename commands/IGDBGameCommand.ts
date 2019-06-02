import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IGDBApp } from '../IGDBApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { getGames } from '../lib/helpers/request';

export class IGDBGameCommand implements ISlashCommand {
  public command = 'igdb-game';
  public i18nParamsExample = 'slashcommand_game_params';
  public i18nDescription = 'slashcommand_game_description';
  public providesPreview = false;

  public constructor(private readonly app: IGDBApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const key = await read.getEnvironmentReader().getSettings().getValueById('igdb_key');
    if (!key) {
      await msgHelper.sendBadApiKey(read, modify, context.getSender(), context.getRoom());
      return;
    }

    const [id, scope] = context.getArguments();
    if (!id) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Id not provided!');
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
      } else if (scopeTemp === 'feeds') {
        await getGames(key, query, {
          getCovers,
          getFeeds: true,
        }, http, read, modify, context.getSender(), context.getRoom());
      } else if (scopeTemp === 'pulses') {
        await getGames(key, query, {
          getCovers,
          getPulses: true,
        }, http, read, modify, context.getSender(), context.getRoom());
      } else {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Didn\'t understand your second argument `' + scopeTemp + '`');
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
        getTimeToBeat: true,
      }, http, read, modify, context.getSender(), context.getRoom());
    }
  }
}
