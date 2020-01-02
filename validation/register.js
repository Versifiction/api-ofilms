const Validator = require("validator");
const isEmpty = require("is-empty");

module.exports = function validateRegisterInput(data) {
  let errors = {};

  // Convert empty fields to an empty string so we can use validator functions
  data.email = !isEmpty(data.email) ? data.email : "";
  data.username = !isEmpty(data.username) ? data.username : "";
  data.firstname = !isEmpty(data.firstname) ? data.firstname : "";
  data.lastname = !isEmpty(data.lastname) ? data.lastname : "";
  data.sexe = !isEmpty(data.sexe) ? data.sexe : "";
  data.mobilePhone = !isEmpty(data.mobilePhone) ? data.mobilePhone : "";
  data.city = !isEmpty(data.city) ? data.city : "";
  data.departement = !isEmpty(data.departement) ? data.departement : "";
  data.isAdmin = !isEmpty(data.isAdmin) ? data.isAdmin : "";
  data.isModerator = !isEmpty(data.isModerator) ? data.isModerator : "";
  data.isVerified = !isEmpty(data.isVerified) ? data.isVerified : "";
  data.isConnected = !isEmpty(data.isConnected) ? data.isConnected : "";
  data.creationDate = !isEmpty(data.creationDate) ? data.creationDate : "";
  data.lastConnection = !isEmpty(data.lastConnection)
    ? data.lastConnection
    : "";
  data.password = !isEmpty(data.password) ? data.password : "";
  data.confirmPassword = !isEmpty(data.confirmPassword)
    ? data.confirmPassword
    : "";

  // Username checks
  if (Validator.isEmpty(data.username)) {
    errors.username = "Le pseudo est requis";
  }

  if (!Validator.isAlphanumeric(data.username)) {
    errors.username =
      "Le pseudo doit seulement contenir des chiffres et des lettres";
  }

  if (!Validator.isLength(data.username, { min: 3, max: 15 })) {
    errors.username = "Le pseudo doit faire entre 3 et 15 caractères";
  }

  if (Validator.isEmpty(data.firstname)) {
    errors.firstname = "Le prénom est requis";
  }

  if (Validator.isEmpty(data.lastname)) {
    errors.lastname = "Le nom de famille est requis";
  }

  // Email checks
  if (Validator.isEmpty(data.email)) {
    errors.email = "L'adresse email est requise";
  }

  if (!Validator.isEmail(data.email)) {
    errors.email = "L'adresse email est invalide";
  }

  // Password checks
  if (Validator.isEmpty(data.password)) {
    errors.password = "Le mot de passe est requis";
  }

  if (Validator.isEmpty(data.confirmPassword)) {
    errors.confirmPassword = "La confirmation du mot de pase est requise";
  }

  if (!Validator.isLength(data.password, { min: 6, max: 30 })) {
    errors.password = "Le mot de passe doit faire entre 6 et 30 caractères";
  }

  if (!Validator.equals(data.password, data.confirmPassword)) {
    errors.confirmPassword = "Les mots de passe doivent correspondre";
    errors.password = "Les mots de passe doivent correspondre";
  }

  if (data.departement) {
    if (!Validator.isInt(data.departement)) {
      if (!Validator.isLength(data.departement, { min: 2, max: 3 })) {
        errors.departement =
          "Le département doit faire entre 2 et 3 caractères";
      }
    }
  }

  if (data.mobilePhone) {
    if (!Validator.isMobilePhone(data.mobilePhone, "fr-FR")) {
      errors.mobilePhone = "Le numéro de téléphone est invalide";
    }
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};
