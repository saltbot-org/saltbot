var Strategy = function(sn) {
	this.btn10 = document.getElementById("interval1");
	this.btn50 = document.getElementById("interval5");
	this.btnP1 = document.getElementById("player1");
	this.btnP2 = document.getElementById("player2");
	this.p1name = this.btnP1.getAttribute("value");
	this.p2name = this.btnP2.getAttribute("value");
	this.strategyName = sn;
	this.prediction = null;
	var s = this;
	this.getWinner = function(ss) {
		return ss.getWinner();
	};
};

var CoinToss = function() {
	this.base = Strategy;
	this.base("ct");
	var s = this;
	this.execute = function(info) {
		var self = s;
		var p = (Math.random() > .5) ? self.p1name : self.p2name;
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
			console.log(p + " has more wins (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "); MW betting " + p);
			self.prediction = p;
			return p;
		} else if (c1.losses.length != c2.losses.length) {
			p = (c1.losses.length < c2.losses.length) ? c1.name : c2.name;
			console.log(p + " has less losses (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "); MW betting " + p);
			self.prediction = p;
			return p;
		} else {
			p = (Math.random() > .5) ? c1.name : c2.name;
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
			console.log("-\nMWC has insufficient information (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "), canceling bet");
			self.abstain = true;
			return null;
		}
		if (c1.wins.length != c2.wins.length) {
			p = (c1.wins.length > c2.wins.length) ? c1.name : c2.name;
			console.log(p + " has more wins (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "); MWC betting " + p);
			self.prediction = p;
			return p;
		} else if (c1.losses.length != c2.losses.length) {
			p = (c1.losses.length < c2.losses.length) ? c1.name : c2.name;
			console.log(p + " has less losses (" + c1.wins.length + ":" + c1.losses.length + ")(" + c2.wins.length + ":" + c2.losses.length + "); MWC betting " + p);
			self.prediction = p;
			return p;
		} else {
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
			if (pChar.ratio <= 0.5) {
				console.log("-\nRB prohibited from betting on <51% (" + c1Ratio + "%:" + c2Ratio + "%), canceling bet");
				self.abstain = true;
				return null;
			}
			p = pChar.name;
			console.log("-\n" + p + " has a better win percentage (" + c1Ratio + "%:" + c2Ratio + "%); RB betting " + p);
			self.prediction = p;
			return p;
		} else if (c1Ratio == c2Ratio) {
			console.log("-\nRB has insufficient information (" + c1Ratio + "%:" + c2Ratio + "%), canceling bet");
			self.abstain = true;
			return null;
		}
	};
};
RatioBasic.prototype = Strategy;

var Observer = function() {
	this.base = Strategy;
	this.base("obs");
	this.abstain = true;
	this.execute = function(info) {
		console.log("-\nOBS does not bet");
		return null;
	};
};
Observer.prototype = Strategy;
