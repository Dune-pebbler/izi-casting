import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { Plus, ExternalLink, Users, Monitor, LogOut, Pencil } from "lucide-react";
import CreateTenantModal from "./CreateTenantModal";
import EditTenantModal from "./EditTenantModal";
import { toast } from "sonner";

function TenantCard({ tenant, onEditUsers, onEdit }) {
  const url = `https://izi-casting.com/${tenant.id}`;

  return (
    <div className="tenant-card">
      <div className="tenant-card-header">
        <div>
          <h3 className="tenant-name">{tenant.name}</h3>
          <p className="tenant-subdomain">izi-casting.com/{tenant.id}</p>
        </div>
        <div className="tenant-card-header-actions">
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
      </div>
      <div className="tenant-card-stats">
        <span className="tenant-stat">
          <Users size={14} />
          {(tenant.authorizedUsers || []).length} gebruiker(s)
        </span>
      </div>
      <div className="tenant-card-actions">
        <button
          className="btn btn-sm btn-outline"
          onClick={() => onEditUsers(tenant)}
        >
          <Users size={14} />
          Gebruikers beheren
        </button>
      </div>
    </div>
  );
}

function UserManagementPanel({ tenant, onClose }) {
  const [users, setUsers] = useState(tenant.authorizedUsers || []);
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      const updated = [...users, email];
      await setDoc(doc(db, "tenants", tenant.id), { authorizedUsers: updated }, { merge: true });
      setUsers(updated);
      setNewEmail("");
      toast.success(`${email} toegevoegd`);
    } catch (error) {
      toast.error("Fout: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (email) => {
    setIsSaving(true);
    try {
      const updated = users.filter((u) => u !== email);
      await setDoc(doc(db, "tenants", tenant.id), { authorizedUsers: updated }, { merge: true });
      setUsers(updated);
      toast.success(`${email} verwijderd`);
    } catch (error) {
      toast.error("Fout: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="user-management-panel">
      <div className="panel-header">
        <h3>Gebruikers — {tenant.name}</h3>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <ul className="users-list">
        {users.map((email) => (
          <li key={email} className="user-item">
            <span className="user-email">{email}</span>
            <button
              className="user-remove-btn"
              onClick={() => handleRemove(email)}
              disabled={isSaving}
            >
              ✕
            </button>
          </li>
        ))}
        {users.length === 0 && <li className="user-empty">Geen gebruikers</li>}
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
        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={isSaving}>
          Toevoegen
        </button>
      </div>
    </div>
  );
}

function SuperAdminView() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editingTenantSettings, setEditingTenantSettings] = useState(null);

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
          <img src="/izicasting-logo.svg" alt="iziCasting" className="logo-image" />
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

      <div className="superadmin-content">
        <div className="superadmin-toolbar">
          <h2>
            <Monitor size={20} />
            Klanten ({tenants.length})
          </h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            Nieuwe klant
          </button>
        </div>

        {loading ? (
          <div className="loading">Tenants laden...</div>
        ) : tenants.length === 0 ? (
          <div className="superadmin-empty">
            <p>Nog geen klanten aangemaakt.</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              Eerste klant aanmaken
            </button>
          </div>
        ) : (
          <div className="tenant-grid">
            {tenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onEditUsers={setEditingTenant}
                onEdit={setEditingTenantSettings}
              />
            ))}
          </div>
        )}
      </div>

      {editingTenant && (
        <div className="modal-overlay" onClick={() => setEditingTenant(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <UserManagementPanel
              tenant={editingTenant}
              onClose={() => setEditingTenant(null)}
            />
          </div>
        </div>
      )}

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
