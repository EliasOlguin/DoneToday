# Workflow

- For behavior changes, follow the user's test-first preference: write or update the tests, run them and confirm the expected failure before changing implementation code. Then implement, run the relevant checks and fix failures.
- For work split into stages, finish and verify one stage before implementing the next. Documentation-only edits do not need new tests.
- Use a disposable local PostgreSQL server for integration tests. `DONETODAY_SECURITY_TEST_CONNECTION` must point to its administrative `postgres` database on loopback; never use production or an existing application database.
- The required project checks are `dotnet test` and, in `DoneToday.Web`, `npm run lint`, `npm run build`, `npm test` and `npm run test:seo`. The integration tests run when the explicit PostgreSQL test connection is supplied.
