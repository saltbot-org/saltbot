var btnClicked = function(clicktype: string, data = null) {
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
};
var elementChanged = function(changetype, data) {
	btnClicked(changetype, data);
};

let dr = function(sortByMoney) {
	const rankingElement = $("#ranking")[0];
	rankingElement.innerHTML = "Loading...";
	chrome.storage.local.get(["characters_v1", "bettors_v1"], function(results) {
		const bw10 = [];
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
		const sbm = sortByMoney;
		bw10.sort(function(a, b) {
			if (sbm) {
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

		let iSum = 0;
		for (const i of accTypeI) {
			iSum += i;
		}
		let cSum = 0;
		for (const c of accTypeC) {
			cSum += c;
		}

		$("#details-ranking")[0].style.display = "block";

		//fill ranking div with text
		rankingElement.innerHTML = blist;
		rankingElement.innerHTML += ("Avg I: " + (iSum / accTypeI.length).toFixed(2) + "% (" + accTypeI.length + ")");
		rankingElement.innerHTML += ("Avg C: " + (cSum / accTypeC.length).toFixed(2) + "% (" + accTypeC.length + ")");
		rankingElement.innerHTML = rankingElement.innerHTML.split("\n").join("<br />");
	});
};

let drClick = function() {
	dr(false);
	//btnClicked("dr");
};
let prClick = function() {
	dr(true);
	//btnClicked("pr");
};

let teChange = function() {
	elementChanged("te", ($("#te")[0] as HTMLInputElement).checked);
};

let aitChange = function() {
	elementChanged("ait", ($("#ait")[0] as HTMLInputElement).checked);
};

let tLimitChange = function(ev) {
	const tLimit = +($("#tourney-limit")[0] as HTMLInputElement).value;

	if (tLimit < 1000) {
		return;
	}

	elementChanged("tourney_limit_" + ((($("#ctl")[0] as HTMLInputElement).checked) ? "enable" : "disable"), tLimit);
};

let keepAliveChange = function() {
	elementChanged("keepAlive", ($("#toggleKeepAlive")[0] as HTMLInputElement).checked);
};

document.addEventListener("DOMContentLoaded", function() {
	chrome.storage.local.get(["settings_v1"], function(results) {
		$("#te").prop("checked", results.settings_v1.exhibitions);
		$("#ait").prop("checked", results.settings_v1.allInTourney);
		$("#ctl").prop("checked", results.settings_v1.tourneyLimit_enabled);
  ($("#tourney-limit")[0] as HTMLInputElement).value = results.settings_v1.tourneyLimit;
		$("#toggleKeepAlive").prop("checked", results.settings_v1.keepAlive);
	});

	$("#bdr")[0].addEventListener("click", drClick);
	$("#bpr")[0].addEventListener("click", prClick);
	$("#te")[0].addEventListener("change", teChange);
	$("#ait")[0].addEventListener("change", aitChange);
	$("#ctl")[0].addEventListener("change", tLimitChange);
	$("#toggleKeepAlive")[0].addEventListener("change", keepAliveChange);
	$("#tourney-limit").bind("keyup input", tLimitChange);
});
