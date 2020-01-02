const Validator = require("validator");
const isEmpty = require("is-empty");

module.exports = function validateResetPassword(data) {
  let errors = {};

  data.email = !isEmpty(data.email) ? data.email : "";

  if (Validator.isEmpty(data.email)) {
    errors.email = "L'adresse email est requise";
  } else if (!Validator.isEmail(data.email)) {
    errors.email = "L'adresse email est invalide";
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};
