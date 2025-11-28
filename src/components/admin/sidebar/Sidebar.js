import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Devices from "./Devices";
import FeedList from "./FeedList";
import Settings from "./Settings";

function Sidebar({
  setDeviceToDelete,
  deleteDevice,
  isCollapsed,
  onToggleCollapse,
  onOpenTrash,
  trashedSlidesCount = 0,
}) {
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

      {/* Trash Button */}
      <div className="sidebar-section">
        <button className="sidebar-trash-btn" onClick={onOpenTrash} title="Prullenbak openen">
          <Trash2 size={20} />
          <span>Prullenbak</span>
          {trashedSlidesCount > 0 && (
            <span className="trash-count-badge">{trashedSlidesCount}</span>
          )}
        </button>
      </div>

      <Settings />
    </div>
  );
}

export default Sidebar;
