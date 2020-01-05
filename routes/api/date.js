const express = require("express");
const router = express.Router();
const moment = require("moment");

router.get("/", function(req, res) {
  res.send(
    "Nous sommes le " +
      moment(new Date())
        .locale("fr")
        .format("LLLL")
  );
});

module.exports = router;
