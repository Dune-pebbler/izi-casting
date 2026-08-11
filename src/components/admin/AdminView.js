import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage, auth } from "../../firebase";
import { useTenant } from "../../context/TenantContext";
import {
  tenantDoc,
  tenantCollection,
  tenantStorageRef,
} from "../../utils/tenantPaths";
import { sanitizeHTMLContent } from "../../utils/sanitize";
import {
  isSportlinkLayout,
  getSportlinkDataType,
} from "../../utils/sportlinkTypes";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  setDeviceToDelete,
  clearDeviceToDelete,
  setIsSidebarCollapsed,
} from "../../store/slices/deviceSlice";
import { usePlaylistManager } from "./PlaylistManager";
import { useTenantModules } from "../../hooks/useTenantModules";
import PlaylistList from "./PlaylistList";
import EditModal from "./slide-edit/EditModal";
import MoveSlideModal from "./MoveSlideModal";
import AddSlideModal from "./AddSlideModal";
import ImageLibraryModal from "./modal/ImageLibraryModal";
import TrashModal from "./TrashModal";
import Sidebar from "./sidebar/Sidebar";
import {
  Monitor,
  Clock,
  X,
  Settings,
  LayoutGrid,
  List,
  Undo2,
  Images,
  MonitorPlay,
} from "lucide-react";

function AdminView() {
  const { tenantId } = useTenant();
  const { slideTypes, modules } = useTenantModules();
  // Playlist management hook
  const {
    playlists,
    hasLoaded,
    setPlaylists,
    addPlaylist,
    removePlaylist,
    updatePlaylistName,
    updatePlaylistRepeatCount,
    togglePlaylistEnabled,
    copyPlaylist,
    reorderPlaylists,
    calculatePlaylistDuration,
    formatDuration,
    savePlaylistsToFirebase,
    updatePlaylistMusic,
  } = usePlaylistManager();

  // Modal and editing state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [modalTinyMCEContent, setModalTinyMCEContent] = useState("");
  const [imagePosition, setImagePosition] = useState("center");
  const [slideLayout, setSlideLayout] = useState("side-by-side");
  const [modalSlideName, setModalSlideName] = useState("");
  const [modalSlideDuration, setModalSlideDuration] = useState(5);
  const [modalShowBar, setModalShowBar] = useState(true);
  const [modalVideoUrl, setModalVideoUrl] = useState("");
  const [modalVideoSound, setModalVideoSound] = useState(false);
  const [modalImageSide, setModalImageSide] = useState("left");
  const [modalSlideTransition, setModalSlideTransition] = useState("fade");
  const [modalTeletekstChannel, setModalTeletekstChannel] = useState("101");
  const [modalTeletekstTheme, setModalTeletekstTheme] = useState("classic");
  const [modalTeletekstPages, setModalTeletekstPages] = useState([1]);
  const [modalTeletekstSkipTopLines, setModalTeletekstSkipTopLines] =
    useState(0);
  const [modalTeletekstSkipBottomLines, setModalTeletekstSkipBottomLines] =
    useState(0);
  const [modalIframeUrl, setModalIframeUrl] = useState("");
  const [modalGalleryImages, setModalGalleryImages] = useState([]);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [modalCountdownTitle, setModalCountdownTitle] = useState("");
  const [modalCountdownTargetDate, setModalCountdownTargetDate] = useState("");
  const [modalCountdownBgImage, setModalCountdownBgImage] = useState("");
  const [modalCountdownBgImagePosition, setModalCountdownBgImagePosition] =
    useState("center");
  const [modalCountdownTextColor, setModalCountdownTextColor] =
    useState("#ffffff");
  const [modalCountdownNumberColor, setModalCountdownNumberColor] =
    useState("#ffffff");
  const [modalCountdownBlockBg, setModalCountdownBlockBg] = useState("#1a1a2e");
  const [modalCountdownLabelColor, setModalCountdownLabelColor] =
    useState("#aaaaaa");
  const [modalAgendaCalendars, setModalAgendaCalendars] = useState([]);
  const [modalAgendaTitle, setModalAgendaTitle] = useState("Agenda");
  const [modalAgendaDaysAhead, setModalAgendaDaysAhead] = useState(14);
  const [modalAgendaMaxEvents, setModalAgendaMaxEvents] = useState(8);
  const [modalAgendaBgColor, setModalAgendaBgColor] = useState("#0f172a");
  const [modalAgendaTextColor, setModalAgendaTextColor] = useState("#ffffff");
  const [modalEmailProvider, setModalEmailProvider] = useState("gmail");
  const [modalEmailCredentials, setModalEmailCredentials] = useState({});
  const [modalEmailMaxItems, setModalEmailMaxItems] = useState(10);
  const [modalEmailShowUnreadOnly, setModalEmailShowUnreadOnly] =
    useState(true);
  const [modalEmailBgColor, setModalEmailBgColor] = useState("#0f172a");
  const [modalEmailTextColor, setModalEmailTextColor] = useState("#ffffff");
  const [modalEmailAccentColor, setModalEmailAccentColor] = useState("#4f87ff");
  const [modalSportlinkApiKey, setModalSportlinkApiKey] = useState("");
  const [modalSportlinkDataType, setModalSportlinkDataType] =
    useState("programma");
  const [modalSportlinkTeams, setModalSportlinkTeams] = useState([]);
  const [modalSportlinkTitle, setModalSportlinkTitle] = useState("");
  const [modalSportlinkMaxItems, setModalSportlinkMaxItems] = useState(10);
  const [modalSportlinkBgColor, setModalSportlinkBgColor] = useState("#0f172a");
  const [modalSportlinkTextColor, setModalSportlinkTextColor] =
    useState("#ffffff");
  const [modalSportlinkAccentColor, setModalSportlinkAccentColor] =
    useState("#ff6600");
  const [modalSportlinkHeaderTextColor, setModalSportlinkHeaderTextColor] =
    useState("#ffffff");
  const [modalSportlinkDate, setModalSportlinkDate] = useState("");
  const [modalSportlinkShowVeldInfo, setModalSportlinkShowVeldInfo] =
    useState(false);
  const [modalSportlinkOnlyThuis, setModalSportlinkOnlyThuis] = useState(false);
  const [modalWeatherLat, setModalWeatherLat] = useState("");
  const [modalWeatherLong, setModalWeatherLong] = useState("");
  const [modalWeatherCity, setModalWeatherCity] = useState("");
  const [modalWeatherAccentColor, setModalWeatherAccentColor] =
    useState("#4f87ff");
  const [modalWeatherLeftAccentColor, setModalWeatherLeftAccentColor] =
    useState("#4f87ff");
  const [modalWeatherLeftTextColor, setModalWeatherLeftTextColor] =
    useState("#ffffff");
  const [modalWeatherForecastDays, setModalWeatherForecastDays] = useState(7);
  const [modalWeatherLeftBgImage, setModalWeatherLeftBgImage] = useState("");
  const [modalWeatherLeftBgImagePosition, setModalWeatherLeftBgImagePosition] =
    useState("center");
  const [modalQrUrl, setModalQrUrl] = useState("");
  const [modalQrLabel, setModalQrLabel] = useState("");
  const [modalQrLeftBgColor, setModalQrLeftBgColor] = useState("#0f172a");
  const [modalQrDotsColor, setModalQrDotsColor] = useState("#ffffff");
  const [modalQrPanelColor, setModalQrPanelColor] = useState("#1d4ed8");
  const [modalQrPanelTextColor, setModalQrPanelTextColor] = useState("#ffffff");
  const [modalQrTextSlides, setModalQrTextSlides] = useState([]);
  const [modalQrTextInterval, setModalQrTextInterval] = useState(5);
  const [uploadingQrSlideId, setUploadingQrSlideId] = useState(null);
  const [qrSlideLibraryTargetId, setQrSlideLibraryTargetId] = useState(null);
  const [imageLibraryTarget, setImageLibraryTarget] = useState("main");
  const [modalTimeRestriction, setModalTimeRestriction] = useState({
    enabled: false,
    startTime: "08:00",
    endTime: "17:00",
    startDate: "",
    endDate: "",
    days: {
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: true,
      sun: true,
    },
  });
  const [currentEditingPlaylistId, setCurrentEditingPlaylistId] =
    useState(null);
  const [slideToDelete, setSlideToDelete] = useState(null);
  const [defaultSlideTransition, setDefaultSlideTransition] = useState("fade");
  const [enabledFonts, setEnabledFonts] = useState([]);
  const [typography, setTypography] = useState({
    p: { fontSize: 27, fontFamily: "Arial", fontColor: "#000000" },
    h1: { fontSize: 64, fontFamily: "Arial", fontColor: "#000000" },
    h2: { fontSize: 53, fontFamily: "Arial", fontColor: "#000000" },
    h3: { fontSize: 43, fontFamily: "Arial", fontColor: "#000000" },
  });

  // Playlist editing state
  const [editingPlaylistNameId, setEditingPlaylistNameId] = useState(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState("");
  const [expandedPlaylists, setExpandedPlaylists] = useState(new Set());
  const [editingPlaylistRepeatCount, setEditingPlaylistRepeatCount] =
    useState(1);
  const [editingPlaylistRepeatCountId, setEditingPlaylistRepeatCountId] =
    useState(null);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  const [playlistToCopy, setPlaylistToCopy] = useState(null);
  const [globalLayout, setGlobalLayout] = useState("list"); // 'grid' or 'list'

  // Add slide modal state
  const [addSlideModalOpen, setAddSlideModalOpen] = useState(false);
  const [addSlideTargetPlaylistId, setAddSlideTargetPlaylistId] =
    useState(null);

  // Move slide modal state
  const [moveSlideModalOpen, setMoveSlideModalOpen] = useState(false);
  const [slideToMove, setSlideToMove] = useState(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);

  // Image library modal state
  const [imageLibraryModalOpen, setImageLibraryModalOpen] = useState(false);
  const [galleryLibraryModalOpen, setGalleryLibraryModalOpen] = useState(false);

  // Trash modal state
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [trashedSlides, setTrashedSlides] = useState([]);

  // Redux hooks
  const dispatch = useAppDispatch();
  const deviceToDelete = useAppSelector((state) => state.device.deviceToDelete);
  const isSidebarCollapsed = useAppSelector(
    (state) => state.device.isSidebarCollapsed,
  );

  const [tenantName, setTenantName] = useState("");
  const [tenantLogoUrl, setTenantLogoUrl] = useState("");
  const [tenantSportlinkApiKey, setTenantSportlinkApiKey] = useState("");

  // Load default slide transition, enabled fonts, and tenant name
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(
          tenantDoc(db, tenantId, "display", "settings"),
        );
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          setDefaultSlideTransition(settings.defaultSlideTransition || "fade");
          setEnabledFonts(settings.enabledFonts || []);
          setTenantLogoUrl(settings.logoUrl || "");
          setTenantSportlinkApiKey(settings.sportlinkApiKey || "");
          if (settings.typography) setTypography(settings.typography);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    const loadTenantName = async () => {
      if (!tenantId) return;
      try {
        const snap = await getDoc(doc(db, "tenants", tenantId));
        if (snap.exists()) setTenantName(snap.data().name || "");
      } catch (error) {
        console.error("Error loading tenant name:", error);
      }
    };

    loadSettings();
    loadTenantName();
  }, [tenantId]);

  // Ensure light mode is always applied
  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
  }, []);

  // Load trashed slides from Firebase
  useEffect(() => {
    const loadTrashedSlides = async () => {
      try {
        const trashSnapshot = await getDocs(
          tenantCollection(db, tenantId, "trash"),
        );
        const trashData = trashSnapshot.docs.map((doc) => ({
          trashId: doc.id,
          ...doc.data(),
        }));
        setTrashedSlides(trashData);
      } catch (error) {
        console.error("Error loading trash:", error);
      }
    };

    loadTrashedSlides();
  }, []);

  // Live gallery duration: update modalSlideDuration whenever images change
  useEffect(() => {
    if (slideLayout === "gallery") {
      const total = modalGalleryImages.reduce(
        (sum, img) => sum + (img.duration || 3),
        0,
      );
      setModalSlideDuration(total || 0);
    }
  }, [modalGalleryImages, slideLayout]);

  // Calculate total statistics across all playlists
  const totalStats = useMemo(() => {
    let totalSlides = 0;
    let activeSlides = 0;
    let totalDuration = 0;

    playlists.forEach((playlist) => {
      const isPlaylistEnabled = playlist.isEnabled !== false;

      if (playlist.slides && isPlaylistEnabled) {
        const playlistSlides = playlist.slides.length;
        const playlistActiveSlides = playlist.slides.filter(
          (slide) => slide.isVisible !== false,
        ).length;
        const playlistDuration = calculatePlaylistDuration(playlist.slides);

        totalSlides += playlistSlides;
        activeSlides += playlistActiveSlides;
        totalDuration += playlistDuration * playlist.repeatCount;
      }
    });

    return { totalSlides, activeSlides, totalDuration };
  }, [playlists, calculatePlaylistDuration]);

  // Toggle sidebar collapse
  const toggleSidebarCollapse = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  // Playlist editing handlers
  const startEditingPlaylistName = (playlistId, currentName) => {
    setEditingPlaylistNameId(playlistId);
    setEditingPlaylistName(currentName);
  };

  const savePlaylistName = async () => {
    if (editingPlaylistNameId && editingPlaylistName.trim()) {
      await updatePlaylistName(
        editingPlaylistNameId,
        editingPlaylistName.trim(),
      );
    }
    setEditingPlaylistNameId(null);
    setEditingPlaylistName("");
  };

  const cancelEditingPlaylistName = () => {
    setEditingPlaylistNameId(null);
    setEditingPlaylistName("");
  };

  const handlePlaylistNameKeyPress = (e) => {
    if (e.key === "Enter") {
      savePlaylistName();
    } else if (e.key === "Escape") {
      cancelEditingPlaylistName();
    }
  };

  const startEditingPlaylistRepeatCount = (playlistId, currentRepeatCount) => {
    setEditingPlaylistRepeatCountId(playlistId);
    setEditingPlaylistRepeatCount(currentRepeatCount || 1);
  };

  const savePlaylistRepeatCount = async () => {
    if (editingPlaylistRepeatCountId && editingPlaylistRepeatCount > 0) {
      await updatePlaylistRepeatCount(
        editingPlaylistRepeatCountId,
        editingPlaylistRepeatCount,
      );
    }
    setEditingPlaylistRepeatCountId(null);
    setEditingPlaylistRepeatCount(1);
  };

  const cancelEditingPlaylistRepeatCount = () => {
    setEditingPlaylistRepeatCountId(null);
    setEditingPlaylistRepeatCount(1);
  };

  const handlePlaylistRepeatCountKeyPress = (e) => {
    if (e.key === "Enter") {
      savePlaylistRepeatCount();
    } else if (e.key === "Escape") {
      cancelEditingPlaylistRepeatCount();
    }
  };

  const togglePlaylistExpansion = (playlistId) => {
    const newExpanded = new Set(expandedPlaylists);
    if (newExpanded.has(playlistId)) {
      newExpanded.delete(playlistId);
    } else {
      newExpanded.add(playlistId);
    }
    setExpandedPlaylists(newExpanded);
  };

  const toggleGlobalLayout = () => {
    setGlobalLayout((prevLayout) => (prevLayout === "grid" ? "list" : "grid"));
  };

  const handleAddPlaylist = async () => {
    const newPlaylistId = await addPlaylist();
    if (newPlaylistId) {
      // Automatically expand the newly created playlist
      const newExpanded = new Set(expandedPlaylists);
      newExpanded.add(newPlaylistId);
      setExpandedPlaylists(newExpanded);
    }
  };

  const confirmDeletePlaylist = (playlist) => {
    setPlaylistToDelete(playlist);
  };

  const confirmCopyPlaylist = (playlist) => {
    setPlaylistToCopy(playlist);
  };

  const handleCopyPlaylist = async () => {
    if (playlistToCopy) {
      await copyPlaylist(playlistToCopy);
      setPlaylistToCopy(null);
    }
  };

  const handleDeletePlaylist = async () => {
    if (playlistToDelete) {
      await removePlaylist(playlistToDelete.id);
      setPlaylistToDelete(null);
    }
  };

  // Slide management handlers
  const addSlide = (playlistId) => {
    setAddSlideTargetPlaylistId(playlistId);
    setAddSlideModalOpen(true);
  };

  const confirmAddSlide = async (slideName, slideLayout = "side-by-side") => {
    const playlistId = addSlideTargetPlaylistId;
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    let currentDefaultTransition = defaultSlideTransition;
    let currentEnabledFonts = enabledFonts;
    try {
      const settingsDoc = await getDoc(
        tenantDoc(db, tenantId, "display", "settings"),
      );
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        currentDefaultTransition = settings.defaultSlideTransition || "fade";
        currentEnabledFonts = settings.enabledFonts || [];
        setDefaultSlideTransition(currentDefaultTransition);
        setEnabledFonts(currentEnabledFonts);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }

    const typeFromLayout = {
      video: "video",
      teletekst: "teletekst",
      iframe: "iframe",
      "image-only": "image",
      gallery: "gallery",
      countdown: "countdown",
      agenda: "agenda",
      email: "email",
      sportlink: "sportlink",
      "sportlink-programma": "sportlink",
      "sportlink-uitslagen": "sportlink",
      "sportlink-poulestand": "sportlink",
      weather: "weather",
    };
    const newSlide = {
      id: Date.now(),
      name: slideName,
      type: typeFromLayout[slideLayout] || "text",
      text: "",
      imageUrl: "",
      imageName: "",
      ...(slideLayout === "gallery" && { images: [] }),
      ...(slideLayout === "agenda" && {
        agendaCalendars: [],
        agendaTitle: "Agenda",
        agendaDaysAhead: 14,
        agendaMaxEvents: 8,
        agendaBgColor: "#0f172a",
        agendaTextColor: "#ffffff",
        duration: 30,
      }),
      ...(slideLayout === "countdown" && {
        countdownTitle: "",
        countdownTargetDate: "",
        countdownBgImage: "",
        countdownBgImagePosition: "center",
        countdownTextColor: "#ffffff",
        countdownNumberColor: "#ffffff",
        countdownBlockBg: "#1a1a2e",
        countdownLabelColor: "#aaaaaa",
        duration: 30,
      }),
      ...(slideLayout === "email" && {
        emailProvider: "gmail",
        emailCredentials: {},
        emailMaxItems: 10,
        emailShowUnreadOnly: true,
        emailBgColor: "#0f172a",
        emailTextColor: "#ffffff",
        emailAccentColor: "#4f87ff",
        duration: 30,
      }),
      ...(isSportlinkLayout(slideLayout) && {
        sportlinkApiKey: "",
        sportlinkDataType: getSportlinkDataType(slideLayout),
        sportlinkTeams: [],
        sportlinkTitle: "",
        sportlinkMaxItems: 10,
        sportlinkBgColor: "#0f172a",
        sportlinkTextColor: "#ffffff",
        sportlinkAccentColor: "#ff6600",
        sportlinkHeaderTextColor: "#ffffff",
        sportlinkDate: "",
        sportlinkShowVeldInfo: false,
        sportlinkOnlyThuis: false,
        duration: 30,
      }),
      ...(slideLayout === "weather" && {
        weatherLat: "",
        weatherLong: "",
        weatherCity: "",
        weatherAccentColor: "#4f87ff",
        weatherLeftAccentColor: "#4f87ff",
        weatherLeftTextColor: "#ffffff",
        weatherForecastDays: 7,
        weatherLeftBgImage: "",
        weatherLeftBgImagePosition: "center",
      }),
      ...(slideLayout === "qr-feed" && {
        qrUrl: "",
        qrLabel: "",
        qrLeftBgColor: "#0f172a",
        qrDotsColor: "#ffffff",
        qrPanelColor: "#1d4ed8",
        qrPanelTextColor: "#ffffff",
        qrTextSlides: [],
        qrTextInterval: 5,
        duration: 30,
      }),
      imagePosition: "center",
      layout: slideLayout,
      isVisible: false,
      showBar: true,
      transition: currentDefaultTransition,
    };

    const updatedPlaylists = playlists.map((p) => {
      if (p.id === playlistId) {
        const newSlides = [...p.slides, newSlide];
        const totalDuration = calculatePlaylistDuration(newSlides);
        return { ...p, slides: newSlides, totalDuration };
      }
      return p;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
    toast.success("Slide toegevoegd!");
    openEditModal(newSlide, playlistId);
  };

  const copySlide = async (slideToCopy, playlistId) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    const copiedSlide = {
      ...slideToCopy,
      id: Date.now(),
      name: `${slideToCopy.name} (Copy)`,
      isVisible: false, // Disable copied slide by default
    };

    const updatedPlaylists = playlists.map((p) => {
      if (p.id === playlistId) {
        const newSlides = [...p.slides, copiedSlide];
        const totalDuration = calculatePlaylistDuration(newSlides);
        return { ...p, slides: newSlides, totalDuration };
      }
      return p;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
    toast.success("Slide copied successfully! (Disabled by default)");
  };

  const moveSlideToTrash = async (slide, playlistId) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    const slideName = slide?.name || "Slide";
    const loadingToast = toast.loading(
      `${slideName} verplaatsen naar prullenbak...`,
    );

    try {
      // Create trash entry
      const trashData = {
        ...slide,
        originalPlaylistId: playlistId,
        originalPlaylistName: playlist.name,
        deletedAt: new Date().toISOString(),
      };

      // Add to trash collection
      const trashDocRef = await addDoc(
        tenantCollection(db, tenantId, "trash"),
        trashData,
      );

      // Update local trash state
      setTrashedSlides((prev) => [
        ...prev,
        { trashId: trashDocRef.id, ...trashData },
      ]);

      // Remove from playlist
      const updatedPlaylists = playlists.map((p) =>
        p.id === playlistId
          ? { ...p, slides: p.slides.filter((s) => s.id !== slide.id) }
          : p,
      );
      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);

      toast.dismiss(loadingToast);
      toast.success(`${slideName} verplaatst naar prullenbak`);

      closeEditModal();
    } catch (error) {
      console.error("Error moving slide to trash:", error);
      toast.dismiss(loadingToast);
      toast.error(
        `Fout bij verplaatsen van ${slideName} naar prullenbak: ` +
          error.message,
      );
    }
  };

  const deleteSlide = async (slideId, playlistId) => {
    console.log("deleteSlide called with:", { slideId, playlistId });
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      console.log("Playlist not found");
      return;
    }

    const slideToDelete = playlist.slides.find((s) => s.id === slideId);
    console.log("Slide to delete found:", slideToDelete);

    if (slideToDelete) {
      await moveSlideToTrash(slideToDelete, playlistId);
    }
  };

  const openEditModal = (slide, playlistId) => {
    setEditingSlide(slide);
    setCurrentEditingPlaylistId(playlistId);
    setModalTinyMCEContent(slide.tinyMCEContent || slide.text || "");
    setModalImageUrl(slide.imageUrl || "");
    setImagePosition(slide.imagePosition || "center");
    setSlideLayout(slide.layout || "side-by-side");
    setModalSlideName(slide.name || "");
    setModalSlideDuration(slide.duration || 5);
    setModalShowBar(slide.showBar !== false);
    setModalVideoUrl(slide.videoUrl || "");
    setModalVideoSound(slide.videoSound || false);
    setModalImageSide(slide.imageSide || "left");
    setModalSlideTransition(slide.transition || "fade");
    setModalTeletekstChannel(slide.teletekstChannel || "101");
    setModalTeletekstTheme(slide.teletekstTheme || "classic");
    setModalTeletekstPages(
      slide.teletekstPages ||
        Array.from({ length: slide.teletekstPageCount || 1 }, (_, i) => i + 1),
    );
    setModalTeletekstSkipTopLines(slide.teletekstSkipTopLines || 0);
    setModalTeletekstSkipBottomLines(slide.teletekstSkipBottomLines || 0);
    setModalIframeUrl(slide.iframeUrl || "");
    setModalGalleryImages(slide.images || []);
    setModalCountdownTitle(slide.countdownTitle || "");
    setModalCountdownTargetDate(slide.countdownTargetDate || "");
    setModalCountdownBgImage(slide.countdownBgImage || "");
    setModalCountdownBgImagePosition(
      slide.countdownBgImagePosition || "center",
    );
    setModalCountdownTextColor(slide.countdownTextColor || "#ffffff");
    setModalCountdownNumberColor(slide.countdownNumberColor || "#ffffff");
    setModalCountdownBlockBg(slide.countdownBlockBg || "#1a1a2e");
    setModalCountdownLabelColor(slide.countdownLabelColor || "#aaaaaa");
    setModalAgendaCalendars(slide.agendaCalendars || []);
    setModalAgendaTitle(slide.agendaTitle || "Agenda");
    setModalAgendaDaysAhead(slide.agendaDaysAhead || 14);
    setModalAgendaMaxEvents(slide.agendaMaxEvents || 8);
    setModalAgendaBgColor(slide.agendaBgColor || "#0f172a");
    setModalAgendaTextColor(slide.agendaTextColor || "#ffffff");
    setModalEmailProvider(slide.emailProvider || "gmail");
    setModalEmailCredentials(slide.emailCredentials || {});
    setModalEmailMaxItems(slide.emailMaxItems ?? 10);
    setModalEmailShowUnreadOnly(slide.emailShowUnreadOnly ?? true);
    setModalEmailBgColor(slide.emailBgColor || "#0f172a");
    setModalEmailTextColor(slide.emailTextColor || "#ffffff");
    setModalEmailAccentColor(slide.emailAccentColor || "#4f87ff");
    setModalSportlinkApiKey(slide.sportlinkApiKey || "");
    setModalSportlinkDataType(slide.sportlinkDataType || "programma");
    setModalSportlinkTeams(slide.sportlinkTeams || []);
    setModalSportlinkTitle(slide.sportlinkTitle || "");
    setModalSportlinkMaxItems(slide.sportlinkMaxItems || 10);
    setModalSportlinkBgColor(slide.sportlinkBgColor || "#0f172a");
    setModalSportlinkTextColor(slide.sportlinkTextColor || "#ffffff");
    setModalSportlinkAccentColor(slide.sportlinkAccentColor || "#ff6600");
    setModalSportlinkHeaderTextColor(
      slide.sportlinkHeaderTextColor || "#ffffff",
    );
    setModalSportlinkDate(slide.sportlinkDate || "");
    setModalSportlinkShowVeldInfo(slide.sportlinkShowVeldInfo || false);
    setModalSportlinkOnlyThuis(slide.sportlinkOnlyThuis || false);
    setModalWeatherLat(slide.weatherLat || "");
    setModalWeatherLong(slide.weatherLong || "");
    setModalWeatherCity(slide.weatherCity || "");
    setModalWeatherAccentColor(slide.weatherAccentColor || "#4f87ff");
    setModalWeatherLeftAccentColor(
      slide.weatherLeftAccentColor || slide.weatherAccentColor || "#4f87ff",
    );
    setModalWeatherLeftTextColor(slide.weatherLeftTextColor || "#ffffff");
    setModalWeatherForecastDays(slide.weatherForecastDays ?? 7);
    setModalWeatherLeftBgImage(slide.weatherLeftBgImage || "");
    setModalWeatherLeftBgImagePosition(
      slide.weatherLeftBgImagePosition || "center",
    );
    setModalQrUrl(slide.qrUrl || "");
    setModalQrLabel(slide.qrLabel || "");
    setModalQrLeftBgColor(slide.qrLeftBgColor || "#0f172a");
    setModalQrDotsColor(slide.qrDotsColor || "#ffffff");
    setModalQrPanelColor(slide.qrPanelColor || "#1d4ed8");
    setModalQrPanelTextColor(slide.qrPanelTextColor || "#ffffff");
    setModalQrTextSlides(slide.qrTextSlides || []);
    setModalQrTextInterval(slide.qrTextInterval || 5);
    setModalTimeRestriction(
      slide.timeRestriction || {
        enabled: false,
        startTime: "08:00",
        endTime: "17:00",
        startDate: "",
        endDate: "",
        days: {
          mon: true,
          tue: true,
          wed: true,
          thu: true,
          fri: true,
          sat: true,
          sun: true,
        },
      },
    );
  };

  const closeEditModal = () => {
    setEditingSlide(null);
    setCurrentEditingPlaylistId(null);
    setModalTinyMCEContent("");
    setModalImageUrl("");
    setImagePosition("center");
    setSlideLayout("side-by-side");
    setModalSlideName("");
    setModalSlideDuration(5);
    setModalShowBar(true);
    setModalTeletekstChannel("101");
    setModalTeletekstSkipTopLines(0);
    setModalTeletekstSkipBottomLines(0);
    setModalIframeUrl("");
    setModalGalleryImages([]);
    setModalCountdownTitle("");
    setModalCountdownTargetDate("");
    setModalCountdownBgImage("");
    setModalCountdownBgImagePosition("center");
    setModalCountdownTextColor("#ffffff");
    setModalCountdownNumberColor("#ffffff");
    setModalCountdownBlockBg("#1a1a2e");
    setModalCountdownLabelColor("#aaaaaa");
    setModalAgendaCalendars([]);
    setModalAgendaTitle("Agenda");
    setModalAgendaDaysAhead(14);
    setModalAgendaMaxEvents(8);
    setModalAgendaBgColor("#0f172a");
    setModalAgendaTextColor("#ffffff");
    setModalSportlinkApiKey("");
    setModalSportlinkDataType("programma");
    setModalSportlinkTeams([]);
    setModalSportlinkTitle("");
    setModalSportlinkMaxItems(10);
    setModalSportlinkBgColor("#0f172a");
    setModalSportlinkTextColor("#ffffff");
    setModalSportlinkAccentColor("#ff6600");
    setModalSportlinkDate("");
    setModalSportlinkShowVeldInfo(false);
    setModalSportlinkOnlyThuis(false);
    setModalQrUrl("");
    setModalQrLabel("");
    setModalQrLeftBgColor("#0f172a");
    setModalQrDotsColor("#ffffff");
    setModalQrPanelColor("#1d4ed8");
    setModalQrPanelTextColor("#ffffff");
    setModalQrTextSlides([]);
    setModalQrTextInterval(5);
    setModalTimeRestriction({
      enabled: false,
      startTime: "08:00",
      endTime: "17:00",
      startDate: "",
      endDate: "",
      days: {
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: true,
        sun: true,
      },
    });
  };

  const handleContentChange = (content) => {
    setModalTinyMCEContent(content);
  };

  const handleModalImageUpload = async (file) => {
    if (!file) {
      setModalImageUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecteer een geldig afbeeldingsbestand.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Afbeelding moet kleiner zijn dan 5MB.");
      return;
    }

    setUploadingImage(true);
    const loadingToast = toast.loading("Afbeelding uploaden...");

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = tenantStorageRef(
        storage,
        tenantId,
        `slides/${fileName}`,
      );

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Get image dimensions
      const img = new Image();
      const dimensionsPromise = new Promise((resolve) => {
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          resolve({ width: null, height: null });
        };
      });
      img.src = downloadURL;
      const { width, height } = await dimensionsPromise;

      // Save to media library
      await addDoc(tenantCollection(db, tenantId, "mediaLibrary"), {
        name: file.name,
        url: downloadURL,
        storagePath: `tenants/${tenantId}/slides/${fileName}`,
        size: file.size,
        type: file.type,
        width,
        height,
        uploadedAt: new Date(),
      });

      setModalImageUrl(downloadURL);

      toast.dismiss(loadingToast);
      toast.success("Afbeelding succesvol geüpload!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.dismiss(loadingToast);
      toast.error("Fout bij uploaden: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGalleryImageAdd = async (file) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecteer een geldig afbeeldingsbestand.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Afbeelding moet kleiner zijn dan 5MB.");
      return;
    }

    setUploadingGalleryImage(true);
    const loadingToast = toast.loading(`${file.name} uploaden…`);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = tenantStorageRef(
        storage,
        tenantId,
        `slides/${fileName}`,
      );
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await addDoc(tenantCollection(db, tenantId, "mediaLibrary"), {
        name: file.name,
        url: downloadURL,
        storagePath: `tenants/${tenantId}/slides/${fileName}`,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      });

      setModalGalleryImages((prev) => [
        ...prev,
        {
          id: timestamp,
          url: downloadURL,
          name: file.name,
          storagePath: `tenants/${tenantId}/slides/${fileName}`,
          duration: 3,
        },
      ]);
      toast.dismiss(loadingToast);
      toast.success(`${file.name} toegevoegd!`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Fout bij uploaden: " + error.message);
    } finally {
      setUploadingGalleryImage(false);
    }
  };

  const handleGalleryImageRemove = (imageId) => {
    setModalGalleryImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleGalleryImageDurationChange = (imageId, duration) => {
    setModalGalleryImages((prev) =>
      imageId == null
        ? prev.map((img) => ({ ...img, duration }))
        : prev.map((img) => (img.id === imageId ? { ...img, duration } : img)),
    );
  };

  const handleGalleryReorder = (reorderedImages) => {
    setModalGalleryImages(reorderedImages);
  };

  const handleSelectImageFromLibrary = (image) => {
    if (imageLibraryTarget === "countdown") {
      setModalCountdownBgImage(image.url);
    } else if (imageLibraryTarget === "weatherLeft") {
      setModalWeatherLeftBgImage(image.url);
    } else if (
      imageLibraryTarget === "qrSlide" &&
      qrSlideLibraryTargetId !== null
    ) {
      setModalQrTextSlides((prev) =>
        prev.map((s) =>
          s.id === qrSlideLibraryTargetId ? { ...s, bgImage: image.url } : s,
        ),
      );
      setQrSlideLibraryTargetId(null);
    } else {
      setModalImageUrl(image.url);
    }
    toast.success("Afbeelding geselecteerd uit bibliotheek");
  };

  const handleOpenImageLibrary = () => {
    setImageLibraryTarget("main");
    setImageLibraryModalOpen(true);
  };

  const handleOpenCountdownBgLibrary = () => {
    setImageLibraryTarget("countdown");
    setImageLibraryModalOpen(true);
  };

  const handleOpenWeatherLeftBgLibrary = () => {
    setImageLibraryTarget("weatherLeft");
    setImageLibraryModalOpen(true);
  };

  const handleModalWeatherLeftBgImageUpload = async (file) => {
    if (!file) {
      setModalWeatherLeftBgImage("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecteer een geldig afbeeldingsbestand.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Afbeelding moet kleiner zijn dan 5MB.");
      return;
    }

    setUploadingImage(true);
    const loadingToast = toast.loading("Afbeelding uploaden...");

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = tenantStorageRef(
        storage,
        tenantId,
        `slides/${fileName}`,
      );
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await addDoc(tenantCollection(db, tenantId, "mediaLibrary"), {
        name: file.name,
        url: downloadURL,
        storagePath: `tenants/${tenantId}/slides/${fileName}`,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      });

      setModalWeatherLeftBgImage(downloadURL);
      toast.dismiss(loadingToast);
      toast.success("Afbeelding succesvol geüpload!");
    } catch (error) {
      console.error("Error uploading weather left background:", error);
      toast.dismiss(loadingToast);
      toast.error("Fout bij uploaden: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleModalCountdownBgImageUpload = async (file) => {
    if (!file) {
      setModalCountdownBgImage("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecteer een geldig afbeeldingsbestand.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Afbeelding moet kleiner zijn dan 5MB.");
      return;
    }

    setUploadingImage(true);
    const loadingToast = toast.loading("Afbeelding uploaden...");

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = tenantStorageRef(
        storage,
        tenantId,
        `slides/${fileName}`,
      );
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await addDoc(tenantCollection(db, tenantId, "mediaLibrary"), {
        name: file.name,
        url: downloadURL,
        storagePath: `tenants/${tenantId}/slides/${fileName}`,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      });

      setModalCountdownBgImage(downloadURL);
      toast.dismiss(loadingToast);
      toast.success("Afbeelding succesvol geüpload!");
    } catch (error) {
      console.error("Error uploading countdown background:", error);
      toast.dismiss(loadingToast);
      toast.error("Fout bij uploaden: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleQrSlideImageUpload = async (slideId, file) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecteer een geldig afbeeldingsbestand.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Afbeelding moet kleiner zijn dan 5MB.");
      return;
    }

    setUploadingQrSlideId(slideId);
    const loadingToast = toast.loading(`${file.name} uploaden…`);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = tenantStorageRef(
        storage,
        tenantId,
        `slides/${fileName}`,
      );
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await addDoc(tenantCollection(db, tenantId, "mediaLibrary"), {
        name: file.name,
        url: downloadURL,
        storagePath: `tenants/${tenantId}/slides/${fileName}`,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      });

      setModalQrTextSlides((prev) =>
        prev.map((s) =>
          s.id === slideId ? { ...s, bgImage: downloadURL } : s,
        ),
      );
      toast.dismiss(loadingToast);
      toast.success(`${file.name} toegevoegd!`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Fout bij uploaden: " + error.message);
    } finally {
      setUploadingQrSlideId(null);
    }
  };

  const handleOpenQrSlideLibrary = (slideId) => {
    setQrSlideLibraryTargetId(slideId);
    setImageLibraryTarget("qrSlide");
    setImageLibraryModalOpen(true);
  };

  const handleSelectGalleryImageFromLibrary = (images) => {
    const selected = Array.isArray(images) ? images : [images];
    setModalGalleryImages((prev) => [
      ...prev,
      ...selected.map((image, index) => ({
        id: Date.now() + index,
        url: image.url,
        name: image.name || "Afbeelding",
        storagePath: image.storagePath || "",
        duration: 3,
      })),
    ]);
    toast.success(
      selected.length === 1
        ? `${selected[0].name || "Afbeelding"} toegevoegd aan galerij`
        : `${selected.length} afbeeldingen toegevoegd aan galerij`,
    );
  };

  const saveModalChanges = async () => {
    if (!editingSlide || !currentEditingPlaylistId) {
      return;
    }

    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id === currentEditingPlaylistId) {
        const updatedSlides = playlist.slides.map((slide) => {
          if (slide.id === editingSlide.id) {
            const isGallery = slideLayout === "gallery";
            const isCountdown = slideLayout === "countdown";
            const isAgenda = slideLayout === "agenda";
            const isEmail = slideLayout === "email";
            const isSportlink = isSportlinkLayout(slideLayout);
            const isWeather = slideLayout === "weather";
            const isQrFeed = slideLayout === "qr-feed";
            const galleryDuration = isGallery
              ? modalGalleryImages.reduce(
                  (sum, img) => sum + (img.duration || 3),
                  0,
                ) || 5
              : null;

            const updatedSlide = {
              ...slide,
              name: modalSlideName,
              layout: slideLayout,
              showBar: modalShowBar,
              transition: modalSlideTransition,
              timeRestriction: modalTimeRestriction,
              ...(isGallery
                ? {
                    type: "gallery",
                    images: modalGalleryImages,
                    duration: galleryDuration,
                  }
                : isCountdown
                  ? {
                      type: "countdown",
                      countdownTitle: modalCountdownTitle,
                      countdownTargetDate: modalCountdownTargetDate,
                      countdownBgImage: modalCountdownBgImage,
                      countdownBgImagePosition: modalCountdownBgImagePosition,
                      countdownTextColor: modalCountdownTextColor,
                      countdownNumberColor: modalCountdownNumberColor,
                      countdownBlockBg: modalCountdownBlockBg,
                      countdownLabelColor: modalCountdownLabelColor,
                      duration:
                        modalSlideDuration === "" ? 30 : modalSlideDuration,
                    }
                  : isAgenda
                    ? {
                        type: "agenda",
                        agendaCalendars: modalAgendaCalendars,
                        agendaTitle: modalAgendaTitle,
                        agendaDaysAhead: modalAgendaDaysAhead,
                        agendaMaxEvents: modalAgendaMaxEvents,
                        agendaBgColor: modalAgendaBgColor,
                        agendaTextColor: modalAgendaTextColor,
                        duration:
                          modalSlideDuration === "" ? 30 : modalSlideDuration,
                      }
                    : isEmail
                      ? {
                          type: "email",
                          emailProvider: modalEmailProvider,
                          emailCredentials: modalEmailCredentials,
                          emailMaxItems: modalEmailMaxItems,
                          emailShowUnreadOnly: modalEmailShowUnreadOnly,
                          emailBgColor: modalEmailBgColor,
                          emailTextColor: modalEmailTextColor,
                          emailAccentColor: modalEmailAccentColor,
                          duration:
                            modalSlideDuration === "" ? 30 : modalSlideDuration,
                        }
                      : isSportlink
                        ? {
                            type: "sportlink",
                            sportlinkApiKey: modalSportlinkApiKey,
                            sportlinkDataType: getSportlinkDataType(
                              slideLayout,
                              modalSportlinkDataType,
                            ),
                            sportlinkTeams: modalSportlinkTeams,
                            sportlinkTitle: modalSportlinkTitle,
                            sportlinkMaxItems: modalSportlinkMaxItems,
                            sportlinkBgColor: modalSportlinkBgColor,
                            sportlinkTextColor: modalSportlinkTextColor,
                            sportlinkAccentColor: modalSportlinkAccentColor,
                            sportlinkHeaderTextColor:
                              modalSportlinkHeaderTextColor,
                            sportlinkDate: modalSportlinkDate,
                            sportlinkShowVeldInfo: modalSportlinkShowVeldInfo,
                            sportlinkOnlyThuis: modalSportlinkOnlyThuis,
                            duration:
                              modalSlideDuration === ""
                                ? 30
                                : modalSlideDuration,
                          }
                        : isWeather
                          ? {
                              type: "weather",
                              weatherLat: modalWeatherLat,
                              weatherLong: modalWeatherLong,
                              weatherCity: modalWeatherCity,
                              weatherAccentColor: modalWeatherAccentColor,
                              weatherLeftAccentColor:
                                modalWeatherLeftAccentColor,
                              weatherLeftTextColor: modalWeatherLeftTextColor,
                              weatherForecastDays: modalWeatherForecastDays,
                              weatherLeftBgImage: modalWeatherLeftBgImage,
                              weatherLeftBgImagePosition:
                                modalWeatherLeftBgImagePosition,
                              duration:
                                modalSlideDuration === ""
                                  ? 30
                                  : modalSlideDuration,
                            }
                          : isQrFeed
                            ? {
                                type: "qr-feed",
                                qrUrl: modalQrUrl,
                                qrLabel: modalQrLabel,
                                qrLeftBgColor: modalQrLeftBgColor,
                                qrDotsColor: modalQrDotsColor,
                                qrPanelColor: modalQrPanelColor,
                                qrPanelTextColor: modalQrPanelTextColor,
                                qrTextSlides: modalQrTextSlides,
                                qrTextInterval: modalQrTextInterval,
                                duration:
                                  modalSlideDuration === ""
                                    ? 30
                                    : modalSlideDuration,
                              }
                            : {
                                text: sanitizeHTMLContent(modalTinyMCEContent),
                                tinyMCEContent: modalTinyMCEContent,
                                imageUrl: modalImageUrl,
                                videoUrl: modalVideoUrl,
                                videoSound: modalVideoSound,
                                teletekstChannel: modalTeletekstChannel,
                                teletekstTheme: modalTeletekstTheme,
                                teletekstPages: modalTeletekstPages,
                                teletekstSkipTopLines:
                                  modalTeletekstSkipTopLines,
                                teletekstSkipBottomLines:
                                  modalTeletekstSkipBottomLines,
                                iframeUrl: modalIframeUrl,
                                type:
                                  slideLayout === "iframe"
                                    ? "iframe"
                                    : slideLayout === "teletekst"
                                      ? "teletekst"
                                      : modalVideoUrl
                                        ? "video"
                                        : modalImageUrl
                                          ? "image"
                                          : "text",
                                imagePosition: imagePosition,
                                imageSide: modalImageSide,
                                duration:
                                  modalSlideDuration === ""
                                    ? 5
                                    : modalSlideDuration,
                              }),
            };

            return updatedSlide;
          }
          return slide;
        });
        const totalDuration = calculatePlaylistDuration(updatedSlides);
        return { ...playlist, slides: updatedSlides, totalDuration };
      }
      return playlist;
    });

    setPlaylists(updatedPlaylists);

    const loadingToast = toast.loading("Saving slide changes...");

    try {
      const displayDocRef = tenantDoc(db, tenantId, "display", "content");
      await setDoc(
        displayDocRef,
        { playlists: updatedPlaylists },
        { merge: true },
      );

      toast.dismiss(loadingToast);
      toast.success("Slide saved successfully!");

      closeEditModal();
    } catch (error) {
      console.error("Error saving modal changes to Firebase:", error);
      toast.dismiss(loadingToast);
      toast.error("Error saving slide: " + error.message);
    }
  };

  const updateSlideType = async (playlistId, slideId, type) => {
    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id === playlistId) {
        const updatedSlides = playlist.slides.map((slide) =>
          slide.id === slideId
            ? {
                ...slide,
                type,
                text: type === "image" ? "" : slide.text,
                imageUrl: type === "text" ? "" : slide.imageUrl,
                imagePosition:
                  type === "image"
                    ? slide.imagePosition || "center"
                    : slide.imagePosition,
              }
            : slide,
        );
        return { ...playlist, slides: updatedSlides };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const saveSlideEffects = async (playlistId, slideId, effects) => {
    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      return {
        ...playlist,
        slides: playlist.slides.map((slide) =>
          slide.id === slideId ? { ...slide, effects } : slide,
        ),
      };
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const confirmDeleteSlide = (slide, playlistId) => {
    setSlideToDelete({ slide, playlistId });
  };

  const removeSlide = async (playlistId, slideId) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    const slideToRemove = playlist?.slides.find(
      (slide) => slide.id === slideId,
    );

    if (slideToRemove) {
      await moveSlideToTrash(slideToRemove, playlistId);
    }
  };

  const toggleSlideTimeRestriction = async (playlistId, slideId) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    const slide = playlist?.slides.find((s) => s.id === slideId);
    const tr = slide?.timeRestriction;
    const currentlyActive = tr
      ? (tr.timeEnabled !== undefined ? tr.timeEnabled : !!tr.enabled) ||
        (tr.dateEnabled !== undefined ? tr.dateEnabled : !!tr.enabled)
      : false;
    const willEnable = !currentlyActive;
    const slideName = slide?.name || "Slide";

    const updatedPlaylists = playlists.map((p) => {
      if (p.id === playlistId) {
        const updatedSlides = p.slides.map((s) =>
          s.id === slideId
            ? {
                ...s,
                timeRestriction: {
                  ...s.timeRestriction,
                  enabled: willEnable,
                  timeEnabled: willEnable,
                  dateEnabled: willEnable,
                },
              }
            : s,
        );
        return { ...p, slides: updatedSlides };
      }
      return p;
    });

    toast.success(
      `"${slideName}" tijdvenster ${willEnable ? "ingeschakeld" : "uitgeschakeld"}`,
    );
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const toggleSlideVisibility = async (playlistId, slideId) => {
    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id === playlistId) {
        const updatedSlides = playlist.slides.map((slide) =>
          slide.id === slideId
            ? { ...slide, isVisible: !slide.isVisible }
            : slide,
        );
        return { ...playlist, slides: updatedSlides };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const handleImageUpload = async (playlistId, slideId, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecteer een geldig afbeeldingsbestand.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Afbeelding moet kleiner zijn dan 5MB.");
      return;
    }

    setUploadingImage(true);
    const loadingToast = toast.loading("Afbeelding uploaden...");

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = tenantStorageRef(
        storage,
        tenantId,
        `slides/${fileName}`,
      );

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const updatedPlaylists = playlists.map((playlist) => {
        if (playlist.id === playlistId) {
          const updatedSlides = playlist.slides.map((slide) =>
            slide.id === slideId
              ? {
                  ...slide,
                  imageUrl: downloadURL,
                  imageName: fileName,
                  type: "image",
                  imagePosition: slide.imagePosition || "center",
                }
              : slide,
          );
          return { ...playlist, slides: updatedSlides };
        }
        return playlist;
      });
      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);

      toast.dismiss(loadingToast);
      toast.success("Afbeelding succesvol geüpload!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.dismiss(loadingToast);
      toast.error("Fout bij uploaden: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async (playlistId, slideId) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    const slide = playlist?.slides.find((slide) => slide.id === slideId);

    if (slide && slide.imageUrl && slide.imageName) {
      const loadingToast = toast.loading("Afbeelding verwijderen...");

      try {
        const imageRef = tenantStorageRef(
          storage,
          tenantId,
          `slides/${slide.imageName}`,
        );
        await deleteObject(imageRef);

        const updatedPlaylists = playlists.map((playlist) => {
          if (playlist.id === playlistId) {
            const updatedSlides = playlist.slides.map((s) =>
              s.id === slideId
                ? { ...s, imageUrl: "", imageName: "", type: "text" }
                : s,
            );
            return { ...playlist, slides: updatedSlides };
          }
          return playlist;
        });
        setPlaylists(updatedPlaylists);
        await savePlaylistsToFirebase(updatedPlaylists);

        toast.dismiss(loadingToast);
        toast.success("Afbeelding succesvol verwijderd!");
      } catch (error) {
        console.error("Error removing image:", error);
        toast.dismiss(loadingToast);
        toast.error("Fout bij verwijderen: " + error.message);
      }
    }
  };

  const reorderSlides = async (playlistId, newSlides) => {
    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id === playlistId) {
        const totalDuration = calculatePlaylistDuration(newSlides);
        return { ...playlist, slides: newSlides, totalDuration };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const deleteDevice = async (deviceId) => {
    try {
      await deleteDoc(doc(db, "devices", deviceId));
      dispatch(clearDeviceToDelete());
      toast.success("Apparaat succesvol ontkoppeld");
    } catch (error) {
      console.error("Error removing device:", error);
      toast.error("Fout bij het ontkoppelen van apparaat");
    }
  };

  // Move slide functionality
  const openMoveSlideModal = (slide, playlistId) => {
    setSlideToMove(slide);
    setCurrentPlaylistId(playlistId);
    setMoveSlideModalOpen(true);
  };

  const closeMoveSlideModal = () => {
    setMoveSlideModalOpen(false);
    setSlideToMove(null);
    setCurrentPlaylistId(null);
  };

  // Trash functionality
  const openTrashModal = () => {
    setTrashModalOpen(true);
  };

  const closeTrashModal = () => {
    setTrashModalOpen(false);
  };

  const restoreSlideFromTrash = async (trashedSlide, targetPlaylistId) => {
    const loadingToast = toast.loading(
      `${trashedSlide.name || "slide"} herstellen...`,
    );

    try {
      // Create a new slide object without trash metadata
      const {
        trashId,
        originalPlaylistId,
        originalPlaylistName,
        deletedAt,
        ...slideData
      } = trashedSlide;

      // Add to target playlist
      const updatedPlaylists = playlists.map((playlist) => {
        if (playlist.id === targetPlaylistId) {
          const newSlides = [...playlist.slides, slideData];
          const totalDuration = calculatePlaylistDuration(newSlides);
          return { ...playlist, slides: newSlides, totalDuration };
        }
        return playlist;
      });

      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);

      // Remove from trash
      await deleteDoc(tenantDoc(db, tenantId, "trash", trashId));

      // Update local trash state
      setTrashedSlides((prev) =>
        prev.filter((slide) => slide.trashId !== trashId),
      );

      toast.dismiss(loadingToast);
      toast.success(`${trashedSlide.name || "Slide"} succesvol hersteld!`);
    } catch (error) {
      console.error("Error restoring slide:", error);
      toast.dismiss(loadingToast);
      toast.error(`Fout bij herstellen van slide: ` + error.message);
    }
  };

  const permanentDeleteSlide = async (trashedSlide) => {
    const loadingToast = toast.loading(
      `${trashedSlide.name || "slide"} permanent verwijderen...`,
    );

    try {
      // Delete image from storage if exists
      if (trashedSlide.imageUrl && trashedSlide.imageName) {
        try {
          const imageRef = tenantStorageRef(
            storage,
            tenantId,
            `slides/${trashedSlide.imageName}`,
          );
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }

      // Remove from trash collection
      await deleteDoc(tenantDoc(db, tenantId, "trash", trashedSlide.trashId));

      // Update local trash state
      setTrashedSlides((prev) =>
        prev.filter((slide) => slide.trashId !== trashedSlide.trashId),
      );

      toast.dismiss(loadingToast);
      toast.success(`${trashedSlide.name || "Slide"} permanent verwijderd`);
    } catch (error) {
      console.error("Error permanently deleting slide:", error);
      toast.dismiss(loadingToast);
      toast.error(`Fout bij permanent verwijderen: ` + error.message);
    }
  };

  const emptyTrash = async () => {
    const loadingToast = toast.loading(`Prullenbak legen...`);

    try {
      // Delete all images from storage
      for (const slide of trashedSlides) {
        if (slide.imageUrl && slide.imageName) {
          try {
            const imageRef = tenantStorageRef(
              storage,
              tenantId,
              `slides/${slide.imageName}`,
            );
            await deleteObject(imageRef);
          } catch (error) {
            console.error("Error deleting image:", error);
          }
        }
      }

      // Delete all trash documents
      const deletePromises = trashedSlides.map((slide) =>
        deleteDoc(tenantDoc(db, tenantId, "trash", slide.trashId)),
      );
      await Promise.all(deletePromises);

      // Clear local trash state
      setTrashedSlides([]);

      toast.dismiss(loadingToast);
      toast.success(`Prullenbak succesvol geleegd`);
    } catch (error) {
      console.error("Error emptying trash:", error);
      toast.dismiss(loadingToast);
      toast.error(`Fout bij legen van prullenbak: ` + error.message);
    }
  };

  const moveSlide = async (slide, fromPlaylistId, toPlaylistId) => {
    if (!slide || !fromPlaylistId || !toPlaylistId) return;

    const loadingToast = toast.loading(`Moving "${slide.name}"...`);

    try {
      // Remove slide from source playlist
      const updatedPlaylists = playlists.map((playlist) => {
        if (playlist.id === fromPlaylistId) {
          const newSlides = playlist.slides.filter((s) => s.id !== slide.id);
          const totalDuration = calculatePlaylistDuration(newSlides);
          return { ...playlist, slides: newSlides, totalDuration };
        }
        if (playlist.id === toPlaylistId) {
          const newSlides = [...playlist.slides, slide];
          const totalDuration = calculatePlaylistDuration(newSlides);
          return { ...playlist, slides: newSlides, totalDuration };
        }
        return playlist;
      });

      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);

      toast.dismiss(loadingToast);
      toast.success(`"${slide.name}" moved successfully!`);
    } catch (error) {
      console.error("Error moving slide:", error);
      toast.dismiss(loadingToast);
      toast.error(`Error moving "${slide.name}": ` + error.message);
    }
  };

  return (
    <div
      className={`admin-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      {/* Fixed Left Sidebar */}
      <Sidebar
        setDeviceToDelete={(device) => dispatch(setDeviceToDelete(device))}
        deleteDevice={deleteDevice}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        onOpenTrash={openTrashModal}
        trashedSlidesCount={trashedSlides.length}
        tenantName={tenantName}
      />

      {/* Main Content Area */}
      <div className="admin-main-content">
        <div className="admin-header-section">
          <div className="admin-header-content">
            <button
              className="admin-layout-btn"
              title="Terug naar overzicht"
              onClick={() => {
                window.location.href = "/admin";
              }}
            >
              <Undo2 size={16} />
            </button>

            <div className="d-flex" style={{ flexGrow: "1" }}>
              {tenantLogoUrl && (
                <img
                  src={tenantLogoUrl}
                  alt={tenantName}
                  height={40}
                  className="admin-tenant-logo"
                />
              )}
              <h1 className="admin-header">
                {tenantName
                  ? `${tenantName} - Afspeellijsten`
                  : "Afspeellijsten"}
              </h1>
            </div>

            <div className="admin-stats">
              <div className="admin-slide-count">
                <span className="admin-stat-value">
                  <Monitor size={18} />
                  <span>
                    {totalStats.activeSlides}/{totalStats.totalSlides}
                  </span>
                </span>
              </div>
              <div className="admin-duration">
                <span className="admin-stat-value">
                  <Clock size={18} />
                  <span>{formatDuration(totalStats.totalDuration)}</span>
                </span>
              </div>
            </div>
            <button
              className="admin-layout-btn"
              onClick={toggleGlobalLayout}
              title={
                globalLayout === "grid"
                  ? "Switch to list view"
                  : "Switch to grid view"
              }
            >
              {globalLayout === "grid" ? (
                <List size={18} />
              ) : (
                <LayoutGrid size={16} />
              )}
            </button>

            <button
              className="admin-layout-btn"
              onClick={() => window.open(`/preview/${tenantId}`, "_blank")}
              title="Preview afspeellijsten"
            >
              <MonitorPlay size={18} />
            </button>

            <button
              className="admin-settings-btn"
              onClick={toggleSidebarCollapse}
              title={isSidebarCollapsed ? "Open settings" : "Close settings"}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        <PlaylistList
          playlists={playlists}
          expandedPlaylists={expandedPlaylists}
          onToggleExpansion={togglePlaylistExpansion}
          globalLayout={globalLayout}
          onAddPlaylist={handleAddPlaylist}
          onReorderPlaylists={reorderPlaylists}
          onUpdatePlaylistName={updatePlaylistName}
          onUpdatePlaylistRepeatCount={updatePlaylistRepeatCount}
          onTogglePlaylistEnabled={togglePlaylistEnabled}
          onCopyPlaylist={confirmCopyPlaylist}
          onConfirmDeletePlaylist={confirmDeletePlaylist}
          modules={modules}
          slideTypes={slideTypes}
          onSaveSlideEffects={saveSlideEffects}
          onEditSlide={openEditModal}
          onUpdateSlideType={updateSlideType}
          onToggleSlideVisibility={toggleSlideVisibility}
          onToggleSlideTimeRestriction={toggleSlideTimeRestriction}
          onConfirmDeleteSlide={confirmDeleteSlide}
          onRemoveSlide={removeSlide}
          onImageUpload={handleImageUpload}
          onRemoveImage={removeImage}
          onCopySlide={copySlide}
          onReorderSlides={reorderSlides}
          onAddSlide={addSlide}
          onMoveSlide={openMoveSlideModal}
          uploadingImage={uploadingImage}
          calculatePlaylistDuration={calculatePlaylistDuration}
          formatDuration={formatDuration}
          editingPlaylistNameId={editingPlaylistNameId}
          editingPlaylistName={editingPlaylistName}
          onStartEditingPlaylistName={startEditingPlaylistName}
          onSavePlaylistName={savePlaylistName}
          onCancelEditingPlaylistName={cancelEditingPlaylistName}
          onPlaylistNameKeyPress={handlePlaylistNameKeyPress}
          editingPlaylistRepeatCountId={editingPlaylistRepeatCountId}
          editingPlaylistRepeatCount={editingPlaylistRepeatCount}
          onStartEditingPlaylistRepeatCount={startEditingPlaylistRepeatCount}
          onSavePlaylistRepeatCount={savePlaylistRepeatCount}
          onCancelEditingPlaylistRepeatCount={cancelEditingPlaylistRepeatCount}
          onPlaylistRepeatCountKeyPress={handlePlaylistRepeatCountKeyPress}
        />
      </div>

      {/* Edit Modal */}
      {editingSlide && (
        <EditModal
          slide={editingSlide}
          slideTypes={slideTypes}
          modalImageUrl={modalImageUrl}
          modalTinyMCEContent={modalTinyMCEContent}
          imagePosition={imagePosition}
          slideLayout={slideLayout}
          uploadingImage={uploadingImage}
          slideName={modalSlideName}
          slideDuration={modalSlideDuration}
          showBar={modalShowBar}
          onClose={closeEditModal}
          onSave={saveModalChanges}
          onDelete={() =>
            setSlideToDelete({
              slide: editingSlide,
              playlistId: currentEditingPlaylistId,
            })
          }
          onImageUpload={handleModalImageUpload}
          onPositionChange={setImagePosition}
          onLayoutChange={setSlideLayout}
          onContentChange={handleContentChange}
          onSlideNameChange={setModalSlideName}
          onDurationChange={setModalSlideDuration}
          onShowBarChange={setModalShowBar}
          videoUrl={modalVideoUrl}
          onVideoUrlChange={setModalVideoUrl}
          videoSound={modalVideoSound}
          onVideoSoundChange={setModalVideoSound}
          imageSide={modalImageSide}
          onImageSideChange={setModalImageSide}
          slideTransition={modalSlideTransition}
          onTransitionChange={setModalSlideTransition}
          enabledFonts={enabledFonts}
          typography={typography}
          teletekstChannel={modalTeletekstChannel}
          teletekstTheme={modalTeletekstTheme}
          teletekstPages={modalTeletekstPages}
          teletekstSkipTopLines={modalTeletekstSkipTopLines}
          teletekstSkipBottomLines={modalTeletekstSkipBottomLines}
          onTeletekstChannelChange={setModalTeletekstChannel}
          onTeletekstThemeChange={setModalTeletekstTheme}
          onTeletekstPagesChange={setModalTeletekstPages}
          onTeletekstSkipTopLinesChange={setModalTeletekstSkipTopLines}
          onTeletekstSkipBottomLinesChange={setModalTeletekstSkipBottomLines}
          iframeUrl={modalIframeUrl}
          onIframeUrlChange={setModalIframeUrl}
          onToggleSlideVisibility={(slideId) => {
            toggleSlideVisibility(currentEditingPlaylistId, slideId);
            setEditingSlide((prev) => ({
              ...prev,
              isVisible: !prev.isVisible,
            }));
          }}
          onOpenLibrary={handleOpenImageLibrary}
          timeRestriction={modalTimeRestriction}
          onTimeRestrictionChange={setModalTimeRestriction}
          galleryImages={modalGalleryImages}
          onGalleryImageAdd={handleGalleryImageAdd}
          onGalleryImageRemove={handleGalleryImageRemove}
          onGalleryImageDurationChange={handleGalleryImageDurationChange}
          uploadingGalleryImage={uploadingGalleryImage}
          onOpenGalleryLibrary={() => setGalleryLibraryModalOpen(true)}
          onGalleryReorder={handleGalleryReorder}
          countdownTitle={modalCountdownTitle}
          onCountdownTitleChange={setModalCountdownTitle}
          countdownTargetDate={modalCountdownTargetDate}
          onCountdownTargetDateChange={setModalCountdownTargetDate}
          countdownBgImage={modalCountdownBgImage}
          onCountdownBgImageUpload={handleModalCountdownBgImageUpload}
          countdownBgImagePosition={modalCountdownBgImagePosition}
          onCountdownBgImagePositionChange={setModalCountdownBgImagePosition}
          countdownTextColor={modalCountdownTextColor}
          onCountdownTextColorChange={setModalCountdownTextColor}
          countdownNumberColor={modalCountdownNumberColor}
          onCountdownNumberColorChange={setModalCountdownNumberColor}
          countdownBlockBg={modalCountdownBlockBg}
          onCountdownBlockBgChange={setModalCountdownBlockBg}
          countdownLabelColor={modalCountdownLabelColor}
          onCountdownLabelColorChange={setModalCountdownLabelColor}
          onOpenCountdownLibrary={handleOpenCountdownBgLibrary}
          agendaCalendars={modalAgendaCalendars}
          onAgendaCalendarsChange={setModalAgendaCalendars}
          agendaTitle={modalAgendaTitle}
          onAgendaTitleChange={setModalAgendaTitle}
          agendaDaysAhead={modalAgendaDaysAhead}
          onAgendaDaysAheadChange={setModalAgendaDaysAhead}
          agendaMaxEvents={modalAgendaMaxEvents}
          onAgendaMaxEventsChange={setModalAgendaMaxEvents}
          agendaBgColor={modalAgendaBgColor}
          onAgendaBgColorChange={setModalAgendaBgColor}
          agendaTextColor={modalAgendaTextColor}
          onAgendaTextColorChange={setModalAgendaTextColor}
          emailProvider={modalEmailProvider}
          onEmailProviderChange={setModalEmailProvider}
          emailCredentials={modalEmailCredentials}
          onEmailCredentialsChange={setModalEmailCredentials}
          emailMaxItems={modalEmailMaxItems}
          onEmailMaxItemsChange={setModalEmailMaxItems}
          emailShowUnreadOnly={modalEmailShowUnreadOnly}
          onEmailShowUnreadOnlyChange={setModalEmailShowUnreadOnly}
          emailBgColor={modalEmailBgColor}
          onEmailBgColorChange={setModalEmailBgColor}
          emailTextColor={modalEmailTextColor}
          onEmailTextColorChange={setModalEmailTextColor}
          emailAccentColor={modalEmailAccentColor}
          onEmailAccentColorChange={setModalEmailAccentColor}
          sportlinkApiKey={tenantSportlinkApiKey || modalSportlinkApiKey}
          sportlinkDataType={getSportlinkDataType(
            slideLayout,
            modalSportlinkDataType,
          )}
          sportlinkTeams={modalSportlinkTeams}
          onSportlinkTeamsChange={setModalSportlinkTeams}
          sportlinkTitle={modalSportlinkTitle}
          onSportlinkTitleChange={setModalSportlinkTitle}
          sportlinkMaxItems={modalSportlinkMaxItems}
          onSportlinkMaxItemsChange={setModalSportlinkMaxItems}
          sportlinkBgColor={modalSportlinkBgColor}
          onSportlinkBgColorChange={setModalSportlinkBgColor}
          sportlinkTextColor={modalSportlinkTextColor}
          onSportlinkTextColorChange={setModalSportlinkTextColor}
          sportlinkAccentColor={modalSportlinkAccentColor}
          onSportlinkAccentColorChange={setModalSportlinkAccentColor}
          sportlinkHeaderTextColor={modalSportlinkHeaderTextColor}
          onSportlinkHeaderTextColorChange={setModalSportlinkHeaderTextColor}
          sportlinkDate={modalSportlinkDate}
          onSportlinkDateChange={setModalSportlinkDate}
          sportlinkShowVeldInfo={modalSportlinkShowVeldInfo}
          onSportlinkShowVeldInfoChange={setModalSportlinkShowVeldInfo}
          sportlinkOnlyThuis={modalSportlinkOnlyThuis}
          onSportlinkOnlyThuisChange={setModalSportlinkOnlyThuis}
          weatherLat={modalWeatherLat}
          onWeatherLatChange={setModalWeatherLat}
          weatherLong={modalWeatherLong}
          onWeatherLongChange={setModalWeatherLong}
          weatherCity={modalWeatherCity}
          onWeatherCityChange={setModalWeatherCity}
          weatherAccentColor={modalWeatherAccentColor}
          onWeatherAccentColorChange={setModalWeatherAccentColor}
          weatherLeftAccentColor={modalWeatherLeftAccentColor}
          onWeatherLeftAccentColorChange={setModalWeatherLeftAccentColor}
          weatherLeftTextColor={modalWeatherLeftTextColor}
          onWeatherLeftTextColorChange={setModalWeatherLeftTextColor}
          weatherForecastDays={modalWeatherForecastDays}
          onWeatherForecastDaysChange={setModalWeatherForecastDays}
          weatherLeftBgImage={modalWeatherLeftBgImage}
          onWeatherLeftBgImageUpload={handleModalWeatherLeftBgImageUpload}
          weatherLeftBgImagePosition={modalWeatherLeftBgImagePosition}
          onWeatherLeftBgImagePositionChange={
            setModalWeatherLeftBgImagePosition
          }
          onOpenWeatherLeftLibrary={handleOpenWeatherLeftBgLibrary}
          qrUrl={modalQrUrl}
          onQrUrlChange={setModalQrUrl}
          qrLabel={modalQrLabel}
          onQrLabelChange={setModalQrLabel}
          qrLeftBgColor={modalQrLeftBgColor}
          onQrLeftBgColorChange={setModalQrLeftBgColor}
          qrDotsColor={modalQrDotsColor}
          onQrDotsColorChange={setModalQrDotsColor}
          qrPanelColor={modalQrPanelColor}
          onQrPanelColorChange={setModalQrPanelColor}
          qrPanelTextColor={modalQrPanelTextColor}
          onQrPanelTextColorChange={setModalQrPanelTextColor}
          qrTextSlides={modalQrTextSlides}
          onQrTextSlidesChange={setModalQrTextSlides}
          qrTextInterval={modalQrTextInterval}
          onQrTextIntervalChange={setModalQrTextInterval}
          onQrSlideImageUpload={handleQrSlideImageUpload}
          onOpenQrSlideLibrary={handleOpenQrSlideLibrary}
          uploadingQrSlideId={uploadingQrSlideId}
          modules={modules}
          onSaveSlideEffects={(effects) => {
            saveSlideEffects(
              currentEditingPlaylistId,
              editingSlide.id,
              effects,
            );
            setEditingSlide((prev) => ({ ...prev, effects }));
          }}
        />
      )}

      {/* Unpair Confirmation Modal */}
      {deviceToDelete && (
        <div className="slide-delete-modal-wrapper">
          <div
            className="modal-overlay"
            onClick={() => dispatch(clearDeviceToDelete())}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Apparaat ontkoppelen</h3>
                <button
                  onClick={() => dispatch(clearDeviceToDelete())}
                  className="modal-close-btn"
                  title="Sluiten"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p className="modal-description">
                  Weet je zeker dat je{" "}
                  <strong>
                    {deviceToDelete.customName ||
                      `Display ${deviceToDelete.id.substring(0, 8)}`}
                  </strong>{" "}
                  wilt ontkoppelen?
                </p>
                <p className="delete-warning">
                  Dit apparaat zal niet meer gekoppeld zijn en moet opnieuw
                  gekoppeld worden om content te tonen.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  onClick={() => dispatch(clearDeviceToDelete())}
                  className="btn btn-secondary"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => deleteDevice(deviceToDelete.id)}
                  className="btn btn-danger"
                >
                  Ontkoppelen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Deletion Confirmation Modal */}
      {playlistToDelete && (
        <div className="slide-delete-modal-wrapper">
          <div
            className="modal-overlay"
            onClick={() => setPlaylistToDelete(null)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Playlist verwijderen</h3>
                <button
                  onClick={() => setPlaylistToDelete(null)}
                  className="modal-close-btn"
                  title="Sluiten"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p className="modal-description">
                  Weet je zeker dat je
                  <strong> {playlistToDelete.name}</strong> wilt verwijderen?
                </p>
                <p className="delete-warning">
                  Deze actie kan niet ongedaan worden gemaakt. Alle slides en
                  afbeeldingen in deze playlist zullen permanent worden
                  verwijderd.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  onClick={() => setPlaylistToDelete(null)}
                  className="btn btn-secondary"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleDeletePlaylist}
                  className="btn btn-danger"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Copy Confirmation Modal */}
      {playlistToCopy && (
        <div className="slide-delete-modal-wrapper">
          <div
            className="modal-overlay"
            onClick={() => setPlaylistToCopy(null)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Playlist kopiëren</h3>
                <button
                  onClick={() => setPlaylistToCopy(null)}
                  className="modal-close-btn"
                  title="Sluiten"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p className="modal-description">
                  Weet je zeker dat je
                  <strong> {playlistToCopy.name}</strong> wilt kopiëren?
                </p>
                <p>
                  Er wordt een kopie aangemaakt met de naam{" "}
                  <strong>{playlistToCopy.name} (Copy)</strong>.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  onClick={() => setPlaylistToCopy(null)}
                  className="btn btn-secondary"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleCopyPlaylist}
                  className="btn btn-primary"
                >
                  Kopiëren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Slide Modal */}
      <AddSlideModal
        isOpen={addSlideModalOpen}
        onClose={() => setAddSlideModalOpen(false)}
        onConfirm={confirmAddSlide}
        slideTypes={slideTypes}
      />

      {/* Move Slide Modal */}
      <MoveSlideModal
        isOpen={moveSlideModalOpen}
        onClose={closeMoveSlideModal}
        slide={slideToMove}
        playlists={playlists}
        currentPlaylistId={currentPlaylistId}
        onMoveSlide={moveSlide}
      />

      {/* Image Library Modal */}
      <ImageLibraryModal
        isOpen={imageLibraryModalOpen}
        onClose={() => setImageLibraryModalOpen(false)}
        onSelectImage={handleSelectImageFromLibrary}
      />

      {/* Gallery Image Library Modal */}
      <ImageLibraryModal
        isOpen={galleryLibraryModalOpen}
        onClose={() => setGalleryLibraryModalOpen(false)}
        onSelectImage={handleSelectGalleryImageFromLibrary}
        multiple
      />

      {/* Trash Modal */}
      <TrashModal
        isOpen={trashModalOpen}
        onClose={closeTrashModal}
        trashedSlides={trashedSlides}
        playlists={playlists}
        onRestoreSlide={restoreSlideFromTrash}
        onPermanentDelete={permanentDeleteSlide}
        onEmptyTrash={emptyTrash}
      />

      {/* Slide Delete Confirmation Modal */}
      {slideToDelete &&
        ReactDOM.createPortal(
          <div className="slide-delete-modal-wrapper">
            <div
              className="modal-overlay"
              onClick={() => setSlideToDelete(null)}
            >
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3>Slide verwijderen</h3>
                  <button
                    onClick={() => setSlideToDelete(null)}
                    className="modal-close-btn"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <p className="modal-description">
                    Weet je zeker dat je{" "}
                    <strong>{slideToDelete.slide.name || "Slide"}</strong> wilt
                    verwijderen?
                  </p>
                  <p className="delete-warning">
                    De slide wordt verplaatst naar de prullenbak en kan later
                    worden hersteld.
                  </p>
                </div>

                <div className="modal-footer">
                  <button
                    onClick={() => setSlideToDelete(null)}
                    className="btn btn-secondary"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={() => {
                      deleteSlide(
                        slideToDelete.slide.id,
                        slideToDelete.playlistId,
                      );
                      setSlideToDelete(null);
                      closeEditModal();
                    }}
                    className="btn btn-danger"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default AdminView;
