import { openDB } from 'idb';

import { Updater } from "./records"
import type { MatchRecord, Character } from "./records";
import type { Chromosome } from "./strategy";
import type { Settings } from "./settings";
async function getMatchRecords() {
	const db = await openDB("saltbot", 1);
	const tx = db.transaction("matches", "readonly");
	const store = tx.objectStore("matches");

	return await store.getAll() as MatchRecord[];
}

async function setMatchRecords(matches: MatchRecord[]) {
	const db = await openDB("saltbot", 1);
	const tx = db.transaction("matches", "readwrite");
	const store = tx.objectStore("matches");

	if (matches) {
		await store.clear();
		for (const match of matches) {
			await store.put(match);
		}
	}
}

function addMatchRecord(match: MatchRecord): void {
	const open = indexedDB.open("saltbot", 1);

	open.onsuccess = function () {
		const db = open.result;
		const tx = db.transaction("matches", "readwrite");
		const store = tx.objectStore("matches");

		store.put(match);
	};
}

function reimportMatches() {
	const open = indexedDB.open("saltbot", 1);

	function updateCharacters(matches: MatchRecord[]) {
		const updater = new Updater();

		const characterRecords: Character[] = [];
		const namesOfCharactersWhoAlreadyHaveRecords: string[] = [];

		for (const match of matches) {
			const c1Obj = updater.getCharacter(match.c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
			const c2Obj = updater.getCharacter(match.c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
			updater.updateCharactersFromMatch(match, c1Obj, c2Obj);
		}

		const nmr = matches.length;
		const ncr = characterRecords.length;

		chrome.storage.local.set({
			characters_v1: characterRecords,
		}, function() {
			console.log(`-\nrecords reimported:\n${nmr} match records\n${ncr} character records`);
		});
	}

	open.onupgradeneeded = function () {
		const db = open.result;
		let store = db.createObjectStore("matches", { autoIncrement: true });

		chrome.storage.local.get(["matches_v1"], function (results: {matches_v1: MatchRecord[]}) {
			if (results.matches_v1) {
				const tx = db.transaction("matches", "readwrite");
				store = tx.objectStore("matches");
				for (const match of results.matches_v1) {
					store.put(match);
				}
				tx.oncomplete = function () {
					db.close();
					updateCharacters(results.matches_v1);
				};
			}
		});
	};

	open.onsuccess = function () {
		const db = open.result;
		const tx = db.transaction("matches", "readonly");
		const store = tx.objectStore("matches");

		const getAllRequest = store.getAll();
		getAllRequest.onsuccess = function () {
			updateCharacters(getAllRequest.result as MatchRecord[]);
		};
	};
}

chrome.runtime.onInstalled.addListener(function () {
	reimportMatches();
});

//variable used so the tabs aren't closed and reopened multiple times
let restartedSaltyBet = false;

function setRestarted() {
	//set restarted to true and then to false in 5 seconds
	//this is done to ensure that multiple messages in a short amount of time do not create multiple tabs
	restartedSaltyBet = true;
	setTimeout(function () {
		restartedSaltyBet = false;
	}, 5000);
}

function checkForTwitchTab() {
	chrome.tabs.query({
		url: ["*://www.twitch.tv/saltybet/chat", "*://www.twitch.tv/popout/saltybet/chat"]
	}, function (result) {
		if (result.length === 0) {
			//no twitch tab found
			chrome.tabs.create({
				url: "http://www.twitch.tv/saltybet/chat",
			}, function (tab) {
				console.log("The new tab has the url '" + tab.url + "'");
			});
			chrome.tabs.query({}, function (r) {
				const urls = r.map(function (t) {
					return t.url;
				});
				console.log(urls);
			});
		}
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleWaifuMessage(details: any) {
	let queryResult: chrome.tabs.Tab[] = null;
	//Receive message from Waifu, pass it on to salty tab
	chrome.tabs.query({
		title: "Salty Bet",
		url: "*://*.saltybet.com/",
	}, function (result) {
		queryResult = result;
		chrome.storage.local.get(["settings_v1"], function (storedObjects: { settings_v1: Settings }) {
			if (result.length === 0 && storedObjects.settings_v1.keepAlive && !restartedSaltyBet) {
				chrome.tabs.create({
					url: "http://www.saltybet.com",
				});
				setRestarted();
			}
			else {
				for (const tab of queryResult) {
					chrome.tabs.sendMessage(tab.id, details.message, function () {
						if (storedObjects.settings_v1.keepAlive && !restartedSaltyBet &&
							chrome.runtime.lastError !== undefined &&
							chrome.runtime.lastError.message === "Could not establish connection. Receiving end does not exist.") {
							//an error happened while sending the message to the tab, create a new tab
							chrome.runtime.lastError = undefined;
							//close saltybet tabs
							//can't use variable tab because sendMessage is asynchronous
							for (const tab2 of queryResult) {
								chrome.tabs.remove(tab2.id);
							}
							chrome.tabs.create({
								url: "http://www.saltybet.com",
							});
							setRestarted();
						}
					});
				}
			}
		});
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
chrome.runtime.onMessage.addListener(function(details: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
	if (details.message !== undefined) {
		handleWaifuMessage(details);
	}
	else if (details.getTwitch !== undefined) {
		checkForTwitchTab();
	}

	else if (details.browserAction !== undefined) {
		chrome.pageAction.show(sender.tab.id);
	}

	else if (details.type !== undefined) {
		chrome.tabs.query({
			title: "Salty Bet",
			url: "*://*.saltybet.com/",
		}, function (result) {
			// result is an array of tab.Tabs
			for (const tab of result) {
				chrome.tabs.sendMessage(tab.id, details);
			}
		});
	}

	else if (details.query !== undefined) {
		if (details.query === "getMatchRecords") {
			getMatchRecords().then(sendResponse);
			return true;
		}
		else if (details.query === "setMatchRecords" && details.data) {
			setMatchRecords(details.data as MatchRecord[]);
		}
		else if (details.query === "addMatchRecord" && details.data) {
			addMatchRecord(details.data as MatchRecord);
		}
	}

	if (sendResponse !== undefined) {
		sendResponse(null);
	}
	return false;
});
function sendUpdatedChromosome(): void {
	chrome.storage.local.get(["chromosomes_v1"], function(results: { chromosomes_v1: Chromosome[] }) {
		if (results.chromosomes_v1) {
			results.chromosomes_v1.forEach((chromosome: Chromosome) => {
				if (!chromosome.rank) {
					chromosome.rank = 100;
				}
			});

			results.chromosomes_v1.sort(function(a, b) {
				return a.rank - b.rank;
			});
			const data = JSON.stringify(results.chromosomes_v1[0]);
			chrome.tabs.query({
				title: "Salty Bet",
				url: "*://*.saltybet.com/",
			}, function(result) {
				if (result.length > 0) {
					chrome.tabs.sendMessage(result[0].id, {
						text: data,
						type: "suc",
					});
				}
			});
		}
	});
}
chrome.alarms.onAlarm.addListener(function() {
	sendUpdatedChromosome();
});