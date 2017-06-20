var Strategy = function (sn) {
	this.btnP1 = $("#player1")[0];
	this.btnP2 = $("#player2")[0];
	this.p1name = this.btnP1.getAttribute("value").replace(/,/g, '_');
	this.p2name = this.btnP2.getAttribute("value").replace(/,/g, '_');
	this.strategyName = sn;
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
};
Strategy.prototype.getBailout = function (tournament) {
	var nameSpan = $("h2")[0].children[2];
	var isIlluminati = false;
	try { // the html is different for illuminati??
		isIlluminati = nameSpan && nameSpan.children[0].classList && nameSpan.children[0].classList.contains("goldtext");
	} catch (e) { // this is how it is for non-illums:
		isIlluminati = nameSpan && nameSpan.classList && nameSpan.classList.contains("goldtext");
	}
	var level = 0;
	var rank = $("#rank")[0];
	if (rank != null && rank.childNodes.length != 0) {
		var re = /rank([0-9]{1,2})\.png/g;
		var match = re.exec(rank.childNodes[0].src);
		level = parseInt(match[1]);
	}

	if (isIlluminati)
		return 3000 + level * 50;
	else if (tournament)
		return 1000 + level * 25;
	else
		return 100 + level * 25;
};
Strategy.prototype.flatBet = function (balance, debug) {
	var flatAmount = 100;
	var multiplierIndex = 2;
	var intendedBet = flatAmount * this.levels[this.level][multiplierIndex] * this.confidence;

	if (this.level == 0)
		return balance;
	else
		return Math.ceil(intendedBet);
};
Strategy.prototype.adjustLevel = function (balance) {
	if (!this.level)
		this.level = 0;
	//this.levels = [[0, 1000, 0], [1000, 10000, 1], [10000, 100000, 10], [100000, 500000, 25], [500000, 1000000, 100], [1000000, 5000000, 250]];
	var valley = 0;
	var peak = 1;
	var maxLv = this.levels.length - 1;
	var minLv = 0;
	var changed = false;
	do {
		changed = false;
		if (this.level + 1 <= maxLv && balance >= this.levels[this.level][peak]) {
			this.level += 1;
			changed = true;
			if (balance == this.levels[this.level][valley]) return;
		} else if (this.level - 1 >= minLv && balance <= this.levels[this.level][valley]) {
			this.level -= 1;
			changed = true;
		}
	} while (changed);
};
Strategy.prototype.getWinner = function (ss) {
	return ss.getWinner();
};
Strategy.prototype.getBetAmount = function (balance, tournament, debug) {
	var simBettingLimitScale = 0.1;
	var lowBettingScale = 0.01;
	var allowConfRescale = true;
	var rangeConfidanceScale = [0.52, 0.95];	// range of confidence scale, range [0.5, 1] (theses need not be exact)
	var rangeTourneyScale = [0.1, 0.45];			// range of tourney scale.
	if (!this.confidence)
		this.confidence = 1;

	var amountToBet;
	var bailout = this.getBailout(tournament);

	if (tournament) {
		var allIn = ctrl.settings.allInTourney;
		/* ||
		 balance <= 2 * bailout ||
		 this.confidence > 0.9 ||
		 (1 - this.confidence) * balance <= bailout;*/

		var conf = (this.confidence || 0.5);
		var confPrint = conf;
		if (allowConfRescale) {
			conf = ( conf - rangeConfidanceScale[0] ) *
				( rangeTourneyScale[1] - rangeTourneyScale[0] ) /
				( rangeConfidanceScale[1] - rangeConfidanceScale[0] ) + rangeTourneyScale[0];
			conf = Math.max(rangeTourneyScale[0], conf);
		}
		amountToBet = allIn ? balance : Math.round(balance * (conf));

		var bailoutMessage = 0;
		if (amountToBet < bailout) {
			bailoutMessage = amountToBet;
			amountToBet = bailout;
		}
		if (amountToBet > balance)
			amountToBet = balance;
		if (debug) {
			if (allIn)
				console.log("- ALL IN: " + balance);
			else if (bailoutMessage != 0)
				console.log("- amount is less than bailout (" + bailoutMessage + "), betting bailout: " + amountToBet);
			else if (this.confidence)
				console.log("- betting: " + balance + " x (cf(" + (confPrint * 100).toFixed(2) + ")=" + (conf * 100).toFixed(2) + "%) = " + amountToBet);
			else
				console.log("- betting: " + balance + " x  50%) = " + amountToBet);
		}
	} else if (!(this.lowBet && this instanceof RatioConfidence)) {
		amountToBet = Math.round(balance * simBettingLimitScale * this.confidence);
		if (amountToBet > balance * simBettingLimitScale)
			amountToBet = Math.round(balance * simBettingLimitScale);
		if (amountToBet < bailout) {
			if (debug)
				console.log("- amount is less than bailout (" + amountToBet + "), betting bailout: " + bailout);
			amountToBet = bailout;
		} else if (debug)
			console.log("- betting: " + balance + " x .10 =(" + (balance * simBettingLimitScale) + ") x cf(" + (this.confidence * 100).toFixed(2) + "%) = " + amountToBet);
	} else {
		var p05 = Math.ceil(balance * lowBettingScale);
		var cb = Math.ceil(balance * this.confidence);
		amountToBet = (p05 < cb) ? p05 : cb;
		if (amountToBet < bailout)
			amountToBet = bailout;
		if (debug)
			console.log("- betting without confidence: " + amountToBet);
	}
	return amountToBet;
};

var CoinToss = function () {
	Strategy.call(this, "ct");
};
var formatString = function (s, len) {
	while (s.length < len) {
		s += " ";
	}
	return s.substring(0, len);
};
CoinToss.prototype = Object.create(Strategy.prototype);
CoinToss.prototype.execute = function (info) {
	var c1 = info.character1;
	var c2 = info.character2;
	this.prediction = (Math.random() > .5) ? c1.name : c2.name;
	return this.prediction;
};

var RatioConfidence = function () {
	Strategy.call(this, "rc");
	this.abstain = false;
};
RatioConfidence.prototype = Object.create(Strategy.prototype);
RatioConfidence.prototype.execute = function (info) {
	var self = this;
	var c1 = info.character1;
	var c2 = info.character2;
	var c1TotalMatches = c1.wins.length + c1.losses.length;
	var c2TotalMatches = c2.wins.length + c2.losses.length;
	var p;

	if (c1TotalMatches < 3 || c2TotalMatches < 3) {
		if (this.debug)
			console.log("- Cowboy has insufficient information, W:L(P1)(P2)->  (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")");
		self.abstain = true;
		self.lowBet = true;
		return null;
	}
	var c1Ratio = (c1TotalMatches) ? c1.wins.length / c1TotalMatches : 0;
	var c2Ratio = (c2TotalMatches) ? c2.wins.length / c2TotalMatches : 0;

	if (c1Ratio != c2Ratio) {
		c1.ratio = c1Ratio;
		c2.ratio = c2Ratio;
		var pChar = (c1.ratio > c2.ratio) ? c1 : c2;
		var npChar = (c1.ratio < c2.ratio) ? c1 : c2;
		//confidence score
		self.confidence = (pChar.name == c1.name) ? c1Ratio - c2Ratio : c2Ratio - c1Ratio;
		self.confidence += 0.5;
		if (self.confidence > 1)self.confidence = 1;
		if (self.confidence < 0.6) {
			if (this.debug)
				console.log("- Cowboy has insufficient confidence (confidence: " + self.confidence.toFixed(2) + "), W:L(P1)(P2)-> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")");
			self.abstain = true;
			self.lowBet = true;
			return null;
		}
		if (pChar.ratio <= 0.5 || (npChar.ratio == 0.5 && (npChar.wins.length + npChar.losses.length == 2))) {
			if (this.debug)
				console.log("- Cowboy discourages betting on or against <51% (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%)");
			self.abstain = true;
			self.lowBet = true;
			return null;
		}
		p = pChar.name;
		if (this.debug)
			console.log("- " + p + " has a better win percentage (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%); RB betting " + p + " confidence: " + self.confidence.toFixed(2));
		self.prediction = p;
		return p;
	} else if (c1Ratio == c2Ratio) {
		if (this.debug)
			console.log("- Cowboy has insufficient information (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%)");
		self.abstain = true;
		self.lowBet = true;
		return null;
	}
};

var Chromosome = function () {
	// confidence weights
	this.oddsWeight = 0.5;
	this.timeAveWin = 1;	//this.timeWeight  =  1;
	this.timeAveLose = 1;
	this.winPercentageWeight = 1;
	this.crowdFavorWeight = 0.5;
	this.illumFavorWeight = 0.5;
	// tier scoring            
	this.wX = 1;
	this.wS = 1;
	this.wA = 1;
	this.wB = 1;
	this.wP = 1;
	this.wU = 1;
	this.lX = 1;
	this.lS = 1;
	this.lA = 1;
	this.lB = 1;
	this.lP = 1;
	this.lU = 1;
	// odds weights
	this.oX = 1;
	this.oS = 1;
	this.oA = 1;
	this.oB = 1;
	this.oP = 1;
	this.oU = 1;
	// times weights
	this.wtX = 1;
	this.wtS = 1;
	this.wtA = 1;
	this.wtB = 1;
	this.wtP = 1;
	this.wtU = 1;
	this.ltX = 1;
	this.ltS = 1;
	this.ltA = 1;
	this.ltB = 1;
	this.ltP = 1;
	this.ltU = 1;
	return this;
};

//
Chromosome.prototype.normalize = function () {
	var ratioDampen = 0.97;
	var lowValueControl = 0.000001;
	// make weights > 0
	var lowest = 0;
	for (var e0 in this) {
		if (this.hasOwnProperty(e0)) {
			var low = Number(this[e0]);
			if (low < lowest) {
				lowest = low;
			}
		}
	}
	//if (lowest<0){
	lowest -= lowValueControl;	// extra sum for near zero prevention.
	//}
	for (var e01 in this) {
		if (this.hasOwnProperty(e01)) {
			this[e01] -= lowest;
		}
	}
	// nerf very highest. A constant dampening.
	var highest = 0;
	var highIndex = null;
	for (var e0 in this) {
		if (this.hasOwnProperty(e0)) {
			var high = Number(this[e0]);
			if (high > highest) {
				highest = high;
				highIndex = e0;
			}
		}
	}
	if (this.hasOwnProperty(highIndex)) {
		this[highIndex] *= ratioDampen;
	}


	// normalize
	var sum = 0;
	for (var el in this) {
		if (this.hasOwnProperty(el)) {
			sum += Number(this[el]);
		}
	}
	for (var el2 in this) {
		if (this.hasOwnProperty(el2)) {
			this[el2] /= sum;
		}
	}
}

Chromosome.prototype.loadFromJSON = function (json) {
	var copy = JSON.parse(json);
	for (var i in copy) {
		this[i] = Number(copy[i]);
	}
	return this;
};
Chromosome.prototype.loadFromObject = function (obj) {
	for (var i in obj) {
		this[i] = Number(obj[i]);
	}
	return this;
};
Chromosome.prototype.toDisplayString = function () {
	var results = "-\nchromosome:";
	for (var i in this) {
		if (typeof this[i] != "function")
			results += "\n" + i + " : " + this[i];
	}
	return results;
};
Chromosome.prototype.mate = function (other) {
	var offspring = new Chromosome();
	var parentSplitChance = 0.625;	// gene from parents chance. This can be higher, Assuming left P is higher score dominate.
	var mutationScale = 0.25;	// range (0, +inf), too low, results will be dominated by parents' original weights crossing; too high, sim. cannot refine good values.
	var mutationChance = 0.08;	// range [0,1]
	var smallVal = 0.000001;
	for (var i in offspring) {
		if (typeof offspring[i] != "function") {
			offspring[i] = (Math.random() < parentSplitChance) ? this[i] : other[i];
			var radiation = (Math.random() - 0.5) * 2.0;
			var change = offspring[i] * radiation * mutationScale;
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
};
// note, test equals for floats...
Chromosome.prototype.equals = function (other) {
	var anyDifference = false;
	for (var i in other) {
		if (typeof other[i] != "function")
			if (this[i] != other[i])
				anyDifference = true;
	}
	return !anyDifference;
};
// scores character stats by chromosome. Does not score everything, Eg) differances of both characters stats are scored later.
var CSStats = function (cObj, chromosome) {
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

	for (var jj = 0; jj < cObj.wins.length; jj++)
		this.wins += chromosome["w" + cObj.wins[jj]];

	for (var kk = 0; kk < cObj.losses.length; kk++)
		this.losses += chromosome["l" + cObj.losses[kk]];

	for (var i = 0; i < cObj.odds.length; i++) {
		if (cObj.odds[i] >= 0) {
			oddsSum += cObj.odds[i] * chromosome["o" + cObj.tiers[i]];
			oddsCount += 1;
		}
	}
	this.averageOdds = (oddsCount != 0) ? oddsSum / oddsCount : null;
	//
	for (var j = 0; j < cObj.winTimes.length; j++) {
		if (cObj.winTimes[j] != 0) {
			winTimesTotal += cObj.winTimes[j] * chromosome["wt" + cObj.wins[j]];
			winTimesTotalRaw += cObj.winTimes[j];
			timedWonMatchesCount += 1;
		}
	}
	this.averageWinTime = (winTimesTotal != 0) ? winTimesTotal / timedWonMatchesCount : null;
	this.averageWinTimeRaw = (winTimesTotal != 0) ? winTimesTotalRaw / timedWonMatchesCount : null;

	for (var k = 0; k < cObj.lossTimes.length; k++) {
		if (cObj.winTimes[k] != 0) {
			lossTimesTotal += cObj.lossTimes[k] * chromosome["lt" + cObj.losses[k]];
			lossTimesTotalRaw += cObj.lossTimes[k];
			timedLostMatchesCount += 1;
		}
	}
	this.averageLossTime = (lossTimesTotal != 0) ? lossTimesTotal / timedLostMatchesCount : null;
	this.averageLossTimeRaw = (lossTimesTotal != 0) ? lossTimesTotalRaw / timedLostMatchesCount : null;

	// expert opinion section
	if (cObj.crowdFavor.length > 0) {
		var cfSum = 0;
		for (var l = 0; l < cObj.crowdFavor.length; l++) {
			cfSum += cObj.crowdFavor[l];
		}
		this.cfPercent = cfSum / cObj.crowdFavor.length;
	}
	if (cObj.illumFavor.length > 0) {
		var ifSum = 0;
		for (var m = 0; m < cObj.illumFavor.length; m++) {
			ifSum += cObj.illumFavor[m];
		}
		this.ifPercent = ifSum / cObj.illumFavor.length;
	}
};
var ConfidenceScore = function (chromosome, level, lastMatchCumulativeBetTotal) {
	Strategy.call(this, "cs");
	this.abstain = false;
	this.confidence = null;
	this.chromosome = chromosome;
	this.level = level;
	this.lastMatchCumulativeBetTotal = lastMatchCumulativeBetTotal;
};
ConfidenceScore.prototype = Object.create(Strategy.prototype);
ConfidenceScore.prototype.__super__ = Strategy;
ConfidenceScore.prototype.getBetAmount = function (balance, tournament, debug) {
	if (tournament)
		return this.__super__.prototype.getBetAmount.call(this, balance, tournament, debug);
	return this.__super__.prototype.flatBet.call(this, balance, debug);
};
// find confidence by comparing current match's characters stats.
ConfidenceScore.prototype.execute = function (info) {
	var c1 = info.character1;
	var c2 = info.character2;
	//
	var oddsWeight = this.chromosome.oddsWeight;
	var timeAveWinWeight = this.chromosome.timeAveWin;
	var timeAveLoseWeight = this.chromosome.timeAveLose;
	var winPercentageWeight = this.chromosome.winPercentageWeight;
	var crowdFavorWeight = this.chromosome.crowdFavorWeight;
	var illumFavorWeight = this.chromosome.illumFavorWeight;
	var totalWeight = oddsWeight + timeAveWinWeight + timeAveLoseWeight + winPercentageWeight + crowdFavorWeight + illumFavorWeight;

	// messages
	var oddsMessage = null;
	var timeMessage = null;
	var winsMessage = null;
	var crwdMessage = null;
	var ilumMessage = null;
	var messagelength = 15;
	var scoreDebugP = "\n:: ";

	// the weights come in from the chromosome
	var scoreBase = 0.001;      // range (0,0.5], prevents over-confidence.
	var c1Score = scoreBase;
	var c2Score = scoreBase;

	//
	var c1Stats = new CSStats(c1, this.chromosome);
	var c2Stats = new CSStats(c2, this.chromosome);

	var matchesFakeSample = Math.max(Math.max(c1Stats.totalFights, c1Stats.totalFights), 15); //min 15 as lowest records kept per char.
	var padValue = 0;// 0.0001;

	// wins
	var winsPTemper = 0.5;
	var c1WT = c1Stats.wins + c1Stats.losses + padValue;
	var c2WT = c2Stats.wins + c2Stats.losses + padValue;
	var cnWPPopScale = 0.05
	var c1WPPop = matchesFakeSample * cnWPPopScale;
	var c2WPPop = matchesFakeSample * cnWPPopScale;
	var c1WP = (padValue < Math.abs(padValue - c1WT)) ? (c1Stats.wins + padValue + winsPTemper * c1WPPop) / (c1WT + c1WPPop) : 1;
	var c2WP = (padValue < Math.abs(padValue - c2WT)) ? (c2Stats.wins + padValue + winsPTemper * c2WPPop) / (c2WT + c2WPPop) : 1;
	//var c2WP = (c2WT != 0) ? c2Stats.wins / c2WT : 0;
	/*
	 if (c1WP > c2WP) {
	 c1Score += winPercentageWeight;
	 } else if (c2WP > c1WP) {
	 c2Score += winPercentageWeight;
	 } else {
	 c1Score += 0.5*winPercentageWeight;
	 c2Score += 0.5*winPercentageWeight;
	 }*/
	// weight in win percent
	var WPSum = c1WP + c2WP;
	var winsRatioTemper = 0.5;
	var gamesWinPopulation = matchesFakeSample * WPSum * 0.00;
	var c1TWinP = (c1WP + winsRatioTemper * gamesWinPopulation) / (WPSum + gamesWinPopulation);
	var c2TWinP = (c2WP + winsRatioTemper * gamesWinPopulation) / (WPSum + gamesWinPopulation);
	if (WPSum > 0) {
		if (c1TWinP > c2TWinP) {
			c1Score += winPercentageWeight * c1TWinP;
			scoreDebugP += " win(1:" + c1Score.toFixed(6) + ")";
		} else if (c1TWinP < c2TWinP) {
			c2Score += winPercentageWeight * c2TWinP;
			scoreDebugP += " win(2:" + c2Score.toFixed(6) + ")";
		}
	}
	//var wpTotal = c1Stats.wins + c2Stats.wins + padValue;
	//var c1WPDisplay = wpTotal > 0 ? (c1Stats.wins + padValue) / wpTotal : 0;
	//var c2WPDisplay = wpTotal > 0 ? (c2Stats.wins + padValue) / wpTotal : 0;
	if (this.debug) winsMessage = "\xBB WINS/LOSSES:\n::weighted totals as % (red:blue)->(" + (c1TWinP * 100).toFixed(2) + " : " + (c2TWinP * 100).toFixed(2) + ")" +
		"\n::unweighted (red W:L)(blue W:L)->(" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")" +
		"\n::details (red W:L)(blue W:L)->(" + c1.wins.toString().replace(/,/g, '') + ":" + c1.losses.toString().replace(/,/g, '') + ")" +
		"(" + c2.wins.toString().replace(/,/g, '') + ":" + c2.losses.toString().replace(/,/g, '') + ")";

	// weight for upset odds
	if (c1Stats.averageOdds != null && c2Stats.averageOdds != null) {
		var aOT = c1Stats.averageOdds + c2Stats.averageOdds;
		var oddsTemper = 0.5;
		var oddsPopulation = matchesFakeSample * aOT * 0.00;
		var c1TOddsP = (c1Stats.averageOdds + oddsTemper * oddsPopulation) / (aOT + oddsPopulation);
		var c2TOddsP = (c2Stats.averageOdds + oddsTemper * oddsPopulation) / (aOT + oddsPopulation);
		if (c1TOddsP < c2TOddsP) {
			c1Score += oddsWeight * c2TOddsP;
			scoreDebugP += " odd(1:" + c1Score.toFixed(6) + ")";
		} else if (c1TOddsP > c2TOddsP) {
			c2Score += oddsWeight * c1TOddsP;
			scoreDebugP += " odd(2:" + c2Score.toFixed(6) + ")";
		}

		if (this.debug) {
			var lesserOdds = (c1TOddsP < c2TOddsP) ? c1TOddsP : c2TOddsP;
			var oddsConfidence = [(c1TOddsP / lesserOdds), (c2TOddsP / lesserOdds)];
			oddsMessage = "\n::weighted odds->(" + formatString("" + (oddsConfidence[0]).toFixed(2) + " : " + (oddsConfidence[1]).toFixed(2), messagelength) + ")"
				+ "\n::weighted raw (" + c1Stats.averageOdds.toFixed(3) + ":" + c2Stats.averageOdds.toFixed(3) + ")";
		}
	}

	// weight for shortest win time
	if (c1Stats.averageWinTime != null && c2Stats.averageWinTime != null) {
		var aWT = c1Stats.averageWinTime + c2Stats.averageWinTime;
		var aWTTemper = 0.5;
		var aWTPop = matchesFakeSample * aWT * 0.00;
		var c1AWTP = (c1Stats.averageWinTime + aWTTemper * aWTPop) / (aWT + aWTPop);
		var c2AWTP = (c2Stats.averageWinTime + aWTTemper * aWTPop) / (aWT + aWTPop);
		if (c1AWTP < c2AWTP) {
			c1Score += timeAveWinWeight * c2AWTP;
			scoreDebugP += " awt(1:" + c1Score.toFixed(6) + ")";
		}
		else if (c1AWTP > c2AWTP) {
			c2Score += timeAveWinWeight * c1AWTP;
			scoreDebugP += " awt(2:" + c2Score.toFixed(6) + ")";
		}
		if (this.debug) timeMessage = "\n::avg win time (red:blue)->(" + formatString(c1Stats.averageWinTimeRaw.toFixed(2) + " : " + c2Stats.averageWinTimeRaw.toFixed(2), messagelength) + ")"
			+ "\n::Weighted:(" + formatString(c1Stats.averageWinTime.toFixed(2) + ":" + c2Stats.averageWinTime.toFixed(2), messagelength) + ")";
	}

	// weight for longest lose time
	if (c1Stats.averageLossTime != null && c2Stats.averageLossTime != null) {
		var aLT = c1Stats.averageLossTime + c2Stats.averageLossTime;
		var aLTTemper = 0.5;
		var aLTPop = matchesFakeSample * aLT * 0.00;
		var c1ALTP = (c1Stats.averageLossTime + aLTTemper * aLTPop) / (aLT + aLTPop);
		var c2ALTP = (c2Stats.averageLossTime + aLTTemper * aLTPop) / (aLT + aLTPop);
		if (c1ALTP > c2ALTP) {
			c1Score += timeAveLoseWeight * c1ALTP;
			scoreDebugP += " alt(1:" + c1Score.toFixed(6) + ")";
		}
		else if (c1ALTP < c2ALTP) {
			c2Score += timeAveLoseWeight * c2ALTP;
			scoreDebugP += " alt(2:" + c2Score.toFixed(6) + ")";
		}
		if (this.debug) {
			var msg = "\n::avg loss time (red:blue)->(" + formatString(c1Stats.averageLossTimeRaw.toFixed(2) + " : " + c2Stats.averageLossTimeRaw.toFixed(2), messagelength) + ")"
				+ "\n::Weighted:(" + formatString(c1Stats.averageLossTime.toFixed(2) + ":" + c2Stats.averageLossTime.toFixed(2), messagelength) + ")";
			if (timeMessage)
				timeMessage += msg;
			else
				timeMessage = msg;
		}
	}
	// weight for crowd insight
	if (c1Stats.cfPercent != null && c2Stats.cfPercent != null) {
		var cfPT = c1Stats.cfPercent + c2Stats.cfPercent;
		if (c1Stats.cfPercent > c2Stats.cfPercent) {
			c1Score += crowdFavorWeight * c1Stats.cfPercent / cfPT;
			scoreDebugP += " cf(1:" + c1Score.toFixed(6) + ")";
		}
		else if (c1Stats.cfPercent < c2Stats.cfPercent) {
			c2Score += crowdFavorWeight * c2Stats.cfPercent / cfPT;
			scoreDebugP += " cf(2:" + c2Score.toFixed(6) + ")";
		}
		var cfPercentTotal = c1Stats.cfPercent + c2Stats.cfPercent;
		if (this.debug) crwdMessage = "\n::crowd favor (red:blue) -> (" + formatString((c1Stats.cfPercent / cfPercentTotal * 100).toFixed(2) +
				" : " + (c2Stats.cfPercent / cfPercentTotal * 100).toFixed(2), messagelength) + ")";
	}
	// weight for illuminati insight (whoa)
	if (c1Stats.ifPercent != null && c2Stats.ifPercent != null) {
		var ifPT = c1Stats.ifPercent + c2Stats.ifPercent;
		if (c1Stats.ifPercent > c2Stats.ifPercent) {
			c1Score += illumFavorWeight * c1Stats.ifPercent / ifPT;
			scoreDebugP += " if(1:" + c1Score.toFixed(6) + ")";
		}
		else if (c1Stats.ifPercent < c2Stats.ifPercent) {
			c2Score += illumFavorWeight * c2Stats.ifPercent / ifPT;
			scoreDebugP += " if(2:" + c2Score.toFixed(6) + ")";
		}
		var ifPercentTotal = c1Stats.ifPercent + c2Stats.ifPercent;
		if (this.debug) ilumMessage = "\n::illuminati favor (red:blue) -> (" + formatString((c1Stats.ifPercent / ifPercentTotal * 100).toFixed(2) +
				" : " + (c2Stats.ifPercent / ifPercentTotal * 100).toFixed(2), messagelength) + ")";
	}

	if (this.debug) {
		console.log("\n");
		console.log("\xBB PREDICTION STATS for (" + c1.name + " VS " + c2.name + ") \xBB");
		console.log(winsMessage);
		var line2 = "\xBB ";
		if (oddsMessage) line2 += oddsMessage;
		if (timeMessage) line2 += "  ::  " + timeMessage;
		if (line2.length > 2) console.log(line2);
		var line3 = "\xBB ";
		if (crwdMessage) line3 += crwdMessage;
		if (ilumMessage) line3 += "  ::  " + ilumMessage;
		if (line3.length > 2) console.log(line3);
		console.log(scoreDebugP);
	}

	// final decision

	// figure out prediction, confidence
	this.prediction = (c1Score > c2Score) ? c1.name : c2.name;

	var winnerPoints = (this.prediction == c1.name) ? c1Score : c2Score;
	var totalAvailablePoints = c1Score + c2Score;
	this.confidence = ((winnerPoints / totalAvailablePoints)).toFixed(4);

	/*---------------------------------------------------------------------------------------------------*/
	// CONFIDENCE ADJUSTMENT SECTION
	/*---------------------------------------------------------------------------------------------------*/
	var nerfPoorScore = 0.66;
	var nerfAmount = 0;
	var nerfMsg = "-- PROBLEMS:";
	if ((c1Score == c2Score) || c1.wins.length + c1.losses.length <= 3 || c2.wins.length + c2.losses.length <= 3 || c1.wins.length == 0 || c2.wins.length == 0) {
		nerfAmount += nerfPoorScore;
		nerfMsg += "\n- insufficient information (scores: " + c1Score.toFixed(2) + ":" + c2Score.toFixed(2) + "), W:L(P1)(P2)-> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), ";
	}

	// nerf the confidence if there is a reason
	if (nerfAmount != 0) {
		if (this.debug)
			console.log(nerfMsg + "\n--> dropping confidence by " + (nerfAmount * 100).toFixed(0) + "%");
		this.confidence *= 1 - nerfAmount;
	}

	// make sure something gets bet
	if (this.confidence <= 0)
		this.confidence = .01;

	if (this.debug) console.log("::Predicting: " + this.prediction + "\n::confidence: " + this.confidence + "\n");
	return this.prediction;
};

var ChromosomeIPU = function () {
	Strategy.call(this);
	this.baseBettingTier = 1500;
};
ChromosomeIPU.prototype = Object.create(Chromosome.prototype);

var InternetPotentialUpset = function (cipu, level) {
	Strategy.call(this, "ipu");
	this.debug = true;
	this.ct = new CoinToss();
	this.chromosome = cipu;
	// even though it doesn't use it, it needs confidence so as to be marked as new
	this.confidence = 1;
	this.level = level;
};
InternetPotentialUpset.prototype = Object.create(Strategy.prototype);
InternetPotentialUpset.prototype.__super__ = Strategy;
InternetPotentialUpset.prototype.execute = function (info) {
	this.prediction = this.ct.execute(info);
	if (this.debug)
		console.log("- Lunatic is 50% confident, bBT: " + this.chromosome.baseBettingTier);
	return this.prediction;
};
InternetPotentialUpset.prototype.getBetAmount = function (balance, tournament, debug) {
	if (tournament)
		return this.__super__.prototype.getBetAmount.call(this, balance, tournament, debug);
	return this.__super__.prototype.flatBet.call(this, balance, debug);
};

var Observer = function () {
	Strategy.call(this, "obs");
	this.abstain = true;
};
Observer.prototype = Object.create(Strategy.prototype);
Observer.prototype.execute = function (info) {
	if (this.debug)
		console.log("- Monk does not bet");
	this.abstain = true;
	return null;
};
