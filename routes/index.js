const express = require("express");
const router = new express.Router();

router.get("/", async function (req, res, next) {
    return res.send(`
    <h1>Welcome to Jobly</h1>
    <h3>To get started, create a get or post request for companies,
        jobs, or users</h3>
    <br>
    <br>
    <p>For example, to create a get request to companies,
    replace the "/" in the search bar with "/companies"</p>
    <br>
    <p>Also, to create a get request to find a specific company,
    replace the "/" in the search bar with something like
    "/companies/bauer-gallagher".</p>
    <br>
    <p>Finally, to create a new job, use an app like Insomnia
    to create a JSON object like this: {"title":
    "Data Analyst", "salary": 85000, "equity": NULL,
    "company_handle": "maria-garcia"}. Once you create it,
    choose the post action from the dropdown menu.</p>
    <br>
    <p>For other requests, refer to the companies, jobs,
    and users js files in the routes folder.</p>
  `);
});

module.exports = router;
