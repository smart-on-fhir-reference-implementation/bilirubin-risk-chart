'use strict';

angular.module('himssApp.controllers', []).controller('himssCtrl', ['$scope', '$risk','$filter', '$http', function ($scope, $risk, $filter, $http ) {
    $scope.patient = {
        name: ''
    };
    $scope.name = '';

    $scope.hours = function (observation, dob) {
        return (new Date(observation).getTime() - new Date(dob).getTime()) / 36e5;
    };

    $scope.obsDate = moment(new Date()).format('MM/DD/YYYY hh:mm');
    $scope.obsValue = 0;
    $scope.isSaveDisabled = true;

    var newPoint = [];
    var lastPoint = [];
    var bilirubin = [];

    $scope.$watchGroup(['obsValue', 'obsDate'], function() {
        if (isNaN($scope.obsValue) || $scope.obsValue <= 0 || $scope.obsValue >= 25) {
            changeClass("obsValue", "invalid-form-control");
        } else {
            changeClass("obsValue", "form-control")
        }
        if (!validateNewDate($scope.obsDate)) {
            changeClass("obsDate", "invalid-form-control");
        } else {
            changeClass("obsDate", "form-control")
        }
        if (!isNaN($scope.obsValue) && $scope.obsValue > 0 && $scope.obsValue <= 25 && validateNewDate($scope.obsDate)) {
            $scope.isSaveDisabled = false;
            if (newPoint.length == 0 && lastPoint.length > 0)
                newPoint.push(lastPoint[0]);
            if (newPoint.length > 1)
                newPoint.pop();
            newPoint.push([$scope.hours($scope.obsDate, $scope.patient.dob), parseFloat($scope.obsValue)]);
        }
    });

    function changeClass(elementId, className)
    {
        var element = document.getElementById(elementId);
        element.className = className;
        $scope.isSaveDisabled = true;
        $scope.clearNewPoint();
    }

    $scope.risk = function (bilirubinResult, ageInHours) {
        if ((bilirubinResult > 20))
            return 'Critical Risk Zone';
        else if (bilirubinResult >= $risk.highRiskLowerLimit(ageInHours))
            return 'High Risk Zone (>95%)';
        else if (bilirubinResult >= $risk.highIntermediateLowerLimit(ageInHours))
            return 'High Intermediate Risk Zone (75-95%)';
        else if (bilirubinResult >= $risk.lowIntermediateLowerLimit(ageInHours))
            return 'Low Intermediate Risk Zone (40-74%)';
        else
            return 'Low Risk Zone (<40%)';
    };

    var criticalRiskZone = [];
    for (var int = 0; int <= 120; int++)
        criticalRiskZone.push([int, 20, 25]);
    var highRiskZone = [];
    for (var int = 0; int <= 120; int++)
        highRiskZone.push([int, $risk.highRiskLowerLimit(int), 20]);
    var highIntermediateRiskZone = [];
    for (var int = 0; int <= 120; int++)
        highIntermediateRiskZone.push([int, $risk.highIntermediateLowerLimit(int), $risk.highRiskLowerLimit(int)]);
    var lowIntermediateRiskZone = [];
    for (var int = 0; int <= 120; int++)
        lowIntermediateRiskZone.push([int, $risk.lowIntermediateLowerLimit(int), $risk.highIntermediateLowerLimit(int)]);
    var lowRiskZone = [];
    for (var int = 0; int <= 120; int++)
        lowRiskZone.push([int, 0, $risk.lowIntermediateLowerLimit(int)]);

    // using jQuery
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function validateNewDate(date) {
        var newDate = new Date(date);
        if ( isNaN(newDate.getTime()))
            return false;

        var ageHours = $scope.hours(newDate, $scope.patient.dob);
        return (0 <= ageHours && ageHours <=120)
    }

    $scope.clearNewPoint = function() {
        while (newPoint.length > 0) {
            newPoint.pop();
        }
    };

    $scope.setDefaults = function() {
        $scope.obsDate = moment(new Date()).format('MM/DD/YYYY hh:mm');
        $scope.obsValue = 0;
    }

    $scope.saveObs = function(obsDate, obsValue) {

        if (!validateNewDate(obsDate, $scope.patient.dob))
         return;

        var newObs = formatObservation('{ \
            "resourceType" : "Observation",\
            "code" :\
            {\
                "coding" :\
                    [\
                        {\
                            "system" : "http://loinc.org",\
                            "code" : "58941-6",\
                            "display" : "Transcutaneous Bilirubin"\
                        }\
                    ]\
            },\
            "valueQuantity" :\
            {\
                "value" : {0},\
                "unit" : "mg/dL",\
                "code" : "mg/dL"\
            },\
            "effectiveDateTime" : "{1}",\
            "status" : "final",\
            "subject" :\
            {\
                "reference" : "Patient/{2}"\
            }\
        }',obsValue, new Date(obsDate).toISOString(), $scope.patient.id);

        var csrftoken = getCookie('XSRF-TOKEN');

        $.ajax({
            url: $scope.smart.server.serviceUrl+"/Observation",
            type: 'POST',
            data: newObs,
            contentType: "application/json",
            beforeSend : function( xhr ) {
                xhr.setRequestHeader( 'Authorization', 'BEARER ' + $scope.smart.server.auth.token );
                xhr.setRequestHeader('X-CSRF-Token', csrftoken );

            }
            }).done(function(){
                queryBilirubinData($scope.smart);
            }).fail(function(){
                console.log("failed to create observation", arguments);
            });
    };

    function formatObservation(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };

    function areaRangeClicked (event) {
      event;
    };

    function queryBilirubinData(smart) {
        var pt = smart.context.patient;
        var obs = pt.Observation.where.codeIn('58941-6')._count(100);
        $.when(obs.search())
        .done(function(bilirubins){
                if(bilirubins){
                    $scope.values = $filter('orderBy')(bilirubins,"effectiveDateTime");
                }

                while (bilirubin.length > 0) {
                    bilirubin.pop();
                }
                angular.forEach($scope.values, function (value) {
                    if(validateNewDate(value.effectiveDateTime)) {
                        bilirubin.push([$scope.hours(value.effectiveDateTime, $scope.patient.dob), parseFloat(value.valueQuantity.value)]);
                    }
                });
                while (lastPoint.length > 0) {
                    lastPoint.pop();
                }
                if (bilirubin.length > 0) {
                    lastPoint.push(bilirubin[bilirubin.length - 1]);
                }
                $scope.clearNewPoint();
                $scope.$apply();
            });
    }

    FHIR.oauth2.ready(function(smart){
        $scope.smart = smart;
        var pt = smart.context.patient;
        var obs = pt.Observation.where.codeIn('58941-6')._count(100);
        $.when(pt.read(), obs.search())
        .done(function(patient, bilirubins){
            angular.forEach(patient.name[0].given, function (value) {
                $scope.patient.name = $scope.patient.name + ' ' + String(value);
            });
            angular.forEach(patient.name[0].family, function (value) {
                $scope.patient.name = $scope.patient.name + ' ' + value;
            });
            $scope.patient.sex = patient.gender;
            $scope.patient.dob = patient.birthDate;
            $scope.patient.id  = patient.id;

            if(bilirubins[0]){
                $scope.values = $filter('orderBy')(bilirubins[0],"effectiveDateTime");
            }

            angular.forEach($scope.values, function (value) {
                if(validateNewDate(value.effectiveDateTime)) {
                    bilirubin.push([$scope.hours(value.effectiveDateTime, $scope.patient.dob), parseFloat(value.valueQuantity.value)]);
                }
            });
            if (bilirubin.length > 0) {
                lastPoint.push(bilirubin[bilirubin.length - 1]);
            }

            $scope.chartConfig = {
                options: {
                    tooltip: {
                        crosshairs: true,
                        valueDecimals: 2,
                        headerFormat: '<span style="font-size: 10px">{point.key:.2f}</span><br/>'
                    },
                    legend: {
                        enabled: false
                    }
                },
                xAxis: {
                    minPadding: 0,
                    maxPadding: 0,
                    gridLineWidth: 1,
                    tickInterval: 24,
                    title: {
                        text: 'Postnatal Age (hours)'
                    }
                },
                yAxis: {
                    minPadding: 0,
                    maxPadding: 0,
                    title: {
                        text: 'Serum Bilirubin (mg/dl)'
                    },
                    plotLines: [
                        {
                            value: 24,
                            color: 'transparent',
                            width: 1,
                            label: {
                                text: 'Critical Risk Zone',
                                align: 'center',
                                style: {
                                    color: 'black'
                                }
                            }
                        },
                        {
                            value: 19,
                            color: 'transparent',
                            width: 1,
                            label: {
                                text: 'High Risk Zone (>95%)',
                                align: 'center',
                                style: {
                                    color: 'black'
                                }
                            }
                        },
                        {
                            value: 13,
                            color: 'transparent',
                            width: 1,
                            label: {
                                text: 'High Intermediate Risk Zone (75-95%)',
                                align: 'center',
                                rotation: -25,
                                style: {
                                    color: 'black'
                                }
                            }
                        },
                        {
                            value: 10.75,
                            color: 'transparent',
                            width: 1,
                            label: {
                                text: 'Low Intermediate Risk Zone (40-74%)',
                                align: 'center',
                                rotation: -20,
                                style: {
                                    color: 'black'
                                }
                            }
                        },
                        {
                            value: 0.5,
                            color: 'transparent',
                            width: 1,
                            label: {
                                text: 'Low Risk Zone',
                                align: 'center',
                                style: {
                                    color: 'black'
                                }
                            }
                        }
                    ]
                },
                plotOptions: {
                    series: {
                        fillOpacity: 0.35
                    }
                },
                series: [
                    {
                        name: 'Critical Risk Zone',
                        data: criticalRiskZone,
                        color: '#FF0000',
                        type: 'arearange'
                    },
                    {
                        name: 'High Risk Zone (>95%)',
                        data: highRiskZone,
                        color: '#FF8040',
                        type: 'arearange'
                    },
                    {
                        name: 'High Intermediate Risk Zone (75-95%)',
                        data: highIntermediateRiskZone,
                        color: '#FFFF00',
                        type: 'arearange'
                    },
                    {
                        name: 'Low Intermediate Risk Zone (40-74%)',
                        data: lowIntermediateRiskZone,
                        color: '#00FF00',
                        type: 'arearange'
                    },
                    {
                        name: 'Low Risk Zone (<40%)',
                        data: lowRiskZone,
                        color: '#f7f7f7',
                        type: 'arearange'
                    },
                    {
                        name: 'New Bilirubin Result',
                        data: newPoint,
                        type: 'line',
                        color: '#9a9a9a',
                        dashStyle: 'dash',
                        marker: {
                            lineWidth: 2,
                            symbol: 'circle',
                            radius: 3,
                            lineColor: null
                        }
                    },
                    {
                        name: 'Bilirubin',
                        data: bilirubin,
                        color: '#7cb5ec',
                        type: 'line'
                    }
                ],
                title: {
                    text: 'Hour Specific Bilirubin Risk Chart for Term & Near-Term Infants with NO Additional Risk Factors'
                },
                credits: {
                    enabled: false
                }
            };
        $scope.$digest();
      });
    });
}]);