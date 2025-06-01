// models/User.js
const bcrypt = require('bcrypt');
const db = require('../database/config'); // ✅ FIXED: Changed from '../config/database'


class User {
    static async findByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = ?';
        const [rows] = await db.execute(query, [username]);
        return rows.length > 0 ? rows[0] : null;
    }

    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    static async create(userData) {
        const { username, password, role = 'user' } = userData;
        
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // ✅ FIXED: Changed NOW() to datetime('now') for SQLite
        const query = 'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, datetime(\'now\'))';
        const [result] = await db.execute(query, [username, hashedPassword, role]);
        
        return result.insertId;
    }

    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async updateById(id, userData) {
        const { username, password, role } = userData;
        const updates = [];
        const values = [];

        if (username) {
            updates.push('username = ?');
            values.push(username);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 12);
            updates.push('password = ?');
            values.push(hashedPassword);
        }
        if (role) {
            updates.push('role = ?');
            values.push(role);
        }

        if (updates.length === 0) {
            throw new Error('No fields to update');
        }

        // ✅ FIXED: Changed NOW() to datetime('now') for SQLite
        updates.push('updated_at = datetime(\'now\')');
        values.push(id);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(query, values);
        
        return result.affectedRows > 0;
    }

    static async deleteById(id) {
        const query = 'DELETE FROM users WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    static async getAll(limit = 50, offset = 0) {
        const query = 'SELECT id, username, role, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const [rows] = await db.execute(query, [limit, offset]);
        return rows;
    }

    static async count() {
        const query = 'SELECT COUNT(*) as total FROM users';
        const [rows] = await db.execute(query);
        return rows[0].total;
    }
}

module.exports = User;