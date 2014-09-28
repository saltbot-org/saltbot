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
			var dataRB = [];
			var matches = results.matches_v1;
			var correct = [0, 0, 0, 0];
			var totalBettedOn = [0, 0, 0, 0];
			//A single instance of each strategy will work just fine
			var ct = new CoinToss();
			ct.debug = false;
			var mw = new MoreWins();
			mw.debug = false;
			var mwc = new MoreWinsCautious();
			mwc.debug = false;
			var rb = new RatioBasic();
			rb.debug = false;
			var ctChecked = document.getElementById("ct").checked;
			var mwChecked = document.getElementById("mw").checked;
			var mwcChecked = document.getElementById("mwc").checked;
			var rbChecked = document.getElementById("rb").checked;
			var ctTotalPercentCorrect=0;
			var mwTotalPercentCorrect=0;
			var mwcTotalPercentCorrect=0;
			var rbTotalPercentCorrect=0;
			// setup for the graph
			var arrayOfArrays = [];
			if (ctChecked)
				arrayOfArrays.push(dataCT);
			if (mwChecked)
				arrayOfArrays.push(dataMW);
			if (mwcChecked)
				arrayOfArrays.push(dataMWC);
			if (rbChecked)
				arrayOfArrays.push(dataRB);

			// this is copied from records.js, do something about that
			var characterRecords = [];
			var namesOfCharactersWhoAlreadyHaveRecords = [];
			var getCharacter = function(cname) {
				var cobject = null;
				if (namesOfCharactersWhoAlreadyHaveRecords.indexOf(cname) == -1) {
					cobject = {
						"name" : cname,
						"wins" : [],
						"losses" : []
					};
					characterRecords.push(cobject);
					namesOfCharactersWhoAlreadyHaveRecords.push(cname);
				} else {
					for (var k = 0; k < characterRecords.length; k++) {
						if (cname == characterRecords[k].name) {
							cobject = characterRecords[k];
						}
					}
				}
				return cobject;
			};

			// process matches
			for (var i = 0; i < matches.length; i++) {
				var info = {
					"character1" : getCharacter(matches[i].c1),
					"character2" : getCharacter(matches[i].c2)
				};

				mwc.abstain = false;
				rb.abstain = false;
				var actualWinner = (matches[i].w == 0) ? matches[i].c1 : matches[i].c2;

				var ctp = null;
				var mwp = null;
				var mwcp = null;
				var rbp = null;
				if (ctChecked)
					ctp = ct.execute(info);
				if (mwChecked)
					mwp = mw.execute(info);
				if (mwcChecked)
					mwcp = mwc.execute(info);
				if (rbChecked)
					rbp = rb.execute(info);

				// now update characters
				if (matches[i].w == 0) {
					info.character1.wins.push(matches[i].t);
					info.character2.losses.push(matches[i].t);
				} else if (matches[i].w == 1) {
					info.character2.wins.push(matches[i].t);
					info.character1.losses.push(matches[i].t);
				}

				

				// coin toss
				if (ctChecked) {
					correct[0] += (ctp == actualWinner) ? 1 : 0;
					totalBettedOn[0] += 1;
					ctTotalPercentCorrect = correct[0] / totalBettedOn[0] * 100;
					dataCT.push([totalBettedOn[0], ctTotalPercentCorrect, "red"]);
				}
				// more wins
				if (mwChecked) {
					correct[1] += (mwp == actualWinner) ? 1 : 0;
					totalBettedOn[1] += 1;
					mwTotalPercentCorrect = correct[1] / totalBettedOn[1] * 100;
					dataMW.push([totalBettedOn[1], mwTotalPercentCorrect, "purple"]);
				}
				// more wins  cautious
				if (mwcChecked) {
					if (!mwc.abstain) {
						correct[2] += (mwcp == actualWinner) ? 1 : 0;
						totalBettedOn[2] += 1;
						mwcTotalPercentCorrect = correct[2] / totalBettedOn[2] * 100;
						dataMWC.push([totalBettedOn[2], mwcTotalPercentCorrect, "blue"]);
					}
				}
				// ratio basic
				if (rbChecked) {
					if (!rb.abstain) {
						correct[3] += (rbp == actualWinner) ? 1 : 0;
						totalBettedOn[3] += 1;
						rbTotalPercentCorrect = correct[3] / totalBettedOn[3] * 100;
						dataMWC.push([totalBettedOn[3], rbTotalPercentCorrect, "green"]);
					}
				}
			}
			console.log("ct: "+ctTotalPercentCorrect);
			console.log("mw: "+mwTotalPercentCorrect);
			console.log("mwc: "+mwcTotalPercentCorrect);
			console.log("rb: "+rbTotalPercentCorrect);
			// Create the Scatter chart.
			var scatter = new RGraph.Scatter({

				id : 'cvs',
				data : [dataCT, dataMW, dataMWC, dataRB],
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
