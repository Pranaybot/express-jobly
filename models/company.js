"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */
class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */
  static async create({ handle, name, description, numEmployees, logoUrl }) {
    // Check if the company already exists
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    // If company already exists, throw BadRequestError
    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    // Insert new company into the database
    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    // Return the newly created company data
    const company = result.rows[0];
    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */
  static async findAll() {
    // Retrieve all companies from the database
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/
  static async get(handle) {
    // Retrieve company data and its jobs in a single query
    const result = await db.query(
          `SELECT c.handle,
                  c.name,
                  c.description,
                  c.num_employees AS "numEmployees",
                  c.logo_url AS "logoUrl",
                  j.id AS job_id,
                  j.title AS job_title,
                  j.salary AS job_salary,
                  j.equity AS job_equity,
                  j.company_handle AS job_companyHandle
           FROM companies c
           LEFT JOIN jobs j ON c.handle = j.company_handle
           WHERE c.handle = $1`,
        [handle]);

    // If no rows are returned, throw NotFoundError
    if (result.rows.length === 0) throw new NotFoundError(`No company: ${handle}`);

    // Extract company data from the first row
    const { handle: companyHandle, name, description, numEmployees, logoUrl } = result.rows[0];

    // Extract jobs data
    const jobs = result.rows
      .filter(row => row.job_id !== null)
      .map(row => ({
        id: row.job_id,
        title: row.job_title,
        salary: row.job_salary,
        equity: row.job_equity,
        companyHandle: row.job_companyHandle
      }));

    // Construct the company object
    const company = {
      handle: companyHandle,
      name,
      description,
      numEmployees,
      logoUrl,
      jobs
    };

    // Return the combined company and jobs data
    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */
  static async update(handle, data) {
    // Generate SQL for partial update and extract values
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    // Update company data in the database
    const querySql = `UPDATE companies
                      SET ${setCols}
                      WHERE handle = ${handleVarIdx}
                      RETURNING handle,
                                name,
                                description,
                                num_employees AS "numEmployees",
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);

    // If company is not found, throw NotFoundError
    const company = result.rows[0];
    if (!company) throw new NotFoundError(`No company: ${handle}`);

    // Return the updated company data
    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/
  static async remove(handle) {
    // Delete company from the database based on handle
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);

    // If company is not found, throw NotFoundError
    const company = result.rows[0];
    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
