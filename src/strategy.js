var Strategy = function(sn) {
	this.btn10 = document.getElementById("interval1");
	this.btn50 = document.getElementById("interval5");
	this.btnP1 = document.getElementById("player1");
	this.btnP2 = document.getElementById("player2");
	this.p1name = this.btnP1.getAttribute("value");
	this.p2name = this.btnP2.getAttribute("value");
	this.strategyName = sn;
	this.prediction = null;
	this.debug = true;
	this.getWinner = function(ss) {
		return ss.getWinner();
	};
};
Strategy.prototype.getBetAmount = function(balance, tournament, debug) {
	if (!this.confidence)
		this.confidence = 1;

	var minimum = 100 + Math.round(Math.random() * 50);
	var amountToBet;

	if (tournament) {
		var allIn = balance < 2000;
		amountToBet = (!allIn) ? Math.round(balance * (this.confidence || 0.5)) : balance;
		if (amountToBet > balance)
			amountToBet = balance;
		if (amountToBet < 1000)
			amountToBet = 1000;
		if (debug) {
			if (allIn)
				console.log("- ALL IN: " + balance);
			else if (this.confidence)
				console.log("- betting: " + balance + " x  cf(" + (this.confidence * 100).toFixed(2) + "%) = " + amountToBet);
			else
				console.log("- betting: " + balance + " x  50%) = " + amountToBet);
		}
	} else if (!this.lowBet) {
		amountToBet = Math.round(balance * .1 * this.confidence);
		if (amountToBet > balance * .1)
			amountToBet = Math.round(balance * .1);
		if (debug)
			console.log("- betting: " + balance + " x .10 =(" + (balance * .1) + ") x cf(" + (this.confidence * 100).toFixed(2) + "%) = " + amountToBet);
	} else {
		var p05 = Math.ceil(balance * .01);
		var cb = Math.ceil(balance * this.confidence);
		amountToBet = (p05 < cb) ? p05 : cb;
		if (debug)
			console.log("- betting without confidence: " + amountToBet);
	}
	return amountToBet;
};

var CoinToss = function() {
	Strategy.call(this, "ct");
};
CoinToss.prototype = Object.create(Strategy.prototype);
CoinToss.prototype.execute = function(info) {
	var c1 = info.character1;
	var c2 = info.character2;
	this.prediction = (Math.random() > .5) ? c1.name : c2.name;
	return this.prediction;
};

var Chromosome = function() {
	// original values
	this.wModBest = 1;
	this.wModMiddle = 0.5;
	this.wModWorst = 0.25;
	this.oddsWeight = 1;
	this.timeWeight = 0.5;
	this.winPercentageWeight = 1;
	this.totalWinsWeight = 0.1;
	this.crowdFavorWeight = 1;
	this.illumFavorWeight = 1;
	//
	this.junk = 1;
	//
	this.confidenceWeight = 1;
	this.oddsConfidenceWeight = 1;
	this.fallbackConfidenceWeight = 1;
	this.minimumCombinedConfidenceForLargeBet = 0.5;
	this.minimumMatchesForLargeBet = 3;
	// tier Scoring
	this.wX = 5;
	this.wS = 4;
	this.wA = 3;
	this.wB = 2;
	this.wP = 1;
	this.lX = 1;
	this.lS = 2;
	this.lA = 3;
	this.lB = 4;
	this.lP = 5;
	this.lU = 0.5;
	this.wU = 0.5;
	return this;
};
Chromosome.prototype.toJSON = function() {
	return JSON.stringify(this);
};
Chromosome.prototype.loadFromJSON = function(json) {
	var copy = JSON.parse(json);
	for (var i in copy) {
		this[i] = parseFloat(copy[i]);
	}
	return this;
};
Chromosome.prototype.loadFromObject = function(obj) {
	for (var i in obj) {
		this[i] = parseFloat(obj[i]);
	}
	return this;
};
Chromosome.prototype.toDisplayString = function() {
	var results = "-\nchromosome:";
	for (var i in this) {
		if ( typeof this[i] != "function")
			results += "\n" + i + " : " + this[i];
	}
	return results;
};
Chromosome.prototype.mate = function(other) {
	var offspring = new Chromosome();
	for (var i in offspring) {
		if ( typeof offspring[i] != "function") {
			offspring[i] = (Math.random() > 0.5) ? this[i] : other[i];
			// 20% chance of mutation
			var radiation = Math.random() + Math.random();
			radiation *= radiation;
			if (Math.random() < 0.2 && offspring[i] != null)
				offspring[i] *= radiation;
		}
	}
	return offspring;
};
Chromosome.prototype.equals = function(other) {
	var anyDifference = false;
	for (var i in other) {
		if ( typeof other[i] != "function")
			if (this[i] != other[i])
				anyDifference = true;
	}
	return !anyDifference;
};
var CSStats = function(cObj) {
	var oddsSum = 0;
	var oddsCount = 0;
	var winTimesTotal = 0;
	var lossTimesTotal = 0;
	var timedWonMatchesCount = 0;
	var timedLostMatchesCount = 0;
	this.averageOdds = null;
	this.averageWinTime = null;
	this.averageLossTime = null;
	this.cfPercent = null;
	this.ifPercent = null;
	for (var i = 0; i < cObj.odds.length; i++) {
		oddsSum += cObj.odds[i];
		oddsCount += 1;
	}
	this.averageOdds = (oddsCount != 0) ? oddsSum / oddsCount : null;
	for (var j = 0; j < cObj.winTimes.length; j++) {
		winTimesTotal += cObj.winTimes[j];
		timedWonMatchesCount += 1;
	}
	this.averageWinTime = (winTimesTotal != 0) ? winTimesTotal / timedWonMatchesCount : null;
	for (var k = 0; k < cObj.lossTimes.length; k++) {
		lossTimesTotal += cObj.lossTimes[k];
		timedLostMatchesCount += 1;
	}
	this.averageLossTime = (lossTimesTotal != 0) ? lossTimesTotal / timedLostMatchesCount : null;
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
var ConfidenceScore = function(chromosome) {
	Strategy.call(this, "cs");
	this.abstain = false;
	this.confidence = null;
	this.possibleConfidence = 0;
	this.fallback1 = new RatioConfidence();
	this.fallback1.debug = false;
	this.chromosome = chromosome || this.chromosome;
};
ConfidenceScore.prototype = Object.create(Strategy.prototype);
ConfidenceScore.prototype.countFromRecord = function(c, tierCharacters, modifier) {
	var wins = 0;
	var losses = 0;
	for (var j = 0; j < c.wins.length; j++) {
		if (tierCharacters.indexOf(c.wins[j]) > -1)
			wins += this.chromosome["w" + c.wins[j]] * modifier;
	}
	for (var k = 0; k < c.losses.length; k++) {
		if (tierCharacters.indexOf(c.losses[k]) > -1)
			losses += this.chromosome["l" + c.losses[k]] * modifier;
	}
	return [wins, losses];
};
ConfidenceScore.prototype.getWeightedScores = function(c, hasTiered, hasUntiered) {

	if (hasTiered && !hasUntiered) {
		// best case scenario, only comparing tiered matches
		return this.countFromRecord(c, ["P", "B", "A", "S", "X"], this.chromosome.wModBest);
	} else if (!hasTiered && hasUntiered) {
		// next best case
		return this.countFromRecord(c, ["U"], this.chromosome.wModMiddle);
	} else {
		// worst-case
		return this.countFromRecord(c, ["U", "P", "B", "A", "S", "X"], this.chromosome.wModWorst);
	}
};
ConfidenceScore.prototype.adjustConfidence = function() {
	var numberOfFactors;
	var multipliers;
	var oddsConfidence;
	var confidence = this.confidence;
	// the below line was the original way it was set up
	// this.confidence = this.fallback1.confidence || 0.1;
	var fallbackConfidence = this.fallback1.confidence || 0.1;
	var oc = this.oddsConfidence;
	confidence *= this.chromosome.confidenceWeight;
	fallbackConfidence *= this.chromosome.fallbackConfidenceWeight;

	if (oc) {
		numberOfFactors = 3;
		multipliers = (this.chromosome.confidenceWeight + this.chromosome.fallbackConfidenceWeight + this.chromosome.oddsConfidenceWeight) / numberOfFactors;
		oddsConfidence = (oc[0] > oc[1]) ? oc[0] / (oc[0] + oc[1]) : oc[1] / (oc[0] + oc[1]);
		oddsConfidence *= this.chromosome.oddsConfidenceWeight;
		this.confidence = (confidence + fallbackConfidence + oddsConfidence) / numberOfFactors / multipliers;
	} else {
		numberOfFactors = 2;
		multipliers = (this.chromosome.confidenceWeight + this.chromosome.fallbackConfidenceWeight ) / numberOfFactors;
		this.confidence = (confidence + fallbackConfidence ) / numberOfFactors / multipliers;
	}

	var unconfident = false;
	if (this.confidence < this.chromosome.minimumCombinedConfidenceForLargeBet) {
		unconfident = true;
		if (this.debug)
			console.log("- combined confidence too low, dropping confidence by 75%");
	} else if (this.confidence < Math.ceil(this.chromosome.minimumMatchesForLargeBet)) {
		unconfident = true;
		if (this.debug)
			console.log("- one or both players have too few matches, dropping confidence by 75%");
	}
	if (unconfident)
		this.confidence *= .25;
};
ConfidenceScore.prototype.execute = function(info) {
	var c1 = info.character1;
	var c2 = info.character2;
	var matches = info.matches;
	var c1Stats = new CSStats(c1);
	var c2Stats = new CSStats(c2);

	if (c1Stats.averageOdds == 0 || c2Stats.averageOdds == 0) {
		c1Stats.averageOdds = null;
		c2Stats.averageOdds = null;
		console.log("Flag match for removal: " + c1.name + "," + c2.name);
	}

	if (c1Stats.averageOdds != null && c2Stats.averageOdds != null) {
		var lesserOdds = (c1Stats.averageOdds < c2Stats.averageOdds) ? c1Stats.averageOdds : c2Stats.averageOdds;
		this.oddsConfidence = [(c1Stats.averageOdds / lesserOdds), (c2Stats.averageOdds / lesserOdds)];
		if (this.debug)
			console.log("- predicted odds: " + (this.oddsConfidence[0]).toFixed(2) + " : " + (this.oddsConfidence[1]).toFixed(2));
	} else {
		this.oddsConfidence = null;
		if (this.debug)
			console.log("- cannot predict odds: one or both characters missing odds");
	}

	// the weights come in from the chromosome
	var c1Score = 0;
	var c2Score = 0;
	var oddsWeight = this.chromosome.oddsWeight;
	var timeWeight = this.chromosome.timeWeight;
	var winPercentageWeight = this.chromosome.winPercentageWeight;
	var totalWinsWeight = this.chromosome.totalWinsWeight;
	var crowdFavorWeight = this.chromosome.crowdFavorWeight;
	var illumFavorWeight = this.chromosome.illumFavorWeight;
	var totalWeight = oddsWeight + timeWeight + winPercentageWeight + totalWinsWeight + crowdFavorWeight + illumFavorWeight;

	if (c1Stats.averageOdds != null && c2Stats.averageOdds != null) {
		if (c1Stats.averageOdds > c2Stats.averageOdds)
			c1Score += oddsWeight;
		else if (c1Stats.averageOdds < c2Stats.averageOdds)
			c2Score += oddsWeight;
	}

	if (c1Stats.averageWinTime != null && c2Stats.averageWinTime != null)
		if (c1Stats.averageWinTime < c2Stats.averageWinTime)
			c1Score += timeWeight;
		else if (c1Stats.averageWinTime > c2Stats.averageWinTime)
			c2Score += timeWeight;

	if (c1Stats.averageLossTime != null && c2Stats.averageLossTime != null)
		if (c1Stats.averageLossTime > c2Stats.averageLossTime)
			c1Score += timeWeight / 2;
		else if (c1Stats.averageLossTime < c2Stats.averageLossTime)
			c2Score += timeWeight / 2;

	// tier weighting section
	var hasTieredMatchesRE = /[pbasx]/g;
	var hasUntieredMatchesRE = /[u]/g;
	var c1WinsAndLosses = c1.wins.toString() + "," + c1.losses.toString();
	var c2WinsAndLosses = c2.wins.toString() + "," + c2.losses.toString();
	var hasTiered = hasTieredMatchesRE.test(c1WinsAndLosses) && hasTieredMatchesRE.test(c2WinsAndLosses);
	var hasUntiered = hasUntieredMatchesRE.test(c1WinsAndLosses) && hasUntieredMatchesRE.test(c2WinsAndLosses);

	var c1WLScores = this.getWeightedScores(c1, hasTiered, hasUntiered);
	var c2WLScores = this.getWeightedScores(c2, hasTiered, hasUntiered);
	var c1WPotential = c1WLScores[0] + c1WLScores[1];
	var c2WPotential = c2WLScores[0] + c2WLScores[1];

	if (c1WPotential != 0 && c2WPotential != 0) {
		var c1WWinPercentage = c1WLScores[0] / c1WPotential;
		var c2WWinPercentage = c2WLScores[0] / c2WPotential;

		if (c1WWinPercentage > c2WWinPercentage)
			c1Score += winPercentageWeight;
		else if (c2WWinPercentage > c1WWinPercentage)
			c2Score += winPercentageWeight;
	}

	if (c1WLScores[0] > c2WLScores[0])
		c1Score += totalWinsWeight;
	else if (c1WLScores[0] < c2WLScores[0])
		c2Score += totalWinsWeight;
	else if (c1WLScores[1] < c2WLScores[1])
		c1Score += totalWinsWeight;
	else if (c1WLScores[1] > c2WLScores[1])
		c2Score += totalWinsWeight;

	if (c1Stats.cfPercent != null && c2Stats.cfPercent != null) {
		if (c1Stats.cfPercent > c2Stats.cfPercent)
			c1Score += crowdFavorWeight;
		else if (c1Stats.cfPercent < c2Stats.cfPercent)
			c2Score += crowdFavorWeight;
	}
	if (c1Stats.ifPercent != null && c2Stats.ifPercent != null) {
		if (c1Stats.ifPercent > c2Stats.ifPercent)
			c1Score += illumFavorWeight;
		else if (c1Stats.ifPercent < c2Stats.ifPercent)
			c2Score += illumFavorWeight;
	}

	// final decision

	// figure out prediction, confidence

	this.prediction = (c1Score > c2Score) ? c1.name : c2.name;

	var winnerPoints = (this.prediction == c1.name) ? c1Score : c2Score;
	var totalAvailablePoints = c1Score + c2Score;
	this.confidence = parseFloat((winnerPoints / totalWeight));

	// the point scoring in this makes for a terrible confidence predictor; rely on this for betting amount instead
	this.fallback1.execute(info);

	if ((c1Score == c2Score) || (c1.wins.length == 0 && c1.losses.length == 0) || (c2.wins.length == 0 && c2.losses.length == 0)) {
		if (this.debug)
			console.log("- CS has insufficient information (scores: " + c1Score.toFixed(2) + ":" + c2Score.toFixed(2) + "), W:L(P1)(P2)-> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")");
		this.abstain = true;
		this.lowBet = true;
		return this.prediction;
	}
	if (this.debug)
		console.log("- " + this.prediction + " has a better W score (scores: " + c1Score.toFixed(2) + ":" + c2Score.toFixed(2) + "), W:L(P1)(P2)-> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), betting " + this.prediction);
	return this.prediction;
};

var RatioConfidence = function() {
	Strategy.call(this, "rc");
	this.abstain = false;
};
RatioConfidence.prototype = Object.create(Strategy.prototype);
RatioConfidence.prototype.execute = function(info) {
	var self = this;
	var c1 = info.character1;
	var c2 = info.character2;
	var c1TotalMatches = c1.wins.length + c1.losses.length;
	var c2TotalMatches = c2.wins.length + c2.losses.length;
	var p;

	if (c1TotalMatches < 3 || c2TotalMatches < 3) {
		if (this.debug)
			console.log("- RC has insufficient information, W:L(P1)(P2)->  (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")");
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
		if (self.confidence < 0.6) {
			if (this.debug)
				console.log("- RC has insufficient confidence (confidence: " + self.confidence.toFixed(2) + "), W:L(P1)(P2)-> (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + ")");
			self.abstain = true;
			self.lowBet = true;
			return null;
		}
		if (pChar.ratio <= 0.5 || (npChar.ratio == 0.5 && (npChar.wins.length + npChar.losses.length == 2))) {
			if (this.debug)
				console.log("- RC discourages betting on or against <51% (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%)");
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
			console.log("- RC has insufficient information (" + (c1Ratio * 100).toFixed(2) + "% : " + (c2Ratio * 100).toFixed(2) + "%)");
		self.abstain = true;
		self.lowBet = true;
		return null;
	}
};

var ChromosomeIPU = function() {
	Strategy.call(this);
	this.baseBettingTier = 1500;
};
ChromosomeIPU.prototype = Object.create(Chromosome.prototype);
;
var InternetPotentialUpset = function(cipu) {
	Strategy.call(this, "ipu");
	this.debug = true;
	this.ct = new CoinToss();
	this.chromosome = cipu;
	// even though it doesn't use it, it needs confidence so as to be marked as new
	this.confidence = 1;
};
InternetPotentialUpset.prototype = Object.create(Strategy.prototype);
InternetPotentialUpset.prototype.__super__ = Strategy;
InternetPotentialUpset.prototype.execute = function(info) {
	this.prediction = this.ct.execute(info);
	if (this.debug)
		console.log("- IPU is 50% confident, bBT: " + this.chromosome.baseBettingTier);
	return this.prediction;
};
InternetPotentialUpset.prototype.getBetAmount = function(balance, tournament, debug) {
	if (tournament)
		return this.__super__.prototype.getBetAmount.call(this, balance, tournament, debug);

	var t1 = this.chromosome.baseBettingTier;
	var t2 = t1 * 10;
	var t3 = t2 * 100;
	if (balance > t1 && balance < t2)
		return 100;
	else if (balance > t2 && balance < t3)
		return 1000;
	else if (balance > t3)
		return 10000;
	else
		return balance;
};

var Observer = function() {
	Strategy.call(this, "obs");
	this.abstain = true;
};
Observer.prototype = Object.create(Strategy.prototype);
Observer.prototype.execute = function(info) {
	if (this.debug)
		console.log("- OBS does not bet");
	this.abstain = true;
	return null;
};
