import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  UserPlus,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  UserSearch,
  ShieldCheck,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useTenant } from "../../../context/TenantContext";
import { auth } from "../../../firebase";
import Devices from "./Devices";
import FeedList from "./FeedList";
import AudioSettings from "./AudioSettings";
import SlideArchive from "./SlideArchive";
import Settings from "./Settings";
import { useTenantModules } from "../../../hooks/useTenantModules";
import { toast } from "sonner";

// Normalise a raw authorizedUsers entry to { email, role }
function normaliseUser(u) {
  if (typeof u === "string") return { email: u, role: "admin" };
  return { email: u.email, role: u.role || "admin" };
}

function UsersPanel({ tenantId }) {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("editor");
  const [isAdding, setIsAdding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const currentUserEmail = auth.currentUser?.email || "";

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await getDoc(doc(db, "tenants", tenantId));
        if (snapshot.exists()) {
          setUsers((snapshot.data().authorizedUsers || []).map(normaliseUser));
        }
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    load();
  }, [tenantId]);

  const save = async (updated) => {
    await setDoc(
      doc(db, "tenants", tenantId),
      { authorizedUsers: updated },
      { merge: true },
    );
    setUsers(updated);
  };

  const handleAddUser = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Voer een geldig e-mailadres in");
      return;
    }
    if (users.some((u) => u.email === email)) {
      toast.error("Gebruiker heeft al toegang");
      return;
    }
    setIsAdding(true);
    try {
      await save([...users, { email, role: newRole }]);
      setNewEmail("");
      toast.success(`${email} toegevoegd als ${newRole}`);
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
      await save(users.filter((u) => u.email !== email));
      toast.success(`${email} verwijderd`);
    } catch (error) {
      toast.error("Fout bij verwijderen: " + error.message);
    }
  };

  const handleRoleChange = async (email, role) => {
    try {
      await save(users.map((u) => (u.email === email ? { ...u, role } : u)));
    } catch (error) {
      toast.error("Fout bij opslaan: " + error.message);
    }
  };

  return (
    <div className="sidebar-section">
      <div className="sidebar-users">
        <button
          className="settings-toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="settings-toggle-left">
            <Users size={16} />
            <span>Gebruikers ({users.length})</span>
          </div>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className={`collapsible-wrapper${isExpanded ? " expanded" : ""}`}>
          <div className="users-collapse-inner">
            <ul className="users-list">
              {users.map(({ email, role }) => (
                <li key={email} className="user-item">
                  <span className="user-email">{email}</span>
                  <div className="user-item-actions">
                    <select
                      className="user-role-select"
                      value={role}
                      onChange={(e) => handleRoleChange(email, e.target.value)}
                      disabled={email === currentUserEmail}
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                    </select>
                    <div style={{ width: "24px" }}>
                      {email !== currentUserEmail && (
                        <button
                          className="user-remove-btn"
                          onClick={() => handleRemoveUser(email)}
                          title="Verwijderen"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="user-add-form mt-2">
              <input
                type="email"
                className="user-email-input"
                placeholder="e-mailadres"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
              />
              <select
                className="user-role-select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
              </select>
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
  tenantName = "",
}) {
  const { tenantId } = useTenant();
  const { modules } = useTenantModules();
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  useEffect(() => {
    if (!tenantId) {
      setIsAdmin(true);
      return;
    }
    const email = auth.currentUser?.email || "";
    if (email.endsWith("@dunepebbler.nl")) {
      setIsAdmin(true);
    }
    getDoc(doc(db, "tenants", tenantId)).then((snap) => {
      if (!snap.exists()) return;
      const users = (snap.data().authorizedUsers || []).map(normaliseUser);
      const me = users.find((u) => u.email === email);
      setIsAdmin(!me || me.role === "admin");
    });
    getDoc(doc(db, "tenants", tenantId, "display", "settings")).then((snap) => {
      if (snap.exists()) setLogoUrl(snap.data()?.logoUrl || "");
    });
  }, [tenantId]);

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <button
        className="sidebar-toggle-btn"
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>
      <div className="sidebar-scroll-area">
        <div className="sidebar-logo">
          <img
            src="/izicasting-logo.svg"
            alt="iziCasting"
            className="logo-image"
          />
          {tenantName && <h2 className="sidebar-tenant-name">{tenantName}</h2>}
        </div>
        <Devices
          setDeviceToDelete={setDeviceToDelete}
          deleteDevice={deleteDevice}
          isAdmin={isAdmin}
        />
        <FeedList />
        {tenantId && isAdmin && <UsersPanel tenantId={tenantId} />}
        {modules.backgroundMusic && <AudioSettings />}
        {isAdmin && (
          <Settings
            onOpenTrash={onOpenTrash}
            trashedSlidesCount={trashedSlidesCount}
          />
        )}
        {trashedSlidesCount > 0 && (
          <SlideArchive
            onOpenTrash={onOpenTrash}
            trashedSlidesCount={trashedSlidesCount}
          />
        )}
      </div>
      <div className="sidebar__footer">
        {isAdmin && (
          <button
            className="sidebar__footer-btn"
            onClick={() => setPrivacyOpen(true)}
          >
            <ShieldCheck size={15} />
            <span>Privacyverklaring</span>
          </button>
        )}
        <a
          className="sidebar__footer-btn"
          href="https://www.dunepebbler.nl/contact"
          target="_blank"
          rel="noopener noreferrer"
        >
          <UserSearch size={15} />
          <span>Contact</span>
        </a>
      </div>

      {privacyOpen &&
        createPortal(
          <div
            className="sidebar__privacy-overlay"
            onClick={() => setPrivacyOpen(false)}
          >
            <div
              className="sidebar__privacy-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sidebar__privacy-header">
                <h2>Privacyverklaring</h2>
                <button onClick={() => setPrivacyOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="sidebar__privacy-body">
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </p>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse
                  cillum dolore eu fugiat nulla pariatur. Excepteur sint
                  occaecat cupidatat non proident, sunt in culpa qui officia
                  deserunt mollit anim id est laborum.
                </p>
                <p>
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                  accusantium doloremque laudantium, totam rem aperiam, eaque
                  ipsa quae ab illo inventore veritatis et quasi architecto
                  beatae vitae dicta sunt explicabo.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default Sidebar;
