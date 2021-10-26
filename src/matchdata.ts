import type { MatchRecord } from "./records";
jQuery.extend((jQuery.fn as any).dataTableExt.oSort, {
	"odds-pre"(odds: string) {
		odds = odds.replace(" ", "");

		if (!odds) {
			return 0;
		}

		const oddsSplit: string[] = odds.split(":");
		return Number(Number(oddsSplit[0]) / Number(oddsSplit[1]));
	},

	"odds-asc"(a: number, b: number) {
		return ((a < b) ? -1 : ((a > b) ? 1 : 0));
	},

	"odds-desc"(a: number, b: number) {
		return ((a < b) ? 1 : ((a > b) ? -1 : 0));
	}
});

const loadMatches = function(): void {
	let matches: MatchRecord[] = [];
	chrome.runtime.sendMessage({ query: "getMatchRecords" }, function(data: MatchRecord[]) {
		matches = data;

		if (matches) {
			const matchesMirrored = $.extend(true, [], matches);
			matchesMirrored.forEach(function(element: MatchRecord) {
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

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		($.fn.dataTable as any).moment("DD-MM-YYYY");
		$("#matches").DataTable({
			columnDefs: [
				{ type: "odds", targets: 7 },
				{ type: "moment-DD-MM-YYYY", targets: 11 },
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
			createdRow(row, data) {
				// eslint-disable-next-line
				$("td", row).eq((data as any).w).addClass("highlight");
			},
			data: matches,
			deferRender: true,
			lengthMenu: [15, 25, 50, 100],
			initComplete() {
				$("#loading").hide();
			},
		});
	});
};

loadMatches();