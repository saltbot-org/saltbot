var dirtyRecords = true;

var Bettor = function (name) {
	this.name = name;
	this.wins = 0;
	this.losses = 0;
	this.type = "U";
};

var Character = function (name) {
	this.name = name;
	this.wins = [];
	this.losses = [];
	this.winTimes = [];
	this.lossTimes = [];
	this.odds = [];
	this.crowdFavor = [];
	this.illumFavor = [];
	this.tiers = [];
	this.totalFights = [];
};

var Updater = function () {

};
Updater.prototype.getCharAvgOdds = function (c) {
	var o = 0;
	var i;
	for (i = 0; i < c.odds.length; i++)
		o += c.odds[i];
	i = (i > 0) ? i : 1;
	return o / i;
};
Updater.prototype.getCharacter = function (cname, characterRecords, namesOfCharactersWhoAlreadyHaveRecords) {
	var cobject = null;
	if (namesOfCharactersWhoAlreadyHaveRecords.indexOf(cname) == -1) {
		cobject = new Character(cname);
		characterRecords.push(cobject);
		namesOfCharactersWhoAlreadyHaveRecords.push(cname);
	} else {
		for (var k = 0; k < characterRecords.length; k++) {
			if (cname == characterRecords[k].name) {
				cobject = characterRecords[k];
				break;
			}
		}
	}
	return cobject;
};
Updater.prototype.getBettor = function (bname, bettorRecords, namesOfBettorsWhoAlreadyHaveRecords) {
	var bobject = null;
	if (namesOfBettorsWhoAlreadyHaveRecords.indexOf(bname) == -1) {
		bobject = new Bettor(bname);
		bettorRecords.push(bobject);
		namesOfBettorsWhoAlreadyHaveRecords.push(bname);
	} else {
		for (var k = 0; k < bettorRecords.length; k++) {
			if (bname == bettorRecords[k].name) {
				bobject = bettorRecords[k];
				break;
			}
		}
	}
	return bobject;
};
Updater.prototype.updateBettorsFromMatch = function (mObj, bc1, bc2) {
	var c1Won = (mObj.w == 0);
	for (var i = 0; i < bc1.length; i++) {
		if (c1Won)
			bc1[i].wins += 1;
		else
			bc1[i].losses += 1;
	}
	for (var j = 0; j < bc2.length; j++) {
		if (!c1Won)
			bc2[j].wins += 1;
		else
			bc2[j].losses += 1;
	}
};
Updater.prototype.updateCharactersFromMatch = function (mObj, c1Obj, c2Obj) {
    var rememberRecordsLast = 22;  // changing this requires re-importing matches.
	// wins, losses, and times
	if (mObj.w == 0) {
		c1Obj.wins.push(mObj.t);
		c2Obj.losses.push(mObj.t);
		c1Obj.winTimes.push(mObj.ts);
		c2Obj.lossTimes.push(mObj.ts);

		c1Obj.totalFights.push(1);
		c2Obj.totalFights.push(0);
	} else if (mObj.w == 1) {
		c2Obj.wins.push(mObj.t);
		c1Obj.losses.push(mObj.t);
		c2Obj.winTimes.push(mObj.ts);
		c1Obj.lossTimes.push(mObj.ts);

		c1Obj.totalFights.push(0);
		c2Obj.totalFights.push(1);
	}

	var limitRecordsTo = function (charObj, limit) {
		if (charObj.totalFights.length > limit) {
			if (charObj.totalFights[0] == 0) {
				charObj.losses.shift();
				charObj.lossTimes.shift();
			}

			else {
				charObj.wins.shift();
				charObj.winTimes.shift();
			}

			charObj.totalFights.shift();
			charObj.odds.shift();
			charObj.tiers.shift();

			if (charObj.crowdFavor.length > limit) {
				charObj.crowdFavor.shift();
				charObj.illumFavor.shift();
			}
		}
	};

	// this.tiers will correspond with the odds
    if (mObj.o != null && mObj.o != "U") {
        var oc1 = Number(mObj.o.split(":")[0]);
        var oc2 = Number(mObj.o.split(":")[1]);
		c1Obj.odds.push(oc1 / oc2);
		c2Obj.odds.push(oc2 / oc1);
	} else {
		c1Obj.odds.push(-1);
		c2Obj.odds.push(-1);
	}
	c1Obj.tiers.push(mObj.t);
	c2Obj.tiers.push(mObj.t);
	// expert favor is seemingly worthless but what the hell
    if (mObj.if != null || mObj.cf != null ) {
		if (mObj.cf == 0) {
			c1Obj.crowdFavor.push(1);
			c2Obj.crowdFavor.push(0);
		} else if (mObj.cf == 1) {
			c1Obj.crowdFavor.push(0);
			c2Obj.crowdFavor.push(1);
		}
		if (mObj.if == 0) {
			c1Obj.illumFavor.push(1);
			c2Obj.illumFavor.push(0);
		} else if (mObj.if == 1) {
			c1Obj.illumFavor.push(0);
			c2Obj.illumFavor.push(1);
		}
	}

    limitRecordsTo(c1Obj, rememberRecordsLast);
    limitRecordsTo(c2Obj, rememberRecordsLast);

};

var er = function () {
	chrome.storage.local.get(["matches_v1"], function (results) {
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
			record += ",";
			record += (match.hasOwnProperty("cf")) ? match.cf : 2;
			record += ",";
			record += (match.hasOwnProperty("if")) ? match.if : 2;
			record += ",";
			record += (match.hasOwnProperty("dt")) ? match.dt : new Date().toString("dd-MM-yyyy");
			record += "\n";
			lines.push(record);
		}

		var time = new Date();
		var blobM = new Blob(lines, {
			type: "text/plain;charset=utf-8"
		});
		var timeStr = "" + time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate() + "-" + time.getHours() + "." + time.getMinutes();
		saveAs(blobM, "saltyRecordsM--" + timeStr + ".txt");
	});
};

var ir = function (f) {
	var updater = new Updater();
	var matchRecords = [];
	var characterRecords = [];
	var namesOfCharactersWhoAlreadyHaveRecords = [];

	//numberOfProperties refers to c1, c2, w, sn, etc.
	var numberOfProperties = 12;
	var mObj = null;
	var lines = f.split("\n");
	for (var i = 0; i < lines.length; i++) {
		var match = lines[i].split(",");

		for (var j = 0; j < match.length; j++) {
			switch (j % numberOfProperties) {
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
					break;
				case 9:
					mObj.cf = parseInt(match[j]);
					break;
				case 10:
					mObj.if = parseInt(match[j]);
					break;
				case 11:
					mObj.dt = match[j];
					matchRecords.push(mObj);
					var c1Obj = updater.getCharacter(mObj.c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
					var c2Obj = updater.getCharacter(mObj.c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
					updater.updateCharactersFromMatch(mObj, c1Obj, c2Obj);
					break;
			}
		}
	}
	var nmr = matchRecords.length;
	var ncr = characterRecords.length;
	//All records have been rebuilt, so update them
	chrome.storage.local.set({
		'matches_v1': matchRecords,
		'characters_v1': characterRecords
	}, function () {
		console.log("-\nrecords imported:\n" + nmr + " match records\n" + ncr + " character records");
		dirtyRecords = true;
	});
};

var ec = function () {
	chrome.storage.local.get(["chromosomes_v1"], function (results) {
		if (results.chromosomes_v1 && results.chromosomes_v1.length > 0) {
			var chromosome = new Chromosome();
			chromosome = chromosome.loadFromObject(results.chromosomes_v1[0]);
			var lines = JSON.stringify(chromosome, null, "\t").split("\n");
			for (var i = 0; i < lines.length; ++i) {
				lines[i] += "\n";
			}

			var time = new Date();
			var blobM = new Blob(lines, {
				type: "text/plain;charset=utf-8"
			});
			var timeStr = "" + time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate() + "-" + time.getHours() + "." + time.getMinutes();
			saveAs(blobM, "chromosome--" + timeStr + ".txt");
		}
		else {
			console.log("- No chromosomes found.");
		}
	});
};

var ic = function (f) {
	var chromosome = new Chromosome();
	try {
		chromosome.loadFromJSON(f);
	}
	catch (err) {
		console.log("- Could not read chromosome file.");
		return;
	}

	//get the chromosomes currently saved in the list
	chrome.storage.local.get(["chromosomes_v1"], function (results) {
		var chromosomes = results.chromosomes_v1;
		if (chromosomes) {
			chromosomes[0] = chromosome;
		}
		else {
			chromosomes = [chromosome];
		}
		chrome.storage.local.set({
			'chromosomes_v1': chromosomes
		}, function () {
			console.log("- Chromosome imported successfully.");
		});
	});


};

if (window.location.href == "http://www.saltybet.com/" || window.location.href == "http://mugen.saltybet.com/" ||
	window.location.href == "https://www.saltybet.com/" || window.location.href == "https://mugen.saltybet.com/")
	chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
		switch (request.type) {
			case "er":
				er();
				break;
			case "ir":
				ir(request.text);
				break;
			case "ec":
				ec();
				break;
			case "ic":
				ic(request.text);
				break;
			case "tv":
				ctrl.toggleVideoWindow();
				break;
			case "talimit_enable":
				ctrl.setAggro(true, request.text);
				break;
			case "talimit_disable":
				ctrl.setAggro(false, request.text);
				break;
			case "te":
				ctrl.setExhibitions(request.text);
				break;
			case "ait":
				ctrl.setAllInTournament(request.text);
				break;
			case "cs_o":
				ctrl.changeStrategy(request.type);
				break;
			case "suc":
				ctrl.receiveBestChromosome(request.text);
				break;
			case "cs_ipu":
			case "cs_rc":
				ctrl.changeStrategy(request.type);
				break;
			case "cs_cs":
			case "cs_cs_warning":
				ctrl.changeStrategy(request.type, request.text);
				break;
			case "limit_enable":
				ctrl.setLimit(true, request.text);
				break;
			case "limit_disable":
				ctrl.setLimit(false, request.text);
				break;
			case "tourney_limit_enable":
				ctrl.setTourneyLimit(true, request.text);
				break;
			case "tourney_limit_disable":
				ctrl.setTourneyLimit(false, request.text);
				break;
			case "multiplier":
				ctrl.setMultiplier(request.text);
				break;
			case "keepAlive":
				ctrl.setKeepAlive(request.text);
				break;
			default:
				sendResponse({farewell: ("Request type " + request.type + " cannot be handled.")});
				break;
		}
	});