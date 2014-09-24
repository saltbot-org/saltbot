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
	this.currentMatch=null;
	this.statusScanner = new StatusScanner();
	var self = this;

	var debugMode = true;

	setInterval(function() {
		var bettingTable = document.getElementsByClassName("dynamic-view")[0];
		var styleObj = window.getComputedStyle(bettingTable, null);
		var active = styleObj.display != "none";

		var iframe = document.getElementById('chat-frame-stream');
		//var inne//rDoc = iframe.contentDocument || iframe.contentWindow.document;
		var allChatLines = iframe.getElementsByClassName("chat-line");
		var waifuAnnouncements = [];

		if (!active) {
			bettingAvailable = false;
		}
		if (active && bettingComplete == true) {
			bettingAvailable = true;
			bettingEntered = false;
			bettingComplete = false;
		}

		if (bettingAvailable && !bettingEntered) {

			//Deal with old match
			if (self.currentMatch != null) {
				var winner = self.currentMatch.strategy.getWinner(self.statusScanner);
				if (winner != null) {
					var records = self.currentMatch.getRecords(winner);
					var mr = records[0];
					var c1 = records[1];
					var c2 = records[2];
					console.log("match results: " + "\n" + "character 1: " + mr.c1 + "\n" + "character 2: " + mr.c2 + "\n" + "winner: " + mr.w + "\n" + "strategy: " + mr.sn + "\n" + "prediction: " + mr.pw + "\n");
					var matches_v1 = null;
					var characters_v1 = null;
					chrome.storage.local.get(["matches_v1", "characters_v1"], function(results) {
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
								console.log("-\nrecords saved, processed so far: " + mp);
							}
							if (mp >= mbr) {
								location.reload();
							}
						});
					});

				}
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

	}, 3000);

};
Controller.prototype.receiveMessageFromTwitch = function(message, sender, sendResponse) {
	console.log("-\nmessage from Waifu:\t" + message);
	if (typeof message === "string"){
		var winMessageIndicator=" wins";
		if (message.indexOf(winMessageIndicator)>-1){
			var winnerName=message.split(winMessageIndicator)[0];
			
		}
	}
		
	this.currentMatch;
};
Controller.prototype.ensureTwitch=function(){
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
	chrome.runtime.onMessage.addListener(ctrl.receiveMessageFromTwitch);

}

