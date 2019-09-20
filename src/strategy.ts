abstract class Strategy {
	public btnP1;
	public btnP2;
	public p1name: string;
	public p2name: string;
	public strategyName: string;
	public prediction;
	public debug: boolean;
	public levels: number[][];
	public lowBet: boolean;
	public level: number;
	public confidence: number;
	public abstain: boolean;
	public aggro: boolean;

	constructor(strategyName: string) {
		this.btnP1 = $("#player1")[0];
		this.btnP2 = $("#player2")[0];
		this.p1name = this.btnP1.getAttribute("value").replace(/,/g, "_");
		this.p2name = this.btnP2.getAttribute("value").replace(/,/g, "_");
		this.strategyName = strategyName;
		this.prediction = null;
		this.debug = true;
		this.levels = [[0, 1000, 0],
		[1000, 10000, 1],
		[10000, 100000, 10],
		[100000, 500000, 25],
		[500000, 1000000, 100],
		[1000000, 5000000, 250],
		[5000000, 20000000, 500]];
		this.lowBet = false;
	}

	public getBailout(tournament: boolean): number {
		const nameSpan = $("h2")[0].children[2];
		var isIlluminati = false;
		try { // the html is different for illuminati??
			isIlluminati = nameSpan && nameSpan.children[0].classList && nameSpan.children[0].classList.contains("goldtext");
		} catch (e) { // this is how it is for non-illums:
			isIlluminati = nameSpan && nameSpan.classList && nameSpan.classList.contains("goldtext");
		}
		var level = 0;
		const rank = $("#rank")[0];
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

	public flatBet(balance: number): number {
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

	public adjustLevel(balance: number) {
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

	public getWinner(ss) {
		return ss.getWinner();
	}

	public getBetAmount(balance, tournament, debug) {
		const simBettingLimitScale = 0.1;
		const lowBettingScale = 0.01;
		const allowConfRescale = true;
		const rangeConfidanceScale = [0.52, 0.95];	// range of confidence scale, range [0.5, 1] (theses need not be exact)
		const rangeTourneyScale = [0.1, 0.45];			// range of tourney scale.
		if (!this.confidence) {
			this.confidence = 1;
		}

		let amountToBet;
		const bailout = this.getBailout(tournament);

		if (tournament) {
			const allIn = ctrl.settings.allInTourney;
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

			var bailoutMessage = 0;
			if (amountToBet < bailout) {
				bailoutMessage = amountToBet;
				amountToBet = bailout;
			}
			if (amountToBet > balance) {
				amountToBet = balance;
			}
			if (debug) {
				if (allIn) {
					console.log("- ALL IN: " + balance);
				}
				else if (bailoutMessage !== 0) {
					console.log("- amount is less than bailout (" + bailoutMessage + "), betting bailout: " + amountToBet);
				}
				else if (this.confidence) {
					console.log("- betting: " + balance + " x (cf(" + (confPrint * 100).toFixed(2) + ")=" + (conf * 100).toFixed(2) + "%) = " + amountToBet);
				}
				else {
					console.log("- betting: " + balance + " x  50%) = " + amountToBet);
				}
			}
		} else if (!(this.lowBet && this instanceof RatioConfidence)) {
			amountToBet = Math.round(balance * simBettingLimitScale * this.confidence);
			if (amountToBet > balance * simBettingLimitScale) {
				amountToBet = Math.round(balance * simBettingLimitScale);
			}
			if (amountToBet < bailout) {
				if (debug) {
					console.log("- amount is less than bailout (" + amountToBet + "), betting bailout: " + bailout);
				}
				amountToBet = bailout;
			} else if (debug) {
				console.log("- betting: " + balance + " x .10 =(" + (balance * simBettingLimitScale) + ") x cf(" + (this.confidence * 100).toFixed(2) + "%) = " + amountToBet);
			}
		} else {
			const p05 = Math.ceil(balance * lowBettingScale);
			const cb = Math.ceil(balance * this.confidence);
			amountToBet = (p05 < cb) ? p05 : cb;
			if (amountToBet < bailout) {
				amountToBet = bailout;
			}
			if (debug) {
				console.log("- betting without confidence: " + amountToBet);
			}
		}
		return amountToBet;
	}

	public abstract execute(info): string;
}

class CoinToss extends Strategy {
	constructor() {
		super("ct");
		this.abstain = false;
	}

	public execute(info): string {
		const c1 = info.character1;
		const c2 = info.character2;
		this.prediction = (Math.random() > .5) ? c1.name : c2.name;
		return this.prediction;
	}
}

var formatString = function(s, len) {
	while (s.length < len) {
		s += " ";
	}
	return s.substring(0, len);
};

class RatioConfidence extends Strategy {
	constructor() {
		super("rc");
		this.abstain = false;
	}

	public execute(info): string {
		const self = this;
		const c1 = info.character1;
		const c2 = info.character2;
		const c1TotalMatches = c1.wins.length + c1.losses.length;
		const c2TotalMatches = c2.wins.length + c2.losses.length;
		let p;

		if (c1TotalMatches < 3 || c2TotalMatches < 3) {
			if (this.debug) {
				console.log("- Cowboy has insufficient information, W:L(P1)(P2)->  (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")");
			}
			self.abstain = true;
			self.lowBet = true;
			return null;
		}
		const c1Ratio = (c1TotalMatches) ? c1.wins.length / c1TotalMatches : 0;
		const c2Ratio = (c2TotalMatches) ? c2.wins.length / c2TotalMatches : 0;

		if (c1Ratio !== c2Ratio) {
			c1.ratio = c1Ratio;
			c2.ratio = c2Ratio;
			const pChar = (c1.ratio > c2.ratio) ? c1 : c2;
			const npChar = (c1.ratio < c2.ratio) ? c1 : c2;
			//confidence score
			self.confidence = (pChar.name === c1.name) ? c1Ratio - c2Ratio : c2Ratio - c1Ratio;
			self.confidence += 0.5;
			if (self.confidence > 1) { self.confidence = 1; }
			if (self.confidence < 0.6) {
				if (this.debug) {
					console.log("- Cowboy has insufficient confidence (confidence: " + self.confidence.toFixed(2) + "), W:L(P1)(P2)-> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")");
				}
				self.abstain = true;
				self.lowBet = true;
				return null;
			}
			if (pChar.ratio <= 0.5 || (npChar.ratio === 0.5 && (npChar.wins.length + npChar.losses.length === 2))) {
				if (this.debug) {
					console.log("- Cowboy discourages betting on or against <51% (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%)");
				}
				self.abstain = true;
				self.lowBet = true;
				return null;
			}
			p = pChar.name;
			if (this.debug) {
				console.log("- " + p + " has a better win percentage (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%); RB betting " + p + " confidence: " + self.confidence.toFixed(2));
			}
			self.prediction = p;
			return p;
		} else if (c1Ratio === c2Ratio) {
			if (this.debug) {
				console.log("- Cowboy has insufficient information (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%)");
			}
			self.abstain = true;
			self.lowBet = true;
			return null;
		}
	}
}

class Chromosome {
	//confidence weights
	public oddsWeight: number = 0.5;
	public timeAveWin: number = 1;	//public .timeWeight  =  1;
	public timeAveLose: number = 1;
	public winPercentageWeight: number = 1;
	public crowdFavorWeight: number = 0.5;
	public illumFavorWeight: number = 0.5;
	// tier scoring
	public wX: number = 1;
	public wS: number = 1;
	public wA: number = 1;
	public wB: number = 1;
	public wP: number = 1;
	public wU: number = 1;
	public lX: number = 1;
	public lS: number = 1;
	public lA: number = 1;
	public lB: number = 1;
	public lP: number = 1;
	public lU: number = 1;
	// odds weights
	public oX: number = 1;
	public oS: number = 1;
	public oA: number = 1;
	public oB: number = 1;
	public oP: number = 1;
	public oU: number = 1;
	// times weights
	public wtX: number = 1;
	public wtS: number = 1;
	public wtA: number = 1;
	public wtB: number = 1;
	public wtP: number = 1;
	public wtU: number = 1;
	public ltX: number = 1;
	public ltS: number = 1;
	public ltA: number = 1;
	public ltB: number = 1;
	public ltP: number = 1;
	public ltU: number = 1;

	public randomize(): Chromosome {
		for (const prop in this) {
			if (this.hasOwnProperty(prop)) {
				(this[prop] as any) = Math.random();
				if ((this[prop] as any) < 0.0001) {
					(this[prop] as any) = 0.01;
				}
			}
		}

		this.normalize();
		return this;
	}

	public normalize(): Chromosome {
		var sum = 0;
		for (const el in this) {
			if (this.hasOwnProperty(el)) {
				if (Number(this[el]) < 0) {
					(this[el] as any) = 0.01;
				}
				sum += Number(this[el]);
			}
		}
		for (const el in this) {
			if (this.hasOwnProperty(el)) {
				(this[el] as any) /= (sum * 0.01);
			}
		}
		return this;
	}

	public loadFromJSON(json: string): Chromosome {
		const copy = JSON.parse(json);
		for (const i in copy) {
			if (this.hasOwnProperty(i)) {
				this[i] = Number(copy[i]);
			}
		}
		return this;
	}

	public loadFromObject(obj): Chromosome {
		for (const i in obj) {
			if (this.hasOwnProperty(i)) {
				this[i] = Number(obj[i]);
			}
		}
		return this;
	}

	public toDisplayString(): string {
		var results = "-\nchromosome:";
		for (const i in this) {
			if (typeof this[i] !== "function") {
				results += "\n" + i + " : " + this[i];
			}
		}
		return results;
	}

	public mate(other: Chromosome) {
		const offspring = new Chromosome();
		const parentSplitChance = 0.625;	// gene from parents chance. This can be higher, Assuming left P is higher score dominate.
		const mutationScale = 2;	// range (0, +inf), too low, results will be dominated by parents' original weights crossing; too high, sim. cannot refine good values.
		const mutationChance = 0.1;	// range [0,1]
		const smallVal = 0.000001;
		for (const i in offspring) {
			if (typeof offspring[i] !== "function") {
				offspring[i] = (Math.random() < parentSplitChance) ? this[i] : other[i];
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
	public equals(other) {
		let anyDifference: boolean = false;
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
var CSStats = function(cObj, chromosome) {
	var oddsSum = 0;
	var oddsCount = 0;
	var winTimesTotal = 0;
	var winTimesTotalRaw = 0; // "Raw" for display message, unweighted
	var lossTimesTotal = 0;
	var lossTimesTotalRaw = 0;
	var timedWonMatchesCount = 0;
	var timedLostMatchesCount = 0;
	this.wins = 0;
	this.losses = 0;
	this.averageOdds = null;
	this.averageWinTime = null;
	this.averageWinTimeRaw = null;
	this.averageLossTime = null;
	this.averageLossTimeRaw = null;
	this.cfPercent = null;
	this.ifPercent = null;

	this.totalFights = cObj.totalFights.length;

	for (const win of cObj.wins) {
		this.wins += chromosome["w" + win];
	}

	for (const loss of cObj.losses) {
		this.losses += chromosome["l" + loss];
	}

	for (let i = 0; i < cObj.odds.length; i++) {
		if (cObj.odds[i] >= 0) {
			oddsSum += cObj.odds[i] * chromosome["o" + cObj.tiers[i]];
			oddsCount += 1;
		}
	}
	this.averageOdds = (oddsCount !== 0) ? oddsSum / oddsCount : null;
	//
	for (let j = 0; j < cObj.winTimes.length; j++) {
		if (cObj.winTimes[j] !== 0) {
			winTimesTotal += cObj.winTimes[j] * chromosome["wt" + cObj.wins[j]];
			winTimesTotalRaw += cObj.winTimes[j];
			timedWonMatchesCount += 1;
		}
	}
	this.averageWinTime = (winTimesTotal !== 0) ? winTimesTotal / timedWonMatchesCount : null;
	this.averageWinTimeRaw = (winTimesTotal !== 0) ? winTimesTotalRaw / timedWonMatchesCount : null;

	for (let k = 0; k < cObj.lossTimes.length; k++) {
		if (cObj.lossTimes[k] !== 0) {
			lossTimesTotal += cObj.lossTimes[k] * chromosome["lt" + cObj.losses[k]];
			lossTimesTotalRaw += cObj.lossTimes[k];
			timedLostMatchesCount += 1;
		}
	}
	this.averageLossTime = (lossTimesTotal !== 0) ? lossTimesTotal / timedLostMatchesCount : null;
	this.averageLossTimeRaw = (lossTimesTotal !== 0) ? lossTimesTotalRaw / timedLostMatchesCount : null;

	// expert opinion section
	if (cObj.crowdFavor.length > 0) {
		var cfSum = 0;
		for (const cf of cObj.crowdFavor) {
			cfSum += cf;
		}
		this.cfPercent = cfSum / cObj.crowdFavor.length;
	}
	if (cObj.illumFavor.length > 0) {
		var ifSum = 0;
		for (const illumF of cObj.illumFavor) {
			ifSum += illumF;
		}
		this.ifPercent = ifSum / cObj.illumFavor.length;
	}
};

class ConfidenceScore extends Strategy {
	private chromosome;
	private lastMatchCumulativeBetTotal;

	constructor(chromosome, level = 0, lastMatchCumulativeBetTotal = 0) {
		super("cs");
		this.abstain = false;
		this.confidence = null;
		this.chromosome = chromosome;
		this.level = level;
		this.lastMatchCumulativeBetTotal = lastMatchCumulativeBetTotal;
	}

	public getBetAmount(balance, tournament, debug) {
		if (tournament) {
			return super.getBetAmount(balance, tournament, debug);
		}
		return super.flatBet(balance);
	}

	public execute(info): string {
		const c1 = info.character1;
		const c2 = info.character2;
		//
		const oddsWeight = this.chromosome.oddsWeight;
		const timeAveWinWeight = this.chromosome.timeAveWin;
		const timeAveLoseWeight = this.chromosome.timeAveLose;
		const winPercentageWeight = this.chromosome.winPercentageWeight;
		const crowdFavorWeight = this.chromosome.crowdFavorWeight;
		const illumFavorWeight = this.chromosome.illumFavorWeight;
		const totalWeight = oddsWeight + timeAveWinWeight + timeAveLoseWeight + winPercentageWeight + crowdFavorWeight + illumFavorWeight;

		// messages
		let oddsMessage = null;
		let timeMessage = null;
		let winsMessage = null;
		let crwdMessage = null;
		let ilumMessage = null;
		const messagelength = 15;

		// the weights come in from the chromosome
		const scoreBase = 0.001;      // range (0,0.5], prevents over-confidence.
		let c1Score = scoreBase;
		let c2Score = scoreBase;

		//
		const c1Stats = new CSStats(c1, this.chromosome);
		const c2Stats = new CSStats(c2, this.chromosome);

		// wins
		const winsPTemper = 0.5;
		const c1WT = c1Stats.wins + c1Stats.losses;
		const c2WT = c2Stats.wins + c2Stats.losses;
		const c1WP = (c1WT !== 0) ? c1Stats.wins / c1WT : 0;
		const c2WP = (c2WT !== 0) ? c2Stats.wins / c2WT : 0;

		const wpTotal = c1Stats.wins + c2Stats.wins;
		const c1WPDisplay = wpTotal > 0 ? c1Stats.wins / wpTotal : 0;
		const c2WPDisplay = wpTotal > 0 ? c2Stats.wins / wpTotal : 0;
		if (this.debug) {
			winsMessage = "\xBB WINS/LOSSES:     weighted totals as % (red:blue) -> (" + (c1WPDisplay * 100).toFixed(0) + " : " + (c2WPDisplay * 100).toFixed(0) + ")" +
				"  ::  unweighted (red W:L)(blue W:L) -> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")" +
				"  ::  details (red W:L)(blue W:L) -> (" + c1.wins.toString().replace(/,/g, "") + ":" + c1.losses.toString().replace(/,/g, "") + ")" +
				"(" + c2.wins.toString().replace(/,/g, "") + ":" + c2.losses.toString().replace(/,/g, "") + ")";
		}
		// weight in win percent
		const WPSum = c1WP + c2WP;
		if (WPSum > 0) {
			c1Score += winPercentageWeight * c1WP / WPSum;
			c2Score += winPercentageWeight * c2WP / WPSum;
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
				oddsMessage = "avg odds (red:blue) -> (" + formatString(c1Stats.averageOdds + " : " + c2Stats.averageOdds, messagelength) + ")";
			}
		}

		if (c1Stats.averageWinTime != null && c2Stats.averageWinTime != null) {
			if (c1Stats.averageWinTime < c2Stats.averageWinTime) {
				c1Score += timeAveWinWeight / 2;
			}
			else if (c1Stats.averageWinTime > c2Stats.averageWinTime) {
				c2Score += timeAveWinWeight / 2;
			}
			if (this.debug) { timeMessage = "avg win time (red:blue) -> (" + formatString(c1Stats.averageWinTimeRaw.toFixed(0) + " : " + c2Stats.averageWinTimeRaw.toFixed(0), messagelength) + ")"; }
		}

		if (c1Stats.averageLossTime != null && c2Stats.averageLossTime != null) {
			if (c1Stats.averageLossTime > c2Stats.averageLossTime) {
				c1Score += timeAveLoseWeight / 2;
			}
			else if (c1Stats.averageLossTime < c2Stats.averageLossTime) {
				c2Score += timeAveLoseWeight / 2;
			}
			if (this.debug) {
				const msg = "  ::  avg loss time (red:blue) -> (" + formatString(c1Stats.averageLossTimeRaw.toFixed(0) + " : " + c2Stats.averageLossTimeRaw.toFixed(0), messagelength) + ")";
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
				crwdMessage = "crowd favor (red:blue) -> (" + formatString((c1Stats.cfPercent / cfPercentTotal * 100).toFixed(0) +
					" : " + (c2Stats.cfPercent / cfPercentTotal * 100).toFixed(0), messagelength) + ")";
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
				ilumMessage = "illuminati favor (red:blue) -> (" + formatString((c1Stats.ifPercent / ifPercentTotal * 100).toFixed(0) +
					" : " + (c2Stats.ifPercent / ifPercentTotal * 100).toFixed(0), messagelength) + ")";
			}
		}

		if (this.debug) {
			console.log("\n");
			console.log("\xBB PREDICTION STATS for (" + c1.name + " VS " + c2.name + ") \xBB");
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
		this.confidence = ((winnerPoints / totalAvailablePoints));

		/*---------------------------------------------------------------------------------------------------*/
		// CONFIDENCE ADJUSTMENT SECTION
		/*---------------------------------------------------------------------------------------------------*/
		const nerfPoorScore = 0.66;
		let nerfAmount = 0;
		let nerfMsg = "-- PROBLEMS:";
		if ((c1Score === c2Score) || c1.wins.length + c1.losses.length <= 3 || c2.wins.length + c2.losses.length <= 3 || c1.wins.length === 0 || c2.wins.length === 0) {
			nerfAmount += nerfPoorScore;
			nerfMsg += "\n- insufficient information (scores: " + c1Score.toFixed(2) + ":" + c2Score.toFixed(2) + "), W:L(P1)(P2)-> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), ";
		}

		// nerf the confidence if there is a reason
		if (nerfAmount !== 0) {
			if (this.debug) {
				console.log(nerfMsg + "\n--> dropping confidence by " + (nerfAmount * 100).toFixed(0) + "%");
			}
			this.confidence *= 1 - nerfAmount;
		}

		// make sure something gets bet
		if (this.confidence <= 0) {
			this.confidence = .01;
		}

		if (this.debug) {
			console.log("::Predicting: " + this.prediction + "\n::confidence: " + this.confidence.toFixed(4) + "\n");
		}
		return this.prediction;
	}
}

class InternetPotentialUpset extends Strategy {
	private ct: CoinToss;

	constructor(level = 0) {
		super("ipu");
		this.debug = true;
		this.ct = new CoinToss();
		// even though it doesn't use it, it needs confidence so as to be marked as new
		this.confidence = 1;
		this.level = level;
	}

	public execute(info): string {
		this.prediction = this.ct.execute(info);
		return this.prediction;
	}

	public getBetAmount(balance, tournament, debug) {
		if (tournament) {
			return super.getBetAmount(balance, tournament, debug);
		}
		return super.flatBet(balance);
	}
}

class Observer extends Strategy {
	constructor() {
		super("obs");
		this.abstain = true;
	}

	public execute(info): string {
		if (this.debug) {
			console.log("- Monk does not bet");
		}
		this.abstain = true;
		return null;
	}
}
