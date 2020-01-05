const express = require("express");
const cors = require("cors");
const router = express.Router();
const ObjectId = require("mongodb").ObjectId;

let Message = require("../../models/ChatMessage");

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

router.get("/messages", cors(corsOptions), async function(req, res) {
  const messages = await Message.find({})
    .limit(100)
    .sort({ _id: 1 });
  res.send(messages);
});

router.delete("/messages/delete/:id", cors(corsOptions), async function(
  req,
  res
) {
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const message = await Message.findOneAndDelete({ _id: o_id });
  res.send(message);
});

module.exports = router;
