// Define roles
const ROLES = {
    ADMIN: 'admin',
    USER: 'user',
    VISITOR: 'visitor'
};

// Define permissions
const PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete'
};

// Define role permissions mapping
const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.DELETE],
    [ROLES.USER]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    [ROLES.VISITOR]: [PERMISSIONS.READ]
};

// Define resource-specific permissions
const RESOURCE_PERMISSIONS = {
    puzzles: {
        [ROLES.ADMIN]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.DELETE],
        [ROLES.USER]: [PERMISSIONS.READ, PERMISSIONS.WRITE], // Users can create puzzles
        [ROLES.VISITOR]: [PERMISSIONS.READ] // Visitors can only view puzzles
    },
    users: {
        [ROLES.ADMIN]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.DELETE],
        [ROLES.USER]: [PERMISSIONS.READ], // Users can view their own profile
        [ROLES.VISITOR]: [] // No user access for visitors
    }
};

class PermissionManager {
    static hasPermission(userRole, permission, resource = null) {
        if (!userRole) return false;
        
        if (resource && RESOURCE_PERMISSIONS[resource]) {
            const resourcePerms = RESOURCE_PERMISSIONS[resource][userRole] || [];
            return resourcePerms.includes(permission);
        }
        
        const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
        return rolePermissions.includes(permission);
    }

    static hasAnyPermission(userRole, permissions, resource = null) {
        return permissions.some(permission => 
            this.hasPermission(userRole, permission, resource)
        );
    }

    static hasAllPermissions(userRole, permissions, resource = null) {
        return permissions.every(permission => 
            this.hasPermission(userRole, permission, resource)
        );
    }

    static getRolePermissions(userRole, resource = null) {
        if (resource && RESOURCE_PERMISSIONS[resource]) {
            return RESOURCE_PERMISSIONS[resource][userRole] || [];
        }
        return ROLE_PERMISSIONS[userRole] || [];
    }

    static isValidRole(role) {
        return Object.values(ROLES).includes(role);
    }
}

module.exports = {
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    RESOURCE_PERMISSIONS,
    PermissionManager
};