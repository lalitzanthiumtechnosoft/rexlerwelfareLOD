CREATE INDEX idx_registration_user_id
    ON meddolic_user_details (user_id);

CREATE INDEX idx_registration_phone_status
    ON meddolic_user_details (phone(15), account_status);

CREATE INDEX idx_registration_email_status
    ON meddolic_user_details (email_id(191), account_status);