import { binarySearchByProperty, binaryInsertByProperty } from './utils';
import { Globals } from './globals';

export function displayDialogMessage(message: string): void {
	const dialog = $("#dialog");
	dialog.html(message.replace(/\n/g, "<br />"));
	dialog.dialog("open");
}

export class Bettor {
	name: string;
	wins = 0;
	losses = 0;
	type = "U";
	accuracy = 0;
	total = 0;

	constructor(name: string) {
		this.name = name;
	}
}

export class Character {
	name: string;
	wins: string[] = [];
	losses: string[] = [];
	winTimes: number[] = [];
	lossTimes: number[] = [];
	odds: number[] = [];
	crowdFavor: number[] = [];
	illumFavor: number[] = [];
	tiers: string[] = [];
	totalFights: number[] = [];
	ratio: number;

	constructor(name: string) {
		this.name = name;
	}
}

export class MatchRecord {
	c1: string;
	c2: string;
	w: number;
	sn: string;
	pw: string;
	t: string;
	m: string;
	o: string;
	ts: number;
	cf: number;
	if: number;
	dt: string;

	constructor(init?: Partial<MatchRecord>) {
		Object.assign(this, init);
	}
}

export class Updater {
	getCharAvgOdds(c: Character): number {
		let o = 0;
		let i: number;
		for (i = 0; i < c.odds.length; i++) {
			o += c.odds[i];
		}
		i = (i > 0) ? i : 1;
		return o / i;
	}
	getCharacter(cname: string, characterRecords: Character[], namesOfCharactersWhoAlreadyHaveRecords: string[]): Character {
		let cobject: Character = null;
		if (!namesOfCharactersWhoAlreadyHaveRecords.includes(cname)) {
			cobject = new Character(cname);
			binaryInsertByProperty(cobject, characterRecords, "name");
			namesOfCharactersWhoAlreadyHaveRecords.push(cname);
		} else {
			cobject = characterRecords[binarySearchByProperty(new Character(cname), characterRecords, "name")];
		}
		return cobject;
	}
	getBettor(bname: string, bettorRecords: Bettor[], namesOfBettorsWhoAlreadyHaveRecords: string[]): Bettor {
		let bobject: Bettor = null;
		if (!namesOfBettorsWhoAlreadyHaveRecords.includes(bname)) {
			bobject = new Bettor(bname);
			bettorRecords.push(bobject);
			namesOfBettorsWhoAlreadyHaveRecords.push(bname);
		} else {
			for (const bettor of bettorRecords) {
				if (bname === bettor.name) {
					bobject = bettor;
					break;
				}
			}
		}
		return bobject;
	}
	updateBettorsFromMatch(mObj: MatchRecord, bc1: Bettor[], bc2: Bettor[]): void {
		const c1Won = (mObj.w === 0);
		for (const bettorForCharacter1 of bc1) {
			if (c1Won) {
				bettorForCharacter1.wins += 1;
			}
			else {
				bettorForCharacter1.losses += 1;
			}
		}
		for (const bettorForCharacter2 of bc2) {
			if (!c1Won) {
				bettorForCharacter2.wins += 1;
			}
			else {
				bettorForCharacter2.losses += 1;
			}
		}
	}
	updateCharactersFromMatch(mObj: MatchRecord, c1Obj: Character, c2Obj: Character): void {
		const rememberRecordsLast = 15;  // changing this requires re-importing matches.
		// wins, losses, and times
		if (mObj.w === 0) {
			c1Obj.wins.push(mObj.t);
			c2Obj.losses.push(mObj.t);
			c1Obj.winTimes.push(mObj.ts);
			c2Obj.lossTimes.push(mObj.ts);

			c1Obj.totalFights.push(1);
			c2Obj.totalFights.push(0);
		} else if (mObj.w === 1) {
			c2Obj.wins.push(mObj.t);
			c1Obj.losses.push(mObj.t);
			c2Obj.winTimes.push(mObj.ts);
			c1Obj.lossTimes.push(mObj.ts);

			c1Obj.totalFights.push(0);
			c2Obj.totalFights.push(1);
		}

		function limitRecordsTo(charObj: Character, limit: number): void {
			if (charObj.totalFights.length > limit) {
				if (charObj.totalFights[0] === 0) {
					charObj.losses.shift();
					charObj.lossTimes.shift();
				}

				else {
					charObj.wins.shift();
					charObj.winTimes.shift();
				}

				charObj.totalFights.shift();
				charObj.odds.shift();
				charObj.tiers.shift();

				if (charObj.crowdFavor.length > limit) {
					charObj.crowdFavor.shift();
					charObj.illumFavor.shift();
				}
			}
		}

		// this.tiers will correspond with the odds
		if (mObj.o != null && mObj.o !== "U") {
			const oc1 = Number(mObj.o.split(":")[0]);
			const oc2 = Number(mObj.o.split(":")[1]);
			c1Obj.odds.push(oc1 / oc2);
			c2Obj.odds.push(oc2 / oc1);
		} else {
			c1Obj.odds.push(-1);
			c2Obj.odds.push(-1);
		}
		c1Obj.tiers.push(mObj.t);
		c2Obj.tiers.push(mObj.t);
		// expert favor is seemingly worthless but what the hell
		if (mObj.cf !== undefined && mObj.cf != null) {
			if (mObj.cf === 0) {
				c1Obj.crowdFavor.push(1);
				c2Obj.crowdFavor.push(0);
			} else if (mObj.cf === 1) {
				c1Obj.crowdFavor.push(0);
				c2Obj.crowdFavor.push(1);
			}
		}
		if (mObj.if !== undefined && mObj.if != null) {
			if (mObj.if === 0) {
				c1Obj.illumFavor.push(1);
				c2Obj.illumFavor.push(0);
			} else if (mObj.if === 1) {
				c1Obj.illumFavor.push(0);
				c2Obj.illumFavor.push(1);
			}
		}

		limitRecordsTo(c1Obj, rememberRecordsLast);
		limitRecordsTo(c2Obj, rememberRecordsLast);

	}
}

if (window.location.href === "http://www.saltybet.com/" || window.location.href === "http://mugen.saltybet.com/" ||
	window.location.href === "https://www.saltybet.com/" || window.location.href === "https://mugen.saltybet.com/") {
	chrome.runtime.onMessage.addListener(function(request: { type: string; text: string }, _sender: chrome.runtime.MessageSender) {
		const ctrl = Globals.ctrl;
		switch (request.type) {
			case "tv":
				ctrl.toggleVideoWindow();
				break;
			case "talimit_enable":
			case "talimit_disable":
				ctrl.setAggro(request.type.endsWith("enable"), +request.text);
				break;
			case "te":
				ctrl.setExhibitions(Boolean(request.text));
				break;
			case "ait":
				ctrl.setAllInTournament(Boolean(request.text));
				break;
			case "cs_o":
				ctrl.changeStrategy(request.type);
				break;
			case "suc":
				ctrl.receiveBestChromosome(request.text);
				break;
			case "cs_ipu":
			case "cs_rc":
				ctrl.changeStrategy(request.type);
				break;
			case "cs_cs":
				ctrl.changeStrategy(request.type, request.text);
				break;
			case "limit_enable":
				ctrl.setLimit(true, +request.text);
				break;
			case "limit_disable":
				ctrl.setLimit(false, +request.text);
				break;
			case "tourney_limit_enable":
			case "tourney_limit_disable":
				ctrl.setTourneyLimit(request.type.endsWith("enable"), +request.text);
				break;
			case "multiplier":
				ctrl.setMultiplier(Number(request.text));
				break;
			case "keepAlive":
				ctrl.setKeepAlive(Boolean(request.text));
				break;
			case "upset_betting_enable":
			case "upset_betting_disable":
				ctrl.setUpsetBetting(request.type.endsWith("enable"), +request.text);
				break;
			case "maximumBetAmount_enable":
			case "maximumBetAmount_disable":
				ctrl.setMaximumBetAmount(request.type.endsWith("enable"), +request.text);
				break;
		}
	});
}
