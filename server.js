const path = require("path");
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

app.get("/api/message", (req, res) => {
  res.json({ message: "Test déploiement d'O'Films sur Heroku" });
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello world !" });
});

app.listen(port, () => {
  console.log(`Server is on up ${port} now !`);
});
