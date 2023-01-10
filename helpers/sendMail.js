const sgMail = require("@sendgrid/mail");
require("dotenv").config();

const { SECRET_API_KEY } = process.env;

sgMail.setApiKey(SECRET_API_KEY);

const sendMail = async (data) => {
  const mail = { ...data, from: "lera.tymchenko@ukr.net" };

  sgMail
    .sendMail(mail)
    .then(() => console.log("Mail sent"))
    .catch((e) => console.log(e.message));
};

module.exports = sendMail;
