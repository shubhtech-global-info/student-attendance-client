import React from "react";

export default function BatchProgress({ open, done, total, onClose }) {
  if (!open) return null;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg">
        <h4 className="font-semibold mb-2">Updating students…</h4>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 bg-blue-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {done} / {total} completed ({pct}%)
        </p>
        <div className="mt-4 flex justify-end">
          <button
            className="px-3 py-1 border rounded-lg hover:bg-gray-50"
            onClick={onClose}
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  );
}
