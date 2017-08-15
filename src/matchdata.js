jQuery.extend(jQuery.fn.dataTableExt.oSort, {
	"odds-pre": function (odds) {
		odds = odds.replace(" ", "");

		if (!odds) {
			return 0;
		}

		var odds_split = odds.split(":");
		return Number(odds_split[0] / odds_split[1]);
	},

	"odds-asc": function (a, b) {
		return ((a < b) ? -1 : ((a > b) ? 1 : 0));
	},

	"odds-desc": function (a, b) {
		return ((a < b) ? 1 : ((a > b) ? -1 : 0));
	}
});

chrome.storage.local.get("matches_v1", function (result) {
	var matches = [];

	if (result.matches_v1) {
		var matches = result.matches_v1;
		var matchesMirrored = $.extend(true, [], matches);
		matchesMirrored.forEach(function (element, index, array) {
			//switch characters around
			var temp = element.c1;
			element.c1 = element.c2;
			element.c2 = temp;

			//invert winner, crowd favor and illum favor
			element.w = 1 - element.w;
			element.cf = element.cf < 2 ? 1 - element.cf : 2;
			element.if = element.if < 2 ? 1 - element.if : 2;

			//invert the odds
			element.o = element.o.split(":").reverse().join(":");
		});

		matches = matches.concat(matchesMirrored);
	}

	$('#matches').DataTable({
		data: matches,
		columns: [
			{"data": "c1", title: "Character 1"},
			{"data": "c2", title: "Character 2"},
			{"data": "w", title: "Winner"},
			{"data": "sn", title: "Strategy"},
			{"data": "pw", title: "Prediction"},
			{"data": "t", title: "Tier"},
			{"data": "m", title: "Mode"},
			{"data": "o", title: "Odds"},
			{"data": "ts", title: "Time"},
			{"data": "cf", title: "Crowd favor"},
			{"data": "if", title: "Illum favor"},
			{"data": "dt", title: "Date"}
		],
		columnDefs: [
			{type: 'date-eu', targets: 11},
			{type: 'odds', targets: 7},
			{searchable: false, targets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
		],
		lengthMenu: [15, 25, 50, 100],
		initComplete: function (settings, json) {
			$("#loading").hide();
		},
		createdRow: function (row, data, index) {
			$('td', row).eq(data.w).addClass('highlight');
		},
		deferRender: true,
	});
});