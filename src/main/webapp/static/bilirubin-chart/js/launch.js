var iss = getParameterByName('iss');
var client_id = "bilirubin_chart";
var scopes = "patient/*.*";

jQuery.get('config/config.json', function(data) {

    for(var i = 0; i < data.length; i++){
        if (data[i].fhir_service === iss || (data[i].provider !== undefined && iss.indexOf(data[i].provider) > -1)){
            client_id = data[i].client_id;
            scopes = data[i].scopes;
            break;
        }
    }

    FHIR.oauth2.authorize({
        "client_id": client_id,
        "scope":  scopes
    });
});

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
