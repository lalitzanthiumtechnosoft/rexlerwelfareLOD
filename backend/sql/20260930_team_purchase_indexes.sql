CREATE INDEX idx_child_ids_child_id
    ON meddolic_user_child_ids (child_id);

CREATE INDEX idx_activation_member_package
    ON meddolic_user_team_activation_details (memberId, packageId);