var dr=function () {
	chrome.storage.local.get(["matches_v1", "characters_v1"], function(results) {
		console.log("-\ndebugging records...");

		
		//match records:
		if (results.hasOwnProperty("matches_v1")) {
			console.log("-\nmatch records found\nnumber of match records: " + results.matches_v1.length + "-\n");
			for (var i = 0; i < results.matches_v1.length; i++) {
				var match = results.matches_v1[i];
				console.log("match results: " + match.c1 + " vs " + match.c2 + " ... winner: " + match.w);
			}

		}
		//character records:
		if (results.hasOwnProperty("characters_v1")) {
			console.log("-\ncharacter records found\nnumber of character records: " + results.characters_v1.length + "-\n");
			for (var i = 0; i < results.characters_v1.length; i++) {
				var character = results.characters_v1[i];
				console.log(character.name+"\t\t\t\twins: "+character.wins+",\t\t\t\tlosses: "+character.losses);
			}
		}

	});
};

function pr() {
	chrome.storage.local.get(["matches_v1", "characters_v1"], function(results) {
		console.log("-\npurifying records...");
		var potentialDuplicates = [];
		if (results.hasOwnProperty("matches_v1") && results.hasOwnProperty("characters_v1")) {
			console.log("-\ndetecting potential duplicate matches");

			for (var i = 0; i < results.matches_v1.length; i++) {
				var match = results.matches_v1[i];
				var isPotentialDuplicate = 0;
				for (var j = 0; j < results.matches_v1.length; j++) {
					var matchd = results.matches_v1[j];
					if (match.c1 == matchd.c1 && match.c2 == matchd.c2) {
						isPotentialDuplicate += 1;
					}
				}
				if (isPotentialDuplicate == 2) {
					var duplicateAlreadydetected = false;
					for (var k = 0; k < potentialDuplicates.length; k++) {
						var matchd = potentialDuplicates[k];

						if (match.c1 == matchd.c1 && match.c2 == matchd.c2) {
							duplicateAlreadydetected = true;
						}

					}
					if (!duplicateAlreadydetected) {
						potentialDuplicates.push(match);
						console.log("potential duplicate match: " + match.c1 + " vs " + match.c2 + " ... winner: " + match.w);
					}
				}

			}
			//character records:
			var characters = results.characters_v1;
			for (var ii = 0; ii < potentialDuplicates.length; ii++) {
				// check wins of characters involved
				var pdmatch = potentialDuplicates[ii];
				var c1Object = null;
				var c2Object = null;
				for (var j = 0; j < characters.length; j++) {
					if (characters[j].name == pdmatch.c1) {
						c1Object = characters[j];
					}
					if (characters[j].name == pdmatch.c2) {
						c2Object = characters[j];
					}
				}
				// now get total wins and losses of involved characters
				var c1totalWins=0;
				var c1totalLosses=0;
				var c2totalWins=0;
				var c2totalLosses=0;
				console.log("-\ninvestigating match: " + pdmatch.c1 + " vs " + pdmatch.c2 + " ... winner: " + pdmatch.w);
				console.log("-\nprocessing...");
				for (var k = 0; k < results.matches_v1.length; k++) {
					var match = results.matches_v1[k];
					
					if (match.w == c1Object.name) {
						c1totalWins+=1;
						c2totalLosses+=1;
						console.log("-\n in match"+k+": " + match.c1 + " vs " + match.c2 + " ... winner: " + match.w);
					}
					if (match.w == c2Object.name) {
						c2totalWins+=1;
						c1totalLosses+=1;
						console.log("-\n in match"+k+": " + match.c1 + " vs " + match.c2 + " ... winner: " + match.w);
					}
					
				}
				console.log("-\nprocessing complete");
				console.log("mr: "+pdmatch.c1+" has "+c1totalWins+" wins, "+c1totalLosses+" losses; cr: "+c1Object.wins+" wins, "+c1Object.losses+" losses");
				console.log("mr: "+pdmatch.c2+" has "+c2totalWins+" wins, "+c2totalLosses+" losses; cr: "+c2Object.wins+" wins, "+c2Object.losses+" losses");
			}
		}

	});
}

var debugRecords = true;
var purifyRecords = false;
if (purifyRecords) {
	pr();
}
if (debugRecords) {
	dr();
}

