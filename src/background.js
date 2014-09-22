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
			var data1 = [];
			var matches = results.matches_v1;
			var correct = 0;
			for (var i = 0; i < matches.length; i++) {
				var color = (matches[i].sn == "mw") ? "blue" : "red";
				correct += (matches[i].pw) ? 1 : 0;
				var numberOfMatches = i + 1;
				var percentCorrect = correct / numberOfMatches * 100;
				data1.push([numberOfMatches, percentCorrect, color]);

			}

			// The datasets as shown on the chart. Each point is an array, described below.

			// Create the Scatter chart.
			var scatter = new RGraph.Scatter({

				id : 'cvs',
				data : data1,

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
