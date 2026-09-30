import { Router, Response } from 'express';
import { PoolConnection } from 'mysql2/promise';
import { verifyToken, AuthRequest } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();
const MAX_POOL_ID = 8;

const getMemberId = (req: AuthRequest): number | null => {
    const memberId = Number(req.user?.id ?? req.user?.memberId);
    return Number.isInteger(memberId) && memberId > 0 ? memberId : null;
};

const getPoolColumns = (poolId: number) => {
    if (!Number.isInteger(poolId) || poolId < 1 || poolId > MAX_POOL_ID) {
        throw new Error('Unsupported pool configuration.');
    }
    return {
        table: `meddolic_user_pool_tree_${poolId}`,
        placeholder: `placeholder${poolId}Id`,
        parentEntry: `parent${poolId}EntryId`,
        legPosition: `leg${poolId}Position`
    };
};

const updatePlaceholderTree = async (
    connection: PoolConnection,
    parentMemberId: number,
    legPosition: number,
    memberId: number,
    entryId: number,
    poolId: number,
    parentEntryId: number | null
): Promise<void> => {
    if (!parentEntryId || parentEntryId === entryId) return;

    const columns = getPoolColumns(poolId);
    await connection.query(`
        UPDATE meddolic_user_pool_entry_details
        SET ${columns.placeholder} = ?, ${columns.legPosition} = ?, ${columns.parentEntry} = ?
        WHERE memberId = ? AND entryId = ? AND poolId = ?
    `, [parentMemberId, legPosition, parentEntryId, memberId, entryId, poolId]);

    let currentMemberId: number | null = parentMemberId;
    let currentEntryId: number | null = parentEntryId;
    let currentLegPosition = legPosition;

    for (let level = 1; currentMemberId && currentEntryId && level <= 16; level += 1) {
        await connection.query(`
            INSERT INTO meddolic_user_pool_placeholder_details
                (poolId, member_id, child_id, leg_position, level, parentEntryId, entryId, date_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [poolId, currentMemberId, memberId, currentLegPosition, level, currentEntryId, entryId]);

        const [parentEntries]: any = await connection.query(`
            SELECT ${columns.placeholder} AS parentMemberId,
                ${columns.legPosition} AS parentLegPosition,
                ${columns.parentEntry} AS parentEntryId
            FROM meddolic_user_pool_entry_details
            WHERE memberId = ? AND entryId = ? AND poolId = ?
            LIMIT 1
        `, [currentMemberId, currentEntryId, poolId]);
        if (!parentEntries.length || !parentEntries[0].parentMemberId || !parentEntries[0].parentEntryId) break;

        currentMemberId = Number(parentEntries[0].parentMemberId);
        currentEntryId = Number(parentEntries[0].parentEntryId);
        currentLegPosition = Number(parentEntries[0].parentLegPosition ?? 0);
    }
};

const checkPoolCompletion = async (
    connection: PoolConnection,
    initialParentId: number,
    memberId: number,
    poolId: number,
    entryId: number,
    initialParentEntryId: number | null
): Promise<void> => {
    const columns = getPoolColumns(poolId);
    let parentId: number | null = initialParentId;
    let parentEntryId: number | null = initialParentEntryId;

    for (let depth = 0; parentId && parentEntryId && depth < 16; depth += 1) {
        const [entries]: any = await connection.query(`
            SELECT poolLevel, poolStatus, reEntryCount,
                ${columns.placeholder} AS nextParentId,
                ${columns.parentEntry} AS nextParentEntryId
            FROM meddolic_user_pool_entry_details
            WHERE memberId = ? AND entryId = ? AND poolId = ?
            LIMIT 1
            FOR UPDATE
        `, [parentId, parentEntryId, poolId]);
        if (!entries.length) break;

        const parentEntry = entries[0];
        const level = Number(parentEntry.poolLevel);
        if (Number(parentEntry.poolStatus) === 0 && level <= 16) {
            const [packageRows]: any = await connection.query(`
                SELECT giveAmount, linkGet, incomeDays, dailyIncome, userNeed
                FROM meddolic_config_package_type
                WHERE packageId = ?
                LIMIT 1
            `, [level]);

            if (packageRows.length) {
                const requiredMembers = Number(packageRows[0].userNeed || packageRows[0].linkGet);
                const [countRows]: any = await connection.query(`
                    SELECT COUNT(1) AS total
                    FROM meddolic_user_pool_placeholder_details
                    WHERE member_id = ? AND level = ? AND poolId = ? AND parentEntryId = ?
                `, [parentId, level, poolId, parentEntryId]);

                if (Number(countRows[0].total) >= requiredMembers) {
                    await connection.query(`
                        INSERT INTO meddolic_user_pool_income_summary
                            (memberId, childId, poolIncome, dailyIncome, poolId, poolLevel,
                             reEntryCount, entryCount, entryId, dateTime, dueDate, incomeDays)
                        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), ?)
                    `, [
                        parentId,
                        memberId,
                        packageRows[0].giveAmount,
                        packageRows[0].dailyIncome,
                        poolId,
                        level,
                        Number(parentEntry.reEntryCount ?? 1),
                        parentEntryId,
                        Number(packageRows[0].incomeDays)
                    ]);

                    if (level < 16) {
                        await connection.query(`
                            UPDATE meddolic_user_pool_entry_details
                            SET poolLevel = poolLevel + 1, entryDate = NOW()
                            WHERE memberId = ? AND entryId = ? AND poolId = ?
                        `, [parentId, parentEntryId, poolId]);
                    } else {
                        await connection.query(`
                            UPDATE meddolic_user_pool_entry_details
                            SET poolStatus = 1
                            WHERE memberId = ? AND entryId = ? AND poolId = ?
                        `, [parentId, parentEntryId, poolId]);
                    }
                }
            }
        }

        parentId = parentEntry.nextParentId == null ? null : Number(parentEntry.nextParentId);
        parentEntryId = parentEntry.nextParentEntryId == null ? null : Number(parentEntry.nextParentEntryId);
    }
};

const placeInPoolTree = async (
    connection: PoolConnection,
    memberId: number,
    entryId: number,
    poolId: number
): Promise<void> => {
    const columns = getPoolColumns(poolId);
    const treeTable = columns.table;
    const [latestRows]: any = await connection.query(`
        SELECT id, memberId, parentEntryId, childId, childEntryId, legPosition, treeLevel
        FROM ${treeTable}
        ORDER BY id DESC
        LIMIT 2
        FOR UPDATE
    `);

    if (!latestRows.length) {
        await connection.query(`
            INSERT INTO ${treeTable} (memberId, parentEntryId)
            VALUES (?, ?)
        `, [memberId, entryId]);
        return;
    }

    if (latestRows.length === 1) {
        const [rootRows]: any = await connection.query(`SELECT * FROM ${treeTable} ORDER BY id ASC LIMIT 1 FOR UPDATE`);
        const root = rootRows[0];
        if (root.childId != null && Number(root.childId) !== 0) {
            await connection.query(`
                INSERT INTO ${treeTable}
                    (memberId, parentEntryId, childId, childEntryId, legPosition, treeLevel, dateTime)
                VALUES (?, ?, ?, ?, 2, 1, NOW())
            `, [root.memberId, root.parentEntryId, memberId, entryId]);
            await updatePlaceholderTree(connection, Number(root.memberId), 2, memberId, entryId, poolId, Number(root.parentEntryId));
            await checkPoolCompletion(connection, Number(root.memberId), memberId, poolId, entryId, Number(root.parentEntryId));
        } else {
            await connection.query(`
                UPDATE ${treeTable}
                SET childId = ?, childEntryId = ?, legPosition = 1, treeLevel = 1, dateTime = NOW()
                WHERE id = ?
            `, [memberId, entryId, root.id]);
            await updatePlaceholderTree(connection, Number(root.memberId), 1, memberId, entryId, poolId, root.parentEntryId == null ? null : Number(root.parentEntryId));
        }
        return;
    }

    const last = latestRows[0];
    const lastParentEntryId = last.parentEntryId == null ? null : Number(last.parentEntryId);
    if (Number(last.legPosition) === 1) {
        await connection.query(`
            INSERT INTO ${treeTable}
                (memberId, parentEntryId, childId, childEntryId, legPosition, treeLevel, dateTime)
            VALUES (?, ?, ?, ?, 2, ?, NOW())
        `, [last.memberId, last.parentEntryId, memberId, entryId, last.treeLevel]);
        await updatePlaceholderTree(connection, Number(last.memberId), 2, memberId, entryId, poolId, lastParentEntryId);
        await checkPoolCompletion(connection, Number(last.memberId), memberId, poolId, entryId, lastParentEntryId);
        return;
    }

    const lastTreeLevel = Number(last.treeLevel);
    const [levelRows]: any = await connection.query(
        `SELECT COUNT(1) AS total FROM ${treeTable} WHERE treeLevel = ?`,
        [lastTreeLevel]
    );
    let parentMemberId: number | null = null;
    let parentEntryId: number | null = null;
    let treeLevel = lastTreeLevel;

    if (Number(levelRows[0].total) === 2 ** lastTreeLevel) {
        const [firstAtLevel]: any = await connection.query(`
            SELECT childId, childEntryId
            FROM ${treeTable}
            WHERE treeLevel = ?
            ORDER BY id ASC
            LIMIT 1
        `, [lastTreeLevel]);
        if (firstAtLevel.length) {
            parentMemberId = firstAtLevel[0].childId == null ? null : Number(firstAtLevel[0].childId);
            parentEntryId = firstAtLevel[0].childEntryId == null ? null : Number(firstAtLevel[0].childEntryId);
            treeLevel += 1;
        }
    } else {
        const [previousPosition]: any = await connection.query(`
            SELECT id, treeLevel
            FROM ${treeTable}
            WHERE childId = ? AND childEntryId = ?
            ORDER BY id DESC
            LIMIT 1
        `, [last.memberId, last.parentEntryId]);
        if (previousPosition.length) {
            const [nextPosition]: any = await connection.query(`
                SELECT childId, childEntryId
                FROM ${treeTable}
                WHERE id > ? AND treeLevel = ?
                ORDER BY id ASC
                LIMIT 1
            `, [previousPosition[0].id, previousPosition[0].treeLevel]);
            if (nextPosition.length) {
                parentMemberId = nextPosition[0].childId == null ? null : Number(nextPosition[0].childId);
                parentEntryId = nextPosition[0].childEntryId == null ? null : Number(nextPosition[0].childEntryId);
            }
        }
    }

    if (!parentMemberId || !parentEntryId) {
        throw new Error('Could not find an available pool position.');
    }

    await connection.query(`
        INSERT INTO ${treeTable}
            (memberId, parentEntryId, childId, childEntryId, legPosition, treeLevel, dateTime)
        VALUES (?, ?, ?, ?, 1, ?, NOW())
    `, [parentMemberId, parentEntryId, memberId, entryId, treeLevel]);
    await updatePlaceholderTree(connection, parentMemberId, 1, memberId, entryId, poolId, parentEntryId);
};

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = getMemberId(req);
    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }

    try {
        const [walletRows, packageRows, historyRows]: any = await Promise.all([
            pool.query('SELECT fundWallet FROM meddolic_user_details WHERE member_id = ? LIMIT 1', [memberId]),
            pool.query(`
                SELECT packageId, packagePrice, giveAmount
                FROM meddolic_config_package_type
                WHERE packageType = 1 AND packageStatus = 1
                ORDER BY packageId ASC
                LIMIT 1
            `),
            pool.query(`
                SELECT history.*
                FROM (
                    SELECT activation.dateTime, activation.packageId, activation.packagePrice,
                        beneficiary.user_id AS userId, beneficiary.name,
                        purchaser.user_id AS purchaserId, purchaser.name AS purchaserName
                    FROM meddolic_user_activation_details AS activation
                    INNER JOIN meddolic_user_details AS beneficiary ON beneficiary.member_id = activation.memberId
                    INNER JOIN meddolic_user_details AS purchaser ON purchaser.member_id = activation.activateBy
                    WHERE activation.activateBy = ?
                    UNION ALL
                    SELECT activation.dateTime, activation.packageId, activation.packagePrice,
                        beneficiary.user_id AS userId, beneficiary.name,
                        purchaser.user_id AS purchaserId, purchaser.name AS purchaserName
                    FROM meddolic_user_activation_details AS activation
                    INNER JOIN meddolic_user_details AS beneficiary ON beneficiary.member_id = activation.memberId
                    INNER JOIN meddolic_user_details AS purchaser ON purchaser.member_id = activation.activateBy
                    WHERE activation.memberId = ? AND activation.activateBy <> ?
                ) AS history
                ORDER BY history.dateTime DESC
                LIMIT 100
            `, [memberId, memberId, memberId])
        ]);

        const wallets = walletRows[0] as any[];
        const packages = packageRows[0] as any[];
        if (!wallets.length || !packages.length) {
            res.status(404).json({ error: 'Member or Helping Fund package not found.' });
            return;
        }
        res.status(200).json({
            wallet: Number(wallets[0].fundWallet ?? 0),
            package: packages[0],
            history: historyRows[0]
        });
    } catch (error: any) {
        console.error('Autopool data error:', error.message);
        res.status(500).json({ error: 'Failed to load Helping Fund purchase data.' });
    }
});

router.get('/lookup', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    if (!userId) {
        res.status(400).json({ error: 'Enter a valid user ID.' });
        return;
    }
    try {
        const [users]: any = await pool.query(`
            SELECT user_id AS userId, name
            FROM meddolic_user_details
            WHERE user_id = ? AND user_type = 2 AND account_status = 1 AND topup_flag = 1
            LIMIT 1
        `, [userId]);
        if (!users.length) {
            res.status(404).json({ error: 'Active member not found. Activate the ID before purchase.' });
            return;
        }
        res.status(200).json({ member: users[0] });
    } catch (error: any) {
        console.error('Autopool member lookup error:', error.message);
        res.status(500).json({ error: 'Could not verify member.' });
    }
});

router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const purchaserId = getMemberId(req);
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    if (purchaserId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }
    if (!userId) {
        res.status(400).json({ error: 'Enter the member user ID.' });
        return;
    }

    let connection: PoolConnection | undefined;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [purchasers]: any = await connection.query(`
            SELECT member_id AS memberId, fundWallet
            FROM meddolic_user_details
            WHERE member_id = ?
            LIMIT 1
            FOR UPDATE
        `, [purchaserId]);
        if (!purchasers.length) {
            await connection.rollback();
            res.status(404).json({ error: 'Purchasing member not found.' });
            return;
        }

        const [members]: any = await connection.query(`
            SELECT member_id AS memberId, sponser_id AS sponsorId
            FROM meddolic_user_details
            WHERE user_id = ? AND user_type = 2 AND account_status = 1 AND topup_flag = 1
            LIMIT 1
            FOR UPDATE
        `, [userId]);
        if (!members.length) {
            await connection.rollback();
            res.status(404).json({ error: 'Active member not found. Activate the ID before purchase.' });
            return;
        }
        const memberId = Number(members[0].memberId);

        const [packageRows]: any = await connection.query(`
            SELECT packageId, packagePrice, giveAmount
            FROM meddolic_config_package_type
            WHERE packageType = 1 AND packageStatus = 1
            ORDER BY packageId ASC
            LIMIT 1
            FOR UPDATE
        `);
        if (!packageRows.length) {
            await connection.rollback();
            res.status(404).json({ error: 'Helping Fund package is not configured.' });
            return;
        }
        const packageConfig = packageRows[0];
        const packageId = Number(packageConfig.packageId);
        const packagePrice = Number(packageConfig.packagePrice);
        getPoolColumns(packageId);

        const currentWallet = Number(purchasers[0].fundWallet ?? 0);
        if (!Number.isFinite(packagePrice) || packagePrice <= 0) {
            await connection.rollback();
            res.status(500).json({ error: 'Helping Fund package price is invalid.' });
            return;
        }
        if (currentWallet < packagePrice) {
            await connection.rollback();
            res.status(400).json({ error: 'Insufficient balance in fund wallet.' });
            return;
        }

        const [existingActivations]: any = await connection.query(`
            SELECT id
            FROM meddolic_user_activation_details
            WHERE memberId = ? AND packageId = ?
            LIMIT 1
            FOR UPDATE
        `, [memberId, packageId]);
        if (existingActivations.length) {
            await connection.rollback();
            res.status(409).json({ error: 'This member has already purchased this Helping Fund package.' });
            return;
        }

        const [activationResult]: any = await connection.query(`
            INSERT INTO meddolic_user_activation_details
                (memberId, sponserId, activateBy, packageId, packagePrice, dateTime)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [memberId, members[0].sponsorId, purchaserId, packageId, packagePrice]);
        const purchaseId = Number(activationResult.insertId);

        const [walletResult]: any = await connection.query(`
            UPDATE meddolic_user_details
            SET fundWallet = fundWallet - ?
            WHERE member_id = ? AND fundWallet >= ?
        `, [packagePrice, purchaserId, packagePrice]);
        if (walletResult.affectedRows !== 1) {
            await connection.rollback();
            res.status(400).json({ error: 'Insufficient balance in fund wallet.' });
            return;
        }

        await connection.query(`
            INSERT INTO meddolic_user_wallet_statement
                (member_id, wallet_statement_id, deb_cr, amount, date_time, trn_id)
            VALUES (?, 8, 1, ?, NOW(), ?)
        `, [purchaserId, packagePrice, purchaseId]);

        const [poolEntryResult]: any = await connection.query(`
            INSERT INTO meddolic_user_pool_entry_details (memberId, poolId, entryDate)
            VALUES (?, ?, NOW())
        `, [memberId, packageId]);
        const entryId = Number(poolEntryResult.insertId);
        await connection.query('UPDATE meddolic_user_details SET poolEntry = ? WHERE member_id = ?', [packageId, memberId]);

        await placeInPoolTree(connection, memberId, entryId, packageId);

        await connection.commit();
        res.status(200).json({
            message: 'Helping Fund package purchased successfully.',
            purchaseId,
            userId,
            packageId,
            packagePrice,
            wallet: currentWallet - packagePrice
        });
    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error('Autopool package purchase error:', error.message);
        res.status(500).json({ error: 'Helping Fund purchase failed. No wallet changes were kept.' });
    } finally {
        connection?.release();
    }
});

export default router;