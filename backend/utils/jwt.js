const ROLES = {
    ADMIN: 'admin',
    USER: 'user',
    VISITOR: 'visitor'
};

const PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete'
};

const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.DELETE],
    [ROLES.USER]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    [ROLES.VISITOR]: [PERMISSIONS.READ]
};

class PermissionManager {
    static hasPermission(userRole, permission) {
        if (!userRole) return false;
        const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
        return rolePermissions.includes(permission);
    }

    static isValidRole(role) {
        return Object.values(ROLES).includes(role);
    }
}

module.exports = {
    ROLES,
    PERMISSIONS,
    PermissionManager
};

const jwt = require('jsonwebtoken');

class JWTUtils {
    static generateTokens(user) {
        const accessToken = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1m' }
        );

        return {
            accessToken,
            expiresIn: 60
        };
    }

    static verify(token) {
        return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    }
}

module.exports = JWTUtils;