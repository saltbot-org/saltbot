# SaltBot
A betting bot for SaltyBet. It has three strategies choosable by the user. 
- ConfidenceScore: uses a genetic algorithm to weigh various data from previous matches (wins/losses, Crowd favor, match times). Bet amount based on confidence.
- RatioConfidence: compares win percentages only. Also changes betting amount based on confidence, but won't bet a large amount unless it has extreme confidence. 
- InternetPotentialUpset: flips a coin, then bets a flat amount, flat amount based on how much money it has to bet with.

Notes:
- You can see its decision logic if you open up the JavaScript console.
- Uses Chrome storage to save and load data.
- You must unzip seed.zip in order to import it. You cannot import the zip file.
