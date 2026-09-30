CREATE INDEX idx_autopool_activation_member_package
    ON meddolic_user_activation_details (memberId, packageId);

CREATE INDEX idx_autopool_activation_payer_date
    ON meddolic_user_activation_details (activateBy, dateTime);

CREATE INDEX idx_autopool_activation_member_date
    ON meddolic_user_activation_details (memberId, dateTime);

CREATE INDEX idx_autopool_placeholder_completion
    ON meddolic_user_pool_placeholder_details (member_id, level, poolId, parentEntryId);

CREATE INDEX idx_autopool_tree_level_id
    ON meddolic_user_pool_tree_1 (treeLevel, id);

CREATE INDEX idx_autopool_tree_child_entry
    ON meddolic_user_pool_tree_1 (childId, childEntryId);