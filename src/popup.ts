import * as tko from 'tko';
import type { Observable } from 'tko';

import { displayDialogMessage } from './records';
import { MatchRecord, Updater, Character } from './records';
import { Strategy, Lunatic, CoinToss, Chromosome, Scientist, Cowboy } from './strategy';
import { Settings } from './settings';

//enable links
$(function() {
	$("body").on("click", "a", function() {
		chrome.tabs.create({ url: $(this).attr("href") });
		return false;
	});
});

function btnClicked(clicktype: string, data: number | boolean | string | ArrayBuffer = null): void {
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
}

function elementChanged(changetype: string, data: number | boolean | string): void {
	btnClicked(changetype, data);
}

class ViewModel extends Settings {
	tvClick(): void {
		btnClicked("tv");
	}

	taChange(): void {
		const talimit = document.querySelector<HTMLInputElement>("#talimit").value;
		elementChanged("talimit_" + (document.querySelector<HTMLInputElement>("#ta").checked ? "enable" : "disable"), talimit);
	}

	tmChange(): void {
		const tmlimit = document.querySelector<HTMLInputElement>("#tmlimit").value;
		elementChanged("maximumBetAmount_" + (document.querySelector<HTMLInputElement>("#tm").checked ? "enable" : "disable"), tmlimit);
	}

	limitChange(): void {
		const limit = +document.querySelector<HTMLInputElement>("#limit").value;
		if (!limit) {
			return;
		}

		if (limit < 1000) {
			return;
		}

		elementChanged("limit_" + ((document.querySelector<HTMLInputElement>("#tl").checked) ? "enable" : "disable"), limit);
	}


	multiplierChange(): void {
		const multiplierValue = document.querySelector<HTMLInputElement>("#multiplierSlider").value;
		//eslint-disable-next-line @typescript-eslint/no-unsafe-call
		(this.multiplier as Observable)(Number(multiplierValue));
		elementChanged("multiplier", multiplierValue);
	}

	setButtonActive(identifier: string): void {
		document.querySelector("#cs_o").classList.remove("active");
		document.querySelector("#cs_rc").classList.remove("active");
		document.querySelector("#cs_cs").classList.remove("active");
		document.querySelector("#cs_ipu").classList.remove("active");

		$(identifier).addClass("active");
	}


	changeStrategyClickO(): void {
		btnClicked("cs_o");
		this.setButtonActive("#cs_o");
	}

	changeStrategyClickCS(): void {
		chrome.storage.local.get(["chromosomes_v1"], results => {
			console.log(results);
			if (Object.keys(results).length === 0) {
				displayDialogMessage("Cannot change mode to Scientist without initializing chromosome pool\nPlease click 'Reset Pool'");
			} else {
				const data = JSON.stringify(results.chromosomes_v1[0]);
				btnClicked("cs_cs", data);
				this.setButtonActive("#cs_cs");
			}
		});
	}

	changeStrategyClickRC(): void {
		btnClicked("cs_rc");
		this.setButtonActive("#cs_rc");
	}

	changeStrategyClickIPU(): void {
		btnClicked("cs_ipu");
		this.setButtonActive("#cs_ipu");
	}

	updateGeneticWeightsClick(): void {
		simulator.evalMutations();
	}

	resetPoolClick(): void {
		simulator.initializePool();
	}
}

//---------------------------------------------------------------------------------------------------------
// SIMULATOR SECTION
//---------------------------------------------------------------------------------------------------------
class Order {
	type: string;
	chromosome: Chromosome;

	constructor(typeStr: string, chromosome: Chromosome) {
		this.type = typeStr;
		this.chromosome = chromosome;
	}
}
class Simulator {
	private roundsOfEvolution = 0;
	money: number[] = [];
	minimum = 100; // absolute lowest bailout

	public evalMutations(): void {
		chrome.storage.local.get(["characters_v1", "chromosomes_v1"], (results: { "characters_v1": Character[]; "chromosomes_v1": Chromosome[] }) => {
			let matches: MatchRecord[] = [];
			chrome.runtime.sendMessage({ query: "getMatchRecords" }, (queryResult: MatchRecord[]) => {
				matches = queryResult;

				if (matches.length === 0) {
					console.log("No matches have been recorded yet.");
					return;
				}

				const data: [ number, number ][] = [];
				const correct = [];
				const totalBettedOn: number[] = [];
				const strategies: Strategy[] = [];
				const totalPercentCorrect: number[] = [];
				this.money = [];
				const updater = new Updater();

				// create orders from string passed in
				const orders: Order[] = [];
				// queue up the entire last batch of chromosomes
				const chromosomes = results.chromosomes_v1;
				if (chromosomes) {
					for (const cIt of chromosomes) {
						const c = new Chromosome();
						orders.push(new Order("cs", c.loadFromObject(cIt)));
					}
				} else {
					const msg = "Pool not initialized.";
					document.querySelector<HTMLInputElement>("#msgbox").value = msg;
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
							strategy = new Scientist(order.chromosome);
							break;
						case "rc":
							strategy = new Cowboy();
							break;
						case "ipu":
							strategy = new Lunatic();
							break;
					}
					strategy.debug = false;

					data.push([0, 0]);
					correct.push(0);
					totalBettedOn.push(0);
					strategies.push(strategy);
					totalPercentCorrect.push(0);
					this.money.push(0);
				}

				const characterRecords: Character[] = [];
				const namesOfCharactersWhoAlreadyHaveRecords: string[] = [];

				// process matches

				for (const match of matches) {
					const info = {
						character1: updater.getCharacter(match.c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
						character2: updater.getCharacter(match.c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
						matches,
					};

					const predictions: string[] = [];
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
							//eslint-disable-next-line
							data[k] = [totalBettedOn[k], totalPercentCorrect[k]];
						}
						//update simulated money
						if (match.o !== "U") {
							strategy.adjustLevel(10000);
							const betAmount = this.getBetAmount(strategy);
							// the 20,000 limit is to compensate for the fact that I haven't been recording the money of the matches -- that amount wouldn't swing the odds
							/*if (betAmount > 20000)	// edit, would preserving some aspect of the rolling magnitude be better?
							 betAmount = 20000;*/
							this.updateMoney(k, match.o, prediction === match.c1 ? 0 : 1, betAmount, predictionWasCorrect);
						}
					}
				}

				//go through totalPercentCorrect, weed out the top 10, breed them, save them
				const sortingArray: [Chromosome, number, number, number][] = [];
				const parents: Chromosome[] = [];
				const nextGeneration: Chromosome[] = [];
				const money = true;
				const accuracy = true;
				const unshackle = true;
				const weightAccToMoney = 0.75; //1 - 1/100000000000;			// valid range (0,1), enabled if accuracy & money are. 50% would be the original method. Also good for evening the magnitude between them.

				for (let l = 0; l < orders.length; l++) {
					let penalty = 1;
					if (!unshackle) {
						penalty = this.applyPenalties(orders[l].chromosome);
					}
					sortingArray.push([orders[l].chromosome, totalPercentCorrect[l], this.money[l], penalty]);
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
					for (let mf = 0; mf < 10; mf++) {
						let parent1: Chromosome = null;
						let parent2: Chromosome = null;
						let child: Chromosome = null;
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
				console.log(sortingArray[0][0].toDisplayString() + " -> " + sortingArray[0][1].toFixed(4) + "%,  $" + sortingArray[0][2].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));

				const bestPercent: number = sortingArray[0][1];
				const bestMoney: number = sortingArray[0][2];

				chrome.storage.local.set({
					best_chromosome: sortingArray[0][0],
					chromosomes_v1: nextGeneration,
				}, () => {
					this.roundsOfEvolution += 1;
					console.log(`\n\n-------- end of gen${nextGeneration.length}  ${this.roundsOfEvolution}, m proc'd w/ CS `
							+ `${totalBettedOn[0]}/${matches.length}=${(totalBettedOn[0] / matches.length * 100).toFixed(2)}%m -> `
							+ `${bestPercent.toFixed(1)}%c, $${sortingArray[0].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}   -----------------\n\n`);
					document.querySelector<HTMLInputElement>("#msgbox").value = `g(${this.roundsOfEvolution}), best: ${bestPercent.toFixed(1)}%, $${bestMoney.toFixed(0)}`;
					setTimeout(() => {
						this.evalMutations();
					}, 5000);
				});
			});
		});
	}

	public initializePool(): void {
		const populationSize = 32;	// too small, it cannot expanded solve space; too large, not only runtime increases, weights differences between best/worst become dominate.
		//const shortPopulationSize = 16;
		const pool: Chromosome[] = [];
		while (pool.length < populationSize) {
			pool.push(new Chromosome().randomize());
		}
		const newPool = [];
		for (let i = 0; i < pool.length; i++) {

			if (i % 1 === 0) {
				console.log(`:: ${i}\n${pool[i].toDisplayString()}`);
			}
			newPool.push(pool[i]);
		}
		chrome.storage.local.set({
			chromosomes_v1: newPool,
		}, function() {
			const msgBox: HTMLInputElement = document.querySelector("#msgbox");
			msgBox.value = "initial pool population complete";
		});
	}

	private updateMoney(index: number, odds: string, selection: number, amount: number, correct: boolean): void {
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

	private getBetAmount(strategy: Strategy): number {
		let amountToBet;
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
	private applyPenalties(_c: Chromosome): number {
		//###
		console.log("called: applyPenalties. Is undefined.");
		return 1;
		//###
		// anti-domination

		//let adOdds = c.timeWeight + c.winPercentageWeight + c.crowdFavorWeight + c.illumFavorWeight;
		//let adTime = c.oddsWeight + c.winPercentageWeight + c.crowdFavorWeight + c.illumFavorWeight;
		//let adWPer = c.oddsWeight + c.timeWeight + c.crowdFavorWeight + c.illumFavorWeight;
		//let adCFW = c.oddsWeight + c.timeWeight + c.winPercentageWeight + c.illumFavorWeight;
		//let adIFW = c.oddsWeight + c.timeWeight + c.winPercentageWeight + c.crowdFavorWeight;
		//if (c.oddsWeight > adOdds || c.timeWeight > adTime || c.winPercentageWeight > adWPer || c.crowdFavorWeight > adCFW || c.illumFavorWeight > adIFW)
		//	return 0.05;
		//return 1;
	}
}

const simulator = new Simulator();
const settings: ViewModel = new ViewModel();

document.addEventListener("DOMContentLoaded", function() {
	chrome.storage.local.get("settings_v1", function(result: { settings_v1: Settings }) {
		if (result.settings_v1) {
			for (const prop in result.settings_v1) {
				if (settings.hasOwnProperty(prop)) {
					// eslint-disable-next-line
					settings[prop] = tko.observable(result.settings_v1[prop]);
				}
			}
			
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			tko.applyBindings(settings);
			settings.setButtonActive("#cs_" + result.settings_v1.nextStrategy);
		}
	});

	chrome.alarms.create("chromosome update", {
		delayInMinutes: 0.1,
		periodInMinutes: 1.0,
	});

});
