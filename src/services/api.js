import axios from "axios";

// ====================== AXIOS INSTANCE ======================
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("hodToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ====================== HOD APIs ======================
export const registerHod = (data) => API.post("/hods/register", data);
export const verifyOtp = (data) => API.post("/hods/verify-otp", data);
export const resendOtp = (data) => API.post("/hods/resend-otp", data); // { email }
export const loginHod = (data) => API.post("/hods/login", data);
export const getHodProfile = () => API.get("/hods/profile");

// Update HOD profile (triggers OTP if sensitive fields)
export const updateHod = (data) => API.put("/hods/update", data);

// Verify OTP for profile updates (email/password update)
export const verifyUpdateOtp = (data) =>
  API.post("/hods/verify-update-otp", data); // { otp }

// Delete flow: request delete OTP
export const sendDeleteOtp = () => API.post("/hods/delete-request");

// Confirm deletion with OTP
export const confirmDeleteHod = (data) =>
  API.post("/hods/confirm-delete", data); // { otp }

// ====================== PROFESSOR APIs ======================
export const addProfessor = (profData) => API.post("/professors", profData);
export const getProfessors = () => API.get("/professors");
export const getProfessorById = (id) => API.get(`/professors/${id}`);
export const deleteProfessor = (id) => API.delete(`/professors/${id}`);
export const updateProfessor = (id, profData) =>
  API.put(`/professors/${id}`, profData);

// ====================== PROFESSOR BULK APIs ======================
// Bulk upload professors via Excel
export const bulkUploadProfessors = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await API.post("/professors/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // server returns a summary object; return it
  return res.data?.data || res.data;
};

// Bulk delete professors in one API call
export const deleteProfessorsBulk = async (professorIds) => {
  const ids = Array.from(new Set((professorIds || []).map(String)));
  if (ids.length === 0) {
    // keep consistent return shape as other helpers
    return { totalDeleted: 0, totalRequested: 0 };
  }
  const res = await API.delete("/professors/bulk", {
    headers: { "Content-Type": "application/json" },
    data: { professorIds: ids },
  });
  return res.data?.data || res.data;
};

// Convenience wrapper for frontend code
export const batchDeleteProfessorsClient = async (professorIds, { onProgress } = {}) => {
  const results = { success: [], failed: [] };
  const ids = Array.from(new Set((professorIds || []).map(String))); // dedupe

  if (ids.length === 0) return results;

  try {
    const res = await deleteProfessorsBulk(ids);
    // backend returns totalDeleted etc; treat as success for all requested
    results.success = ids;
  } catch (err) {
    results.failed = ids.map((id) => ({ id, error: err?.response?.data || err?.message || err }));
  }

  onProgress?.({ done: ids.length, total: ids.length });
  return results;
};

// ====================== CLASS APIs ======================
// Create new class
export const createClass = (classData) => API.post("/classes", classData);

// Get all classes (HOD → populated)
export const getClasses = async () => {
  const res = await API.get("/classes?populate=true");
  return (
    res.data?.data || res.data?.classes || res.data?.data?.classes || []
  );
};

// Get specific class by ID
export const getClassById = (id) => API.get(`/classes/${id}`);

// Update class details
export const updateClass = (id, classData) =>
  API.put(`/classes/${id}`, classData);

// Delete single class
export const deleteClass = (id) => API.delete(`/classes/${id}`);

// ✅ Bulk delete classes in one API call (matches DELETE /classes/bulk)
export const deleteClassesBulk = async (classIds) => {
  const res = await API.delete("/classes/bulk", {
    headers: { "Content-Type": "application/json" },
    data: { classIds: Array.from(new Set((classIds || []).map(String))) },
  });
  // Return the useful payload regardless of server shape
  return res.data?.data || res.data;
};

// Convenience client wrapper with progress callback
export const batchDeleteClassesClient = async (classIds, { onProgress } = {}) => {
  const results = { success: [], failed: [] };
  const ids = Array.from(new Set((classIds || []).map(String))); // dedupe

  if (ids.length === 0) return results;

  try {
    await deleteClassesBulk(ids);
    results.success = ids;
  } catch (err) {
    results.failed = ids.map((id) => ({
      id,
      error: err?.response?.data || err?.message || err,
    }));
  }

  onProgress?.({ done: ids.length, total: ids.length });
  return results;
};

// ====================== CLASS → PROFESSOR ASSIGNMENT APIs ======================
// Assign professors to a class
export const assignProfessorsToClass = (classId, professorIds) =>
  API.post(`/classes/${classId}/professors`, { professorIds });

// Remove professors from a class
export const removeProfessorsFromClass = (classId, professorIds) =>
  API.delete(`/classes/${classId}/professors`, { data: { professorIds } });

// ====================== STUDENT APIs ======================
// Bulk upload students via Excel
export const bulkUploadStudents = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await API.post("/students/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data || res.data.data;
};

// Add a single student
export const addStudent = async (studentData) => {
  const res = await API.post("/students", studentData);
  return res.data.data?.student || res.data.student;
};

// Get all students (with optional filters)
export const getStudents = async (params = {}) => {
  const res = await API.get("/students", { params });

  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data?.students)) return res.data.students;
  if (Array.isArray(res.data?.data?.students)) return res.data.data.students;

  return [];
};

// Get student by ID
export const getStudentById = async (id) => {
  const res = await API.get(`/students/${id}`);
  return res.data.data?.student || res.data.student;
};

// Update student
export const updateStudent = async (id, studentData) => {
  const res = await API.put(`/students/${id}`, studentData);
  return res.data.data?.student || res.data.student;
};

// Delete student
export const deleteStudent = async (id) => {
  const res = await API.delete(`/students/${id}`);
  return res.data.data?.message || res.data.message;
};

// ====================== CLASS → STUDENT ASSIGNMENT APIs ======================
// Assign students to a class
export const assignStudentsToClass = (classId, studentIds) =>
  API.post(`/classes/${classId}/students`, { studentIds });

// Remove students from a class
export const removeStudentsFromClass = (classId, studentIds) =>
  API.delete(`/classes/${classId}/students`, {
    headers: { "Content-Type": "application/json" },
    data: { studentIds },
  });

// ====================== CLIENT-SIDE BATCH UPDATER ======================
export const batchUpdateStudentsClient = async (
  studentIds,
  updates,
  { concurrency = 5, onProgress } = {}
) => {
  // sanitize updates: allow only semester and division
  const allowed = {};
  if (updates && typeof updates === "object") {
    if (updates.hasOwnProperty("semester")) {
      const s = updates.semester;
      allowed.semester =
        s === "" || s === null || typeof s === "undefined" ? undefined : Number(s);
      if (Number.isNaN(allowed.semester)) delete allowed.semester;
    }
    if (updates.hasOwnProperty("division")) {
      const d = updates.division;
      if (d !== null && typeof d !== "undefined" && String(d).trim() !== "") {
        allowed.division = String(d);
      }
    }
  }

  if (!allowed || Object.keys(allowed).length === 0) {
    throw new Error("No valid fields to update. Only 'semester' and 'division' are allowed.");
  }

  const results = { success: [], failed: [] };
  const ids = Array.from(new Set((studentIds || []).map(String))); // dedupe
  let done = 0;

  // Worker that consumes the shared queue
  const queue = ids.slice();
  const runWorker = async () => {
    while (queue.length) {
      const id = queue.shift();
      try {
        await updateStudent(id, allowed);
        results.success.push(id);
      } catch (err) {
        results.failed.push({ id, error: err?.response?.data || err?.message || err });
      } finally {
        done += 1;
        onProgress?.({ done, total: ids.length });
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, ids.length) }, () =>
    runWorker()
  );
  await Promise.all(workers);

  return results;
};

// ====================== CLIENT-SIDE BULK DELETE (students, single API call) ======================
export const batchDeleteStudentsClient = async (
  studentIds,
  { onProgress } = {}
) => {
  const results = { success: [], failed: [] };
  const ids = Array.from(new Set((studentIds || []).map(String))); // dedupe

  if (ids.length === 0) return results;

  try {
    const res = await deleteStudentsBulk(ids);
    results.success = ids;

    if (onProgress) onProgress({ done: ids.length, total: ids.length });

    return results;
  } catch (err) {
    results.failed = ids.map((id) => ({ id, error: err?.response?.data || err?.message || err }));
    if (onProgress) onProgress({ done: ids.length, total: ids.length });
    return results;
  }
};

// Bulk delete students in one API call
export const deleteStudentsBulk = async (studentIds) => {
  const res = await API.delete("/students", {
    headers: { "Content-Type": "application/json" },
    data: { studentIds },
  });
  return res.data.data || res.data;
};

// ====================== CLIENT-SIDE BATCH REMOVER ======================
export const batchRemoveStudentsFromClassClient = async (
  classId,
  studentIds,
  { onProgress } = {}
) => {
  const results = { success: [], failed: [] };
  const ids = Array.from(new Set((studentIds || []).map(String))); // dedupe

  if (ids.length === 0) return results;

  try {
    // ✅ Single API call with all IDs at once
    await removeStudentsFromClass(classId, ids);
    results.success = ids;
  } catch (err) {
    results.failed = ids.map((id) => ({ id, error: err }));
  }

  if (onProgress) onProgress({ done: ids.length, total: ids.length });
  return results;
};

// ====================== CLASS BULK UPLOAD ======================
export const bulkUploadClasses = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await API.post("/classes/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};


// ====================== ATTENDANCE (READ-ONLY) APIs ======================

// Helper to safely unwrap various response shapes you’ve been using
const _pluckRecords = (res) =>
  res?.data?.data?.records ??
  res?.data?.records ??
  res?.data?.data ??
  res?.data ??
  [];

/**
 * Get attendance of a class on a specific day (and optional slot)
 * Backend supports either ?date=YYYY-MM-DD or ?dateMs=1693180800000, plus optional ?slotNumber
 * GET /attendance/:classId
 */
export const getAttendanceByDate = async (classId, params = {}) => {
  const res = await API.get(`/attendance/${classId}`, { params });
  return _pluckRecords(res);
};

/**
 * Convenience: broader class fetch with optional filters (?dateMs, ?slotNumber)
 * GET /attendance/class/:classId
 */
export const getClassAttendance = async (classId, params = {}) => {
  const res = await API.get(`/attendance/class/${classId}`, { params });
  return _pluckRecords(res);
};

/**
 * Monthly summary for a class (requires ?month=1..12 & ?year=YYYY)
 * GET /attendance/summary/:classId
 * Returns { month, year, classId, summary: [...] }
 */
export const getMonthlyAttendanceSummary = async (classId, params = {}) => {
  const res = await API.get(`/attendance/summary/${classId}`, { params });
  // Keep entire payload because you’ll likely need month/year + summary
  return res?.data?.data ?? res?.data;
};

/**
 * Full history for a student (optionally filter with ?classId, ?dateMs, ?slotNumber in future if you add)
 * GET /attendance/student/:studentId
 */
export const getStudentAttendance = async (studentId, params = {}) => {
  const res = await API.get(`/attendance/student/${studentId}`, { params });
  return _pluckRecords(res);
};


export default API;
