"use strict";

// Import necessary modules and dependencies
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");
const db = require("../db.js");
const User = require("./user.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

// Setup before and after functions to ensure common actions are executed
beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** authenticate */

// Test suite for the authenticate method
describe("authenticate", function () {
  // Test case to ensure successful authentication
  test("works", async function () {
    const user = await User.authenticate("u1", "password1");
    expect(user).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      isAdmin: false,
    });
  });

  // Test case to ensure unauthorized access if user does not exist
  test("unauth if no such user", async function () {
    try {
      await User.authenticate("nope", "password");
      fail();
    } catch (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    }
  });

  // Test case to ensure unauthorized access if wrong password is provided
  test("unauth if wrong password", async function () {
    try {
      await User.authenticate("c1", "wrong");
      fail();
    } catch (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    }
  });
});

/************************************** register */

// Test suite for the register method
describe("register", function () {
  // Data for creating a new user
  const newUser = {
    username: "new",
    firstName: "Test",
    lastName: "Tester",
    email: "test@test.com",
    isAdmin: false,
  };

  // Test case to ensure successful user registration
  test("works", async function () {
    let user = await User.register({
      ...newUser,
      password: "password",
    });
    expect(user).toEqual(newUser);
    const found = await db.query("SELECT * FROM users WHERE username = 'new'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].is_admin).toEqual(false);
    expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
  });

  // Test case to ensure successful user registration with admin privileges
  test("works: adds admin", async function () {
    let user = await User.register({
      ...newUser,
      password: "password",
      isAdmin: true,
    });
    expect(user).toEqual({ ...newUser, isAdmin: true });
    const found = await db.query("SELECT * FROM users WHERE username = 'new'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].is_admin).toEqual(true);
    expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
  });

  // Test case to ensure BadRequestError is thrown for duplicate user data
  test("bad request with dup data", async function () {
    try {
      await User.register({
        ...newUser,
        password: "password",
      });
      await User.register({
        ...newUser,
        password: "password",
      });
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});


/************************************** findAllWithAppliedJobs */

describe("findAll", function () {
  // Test to ensure that findAll method returns all users
  test("works", async function () {
    // Call the findAll method from the User class
    const users = await User.findAll();

    // Assert that the returned users match the expected output
    expect(users).toEqual([
      {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "u1@email.com",
        isAdmin: false,
      },
      {
        username: "u2",
        firstName: "U2F",
        lastName: "U2L",
        email: "u2@email.com",
        isAdmin: false,
      },
    ]);
  });

  // Test to ensure that findAll method handles no users found
  test("works when no users found", async function () {
    // Clear all users from the test database
    await db.query("DELETE FROM users");

    // Call the findAll method from the User class
    const users = await User.findAll();

    // Assert that no users are returned
    expect(users).toEqual([]);
  });

  // Test to ensure that findAll method handles database errors
  test("throws error on database error", async function () {
    // Mock the database query function to throw an error
    db.query = jest.fn().mockRejectedValue(new Error("Database error"));

    // Call the findAll method from the User class
    try {
      await User.findAll();
      fail(); // Fail if no error is thrown
    } catch (err) {
      // Assert that the error is an instance of Error
      expect(err instanceof Error).toBeTruthy();
    }
  });
});

/************************************** get */

// Test suite for the get method
describe("get", function () {
  // Test case to ensure successful retrieval of user data
  test("works", async function () {
    let user = await User.get("u1");
    expect(user).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      isAdmin: false,
    });
  });

  // Test case to ensure NotFoundError is thrown if user does not exist
  test("not found if no such user", async function () {
    try {
      await User.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

// Test suite for the update method
describe("update", function () {
  // Data for updating user information
  const updateData = {
    firstName: "NewF",
    lastName: "NewF",
    email: "new@email.com",
    isAdmin: true,
  };

  // Test case to ensure successful update of user data
  test("works", async function () {
    let job = await User.update("u1", updateData);
    expect(job).toEqual({
      username: "u1",
      ...updateData,
    });
  });

  // Test case to ensure successful update of user password
  test("works: set password", async function () {
    let job = await User.update("u1", {
      password: "new",
    });
    expect(job).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      isAdmin: false,
    });
    const found = await db.query("SELECT * FROM users WHERE username = 'u1'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
  });

  // Test case to ensure NotFoundError is thrown if user does not exist
  test("not found if no such user", async function () {
    try {
      await User.update("nope", {
        firstName: "test",
      });
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  // Test case to ensure BadRequestError is thrown if no update data is provided
  test("bad request if no data", async function () {
    expect.assertions(1);
    try {
      await User.update("c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

// Test suite for the remove method
describe("remove", function () {
  // Test case to ensure successful removal of user
  test("works", async function () {
    await User.remove("u1");
    const res = await db.query(
      "SELECT * FROM users WHERE username='u1'"
    );
    expect(res.rows.length).toEqual(0);
  });

  // Test case to ensure NotFoundError is thrown if user does not exist
  test("not found if no such user", async function () {
    try {
      await User.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** applyToJob */

describe("applyToJob", function () {
  // Test to ensure that user can apply to a job successfully
  test("works", async function () {
    // Call the applyToJob method from the User class
    await User.applyToJob("u1", 1);

    // Retrieve the application from the database
    const application = await db.query(
      "SELECT * FROM applications WHERE username = 'u1' AND job_id = 1"
    );

    // Assert that the application is created in the database
    expect(application.rows.length).toEqual(1);
  });

  // Test to ensure that applying to a non-existing job throws a NotFoundError
  test("throws NotFoundError if no such job", async function () {
    // Call the applyToJob method from the User class with a non-existing job ID
    try {
      await User.applyToJob("u1", 9999);
      fail();
    } catch (err) {
      // Assert that the error is an instance of NotFoundError
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  // Test to ensure that applying with a non-existing username throws a NotFoundError
  test("throws NotFoundError if no such user", async function () {
    // Call the applyToJob method from the User class with a non-existing username
    try {
      await User.applyToJob("nope", 1);
      fail();
    } catch (err) {
      // Assert that the error is an instance of NotFoundError
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

