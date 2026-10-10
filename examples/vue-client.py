"""Python standard-library server-side client; no automatic retries."""
import json
import uuid
import urllib.request
import urllib.error
from urllib.parse import urlparse, quote

class VueApiError(Exception):
    def __init__(self, status, payload, request_id=None, retry_after=None):
        super().__init__(payload.get('error', {}).get('message', 'CORE-VUE request failed'))
        self.status = status
        self.code = payload.get('error', {}).get('code')
        self.request_id = request_id
        self.retry_after = retry_after

class VueClient:
    def __init__(self, api_key, subject, base_url='https://www.vueapps.se/api/v1'):
        url = urlparse(base_url)
        if url.scheme != 'https' and not (url.scheme == 'http' and url.hostname in ('localhost', '127.0.0.1')):
            raise ValueError('HTTPS is required')
        self.api_key, self.subject, self.base_url = api_key, subject, base_url.rstrip('/')

    def request(self, path, method='GET', body=None, idempotency_key=None):
        headers = {'Authorization': 'Bearer ' + self.api_key, 'X-VUE-Subject': self.subject}
        if method != 'GET':
            idempotency_key = idempotency_key or str(uuid.uuid4())
            headers['Idempotency-Key'] = idempotency_key
        data = None
        if body is not None:
            data = json.dumps(body).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        request = urllib.request.Request(self.base_url + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=125) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            try:
                payload = json.load(error)
            except (ValueError, UnicodeError):
                payload = {'error': {'message': 'The API returned a non-JSON response.'}}
            wrapped = VueApiError(error.code, payload, error.headers.get('X-Request-ID'), error.headers.get('Retry-After'))
            wrapped.idempotency_key = idempotency_key
            raise wrapped from None
        except (urllib.error.URLError, TimeoutError) as error:
            error.idempotency_key = idempotency_key
            raise

    def ask(self, body, idempotency_key=None):
        return self.request('/ask', 'POST', body, idempotency_key)

    def create_case(self, specialist, title, idempotency_key=None):
        return self.request('/cases', 'POST', {'specialist': specialist, 'title': title}, idempotency_key)

    def get_case(self, case_id):
        return self.request('/cases/' + quote(case_id, safe=''))

    def delete_case(self, case_id, idempotency_key=None):
        return self.request('/cases/' + quote(case_id, safe=''), 'DELETE', idempotency_key=idempotency_key)
