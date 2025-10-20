const express = require("express");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const { visit } = require("./bot");

const app = express();
const port = 3000;

app.use(cookieParser());

const flag = fs.readFileSync("./flag.txt", "utf8").trim();

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

app.get("/bot", async (req, res) => {
  if (req.query?.url) await visit(req.query.url);
  res.send("If it's done it's done.");
});

app.get("/", (req, res) => {
  res.send(
    `<iframe credentialless></iframe>
			<script>
					document.querySelector("iframe").setAttribute("srcdoc", new URLSearchParams(document.location.search).get("srcdoc"))
			</script>`
  );
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
