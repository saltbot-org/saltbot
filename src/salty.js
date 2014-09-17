function Controller() {
	var bettingAvailable = false;
	var bettingEntered = false;
	var bettingComplete = true;

	var match = null;

	var debugMode = true;

	setInterval(function() {
		var bettingTable = document.getElementsByClassName("dynamic-view")[0];
		var styleObj = window.getComputedStyle(bettingTable, null);
		var active = styleObj.display != "none";

		//<span class="dollar" id="balance" style="display: inline;">7,704</span>
		//<span id="betstatus" style="display: inline;">Omega red mvc2 wins! Payouts to Team Red.</span>
		//<span id="betstatus" style="display: inline;">Bets are locked until the next match.</span>
		//<span id="betstatus" style="display: inline;">Bets are OPEN!</span>

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
			if (match != null) {
				var result = match.getStrategy().getWinner();
				if (result != null) {
					var records = match.getRecords(result);
					var mr = records[0];
					var c1 = records[1];
					var c2 = records[2];
					console.log("match results: " + "\n" + "character 1: " + mr.c1 + "\n" + "character 2: " + mr.c2 + "\n" + "winner: " + mr.w + "\n" + "strategy: " + mr.sn + "\n" + "prediction: " + mr.pw + "\n");
					var matches_v1 = null;
					var characters_v1 = null;
					chrome.storage.local.get(["matches_v1", "characters_v1"], function(results) {
						//store new match record
						if (results.hasOwnProperty("matches_v1")) {
							results.matches_v1.append(mr);
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
							if (characters_v2[i].name == c2.name) {
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
								console.log("-");
								console.log("records saved");
								// console.log("active: " + active);
								// console.log("available: " + bettingAvailable);
								// console.log("entered: " + bettingEntered);
								// console.log("complete: " + bettingComplete);
								console.log("-");
							}
						});
					});

				}

			}

			if (Math.random() > 0.01) {//skip 1% of matches

				match = new Match(new CoinToss());

			} else {
				match = null;
			}
			bettingEntered = true;
		}

		if (!active && bettingEntered) {
			bettingComplete = true;
			bettingAvailable = false;
		}

	}, 3000);

}

c = Controller();
