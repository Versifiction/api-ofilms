const express = require("express");
const router = express.Router();
const moment = require("moment");
const cors = require("cors");

var whitelist = [
  process.env.CLIENT_PORT,
  process.env.CLIENT_PRODUCTION,
  process.env.SERVER_PORT
];

var corsOptions = {
  origin: function(origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
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
