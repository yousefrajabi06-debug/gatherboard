# Learning guide — GatherBoard

A small full-stack learning app for fictional events and local seat reservations.

## Important files

- [`src/App.jsx`](../src/App.jsx): API-backed event, reservation, form, and loading states.
- [`src/lib/api.js`](../src/lib/api.js): JSON requests, a timeout, and readable error handling.
- [`src/components/EventForm.jsx`](../src/components/EventForm.jsx): Beginner-friendly controlled event form.
- [`server/app.js`](../server/app.js): HTTP routes, validation, parameterized SQL, and reservation transaction.
- [`server/database.js`](../server/database.js): Tables, constraints, and fictional seed records.
- [`server/index.js`](../server/index.js): Loopback-only server, generated database folder, and production static files.
- [`server/app.test.js`](../server/app.test.js): Capacity, duplicate aliases, cancellation, validation, SQL, and origin checks.
- [`tests/app.spec.js`](../tests/app.spec.js): Browser create/reserve/reload/cancel flow and error/mobile states.

## Five things to study

1. Follow one reservation from the form through fetch, Express, SQL, and the response.
2. Explain why the server validates data even when the form already validates it.
3. Understand a foreign key, a unique constraint, and parameterized SQL.
4. Explain why checking capacity and inserting a reservation belong in one transaction.
5. Compare browser reservation references with the database as the source of truth.

## One feature to build independently

Add a remaining-seats filter, then test that full events disappear from the filtered view.

## Rebuild to understand

Start in an empty branch or separate practice folder. Rebuild the main form and one data update without copying, then add persistence or the API request. Explain the data flow aloud and recreate one behavior test. Compare your work with the original only after it works.

## Honest presentation

This is an AI-assisted learning project. Describe the code you can explain and the features you rebuilt yourself. Do not present it as employment, client work, or proof of independent mastery before studying it.
