"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearch.json");

// Create a new router instance
const router = express.Router({ mergeParams: true });

/** POST / { job } => { job }
 *
 * Create a new job.
 * Request body should contain: { title, salary, equity, companyHandle }
 * Returns the created job: { id, title, salary, equity, companyHandle }
 * Authorization required: admin
 */
router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    // Validate request body against schema
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    // Create the job
    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET / =>
 * Retrieve all jobs or filter jobs based on query parameters.
 * Query parameters:
 * - minSalary: minimum salary (cannot be null)
 * - hasEquity: filter by equity (returns true only jobs with equity > 0
     and false if equity === 0)
 * - title: filter by job title
 * Returns an array of jobs: { jobs: [ { id, title, salary, equity, companyHandle, companyName }, ...] }
 * Authorization required: none
 */
router.get("/", async function (req, res, next) {
  const q = req.query;
  // Convert query string values to appropriate types
  if (q.minSalary !== undefined){
    if(q.minSalary !== null) {
        q.minSalary = +q.minSalary;
    }
  }

  if (q.equity !== undefined){
    if(q.equity !== null && parseFloat(q.equity) > 0){
        q.hasEquity = q.hasEquity === "true";
    } else if (q.equity !== null && parseFloat(q.equity) === 0) {
        q.hasEquity = q.hasEquity === "false";
    }
  }

  if (req.query.hasOwnProperty('title')){
    if(req.query.title !== undefined && req.query.title !== null){
        q.title = req.query.title
    }
  }

  try {
    // Validate query parameters against schema
    const validator = jsonschema.validate(q, jobSearchSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    // Find all jobs based on query
    const jobs = await Job.findAll(q);
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[jobId] => { job }
 *
 * Retrieve a specific job by its ID.
 * Returns the job: { id, title, salary, equity, company }
 * where company is { handle, name, description, numEmployees, logoUrl }
 * Authorization required: none
 */
router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[jobId]  { fld1, fld2, ... } => { job }
 *
 * Update a specific job by its ID.
 * Request body can include fields to update: { title, salary, equity }
 * Returns the updated job: { id, title, salary, equity, companyHandle }
 * Authorization required: admin
 */
router.patch("/:id", ensureAdmin, async function (req, res, next) {
  try {
    // Validate request body against schema
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    // Update the job
    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]  =>  { deleted: id }
 *
 * Delete a specific job by its ID.
 * Returns { deleted: id }
 * Authorization required: admin
 */
router.delete("/:id", ensureAdmin, async function (req, res, next) {
  try {
    // Remove the job
    await Job.remove(req.params.id);
    return res.json({ deleted: +req.params.id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
