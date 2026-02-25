// request.js oder request.ts
import axios from 'axios';
import i18n from '../../i18n';

function clearAuthStorage() {
  try {
    sessionStorage.removeItem('headers');
    sessionStorage.removeItem('accessToken');
  } catch {
    // ignore storage access issues
  }

  try {
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('name');
    localStorage.removeItem('surname');
    localStorage.removeItem('admin');
    localStorage.removeItem('servicePersonnel');
    localStorage.removeItem('visibility');
  } catch {
    // ignore storage access issues
  }
}

function handleUnauthorized(url) {
  // Do not force-logout on unauthenticated endpoints used during login flow.
  const ignoredPaths = ['/users/login', '/users/mfa/verify'];
  let path = '';
  try {
    path = new URL(url, window.location.origin).pathname;
  } catch {
    path = String(url || '');
  }
  if (ignoredPaths.some((p) => path.endsWith(p))) {
    return;
  }

  clearAuthStorage();
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    window.location.replace('/');
  }
}

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

    const storedHeadersRaw =
      sessionStorage.getItem('headers') || localStorage.getItem('headers');
    const storedHeadersParsed = storedHeadersRaw ? JSON.parse(storedHeadersRaw) : null;
    const storedAuth =
      storedHeadersParsed &&
      (storedHeadersParsed.Authorization || storedHeadersParsed.authorization);

    if (storedAuth && String(storedAuth).trim()) {
      resolved.Authorization = String(storedAuth).trim();
    } else {
      const storedToken =
        sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
      if (storedToken && String(storedToken).trim()) {
        resolved.Authorization = `Bearer ${String(storedToken).trim()}`;
      }
    }
  } catch {
    // ignore storage parse issues
  }

  // Always send current UI language so backend can localize responses/emails
  try {
    const storedLng = (typeof localStorage !== 'undefined')
      ? localStorage.getItem('i18nextLng')
      : null;
    resolved['Accept-Language'] = storedLng || i18n?.language || 'en';
  } catch {
    resolved['Accept-Language'] = 'en';
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

    // Default content type for non-GET requests when none provided
    if (type.toUpperCase() !== 'GET') {
      const hasContentType = Object.keys(config.headers || {}).some(
        (k) => k.toLowerCase() === 'content-type'
      );
      if (!hasContentType) {
        config.headers = { ...(config.headers || {}), 'Content-Type': 'application/json' };
      }

      // Ensure JSON bodies are actually serialized as JSON; avoids axios falling back to urlencoded
      const contentType = Object.entries(config.headers || {}).find(
        ([k]) => k.toLowerCase() === 'content-type'
      )?.[1] || '';
      const isJson = contentType.toLowerCase().includes('application/json');
      if (isJson && typeof config.data !== 'string') {
        config.data = JSON.stringify(config.data ?? {});
      }
    }

    const response = await axios(config);
    successFunction(response.data ?? null);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server antwortete mit einem Statuscode außerhalb von 2xx
        if (error.response.status === 401) {
          handleUnauthorized(url);
        }
        failFunction(error.response.status, error.response.data ?? null);
      } else {
        console.error(`Netzwerk- oder Serverfehler bei ${type} ${url}:`, error.message);
        failFunction(null, null); // Optional: Kannst du auch anders behandeln
      }
    } else {
      console.error(`Unbekannter Fehler bei ${type} ${url}:`, error);
      failFunction(null, null);
    }
  }
}

// Vordefinierte Methoden wie vorher
const getRequest = request.bind(null, 'GET');
const postRequest = request.bind(null, 'POST');
const putRequest = request.bind(null, 'PUT');
const deleteRequest = request.bind(null, 'DELETE');

export { getRequest, postRequest, putRequest, deleteRequest };
