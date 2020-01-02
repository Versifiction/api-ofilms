const Validator = require("validator");
const isEmpty = require("is-empty");

module.exports = function validateLoginInput(data) {
  let errors = {};

  data.email = !isEmpty(data.email) ? data.email : "";
  data.password = !isEmpty(data.password) ? data.password : "";

  if (Validator.isEmpty(data.email)) {
    errors.email = "L'adresse email est requise";
  } else if (!Validator.isEmail(data.email)) {
    errors.email = "L'adresse email est invalide";
  }

  if (Validator.isEmpty(data.password)) {
    errors.password = "Le mot de passe est requis";
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};
