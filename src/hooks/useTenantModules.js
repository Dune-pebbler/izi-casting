import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useTenant } from "../context/TenantContext";

export function useTenantModules() {
  const { tenantId } = useTenant();
  const [modules, setModules] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "tenants", tenantId), (snap) => {
      setModules(snap.exists() ? snap.data().modules || {} : {});
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId]);

  return { modules, loading };
}
