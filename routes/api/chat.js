const express = require("express");
const router = express.Router();
const ObjectId = require("mongodb").ObjectId;

let Message = require("../../models/ChatMessage");

router.get("/messages", async function(req, res) {
  const messages = await Message.find({})
    .limit(100)
    .sort({ _id: 1 });
  res.send(messages);
});

router.delete("/messages/delete/:id", async function(req, res) {
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const message = await Message.findOneAndDelete({ _id: o_id });
  res.send(message);
});

module.exports = router;
