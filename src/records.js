var Character = function(name) {
	this.name = name;
	this.wins = [];
	this.losses = [];
	this.winTimes = [];
	this.lossTimes = [];
	this.odds = [];
};

var Updater = function() {

};
Updater.prototype.updateCharactersFromMatch = function(mObj, c1Obj, c2Obj) {
	// alters mutable character records only
	if (mObj.w == 0) {
		c1Obj.wins.push(mObj.t);
		c2Obj.losses.push(mObj.t);
		if (mObj.ts != 0) {
			c1Obj.winTimes.push(mObj.ts);
			c2Obj.lossTimes.push(mObj.ts);
		}
	} else if (mObj.w == 1) {
		c2Obj.wins.push(mObj.t);
		c1Obj.losses.push(mObj.t);
		if (mObj.ts != 0) {
			c2Obj.winTimes.push(mObj.ts);
			c1Obj.lossTimes.push(mObj.ts);
		}
	}
	if (mObj.o != null && mObj.o != "U") {
		var oc1 = parseFloat(mObj.o.split(":")[0]);
		var oc2 = parseFloat(mObj.o.split(":")[1]);
		c1Obj.odds.push(parseFloat((oc1 / oc2).toFixed(2)));
		c2Obj.odds.push(parseFloat((oc2 / oc1).toFixed(2)));
	}
};

var dr = function() {
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
				console.log(character.name + "\t\t\t\twins: " + character.wins.length + ",\t\t\t\tlosses: " + character.losses.length);
			}
		}

	});
};

var pr = function() {
	chrome.storage.local.get(["matches_v1", "characters_v1"], function(results) {
		console.log("-\nrecord verification stuff deleted...");
	});
};

var er = function() {
	chrome.storage.local.get(["matches_v1"], function(results) {
		var lines = [];
		for (var i = 0; i < results.matches_v1.length; i++) {
			var match = results.matches_v1[i];

			var record = match.c1 + "," + match.c2 + "," + match.w + "," + match.sn + "," + match.pw + ",";
			record += (match.hasOwnProperty("t")) ? match.t : "U";
			record += ",";
			record += (match.hasOwnProperty("m")) ? match.m : "U";
			record += ",";
			record += (match.hasOwnProperty("o")) ? match.o : "U";
			record += ",";
			record += (match.hasOwnProperty("ts")) ? match.ts : 0;
			record += "\n";
			lines.push(record);
		}

		var time = new Date();
		var blob = new Blob(lines, {
			type : "text/plain;charset=utf-8"
		});
		saveAs(blob, "saltyRecords--" + time.getFullYear() + "-" + time.getMonth() + "-" + time.getDate() + "-" + time.getHours() + "." + time.getMinutes() + ".txt");
	});
};

var ir = function(f) {
	var updater = new Updater();
	var matchRecords = [];
	var characterRecords = [];
	var namesOfCharactersWhoAlreadyHaveRecords = [];
	var getCharacter = function(cname) {
		var cobject = null;
		if (namesOfCharactersWhoAlreadyHaveRecords.indexOf(cname) == -1) {
			cobject = new Character(cname);
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
	//numberOfProperties refers to c1, c2, w, sn, etc.
	var numberOfProperties = 9;
	var mObj = null;
	var lines = f.split("\n");
	for (var i = 0; i < lines.length; i++) {
		var match = lines[i].split(",");

		for (var j = 0; j < match.length; j++) {
			switch(j % numberOfProperties) {
			case 0:
				mObj = {};
				mObj.c1 = match[j];
				break;
			case 1:
				mObj.c2 = match[j];
				break;
			case 2:
				mObj.w = parseInt(match[j]);
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
				mObj.ts = parseInt(match[j]);
				matchRecords.push(mObj);
				var c1Obj = getCharacter(mObj.c1);
				var c2Obj = getCharacter(mObj.c2);
				updater.updateCharactersFromMatch(mObj, c1Obj, c2Obj);

				break;
			}
		}
	}
	var nmr = matchRecords.length;
	var ncr = characterRecords.length;
	//All records have been rebuilt, so update them
	chrome.storage.local.set({
		'matches_v1' : matchRecords,
		'characters_v1' : characterRecords
	}, function() {
		console.log("-\nrecords imported:\n" + nmr + " match records\n" + ncr + " character records");
	});
};

if (window.location.href == "http://www.saltybet.com/")
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		switch(request.type) {
		case "dr":
			dr();
			break;
		case "pr":
			pr();
			break;
		case "er":
			er();
			break;
		case "ir":
			ir(request.text);
			break;
		case "cs_o":
			ctrl.changeStrategy(request.type);
			break;
		case "cs_rc":
			ctrl.changeStrategy(request.type);
			break;
		case "cs_cs":
			ctrl.changeStrategy(request.type, request.text);
			break;
		}
	});

