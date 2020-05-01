import { Settings } from "./salty";
import { Bettor, Character } from "./records";

function btnClicked(clicktype: string, data: number | boolean | string = null): void {
	chrome.tabs.query({
		active: true,
		currentWindow: true,
	}, function() {
		chrome.runtime.sendMessage({
			text: data,
			type: clicktype,
		}, function(response) {
			console.debug(response);
		});
	});
}
function elementChanged(changetype: string, data: number | boolean | string): void {
	btnClicked(changetype, data);
}

function dr(sortByMoney: boolean): void {
	const rankingElement = document.querySelector("#ranking");
	rankingElement.innerHTML = "Loading...";
	chrome.storage.local.get(["characters_v1", "bettors_v1"], function(results: { bettors_v1: Bettor[]; characters_v1: Character[] }) {
		const bw10: Bettor[] = [];
		const accTypeI: number[] = [];
		const accTypeC: number[] = [];
		for (const a of results.bettors_v1) {
			const aTotal = a.wins + a.losses;
			a.accuracy = a.wins / aTotal * 100;
			if (aTotal >= 100) {
				a.total = aTotal;
				bw10.push(a);
			}

			if (a.type === "i") {
				accTypeI.push(a.accuracy);
			}
			else if (a.type === "c") {
				accTypeC.push(a.accuracy);
			}
		}

		bw10.sort(function(a, b) {
			if (sortByMoney) {
				return (b.accuracy * b.total) - (a.accuracy * a.total);
			}
			return (b.accuracy) - (a.accuracy);
		});
		let blist = "";
		for (let j = 0; j < bw10.length; j++) {
			const b = bw10[j];
			blist += b.accuracy.toFixed(2) + " %acc " +
				" (" + ((1 - (j / bw10.length)) * 100).toFixed(2) + "%pcl) :" +
				" (" + b.type + ")(" + b.total + ") " + b.name + "\n";
		}

		const sumOfArray = (previous: number, current: number): number => previous + current;
		const iSum = accTypeI.reduce(sumOfArray);
		const cSum = accTypeC.reduce(sumOfArray);

		document.querySelector<HTMLElement>("#details-ranking").style.display = "block";

		//fill ranking div with text
		rankingElement.innerHTML = ("Avg I: " + (iSum / accTypeI.length).toFixed(2) + "% (" + accTypeI.length + ")\n");
		rankingElement.innerHTML += ("Avg C: " + (cSum / accTypeC.length).toFixed(2) + "% (" + accTypeC.length + ")\n");
		rankingElement.innerHTML += blist;
		rankingElement.innerHTML = rankingElement.innerHTML.split("\n").join("<br />");
	});
}

function drClick(): void {
	dr(false);
	//btnClicked("dr");
}
function prClick(): void {
	dr(true);
	//btnClicked("pr");
}

function teChange(): void {
	elementChanged("te", document.querySelector<HTMLInputElement>("#te").checked);
}

function aitChange(): void {
	elementChanged("ait", document.querySelector<HTMLInputElement>("#ait").checked);
}

function tLimitChange(): void {
	const tLimit = +document.querySelector<HTMLInputElement>("#tourney-limit").value;

	if (tLimit < 1000) {
		return;
	}

	elementChanged("tourney_limit_" + ((document.querySelector<HTMLInputElement>("#ctl").checked) ? "enable" : "disable"), tLimit);
}

function keepAliveChange(): void {
	elementChanged("keepAlive", document.querySelector<HTMLInputElement>("#toggleKeepAlive").checked);
}

function upsetBettingChange(): void {
	const upsetLimit = +document.querySelector<HTMLInputElement>("#limitUpsetBetting").value;
	const upsetEnabled = document.querySelector<HTMLInputElement>("#checkUpsetBetting").checked;
	elementChanged("upset_betting_" + (upsetEnabled ? "enable" : "disable"), upsetLimit);
}

document.addEventListener("DOMContentLoaded", function() {
	chrome.storage.local.get(["settings_v1"], function(results: { settings_v1: Settings }) {
		document.querySelector<HTMLInputElement>("#te").checked = results.settings_v1.betOnExhibitions;
		document.querySelector<HTMLInputElement>("#ait").checked = results.settings_v1.allInTourney;
		document.querySelector<HTMLInputElement>("#ctl").checked = results.settings_v1.tourneyLimit_enabled;
		document.querySelector<HTMLInputElement>("#tourney-limit").value = String(results.settings_v1.tourneyLimit);
		document.querySelector<HTMLInputElement>("#toggleKeepAlive").checked = results.settings_v1.keepAlive;
		document.querySelector<HTMLInputElement>("#checkUpsetBetting").checked = results.settings_v1.upsetBetting_enabled;
		document.querySelector<HTMLInputElement>("#limitUpsetBetting").value = String(results.settings_v1.upsetBetting_limit);
	});

	document.querySelector("#bdr").addEventListener("click", drClick);
	document.querySelector("#bpr").addEventListener("click", prClick);
	document.querySelector("#te").addEventListener("change", teChange);
	document.querySelector("#ait").addEventListener("change", aitChange);

	document.querySelector("#toggleKeepAlive").addEventListener("change", keepAliveChange);

	//tourney limit listeners
	document.querySelector("#ctl").addEventListener("change", tLimitChange);
	document.querySelector("#tourney-limit").addEventListener("keyup", tLimitChange);
	document.querySelector("#tourney-limit").addEventListener("input", tLimitChange);

	//upset betting listeners
	document.querySelector("#checkUpsetBetting").addEventListener("change", upsetBettingChange);
	document.querySelector("#limitUpsetBetting").addEventListener("keyup", upsetBettingChange);
	document.querySelector("#limitUpsetBetting").addEventListener("input", upsetBettingChange);
});
