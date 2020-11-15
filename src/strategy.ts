import type { Character, MatchRecord } from './records';
import { Globals } from './globals';

export abstract class Strategy {
	btnP1: HTMLButtonElement;
	btnP2: HTMLButtonElement;
	p1name: string;
	p2name: string;
	strategyName: string;
	prediction: string;
	debug: boolean;
	levels: number[][];
	lowBet: boolean;
	level: number;
	confidence: number;
	abstain: boolean;
	aggro: boolean;
	maximum: boolean;

	constructor(strategyName: string) {
		this.btnP1 = document.querySelector("#player1") as HTMLButtonElement;
		this.btnP2 = document.querySelector("#player2") as HTMLButtonElement;
		this.p1name = this.btnP1.getAttribute("value").replace(/,/g, "_");
		this.p2name = this.btnP2.getAttribute("value").replace(/,/g, "_");
		this.strategyName = strategyName;
		this.prediction = null;
		this.debug = true;
		this.levels = [
			[0, 1000, 0],
			[1000, 10000, 1],
			[10000, 100000, 10],
			[100000, 500000, 25],
			[500000, 1000000, 100],
			[1000000, 5000000, 250],
			[5000000, 20000000, 500]
		];
		this.lowBet = false;
		this.abstain = false;
	}

	getBailout(tournament: boolean): number {
		const nameSpan = document.querySelector("h2").children[2];
		let isIlluminati = false;
		try { // the html is different for illuminati??
			isIlluminati = nameSpan && nameSpan.children[0].classList && nameSpan.children[0].classList.contains("goldtext");
		} catch (e) { // this is how it is for non-illums:
			isIlluminati = nameSpan && nameSpan.classList && nameSpan.classList.contains("goldtext");
		}
		let level = 0;
		const rank = document.querySelector("#rank");
		if (rank != null && rank.childNodes.length !== 0) {
			const re = /rank([0-9]{1,2})\.png/g;
			const match = re.exec((rank.childNodes[0] as HTMLImageElement).src);
			level = parseInt(match[1], 10);
		}

		if (isIlluminati) {
			return 3000 + level * 50;
		}
		else if (tournament) {
			return 1000 + level * 25;
		}
		else {
			return 100 + level * 25;
		}
	}

	flatBet(balance: number): number {
		const flatAmount = 100;
		const multiplierIndex = 2;
		const intendedBet = flatAmount * this.levels[this.level][multiplierIndex] * this.confidence;

		if (this.level === 0) {
			return balance;
		}
		else {
			return Math.ceil(intendedBet);
		}
	}

	adjustLevel(balance: number): void {
		if (!this.level) {
			this.level = 0;
		}
		//this.levels = [[0, 1000, 0], [1000, 10000, 1], [10000, 100000, 10], [100000, 500000, 25], [500000, 1000000, 100], [1000000, 5000000, 250]];
		const valley = 0;
		const peak = 1;
		const maxLv = this.levels.length - 1;
		const minLv = 0;
		let changed = false;
		do {
			changed = false;
			if (this.level + 1 <= maxLv && balance >= this.levels[this.level][peak]) {
				this.level += 1;
				changed = true;
				if (balance === this.levels[this.level][valley]) { return; }
			} else if (this.level - 1 >= minLv && balance <= this.levels[this.level][valley]) {
				this.level -= 1;
				changed = true;
			}
		} while (changed);
	}

	getBetAmount(balance: number, tournament: boolean, debug: boolean): number {
		const simBettingLimitScale = 0.1;
		const lowBettingScale = 0.01;
		const allowConfRescale = true;
		const rangeConfidanceScale = [0.52, 0.95];	// range of confidence scale, range [0.5, 1] (theses need not be exact)
		const rangeTourneyScale = [0.1, 0.45];			// range of tourney scale.
		if (!this.confidence) {
			this.confidence = 1;
		}

		let amountToBet: number;
		const bailout = this.getBailout(tournament);

		if (tournament) {
			const allIn = Globals.ctrl.settings.allInTourney;
			/* ||
			 balance <= 2 * bailout ||
			 this.confidence > 0.9 ||
			 (1 - this.confidence) * balance <= bailout;*/

			let conf = (this.confidence || 0.5);
			const confPrint = conf;
			if (!allIn && allowConfRescale) {
				conf = (conf - rangeConfidanceScale[0]) *
					(rangeTourneyScale[1] - rangeTourneyScale[0]) /
					(rangeConfidanceScale[1] - rangeConfidanceScale[0]) + rangeTourneyScale[0];
				conf = Math.max(rangeTourneyScale[0], conf);
			}
			amountToBet = allIn ? balance : Math.round(balance * (conf));

			let bailoutMessage = 0;
			if (amountToBet < bailout) {
				bailoutMessage = amountToBet;
				amountToBet = bailout;
			}
			if (amountToBet > balance) {
				amountToBet = balance;
			}
			if (debug) {
				if (allIn) {
					console.log(`- ALL IN: ${balance}`);
				}
				else if (bailoutMessage !== 0) {
					console.log(`- amount is less than bailout (${bailoutMessage}), betting bailout: ${amountToBet}`);
				}
				else if (this.confidence) {
					console.log(`- betting: ${balance} x(cf(${(confPrint * 100).toFixed(2)})=${(conf * 100).toFixed(2)}%) = ${amountToBet}`);
				}
				else {
					console.log(`- betting: ${balance} x  50%) = ${amountToBet}`);
				}
			}
		} else if (!this.lowBet) {
			amountToBet = Math.round(balance * simBettingLimitScale * this.confidence);
			if (amountToBet > balance * simBettingLimitScale) {
				amountToBet = Math.round(balance * simBettingLimitScale);
			}
			if (amountToBet < bailout) {
				if (debug) {
					console.log(`- amount is less than bailout (${amountToBet}), betting bailout: ${bailout}`);
				}
				amountToBet = bailout;
			} else if (debug) {
				console.log(`- betting: ${balance} x .10 =(${(balance * simBettingLimitScale)}) x cf(${(this.confidence * 100).toFixed(2)}%) = ${amountToBet}`);
			}
		} else {
			const p05 = Math.ceil(balance * lowBettingScale);
			const cb = Math.ceil(balance * this.confidence);
			amountToBet = (p05 < cb) ? p05 : cb;
			if (amountToBet < bailout) {
				amountToBet = bailout;
			}
			if (debug) {
				console.log(`- betting without confidence: ${amountToBet}`);
			}
		}
		return amountToBet;
	}

	abstract execute(info: { character1: Character; character2: Character; matches: MatchRecord[] }): string;
}

export class CoinToss extends Strategy {
	constructor() {
		super("ct");
	}

	execute(info: { character1: Character; character2: Character; matches: MatchRecord[] }): string {
		const c1 = info.character1;
		const c2 = info.character2;
		this.prediction = (Math.random() > .5) ? c1.name : c2.name;
		return this.prediction;
	}
}

export class Cowboy extends Strategy {
	constructor() {
		super("rc");
	}

	execute(info: { character1: Character; character2: Character; matches: MatchRecord[] }): string {
		const c1 = info.character1;
		const c2 = info.character2;
		const c1TotalMatches = c1.wins.length + c1.losses.length;
		const c2TotalMatches = c2.wins.length + c2.losses.length;
		let p: string;

		if (c1TotalMatches < 3 || c2TotalMatches < 3) {
			if (this.debug) {
				console.log(`- Cowboy has insufficient information, W:L(P1)(P2)->  (${c1.wins.length}:${c1.losses.length})(${c2.wins.length}:${c2.losses.length})`);
			}
			this.abstain = true;
			this.lowBet = true;
			return null;
		}
		const c1Ratio = (c1TotalMatches) ? c1.wins.length / c1TotalMatches : 0;
		const c2Ratio = (c2TotalMatches) ? c2.wins.length / c2TotalMatches : 0;

		if (c1Ratio !== c2Ratio && c1Ratio > 0 && c2Ratio > 0) {
			c1.ratio = c1Ratio;
			c2.ratio = c2Ratio;
			const pChar = (c1.ratio > c2.ratio) ? c1 : c2;
			const npChar = (c1.ratio < c2.ratio) ? c1 : c2;
			//confidence score
			this.confidence = (pChar.name === c1.name) ? c1Ratio - c2Ratio : c2Ratio - c1Ratio;
			this.confidence += 0.5;
			if (this.confidence > 1) { this.confidence = 1; }
			if (this.confidence < 0.6) {
				if (this.debug) {
					console.log(`- Cowboy has insufficient confidence (confidence: ${this.confidence.toFixed(2)}), W:L(P1)(P2)-> (${c1.wins.length}:${c1.losses.length})(${c2.wins.length}:${c2.losses.length})`);
				}
				this.abstain = true;
				this.lowBet = true;
				return null;
			}
			if (pChar.ratio <= 0.5 || (npChar.ratio === 0.5 && (npChar.wins.length + npChar.losses.length === 2))) {
				if (this.debug) {
					console.log(`- Cowboy discourages betting on or against <51% (${(c1Ratio * 100).toFixed(2)}% : ${(c2Ratio * 100).toFixed(2)}%)`);
				}
				this.abstain = true;
				this.lowBet = true;
				return null;
			}
			p = pChar.name;
			if (this.debug) {
				console.log(`- ${p} has a better win percentage (${(c1Ratio * 100).toFixed(2)}% : ${(c2Ratio * 100).toFixed(2)}%)`);
				console.log(`- Betting on ${p} confidence: ${this.confidence.toFixed(2)}`);
			}

			this.prediction = p;
			return p;
		} else {
			if (this.debug) {
				console.log(`- Cowboy has insufficient information (${(c1Ratio * 100).toFixed(2)}% : ${(c2Ratio * 100).toFixed(2)}%)`);
			}
			this.abstain = true;
			this.lowBet = true;
			return null;
		}
	}
}

export class Chromosome {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;

	//confidence weights
	oddsWeight = 0.5;
	timeAveWin = 1;	//.timeWeight  =  1;
	timeAveLose = 1;
	winPercentageWeight = 1;
	crowdFavorWeight = 0.5;
	illumFavorWeight = 0.5;
	// tier scoring
	wX = 1;
	wS = 1;
	wA = 1;
	wB = 1;
	wP = 1;
	wU = 1;
	lX = 1;
	lS = 1;
	lA = 1;
	lB = 1;
	lP = 1;
	lU = 1;
	// odds weights
	oX = 1;
	oS = 1;
	oA = 1;
	oB = 1;
	oP = 1;
	oU = 1;
	// times weights
	wtX = 1;
	wtS = 1;
	wtA = 1;
	wtB = 1;
	wtP = 1;
	wtU = 1;
	ltX = 1;
	ltS = 1;
	ltA = 1;
	ltB = 1;
	ltP = 1;
	ltU = 1;
	rank: number;

	randomize(): Chromosome {
		for (const prop in this) {
			if (this.hasOwnProperty(prop) && prop !== "rank") {
				let newValue = Math.random();
				if (newValue < 0.0001) {
					newValue = 0.01;
				}
				(this[prop] as number) = newValue;
			}
		}

		this.normalize();
		this.rank = null;
		return this;
	}

	normalize(): Chromosome {
		let sum = 0;
		for (const prop in this) {
			if (this.hasOwnProperty(prop) && prop !== "rank") {
				if (this[prop] < 0.0001) {
					(this[prop] as number) = 0.01;
				}
				sum += Number(this[prop]);
			}
		}
		for (const prop in this) {
			if (this.hasOwnProperty(prop) && prop !== "rank") {
				(this[prop] as number) /= (sum * 0.01);
			}
		}
		return this;
	}

	loadFromJSON(json: string): Chromosome {
		const copy = (JSON.parse(json) as Chromosome);
		for (const prop in copy) {
			if (this.hasOwnProperty(prop)) {
				this[prop] = Number(copy[prop]);
			}
		}
		return this;
	}

	loadFromObject(obj: Chromosome): Chromosome {
		for (const prop in obj) {
			if (this.hasOwnProperty(prop)) {
				this[prop] = Number(obj[prop]);
			}
		}
		return this;
	}

	toDisplayString(): string {
		let results = "-\nchromosome:";
		for (const i in this) {
			if (typeof this[i] !== "function") {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				results += `\n${i} : ${this[i]}`;
			}
		}
		return results;
	}

	mate(other: Chromosome): Chromosome {
		const offspring = new Chromosome();
		const parentSplitChance = 0.625;	// gene from parents chance. This can be higher, Assuming left P is higher score dominate.
		const mutationScale = 2;	// range (0, +inf), too low, results will be dominated by parents' original weights crossing; too high, sim. cannot refine good values.
		const mutationChance = 0.1;	// range [0,1]
		const smallVal = 0.000001;
		for (const i in offspring) {
			if (typeof offspring[i] === "number" && i !== "rank") {
				(offspring[i] as number) = ((Math.random() < parentSplitChance) ? this[i] : other[i]) as number;
				const radiation = (Math.random() - 0.5) * 2.0;
				let change = radiation * mutationScale;
				if (Math.abs(change) < smallVal) {
					change = smallVal;
				}
				if ((Math.random() < mutationChance) && (offspring[i] != null)) {
					offspring[i] += change;
				}
				if (Math.abs(offspring[i]) < smallVal) {
					offspring[i] = smallVal;
				}
			}
		}
		offspring.normalize();
		return offspring;
	}

	// note, test equals for floats...
	equals(other: Chromosome): boolean {
		let anyDifference = false;
		for (const i in other) {
			if (typeof other[i] !== "function") {
				if (this[i] !== other[i]) {
					anyDifference = true;
				}
			}
		}
		return !anyDifference;
	}

}

// scores character stats by chromosome. Does not score everything, Eg) differances of both characters stats are scored later.
class CSStats {
	oddsSum = 0;
	oddsCount = 0;
	winTimesTotal = 0;
	winTimesTotalRaw = 0; // "Raw" for display message, unweighted
	lossTimesTotal = 0;
	lossTimesTotalRaw = 0;
	timedWonMatchesCount = 0;
	timedLostMatchesCount = 0;
	wins = 0;
	losses = 0;
	averageOdds: number = null;
	averageWinTime: number = null;
	averageWinTimeRaw: number = null;
	averageLossTime: number = null;
	averageLossTimeRaw: number = null;
	cfPercent: number = null;
	ifPercent: number = null;
	totalFights: number;

	constructor(cObj: Character, chromosome: Chromosome) {

		this.totalFights = cObj.totalFights.length;

		for (const win of cObj.wins) {
			this.wins += chromosome[`w${win}`];
		}

		for (const loss of cObj.losses) {
			this.losses += chromosome[`l${loss}`];
		}

		for (let i = 0; i < cObj.odds.length; i++) {
			if (cObj.odds[i] >= 0) {
				this.oddsSum += cObj.odds[i] * chromosome[`o${cObj.tiers[i]}`];
				this.oddsCount += 1;
			}
		}
		this.averageOdds = (this.oddsCount !== 0) ? this.oddsSum / this.oddsCount : null;
		//
		for (let j = 0; j < cObj.winTimes.length; j++) {
			if (cObj.winTimes[j] !== 0) {
				this.winTimesTotal += cObj.winTimes[j] * chromosome[`wt${cObj.wins[j]}`];
				this.winTimesTotalRaw += cObj.winTimes[j];
				this.timedWonMatchesCount += 1;
			}
		}
		this.averageWinTime = (this.winTimesTotal !== 0) ? this.winTimesTotal / this.timedWonMatchesCount : null;
		this.averageWinTimeRaw = (this.winTimesTotal !== 0) ? this.winTimesTotalRaw / this.timedWonMatchesCount : null;

		for (let k = 0; k < cObj.lossTimes.length; k++) {
			if (cObj.lossTimes[k] !== 0) {
				this.lossTimesTotal += cObj.lossTimes[k] * chromosome[`lt${cObj.losses[k]}`];
				this.lossTimesTotalRaw += cObj.lossTimes[k];
				this.timedLostMatchesCount += 1;
			}
		}
		this.averageLossTime = (this.lossTimesTotal !== 0) ? this.lossTimesTotal / this.timedLostMatchesCount : null;
		this.averageLossTimeRaw = (this.lossTimesTotal !== 0) ? this.lossTimesTotalRaw / this.timedLostMatchesCount : null;

		// expert opinion section
		if (cObj.crowdFavor.length > 0) {
			let cfSum = 0;
			for (const cf of cObj.crowdFavor) {
				cfSum += cf;
			}
			this.cfPercent = cfSum / cObj.crowdFavor.length;
		}
		if (cObj.illumFavor.length > 0) {
			let ifSum = 0;
			for (const illumF of cObj.illumFavor) {
				ifSum += illumF;
			}
			this.ifPercent = ifSum / cObj.illumFavor.length;
		}
	}
}

export class Scientist extends Strategy {
	private chromosome: Chromosome;

	constructor(chromosome: Chromosome, level = 0) {
		super("cs");
		this.confidence = null;
		this.chromosome = chromosome;
		this.level = level;
	}

	getBetAmount(balance: number, tournament: boolean, debug: boolean): number {
		if (tournament) {
			return super.getBetAmount(balance, tournament, debug);
		}
		return super.flatBet(balance);
	}

	execute(info: { character1: Character; character2: Character; matches: MatchRecord[] }): string {
		const c1 = info.character1;
		const c2 = info.character2;

		const oddsWeight = this.chromosome.oddsWeight;
		const timeAveWinWeight = this.chromosome.timeAveWin;
		const timeAveLoseWeight = this.chromosome.timeAveLose;
		const winPercentageWeight = this.chromosome.winPercentageWeight;
		const crowdFavorWeight = this.chromosome.crowdFavorWeight;
		const illumFavorWeight = this.chromosome.illumFavorWeight;

		// messages
		let oddsMessage: string = null;
		let timeMessage: string = null;
		let winsMessage: string = null;
		let crwdMessage: string = null;
		let ilumMessage: string = null;

		// the weights come in from the chromosome
		const scoreBase = 0.001;      // range (0,0.5], prevents over-confidence.
		let c1Score = scoreBase;
		let c2Score = scoreBase;

		//
		const c1Stats = new CSStats(c1, this.chromosome);
		const c2Stats = new CSStats(c2, this.chromosome);

		// wins
		const c1WT = c1Stats.wins + c1Stats.losses;
		const c2WT = c2Stats.wins + c2Stats.losses;
		const c1WP = (c1WT !== 0) ? c1Stats.wins / c1WT : 0;
		const c2WP = (c2WT !== 0) ? c2Stats.wins / c2WT : 0;

		const wpTotal = c1Stats.wins + c2Stats.wins;
		const c1WPDisplay = wpTotal > 0 ? c1Stats.wins / wpTotal : 0;
		const c2WPDisplay = wpTotal > 0 ? c2Stats.wins / wpTotal : 0;
		if (this.debug) {
			winsMessage = "\xBB WINS/LOSSES:\n" +
				`weighted totals as % (red: blue) -> (${(c1WPDisplay * 100).toFixed(0)} : ${(c2WPDisplay * 100).toFixed(0)})\n` +
				`unweighted (red W:L)(blue W:L) -> (${c1.wins.length}:${c1.losses.length})(${c2.wins.length}:${c2.losses.length})\n` +
				`details (red W:L)(blue W:L) -> (${c1.wins.toString().replace(/,/g, "")}:${c1.losses.toString().replace(/,/g, "")})` +
				`(${c2.wins.toString().replace(/,/g, "")}:${c2.losses.toString().replace(/,/g, "")})`;
		}
		// weight in win percent
		const wpSum = c1WP + c2WP;
		if (wpSum > 0) {
			c1Score += winPercentageWeight * c1WP / wpSum;
			c2Score += winPercentageWeight * c2WP / wpSum;
		}
		else {
			c1Score += winPercentageWeight * 0.5;
			c2Score += winPercentageWeight * 0.5;
		}

		if (c1Stats.averageOdds != null && c2Stats.averageOdds != null) {
			if (c1Stats.averageOdds > c2Stats.averageOdds) {
				c1Score += oddsWeight;
			}
			else if (c1Stats.averageOdds < c2Stats.averageOdds) {
				c2Score += oddsWeight;
			}

			if (this.debug) {
				oddsMessage = `avg odds (red:blue) -> (${c1Stats.averageOdds} : ${c2Stats.averageOdds})`;
			}
		}

		if (c1Stats.averageWinTime != null && c2Stats.averageWinTime != null) {
			if (c1Stats.averageWinTime < c2Stats.averageWinTime) {
				c1Score += timeAveWinWeight / 2;
			}
			else if (c1Stats.averageWinTime > c2Stats.averageWinTime) {
				c2Score += timeAveWinWeight / 2;
			}
			if (this.debug) {
				timeMessage = `avg win time (red:blue) -> (${c1Stats.averageWinTimeRaw.toFixed(0)} : ${c2Stats.averageWinTimeRaw.toFixed(0)})`;
			}
		}

		if (c1Stats.averageLossTime != null && c2Stats.averageLossTime != null) {
			if (c1Stats.averageLossTime > c2Stats.averageLossTime) {
				c1Score += timeAveLoseWeight / 2;
			}
			else if (c1Stats.averageLossTime < c2Stats.averageLossTime) {
				c2Score += timeAveLoseWeight / 2;
			}
			if (this.debug) {
				const msg = `  ::  avg loss time (red:blue) -> (${c1Stats.averageLossTimeRaw.toFixed(0)} : ${c2Stats.averageLossTimeRaw.toFixed(0)})`;
				if (timeMessage) {
					timeMessage += msg;
				}
				else {
					timeMessage = msg;
				}
			}
		}

		if (c1Stats.cfPercent != null && c2Stats.cfPercent != null) {
			if (c1Stats.cfPercent > c2Stats.cfPercent) {
				c1Score += crowdFavorWeight;
			}
			else if (c1Stats.cfPercent < c2Stats.cfPercent) {
				c2Score += crowdFavorWeight;
			}
			const cfPercentTotal = c1Stats.cfPercent + c2Stats.cfPercent;
			if (this.debug) {
				crwdMessage = `crowd favor (red:blue) -> (${(c1Stats.cfPercent / cfPercentTotal * 100).toFixed(0)}` +
					` : ${(c2Stats.cfPercent / cfPercentTotal * 100).toFixed(0)})`;
			}
		}

		if (c1Stats.ifPercent != null && c2Stats.ifPercent != null) {
			if (c1Stats.ifPercent > c2Stats.ifPercent) {
				c1Score += illumFavorWeight;
			}
			else if (c1Stats.ifPercent < c2Stats.ifPercent) {
				c2Score += illumFavorWeight;
			}
			const ifPercentTotal = c1Stats.ifPercent + c2Stats.ifPercent;
			if (this.debug) {
				ilumMessage = `illuminati favor (red:blue) -> (${(c1Stats.ifPercent / ifPercentTotal * 100).toFixed(0)}` +
					` : ${(c2Stats.ifPercent / ifPercentTotal * 100).toFixed(0)})`;
			}
		}

		if (this.debug) {
			console.log("\n");
			console.log(`\xBB PREDICTION STATS for (${c1.name} VS ${c2.name}) \xBB`);
			console.log(winsMessage);
			let line2 = "\xBB ";
			if (oddsMessage) { line2 += oddsMessage; }
			if (timeMessage) { line2 += "  ::  " + timeMessage; }
			if (line2.length > 2) { console.log(line2); }
			let line3 = "\xBB ";
			if (crwdMessage) { line3 += crwdMessage; }
			if (ilumMessage) { line3 += "  ::  " + ilumMessage; }
			if (line3.length > 2) { console.log(line3); }
		}

		// final decision

		// figure out prediction, confidence
		this.prediction = (c1Score > c2Score) ? c1.name : c2.name;

		const winnerPoints = (this.prediction === c1.name) ? c1Score : c2Score;
		const totalAvailablePoints = c1Score + c2Score;
		this.confidence = winnerPoints / totalAvailablePoints;

		/*---------------------------------------------------------------------------------------------------*/
		// CONFIDENCE ADJUSTMENT SECTION
		/*---------------------------------------------------------------------------------------------------*/
		const nerfPoorScore = 0.66;
		let nerfAmount = 0;
		let nerfMsg = "-- PROBLEMS:";
		if ((c1Score === c2Score) || c1.wins.length + c1.losses.length <= 3 || c2.wins.length + c2.losses.length <= 3 || c1.wins.length === 0 || c2.wins.length === 0) {
			nerfAmount += nerfPoorScore;
			nerfMsg += `\n- insufficient information (scores: ${c1Score.toFixed(2)}:${c2Score.toFixed(2)}), W:L(P1)(P2)-> (${c1.wins.length}:${c1.losses.length})(${c2.wins.length}:${c2.losses.length}), `;
		}

		// nerf the confidence if there is a reason
		if (nerfAmount !== 0) {
			if (this.debug) {
				console.log(`${nerfMsg}\n--> dropping confidence by ${(nerfAmount * 100).toFixed(0)}%`);
			}
			this.confidence *= 1 - nerfAmount;
		}

		// make sure something gets bet
		if (this.confidence <= 0) {
			this.confidence = .01;
		}

		if (this.debug) {
			console.log(`::Predicting: ${this.prediction}\n::confidence: ${this.confidence.toFixed(4)}\n`);
		}
		return this.prediction;
	}
}

export class Lunatic extends Strategy {
	private ct: CoinToss;

	constructor(level = 0) {
		super("ipu");
		this.debug = true;
		this.ct = new CoinToss();
		// even though it doesn't use it, it needs confidence so as to be marked as new
		this.confidence = 1;
		this.level = level;
	}

	execute(info: { character1: Character; character2: Character; matches: MatchRecord[] }): string {
		this.prediction = this.ct.execute(info);
		return this.prediction;
	}

	getBetAmount(balance: number, tournament: boolean, debug: boolean): number {
		if (tournament) {
			return super.getBetAmount(balance, tournament, debug);
		}
		return super.flatBet(balance);
	}
}

export class Observer extends Strategy {
	constructor() {
		super("obs");
	}

	execute(_info: { character1: Character; character2: Character; matches: MatchRecord[] }): string {
		if (this.debug) {
			console.log("- Monk does not bet");
		}
		this.abstain = true;
		return null;
	}
}
