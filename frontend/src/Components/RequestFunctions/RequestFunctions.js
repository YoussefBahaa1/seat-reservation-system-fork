// request.js oder request.ts
import axios from 'axios';

function resolveHeaders(headers) {
  const resolved = (headers && typeof headers === 'object') ? { ...headers } : {};

  try {
    const storedToken = sessionStorage.getItem('accessToken');
    if (storedToken && String(storedToken).trim()) {
      const bearer = `Bearer ${String(storedToken).trim()}`;
      resolved.Authorization = bearer;

      // Keep the legacy `headers` session key in sync to avoid stale tokens in old code paths.
      const existingHeadersRaw = sessionStorage.getItem('headers');
      const existingHeaders = existingHeadersRaw ? JSON.parse(existingHeadersRaw) : {};
      const current = existingHeaders && (existingHeaders.Authorization || existingHeaders.authorization);
      if (current !== bearer) {
        sessionStorage.setItem('headers', JSON.stringify({
          ...(existingHeaders || {}),
          Authorization: bearer,
          'Content-Type': (existingHeaders && existingHeaders['Content-Type']) || 'application/json',
        }));
      }
      return resolved;
    }

    const storedHeadersRaw = sessionStorage.getItem('headers');
    const storedHeadersParsed = storedHeadersRaw ? JSON.parse(storedHeadersRaw) : null;
    const storedAuth =
      storedHeadersParsed &&
      (storedHeadersParsed.Authorization || storedHeadersParsed.authorization);

    if (storedAuth && String(storedAuth).trim()) {
      resolved.Authorization = String(storedAuth).trim();
    }
  } catch {
    // ignore storage parse issues
  }

  return resolved;
}

async function request(type, url, headers, successFunction, failFunction, body = {}) {
  try {
    const config = {
      method: type,
      url: url,
      headers: resolveHeaders(headers),
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
