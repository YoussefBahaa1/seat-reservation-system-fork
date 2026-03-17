// request.js oder request.ts
import axios from 'axios';
import i18n from '../../i18n';

function clearAuthStorage() {
  try {
    sessionStorage.removeItem('freeDesksAdvancedFilters');
    sessionStorage.removeItem('freeDesksSelectedBuilding');
    sessionStorage.removeItem('freeDesksSelectedDate');
    sessionStorage.removeItem('freeDesksStartTime');
    sessionStorage.removeItem('freeDesksEndTime');
    sessionStorage.removeItem('favouritesSelectedDate');
    sessionStorage.removeItem('favouritesStartTime');
    sessionStorage.removeItem('favouritesEndTime');
    sessionStorage.removeItem('roomSearchSelectedDate');
    sessionStorage.removeItem('roomSearchStartTime');
    sessionStorage.removeItem('roomSearchEndTime');
    sessionStorage.removeItem('createSeriesStartDate');
    sessionStorage.removeItem('createSeriesEndDate');
    sessionStorage.removeItem('createSeriesStartTime');
    sessionStorage.removeItem('createSeriesEndTime');
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

  // Always send current UI language so backend can localize responses/emails
  try {
    resolved['Accept-Language'] = i18n?.language || 'en';
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

function extractFilename(contentDisposition, fallbackFilename) {
  if (!contentDisposition || typeof contentDisposition !== 'string') {
    return fallbackFilename;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch && quotedMatch[1]) {
    return quotedMatch[1];
  }

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  if (plainMatch && plainMatch[1]) {
    return plainMatch[1].trim();
  }

  return fallbackFilename;
}

async function downloadRequest(url, headers, fallbackFilename, failFunction) {
  try {
    const response = await axios({
      method: 'GET',
      url,
      headers: resolveHeaders(headers),
      responseType: 'blob',
    });

    const filename = extractFilename(response.headers?.['content-disposition'], fallbackFilename);
    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        if (error.response.status === 401) {
          handleUnauthorized(url);
        }
        failFunction(error.response.status, error.response.data ?? null);
      } else {
        console.error(`Netzwerk- oder Serverfehler bei GET ${url}:`, error.message);
        failFunction(null, null);
      }
    } else {
      console.error(`Unbekannter Fehler bei GET ${url}:`, error);
      failFunction(null, null);
    }
  }
}

// Vordefinierte Methoden wie vorher
const getRequest = request.bind(null, 'GET');
const postRequest = request.bind(null, 'POST');
const putRequest = request.bind(null, 'PUT');
const deleteRequest = request.bind(null, 'DELETE');

export { getRequest, postRequest, putRequest, deleteRequest, downloadRequest };
