// request.js oder request.ts
import axios from 'axios';

async function request(type, url, headers, successFunction, failFunction, body = {}) {
  try {
    const config = {
      method: type,
      url: url,
      headers: headers,
      data: body, // bei GET wird data ignoriert von Axios
    };

    const response = await axios(config);
    successFunction(response.data ?? null);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server antwortete mit einem Statuscode außerhalb von 2xx
        failFunction(error.response.status);
      } else {
        console.error(`Netzwerk- oder Serverfehler bei ${type} ${url}:`, error.message);
        failFunction(null); // Optional: Kannst du auch anders behandeln
      }
    } else {
      console.error(`Unbekannter Fehler bei ${type} ${url}:`, error);
      failFunction(null);
    }
  }
}

// Vordefinierte Methoden wie vorher
const getRequest = request.bind(null, 'GET');
const postRequest = request.bind(null, 'POST');
const putRequest = request.bind(null, 'PUT');
const deleteRequest = request.bind(null, 'DELETE');

export { getRequest, postRequest, putRequest, deleteRequest };