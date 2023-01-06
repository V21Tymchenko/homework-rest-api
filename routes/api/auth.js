const express = require("express");
const Joi = require("joi");
const createHashPassword = require("../../helpers/createHashPassword");
const { createError } = require("../../helpers/createError");
const bcrypt = require("bcryptjs");
const User = require("../../models/user");
const jwt = require("jsonwebtoken");
const authorize = require("../../middlewares/authorize");
const gravatar = require("gravatar");
const upload = require("../../middlewares/upload");
const path = require("path");
const fs = require("fs/promises");
const Jimp = require("jimp");

const registerUserSchema = Joi.object({
  password: Joi.string().min(6).required(),
  email: Joi.string().required(),
  subscription: Joi.string(),
  token: Joi.string(),
});

const loginUserSchema = Joi.object({
  password: Joi.string().min(6).required(),
  email: Joi.string().required(),
});

const { SECRET_KEY } = process.env;

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const { error } = registerUserSchema.validate(req.body);
    if (error) {
      throw createError(400, error.message);
    }
    const { email, password, subscription } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw createError(409, "Email in use");
    }
    const hashPassword = await createHashPassword(password);
    const avatarURL = gravatar.url(email);

    const newUser = await User.create({
      email,
      password: hashPassword,
      subscription,
      avatarURL,
    });
    res.status(201).json({
      email: newUser.email,
      subscription: newUser.subscription,
    });
  } catch (error) {
    next(error);
  }
});
router.post("/login", async (req, res, next) => {
  try {
    const { error } = loginUserSchema.validate(req.body);
    if (error) {
      throw createError(400, error.message);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const isValidPAssword = await bcrypt.compare(password, user.password);
    if (!user) {
      throw createError(401, "Email or password is wrong");
    }
    if (!isValidPAssword) {
      throw createError(401, "Email or password is wrong");
    }
    const payload = {
      id: user._id,
    };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
    await User.findByIdAndUpdate({ _id: user._id }, { token });
    res.json({ token });
  } catch (error) {
    next(error);
  }
});
router.get("/logout", authorize, async (req, res, next) => {
  try {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { token: "" });
    res.json({ message: "Logout successfull" });
  } catch (error) {
    next(error);
  }
});
router.get("/current", authorize, async (req, res, next) => {
  try {
    const { email, subscription } = req.user;
    res.json({ email, subscription });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/avatars",
  authorize,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      const { _id } = req.user;
      const { path: tempDir, originalname } = req.file;
      const [extention] = originalname.split(".").reverse();
      const newName = `${_id}.${extention}`;

      const uploadDir = path.join(
        __dirname,
        "../../",
        "public",
        "avatars",
        newName
      );
      await fs.rename(tempDir, uploadDir);

      Jimp.read(uploadDir, (err, avatar) => {
        if (err) throw err;
        avatar.resize(250, 250).write(uploadDir);
      });

      const avatar = path.join("avatars", newName);

      await User.findByIdAndUpdate(_id, { avatar });
      res.status(201).json(avatar);
    } catch (error) {
      await fs.unlink(req.file.path);
      next(error);
    }
  }
);

module.exports = router;
