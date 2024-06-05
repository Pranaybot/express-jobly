"use strict";

// Importing necessary modules
const jwt = require("jsonwebtoken"); // For working with JSON Web Tokens
const { UnauthorizedError } = require("../expressError"); // Custom error class
const { SECRET_KEY } = require("../config"); // Importing secret key for JWT

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    // Extracting authorization header from request
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      // Extracting token from authorization header and trimming whitespace
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      // Verifying the token using the SECRET_KEY
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next(); // Proceed to the next middleware
  } catch (err) {
    return next(); // Proceed to the next middleware even if there's an error
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    // If no user information is stored in locals, raise UnauthorizedError
    if (!res.locals.user) throw new UnauthorizedError();
    return next(); // Proceed to the next middleware
  } catch (err) {
    return next(err); // Pass error to the error handling middleware
  }
}

/** Middleware to use when they be logged in as an admin user.
 *
 *  If not, raises Unauthorized.
 */

function ensureAdmin(req, res, next) {
  try {
    // If no user information is stored in locals or the user is not an admin, raise UnauthorizedError
    if (!res.locals.user || !res.locals.user.isAdmin) {
      throw new UnauthorizedError();
    }
    return next(); // Proceed to the next middleware
  } catch (err) {
    return next(err); // Pass error to the error handling middleware
  }
}

/** Middleware to use when they must provide a valid token & be user matching
 *  username provided as route param.
 *
 *  If not, raises Unauthorized.
 */

function ensureCorrectUserOrAdmin(req, res, next) {
  try {
    const user = res.locals.user;
    // If no user information is stored in locals or the user is not an admin or the requested username doesn't match the user's username, raise UnauthorizedError
    if (!(user && (user.isAdmin || user.username === req.params.username))) {
      throw new UnauthorizedError();
    }
    return next(); // Proceed to the next middleware
  } catch (err) {
    return next(err); // Pass error to the error handling middleware
  }
}

// Exporting middleware functions
module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureCorrectUserOrAdmin,
};
