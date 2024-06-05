"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");
const companySearchSchema = require("../schemas/companySearch.json");

const router = new express.Router();

/**
 * POST / { company } =>  { company }
 *
 * Adds a new company. Company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns the newly created company: { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: admin
 *
 * Validates the request body against the companyNewSchema.
 * Throws BadRequestError if validation fails.
 */
router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - name (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 *
 * Validates the query parameters against the companySearchSchema.
 * Returns a 400 error if minEmployees is greater than maxEmployees.
 * Throws BadRequestError if validation fails.
 */
router.get("/", async function (req, res, next) {
  const q = req.query;
  // Convert query string values to integers where necessary
  if (q.minEmployees !== undefined) q.minEmployees = +q.minEmployees;
  if (q.maxEmployees !== undefined) q.maxEmployees = +q.maxEmployees;

  // Check if minEmployees is greater than maxEmployees
  if (q.minEmployees !== undefined && q.maxEmployees !== undefined && q.minEmployees > q.maxEmployees) {
    throw new BadRequestError("minEmployees cannot be greater than maxEmployees");
  }

  try {
    const validator = jsonschema.validate(q, companySearchSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const companies = await Company.findAll(q);
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /[handle]  =>  { company }
 *
 * Returns a specific company by handle.
 * Company is { handle, name, description, numEmployees, logoUrl, jobs }
 * where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 *
 * Throws NotFoundError if the company is not found.
 */
router.get("/:handle", async function (req, res, next) {
  try {
    const company = await Company.get(req.params.handle);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * Fields can be: { name, description, numEmployees, logoUrl }
 *
 * Returns the updated company: { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: admin
 *
 * Validates the request body against the companyUpdateSchema.
 * Throws BadRequestError if validation fails.
 */
router.patch("/:handle", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /[handle]  =>  { deleted: handle }
 *
 * Deletes a specific company by handle.
 *
 * Returns { deleted: handle }
 *
 * Authorization required: admin
 *
 * Throws NotFoundError if the company is not found.
 */
router.delete("/:handle", ensureAdmin, async function (req, res, next) {
  try {
    await Company.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
