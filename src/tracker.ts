import * as moment from 'moment';

import { Character, Updater, MatchRecord } from './records';
import type { Strategy } from './strategy';
import type { Settings } from './settings';
import { isTournament } from './salty';
import { binarySearchByProperty } from './utils';

export class Match {
	names: string[];
	strategy: Strategy;
	character1: Character;
	character2: Character;
	winner: number;
	tier: string;
	mode: string;
	odds: string;
	time: number;
	crowdFavor: number;
	illumFavor: number;
	multiplier: number;
	upsetMode: boolean;

	constructor(strat: Strategy) {
		this.names = [strat.p1name, strat.p2name];
		this.strategy = strat;
		this.character1 = null;
		this.character2 = null;
		this.winner = null;
		this.tier = "U";
		//U for unknown
		this.mode = "U";
		this.odds = "U";
		this.time = 0;
		this.crowdFavor = 2;
		this.illumFavor = 2;
		this.multiplier = 1;
		this.upsetMode = false;
	}

	update(infoFromWaifu: { c1: string; c2: string; tier: string; mode: string }[], odds: string, timeInfo: { ticks: number; interval: number }, crowdFavor: number, illumFavor: number): void {
		for (const ifw of infoFromWaifu) {
			if (this.names[0] === ifw.c1 && this.names[1] === ifw.c2) {
				this.tier = ifw.tier;
				this.mode = ifw.mode;
				break;
			}
		}
		if (odds != null) {
			this.odds = odds;
		}

		if (timeInfo.ticks > 0) {
			this.time = timeInfo.ticks * timeInfo.interval / 1000;
		}
		//Ignore times from matches that occurred before changing modes; 350 is the maximum time that can occur. 630=9*70
		if (this.time >= 350) {
			this.time = 0;
		}
		//add more time to matches that are recognized as being in exhibition mode, proportional to the amount of required matches missing
		if (this.mode === "e") {
			this.time = Math.round(this.time * 15) / 10;
		}
		// add favor stats
		this.crowdFavor = crowdFavor;
		this.illumFavor = illumFavor;
	}
	getRecords(winner: string): [MatchRecord, Character, Character] {//in the event of a draw, pass in the string "draw"
		if (this.names.includes(winner)) {
			const updater = new Updater();
			this.winner = (winner === this.character1.name) ? 0 : 1;
			let pw: string = null;
			if (this.strategy.abstain) {
				pw = "a";
			}
			else {
				pw = (this.strategy.prediction === this.names[this.winner]) ? "t" : "f";
			}
			const mr = new MatchRecord({
				c1: this.character1.name,
				c2: this.character2.name,
				w: this.winner,
				sn: this.strategy.strategyName,
				pw,
				t: this.tier,
				m: this.mode.charAt(0),
				o: this.odds,
				ts: this.time,
				cf: this.crowdFavor,
				if: this.illumFavor,
				dt: moment().format("DD-MM-YYYY"),
			});

			updater.updateCharactersFromMatch(mr, this.character1, this.character2);
			return [mr, this.character1, this.character2];
		} else {
			console.log("-\nsalt robot error : name not in list : " + winner + " names: " + this.names[0] + ", " + this.names[1]);
			return null;
		}
	}
	getBalance(): number {
		const balanceBox = document.querySelector("#balance");
		const balance = parseInt(balanceBox.textContent.replace(/,/g, ""), 10);
		return balance;
	}

	betAmount(): void {
		const balance: number = this.getBalance();
		const wagerBox = document.querySelector<HTMLInputElement>("#wager");

		let amountToBet: number;
		const strategy = this.strategy;
		const debug = true;

		const tournament: boolean = isTournament();

		strategy.adjustLevel(balance);
		amountToBet = strategy.getBetAmount(balance, tournament, debug);
		if (!tournament) {
			console.log(`- Multiplying initial bet amount ${amountToBet} with ${this.multiplier}`);
			amountToBet = Math.floor(amountToBet * this.multiplier);
			if (amountToBet > balance) {
				amountToBet = balance;
			}

			if (this.strategy.aggro) {
				amountToBet *= 10;
				if (amountToBet > balance) {
					amountToBet = balance;
				}
				console.log(`- AGGRO multiplier active, increasing bet to ${amountToBet}`);
			}
			if (this.strategy.maximum) {
				amountToBet = balance;
				console.log(`- Maximum bet mode active, going all in with ${amountToBet}`);
			}
		}

		if (amountToBet === 0) {
			//bet at least 1
			amountToBet = 1;
		}

		wagerBox.value = amountToBet.toString();
	}

	init(): void {
		//Attempt to get character objects from storage, if they don't exist create them
		chrome.storage.local.get(["characters_v1", "settings_v1"], (result: { "characters_v1": Character[]; "settings_v1": Settings }) => {
			const baseSeconds = 2000;
			const recs = result.characters_v1 || [];
			this.multiplier = result.settings_v1.multiplier;

			const character1Index = binarySearchByProperty(new Character(this.names[0]), recs, "name");
			const character2Index = binarySearchByProperty(new Character(this.names[1]), recs, "name");

			this.character1 = (character1Index < 0) ? new Character(this.names[0]) : recs[character1Index];
			this.character2 = (character2Index < 0) ? new Character(this.names[1]) : recs[character2Index];

			let matches = [];
			chrome.runtime.sendMessage({ query: "getMatchRecords" }, (data: MatchRecord[]) => {
				matches = data;
				const prediction = this.strategy.execute({
					character1: this.character1,
					character2: this.character2,
					matches,
				});

				if (prediction != null || this.strategy.lowBet) {
					setTimeout(() => {
						this.betAmount();

						setTimeout(() => {
							let predictedCharacter1 = prediction === this.strategy.p1name;
							if (this.upsetMode) {
								console.log("- Inverting betting decision because of upset mode");
								predictedCharacter1 = !predictedCharacter1;
							}

							if (predictedCharacter1) {
								this.strategy.btnP1.click();
							} else {
								this.strategy.btnP2.click();
							}
						}, (2 * baseSeconds));
					}, Math.floor(baseSeconds));
				}
			});
		});
	}
	setAggro(aggro: boolean): void {
		this.strategy.aggro = aggro;
	}
	setMaximum(maximum: boolean): void {
		this.strategy.maximum = maximum;
	}
}
