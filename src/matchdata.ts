jQuery.extend((jQuery.fn as any).dataTableExt.oSort, {
	"odds-pre"(odds) {
		odds = odds.replace(" ", "");

		if (!odds) {
			return 0;
		}

		const oddsSplit = odds.split(":");
		return Number(oddsSplit[0] / oddsSplit[1]);
	},

	"odds-asc"(a, b) {
		return ((a < b) ? -1 : ((a > b) ? 1 : 0));
	},

	"odds-desc"(a, b) {
		return ((a < b) ? 1 : ((a > b) ? -1 : 0));
	},
});

const loadMatches = async function() {
	let matches = [];
	await chrome.runtime.sendMessage({ query: "getMatchRecords" }, function(data: MatchRecord[]) {
		matches = data;
	});

	if (matches) {
		const matchesMirrored = $.extend(true, [], matches);
		matchesMirrored.forEach(function(element, index, array) {
			//switch characters around
			const temp = element.c1;
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

	$("#matches").DataTable({
		columnDefs: [
			{ type: "date-eu", targets: 11 },
			{ type: "odds", targets: 7 },
			{ searchable: false, targets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
		],
		columns: [
			{ data: "c1", title: "Character 1" },
			{ data: "c2", title: "Character 2" },
			{ data: "w", title: "Winner" },
			{ data: "sn", title: "Strategy" },
			{ data: "pw", title: "Prediction" },
			{ data: "t", title: "Tier" },
			{ data: "m", title: "Mode" },
			{ data: "o", title: "Odds" },
			{ data: "ts", title: "Time" },
			{ data: "cf", title: "Crowd favor" },
			{ data: "if", title: "Illum favor" },
			{ data: "dt", title: "Date" },
		],
		createdRow(row, data, index) {
			$("td", row).eq((data as any).w).addClass("highlight");
		},
		data: matches,
		deferRender: true,
		lengthMenu: [15, 25, 50, 100],
		initComplete(settings, json) {
			$("#loading").hide();
		},
	});
};

loadMatches();