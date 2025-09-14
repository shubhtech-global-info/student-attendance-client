// src/pages/AssignStudentsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getClasses,
  getStudents,
  assignStudentsToClass,
  removeStudentsFromClass,
  batchRemoveStudentsFromClassClient
} from "../services/api";
import { PlusCircle, XCircle, Search, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useConfirm } from "../components/ConfirmProvider";
import BatchProgress from "../components/BatchProgress";
import Select from "react-select";

export default function AssignStudentsPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]); // for assigning (available)
  const [error, setError] = useState("");

  // loading states
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [assigning, setAssigning] = useState(false); // bulk assign running
  const [removingId, setRemovingId] = useState(null); // single remove in flight
  const [removingBulk, setRemovingBulk] = useState(false); // batch remove in flight

  // Filters / UI state (separated)
  // Available side filters
  const [searchAvailable, setSearchAvailable] = useState("");
  const [startsWith, setStartsWith] = useState("");
  const [semesterAvailable, setSemesterAvailable] = useState("");
  const [divisionAvailable, setDivisionAvailable] = useState("");

  // Assigned side filters
  const [searchAssigned, setSearchAssigned] = useState("");
  const [semesterAssigned, setSemesterAssigned] = useState("");
  // NOTE: assigned-side division filter removed per request

  // Assigned list selection state for batch remove
  const [selectedAssignedIds, setSelectedAssignedIds] = useState([]);

  // batch remove progress
  const [removingProgress, setRemovingProgress] = useState({ done: 0, total: 0 });

  const [showBatchProgress, setShowBatchProgress] = useState(false);

  const confirm = useConfirm();
  const toastIdRef = useRef(null);

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  // Prepare options for react-select
  const classOptions = classes.map((cls) => ({
    value: String(cls._id),
    label: `${cls.classId} - ${cls.className} (${cls.division})`,
  }));

  // react-select expects selected value object
  const selectedOption = selectedClass
    ? classOptions.find((opt) => opt.value === selectedClass)
    : null;

  const normalizeClassesResp = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.classes)) return res.data.classes;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const normalizeStudentsResp = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data?.students)) return res.data.students;
    return [];
  };

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await getClasses();
      setClasses(normalizeClassesResp(res));
    } catch (err) {
      console.error("fetchClasses error", err);
      const backendMsg = err?.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to load classes: ${backendMsg}`
        : "Failed to load classes";
      setError(finalMsg);
      toast.error(finalMsg);

    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await getStudents();
      setStudents(normalizeStudentsResp(res));
    } catch (err) {
      console.error("fetchStudents error", err);
      const backendMsg = err?.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to load students: ${backendMsg}`
        : "Failed to load students";
      setError(finalMsg);
      toast.error(finalMsg);

    } finally {
      setLoadingStudents(false);
    }
  };

  // --- Enrich classes' assigned student entries with master student data ---
  useEffect(() => {
    if (!classes.length || !students.length) return;

    const needsEnrich = classes.some((c) =>
      (c.students || []).some((asgn) => {
        const s = asgn.student ?? asgn;
        return s && (s.division === undefined || s.semester === undefined);
      })
    );

    if (!needsEnrich) return;

    const studentById = new Map(students.map((s) => [String(s._id), s]));
    const studentByEnroll = new Map(students.map((s) => [String(s.enrollmentNumber), s]));

    const merged = classes.map((c) => {
      const mergedStudents = (c.students || []).map((assigned) => {
        const assignedObj = assigned.student ?? assigned;
        const id = String(assignedObj._id ?? assignedObj.id ?? "");
        const enroll = assignedObj.enrollmentNumber ?? assignedObj.enrollment;

        const master =
          (id && studentById.get(id)) || (enroll && studentByEnroll.get(String(enroll))) || null;

        return { ...assignedObj, ...(master || {}) };
      });

      return { ...c, students: mergedStudents };
    });

    setClasses(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.length, students]);

  // ---------------- pagination / show-more state (10 at a time) ----------------
  const PAGE_SIZE = 10;
  const [availableVisibleCount, setAvailableVisibleCount] = useState(PAGE_SIZE);
  const [assignedVisibleCount, setAssignedVisibleCount] = useState(PAGE_SIZE);

  // reset visible counts when filters or selected class change
  useEffect(() => {
    setAvailableVisibleCount(PAGE_SIZE);
  }, [searchAvailable, startsWith, semesterAvailable, divisionAvailable]);

  useEffect(() => {
    setAssignedVisibleCount(PAGE_SIZE);
  }, [searchAssigned, semesterAssigned, selectedClass]); // divisionAssigned removed

  const increaseAvailableVisible = () =>
    setAvailableVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredAvailable.length));

  const reduceAvailableVisible = () => setAvailableVisibleCount(PAGE_SIZE);

  const increaseAssignedVisible = () =>
    setAssignedVisibleCount((prev) => Math.min(prev + PAGE_SIZE, assignedList.length));

  const reduceAssignedVisible = () => setAssignedVisibleCount(PAGE_SIZE);

  // ----------------- handlers for assign/remove -----------------
  const handleAssign = async () => {
    if (!selectedClass || selectedStudents.length === 0) return;
    setAssigning(true);
    try {
      await assignStudentsToClass(selectedClass, selectedStudents);
      toast.success("✅ Students assigned successfully!");
      setSelectedStudents([]);
      setSelectedAssignedIds([]);
      await fetchClasses();
    } catch (err) {
      console.error("handleAssign error", err);
      const backendMsg = err?.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to assign students: ${backendMsg}`
        : "Failed to assign students";
      setError(finalMsg);
      toast.error(finalMsg);

    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (studentId) => {
    const cls = classes.find((c) => String(c._id) === String(selectedClass));
    const student = (cls?.students || []).find((s) => String(s._id) === String(studentId));

    const ok = await confirm({
      title: "Remove Student",
      message: `Are you sure you want to remove "${student?.name || "this student"}" from "${cls?.className || "the class"}"?`,
      confirmText: "Remove",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    setRemovingId(String(studentId));
    try {
      await removeStudentsFromClass(selectedClass, [studentId]);
      toast.success("🗑 Student removed from class");
      setSelectedAssignedIds((prev) => prev.filter((id) => id !== String(studentId)));
      await fetchClasses();
    } catch (err) {
      console.error("handleRemove error", err);
      const backendMsg = err?.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to remove student: ${backendMsg}`
        : "Failed to remove student";
      setError(finalMsg);
      toast.error(finalMsg);

    } finally {
      setRemovingId(null);
    }
  };

  // Batch remove (single-remove fallback) with optimistic update & toast progress
  const handleBatchRemove = async () => {
    if (!selectedClass || selectedAssignedIds.length === 0) return;

    const cls = classes.find((c) => String(c._id) === String(selectedClass));
    if (!cls) return;

    // ✅ Filter: only keep students that still exist in the class
    const validIds = selectedAssignedIds.filter((id) =>
      cls.students?.some((s) => String(s._id) === String(id))
    );

    if (validIds.length === 0) {
      toast.error("⚠️ No valid students left to remove.");
      setSelectedAssignedIds([]);
      return;
    }

    // For confirmation message, show names of the *valid* IDs only
    const names = validIds.map(
      (id) => cls.students.find((s) => String(s._id) === id)?.name || id
    );

    const message =
      names.length <= 10
        ? `You're about to remove these students from "${cls.className || "the class"}":\n\n- ${names.join(
          "\n- "
        )}\n\nThis cannot be undone.`
        : `You're about to remove ${names.length} students from "${cls.className || "the class"
        }". This cannot be undone.`;

    const ok = await confirm({
      title: "Remove Selected Students",
      message,
      confirmText: "Remove",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    // Use BatchProgress style flow
    setRemovingBulk(true);
    setShowBatchProgress(true); // open modal
    setRemovingProgress({ done: 0, total: validIds.length });

    const results = await batchRemoveStudentsFromClassClient(
      selectedClass,
      validIds,
      {
        concurrency: 5,
        onProgress: (p) => setRemovingProgress(p),
      }
    );

    setRemovingBulk(false);
    setSelectedAssignedIds([]);

    if (results.failed.length === 0) {
      toast.success(`🗑 Removed ${results.success.length} students`);
    } else {
      toast.error(
        `⚠️ Removed ${results.success.length}, failed ${results.failed.length}. Please retry.`
      );
    }
    await fetchClasses();
  };


  const findClassById = (id) => classes.find((c) => String(c._id) === String(id));

  // Semester/division options
  const semesterOptions = useMemo(() => {
    const set = new Set(students.map((s) => (s.semester || "").toString()).filter(Boolean));
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [students]);

  const divisionOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.division).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [students]);

  // Filter available students
  const filteredAvailable = useMemo(() => {
    let list = students.slice();
    const s = (searchAvailable || "").trim().toLowerCase();

    if (s) {
      list = list.filter(
        (stu) =>
          (stu.name || "").toLowerCase().includes(s) ||
          (stu.enrollmentNumber || "").toLowerCase().includes(s)
      );
    }

    if (startsWith) {
      if (startsWith === "0-9") {
        list = list.filter((stu) => /^\d/.test((stu.name || stu.enrollmentNumber || "").trim()));
      } else {
        const l = startsWith.toLowerCase();
        list = list.filter(
          (stu) =>
            (stu.name || "").trim().toLowerCase().startsWith(l) ||
            (stu.enrollmentNumber || "").trim().toLowerCase().startsWith(l)
        );
      }
    }

    if (semesterAvailable) {
      list = list.filter((stu) => String(stu.semester || "") === String(semesterAvailable));
    }

    if (divisionAvailable) {
      list = list.filter((stu) => String(stu.division || "") === String(divisionAvailable));
    }

    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list;
  }, [students, searchAvailable, startsWith, semesterAvailable, divisionAvailable]);

  // Assigned list with assigned-side filters (divisionAssigned removed)
  const assignedList = useMemo(() => {
    const cls = findClassById(selectedClass);
    const list = (cls?.students || []).slice();
    const q = (searchAssigned || "").trim().toLowerCase();

    let filtered = list;

    if (semesterAssigned) {
      filtered = filtered.filter((stu) => String(stu.semester || "") === String(semesterAssigned));
    }

    if (!q) return filtered;
    return filtered.filter(
      (stu) =>
        (stu.name || "").toLowerCase().includes(q) ||
        (stu.enrollmentNumber || "").toLowerCase().includes(q)
    );
  }, [classes, selectedClass, searchAssigned, semesterAssigned]);

  const totalCount = students.length;
  const availableCount = filteredAvailable.length;
  const selectedCount = selectedStudents.length;
  const assignedCount = selectedClass ? (findClassById(selectedClass)?.students?.length || 0) : 0;

  // slices to show (move this up!)
  const availableToShow = filteredAvailable.slice(0, availableVisibleCount);
  const assignedToShow = assignedList.slice(0, assignedVisibleCount);

  // 1. Compute visible IDs
  const visibleAvailableIds = useMemo(
    () => availableToShow.map((s) => String(s._id)),
    [availableToShow]
  );
  const areAllVisibleSelected = useMemo(() => {
    if (visibleAvailableIds.length === 0) return false;
    return visibleAvailableIds.every((id) => selectedStudents.includes(id));
  }, [visibleAvailableIds, selectedStudents]);

  const isSomeVisibleSelected = useMemo(() => {
    if (visibleAvailableIds.length === 0) return false;
    return visibleAvailableIds.some((id) => selectedStudents.includes(id));
  }, [visibleAvailableIds, selectedStudents]);

  // 3. Ref for indeterminate state
  const selectVisibleRef = useRef(null);
  useEffect(() => {
    if (selectVisibleRef.current) {
      selectVisibleRef.current.indeterminate =
        isSomeVisibleSelected && !areAllVisibleSelected;
    }
  }, [isSomeVisibleSelected, areAllVisibleSelected]);

  const handleToggleSelectVisible = () => {
    const visibleIds = filteredAvailable.slice(0, availableVisibleCount).map((s) => String(s._id));
    if (visibleIds.length === 0) return;
    if (visibleIds.every((id) => selectedStudents.includes(id))) {
      setSelectedStudents((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedStudents((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectAllByFilter = () => {
    const allFilteredIds = filteredAvailable.map((s) => String(s._id));
    setSelectedStudents((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  // assigned selection helpers
  const assignedVisibleIds = useMemo(
    () => assignedList.slice(0, assignedVisibleCount).map((s) => String(s._id)),
    [assignedList, assignedVisibleCount]
  );

  const areAllAssignedVisibleSelected = useMemo(() => {
    if (assignedVisibleIds.length === 0) return false;
    return assignedVisibleIds.every((id) => selectedAssignedIds.includes(id));
  }, [assignedVisibleIds, selectedAssignedIds]);

  const toggleSelectAssignedVisible = () => {
    if (areAllAssignedVisibleSelected) {
      setSelectedAssignedIds((prev) => prev.filter((id) => !assignedVisibleIds.includes(id)));
    } else {
      setSelectedAssignedIds((prev) => Array.from(new Set([...prev, ...assignedVisibleIds])));
    }
  };

  const selectAllAssignedByFilter = () => {
    const allAssignedIds = assignedList.map((s) => String(s._id));
    setSelectedAssignedIds((prev) => Array.from(new Set([...prev, ...allAssignedIds])));
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2 text-purple-700">
        👨‍🎓 Assign Students to Classes
      </h1>

      {error && (
        <div className="mb-6 flex items-center justify-between bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">
          <span className="flex items-center gap-2">
            <XCircle size={18} />
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-700 hover:text-red-900"
          >
            ✖
          </button>
        </div>
      )}

      {/* Select Class */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md border">
        <label className="font-medium text-gray-700 mb-2 block">📌 Select Class</label>

          <Select
            options={classOptions}
            value={selectedOption}
            onChange={(opt) => {
              setSelectedClass(opt ? opt.value : null);
              setSelectedStudents([]);
              setSelectedAssignedIds([]);
              setAvailableVisibleCount(PAGE_SIZE);
              setAssignedVisibleCount(PAGE_SIZE);
            }}
            isClearable
            isDisabled={loadingClasses || loadingStudents || assigning || removingBulk || removingId !== null}
            isLoading={loadingClasses}
            placeholder={loadingClasses ? "- Loading classes... -" : "- Select or Search a Class -"}
            classNamePrefix="react-select"
          />
      </div>

      {/* Summary box (white) containing the four cards */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md border">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-sm text-gray-600">Overview</div>
            <div className="text-xs text-gray-500">Quick counts</div>
          </div>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded-lg shadow text-sm border flex flex-col">
            <div className="text-xs text-gray-500">Total Students</div>
            <div className="font-semibold text-gray-800">{totalCount}</div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow text-sm border flex flex-col">
            <div className="text-xs text-gray-500">Matching Filters</div>
            <div className="font-semibold text-gray-800">{availableCount}</div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow text-sm border flex flex-col">
            <div className="text-xs text-gray-500">Selected</div>
            <div className="font-semibold text-gray-800">{selectedCount}</div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow text-sm border flex flex-col">
            <div className="text-xs text-gray-500">Assigned to class</div>
            <div className="font-semibold text-gray-800">{assignedCount}</div>
          </div>
        </div>
      </div>


      {/* Selection Panel */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">✅ Select Students</h2>

          {/* Filters (AVAILABLE) */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchAvailable}
                onChange={(e) => setSearchAvailable(e.target.value)}
                className="border pl-9 pr-4 py-2 rounded-xl w-full shadow-sm focus:ring-2 focus:ring-green-400 outline-none"
                disabled={loadingStudents || assigning || removingBulk || removingId !== null}
              />
            </div>

            {/* Semester Filter */}
            <select
              value={semesterAvailable}
              onChange={(e) => setSemesterAvailable(e.target.value)}
              className="border px-3 py-2 rounded-lg flex-1 min-w-[150px]"
              disabled={loadingStudents || assigning || removingBulk || removingId !== null}
            >
              {semesterOptions.map((sem, i) => (
                <option key={i} value={sem}>
                  {sem === "" ? "All Semesters" : `Semester ${sem}`}
                </option>
              ))}
            </select>

            {/* Division Filter */}
            <select
              value={divisionAvailable}
              onChange={(e) => setDivisionAvailable(e.target.value)}
              className="border px-3 py-2 rounded-lg flex-1 min-w-[150px]"
              disabled={loadingStudents || assigning || removingBulk || removingId !== null}
            >
              {divisionOptions.map((div) => (
                <option key={div} value={div}>
                  {div === "" ? "All Divisions" : `Division ${div}`}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchAvailable("");
                setStartsWith("");
                setSemesterAvailable("");
                setDivisionAvailable("");
                setAvailableVisibleCount(PAGE_SIZE);
              }}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm flex-shrink-0"
              disabled={loadingStudents || assigning || removingBulk || removingId !== null}
            >
              Clear filters
            </button>
          </div>

          {/* Available batch-select controls */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4 mb-4">
            <label className="inline-flex items-center gap-2">
              <input
                ref={selectVisibleRef}
                type="checkbox"
                checked={areAllVisibleSelected}
                onChange={handleToggleSelectVisible}
                className="w-4 h-4"
                disabled={assigning || loadingStudents || removingBulk || removingId !== null}
              />
              <span className="text-sm">Select visible (available)</span>
            </label>


            <button
              onClick={handleSelectAllByFilter}
              className="px-3 py-2 bg-green-50 border rounded-lg text-sm hover:bg-green-100"
              disabled={assigning || loadingStudents || removingBulk || removingId !== null}
            >
              Select all available by filter
            </button>

            <button
              onClick={() => setSelectedStudents([])}
              className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              disabled={assigning || loadingStudents || removingBulk || removingId !== null}
            >
              Clear selection
            </button>

            <div className="ml-auto text-sm text-gray-600">
              Selected: <span className="font-semibold">{selectedStudents.length}</span>
            </div>
          </div>

          {/* Assign Button */}
          <div className="mb-4">
            <button
              onClick={handleAssign}
              className="bg-green-600 text-white px-5 py-2 rounded-xl shadow hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedStudents.length === 0 || assigning || removingBulk || removingId !== null}
            >
              <PlusCircle size={18} />
              {assigning ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Assigning ({selectedStudents.length})
                </>
              ) : (
                `Assign Selected Students (${selectedStudents.length})`
              )}
            </button>
          </div>

          {/* Student Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {loadingStudents ? (
              <p className="text-gray-500">⏳ Loading students...</p>
            ) : filteredAvailable.length === 0 ? (
              <p className="text-gray-500">🚫 No students match the filters.</p>
            ) : (
              availableToShow.map((stu) => {
                const sid = String(stu._id);
                const checked = selectedStudents.includes(sid);
                return (
                  <label
                    key={sid}
                    className={`cursor-pointer p-4 rounded-2xl border shadow-md transform transition hover:scale-[1.02] ${checked ? "bg-green-100 border-green-500" : "bg-white hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedStudents((prev) =>
                            prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
                          )
                        }
                        disabled={assigning || removingBulk || removingId !== null}
                      />
                      <div>
                        <p className="font-medium text-gray-800">{stu.name}</p>
                        <p className="text-sm text-gray-500">🆔 {stu.enrollmentNumber}</p>
                        {stu.semester && <p className="text-xs text-gray-400">Sem: {stu.semester}</p>}
                        {stu.division && <p className="text-xs text-gray-400">Div: {stu.division}</p>}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Show more / less */}
          {filteredAvailable.length > PAGE_SIZE && (
            <div className="mt-3 flex justify-center items-center gap-3">
              {availableVisibleCount < filteredAvailable.length ? (
                <button
                  onClick={increaseAvailableVisible}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={assigning || removingBulk || removingId !== null}
                >
                  Show more ({Math.min(PAGE_SIZE, filteredAvailable.length - availableVisibleCount)} more)
                </button>
              ) : (
                <button
                  onClick={reduceAvailableVisible}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={assigning || removingBulk || removingId !== null}
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Already Assigned Students */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-md p-6 border">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">🎓 Assigned Students</h2>

          {/* 🔍 Search + Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search assigned students..."
                value={searchAssigned}
                onChange={(e) => setSearchAssigned(e.target.value)}
                className="border pl-9 pr-4 py-2 rounded-xl w-full shadow-sm focus:ring-2 focus:ring-green-400 outline-none"
                disabled={removingId !== null || assigning || removingBulk}
              />
            </div>

            <select
              value={semesterAssigned}
              onChange={(e) => setSemesterAssigned(e.target.value)}
              className="border px-3 py-2 rounded-lg min-w-[160px]"
              disabled={removingId !== null || assigning || removingBulk}
            >
              {semesterOptions.map((sem, i) => (
                <option key={i} value={sem}>
                  {sem === "" ? "All Semesters" : `Semester ${sem}`}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearchAssigned("");
                setSemesterAssigned("");
                setAssignedVisibleCount(PAGE_SIZE);
              }}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              disabled={removingId !== null || assigning || removingBulk}
            >
              Clear filters
            </button>
          </div>

          {/* ✅ Batch Selection Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap mb-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={areAllAssignedVisibleSelected}
                onChange={toggleSelectAssignedVisible}
                className="w-4 h-4"
                disabled={removingId !== null || assigning || removingBulk}
              />
              <span className="text-sm">Select visible (assigned)</span>
            </label>

            <button
              onClick={selectAllAssignedByFilter}
              className="px-3 py-2 bg-red-50 border rounded-lg text-sm hover:bg-red-100"
              disabled={removingId !== null || assigning || removingBulk}
            >
              Select all assigned by filter
            </button>

            <button
              onClick={() => setSelectedAssignedIds([])}
              className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              disabled={removingId !== null || assigning || removingBulk}
            >
              Clear selection
            </button>

            <div className="sm:ml-auto text-sm text-gray-600">
              Selected: <span className="font-semibold">{selectedAssignedIds.length}</span>
            </div>
          </div>

          {/* 🚫 Batch Remove Button */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={handleBatchRemove}
              className="bg-red-600 text-white px-4 py-2 rounded-xl shadow hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedAssignedIds.length === 0 || removingBulk || assigning || removingId !== null}
            >
              {removingBulk ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Removing ({removingProgress.done}/{removingProgress.total})
                </>
              ) : (
                <>
                  <XCircle size={16} /> Remove Selected ({selectedAssignedIds.length})
                </>
              )}
            </button>
          </div>

          <br />

          {/* 🧑‍🎓 Assigned Students List */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {assignedToShow.length === 0 ? (
              <p className="text-gray-500">🚫 No students assigned (or none match search/filters).</p>
            ) : (
              assignedToShow.map((stu) => {
                const idStr = String(stu._id);
                const removing = removingId === idStr;
                const checked = selectedAssignedIds.includes(idStr);

                return (
                  <li
                    key={idStr}
                    className="flex flex-col justify-between p-4 rounded-2xl border shadow-md bg-white transform transition hover:scale-[1.02] hover:bg-gray-50"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedAssignedIds((prev) =>
                            prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
                          )
                        }
                        disabled={removing || assigning || removingBulk}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{stu.name}</p>
                        <p className="text-sm text-gray-500">🆔 {stu.enrollmentNumber}</p>
                        <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-3">
                          <span className="px-2 py-0.5 bg-purple-50 rounded">
                            {stu.semester ? `Sem: ${stu.semester}` : "Sem: -"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => handleRemove(idStr)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={removing || assigning || removingBulk}
                      >
                        <XCircle size={16} />{" "}
                        {removing ? (
                          <>
                            <Loader2 className="animate-spin" size={14} /> Removing
                          </>
                        ) : (
                          "Remove"
                        )}
                      </button>
                      <div className="text-xs text-gray-500"></div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {/* 📌 Show more / less */}
          {assignedList.length > PAGE_SIZE && (
            <div className="mt-3 flex justify-center items-center gap-3">
              {assignedVisibleCount < assignedList.length ? (
                <button
                  onClick={increaseAssignedVisible}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={assigning || removingId !== null || removingBulk}
                >
                  Show more ({Math.min(PAGE_SIZE, assignedList.length - assignedVisibleCount)} more)
                </button>
              ) : (
                <button
                  onClick={reduceAssignedVisible}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={assigning || removingId !== null || removingBulk}
                >
                  Show less
                </button>
              )}
            </div>
          )}

          {!findClassById(selectedClass)?.students?.length && (
            <p className="text-gray-500 text-center mt-4">🚫 No students assigned yet</p>
          )}
        </div>
      )}

      <BatchProgress
        open={showBatchProgress}
        done={removingProgress.done}
        total={removingProgress.total}
        onClose={() => {
          setShowBatchProgress(false);
        }}
      />

    </div>
  );
}
