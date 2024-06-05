"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema"); // Importing JSON schema validation library

const express = require("express");
const { ensureCorrectUserOrAdmin, ensureAdmin } = require("../middleware/auth"); // Importing authorization middleware
const { BadRequestError } = require("../expressError"); // Importing custom error handler
const User = require("../models/user"); // Importing User model
const { createToken } = require("../helpers/tokens"); // Importing token creation helper function
const userNewSchema = require("../schemas/userNew.json"); // Importing JSON schema for new user
const userUpdateSchema = require("../schemas/userUpdate.json"); // Importing JSON schema for updating user

const router = express.Router(); // Creating an instance of Express router


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: admin
 **/
router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    // Validating the incoming user data against the schema
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    // Registering the new user and creating a token for authentication
    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});


/** GET / => { users: [ {username, firstName, lastName, email, jobs }, ... ] }
 *
 * Returns list of all users with their applied job IDs.
 *
 * Authorization required: admin
 **/
router.get("/", ensureAdmin, async function (req, res, next) {
  try {
    // Fetching all users from the database along with their applied job IDs
    const users = await User.findAllWithAppliedJobs();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin, jobs }
 *   where jobs is { id, title, companyHandle, companyName, state }
 *
 * Authorization required: admin or same user-as-:username
 **/
router.get("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    // Fetching user details by username from the database
    const user = await User.get(req.params.username);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: admin or same-user-as-:username
 **/
router.patch("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    // Validating the incoming user data for updating against the schema
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    // Updating user information in the database
    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: admin or same-user-as-:username
 **/
router.delete("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    // Removing user from the database
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});


/** POST /[username]/jobs/[id]  { state } => { application }
 *
 * Returns {"applied": jobId}
 *
 * Authorization required: admin or same-user-as-:username
 * */
router.post("/:username/jobs/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    // Parsing job ID from request parameters
    const jobId = +req.params.id;
    // Applying for a job by the user
    await User.applyToJob(req.params.username, jobId);
    return res.json({ applied: jobId });
  } catch (err) {
    return next(err);
  }
});

module.exports = router; // Exporting the router for use in other parts of the application
