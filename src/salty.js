function Controller(){
	var bettingAvailable=false;
	var bettingEntered=false;
	var bettingComplete=true;
	
	var debugMode=false;
	
	var btn10=document.getElementById("interval1");
	var btn20=document.getElementById("interval2");
	var btn30=document.getElementById("interval3");
	var btn40=document.getElementById("interval4");
	var btn50=document.getElementById("interval5");
	var btn60=document.getElementById("interval6");
	var btn70=document.getElementById("interval7");
	var btn80=document.getElementById("interval8");
	var btn90=document.getElementById("interval9");
	var btn100=document.getElementById("interval10");
	
	var btnRed=document.getElementById("player1");
	var btnBlue=document.getElementById("player2");
	
	var baseSeconds = 2000;
	
	setInterval(function (){
		var bettingTable=document.getElementsByClassName("dynamic-view")[0];
		var styleObj = window.getComputedStyle(bettingTable, null);
		var active=styleObj.display!="none";
		
		if (active && bettingComplete==true){
			bettingAvailable=true;
			bettingEntered=false;
			bettingComplete=false;
		}
		
		if (bettingAvailable && !bettingEntered){
			
			if (Math.random()>.1){//skip 10% of matches
				setTimeout(function (){
						btn10.click();					
					}, Math.floor(Math.random()* baseSeconds ));
					
				var selectedButton=(Math.random()>.5)?btnRed:btnBlue;
				
				setTimeout(function (){
						selectedButton.click();					
					}, (Math.floor(Math.random()* baseSeconds*2 )+baseSeconds));
			}
			bettingEntered=true;
		}
		
		if (!active && bettingEntered){
			bettingComplete=true;
			bettingAvailable=false;			
		}
		
		if (debugMode){
			console.log("-");
			console.log("active: "+active);
			console.log("available: "+bettingAvailable);
			console.log("entered: "+bettingEntered);
			console.log("complete: "+bettingComplete);
		}
		
	}, 3000);
	
}

c=Controller();
