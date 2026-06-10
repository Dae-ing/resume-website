-- ============================================================
-- DAEEE・同行集 - 情侣绑定功能数据库迁移脚本
-- 执行方式: mysql -u root -p daeee_travel < database/migration_couple.sql
-- ============================================================

USE daeee_travel;

-- 情侣绑定关系表
CREATE TABLE IF NOT EXISTS couple_binds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '发起绑定的用户ID',
    partner_id INT DEFAULT NULL COMMENT '接受绑定的伴侣ID，接受前为NULL',
    invite_code VARCHAR(6) NOT NULL COMMENT '6位邀请码',
    status ENUM('pending', 'bound', 'expired', 'unbound') NOT NULL DEFAULT 'pending' COMMENT '绑定状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '邀请发起时间',
    expired_at TIMESTAMP NULL DEFAULT NULL COMMENT '邀请码过期时间（24小时）',
    bound_at TIMESTAMP NULL DEFAULT NULL COMMENT '绑定成功时间',
    unbound_at TIMESTAMP NULL DEFAULT NULL COMMENT '解绑时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_active_bind_user (user_id, status) COMMENT '每个用户只能有一个活跃的绑定',
    UNIQUE KEY unique_active_bind_partner (partner_id, status) COMMENT '每个伴侣只能被绑定一次',
    INDEX idx_invite_code (invite_code),
    INDEX idx_status (status),
    INDEX idx_expired_at (expired_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='情侣绑定关系表';

-- 为现有业务表添加 user_id 索引优化（footprints, visited_cities, diaries 等已有 user_id）
-- 仅对可能缺少索引的表添加
ALTER TABLE footprints ADD INDEX IF NOT EXISTS idx_user_id (user_id);
ALTER TABLE visited_cities ADD INDEX IF NOT EXISTS idx_user_id (user_id);
ALTER TABLE diaries ADD INDEX IF NOT EXISTS idx_user_id (user_id);
ALTER TABLE transactions ADD INDEX IF NOT EXISTS idx_user_id (user_id);
ALTER TABLE wishlist ADD INDEX IF NOT EXISTS idx_user_id (user_id);
ALTER TABLE plans ADD INDEX IF NOT EXISTS idx_user_id (user_id);
ALTER TABLE albums ADD INDEX IF NOT EXISTS idx_user_id (user_id);
