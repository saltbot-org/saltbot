function Character(name) {
	this.name = name;
	this.wins = 0;
	this.losses = 0;
	this.tier = null;
	this.extras = [];
}

function Match(strategy) {
	var names = [strategy.getP1Name(), strategy.getP2Name()];
	var strategy = strategy;
	var character1 = null;
	var character2 = null;
	var winner = null;
	this.getStrategy=function (){
		return strategy;		
	};
	

	//Attempt to get character objects from storage, if they don't exist create them
	chrome.storage.local.get(names, function(result) {
		character1 = (result.hasOwnProperty(names[0])) ? result[names[0]] : new Character(names[0]);
		character2 = (result.hasOwnProperty(names[1])) ? result[names[1]] : new Character(names[1]);
		var prediction = strategy.execute();
		var baseSeconds = 2000;
		setTimeout(function() {
			strategy.getMinimumBetButton().click();
		}, Math.floor(Math.random() * baseSeconds));
		setTimeout(function() {
			if (prediction == strategy.getP1Name()) {
				strategy.getP1Button().click();
			} else {
				strategy.getP2Button().click();
			}
		}, (Math.floor(Math.random() * baseSeconds * 2) + baseSeconds));

	});
	this.getRecords = function(w) {//in the event of a draw, pass in the string "draw"
		
		if (names.indexOf(w) > -1) {
			if (w == character1.name) {
				character1.wins += 1;
				character2.losses += 1;
			} else if (w == character2.name) {
				character2.wins += 1;
				character1.losses += 1;
			}
			winner = w;
			return [new MatchResult(), character1, character2];
		} else {
			return null;
		}

	};
	var MatchResult = function() {
		this.c1 = character1.name;
		this.c2 = character2.name;
		this.w = winner;
		this.sn = strategy.getStrategyName();
		this.pw = strategy.getPrediction() == winner;
	};
}

function Tracker() {
	var currentMatch = null;

	this.setMatch = function() {
		//Get player names directly from the buttons

		currentMatch = new Match(c1name, c2name);
	};
	this.setWinner = function(w) {
		var result = currentMatch.getRecord(w);
		if (result != null) {
			console.log(" match ending information: " + "p1: " + result.c1 + "p2: " + result.c2 + "w: " + result.w + "sn: " + result.sn + "pw: " + result.pw);
		}
	};
	this.saveRecord = function(w) {
		if ([this.character1, this.character2].indexOf(w) > -1) {
			var match = [this.character1, this.character2, w];

			chrome.storage.local.set({
				'value' : theValue
			}, function() {
				// Notify that we saved.
				message('Settings saved');
			});

		}

	};

}
