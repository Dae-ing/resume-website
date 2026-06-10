const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'daeee_secret_key';
const JWT_EXPIRES_IN = '1h';
const INVITE_EXPIRE_HOURS = 24;

function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function getPartnerId(userId) {
    if (!db) {
        const bind = memoryData.couple_binds.find(
            b => (b.user_id === userId || b.partner_id === userId) && b.status === 'bound'
        );
        if (!bind) return null;
        return bind.user_id === userId ? bind.partner_id : bind.user_id;
    }
    const [rows] = await db.execute(
        'SELECT user_id, partner_id FROM couple_binds WHERE (user_id = ? OR partner_id = ?) AND status = ?',
        [userId, userId, 'bound']
    );
    if (rows.length === 0) return null;
    const bind = rows[0];
    return bind.user_id === userId ? bind.partner_id : bind.user_id;
}

function dataIsolation(options = {}) {
    return async (req, res, next) => {
        if (options.whitelist && options.whitelist.some(pattern => {
            if (typeof pattern === 'string') return req.path === pattern;
            return pattern.test(req.path);
        })) {
            return next();
        }
        req.accessibleUserIds = [req.user.id];
        if (options.enableSharing !== false) {
            const partnerId = await getPartnerId(req.user.id);
            if (partnerId) req.accessibleUserIds.push(partnerId);
        }
        next();
    };
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

let db = null;
let memoryData = {
    users: [{ id: 1, username: 'root', password: bcrypt.hashSync('123456', 10), nickname: '管理员', email: 'admin@daeee.xyz' }],
    cities: [
        { id: 1, name: '北京', name_en: 'Beijing', province: '北京市', description: '中国首都，历史文化名城', latitude: 39.9042, longitude: 116.4074 },
        { id: 2, name: '天津', name_en: 'Tianjin', province: '天津市', description: '北方重要港口城市', latitude: 39.0842, longitude: 117.2009 },
        { id: 3, name: '石家庄', name_en: 'Shijiazhuang', province: '河北省', description: '河北省省会', latitude: 38.0423, longitude: 114.5024 },
        { id: 4, name: '太原', name_en: 'Taiyuan', province: '山西省', description: '山西省省会', latitude: 37.8707, longitude: 112.5492 },
        { id: 5, name: '呼和浩特', name_en: 'Hohhot', province: '内蒙古自治区', description: '内蒙古自治区首府', latitude: 40.8173, longitude: 111.6715 },
        { id: 6, name: '沈阳', name_en: 'Shenyang', province: '辽宁省', description: '辽宁省省会，工业重镇', latitude: 41.8045, longitude: 123.4328 },
        { id: 7, name: '大连', name_en: 'Dalian', province: '辽宁省', description: '美丽的海滨城市', latitude: 38.9140, longitude: 121.6147 },
        { id: 8, name: '长春', name_en: 'Changchun', province: '吉林省', description: '吉林省省会', latitude: 43.8868, longitude: 125.3245 },
        { id: 9, name: '哈尔滨', name_en: 'Harbin', province: '黑龙江省', description: '冰城，北国明珠', latitude: 45.8038, longitude: 126.5350 },
        { id: 10, name: '上海', name_en: 'Shanghai', province: '上海市', description: '国际化大都市', latitude: 31.2304, longitude: 121.4737 },
        { id: 11, name: '南京', name_en: 'Nanjing', province: '江苏省', description: '江苏省省会，六朝古都', latitude: 32.0603, longitude: 118.7969 },
        { id: 12, name: '苏州', name_en: 'Suzhou', province: '江苏省', description: '江南园林之城', latitude: 31.3251, longitude: 120.6201 },
        { id: 13, name: '无锡', name_en: 'Wuxi', province: '江苏省', description: '太湖明珠', latitude: 31.5707, longitude: 120.2997 },
        { id: 14, name: '常州', name_en: 'Changzhou', province: '江苏省', description: '历史文化名城', latitude: 31.7799, longitude: 119.9763 },
        { id: 15, name: '杭州', name_en: 'Hangzhou', province: '浙江省', description: '人间天堂，西湖美景', latitude: 30.2741, longitude: 120.1552 },
        { id: 16, name: '宁波', name_en: 'Ningbo', province: '浙江省', description: '港口城市', latitude: 29.8739, longitude: 121.5497 },
        { id: 17, name: '温州', name_en: 'Wenzhou', province: '浙江省', description: '民营经济发达城市', latitude: 28.0189, longitude: 120.6557 },
        { id: 18, name: '合肥', name_en: 'Hefei', province: '安徽省', description: '安徽省省会', latitude: 31.8654, longitude: 117.2272 },
        { id: 19, name: '福州', name_en: 'Fuzhou', province: '福建省', description: '福建省省会', latitude: 26.0799, longitude: 119.3062 },
        { id: 20, name: '厦门', name_en: 'Xiamen', province: '福建省', description: '美丽的海滨花园城市', latitude: 24.4798, longitude: 118.0894 },
        { id: 21, name: '南昌', name_en: 'Nanchang', province: '江西省', description: '江西省省会', latitude: 28.6812, longitude: 115.8916 },
        { id: 22, name: '济南', name_en: 'Jinan', province: '山东省', description: '山东省省会，泉城', latitude: 36.6769, longitude: 116.9860 },
        { id: 23, name: '青岛', name_en: 'Qingdao', province: '山东省', description: '海滨旅游城市', latitude: 36.0671, longitude: 120.3826 },
        { id: 24, name: '烟台', name_en: 'Yantai', province: '山东省', description: '渤海明珠', latitude: 37.5312, longitude: 121.3962 },
        { id: 25, name: '郑州', name_en: 'Zhengzhou', province: '河南省', description: '河南省省会', latitude: 34.7466, longitude: 113.6253 },
        { id: 26, name: '开封', name_en: 'Kaifeng', province: '河南省', description: '北宋古都', latitude: 34.8021, longitude: 114.3547 },
        { id: 27, name: '洛阳', name_en: 'Luoyang', province: '河南省', description: '千年古都', latitude: 34.6234, longitude: 112.4539 },
        { id: 28, name: '武汉', name_en: 'Wuhan', province: '湖北省', description: '湖北省省会，九省通衢', latitude: 30.5928, longitude: 114.3055 },
        { id: 29, name: '宜昌', name_en: 'Yichang', province: '湖北省', description: '三峡门户', latitude: 30.7064, longitude: 111.2817 },
        { id: 30, name: '长沙', name_en: 'Changsha', province: '湖南省', description: '湖南省省会', latitude: 28.2280, longitude: 112.9388 },
        { id: 31, name: '株洲', name_en: 'Zhuzhou', province: '湖南省', description: '工业新城', latitude: 27.8318, longitude: 113.1327 },
        { id: 32, name: '湘潭', name_en: 'Xiangtan', province: '湖南省', description: '伟人故里', latitude: 27.8773, longitude: 112.9416 },
        { id: 33, name: '衡阳', name_en: 'Hengyang', province: '湖南省', description: '雁城', latitude: 26.9053, longitude: 112.5678 },
        { id: 34, name: '广州', name_en: 'Guangzhou', province: '广东省', description: '广东省省会，华南门户', latitude: 23.1291, longitude: 113.2644 },
        { id: 35, name: '深圳', name_en: 'Shenzhen', province: '广东省', description: '改革开放窗口', latitude: 22.5431, longitude: 114.0579 },
        { id: 36, name: '珠海', name_en: 'Zhuhai', province: '广东省', description: '海滨花园城市', latitude: 22.2769, longitude: 113.5678 },
        { id: 37, name: '佛山', name_en: 'Foshan', province: '广东省', description: '武术之乡', latitude: 23.0228, longitude: 113.1145 },
        { id: 38, name: '东莞', name_en: 'Dongguan', province: '广东省', description: '制造业名城', latitude: 23.0216, longitude: 113.7535 },
        { id: 39, name: '中山', name_en: 'Zhongshan', province: '广东省', description: '伟人故里', latitude: 22.5228, longitude: 113.3893 },
        { id: 40, name: '南宁', name_en: 'Nanning', province: '广西壮族自治区', description: '广西壮族自治区首府', latitude: 22.8170, longitude: 108.3200 },
        { id: 41, name: '桂林', name_en: 'Guilin', province: '广西壮族自治区', description: '山水甲天下', latitude: 25.2741, longitude: 110.2993 },
        { id: 42, name: '北海', name_en: 'Beihai', province: '广西壮族自治区', description: '海滨旅游城市', latitude: 21.4811, longitude: 109.1147 },
        { id: 43, name: '成都', name_en: 'Chengdu', province: '四川省', description: '四川省省会，天府之国', latitude: 30.5728, longitude: 104.0668 },
        { id: 44, name: '重庆', name_en: 'Chongqing', province: '重庆市', description: '山城，火锅之都', latitude: 29.4316, longitude: 106.9123 },
        { id: 45, name: '贵阳', name_en: 'Guiyang', province: '贵州省', description: '避暑之都，林城', latitude: 26.5804, longitude: 106.7132 },
        { id: 46, name: '遵义', name_en: 'Zunyi', province: '贵州省', description: '革命历史名城', latitude: 27.7277, longitude: 106.9167 },
        { id: 47, name: '昆明', name_en: 'Kunming', province: '云南省', description: '云南省省会，春城', latitude: 24.8820, longitude: 102.8329 },
        { id: 48, name: '丽江', name_en: 'Lijiang', province: '云南省', description: '世界文化遗产', latitude: 26.8641, longitude: 100.2383 },
        { id: 49, name: '大理', name_en: 'Dali', province: '云南省', description: '风花雪月之地', latitude: 25.6052, longitude: 100.1867 },
        { id: 50, name: '香格里拉', name_en: 'Shangri-La', province: '云南省', description: '人间仙境', latitude: 27.8498, longitude: 99.7255 },
        { id: 51, name: '拉萨', name_en: 'Lhasa', province: '西藏自治区', description: '西藏自治区首府', latitude: 29.6541, longitude: 91.1266 },
        { id: 52, name: '西安', name_en: "Xi'an", province: '陕西省', description: '十三朝古都', latitude: 34.3416, longitude: 108.9398 },
        { id: 53, name: '宝鸡', name_en: 'Baoji', province: '陕西省', description: '炎帝故里', latitude: 34.3439, longitude: 107.1299 },
        { id: 54, name: '兰州', name_en: 'Lanzhou', province: '甘肃省', description: '甘肃省省会', latitude: 36.0611, longitude: 103.8343 },
        { id: 55, name: '西宁', name_en: 'Xining', province: '青海省', description: '青海省省会', latitude: 36.6231, longitude: 101.7789 },
        { id: 56, name: '银川', name_en: 'Yinchuan', province: '宁夏回族自治区', description: '宁夏回族自治区首府', latitude: 38.4663, longitude: 106.2756 },
        { id: 57, name: '乌鲁木齐', name_en: 'Urumqi', province: '新疆维吾尔自治区', description: '新疆维吾尔自治区首府', latitude: 43.8268, longitude: 87.6169 },
        { id: 58, name: '海口', name_en: 'Haikou', province: '海南省', description: '海南省省会', latitude: 20.0339, longitude: 110.3312 },
        { id: 59, name: '三亚', name_en: 'Sanya', province: '海南省', description: '热带旅游胜地', latitude: 18.2237, longitude: 109.5042 },
        { id: 60, name: '三沙', name_en: 'Sansha', province: '海南省', description: '中国最南端城市', latitude: 16.8719, longitude: 112.3069 },
        { id: 61, name: '香港', name_en: 'Hong Kong', province: '香港特别行政区', description: '国际金融中心', latitude: 22.3193, longitude: 114.1694 },
        { id: 62, name: '澳门', name_en: 'Macao', province: '澳门特别行政区', description: '国际旅游休闲中心', latitude: 22.1987, longitude: 113.5439 },
        { id: 63, name: '台北', name_en: 'Taipei', province: '台湾省', description: '台湾省省会', latitude: 25.0330, longitude: 121.5654 }
    ],
    footprints: [],
    visited_cities: [],
    couple_binds: [],
    diaries: [],
    albums: [],
    photos: [],
    plans: [],
    plan_days: [],
    plan_items: [],
    wishlist: []
};

async function connectDatabase() {
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'daeee_travel',
            charset: 'utf8mb4'
        });
        console.log('MySQL数据库连接成功');
        await initDatabase();
    } catch (error) {
        console.error('MySQL连接失败，将使用内存数据:', error.message);
        db = null;
    }
}

async function initDatabase() {
    try {
        console.log('正在创建数据库表...');
        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                nickname VARCHAR(50),
                email VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS cities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                name_en VARCHAR(50),
                province VARCHAR(50),
                description TEXT,
                latitude DECIMAL(10, 7),
                longitude DECIMAL(10, 7),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.execute(`
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
            )
        `);
        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS visited_cities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                city_id INT NOT NULL,
                visit_count INT DEFAULT 1,
                last_visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (city_id) REFERENCES cities(id),
                UNIQUE KEY unique_user_city (user_id, city_id)
            )
        `);
        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS diaries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(200) NOT NULL,
                content TEXT,
                city_id INT,
                cover_image VARCHAR(500),
                privacy_level ENUM('private', 'friends', 'public') DEFAULT 'private',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (city_id) REFERENCES cities(id)
            )
        `);
        // 确保旧表有 cover_image 列
        try { await db.execute('ALTER TABLE diaries ADD COLUMN cover_image VARCHAR(500) AFTER city_id'); } catch(e) {}
        try { await db.execute('ALTER TABLE albums ADD COLUMN cover_image VARCHAR(500) AFTER description'); } catch(e) {}
        
        await db.execute(`
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
            )
        `);
        
        await db.execute(`
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
            )
        `);
        
        await db.execute(`
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
            )
        `);
        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS albums (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                cover_image VARCHAR(500),
                is_public BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS photos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                album_id INT NOT NULL,
                user_id INT NOT NULL,
                url VARCHAR(500) NOT NULL,
                caption VARCHAR(200),
                type ENUM('photo', 'video', 'ticket') DEFAULT 'photo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS plan_days (
                id INT AUTO_INCREMENT PRIMARY KEY,
                plan_id INT NOT NULL,
                day_number INT NOT NULL,
                date DATE,
                title VARCHAR(200),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
                UNIQUE KEY unique_plan_day (plan_id, day_number)
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS plan_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                day_id INT NOT NULL,
                time_slot VARCHAR(20),
                title VARCHAR(200) NOT NULL,
                description TEXT,
                location VARCHAR(200),
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (day_id) REFERENCES plan_days(id) ON DELETE CASCADE
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS couple_binds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                partner_id INT DEFAULT NULL,
                invite_code VARCHAR(6) NOT NULL,
                status ENUM('pending', 'bound', 'expired', 'unbound') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expired_at TIMESTAMP NULL DEFAULT NULL,
                bound_at TIMESTAMP NULL DEFAULT NULL,
                unbound_at TIMESTAMP NULL DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_invite_code (invite_code),
                INDEX idx_status (status)
            )
        `);
        
        console.log('数据库表创建完成');
        
        const [cityRows] = await db.execute('SELECT COUNT(*) as count FROM cities');
        if (cityRows[0].count === 0) {
            console.log('正在初始化城市数据...');
            const cities = memoryData.cities;
            for (const city of cities) {
                await db.execute(
                    'INSERT INTO cities (name, name_en, province, description, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
                    [city.name, city.name_en, city.province, city.description, city.latitude, city.longitude]
                );
            }
            console.log('城市数据初始化完成');
        }
        
        const [userRows] = await db.execute('SELECT COUNT(*) as count FROM users WHERE username = ?', ['root']);
        if (userRows[0].count === 0) {
            const hashedPassword = bcrypt.hashSync('123456', 10);
            await db.execute('INSERT INTO users (username, password, nickname, email) VALUES (?, ?, ?, ?)', ['root', hashedPassword, '管理员', 'admin@daeee.xyz']);
            console.log('管理员用户创建完成');
        }
    } catch (error) {
        console.error('数据库初始化失败:', error.message);
    }
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '.')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: '未提供令牌' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: '令牌无效' });
        }
        req.user = user;
        next();
    });
}

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user;
        if (db) {
            const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
            user = rows[0];
        } else {
            user = memoryData.users.find(u => u.username === username);
        }
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: '登录失败', error: error.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password, nickname, email } = req.body;
    try {
        let existingUser;
        if (db) {
            const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
            existingUser = rows[0];
        } else {
            existingUser = memoryData.users.find(u => u.username === username);
        }
        if (existingUser) {
            return res.status(400).json({ message: '用户名已存在' });
        }
        const hashedPassword = bcrypt.hashSync(password, 10);
        if (db) {
            const [result] = await db.execute('INSERT INTO users (username, password, nickname, email) VALUES (?, ?, ?, ?)', [username, hashedPassword, nickname, email]);
            res.json({ message: '注册成功', userId: result.insertId });
        } else {
            const newUser = { id: memoryData.users.length + 1, username, password: hashedPassword, nickname, email };
            memoryData.users.push(newUser);
            res.json({ message: '注册成功', userId: newUser.id });
        }
    } catch (error) {
        res.status(500).json({ message: '注册失败', error: error.message });
    }
});

app.get('/api/cities', async (req, res) => {
    try {
        let cities;
        if (db) {
            const [rows] = await db.execute('SELECT * FROM cities ORDER BY name');
            cities = rows;
        } else {
            cities = memoryData.cities;
        }
        res.json(cities);
    } catch (error) {
        res.status(500).json({ message: '获取城市失败', error: error.message });
    }
});

app.get('/api/footprints', authenticateToken, async (req, res) => {
    try {
        const partnerId = await getPartnerId(req.user.id);
        let footprints;
        if (db) {
            if (partnerId) {
                const [rows] = await db.execute(
                    'SELECT f.*, c.name as city_name, u.nickname as user_nickname FROM footprints f LEFT JOIN cities c ON f.city_id = c.id LEFT JOIN users u ON f.user_id = u.id WHERE f.user_id IN (?, ?) ORDER BY f.created_at DESC',
                    [req.user.id, partnerId]
                );
                footprints = rows;
            } else {
                const [rows] = await db.execute(
                    'SELECT f.*, c.name as city_name FROM footprints f LEFT JOIN cities c ON f.city_id = c.id WHERE f.user_id = ? ORDER BY f.created_at DESC',
                    [req.user.id]
                );
                footprints = rows;
            }
        } else {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            footprints = memoryData.footprints.filter(f => userIds.includes(f.user_id)).map(f => ({
                ...f,
                city_name: memoryData.cities.find(c => c.id === f.city_id)?.name || '未知城市',
                user_nickname: partnerId ? (memoryData.users.find(u => u.id === f.user_id)?.nickname || '') : undefined
            }));
        }
        res.json(footprints);
    } catch (error) {
        res.status(500).json({ message: '获取足迹失败', error: error.message });
    }
});

app.get('/api/footprints/:cityId', authenticateToken, async (req, res) => {
    const { cityId } = req.params;
    try {
        const partnerId = await getPartnerId(req.user.id);
        let footprints;
        if (db) {
            if (partnerId) {
                const [rows] = await db.execute(
                    'SELECT f.*, c.name as city_name, u.nickname as user_nickname FROM footprints f LEFT JOIN cities c ON f.city_id = c.id LEFT JOIN users u ON f.user_id = u.id WHERE f.user_id IN (?, ?) AND f.city_id = ? ORDER BY f.created_at DESC',
                    [req.user.id, partnerId, cityId]
                );
                footprints = rows;
            } else {
                const [rows] = await db.execute(
                    'SELECT f.*, c.name as city_name FROM footprints f LEFT JOIN cities c ON f.city_id = c.id WHERE f.user_id = ? AND f.city_id = ? ORDER BY f.created_at DESC',
                    [req.user.id, cityId]
                );
                footprints = rows;
            }
        } else {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            footprints = memoryData.footprints.filter(f => userIds.includes(f.user_id) && f.city_id === parseInt(cityId)).map(f => ({
                ...f,
                city_name: memoryData.cities.find(c => c.id === f.city_id)?.name || '未知城市',
                user_nickname: partnerId ? (memoryData.users.find(u => u.id === f.user_id)?.nickname || '') : undefined
            }));
        }
        res.json(footprints);
    } catch (error) {
        res.status(500).json({ message: '获取足迹失败', error: error.message });
    }
});

app.post('/api/footprints', authenticateToken, upload.single('image'), async (req, res) => {
    const { city_id, name, description, latitude, longitude } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    console.log('收到足迹添加请求:', { city_id, name, description, latitude, longitude, hasFile: !!req.file, image_url });
    console.log('请求头 Content-Type:', req.headers['content-type']);
    console.log('请求体字段:', Object.keys(req.body));
    console.log('文件信息:', req.file ? req.file : '无文件');
    
    try {
        if (db) {
            const [result] = await db.execute(
                'INSERT INTO footprints (city_id, user_id, name, description, image_url, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [city_id, req.user.id, name, description, image_url, latitude, longitude]
            );
            await updateVisitedCity(req.user.id, city_id);
            res.json({ message: '足迹添加成功', footprintId: result.insertId });
        } else {
            const newFootprint = {
                id: memoryData.footprints.length + 1,
                city_id: parseInt(city_id),
                user_id: req.user.id,
                name,
                description,
                image_url,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                created_at: new Date().toISOString()
            };
            memoryData.footprints.push(newFootprint);
            updateVisitedCityMemory(req.user.id, parseInt(city_id));
            res.json({ message: '足迹添加成功', footprintId: newFootprint.id });
        }
    } catch (error) {
        res.status(500).json({ message: '添加足迹失败', error: error.message });
    }
});

app.delete('/api/footprints/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        let imageUrl = null;
        
        if (db) {
            const [rows] = await db.execute('SELECT image_url FROM footprints WHERE id = ? AND user_id = ?', [id, req.user.id]);
            if (rows.length > 0) {
                imageUrl = rows[0].image_url;
                await db.execute('DELETE FROM footprints WHERE id = ? AND user_id = ?', [id, req.user.id]);
            }
        } else {
            const index = memoryData.footprints.findIndex(f => f.id === parseInt(id) && f.user_id === req.user.id);
            if (index !== -1) {
                imageUrl = memoryData.footprints[index].image_url;
                memoryData.footprints.splice(index, 1);
            }
        }
        
        if (imageUrl) {
            const fs = require('fs');
            const filePath = path.join(__dirname, imageUrl);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('删除图片文件失败:', err);
                } else {
                    console.log('图片文件删除成功:', imageUrl);
                }
            });
        }
        
        res.json({ message: '足迹删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除足迹失败', error: error.message });
    }
});

app.get('/api/visited-cities', authenticateToken, async (req, res) => {
    try {
        const partnerId = await getPartnerId(req.user.id);
        let visitedCities;
        if (db) {
            if (partnerId) {
                const [rows] = await db.execute(
                    'SELECT vc.*, c.name as city_name, c.latitude, c.longitude, u.nickname as user_nickname FROM visited_cities vc LEFT JOIN cities c ON vc.city_id = c.id LEFT JOIN users u ON vc.user_id = u.id WHERE vc.user_id IN (?, ?)',
                    [req.user.id, partnerId]
                );
                visitedCities = rows;
            } else {
                const [rows] = await db.execute(
                    'SELECT vc.*, c.name as city_name, c.latitude, c.longitude FROM visited_cities vc LEFT JOIN cities c ON vc.city_id = c.id WHERE vc.user_id = ?',
                    [req.user.id]
                );
                visitedCities = rows;
            }
        } else {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            visitedCities = memoryData.visited_cities
                .filter(vc => userIds.includes(vc.user_id))
                .map(vc => ({
                    ...vc,
                    city_name: memoryData.cities.find(c => c.id === vc.city_id)?.name || '未知城市',
                    latitude: memoryData.cities.find(c => c.id === vc.city_id)?.latitude,
                    longitude: memoryData.cities.find(c => c.id === vc.city_id)?.longitude,
                    user_nickname: partnerId ? (memoryData.users.find(u => u.id === vc.user_id)?.nickname || '') : undefined
                }));
        }
        res.json(visitedCities);
    } catch (error) {
        res.status(500).json({ message: '获取到访城市失败', error: error.message });
    }
});

async function updateVisitedCity(userId, cityId) {
    try {
        const [rows] = await db.execute('SELECT * FROM visited_cities WHERE user_id = ? AND city_id = ?', [userId, cityId]);
        if (rows.length > 0) {
            await db.execute('UPDATE visited_cities SET visit_count = visit_count + 1, last_visited_at = NOW() WHERE user_id = ? AND city_id = ?', [userId, cityId]);
        } else {
            await db.execute('INSERT INTO visited_cities (user_id, city_id, visit_count) VALUES (?, ?, 1)', [userId, cityId]);
        }
    } catch (error) {
        console.error('更新到访城市失败:', error.message);
    }
}

function updateVisitedCityMemory(userId, cityId) {
    const existing = memoryData.visited_cities.find(vc => vc.user_id === userId && vc.city_id === cityId);
    if (existing) {
        existing.visit_count++;
        existing.last_visited_at = new Date().toISOString();
    } else {
        memoryData.visited_cities.push({
            id: memoryData.visited_cities.length + 1,
            user_id: userId,
            city_id: cityId,
            visit_count: 1,
            last_visited_at: new Date().toISOString()
        });
    }
}

app.delete('/api/visited-cities/:cityId', authenticateToken, async (req, res) => {
    const { cityId } = req.params;
    try {
        if (db) {
            await db.execute('DELETE FROM visited_cities WHERE user_id = ? AND city_id = ?', [req.user.id, cityId]);
            res.json({ message: '到访城市删除成功' });
        } else {
            const index = memoryData.visited_cities.findIndex(vc => vc.user_id === req.user.id && vc.city_id === parseInt(cityId));
            if (index !== -1) {
                memoryData.visited_cities.splice(index, 1);
                res.json({ message: '到访城市删除成功' });
            } else {
                res.status(404).json({ message: '到访城市不存在' });
            }
        }
    } catch (error) {
        res.status(500).json({ message: '删除到访城市失败', error: error.message });
    }
});

app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        let user;
        if (db) {
            const [rows] = await db.execute('SELECT id, username, nickname, email FROM users WHERE id = ?', [req.user.id]);
            user = rows[0];
        } else {
            user = memoryData.users.find(u => u.id === req.user.id);
            if (user) {
                user = { id: user.id, username: user.username, nickname: user.nickname, email: user.email };
            }
        }

        const partnerId = await getPartnerId(req.user.id);
        let partner = null;
        if (partnerId) {
            if (db) {
                const [rows] = await db.execute('SELECT id, username, nickname, email FROM users WHERE id = ?', [partnerId]);
                partner = rows[0] || null;
            } else {
                const p = memoryData.users.find(u => u.id === partnerId);
                partner = p ? { id: p.id, username: p.username, nickname: p.nickname, email: p.email } : null;
            }
        }

        res.json({ ...user, partnerId, partner });
    } catch (error) {
        res.status(500).json({ message: '获取用户信息失败', error: error.message });
    }
});

app.get('/api/statistics/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    try {
        const targetUserId = parseInt(userId);
        const partnerId = await getPartnerId(req.user.id);

        if (targetUserId !== req.user.id && (!partnerId || targetUserId !== partnerId)) {
            return res.status(403).json({ message: '无权查看该用户的统计数据' });
        }

        let statistics;
        if (db) {
            const [footprintRows] = await db.execute('SELECT COUNT(*) as count FROM footprints WHERE user_id = ?', [targetUserId]);
            const [visitedRows] = await db.execute('SELECT COUNT(*) as count FROM visited_cities WHERE user_id = ?', [targetUserId]);
            const [diaryRows] = await db.execute('SELECT COUNT(*) as count FROM diaries WHERE user_id = ?', [targetUserId]);
            const [wishlistRows] = await db.execute('SELECT COUNT(*) as count FROM wishlist WHERE user_id = ? AND is_completed = 1', [targetUserId]);

            statistics = {
                visitedCount: visitedRows[0].count,
                footprintCount: footprintRows[0].count,
                diaryCount: diaryRows[0].count,
                wishlistCompleted: wishlistRows[0].count
            };
        } else {
            const visitedCount = memoryData.visited_cities.filter(vc => vc.user_id === targetUserId).length;
            const footprintCount = memoryData.footprints.filter(f => f.user_id === targetUserId).length;

            statistics = {
                visitedCount,
                footprintCount,
                diaryCount: 0,
                wishlistCompleted: 0
            };
        }
        res.json(statistics);
    } catch (error) {
        res.status(500).json({ message: '获取统计数据失败', error: error.message });
    }
});

app.get('/api/stamps', authenticateToken, async (req, res) => {
    try {
        const partnerId = await getPartnerId(req.user.id);
        let stamps;
        if (db) {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            const placeholders = userIds.map(() => '?').join(',');
            const [visitedRows] = await db.execute(
                `SELECT DISTINCT city_id FROM visited_cities WHERE user_id IN (${placeholders})`,
                userIds
            );
            const visitedCityIds = visitedRows.map(row => row.city_id);

            const [cityRows] = await db.execute('SELECT id, name FROM cities');
            stamps = cityRows.map(city => ({
                id: city.id,
                name: city.name,
                city_id: city.id,
                unlocked: visitedCityIds.includes(city.id),
                unlocked_at: visitedCityIds.includes(city.id) ? new Date().toISOString().split('T')[0] : null
            }));
        } else {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            const visitedCityIds = memoryData.visited_cities.filter(vc => userIds.includes(vc.user_id)).map(vc => vc.city_id);

            stamps = memoryData.cities.map(city => ({
                id: city.id,
                name: city.name,
                city_id: city.id,
                unlocked: visitedCityIds.includes(city.id),
                unlocked_at: visitedCityIds.includes(city.id) ? new Date().toISOString().split('T')[0] : null
            }));
        }
        res.json(stamps);
    } catch (error) {
        res.status(500).json({ message: '获取印章失败', error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: db ? 'MySQL' : 'Memory' });
});

function isAdmin(req, res, next) {
    if (req.user.username !== 'root') {
        return res.status(403).json({ message: '权限不足，需要管理员权限' });
    }
    next();
}

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        let users;
        if (db) {
            const [rows] = await db.execute('SELECT id, username, nickname, email, created_at FROM users ORDER BY created_at DESC');
            users = rows;
        } else {
            users = memoryData.users.map(u => ({
                id: u.id,
                username: u.username,
                nickname: u.nickname,
                email: u.email,
                created_at: new Date().toISOString()
            }));
        }
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: '获取用户列表失败', error: error.message });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === 1) {
        return res.status(400).json({ message: '不能删除管理员账号' });
    }
    try {
        if (db) {
            await db.execute('DELETE FROM footprints WHERE user_id = ?', [id]);
            await db.execute('DELETE FROM visited_cities WHERE user_id = ?', [id]);
            await db.execute('DELETE FROM users WHERE id = ?', [id]);
        } else {
            memoryData.footprints = memoryData.footprints.filter(f => f.user_id !== parseInt(id));
            memoryData.visited_cities = memoryData.visited_cities.filter(vc => vc.user_id !== parseInt(id));
            memoryData.users = memoryData.users.filter(u => u.id !== parseInt(id));
        }
        res.json({ message: '用户删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除用户失败', error: error.message });
    }
});

app.get('/api/admin/footprints', authenticateToken, isAdmin, async (req, res) => {
    try {
        let footprints;
        if (db) {
            const [rows] = await db.execute(`
                SELECT f.*, c.name as city_name, u.username as user_name 
                FROM footprints f 
                LEFT JOIN cities c ON f.city_id = c.id 
                LEFT JOIN users u ON f.user_id = u.id 
                ORDER BY f.created_at DESC
            `);
            footprints = rows;
        } else {
            footprints = memoryData.footprints.map(f => ({
                ...f,
                city_name: memoryData.cities.find(c => c.id === f.city_id)?.name || '未知城市',
                user_name: memoryData.users.find(u => u.id === f.user_id)?.username || '未知用户'
            }));
        }
        res.json(footprints);
    } catch (error) {
        res.status(500).json({ message: '获取足迹列表失败', error: error.message });
    }
});

app.delete('/api/admin/footprints/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        if (db) {
            await db.execute('DELETE FROM footprints WHERE id = ?', [id]);
        } else {
            const index = memoryData.footprints.findIndex(f => f.id === parseInt(id));
            if (index !== -1) {
                memoryData.footprints.splice(index, 1);
            }
        }
        res.json({ message: '足迹删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除足迹失败', error: error.message });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/admin/statistics', authenticateToken, isAdmin, async (req, res) => {
    try {
        let stats;
        if (db) {
            const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
            const [footprintCount] = await db.execute('SELECT COUNT(*) as count FROM footprints');
            const [cityCount] = await db.execute('SELECT COUNT(*) as count FROM cities');
            const [visitedCount] = await db.execute('SELECT COUNT(*) as count FROM visited_cities');
            
            stats = {
                totalUsers: userCount[0].count,
                totalFootprints: footprintCount[0].count,
                totalCities: cityCount[0].count,
                totalVisited: visitedCount[0].count
            };
        } else {
            stats = {
                totalUsers: memoryData.users.length,
                totalFootprints: memoryData.footprints.length,
                totalCities: memoryData.cities.length,
                totalVisited: memoryData.visited_cities.length
            };
        }
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: '获取统计数据失败', error: error.message });
    }
});

// ============================================================
// 情侣绑定 API 路由
// ============================================================

app.get('/api/couple/status', authenticateToken, async (req, res) => {
    try {
        let bind;
        if (db) {
            const [rows] = await db.execute(
                'SELECT * FROM couple_binds WHERE (user_id = ? OR partner_id = ?) AND status IN (?, ?) ORDER BY created_at DESC LIMIT 1',
                [req.user.id, req.user.id, 'pending', 'bound']
            );
            bind = rows[0] || null;

            if (bind && bind.status === 'pending' && new Date(bind.expired_at) < new Date()) {
                await db.execute('UPDATE couple_binds SET status = ? WHERE id = ?', ['expired', bind.id]);
                bind.status = 'expired';
            }
        } else {
            bind = memoryData.couple_binds.find(
                b => (b.user_id === req.user.id || b.partner_id === req.user.id) && ['pending', 'bound'].includes(b.status)
            ) || null;

            if (bind && bind.status === 'pending' && new Date(bind.expired_at) < new Date()) {
                bind.status = 'expired';
            }
        }

        if (!bind) {
            return res.json({ status: 'none', inviteCode: null, partner: null });
        }

        const partnerId = bind.user_id === req.user.id ? bind.partner_id : bind.user_id;
        let partner = null;
        if (bind.status === 'bound' && partnerId) {
            if (db) {
                const [rows] = await db.execute('SELECT id, username, nickname, email FROM users WHERE id = ?', [partnerId]);
                partner = rows[0] || null;
            } else {
                const p = memoryData.users.find(u => u.id === partnerId);
                partner = p ? { id: p.id, username: p.username, nickname: p.nickname, email: p.email } : null;
            }
        }

        res.json({
            status: bind.status,
            inviteCode: bind.status === 'pending' && bind.user_id === req.user.id ? bind.invite_code : null,
            partner,
            createdAt: bind.created_at,
            expiredAt: bind.expired_at,
            isInitiator: bind.user_id === req.user.id
        });
    } catch (error) {
        res.status(500).json({ message: '获取绑定状态失败', error: error.message });
    }
});

app.post('/api/couple/generate-invite', authenticateToken, async (req, res) => {
    try {
        let existingBind;
        if (db) {
            const [rows] = await db.execute(
                'SELECT * FROM couple_binds WHERE (user_id = ? OR partner_id = ?) AND status IN (?, ?)',
                [req.user.id, req.user.id, 'pending', 'bound']
            );
            existingBind = rows[0] || null;
        } else {
            existingBind = memoryData.couple_binds.find(
                b => (b.user_id === req.user.id || b.partner_id === req.user.id) && ['pending', 'bound'].includes(b.status)
            ) || null;
        }

        if (existingBind) {
            return res.status(400).json({ message: '您已有进行中的绑定或已绑定，请先解绑' });
        }

        let inviteCode;
        let attempts = 0;
        do {
            inviteCode = generateInviteCode();
            attempts++;
            if (db) {
                const [rows] = await db.execute('SELECT COUNT(*) as count FROM couple_binds WHERE invite_code = ? AND status = ?', [inviteCode, 'pending']);
                if (rows[0].count === 0) break;
            } else {
                if (!memoryData.couple_binds.find(b => b.invite_code === inviteCode && b.status === 'pending')) break;
            }
        } while (attempts < 10);

        const expiredAt = new Date(Date.now() + INVITE_EXPIRE_HOURS * 60 * 60 * 1000);

        if (db) {
            await db.execute(
                'INSERT INTO couple_binds (user_id, invite_code, status, expired_at) VALUES (?, ?, ?, ?)',
                [req.user.id, inviteCode, 'pending', expiredAt]
            );
        } else {
            memoryData.couple_binds.push({
                id: memoryData.couple_binds.length + 1,
                user_id: req.user.id,
                partner_id: null,
                invite_code: inviteCode,
                status: 'pending',
                created_at: new Date().toISOString(),
                expired_at: expiredAt.toISOString(),
                bound_at: null,
                unbound_at: null
            });
        }

        res.json({ inviteCode, expiredAt: expiredAt.toISOString() });
    } catch (error) {
        res.status(500).json({ message: '生成邀请码失败', error: error.message });
    }
});

app.post('/api/couple/accept-invite', authenticateToken, async (req, res) => {
    const { inviteCode } = req.body;
    if (!inviteCode) {
        return res.status(400).json({ message: '请输入邀请码' });
    }

    try {
        let existingBind;
        if (db) {
            const [rows] = await db.execute(
                'SELECT * FROM couple_binds WHERE (user_id = ? OR partner_id = ?) AND status IN (?, ?)',
                [req.user.id, req.user.id, 'pending', 'bound']
            );
            existingBind = rows[0] || null;
        } else {
            existingBind = memoryData.couple_binds.find(
                b => (b.user_id === req.user.id || b.partner_id === req.user.id) && ['pending', 'bound'].includes(b.status)
            ) || null;
        }

        if (existingBind) {
            return res.status(400).json({ message: '您已有进行中的绑定或已绑定，请先解绑' });
        }

        let targetBind;
        if (db) {
            const [rows] = await db.execute(
                'SELECT * FROM couple_binds WHERE invite_code = ? AND status = ?',
                [inviteCode.toUpperCase(), 'pending']
            );
            targetBind = rows[0] || null;
        } else {
            targetBind = memoryData.couple_binds.find(
                b => b.invite_code === inviteCode.toUpperCase() && b.status === 'pending'
            ) || null;
        }

        if (!targetBind) {
            return res.status(404).json({ message: '邀请码无效或已过期' });
        }

        if (targetBind.user_id === req.user.id) {
            return res.status(400).json({ message: '不能绑定自己' });
        }

        const expiredAt = new Date(targetBind.expired_at);
        if (expiredAt < new Date()) {
            if (db) {
                await db.execute('UPDATE couple_binds SET status = ? WHERE id = ?', ['expired', targetBind.id]);
            } else {
                targetBind.status = 'expired';
            }
            return res.status(400).json({ message: '邀请码已过期（有效期为24小时）' });
        }

        if (db) {
            await db.execute(
                'UPDATE couple_binds SET partner_id = ?, status = ?, bound_at = NOW() WHERE id = ?',
                [req.user.id, 'bound', targetBind.id]
            );
        } else {
            targetBind.partner_id = req.user.id;
            targetBind.status = 'bound';
            targetBind.bound_at = new Date().toISOString();
        }

        let partnerInfo;
        if (db) {
            const [rows] = await db.execute('SELECT id, username, nickname, email FROM users WHERE id = ?', [targetBind.user_id]);
            partnerInfo = rows[0];
        } else {
            const p = memoryData.users.find(u => u.id === targetBind.user_id);
            partnerInfo = p ? { id: p.id, username: p.username, nickname: p.nickname, email: p.email } : null;
        }

        res.json({ message: '绑定成功！现在你们可以共享足迹数据了', partner: partnerInfo });
    } catch (error) {
        res.status(500).json({ message: '接受邀请失败', error: error.message });
    }
});

app.post('/api/couple/unbind', authenticateToken, async (req, res) => {
    const { confirm } = req.body;
    if (confirm !== true) {
        return res.status(400).json({ message: '请确认解绑操作' });
    }

    try {
        let bind;
        if (db) {
            const [rows] = await db.execute(
                'SELECT * FROM couple_binds WHERE (user_id = ? OR partner_id = ?) AND status = ?',
                [req.user.id, req.user.id, 'bound']
            );
            bind = rows[0] || null;
        } else {
            bind = memoryData.couple_binds.find(
                b => (b.user_id === req.user.id || b.partner_id === req.user.id) && b.status === 'bound'
            ) || null;
        }

        if (!bind) {
            return res.status(404).json({ message: '没有找到有效的绑定关系' });
        }

        if (db) {
            await db.execute(
                'UPDATE couple_binds SET status = ?, unbound_at = NOW() WHERE id = ?',
                ['unbound', bind.id]
            );
        } else {
            bind.status = 'unbound';
            bind.unbound_at = new Date().toISOString();
        }

        res.json({ message: '解绑成功' });
    } catch (error) {
        res.status(500).json({ message: '解绑失败', error: error.message });
    }
});

// ============================================================
// 旅行日记 API 路由
// ============================================================

app.get('/api/diaries', authenticateToken, async (req, res) => {
    try {
        const partnerId = await getPartnerId(req.user.id);
        const { city_id } = req.query;
        let diaries;
        if (db) {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            const placeholders = userIds.map(() => '?').join(',');
            let sql = `SELECT d.*, c.name as city_name, u.nickname as author_nickname
                       FROM diaries d
                       LEFT JOIN cities c ON d.city_id = c.id
                       LEFT JOIN users u ON d.user_id = u.id
                       WHERE d.user_id IN (${placeholders})`;
            const params = [...userIds];
            if (city_id) {
                sql += ' AND d.city_id = ?';
                params.push(city_id);
            }
            sql += ' ORDER BY d.created_at DESC';
            const [rows] = await db.execute(sql, params);
            diaries = rows;
        } else {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            diaries = memoryData.diaries
                .filter(d => userIds.includes(d.user_id) && (!city_id || d.city_id === parseInt(city_id)))
                .map(d => ({
                    ...d,
                    city_name: memoryData.cities.find(c => c.id === d.city_id)?.name || null,
                    author_nickname: memoryData.users.find(u => u.id === d.user_id)?.nickname || ''
                }))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        res.json(diaries);
    } catch (error) {
        res.status(500).json({ message: '获取日记失败', error: error.message });
    }
});

app.get('/api/diaries/:id', authenticateToken, async (req, res) => {
    try {
        const partnerId = await getPartnerId(req.user.id);
        let diary;
        if (db) {
            const [rows] = await db.execute(
                'SELECT d.*, c.name as city_name, u.nickname as author_nickname FROM diaries d LEFT JOIN cities c ON d.city_id = c.id LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?',
                [req.params.id]
            );
            diary = rows[0] || null;
        } else {
            diary = memoryData.diaries.find(d => d.id === parseInt(req.params.id)) || null;
            if (diary) {
                diary.city_name = memoryData.cities.find(c => c.id === diary.city_id)?.name || null;
            }
        }
        if (!diary) return res.status(404).json({ message: '日记不存在' });
        const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
        if (!userIds.includes(diary.user_id)) return res.status(403).json({ message: '无权查看' });
        res.json(diary);
    } catch (error) {
        res.status(500).json({ message: '获取日记失败', error: error.message });
    }
});

app.post('/api/diaries', authenticateToken, upload.single('cover_image'), async (req, res) => {
    const { title, content, city_id, privacy_level, tags } = req.body;
    if (!title) return res.status(400).json({ message: '标题不能为空' });
    const cover_image = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        if (db) {
            const [result] = await db.execute(
                'INSERT INTO diaries (user_id, title, content, city_id, privacy_level) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, title, content || '', city_id || null, privacy_level || 'private']
            );
            const diaryId = result.insertId;
            if (cover_image) {
                await db.execute('UPDATE diaries SET cover_image = ? WHERE id = ?', [cover_image, diaryId]);
            }
            res.json({ message: '日记创建成功', diaryId, cover_image });
        } else {
            if (!memoryData.diaries) memoryData.diaries = [];
            const newDiary = {
                id: memoryData.diaries.length + 1,
                user_id: req.user.id,
                title,
                content: content || '',
                city_id: city_id ? parseInt(city_id) : null,
                privacy_level: privacy_level || 'private',
                cover_image,
                tags: tags || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            memoryData.diaries.push(newDiary);
            res.json({ message: '日记创建成功', diaryId: newDiary.id, cover_image });
        }
    } catch (error) {
        res.status(500).json({ message: '创建日记失败', error: error.message });
    }
});

app.put('/api/diaries/:id', authenticateToken, upload.single('cover_image'), async (req, res) => {
    const { title, content, city_id, privacy_level, tags } = req.body;
    try {
        if (db) {
            const [rows] = await db.execute('SELECT * FROM diaries WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: '日记不存在或无权编辑' });
            const cover_image = req.file ? `/uploads/${req.file.filename}` : rows[0].cover_image;
            await db.execute(
                'UPDATE diaries SET title = ?, content = ?, city_id = ?, privacy_level = ?, cover_image = ? WHERE id = ?',
                [title || rows[0].title, content || rows[0].content, city_id || rows[0].city_id, privacy_level || rows[0].privacy_level, cover_image, req.params.id]
            );
            res.json({ message: '日记更新成功', cover_image });
        } else {
            const diary = memoryData.diaries.find(d => d.id === parseInt(req.params.id) && d.user_id === req.user.id);
            if (!diary) return res.status(404).json({ message: '日记不存在或无权编辑' });
            if (title) diary.title = title;
            if (content) diary.content = content;
            if (city_id) diary.city_id = parseInt(city_id);
            if (privacy_level) diary.privacy_level = privacy_level;
            if (req.file) diary.cover_image = `/uploads/${req.file.filename}`;
            diary.updated_at = new Date().toISOString();
            res.json({ message: '日记更新成功' });
        }
    } catch (error) {
        res.status(500).json({ message: '更新日记失败', error: error.message });
    }
});

app.delete('/api/diaries/:id', authenticateToken, async (req, res) => {
    try {
        if (db) {
            const [rows] = await db.execute('SELECT cover_image FROM diaries WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: '日记不存在或无权删除' });
            await db.execute('DELETE FROM diaries WHERE id = ?', [req.params.id]);
            if (rows[0].cover_image) {
                const fs = require('fs');
                fs.unlink(path.join(__dirname, rows[0].cover_image), () => {});
            }
        } else {
            const index = memoryData.diaries.findIndex(d => d.id === parseInt(req.params.id) && d.user_id === req.user.id);
            if (index === -1) return res.status(404).json({ message: '日记不存在或无权删除' });
            memoryData.diaries.splice(index, 1);
        }
        res.json({ message: '日记删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除日记失败', error: error.message });
    }
});

// ============================================================
// 素材相册 API 路由
// ============================================================

app.get('/api/albums', authenticateToken, async (req, res) => {
    try {
        const partnerId = await getPartnerId(req.user.id);
        let albums;
        if (db) {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            const ph = userIds.map(() => '?').join(',');
            const [rows] = await db.execute(
                `SELECT a.*, u.nickname as author_nickname,
                 (SELECT COUNT(*) FROM photos WHERE album_id = a.id) as photo_count,
                 (SELECT url FROM photos WHERE album_id = a.id ORDER BY created_at DESC LIMIT 1) as latest_photo
                 FROM albums a LEFT JOIN users u ON a.user_id = u.id
                 WHERE a.user_id IN (${ph}) ORDER BY a.created_at DESC`,
                userIds
            );
            albums = rows;
        } else {
            if (!memoryData.albums) memoryData.albums = [];
            if (!memoryData.photos) memoryData.photos = [];
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            albums = memoryData.albums
                .filter(a => userIds.includes(a.user_id))
                .map(a => ({
                    ...a,
                    author_nickname: memoryData.users.find(u => u.id === a.user_id)?.nickname || '',
                    photo_count: memoryData.photos.filter(p => p.album_id === a.id).length,
                    latest_photo: memoryData.photos.filter(p => p.album_id === a.id).sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0]?.url || null
                }))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        res.json(albums);
    } catch (error) {
        res.status(500).json({ message: '获取相册失败', error: error.message });
    }
});

app.post('/api/albums', authenticateToken, async (req, res) => {
    const { name, description, is_public } = req.body;
    if (!name) return res.status(400).json({ message: '相册名称不能为空' });
    try {
        if (db) {
            const [result] = await db.execute(
                'INSERT INTO albums (user_id, name, description, is_public) VALUES (?, ?, ?, ?)',
                [req.user.id, name, description || '', is_public || false]
            );
            res.json({ message: '相册创建成功', albumId: result.insertId });
        } else {
            if (!memoryData.albums) memoryData.albums = [];
            const newAlbum = {
                id: memoryData.albums.length + 1,
                user_id: req.user.id,
                name,
                description: description || '',
                is_public: is_public || false,
                created_at: new Date().toISOString()
            };
            memoryData.albums.push(newAlbum);
            res.json({ message: '相册创建成功', albumId: newAlbum.id });
        }
    } catch (error) {
        res.status(500).json({ message: '创建相册失败', error: error.message });
    }
});

app.put('/api/albums/:id', authenticateToken, async (req, res) => {
    const { name, description, is_public } = req.body;
    try {
        if (db) {
            const [rows] = await db.execute('SELECT * FROM albums WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: '相册不存在或无权编辑' });
            await db.execute(
                'UPDATE albums SET name = ?, description = ?, is_public = ? WHERE id = ?',
                [name || rows[0].name, description !== undefined ? description : rows[0].description, is_public !== undefined ? is_public : rows[0].is_public, req.params.id]
            );
            res.json({ message: '相册更新成功' });
        } else {
            const album = memoryData.albums.find(a => a.id === parseInt(req.params.id) && a.user_id === req.user.id);
            if (!album) return res.status(404).json({ message: '相册不存在或无权编辑' });
            if (name) album.name = name;
            if (description !== undefined) album.description = description;
            if (is_public !== undefined) album.is_public = is_public;
            res.json({ message: '相册更新成功' });
        }
    } catch (error) {
        res.status(500).json({ message: '更新相册失败', error: error.message });
    }
});

app.delete('/api/albums/:id', authenticateToken, async (req, res) => {
    try {
        if (db) {
            const [rows] = await db.execute('SELECT * FROM albums WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: '相册不存在或无权删除' });
            const [photos] = await db.execute('SELECT url FROM photos WHERE album_id = ?', [req.params.id]);
            await db.execute('DELETE FROM photos WHERE album_id = ?', [req.params.id]);
            await db.execute('DELETE FROM albums WHERE id = ?', [req.params.id]);
            const fs = require('fs');
            photos.forEach(p => fs.unlink(path.join(__dirname, p.url), () => {}));
        } else {
            if (!memoryData.albums) memoryData.albums = [];
            if (!memoryData.photos) memoryData.photos = [];
            const index = memoryData.albums.findIndex(a => a.id === parseInt(req.params.id) && a.user_id === req.user.id);
            if (index === -1) return res.status(404).json({ message: '相册不存在或无权删除' });
            memoryData.photos = memoryData.photos.filter(p => p.album_id !== parseInt(req.params.id));
            memoryData.albums.splice(index, 1);
        }
        res.json({ message: '相册删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除相册失败', error: error.message });
    }
});

app.get('/api/albums/:id/photos', authenticateToken, async (req, res) => {
    try {
        const partnerId = await getPartnerId(req.user.id);
        let photos;
        if (db) {
            const [albumRows] = await db.execute('SELECT user_id FROM albums WHERE id = ?', [req.params.id]);
            if (albumRows.length === 0) return res.status(404).json({ message: '相册不存在' });
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            if (!userIds.includes(albumRows[0].user_id)) return res.status(403).json({ message: '无权查看' });
            const [rows] = await db.execute(
                'SELECT p.*, u.nickname as author_nickname FROM photos p LEFT JOIN users u ON p.user_id = u.id WHERE p.album_id = ? ORDER BY p.created_at DESC',
                [req.params.id]
            );
            photos = rows;
        } else {
            if (!memoryData.photos) memoryData.photos = [];
            photos = memoryData.photos
                .filter(p => p.album_id === parseInt(req.params.id))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        res.json(photos);
    } catch (error) {
        res.status(500).json({ message: '获取照片失败', error: error.message });
    }
});

app.post('/api/albums/:id/photos', authenticateToken, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: '请选择图片' });
    const { caption, type } = req.body;
    const url = `/uploads/${req.file.filename}`;
    try {
        if (db) {
            const [albumRows] = await db.execute('SELECT * FROM albums WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
            if (albumRows.length === 0) return res.status(404).json({ message: '相册不存在或无权操作' });
            const [result] = await db.execute(
                'INSERT INTO photos (album_id, user_id, url, caption, type) VALUES (?, ?, ?, ?, ?)',
                [req.params.id, req.user.id, url, caption || '', type || 'photo']
            );
            if (!albumRows[0].cover_image) {
                await db.execute('UPDATE albums SET cover_image = ? WHERE id = ?', [url, req.params.id]);
            }
            res.json({ message: '照片上传成功', photoId: result.insertId, url });
        } else {
            if (!memoryData.photos) memoryData.photos = [];
            const newPhoto = {
                id: memoryData.photos.length + 1,
                album_id: parseInt(req.params.id),
                user_id: req.user.id,
                url,
                caption: caption || '',
                type: type || 'photo',
                created_at: new Date().toISOString()
            };
            memoryData.photos.push(newPhoto);
            res.json({ message: '照片上传成功', photoId: newPhoto.id, url });
        }
    } catch (error) {
        res.status(500).json({ message: '上传照片失败', error: error.message });
    }
});

app.delete('/api/photos/:id', authenticateToken, async (req, res) => {
    try {
        if (db) {
            const [rows] = await db.execute('SELECT * FROM photos WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: '照片不存在或无权删除' });
            await db.execute('DELETE FROM photos WHERE id = ?', [req.params.id]);
            const fs = require('fs');
            fs.unlink(path.join(__dirname, rows[0].url), () => {});
        } else {
            if (!memoryData.photos) memoryData.photos = [];
            const index = memoryData.photos.findIndex(p => p.id === parseInt(req.params.id) && p.user_id === req.user.id);
            if (index === -1) return res.status(404).json({ message: '照片不存在或无权删除' });
            memoryData.photos.splice(index, 1);
        }
        res.json({ message: '照片删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除照片失败', error: error.message });
    }
});

// ============================================================
// 行程规划 API 路由
// ============================================================

app.get('/api/plans', authenticateToken, async (req, res) => {
    try {
        const partnerId = await getPartnerId(req.user.id);
        let plans;
        if (db) {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            const ph = userIds.map(() => '?').join(',');
            const [rows] = await db.execute(
                `SELECT p.*, u.nickname as author_nickname,
                 (SELECT COUNT(*) FROM plan_days WHERE plan_id = p.id) as day_count
                 FROM plans p LEFT JOIN users u ON p.user_id = u.id
                 WHERE p.user_id IN (${ph}) ORDER BY p.created_at DESC`,
                userIds
            );
            plans = rows;
        } else {
            if (!memoryData.plans) memoryData.plans = [];
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            plans = memoryData.plans
                .filter(p => userIds.includes(p.user_id))
                .map(p => ({
                    ...p,
                    author_nickname: memoryData.users.find(u => u.id === p.user_id)?.nickname || '',
                    day_count: (memoryData.plan_days || []).filter(d => d.plan_id === p.id).length
                }))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: '获取行程失败', error: error.message });
    }
});

app.post('/api/plans', authenticateToken, async (req, res) => {
    const { title, start_date, end_date, budget } = req.body;
    if (!title) return res.status(400).json({ message: '行程标题不能为空' });
    try {
        if (db) {
            const [result] = await db.execute(
                'INSERT INTO plans (user_id, title, start_date, end_date, budget) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, title, start_date || null, end_date || null, budget || null]
            );
            res.json({ message: '行程创建成功', planId: result.insertId });
        } else {
            if (!memoryData.plans) memoryData.plans = [];
            const newPlan = {
                id: memoryData.plans.length + 1,
                user_id: req.user.id,
                title,
                start_date: start_date || null,
                end_date: end_date || null,
                status: 'planning',
                budget: budget || null,
                created_at: new Date().toISOString()
            };
            memoryData.plans.push(newPlan);
            res.json({ message: '行程创建成功', planId: newPlan.id });
        }
    } catch (error) {
        res.status(500).json({ message: '创建行程失败', error: error.message });
    }
});

app.put('/api/plans/:id', authenticateToken, async (req, res) => {
    const { title, start_date, end_date, status, budget } = req.body;
    try {
        if (db) {
            const [rows] = await db.execute('SELECT * FROM plans WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: '行程不存在或无权编辑' });
            await db.execute(
                'UPDATE plans SET title = ?, start_date = ?, end_date = ?, status = ?, budget = ? WHERE id = ?',
                [title || rows[0].title, start_date || rows[0].start_date, end_date || rows[0].end_date,
                 status || rows[0].status, budget !== undefined ? budget : rows[0].budget, req.params.id]
            );
            res.json({ message: '行程更新成功' });
        } else {
            const plan = memoryData.plans.find(p => p.id === parseInt(req.params.id) && p.user_id === req.user.id);
            if (!plan) return res.status(404).json({ message: '行程不存在或无权编辑' });
            if (title) plan.title = title;
            if (start_date) plan.start_date = start_date;
            if (end_date) plan.end_date = end_date;
            if (status) plan.status = status;
            if (budget !== undefined) plan.budget = budget;
            res.json({ message: '行程更新成功' });
        }
    } catch (error) {
        res.status(500).json({ message: '更新行程失败', error: error.message });
    }
});

app.delete('/api/plans/:id', authenticateToken, async (req, res) => {
    try {
        if (db) {
            await db.execute('DELETE FROM plan_items WHERE day_id IN (SELECT id FROM plan_days WHERE plan_id = ?)', [req.params.id]);
            await db.execute('DELETE FROM plan_days WHERE plan_id = ?', [req.params.id]);
            await db.execute('DELETE FROM plans WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        } else {
            if (!memoryData.plan_days) memoryData.plan_days = [];
            if (!memoryData.plan_items) memoryData.plan_items = [];
            const dayIds = memoryData.plan_days.filter(d => d.plan_id === parseInt(req.params.id)).map(d => d.id);
            memoryData.plan_items = memoryData.plan_items.filter(i => !dayIds.includes(i.day_id));
            memoryData.plan_days = memoryData.plan_days.filter(d => d.plan_id !== parseInt(req.params.id));
            memoryData.plans = memoryData.plans.filter(p => !(p.id === parseInt(req.params.id) && p.user_id === req.user.id));
        }
        res.json({ message: '行程删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除行程失败', error: error.message });
    }
});

app.get('/api/plans/:id/days', authenticateToken, async (req, res) => {
    try {
        if (db) {
            const [days] = await db.execute('SELECT * FROM plan_days WHERE plan_id = ? ORDER BY day_number', [req.params.id]);
            for (const day of days) {
                const [items] = await db.execute('SELECT * FROM plan_items WHERE day_id = ? ORDER BY sort_order', [day.id]);
                day.items = items;
            }
            res.json(days);
        } else {
            if (!memoryData.plan_days) memoryData.plan_days = [];
            if (!memoryData.plan_items) memoryData.plan_items = [];
            const days = memoryData.plan_days
                .filter(d => d.plan_id === parseInt(req.params.id))
                .sort((a, b) => a.day_number - b.day_number)
                .map(d => ({
                    ...d,
                    items: memoryData.plan_items.filter(i => i.day_id === d.id).sort((a, b) => a.sort_order - b.sort_order)
                }));
            res.json(days);
        }
    } catch (error) {
        res.status(500).json({ message: '获取行程天数失败', error: error.message });
    }
});

app.post('/api/plans/:id/days', authenticateToken, async (req, res) => {
    const { day_number, date, title } = req.body;
    try {
        if (db) {
            const [result] = await db.execute(
                'INSERT INTO plan_days (plan_id, day_number, date, title) VALUES (?, ?, ?, ?)',
                [req.params.id, day_number, date || null, title || `第${day_number}天`]
            );
            res.json({ message: '添加成功', dayId: result.insertId });
        } else {
            if (!memoryData.plan_days) memoryData.plan_days = [];
            const newDay = {
                id: memoryData.plan_days.length + 1,
                plan_id: parseInt(req.params.id),
                day_number,
                date: date || null,
                title: title || `第${day_number}天`,
                created_at: new Date().toISOString()
            };
            memoryData.plan_days.push(newDay);
            res.json({ message: '添加成功', dayId: newDay.id });
        }
    } catch (error) {
        res.status(500).json({ message: '添加天数失败', error: error.message });
    }
});

app.delete('/api/plans/days/:dayId', authenticateToken, async (req, res) => {
    try {
        if (db) {
            await db.execute('DELETE FROM plan_items WHERE day_id = ?', [req.params.dayId]);
            await db.execute('DELETE FROM plan_days WHERE id = ?', [req.params.dayId]);
        } else {
            if (!memoryData.plan_items) memoryData.plan_items = [];
            if (!memoryData.plan_days) memoryData.plan_days = [];
            memoryData.plan_items = memoryData.plan_items.filter(i => i.day_id !== parseInt(req.params.dayId));
            memoryData.plan_days = memoryData.plan_days.filter(d => d.id !== parseInt(req.params.dayId));
        }
        res.json({ message: '删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除失败', error: error.message });
    }
});

app.post('/api/plans/days/:dayId/items', authenticateToken, async (req, res) => {
    const { time_slot, title, description, location } = req.body;
    if (!title) return res.status(400).json({ message: '项目标题不能为空' });
    try {
        if (db) {
            const [maxOrder] = await db.execute('SELECT MAX(sort_order) as max_order FROM plan_items WHERE day_id = ?', [req.params.dayId]);
            const sortOrder = (maxOrder[0].max_order || 0) + 1;
            const [result] = await db.execute(
                'INSERT INTO plan_items (day_id, time_slot, title, description, location, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
                [req.params.dayId, time_slot || '', title, description || '', location || '', sortOrder]
            );
            res.json({ message: '添加成功', itemId: result.insertId });
        } else {
            if (!memoryData.plan_items) memoryData.plan_items = [];
            const maxOrder = memoryData.plan_items.filter(i => i.day_id === parseInt(req.params.dayId)).length;
            const newItem = {
                id: memoryData.plan_items.length + 1,
                day_id: parseInt(req.params.dayId),
                time_slot: time_slot || '',
                title,
                description: description || '',
                location: location || '',
                sort_order: maxOrder + 1,
                created_at: new Date().toISOString()
            };
            memoryData.plan_items.push(newItem);
            res.json({ message: '添加成功', itemId: newItem.id });
        }
    } catch (error) {
        res.status(500).json({ message: '添加项目失败', error: error.message });
    }
});

app.put('/api/plans/items/:itemId', authenticateToken, async (req, res) => {
    const { time_slot, title, description, location } = req.body;
    try {
        if (db) {
            await db.execute(
                'UPDATE plan_items SET time_slot = ?, title = ?, description = ?, location = ? WHERE id = ?',
                [time_slot || '', title || '', description || '', location || '', req.params.itemId]
            );
        } else {
            const item = memoryData.plan_items.find(i => i.id === parseInt(req.params.itemId));
            if (item) {
                if (time_slot !== undefined) item.time_slot = time_slot;
                if (title) item.title = title;
                if (description !== undefined) item.description = description;
                if (location !== undefined) item.location = location;
            }
        }
        res.json({ message: '更新成功' });
    } catch (error) {
        res.status(500).json({ message: '更新失败', error: error.message });
    }
});

app.delete('/api/plans/items/:itemId', authenticateToken, async (req, res) => {
    try {
        if (db) {
            await db.execute('DELETE FROM plan_items WHERE id = ?', [req.params.itemId]);
        } else {
            if (!memoryData.plan_items) memoryData.plan_items = [];
            memoryData.plan_items = memoryData.plan_items.filter(i => i.id !== parseInt(req.params.itemId));
        }
        res.json({ message: '删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除失败', error: error.message });
    }
});

// ============================================================
// 心愿清单 API 路由
// ============================================================

app.get('/api/wishlist', authenticateToken, async (req, res) => {
    try {
        const partnerId = await getPartnerId(req.user.id);
        const { type } = req.query;
        let items;
        if (db) {
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            const ph = userIds.map(() => '?').join(',');
            let sql = `SELECT w.*, u.nickname as author_nickname FROM wishlist w LEFT JOIN users u ON w.user_id = u.id WHERE w.user_id IN (${ph})`;
            const params = [...userIds];
            if (type && type !== 'all') {
                sql += ' AND w.type = ?';
                params.push(type);
            }
            sql += ' ORDER BY w.created_at DESC';
            const [rows] = await db.execute(sql, params);
            items = rows;
        } else {
            if (!memoryData.wishlist) memoryData.wishlist = [];
            const userIds = partnerId ? [req.user.id, partnerId] : [req.user.id];
            items = memoryData.wishlist
                .filter(w => userIds.includes(w.user_id) && (!type || type === 'all' || w.type === type))
                .map(w => ({
                    ...w,
                    author_nickname: memoryData.users.find(u => u.id === w.user_id)?.nickname || ''
                }))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: '获取心愿清单失败', error: error.message });
    }
});

app.post('/api/wishlist', authenticateToken, async (req, res) => {
    const { title, type, description, priority } = req.body;
    if (!title) return res.status(400).json({ message: '心愿标题不能为空' });
    try {
        if (db) {
            const [result] = await db.execute(
                'INSERT INTO wishlist (user_id, title, type, description, priority) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, title, type || 'destination', description || '', priority || 'medium']
            );
            res.json({ message: '心愿添加成功', wishId: result.insertId });
        } else {
            if (!memoryData.wishlist) memoryData.wishlist = [];
            const newWish = {
                id: memoryData.wishlist.length + 1,
                user_id: req.user.id,
                title,
                type: type || 'destination',
                description: description || '',
                priority: priority || 'medium',
                is_completed: false,
                created_at: new Date().toISOString()
            };
            memoryData.wishlist.push(newWish);
            res.json({ message: '心愿添加成功', wishId: newWish.id });
        }
    } catch (error) {
        res.status(500).json({ message: '添加心愿失败', error: error.message });
    }
});

app.put('/api/wishlist/:id', authenticateToken, async (req, res) => {
    const { title, type, description, priority, is_completed } = req.body;
    try {
        if (db) {
            const [rows] = await db.execute('SELECT * FROM wishlist WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: '心愿不存在或无权编辑' });
            await db.execute(
                'UPDATE wishlist SET title = ?, type = ?, description = ?, priority = ?, is_completed = ? WHERE id = ?',
                [title || rows[0].title, type || rows[0].type, description !== undefined ? description : rows[0].description,
                 priority || rows[0].priority, is_completed !== undefined ? is_completed : rows[0].is_completed, req.params.id]
            );
            res.json({ message: '心愿更新成功' });
        } else {
            const wish = memoryData.wishlist.find(w => w.id === parseInt(req.params.id) && w.user_id === req.user.id);
            if (!wish) return res.status(404).json({ message: '心愿不存在或无权编辑' });
            if (title) wish.title = title;
            if (type) wish.type = type;
            if (description !== undefined) wish.description = description;
            if (priority) wish.priority = priority;
            if (is_completed !== undefined) wish.is_completed = is_completed;
            res.json({ message: '心愿更新成功' });
        }
    } catch (error) {
        res.status(500).json({ message: '更新心愿失败', error: error.message });
    }
});

app.delete('/api/wishlist/:id', authenticateToken, async (req, res) => {
    try {
        if (db) {
            await db.execute('DELETE FROM wishlist WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        } else {
            if (!memoryData.wishlist) memoryData.wishlist = [];
            memoryData.wishlist = memoryData.wishlist.filter(w => !(w.id === parseInt(req.params.id) && w.user_id === req.user.id));
        }
        res.json({ message: '心愿删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除心愿失败', error: error.message });
    }
});

app.listen(PORT, async () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    await connectDatabase();
});
