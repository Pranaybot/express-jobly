"use strict";

// Import necessary modules and dependencies
const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** Related functions for users. */
class User {

  /**
   * Authenticate user with username and password.
   * Returns user data if authentication is successful.
   * Throws UnauthorizedError if user not found or wrong password.
   **/
  static async authenticate(username, password) {
    // Try to find the user
    const result = await db.query(
      `SELECT username,
              password,
              first_name AS "firstName",
              last_name AS "lastName",
              email,
              is_admin AS "isAdmin"
       FROM users
       WHERE username = $1`,
      [username],
    );

    const user = result.rows[0];

    if (user) {
      // Compare hashed password with the provided password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        // Remove password from the returned user object
        delete user.password;
        return user;
      }
    }

    // Throw UnauthorizedError if authentication fails
    throw new UnauthorizedError("Invalid username/password");
  }

  /**
   * Register user with provided data.
   * Returns user data upon successful registration.
   * Throws BadRequestError if username is duplicate.
   **/
  static async register(
    { username, password, firstName, lastName, email, isAdmin }) {
    // Check for duplicate username
    const duplicateCheck = await db.query(
      `SELECT username
       FROM users
       WHERE username = $1`,
      [username],
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username}`);
    }

    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    // Insert user data into the database
    const result = await db.query(
      `INSERT INTO users
       (username,
        password,
        first_name,
        last_name,
        email,
        is_admin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
      [
        username,
        hashedPassword,
        firstName,
        lastName,
        email,
        isAdmin,
      ],
    );

    const user = result.rows[0];
    return user;
  }

  /**
   * Find all users with applied job IDs.
   * Returns an array of users with applied job IDs.
   **/
  static async findAllWithAppliedJobs() {
    const result = await db.query(
      `SELECT u.username,
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email,
              u.is_admin AS "isAdmin",
              COALESCE(ARRAY_AGG(a.job_id) FILTER (WHERE a.job_id IS NOT NULL), '{}') AS jobs
       FROM users AS u
       LEFT JOIN applications AS a ON u.username = a.username
       GROUP BY u.username
       ORDER BY u.username`,
    );

    return result.rows;
  }

  /**
   * Retrieve user data based on username.
   * Returns user data if found.
   * Throws NotFoundError if user not found.
   **/
  static async get(username) {
    const userRes = await db.query(
      `SELECT username,
              first_name AS "firstName",
              last_name AS "lastName",
              email,
              is_admin AS "isAdmin"
       FROM users
       WHERE username = $1`,
      [username],
    );

    const user = userRes.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    const userApplicationsRes = await db.query(
      `SELECT a.job_id
       FROM applications AS a
       WHERE a.username = $1`, [username]);

    user.jobs = userApplicationsRes.rows.map(a => a.job_id);
    return user;
  }

  /**
   * Update user data with provided data.
   * Returns updated user data.
   * Throws NotFoundError if user not found.
   **/
  static async update(username, data) {
    // Hash the password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    // Generate SQL query for partial update
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        firstName: "first_name",
        lastName: "last_name",
        isAdmin: "is_admin",
      });
    const usernameVarIdx = "$" + (values.length + 1);

    // Execute the update query
    const querySql = `UPDATE users
                      SET ${setCols}
                      WHERE username = ${usernameVarIdx}
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    // Throw NotFoundError if user not found
    if (!user) throw new NotFoundError(`No user: ${username}`);

    // Remove password from the returned user object
    delete user.password;
    return user;
  }

  /**
   * Delete user with given username from the database.
   * Throws NotFoundError if user not found.
   **/
  static async remove(username) {
    // Delete user from the database
    let result = await db.query(
      `DELETE
       FROM users
       WHERE username = $1
       RETURNING username`,
      [username],
    );
    const user = result.rows[0];

    // Throw NotFoundError if user not found
    if (!user) throw new NotFoundError(`No user: ${username}`);
  }

  /**
   * Apply for a job with provided username and job ID.
   * Throws NotFoundError if job or username not found.
   **/
  static async applyToJob(jobId, username) {
    // Check if the job exists
    const preCheck = await db.query(
      `SELECT id
       FROM jobs
       WHERE id = $1`, [jobId]);
    const job = preCheck.rows[0];

    if (!job) throw new NotFoundError(`No job: ${jobId}`);

    // Check if the username exists
    const preCheck2 = await db.query(
      `SELECT username
       FROM users
       WHERE username = $1`, [username]);
    const user = preCheck2.rows[0];

    if (!user) throw new NotFoundError(`No username: ${username}`);

    // Insert application into the database
    await db.query(
      `INSERT INTO applications (job_id, username)
       VALUES ($1, $2)`,
      [jobId, username]);

    return jobId;
  }
}

module.exports = User;
