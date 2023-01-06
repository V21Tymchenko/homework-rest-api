const express = require("express");
const Joi = require("joi");
const router = express.Router();
const authorize = require("../../middlewares/authorize");
const Contact = require("../../models/contact");

const { createError } = require("../../helpers/createError");

const contactsSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().required(),
  phone: Joi.string().required(),
  favorite: Joi.boolean(),
});
const updateFavoriteSchema = Joi.object({
  favorite: Joi.boolean().required(),
});
router.get("/", async (req, res, next) => {
  try {
    const { _id: owner } = req.user;
    const contacts = await Contact.find({ owner }).populate(
      "owner",
      "name email"
    );
    res.json(contacts);
  } catch (err) {
    next(err);
  }
});

router.get("/:contactId", authorize, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const findContactId = await Contact.findById(contactId);
    if (!findContactId) {
      throw createError(404, "Not found");
    }
    res.status(200).json(findContactId);
  } catch (err) {
    next(err);
  }
});

router.post("/", authorize, async (req, res, next) => {
  try {
    const { _id: owner } = req.user;
    const { error } = contactsSchema.validate(req.body);
    if (error) {
      throw createError(400, error.message);
    }
    const result = await Contact.create({ ...req.body, owner });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/:contactId", authorize, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const result = await Contact.findByIdAndRemove(contactId);
    if (!result) {
      throw createError(404, "Not Found");
    }
    res.status(200).json({
      message: "Contact deleted",
    });
  } catch (err) {
    next(err);
  }
});

router.put("/:contactId", authorize, async (req, res, next) => {
  try {
    const { error } = contactsSchema.validate(req.body);
    if (error) {
      throw createError(400, error.message);
    }
    const { contactId } = req.params;
    const result = await Contact.findByIdAndUpdate(contactId, req.body, {
      new: true,
    });
    if (!result) {
      throw createError(404, "Not Found");
    }
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/:contactId/favorite", authorize, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const { error } = updateFavoriteSchema.validate(req.body, {
      new: true,
    });
    if (error) {
      throw createError(400, error.message);
    }
    const result = await Contact.findByIdAndUpdate(contactId, req.body);
    if (!result) {
      throw createError(404, "Not Found");
    }
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
module.exports = router;
