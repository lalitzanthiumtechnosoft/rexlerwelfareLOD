CREATE INDEX idx_activation_buyer_date
    ON meddolic_user_team_activation_details (activateBy, dateTime);