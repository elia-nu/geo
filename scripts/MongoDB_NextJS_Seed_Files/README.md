# MongoDB + Next.js seed files

## Install
`npm install mongodb dotenv`

## Environment
Create `.env.local` (or `.env` for a standalone script):
`MONGODB_URI=mongodb://localhost:27017/your_database`

## Run
Use Node ESM (`"type": "module"` in package.json):
`node --env-file=.env.local scripts/seed.js`

If your Node version does not support `--env-file`, load dotenv in the script or run with your existing environment variables.

## Collections
- `departments`
- `designations`
- `employees`

Employees store both the original readable `department`/`designation` names and ObjectId references in `departmentId`/`designationId`.

The seed uses upsert operations and unique indexes, so rerunning it does not intentionally create duplicates.
