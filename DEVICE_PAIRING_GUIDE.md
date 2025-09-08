# Device Pairing System Guide

## Overview

The izi-casting application now includes a device pairing system that allows you to securely connect display devices to your admin panel. This system uses a simple 5-digit pairing code that doesn't require revalidation.

## How It Works

### For Display Devices

1. **Access Pairing Screen**:
   - Navigate to the display URL (e.g., `test.izi-casting.nl`)
   - If the device is not paired, you'll see the pairing screen with:
     - Izi Casting logo
     - "Apparaat koppelen" heading
     - Instructions in Dutch
     - A generated 5-digit pairing code displayed prominently

2. **Display Pairing Code**:
   - The display automatically generates a unique 5-digit pairing code
   - The code is displayed in large, easy-to-read digits
   - The code is valid for 24 hours
   - You can generate a new code by clicking "Nieuwe code"

3. **Complete Pairing**:
   - Once the admin enters the code in the admin panel, the device will be automatically paired
   - The display will immediately show your content
   - No manual submission required on the display side

### For Admin Users

1. **Enter Pairing Code**: 
   - Go to the admin panel (`/admin`)
   - In the sidebar, under "Gekoppelde apparaten", click "Apparaat koppelen"
   - Enter the 5-digit code shown on the display device
   - The form supports:
     - Auto-focus to next input when typing
     - Backspace to previous input
     - Paste functionality for the entire code
     - Only numeric input allowed
     - Enter key to submit

2. **Monitor Connected Devices**:
   - The sidebar shows all connected devices under "Gekoppelde apparaten"
   - Each device shows:
     - **Custom Name** (editable) or Device ID (shortened for display)
     - Online/Offline status (based on last activity within 5 minutes)
     - Screen resolution
     - Last seen timestamp
     - Edit button (pencil icon) to change the device name
     - Delete button (X icon) to remove the device

3. **Customize Device Names**:
   - **Hover over any device name** to reveal the edit button (pencil icon)
   - **Click the edit button** to enter inline editing mode
   - **Type a custom name** (maximum 30 characters)
   - **Press Enter or click the checkmark** to save the name
   - **Press Escape or click the X** to cancel editing
   - **Names are automatically remembered** when devices are re-paired

4. **Delete Devices**:
   - Click the X button next to any device to remove it
   - A confirmation dialog will appear asking "Weet je zeker dat je [Custom Name or Device] wilt ontkoppelen?"
   - Click "Ontkoppelen" to confirm or "Annuleren" to cancel
   - **Immediate Effect**: The display will immediately return to the pairing screen
   - Deleted devices will need to be paired again to show content
   - **Custom names are preserved** and will be restored when the device is re-paired

5. **Generate Codes (Legacy)**:
   - You can still generate codes manually by clicking "Koppelcode genereren"
   - This is mainly for backward compatibility and testing

## Technical Details

### Device Identification
- Each device generates a unique ID based on browser fingerprint and timestamp
- The ID is stored in localStorage for persistence
- No revalidation is required - once paired, the device stays connected

### Security Features
- 5-digit numeric codes (10,000 possible combinations)
- Codes are single-use only
- Codes expire after 24 hours
- Device information is collected for admin monitoring
- No sensitive data is transmitted

### Data Storage
- **Pairing Codes**: Stored in Firestore collection `pairing_codes`
- **Devices**: Stored in Firestore collection `devices`
- **Device Info**: Includes user agent, screen resolution, timezone, language

### Online Status
- Devices are considered "online" if they've been active in the last 5 minutes
- Last seen timestamp is updated every minute when paired
- Status is displayed in real-time in the admin panel

### Real-time Pairing Status
- Display devices listen for changes to their pairing status in real-time
- When a device is deleted from the admin panel, the display immediately returns to the pairing screen
- No manual refresh required - changes are instant

## Troubleshooting

### Common Issues

1. **Invalid Pairing Code**:
   - Ensure you're entering the code exactly as shown on the display
   - Codes are single-use only and expire after 24 hours
   - Ask the display to generate a new code if needed

2. **Device Not Showing as Online**:
   - Check if the display page is open and active
   - Refresh the admin panel to see updated status
   - Wait up to 5 minutes for status to update

3. **Pairing Fails**:
   - Check your internet connection
   - Ensure you're entering exactly 5 digits
   - Try refreshing the page and entering the code again
   - Verify the code hasn't expired (24 hours)

4. **Display Not Generating Code**:
   - Refresh the display page
   - Check if the device is already paired
   - Clear browser cache and localStorage if needed

### Reset Device Pairing

To reset a device's pairing:
1. **From Admin Panel**: Click the X button next to the device in the sidebar and confirm deletion
2. **From Display Device**: Clear the browser's localStorage for the display domain and refresh the page
3. The device will show the pairing screen again and need to be re-paired

## API Endpoints

The system uses the following Firestore collections:

- `pairing_codes/{code}` - Stores pairing codes and their usage status
- `devices/{deviceId}` - Stores device information and pairing status

## Future Enhancements

Potential improvements for the pairing system:
- ✅ **Device naming and organization** (Implemented)
- ✅ **Device refresh functionality** (Implemented)
- ✅ **Compact settings view** (Implemented)
- QR code generation for easier pairing
- Bulk device management
- Advanced security features
- Device grouping and content targeting
- Push notifications for new devices
- Device health monitoring
- Bulk naming operations
- Name templates and conventions
- Device name import/export functionality
