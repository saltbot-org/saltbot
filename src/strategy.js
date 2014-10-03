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
	var s = this;
	this.getWinner = function(ss) {
		return ss.getWinner();
	};
};

//To be used with confidence score
var Intermediary = function(sn) {
	this.base = Strategy;
	this.base(sn);
};
Intermediary.prototype = Strategy;

var CoinToss = function() {
	this.base = Strategy;
	this.base("ct");
	this.execute = function(info) {
		var c1 = info.character1;
		var c2 = info.character2;
		var p = (Math.random() > .5) ? c1.name : c2.name;
		self.prediction = p;
		return p;
	};
};
CoinToss.prototype = Strategy;

var MoreWins = function() {
	this.base = Strategy;
	this.base("mw");
	var s = this;
	this.execute = function(info) {
		var self = s;
		var c1 = info.character1;
		var c2 = info.character2;
		var p;
		if (c1.wins.length != c2.wins.length) {
			p = (c1.wins.length > c2.wins.length) ? c1.name : c2.name;
			if (this.debug)
				console.log(p + " has more wins (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "); MW betting " + p);
			self.prediction = p;
			return p;
		} else if (c1.losses.length != c2.losses.length) {
			p = (c1.losses.length < c2.losses.length) ? c1.name : c2.name;
			if (this.debug)
				console.log(p + " has less losses (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "); MW betting " + p);
			self.prediction = p;
			return p;
		} else {
			p = (Math.random() > .5) ? c1.name : c2.name;
			if (this.debug)
				console.log("MW has no data for " + c1.name + " and " + c2.name + " or they're equal; MW betting randomly");
			self.prediction = p;
			return p;
		}
	};
};
MoreWins.prototype = Strategy;

var MoreWinsCautious = function() {
	this.base = Strategy;
	this.base("mwc");
	this.abstain = false;
	var s = this;
	this.execute = function(info) {
		var self = s;
		var c1 = info.character1;
		var c2 = info.character2;
		var p;
		if ((c1.wins.length == 0 && c1.losses.length == 0) || (c2.wins.length == 0 && c2.losses.length == 0)) {
			if (this.debug)
				console.log("-\nMWC has insufficient information (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), canceling bet");
			self.abstain = true;
			return null;
		}
		if (c1.wins.length != c2.wins.length) {
			p = (c1.wins.length > c2.wins.length) ? c1.name : c2.name;
			if (this.debug)
				console.log(p + " has more wins (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "); MWC betting " + p);
			self.prediction = p;
			return p;
		} else if (c1.losses.length != c2.losses.length) {
			p = (c1.losses.length < c2.losses.length) ? c1.name : c2.name;
			if (this.debug)
				console.log(p + " has less losses (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "); MWC betting " + p);
			self.prediction = p;
			return p;
		} else {
			if (this.debug)
				console.log("-\nMWC has insufficient information (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), canceling bet");
			self.abstain = true;
			return null;
		}
	};
};
MoreWinsCautious.prototype = Strategy;

var RatioBasic = function() {
	this.base = Strategy;
	this.base("rb");
	this.abstain = false;
	var s = this;
	this.execute = function(info) {
		var self = s;
		var c1 = info.character1;
		var c2 = info.character2;
		var c1TotalMatches = c1.wins.length + c1.losses.length;
		var c2TotalMatches = c2.wins.length + c2.losses.length;
		var p;

		if (c1TotalMatches < 2 || c2TotalMatches < 2) {
			if (this.debug)
				console.log("-\nRB has insufficient information (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), canceling bet");
			self.abstain = true;
			return null;
		}
		var c1Ratio = c1.wins.length / c1TotalMatches;
		var c2Ratio = c2.wins.length / c2TotalMatches;

		if (c1Ratio != c2Ratio) {
			c1.ratio = c1Ratio;
			c2.ratio = c2Ratio;
			var pChar = (c1.ratio > c2.ratio) ? c1 : c2;
			var npChar = (c1.ratio < c2.ratio) ? c1 : c2;
			//
			if (pChar.ratio <= 0.5 || (npChar.ratio == 0.5 && (npChar.wins.length + npChar.losses.length == 2))) {
				if (this.debug)
					console.log("-\nRB prohibited from betting on or against <51% (" + (c1Ratio * 100) + "% : " + (c2Ratio * 100) + "%), canceling bet");
				self.abstain = true;
				return null;
			}
			p = pChar.name;
			if (this.debug)
				console.log("-\n" + p + " has a better win percentage (" + (c1Ratio * 100) + "% : " + (c2Ratio * 100) + "%); RB betting " + p);
			self.prediction = p;
			return p;
		} else if (c1Ratio == c2Ratio) {
			if (this.debug)
				console.log("-\nRB has insufficient information (" + (c1Ratio * 100) + "% : " + (c2Ratio * 100) + "%), canceling bet");
			self.abstain = true;
			return null;
		}
	};
};
RatioBasic.prototype = Strategy;

var Chromosome = function() {
	// original values
	this.wModBest = 1;
	this.wModMiddle = 0.5;
	this.wModWorst = 0.25;
	this.oddsWeight = 1;
	this.timeWeight = 0.5;
	this.winPercentageWeight = 1;
	this.totalWinsWeight = 0.1;
	// tier Scoring
	this.wx = 5;
	this.ws = 4;
	this.wa = 3;
	this.wb = 2;
	this.wp = 1;
	this.lx = 1;
	this.ls = 2;
	this.la = 3;
	this.lb = 4;
	this.lp = 5;
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
			// 80% chance of mutation
			var radiation = Math.random() + Math.random();
			if (Math.random() < 0.8)
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
var CSStats = function() {
	this.oddsSum = 0;
	this.oddsCount = 0;
	this.winTimesTotal = 0;
	this.lossTimesTotal = 0;
	this.timedWonMatchesCount = 0;
	this.timedLostMatchesCount = 0;
};
var ConfidenceScore = function(chromosome) {
	this.base = Intermediary;
	this.base("cs");
	this.abstain = false;
	// this.fallback1 = new RatioBasic();
	// this.fallback1.debug = false;
	// this.fallback2 = new MoreWinsCautious();
	// this.fallback2.debug = false;
	this.chromosome = chromosome || this.chromosome;
};
ConfidenceScore.prototype = Intermediary;
ConfidenceScore.prototype.extractMatchInfo = function(c, m, stats) {
	var wasPlayer1 = c.name == m.c1;
	var wonMatch = (wasPlayer1 && m.w == 0) || (!wasPlayer1 && m.w == 1);
	if (m.o != "U") {
		var odds = m.o.split(":");
		stats.oddsSum += (wasPlayer1) ? parseFloat(odds[0]) / parseFloat(odds[1]) : parseFloat(odds[1]) / parseFloat(odds[0]);
		stats.oddsCount += 1;
	}
	if (m.ts != 0) {
		if (wonMatch) {
			stats.winTimesTotal += m.ts;
			stats.timedWonMatchesCount += 1;
		} else {
			stats.lossTimesTotal += m.ts;
			stats.timedLostMatchesCount += 1;
		}
	}
};
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
		return this.countFromRecord(c, ["p", "b", "a", "s", "x"], this.chromosome.wModBest);
	} else if (!hasTiered && hasUntiered) {
		// next best case
		return this.countFromRecord(c, ["U"], this.chromosome.wModMiddle);
	} else {
		// worst-case
		return this.countFromRecord(c, ["U", "p", "b", "a", "s", "x"], this.chromosome.wModWorst);
	}
};
ConfidenceScore.prototype.execute = function(info) {
	
	var c1 = info.character1;
	var c2 = info.character2;
	var matches = info.matches;
	var c1Stats = new CSStats();
	var c2Stats = new CSStats();
	
	//Do this at import and character update time, not here
	for (var i = 0; i < matches.length; i++) {
		var match = matches[i];
		if (match.c1 == c1.name || match.c2 == c1.name)
			this.extractMatchInfo(c1, match, c1Stats);
		if (match.c1 == c2.name || match.c2 == c2.name)
			this.extractMatchInfo(c2, match, c2Stats);
	}

	var c1AverageOdds = (c1Stats.oddsCount != 0) ? c1Stats.oddsSum / c1Stats.oddsCount : null;
	var c2AverageOdds = (c2Stats.oddsCount != 0) ? c2Stats.oddsSum / c2Stats.oddsCount : null;
	var c1AverageWinTime = (c1Stats.timedWonMatchesCount != 0) ? c1Stats.winTimesTotal / c1Stats.timedWonMatchesCount : null;
	var c2AverageWinTime = (c2Stats.timedWonMatchesCount != 0) ? c2Stats.winTimesTotal / c2Stats.timedWonMatchesCount : null;
	var c1AverageLossTime = (c1Stats.timedLostMatchesCount != 0) ? c1Stats.lossTimesTotal / c1Stats.timedLostMatchesCount : null;
	var c2AverageLossTime = (c2Stats.timedLostMatchesCount != 0) ? c2Stats.lossTimesTotal / c2Stats.timedLostMatchesCount : null;

	// the weights can be tweaked this way
	var c1Score = 0;
	var c2Score = 0;
	var oddsWeight = this.chromosome.oddsWeight;
	var timeWeight = this.chromosome.timeWeight;
	var winPercentageWeight = this.chromosome.winPercentageWeight;
	var totalWinsWeight = this.chromosome.totalWinsWeight;

	if (c1AverageOdds != null && c2AverageOdds != null)
		if (c1AverageOdds > c2AverageOdds)
			c1Score += oddsWeight;
		else if (c1AverageOdds < c2AverageOdds)
			c2Score += oddsWeight;

	if (c1AverageWinTime != null && c2AverageWinTime != null)
		if (c1AverageWinTime < c2AverageWinTime)
			c1Score += timeWeight;
		else if (c1AverageWinTime > c2AverageWinTime)
			c2Score += timeWeight;

	if (c1AverageLossTime != null && c2AverageLossTime != null)
		if (c1AverageLossTime > c2AverageLossTime)
			c1Score += timeWeight / 2;
		else if (c1AverageLossTime < c2AverageLossTime)
			c2Score += timeWeight / 2;

	// tier weighting section
	var hasTieredMatchesRE = /[pbasx]/g;
	var hasUntieredMatchesRE = /[u]/g;
	var c1WinsAndLosses = c1.wins.toString() + c1.losses.toString();
	var c2WinsAndLosses = c2.wins.toString() + c2.losses.toString();
	var hasTiered = hasTieredMatchesRE.test(c1WinsAndLosses) && hasTieredMatchesRE.test(c2WinsAndLosses);
	var hasUntiered = hasUntieredMatchesRE.test(c1WinsAndLosses) && hasUntieredMatchesRE.test(c2WinsAndLosses);

	var c1WLScores = this.getWeightedScores(c1, hasTiered, hasUntiered);
	var c2WLScores = this.getWeightedScores(c2, hasTiered, hasUntiered);
	var c1WWinPercentage = c1WLScores[0] / (c1WLScores[0] + c1WLScores[1]);
	var c2WWinPercentage = c2WLScores[0] / (c2WLScores[0] + c2WLScores[1]);

	if (c1WWinPercentage > c2WWinPercentage)
		c1Score += winPercentageWeight;
	else if (c2WWinPercentage > c1WWinPercentage)
		c2Score += winPercentageWeight;

	if (c1WLScores[0] > c2WLScores[0])
		c1Score += totalWinsWeight;
	else if (c1WLScores[0] < c2WLScores[0])
		c2Score += totalWinsWeight;
	else if (c1WLScores[1] < c2WLScores[1])
		c1Score += totalWinsWeight;
	else if (c1WLScores[1] > c2WLScores[1])
		c2Score += totalWinsWeight;

	// final decision
	if ((c1.wins.length == 0 && c1.losses.length == 0) || (c2.wins.length == 0 && c2.losses.length == 0)) {
		if (this.debug)
			console.log("-\nCS has insufficient information (scores: " + c1Score + ":" + c2Score + ")(" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), canceling bet");
		this.abstain = true;
		return null;
	}
	if (c1Score == c2Score) {
		this.abstain = true;
		if (this.debug)
			console.log("-\nCS has insufficient information (scores: " + c1Score + ":" + c2Score + ")(" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), canceling bet");
		return null;
	}
	this.prediction = (c1Score > c2Score) ? c1.name : c2.name;
	if (this.debug)
		console.log("-\n" + this.prediction + " has a better W score (scores: " + c1Score + ":" + c2Score + ")(" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), betting " + this.prediction);
	return this.prediction;
};



var Observer = function() {
	this.base = Strategy;
	this.base("obs");
	this.abstain = true;
	this.execute = function(info) {
		if (this.debug)
			console.log("-\nOBS does not bet");
		return null;
	};
};
Observer.prototype = Strategy;
