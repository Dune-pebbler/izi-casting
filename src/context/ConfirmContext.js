import React, { createContext, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = ({ title, message, confirmLabel = "Bevestigen", cancelLabel = "Annuleren", danger = false }) =>
    new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ title, message, confirmLabel, cancelLabel, danger });
    });

  const handleConfirm = () => {
    setDialog(null);
    resolveRef.current?.(true);
  };

  const handleCancel = () => {
    setDialog(null);
    resolveRef.current?.(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog &&
        createPortal(
          <div className="slide-delete-modal-wrapper">
            <div className="modal-overlay" onClick={handleCancel}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{dialog.title}</h3>
                  <button onClick={handleCancel} className="modal-close-btn" title="Sluiten">
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <p className="modal-description">{dialog.message}</p>
                  {dialog.danger && (
                    <p className="delete-warning">
                      <AlertTriangle size={14} style={{ display: "inline", marginRight: 4 }} />
                      Deze actie kan niet ongedaan worden gemaakt.
                    </p>
                  )}
                </div>
                <div className="modal-footer">
                  <button onClick={handleCancel} className="btn btn-secondary">
                    {dialog.cancelLabel}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`btn ${dialog.danger ? "btn-danger" : "btn-primary"}`}
                  >
                    {dialog.confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
