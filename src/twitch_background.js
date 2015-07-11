chrome.extension.onMessage.addListener(function(details) {
	if (details.message !== undefined) {
		//Receive message from Waifu, pass it on to salty tab
		chrome.tabs.query({
			title : "Salty Bet - In Salt We Trust",
			url : "http://www.saltybet.com/"
		}, function(result) {
			// result is an array of tab.Tabs
			for (var i = 0; i < result.length; i++) {
				chrome.tabs.sendMessage(result[i].id, details.message);
			}
		});
	}
	// Code below keeps opening the twitch tab over and over again, best to disable.
	//if (details.getTwitch !== undefined) {
	//	chrome.tabs.query({
	//		url : "http://www.twitch.tv/saltybet"
	//	}, function(result) {
	//		if (result.length == 0)
	//			chrome.tabs.create({
	//				url : "http://www.twitch.tv/saltybet"
	//			});
	//	});
	//}
});
var sendUpdatedChromosome = function() {
	chrome.storage.local.get(["chromosomes_v1"], function(results) {
		if (results.chromosomes_v1) {
			for (var i in results.chromosomes_v1) {
				if (!results.chromosomes_v1[i].rank)
					results.chromosomes_v1[i].rank = 100;
			}
			results.chromosomes_v1.sort(function(a, b) {
				return a.rank - b.rank;
			});
			var data = JSON.stringify(results.chromosomes_v1[0]);
			chrome.tabs.query({
				title : "Salty Bet - In Salt We Trust",
				url : "http://www.saltybet.com/"
			}, function(result) {
				chrome.tabs.sendMessage(result[0].id, {
					type : "suc",
					text : data
				});
			});
		}
	});
};
chrome.alarms.onAlarm.addListener(function(alarm) {
	sendUpdatedChromosome();
});
//To reload
//chrome.tabs.reload(myTabs[i].id)
// or if that doesn't work
//chrome.tabs.executeScript(myTabs[i].id, {code:"document.location.reload(true);"});
