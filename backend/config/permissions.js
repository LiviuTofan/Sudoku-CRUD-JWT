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

// Simple role-permission mapping
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