async function request(type, url, headers, successFunction, failFunction, body=JSON.stringify({})) {
    try {
        
        // GET cant have an body.
        const response = type === 'GET' ? await fetch(url, {
            method: type,
            headers: headers,
        }) : await fetch(url, {
            method: type,
            headers: headers,
            body: body,
        });
        if (response.ok) {
            // See if there is an response that is a json.
            try {
                const data = await response.json();
                successFunction(data);
            } 
            // If the response is not a json (e.g. a simple message) just execute the success function.
            // The provided data are not important in this case.
            catch (e) {
                if (e instanceof SyntaxError) {
                    successFunction(null);
                }
                else {
                    console.log(e);
                    console.log(`Unknown error in ${type}Reuest.js.`);
                };
            }
        }
        else {
            /*const msg = response.status === 401 ? "Nicht autorisiert oder Sitzung abgelaufen. Bitte melde dich erneut an."
                : response.status === 403 ? 'Du hast keine Berechtigung für diese Aktion.' 
                : response.status === 404 ? 'Die angeforderte Ressource wurde nicht gefunden.'
                : response.status === 500 ? 'Serverfehler. Bitte versuche es später erneut.'
                : `Ein Fehler ist aufgetreten. Statuscode: ${response.status}`
                */
            failFunction(response.status);
        }
    } catch (error) {
        console.error(`Error: ${error} for ${type} on url: ${url}`);
    }
};

const getRequest = request.bind(null, 'GET');
const putRequest = request.bind(null, 'PUT');
const deleteRequest = request.bind(null, 'DELETE');
const postRequest = request.bind(null, 'POST');

export {getRequest, putRequest, deleteRequest, postRequest};