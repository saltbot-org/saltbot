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

document.addEventListener('DOMContentLoaded', function() {
	document.getElementById("bdr").addEventListener("click", drClick);
	document.getElementById("bpr").addEventListener("click", prClick);
	document.getElementById("ber").addEventListener("click", erClick);
	document.getElementById("bir").addEventListener("change", irClick);
	document.getElementById("bsc").addEventListener("click", function() {
		chrome.storage.local.get(["matches_v1", "characters_v1"], function(results) {
			var dataCT = [];
			var dataMW = [];
			var dataMWC = [];
			var matches = results.matches_v1;
			var correct = [0, 0, 0];
			var totalBettedOn = [0, 0, 0];
			for (var i = 0; i < matches.length; i++) {
				var percentCorrect;
				
				switch(matches[i].sn) {
				case "ct":
					correct[0] += (matches[i].pw == "t") ? 1 : 0;
					totalBettedOn[0] += 1;
					percentCorrect = correct[0] / totalBettedOn[0] * 100;
					dataCT.push([totalBettedOn[0], percentCorrect, "red"]);
					break;
				case "mw":
					correct[1] += (matches[i].pw == "t") ? 1 : 0;
					totalBettedOn[1] += 1;
					percentCorrect = correct[1] / totalBettedOn[1] * 100;
					dataMW.push([totalBettedOn[1], percentCorrect, "purple"]);
					break;
				case "mwc":
					if (matches[i].pw == "a")
					continue;correct[2] += (matches[i].pw == "t") ? 1 : 0;
					totalBettedOn[2] += 1;
					percentCorrect = correct[2] / totalBettedOn[2] * 100;
					dataMWC.push([totalBettedOn[2], percentCorrect, "blue"]);
					break;
				}
			}
			// Create the Scatter chart.
			var scatter = new RGraph.Scatter({

				id : 'cvs',
				data : [dataCT, dataMW, dataMWC],

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
		});

	});
});
