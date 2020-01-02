const express = require("express");
const router = express.Router();
const moment = require("moment");

router.get("/", function(req, res) {
  res.send("Bienvenue sur la page d'accueil de l'API d'OFilms");
});

module.exports = router;
