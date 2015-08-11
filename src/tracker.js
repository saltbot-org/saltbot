var Match = function(strat) {
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
};
Match.prototype.update = function(infoFromWaifu, odds, timeInfo, crowdFavor, illumFavor) {
	for (var i = 0; i < infoFromWaifu.length; i++) {
		var ifw = infoFromWaifu[i];
		if (this.names[0] == ifw.c1 && this.names[1] == ifw.c2) {
			this.tier = ifw.tier;
			this.mode = ifw.mode;
			break;
		}
	}
	if (odds != null)
		this.odds = odds;

	if (timeInfo.ticks > 0)
		this.time = timeInfo.ticks * timeInfo.interval / 1000;
	//Ignore times from matches that occurred before changing modes; 350 is the maximum time that can occur
	if (this.time >= 240)
		this.time = 0;
	//add more time to matches that are recognized as being in exhibition mode, proportional to the amount of required matches missing
	if (this.mode == "e")
		this.time = Math.round(this.time * 1.5);
	// add favor stats
	this.crowdFavor = crowdFavor;
	this.illumFavor = illumFavor;
};
Match.prototype.getRecords = function(w) {//in the event of a draw, pass in the string "draw"
	if (this.names.indexOf(w) > -1) {
		var updater = new Updater();
		this.winner = (w == this.character1.name) ? 0 : 1;
		var pw = null;
		if (this.strategy.abstain)
			pw = "a";
		else
			pw = (this.strategy.prediction == this.names[this.winner]) ? "t" : "f";
		var mr = {
			"c1" : this.character1.name,
			"c2" : this.character2.name,
			"w" : this.winner,
			"sn" : this.strategy.strategyName,
			"pw" : pw,
			"t" : this.tier,
			"m" : this.mode.charAt(0),
			"o" : this.odds,
			"ts" : this.time,
			"cf" : this.crowdFavor,
			"if" : this.illumFavor
		};

		updater.updateCharactersFromMatch(mr, this.character1, this.character2);
		return [mr, this.character1, this.character2];
	} else {
		console.log("-\nsalt robot error : name not in list : " + w + " names: " + this.names[0] + ", " + this.names[1]);
		return null;
	}
};
Match.prototype.getBalance = function(){
	var balanceBox = document.getElementById("balance");
	var balance = parseInt(balanceBox.innerHTML.replace(/,/g, ""));
	return balance;
}
Match.prototype.betAmount = function(tournament) {
	var balance = this.getBalance();
	var wagerBox = document.getElementById("wager");
	var amountToBet;
	var strategy = this.strategy;
	var debug = true;

	strategy.adjustLevel(balance);
	amountToBet = strategy.getBetAmount(balance, tournament, debug);
	if (this.strategy.aggro) {
		amountToBet *= 10;
		if (amountToBet > balance)
			amountToBet = balance;
		console.log("AGGRO multiplier active, increasing bet to "+amountToBet);
	}

	wagerBox.value = amountToBet.toString();
};
Match.prototype.init = function() {
	var s = this;

	//Attempt to get character objects from storage, if they don't exist create them
	chrome.storage.local.get(["matches_v1", "characters_v1", "rankings_v1"], function(result) {
		var self = s;
		var baseSeconds = 2000;
		var recs = result.characters_v1;

		//self.fillCharacters(result);//get character record objects or make new ones
		if (recs)
			for (var i = 0; i < recs.length; i++) {
				var c = recs[i];
				if (c.name == self.names[0]) {
					self.character1 = c;
				}
				if (c.name == self.names[1]) {
					self.character2 = c;
				}
			}

		//
		self.character1 = (self.character1 == null) ? new Character(self.names[0]) : self.character1;
		self.character2 = (self.character2 == null) ? new Character(self.names[1]) : self.character2;

		var prediction = self.strategy.execute({
			"character1" : self.character1,
			"character2" : self.character2,
			"matches" : result.matches_v1,
			"tree" : result.rankings_v1
		});

		if (prediction != null || self.strategy.lowBet) {
			setTimeout(function() {
				var tournamentModeIndicator = "characters are left in the bracket!";
				var tournamentModeIndicator2 = "Tournament mode start";
				var tournamentModeIndicator3 = "FINAL ROUND! Stay tuned for exhibitions after the tournament!";
				var footer = document.getElementById("footer-alert");
				var tournament = footer != null && (footer.innerHTML.indexOf(tournamentModeIndicator) > -1 || footer.innerHTML.indexOf(tournamentModeIndicator2) > -1 ||
													footer.innerHTML.indexOf(tournamentModeIndicator3) > -1);

				self.betAmount(tournament);

			}, Math.floor(Math.random() * baseSeconds));
			setTimeout(function() {
				if (prediction == self.strategy.p1name) {
					self.strategy.btnP1.click();
				} else {
					self.strategy.btnP2.click();
				}
			}, (Math.floor(Math.random() * baseSeconds * 2) + baseSeconds));
		}

	});
};
Match.prototype.setAggro = function(aggro) {
	this.strategy.aggro = aggro;
};
