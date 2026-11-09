## ADDED Requirements

### Requirement: Server actions derive the acting user from the session
Every mutating server action SHALL determine the acting user from the server-side session (`auth.api.getSession` with request headers) and MUST NOT accept a user identifier from the caller.

#### Scenario: Unauthenticated call is rejected
- **WHEN** a server action is invoked without a valid session cookie
- **THEN** the action SHALL throw an unauthorized error and perform no database writes

#### Scenario: Authenticated call acts on the session user
- **WHEN** a signed-in user invokes `addWeightEntry`, `createProfile`, `updateProfile` or `updateWeightUnit`
- **THEN** the write SHALL be applied to the session user's rows only

### Requirement: Imported rows are owned by the session user
Import actions (`importWeightEntries`, `importCalorieEntries`) SHALL assign every inserted row to the session user, ignoring any `userId` present in the submitted payload.

#### Scenario: Payload contains a foreign userId
- **WHEN** an import payload row carries a `userId` belonging to another user
- **THEN** the row SHALL be inserted under the session user's id instead

### Requirement: Updates and deletes enforce ownership
Every update or delete of a user-owned row SHALL filter by both the row id and the session user id.

#### Scenario: Deleting another user's weight entry
- **WHEN** a signed-in user calls `removeWeightEntry` with the id of a weight entry owned by a different user
- **THEN** no row SHALL be deleted

#### Scenario: Updating another user's weight entry
- **WHEN** a signed-in user calls `updateWeightEntry` with the id of a weight entry owned by a different user
- **THEN** no row SHALL be modified

### Requirement: Server action input is validated
Server actions SHALL validate their arguments server side and reject invalid input before touching the database: numeric values MUST be finite and within sane ranges, dates MUST be valid, and import payloads MUST match the expected row shape and a bounded row count.

#### Scenario: Non-finite weight value
- **WHEN** `addWeightEntry` or `updateWeightEntry` receives `NaN`, `Infinity`, a non-positive value, or an out-of-range body fat percentage
- **THEN** the action SHALL throw a validation error and write nothing

#### Scenario: Malformed import payload
- **WHEN** an import action receives rows that are not objects of the expected shape (e.g. missing date, non-numeric value)
- **THEN** the action SHALL throw a validation error and insert nothing

### Requirement: Data reads are not exposed as server actions
Functions that read user data SHALL live in server-only modules (guarded by `import "server-only"`) and MUST NOT be exported from `"use server"` files, so they cannot be invoked as public endpoints.

#### Scenario: Server Component loads data
- **WHEN** the dashboard, profile or settings page renders
- **THEN** it SHALL load data via server-only query modules, passing the session user's id

#### Scenario: Read helper imported into client code
- **WHEN** a client component attempts to import a query module
- **THEN** the build SHALL fail due to the `server-only` guard
