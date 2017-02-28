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
	if (debug)
		console.log("- betting at level: " + this.level + ", confidence: " + (this.confidence * 100).toFixed(2));
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
	if (!this.confidence)
		this.confidence = 1;

	var amountToBet;
	var bailout = this.getBailout(tournament);

	if (tournament) {
		var allIn = ctrl.settings.allInTourney ||
			balance <= 2 * bailout ||
			this.confidence > 0.9 ||
			(1 - this.confidence) * balance <= bailout;
		amountToBet = (!allIn) ? Math.round(balance * (this.confidence || 0.5)) : balance;
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
				console.log("- betting: " + balance + " x  cf(" + (this.confidence * 100).toFixed(2) + "%) = " + amountToBet);
			else
				console.log("- betting: " + balance + " x  50%) = " + amountToBet);
		}
	} else if (!(this.lowBet && this instanceof RatioConfidence)) {
		amountToBet = Math.round(balance * .1 * this.confidence);
		if (amountToBet > balance * .1)
			amountToBet = Math.round(balance * .1);
		if (amountToBet < bailout) {
			if (debug)
				console.log("- amount is less than bailout (" + amountToBet + "), betting bailout: " + bailout);
			amountToBet = bailout;
		} else if (debug)
			console.log("- betting: " + balance + " x .10 =(" + (balance * .1) + ") x cf(" + (this.confidence * 100).toFixed(2) + "%) = " + amountToBet);
	} else {
		var p05 = Math.ceil(balance * .01);
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
	this.oddsWeight = 1;
	this.timeWeight = 0.5;
	this.winPercentageWeight = 1;
	this.crowdFavorWeight = 1;
	this.illumFavorWeight = 1;
	// tier scoring            
	this.wX = 5;
	this.wS = 4;
	this.wA = 3;
	this.wB = 2;
	this.wP = 1;
	this.wU = 0.5;
	this.lX = 1;
	this.lS = 2;
	this.lA = 3;
	this.lB = 4;
	this.lP = 5;
	this.lU = 0.5;
	// odds weights
	this.oX = 5;
	this.oS = 4;
	this.oA = 3;
	this.oB = 2;
	this.oP = 1;
	this.oU = 0.5;
	// times weights
	this.wtX = 5;
	this.wtS = 4;
	this.wtA = 3;
	this.wtB = 2;
	this.wtP = 1;
	this.wtU = 0.5;
	this.ltX = 1;
	this.ltS = 2;
	this.ltA = 3;
	this.ltB = 4;
	this.ltP = 5;
	this.ltU = 0.5;
	return this;
};

Chromosome.prototype.normalize = function(){
	var sum = 0;
	for(var el in this) {
		if(this.hasOwnProperty(el)) {
			sum += parseFloat(this[el]);
		}
	}
	
	for (var el2 in this) {
		if (this.hasOwnProperty(el2)) {
			//* 0.01 because of normalizing to a sum of 100
			this[el2] /= (sum * 0.01);
		}
	}
}

Chromosome.prototype.loadFromJSON = function (json) {
	var copy = JSON.parse(json);
	for (var i in copy) {
		this[i] = parseFloat(copy[i]);
	}
	return this;
};
Chromosome.prototype.loadFromObject = function (obj) {
	for (var i in obj) {
		this[i] = parseFloat(obj[i]);
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
	for (var i in offspring) {
		var mutationScale = 0.5;	// range 0..<1 (a danger if offspring weight becomes < 0).
		var mutationChance = 0.21;	// range 0..1
		if (typeof offspring[i] != "function") {
			offspring[i] = (Math.random() > 0.5) ? this[i] : other[i];
			var radiation =  (Math.random() - 0.5) * 2.0;
			var change = offspring[i] * radiation * mutationScale;
			if (Math.random() < mutationChance && offspring[i] != null)
				offspring[i] += change;
		}
	}
	offspring.normalize();
	return offspring;
};
Chromosome.prototype.equals = function (other) {
	var anyDifference = false;
	for (var i in other) {
		if (typeof other[i] != "function")
			if (this[i] != other[i])
				anyDifference = true;
	}
	return !anyDifference;
};
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

	for (var jj = 0; jj < cObj.wins.length; jj++)
		this.wins += chromosome["w" + cObj.wins[jj]];

	for (var kk = 0; kk < cObj.losses.length; kk++)
		this.losses += chromosome["l" + cObj.losses[kk]];

	for (var i = 0; i < cObj.odds.length; i++) {
		if (cObj.odds[i] != -1) {
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
		this.cfPercent = cfSum / cObj.cf.length;
	}
	if (cObj.illumFavor.length > 0) {
		var ifSum = 0;
		for (var m = 0; m < cObj.illumFavor.length; m++) {
			cfSum += cObj.illumFavor[m];
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
ConfidenceScore.prototype.execute = function (info) {
	var c1 = info.character1;
	var c2 = info.character2;
	//
	var oddsWeight = this.chromosome.oddsWeight;
	var timeWeight = this.chromosome.timeWeight;
	var winPercentageWeight = this.chromosome.winPercentageWeight;
	var crowdFavorWeight = this.chromosome.crowdFavorWeight;
	var illumFavorWeight = this.chromosome.illumFavorWeight;
	var totalWeight = oddsWeight + timeWeight + winPercentageWeight + crowdFavorWeight + illumFavorWeight;

	// messages
	var oddsMessage = null;
	var timeMessage = null;
	var winsMessage = null;
	var crwdMessage = null;
	var ilumMessage = null;
	var messagelength = 15;

	// the weights come in from the chromosome
	var c1Score = 0;
	var c2Score = 0;

	//


	//
	var c1Stats = new CSStats(c1, this.chromosome);
	var c2Stats = new CSStats(c2, this.chromosome);

	if (c1Stats.averageOdds != null && c2Stats.averageOdds != null) {
		var lesserOdds = (c1Stats.averageOdds < c2Stats.averageOdds) ? c1Stats.averageOdds : c2Stats.averageOdds;
		this.oddsConfidence = [(c1Stats.averageOdds / lesserOdds), (c2Stats.averageOdds / lesserOdds)];
		if (this.debug) oddsMessage = "predicted odds -> (" + formatString("" + (this.oddsConfidence[0]).toFixed(2) + " : " + (this.oddsConfidence[1]).toFixed(2), messagelength) + ")"
	} else {
		this.oddsConfidence = null;
	}

	var c1WT = c1Stats.wins + c1Stats.losses;
	var c2WT = c2Stats.wins + c2Stats.losses;
	var c1WP = (c1WT != 0) ? c1Stats.wins / c1WT : 0;
	var c2WP = (c2WT != 0) ? c2Stats.wins / c2WT : 0;

	var wpTotal = c1Stats.wins + c2Stats.wins;
	var c1WPDisplay = wpTotal > 0 ? c1Stats.wins / wpTotal : 0;
	var c2WPDisplay = wpTotal > 0 ? c2Stats.wins / wpTotal : 0;
	if (this.debug) winsMessage = "\xBB WINS/LOSSES:     weighted totals as % (red:blue) -> (" + (c1WPDisplay * 100).toFixed(0) + " : " + (c2WPDisplay * 100).toFixed(0) + ")" +
		"  ::  unweighted (red W:L)(blue W:L) -> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")" +
		"  ::  details (red W:L)(blue W:L) -> (" + c1.wins.toString().replace(/,/g, '') + ":" + c1.losses.toString().replace(/,/g, '') + ")" +
		"(" + c2.wins.toString().replace(/,/g, '') + ":" + c2.losses.toString().replace(/,/g, '') + ")";

	/*if (c1WP > c2WP) {
	 c1Score += winPercentageWeight;
	 }
	 else if (c2WP > c1WP) {
	 c2Score += winPercentageWeight;
	 }
	 else {
	 c1Score += 0.5*winPercentageWeight;
	 c2Score += 0.5*winPercentageWeight;
	 }*/
	var WPSum = c1WP + c2WP;
	if (WPSum > 0) {
		c1Score += winPercentageWeight * c1WP / WPSum;
		c2Score += winPercentageWeight * c2WP / WPSum;
	}
	else {
		c1Score += winPercentageWeight * 0.5;
		c2Score += winPercentageWeight * 0.5;
	}

	if (c1Stats.averageOdds != null && c2Stats.averageOdds != null) {
		if (c1Stats.averageOdds > c2Stats.averageOdds)
			c1Score += oddsWeight;
		else if (c1Stats.averageOdds < c2Stats.averageOdds)
			c2Score += oddsWeight;
	}

	if (c1Stats.averageWinTime != null && c2Stats.averageWinTime != null) {
		if (c1Stats.averageWinTime < c2Stats.averageWinTime)
			c1Score += timeWeight / 2;
		else if (c1Stats.averageWinTime > c2Stats.averageWinTime)
			c2Score += timeWeight / 2;
		if (this.debug) timeMessage = "avg win time (red:blue) -> (" + formatString(c1Stats.averageWinTimeRaw.toFixed(0) + " : " + c2Stats.averageWinTimeRaw.toFixed(0), messagelength) + ")";
	}


	if (c1Stats.averageLossTime != null && c2Stats.averageLossTime != null) {
		if (c1Stats.averageLossTime > c2Stats.averageLossTime)
			c1Score += timeWeight / 2;
		else if (c1Stats.averageLossTime < c2Stats.averageLossTime)
			c2Score += timeWeight / 2;
		if (this.debug) {
			var msg = "  ::  avg loss time (red:blue) -> (" + formatString(c1Stats.averageLossTimeRaw.toFixed(0) + " : " + c2Stats.averageLossTimeRaw.toFixed(0), messagelength) + ")";
			if (timeMessage)
				timeMessage += msg;
			else
				timeMessage = msg;
		}
	}

	if (c1Stats.cfPercent != null && c2Stats.cfPercent != null) {
		if (c1Stats.cfPercent > c2Stats.cfPercent)
			c1Score += crowdFavorWeight;
		else if (c1Stats.cfPercent < c2Stats.cfPercent)
			c2Score += crowdFavorWeight;
		var cfPercentTotal = c1Stats.cfPercent + c2Stats.cfPercent;
		if (this.debug) crwdMessage = "crowd favor (red:blue) -> (" + formatString((c1Stats.cfPercent / cfPercentTotal * 100).toFixed(0) +
				" : " + (c2Stats.cfPercent / cfPercentTotal * 100).toFixed(0), messagelength) + ")";
	}

	if (c1Stats.ifPercent != null && c2Stats.ifPercent != null) {
		if (c1Stats.ifPercent > c2Stats.ifPercent)
			c1Score += illumFavorWeight;
		else if (c1Stats.ifPercent < c2Stats.ifPercent)
			c2Score += illumFavorWeight;
		var ifPercentTotal = c1Stats.ifPercent + c2Stats.ifPercent;
		if (this.debug) ilumMessage = "illuminati favor (red:blue) -> (" + formatString((c1Stats.ifPercent / ifPercentTotal * 100).toFixed(0) +
				" : " + (c2Stats.ifPercent / ifPercentTotal * 100).toFixed(0), messagelength) + ")";
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
		console.log("\n");
	}

	// final decision

	// figure out prediction, confidence
	this.prediction = (c1Score > c2Score) ? c1.name : c2.name;

	var winnerPoints = (this.prediction == c1.name) ? c1Score : c2Score;
	var totalAvailablePoints = c1Score + c2Score;
	this.confidence = parseFloat((winnerPoints / totalAvailablePoints));

	/*---------------------------------------------------------------------------------------------------*/
	// CONFIDENCE ADJUSTMENT SECTION
	/*---------------------------------------------------------------------------------------------------*/

	var nerfAmount = 0;
	var nerfMsg = "-- PROBLEMS:";
	if ((c1Score == c2Score) || c1.wins.length + c1.losses.length <= 3 || c2.wins.length + c2.losses.length <= 3) {
		nerfAmount += .3;
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

	return this.prediction;
};

var ChromosomeIPU = function () {
	Strategy.call(this);
	this.baseBettingTier = 1500;
};
ChromosomeIPU.prototype = Object.create(Chromosome.prototype);
;
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
