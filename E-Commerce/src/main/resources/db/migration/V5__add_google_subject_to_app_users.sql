ALTER TABLE app_users
    ADD COLUMN google_subject VARCHAR(255) NULL;

CREATE UNIQUE INDEX uk_app_users_google_subject
    ON app_users (google_subject);
