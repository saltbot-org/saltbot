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
	if (details.getTwitch !== undefined) {
		chrome.tabs.query({
			url : "http://www.twitch.tv/saltybet"
		}, function(result) {
			if (result.length == 0)
				chrome.tabs.create({
					url : "http://www.twitch.tv/saltybet"
				});
		});
	}
});

//To reload
//chrome.tabs.reload(myTabs[i].id)
// or if that doesn't work
//chrome.tabs.executeScript(myTabs[i].id, {code:"document.location.reload(true);"});