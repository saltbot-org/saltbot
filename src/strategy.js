function Strategy(strategyName) {
	var btn10 = document.getElementById("interval1");
	var btnRed = document.getElementById("player1");
	var btnBlue = document.getElementById("player2");
	var player1 = btnRed.getAttribute("name");
	var player2 = btnBlue.getAttribute("name");
	this.name = strategyName || null;
	var prediction = null;
	this.execute = function(info) {
		return null;
	};
	this.getP1Name=function (){
		return player1;		
	};
	this.getP2Name=function (){
		return player2;		
	};
	this.getP1Button=function (){
		return btnRed;		
	};
	this.getP2Button=function (){
		return btnBlue;		
	};
	this.getMinimumBetButton=function (){
		return btn10;		
	};
	this.getStrategyName=function (){
		return strategyName;	
	};
	
}

function CoinToss(btn1, btn2) {
	this.base = Strategy;
	this.base("ct");
	
	this.execute = function(info) {
		prediction=(Math.random()>.5)?player1:player2;
		return prediction;
	};
}

function MoreWins(btn1, btn2) {
	this.base = Strategy;
	this.base(player1, player2, "mw");
	this.execute = function(info) {
		return null;
	};
}

CoinToss.prototype = Strategy;
MoreWins.prototype = Strategy;
