//enable links
$(document).ready(function() {
	$("body").on("click", "a", function() {
		chrome.tabs.create({ url: $(this).attr("href") });
		return false;
	});
});

$(document).ready(function() {
	$("#bic").on("click", function(e) {
		$("#upload_c").trigger("click");
	});
	$("#bir").on("click", function(e) {
		$("#upload_r").trigger("click");
	});
});

var elementChanged = function(changetype, data) {
	btnClicked(changetype, data);
};

var btnClicked = function(clicktype: string, data = null) {
	data = data || null;
	chrome.tabs.query({
		active: true,
		currentWindow: true,
	}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			text: data,
			type: clicktype,
		}, function(response) {
			if (response && response.farewell) {
				console.log(response.farewell);
			}
		});
	});
};

var erClick = function() {
	btnClicked("er");
};
var ecClick = function() {
	btnClicked("ec");
};
var tvClick = function() {
	btnClicked("tv");
};
var taChange = function() {
	const talimit = ($("#talimit")[0] as HTMLInputElement).value;
	elementChanged("talimit_" + (($("#ta")[0] as HTMLInputElement).checked ? "enable" : "disable"), talimit);
};
var tmChange = function() {
	const tmlimit = ($("#tmlimit")[0] as HTMLInputElement).value;
	elementChanged("tmlimit_" + (($("#tm")[0] as HTMLInputElement).checked ? "enable" : "disable"), tmlimit);
};
var limitChange = function() {
	const limit = +($("#limit")[0] as HTMLInputElement).value;
	if (!limit) {
		return;
	}

	if (limit < 1000) {
		return;
	}

	elementChanged("limit_" + ((($("#tl")[0] as HTMLInputElement).checked) ? "enable" : "disable"), limit);
};

var multiplierChange = function() {
	const multiplierValue = ($("#multiplierSlider")[0] as HTMLInputElement).value;
	elementChanged("multiplier", multiplierValue);
};

var changeStrategyClickO = function() {
	btnClicked("cs_o");
	setButtonActive("#cs_o");
};
var changeStrategyClickCS = function() {
	chrome.storage.local.get(["chromosomes_v1"], function(results) {
		console.log(results);
		if (Object.keys(results).length === 0) {
			btnClicked("cs_cs_warning");
		} else {
			const data = JSON.stringify(results.chromosomes_v1[0]);
			btnClicked("cs_cs", data);
			setButtonActive("#cs_cs");
		}
	});
};
var changeStrategyClickRC = function() {
	btnClicked("cs_rc");
	setButtonActive("#cs_rc");
};
var changeStrategyClickIPU = function() {
	btnClicked("cs_ipu");
	setButtonActive("#cs_ipu");
};
var setButtonActive = function(identifier) {
	$("#cs_o").removeClass("active");
	$("#cs_rc").removeClass("active");
	$("#cs_cs").removeClass("active");
	$("#cs_ipu").removeClass("active");

	$(identifier).addClass("active");
};
var onFileReadRecord = function(e) {
	console.log("File read successful.");
	const t = e.target.result;
	btnClicked("ir", t);
};
var onFileReadChromosome = function(e) {
	console.log("File read successful.");
	const t = e.target.result;
	btnClicked("ic", t);
};
var irClick = function() {
	console.log("Attempting records import...");
	const files = ($("#upload_r")[0] as HTMLInputElement).files;
	if (files.length > 0) {
		console.log("Upload successful.");
	}
	else {
		console.log("Upload canceled.");
	}
	console.log("Attempting to read file...");

	const file = files[0];
	$("#upload_r").val("");
	const reader = new FileReader();
	reader.onload = onFileReadRecord;
	reader.readAsText(file);
};
var icClick = function() {
	console.log("Attempting chromosome import...");
	const files = ($("#upload_c")[0] as HTMLInputElement).files;
	if (files.length > 0) {
		console.log("Upload successful.");
	}
	else {
		console.log("Upload canceled.");
	}
	console.log("Attempting to read file...");

	const file = files[0];
	$("#upload_c").val("");
	const reader = new FileReader();
	reader.onload = onFileReadChromosome;
	reader.readAsText(file);
};

//---------------------------------------------------------------------------------------------------------
// SIMULATOR SECTION
//---------------------------------------------------------------------------------------------------------

var Order = function(typeStr, chromosome) {
	this.type = typeStr;
	this.chromosome = chromosome;
};
class Simulator {
	public data: any[];
	public money: any[];
	public minimum: number;

	constructor() {
		this.data = [];
		this.money = [];
		this.minimum = 100;		// absolute lowest bailout
	}

	public evalMutations() {
		const self = this;
		chrome.storage.local.get(["characters_v1", "chromosomes_v1"], async function(results) {
			let matches = [];
			chrome.runtime.sendMessage({ query: "getMatchRecords" }, function(queryResult: MatchRecord[]) {
				matches = queryResult;

				if (matches.length === 0) {
					console.log("No matches have been recorded yet.");
					return;
				}

				const data = [];
				const correct = [];
				const totalBettedOn = [];
				const strategies: Strategy[] = [];
				const totalPercentCorrect = [];
				self.money = [];
				const updater = new Updater();

				// create orders from string passed in
				const orders = [];
				// queue up the entire last batch of chromosomes
				const chromosomes = results.chromosomes_v1;
				if (chromosomes) {
					for (const cIt of chromosomes) {
						const c = new Chromosome();
						orders.push(new Order("cs", c.loadFromObject(cIt)));
					}
				} else {
					const msg = "Pool not initialized.";
					($("#msgbox")[0] as HTMLInputElement).value = msg;
					throw msg;
				}

				// process orders for strategy creation
				for (const order of orders) {
					let strategy: Strategy;
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
					self.money.push(0);
				}

				const characterRecords = [];
				const namesOfCharactersWhoAlreadyHaveRecords = [];

				// process matches

				for (const match of matches) {
					const info = {
						character1: updater.getCharacter(match.c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
						character2: updater.getCharacter(match.c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
						matches,
					};

					const predictions = [];
					for (const strategy of strategies) {
						//reset abstain every time
						strategy.abstain = false;
						predictions.push(strategy.execute(info));
					}

					const actualWinner = (match.w === 0) ? match.c1 : match.c2;

					// now update characters
					updater.updateCharactersFromMatch(match, info.character1, info.character2);

					// check results
					if (strategies.length !== predictions.length) {
						throw new Error("Strategies and predictions are not the same length.");
					}
					for (let k = 0; k < strategies.length; k++) {
						const prediction = predictions[k];
						const strategy = strategies[k];
						const predictionWasCorrect = prediction === actualWinner;
						if (!strategy.abstain) {
							correct[k] += (predictionWasCorrect) ? 1 : 0;

							totalBettedOn[k] += 1;
							totalPercentCorrect[k] = correct[k] / totalBettedOn[k] * 100;
							data[k].push([totalBettedOn[k], totalPercentCorrect[k]]);
						}
						//update simulated money
						if (match.o !== "U") {
							strategy.adjustLevel(10000);
							const betAmount = self.getBetAmount(strategy, k);
							// the 20,000 limit is to compensate for the fact that I haven't been recording the money of the matches -- that amount wouldn't swing the odds
							/*if (betAmount > 20000)	// edit, would preserving some aspect of the rolling magnitude be better?
							 betAmount = 20000;*/
							self.updateMoney(k, match.o, prediction === match.c1 ? 0 : 1, betAmount, predictionWasCorrect);
						}
					}
				}

				//go through totalPercentCorrect, weed out the top 10, breed them, save them
				const sortingArray = [];
				const parents: Chromosome[] = [];
				const nextGeneration: Chromosome[] = [];
				const money = true;
				const accuracy = true;
				const unshackle = true;
				const weightAccToMoney = 0.75; //1 - 1/100000000000;			// valid range (0,1), enabled if accuracy & money are. 50% would be the original method. Also good for evening the magnitude between them.

				for (let l = 0; l < orders.length; l++) {
					let penalty = 1;
					if (!unshackle) {
						penalty = self.applyPenalties(orders[l].chromosome);
					}
					sortingArray.push([orders[l].chromosome, totalPercentCorrect[l], self.money[l], penalty]);
				}
				//	sort the the best in order.
				sortingArray.sort(function(a, b) {
					if (!money && accuracy) {
						return (b[1] * b[3]) - (a[1] * a[3]);
					}
					else if (money && !accuracy) {
						return (b[2] * b[3]) - (a[2] * a[3]);
					}
					else {
						return (((weightAccToMoney * b[1]) + ((1 - weightAccToMoney) * b[2])) * b[3]) - (((weightAccToMoney * a[1]) + ((1 - weightAccToMoney) * a[2])) * a[3]);
					}
				});

				if (sortingArray.length > 1) {
					//add 10 best to next generation
					for (let o = 0; o < 10; o++) {
						parents.push(sortingArray[o][0]);
						//ranking guarantees that we send the best one
						sortingArray[o][0].rank = o + 1;
						nextGeneration.push(sortingArray[o][0]);
					}

					//add 10 mutations of best chromosome to next generation
					for (let o = 0; o < 10; o++) {
						nextGeneration.push(parents[0].mate(parents[0]));
					}

					// created and push children of that half of best sorted population
					for (var mf = 0; mf < 10; mf++) {
						var parent1 = null;
						var parent2 = null;
						var child = null;
						if (mf === 0) {
							parent1 = parents[0];
							parent2 = parents[parents.length - 1];
						} else if (mf <= 4) {
							parent1 = parents[0];
							parent2 = parents[mf];
						} else {
							parent1 = parents[mf - 1];
							parent2 = parents[mf];
						}
						child = parent1.mate(parent2);
						nextGeneration.push(child);
					}

					//add 10 random ones
					for (let o = 0; o < 10; o++) {
						nextGeneration.push(new Chromosome().randomize());
					}
				}
				else {
					//no other chromosomes are found, create the rest randomly
					nextGeneration.push(sortingArray[0][0]);

					while (nextGeneration.length < 40) {
						nextGeneration.push(new Chromosome().randomize());
					}
				}

				// i really only need to see the best one
				console.log(sortingArray[0][0].toDisplayString() + " -> " + sortingArray[0][1].toFixed(4) + "%,  $" + parseInt(sortingArray[0][2], 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));

				let bestPercent;
				let bestMoney;
				bestPercent = sortingArray[0][1];
				bestMoney = sortingArray[0][2];

				chrome.storage.local.set({
					best_chromosome: sortingArray[0][0],
					chromosomes_v1: nextGeneration,
				}, function() {
					roundsOfEvolution += 1;
					console.log("\n\n-------- end of gen" + nextGeneration.length + "  " + roundsOfEvolution + ", m proc'd w/ CS "
						+ totalBettedOn[0] + "/" + matches.length + "=" + (totalBettedOn[0] / matches.length * 100).toFixed(2) + "%m -> "
						+ bestPercent.toFixed(1) + "%c, $" + parseInt(sortingArray[0][2], 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "   -----------------\n\n");
					($("#msgbox")[0] as HTMLInputElement).value = "g(" + roundsOfEvolution + "), best: " + bestPercent.toFixed(1) + "%, $" + bestMoney.toFixed(0);
					setTimeout(function() {
						simulator.evalMutations();
					}, 5000);
				});
			});
		});
	}

	public initializePool() {
		const populationSize = 32;	// too small, it cannot expanded solve space; too large, not only runtime increases, weights differences between best/worst become dominate.
		const shortPopulationSize = 16;
		const pool: Chromosome[] = [];
		while (pool.length < populationSize) {
			pool.push(new Chromosome().randomize());
		}
		const newPool = [];
		for (let i = 0; i < pool.length; i++) {

			if (i % 1 === 0) {
				console.log(":: " + i + "\n" + pool[i].toDisplayString());
			}
			newPool.push(pool[i]);
		}
		chrome.storage.local.set({
			chromosomes_v1: newPool,
		}, function() {
			($("#msgbox")[0] as HTMLInputElement).value = "initial pool population complete";
		});
	}

	private updateMoney(index, odds, selection, amount, correct) {
		const oddsArr = odds.split(":");
		if (!correct) {
			this.money[index] -= amount;
		} else {
			if (selection === 0) {
				this.money[index] += amount * Number(oddsArr[1]) / Number(oddsArr[0]);
			}
			else if (selection === 1) {
				this.money[index] += amount * Number(oddsArr[0]) / Number(oddsArr[1]);
			}
		}
	}

	private getBetAmount(strategy: Strategy, index) {
		var amountToBet;
		const tournament = false;
		const debug = true;
		const balance = 10000;

		if (!strategy.confidence) {
			amountToBet = Math.ceil(balance * .1);
		}
		else {
			amountToBet = strategy.getBetAmount(balance, tournament, debug);
		}

		return amountToBet;
	}

	// currently unsupported with the time weights splitting.
	private applyPenalties(c) {
		//###
		console.log("called: applyPenalties. Is undefined.");
		return 1;
		//###
		// anti-domination

		//var adOdds = c.timeWeight + c.winPercentageWeight + c.crowdFavorWeight + c.illumFavorWeight;
		//var adTime = c.oddsWeight + c.winPercentageWeight + c.crowdFavorWeight + c.illumFavorWeight;
		//var adWPer = c.oddsWeight + c.timeWeight + c.crowdFavorWeight + c.illumFavorWeight;
		//var adCFW = c.oddsWeight + c.timeWeight + c.winPercentageWeight + c.illumFavorWeight;
		//var adIFW = c.oddsWeight + c.timeWeight + c.winPercentageWeight + c.crowdFavorWeight;
		//if (c.oddsWeight > adOdds || c.timeWeight > adTime || c.winPercentageWeight > adWPer || c.crowdFavorWeight > adCFW || c.illumFavorWeight > adIFW)
		//	return 0.05;
		//return 1;
	}
}

const simulator = new Simulator();
let roundsOfEvolution = 0;

document.addEventListener("DOMContentLoaded", function() {
	chrome.storage.local.get("settings_v1", function(result) {
		if (result.settings_v1) {
			($("#tl")[0] as HTMLInputElement).checked = result.settings_v1.limit_enabled || false;
			($("#limit")[0] as HTMLInputElement).value = result.settings_v1.limit || 10000;
			($("#ta")[0] as HTMLInputElement).checked = result.settings_v1.talimit_enabled || false;
			($("#talimit")[0] as HTMLInputElement).value = result.settings_v1.talimit || 10000;
			($("#tm")[0] as HTMLInputElement).checked = result.settings_v1.tmlimit_enabled || false;
			($("#tmlimit")[0] as HTMLInputElement).value = result.settings_v1.tmlimit || 10000;
			($("#multiplierField")[0] as HTMLInputElement).value = result.settings_v1.multiplier || 1;
			($("#multiplierSlider")[0] as HTMLInputElement).value = result.settings_v1.multiplier || 1;

			setButtonActive("#cs_" + result.settings_v1.nextStrategy);
		}
	});

	$("#ber")[0].addEventListener("click", erClick);
	$("#upload_r")[0].addEventListener("change", irClick);
	$("#bec")[0].addEventListener("click", ecClick);
	$("#upload_c")[0].addEventListener("change", icClick);
	$("#ugw")[0].addEventListener("click", function() {
		simulator.evalMutations();
	});
	$("#rgw")[0].addEventListener("click", function() {
		simulator.initializePool();
	});
	$("#tv")[0].addEventListener("click", tvClick);
	$("#ta")[0].addEventListener("change", taChange);
	$("#talimit").bind("keyup input", taChange);
	$("#tm")[0].addEventListener("change", tmChange);
	$("#tmlimit").bind("keyup input", tmChange);
	$("#cs_o")[0].addEventListener("click", changeStrategyClickO);
	$("#cs_cs")[0].addEventListener("click", changeStrategyClickCS);
	$("#cs_rc")[0].addEventListener("click", changeStrategyClickRC);
	$("#cs_ipu")[0].addEventListener("click", changeStrategyClickIPU);
	$("#tl")[0].addEventListener("change", limitChange);
	$("#limit").bind("keyup input", limitChange);
	const multiplierSlider = $("#multiplierSlider");
	multiplierSlider.bind("change", multiplierChange);
	multiplierSlider.bind("input", function() {
		($("#multiplierField")[0] as HTMLInputElement).value = ($("#multiplierSlider")[0] as HTMLInputElement).value;
	});

	chrome.alarms.create("chromosome update", {
		delayInMinutes: 0.1,
		periodInMinutes: 1.0,
	});

});
