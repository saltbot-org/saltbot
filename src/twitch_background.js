chrome.runtime.onInstalled.addListener(function() {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: {
                        hostSuffix: 'saltybet.com'
                    }
                })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});

chrome.extension.onMessage.addListener(function(details) {
	if (details.message !== undefined) {
		//Receive message from Waifu, pass it on to salty tab
		chrome.tabs.query({
			title : "Salty Bet",
			url : "http://*.saltybet.com/"
		}, function(result) {
			// result is an array of tab.Tabs
			for (var i = 0; i < result.length; i++) {
				chrome.tabs.sendMessage(result[i].id, details.message);
			}
		});
	}
	if (details.getTwitch !== undefined) {
		chrome.tabs.query({}, function(result) {
			var urls = result.map(function(t) {return t.url;});
			console.log(urls);
			
			if (urls.indexOf("http://www.twitch.tv/saltybet/chat") == -1 &&
				urls.indexOf("https://www.twitch.tv/saltybet/chat") == -1) {
				//no twitch tab found
				chrome.tabs.create({
					url : "http://www.twitch.tv/saltybet/chat"
				}, function(tab) {
					console.log("The new tab has the url '" + tab.url + "'");
				});
			}
		});
	}
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
				title : "Salty Bet",
				url : "http://*.saltybet.com/"
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