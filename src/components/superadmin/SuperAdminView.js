import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";
import { db, auth, storage } from "../../firebase";
import { signOut } from "firebase/auth";
import {
  Plus,
  ExternalLink,
  Users,
  Monitor,
  LogOut,
  Pencil,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  RotateCcw,
} from "lucide-react";
import CreateTenantModal from "./CreateTenantModal";
import EditTenantModal from "./EditTenantModal";
import { toast } from "sonner";
import { useConfirm } from "../../context/ConfirmContext";

function normaliseUser(u) {
  if (typeof u === "string") return { email: u, role: "admin" };
  return { email: u.email, role: u.role || "admin" };
}

async function permanentDeleteTenant(tenantId) {
  // Delete tenant subcollections
  const subcollections = ["trash", "mediaLibrary", "devices", "feeds"];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, "tenants", tenantId, sub));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  for (const displayDoc of ["settings", "content"]) {
    await deleteDoc(doc(db, "tenants", tenantId, "display", displayDoc)).catch(
      () => {},
    );
  }

  // Delete global devices linked to this tenant + their command queues
  const devicesSnap = await getDocs(
    query(collection(db, "devices"), where("tenantId", "==", tenantId)),
  );
  await Promise.all(
    devicesSnap.docs.map((d) =>
      Promise.all([
        deleteDoc(d.ref),
        deleteDoc(doc(db, "device_commands", d.id)).catch(() => {}),
      ]),
    ),
  );

  // Delete storage files
  try {
    const storageRef = ref(storage, `tenants/${tenantId}`);
    const listed = await listAll(storageRef);
    await Promise.all([
      ...listed.items.map((item) => deleteObject(item)),
      ...listed.prefixes.map(async (prefix) => {
        const nested = await listAll(prefix);
        return Promise.all(nested.items.map((item) => deleteObject(item)));
      }),
    ]);
  } catch {
    // Storage folder may not exist
  }

  await deleteDoc(doc(db, "tenants", tenantId));
}

function TenantCard({ tenant, onEdit }) {
  const baseUrl = process.env.REACT_APP_BASE_URL || "https://izi-casting.com";
  const url = `${baseUrl}/${tenant.id}`;
  const isDeleted = !!tenant.deletedAt;
  const [users, setUsers] = useState(
    (tenant.authorizedUsers || []).map(normaliseUser),
  );
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("editor");
  const [isSaving, setIsSaving] = useState(false);
  const [isUsersExpanded, setIsUsersExpanded] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const confirm = useConfirm();

  useEffect(() => {
    getDoc(doc(db, "tenants", tenant.id, "display", "settings")).then(
      (snap) => {
        if (snap.exists()) setLogoUrl(snap.data()?.logoUrl || "");
      },
    );
  }, [tenant.id]);

  const save = async (updated) => {
    await setDoc(
      doc(db, "tenants", tenant.id),
      { authorizedUsers: updated },
      { merge: true },
    );
    setUsers(updated);
  };

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Voer een geldig e-mailadres in");
      return;
    }
    if (users.some((u) => u.email === email)) {
      toast.error("Gebruiker heeft al toegang");
      return;
    }
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

  const handleSoftDelete = async () => {
    const ok = await confirm({
      title: "Omgeving verwijderen",
      message: `Weet je zeker dat je "${tenant.name}" wilt verwijderen?`,
      confirmLabel: "Verwijderen",
      danger: true,
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, "tenants", tenant.id), {
        deletedAt: new Date().toISOString(),
      });
      toast.success(`${tenant.name} verwijderd`);
    } catch (e) {
      toast.error("Fout: " + e.message);
    }
  };

  const handleRestore = async () => {
    const ok = await confirm({
      title: "Omgeving herstellen",
      message: `Weet je zeker dat je "${tenant.name}" wilt herstellen?`,
      confirmLabel: "Herstellen",
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, "tenants", tenant.id), { deletedAt: null });
      toast.success(`${tenant.name} hersteld`);
    } catch (e) {
      toast.error("Fout: " + e.message);
    }
  };

  const handlePermanentDelete = async () => {
    const ok = await confirm({
      title: "Permanent verwijderen",
      message: `Weet je zeker dat je "${tenant.name}" permanent wilt verwijderen? Alle data en bestanden worden verwijderd.`,
      confirmLabel: "Permanent verwijderen",
      danger: true,
    });
    if (!ok) return;
    setIsSaving(true);
    try {
      await permanentDeleteTenant(tenant.id);
      toast.success(`${tenant.name} permanent verwijderd`);
    } catch (e) {
      toast.error("Fout: " + e.message);
      setIsSaving(false);
    }
  };

  return (
    <div className={`tenant-card${isDeleted ? " tenant-card--deleted" : ""}`}>
      <div className="tenant-card-header">
        <div className="tenant-card-header-info">
          <div>
            <h3 className="tenant-name">{tenant.name}</h3>
            <p className="tenant-subdomain">izi-casting.com/{tenant.id}</p>
          </div>
          {logoUrl && (
            <img src={logoUrl} alt={tenant.name} className="tenant-card-logo" />
          )}
        </div>
        <div className="tenant-card-header-actions">
          {isDeleted ? (
            <>
              <button
                className="btn btn-sm btn-outline"
                title="Herstellen"
                onClick={handleRestore}
                disabled={isSaving}
              >
                <RotateCcw size={14} />
                <span>Herstellen</span>
              </button>
              <button
                className="btn btn-sm btn-danger"
                title="Permanent verwijderen"
                onClick={handlePermanentDelete}
                disabled={isSaving}
              >
                <Trash2 size={14} />
                <span>Permanent</span>
              </button>
            </>
          ) : (
            <>
              <div className="tenant-card-header-actions-left">
                <button
                  className="btn btn-sm btn-outline"
                  title="Bewerken"
                  onClick={() => onEdit(tenant)}
                >
                  <Pencil size={14} />
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-primary"
                  title="Open admin"
                >
                  <ExternalLink size={14} />
                  <span>Open Admin</span>
                </a>
              </div>
              <button
                className="btn btn-sm btn-outline btn-icon-only"
                title="Verwijderen"
                onClick={handleSoftDelete}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tenant-card-users">
        <button
          className="tenant-users-toggle"
          onClick={() => setIsUsersExpanded(!isUsersExpanded)}
        >
          <div className="tenant-users-toggle-left">
            <Users size={13} />
            <span>Gebruikers ({users.length})</span>
          </div>
          {isUsersExpanded ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>
        <div
          className={`collapsible-wrapper${isUsersExpanded ? " expanded" : ""}`}
        >
          <div className="tenant-users-collapse-inner">
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
                    <button
                      className="user-remove-btn"
                      onClick={() => handleRemove(email)}
                      disabled={isSaving}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
              {users.length === 0 && (
                <li className="user-empty">Geen gebruikers</li>
              )}
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
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAdd}
                disabled={isSaving}
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuperAdminUsersPanel() {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const currentEmail = auth.currentUser?.email || "";

  useEffect(() => {
    getDoc(doc(db, "config", "superadmin")).then((d) => {
      setUsers(d.data()?.authorizedUsers || []);
    });
  }, []);

  const save = async (updated) => {
    await setDoc(
      doc(db, "config", "superadmin"),
      { authorizedUsers: updated },
      { merge: true },
    );
    setUsers(updated);
  };

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Voer een geldig e-mailadres in");
      return;
    }
    if (users.includes(email)) {
      toast.error("Gebruiker heeft al toegang");
      return;
    }
    setIsSaving(true);
    try {
      await save([...users, email]);
      setNewEmail("");
      toast.success(`${email} toegevoegd`);
    } catch (error) {
      toast.error("Fout: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (email) => {
    if (email === currentEmail) {
      toast.error("Je kunt jezelf niet verwijderen");
      return;
    }
    setIsSaving(true);
    try {
      await save(users.filter((u) => u !== email));
      toast.success(`${email} verwijderd`);
    } catch (error) {
      toast.error("Fout: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="superadmin-users-section">
      <h2 className="superadmin-sidebar-title">
        <ShieldCheck size={16} />
        Super Admin gebruikers
      </h2>
      <div className="user-management-panel">
        <ul className="users-list">
          {users.map((email) => (
            <li key={email} className="user-item">
              <span className="user-email">{email}</span>
              {email !== currentEmail && (
                <button
                  className="user-remove-btn"
                  onClick={() => handleRemove(email)}
                  disabled={isSaving}
                  title="Verwijderen"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
          {users.length === 0 && (
            <li className="user-empty">Geen extra gebruikers</li>
          )}
        </ul>
        <div className="user-add-form">
          <input
            type="email"
            className="form-input"
            placeholder="e-mailadres toevoegen"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAdd}
            disabled={isSaving}
          >
            Toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}

function SuperAdminView() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTenantSettings, setEditingTenantSettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tenants"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.name?.localeCompare(b.name));
      setTenants(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      toast.error("Fout bij uitloggen");
    }
  };

  return (
    <div className="superadmin-layout">
      <div className="superadmin-header">
        <div className="superadmin-header-left">
          <img
            src="/izicasting-logo.svg"
            alt="iziCasting"
            className="logo-image"
          />
          <h1>Super Admin</h1>
        </div>
        <div className="superadmin-header-right">
          <span className="superadmin-user">{auth.currentUser?.email}</span>
          <button className="btn btn-outline btn-sm" onClick={handleSignOut}>
            <LogOut size={14} />
            Uitloggen
          </button>
        </div>
      </div>

      <div className="superadmin-body">
        <div className="superadmin-content">
          <div className="superadmin-toolbar">
            <h2>
              <Monitor size={20} />
              Omgevingen (
              {
                tenants.filter((tenant) =>
                  tenant.name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()),
                ).length
              }
              )
            </h2>
            <div className="superadmin-toolbar-right">
              <input
                type="text"
                className="form-input search-desktop"
                placeholder="Zoek omgeving..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} />
                Nieuwe omgeving
              </button>
            </div>
          </div>

          <input
            type="text"
            className="form-input search-mobile"
            placeholder="Zoek omgeving..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {loading ? (
            <div className="loading">Tenants laden...</div>
          ) : tenants.length === 0 ? (
            <div className="superadmin-empty">
              <p>Nog geen omgevingen aangemaakt.</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} />
                Eerste omgeving aanmaken
              </button>
            </div>
          ) : (
            (() => {
              const filtered = tenants.filter((tenant) =>
                tenant.name?.toLowerCase().includes(searchQuery.toLowerCase()),
              );
              return filtered.length === 0 ? (
                <div className="superadmin-empty">
                  <p>Geen omgevingen gevonden voor "{searchQuery}".</p>
                </div>
              ) : (
                <div className="tenant-grid">
                  {filtered.map((tenant) => (
                    <TenantCard
                      key={tenant.id}
                      tenant={tenant}
                      onEdit={setEditingTenantSettings}
                    />
                  ))}
                </div>
              );
            })()
          )}
        </div>

        <aside className="superadmin-sidebar">
          <SuperAdminUsersPanel />
        </aside>
      </div>

      <CreateTenantModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {}}
      />

      {editingTenantSettings && (
        <EditTenantModal
          tenant={editingTenantSettings}
          onClose={() => setEditingTenantSettings(null)}
        />
      )}
    </div>
  );
}

export default SuperAdminView;
