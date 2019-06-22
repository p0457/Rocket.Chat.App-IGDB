import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext, ISlashCommandPreview, ISlashCommandPreviewItem, SlashCommandPreviewItemType } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IGDBApp } from '../IGDBApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { getAndSendGames, getGamesForPreview, getGameSearchString, sendGame } from '../lib/helpers/request';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';

export class IGDBGameSearchCommand implements ISlashCommand {
  public command = 'igdb-game-search';
  public i18nParamsExample = 'slashcommand_gamesearch_params';
  public i18nDescription = 'slashcommand_gamesearch_description';
  public providesPreview = true;

  public constructor(private readonly app: IGDBApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async previewer(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<ISlashCommandPreview> {
    const key = await read.getEnvironmentReader().getSettings().getValueById('igdb_key');
    
    if (!key) {
      return {
        i18nTitle: 'Set API Key first!',
        items: new Array(),
      };
    }

    const items = new Array<ISlashCommandPreviewItem>();
    const query = getGameSearchString(context.getArguments().join(' '));
    const gamesResults = await getGamesForPreview(key, query, http);
    if (gamesResults.hasError()) {
      return {
        i18nTitle: gamesResults.error,
        items,
      };
    }
    if (gamesResults.games.length === 0) {
      return {
        i18nTitle: 'No Results!',
        items, 
      };
    }
    let countForPreview = 10;
    if (gamesResults.games.length < countForPreview) {
      countForPreview = gamesResults.games.length;
    }
    for (let x = 0; x < countForPreview; x++) {
      const game = gamesResults.games[x];
      items.push({
        id: String(game.id),
        type: SlashCommandPreviewItemType.IMAGE,
        value: game.thumbUrl
      }); 
    }
    return {
      i18nTitle: 'Results for',
      items,
    };
  }

  public async executePreviewItem(item: ISlashCommandPreviewItem, context: SlashCommandContext, read: IRead,
    modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await sendGame([item.id], read, modify, http, context.getSender(), context.getRoom(), false);
    return;
  }
}
