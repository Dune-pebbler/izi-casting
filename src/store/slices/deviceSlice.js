import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  deviceToDelete: null,
  linkedDevices: [],
  showPairingForm: false,
  isPairing: false,
  pairingError: '',
  // DisplayView states
  isPaired: false,
  deviceId: '',
  displayPairingCode: '',
  isGeneratingCode: false,
  codeTimeRemaining: 30,
  isCodeFlashing: false,
  // UI states
  isSidebarCollapsed: false,
};

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    setDeviceToDelete: (state, action) => {
      state.deviceToDelete = action.payload;
    },
    clearDeviceToDelete: (state) => {
      state.deviceToDelete = null;
    },
    setLinkedDevices: (state, action) => {
      state.linkedDevices = action.payload;
    },
    setShowPairingForm: (state, action) => {
      state.showPairingForm = action.payload;
    },
    setIsPairing: (state, action) => {
      state.isPairing = action.payload;
    },
    setPairingError: (state, action) => {
      state.pairingError = action.payload;
    },
    clearPairingError: (state) => {
      state.pairingError = '';
    },
    // DisplayView actions
    setIsPaired: (state, action) => {
      state.isPaired = action.payload;
    },
    setDeviceId: (state, action) => {
      state.deviceId = action.payload;
    },
    setDisplayPairingCode: (state, action) => {
      state.displayPairingCode = action.payload;
    },
    setIsGeneratingCode: (state, action) => {
      state.isGeneratingCode = action.payload;
    },
    setCodeTimeRemaining: (state, action) => {
      state.codeTimeRemaining = action.payload;
    },
    setIsCodeFlashing: (state, action) => {
      state.isCodeFlashing = action.payload;
    },
    setIsSidebarCollapsed: (state, action) => {
      state.isSidebarCollapsed = action.payload;
    },
  },
});

export const { 
  setDeviceToDelete, 
  clearDeviceToDelete,
  setLinkedDevices,
  setShowPairingForm,
  setIsPairing,
  setPairingError,
  clearPairingError,
  // DisplayView actions
  setIsPaired,
  setDeviceId,
  setDisplayPairingCode,
  setIsGeneratingCode,
  setCodeTimeRemaining,
  setIsCodeFlashing,
  // UI actions
  setIsSidebarCollapsed
} = deviceSlice.actions;
export default deviceSlice.reducer;
