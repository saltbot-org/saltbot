var reimportMatches = function () {
	chrome.storage.local.get(["matches_v1"], function (results) {
		if (results.matches_v1) {
			var updater = new Updater();

			var characterRecords = [];
			var namesOfCharactersWhoAlreadyHaveRecords = [];

			for (var i = 0; i < results.matches_v1.length; i++) {
				var match = results.matches_v1[i];
				var c1Obj = updater.getCharacter(match.c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
				var c2Obj = updater.getCharacter(match.c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
				updater.updateCharactersFromMatch(match, c1Obj, c2Obj);
			}

			var nmr = results.matches_v1.length;
			var ncr = characterRecords.length;

			chrome.storage.local.set({
				'characters_v1': characterRecords
			}, function () {
				console.log("-\nrecords reimported:\n" + nmr + " match records\n" + ncr + " character records");
			});
		}


	});
};

chrome.runtime.onInstalled.addListener(function () {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {

	});

	reimportMatches();
});

chrome.extension.onMessage.addListener(function (details, sender, sendResponse) {
	if (details.message !== undefined) {
		var queryResult = null;
		
		//Receive message from Waifu, pass it on to salty tab
		chrome.tabs.query({
			title: "Salty Bet",
			url: "*://*.saltybet.com/"
		}, function (result) {
			queryResult = result;

			chrome.storage.local.get(["settings_v1"], function (storedObjects) {
				if (result.length == 0 && storedObjects["settings_v1"].keepAlive) {
					chrome.tabs.create({
						url: "http://www.saltybet.com"
					});
				}
				else {
					for (var i = 0; i < queryResult.length; i++) {
						chrome.tabs.sendMessage(queryResult[i].id, details.message, function (response) {
							if (storedObjects["settings_v1"].keepAlive && chrome.runtime.lastError !== undefined) {
								//an error happened while sending the message to the tab, create a new tab
								chrome.tabs.remove(queryResult[i].id, function () {
								});

								chrome.tabs.create({
									url: "http://www.saltybet.com"
								});
							}
						});
					}
				}


			});

		});
	}
	if (details.getTwitch !== undefined) {
		chrome.tabs.query({url: "*://www.twitch.tv/saltybet/chat"}, function (result) {
			if (result.length == 0) {
				//no twitch tab found
				chrome.tabs.create({
					url: "http://www.twitch.tv/saltybet/chat"
				}, function (tab) {
					console.log("The new tab has the url '" + tab.url + "'");
				});

				chrome.tabs.query({}, function (result) {
					var urls = result.map(function (t) {
						return t.url;
					});
					console.log(urls);
				});
			}
		});
	}

	if (details.browserAction !== undefined) {
		chrome.pageAction.show(sender.tab.id);
	}

	if (details.type !== undefined) {
		chrome.tabs.query({
			title: "Salty Bet",
			url: "*://*.saltybet.com/"
		}, function (result) {
			// result is an array of tab.Tabs
			for (var i = 0; i < result.length; i++) {
				chrome.tabs.sendMessage(result[i].id, details);
			}
		});
	}
});
var sendUpdatedChromosome = function () {
	chrome.storage.local.get(["chromosomes_v1"], function (results) {
		if (results.chromosomes_v1) {
			for (var i in results.chromosomes_v1) {
				if (!results.chromosomes_v1[i].rank)
					results.chromosomes_v1[i].rank = 100;
			}
			results.chromosomes_v1.sort(function (a, b) {
				return a.rank - b.rank;
			});
			var data = JSON.stringify(results.chromosomes_v1[0]);
			chrome.tabs.query({
				title: "Salty Bet",
				url: "*://*.saltybet.com/"
			}, function (result) {
				if (result.length > 0) {
					chrome.tabs.sendMessage(result[0].id, {
						type: "suc",
						text: data
					});
				}
			});
		}
	});
};
chrome.alarms.onAlarm.addListener(function (alarm) {
	sendUpdatedChromosome();
});
//To reload
//chrome.tabs.reload(myTabs[i].id)
// or if that doesn't work
//chrome.tabs.executeScript(myTabs[i].id, {code:"document.location.reload(true);"});