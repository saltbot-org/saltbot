

var Strategy = function(sn) {
	this.btn10 = document.getElementById("interval1");
	this.btnP1 = document.getElementById("player1");
	this.btnP2 = document.getElementById("player2");
	this.p1name = this.btnP1.getAttribute("value");
	this.p2name = this.btnP2.getAttribute("value");
	this.strategyName = sn;
	this.prediction = null;
	this.totals = parseInt(document.getElementById("balance").innerHTML.replace(/,/g, ''));
	var s = this;
	this.getWinner = function(ss) {
		var self = s;
		var newTotals = parseInt(document.getElementById("balance").innerHTML.replace(/,/g, ''));
		var winner = null;
		if (self.abstain == true) {
			//special way to get winner for strategies which can abstain
			return ss.getWinner();
		}
		if (newTotals > this.totals) {
			winner = self.prediction;
		} else if (newTotals <= self.totals) {
			winner = (self.prediction == self.p1name) ? self.p2name : self.p1name;
		}
		return winner;
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
		if (c1.wins != c2.wins) {
			p = (c1.wins > c2.wins) ? c1.name : c2.name;
			console.log(p + " has more wins; MW betting " + p);
			self.prediction = p;
			return p;
		} else if (c1.losses != c2.losses) {
			p = (c1.losses < c2.losses) ? c1.name : c2.name;
			console.log(p + " has less losses; MW betting " + p);
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
		if ((c1.wins == 0 && c1.losses == 0) || (c2.wins == 0 && c2.losses == 0)) {
			console.log("-\nMWC has insufficient information (1), canceling bet");
			self.abstain = true;
			return null;
		}
		if (c1.wins != c2.wins) {
			p = (c1.wins > c2.wins) ? c1.name : c2.name;
			console.log(p + " has more wins; MWC betting " + p);
			self.prediction = p;
			return p;
		} else if (c1.losses != c2.losses) {
			p = (c1.losses < c2.losses) ? c1.name : c2.name;
			console.log(p + " has less losses; MWC betting " + p);
			self.prediction = p;
			return p;
		} else {
			console.log("-\nMWC has insufficient information (2), canceling bet");
			self.abstain = true;
			return null;
		}
	};
};
MoreWinsCautious.prototype = Strategy;

