ALTER TABLE meddolic_user_details
    DROP INDEX idx_registration_user_id,
    ADD UNIQUE INDEX uq_registration_user_id (user_id);