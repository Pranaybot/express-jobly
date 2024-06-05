const { BadRequestError } = require("../expressError");

/**
 * Helper function to make selective update queries.
 *
 * The calling function can use this function to make the SET
 * clause of an SQL UPDATE statement.
 *
 * @param dataToUpdate {Object} {field1: newValue, field2: newValue, ...}
 * @param jsToSql {Object} maps JavaScript style data fields to SQL
 * database column names,
 *   like { lastName: "last_name", age: "age" }
 * @returns {Object} {setSqlCols, dataToUpdate}
 *
 * @example {lastName: 'Bez', age: 30} =>
 *   { colsSet : ' "last_name"=$1, "age"=$2',
 *     values: ['Bez', 30] }
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // Extract the keys from the dataToUpdate object
  const keys = Object.keys(dataToUpdate);

  // If no data is provided, throw a BadRequestError
  if (keys.length === 0) throw new BadRequestError("No data");

  // Map each key to its corresponding SQL column name (or the key itself if no mapping is found)
  // and create a string in the format `"column_name"=$index`
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    // Join the columns array into a single string, separated by commas
    setCols: cols.join(", "),
    // Get the values from the dataToUpdate object
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
