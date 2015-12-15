'use strict';

angular.module('bilirubinApp.services', []).factory('$risk', function () {
	return {
		highRiskLowerLimit: function(hours) {
			return 0.0000000001087380116978890 * Math.pow(hours, 6)
				- 0.0000000390241213926723000 * Math.pow(hours, 5)
		        + 0.0000051614113948939000000 * Math.pow(hours, 4)
		        - 0.0002969267656958150000000 * Math.pow(hours, 3)
		        + 0.0049045801308693600000000 * Math.pow(hours, 2)
		        + 0.2770830724994080000000000 * hours + 3.0000000000000000000000000;
		},
		highIntermediateLowerLimit: function(hours) {
        	return 0.0000000001117640940944670 * Math.pow(hours, 6)
				- 0.0000000412521674888165000 * Math.pow(hours, 5)
	            + 0.0000056604841945917500000 * Math.pow(hours, 4)
	            - 0.0003464807831541350000000 * Math.pow(hours, 3)
	            + 0.0075934710390583900000000 * Math.pow(hours, 2)
	            + 0.1810763744197170000000000 * hours + 2.5000000000000000000000000;
        },
        lowIntermediateLowerLimit: function(hours) {
        	return 0.0000000000055158434836619 * Math.pow(hours, 6) -
    			0.0000000020974548879410700 * Math.pow(hours, 5) +
    			0.0000002627978699654140000 * Math.pow(hours, 4) -
    			0.0000054294662703569000000 * Math.pow(hours, 3) -
    			0.0018169823503626500000000 * Math.pow(hours, 2) +
    			0.2329924996556660000000000 * hours + 2.0000000000000000000000000;

    	}
    };
});