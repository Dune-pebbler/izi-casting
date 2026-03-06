import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, UserPlus, X } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useTenant } from "../../../context/TenantContext";
import { auth } from "../../../firebase";
import Devices from "./Devices";
import FeedList from "./FeedList";
import Settings from "./Settings";
import { toast } from "sonner";

function UsersPanel({ tenantId }) {
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const currentUserEmail = auth.currentUser?.email || "";

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const tenantDocRef = doc(db, "tenants", tenantId);
        const snapshot = await getDoc(tenantDocRef);
        if (snapshot.exists()) {
          setAuthorizedUsers(snapshot.data().authorizedUsers || []);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    loadUsers();
  }, [tenantId]);

  const handleAddUser = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Voer een geldig e-mailadres in");
      return;
    }
    if (authorizedUsers.includes(email)) {
      toast.error("Gebruiker heeft al toegang");
      return;
    }
    setIsAdding(true);
    try {
      const updated = [...authorizedUsers, email];
      await setDoc(doc(db, "tenants", tenantId), { authorizedUsers: updated }, { merge: true });
      setAuthorizedUsers(updated);
      setNewEmail("");
      toast.success(`${email} toegevoegd`);
    } catch (error) {
      toast.error("Fout bij toevoegen: " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveUser = async (email) => {
    if (email === currentUserEmail) {
      toast.error("Je kunt jezelf niet verwijderen");
      return;
    }
    try {
      const updated = authorizedUsers.filter((u) => u !== email);
      await setDoc(doc(db, "tenants", tenantId), { authorizedUsers: updated }, { merge: true });
      setAuthorizedUsers(updated);
      toast.success(`${email} verwijderd`);
    } catch (error) {
      toast.error("Fout bij verwijderen: " + error.message);
    }
  };

  return (
    <div className="sidebar-section">
      <div className="sidebar-users">
        <h3>Gebruikers</h3>
        <ul className="users-list">
          {authorizedUsers.map((email) => (
            <li key={email} className="user-item">
              <span className="user-email">{email}</span>
              {email !== currentUserEmail && (
                <button
                  className="user-remove-btn"
                  onClick={() => handleRemoveUser(email)}
                  title="Verwijderen"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="user-add-form">
          <input
            type="email"
            className="user-email-input"
            placeholder="e-mailadres"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
          />
          <button
            className="btn btn-sm btn-primary"
            onClick={handleAddUser}
            disabled={isAdding}
          >
            <UserPlus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  setDeviceToDelete,
  deleteDevice,
  isCollapsed,
  onToggleCollapse,
  onOpenTrash,
  trashedSlidesCount = 0,
}) {
  const { tenantId } = useTenant();

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <button
        className="sidebar-toggle-btn"
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>
      <div className="sidebar-logo">
        <img
          src="/izicasting-logo.svg"
          alt="iziCasting"
          className="logo-image"
        />
      </div>
      <Devices
        setDeviceToDelete={setDeviceToDelete}
        deleteDevice={deleteDevice}
      />
      <FeedList />
      {tenantId && <UsersPanel tenantId={tenantId} />}
      <Settings
        onOpenTrash={onOpenTrash}
        trashedSlidesCount={trashedSlidesCount}
      />
    </div>
  );
}

export default Sidebar;
