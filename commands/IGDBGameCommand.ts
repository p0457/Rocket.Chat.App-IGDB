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
  public providesPreview = false;

  public constructor(private readonly app: IGDBApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await sendGame(context.getArguments(), read, modify, http, context.getSender(), context.getRoom(), false);
    return;
  }
}
