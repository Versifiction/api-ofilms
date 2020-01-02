const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
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

let User = require("../../models/User");

const BCRYPT_SALT_ROUNDS = 12;

router.post("/register", async function(req, res) {
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

router.post("/login", (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  User.findOne({ email }).then(user => {
    if (!user) {
      errors.email = "L'adresse email existe déjà";
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

router.post("/forgotPassword", (req, res) => {
  console.log("----------");
  console.log("forgotPassword");
  // const { errors, isValid } = validateResetPassword(req.body);

  // if (!isValid) {
  //   return res.status(400).json(errors);
  // }

  // console.log(`forgot password of user : ${req.body.email}`);

  const { email } = req.body;

  // check if email is registered in the database
  User.findOne({ email })
    .then(user => {
      if (user.length === 0) {
        console.log("L'adresse e-mail n'est rattachée à aucun utilisateur");

        // send error message to the client
        return res.status(404).json({
          message: "L'adresse e-mail n'est rattachée à aucun utilisateur"
        });
      } else {
        console.log("L'adresse e-mail est rattachée à un utilisateur");
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

  console.log("token ", token);
  console.log(
    "date actuelle ",
    moment(myDate)
      .locale("fr")
      .format("LLLL")
  );
  console.log(
    "dans 1h ",
    moment(newDate.setHours(newDate.getHours() + 1))
      .locale("fr")
      .format("LLLL")
  );

  // if the email exists, run this update to the account with the associated email
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
      `${REACT_APP_API_URL}/reset-password/${token}\n\n` +
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

  router.get("/resetPassword", (req, res) => {
    console.log("----------");
    console.log("resetPassword");
    User.findOne({
      resetPasswordToken: req.query.resetPasswordToken,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    }).then(user => {
      if (user == null) {
        console.error("Lien réinitialisation mot de passe invalide ou expiré");
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

router.put("/updatePasswordViaEmail", (req, res) => {
  User.findOne({
    email: req.body.email,
    resetPasswordToken: req.body.resetPasswordToken,
    resetPasswordExpires: {
      $gt: new Date()
    }
  }).then(user => {
    if (user == null) {
      console.error("Lien réinitialisation mot de passe invalide ou expiré");
      res
        .status(403)
        .send("Lien réinitialisation mot de passe invalide ou expiré");
    } else if (user != null) {
      console.log("L'utilisateur existe en base de données");
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

router.get("/getAll", async function(req, res) {
  console.log("get all users");
  const users = await User.find({});
  res.send(users);
});

router.get("/my-account/:id", async function(req, res) {
  console.log("get my account infos");
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.find({ _id: o_id });
  res.send(user);
});

router.get("/user/:username", async function(req, res) {
  console.log(`get infos of user : ${req.params.username}`);
  const username = req.params.username;
  const user = await User.find({ username: username });
  res.send(user);
});

router.get("/user/:user/moviesLiked/:movie", async function(req, res) {
  console.log(`get moviesLiked list of user ${req.params.user}`);
  const user = await User.find({
    _id: req.params.user,
    moviesLiked: { $in: { moviesLiked: [req.params.movie] } }
  });
  res.send(user);
});

router.get("/user/:user/seriesLiked/:serie", async function(req, res) {
  console.log(`get seriesLiked list of user ${req.params.user}`);
  const user = await User.find({
    _id: req.params.user,
    seriesLiked: { $in: { seriesLiked: [req.params.serie] } }
  });

  res.send(user);
});

router.get("/user/:id/moviesFavorites/:movie", async function(req, res) {
  console.log(`get moviesFavorites list of user ${req.params.id}`);
  const user = await User.find({
    _id: req.params.id,
    moviesFavorites: { $in: { moviesFavorites: [req.params.movie] } }
  });
  res.send(user);
});

router.get("/user/:id/seriesFavorites/:serie", async function(req, res) {
  console.log(`get seriesFavorites list of user ${req.params.id}`);
  const user = await User.find({
    _id: req.params.id,
    seriesFavorites: { $in: { seriesFavorites: [req.params.serie] } }
  });
  res.send(user);
});

router.post("/user/:id/add/seriesLiked/:serie", async function(req, res) {
  console.log(
    `add serie ${req.params.serie} to seriesLiked list of user ${req.params.id}`
  );
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.updateOne(
    { _id: o_id },
    { $addToSet: { seriesLiked: req.params.serie } }
  );
  res.send(user);
});

router.post("/user/:id/add/moviesLiked/:movie", async function(req, res) {
  console.log(
    `add movie ${req.params.movie} to moviesLiked list of user ${req.params.id}`
  );
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.updateOne(
    { _id: o_id },
    { $addToSet: { moviesLiked: req.params.movie } }
  );
  res.send(user);
});

router.post("/user/:id/add/moviesFavorites/:movie", async function(req, res) {
  console.log(
    `add movie ${req.params.movie} to moviesFavorites list of user ${req.params.id}`
  );
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.updateOne(
    { _id: o_id },
    { $addToSet: { moviesFavorites: req.params.movie } }
  );
  res.send(user);
});

router.post("/user/:id/add/seriesFavorites/:serie", async function(req, res) {
  console.log(
    `add serie ${req.params.serie} to seriesFavorites list of user ${req.params.id}`
  );
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.updateOne(
    { _id: o_id },
    { $addToSet: { seriesFavorites: req.params.serie } }
  );
  res.send(user);
});

router.post("/user/:id/remove/seriesLiked/:serie", async function(req, res) {
  console.log(
    `remove serie ${req.params.serie} to seriesLiked list of user ${req.params.id}`
  );
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.updateOne(
    { _id: o_id },
    { $pull: { seriesLiked: req.params.serie } }
  );
  res.send(user);
});

router.post("/user/:id/remove/moviesLiked/:movie", async function(req, res) {
  console.log(
    `remove movie ${req.params.movie} to moviesLiked list of user ${req.params.id}`
  );
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.updateOne(
    { _id: o_id },
    { $pull: { moviesLiked: req.params.movie } }
  );
  res.send(user);
});

router.post("/user/:id/remove/moviesFavorites/:movie", async function(
  req,
  res
) {
  console.log(
    `remove movie ${req.params.movie} to moviesFavorites list of user ${req.params.id}`
  );
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.updateOne(
    { _id: o_id },
    { $pull: { moviesFavorites: req.params.movie } }
  );
  res.send(user);
});

router.post("/user/:id/remove/seriesFavorites/:serie", async function(
  req,
  res
) {
  console.log(
    `remove serie ${req.params.serie} to seriesFavorites list of user ${req.params.id}`
  );
  const id = req.params.id;
  const o_id = new ObjectId(id);
  const user = await User.updateOne(
    { _id: o_id },
    { $pull: { seriesFavorites: req.params.serie } }
  );
  res.send(user);
});

// Defined delete | remove | destroy route
router.delete("/delete/:id", async function(req, res) {
  const user = User.findByIdAndRemove({ _id: req.params.id });
  res.send(user);
});

module.exports = router;
