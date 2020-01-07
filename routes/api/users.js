const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const isEmpty = require("is-empty");
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");
const validateResetPassword = require("../../validation/reset");
const ObjectId = require("mongodb").ObjectId;
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const moment = require("moment");
const sanitize = require("mongo-sanitize");

let User = require("../../models/User");

const BCRYPT_SALT_ROUNDS = 12;

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

router.post("/register", cors(corsOptions), async function(req, res) {
  const { errors, isValid } = validateRegisterInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  const user = await User.find(
    {
      $or: [{ email: req.body.email }, { username: req.body.username }]
    },
    function(err, docs) {
      if (docs.length !== 0) {
        if (docs[0].email === req.body.email) {
          errors.email = "L'adresse email est déjà prise";
          return res
            .status(400)
            .json({ email: "L'adresse email est déjà prise" });
        } else if (docs[0].username === req.body.username) {
          errors.username = "Le pseudo est déjà pris";
          return res.status(400).json({ username: "Le pseudo est déjà pris" });
        }
      } else {
        const newUser = new User({
          email: req.body.email,
          username: req.body.username,
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          sexe: req.body.sexe,
          mobilePhone: req.body.mobilePhone,
          departement: req.body.departement,
          city: req.body.city,
          password: req.body.password,
          isAdmin: false,
          isModerator: false,
          isConnected: false,
          isVerified: false,
          isFounder: false,
          resetPasswordToken: null,
          resetPasswordExpires: null,
          creationDate: new Date(),
          lastConnection: ""
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => res.json(user))
              .catch(err => console.log(err));
          });
        });
      }
    }
  );

  return {
    errors,
    isValid: isEmpty(errors)
  };
});

router.post("/login", cors(corsOptions), (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  User.findOne({ email }).then(user => {
    if (!user) {
      errors.email = "Les identifiants rentrés ne sont pas valides";
      errors.password = "Les identifiants rentrés ne sont pas valides";
      return res.status(400).json(errors);
    }

    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        const payload = {
          id: user.id,
          name: user.name
        };

        user.updateOne({ lastConnection: new Date() }).then(updatedUser => {
          jwt.sign(
            payload,
            keys.secretOrKey,
            {
              expiresIn: 7200
            },
            (err, token) => {
              res.json({
                success: true,
                token: "Bearer " + token
              });
            }
          );
        });
      } else {
        errors.password = "Le mot de passe saisi n'est pas correct";
        // return res
        //   .status(400)
        //   .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });

  return {
    errors,
    isValid: isEmpty(errors)
  };
});

router.post("/forgotPassword", cors(corsOptions), (req, res) => {
  const { errors, isValid } = validateResetPassword(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  const { email } = req.body;

  User.findOne({ email })
    .then(user => {
      if (user.length === 0) {
        return res.status(404).json({
          message: "L'adresse e-mail n'est rattachée à aucun utilisateur"
        });
      }
    })
    .catch(err => {
      return res.status(500).json({
        message: err.message
      });
    });

  const token = crypto.randomBytes(20).toString("hex");
  const myDate = new Date();
  const newDate = new Date(myDate);

  User.updateOne(
    { email },
    {
      $set: {
        resetPasswordToken: token,
        resetPasswordExpires: newDate.setHours(newDate.getHours() + 1)
      }
    }
  ).catch(err => {
    return res.status(500).json({
      message: err.message
    });
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: `${process.env.EMAIL_ADDRESS}`,
      pass: `${process.env.EMAIL_PASSWORD}`
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: req.body.email,
    subject: `O'Films - Lien de réinitialisation de mot de passe`,
    text:
      `Vous avez demandé une réinitialisation du mot de passe de votre compte O'Films. Dans le cas contraire, ignorez cet e-mail.\n\n` +
      `Pour choisir un nouveau mot de passe et valider votre demande, cliquez sur le lien suivant :\n\n` +
      `${process.env.REACT_APP_API_URL}/reset-password/${token}\n\n` +
      `Si le lien ne fonctionne pas, copiez-le et collez-le directement dans la barre d'adresse de votre navigateur.\n\n
        Vous pouvez modifier votre mot de passe à tout moment depuis votre espace Mon compte sur www.ofilms.fr\n`
  };
  transporter.sendMail(mailOptions, (err, response) => {
    if (err) {
      console.error("err ", err);
    } else {
      res.status(200).json("Lien réinitialisation envoyé");
    }
  });

  router.get("/resetPassword", cors(corsOptions), (req, res) => {
    User.findOne({
      resetPasswordToken: req.query.resetPasswordToken,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    }).then(user => {
      if (user == null) {
        res
          .status(403)
          .send("Lien réinitialisation mot de passe invalide ou expiré");
      } else {
        res.status(200).send({
          username: user.username,
          message: "Lien réinitialisation OK"
        });
      }
    });
  });
});

router.put("/updatePasswordViaEmail", cors(corsOptions), (req, res) => {
  User.findOne({
    email: req.body.email,
    resetPasswordToken: req.body.resetPasswordToken,
    resetPasswordExpires: {
      $gt: new Date()
    }
  }).then(user => {
    if (user == null) {
      res
        .status(403)
        .send("Lien réinitialisation mot de passe invalide ou expiré");
    } else if (user != null) {
      bcrypt
        .hash(req.body.password, BCRYPT_SALT_ROUNDS)
        .then(hashedPassword => {
          User.updateOne(
            { email: req.body.email },
            {
              $set: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
              }
            }
          ).catch(err => {
            return res.status(500).json({
              message: err.message
            });
          });
        })
        .then(() => {
          console.log("Mot de passe mis à jour");
          res.status(200).send({ message: "Mot de passe mis à jour" });
        });
    } else {
      console.error(
        "Pas d'utilisateur existant dans la base de données à mettre à jour"
      );
      res
        .status(401)
        .json(
          "Pas d'utilisateur existant dans la base de données à mettre à jour"
        );
    }
  });
});

router.get("/getAll", cors(corsOptions), async function(req, res) {
  const users = await User.find({});
  res.send(users);
});

router.get("/my-account/:id", cors(corsOptions), async function(req, res) {
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.find({ _id: o_id });
  res.send(user);
});

router.get("/user/:username", cors(corsOptions), async function(req, res) {
  const username = req.params.username;
  const user = await User.find({ username: username });
  res.send(user);
});

router.get("/user/:id/moviesLiked/:movie", cors(corsOptions), async function(
  req,
  res
) {
  const id = req.params.id;
  const movie = req.params.movie;
  const user = await User.find({
    _id: id,
    moviesLiked: { $in: { moviesLiked: [movie] } }
  });
  res.send(user);
});

router.get("/user/:id/seriesLiked/:serie", cors(corsOptions), async function(
  req,
  res
) {
  const id = req.params.id;
  const serie = req.params.serie;
  const user = await User.find({
    _id: id,
    seriesLiked: { $in: { seriesLiked: [serie] } }
  });

  res.send(user);
});

router.get(
  "/user/:id/moviesFavorites/:movie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const movie = req.params.movie;
    const user = await User.find({
      _id: id,
      moviesFavorites: { $in: { moviesFavorites: [movie] } }
    });
    res.send(user);
  }
);

router.get(
  "/user/:id/seriesFavorites/:serie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const serie = req.params.serie;

    const user = await User.find({
      _id: id,
      seriesFavorites: { $in: { seriesFavorites: [serie] } }
    });
    res.send(user);
  }
);

router.post(
  "/user/:id/add/seriesLiked/:serie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const serie = req.params.serie;
    const o_id = new ObjectId(id);
    const user = await User.updateOne(
      { _id: o_id },
      { $addToSet: { seriesLiked: serie } }
    );
    res.send(user);
  }
);

router.post(
  "/user/:id/add/moviesLiked/:movie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const movie = req.params.movie;
    const o_id = new ObjectId(id);
    const user = await User.updateOne(
      { _id: o_id },
      { $addToSet: { moviesLiked: movie } }
    );
    res.send(user);
  }
);

router.post(
  "/user/:id/add/moviesFavorites/:movie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const movie = req.params.movie;
    const o_id = new ObjectId(id);
    const user = await User.updateOne(
      { _id: o_id },
      { $addToSet: { moviesFavorites: movie } }
    );
    res.send(user);
  }
);

router.post(
  "/user/:id/add/seriesFavorites/:serie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const serie = req.params.serie;
    const o_id = new ObjectId(id);
    const user = await User.updateOne(
      { _id: o_id },
      { $addToSet: { seriesFavorites: serie } }
    );
    res.send(user);
  }
);

router.post(
  "/user/:id/remove/seriesLiked/:serie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const serie = req.params.serie;
    const o_id = new ObjectId(id);
    const user = await User.updateOne(
      { _id: o_id },
      { $pull: { seriesLiked: serie } }
    );
    res.send(user);
  }
);

router.post(
  "/user/:id/remove/moviesLiked/:movie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const movie = req.params.movie;
    const o_id = new ObjectId(id);
    const user = await User.updateOne(
      { _id: o_id },
      { $pull: { moviesLiked: movie } }
    );
    res.send(user);
  }
);

router.post(
  "/user/:id/remove/moviesFavorites/:movie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const movie = req.params.movie;
    const o_id = new ObjectId(id);
    const user = await User.updateOne(
      { _id: o_id },
      { $pull: { moviesFavorites: movie } }
    );
    res.send(user);
  }
);

router.post(
  "/user/:id/remove/seriesFavorites/:serie",
  cors(corsOptions),
  async function(req, res) {
    const id = req.params.id;
    const serie = req.params.serie;
    const o_id = new ObjectId(id);
    const user = await User.updateOne(
      { _id: o_id },
      { $pull: { seriesFavorites: serie } }
    );
    res.send(user);
  }
);

// Defined delete | remove | destroy route
router.delete("/delete/:id", cors(corsOptions), async function(req, res) {
  const id = req.params.id;
  const user = User.findByIdAndRemove({ _id: id });
  res.send(user);
});

module.exports = router;
