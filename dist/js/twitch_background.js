var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getMatchRecords() {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield idb.open("saltbot", 1);
        const tx = yield db.transaction("matches", "readonly");
        const store = tx.objectStore("matches");
        const matches = yield store.getAll();
        return matches;
    });
}
function setMatchRecords(matches) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield idb.open("saltbot", 1);
        const tx = yield db.transaction("matches", "readwrite");
        const store = tx.objectStore("matches");
        if (matches) {
            yield store.clear();
            for (const match of matches) {
                yield store.put(match);
            }
        }
    });
}
function addMatchRecord(match) {
    const open = indexedDB.open("saltbot", 1);
    open.onsuccess = function () {
        const db = open.result;
        const tx = db.transaction("matches", "readwrite");
        const store = tx.objectStore("matches");
        store.put(match);
    };
}
let reimportMatches = function () {
    const open = indexedDB.open("saltbot", 1);
    const updateCharacters = function (matches) {
        const updater = new Updater();
        const characterRecords = [];
        const namesOfCharactersWhoAlreadyHaveRecords = [];
        for (const match of matches) {
            const c1Obj = updater.getCharacter(match.c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
            const c2Obj = updater.getCharacter(match.c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords);
            updater.updateCharactersFromMatch(match, c1Obj, c2Obj);
        }
        const nmr = matches.length;
        const ncr = characterRecords.length;
        chrome.storage.local.set({
            characters_v1: characterRecords,
        }, function () {
            console.log("-\nrecords reimported:\n" + nmr + " match records\n" + ncr + " character records");
        });
    };
    open.onupgradeneeded = function () {
        const db = open.result;
        var store = db.createObjectStore("matches", { autoIncrement: true });
        chrome.storage.local.get(["matches_v1"], function (results) {
            if (results.matches_v1) {
                const tx = db.transaction("matches", "readwrite");
                store = tx.objectStore("matches");
                for (const match of results.matches_v1) {
                    store.put(match);
                }
                tx.oncomplete = function () {
                    db.close();
                    updateCharacters(results.matches_v1);
                };
            }
        });
    };
    open.onsuccess = function () {
        const db = open.result;
        const tx = db.transaction("matches", "readonly");
        const store = tx.objectStore("matches");
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = function () {
            updateCharacters(getAllRequest.result);
        };
    };
};
chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        //do nothing
    });
    reimportMatches();
});
//letiable used so the tabs aren't closed and reopened multiple times
let restartedSaltyBet = false;
function setRestarted() {
    //set restarted to true and then to false in 5 seconds
    //this is done to ensure that multiple messages in a short amount of time do not create multiple tabs
    restartedSaltyBet = true;
    setTimeout(function () {
        restartedSaltyBet = false;
    }, 5000);
}
chrome.runtime.onMessage.addListener(function (details, sender, sendResponse) {
    if (details.message !== undefined) {
        handleWaifuMessage(details);
    }
    else if (details.getTwitch !== undefined) {
        checkForTwitchTab();
    }
    else if (details.browserAction !== undefined) {
        chrome.pageAction.show(sender.tab.id);
    }
    else if (details.type !== undefined) {
        chrome.tabs.query({
            title: "Salty Bet",
            url: "*://*.saltybet.com/",
        }, function (result) {
            // result is an array of tab.Tabs
            for (const tab of result) {
                chrome.tabs.sendMessage(tab.id, details);
            }
        });
    }
    else if (details.query !== undefined) {
        if (details.query === "getMatchRecords") {
            getMatchRecords().then(sendResponse);
            return true;
        }
        else if (details.query === "setMatchRecords" && details.data) {
            setMatchRecords(details.data);
        }
        else if (details.query === "addMatchRecord" && details.data) {
            addMatchRecord(details.data);
        }
    }
});
let sendUpdatedChromosome = function () {
    chrome.storage.local.get(["chromosomes_v1"], function (results) {
        if (results.chromosomes_v1) {
            for (const i in results.chromosomes_v1) {
                if (!results.chromosomes_v1[i].rank) {
                    results.chromosomes_v1[i].rank = 100;
                }
            }
            results.chromosomes_v1.sort(function (a, b) {
                return a.rank - b.rank;
            });
            const data = JSON.stringify(results.chromosomes_v1[0]);
            chrome.tabs.query({
                title: "Salty Bet",
                url: "*://*.saltybet.com/",
            }, function (result) {
                if (result.length > 0) {
                    chrome.tabs.sendMessage(result[0].id, {
                        text: data,
                        type: "suc",
                    });
                }
            });
        }
    });
};
chrome.alarms.onAlarm.addListener(function (alarm) {
    sendUpdatedChromosome();
});
function checkForTwitchTab() {
    chrome.tabs.query({ url: "*://www.twitch.tv/saltybet/chat" }, function (result) {
        if (result.length === 0) {
            //no twitch tab found
            chrome.tabs.create({
                url: "http://www.twitch.tv/saltybet/chat",
            }, function (tab) {
                console.log("The new tab has the url '" + tab.url + "'");
            });
            chrome.tabs.query({}, function (r) {
                const urls = r.map(function (t) {
                    return t.url;
                });
                console.log(urls);
            });
        }
    });
}
function handleWaifuMessage(details) {
    let queryResult = null;
    //Receive message from Waifu, pass it on to salty tab
    chrome.tabs.query({
        title: "Salty Bet",
        url: "*://*.saltybet.com/",
    }, function (result) {
        queryResult = result;
        chrome.storage.local.get(["settings_v1"], function (storedObjects) {
            if (result.length === 0 && storedObjects.settings_v1.keepAlive && !restartedSaltyBet) {
                chrome.tabs.create({
                    url: "http://www.saltybet.com",
                });
                setRestarted();
            }
            else {
                for (let i = 0; i < queryResult.length; i++) {
                    chrome.tabs.sendMessage(queryResult[i].id, details.message, function (response) {
                        if (storedObjects.settings_v1.keepAlive && !restartedSaltyBet &&
                            chrome.runtime.lastError !== undefined &&
                            chrome.runtime.lastError.message === "Could not establish connection. Receiving end does not exist.") {
                            //an error happened while sending the message to the tab, create a new tab
                            chrome.runtime.lastError = undefined;
                            //close saltybet tabs
                            //can't use queryResult[i] because sendMessage is asynchronous
                            for (let j = 0; j < queryResult.length; ++j) {
                                chrome.tabs.remove(queryResult[j].id, function () {
                                    //do nothing
                                });
                            }
                            chrome.tabs.create({
                                url: "http://www.saltybet.com",
                            });
                            setRestarted();
                        }
                    });
                }
            }
        });
    });
}
//To reload
//chrome.tabs.reload(myTabs[i].id)
// or if that doesn't work
//chrome.tabs.executeScript(myTabs[i].id, {code:"document.location.reload(true);"});
