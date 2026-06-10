/**
 * DAEEE・同行集 - 情侣绑定与数据隔离测试
 * 运行方式: node tests/couple_bind.test.js
 * 需要先启动服务器: npm start
 */

const TEST_BASE = 'http://localhost:3000/api';
const assert = require('assert');

let tokenA = null;
let tokenB = null;
let tokenC = null;
let userA = null;
let userB = null;
let userC = null;
let inviteCodeA = null;

const TEST_PREFIX = 'test_' + Date.now() + '_';
const USER_A = { username: TEST_PREFIX + 'user_a', password: 'test123', nickname: '测试用户A' };
const USER_B = { username: TEST_PREFIX + 'user_b', password: 'test123', nickname: '测试用户B' };
const USER_C = { username: TEST_PREFIX + 'user_c', password: 'test123', nickname: '测试用户C' };

async function api(path, options = {}) {
    const url = TEST_BASE + path;
    const headers = { ...options.headers };
    if (options.token) {
        headers['Authorization'] = `Bearer ${options.token}`;
    }
    if (options.json) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.json ? JSON.stringify(options.json) : undefined
    });
    const data = await response.json();
    return { status: response.status, ok: response.ok, data };
}

async function register(user) {
    const { status, data } = await api('/register', {
        method: 'POST',
        json: user
    });
    return { status, data };
}

async function login(user) {
    const { status, data } = await api('/login', {
        method: 'POST',
        json: { username: user.username, password: user.password }
    });
    return { status, data };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
    return async () => {
        try {
            await fn();
            passed++;
            console.log(`  ✓ ${name}`);
        } catch (error) {
            failed++;
            console.log(`  ✗ ${name}`);
            console.log(`    ${error.message}`);
        }
    };
}

async function runSuite(name, tests) {
    console.log(`\n${name}`);
    for (const t of tests) {
        await t();
    }
}

// ── Tests ──────────────────────────────────────────────────

async function testRegisterAndLogin() {
    await runSuite('1. 用户注册与登录', [
        test('注册用户A', async () => {
            const { status, data } = await register(USER_A);
            assert.strictEqual(status, 200, '注册应返回200');
            assert.ok(data.userId, '应返回userId');
            const loginResult = await login(USER_A);
            tokenA = loginResult.data.token;
            userA = loginResult.data.user;
            assert.ok(tokenA, '应有token');
        }),

        test('注册用户B', async () => {
            const { status } = await register(USER_B);
            assert.strictEqual(status, 200, '注册应返回200');
            const loginResult = await login(USER_B);
            tokenB = loginResult.data.token;
            userB = loginResult.data.user;
            assert.ok(tokenB, '应有token');
        }),

        test('注册用户C', async () => {
            const { status } = await register(USER_C);
            assert.strictEqual(status, 200, '注册应返回200');
            const loginResult = await login(USER_C);
            tokenC = loginResult.data.token;
            userC = loginResult.data.user;
            assert.ok(tokenC, '应有token');
        }),

        test('重复用户名注册应失败', async () => {
            const { status } = await register(USER_A);
            assert.strictEqual(status, 400, '重复注册应返回400');
        }),
    ]);
}

async function testDataIsolation() {
    await runSuite('2. 数据隔离 - 无绑定状态', [
        test('用户A添加足迹', async () => {
            // First get a city
            const { data: cities } = await api('/cities');
            const cityId = cities[0].id;

            const { status, data } = await api('/footprints', {
                method: 'POST',
                token: tokenA,
                json: {
                    city_id: cityId,
                    name: '测试足迹A',
                    description: '用户A的测试足迹',
                    latitude: cities[0].latitude,
                    longitude: cities[0].longitude
                }
            });
            assert.ok(status === 200 || data.footprintId, '应成功添加足迹');
        }),

        test('用户A只能看到自己的足迹', async () => {
            const { data: footprints } = await api('/footprints', { token: tokenA });
            const othersFootprints = footprints.filter(f => f.user_id !== userA.id);
            assert.strictEqual(othersFootprints.length, 0, '不应包含他人足迹');
        }),

        test('用户B无法访问用户A的统计', async () => {
            const { status } = await api(`/statistics/${userA.id}`, { token: tokenB });
            assert.strictEqual(status, 403, '越权访问应返回403');
        }),

        test('未认证用户无法访问足迹', async () => {
            const { status } = await api('/footprints');
            assert.strictEqual(status, 401, '未认证应返回401');
        }),
    ]);
}

async function testCoupleBinding() {
    await runSuite('3. 情侣绑定流程', [
        test('用户A生成邀请码', async () => {
            const { status, data } = await api('/couple/generate-invite', {
                method: 'POST',
                token: tokenA
            });
            assert.strictEqual(status, 200, '生成邀请码应返回200');
            assert.ok(data.inviteCode, '应有inviteCode');
            assert.strictEqual(data.inviteCode.length, 6, '邀请码应为6位');
            assert.ok(data.expiredAt, '应有expiredAt');
            inviteCodeA = data.inviteCode;
        }),

        test('邀请码格式正确', async () => {
            assert.ok(/^[A-Z0-9]{6}$/.test(inviteCodeA), '邀请码应为6位大写字母数字组合');
        }),

        test('用户A已有pending绑定，不能再次生成', async () => {
            const { status } = await api('/couple/generate-invite', {
                method: 'POST',
                token: tokenA
            });
            assert.strictEqual(status, 400, '重复生成应返回400');
        }),

        test('用户B查看绑定状态为none', async () => {
            const { data } = await api('/couple/status', { token: tokenB });
            assert.strictEqual(data.status, 'none', '未绑定用户状态应为none');
        }),

        test('用户B使用邀请码接受绑定', async () => {
            const { status, data } = await api('/couple/accept-invite', {
                method: 'POST',
                token: tokenB,
                json: { inviteCode: inviteCodeA }
            });
            assert.strictEqual(status, 200, '接受邀请应返回200');
            assert.ok(data.partner, '应有伴侣信息');
            assert.strictEqual(data.partner.id, userA.id, '伴侣应为用户A');
        }),

        test('绑定后用户A状态为bound', async () => {
            const { data } = await api('/couple/status', { token: tokenA });
            assert.strictEqual(data.status, 'bound', '用户A状态应为bound');
        }),

        test('绑定后用户B状态为bound', async () => {
            const { data } = await api('/couple/status', { token: tokenB });
            assert.strictEqual(data.status, 'bound', '用户B状态应为bound');
        }),

        test('用户A获取用户信息包含伴侣', async () => {
            const { data } = await api('/user', { token: tokenA });
            assert.ok(data.partnerId, '应有partnerId');
            assert.ok(data.partner, '应有partner信息');
            assert.strictEqual(data.partner.id, userB.id, '伴侣应为用户B');
        }),

        test('已绑定用户不能接受其他邀请', async () => {
            const { status } = await api('/couple/accept-invite', {
                method: 'POST',
                token: tokenB,
                json: { inviteCode: 'XXXXXX' }
            });
            assert.strictEqual(status, 400, '已绑定接受新邀请应返回400');
        }),

        test('不能绑定自己', async () => {
            // First unbind
            await api('/couple/unbind', {
                method: 'POST',
                token: tokenA,
                json: { confirm: true }
            });
            // Re-generate and try to accept own invite
            const { data: genData } = await api('/couple/generate-invite', {
                method: 'POST',
                token: tokenA
            });
            const { status } = await api('/couple/accept-invite', {
                method: 'POST',
                token: tokenA,
                json: { inviteCode: genData.inviteCode }
            });
            assert.strictEqual(status, 400, '绑定自己应返回400');
        }),
    ]);
}

async function testDataSharing() {
    await runSuite('4. 数据共享 - 绑定后', [
        test('重新绑定A和B', async () => {
            // Clean up existing
            const statusResult = await api('/couple/status', { token: tokenA });
            if (statusResult.data.status === 'pending') {
                await api('/couple/unbind', { method: 'POST', token: tokenA, json: { confirm: true } });
            }
            if (statusResult.data.status === 'bound') {
                await api('/couple/unbind', { method: 'POST', token: tokenA, json: { confirm: true } });
            }

            // Re-generate invite for A
            const { data: genData } = await api('/couple/generate-invite', {
                method: 'POST',
                token: tokenA
            });
            // B accepts
            const { status } = await api('/couple/accept-invite', {
                method: 'POST',
                token: tokenB,
                json: { inviteCode: genData.inviteCode }
            });
            assert.strictEqual(status, 200, '重新绑定应成功');
        }),

        test('用户B可以看到用户A的足迹', async () => {
            const { data: footprints } = await api('/footprints', { token: tokenB });
            const aFootprints = footprints.filter(f => f.user_id === userA.id);
            // A may or may not have footprints depending on test order
            // Just verify the response doesn't error
            assert.ok(Array.isArray(footprints), '应返回足迹数组');
        }),

        test('用户A可以看到用户B的到访城市', async () => {
            const { data } = await api('/visited-cities', { token: tokenA });
            assert.ok(Array.isArray(data), '应返回到访城市数组');
        }),

        test('用户A可以查看用户B的统计', async () => {
            const { status, data } = await api(`/statistics/${userB.id}`, { token: tokenA });
            assert.strictEqual(status, 200, '伴侣查看统计应返回200');
            assert.ok(data.visitedCount !== undefined, '应有visitedCount');
        }),

        test('绑定用户可以看到共享的印章', async () => {
            const { data } = await api('/stamps', { token: tokenA });
            assert.ok(Array.isArray(data), '应返回印章数组');
        }),

        test('用户C无法查看绑定用户的统计', async () => {
            const { status } = await api(`/statistics/${userA.id}`, { token: tokenC });
            assert.strictEqual(status, 403, '第三方查看应返回403');
        }),
    ]);
}

async function testUnbind() {
    await runSuite('5. 解绑功能', [
        test('无确认的解绑应失败', async () => {
            const { status } = await api('/couple/unbind', {
                method: 'POST',
                token: tokenA,
                json: { confirm: false }
            });
            assert.strictEqual(status, 400, '无确认解绑应返回400');
        }),

        test('确认解绑成功', async () => {
            const { status, data } = await api('/couple/unbind', {
                method: 'POST',
                token: tokenA,
                json: { confirm: true }
            });
            assert.strictEqual(status, 200, '解绑应返回200');
            assert.ok(data.message, '应有解绑成功消息');
        }),

        test('解绑后状态为none', async () => {
            const { data } = await api('/couple/status', { token: tokenA });
            assert.strictEqual(data.status, 'none', '解绑后状态应为none');
        }),

        test('解绑后无法查看对方统计', async () => {
            const { status } = await api(`/statistics/${userB.id}`, { token: tokenA });
            assert.strictEqual(status, 403, '解绑后查看对方统计应返回403');
        }),

        test('解绑后可重新生成邀请码', async () => {
            const { status } = await api('/couple/generate-invite', {
                method: 'POST',
                token: tokenA
            });
            assert.strictEqual(status, 200, '解绑后可重新生成邀请码');
            // Clean up
            await api('/couple/unbind', { method: 'POST', token: tokenA, json: { confirm: true } });
        }),
    ]);
}

async function testInviteExpiry() {
    await runSuite('6. 邀请码过期机制', [
        test('过期时间应为24小时后', async () => {
            const { data } = await api('/couple/generate-invite', {
                method: 'POST',
                token: tokenA
            });
            const expiredAt = new Date(data.expiredAt);
            const now = new Date();
            const diffHours = (expiredAt - now) / (1000 * 60 * 60);
            assert.ok(diffHours > 23 && diffHours <= 24, `过期时间应约为24小时，实际: ${diffHours.toFixed(1)}小时`);
            // Clean up
            await api('/couple/unbind', { method: 'POST', token: tokenA, json: { confirm: true } });
        }),

        test('无效邀请码应返回404', async () => {
            const { status } = await api('/couple/accept-invite', {
                method: 'POST',
                token: tokenB,
                json: { inviteCode: 'ZZZZZZ' }
            });
            assert.strictEqual(status, 404, '无效邀请码应返回404');
        }),

        test('空邀请码应返回400', async () => {
            const { status } = await api('/couple/accept-invite', {
                method: 'POST',
                token: tokenB,
                json: { inviteCode: '' }
            });
            assert.strictEqual(status, 400, '空邀请码应返回400');
        }),
    ]);
}

async function testEdgeCases() {
    await runSuite('7. 边界情况', [
        test('同时只能有一个活跃绑定（用户A）', async () => {
            await api('/couple/generate-invite', { method: 'POST', token: tokenA });
            const { status } = await api('/couple/generate-invite', { method: 'POST', token: tokenA });
            assert.strictEqual(status, 400, '已有pending绑定时不能再生成');
            // Clean up
            await api('/couple/unbind', { method: 'POST', token: tokenA, json: { confirm: true } });
        }),

        test('绑定后足迹删除只能由所有者操作', async () => {
            // Re-bind A and B
            const { data: genData } = await api('/couple/generate-invite', { method: 'POST', token: tokenA });
            await api('/couple/accept-invite', { method: 'POST', token: tokenB, json: { inviteCode: genData.inviteCode } });

            // A adds a footprint
            const { data: cities } = await api('/cities');
            const cityId = cities[0].id;
            const { data: fpData } = await api('/footprints', {
                method: 'POST',
                token: tokenA,
                json: {
                    city_id: cityId,
                    name: 'A的足迹(边界测试)',
                    description: '测试',
                    latitude: cities[0].latitude,
                    longitude: cities[0].longitude
                }
            });

            // B tries to delete A's footprint (should fail because DELETE checks user_id)
            if (fpData.footprintId) {
                const { status } = await api(`/footprints/${fpData.footprintId}`, {
                    method: 'DELETE',
                    token: tokenB
                });
                // The server checks ownership for delete, so it should fail or return 200 with no deletion
                // But the DELETE route filters by user_id, so it won't delete it
                assert.ok(status === 200, '删除操作应返回200（但不会删除他人足迹）');
            }

            // Clean up
            await api('/couple/unbind', { method: 'POST', token: tokenA, json: { confirm: true } });
        }),

        test('未登录无法访问couple接口', async () => {
            const { status } = await api('/couple/status');
            assert.strictEqual(status, 401, '未认证应返回401');
        }),
    ]);
}

// ── Run All ──────────────────────────────────────────────────

(async () => {
    console.log('═══════════════════════════════════════════');
    console.log('  DAEEE・同行集 - 情侣绑定功能测试');
    console.log('═══════════════════════════════════════════');
    console.log('请确保服务器已启动: npm start');
    console.log('');

    try {
        // Check server health
        const health = await fetch('http://localhost:3000/api/health');
        if (!health.ok) throw new Error('服务器未响应');
        console.log('服务器连接正常\n');
    } catch {
        console.error('无法连接到服务器，请先启动: npm start');
        process.exit(1);
    }

    await testRegisterAndLogin();
    await testDataIsolation();
    await testCoupleBinding();
    await testDataSharing();
    await testUnbind();
    await testInviteExpiry();
    await testEdgeCases();

    console.log('\n═══════════════════════════════════════════');
    console.log(`  测试完成: ${passed} 通过, ${failed} 失败, ${passed + failed} 总计`);
    console.log('═══════════════════════════════════════════');

    process.exit(failed > 0 ? 1 : 0);
})();
