import * as moment from 'moment';

import { Chromosome } from './strategy';
import { binarySearchByProperty, binaryInsertByProperty } from './utils';
import { Globals } from './globals';

export function displayDialogMessage(message: string) {
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
	getCharAvgOdds(c: Character) {
		let o = 0;
		let i;
		for (i = 0; i < c.odds.length; i++) {
			o += c.odds[i];
		}
		i = (i > 0) ? i : 1;
		return o / i;
	}
	getCharacter(cname: string, characterRecords: Character[], namesOfCharactersWhoAlreadyHaveRecords: string[]) {
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
		let bobject = null;
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
	updateBettorsFromMatch(mObj: MatchRecord, bc1: Bettor[], bc2: Bettor[]) {
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
	updateCharactersFromMatch(mObj: MatchRecord, c1Obj: Character, c2Obj: Character) {
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

		function limitRecordsTo(charObj: Character, limit: number) {
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


const er = function () {
	const lines: string[] = [];
	let matches = [];
	chrome.runtime.sendMessage({ query: "getMatchRecords" }, function (data: MatchRecord[]) {
		matches = data;

		for (const match of matches) {
			let record = match.c1 + "," + match.c2 + "," + match.w + "," + match.sn + "," + match.pw + ",";
			record += (match.hasOwnProperty("t")) ? match.t : "U";
			record += ",";
			record += (match.hasOwnProperty("m")) ? match.m : "U";
			record += ",";
			record += (match.hasOwnProperty("o")) ? match.o : "U";
			record += ",";
			record += (match.hasOwnProperty("ts")) ? match.ts : 0;
			record += ",";
			record += (match.hasOwnProperty("cf")) ? match.cf : 2;
			record += ",";
			record += (match.hasOwnProperty("if")) ? match.if : 2;
			record += ",";
			record += (match.hasOwnProperty("dt")) ? match.dt : moment().format("DD-MM-YYYY");
			record += "\n";
			lines.push(record);
		}

		const time = new Date();
		const blobM = new Blob(lines, {
			type: "text/plain;charset=utf-8",
		});
		const timeStr = "" + time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate() + "-" + time.getHours() + "." + time.getMinutes();
		window.saveAs(blobM, "saltyRecordsM--" + timeStr + ".txt");
	});
};

function ir(f: string) {
	const updater = new Updater();
	const matchRecords = [];
	const characterRecords: Character[] = [];
	const namesOfCharactersWhoAlreadyHaveRecords: string[] = [];

	//numberOfProperties refers to c1, c2, w, sn, etc.
	const numberOfProperties = 12;
	let mObj: MatchRecord = null;
	const lines = f.split("\n");
	for (const line of lines) {
		line.replace("\r", "");
		const match = line.split(",");

		for (let j = 0; j < match.length; j++) {
			switch (j % numberOfProperties) {
				case 0:
					mObj = new MatchRecord();
					mObj.c1 = match[j];
					break;
				case 1:
					mObj.c2 = match[j];
					break;
				case 2:
					mObj.w = +match[j];
					break;
				case 3:
					mObj.sn = match[j];
					break;
				case 4:
					mObj.pw = match[j];
					break;
				case 5:
					mObj.t = match[j];
					break;
				case 6:
					mObj.m = match[j];
					break;
				case 7:
					mObj.o = match[j];
					break;
				case 8:
					mObj.ts = +match[j];
					break;
				case 9:
					mObj.cf = +match[j];
					break;
				case 10:
					mObj.if = +match[j];
					break;
				case 11: {
					//trim to get rid of linebreaks at the end
					mObj.dt = match[j].trim();
					matchRecords.push(mObj);
					const c1Obj = updater.getCharacter(mObj.c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
					const c2Obj = updater.getCharacter(mObj.c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
					updater.updateCharactersFromMatch(mObj, c1Obj, c2Obj);
					break;
				}
			}
		}
	}
	const nmr = matchRecords.length;
	const ncr = characterRecords.length;
	//All records have been rebuilt, so update them

	chrome.runtime.sendMessage({ data: matchRecords, query: "setMatchRecords" });
	chrome.storage.local.set({
		characters_v1: characterRecords,
	}, function () {
		console.log("-\nrecords imported:\n" + nmr + " match records\n" + ncr + " character records");
		displayDialogMessage("Records imported:\n" + nmr + " match records\n" + ncr + " character records");
		Globals.dirtyRecords = true;
	});
}

function ec() {
	chrome.storage.local.get(["chromosomes_v1"], function (results) {
		if (results.chromosomes_v1 && results.chromosomes_v1.length > 0) {
			let chromosome = new Chromosome();
			chromosome = chromosome.loadFromObject(results.chromosomes_v1[0]);
			const lines = JSON.stringify(chromosome, null, "\t").split("\n");
			for (let i = 0; i < lines.length; ++i) {
				lines[i] += "\n";
			}

			const time = new Date();
			const blobM = new Blob(lines, {
				type: "text/plain;charset=utf-8",
			});
			const timeStr = "" + time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate() + "-" + time.getHours() + "." + time.getMinutes();
			saveAs(blobM, "chromosome--" + timeStr + ".txt");
		}
		else {
			console.log("- No chromosomes found.");
		}
	});
}

function ic(jsonString: string) {
	const chromosome = new Chromosome();
	try {
		chromosome.loadFromJSON(jsonString);
	}
	catch (err) {
		console.log("- Could not read chromosome file.");
		return;
	}

	//get the chromosomes currently saved in the list
	chrome.storage.local.get(["chromosomes_v1"], function (results) {
		let chromosomes = results.chromosomes_v1;
		if (chromosomes) {
			chromosomes[0] = chromosome;
		}
		else {
			chromosomes = [chromosome];
		}
		chrome.storage.local.set({
			chromosomes_v1: chromosomes,
		}, function () {
			console.log("- Chromosome imported successfully.");
			displayDialogMessage("Chromosome imported successfully.");
		});
	});

}

if (window.location.href === "http://www.saltybet.com/" || window.location.href === "http://mugen.saltybet.com/" ||
	window.location.href === "https://www.saltybet.com/" || window.location.href === "https://mugen.saltybet.com/") {
	chrome.runtime.onMessage.addListener(function (request: { type: string; text: string }, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): boolean {
		const ctrl = Globals.ctrl;
		switch (request.type) {
			case "er":
				er();
				break;
			case "ir":
				ir(request.text);
				break;
			case "ec":
				ec();
				break;
			case "ic":
				ic(request.text);
				break;
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
			default:
				sendResponse({ farewell: ("Request type " + request.type + " cannot be handled.") });
				return true;
		}
		return false;
	});
}
