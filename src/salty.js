function Controller() {
	var bettingAvailable = false;
	var bettingEntered = false;
	var bettingComplete = true;

	var match = null;

	var debugMode = false;

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
					console.log("match results: " + "\n" + "character 1: " + mr.c1 + "\n" + "character 2: " + mr.c2 + "\n" + "winner: " + mr.w + "\n" + "strategy: " + mr.sn + "\n" + "prediction: " + mr.pw + "\n");
				}

			}

			if (Math.random() > .1) {//skip 10% of matches

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

		if (debugMode) {
			console.log("-");
			console.log("active: " + active);
			console.log("available: " + bettingAvailable);
			console.log("entered: " + bettingEntered);
			console.log("complete: " + bettingComplete);
		}

	}, 3000);

}

c = Controller();
