// src/pages/ClassesPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  createClass,
  getClasses,
  updateClass,
  deleteClass,
  bulkUploadClasses,
  batchDeleteClassesClient, // ✅ added
} from "../services/api";
import {
  PlusCircle,
  Edit,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  SortAsc,
  SortDesc,
  Loader2,
  Trash2, // ✅ added
  CheckSquare, // ✅ added
  Square,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "react-toastify";
import { useConfirm } from "../components/ConfirmProvider";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [classForm, setClassForm] = useState({
    className: "",
    division: "",
  });
  const [editClassId, setEditClassId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // New UI state
  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [startsWith, setStartsWith] = useState("");
  const [sortBy, setSortBy] = useState("classId");
  const [sortDir, setSortDir] = useState("asc");

  // button-loading states (added)
  const [adding, setAdding] = useState(false);
  const [editLoadingId, setEditLoadingId] = useState(null); // micro spinner when entering edit mode
  const [savingId, setSavingId] = useState(null); // id being saved

  const [showClassHelper, setShowClassHelper] = useState(false);

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  // ✅ Bulk delete state
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const confirm = useConfirm();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getClasses();
      setClasses(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Error fetching classes", err);
      setError("⚠️ Failed to load classes");
      toast.error("⚠️ Failed to load classes");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Keep selection valid when list changes
  useEffect(() => {
    if (!Array.isArray(classes) || classes.length === 0) {
      if (selectedIds.size) setSelectedIds(new Set());
      return;
    }
    const validIds = new Set(classes.map((c) => String(c._id)));
    let mutated = false;
    const next = new Set();
    selectedIds.forEach((id) => {
      if (validIds.has(id)) next.add(id);
      else mutated = true;
    });
    if (mutated) setSelectedIds(next);
  }, [classes]); // eslint-disable-line

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("📂 Please select an Excel file first!");
      return;
    }

    try {
      setBulkUploading(true);

      const res = await bulkUploadClasses(bulkFile);
      const totalUploaded = res.totalUploaded || 0;
      const totalSkipped = res.totalSkipped || 0;

      toast.success(`✅ ${totalUploaded} classes uploaded, ${totalSkipped} skipped (duplicates).`);
      setBulkFile(null);
      await fetchClasses();
    } catch (err) {
      console.error("Bulk class upload failed", err);
      const backendMsg = err.response?.data?.error;
      toast.error(backendMsg ? `Bulk upload failed: ${backendMsg}` : "Bulk upload failed");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      setAdding(true);
      await createClass({
        className: classForm.className,
        division: classForm.division,
      });
      toast.success("✅ Class added");
      setClassForm({ className: "", division: "" });
      await fetchClasses();
    } catch (err) {
      console.error("Error adding class", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to add class: ${backendMsg}`
        : "Failed to add class";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateClass = async (id) => {
    try {
      setSavingId(id);
      const cls = classes.find((c) => c._id === id);
      if (!cls) return;
      await updateClass(id, {
        className: cls.className,
        division: cls.division,
      });
      toast.success("✅ Class updated");
      setEditClassId(null);
      await fetchClasses();
    } catch (err) {
      console.error("Error updating class", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to update class: ${backendMsg}`
        : "Failed to update class";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteClass = async (id) => {
    const cls = classes.find((c) => c._id === id);
    const ok = await confirm({
      title: "Delete Class",
      message: `Are you sure you want to delete "${cls?.className || "this class"}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await deleteClass(id);
      toast.success("🗑️ Class deleted");
      await fetchClasses();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Error deleting class", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to delete class: ${backendMsg}`
        : "Failed to delete class";
      setError(finalMsg);
      toast.error(finalMsg);
    }
  };

  // ===== Filters / sorting =====
  const letters = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "0-9"];

  const divisionOptions = useMemo(() => {
    const set = new Set((classes || []).map((c) => (c.division || "").trim()).filter(Boolean));
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [classes]);

  const filtered = useMemo(() => {
    let list = Array.isArray(classes) ? classes.slice() : [];
    const s = search.trim().toLowerCase();

    if (s) {
      list = list.filter((c) => {
        const id = (c.classId || "").toString().toLowerCase();
        const name = (c.className || "").toLowerCase();
        return id.includes(s) || name.includes(s);
      });
    }
    if (divisionFilter) {
      list = list.filter((c) => (c.division || "") === divisionFilter);
    }
    if (startsWith) {
      if (startsWith === "0-9") {
        list = list.filter((c) => /^\d/.test((c.classId || c.className || "").toString().trim()));
      } else {
        const l = startsWith.toLowerCase();
        list = list.filter((c) =>
          ((c.classId || "").toString().trim().toLowerCase().startsWith(l)) ||
          ((c.className || "").trim().toLowerCase().startsWith(l))
        );
      }
    }
    list.sort((a, b) => {
      const av = (a[sortBy] || "").toString().toLowerCase();
      const bv = (b[sortBy] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [classes, search, divisionFilter, startsWith, sortBy, sortDir]);

  // ===== Selection helpers =====
  const filteredIds = useMemo(() => filtered.map((c) => String(c._id)), [filtered]);

  const allOnPageSelected = useMemo(() => {
    if (!filteredIds.length) return false;
    return filteredIds.every((id) => selectedIds.has(id));
  }, [filteredIds, selectedIds]);

  const someOnPageSelected = useMemo(() => {
    if (!filteredIds.length) return false;
    return filteredIds.some((id) => selectedIds.has(id)) && !allOnPageSelected;
  }, [filteredIds, selectedIds, allOnPageSelected]);

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

  // ===== Bulk delete handler =====
  const handleBulkDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.info("No classes selected.");
      return;
    }

    const ok = await confirm({
      title: `Delete ${ids.length} selected ${ids.length === 1 ? "class" : "classes"}`,
      message:
        "This will remove the classes, detach their students, and pull the class from professors. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    try {
      setBulkDeleting(true);
      const { success, failed } = await batchDeleteClassesClient(ids, {
        onProgress: ({ done, total }) => {
          // optional: could be wired to a progress UI
          // console.debug(`Bulk deleting ${done}/${total}`);
        },
      });

      if (success.length) {
        toast.success(`🗑️ Deleted ${success.length} ${success.length === 1 ? "class" : "classes"}.`);
      }
      if (failed.length) {
        toast.error(`⚠️ Failed to delete ${failed.length} item(s).`);
        console.error("Bulk delete failed items:", failed);
      }

      clearSelection();
      await fetchClasses();
    } catch (err) {
      console.error("Bulk delete error:", err);
      const backendMsg = err?.response?.data?.error;
      toast.error(backendMsg ? `Bulk delete failed: ${backendMsg}` : "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const resetControls = () => {
    setSearch("");
    setDivisionFilter("");
    setStartsWith("");
    setSortBy("classId");
    setSortDir("asc");
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <h1 className="text-2xl font-bold text-purple-700 mb-6">🏫 Manage Classes</h1>

      {error && (
        <div className="mb-4 flex items-center justify-between bg-red-100 text-red-700 p-3 rounded-lg">
          <span className="flex items-center gap-2">
            <XCircle size={18} />
            {error}
          </span>
          <button onClick={() => setError("")} className="text-red-700 hover:text-red-900">
            ✖
          </button>
        </div>
      )}

      {/* Bulk Upload Classes */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border">
        <h2 className="font-semibold mb-2 text-purple-700">
          📥 Bulk Upload Classes
        </h2>

        {/* Responsive Row */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* File Input */}
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => setBulkFile(e.target.files[0])}
            className="border rounded-lg px-3 py-2 w-full md:w-auto"
            disabled={bulkUploading}
          />

          {/* Upload Button */}
          <button
            onClick={handleBulkUpload}
            className="w-full md:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-60"
            disabled={bulkUploading}
          >
            {bulkUploading ? (
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
            onClick={() => setShowClassHelper((prev) => !prev)}
            className="flex items-center gap-1 text-purple-600 text-sm font-medium hover:underline"
          >
            {showClassHelper ? (
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
          {showClassHelper && (
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
                      <code>className</code> – Name of the class (e.g., "BSc Computer Science")
                      <br />
                      <span className="text-gray-500 text-xs">
                        Accepted headers: <code>className</code>, <code>class</code>, <code>name</code>
                      </span>
                    </li>
                    <li>
                      <code>division</code> – Division/Section for the class (e.g., "A", "B")
                      <br />
                      <span className="text-gray-500 text-xs">
                        Accepted headers: <code>division</code>, <code>section</code>, <code>div</code>
                      </span>
                    </li>
                  </ul>
                </li>
                <li>
                  Column headers are <em>case-insensitive</em> (e.g., <code>ClassName</code>, <code>DIVISION</code> are valid).
                </li>
                <li>
                  Each row represents one class–division pair.
                  <br />
                  <span className="text-gray-500 text-xs">
                    Example: Row with <code>className = BSc IT</code> and <code>division = A</code> creates "BSc IT - A".
                  </span>
                </li>
                <li>
                  Duplicate classes (same className + division) are automatically skipped if they already exist.
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>



      {/* Add Class Form */}
      <form
        onSubmit={handleAddClass}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border"
      >
        <input
          type="text"
          placeholder="Class Name (e.g., Computer Science)"
          value={classForm.className}
          onChange={(e) => setClassForm({ ...classForm, className: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
          required
          disabled={adding}
        />
        <input
          type="text"
          placeholder="Division (e.g., A)"
          value={classForm.division}
          onChange={(e) => setClassForm({ ...classForm, division: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
          required
          disabled={adding}
        />
        <button
          type="submit"
          className="md:col-span-3 flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-60"
          disabled={adding}
        >
          {adding ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Adding...
            </>
          ) : (
            <>
              <PlusCircle size={18} /> Add Class
            </>
          )}
        </button>
      </form>

      {/* Controls: Search + Filters + Sort */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* 🔍 Search Box */}
          <div className="flex-1 relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search by Class ID or Class Name..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* 🛠 Filters + Sort Controls */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
            {/* Division Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={18} className="text-purple-600" />
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full sm:w-auto"
                title="Filter by division"
              >
                {divisionOptions.map((d, i) => (
                  <option key={i} value={d}>
                    {d === "" ? "All Divisions" : `Division ${d}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Starts With Filter */}
            <select
              value={startsWith}
              onChange={(e) => setStartsWith(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full sm:w-auto"
              title="Filter by first letter/number"
            >
              {letters.map((l, i) => (
                <option key={i} value={l}>
                  {l === "" ? "Any Letter/Number" : l}
                </option>
              ))}
            </select>

            {/* Sort Field */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full sm:w-auto"
              title="Sort field"
            >
              <option value="classId">Sort by Class ID</option>
              <option value="className">Sort by Class Name</option>
              <option value="division">Sort by Division</option>
            </select>

            {/* Sort Direction */}
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 w-full sm:w-auto"
              title="Toggle sort direction"
            >
              {sortDir === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
              {sortDir.toUpperCase()}
            </button>

            {/* Reset */}
            <button
              onClick={resetControls}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 w-full sm:w-auto"
              title="Reset"
            >
              <RefreshCw size={16} /> Reset
            </button>
          </div>
        </div>

        {/* 📊 Showing Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing <span className="font-semibold">{filtered.length}</span> of{" "}
          <span className="font-semibold">{Array.isArray(classes) ? classes.length : 0}</span> classes
        </div>

        {/* ✅ Bulk Toolbar */}
        <div className="mt-3 flex flex-col sm:flex-row flex-wrap items-center gap-2">
          <button
            onClick={toggleSelectAllOnPage}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 w-full sm:w-auto"
            disabled={!filtered.length}
            title={allOnPageSelected ? "Unselect all visible" : "Select all visible"}
          >
            {allOnPageSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {allOnPageSelected ? "Unselect All (visible)" : "Select All (visible)"}
          </button>

          <button
            onClick={clearSelection}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
            disabled={!selectedIds.size}
            title="Clear selection"
          >
            Clear Selection
          </button>

          <button
            onClick={handleBulkDeleteSelected}
            className="px-3 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-60 w-full sm:w-auto"
            disabled={!selectedIds.size || bulkDeleting}
            title="Delete selected"
          >
            {bulkDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
            {bulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
          </button>
        </div>
      </div>


      {/* Classes List */}
      {loading ? (
        <p className="text-gray-500">⏳ Loading classes...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">🚫 No classes match your filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow border bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-purple-100 text-left">
                {/* ✅ Select checkbox header */}
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected;
                    }}
                    onChange={toggleSelectAllOnPage}
                  />
                </th>
                <th className="p-3">🆔 Class ID</th>
                <th className="p-3">🏫 Class Name</th>
                <th className="p-3">📌 Division</th>
                <th className="p-3">⚙️ Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cls) => {
                const isSelected = selectedIds.has(String(cls._id));
                return (
                  <tr key={cls._id} className="border-b hover:bg-gray-50 transition">
                    {/* ✅ Row checkbox */}
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${cls.className}`}
                        checked={isSelected}
                        onChange={() => toggleSelectOne(cls._id)}
                      />
                    </td>

                    {/* Class ID always displayed as non-editable text */}
                    <td className="p-3">{cls.classId}</td>

                    <td className="p-3">
                      {editClassId === cls._id ? (
                        <input
                          value={cls.className}
                          onChange={(e) =>
                            setClasses((prev) =>
                              prev.map((c) =>
                                c._id === cls._id ? { ...c, className: e.target.value } : c
                              )
                            )
                          }
                          className="px-2 py-1 border rounded-lg"
                          disabled={savingId === cls._id}
                        />
                      ) : (
                        cls.className
                      )}
                    </td>

                    <td className="p-3">
                      {editClassId === cls._id ? (
                        <input
                          value={cls.division}
                          onChange={(e) =>
                            setClasses((prev) =>
                              prev.map((c) =>
                                c._id === cls._id ? { ...c, division: e.target.value } : c
                              )
                            )
                          }
                          className="px-2 py-1 border rounded-lg"
                          disabled={savingId === cls._id}
                        />
                      ) : (
                        cls.division
                      )}
                    </td>

                    <td className="p-3 flex gap-2">
                      {editClassId === cls._id ? (
                        <>
                          <button
                            onClick={() => handleUpdateClass(cls._id)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1 disabled:opacity-60"
                            disabled={savingId === cls._id}
                          >
                            {savingId === cls._id ? (
                              <>
                                <Loader2 className="animate-spin" size={14} /> Saving...
                              </>
                            ) : (
                              "✅ Save"
                            )}
                          </button>
                          <button
                            onClick={() => setEditClassId(null)}
                            className="px-3 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500 flex items-center gap-1"
                            disabled={savingId === cls._id}
                          >
                            <XCircle size={16} /> Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              // micro loading indicator when entering edit mode
                              setEditLoadingId(cls._id);
                              setTimeout(() => {
                                setEditClassId(cls._id);
                                setEditLoadingId(null);
                              }, 120);
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60"
                            disabled={savingId !== null}
                          >
                            {editLoadingId === cls._id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Edit size={16} />
                            )}
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls._id)}
                            className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            disabled={savingId !== null}
                          >
                            <XCircle size={16} /> Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
