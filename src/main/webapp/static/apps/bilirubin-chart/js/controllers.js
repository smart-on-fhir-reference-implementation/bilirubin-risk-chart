'use strict';

angular.module('himssApp.controllers', []).controller('himssCtrl', ['$scope', '$risk','$filter', function ($scope, $risk,$filter) {
    $scope.patient = {
        name: ''
    };
    $scope.name = '';

    $scope.hours = function (observation, dob) {
        return Math.abs(new Date(observation).getTime() - new Date(dob).getTime()) / 36e5;
    };

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

    FHIR.oauth2.ready(function(smart){
        var pt = smart.context.patient;
        var obs = pt.Observation.where.codeIn('58941-6');
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

            if(bilirubins[0]){
                $scope.values = $filter('orderBy')(bilirubins[0],"effectiveDateTime");
            }

            var bilirubin = [];
            angular.forEach($scope.values, function (value) {
                if(0 <= $scope.hours(value.effectiveDateTime, $scope.patient.dob) <=120)
                    bilirubin.push([$scope.hours(value.effectiveDateTime, $scope.patient.dob), parseFloat(value.valueQuantity.value)]);
            });

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
                        name: 'Bilirubin',
                        data: bilirubin,
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