## Requirements

### Requirement: Session Lifetime
The system SHALL keep a user's session valid for 30 days from last activity, extending automatically on use rather than requiring re-authentication within that window.

#### Scenario: Returning within 30 days of last activity
- **WHEN** a signed-in user makes any authenticated request (e.g. loads `/dashboard`) less than 30 days after their session was last refreshed
- **THEN** the session SHALL be accepted and its expiry extended for another 30 days if more than 1 day has elapsed since the last extension

#### Scenario: Returning after 30 days of inactivity
- **WHEN** a signed-in user makes an authenticated request more than 30 days after their last activity
- **THEN** the session SHALL be treated as expired and the user redirected to `/auth/signin`

#### Scenario: Session reads use a short-lived cache
- **WHEN** the server validates a session on any page load
- **THEN** it SHALL be permitted to serve a cached, previously-validated result up to 5 minutes old instead of re-querying the database on every request
