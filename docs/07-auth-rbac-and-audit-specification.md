# Authentication, Role-Based Access, Audit Logging & Guarded Deletion Specification

**Document Code**: `DOC-07-AUTH-RBAC`  
**Parent System**: `CMD-APP-V1` — Cash Management Division  
**Scope**: User Authentication, Admin Approval Workflow, Activity Logging, and Guarded Deletion.

---

## 1. System Overview & Core Requirements

1. **User Sign-up & Admin Approval Lifecycle**:
   - New users register with `name`, `email`, and `password`.
   - Accounts initialize in `pending` status and cannot log in until approved.
   - Admin receives notification of pending registrations.
   - Admin can **Approve** (activates account, sends approval email with login link) or **Reject** with a mandatory **rejection reason** (sends rejection email containing the reason).

2. **User Activity & Action Audit Logging**:
   - Every sensitive user action (Login, Logout, File Upload, File View, File Merge, Reconcile, Export, Deletion Request) is logged into an immutable `AuditLog` collection.
   - Admins have an activity dashboard to monitor actions, filter by user/date/type, and export logs.

3. **Guarded Deletion Workflow**:
   - Regular users **cannot delete any stored entity directly**.
   - Attempting to delete submits a `DeletionRequest` and marks the item `isPendingDeletion = true`.
   - Admin reviews the deletion queue:
     - **Approve**: Entity and related chunk shards are permanently deleted; audit logged; user notified.
     - **Reject**: Item restored to active status; rejection note sent to user.
   - Users can cancel their own pending deletion request before admin review.

4. **First Admin Bootstrap**:
   - The first registered user in the database or credentials configured via `ADMIN_EMAIL` in `.env` are automatically assigned `role: 'admin'` and `status: 'active'`.

---

## 2. Data Models Architecture

### A. User Schema (`server/models/User.js`)
```javascript
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }, // bcrypt hashed
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
  action: { type: String, required: true }, // e.g. LOGIN, UPLOAD_FILE, DELETE_REQUEST
  resourceType: String, // 'StoredFile', 'User', 'Session'
  resourceId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now }
}
```

### C. Deletion Request Schema (`server/models/DeletionRequest.js`)
```javascript
{
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetModel: { type: String, default: 'StoredFile' },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetName: String,
  reason: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedAt: { type: Date, default: Date.now },
  resolvedAt: Date
}
```

---

## 3. Modular API Endpoints

| Route | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | Register new user in `pending` state |
| `/api/auth/login` | `POST` | Public | Authenticate user; reject if `pending`/`rejected` |
| `/api/auth/me` | `GET` | Auth | Current user profile & permissions |
| `/api/auth/forgot-password` | `POST` | Public | Send password reset token/link |
| `/api/auth/reset-password` | `POST` | Public | Reset password with token |
| `/api/admin/users` | `GET` | Admin | List users filterable by status |
| `/api/admin/users/:id/approve` | `POST` | Admin | Approve pending user & send email |
| `/api/admin/users/:id/reject` | `POST` | Admin | Reject user with reason & send email |
| `/api/admin/users/:id/role` | `PATCH` | Admin | Update user role or status |
| `/api/admin/audit-logs` | `GET` | Admin | Query paginated audit activity stream |
| `/api/admin/deletion-requests` | `GET` | Admin | List pending deletion requests |
| `/api/admin/deletion-requests/:id/approve`| `POST`| Admin | Permanently delete resource |
| `/api/admin/deletion-requests/:id/reject` | `POST`| Admin | Reject deletion, restore resource |
| `/api/files/deletion-request` | `POST` | Auth | Submit deletion request for a file |
| `/api/files/deletion-request/:id/cancel` | `DELETE` | Auth | Cancel own pending deletion request |

---

## 4. Phased Implementation Roadmap

- **Phase 1: Foundation**: Dependencies (`bcryptjs`, `jsonwebtoken`), Mongoose models (`User`, `AuditLog`, `DeletionRequest`), and Nodemailer email dispatchers (`server/utils/mailer.js`).
- **Phase 2: Auth Endpoints**: Express routes under `server/routes/auth.js`, `server/routes/adminUsers.js`, and `server/utils/authMiddleware.js`.
- **Phase 3: Audit Engine**: `server/utils/logger.js` integrated into file operations, reconciliations, and logins; admin audit query router `server/routes/adminAudit.js`.
- **Phase 4: Guarded Deletion**: Intercepting delete operations in `server/routes/files.js`, creating deletion requests, and admin approval router `server/routes/adminDeletions.js`.
- **Phase 5: Frontend Auth Context**: `AuthContext.tsx`, `ProtectedRoute`, `AdminRoute`, and auth forms (`Login.tsx`, `Register.tsx`, `PendingApproval.tsx`).
- **Phase 6: Admin Control Panel**: `AdminDashboard.tsx`, `PendingUsersTable.tsx` (with rejection reason modal), `DeletionRequestsTable.tsx`, and `AuditLogsViewer.tsx`.
- **Phase 7: User-Facing Guardrails**: Updating `SavedFiles.tsx` with deletion request modal, pending badges, and action locking.
- **Phase 8: Verification & Sync**: End-to-end flow testing, email simulation, and documentation sync across `docs/01`–`docs/06`.
