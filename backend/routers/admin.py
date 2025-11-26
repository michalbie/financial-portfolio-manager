from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import User, Role, Permission
from routers.auth import require_permission, get_current_user, get_user_permissions, get_user_roles

router = APIRouter(prefix="/admin", tags=["admin"])


# -----------------------
# Pydantic Models
# -----------------------


class UserRoleInfo(BaseModel):
    id: int
    email: str
    name: str
    roles: List[str]
    permissions: List[str]

    class Config:
        from_attributes = True


class RoleInfo(BaseModel):
    id: int
    name: str
    description: Optional[str]
    permissions: List[str]

    class Config:
        from_attributes = True


class PermissionInfo(BaseModel):
    id: int
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True


class AssignRoleRequest(BaseModel):
    user_email: str
    role_name: str


class RemoveRoleRequest(BaseModel):
    user_email: str
    role_name: str


class CreateRoleRequest(BaseModel):
    name: str
    description: Optional[str] = None
    permission_names: List[str]


class CreatePermissionRequest(BaseModel):
    name: str
    description: Optional[str] = None


class UpdateRolePermissionsRequest(BaseModel):
    role_name: str
    permission_names: List[str]


# -----------------------
# Admin endpoints
# -----------------------


@router.get("/users", dependencies=[Depends(require_permission("manage_users"))])
def list_users(db: Session = Depends(get_db)):
    """List all users with their roles and permissions (admin only)"""
    users = db.query(User).all()

    result = []
    for user in users:
        result.append(UserRoleInfo(
            id=user.id,
            email=user.email,
            name=user.name,
            roles=get_user_roles(user),
            permissions=get_user_permissions(user)
        ))

    return {"users": result}


@router.post("/users/assign-role", dependencies=[Depends(require_permission("manage_users"))])
def assign_role(request: AssignRoleRequest, db: Session = Depends(get_db)):
    """Assign a role to a user (admin only)"""
    # Get user
    user = db.query(User).filter(User.email == request.user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get role
    role = db.query(Role).filter(Role.name == request.role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if user already has this role
    if role in user.roles:
        raise HTTPException(
            status_code=400, detail="User already has this role")

    # Assign role
    user.roles.append(role)
    db.commit()

    return {"message": f"Role '{request.role_name}' assigned to {request.user_email}"}


@router.post("/users/remove-role", dependencies=[Depends(require_permission("manage_users"))])
def remove_role_from_user(request: RemoveRoleRequest, db: Session = Depends(get_db)):
    """Remove a role from a user (admin only)"""
    # Get user
    user = db.query(User).filter(User.email == request.user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get role
    role = db.query(Role).filter(Role.name == request.role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if user has this role
    if role not in user.roles:
        raise HTTPException(
            status_code=400, detail="User doesn't have this role")

    # Remove role
    user.roles.remove(role)
    db.commit()

    return {"message": f"Role '{request.role_name}' removed from {request.user_email}"}


@router.get("/roles")
def list_roles(db: Session = Depends(get_db)):
    """List all available roles and their permissions"""
    roles = db.query(Role).all()

    result = []
    for role in roles:
        result.append(RoleInfo(
            id=role.id,
            name=role.name,
            description=role.description,
            permissions=[p.name for p in role.permissions]
        ))

    return {"roles": result}


@router.post("/roles", dependencies=[Depends(require_permission("manage_users"))])
def create_role(request: CreateRoleRequest, db: Session = Depends(get_db)):
    """Create a new role (admin only)"""
    # Check if role already exists
    existing = db.query(Role).filter(Role.name == request.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role already exists")

    # Get permissions
    permissions = db.query(Permission).filter(
        Permission.name.in_(request.permission_names)
    ).all()

    if len(permissions) != len(request.permission_names):
        raise HTTPException(
            status_code=400, detail="One or more permissions not found")

    # Create role
    role = Role(
        name=request.name,
        description=request.description
    )
    role.permissions = permissions

    db.add(role)
    db.commit()
    db.refresh(role)

    return {
        "message": f"Role '{request.name}' created successfully",
        "role": RoleInfo(
            id=role.id,
            name=role.name,
            description=role.description,
            permissions=[p.name for p in role.permissions]
        )
    }


@router.put("/roles/permissions", dependencies=[Depends(require_permission("manage_users"))])
def update_role_permissions(request: UpdateRolePermissionsRequest, db: Session = Depends(get_db)):
    """Update permissions for a role (admin only)"""
    # Get role
    role = db.query(Role).filter(Role.name == request.role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Get permissions
    permissions = db.query(Permission).filter(
        Permission.name.in_(request.permission_names)
    ).all()

    if len(permissions) != len(request.permission_names):
        raise HTTPException(
            status_code=400, detail="One or more permissions not found")

    # Update permissions
    role.permissions = permissions
    db.commit()

    return {"message": f"Permissions updated for role '{request.role_name}'"}


@router.delete("/roles/{role_name}", dependencies=[Depends(require_permission("manage_users"))])
def delete_role(role_name: str, db: Session = Depends(get_db)):
    """Delete a role (admin only)"""
    # Prevent deleting default roles
    if role_name in ["admin", "user", "guest"]:
        raise HTTPException(
            status_code=400, detail="Cannot delete default roles")

    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    db.delete(role)
    db.commit()

    return {"message": f"Role '{role_name}' deleted successfully"}


@router.get("/permissions")
def list_permissions(db: Session = Depends(get_db)):
    """List all available permissions"""
    permissions = db.query(Permission).all()

    result = [PermissionInfo(
        id=p.id,
        name=p.name,
        description=p.description
    ) for p in permissions]

    return {"permissions": result}


@router.post("/permissions", dependencies=[Depends(require_permission("manage_users"))])
def create_permission(request: CreatePermissionRequest, db: Session = Depends(get_db)):
    """Create a new permission (admin only)"""
    # Check if permission already exists
    existing = db.query(Permission).filter(
        Permission.name == request.name).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="Permission already exists")

    permission = Permission(
        name=request.name,
        description=request.description
    )

    db.add(permission)
    db.commit()
    db.refresh(permission)

    return {
        "message": f"Permission '{request.name}' created successfully",
        "permission": PermissionInfo(
            id=permission.id,
            name=permission.name,
            description=permission.description
        )
    }


@router.get("/my-info")
def get_my_admin_info(user: User = Depends(get_current_user)):
    """Get current user's roles and permissions"""
    return UserRoleInfo(
        id=user.id,
        email=user.email,
        name=user.name,
        roles=get_user_roles(user),
        permissions=get_user_permissions(user)
    )
