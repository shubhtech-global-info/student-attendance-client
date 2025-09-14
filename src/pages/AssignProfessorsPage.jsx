// src/pages/AssignProfessorsPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getClasses,
  getProfessors,
  assignProfessorsToClass,
  removeProfessorsFromClass,
} from "../services/api";
import { PlusCircle, XCircle, Search, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useConfirm } from "../components/ConfirmProvider";
import Select from "react-select";

export default function AssignProfessorsPage() {
  const [classes, setClasses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null); // will store _id string
  const [selectedProfs, setSelectedProfs] = useState([]); // array of _id strings
  const [error, setError] = useState("");
  const [searchAvailable, setSearchAvailable] = useState("");
  const [searchAssigned, setSearchAssigned] = useState("");
  const [startsWith, setStartsWith] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);

  // UX loading states
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState(null); // id of professor being removed
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [removingBulk, setRemovingBulk] = useState(false);

    // --- new pagination states ---
  const PAGE_SIZE = 10;
  const [availableVisibleCount, setAvailableVisibleCount] = useState(PAGE_SIZE);
  const [assignedVisibleCount, setAssignedVisibleCount] = useState(PAGE_SIZE);

  // --- state you need ---
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedAssignedIds, setSelectedAssignedIds] = useState([]);


  const confirm = useConfirm();

  useEffect(() => {
    fetchClasses();
    fetchProfessors();
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


  // Accept either an array or axios-like response
  const normalizeClassesResp = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.classes)) return res.data.classes;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const normalizeProfessorsResp = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.professors)) return res.data.professors;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const res = await getClasses();
      const list = normalizeClassesResp(res);
      setClasses(list);
    } catch (err) {
      console.error("fetchClasses error", err);
      setError("⚠️ Failed to load classes");
      toast.error("⚠️ Failed to load classes");
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchProfessors = async () => {
    try {
      const res = await getProfessors();
      const list = normalizeProfessorsResp(res);
      setProfessors(list);
    } catch (err) {
      console.error("fetchProfessors error", err);
      setError("⚠️ Failed to load professors");
      toast.error("⚠️ Failed to load professors");
    }
  };

  const handleAssign = async () => {
    if (!selectedClass || selectedProfs.length === 0) return;
    setAssigning(true);
    try {
      await assignProfessorsToClass(selectedClass, selectedProfs);
      toast.success("✅ Professors assigned successfully!");
      setSelectedProfs([]);
      await fetchClasses(); // refresh classes to show assigned professors (populated)
    } catch (err) {
      console.error("handleAssign error", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to assign professors: ${backendMsg}`
        : "Failed to assign professors";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (profId) => {
    const cls = classes.find((c) => String(c._id) === String(selectedClass));
    const prof = (cls?.professors || []).find((p) => String(p._id) === String(profId));

    const ok = await confirm({
      title: "Remove Professor",
      message: `Are you sure you want to remove "${prof?.name || "this professor"}" from "${cls?.className || "the class"}"?`,
      confirmText: "Remove",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    setRemovingId(String(profId));
    try {
      await removeProfessorsFromClass(selectedClass, [profId]);
      toast.success("🗑 Professor removed from class");
      // refresh authoritative state
      await fetchClasses();
    } catch (err) {
      console.error("handleRemove error", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to remove professor: ${backendMsg}`
        : "Failed to remove professor";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setRemovingId(null);
    }
  };

  // helper to find class by id string robustly
  const findClassById = (id) => classes.find((c) => String(c._id) === String(id));

  // Available professors (all professors; no "assigned" flag on professor itself)
  const availableProfessors = useMemo(() => professors.slice(), [professors]);

  // filtered list based on search + startsWith
  const filteredAvailable = useMemo(() => {
    let list = professors.slice();
    const s = (searchAvailable || "").trim().toLowerCase();

    if (s) {
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(s) ||
          (p.username || "").toLowerCase().includes(s)
      );
    }

    if (startsWith) {
      if (startsWith === "0-9") {
        list = list.filter((p) => /^\d/.test((p.name || p.username || "").trim()));
      } else {
        const l = startsWith.toLowerCase();
        list = list.filter(
          (p) =>
            (p.name || "").trim().toLowerCase().startsWith(l) ||
            (p.username || "").trim().toLowerCase().startsWith(l)
        );
      }
    }

    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list;
  }, [professors, searchAvailable, startsWith]);

  // counts
  const totalCount = professors.length;
  const selectedCount = selectedProfs.length;
  const assignedCount = selectedClass ? (findClassById(selectedClass)?.professors?.length || 0) : 0;

  // when switching class, clear selected professors to avoid accidental assign
  const handleClassChange = (opt) => {
    setSelectedClass(opt ? opt.value : null);
    setSelectedProfs([]);
    setSelectedStudents([]);
    setSelectedAssignedIds([]);
    setAvailableVisibleCount(PAGE_SIZE);
    setAssignedVisibleCount(PAGE_SIZE);
    setSearchAssigned("");
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2 text-purple-700">
        👩‍🏫 Assign Professors to Classes
      </h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-xl shadow mb-6">
          {error}
        </div>
      )}

      {/* Select Class */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md border">
        <label className="font-medium text-gray-700 mb-2 block">📌 Select Class</label>
        <Select
          options={classOptions}
          value={selectedOption}
          onChange={handleClassChange}
          isClearable
          isDisabled={loadingClasses || loadingStudents || assigning || removingBulk || removingId !== null}
          isLoading={loadingClasses}
          placeholder={loadingClasses ? "- Loading classes... -" : "- Select or Search a Class -"}
          classNamePrefix="react-select"
        />
      </div>

      {/* Summary box (white) containing professor counts */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md border">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-sm text-gray-600">Overview</div>
            <div className="text-xs text-gray-500">Professor counts</div>
          </div>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-lg shadow text-sm border flex flex-col">
            <div className="text-xs text-gray-500">Total Professors</div>
            <div className="font-semibold text-gray-800">{totalCount}</div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow text-sm border flex flex-col">
            <div className="text-xs text-gray-500">Selected</div>
            <div className="font-semibold text-gray-800">{selectedCount}</div>
          </div>

          {selectedClass && (
            <div className="bg-white p-3 rounded-lg shadow text-sm border flex flex-col">
              <div className="text-xs text-gray-500">Assigned to selected class</div>
              <div className="font-semibold text-gray-800">{assignedCount}</div>
            </div>
          )}
        </div>
      </div>


      {/* Professors Selection */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">✅ Select Professors</h2>

          {/* Filters row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search professors..."
                className="border pl-10 pr-4 py-2 rounded-xl w-full shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
                value={searchAvailable}
                onChange={(e) => setSearchAvailable(e.target.value)}
                disabled={assigning || removingId !== null}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredAvailable.length === 0 ? (
              <p className="text-gray-500">🚫 No professors found</p>
            ) : (
              filteredAvailable.slice(0, visibleCount).map((prof) => {
                const profIdStr = String(prof._id);
                const checked = selectedProfs.includes(profIdStr);
                return (
                  <label
                    key={profIdStr}
                    className={`border rounded-xl px-4 py-3 cursor-pointer flex items-center gap-2 shadow-sm transition ${checked ? "bg-purple-100 border-purple-500" : "hover:bg-gray-50"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedProfs((prev) =>
                          prev.includes(profIdStr)
                            ? prev.filter((id) => id !== profIdStr)
                            : [...prev, profIdStr]
                        )
                      }
                      disabled={assigning || removingId !== null}
                    />
                    <span className="font-medium text-gray-700">{prof.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{prof.username}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Show More / Show Less button */}
          {filteredAvailable.length > visibleCount && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setVisibleCount((prev) => prev + 5)}
                className="text-purple-600 font-medium hover:underline"
              >
                Show More
              </button>
            </div>
          )}

          {visibleCount > 5 && visibleCount >= filteredAvailable.length && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setVisibleCount(5)}
                className="text-purple-600 font-medium hover:underline"
              >
                Show Less
              </button>
            </div>
          )}


          <button
            onClick={handleAssign}
            className="mt-6 bg-purple-600 text-white px-5 py-2 rounded-xl shadow hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={selectedProfs.length === 0 || assigning || removingId !== null}
          >
            {assigning ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Assigning ({selectedProfs.length})
              </>
            ) : (
              <>
                <PlusCircle size={18} /> Assign Selected Professors ({selectedProfs.length})
              </>
            )}
          </button>
        </div>
      )}

      {/* Already Assigned Professors */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-md p-6 border">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">🎓 Assigned Professors</h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search assigned professors..."
              className="border pl-10 pr-4 py-2 rounded-xl w-full shadow-sm"
              value={searchAssigned}
              onChange={(e) => setSearchAssigned(e.target.value)}
              disabled={assigning || removingId !== null}
            />
          </div>

          <ul className="space-y-3">
            {findClassById(selectedClass)
              ?.professors
              ?.filter((prof) => (prof.name || "").toLowerCase().includes(searchAssigned.toLowerCase()))
              .map((prof) => {
                const idStr = String(prof._id);
                const removing = removingId === idStr;
                return (
                  <li
                    key={idStr}
                    className="flex justify-between items-center border p-3 rounded-xl shadow-sm hover:bg-gray-50 transition"
                  >
                    <p className="font-medium text-gray-800">{prof.name}</p>
                    <button
                      onClick={() => handleRemove(String(prof._id))}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={assigning || removingId !== null}
                    >
                      {removing ? (
                        <>
                          <Loader2 className="animate-spin" size={14} /> Removing
                        </>
                      ) : (
                        <>
                          <XCircle size={16} /> Remove
                        </>
                      )}
                    </button>
                  </li>
                );
              })}

            {(!findClassById(selectedClass)?.professors?.length) && (
              <p className="text-gray-500 text-center">🚫 No professors assigned yet</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
