var Settings = function() {
	this.nextStrategy = null;
	this.video = true;
	// used for tiered betting:
	this.level = 0;
};

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
	//0- player one ; 1- player two ; 2- information not captured
	this.crowdFavor = 2;
	this.illumFavor = 2;
	var attemptsToProcess = 0;
	var maxAttempts = 3;
	var timerInterval = 3000;
	this.ticksSinceMatchBegan = -999;
	this.bestChromosome = null;
	this.nextStrategy = "o";
	this.bettorsC1 = [];
	this.bettorsC2 = [];
	this.settings = null;
	this.lastMatchCumulativeBetTotal = null;

	var self = this;

	var debugMode = true;

	setInterval(function() {
		if (!self.settings)
			return;

		self.ticksSinceMatchBegan += 1;

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
					self.currentMatch.update(self.infoFromWaifu, self.odds, {
						"ticks" : self.ticksSinceMatchBegan,
						"interval" : timerInterval
					}, self.crowdFavor, self.illumFavor);
					var records = self.currentMatch.getRecords(winner);
					var mr = records[0];
					var c1 = records[1];
					var c2 = records[2];

					console.log("match results: " + "\ncharacter 1: " + mr.c1 + "\ncharacter 2: " + mr.c2 + "\nwinner: " + mr.w + "\nstrategy: " + mr.sn + "\tprediction: " + mr.pw + "\ntier: " + mr.t + "\t\tmode: " + mr.m + "\nodds: " + mr.o + "\ttime: " + mr.ts);

					var s = self;
					chrome.storage.local.get(["matches_v1", "characters_v1", "chromosomes_v1", "bettors_v1"], function(results) {
						var self = s;
						var matches_v1 = null;
						var characters_v1 = null;
						var bettors_v1 = null;
						// self.best_chromosome=results.best_chromosome;

						//store new match record
						if (results.hasOwnProperty("matches_v1")) {
							results.matches_v1.push(mr);
							matches_v1 = results.matches_v1;
						} else {
							matches_v1 = [];
							matches_v1.push(mr);
						}

						//character records:
						if (results.hasOwnProperty("characters_v1"))
							characters_v1 = results.characters_v1;
						else
							characters_v1 = [];
						//find if characters are already in local storage
						var c1_index = -1;
						var c2_index = -1;
						for (var i = 0; i < characters_v1.length; i++) {
							if (characters_v1[i].name == c1.name)
								c1_index = i;
							if (characters_v1[i].name == c2.name)
								c2_index = i;
						}
						//update records accordingly
						if (c1_index != -1)
							characters_v1[c1_index] = c1;
						else
							characters_v1.push(c1);
						if (c2_index != -1)
							characters_v1[c2_index] = c2;
						else
							characters_v1.push(c2);

						//bettor records
						if (results.hasOwnProperty("bettors_v1"))
							bettors_v1 = results.bettors_v1;
						else
							bettors_v1 = [];
						var updater = new Updater();
						var namesOfBettorsWhoAlreadyHaveRecords = [];
						for (var l in bettors_v1)
						namesOfBettorsWhoAlreadyHaveRecords.push(bettors_v1[l].name);
						var bc1 = [];
						var bc2 = [];
						for (var j in self.bettorsC1) {
							var b = updater.getBettor(self.bettorsC1[j][0], bettors_v1, namesOfBettorsWhoAlreadyHaveRecords);
							b.type = (self.bettorsC1[j][1]) ? "i" : "c";
							bc1.push(b);
						}
						for (var k in self.bettorsC2) {
							var b = updater.getBettor(self.bettorsC2[k][0], bettors_v1, namesOfBettorsWhoAlreadyHaveRecords);
							b.type = (self.bettorsC2[k][1]) ? "i" : "c";
							bc2.push(b);
						}
						updater.updateBettorsFromMatch(mr, bc1, bc2);
						if (debugMode)
							console.log("- number of:: chars: " + characters_v1.length + ", matches: " + matches_v1.length + ", bettors: " + bettors_v1.length);

						//do aliasing for closure
						var mbr = matchesBeforeReset;
						var mp = matchesProcessed;
						chrome.storage.local.set({
							'matches_v1' : matches_v1,
							'characters_v1' : characters_v1,
							'bettors_v1' : bettors_v1
						}, function() {
							if (debugMode) {
								console.log("- records saved, matches this cycle: " + mp);
							}
							if (mp >= mbr) {
								location.reload();
							}
						});
					});

				} else {
					//if we failed to get a winner and record the match, still count the match towards the reset number
					console.log("- failed to determine winner, matches this cycle: " + matchesProcessed);
					if (matchesProcessed >= matchesBeforeReset)
						location.reload();
				}
				//
				matchesProcessed += 1;
			}
			
			//set up next strategy
			if (matchesProcessed == 0 && self.bestChromosome==null) {
				//always observe the first match in the cycle, due to chrome alarm mandatory timing delay
				self.currentMatch = new Match(new Observer());
			} else {
				if (self.currentMatch && self.currentMatch.strategy)
					var level = self.currentMatch.strategy.level;
				switch(self.settings.nextStrategy) {
				case "o":
					self.currentMatch = new Match(new Observer());
					break;
				case "rc":
					self.currentMatch = new Match(new RatioConfidence());
					break;
				case "cs":
					self.currentMatch = new Match(new ConfidenceScore(self.bestChromosome, level, self.lastMatchCumulativeBetTotal));
					break;
				case "ipu":
					self.currentMatch = new Match(new InternetPotentialUpset(new ChromosomeIPU(), level));
					break;
				default:
					self.currentMatch = new Match(new Observer());
					break;
				}
				//set aggro:
				self.currentMatch.setAggro(self.settings.aggro);

			}

			//skip team matches, mirror matches
			if (self.currentMatch.names[0].toLowerCase().indexOf("team") > -1 || self.currentMatch.names[1].toLowerCase().indexOf("team") > -1) {
				self.currentMatch = new Match(new Observer());
				console.log("- skipping team match, but placing a Monk");
				self.currentMatch.init();
			} else if (self.currentMatch.names[0] == self.currentMatch.names[1]) {
				self.currentMatch = null;
				console.log("- skipping mirror match");
			} else if (self.currentMatch.names[0].indexOf(",") > -1 || self.currentMatch.names[1].indexOf(",") > -1) {
				self.currentMatch = null;
				console.log("- skipping match, comma in name, too lazy to deal with escape characters");
			} else {
				self.currentMatch.init();
			}
			//this may be a little out of asynch but I don't think it matters
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
Controller.prototype.removeVideoWindow = function() {
	var killVideo = function() {
		var parent = document.getElementById("video-embed");
		while (parent.childNodes.length > 0) {
			parent.removeChild(parent.childNodes[0]);
		}
	};
	killVideo();
	setTimeout(killVideo, 20000);
};
Controller.prototype.toggleVideoWindow = function() {
	this.settings.video = !this.settings.video;
	if (!this.settings.video)
		this.removeVideoWindow();
	this.saveSettings("- settings updated, video: " + this.settings.video);
};
Controller.prototype.toggleAggro = function() {
	this.settings.aggro = !this.settings.aggro;
	this.saveSettings("- settings updated, aggro: " + this.settings.aggro);
};
Controller.prototype.changeStrategy = function(sn, data) {
	var t="";
	switch(sn) {
	case "cs_o":
		this.settings.nextStrategy = "o";
		t="Monk";
		break;
	case "cs_rc":
		this.settings.nextStrategy = "rc";
		t="Cowboy";
		break;
	case "cs_cs":
		this.settings.nextStrategy = "cs";
		var chromosome = new Chromosome().loadFromJSON(data);
		this.bestChromosome = chromosome;
		t="Scientist";
		break;
	case "cs_cs_warning":
		console.log("- WARNING: cannot change mode to Scientist without initializing chromosome pool;\n  please click 'Reset Pool'");
		return;
	case "cs_ipu":
		this.settings.nextStrategy = "ipu";
		t="Lunatic";
		break;
	}
	console.log("- changing strategy to " + t);
	this.saveSettings("- settings saved");
};
Controller.prototype.receiveBestChromosome = function(data) {
	this.bestChromosome = new Chromosome().loadFromJSON(data);
};
Controller.prototype.saveSettings = function(msg) {
	chrome.storage.local.set({
		'settings_v1' : this.settings
	}, function() {
		console.log(msg);
	});
};

ctrl = null;
if (window.location.href == "http://www.saltybet.com/" || window.location.href == "http://mugen.saltybet.com/") {
	ctrl = new Controller();
	ctrl.ensureTwitch();
	chrome.storage.local.get(["settings_v1"], function(results) {
		var self = ctrl;
		if (results.settings_v1) {
			self.settings = results.settings_v1;
			if (!self.settings.video)
				self.removeVideoWindow();
			if(self.settings.aggro)
				console.log("aggro state: "+aggro);
			if (!self.settings.level) {
				self.settings.level = 0;
				self.saveSettings("- settings upgraded");
			}
		} else {
			self.settings = new Settings();
			self.settings.nextStrategy = "o";
			self.saveSettings("- settings initialized");
		}
		console.log("- settings applied");

	});
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
				//reset timer
				self.ticksSinceMatchBegan = 0;
				setTimeout(function() {
					//save the odds
					try {
						var oddsBox = document.getElementById("lastbet");
						// var c1Odds = oddsBox.childNodes[oddsBox.childNodes.length - 3].innerHTML;
						var c1Odds = oddsBox.childNodes[oddsBox.childNodes.length - 3].innerHTML;
						var c2Odds = oddsBox.childNodes[oddsBox.childNodes.length - 1].innerHTML;
						self.odds = "" + c1Odds + ":" + c2Odds;
					} catch(e) {
						self.odds = null;
					}
					//save the betting totals
					try {
						var moneyText = document.getElementById("odds").innerHTML.replace(/,/g, "");
						var mtMatches = null;
						var regex = /\$([0-9]*)/g;
						if (regex.test(moneyText)) {
							mtMatches = moneyText.match(regex);
							self.lastMatchCumulativeBetTotal = parseInt(mtMatches[0].replace("$", "")) + parseInt(mtMatches[1].replace("$", ""));
						} else {
							throw "totals error";
						}
					} catch(e) {
						self.lastMatchCumulativeBetTotal = null;
					}

					// save the crowd favor and the illuminati favor
					var betsForC1 = document.getElementById("sbettors1");
					var betsForC2 = document.getElementById("sbettors2");
					try {
						var crowdSizeC1 = betsForC1.getElementsByClassName("bettor-line").length;
						var crowdSizeC2 = betsForC2.getElementsByClassName("bettor-line").length;
						var illumSizeC1 = betsForC1.getElementsByClassName("goldtext").length;
						var illumSizeC2 = betsForC2.getElementsByClassName("goldtext").length;
						if (crowdSizeC1 == crowdSizeC2)
							self.crowdFavor = 2;
						else
							self.crowdFavor = (crowdSizeC1 > crowdSizeC2) ? 0 : 1;
						if (illumSizeC1 == illumSizeC2)
							self.illumFavor = 2;
						else
							self.illumFavor = (illumSizeC1 > illumSizeC2) ? 0 : 1;
					} catch(e) {
						self.crowdFavor = 2;
						self.illumFavor = 2;
					}
					// save bettor records
					try {
						var crowdC1 = betsForC1.getElementsByClassName("bettor-line");
						var crowdC2 = betsForC2.getElementsByClassName("bettor-line");
						self.bettorsC1 = [];
						self.bettorsC2 = [];
						for (var i = 0; i < crowdC1.length; i++) {
							var e = crowdC1[i].getElementsByTagName("strong")[0];
							self.bettorsC1.push([e.innerHTML, e.classList.contains("goldtext")]);
						}
						for (var j = 0; j < crowdC2.length; j++) {
							var e = crowdC2[j].getElementsByTagName("strong")[0];
							self.bettorsC2.push([e.innerHTML, e.classList.contains("goldtext")]);
						}
					} catch(e) {
						self.bettorsC1 = [];
						self.bettorsC2 = [];
					}
				}, 10000);
			}
		}
	});
	setInterval(ctrl.ensureTwitch, 60000);
}