import { saveAs } from 'file-saver';
import * as moment from 'moment';

import type { Settings } from "./settings";
import { Bettor, Character, displayDialogMessage, MatchRecord, Updater } from "./records";
import { Chromosome } from "./strategy";
import { Globals } from './globals';

$(function() {
	document.querySelector<HTMLElement>("#bic").onclick = function(): void {
		document.querySelector<HTMLElement>("#upload_c").click();
	};
	document.querySelector<HTMLElement>("#bir").onclick = function(): void {
		document.querySelector<HTMLElement>("#upload_r").click();
	};
});

function prepareJQueryDialog(): void {
	let dialogTimer: NodeJS.Timer = null;

	$("#dialog").dialog({
		autoOpen: false,
		title: "Saltbot Notification",
		open() {
			if (dialogTimer !== null) {
				clearTimeout(dialogTimer);
			}

			const dia = $(this);
			dialogTimer = setTimeout(function() {
				dia.dialog("close");
			}, 5000);
		},
	});
}

function btnClicked(clicktype: string, data: number | boolean | string | ArrayBuffer = null): void {
	chrome.runtime.sendMessage({
		text: data,
		type: clicktype,
	}, function(response) {
		console.debug(response);
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
			blist += `${b.accuracy.toFixed(2)} %acc (${((1 - (j / bw10.length)) * 100).toFixed(2)}%pcl) : (${b.type}) (${b.total}) ${b.name}\n`;
		}

		const sumOfArray = (previous: number, current: number): number => previous + current;
		const iSum = accTypeI.reduce(sumOfArray);
		const cSum = accTypeC.reduce(sumOfArray);

		document.querySelector<HTMLElement>("#details-ranking").style.display = "block";

		//fill ranking div with text
		rankingElement.innerHTML = `Avg I: ${(iSum / accTypeI.length).toFixed(2)}% (${accTypeI.length})\n`;
		rankingElement.innerHTML += `Avg C: ${(cSum / accTypeC.length).toFixed(2)}% (${accTypeC.length})\n`;
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

function irClick(): void {
	console.log("Attempting records import...");
	const files = document.querySelector<HTMLInputElement>("#upload_r").files;
	if (files.length > 0) {
		console.log("Upload successful.");
	}
	else {
		console.log("Upload canceled.");
	}
	console.log("Attempting to read file...");

	const file = files[0];
	document.querySelector<HTMLInputElement>("#upload_r").value = "";
	const reader = new FileReader();
	reader.onload = onFileReadRecord;
	reader.readAsText(file);
}

function icClick(): void {
	console.log("Attempting chromosome import...");
	const files = document.querySelector<HTMLInputElement>("#upload_c").files;
	if (files.length > 0) {
		console.log("Upload successful.");
	}
	else {
		console.log("Upload canceled.");
	}
	console.log("Attempting to read file...");

	const file = files[0];
	document.querySelector<HTMLInputElement>("#upload_c").value = "";
	const reader = new FileReader();
	reader.onload = onFileReadChromosome;
	reader.readAsText(file);
}

function erClick(): void {
	er();
}

function ecClick(): void {
	ec();
}

function onFileReadRecord(e: ProgressEvent<FileReader>): void {
	console.log("File read successful.");
	const t = e.target.result;
	ir(t as string);
}
function onFileReadChromosome(e: ProgressEvent<FileReader>): void {
	console.log("File read successful.");
	const t = e.target.result;
	ic(t as string);
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

	document.querySelector("#ber").addEventListener("click", erClick);
	document.querySelector("#upload_r").addEventListener("change", irClick);
	document.querySelector("#bec").addEventListener("click", ecClick);
	document.querySelector("#upload_c").addEventListener("change", icClick);

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

	prepareJQueryDialog();
});

function er(): void {
	const lines: string[] = [];
	let matches: MatchRecord[] = [];
	chrome.runtime.sendMessage({ query: "getMatchRecords" }, function(data: MatchRecord[]) {
		matches = data;

		for (const match of matches) {
			let record = `${match.c1},${match.c2},${match.w},${match.sn},${match.pw},`;
			record += (match.hasOwnProperty("t")) ? match.t : "U";
			record += ",";
			record += (match.hasOwnProperty("m")) ? match.m : "U";
			record += ",";
			record += (match.hasOwnProperty("o")) ? match.o : "U";
			record += ",";
			record += (match.hasOwnProperty("ts")) ? match.ts : 0;
			record += ",";
			record += (match.hasOwnProperty("cf")) ? match.cf : 2;
			record += ",";
			record += (match.hasOwnProperty("if")) ? match.if : 2;
			record += ",";
			record += (match.hasOwnProperty("dt")) ? match.dt : moment().format("DD-MM-YYYY");
			record += "\n";
			lines.push(record);
		}

		const blobM = new Blob(lines, {
			type: "text/plain;charset=utf-8",
		});
		const timeStr = moment().format("YYYY-MM-DD-HH.mm");
		saveAs(blobM, "saltyRecordsM--" + timeStr + ".txt");
	});
}

function ir(f: string): void {
	const updater = new Updater();
	const matchRecords = [];
	const characterRecords: Character[] = [];
	const namesOfCharactersWhoAlreadyHaveRecords: string[] = [];

	//numberOfProperties refers to c1, c2, w, sn, etc.
	const numberOfProperties = 12;
	let mObj: MatchRecord = null;
	const lines = f.split("\n");
	for (const line of lines) {
		line.replace("\r", "");
		const match = line.split(",");

		for (let j = 0; j < match.length; j++) {
			switch (j % numberOfProperties) {
				case 0:
					mObj = new MatchRecord();
					mObj.c1 = match[j];
					break;
				case 1:
					mObj.c2 = match[j];
					break;
				case 2:
					mObj.w = +match[j];
					break;
				case 3:
					mObj.sn = match[j];
					break;
				case 4:
					mObj.pw = match[j];
					break;
				case 5:
					mObj.t = match[j];
					break;
				case 6:
					mObj.m = match[j];
					break;
				case 7:
					mObj.o = match[j];
					break;
				case 8:
					mObj.ts = +match[j];
					break;
				case 9:
					mObj.cf = +match[j];
					break;
				case 10:
					mObj.if = +match[j];
					break;
				case 11: {
					//trim to get rid of linebreaks at the end
					mObj.dt = match[j].trim();
					matchRecords.push(mObj);
					const c1Obj = updater.getCharacter(mObj.c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
					const c2Obj = updater.getCharacter(mObj.c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
					updater.updateCharactersFromMatch(mObj, c1Obj, c2Obj);
					break;
				}
			}
		}
	}
	const nmr = matchRecords.length;
	const ncr = characterRecords.length;
	//All records have been rebuilt, so update them

	chrome.runtime.sendMessage({ data: matchRecords, query: "setMatchRecords" });
	chrome.storage.local.set({
		characters_v1: characterRecords,
	}, function() {
		const recordsImportedMsg = `Records imported: \n${nmr} match records\n${ncr} character records`;
		console.log("-\n" + recordsImportedMsg);
		displayDialogMessage(recordsImportedMsg);
		Globals.dirtyRecords = true;
	});
}

function ec(): void {
	chrome.storage.local.get(["chromosomes_v1"], function(results: {chromosomes_v1: Chromosome[]}) {
		if (results.chromosomes_v1 && results.chromosomes_v1.length > 0) {
			let chromosome = new Chromosome();
			chromosome = chromosome.loadFromObject(results.chromosomes_v1[0]);
			const lines = JSON.stringify(chromosome, null, "\t").split("\n");
			for (let i = 0; i < lines.length; ++i) {
				lines[i] += "\n";
			}

			const blobM = new Blob(lines, {
				type: "text/plain;charset=utf-8",
			});
			const timeStr = moment().format("YYYY-MM-DD-HH.mm");
			saveAs(blobM, "chromosome--" + timeStr + ".txt");
		}
		else {
			console.log("- No chromosomes found.");
		}
	});
}

function ic(jsonString: string): void {
	const chromosome = new Chromosome();
	try {
		chromosome.loadFromJSON(jsonString);
	}
	catch (err) {
		console.log("- Could not read chromosome file.");
		return;
	}

	//get the chromosomes currently saved in the list
	chrome.storage.local.get(["chromosomes_v1"], function(results: {chromosomes_v1: Chromosome[]}) {
		let chromosomes = results.chromosomes_v1;
		if (chromosomes) {
			chromosomes[0] = chromosome;
		}
		else {
			chromosomes = [chromosome];
		}
		chrome.storage.local.set({
			chromosomes_v1: chromosomes,
		}, function() {
			console.log("- Chromosome imported successfully.");
			displayDialogMessage("Chromosome imported successfully.");
		});
	});
}
