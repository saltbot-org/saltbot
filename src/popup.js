//enable links
$(document).ready(function () {
	$('body').on('click', 'a', function () {
		chrome.tabs.create({url: $(this).attr('href')});
		return false;
	});
});

$(document).ready(function () {
	$("#upload_c").on("click", function (e) {
		e.stopPropagation();
	});
	$("#upload_r").on("click", function (e) {
		e.stopPropagation();
	});

	$("#bic").on("click", function (e) {
		$('#upload_c').trigger('click');
	});
	$("#bir").on("click", function (e) {
		$('#upload_r').trigger('click');
	});
});

var elementChanged = function (changetype, data) {
	btnClicked(changetype, data);
};

var btnClicked = function (clicktype, data) {
	data = data || null;
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			type: clicktype,
			text: data
		}, function (response) {
			if (response && response.farewell)
				console.log(response.farewell);
		});
	});
};

var erClick = function () {
	btnClicked("er");
};
var ecClick = function () {
	btnClicked("ec");
}
var tvClick = function () {
	btnClicked("tv");
};
var taChange = function () {
	var talimit = $("#talimit")[0].value;
	elementChanged("talimit_" + (($("#ta")[0].checked) ? "enable" : "disable"), talimit);
};
var limitChange = function () {
	var limit = $("#limit")[0].value;
	if (!limit) {
		return;
	}

	if (limit < 1000) {
		return;
	}
	
	elementChanged("limit_" + (($("#tl")[0].checked) ? "enable" : "disable"), limit);
};

var multiplierChange = function() {
	var multiplierValue = $("#multiplierSlider")[0].value;
	elementChanged("multiplier", multiplierValue);
};

var changeStrategyClickO = function () {
	btnClicked("cs_o");
	setButtonActive("#cs_o");
};
var changeStrategyClickCS = function () {
	chrome.storage.local.get(["chromosomes_v1"], function (results) {
		console.log(results);
		if (Object.keys(results).length === 0) {
			btnClicked("cs_cs_warning");
		} else {
			var data = JSON.stringify(results.chromosomes_v1[0]);
			btnClicked("cs_cs", data);
			setButtonActive("#cs_cs");
		}
	});
};
var changeStrategyClickRC = function () {
	btnClicked("cs_rc");
	setButtonActive("#cs_rc");
};
var changeStrategyClickIPU = function () {
	btnClicked("cs_ipu");
	setButtonActive("#cs_ipu");
};
var setButtonActive = function(identifier) {
	$("#cs_o").removeClass("active");
	$("#cs_rc").removeClass("active");
	$("#cs_cs").removeClass("active");
	$("#cs_ipu").removeClass("active");
	
	$(identifier).addClass("active");
}
var onFileReadRecord = function (e) {
	console.log("File read successful.");
	var t = e.target.result;
	btnClicked("ir", t);
};
var onFileReadChromosome = function (e) {
	console.log("File read successful.");
	var t = e.target.result;
	btnClicked("ic", t);
};
var irClick = function () {
	console.log("Attempting records import...");
	var files = $("#upload_r")[0].files;
	if (files.length > 0)
		console.log("Upload successful.");
	else
		console.log("Upload canceled.");
	console.log("Attempting to read file...");

	var file = files[0];
	var reader = new FileReader();
	reader.onload = onFileReadRecord;
	reader.readAsText(file);
};
var icClick = function () {
	console.log("Attempting chromosome import...");
	var files = $("#upload_c")[0].files;
	if (files.length > 0)
		console.log("Upload successful.");
	else
		console.log("Upload canceled.");
	console.log("Attempting to read file...");

	var file = files[0];
	var reader = new FileReader();
	reader.onload = onFileReadChromosome;
	reader.readAsText(file);
};

//---------------------------------------------------------------------------------------------------------
// SIMULATOR SECTION
//---------------------------------------------------------------------------------------------------------

var Order = function (typeStr, chromosome) {
	this.type = typeStr;
	this.chromosome = chromosome;
};
var Simulator = function () {
	this.data = [];
	this.money = [];
	this.minimum = 400;
};
Simulator.prototype.updateMoney = function (index, odds, selection, amount, correct) {
	var oddsArr = odds.split(":");
	if (!correct) {
		this.money[index] -= amount;
		if (this.money[index] < this.minimum)
			this.money[index] = this.minimum;
	} else {
		if (selection == 0)
			this.money[index] += amount * parseFloat(oddsArr[1]) / parseFloat(oddsArr[0]);
		else if (selection == 1)
			this.money[index] += amount * parseFloat(oddsArr[0]) / parseFloat(oddsArr[1]);
	}
};
Simulator.prototype.getBetAmount = function (strategy, index) {
	var amountToBet;
	var tournament = false;
	var debug = false;
	var balance = this.money[index];

	if (!strategy.confidence)
		amountToBet = Math.ceil(balance * .1);
	else
		amountToBet = strategy.getBetAmount(balance, tournament, debug);

	return amountToBet;
};
// currently unsupported with the time weights splitting.
Simulator.prototype.applyPenalties = function (c) {
	//###
	console.log("called: applyPenalties. Is undefined.")
	return 1;
	//###
	// anti-domination
	var adOdds = c.timeWeight + c.winPercentageWeight + c.crowdFavorWeight + c.illumFavorWeight;
	var adTime = c.oddsWeight + c.winPercentageWeight + c.crowdFavorWeight + c.illumFavorWeight;
	var adWPer = c.oddsWeight + c.timeWeight + c.crowdFavorWeight + c.illumFavorWeight;
	var adCFW = c.oddsWeight + c.timeWeight + c.winPercentageWeight + c.illumFavorWeight;
	var adIFW = c.oddsWeight + c.timeWeight + c.winPercentageWeight + c.crowdFavorWeight;
	if (c.oddsWeight > adOdds || c.timeWeight > adTime || c.winPercentageWeight > adWPer || c.crowdFavorWeight > adCFW || c.illumFavorWeight > adIFW)
		return 0.05;
	return 1;
};
Simulator.prototype.evalMutations = function (mode) {
	var self = this;
	chrome.storage.local.get(["matches_v1", "characters_v1", "chromosomes_v1"], function (results) {
		var matches = [];
		
		if (results.matches_v1)
			matches = results.matches_v1;
		
		if (matches.length == 0) {
			console.log('No matches have been recorded yet.');
			return;
		}
		
		var data = [];
		var correct = [];
		var totalBettedOn = [];
		var strategies = [];
		var totalPercentCorrect = [];
		self.money = [];
		var updater = new Updater();

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
				$("#msgbox")[0].value = msg;
				throw msg;
			}
		} else if (mode == "mass") {

			orders.push(new Order("cs", new Chromosome().loadFromObject(results.chromosomes_v1[0])));
		} else {
			if ($("#ct")[0].checked)
				orders.push(new Order("ct"));
			if ($("#cs")[0].checked)
				orders.push(new Order("cs", new Chromosome().loadFromObject(results.chromosomes_v1[0])));
			if ($("#rc")[0].checked)
				orders.push(new Order("rc"));
		}

		// process orders for strategy creation
		for (var h = 0; h < orders.length; h++) {
			var order = orders[h];
			var strategy;
			switch (order.type) {
				case "ct":
					strategy = new CoinToss();
					break;
				case "cs":
					strategy = new ConfidenceScore(order.chromosome);
					break;
				case "rc":
					strategy = new RatioConfidence();
					break;
				case "ipu":
					strategy = new InternetPotentialUpset(order.chromosome);
					break;
			}
			strategy.debug = false;

			data.push([]);
			correct.push(0);
			totalBettedOn.push(0);
			strategies.push(strategy);
			totalPercentCorrect.push(0);
			self.money.push(self.minimum);
		}

		var characterRecords = [];
		var namesOfCharactersWhoAlreadyHaveRecords = [];

		var nonupsetDenominators = [];
		var upsetDenominators = [];
		var denominators = [];
		var upsetsBetOn = 0;
		var nonUpsetsBetOn = 0;
		var minimizedLosses = 0;
		var lossMinimizationAmount = 0;

		// process matches
		for (var i = 0; i < matches.length; i++) {

			var info = {
				"character1": updater.getCharacter(matches[i].c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
				"character2": updater.getCharacter(matches[i].c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
				"matches": results.matches_v1
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

					totalBettedOn[k] += 1;
					totalPercentCorrect[k] = correct[k] / totalBettedOn[k] * 100;
					data[k].push([totalBettedOn[k], totalPercentCorrect[k]]);

					if (mode == "mass")
						if (matches[i].o != "U") {
							var t = matches[i].o.split(":");
							var o1 = parseFloat(t[0]);
							var o2 = parseFloat(t[1]);
							var greaterNumber = o1 < o2 ? o2 / o1 : o1 / o2;
							denominators.push(greaterNumber);

							var isAnUpset = (matches[i].w == 0 && o2 > o1) || (matches[i].w == 1 && o1 > o2);
							if (isAnUpset) {
								upsetDenominators.push(greaterNumber);
								if (predictionWasCorrect)
									upsetsBetOn += 1;
							} else {
								nonupsetDenominators.push(greaterNumber);
								if (predictionWasCorrect)
									nonUpsetsBetOn += 1;
							}

							if (!predictionWasCorrect && strategy.confidence && strategy.confidence < 0.9) {
								lossMinimizationAmount += 1 - strategy.confidence;
								minimizedLosses += 1;
							}


							// var avgOddsC1 = updater.getCharAvgOdds(matches[i].c1);
							// var avgOddsC2 = updater.getCharAvgOdds(matches[i].c2);

						}
				}
				//update simulated money
				if (matches[i].o != "U") {
					var moneyBefore = self.money[k];
					strategy.adjustLevel(moneyBefore);
					var betAmount = self.getBetAmount(strategy, k);
					// the 20,000 limit is to compensate for the fact that I haven't been recording the money of the matches -- that amount wouldn't swing the odds
					if (betAmount > 20000)
						betAmount = 20000;
					self.updateMoney(k, matches[i].o, prediction == matches[i].c1 ? 0 : 1, betAmount, predictionWasCorrect);
					if (k == 0 && false)
						console.log("m " + i + ": " + moneyBefore + " o: " + matches[i].o + " b: " + betAmount + " -> " + self.money[k]);
				}
			}
		}

		if (mode == "mass") {
			var dSum = 0;
			for (var z in denominators) {
				dSum += denominators[z];
			}

			var udSum = 0;
			for (var zz in upsetDenominators) {
				udSum += upsetDenominators[zz];
			}

			var nudSum = 0;
			for (var zzz in nonupsetDenominators) {
				nudSum += nonupsetDenominators[zzz];
			}

			console.log("avg denom: " + (dSum / denominators.length).toFixed(1) + ", avg upset: " + (udSum / upsetDenominators.length).toFixed(1) + ", avg nonupset: " + (nudSum / nonupsetDenominators.length).toFixed(1) +
				", \nupsets called correctly: " + (upsetsBetOn / upsetDenominators.length * 100).toFixed(2) + "%, (" + upsetsBetOn + "/" + upsetDenominators.length + ")" +
				", \nnonupsets called correctly: " + (nonUpsetsBetOn / nonupsetDenominators.length * 100).toFixed(2) + "%, (" + nonUpsetsBetOn + "/" + nonupsetDenominators.length + ")" +
				", \nminimized losses: " + (minimizedLosses / matches.length * 100).toFixed(2) + "%, (" + minimizedLosses + "/" + matches.length + "), avg loss minimization amount: "
				+ (lossMinimizationAmount / minimizedLosses * 100).toFixed(2) + "%");

		}

		if (mode == "evolution" || mode == "mass") {
			//go through totalPercentCorrect, weed out the top 10, breed them, save them
			var sortingArray = [];
			var parents = [];
			var nextGeneration = [];
			var money = true;
			var accuracy = true;
			var unshackle = true;
			var weightAccToMoney = 1 - 1/100000000000;			// valid range (0,1), enabled if accuracy & money are. 50% would be the original method. Also good for evening the magnitude between them.
			
			// these ratios controls how critters are breed using the sorted array of critters after the heuristic method. Think of percents as from top best to worst.
			var ratioTopKeep = 0;				// valid range [0,1], from the sorted listed of last gen, the best retained and reused. Not recommended as it prevents "jitter" in finding solutions.
			var ratioTopKeptBreeding = 0.5;		// valid range (0,1), Critical value; fills pool after ratioTopKeep. Controls how many critters are kept/dropped.
			var ratioOrderedTopBestBreeding = Math.ceil(4/64);;	// valid range [0, 1), treat it exclusive to ratioEvenTopBestBreeding. Ratio of controlled breeding onto the best.
			var ratioEvenTopBestBreeding = 0.0;		// valid range [0, 1), treat it exclusive to ratioOrderedTopBestBreeding. Evenly allows the the top list a chance to breed.

			if (mode == "evolution") {
				for (var l = 0; l < orders.length; l++) {
					var penalty = 1;
					if (!unshackle){
						penalty = self.applyPenalties(orders[l].chromosome);
					}
					sortingArray.push([orders[l].chromosome, totalPercentCorrect[l], self.money[l], penalty]);
				}
				//	sort the the best in order.
				sortingArray.sort(function (a, b) {
					if (!money && accuracy)
						return (b[1] * b[3]) - (a[1] * a[3]);
					if (money && !accuracy)
						return (b[2] * b[3]) - (a[2] * a[3]);
					var negate = 1 - weightAccToMoney;
					return ( (weightAccToMoney * b[1]) * (negate * b[2]) * b[3]) - ((weightAccToMoney * a[1]) * (negate * a[2]) * a[3]);
				});

				var sizeNextGen = sortingArray.length;	
				var sizeTopParents = Math.floor(sizeNextGen * ratioTopKeep);		// keep part of sorted population
				var sizeTopParentsBreed = Math.floor(sizeNextGen * ratioTopKeptBreeding);
				for (var o = 0; o < sizeTopParents; o++) {
					parents.push(sortingArray[o][0]);
					//ranking guarantees that we send the best one
					sortingArray[o][0].rank = o + 1;
					nextGeneration.push(sortingArray[o][0]);
				}
				
				// i really only need to see the best one
				console.log(sortingArray[0][0].toDisplayString() + " -> " + sortingArray[0][1].toFixed(4) + "%,  $" + parseInt(sortingArray[0][2]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
				// print scores of pool.
				var poolScoreLog = "\n pool scores: \n";
				for (var i=0; i<sortingArray.length; i++){
					poolScoreLog += sortingArray[i][1].toFixed(4) + "%:$" + parseInt(sortingArray[i][2]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +"\n";
				}
				console.log(poolScoreLog);
				
				// created and push children of that half of best sorted population
				for (var mf = 0; mf < sizeNextGen-sizeTopParents ; mf++) {
					var attemps = 2;
					var atmp = 0;			
					do {
						var parent1 = null;
						var parent2 = null;
						var child = null;
						/*if (mf == 0) {													// breed the best to worst.
							parent1 = sortingArray[0][0];
							parent2 = sortingArray[sizeTopParentsBreed-1][0];
						} else*/ if (mf < sizeTopParentsBreed * (ratioOrderedTopBestBreeding)) {	// breed orderly with best
							parent1 = sortingArray[0][0];
							parent2 = sortingArray[mf][0];
						} else if (mf < sizeTopParentsBreed * (ratioEvenTopBestBreeding)){		// breed all the best with a random.
							parent1 = sortingArray[mf][0];			
							parent2 = sortingArray[Math.floor(Math.random() * (sizeTopParentsBreed))][0];
						} else {					// fill remaining population by random breeding the best with chaos. 
							parent1 = sortingArray[Math.floor(Math.random() * (sizeTopParentsBreed))][0];
							parent2 = sortingArray[Math.floor(Math.random() * (sizeTopParentsBreed))][0];
						}
						atmp++;
					} while ((parent1 == parent2) && (atmp < attemps));
					child = parent1.mate(parent2);
					nextGeneration.push(child);
				}
			}

			var bestPercent;
			var bestMoney;
			if (mode == "evolution") {
				bestPercent = sortingArray[0][1];
				bestMoney = sortingArray[0][2];

				chrome.storage.local.set({
					'chromosomes_v1': nextGeneration,
					'best_chromosome': sortingArray[0][0]
				}, function () {
					roundsOfEvolution += 1;
					console.log("\n\n-------- end of gen" + nextGeneration.length + "  " + roundsOfEvolution + ", m proc'd w/ CS " + totalBettedOn[0] + "/" + matches.length + "=" + (totalBettedOn[0] / matches.length * 100).toFixed(0) + "%m -> " + bestPercent.toFixed(1) + "%c, $" + bestMoney.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "   -----------------\n\n");
					$("#msgbox")[0].value = "g(" + roundsOfEvolution + "), best: " + bestPercent.toFixed(1) + "%, $" + bestMoney.toFixed(0);
					setTimeout(function () {
						simulator.evalMutations("evolution");
					}, 5000);
				});
			} else if (mode == "mass") {
				console.log("\n\n--------------- matches processed: " + matches.length);
				var ipuSum = 0;
				for (var l = 0; l < orders.length; l++) {
					if (orders[l].type == "ipu")
						ipuSum += self.money[l];
					else
						console.log(orders[l].type + ": " + totalPercentCorrect[l] + "%, $" + self.money[l]);
				}
				console.log("average IPU money: " + (ipuSum / (self.money.length - 1)));
			}

		} else {
			self.data = data;
			for (var l = 0; l < orders.length; l++) {
				console.log(orders[l].type + ": " + totalPercentCorrect[l]);
			}
		}

	});
};
Simulator.prototype.initializePool = function () {
	var populationSize = 32;	// too small, it cannot expanded solve space; two large, not only runtime increases, weights differences between best/worst become dominate.
	var shortPopulationSize = 16;
	var pool = [new Chromosome(), new Chromosome()];
	while (pool.length < populationSize) {
		if (pool.length < shortPopulationSize) {
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
			// offset random, as starting new chromosomes are not normalized.
			var chromosome1 = pool[2+Math.floor(Math.random() * (pool.length-2))];
			var chromosome2 = pool[2+Math.floor(Math.random() * (pool.length-2))];
			pool.push(chromosome1.mate(chromosome2));
		}

	}
	var newPool = [];
	for (var i = 0; i < pool.length; i++) {

		if (i % 1 == 0) {
			console.log(":: "+i+"\n"+pool[i].toDisplayString());
		}
		newPool.push(pool[i]);
	}
	chrome.storage.local.set({
		'chromosomes_v1': newPool
	}, function () {
		$("#msgbox")[0].value = "initial pool population complete";
	});

};

simulator = new Simulator();
var roundsOfEvolution = 0;

document.addEventListener('DOMContentLoaded', function () {
	chrome.storage.local.get('settings_v1', function (result) {
		if (result.settings_v1) {
			$("#tl")[0].checked = result.settings_v1.limit_enabled || false;
			$("#limit")[0].value = result.settings_v1.limit || 10000;
			$("#ta")[0].checked = result.settings_v1.talimit_enabled || false;
			$("#talimit")[0].value = result.settings_v1.talimit || 10000;
			$("#multiplierField")[0].value = result.settings_v1.multiplier || 1;
			$("#multiplierSlider")[0].value = result.settings_v1.multiplier || 1;
			
			setButtonActive("#cs_" + result.settings_v1.nextStrategy);
			
			console.log($("#tl")[0]);
			console.log($("#limit")[0].value);
		}
		console.log(result);
	});

	$("#ber")[0].addEventListener("click", erClick);
	$("#bir")[0].addEventListener("change", irClick);
	$("#bec")[0].addEventListener("click", ecClick);
	$("#bic")[0].addEventListener("change", icClick);
	$("#ugw")[0].addEventListener("click", function () {
		simulator.evalMutations("evolution");
	});
	$("#rgw")[0].addEventListener("click", function () {
		simulator.initializePool();
	});
	$("#tv")[0].addEventListener("click", tvClick);
	$("#ta")[0].addEventListener("change", taChange);
	$("#talimit").bind('keyup input', taChange);
	$("#cs_o")[0].addEventListener("click", changeStrategyClickO);
	$("#cs_cs")[0].addEventListener("click", changeStrategyClickCS);
	$("#cs_rc")[0].addEventListener("click", changeStrategyClickRC);
	$("#cs_ipu")[0].addEventListener("click", changeStrategyClickIPU);
	$("#tl")[0].addEventListener("change", limitChange);
	$("#limit").bind('keyup input', limitChange);
	$("#multiplierSlider").bind("change", multiplierChange);
	$("#multiplierSlider").bind("input", function() {
		var multiplierValue = $("#multiplierSlider")[0].value;
		$("#multiplierField")[0].value = multiplierValue;
	})

	chrome.alarms.create("chromosome update", {
		delayInMinutes: 0.1,
		periodInMinutes: 1.0
	});

});

