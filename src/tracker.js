var Character = function(name) {
	this.name = name;
	this.wins = [];
	this.losses = [];
};

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

};
Match.prototype.update = function(infoFromWaifu, odds) {
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
};
Match.prototype.getRecords = function(w) {//in the event of a draw, pass in the string "draw"
	if (this.names.indexOf(w) > -1) {
		if (w == this.character1.name) {
			this.character1.wins.push(this.tier);
			this.character2.losses.push(this.tier);
		} else if (w == this.character2.name) {
			this.character2.wins.push(this.tier);
			this.character1.losses.push(this.tier);
		}
		this.winner = (w == this.character1.name)?0:1;

		var pw = null;
		if (this.strategy instanceof MoreWinsCautious || this.strategy instanceof Observer) {
			if (this.strategy.abstain) {
				pw = "a";
			} else {
				pw = (this.strategy.prediction == this.winner) ? "t" : "f";
			}
		} else {
			pw = (this.strategy.prediction == this.winner) ? "t" : "f";
		}

		return [{
			"c1" : this.character1.name,
			"c2" : this.character2.name,
			"w" : this.winner,
			"sn" : this.strategy.strategyName,
			"pw" : pw,
			"t" : this.tier,
			"m" : this.mode.charAt(0), 
			"o": this.odds
		}, this.character1, this.character2];
	} else {
		console.log("-\nsalt robot error : name not in list : " + w + " names: " + this.names[0] + ", " + this.names[1]);
		return null;
	}
};
Match.prototype.init = function() {
	var s = this;

	//Attempt to get character objects from storage, if they don't exist create them
	chrome.storage.local.get("characters_v1", function(result) {
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
			"character2" : self.character2
		});

		if (prediction != null) {
			setTimeout(function() {
				self.strategy.btn10.click();
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

