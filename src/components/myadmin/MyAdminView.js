import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { ExternalLink, Monitor, LogOut, Users } from "lucide-react";
import { toast } from "sonner";

function normaliseUser(u) {
  if (typeof u === "string") return { email: u, role: "admin" };
  return { email: u.email, role: u.role || "admin" };
}

function TenantUserManager({ tenant }) {
  const [users, setUsers] = useState((tenant.authorizedUsers || []).map(normaliseUser));
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("editor");
  const [isSaving, setIsSaving] = useState(false);

  const save = async (updated) => {
    await setDoc(doc(db, "tenants", tenant.id), { authorizedUsers: updated }, { merge: true });
    setUsers(updated);
  };

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) { toast.error("Voer een geldig e-mailadres in"); return; }
    if (users.some((u) => u.email === email)) { toast.error("Gebruiker heeft al toegang"); return; }
    setIsSaving(true);
    try {
      await save([...users, { email, role: newRole }]);
      setNewEmail("");
      toast.success(`${email} toegevoegd als ${newRole}`);
    } catch (e) {
      toast.error("Fout: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (email) => {
    setIsSaving(true);
    try {
      await save(users.filter((u) => u.email !== email));
      toast.success(`${email} verwijderd`);
    } catch (e) {
      toast.error("Fout: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (email, role) => {
    try {
      await save(users.map((u) => (u.email === email ? { ...u, role } : u)));
    } catch (e) {
      toast.error("Fout: " + e.message);
    }
  };

  return (
    <div className="tenant-card-users">
      <span className="tenant-users-label">
        <Users size={13} />
        Gebruikers
      </span>
      <ul className="users-list">
        {users.map(({ email, role }) => (
          <li key={email} className="user-item">
            <span className="user-email">{email}</span>
            <div className="user-item-actions">
              <select
                className="user-role-select"
                value={role}
                onChange={(e) => handleRoleChange(email, e.target.value)}
                disabled={isSaving}
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
              </select>
              <button className="user-remove-btn" onClick={() => handleRemove(email)} disabled={isSaving}>✕</button>
            </div>
          </li>
        ))}
        {users.length === 0 && <li className="user-empty">Geen gebruikers</li>}
      </ul>
      <div className="user-add-form">
        <input
          type="email"
          className="form-input"
          placeholder="e-mailadres"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <select
          className="user-role-select"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
        >
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={isSaving}>
          Toevoegen
        </button>
      </div>
    </div>
  );
}

function MyAdminView() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const email = auth.currentUser?.email || "";

  useEffect(() => {
    async function loadMyTenants() {
      try {
        const snapshot = await getDocs(collection(db, "tenants"));
        const mine = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => {
            const users = t.authorizedUsers || [];
            return users.some((u) =>
              typeof u === "string" ? u === email : u.email === email
            );
          });
        mine.sort((a, b) => a.name?.localeCompare(b.name));

        setTenants(mine);
      } catch (e) {
        toast.error("Fout bij laden: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    loadMyTenants();
  }, [email]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      toast.error("Fout bij uitloggen");
    }
  };

  function getMyRole(tenant) {
    const users = tenant.authorizedUsers || [];
    const me = users.find((u) =>
      typeof u === "string" ? u === email : u.email === email
    );
    if (!me) return null;
    return typeof me === "string" ? "admin" : me.role || "admin";
  }

  return (
    <div className="superadmin-layout">
      <div className="superadmin-header">
        <div className="superadmin-header-left">
          <img src="/izicasting-logo.svg" alt="iziCasting" className="logo-image" />
          <h1>Mijn omgevingen</h1>
        </div>
        <div className="superadmin-header-right">
          <span className="superadmin-user">{email}</span>
          <button className="btn btn-outline btn-sm" onClick={handleSignOut}>
            <LogOut size={14} />
            Uitloggen
          </button>
        </div>
      </div>

      <div className="superadmin-content">
        {loading ? (
          <div className="loading">Laden...</div>
        ) : tenants.length === 0 ? (
          <div className="superadmin-empty">
            <p>Je hebt geen toegang tot een omgeving.</p>
            <p>Neem contact op met <a href="mailto:info@dunepebbler.nl">info@dunepebbler.nl</a> om toegang te krijgen.</p>
          </div>
        ) : (
          <>
            <div className="superadmin-toolbar">
              <h2>
                <Monitor size={20} />
                Omgevingen ({tenants.length})
              </h2>
            </div>
            <div className="tenant-grid">
              {tenants.map((tenant) => {
                const role = getMyRole(tenant);
                const isAdmin = role === "admin";
                return (
                  <div key={tenant.id} className="tenant-card">
                    <div className="tenant-card-header">
                      <div>
                        <h3 className="tenant-name">{tenant.name}</h3>
                        <p className="tenant-subdomain">izi-casting.com/{tenant.id}</p>
                      </div>
                      <div className="tenant-card-header-actions">
                        {role && (
                          <span className={`role-badge role-badge--${role}`}>{role}</span>
                        )}
                        <a href={`/${tenant.id}/admin`} className="btn btn-primary btn-sm">
                          <ExternalLink size={14} />
                          <span>Open Admin</span>
                        </a>
                      </div>
                    </div>
                    {isAdmin && <TenantUserManager tenant={tenant} />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MyAdminView;
