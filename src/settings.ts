export class Settings {
	/*eslint-disable @typescript-eslint/naming-convention */
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any

	nextStrategy: string = null;
	video = true;
	betOnExhibitions = true;
	level = 0;
	//settings for stopping after a specified balance has been reached
	limit_enabled = false;
	limit = 100000;

	allInTourney = true;

	//settings for stopping after a specified tourney balance has been reached
	tourneyLimit = 100000;
	tourneyLimit_enabled = false;

	//settings for aggro mode
	aggro_enabled = false;
	aggro_limit = 10000;

	multiplier = 1.0;
	keepAlive = false;

	//settings for always going all in
	upsetBetting_limit = 100000;
	upsetBetting_enabled = false;
	maximumBetAmount_limit = 10000;
	maximumBetAmount_enabled = false;
}