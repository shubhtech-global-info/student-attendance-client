
### **Student Attendance System – AI-Friendly Description**

This project is a **full-stack student attendance management system** consisting of:

1. **Frontend Website (Web Dashboard)**

   * Designed for the **Head of Department (HOD)**.
   * Functionalities for the HOD include:

     * HOD logs in with **username + password**.
     * On successful login, HOD receives a **JWT token**.
     * Managing **professors** (add, update, delete, bulk upload).
     * Managing **classes** (create, update, delete).
     * Managing **students** (add, update, delete).
     * Assigning **professors to classes**.
     * Assigning **students to classes**.
   * The HOD interacts with all entities and controls the overall workflow.

2. **Backend Server (API)**

   * Implements **REST APIs** for HOD, Professor, Class, and Student management.
   * Includes authentication and authorization using **JWT tokens**.
   * HOD can perform all CRUD operations for professors, classes, and students.
   * Includes OTP-based email verification for sensitive HOD actions (registration, email/password updates, account deletion).
   * Professors are linked to a **specific HOD** and can only access data assigned to them.

3. **Android App**

   * Designed for **HOD and Professors**:

     * HOD logs in with **email + alternative password**.
     * On successful login, HOD receives a **JWT token**.
     * Professors log in using **username + password**, but **their login depends on the HOD being logged in first**.
     * When a professor logs in, the **HOD token is required** for validation.
   * Professors can see only the **classes and students assigned to them by the HOD**.
   * Professors use the app to **mark attendance**, which is stored in the backend.

4. **Security and Access Control**

   * HOD authentication is required for all HOD-related operations.
   * Professor login is **HOD-dependent**, ensuring that:

     * Only professors assigned to a valid logged-in HOD can log in.
     * Professors can only access the classes and students that their HOD assigned to them.
   * JWT tokens embed the **user role** and **HOD context** to enforce access control.

5. **Workflow Summary**

   1. HOD logs in → receives a **token**.
   2. Professor login → includes **HOD token + professor credentials**.
   3. Backend verifies:

      * HOD token validity.
      * Professor belongs to that HOD.
      * Professor credentials are correct.
   4. Backend issues **professor-specific JWT token**.
   5. Professor accesses assigned classes/students → takes attendance.

---



Directory structure:
└── singhshubhamkumarkrishnadev-student-attendance-server/
    ├── package.json
    ├── server.js
    ├── config/
    │   ├── db.config.js
    │   ├── email.config.js
    │   └── jwt.config.js
    ├── controllers/
    │   ├── class.controller.js
    │   ├── hod.controller.js
    │   ├── professor.controller.js
    │   └── student.controller.js
    ├── middleware/
    │   ├── auth.middleware.js
    │   ├── error.middleware.js
    │   ├── upload.middleware.js
    │   └── validation.middleware.js
    ├── models/
    │   ├── class.model.js
    │   ├── counter.model.js
    │   ├── hod.model.js
    │   ├── professor.model.js
    │   └── student.model.js
    ├── routes/
    │   ├── class.routes.js
    │   ├── hod.routes.js
    │   ├── professor.routes.js
    │   └── student.routes.js
    └── utils/
        ├── excel.utils.js
        ├── otp.utils.js
        └── response.utils.js
