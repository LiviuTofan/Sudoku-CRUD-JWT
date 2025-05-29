const db = require('../database/config');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const { username, password, role = 'user' } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const sql = `
            INSERT INTO users (username, password, role, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `;
        const result = await db.run(sql, [username, hashedPassword, role]);
        return result.id;
    }

    static async findById(id) {
        const sql = 'SELECT id, username, role, created_at FROM users WHERE id = ?';
        return await db.get(sql, [id]);
    }

    static async findByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ?';
        return await db.get(sql, [username]);
    }

    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async updateRole(id, role) {
        const sql = 'UPDATE users SET role = ? WHERE id = ?';
        const result = await db.run(sql, [role, id]);
        return result.changes > 0;
    }

    static async delete(id) {
        const sql = 'DELETE FROM users WHERE id = ?';
        const result = await db.run(sql, [id]);
        return result.changes > 0;
    }

    static async findAll() {
        const sql = 'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC';
        return await db.all(sql);
    }
}

module.exports = User;