import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Usage:
 * const confirm = useConfirm();
 * const ok = await confirm({ title, message, confirmText, cancelText, tone });
 */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef(() => {});
  const [options, setOptions] = useState({
    title: "Are you sure?",
    message: "This action cannot be undone.",
    confirmText: "Confirm",
    cancelText: "Cancel",
    tone: "default", // "default" | "danger"
  });

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setOptions((prev) => ({ ...prev, ...opts }));
      resolverRef.current = resolve;
      setOpen(true);
    });
  }, []);

  const handleClose = useCallback((result) => {
    setOpen(false);
    resolverRef.current?.(result);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => handleClose(false)}
            />
            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-3 rounded-2xl bg-white shadow-xl border">
              <div className="p-5">
                <h3 className="text-lg font-semibold">
                  {options.title || "Confirm"}
                </h3>
                <p className="mt-2 text-gray-600">
                  {options.message || "Are you sure you want to continue?"}
                </p>
              </div>
              <div className="px-5 pb-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 rounded-xl border hover:bg-gray-50"
                >
                  {options.cancelText || "Cancel"}
                </button>
                <button
                  onClick={() => handleClose(true)}
                  className={`px-4 py-2 rounded-xl text-white ${
                    options.tone === "danger"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {options.confirmText || "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx.confirm;
}
