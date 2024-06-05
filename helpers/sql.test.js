const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");

describe("sqlForPartialUpdate", function () {
  test("works: 1 item", function () {
    // Test with a single item to update
    const result = sqlForPartialUpdate(
        { f1: "v1" },
        { f1: "f1", fF2: "f2" });
    expect(result).toEqual({
      setCols: "\"f1\"=$1",
      values: ["v1"],
    });
  });

  test("works: 2 items", function () {
    // Test with two items to update
    const result = sqlForPartialUpdate(
        { f1: "v1", jsF2: "v2" },
        { jsF2: "f2" });
    expect(result).toEqual({
      setCols: "\"f1\"=$1, \"f2\"=$2",
      values: ["v1", "v2"],
    });
  });

  // Additional test cases
  test("throws BadRequestError if no data", function () {
    // Test that an empty dataToUpdate object throws an error
    expect(() => {
      sqlForPartialUpdate({}, { jsF2: "f2" });
    }).toThrow(BadRequestError);
  });

  test("falls back to original name if no jsToSql mapping", function () {
    // Test that the original key is used if there is no jsToSql mapping
    const result = sqlForPartialUpdate(
        { f1: "v1", f2: "v2" },
        { jsF1: "f1" });
    expect(result).toEqual({
      setCols: "\"f1\"=$1, \"f2\"=$2",
      values: ["v1", "v2"],
    });
  });

  test("handles special characters in keys", function () {
    // Test that keys with special characters are handled correctly
    const result = sqlForPartialUpdate(
        { "f1": "v1", "f2-special": "v2" },
        { "f2-special": "f2_special" });
    expect(result).toEqual({
      setCols: "\"f1\"=$1, \"f2_special\"=$2",
      values: ["v1", "v2"],
    });
  });

  test("handles SQL injection attempts safely", function () {
    // Test that SQL injection attempts are handled safely by parameterizing inputs
    const result = sqlForPartialUpdate(
        { "f1": "v1", "f2; \"DROP TABLE users; --": "v2" },
        { "f2; \"DROP TABLE users; --": "f2" });
    expect(result).toEqual({
      setCols: "\"f1\"=$1, \"f2\"=$2",
      values: ["v1", "v2"],
    });
  });

  test("works: multiple mappings", function () {
    // Test with multiple items to update, including multiple mappings
    const result = sqlForPartialUpdate(
        { f1: "v1", jsF2: "v2", jsF3: "v3" },
        { jsF2: "f2", jsF3: "f3" });
    expect(result).toEqual({
      setCols: "\"f1\"=$1, \"f2\"=$2, \"f3\"=$3",
      values: ["v1", "v2", "v3"],
    });
  });
});
