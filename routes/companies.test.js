"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("ok for users", async function () {
    // Try to create a new company
    const resp = await request(app)
        .post("/companies")
        .send(newCompany)
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the request is successful
    expect(resp.statusCode).toEqual(201);
    // Check if the response body matches the expected data
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("bad request with missing data", async function () {
    // Try to create a new company with missing data
    const resp = await request(app)
        .post("/companies")
        .send({
          handle: "new",
          numEmployees: 10,
        })
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the request returns a bad request error
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    // Try to create a new company with invalid data
    const resp = await request(app)
        .post("/companies")
        .send({
          ...newCompany,
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the request returns a bad request error
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    // Retrieve all companies
    const resp = await request(app).get("/companies");
    // Check if the response body matches the expected data
    expect(resp.body).toEqual({
      companies:
          [
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
          ],
    });
  });

  test("fails: test next() handler", async function () {
    // Cause an error to test error handling
    await db.query("DROP TABLE companies CASCADE");
    // Send a request to retrieve all companies
    const resp = await request(app)
        .get("/companies")
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the response status code indicates a server error
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    // Retrieve a specific company by handle
    const resp = await request(app).get(`/companies/c1`);
    // Check if the response body matches the expected data
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    // Retrieve a specific company by handle
    const resp = await request(app).get(`/companies/c2`);
    // Check if the response body matches the expected data
    expect(resp.body).toEqual({
      company: {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
    });
  });

  test("not found for no such company", async function () {
    // Retrieve a non-existent company by handle
    const resp = await request(app).get(`/companies/nope`);
    // Check if the response status code indicates not found
    expect(resp.statusCode).toEqual(404);
  });
});
/************************************** PATCH /companies/:handle */

// Test suite for updating a company via PATCH request
describe("PATCH /companies/:handle", function () {
  // Test case: update a company successfully
  test("works for users", async function () {
    // Send a PATCH request to update company 'c1'
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          name: "C1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the response body matches the updated company data
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  // Test case: unauthorized user attempts to update a company
  test("unauth for anon", async function () {
    // Send a PATCH request without authentication
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          name: "C1-new",
        });
    // Check if the response status code indicates unauthorized access
    expect(resp.statusCode).toEqual(401);
  });

  // Test case: update a non-existent company
  test("not found on no such company", async function () {
    // Send a PATCH request to update a non-existent company
    const resp = await request(app)
        .patch(`/companies/nope`)
        .send({
          name: "new nope",
        })
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the response status code indicates company not found
    expect(resp.statusCode).toEqual(404);
  });

  // Test case: attempt to change the handle while updating a company
  test("bad request on handle change attempt", async function () {
    // Send a PATCH request with an attempt to change the company handle
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          handle: "c1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the response status code indicates a bad request
    expect(resp.statusCode).toEqual(400);
  });

  // Test case: attempt to update a company with invalid data
  test("bad request on invalid data", async function () {
    // Send a PATCH request with invalid data to update a company
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the response status code indicates a bad request
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

// Test suite for deleting a company via DELETE request
describe("DELETE /companies/:handle", function () {
  // Test case: delete a company successfully
  test("works for users", async function () {
    // Send a DELETE request to delete company 'c1'
    const resp = await request(app)
        .delete(`/companies/c1`)
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the response body indicates the deleted company
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  // Test case: unauthorized user attempts to delete a company
  test("unauth for anon", async function () {
    // Send a DELETE request without authentication
    const resp = await request(app)
        .delete(`/companies/c1`);
    // Check if the response status code indicates unauthorized access
    expect(resp.statusCode).toEqual(401);
  });

  // Test case: attempt to delete a non-existent company
  test("not found for no such company", async function () {
    // Send a DELETE request to delete a non-existent company
    const resp = await request(app)
        .delete(`/companies/nope`)
        .set("authorization", `Bearer ${u1Token}`);
    // Check if the response status code indicates company not found
    expect(resp.statusCode).toEqual(404);
  });
});
