var detectTournament = function() {
	const tournamentModeIndicator = "characters are left in the bracket!";
	const tournamentModeIndicator2 = "Tournament mode start";
	const tournamentModeIndicator3 = "FINAL ROUND! Stay tuned for exhibitions after the tournament!";
	const footer = $("#footer-alert")[0];
	const tournament = footer != null && (footer.innerHTML.indexOf(tournamentModeIndicator) > -1 || footer.innerHTML.indexOf(tournamentModeIndicator2) > -1 ||
		footer.innerHTML.indexOf(tournamentModeIndicator3) > -1);
	return tournament;
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
	this.time = 0;
	this.crowdFavor = 2;
	this.illumFavor = 2;
	this.multiplier = 1;
};
Match.prototype.update = function(infoFromWaifu, odds, timeInfo, crowdFavor, illumFavor) {
	for (const ifw of infoFromWaifu) {
		if (this.names[0] === ifw.c1 && this.names[1] === ifw.c2) {
			this.tier = ifw.tier;
			this.mode = ifw.mode;
			break;
		}
	}
	if (odds != null) {
		this.odds = odds;
	}

	if (timeInfo.ticks > 0) {
		this.time = timeInfo.ticks * timeInfo.interval / 1000;
	}
	//Ignore times from matches that occurred before changing modes; 350 is the maximum time that can occur. 630=9*70
	if (this.time >= 350) {
		this.time = 0;
	}
	//add more time to matches that are recognized as being in exhibition mode, proportional to the amount of required matches missing
	if (this.mode === "e") {
		this.time = Math.round(this.time * 1.5);
	}
	// add favor stats
	this.crowdFavor = crowdFavor;
	this.illumFavor = illumFavor;
};
Match.prototype.getRecords = function(w) {//in the event of a draw, pass in the string "draw"
	if (this.names.indexOf(w) > -1) {
		const updater = new Updater();
		this.winner = (w === this.character1.name) ? 0 : 1;
		let pw = null;
		if (this.strategy.abstain) {
			pw = "a";
		}
		else {
			pw = (this.strategy.prediction === this.names[this.winner]) ? "t" : "f";
		}
		const mr = new MatchRecord({
			c1: this.character1.name,
			c2: this.character2.name,
			w: this.winner,
			sn: this.strategy.strategyName,
			pw,
			t: this.tier,
			m: this.mode.charAt(0),
			o: this.odds,
			ts: this.time,
			cf: this.crowdFavor,
			if: this.illumFavor,
			dt: moment().format("DD-MM-YYYY"),
		});

		updater.updateCharactersFromMatch(mr, this.character1, this.character2);
		return [mr, this.character1, this.character2];
	} else {
		console.log("-\nsalt robot error : name not in list : " + w + " names: " + this.names[0] + ", " + this.names[1]);
		return null;
	}
};
Match.prototype.getBalance = function() {
	const balanceBox = $("#balance")[0];
	const balance = parseInt(balanceBox.innerHTML.replace(/,/g, ""), 10);
	return balance;
};

Match.prototype.betAmount = function(tournament: boolean): void {
	const balance: number = this.getBalance();
	const wagerBox: HTMLInputElement = $("#wager")[0] as HTMLInputElement;

	let amountToBet: number;
	const strategy = this.strategy;
	const debug: boolean = true;

	strategy.adjustLevel(balance);
	amountToBet = strategy.getBetAmount(balance, tournament, debug);
	if (!tournament) {
	console.log("- Multiplying initial bet amount " + amountToBet + " with " + this.multiplier);
	amountToBet = Math.floor(amountToBet * this.multiplier);
	if (amountToBet > balance) {
		amountToBet = balance;
	}

	if (this.strategy.aggro) {
		amountToBet *= 10;
		if (amountToBet > balance) {
			amountToBet = balance;
		}
		console.log("- AGGRO multiplier active, increasing bet to " + amountToBet);
	}
}

	if (amountToBet === 0) {
		//bet at least 1
		amountToBet = 1;
	}

	wagerBox.value = amountToBet.toString();
};
Match.prototype.init = function() {
	const s = this;

	//Attempt to get character objects from storage, if they don't exist create them
	chrome.storage.local.get(["characters_v1", "settings_v1"], async function(result) {
		const self = s;
		const baseSeconds = 2000;
		const recs = result.characters_v1 || [];
		self.multiplier = result.settings_v1.multiplier;

		const character1Index = binarySearchByProperty({ name: self.names[0] }, recs, "name");
		const character2Index = binarySearchByProperty({ name: self.names[1] }, recs, "name");

		self.character1 = (character1Index < 0) ? new Character(self.names[0]) : recs[character1Index];
		self.character2 = (character2Index < 0) ? new Character(self.names[1]) : recs[character2Index];

		let matches = [];
		await chrome.runtime.sendMessage({ query: "getMatchRecords" }, function(data: MatchRecord[]) {
			matches = data;
		});

		const prediction = self.strategy.execute({
			character1: self.character1,
			character2: self.character2,
			matches,
		});

		if (prediction != null || self.strategy.lowBet) {
			setTimeout(function() {
				self.betAmount(detectTournament());

			}, Math.floor(Math.random() * baseSeconds));
			setTimeout(function() {
				if (prediction === self.strategy.p1name) {
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
