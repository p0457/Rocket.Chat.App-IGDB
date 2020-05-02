export class IGDBGamesDTO {
  public error = '';
  public games = new Array<any>();

  public constructor(games?: Array<any>, error?: string) {
    if (games) this.games = games;
    if (error) this.error = error;
  }

  public hasError(): boolean {
    return this.error !== undefined && this.error !== '';
  }
}