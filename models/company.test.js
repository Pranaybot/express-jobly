"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    // Try to create a new company
    let company = await Company.create(newCompany);
    // Check if the created company matches the expected data
    expect(company).toEqual(newCompany);

    // Query the database to check if the company was inserted correctly
    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`);
    // Check if the inserted company data matches the expected data
    expect(result.rows).toEqual([
      {
        handle: "new",
        name: "New",
        description: "New Description",
        num_employees: 1,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      // Try to create a new company with duplicate handle
      await Company.create(newCompany);
      await Company.create(newCompany);
      // Fail the test if duplicate creation succeeds
      fail();
    } catch (err) {
      // Check if BadRequestError is thrown as expected
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    // Retrieve all companies from the database
    let companies = await Company.findAll();
    // Check if the retrieved companies match the expected data
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
      {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    // Retrieve a specific company from the database
    let company = await Company.get("c1");
    // Check if the retrieved company matches the expected data
    expect(company).toEqual({
      handle: "c1",
      name: "C1",
      description: "Desc1",
      numEmployees: 1,
      logoUrl: "http://c1.img",
    });
  });

  test("not found if no such company", async function () {
    try {
      // Try to retrieve a company that doesn't exist
      await Company.get("nope");
      // Fail the test if NotFoundError is not thrown
      fail();
    } catch (err) {
      // Check if NotFoundError is thrown as expected
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    name: "New",
    description: "New Description",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    // Update an existing company with new data
    let company = await Company.update("c1", updateData);
    // Check if the updated company matches the expected data
    expect(company).toEqual({
      handle: "c1",
      ...updateData,
    });

    // Query the database to check if the company was updated correctly
    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    // Check if the updated company data matches the expected data
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: 10,
      logo_url: "http://new.img",
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      name: "New",
      description: "New Description",
      numEmployees: null,
      logoUrl: null,
    };

    // Update an existing company with new data containing null fields
    let company = await Company.update("c1", updateDataSetNulls);
    // Check if the updated company matches the expected data
    expect(company).toEqual({
      handle: "c1",
      ...updateDataSetNulls,
    });

    // Query the database to check if the company was updated correctly
    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    // Check if the updated company data matches the expected data
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: null,
      logo_url: null,
    }]);
  });

  test("not found if no such company", async function () {
    try {
      // Try to update a company that doesn't exist
      await Company.update("nope", updateData);
      // Fail the test if NotFoundError is not thrown
      fail();
    } catch (err) {
      // Check if NotFoundError is thrown as expected
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      // Try to update a company with no data
      await Company.update("c1", {});
      // Fail the test if BadRequestError is not thrown
      fail();
    } catch (err) {
      // Check if BadRequestError is thrown as expected
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    // Remove an existing company from the database
    await Company.remove("c1");
    // Query the database to check if the company was removed correctly
    const res = await db.query(

