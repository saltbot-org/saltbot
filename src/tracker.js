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
};
Match.prototype.update = function(infoFromWaifu, odds, timeInfo) {
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
	if (this.time >= 350)
		this.time = 0;
	//add more time to matches that are recognized as being in exhibition mode, proportional to the amount of required matches missing
	if (this.mode == "e")
		this.time = Math.round(this.time * 1.5);
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
			"ts" : this.time
		};

		updater.updateCharactersFromMatch(mr, this.character1, this.character2);
		return [mr, this.character1, this.character2];
	} else {
		console.log("-\nsalt robot error : name not in list : " + w + " names: " + this.names[0] + ", " + this.names[1]);
		return null;
	}
};
Match.prototype.betAmount = function(tournament, debug) {
	var balanceBox = document.getElementById("balance");
	var wagerBox = document.getElementById("wager");
	var balance = parseInt(balanceBox.innerHTML.replace(",", ""));
	var amountToBet;
	if (this.strategy instanceof ConfidenceScore)
		this.strategy.confidence = this.strategy.fallback1.confidence || 0.1;
	if (tournament) {
		amountToBet = Math.round(balance * (this.strategy.confidence || 0.5)).toString();
		wagerBox.value = amountToBet;
		if (debug) {
			if (this.strategy.confidence)
				console.log("- betting: " + balance + " x  cf(" + (Math.round(this.strategy.confidence * 100)).toFixed(2) + "%) = " + amountToBet);
			else
				console.log("- betting: " + balance + " x  50%) = " + amountToBet);
		}
	} else if (!tournament && this.strategy.confidence && !this.strategy.lowBet) {
		amountToBet = Math.round(balance * .1 * this.strategy.confidence).toString();
		wagerBox.value = amountToBet;
		if (debug)
			console.log("- betting: " + balance + " x .10 =(" + (balance * .1) + ") x cf(" + (Math.round(this.strategy.confidence * 100)).toFixed(2) + "%) = " + amountToBet);
	} else {
		amountToBet = (100 + Math.round(Math.random() * 75)).toString();
		wagerBox.value = amountToBet;
		if (debug)
			console.log("- betting without confidence: " + amountToBet);
	}

};
Match.prototype.init = function() {
	var s = this;

	//Attempt to get character objects from storage, if they don't exist create them
	chrome.storage.local.get(["matches_v1", "characters_v1"], function(result) {
		var self = s;
		var baseSeconds = 2000;
		var recs = result.characters_v1;

		//self.fillCharacters(result);//get character record objects or make new ones
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
			"matches" : result.matches_v1
		});

		if (prediction != null || self.strategy.lowBet) {
			setTimeout(function() {
				var tournamentModeIndicator = "characters are left in the bracket!";
				var footer = document.getElementById("footer-alert");
				//
				if (footer != null && footer.innerHTML.indexOf(tournamentModeIndicator) > -1) {
					//bet more in tournaments
					self.betAmount(true, true);
					// self.strategy.btn50.click();
				} else {
					self.betAmount(false, true);
					// self.strategy.btn10.click();
				}
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

