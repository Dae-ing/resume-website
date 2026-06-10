CREATE DATABASE IF NOT EXISTS daeee_travel DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE daeee_travel;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    name_en VARCHAR(50),
    province VARCHAR(50),
    description TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS footprints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city_id INT NOT NULL,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS visited_cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    city_id INT NOT NULL,
    visit_count INT DEFAULT 1,
    last_visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (city_id) REFERENCES cities(id),
    UNIQUE KEY unique_user_city (user_id, city_id)
);

CREATE TABLE IF NOT EXISTS diaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    city_id INT,
    privacy_level ENUM('private', 'friends', 'public') DEFAULT 'private',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (city_id) REFERENCES cities(id)
);

CREATE TABLE IF NOT EXISTS diary_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    diary_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (diary_id) REFERENCES diaries(id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(200),
    city_id INT,
    transaction_date DATE NOT NULL,
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (city_id) REFERENCES cities(id)
);

CREATE TABLE IF NOT EXISTS wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    type ENUM('destination', 'experience', 'food') DEFAULT 'destination',
    description TEXT,
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    start_date DATE,
    end_date DATE,
    status ENUM('planning', 'in_progress', 'completed') DEFAULT 'planning',
    budget DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS plan_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    day_number INT NOT NULL,
    time_slot VARCHAR(50),
    activity VARCHAR(200),
    location VARCHAR(100),
    cost DECIMAL(10, 2),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS albums (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS album_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    album_id INT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    caption VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(id)
);

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
    INDEX idx_invite_code (invite_code),
    INDEX idx_status (status),
    INDEX idx_expired_at (expired_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='情侣绑定关系表';

INSERT INTO users (username, password, nickname, email) VALUES ('root', '$2a$10$FdL8LrFvXH3lJG2mYq3HkO7O7O7O7O7O7O7O7O7O7O7O7O7O7O', '管理员', 'admin@daeee.xyz') ON DUPLICATE KEY UPDATE password=password;

INSERT INTO cities (name, name_en, province, description, latitude, longitude) VALUES 
-- 华北地区
('北京', 'Beijing', '北京市', '中国首都，历史文化名城', 39.9042, 116.4074),
('天津', 'Tianjin', '天津市', '北方重要港口城市', 39.0842, 117.2009),
('石家庄', 'Shijiazhuang', '河北省', '河北省省会', 38.0423, 114.5024),
('太原', 'Taiyuan', '山西省', '山西省省会', 37.8707, 112.5492),
('呼和浩特', 'Hohhot', '内蒙古自治区', '内蒙古自治区首府', 40.8173, 111.6715),
('沈阳', 'Shenyang', '辽宁省', '辽宁省省会，工业重镇', 41.8045, 123.4328),
('大连', 'Dalian', '辽宁省', '美丽的海滨城市', 38.9140, 121.6147),
('长春', 'Changchun', '吉林省', '吉林省省会', 43.8868, 125.3245),
('哈尔滨', 'Harbin', '黑龙江省', '冰城，北国明珠', 45.8038, 126.5350),

-- 华东地区
('上海', 'Shanghai', '上海市', '国际化大都市', 31.2304, 121.4737),
('南京', 'Nanjing', '江苏省', '江苏省省会，六朝古都', 32.0603, 118.7969),
('苏州', 'Suzhou', '江苏省', '江南园林之城', 31.3251, 120.6201),
('无锡', 'Wuxi', '江苏省', '太湖明珠', 31.5707, 120.2997),
('常州', 'Changzhou', '江苏省', '历史文化名城', 31.7799, 119.9763),
('杭州', 'Hangzhou', '浙江省', '人间天堂，西湖美景', 30.2741, 120.1552),
('宁波', 'Ningbo', '浙江省', '港口城市', 29.8739, 121.5497),
('温州', 'Wenzhou', '浙江省', '民营经济发达城市', 28.0189, 120.6557),
('合肥', 'Hefei', '安徽省', '安徽省省会', 31.8654, 117.2272),
('福州', 'Fuzhou', '福建省', '福建省省会', 26.0799, 119.3062),
('厦门', 'Xiamen', '福建省', '美丽的海滨花园城市', 24.4798, 118.0894),
('南昌', 'Nanchang', '江西省', '江西省省会', 28.6812, 115.8916),
('济南', 'Jinan', '山东省', '山东省省会，泉城', 36.6769, 116.9860),
('青岛', 'Qingdao', '山东省', '海滨旅游城市', 36.0671, 120.3826),
('烟台', 'Yantai', '山东省', '渤海明珠', 37.5312, 121.3962),

-- 华中地区
('郑州', 'Zhengzhou', '河南省', '河南省省会', 34.7466, 113.6253),
('开封', 'Kaifeng', '河南省', '北宋古都', 34.8021, 114.3547),
('洛阳', 'Luoyang', '河南省', '千年古都', 34.6234, 112.4539),
('武汉', 'Wuhan', '湖北省', '湖北省省会，九省通衢', 30.5928, 114.3055),
('宜昌', 'Yichang', '湖北省', '三峡门户', 30.7064, 111.2817),
('长沙', 'Changsha', '湖南省', '湖南省省会', 28.2280, 112.9388),
('株洲', 'Zhuzhou', '湖南省', '工业新城', 27.8318, 113.1327),
('湘潭', 'Xiangtan', '湖南省', '伟人故里', 27.8773, 112.9416),
('衡阳', 'Hengyang', '湖南省', '雁城', 26.9053, 112.5678),

-- 华南地区
('广州', 'Guangzhou', '广东省', '广东省省会，华南门户', 23.1291, 113.2644),
('深圳', 'Shenzhen', '广东省', '改革开放窗口', 22.5431, 114.0579),
('珠海', 'Zhuhai', '广东省', '海滨花园城市', 22.2769, 113.5678),
('佛山', 'Foshan', '广东省', '武术之乡', 23.0228, 113.1145),
('东莞', 'Dongguan', '广东省', '制造业名城', 23.0216, 113.7535),
('中山', 'Zhongshan', '广东省', '伟人故里', 22.5228, 113.3893),
('南宁', 'Nanning', '广西壮族自治区', '广西壮族自治区首府', 22.8170, 108.3200),
('桂林', 'Guilin', '广西壮族自治区', '山水甲天下', 25.2741, 110.2993),
('北海', 'Beihai', '广西壮族自治区', '海滨旅游城市', 21.4811, 109.1147),

-- 西南地区
('成都', 'Chengdu', '四川省', '四川省省会，天府之国', 30.5728, 104.0668),
('重庆', 'Chongqing', '重庆市', '山城，火锅之都', 29.4316, 106.9123),
('贵阳', 'Guiyang', '贵州省', '避暑之都，林城', 26.5804, 106.7132),
('遵义', 'Zunyi', '贵州省', '革命历史名城', 27.7277, 106.9167),
('昆明', 'Kunming', '云南省', '云南省省会，春城', 24.8820, 102.8329),
('丽江', 'Lijiang', '云南省', '世界文化遗产', 26.8641, 100.2383),
('大理', 'Dali', '云南省', '风花雪月之地', 25.6052, 100.1867),
('香格里拉', 'Shangri-La', '云南省', '人间仙境', 27.8498, 99.7255),
('拉萨', 'Lhasa', '西藏自治区', '西藏自治区首府', 29.6541, 91.1266),

-- 西北地区
('西安', "Xi'an", '陕西省', '十三朝古都', 34.3416, 108.9398),
('宝鸡', 'Baoji', '陕西省', '炎帝故里', 34.3439, 107.1299),
('兰州', 'Lanzhou', '甘肃省', '甘肃省省会', 36.0611, 103.8343),
('西宁', 'Xining', '青海省', '青海省省会', 36.6231, 101.7789),
('银川', 'Yinchuan', '宁夏回族自治区', '宁夏回族自治区首府', 38.4663, 106.2756),
('乌鲁木齐', 'Urumqi', '新疆维吾尔自治区', '新疆维吾尔自治区首府', 43.8268, 87.6169),

-- 海南地区
('海口', 'Haikou', '海南省', '海南省省会', 20.0339, 110.3312),
('三亚', 'Sanya', '海南省', '热带旅游胜地', 18.2237, 109.5042),
('三沙', 'Sansha', '海南省', '中国最南端城市', 16.8719, 112.3069),

-- 港澳台地区
('香港', 'Hong Kong', '香港特别行政区', '国际金融中心', 22.3193, 114.1694),
('澳门', 'Macao', '澳门特别行政区', '国际旅游休闲中心', 22.1987, 113.5439),
('台北', 'Taipei', '台湾省', '台湾省省会', 25.0330, 121.5654);
