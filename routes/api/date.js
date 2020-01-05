const express = require("express");
const cors = require("cors");
const router = express.Router();
const moment = require("moment");

var whitelist = ["http://localhost:3000", "https://ofilms.herokuapp.com"];
var corsOptions = {
  origin: function(origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
};

router.get("/", cors(corsOptions), function(req, res) {
  res.send(
    "Nous sommes le " +
      moment(new Date())
        .locale("fr")
        .format("LLLL")
  );
});

module.exports = router;
