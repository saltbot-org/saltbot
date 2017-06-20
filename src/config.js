var btnClicked = function (clicktype, data) {
	data = data || null;
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function () {
		chrome.runtime.sendMessage({
			type: clicktype,
			text: data
		}, function (response) {
			console.debug(response);
		});
	});
};
var elementChanged = function (changetype, data) {
	btnClicked(changetype, data);
};

var dr = function (sortByMoney) {
	var rankingElement = $("#ranking")[0];
	rankingElement.innerHTML = "Loading...";
	chrome.storage.local.get(["matches_v1", "characters_v1", "bettors_v1"], function (results) {
		var bw10 = [];
		var accTypeI = [];
		var accTypeC = [];
		for (var i in results.bettors_v1) {
			var a = results.bettors_v1[i];
			var aTotal = a.wins + a.losses;
			a.accuracy = a.wins / aTotal * 100;
			if (aTotal >= 100) {
				a.total = aTotal;
				bw10.push(a);
			}
			if (a.type == "i")
				accTypeI.push(a.accuracy);
			else if (a.type == "c")
				accTypeC.push(a.accuracy);
		}
		var sbm = sortByMoney;
		bw10.sort(function (a, b) {
			if (sbm)
				return (b.accuracy * b.total) - (a.accuracy * a.total);
			return (b.accuracy) - (a.accuracy);
		});
		var blist = "";
		for (var j = 0; j < bw10.length; j++) {
			var b = bw10[j];
			blist += b.accuracy.toFixed(2) + " %acc  (" + ((1 - (j / bw10.length)) * 100).toFixed(2) + "%pcl) : (" + b.type + ")(" + b.total + ") " + b.name + "\n";
		}

		var iSum = 0;
		for (var k in accTypeI)
			iSum += accTypeI[k];
		var cSum = 0;
		for (var l in accTypeC)
			cSum += accTypeC[l];

		$("#details-ranking")[0].style.display = "block";

		//fill ranking div with text
		rankingElement.innerHTML = blist;
		rankingElement.innerHTML += ("Avg I: " + (iSum / accTypeI.length).toFixed(2) + "% (" + accTypeI.length + ")");
		rankingElement.innerHTML += ("Avg C: " + (cSum / accTypeC.length).toFixed(2) + "% (" + accTypeC.length + ")");
		rankingElement.innerHTML = rankingElement.innerHTML.split("\n").join("<br />");
	});
};

var drClick = function () {
	dr(false);
	//btnClicked("dr");
};
var prClick = function () {
	dr(true);
	//btnClicked("pr");
};

var teChange = function () {
	elementChanged("te", $("#te")[0].checked);
};

var aitChange = function () {
	elementChanged("ait", $("#ait")[0].checked);
};

var tLimitChange = function (ev) {
	var tLimit = $("#tourney-limit")[0].value;

	if (!tLimit) {
		return;
	}
	if (tLimit < 1000) {
		return;
	}

	elementChanged("tourney_limit_" + (($("#ctl")[0].checked) ? "enable" : "disable"), tLimit);
};

var keepAliveChange = function () {
	elementChanged("keepAlive", $("#toggleKeepAlive")[0].checked);
}

document.addEventListener('DOMContentLoaded', function () {
	chrome.storage.local.get(["settings_v1"], function (results) {
		$("#te").prop('checked', results.settings_v1.exhibitions);
		$("#ait").prop('checked', results.settings_v1.allInTourney);
		$("#ctl").prop('checked', results.settings_v1.tourneyLimit_enabled);
		$("#tourney-limit")[0].value = results.settings_v1.tourneyLimit;
		$("#toggleKeepAlive").prop('checked', results.settings_v1.keepAlive)
	});

	$("#bdr")[0].addEventListener("click", drClick);
	$("#bpr")[0].addEventListener("click", prClick);
	$("#te")[0].addEventListener("change", teChange);
	$("#ait")[0].addEventListener("change", aitChange);
	$("#ctl")[0].addEventListener("change", tLimitChange);
	$("#toggleKeepAlive")[0].addEventListener("change", keepAliveChange);
	$("#tourney-limit").bind('keyup input', tLimitChange);
});
