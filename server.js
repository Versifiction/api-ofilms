const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const mongoose = require("mongoose");
const moment = require("moment");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const xss = require("xss-clean");
const users = require("./routes/api/users");
const chat = require("./routes/api/chat");
const date = require("./routes/api/date");
const ObjectId = require("mongodb").ObjectId;
const db = require("./config/keys").mongoURI;
const port = process.env.PORT || 5000;
const app = express();
const server = app.listen(port);
const io = require("socket.io").listen(server);

require("dotenv").config();
require("./config/passport")(passport);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // équivaut à 15 minutes
  max: 100 // requêtes max par Ip dans le délai indiqué (windowMS, soit 15min)
});

const whitelist = [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://ofilms.herokuapp.com"
];
const corsOptions = {
  origin: function(origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
};

// app.use(cors());
app.options("*", cors(corsOptions));
app.use(xss()); // protège des failles XSS en nettoyant tous les req.body, req.query et req.params
app.use(limiter); //
app.use(morgan("tiny")); // log dans le serveur à chaque requête efectuée sur une route, "tiny" log le minimum
app.use(helmet()); // sécurise l'app avec des headers HTTP
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());
app.use(passport.initialize());
app.use("/api/users", users);
app.use("/api/chat", chat);
app.use("/api/date", date);

app.get("/", function(req, res) {
  res.send(
    `Bienvenue sur l'API d'O'Films. Nous sommes le ${moment(new Date())
      .locale("fr")
      .format("LLLL")}`
  );
});

let Message = require("./models/ChatMessage");
let typingusers = [];

io.on("connection", function(socket) {
  socket.on("send message", async function(message) {
    try {
      io.emit("send message", message);
      const sent = await Message.create(message, function(err, res) {
        if (err) throw err;
      });
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("delete message", async function(message) {
    try {
      io.emit("delete message", message);
      const id = message.id;
      const o_id = new ObjectId(id);
      const deleted = await Message.findOneAndDelete({ _id: o_id }, function(
        err,
        user
      ) {
        if (err) {
          throw err;
        }
      });
    } catch (err) {
      console.log(err);
    }
  });

  function broadcastTyping() {
    let message = "";
    if (typingusers.length === 1) {
      message = typingusers[0] + " est en train d'écrire";
    } else if (typingusers.length === 2) {
      let typingusersAsArray = Object.values(typingusers);
      message = typingusersAsArray.join("et ") + " sont en train d'écrire";
    } else if (typingusers.length > 2) {
      message = "Plusieurs personnes sont en train d'écrire";
    }

    io.emit("typing message", { message, typingusers });
  }

  socket.on("typing message", username => {
    if (!typingusers.includes(username.username)) {
      typingusers.push(username.username);
    }
    broadcastTyping();
  });

  socket.on("not typing message", username => {
    typingusers.splice(typingusers.indexOf(username.username), 1);
    broadcastTyping();
  });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@ofilms-demo-f9iwz.mongodb.net/${process.env.DB}`,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() =>
    console.log(
      "Le serveur tourne sur le port 5000 et la connexion à la base de données MongoDB s'est bien déroulée"
    )
  )
  .catch(err => console.log(err));
