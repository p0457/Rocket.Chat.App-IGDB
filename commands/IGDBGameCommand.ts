import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext, ISlashCommandPreview, ISlashCommandPreviewItem, SlashCommandPreviewItemType } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IGDBApp } from '../IGDBApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { getAndSendGames, getGamesForPreview, getGameSearchString, sendGame } from '../lib/helpers/request';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';

export class IGDBGameCommand implements ISlashCommand {
  public command = 'igdb-game';
  public i18nParamsExample = 'slashcommand_game_params';
  public i18nDescription = 'slashcommand_game_description';
  public providesPreview = true;

  public constructor(private readonly app: IGDBApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await sendGame(context.getArguments(), read, modify, http, context.getSender(), context.getRoom(), false);
    return;
  }

  public async previewer(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<ISlashCommandPreview> {
    const items = new Array<ISlashCommandPreviewItem>();
    
    const key = await read.getEnvironmentReader().getSettings().getValueById('igdb_key');
    
    if (!key) {
      return {
        i18nTitle: 'Set API Key first!',
        items,
      };
    }

    const options = [
      'details',
      'artworks',
      'bundles',
      'expansions',
      'screenshots',
      'similar',
      'dlc',
      'videos',
      'feeds',
      'pulses',
    ]

    const args = context.getArguments();
    if (args.length > 1) {
      if (options.includes(args[1].toLowerCase())) {
        const option = args[1];
        items.push({
          id: option.toLowerCase(),
          type: SlashCommandPreviewItemType.TEXT,
          value: option === 'dlc' ? 'DLC' : (`${option.charAt(0).toUpperCase()}${option.substring(1, option.length)}`),
        });
        items.push({
          id: 'details',
          type: SlashCommandPreviewItemType.TEXT,
          value: 'Details',
        });
        return {
          i18nTitle: 'Results for',
          items,
        };
      }
    }

    options.forEach((option) => {
      items.push({
        id: option,
        type: SlashCommandPreviewItemType.TEXT,
        value: option === 'dlc' ? 'DLC' : (`${option.charAt(0).toUpperCase()}${option.substring(1, option.length)}`),
      });
    })

    return {
      i18nTitle: 'Results for',
      items,
    };
  }

  public async executePreviewItem(item: ISlashCommandPreviewItem, context: SlashCommandContext, read: IRead,
    modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
      const args = [context.getArguments()[0]];
      if (item.id !== 'details') {
        args.push(item.id);
      }
      await sendGame(args, read, modify, http, context.getSender(), context.getRoom(), false);
      return;
  }
}
