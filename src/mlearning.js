var Node = function(object) {
	for (var key in object) {
		this.key = object[key];
	}
};

var NodeList = function(k) {
	this.nodes = [];
	this.k = k;
};
NodeList.prototype.add=function (node){
	this.nodes.push(node);
};

