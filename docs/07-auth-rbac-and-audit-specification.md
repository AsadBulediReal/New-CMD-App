# Authentication, Role-Based Access, Audit Logging & Guarded Deletion Specification

**Document Code**: `DOC-07-AUTH-RBAC`  
**Parent System**: `CMD-APP-V1` — Cash Management Division, University of Sindh  
**Scope**: Complete Architecture for User Lifecycle, RBAC, Action Audit Trail, Guarded Deletions, Notifications, and System Health.

---

## 1. System Overview & Core Capabilities

1. **User Sign-up & Admin Approval Lifecycle**:
   - New users register with `name`, `email`, and `password`.
   - Accounts initialize in `pending` status and cannot log in until approved.
   - First user (or matching `process.env.ADMIN_EMAIL`) is automatically granted active **Administrator** status.
   - Admin receives email and in-app notifications on new registrations.
   - Admin can **Approve** (activates account, sends approval email with login link) or **Reject** with a **rejection reason** (sends rejection email containing the explanation, and login page shows the reason on login attempts).

2. **Guarded Deletion System**:
   - Standard users **cannot permanently delete any file directly**.
   - Clicking "Delete" in the Document Vault creates a `DeletionRequest` doc, flags the file as `isPendingDeletion = true`, and notifies the admin.
   - Admin reviews the deletion queue at `/admin`:
     - **Approve**: Permanently purges file and associated chunks; notifies requester.
     - **Reject**: Restores file to active status with an optional admin note; notifies requester.
     - **Cancel**: Users can cancel their own pending deletion request before admin review.

3. **User Action & Activity Audit Trail**:
   - Non-blocking `logUserActivity` records sensitive actions (`LOGIN`, `UPLOAD_FILE`, `VIEW_FILE`, `RUN_RECONCILIATION`, `REQUEST_DELETE`, `APPROVE_DELETION`, `APPROVE_USER`, `REJECT_USER`, `RESET_PASSWORD`, etc.).
   - Admin audit viewer at `/admin` offers search, action filters, date range filters, JSON export, and a deep-dive `AuditLogDetailsModal` displaying client IP, user-agent, and full action payload.

4. **File Ownership & Privacy Scope**:
   - Files support `visibility: "team" | "private"`.
   - Regular users see all team files plus their own private files; admins see all files.
   - Users can toggle their files between Private and Team Shared directly in the Document Vault.

5. **In-App Notification Center**:
   - Interactive Bell trigger in the header navbar with unread badge counter.
   - Supports alerts for registrations, approvals, rejections, deletion requests, and resolutions with direct action links.

6. **Infrastructure Health & Database Snapshots**:
   - `GET /api/admin/system-health` providing live MongoDB cluster latency, uptime, memory, and collection counts.
   - `GET /api/admin/database/backup` for one-click JSON database snapshot export.

---

## 2. Data Models Architecture

### A. User Schema (`server/models/User.js`)
```javascript
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: false }, // bcrypt hashed (optional for Google OAuth)
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, default: null, index: true },
  avatar: { type: String, default: null },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  status: { type: String, enum: ['pending', 'active', 'rejected', 'suspended'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  registeredAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  lastLoginAt: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}
```

### B. Audit Log Schema (`server/models/AuditLog.js`)
```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: String,
  userName: String,
  userRole: String,
  action: { type: String, required: true },
  resourceType: String,
  resourceId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
  createdAt: { type: Date, default: Date.now }
}
```

### C. Deletion Request Schema (`server/models/DeletionRequest.js`)
```javascript
{
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByName: String,
  requestedByEmail: String,
  targetModel: { type: String, default: 'StoredFile' },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetName: String,
  reason: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  adminNote: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  createdAt: { type: Date, default: Date.now }
}
```

### D. In-App Notification Schema (`server/models/Notification.js`)
```javascript
{
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipientRole: { type: String, enum: ['admin', 'user', null] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['user_registered', 'user_approved', 'user_rejected', 'deletion_requested', 'deletion_approved', 'deletion_rejected', 'system', 'info'] },
  link: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}
```

---

## 3. Modular API Endpoints

| Route | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | Register new user in `pending` state |
| `/api/auth/login` | `POST` | Public | Authenticate user; reject if `pending`/`rejected` |
| `/api/auth/me` | `GET` | Auth | Current user profile & permissions |
| `/api/auth/forgot-password` | `POST` | Public | Send password reset token email |
| `/api/auth/reset-password` | `POST` | Public | Reset password using token |
| `/api/auth/profile` | `PATCH` | Auth | Update user display name |
| `/api/auth/change-password` | `POST` | Auth | Update password with current password verification |
| `/api/admin/users` | `GET` | Admin | List users filterable by status |
| `/api/admin/users/:id/approve` | `POST` | Admin | Approve user & send confirmation email |
| `/api/admin/users/:id/reject` | `POST` | Admin | Reject user with reason & send email |
| `/api/admin/users/:id/role` | `PATCH` | Admin | Update user role or suspension status |
| `/api/admin/audit-logs` | `GET` | Admin | Query paginated audit activity stream |
| `/api/admin/audit-logs/export` | `GET` | Admin | Export all audit logs to JSON |
| `/api/admin/deletion-requests` | `GET` | Admin | List pending file deletion requests |
| `/api/admin/deletion-requests/:id/approve` | `POST` | Admin | Permanently delete file and chunks |
| `/api/admin/deletion-requests/:id/reject` | `POST` | Admin | Reject deletion and restore file |
| `/api/admin/system-health` | `GET` | Admin | Live MongoDB metrics, uptime, and memory |
| `/api/admin/database/backup` | `GET` | Admin | Export database snapshot for disaster recovery |
| `/api/notifications` | `GET` | Auth | Fetch user's in-app notifications and unread count |
| `/api/notifications/:id/read` | `PATCH` | Auth | Mark single notification as read |
| `/api/notifications/read-all` | `POST` | Auth | Mark all notifications as read |
| `/api/notifications/:id` | `DELETE` | Auth | Dismiss a notification |
| `/api/files/:id` | `DELETE` | Auth | Guarded file deletion (admin = purge, user = request) |
| `/api/files/deletion-request/:id/cancel` | `DELETE` | Auth | Cancel pending deletion request |
| `/api/files/:id/visibility` | `PATCH` | Auth | Toggle file between `team` and `private` |

---

## 4. Frontend Workspace & Page Map

- **Auth Pages**: [Login.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/Auth/Login.tsx), [Register.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/Auth/Register.tsx), [PendingApproval.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/Auth/PendingApproval.tsx), [ForgotPassword.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/Auth/ForgotPassword.tsx), [ResetPassword.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/Auth/ResetPassword.tsx).
- **User Profile**: [Profile.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/Profile.tsx).
- **Admin Hub**: [AdminDashboard.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/Admin/AdminDashboard.tsx) (Tabs: User Approvals, Deletion Queue, Audit Trail, System Health & Backups).
- **Header & Navigation**: [Header.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/components/Header.tsx) with [NotificationCenter.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/components/NotificationCenter.tsx), [Sidebar.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/components/Sidebar.tsx).
- **Document Vault**: [SavedFiles.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/SavedFiles.tsx) with scope filters, visibility badges, and [DeletionRequestModal.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/components/DeletionRequestModal.tsx).

---

*Last Updated: 2026-08-22 · Developed for Cash Management Division (CMD) · University of Sindh*
