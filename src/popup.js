var btnClicked = function(clicktype, data) {
	data = data || null;
	chrome.tabs.query({
		active : true,
		currentWindow : true
	}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			type : clicktype,
			text : data
		}, function(response) {
			console.log(response.farewell);
		});
	});
};

var drClick = function() {
	btnClicked("dr");
};
var prClick = function() {
	btnClicked("pr");
};
var erClick = function() {
	btnClicked("er");
};

var changeStrategyClickO = function() {
	btnClicked("cs_o");
};
var changeStrategyClickCS = function() {
	chrome.storage.local.get(["chromosomes_v1"], function(results) {
		var data = JSON.stringify(results.chromosomes_v1[0]);
		btnClicked("cs_cs", data);
	});
};
var changeStrategyClickRC = function() {
	btnClicked("cs_rc");
};
var onFileRead = function(e) {
	var t = e.target.result;
	btnClicked("ir", t);
};
var irClick = function() {
	var file = document.getElementById('bir').files[0];
	var reader = new FileReader();
	reader.onload = onFileRead;
	reader.readAsText(file);
};

var Order = function(typeStr, chromosome) {
	this.type = typeStr;
	this.chromosome = chromosome;
};
var Simulator = function() {
	this.data = [];
};
Simulator.prototype.evalMutations = function(mode) {
	var self = this;
	chrome.storage.local.get(["matches_v1", "characters_v1", "chromosomes_v1"], function(results) {
		var matches = results.matches_v1;
		var data = [];
		var correct = [];
		var totalBettedOn = [];
		var strategies = [];
		var totalPercentCorrect = [];
		var updater = new Updater();
		//
		var confidencesLedToLoss = [];
		var confidencesLedToWin = [];

		// create orders from string passed in
		var orders = [];
		if (mode == "evolution") {
			// queue up the entire last batch of chromosomes
			var chromosomes = results.chromosomes_v1;
			if (chromosomes) {
				for (var z = 0; z < chromosomes.length; z++)
					orders.push(new Order("cs", new Chromosome().loadFromObject(chromosomes[z])));
			} else {
				var msg = "Pool not initialized.";
				document.getElementById('msgbox').value = msg;
				throw msg;
			}
		} else if (mode == "mass") {
			orders.push(new Order("rc"));
			orders.push(new Order("rb"));
		} else {
			if (document.getElementById("ct").checked)
				orders.push(new Order("ct"));
			if (document.getElementById("mw").checked)
				orders.push(new Order("mw"));
			if (document.getElementById("mwc").checked)
				orders.push(new Order("mwc"));
			if (document.getElementById("rb").checked)
				orders.push(new Order("rb"));
			if (document.getElementById("cs").checked)
				orders.push(new Order("cs", new Chromosome().loadFromObject(results.chromosomes_v1[0])));
			if (document.getElementById("rc").checked)
				orders.push(new Order("rc"));
		}

		// process orders for strategy creation
		for (var h = 0; h < orders.length; h++) {
			var order = orders[h];
			var strategy;
			switch(order.type) {
			case "ct":
				strategy = new CoinToss();
				break;
			case "mw":
				strategy = new MoreWins();
				break;
			case "mwc":
				strategy = new MoreWinsCautious();
				break;
			case "rb":
				strategy = new RatioBasic();
				break;
			case "cs":
				strategy = new ConfidenceScore(order.chromosome);
				break;
			case "rc":
				strategy = new RatioConfidence();
				break;
			}
			strategy.debug = false;

			data.push([]);
			correct.push(0);
			totalBettedOn.push(0);
			strategies.push(strategy);
			totalPercentCorrect.push(0);
		}

		var characterRecords = [];
		var namesOfCharactersWhoAlreadyHaveRecords = [];

		// process matches
		for (var i = 0; i < matches.length; i++) {
			var info = {
				"character1" : updater.getCharacter(matches[i].c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
				"character2" : updater.getCharacter(matches[i].c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
				"matches" : results.matches_v1
			};

			for (var n = 0; n < strategies.length; n++) {
				//reset abstain every time
				strategies[n].abstain = false;
			}

			var actualWinner = (matches[i].w == 0) ? matches[i].c1 : matches[i].c2;

			var predictions = [];
			for (var j = 0; j < strategies.length; j++) {
				predictions.push(strategies[j].execute(info));
			}

			// now update characters
			updater.updateCharactersFromMatch(matches[i], info.character1, info.character2);

			// check results
			if (strategies.length != predictions.length)
				throw "Strategies and predictions are not the same length.";
			for (var k = 0; k < strategies.length; k++) {
				var prediction = predictions[k];
				var strategy = strategies[k];
				var predictionWasCorrect = prediction == actualWinner;
				if (!strategy.abstain) {
					correct[k] += (predictionWasCorrect) ? 1 : 0;
					if (predictionWasCorrect && strategy.confidence)
						confidencesLedToWin.push(strategy.confidence);
					else if (strategy.confidence)
						confidencesLedToLoss.push(strategy.confidence);

					totalBettedOn[k] += 1;
					totalPercentCorrect[k] = correct[k] / totalBettedOn[k] * 100;
					data[k].push([totalBettedOn[k], totalPercentCorrect[k]]);
				}

			}
		}

		if (mode == "evolution" || mode == "mass") {
			//go through totalPercentCorrect, weed out the top 10, breed them, save them
			var sortingArray = [];
			var parents = [];
			var nextGeneration = [];

			if (mode == "evolution") {
				for (var l = 0; l < orders.length; l++) {
					sortingArray.push([orders[l].chromosome, totalPercentCorrect[l]]);
				}
				sortingArray.sort(function(a, b) {
					return b[1] - a[1];
				});
				var top = Math.round(sortingArray.length / 2);
				for (var o = 0; o < top; o++) {
					console.log(sortingArray[o][0].toDisplayString() + " -> " + sortingArray[o][1]);
					parents.push(sortingArray[o][0]);
					nextGeneration.push(sortingArray[o][0]);
				}
				for (var mf = 0; mf < parents.length; mf++) {
					var parent1 = null;
					var parent2 = null;
					var child = null;
					if (mf == 0) {
						parent1 = parents[0];
						parent2 = parents[parents.length - 1];
					} else {
						parent1 = parents[mf - 1];
						parent2 = parents[mf];
					}
					child = parent1.mate(parent2);
					nextGeneration.push(child);
				}
			}

			//figure out confidence thresholds
			var wConfidenceSum = 0;
			var lConfidenceSum = 0;
			for (var wc = 0; wc < confidencesLedToWin.length; wc++)
				wConfidenceSum += confidencesLedToWin[wc];
			var wConfidenceAvg = (wConfidenceSum / confidencesLedToWin.length * 100).toFixed(4);
			for (var wl = 0; wl < confidencesLedToLoss.length; wl++)
				lConfidenceSum += confidencesLedToLoss[wl];
			var lConfidenceAvg = (lConfidenceSum / confidencesLedToLoss.length * 100).toFixed(4);

			var best;
			if (mode == "evolution") {
				best = sortingArray[0][1];

				chrome.storage.local.set({
					'chromosomes_v1' : nextGeneration,
					'best_chromosome' : sortingArray[0][0]
				}, function() {
					roundsOfEvolution += 1;
					console.log("\n\n-------- end of generation " + roundsOfEvolution + ", matches processed with ConfidenceScore " + totalBettedOn[0] + "/" + matches.length + "=" + (totalBettedOn[0] / matches.length * 100).toFixed(0) + "% -> " + best.toFixed(4) + "%, wC: " + wConfidenceAvg + ", lC: " + lConfidenceAvg + "-------------------\n\n");
					document.getElementById('msgbox').value = "rounds: " + roundsOfEvolution + ", best: " + best;
					setTimeout(function() {
						simulator.evalMutations("evolution");
					}, 5000);
				});
			} else if (mode == "mass") {
				console.log("\n\n--------------- matches processed with RatioConfidence " + totalBettedOn[0] + "/" + matches.length + "=" + (totalBettedOn[0] / matches.length * 100).toFixed(0) + "% -> wC: " + wConfidenceAvg + ", lC: " + lConfidenceAvg + "-------------------\n\n");

				for (var l = 0; l < orders.length; l++) {
					console.log(orders[l].type + ": " + totalPercentCorrect[l]);
				}
			}

		} else {
			self.data = data;
			for (var l = 0; l < orders.length; l++) {
				console.log(orders[l].type + ": " + totalPercentCorrect[l]);
			}
			self.draw(data);
		}

	});
};
Simulator.prototype.draw = function(d) {
	// Create the Scatter chart.
	var scatter = new RGraph.Scatter({

		id : 'cvs',
		data : d,
		options : {
			background : {
				barcolor1 : 'white',
				barcolor2 : 'white',
				grid : {
					color : 'rgba(238,238,238,1)'
				}
			},
			gutter : {
				left : 30
			},
			title : {
				xaxis : "# matches",
				yaxis : "% correct"
			},
			xmax : 1000,
			ymax : 100
		}
	}).draw();
};
Simulator.prototype.initializePool = function() {
	var pool = [new Chromosome(), new Chromosome()];
	while (pool.length < 100) {
		if (pool.length < 20) {
			var offspring = pool[0].mate(pool[1]);
			var foundDuplicate = false;
			for (var i in pool) {
				var ch = pool[i];
				if (ch.equals(offspring))
					foundDuplicate = true;
			}
			if (!foundDuplicate)
				pool.push(offspring);
		} else {
			var chromosome1 = pool[Math.floor(Math.random() * pool.length)];
			var chromosome2 = pool[Math.floor(Math.random() * pool.length)];
			pool.push(chromosome1.mate(chromosome2));
		}

	}
	var newPool = [];
	for (var i = 0; i < pool.length; i++) {
		if (i % 5 == 0) {
			console.log(pool[i].toDisplayString());
			newPool.push(pool[i]);
		}
	}
	chrome.storage.local.set({
		'chromosomes_v1' : newPool
	}, function() {
		document.getElementById('msgbox').value = "initial pool population complete";
	});

};

simulator = new Simulator();
roundsOfEvolution = 0;

document.addEventListener('DOMContentLoaded', function() {
	document.getElementById("bdr").addEventListener("click", drClick);
	document.getElementById("bpr").addEventListener("click", prClick);
	document.getElementById("ber").addEventListener("click", erClick);
	document.getElementById("bir").addEventListener("change", irClick);
	document.getElementById("bsc").addEventListener("click", function() {
		simulator.evalMutations();
		simulator.draw();
	});
	document.getElementById("ugw").addEventListener("click", function() {
		simulator.evalMutations("evolution");
	});
	document.getElementById("rgw").addEventListener("click", function() {
		simulator.initializePool();
	});
	document.getElementById("mrc").addEventListener("click", function() {
		simulator.evalMutations("mass");
	});
	document.getElementById("cs_o").addEventListener("click", changeStrategyClickO);
	document.getElementById("cs_cs").addEventListener("click", changeStrategyClickCS);
	document.getElementById("cs_rc").addEventListener("click", changeStrategyClickRC);
	chrome.alarms.create("chromosome update", {
		when : Date.now(),
		periodInMinutes : 1
	});

});

