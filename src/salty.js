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
		//<span id="betstatus" style="display: inline;">Bets are OPEN!</span>
		if (active && bettingComplete == true) {
			bettingAvailable = true;
			bettingEntered = false;
			bettingComplete = false;
		}

		if (bettingAvailable && !bettingEntered) {

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
