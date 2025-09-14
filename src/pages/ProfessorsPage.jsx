// src/pages/ProfessorsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addProfessor,
  getProfessors,
  updateProfessor,
  deleteProfessor,
  bulkUploadProfessors, // ✅ added
  batchDeleteProfessorsClient, // ✅ added
} from "../services/api";
import {
  PlusCircle,
  Edit,
  XCircle,
  User,
  BookOpen,
  Loader2,
  Filter,
  Search,
  RefreshCw,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "react-toastify";
import { useConfirm } from "../components/ConfirmProvider";

export default function ProfessorsPage() {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  const [showPasswordAdd, setShowPasswordAdd] = useState(false); // for Add form
  const [showPasswordEdits, setShowPasswordEdits] = useState({}); // per-professor toggle

  const [showProfessorHelper, setShowProfessorHelper] = useState(false);

  // New UI state
  const [search, setSearch] = useState("");
  const [startsWith, setStartsWith] = useState(""); // "", "A".."Z", "0-9"
  const [sortBy, setSortBy] = useState("name"); // "name" | "username"
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  // button-specific loading states
  const [adding, setAdding] = useState(false);
  const [editLoadingId, setEditLoadingId] = useState(null); // shows brief spinner on Edit click
  const [savingId, setSavingId] = useState(null); // id of professor being saved

  // Bulk upload / delete states
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const headerCheckboxRef = useRef(null);
  const confirm = useConfirm();

  useEffect(() => {
    fetchProfessors();
  }, []);

  const fetchProfessors = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getProfessors();
      // getProfessors returns the axios response; original code used res.data...
      setProfessors(res?.data?.professors || []);
    } catch (err) {
      console.error(err);
      setError("⚠️ Failed to load professors");
      toast.error("⚠️ Failed to load professors");
      setProfessors([]);
    } finally {
      setLoading(false);
    }
  };

  // Keep selection valid when list changes
  useEffect(() => {
    if (!Array.isArray(professors) || professors.length === 0) {
      if (selectedIds.size) setSelectedIds(new Set());
      return;
    }
    const validIds = new Set(professors.map((c) => String(c._id)));
    let mutated = false;
    const next = new Set();
    selectedIds.forEach((id) => {
      if (validIds.has(id)) next.add(id);
      else mutated = true;
    });
    if (mutated) setSelectedIds(next);
  }, [professors]); // eslint-disable-line

  const handleAddProfessor = async (e) => {
    e.preventDefault();
    try {
      setAdding(true);
      await addProfessor(form);
      toast.success("✅ Professor added");
      setForm({ name: "", username: "", password: "" });
      await fetchProfessors();
    } catch (err) {
      console.error("add error", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to add professor: ${backendMsg}`
        : "Failed to add professor";

      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateProfessor = async (id) => {
    try {
      setSavingId(id);
      const prof = professors.find((p) => p._id === id);
      if (!prof) throw new Error("Professor not found");

      // build update payload
      const updatePayload = { name: prof.name, username: prof.username };
      if (prof.password && prof.password.trim() !== "") {
        updatePayload.password = prof.password;
      }

      await updateProfessor(id, updatePayload);
      toast.success("✅ Professor updated");

      // reset
      setEditId(null);
      await fetchProfessors();
    } catch (err) {
      console.error("update error", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to update professor: ${backendMsg}`
        : "Failed to update professor";

      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteProfessor = async (id) => {
    const prof = professors.find((p) => p._id === id);
    const ok = await confirm({
      title: "Delete Professor",
      message: `Are you sure you want to delete "${prof?.name || "this professor"}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await deleteProfessor(id);
      toast.success("🗑️ Professor deleted");
      await fetchProfessors();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("delete error", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to delete professor: ${backendMsg}`
        : "Failed to delete professor";

      setError(finalMsg);
      toast.error(finalMsg);
    }
  };

  // Bulk upload handler
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("📂 Please select an Excel file first!");
      return;
    }

    try {
      setBulkUploading(true);
      const res = await bulkUploadProfessors(bulkFile);
      const totalProcessed = res.totalProcessed ?? 0;
      const inserted = res.inserted ?? res.insertedDetails?.length ?? res.insertedDetails ? res.insertedDetails.length : 0;
      const skipped = res.skipped ?? res.skippedDetails?.length ?? 0;
      const errors = res.errors?.length ?? 0;

      toast.success(`✅ ${inserted} added, ${skipped} skipped, ${errors} errors.`);
      setBulkFile(null);
      await fetchProfessors();
    } catch (err) {
      console.error("Bulk professor upload failed", err);
      const backendMsg = err.response?.data?.error;
      toast.error(backendMsg ? `Bulk upload failed: ${backendMsg}` : "Bulk upload failed");
    } finally {
      setBulkUploading(false);
    }
  };

  // -------- Filtering + searching + sorting --------
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    let list = Array.isArray(professors) ? professors.slice() : [];

    // search by name or username
    if (s) {
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(s) ||
          (p.username || "").toLowerCase().includes(s)
      );
    }

    // startsWith filter
    if (startsWith) {
      if (startsWith === "0-9") {
        list = list.filter((p) => /^\d/.test((p.name || "").trim()));
      } else {
        const letter = startsWith.toLowerCase();
        list = list.filter((p) => (p.name || "").trim().toLowerCase().startsWith(letter));
      }
    }

    // sorting
    list.sort((a, b) => {
      const av = (a[sortBy] || "").toString().toLowerCase();
      const bv = (b[sortBy] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [professors, search, startsWith, sortBy, sortDir]);

  const resetFilters = () => {
    setSearch("");
    setStartsWith("");
    setSortBy("name");
    setSortDir("asc");
  };

  const letters = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "0-9"];

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

  // ===== Bulk delete handler =====
  const handleBulkDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.info("No professors selected.");
      return;
    }

    const ok = await confirm({
      title: `Delete ${ids.length} selected ${ids.length === 1 ? "professor" : "professors"}`,
      message:
        "This will remove the professors and pull them from classes. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    try {
      setBulkDeleting(true);
      const { success, failed } = await batchDeleteProfessorsClient(ids, {
        onProgress: ({ done, total }) => {
          // we don't display progress UI now, but could wire to a toast/progress bar
        },
      });

      if (success.length) {
        toast.success(`🗑️ Deleted ${success.length} ${success.length === 1 ? "professor" : "professors"}.`);
      }
      if (failed.length) {
        toast.error(`⚠️ Failed to delete ${failed.length} item(s).`);
        console.error("Bulk delete failed items:", failed);
      }

      clearSelection();
      await fetchProfessors();
    } catch (err) {
      console.error("Bulk delete error:", err);
      const backendMsg = err?.response?.data?.error;
      toast.error(backendMsg ? `Bulk delete failed: ${backendMsg}` : "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <h1 className="text-3xl font-extrabold text-purple-700 mb-6 flex items-center gap-2">
        👩‍🏫 Manage Professors
      </h1>

      {/* Keep old error banner logic */}
      {error && <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}


      {/* Bulk Upload Professors */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border">
        <h2 className="font-semibold mb-2 text-purple-700">
          📥 Bulk Upload Professors
        </h2>

        {/* Responsive Row */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* File Input */}
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
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
            onClick={() => setShowProfessorHelper((prev) => !prev)}
            className="flex items-center gap-1 text-purple-600 text-sm font-medium hover:underline"
          >
            {showProfessorHelper ? (
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
          {showProfessorHelper && (
            <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-gray-700">
              <p className="mb-1 font-medium text-purple-800">
                📄 Excel File Format Requirements:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  File type must be <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>.
                </li>
                <li>
                  <strong>Required columns:</strong>
                  <ul className="list-disc list-inside ml-5">
                    <li>
                      <code>name</code> – Professor’s full name
                      <br />
                      <span className="text-gray-500 text-xs">
                        Accepted headers: <code>name</code>, <code>professorname</code>, <code>profname</code>
                      </span>
                    </li>
                    <li>
                      <code>username</code> – Unique login ID (must not already exist)
                      <br />
                      <span className="text-gray-500 text-xs">
                        Accepted headers: <code>username</code>, <code>user</code>, <code>login</code>
                      </span>
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Optional column:</strong>
                  <ul className="list-disc list-inside ml-5">
                    <li>
                      <code>password</code> – If provided, that password will be used.
                      <br />
                      <span className="text-gray-500 text-xs">
                        Accepted headers: <code>password</code>, <code>pass</code>
                      </span>
                    </li>
                    <li>
                      If omitted or left blank, the default password will be <code>Temp@1234</code>.
                    </li>
                  </ul>
                </li>
                <li>
                  Column headers are <em>case-insensitive</em> (e.g., <code>Name</code>, <code>USERNAME</code> are valid).
                </li>
                <li>
                  Each row represents one professor. Empty rows are skipped automatically.
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>



      {/* Add Professor Form */}
      <div className="bg-white p-6 rounded-2xl shadow-md mb-8 border">
        <h2 className="text-lg font-semibold text-purple-700 mb-4 flex items-center gap-2">
          <PlusCircle /> Add New Professor
        </h2>
        <form onSubmit={handleAddProfessor} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="👨‍🏫 Professor Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            required
            disabled={adding}
          />
          <input
            type="text"
            placeholder="🔑 Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            required
            disabled={adding}
          />
          <div className="relative">
            <input
              type={showPasswordAdd ? "text" : "password"}
              placeholder="🔒 Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400 w-full"
              required
              disabled={adding}
            />
            <button
              type="button"
              onClick={() => setShowPasswordAdd((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPasswordAdd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            className="md:col-span-3 bg-purple-600 hover:bg-purple-700 transition text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            disabled={adding}
          >
            {adding ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Adding...
              </>
            ) : (
              <>
                <PlusCircle /> Add Professor
              </>
            )}
          </button>
        </form>
      </div>


      {/* Controls: Search + Filters + Sort */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="flex-1 relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search by name or username..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Filters + Sort Controls */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
            {/* Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={18} className="text-purple-600" />
              <select
                value={startsWith}
                onChange={(e) => setStartsWith(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full sm:w-auto"
                title="Filter by first letter of name"
              >
                {letters.map((l, idx) => (
                  <option key={idx} value={l}>
                    {l === "" ? "All" : l}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Field */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full sm:w-auto"
              title="Sort field"
            >
              <option value="name">Sort by Name</option>
              <option value="username">Sort by Username</option>
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
              onClick={resetFilters}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 w-full sm:w-auto"
              title="Reset"
            >
              <RefreshCw size={16} /> Reset
            </button>
          </div>
        </div>

        {/* Showing Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing <span className="font-semibold">{filtered.length}</span> of{" "}
          <span className="font-semibold">{Array.isArray(professors) ? professors.length : 0}</span>{" "}
          professors
        </div>

        {/* Bulk Toolbar */}
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


      {/* Professors List */}
      {loading ? (
        <div className="flex items-center justify-center">
          <Loader2 className="animate-spin text-purple-600" size={32} />
          <span className="ml-2">Loading Professors...</span>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600 text-center">📭 No professors match your filters</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((prof) => {
            const isSelected = selectedIds.has(String(prof._id));
            return (
              <div
                key={prof._id}
                className="relative bg-white shadow-md rounded-xl p-5 border hover:shadow-lg transition"
              >
                {/* selection checkbox top-right */}
                <div className="absolute right-3 top-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${prof.name}`}
                    checked={isSelected}
                    onChange={() => toggleSelectOne(prof._id)}
                  />
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <User className="text-purple-600" size={32} />
                  {editId === prof._id ? (
                    <input
                      value={prof.name}
                      onChange={(e) =>
                        setProfessors((prev) =>
                          prev.map((p) => (p._id === prof._id ? { ...p, name: e.target.value } : p))
                        )
                      }
                      className="px-2 py-1 border rounded w-full"
                      disabled={savingId === prof._id}
                    />
                  ) : (
                    <h3 className="text-lg font-bold text-gray-800 truncate">{prof.name}</h3>
                  )}
                </div>
                <p className="text-gray-600 mb-4 flex items-center gap-2">
                  <BookOpen size={18} className="text-purple-500" />
                  {editId === prof._id ? (
                    <input
                      value={prof.username}
                      onChange={(e) =>
                        setProfessors((prev) =>
                          prev.map((p) =>
                            p._id === prof._id ? { ...p, username: e.target.value } : p
                          )
                        )
                      }
                      className="px-2 py-1 border rounded w-full"
                      disabled={savingId === prof._id}
                    />
                  ) : (
                    <span className="truncate">{prof.username}</span>
                  )}
                </p>

                {/* Extra password field in edit mode */}
                {editId === prof._id && (
                  <div className="relative mb-3">
                    <input
                      type={showPasswordEdits[prof._id] ? "text" : "password"}
                      value={prof.password || ""} // optional, depending on backend response
                      onChange={(e) =>
                        setProfessors((prev) =>
                          prev.map((p) =>
                            p._id === prof._id ? { ...p, password: e.target.value } : p
                          )
                        )
                      }
                      className="px-2 py-1 border rounded w-full"
                      disabled={savingId === prof._id}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswordEdits((prev) => ({
                          ...prev,
                          [prof._id]: !prev[prof._id],
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswordEdits[prof._id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  {editId === prof._id ? (
                    <>
                      <button
                        onClick={() => handleUpdateProfessor(prof._id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2 disabled:opacity-60"
                        disabled={savingId === prof._id}
                      >
                        {savingId === prof._id ? (
                          <>
                            <Loader2 className="animate-spin" size={14} /> Saving...
                          </>
                        ) : (
                          "💾 Save"
                        )}
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded-lg text-sm"
                        disabled={savingId === prof._id}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditLoadingId(prof._id);
                          setTimeout(() => {
                            setEditId(prof._id);
                            setEditLoadingId(null);
                          }, 120);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 disabled:opacity-60"
                        disabled={savingId !== null}
                      >
                        {editLoadingId === prof._id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Edit size={16} />
                        )}
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProfessor(prof._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                        disabled={savingId !== null}
                      >
                        <XCircle size={16} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
