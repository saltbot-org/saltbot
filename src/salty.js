var StatusScanner = function() {
	var self = this;
	this.announcements = [];
	// find element and create an observer instance
	var status = document.getElementById("betstatus");
	var observer = new MutationObserver(function(mutations) {
		self.announcements.push(status.innerHTML);
		// console.log("- status bar updated: " + status.innerHTML);
		observer.takeRecords();
	});
	observer.observe(status, {
		subtree : true,
		childList : true,
		attributes : true
	});
	var winIndicator = " wins";

	this.getAnnouncements = function(preserve) {
		var copy = self.announcements.slice(0);
		if (!preserve) {
			self.announcements = [];
		}
		return copy;
	};
	this.getWinner = function() {
		var recent = self.getAnnouncements();
		recent.reverse();
		for (var i = 0; i < recent.length; i++) {
			if (recent[i].indexOf(winIndicator) > -1) {
				return recent[i].split(winIndicator)[0];
			}
		}
		return null;
	};
};

var Controller = function() {
	var bettingAvailable = false;
	var bettingEntered = false;
	var bettingComplete = true;
	var matchesBeforeReset = 25;
	var matchesProcessed = 0;
	this.currentMatch = null;
	this.statusScanner = new StatusScanner();
	this.infoFromWaifu = [];
	this.lastWinnerFromWaifuAnnouncement = null;
	this.odds = null;
	var attemptsToProcess = 0;
	var maxAttempts = 3;
	var timerInterval = 3000;

	var self = this;

	var debugMode = true;

	setInterval(function() {
		//check to see if the betting buttons are visible
		var bettingTable = document.getElementsByClassName("dynamic-view")[0];
		var styleObj = window.getComputedStyle(bettingTable, null);
		var active = styleObj.display != "none";
		if (!active)
			bettingAvailable = false;

		if (active && bettingComplete == true) {
			bettingAvailable = true;
			bettingEntered = false;
			bettingComplete = false;
		}

		if (bettingAvailable && !bettingEntered) {

			//Deal with old match
			if (self.currentMatch != null) {
				var winner = self.statusScanner.getWinner();
				//backup method to get winner is scanning the chat
				if (winner == null)
					winner = self.lastWinnerFromWaifuAnnouncement;
				//safety check
				if (winner != self.currentMatch.names[0] && winner != self.currentMatch.names[1])
					winner = null;
				//wait a little bit longer before giving up on this match getting processed
				if (winner == null && attemptsToProcess < maxAttempts) {
					attemptsToProcess += 1;
					return;
				}
				if (winner != null) {
					attemptsToProcess = 0;
					//before processing match, add tier information if we have it
					self.currentMatch.update(self.infoFromWaifu, self.odds);
					var records = self.currentMatch.getRecords(winner);
					var mr = records[0];
					var c1 = records[1];
					var c2 = records[2];

					console.log("match results: " + "\ncharacter 1: " + mr.c1 + "\ncharacter 2: " + mr.c2 + "\nwinner: " + mr.w + "\nstrategy: " + mr.sn + "\nprediction: " + mr.pw + "\ntier: " + mr.t + "\nmode: " + mr.m + "\nodds: " + mr.o);

					chrome.storage.local.get(["matches_v1", "characters_v1"], function(results) {
						var matches_v1 = null;
						var characters_v1 = null;
						var mbr = matchesBeforeReset;
						var mp = matchesProcessed;
						//store new match record
						if (results.hasOwnProperty("matches_v1")) {
							results.matches_v1.push(mr);
							matches_v1 = results.matches_v1;
						} else {
							matches_v1 = [];
							matches_v1.push(mr);
						}
						if (debugMode) {
							console.log("-\nnumber of match records: " + matches_v1.length);
						}
						//character records:
						if (results.hasOwnProperty("characters_v1")) {
							characters_v1 = results.characters_v1;
						} else {
							characters_v1 = [];
						}
						//find if characters are already in local storage
						var c1_index = -1;
						var c2_index = -1;
						for (var i = 0; i < characters_v1.length; i++) {
							if (characters_v1[i].name == c1.name) {
								c1_index = i;
							}
							if (characters_v1[i].name == c2.name) {
								c2_index = i;
							}
						}
						//update records accordingly
						if (c1_index != -1) {
							characters_v1[c1_index] = c1;
						} else {
							characters_v1.push(c1);
						}
						if (c2_index != -1) {
							characters_v1[c2_index] = c2;
						} else {
							characters_v1.push(c2);
						}
						if (debugMode) {
							console.log("-\nnumber of character records: " + characters_v1.length);
						}
						//
						chrome.storage.local.set({
							'matches_v1' : matches_v1,
							'characters_v1' : characters_v1
						}, function() {
							if (debugMode) {
								console.log("-\nrecords saved, matches this cycle: " + mp);
							}
							if (mp >= mbr) {
								location.reload();
							}
						});
					});

				} else {
					//if we failed to get a winner and record the match, still count the match towards the reset number
					console.log("-\nfailed to determine winner, matches this cycle: " + matchesProcessed);
					if (matchesProcessed >= matchesBeforeReset)
						location.reload();
				}
				//
				matchesProcessed += 1;
			}

			self.currentMatch = new Match(new MoreWinsCautious());
			//skip team matches
			if (self.currentMatch.names[0].toLowerCase().indexOf("team") == -1 && self.currentMatch.names[1].toLowerCase().indexOf("team") == -1) {
				self.currentMatch.init();
			} else {
				self.currentMatch = null;
				console.log("-\nskipping team match");
			}

			bettingEntered = true;
		}

		if (!active && bettingEntered) {
			bettingComplete = true;
			bettingAvailable = false;
		}

	}, timerInterval);

};
// Controller.prototype.receiveMessageFromTwitch = ;
Controller.prototype.ensureTwitch = function() {
	chrome.runtime.sendMessage({
		getTwitch : true
	}, function(response) {
		console.log("response received in salty");
	});
};

var ctrl;
if (window.location.href == "http://www.saltybet.com/") {
	ctrl = new Controller();
	ctrl.ensureTwitch();
	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		var self = ctrl;
		// console.log("-\nmessage from Waifu:\t" + message);
		if ( typeof message === "string") {
			var winMessageIndicator = " wins";
			var newMatchIndicator = "Bets are OPEN for ";
			var betsLockedIndicator = "Bets are locked";

			//check for new match
			if (message.indexOf(newMatchIndicator) > -1) {
				//examples:
				//Bets are OPEN for Rydia of mist vs Zatanna EX3! (B Tier) (matchmaking) www.saltybet.com
				// Bets are OPEN for Valdoll vs Adam! (A Tier) tournament bracket
				//Bets are OPEN for Team RyokoAndHerTrainingPartner vs Team Aliens! (S / S Tier) (Requested by Pendaflex) (exhibitions) www.saltybet.com
				var regex = /(?:Bets are OPEN for )(.*)(?: vs )(.*)(?:! \()(X|S|A|B|P|NEW)(?: Tier\))(.*)/g;
				var matches = regex.exec(message);
				if (matches == null) {
					var regexLoose = /(?:Bets are OPEN for )(.*)(?: vs )(.*)!/g;
					matches = regexLoose.exec(message);
					matches.push("U", "U");
				}
				if (matches[4].indexOf("matchmaking") > -1)
					matches[4] = "m";
				else if (matches[4].indexOf("tournament") > -1)
					matches[4] = "t";
				else if (matches[4].indexOf("exhibition") > -1)
					matches[4] = "e";

				self.infoFromWaifu.push({
					"c1" : matches[1],
					"c2" : matches[2],
					"tier" : matches[3],
					"mode" : matches[4]
				});
				while (self.infoFromWaifu.length > 2) {
					self.infoFromWaifu.splice(0, 1);
				}
			} else if (message.indexOf(winMessageIndicator) > -1) {
				self.lastWinnerFromWaifuAnnouncement = message.split(winMessageIndicator)[0];
			} else if (message.indexOf(betsLockedIndicator) > -1) {
				setTimeout(function() {
					//save the odds
					try {
						var oddsBox = document.getElementById("lastbet");
						var c1Odds = oddsBox.childNodes[oddsBox.childNodes.length - 1].innerHTML;
						var c2Odds = oddsBox.childNodes[oddsBox.childNodes.length - 3].innerHTML;
						self.odds = "" + c1Odds + ":" + c2Odds;
					} catch(e) {
						self.odds = null;
					}
				}, 10000);
			}
		}
	});
	setInterval(ctrl.ensureTwitch, 60000);
}

