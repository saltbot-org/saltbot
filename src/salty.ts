chrome.runtime.sendMessage({
	browserAction: true,
}, function(response) {
	console.debug("Activated browser action");
});

var Settings = function() {
	this.nextStrategy = null;
	this.video = true;
	this.exhibitions = true;
	// used for tiered betting:
	this.level = 0;

	//limit for stopping
	this.limit_enabled = false;
	this.limit = 10000;
	this.allInTourney = true;
	this.tourneyLimit = 100000;
	this.tourneyLimit_enabled = false;
	this.talimit_enabled = false;
	this.talimit = 10000;
	this.multiplier = 1.0;
};

var StatusScanner = function() {
	const self = this;
	this.announcements = [];
	// find element and create an observer instance
	const status = $("#betstatus")[0];
	const observer = new MutationObserver(function(mutations) {
		self.announcements.push(status.innerHTML);
		// console.log("- status bar updated: " + status.innerHTML);
		observer.takeRecords();
	});
	observer.observe(status, {
		subtree: true,
		childList: true,
		attributes: true,
	});
	const winIndicator = " wins";

	this.getAnnouncements = function(preserve) {
		const copy = self.announcements.slice(0);
		if (!preserve) {
			self.announcements = [];
		}
		return copy;
	};
	this.getWinner = function() {
		const recent = self.getAnnouncements();
		recent.reverse();
		for (const announcement of recent) {
			if (announcement.indexOf(winIndicator) > -1) {
				return announcement.split(winIndicator)[0];
			}
		}
		return null;
	};
};

class Controller {
	public statusScanner;
	public currentMatch: Match;
	public infoFromWaifu: any[];
	public lastWinnerFromWaifuAnnouncement;
	public odds;
	public crowdFavor: number;
	public illumFavor: number;
	public ticksSinceMatchBegan: number;
	public bestChromosome;
	public nextStrategy: string;
	public bettorsC1: any[];
	public bettorsC2: any[];
	public settings;
	public lastMatchCumulativeBetTotal: number;
	public savedVideo;
	public lastFooterMessage: string;
	public charactersV1: Character[];
	public bettorsV1: any[];

	constructor() {
		var bettingAvailable = false;
		var bettingEntered = false;
		var bettingComplete = true;
		const matchesBeforeReset = 100;
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
		const maxAttempts = 3;
		const timerInterval = 3000;
		this.ticksSinceMatchBegan = -999;
		this.bestChromosome = null;
		this.nextStrategy = "o";
		this.bettorsC1 = [];
		this.bettorsC2 = [];
		this.settings = null;
		this.lastMatchCumulativeBetTotal = null;
		this.savedVideo = null;
		this.lastFooterMessage = $("#footer-alert").length ? $("#footer-alert")[0].innerHTML : null;
		this.charactersV1 = [];
		this.bettorsV1 = [];

		const self = this;

		const debugMode = true;

		setInterval(function() {
			if (!self.settings) {
				return;
			}

			self.ticksSinceMatchBegan += 1;

			//check to see if the betting buttons are visible and the footer message already changed
			const bettingTable = $(".dynamic-view")[0];
			const styleObj = window.getComputedStyle(bettingTable, null);
			bettingAvailable = styleObj.display !== "none" && $("#footer-alert")[0].innerHTML !== self.lastFooterMessage;

			if (bettingAvailable && bettingComplete) {
				bettingEntered = false;
				bettingComplete = false;
			}

			if (bettingAvailable && !bettingEntered) {
				bettingEntered = true;

				//Deal with old match
				if (self.currentMatch !== null) {
					var winner = self.statusScanner.getWinner();
					//backup method to get winner is scanning the chat
					if (winner === null) {
						winner = self.lastWinnerFromWaifuAnnouncement;
					}
					//safety check
					if (winner !== self.currentMatch.names[0] && winner !== self.currentMatch.names[1]) {
						winner = null;
					}
					//wait a little bit longer before giving up on this match getting processed
					if (winner === null && attemptsToProcess < maxAttempts) {
						attemptsToProcess += 1;
						return;
					}
					if (winner !== null) {
						attemptsToProcess = 0;
						//before processing match, add tier information if we have it
						self.currentMatch.update(self.infoFromWaifu, self.odds, {
							ticks: self.ticksSinceMatchBegan,
							interval: timerInterval,
						}, self.crowdFavor, self.illumFavor);
						const records = self.currentMatch.getRecords(winner);
						const mr = records[0] as MatchRecord;
						const c1 = records[1] as Character;
						const c2 = records[2] as Character;

						console.log("- match result code: " + "c1:" + mr.c1 + "|c2:" + mr.c2 + "|w:" + mr.w + "|s:" + mr.sn + "|p:" + mr.pw + "|t:" + mr.t + "|m:" + mr.m + "|o:" + mr.o + "|t:" + mr.ts);

						const s = self;
						const updateRecords = function(results) {
							let charactersV1 = [];
							let bettorsV1 = [];
							const self = s;

							// self.best_chromosome=results.best_chromosome;

							//store new match record
							chrome.runtime.sendMessage({ data: mr, query: "addMatchRecord" });

							//character records:
							if (results.characters_v1) {
								charactersV1 = results.characters_v1;
							}

							//update records accordingly
							binaryInsertByProperty(c1, charactersV1, "name");
							binaryInsertByProperty(c2, charactersV1, "name");

							//bettor records
							if (results.bettors_v1) {
								bettorsV1 = results.bettors_v1;
							}
							const updater = new Updater();
							const namesOfBettorsWhoAlreadyHaveRecords = [];
							for (const bettor of bettorsV1) {
								namesOfBettorsWhoAlreadyHaveRecords.push(bettor.name);
							}
							const bc1 = [];
							const bc2 = [];
							for (const bettor of self.bettorsC1) {
								const b = updater.getBettor(bettor[0], bettorsV1, namesOfBettorsWhoAlreadyHaveRecords);
								b.type = (bettor[1]) ? "i" : "c";
								bc1.push(b);
							}
							for (const bettor of self.bettorsC2) {
								const b = updater.getBettor(bettor[0], bettorsV1, namesOfBettorsWhoAlreadyHaveRecords);
								b.type = (bettor[1]) ? "i" : "c";
								bc2.push(b);
							}
							updater.updateBettorsFromMatch(mr, bc1, bc2);
							if (debugMode) {
								console.log("- number of:: chars: " + charactersV1.length + ", bettors: " + bettorsV1.length);
							}

							//do aliasing for closure
							const mbr = matchesBeforeReset;
							const mp = matchesProcessed;

							self.bettorsV1 = bettorsV1;
							self.charactersV1 = charactersV1;

							chrome.storage.local.set({
								bettorsV1,
								charactersV1,
							}, function() {
								if (debugMode) {
									console.log("- records saved, matches this cycle: " + mp);
								}
								if (mp >= mbr) {
									location.reload();
								}
							});
						};

						if (!dirtyRecords) {
							updateRecords({
								bettors_v1: self.bettorsV1,
								characters_v1: self.charactersV1,
							});
						}
						else {
							chrome.storage.local.get(["characters_v1", "bettors_v1"], function(results) {
								updateRecords(results);
								dirtyRecords = false;
							});
						}

					} else {
						//if we failed to get a winner and record the match, still count the match towards the reset number
						console.log("- failed to determine winner, matches this cycle: " + matchesProcessed);
						if (matchesProcessed >= matchesBeforeReset) {
							location.reload();
						}
					}
				}

				self.lastFooterMessage = $("#footer-alert")[0].innerHTML;

				const tournament = $("#tournament-note").length > 0;

				//set up next strategy
				if (matchesProcessed === 0 && self.bestChromosome === null) {
					//always observe the first match in the cycle, due to chrome alarm mandatory timing delay
					self.currentMatch = new Match(new Observer());
				}
				else if (!tournament && self.settings.limit_enabled && self.currentMatch && self.currentMatch.getBalance() >= self.settings.limit) {
					//only observe after the limit is reached
					console.log("- limit of " + self.settings.limit + " is reached, observing");
					self.currentMatch = new Match(new Observer());
				}

				else if (tournament && self.settings.tourneyLimit_enabled && self.currentMatch && self.currentMatch.getBalance() >= self.settings.tourneyLimit) {
					//only observe after the tourney limit is reached
					console.log("- tourney limit of " + self.settings.limit + " is reached, observing");
					self.currentMatch = new Match(new Observer());
				}

				else {
					var level;
					if (self.currentMatch && self.currentMatch.strategy) {
						level = self.currentMatch.strategy.level;
					} else {
						// get amount for first match
						const nullMatch = new Match(new Strategy("nullStrat"));
						nullMatch.strategy.adjustLevel(nullMatch.getBalance());
						level = nullMatch.strategy.level;
					}

					switch (self.settings.nextStrategy) {
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

					//get the mode from the footer
					const modeInfo = self.lastFooterMessage;

					//chat messages:
					//Tournament will start shortly. Thanks for watching! from Saltybet

					if (modeInfo.indexOf("bracket") > -1 || modeInfo.indexOf("FINAL ROUND") > -1 || modeInfo.indexOf("Tournament mode start") > -1) {
						self.currentMatch.mode = "t";
					}
					else if (modeInfo.toUpperCase().indexOf("EXHIBITION") > -1) {
						self.currentMatch.mode = "e";
					}
					else if (modeInfo.indexOf("until the next tournament") > -1) {
						self.currentMatch.mode = "m";
					}
					else {
						self.currentMatch.mode = "U";
					}

					//set aggro:
					if (self.settings.talimit_enabled === true && self.currentMatch.getBalance() <= self.settings.talimit) {
						self.currentMatch.setAggro(true);
					}
					else {
						self.currentMatch.setAggro(false);
					}

				}

				//skip team matches, mirror matches
				if ((self.currentMatch.mode === "U" || self.currentMatch.mode === "e") &&
					(self.currentMatch.names[0].toLowerCase().indexOf("team") > -1 || self.currentMatch.names[1].toLowerCase().indexOf("team") > -1)) {
					self.currentMatch = null;
					console.log("- skipping team match");
				} else if (self.currentMatch.mode.charAt(0) === "e" && self.settings.exhibitions !== undefined && !self.settings.exhibitions) {
					self.currentMatch = null;
					console.log("- skipping exhibition match because it is deactivated");
				} else if (self.currentMatch.names[0] === self.currentMatch.names[1]) {
					self.currentMatch = null;
					console.log("- skipping mirror match");
				}
				else {
					self.currentMatch.names[0].replace(/,/g, "_");
					self.currentMatch.names[1].replace(/,/g, "_");
					self.currentMatch.init();
				}

				matchesProcessed += 1;
			}

			if (!bettingAvailable && bettingEntered) {
				bettingComplete = true;
			}

		}, timerInterval);

	}

	public ensureTwitch() {
		chrome.runtime.sendMessage(chrome.runtime.id, {
			getTwitch: true,
		}, function(response) {
			//console.debug("response received in salty");
		});
	}
	public removeVideoWindow() {
		const parent = $("#video-embed");
		this.savedVideo = parent.clone(true);
		parent.empty();
	}

	public enableVideoWindow() {
		const embeddedVideo = $("#video-embed");
		if (this.savedVideo && embeddedVideo[0].childNodes.length === 0) {
			embeddedVideo.remove();
			this.savedVideo.appendTo($("#stream"));
			this.savedVideo = null;
		}
	}

	public toggleVideoWindow() {
		(this.settings.video as number) ^= 1;
		if (!this.settings.video) {
			this.removeVideoWindow();
		}
		else {
			this.enableVideoWindow();
		}
		this.saveSettings("- settings updated, video: " + (this.settings.video ? "true" : "false"));
	}
	public setAggro(taenabled, talimit) {
		if (talimit === this.settings.talimit && taenabled === this.settings.talimit_enabled) {
			//nothing to do
			return;
		}

		if (talimit) {
			this.settings.talimit = +talimit;
		}
		this.settings.talimit_enabled = taenabled;
		this.saveSettings("- settings updated, talimit " + (taenabled ? "enabled" : "disabled") + " limit : " + talimit);

	}
	public setExhibitions(value) {
		this.settings.exhibitions = value;
		this.saveSettings("- settings updated, exhibition betting: " + (this.settings.exhibitions ? "true" : "false"));
	}
	public setAllInTournament(value) {
		this.settings.allInTourney = value;
		this.saveSettings("- settings updated, go all in at tournaments: " + (this.settings.allInTourney ? "true" : "false"));
	}
	public setMultiplier(value) {
		this.settings.multiplier = value;
		this.saveSettings("- settings updated, multiplier: " + value);
	}
	public setLimit(enabled, limit) {
		if (limit === this.settings.limit && enabled === this.settings.limit_enabled) {
			//nothing to do
			return;
		}

		if (limit) {
			this.settings.limit = parseInt(limit);
		}
		this.settings.limit_enabled = enabled;
		this.saveSettings("- settings updated, limit " + (enabled ? "enabled" : "disabled") + " limit : " + limit);
	}

	public setTourneyLimit(enabled, limit?: number) {
		if (limit === this.settings.tourneyLimit && enabled === this.settings.tourneyLimit_enabled) {
			//nothing to do
			return;
		}

		if (limit) {
			this.settings.tourneyLimit = limit;
		}
		this.settings.tourneyLimit_enabled = enabled;
		this.saveSettings("- settings updated, tourney limit " + (enabled ? "enabled" : "disabled") + " limit : " + limit);
	}

	public changeStrategy(sn, data?) {
		var t = "";
		switch (sn) {
			case "cs_o":
				this.settings.nextStrategy = "o";
				t = "Monk";
				break;
			case "cs_rc":
				this.settings.nextStrategy = "rc";
				t = "Cowboy";
				break;
			case "cs_cs":
				this.settings.nextStrategy = "cs";
				this.bestChromosome = new Chromosome().loadFromJSON(data);
				t = "Scientist";
				break;
			case "cs_cs_warning":
				console.log("- WARNING: cannot change mode to Scientist without initializing chromosome pool;\n  please click 'Reset Pool'");
				return;
			case "cs_ipu":
				this.settings.nextStrategy = "ipu";
				t = "Lunatic";
				break;
		}
		console.log("- changing strategy to " + t);
		this.saveSettings("- settings saved");
	}
	public receiveBestChromosome(data) {
		this.bestChromosome = new Chromosome().loadFromJSON(data);
	}
	public saveSettings(msg) {
		chrome.storage.local.set({
			settings_v1: this.settings,
		}, function() {
			console.log(msg);
		});
	}

	public setKeepAlive(value) {
		this.settings.keepAlive = value;
		this.saveSettings("- settings updated, always keep saltybet tab alive: " + (this.settings.keepAlive ? "true" : "false"));
	}
}

var ctrl: Controller = null;
if (window.location.href === "http://www.saltybet.com/" || window.location.href === "http://mugen.saltybet.com/" ||
	window.location.href === "https://www.saltybet.com/" || window.location.href === "https://mugen.saltybet.com/") {
	ctrl = new Controller();
	ctrl.ensureTwitch();
	chrome.storage.local.get(["settings_v1"], function(results) {
		const self = ctrl;
		if (results.settings_v1) {
			self.settings = results.settings_v1;
			if (!self.settings.video) {
				self.removeVideoWindow();
			}
			if (self.settings.aggro !== undefined) {
				console.log("aggro state: " + self.settings.aggro);
			}
			if (self.settings.level === undefined) {
				self.settings.level = 0;
			}
			if (self.settings.exhibitions === undefined) {
				self.settings.exhibitions = true;
			}
			if (self.settings.allInTourney === undefined) {
				self.settings.allInTourney = true;
			}
			if (self.settings.multiplier === undefined) {
				self.settings.multiplier = 1.0;
			}
			if (self.settings.keepAlive === undefined) {
				self.settings.keepAlive = false;
			}
			self.saveSettings("- settings upgraded");
		} else {
			self.settings = new Settings();
			self.settings.nextStrategy = "o";
			self.saveSettings("- settings initialized");
		}
		console.log("- settings applied");

	});
	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		const self = ctrl;
		// console.log("-\nmessage from Waifu:\t" + message);
		if (typeof message === "string") {
			const winMessageIndicator = " wins";
			const newMatchIndicator = "Bets are OPEN for ";
			const betsLockedIndicator = "Bets are locked";

			//check for new match
			if (message.indexOf(newMatchIndicator) > -1) {
				//examples:
				//Bets are OPEN for Rydia of mist vs Zatanna EX3! (B Tier) (matchmaking) www.saltybet.com
				// Bets are OPEN for Valdoll vs Adam! (A Tier) tournament bracket
				//Bets are OPEN for Team RyokoAndHerTrainingPartner vs Team Aliens! (S / S Tier) (Requested by Pendaflex) (exhibitions) www.saltybet.com
				//Bets are OPEN for Geegus vs Chris! (Requested by Yajirobe) (exhibitions) <a href="http://www.saltybet.com" target="_blank">www.saltybet.com</a>
				const regex = /(?:Bets are OPEN for )(.*)(?: vs )(.*)(?:! \()(X|S|A|B|P|NEW)(?: Tier\))(.*)/g;
				var matches = regex.exec(message);
				if (matches === null) {
					const regexLoose = /(?:Bets are OPEN for )(.*)(?: vs )(.*)!(.*)/g;
					matches = regexLoose.exec(message);
					matches.push(matches[3]);

					//set tier to U
					matches[3] = "U";
				}
				if (matches[3] === "NEW") {
					matches[3] = "U";
				}
				if (matches[4].indexOf("matchmaking") > -1) {
					matches[4] = "m";
				}
				else if (matches[4].indexOf("tournament") > -1) {
					matches[4] = "t";
									}
				else if (matches[4].indexOf("exhibition") > -1) {
					matches[4] = "e";
									}

				//replace commas in character names with underscores
				matches[1].replace(/,/g, "_");
				matches[2].replace(/,/g, "_");

				self.infoFromWaifu.push({
					c1: matches[1],
					c2: matches[2],
					tier: matches[3],
					mode: matches[4],
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
						const oddsBox = $("#lastbet")[0];
						// var c1Odds = oddsBox.childNodes[oddsBox.childNodes.length - 3].innerHTML;
						const c1Odds = (oddsBox.childNodes[oddsBox.childNodes.length - 3] as HTMLElement).innerHTML;
						const c2Odds = (oddsBox.childNodes[oddsBox.childNodes.length - 1] as HTMLElement).innerHTML;
						self.odds = "" + c1Odds + ":" + c2Odds;
					} catch (e) {
						self.odds = null;
					}
					//save the betting totals
					try {
						const moneyText = $("#odds")[0].innerHTML.replace(/,/g, "");
						var mtMatches = null;
						const regex = /\$([0-9]*)/g;
						if (regex.test(moneyText)) {
							mtMatches = moneyText.match(regex);
							self.lastMatchCumulativeBetTotal = parseInt(mtMatches[0].replace("$", "")) + parseInt(mtMatches[1].replace("$", ""));
						} else {
							throw new Error("totals error");
						}
					} catch (e) {
						self.lastMatchCumulativeBetTotal = null;
					}

					// save the crowd favor and the illuminati favor
					const betsForC1 = $("#sbettors1")[0];
					const betsForC2 = $("#sbettors2")[0];
					try {
						const crowdSizeC1 = $(betsForC1).find(".bettor-line").length;
						const crowdSizeC2 = $(betsForC2).find(".bettor-line").length;
						const illumSizeC1 = $(betsForC1).find(".goldtext").length;
						const illumSizeC2 = $(betsForC2).find(".goldtext").length;
						if (crowdSizeC1 === crowdSizeC2) {
							self.crowdFavor = 2;
						}
						else {
							self.crowdFavor = (crowdSizeC1 > crowdSizeC2) ? 0 : 1;
						}
						if (illumSizeC1 === illumSizeC2) {
							self.illumFavor = 2;
						}
						else {
							self.illumFavor = (illumSizeC1 > illumSizeC2) ? 0 : 1;
						}
					} catch (e) {
						self.crowdFavor = 2;
						self.illumFavor = 2;
					}
					// save bettor records
					try {
						const crowdC1 = $(betsForC1).find(".bettor-line");
						const crowdC2 = $(betsForC2).find(".bettor-line");
						self.bettorsC1 = [];
						self.bettorsC2 = [];
						crowdC1.each(function() {
							const e = $(this).find("strong")[0];
							self.bettorsC1.push([e.innerHTML, e.classList.contains("goldtext")]);
						});
						crowdC2.each(function() {
							const e = $(this).find("strong")[0];
							self.bettorsC2.push([e.innerHTML, e.classList.contains("goldtext")]);
						});
					} catch (e) {
						self.bettorsC1 = [];
						self.bettorsC2 = [];
					}
				}, 10000);
			}
		}
	});
	setInterval(ctrl.ensureTwitch, 60000);
}

window.addEventListener("beforeunload", function() {
	ctrl.enableVideoWindow();
});

var prepareJQueryDialog = function() {
	$('link[href="../css/jquery-ui-1.11.min.css"]').prop("disabled", true);
	const link = '<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL("css/jquery-ui.css") + '">';
	$("head").append(link);

	const wrapper = document.getElementById("wrapper");
	const messageDialogue = document.createElement("div");
	messageDialogue.setAttribute("id", "dialog");
	wrapper.appendChild(messageDialogue);

	var dialogTimer = null;

	$("#dialog").dialog({
		autoOpen: false,
		title: "Saltbot Notification",
		open(event, ui) {
			if (dialogTimer !== null) {
				clearTimeout(dialogTimer);
			}

			const dia = $(this);
			dialogTimer = setTimeout(function() {
				dia.dialog("close");
			}, 5000);
		},
	});
};

prepareJQueryDialog();

var displayDialogMessage = function(message) {
	const dialog = $("#dialog");
	dialog.html(message.replace(/\n/g, "<br />"));
	dialog.dialog("open");
};
