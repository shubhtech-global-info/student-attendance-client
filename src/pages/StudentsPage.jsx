// src/pages/StudentPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  bulkUploadStudents,
  batchUpdateStudentsClient,
  batchDeleteStudentsClient,
  addStudent,
} from "../services/api";
import { toast } from "react-toastify";
import { useConfirm } from "../components/ConfirmProvider";
import BatchUpdateModal from "../components/BatchUpdateModal";
import BatchProgress from "../components/BatchProgress";
import {
  XCircle,
  Search,
  Filter,
  RefreshCw,
  SortAsc,
  SortDesc,
  Loader2,
  PlusCircle,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function StudentPage() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null); // inline editor model
  const [loading, setLoading] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);

  const [newStudent, setNewStudent] = useState({
    name: "",
    enrollmentNumber: "",
    semester: "",
    division: "",
  });
  const [adding, setAdding] = useState(false);

  // selection + batch UI state (use Set for efficiency)
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const [showHelper, setShowHelper] = useState(false);

  // per-card edit loading + saving state
  const [editingId, setEditingId] = useState(null); // id currently being fetched for edit
  const [saving, setSaving] = useState(false); // save in progress

  // filters / search / sort
  const [searchName, setSearchName] = useState("");
  const [searchEnrollment, setSearchEnrollment] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | enrollment | semester
  const [filterDivision, setFilterDivision] = useState("");
  const [visibleCount, setVisibleCount] = useState(12); // show first 12 by default

  const [uploading, setUploading] = useState(false);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc"); // asc | desc
  const [error, setError] = useState("");

  const confirm = useConfirm();
  const headerCheckboxRef = useRef(null);

  // Fetch all students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudents();
      // getStudents returns either array or response; handle both
      const arr = Array.isArray(data) ? data : data?.data?.students || data?.students || data?.data || [];
      setStudents(arr);
    } catch (err) {
      console.error("Error fetching students:", err);
      toast.error("Failed to fetch students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // keep selection trimmed to available ids
  useEffect(() => {
    if (!Array.isArray(students) || students.length === 0) {
      if (selectedIds.size) setSelectedIds(new Set());
      return;
    }
    const valid = new Set(students.map((s) => String(s._id)));
    const next = new Set();
    let changed = false;
    selectedIds.forEach((id) => {
      if (valid.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelectedIds(next);
  }, [students]); // eslint-disable-line

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.enrollmentNumber || !newStudent.semester) {
      toast.error("⚠️ Please fill in Name, Enrollment, and Semester");
      return;
    }

    try {
      setAdding(true);
      await addStudent(newStudent);
      toast.success("✅ Student added!");
      setNewStudent({ name: "", enrollmentNumber: "", semester: "", division: "" });
      await fetchStudents();
    } catch (err) {
      console.error("Error adding student:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg ? `Failed to add student: ${backendMsg}` : "Failed to add student";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setAdding(false);
    }
  };

  // Handle inline edit open (per-card loading)
  const handleEdit = async (id) => {
    try {
      setEditingId(id);
      setSelectedStudent(null);
      const student = await getStudentById(id);
      const s = student?.student || student;
      setSelectedStudent(s);
    } catch (err) {
      console.error("Error fetching student:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg ? `Failed to load student: ${backendMsg}` : "Failed to load student details";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setEditingId(null);
    }
  };

  // Handle update (inline)
  const handleUpdate = async () => {
    if (!selectedStudent || !selectedStudent._id) return;
    try {
      setSaving(true);
      await updateStudent(selectedStudent._id, {
        name: selectedStudent.name,
        enrollmentNumber: selectedStudent.enrollmentNumber,
        semester: selectedStudent.semester,
        division: selectedStudent.division,
      });
      toast.success("✅ Student updated!");
      setSelectedStudent(null);
      await fetchStudents();
    } catch (err) {
      console.error("Error updating student:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg ? `Failed to update student: ${backendMsg}` : "Failed to update student";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    const student = students.find((s) => s._id === id);
    const ok = await confirm({
      title: "Delete Student",
      message: `Are you sure you want to delete "${student?.name || "this student"}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await deleteStudent(id);
      toast.success("🗑️ Student deleted!");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(String(id));
        return next;
      });
      if (selectedStudent && selectedStudent._id === id) setSelectedStudent(null);
      await fetchStudents();
    } catch (err) {
      console.error("Error deleting student:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg ? `Failed to delete student: ${backendMsg}` : "Failed to delete student";
      setError(finalMsg);
      toast.error(finalMsg);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("📂 Please select an Excel file first!");
      return;
    }
    try {
      setUploading(true);
      const res = await bulkUploadStudents(bulkFile);
      console.log("Bulk upload result:", res);
      const totalUploaded = res?.totalUploaded ?? res?.inserted ?? (Array.isArray(res) ? res.length : 0);
      toast.success(`✅ Bulk upload finished. ${totalUploaded} added.`);
      setBulkFile(null);
      await fetchStudents();
      console.log("Bulk upload result:", res);
    } catch (err) {
      console.error("Error bulk uploading:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg ? `Bulk upload failed: ${backendMsg}` : "Bulk upload failed";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setUploading(false);
    }
  };

  // Client-side batch apply handler (uses batchUpdateStudentsClient)
  const handleApplyBatch = async (updates) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.error("No students selected for batch update");
      return;
    }

    setProgress({ done: 0, total: ids.length });
    setProgressOpen(true);
    setBatchUpdating(true);

    try {
      const res = await batchUpdateStudentsClient(ids, updates, {
        concurrency: 5,
        onProgress: ({ done, total }) => setProgress({ done, total }),
      });

      if (res.failed.length === 0) {
        toast.success(`Updated ${res.success.length} students`);
      } else {
        toast.warn(`Updated ${res.success.length}, failed ${res.failed.length}. Check console for details.`);
        console.table(res.failed);
      }
      setBatchModalOpen(false);
      setSelectedIds(new Set());
      await fetchStudents();
    } catch (err) {
      console.error("Batch update error", err);
      toast.error("Batch update failed");
    } finally {
      setBatchUpdating(false);
    }
  };

  // Batch delete handler (single API call)
  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.error("No students selected for deletion");
      return;
    }

    const ok = await confirm({
      title: `Delete ${ids.length} selected ${ids.length === 1 ? "student" : "students"}`,
      message:
        "This will permanently delete selected students. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    setProgress({ done: 0, total: ids.length });
    setProgressOpen(true);
    setBulkDeleting(true);

    try {
      const res = await batchDeleteStudentsClient(ids, {
        onProgress: ({ done, total }) => setProgress({ done, total }),
      });

      if (res.failed.length === 0) {
        toast.success(`Deleted ${res.success.length} students 🗑️`);
      } else {
        toast.warn(`Deleted ${res.success.length}, failed ${res.failed.length}. Check console for details.`);
        console.table(res.failed);
      }
      setSelectedIds(new Set());
      await fetchStudents();
    } catch (err) {
      console.error("Batch delete error", err);
      toast.error("Batch delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Combined filtering + sorting
  const filteredStudents = useMemo(() => {
    let arr = students.filter((s) => {
      if (searchName && !(s.name || "").toLowerCase().includes(searchName.toLowerCase())) return false;
      if (searchEnrollment && !((s.enrollmentNumber || "").toLowerCase().includes(searchEnrollment.toLowerCase())))
        return false;
      if (filterSemester && Number(s.semester) !== Number(filterSemester)) return false;
      if (filterDivision && (s.division || "") !== filterDivision) return false;
      return true;
    });

    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = (a.name || "").localeCompare(b.name || "");
      } else if (sortBy === "enrollment") {
        cmp = (a.enrollmentNumber || "").localeCompare(b.enrollmentNumber || "");
      } else if (sortBy === "semester") {
        cmp = Number(a.semester || 0) - Number(b.semester || 0);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [students, searchName, searchEnrollment, filterSemester, filterDivision, sortBy, sortOrder]);

  const visibleStudents = useMemo(() => filteredStudents.slice(0, visibleCount), [filteredStudents, visibleCount]);

  const divisionOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.division).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [students]);

  // Selection helpers (mirror Professors page)
  const filteredIds = useMemo(() => filteredStudents.map((c) => String(c._id)), [filteredStudents]);

  const allOnPageSelected = useMemo(() => {
    if (!filteredIds.length) return false;
    return filteredIds.every((id) => selectedIds.has(id));
  }, [filteredIds, selectedIds]);

  const someOnPageSelected = useMemo(() => {
    if (!filteredIds.length) return false;
    return filteredIds.some((id) => selectedIds.has(id)) && !allOnPageSelected;
  }, [filteredIds, selectedIds, allOnPageSelected]);

  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = someOnPageSelected;
  }, [someOnPageSelected]);

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const s = String(id);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <h1 className="text-3xl font-extrabold text-purple-700 mb-6 flex items-center gap-2">📚 Student Management</h1>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center justify-between bg-red-100 text-red-700 p-3 rounded-lg">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-700 hover:text-red-900">
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* Bulk Upload Students */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border">
        <h2 className="font-semibold mb-2 text-purple-700">
          📥 Bulk Upload Students
        </h2>

        {/* Responsive Row */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* File Input */}
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => setBulkFile(e.target.files[0])}
            className="border rounded-lg px-3 py-2 w-full md:w-auto"
            disabled={uploading}
          />

          {/* Upload Button */}
          <button
            onClick={handleBulkUpload}
            className="w-full md:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-60"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Uploading...
              </>
            ) : (
              "Upload"
            )}
          </button>
        </div>

        {/* Toggle Helper Text */}
        <div className="mt-3">
          <button
            onClick={() => setShowHelper((prev) => !prev)}
            className="flex items-center gap-1 text-purple-600 text-sm font-medium hover:underline"
          >
            {showHelper ? (
              <>
                Hide file format details <ChevronUp size={16} />
              </>
            ) : (
              <>
                View file format requirements <ChevronDown size={16} />
              </>
            )}
          </button>

          {/* Collapsible Helper Text */}
          {showHelper && (
            <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-gray-700">
              <p className="mb-1 font-medium text-purple-800">
                📄 Excel File Format Requirements:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  File type must be <strong>.xlsx</strong> or <strong>.xls</strong>.
                </li>
                <li>
                  <strong>Required columns:</strong>
                  <ul className="list-disc list-inside ml-5">
                    <li>
                      <code>enrollmentNumber</code> – Unique student enrollment/roll
                      number
                      <br />
                      <span className="text-gray-500 text-xs">
                        Accepted headers: <code>enrollmentNumber</code>,{" "}
                        <code>enrollment</code>, <code>enrollmentNo</code>,{" "}
                        <code>enrollNumber</code>, <code>roll</code>,{" "}
                        <code>rollNumber</code>, <code>id</code>
                      </span>
                    </li>
                    <li>
                      <code>name</code> – Student’s full name
                      <br />
                      <span className="text-gray-500 text-xs">
                        Accepted headers: <code>name</code>, <code>studentName</code>,{" "}
                        <code>fullName</code>, <code>student</code>
                      </span>
                    </li>
                    <li>
                      <code>semester</code> – Current semester (numeric)
                      <br />
                      <span className="text-gray-500 text-xs">
                        Accepted headers: <code>semester</code>, <code>sem</code>,{" "}
                        <code>classSemester</code>
                      </span>
                    </li>
                    <li>
                      <code>division</code> (optional) – Section/division for the
                      class (e.g., A, B)
                      <br />
                      <span className="text-gray-500 text-xs">
                        Accepted headers: <code>division</code>, <code>div</code>,{" "}
                        <code>section</code>
                      </span>
                    </li>
                  </ul>
                </li>
                <li>
                  Column headers are <em>case-insensitive</em>. Example:{" "}
                  <code>ENROLLMENTNO</code> or <code>Roll</code> are both valid.
                </li>
                <li>
                  Each row represents <strong>one student</strong>.
                  <br />
                  <span className="text-gray-500 text-xs">
                    Example: Row with <code>enrollmentNumber = 2024CS001</code>,{" "}
                    <code>name = John Doe</code>, <code>semester = 3</code>,{" "}
                    <code>division = A</code>
                  </span>
                </li>
                <li>
                  Duplicate enrollment numbers under the same HOD are automatically
                  skipped.
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Add Single Student */}
      <div className="mb-6 bg-white p-6 rounded-2xl shadow-md border">
        <h2 className="text-lg font-semibold text-purple-700 mb-4 flex items-center gap-2">
          <PlusCircle /> Add Single Student
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="👤 Name"
            value={newStudent.name}
            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="🆔 Roll Number"
            value={newStudent.enrollmentNumber}
            onChange={(e) => setNewStudent({ ...newStudent, enrollmentNumber: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <input
            type="number"
            placeholder="🎓 Semester"
            value={newStudent.semester}
            onChange={(e) => setNewStudent({ ...newStudent, semester: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="🏷️Division (optional)"
            value={newStudent.division}
            onChange={(e) => setNewStudent({ ...newStudent, division: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="mt-4">
          <button
            onClick={handleAddStudent}
            disabled={adding}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {adding ? <><Loader2 className="animate-spin" size={14} /> Adding...</> : "➕ Add Student"}
          </button>
        </div>
      </div>

      {/* Controls: Search + Filters + Sort */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-6">
        {/* Top Row: Search + Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* ✅ Search bar full width on mobile */}
          <div className="flex-1 relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* ✅ Filters stack on mobile, row on larger screens */}
          <div className="flex flex-wrap gap-2 md:flex-nowrap">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter size={18} className="text-purple-600 shrink-0" />
              <select
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full md:w-auto"
                title="Filter by division"
              >
                {divisionOptions.map((d, i) => (
                  <option key={i} value={d}>
                    {d === "" ? "All Divisions" : `Division ${d}`}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full md:w-auto"
              title="Sort by"
            >
              <option value="name">Sort by Name</option>
              <option value="enrollment">Sort by Enrollment</option>
              <option value="semester">Sort by Semester</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 w-full md:w-auto justify-center"
              title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
            >
              {sortOrder === "asc" ? (
                <>
                  <SortAsc size={16} />
                  <span>Asc</span>
                </>
              ) : (
                <>
                  <SortDesc size={16} />
                  <span>Desc</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setSearchName("");
                setSearchEnrollment("");
                setFilterSemester("");
                setFilterDivision("");
                setSortBy("name");
                setSortOrder("asc");
              }}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 w-full md:w-auto justify-center"
              title="Reset"
            >
              <RefreshCw size={16} /> Reset
            </button>
          </div>
        </div>

        {/* ✅ Info text */}
        <div className="mt-2 text-sm text-gray-600 text-center md:text-left">
          Showing <span className="font-semibold">{filteredStudents.length}</span> of{" "}
          <span className="font-semibold">{Array.isArray(students) ? students.length : 0}</span> students
        </div>

        {/* ✅ Bulk toolbar (responsive wrap) */}
        <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
          <button
            onClick={toggleSelectAllOnPage}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 w-full sm:w-auto justify-center"
            disabled={!filteredStudents.length}
            title={allOnPageSelected ? "Unselect all visible" : "Select all visible"}
          >
            {allOnPageSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {allOnPageSelected ? "Unselect All (visible)" : "Select All (visible)"}
          </button>

          <button
            onClick={clearSelection}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
            disabled={selectedIds.size === 0}
          >
            Clear Selection
          </button>

          <button
            onClick={() => setBatchModalOpen(true)}
            disabled={selectedIds.size === 0 || batchUpdating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60 w-full sm:w-auto justify-center"
          >
            {batchUpdating ? <Loader2 className="animate-spin" size={16} /> : "🛠️ Batch Update"}
            <span className="ml-1">({selectedIds.size})</span>
          </button>

          <button
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0 || bulkDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-60 w-full sm:w-auto justify-center"
          >
            {bulkDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
            <span className="ml-1">Delete Selected ({selectedIds.size})</span>
          </button>
        </div>
      </div>


      {/* Student grid */}
      {loading ? (
        <div className="flex items-center justify-center">
          <Loader2 className="animate-spin text-purple-600" size={32} />
          <span className="ml-2">Loading Students...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center text-gray-500 text-lg py-12">
          🚫 No students found
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleStudents.map((s) => {
              const sid = String(s._id);
              const isSelected = selectedIds.has(sid);
              const isEditing = selectedStudent && selectedStudent._id === s._id;
              const isFetchingThis = editingId === s._id;

              return (
                <div key={s._id} className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition relative">
                  {/* selection checkbox top-right */}
                  <div className="absolute right-3 top-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(s._id)}
                      aria-label={`Select ${s.name}`}
                    />
                  </div>

                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={selectedStudent.name}
                        onChange={(e) => setSelectedStudent((st) => ({ ...st, name: e.target.value }))}
                        className="w-full border p-2 rounded mb-2"
                      />
                      <input
                        type="text"
                        value={selectedStudent.enrollmentNumber}
                        onChange={(e) => setSelectedStudent((st) => ({ ...st, enrollmentNumber: e.target.value }))}
                        className="w-full border p-2 rounded mb-2"
                        placeholder="Enrollment Number"
                        disabled={saving}
                      />
                      <div className="flex gap-2 mb-2">
                        <input
                          type="number"
                          value={selectedStudent.semester}
                          onChange={(e) => setSelectedStudent((st) => ({ ...st, semester: e.target.value }))}
                          className="border p-2 rounded flex-1"
                          placeholder="Semester"
                          disabled={saving}
                        />
                        <input
                          type="text"
                          value={selectedStudent.division || ""}
                          onChange={(e) => setSelectedStudent((st) => ({ ...st, division: e.target.value }))}
                          className="border p-2 rounded flex-1"
                          placeholder="Division"
                          disabled={saving}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg"
                          onClick={handleUpdate}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "💾 Save"}
                        </button>
                        <button
                          className="flex-1 px-3 py-2 bg-gray-400 text-white rounded-lg"
                          onClick={() => setSelectedStudent(null)}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">🧑‍🎓</div>
                      <h3 className="text-lg font-bold text-gray-800">{s.name}</h3>
                      <p className="text-sm text-gray-500">🆔 {s.enrollmentNumber}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          🎓 Semester {s.semester}
                        </span>
                        {s.division && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            🏷️ {s.division}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex gap-3">
                        <button
                          className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg"
                          onClick={() => handleEdit(s._id)}
                          disabled={isFetchingThis || saving}
                        >
                          {isFetchingThis ? <Loader2 className="animate-spin" size={14} /> : "✏️ Edit"}
                        </button>
                        <button
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg"
                          onClick={() => handleDelete(s._id)}
                          disabled={saving || isFetchingThis}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {visibleCount < filteredStudents.length && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
              >
                Show More ({filteredStudents.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Batch modal + progress overlays */}
      <BatchUpdateModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onSubmit={handleApplyBatch}
      />

      <BatchProgress
        open={progressOpen}
        done={progress.done}
        total={progress.total}
        onClose={() => setProgressOpen(false)}
      />
    </div>
  );
}
