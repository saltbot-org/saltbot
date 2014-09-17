debugRecords = false;
if (debugRecords) {
	chrome.storage.local.get(["matches_v1", "characters_v1"], function(results) {
		console.log("-\ndebugging records...");
		//match records:
		if (results.hasOwnProperty("matches_v1")) {
			console.log("-\nmatch records found\nnumber of match records: " + results.matches_v1.length);
			for (var i = 0; i < results.matches_v1.length; i++) {
				var match = results.matches_v1[i];
				console.log("-\nc1name: " + match.c1);
			}

		}
		//character records:
		if (results.hasOwnProperty("characters_v1")) {
			console.log("-\ncharacter records found\nnumber of character records: " + results.character_v1.length);
			for (var i = 0; i < results.character_v1.length; i++) {
				var character = results.character_v1[i];
				console.log("-\nc1name: " + character.name);
			}
		}

	});
}
