"use strict";

// Importing necessary modules
const request = require("supertest"); // For making HTTP requests
const app = require("../app"); // Importing the Express application
const {
  // Importing helper functions and data for testing
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
  u1Token,
  adminToken,
} = require("./_testCommon");

// Setting up common tasks before and after tests
beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

// Test suite for creating new jobs
describe("POST /jobs", function () {

  // Test for creating a job by an admin user
  test("ok for admin", async function () {
    const resp = await request(app)
        .post(`/jobs`)
        .send({
          companyHandle: "c1",
          title: "J-new",
          salary: 10,
          equity: "0.2",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201); // Expecting a successful creation (status code 201)
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number), // Expecting the response to contain an ID (any number)
        title: "J-new",
        salary: 10,
        equity: "0.2",
        companyHandle: "c1",
      },
    });
  });

  // Test for unauthorized access by regular users
  test("unauth for users", async function () {
    const resp = await request(app)
        .post(`/jobs`)
        .send({
          companyHandle: "c1",
          title: "J-new",
          salary: 10,
          equity: "0.2",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401); // Expecting a status code 401 (Unauthorized)
  });

  // Test for bad request due to missing data
  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post(`/jobs`)
        .send({
          companyHandle: "c1",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400); // Expecting a status code 400 (Bad Request)
  });

  // Test for bad request due to invalid data
  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post(`/jobs`)
        .send({
          companyHandle: "c1",
          title: "J-new",
          salary: "not-a-number",
          equity: "0.2",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400); // Expecting a status code 400 (Bad Request)
  });

});

/************************************** GET /jobs */

// Test suite for retrieving jobs
describe("GET /jobs", function () {

  // Test for retrieving jobs by anonymous users
  test("ok for anon", async function () {
    const resp = await request(app).get(`/jobs`);
    expect(resp.body).toEqual({
          jobs: [
            {
              id: expect.any(Number),
              title: "J1",
              salary: 1,
              equity: "0.1",
              companyHandle: "c1",
              companyName: "C1",
            },
            {
              id: expect.any(Number),
              title: "J2",
              salary: 2,
              equity: "0.2",
              companyHandle: "c1",
              companyName: "C1",
            },
            {
              id: expect.any(Number),
              title: "J3",
              salary: 3,
              equity: null,
              companyHandle: "c1",
              companyName: "C1",
            },
          ],
        },
    );
  });

  // Test for filtering jobs with equity
  test("works: filtering", async function () {
    const resp = await request(app)
        .get(`/jobs`)
        .query({ hasEquity: true });
    expect(resp.body).toEqual({
          jobs: [
            {
              id: expect.any(Number),
              title: "J1",
              salary: 1,
              equity: "0.1",
              companyHandle: "c1",
              companyName: "C1",
            },
            {
              id: expect.any(Number),
              title: "J2",
              salary: 2,
              equity: "0.2",
              companyHandle: "c1",
              companyName: "C1",
            },
          ],
        },
    );
  });

  // Test for filtering jobs based on multiple criteria
  test("works: filtering on 2 filters", async function () {
    const resp = await request(app)
        .get(`/jobs`)
        .query({ minSalary: 2, title: "3" });
    expect(resp.body).toEqual({
          jobs: [
            {
              id: expect.any(Number),
              title: "J3",
              salary: 3,
              equity: null,
              companyHandle: "c1",
              companyName: "C1",
            },
          ],
        },
    );
  });

  // Test for bad request with invalid filter key
  test("bad request on invalid filter key", async function () {
    const resp = await request(app)
        .get(`/jobs`)
        .query({ minSalary: 2, nope: "nope" });
    expect(resp.statusCode).toEqual(400); // Expecting a status code 400 (Bad Request)
  });
});

/************************************** GET /jobs/:id */

// Test suite for retrieving a specific job by ID
describe("GET /jobs/:id", function () {

  // Test for retrieving a job by anonymous user
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/${testJobIds[0]}`);
    expect(resp.body).toEqual({
      job: {
        id: testJobIds[0],
        title: "J1",
        salary: 1,
        equity: "0.1",
        company: {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
      },
    });
  });

  // Test for job not found
  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404); // Expecting a status code 404 (Not Found)
  });
});

/************************************** PATCH /jobs/:id */

// Test suite for updating a job by ID
describe("PATCH /jobs/:id", function () {

  // Test for updating a job by an admin user
  test("works for admin", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJobIds[0]}`) // Patch request to update job with the specified ID
        .send({
          title: "J-New", // Updating job title
        })
        .set("authorization", `Bearer ${adminToken}`); // Setting authorization header for admin user
    expect(resp.body).toEqual({
      job: { // Expecting the updated job details in the response
        id: expect.any(Number), // Expecting an ID of type Number
        title: "J-New", // Expecting the title to be updated
        salary: 1, // Expecting the salary to remain unchanged
        equity: "0.1", // Expecting the equity to remain unchanged
        companyHandle: "c1", // Expecting the company handle to remain unchanged
      },
    });
  });

  // Test for unauthorized access by users other than admin
  test("unauth for others", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJobIds[0]}`) // Patch request to update job with the specified ID
        .send({
          title: "J-New", // Attempting to update job title
        })
        .set("authorization", `Bearer ${u1Token}`); // Setting authorization header for regular user
    expect(resp.statusCode).toEqual(401); // Expecting a status code 401 (Unauthorized)
  });

  // Test for attempting to update a non-existent job
  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/0`) // Patch request to update a job with non-existent ID
        .send({
          handle: "new", // Attempting to update job handle (invalid operation)
        })
        .set("authorization", `Bearer ${adminToken}`); // Setting authorization header for admin user
    expect(resp.statusCode).toEqual(400); // Expecting a status code 400 (Bad Request)
  });

  // Test for attempting to change job handle (which should not be allowed)
  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJobIds[0]}`) // Patch request to update job with the specified ID
        .send({
          handle: "new", // Attempting to update job handle (invalid operation)
        })
        .set("authorization", `Bearer ${adminToken}`); // Setting authorization header for admin user
    expect(resp.statusCode).toEqual(400); // Expecting a status code 400 (Bad Request)
  });

  // Test for bad request due to invalid data
  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJobIds[0]}`) // Patch request to update job with the specified ID
        .send({
          salary: "not-a-number", // Attempting to update salary with invalid data
        })
        .set("authorization", `Bearer ${adminToken}`); // Setting authorization header for admin user
    expect(resp.statusCode).toEqual(400); // Expecting a status code 400 (Bad Request)
  });
});


/************************************** DELETE /jobs/:id */

// Test suite for deleting a job by ID
describe("DELETE /jobs/:id", function () {

  // Test for deleting a job by an admin user
  test("works for admin", async function () {
    const resp = await request(app)
        .delete(`/jobs/${testJobIds[0]}`) // Delete request to delete job with the specified ID
        .set("authorization", `Bearer ${adminToken}`); // Setting authorization header for admin user
    expect(resp.body).toEqual({ deleted: testJobIds[0] }); // Expecting the response body to confirm deletion
  });

  // Test for unauthorized access by users other than admin
  test("unauth for others", async function () {
    const resp = await request(app)
        .delete(`/jobs/${testJobIds[0]}`) // Delete request to delete job with the specified ID
        .set("authorization", `Bearer ${u1Token}`); // Setting authorization header for regular user
    expect(resp.statusCode).toEqual(401); // Expecting a status code 401 (Unauthorized)
  });

  // Test for unauthorized access by anonymous users
  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/jobs/${testJobIds[0]}`); // Delete request to delete job with the specified ID
    expect(resp.statusCode).toEqual(401); // Expecting a status code 401 (Unauthorized)
  });

  // Test for attempting to delete a non-existent job
  test("not found for no such job", async function () {
    const resp = await request(app)
        .delete(`/jobs/0`) // Delete request to delete a job with non-existent ID
        .set("authorization", `Bearer ${adminToken}`); // Setting authorization header for admin user
    expect(resp.statusCode).toEqual(404); // Expecting a status code 404 (Not Found)
  });
});
