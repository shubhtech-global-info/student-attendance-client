import React, { useEffect, useState } from "react";

/**
 * BatchUpdateModal (semester + division only)
 * Props:
 * - open (bool)
 * - onClose()  -> called when cancelled or modal closed
 * - onSubmit(updates) -> called with updates object when user clicks Apply
 *
 * Only semester and division are allowed here.
 */
export default function BatchUpdateModal({ open, onClose, onSubmit }) {
  const [semester, setSemester] = useState("");
  const [division, setDivision] = useState("");

  useEffect(() => {
    if (open) {
      setSemester("");
      setDivision("");
    }
  }, [open]);

  if (!open) return null;

  const buildUpdates = () => {
    const u = {};
    if (semester !== "") u.semester = Number(semester);
    if (division !== "") u.division = division;
    return u;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose()} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Batch Update Students</h3>
        <p className="text-sm text-gray-600 mb-4">
          Only Semester and Division will be updated for the selected students. Leave a field empty to skip it.
        </p>

        <div className="grid gap-3">
          <label className="flex flex-col">
            <span className="text-sm text-gray-700">Semester</span>
            <input
              type="number"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="border p-2 rounded mt-1"
              placeholder="Leave blank to skip"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-700">Division</span>
            <input
              type="text"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="border p-2 rounded mt-1"
              placeholder="Leave blank to skip"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            onClick={() => onClose()}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              const updates = buildUpdates();
              if (Object.keys(updates).length === 0) {
                // nothing to update — just close
                onClose();
                return;
              }
              onSubmit(updates);
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
