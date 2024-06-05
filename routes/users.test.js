"use strict"; // Use strict mode to catch common coding mistakes

// Import necessary modules and dependencies
const request = require("supertest"); // Library for testing HTTP servers
const db = require("../db.js"); // Import the database module
const app = require("../app"); // Import the main Express application
const User = require("../models/user"); // Import the User model

// Import common functions and data used in tests
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
  u1Token,
  u2Token,
  adminToken,
} = require("./_testCommon");

// Setup before and after each test suite
beforeAll(commonBeforeAll); // Run common functions before all tests in the suite
beforeEach(commonBeforeEach); // Run common functions before each test in the suite
afterEach(commonAfterEach); // Run common functions after each test in the suite
afterAll(commonAfterAll); // Run common functions after all tests in the suite

/************************************** POST /users */

// Test suite for creating new users via POST request
describe("POST /users", function () {
  // Test case for creating a non-admin user by an admin
  test("works for admins: create non-admin", async function () {
    // Make a POST request to create a new user
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: false,
      },
      token: expect.any(String),
    });
  });

  // Test case for creating an admin user by an admin
  test("works for admins: create admin", async function () {
    // Make a POST request to create a new admin user
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: true,
      },
      token: expect.any(String),
    });
  });

  // Test case for unauthorized access by regular users
  test("unauth for users", async function () {
    // Make a POST request by a regular user
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${u1Token}`);
    // Verify the response
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for unauthorized access by anonymous users
  test("unauth for anon", async function () {
    // Make a POST request without authentication
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      });
    // Verify the response
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for bad request if data is missing
  test("bad request if missing data", async function () {
    // Make a POST request with incomplete data
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response
    expect(resp.statusCode).toEqual(400);
  });

  // Test case for bad request if data is invalid
  test("bad request if invalid data", async function () {
    // Make a POST request with invalid email format
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "not-an-email",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response
    expect(resp.statusCode).toEqual(400);
  });
});


/************************************** GET /users */

// Test suite for retrieving all users including applied job IDs
describe("GET /users", function () {
  // Test case for retrieving all users by an admin
  test("works for admins", async function () {
    // Make a GET request to retrieve all users with admin authorization
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response matches the expected user data
    expect(resp.body).toEqual({
      users: [
        {
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          email: "user1@user.com",
          isAdmin: false,
          jobs: [1], // Include applied job IDs
        },
        {
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          email: "user2@user.com",
          isAdmin: false,
          jobs: [], // No jobs applied for
        },
        {
          username: "u3",
          firstName: "U3F",
          lastName: "U3L",
          email: "user3@user.com",
          isAdmin: false,
          jobs: [], // No jobs applied for
        },
      ],
    });
  });

  // Test case for unauthorized access by non-admin users
  test("unauth for non-admin users", async function () {
    // Make a GET request to retrieve all users without admin authorization
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${u1Token}`);
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for unauthorized access by anonymous users
  test("unauth for anon", async function () {
    // Make a GET request to retrieve all users without authentication
    const resp = await request(app)
      .get("/users");
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case to simulate a failure event
  test("fails: test next() handler", async function () {
    // Drop the users table from the database to simulate a failure
    await db.query("DROP TABLE users CASCADE");
    // Make a GET request to retrieve all users (should fail)
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response status code is 500 (Internal Server Error)
    expect(resp.statusCode).toEqual(500);
  });
});


/************************************** GET /users/:username */

// Test suite for retrieving a single user by username
describe("GET /users/:username", function () {
  // Test case for retrieving a user by username with admin authorization
  test("works for admin", async function () {
    // Make a GET request to retrieve a user by username with admin authorization
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response matches the expected user data
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
        applications: [testJobIds[0]],
      },
    });
  });

  // Test case for retrieving the logged-in user's own data
  test("works for same user", async function () {
    // Make a GET request to retrieve the logged-in user's own data
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${u1Token}`);
    // Verify the response matches the expected user data
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
        applications: [testJobIds[0]],
      },
    });
  });

  // Test case for unauthorized access by other users
  test("unauth for other users", async function () {
    // Make a GET request to retrieve a user's data by another user
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${u2Token}`);
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for unauthorized access by anonymous users
  test("unauth for anon", async function () {
    // Make a GET request to retrieve a user's data without authentication
    const resp = await request(app)
      .get(`/users/u1`);
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for user not found
  test("not found if user not found", async function () {
    // Make a GET request to retrieve a non-existent user's data with admin authorization
    const resp = await request(app)
      .get(`/users/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response status code is 404 (Not Found)
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /users/:username */

// Test suite for updating user data via PATCH request
describe("PATCH /users/:username", () => {
  // Test case for updating user data by an admin
  test("works for admins", async function () {
    // Make a PATCH request to update user data with admin authorization
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: "New", // Update first name
      })
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response matches the updated user data
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "New", // Updated first name
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  // Test case for updating user data by the same user
  test("works for same user", async function () {
    // Make a PATCH request to update user data by the same user
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: "New", // Update first name
      })
      .set("authorization", `Bearer ${u1Token}`);
    // Verify the response matches the updated user data
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "New", // Updated first name
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  // Test case for unauthorized access if not the same user
  test("unauth if not same user", async function () {
    // Make a PATCH request to update user data by a different user
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: "New", // Update first name
      })
      .set("authorization", `Bearer ${u2Token}`);
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for unauthorized access by anonymous users
  test("unauth for anon", async function () {
    // Make a PATCH request to update user data without authentication
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: "New", // Update first name
      });
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for user not found
  test("not found if no such user", async function () {
    // Make a PATCH request to update user data for a non-existent user
    const resp = await request(app)
      .patch(`/users/nope`)
      .send({
        firstName: "Nope", // Update first name
      })
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response status code is 404 (Not Found)
    expect(resp.statusCode).toEqual(404);
  });

  // Test case for bad request if data is invalid
  test("bad request if invalid data", async function () {
    // Make a PATCH request with invalid data type for first name
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: 42, // Invalid data type for first name
      })
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response status code is 400 (Bad Request)
    expect(resp.statusCode).toEqual(400);
  });

  // Test case for setting a new password
  test("works: can set new password", async function () {
    // Make a PATCH request to set a new password for the user
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        password: "new-password", // Set new password
      })
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response matches the updated user data
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
    // Verify the new password is successfully authenticated
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });
});

/************************************** DELETE /users/:username */

// Test suite for deleting user data via DELETE request
describe("DELETE /users/:username", function () {
  // Test case for deleting a user by an admin
  test("works for admin", async function () {
    // Make a DELETE request to delete a user with admin authorization
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response indicates successful deletion of the user
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  // Test case for deleting own user account by the same user
  test("works for same user", async function () {
    // Make a DELETE request to delete own user account with user's authorization
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${u1Token}`);
    // Verify the response indicates successful deletion of the user
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  // Test case for unauthorized access if not the same user
  test("unauth if not same user", async function () {
    // Make a DELETE request to delete a user account by a different user
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${u2Token}`);
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for unauthorized access by anonymous users
  test("unauth for anon", async function () {
    // Make a DELETE request to delete a user account without authentication
    const resp = await request(app)
      .delete(`/users/u1`);
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for user not found
  test("not found if user missing", async function () {
    // Make a DELETE request to delete a non-existent user account
    const resp = await request(app)
      .delete(`/users/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response status code is 404 (Not Found)
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** POST /users/:username/jobs/:id */

// Test suite for applying to a job via POST request
describe("POST /users/:username/jobs/:id", function () {
  // Test case for applying to a job by an admin
  test("works for admin", async function () {
    // Make a POST request to apply to a job with admin authorization
    const resp = await request(app)
      .post(`/users/u1/jobs/${testJobIds[1]}`)
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response indicates successful job application
    expect(resp.body).toEqual({ applied: testJobIds[1] });
  });

  // Test case for applying to a job by the same user
  test("works for same user", async function () {
    // Make a POST request to apply to a job by the same user
    const resp = await request(app)
      .post(`/users/u1/jobs/${testJobIds[1]}`)
      .set("authorization", `Bearer ${u1Token}`);
    // Verify the response indicates successful job application
    expect(resp.body).toEqual({ applied: testJobIds[1] });
  });

  // Test case for unauthorized access for other users
  test("unauth for others", async function () {
    // Make a POST request to apply to a job by a different user
    const resp = await request(app)
      .post(`/users/u1/jobs/${testJobIds[1]}`)
      .set("authorization", `Bearer ${u2Token}`);
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for unauthorized access by anonymous users
  test("unauth for anon", async function () {
    // Make a POST request to apply to a job without authentication
    const resp = await request(app)
      .post(`/users/u1/jobs/${testJobIds[1]}`);
    // Verify the response status code is 401 (Unauthorized)
    expect(resp.statusCode).toEqual(401);
  });

  // Test case for user not found for job application
  test("not found for no such username", async function () {
    // Make a POST request to apply to a job for a non-existent user
    const resp = await request(app)
      .post(`/users/nope/jobs/${testJobIds[1]}`)
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response status code is 404 (Not Found)
    expect(resp.statusCode).toEqual(404);
  });

  // Test case for job not found for job application
  test("not found for no such job", async function () {
    // Make a POST request to apply to a non-existent job
    const resp = await request(app)
      .post(`/users/u1/jobs/0`)
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response status code is 404 (Not Found)
    expect(resp.statusCode).toEqual(404);
  });

  // Test case for bad request with invalid job id
  test("bad request invalid job id", async function () {
    // Make a POST request to apply to a job with an invalid job id
    const resp = await request(app)
      .post(`/users/u1/jobs/0`)
      .set("authorization", `Bearer ${adminToken}`);
    // Verify the response status code is 404 (Not Found)
    expect(resp.statusCode).toEqual(404);
  });
});
