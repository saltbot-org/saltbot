import type { Character, MatchRecord, Bettor } from "./records"
import { Updater } from "./records";
import { Settings } from "./settings";
import { Match } from "./tracker";
import { Observer, Lunatic, Cowboy, Scientist, Chromosome } from "./strategy";
import { binaryInsertByProperty } from "./utils";
import { Globals } from "./globals";

class StatusScanner {
	announcements: string[] = [];
	readonly winIndicator = " wins";

	constructor() {
		// find element and create an observer instance
		const status = document.querySelector("#betstatus");
		const observer = new MutationObserver(() => {
			this.announcements.push(status.innerHTML);
			// console.log("- status bar updated: " + status.innerHTML);
			observer.takeRecords();
		});
		observer.observe(status, {
			subtree: true,
			childList: true,
			attributes: true,
		});
	}

	getAnnouncements(preserve?: boolean): string[] {
		const copy = this.announcements.slice(0);
		if (!preserve) {
			this.announcements = [];
		}
		return copy;
	}
	getWinner(): string {
		const recent = this.getAnnouncements();
		recent.reverse();
		for (const announcement of recent) {
			if (announcement.includes(this.winIndicator)) {
				return announcement.split(this.winIndicator)[0];
			}
		}
		return null;
	}
}

export function isTournament(): boolean {
	const modeInfo = document.querySelector("#footer-alert").innerHTML;
	return modeInfo.includes("bracket") || modeInfo.includes("FINAL ROUND") || modeInfo.includes("Tournament mode start");
}

export class Controller {
	statusScanner: StatusScanner;
	currentMatch: Match;
	infoFromWaifu: {
		c1: string;
		c2: string;
		tier: string;
		mode: string;
	}[];
	lastWinnerFromWaifuAnnouncement: string;
	odds: string;
	crowdFavor: number;
	illumFavor: number;
	ticksSinceMatchBegan: number;
	bestChromosome: Chromosome;
	nextStrategy: string;
	bettorsC1: [string, boolean][];
	bettorsC2: [string, boolean][];
	settings: Settings;
	lastMatchCumulativeBetTotal: number;
	savedVideo: JQuery<HTMLElement>;
	lastFooterMessage: string;
	charactersV1: Character[];
	bettorsV1: Bettor[];
	bettingAvailable = false;
	bettingEntered = false;
	bettingComplete = true;
	matchesBeforeReset = 100;
	matchesProcessed = 0;
	attemptsToProcess = 0;
	readonly debugMode = true;
	readonly maxAttempts = 3;
	readonly timerInterval = 3000;

	constructor() {
		this.currentMatch = null;
		this.statusScanner = new StatusScanner();
		this.infoFromWaifu = [];
		this.lastWinnerFromWaifuAnnouncement = null;
		this.odds = null;
		//0- player one ; 1- player two ; 2- information not captured
		this.crowdFavor = 2;
		this.illumFavor = 2;

		this.ticksSinceMatchBegan = -999;
		this.bestChromosome = null;
		this.nextStrategy = "o";
		this.bettorsC1 = [];
		this.bettorsC2 = [];
		this.settings = null;
		this.lastMatchCumulativeBetTotal = null;
		this.savedVideo = null;
		this.lastFooterMessage = document.querySelector("#footer-alert") ? document.querySelector("#footer-alert").innerHTML : null;
		this.charactersV1 = [];
		this.bettorsV1 = [];

		setInterval(() => this.run(), this.timerInterval);
	}

	run(): void {
		if (!this.settings) {
			return;
		}

		this.ticksSinceMatchBegan += 1;

		//check to see if the betting buttons are visible and the footer message already changed
		const bettingTable = document.querySelector("#wager");
		const styleObj = window.getComputedStyle(bettingTable, null);
		this.bettingAvailable = styleObj.display !== "none" && document.querySelector("#footer-alert").innerHTML !== this.lastFooterMessage;

		if (this.bettingAvailable && this.bettingComplete) {
			this.bettingEntered = false;
			this.bettingComplete = false;
		}

		if (this.bettingAvailable && !this.bettingEntered) {
			this.bettingEntered = true;

			//Deal with old match
			if (this.currentMatch !== null) {
				let winner = this.statusScanner.getWinner();
				//backup method to get winner is scanning the chat
				if (winner === null) {
					winner = this.lastWinnerFromWaifuAnnouncement;
				}
				//safety check
				if (winner !== this.currentMatch.names[0] && winner !== this.currentMatch.names[1]) {
					winner = null;
				}
				//wait a little bit longer before giving up on this match getting processed
				if (winner === null && this.attemptsToProcess < this.maxAttempts) {
					this.attemptsToProcess += 1;
					return;
				}
				if (winner !== null) {
					this.attemptsToProcess = 0;
					//before processing match, add tier information if we have it
					this.currentMatch.update(this.infoFromWaifu, this.odds, {
						ticks: this.ticksSinceMatchBegan,
						interval: this.timerInterval,
					}, this.crowdFavor, this.illumFavor);
					const records = this.currentMatch.getRecords(winner);
					const mr = records[0] as MatchRecord;
					const c1 = records[1] as Character;
					const c2 = records[2] as Character;

					let predictionString: string = null;
					switch (mr.pw) {
						case "a":
							predictionString = "Did not bet";
							break;
						case "t":
							predictionString = "Predicted correctly";
							break;
						case "f":
							predictionString = "Predicted incorrectly";
							break;
					}

					console.log(`Match result:
Character 1: ${mr.c1}
Character 2: ${mr.c2}
Winner: ${(mr.w == 0 ? mr.c1 : mr.c2)}
Strategy: ${mr.sn}
Prediction: ${predictionString}
Tier: ${mr.t}
Mode: ${mr.m}
Odds: ${mr.o}
Length of match in seconds: ${mr.ts}`);

					if (!Globals.dirtyRecords) {
						this.updateRecords({
							bettors_v1: this.bettorsV1,
							characters_v1: this.charactersV1,
						}, mr, c1, c2);
					}
					else {
						chrome.storage.local.get(["characters_v1", "bettors_v1"], (results: { bettors_v1: Bettor[]; characters_v1: Character[] }) => {
							this.updateRecords(results, mr, c1, c2);
							Globals.dirtyRecords = false;
						});
					}

				} else {
					//if we failed to get a winner and record the match, still count the match towards the reset number
					console.log(`- failed to determine winner, matches this cycle: ${this.matchesProcessed}`);
					if (this.matchesProcessed >= this.matchesBeforeReset) {
						location.reload();
					}
				}
			}

			this.lastFooterMessage = document.querySelector("#footer-alert").innerHTML;

			const tournament = isTournament();

			//set up next strategy
			if (this.matchesProcessed === 0 && this.bestChromosome === null) {
				//always observe the first match in the cycle, due to chrome alarm mandatory timing delay
				this.currentMatch = new Match(new Observer());
			}
			else if (!tournament && this.settings.limit_enabled && this.currentMatch && this.currentMatch.getBalance() >= this.settings.limit) {
				//only observe after the limit is reached
				console.log(`- limit of ${this.settings.limit} is reached, observing`);
				this.currentMatch = new Match(new Observer());
			}

			else if (tournament && this.settings.tourneyLimit_enabled && this.currentMatch && this.currentMatch.getBalance() >= this.settings.tourneyLimit) {
				//only observe after the tourney limit is reached
				console.log(`- tourney limit of ${this.settings.limit} is reached, observing`);
				this.currentMatch = new Match(new Observer());
			}

			else {
				let level: number;
				if (this.currentMatch && this.currentMatch.strategy) {
					level = this.currentMatch.strategy.level;
				} else {
					// get amount for first match
					const nullMatch = new Match(new Observer());
					nullMatch.strategy.adjustLevel(nullMatch.getBalance());
					level = nullMatch.strategy.level;
				}

				switch (this.settings.nextStrategy) {
					case "o":
						this.currentMatch = new Match(new Observer());
						break;
					case "rc":
						this.currentMatch = new Match(new Cowboy());
						break;
					case "cs":
						this.currentMatch = new Match(new Scientist(this.bestChromosome, level));
						break;
					case "ipu":
						this.currentMatch = new Match(new Lunatic(level));
						break;
					default:
						this.currentMatch = new Match(new Observer());
						break;
				}

				//get the mode from the footer
				const modeInfo = this.lastFooterMessage;

				//chat messages:
				//Tournament will start shortly. Thanks for watching! from Saltybet

				if (tournament) {
					this.currentMatch.mode = "t";
				}
				else if (modeInfo.toUpperCase().includes("EXHIBITION")) {
					this.currentMatch.mode = "e";
				}
				else if (modeInfo.includes("until the next tournament")) {
					this.currentMatch.mode = "m";
				}
				else {
					this.currentMatch.mode = "U";
				}

				//set aggro:
				if (this.settings.aggro_enabled && this.currentMatch.getBalance() < this.settings.aggro_limit) {
					this.currentMatch.setAggro(true);
				}
				else {
					this.currentMatch.setAggro(false);
				}
				// if upset betting is activated, set the bot to bet the maximum amount outside of tournaments
				if (!tournament && this.settings.upsetBetting_enabled && this.currentMatch.getBalance() < this.settings.upsetBetting_limit) {
					this.currentMatch.setMaximum(true);
					this.currentMatch.upsetMode = true;
				}
				else {
					this.currentMatch.setMaximum(false);
				}
			}

			//skip team matches, mirror matches
			if ((this.currentMatch.mode === "U" || this.currentMatch.mode === "e") &&
				(this.currentMatch.names[0].toLowerCase().includes("team") || this.currentMatch.names[1].toLowerCase().includes("team"))) {
				this.currentMatch = null;
				console.log("- skipping team match");
			} else if (this.currentMatch.mode.startsWith("e") && this.settings.betOnExhibitions !== undefined && !this.settings.betOnExhibitions) {
				this.currentMatch = null;
				console.log("- skipping exhibition match because it is deactivated");
			} else if (this.currentMatch.names[0] === this.currentMatch.names[1]) {
				this.currentMatch = null;
				console.log("- skipping mirror match");
			}
			else {
				this.currentMatch.names[0].replace(/,/g, "_");
				this.currentMatch.names[1].replace(/,/g, "_");
				this.currentMatch.init();
			}

			this.matchesProcessed += 1;
		}

		if (!this.bettingAvailable && this.bettingEntered) {
			this.bettingComplete = true;
		}

	}

	updateRecords(results: { bettors_v1: Bettor[]; characters_v1: Character[] }, mr: MatchRecord, c1: Character, c2: Character): void {
		let characters: Character[] = [];
		let bettors: Bettor[] = [];

		// this.best_chromosome=results.best_chromosome;

		//store new match record
		chrome.runtime.sendMessage({ data: mr, query: "addMatchRecord" });

		//character records:
		if (results.characters_v1) {
			characters = results.characters_v1;
		}

		//update records accordingly
		binaryInsertByProperty(c1, characters, "name");
		binaryInsertByProperty(c2, characters, "name");

		//bettor records
		if (results.bettors_v1) {
			bettors = results.bettors_v1;
		}
		const updater = new Updater();
		const namesOfBettorsWhoAlreadyHaveRecords: string[] = [];
		for (const bettor of bettors) {
			namesOfBettorsWhoAlreadyHaveRecords.push(bettor.name);
		}
		const bc1: Bettor[] = [];
		const bc2: Bettor[] = [];
		for (const bettor of this.bettorsC1) {
			const b = updater.getBettor(bettor[0], bettors, namesOfBettorsWhoAlreadyHaveRecords);
			b.type = (bettor[1]) ? "i" : "c";
			bc1.push(b);
		}
		for (const bettor of this.bettorsC2) {
			const b = updater.getBettor(bettor[0], bettors, namesOfBettorsWhoAlreadyHaveRecords);
			b.type = (bettor[1]) ? "i" : "c";
			bc2.push(b);
		}
		updater.updateBettorsFromMatch(mr, bc1, bc2);
		if (this.debugMode) {
			console.log(`- number of:: chars: ${characters.length}, bettors: ${bettors.length}`);
		}

		//do aliasing for closure
		const mbr = this.matchesBeforeReset;
		const mp = this.matchesProcessed;

		this.bettorsV1 = bettors;
		this.charactersV1 = characters;

		chrome.storage.local.set({
			bettors_v1: bettors,
			characters_v1: characters,
		}, () => {
			if (this.debugMode) {
				console.log(`- records saved, matches this cycle: ${mp}`);
			}
			if (mp >= mbr) {
				location.reload();
			}
		});
	}

	ensureTwitch(): void {
		chrome.runtime.sendMessage(chrome.runtime.id, {
			getTwitch: true,
		}, function(): void {
			//console.debug("response received in salty");
		});
	}
	removeVideoWindow(): void {
		const parent = $("#video-embed");
		this.savedVideo = parent.clone(true);
		parent.empty();
	}

	enableVideoWindow(): void {
		const embeddedVideo = $("#video-embed");
		if (this.savedVideo && embeddedVideo[0].childNodes.length === 0) {
			embeddedVideo.remove();
			this.savedVideo.appendTo($("#stream"));
			this.savedVideo = null;
		}
	}

	toggleVideoWindow(): void {
		this.settings.video = !this.settings.video;
		if (!this.settings.video) {
			this.removeVideoWindow();
		}
		else {
			this.enableVideoWindow();
		}
		this.saveSettings("- settings updated, video: " + (this.settings.video ? "true" : "false"));
	}
	setAggro(aggro_enabled: boolean, aggro_limit: number): void {
		if (aggro_limit === this.settings.aggro_limit && aggro_enabled === this.settings.aggro_enabled) {
			//nothing to do
			return;
		}

		if (aggro_limit) {
			this.settings.aggro_limit = aggro_limit;
		}
		this.settings.aggro_enabled = aggro_enabled;
		this.saveSettings(`- settings updated, talimit ${(aggro_enabled ? "enabled" : "disabled")} limit : ${aggro_limit}`);

	}
	setExhibitions(value: boolean): void {
		this.settings.betOnExhibitions = value;
		this.saveSettings("- settings updated, exhibition betting: " + (this.settings.betOnExhibitions ? "true" : "false"));
	}
	setAllInTournament(value: boolean): void {
		this.settings.allInTourney = value;
		this.saveSettings("- settings updated, go all in at tournaments: " + (this.settings.allInTourney ? "true" : "false"));
	}
	setMultiplier(value: number): void {
		this.settings.multiplier = value;
		this.saveSettings(`- settings updated, multiplier: ${value}`);
	}
	setLimit(enabled: boolean, limit: number): void {
		if (limit === this.settings.limit && enabled === this.settings.limit_enabled) {
			//nothing to do
			return;
		}

		if (limit) {
			this.settings.limit = limit;
		}
		this.settings.limit_enabled = enabled;
		this.saveSettings(`- settings updated, limit ${(enabled ? "enabled" : "disabled")} + " limit : ${limit}`);
	}

	setTourneyLimit(enabled: boolean, limit?: number): void {
		if (limit === this.settings.tourneyLimit && enabled === this.settings.tourneyLimit_enabled) {
			//nothing to do
			return;
		}

		if (limit) {
			this.settings.tourneyLimit = limit;
		}
		this.settings.tourneyLimit_enabled = enabled;
		this.saveSettings(`- settings updated, tourney limit ${(enabled ? "enabled" : "disabled")} + " limit : ${limit}`);
	}

	setUpsetBetting(upsetBetting_enabled: boolean, upsetBetting_limit: number): void {
		if (upsetBetting_limit === this.settings.upsetBetting_limit && upsetBetting_enabled === this.settings.upsetBetting_enabled) {
			//nothing to do
			return;
		}

		if (upsetBetting_limit) {
			this.settings.upsetBetting_limit = upsetBetting_limit;
		}
		this.settings.upsetBetting_enabled = upsetBetting_enabled;
		this.saveSettings(`- settings updated, upset mode ${(upsetBetting_enabled ? "enabled" : "disabled")} limit : ${upsetBetting_limit}`);

	}

	setMaximumBetAmount(enabled: boolean, limit: number): void {
		if (limit === this.settings.maximumBetAmount_limit && enabled === this.settings.maximumBetAmount_enabled) {
			//nothing to do
			return;
		}

		this.settings.maximumBetAmount_limit = limit;
		this.settings.maximumBetAmount_enabled = enabled;
		this.saveSettings(`- settings updated, maximum bet amount ${(enabled ? "enabled" : "disabled")} limit: ${limit}`);
	}

	changeStrategy(sn: string, data?: string): void {
		let t = "";
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
			case "cs_ipu":
				this.settings.nextStrategy = "ipu";
				t = "Lunatic";
				break;
		}
		console.log("- changing strategy to " + t);
		this.saveSettings("- settings saved");
	}
	receiveBestChromosome(data: string): void {
		this.bestChromosome = new Chromosome().loadFromJSON(data);
	}
	setKeepAlive(value: boolean): void {
		this.settings.keepAlive = value;
		this.saveSettings("- settings updated, always keep saltybet tab alive: " + (this.settings.keepAlive ? "true" : "false"));
	}
	saveSettings(msg: string): void {
		chrome.storage.local.set({
			settings_v1: this.settings,
		}, function(): void {
			console.log(msg);
		});
	}
}

function prepareJQueryDialog(): void {
	$('link[href="../css/jquery-ui-1.11.min.css"]').prop("disabled", true);
	const link = '<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL("css/jquery-ui.css") + '">';
	$("head").append(link);

	const wrapper = document.getElementById("wrapper");
	const messageDialogue = document.createElement("div");
	messageDialogue.setAttribute("id", "dialog");
	wrapper.appendChild(messageDialogue);

	let dialogTimer: NodeJS.Timer = null;

	$("#dialog").dialog({
		autoOpen: false,
		title: "Saltbot Notification",
		open() {
			if (dialogTimer !== null) {
				clearTimeout(dialogTimer);
			}

			const dia = $(this);
			dialogTimer = setTimeout(function() {
				dia.dialog("close");
			}, 5000);
		},
	});
}

function correctChatIFrame(): void {
	const chatFrame = (document.getElementById("chat-frame-stream") as HTMLIFrameElement);
	if (chatFrame.src === "http://twitch.tv/saltybet/chat") {
		chatFrame.src = "http://twitch.tv/embed/saltybet/chat";
	}
}

chrome.runtime.sendMessage({
	browserAction: true,
}, function(): void {
	console.debug("Activated browser action");
});
if (window.location.href === "http://www.saltybet.com/" || window.location.href === "http://mugen.saltybet.com/" ||
	window.location.href === "https://www.saltybet.com/" || window.location.href === "https://mugen.saltybet.com/") {

	correctChatIFrame();

	Globals.ctrl = new Controller();
	const ctrl = Globals.ctrl;
	ctrl.ensureTwitch();
	chrome.storage.local.get(["settings_v1"], function(results: { settings_v1: Settings }) {
		if (results.settings_v1) {
			ctrl.settings = results.settings_v1;

			const defaultSettings = new Settings();
			if (!ctrl.settings.video) {
				ctrl.removeVideoWindow();
			}
			for (const setting in ctrl.settings) {
				//if it's a property and not a function
				if (ctrl.settings.hasOwnProperty(setting)) {
					//and if the setting property is currently not set
					if (ctrl.settings[setting] === undefined) {
						//set the property with a default value
						ctrl.settings[setting] = defaultSettings[setting];
					}
				}
			}
			ctrl.saveSettings("- settings upgraded");
		} else {
			ctrl.settings = new Settings();
			ctrl.settings.nextStrategy = "o";
			ctrl.saveSettings("- settings initialized");
		}
		console.log("- settings applied");

	});
	chrome.runtime.onMessage.addListener(function(message) {
		// console.log("-\nmessage from Waifu:\t" + message);
		if (typeof message === "string") {
			const winMessageIndicator = " wins";
			const newMatchIndicator = "Bets are OPEN for ";
			const betsLockedIndicator = "Bets are locked";

			//check for new match
			if (message.includes(newMatchIndicator)) {
				//examples:
				//Bets are OPEN for Rydia of mist vs Zatanna EX3! (B Tier) (matchmaking) www.saltybet.com
				// Bets are OPEN for Valdoll vs Adam! (A Tier) tournament bracket
				//Bets are OPEN for Team RyokoAndHerTrainingPartner vs Team Aliens! (S / S Tier) (Requested by Pendaflex) (exhibitions) www.saltybet.com
				//Bets are OPEN for Geegus vs Chris! (Requested by Yajirobe) (exhibitions) <a href="http://www.saltybet.com" target="_blank">www.saltybet.com</a>
				const regex = /(?:Bets are OPEN for )(.*)(?: vs )(.*)(?:! \()(X|S|A|B|P|NEW)(?: Tier\))(.*)/g;
				let matches = regex.exec(message);
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
				if (matches[4].includes("matchmaking")) {
					matches[4] = "m";
				}
				else if (matches[4].includes("tournament")) {
					matches[4] = "t";
				}
				else if (matches[4].includes("exhibition")) {
					matches[4] = "e";
				}

				//replace commas in character names with underscores
				matches[1].replace(/,/g, "_");
				matches[2].replace(/,/g, "_");

				ctrl.infoFromWaifu.push({
					c1: matches[1],
					c2: matches[2],
					tier: matches[3],
					mode: matches[4],
				});
				while (ctrl.infoFromWaifu.length > 2) {
					ctrl.infoFromWaifu.splice(0, 1);
				}
			} else if (message.includes(winMessageIndicator)) {
				ctrl.lastWinnerFromWaifuAnnouncement = message.split(winMessageIndicator)[0];
			} else if (message.includes(betsLockedIndicator)) {
				//reset timer
				ctrl.ticksSinceMatchBegan = 0;
				setTimeout(function() {
					//save the odds
					try {
						const oddsBox = document.querySelector("#lastbet");
						// const c1Odds = oddsBox.childNodes[oddsBox.childNodes.length - 3].innerHTML;
						const c1Odds = (oddsBox.childNodes[oddsBox.childNodes.length - 3] as HTMLElement).innerHTML;
						const c2Odds = (oddsBox.childNodes[oddsBox.childNodes.length - 1] as HTMLElement).innerHTML;
						ctrl.odds = "" + c1Odds + ":" + c2Odds;
					} catch (e) {
						ctrl.odds = null;
					}
					//save the betting totals
					try {
						const moneyText = document.querySelector("#odds").innerHTML.replace(/,/g, "");
						const regex = /\$([0-9]*)/g;
						if (regex.test(moneyText)) {
							const mtMatches = moneyText.match(regex);
							ctrl.lastMatchCumulativeBetTotal = parseInt(mtMatches[0].replace("$", ""), 10) + parseInt(mtMatches[1].replace("$", ""), 10);
						} else {
							throw new Error("totals error");
						}
					} catch (e) {
						ctrl.lastMatchCumulativeBetTotal = null;
					}

					// save the crowd favor and the illuminati favor
					const betsForC1 = document.querySelector("#sbettors1");
					const betsForC2 = document.querySelector("#sbettors2");
					try {
						const crowdSizeC1 = $(betsForC1).find(".bettor-line").length;
						const crowdSizeC2 = $(betsForC2).find(".bettor-line").length;
						const illumSizeC1 = $(betsForC1).find(".goldtext").length;
						const illumSizeC2 = $(betsForC2).find(".goldtext").length;
						if (crowdSizeC1 === crowdSizeC2) {
							ctrl.crowdFavor = 2;
						}
						else {
							ctrl.crowdFavor = (crowdSizeC1 > crowdSizeC2) ? 0 : 1;
						}
						if (illumSizeC1 === illumSizeC2) {
							ctrl.illumFavor = 2;
						}
						else {
							ctrl.illumFavor = (illumSizeC1 > illumSizeC2) ? 0 : 1;
						}
					} catch (e) {
						ctrl.crowdFavor = 2;
						ctrl.illumFavor = 2;
					}
					// save bettor records
					try {
						const crowdC1 = $(betsForC1).find(".bettor-line");
						const crowdC2 = $(betsForC2).find(".bettor-line");
						ctrl.bettorsC1 = [];
						ctrl.bettorsC2 = [];
						crowdC1.each(function() {
							const e = $(this).find("strong")[0];
							ctrl.bettorsC1.push([e.innerHTML, e.classList.contains("goldtext")]);
						});
						crowdC2.each(function() {
							const e = $(this).find("strong")[0];
							ctrl.bettorsC2.push([e.innerHTML, e.classList.contains("goldtext")]);
						});
					} catch (e) {
						ctrl.bettorsC1 = [];
						ctrl.bettorsC2 = [];
					}
				}, 10000);
			}
		}
	});
	setInterval(() => { ctrl.ensureTwitch() }, 60000);
}

window.addEventListener("beforeunload", function() {
	Globals.ctrl.enableVideoWindow();
});

prepareJQueryDialog();

export function displayDialogMessage(message: string): void {
	const dialog = $("#dialog");
	dialog.html(message.replace(/\n/g, "<br />"));
	dialog.dialog("open");
}
