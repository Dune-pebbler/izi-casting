import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Devices from "./Devices";
import FeedList from "./FeedList";
import Settings from "./Settings";

function Sidebar({
  setDeviceToDelete,
  deleteDevice,
  isCollapsed,
  onToggleCollapse,
}) {
  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <button
        className="sidebar-toggle-btn"
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
      <Settings />
    </div>
  );
}

export default Sidebar;
