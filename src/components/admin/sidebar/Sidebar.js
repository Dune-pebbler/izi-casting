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
  Images,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useTenant } from "../../../context/TenantContext";
import { auth } from "../../../firebase";
import Devices from "./Devices";
import FeedList from "./FeedList";
import AudioSettings from "./AudioSettings";
import SportlinkSettings from "./SportlinkSettings";
import SlideArchive from "./SlideArchive";
import Settings from "./Settings";
import { useTenantModules } from "../../../hooks/useTenantModules";
// import ImageLibraryModal from "./modal/ImageLibraryModal";
import ImageLibraryModal from "../modal/ImageLibraryModal";
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
  imageUsageCounts = null,
}) {
  const { tenantId } = useTenant();
  const { modules, slideTypes } = useTenantModules();
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
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
          canRotate={modules.rotateDevice}
        />
        <FeedList />
        {tenantId && isAdmin && <UsersPanel tenantId={tenantId} />}
        {modules.backgroundMusic && <AudioSettings />}
        {slideTypes.sportlink && <SportlinkSettings />}
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
        <button
          className="sidebar__footer-btn"
          onClick={() => setMediaLibraryOpen(true)}
          title="Mediabibliotheek"
        >
          <Images size={18} />
          <span>Mediabibliotheek</span>
        </button>

        <button
          className="sidebar__footer-btn"
          onClick={() => setPrivacyOpen(true)}
        >
          <ShieldCheck size={15} />
          <span>Disclaimer</span>
        </button>

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

      <ImageLibraryModal
        isOpen={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        allowUpload
        usageCounts={imageUsageCounts}
      />

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
                <h2>Disclaimer</h2>
                <button onClick={() => setPrivacyOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="sidebar__privacy-body">
                <div>
                  <h2>Juridische Disclaimer: Verantwoordelijkheid Content</h2>
                  <strong>Artikel: Gebruik en Contentbeheer</strong>
                </div>

                <p>
                  Door gebruik te maken van het IZI-Casting platform, verklaart
                  de Gebruiker expliciet akkoord te gaan met de volgende
                  bepalingen omtrent content en publicatie:
                </p>

                <p>
                  <strong>Eigen Verantwoordelijkheid:</strong> De Gebruiker
                  draagt de volledige en exclusieve verantwoordelijkheid voor
                  alle content die via het IZI-Casting systeem wordt
                  gepubliceerd, waaronder begrepen maar niet beperkt tot
                  teksten, afbeeldingen, audiofragmenten en video's (al dan niet
                  afkomstig van platforms zoals YouTube en Vimeo).
                </p>

                <p>
                  <strong>Rechten van Derden:</strong> De Gebruiker garandeert
                  dat de gepubliceerde content geen inbreuk maakt op
                  intellectuele eigendomsrechten (zoals auteursrechten,
                  merkrechten of naburige rechten) van derden. Bij het gebruik
                  van externe bronnen, zoals RSS-feeds of video-embeds, dient de
                  Gebruiker zelf zorg te dragen voor de benodigde licenties of
                  toestemmingen.
                </p>

                <p>
                  <strong>Vrijwaring:</strong> De Gebruiker vrijwaart
                  IZI-Casting (en haar ontwikkelaar: Dune Pebbler B.V.) tegen
                  alle aanspraken van derden, evenals alle schade en kosten
                  (inclusief juridische bijstand), die voortvloeien uit of
                  verband houden met de door de Gebruiker geplaatste content.
                </p>

                <p>
                  <strong>Onrechtmatige Content:</strong> Het is strikt verboden
                  content te publiceren die in strijd is met de wet, de goede
                  zeden, of die een discriminerend, beledigend of aanstootgevend
                  karakter heeft. IZI-Casting behoudt zich het recht voor om bij
                  overtreding de toegang tot het platform direct te blokkeren,
                  zonder dat dit leidt tot enige plicht tot schadevergoeding
                  jegens de Gebruiker.
                </p>

                <p>
                  <strong>Externe Bronnen:</strong> IZI-Casting biedt technische
                  koppelingen met externe diensten (o.a. RSS, YouTube, Vimeo,
                  Teletekst). Wij aanvaarden geen enkele aansprakelijkheid voor
                  de beschikbaarheid, juistheid of inhoud van deze externe
                  bronnen.
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
