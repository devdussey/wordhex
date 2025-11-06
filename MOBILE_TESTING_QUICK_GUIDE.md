# Mobile Testing Quick Guide

## Test on Your Device Now

### iOS (iPhone/iPad)

**1. Open Discord App**
- Make sure you have Discord iOS app installed
- Version 160+ recommended

**2. Find Your Activity**
- Go to any Discord server
- Tap your profile picture → Activities
- Or find WordHex in Activity menu

**3. Test Scenarios**
```
✅ App loads without errors
✅ Text is readable (not too small)
✅ Buttons are easy to tap (not too small)
✅ No horizontal scrolling needed
✅ Portrait & landscape both work
✅ Login with Discord works
✅ Can play a full game
✅ Real-time updates work
```

---

### Android

**1. Open Discord App**
- Discord Android app
- Version 160+ recommended

**2. Find WordHex Activity**
- Tap profile → Activities
- Select WordHex

**3. Test Same Scenarios**
```
Same as iOS above
```

---

## DevTools Simulation

**Don't have mobile device?** Use Chrome DevTools:

### 1. Open DevTools
```
F12 or Cmd+Option+I
```

### 2. Toggle Device Mode
```
Ctrl+Shift+M (Windows)
Cmd+Shift+M (Mac)
```

### 3. Select Device
- iPhone 14 (390x844)
- iPhone SE (375x667)
- Pixel 6 (412x915)
- iPad (768x1024)

### 4. Test Scenarios
- Tap buttons (click with mouse)
- Rotate device (Chrome DevTools icon)
- Throttle network (Slow 4G)
- Check responsive breakpoints

---

## Responsive Breakpoints

Your app adapts at:

| Width | Device | Breakpoint |
|-------|--------|-----------|
| <640px | Small phone | `default` |
| 640px | Phone | `sm:` |
| 768px | Tablet | `md:` |
| 1024px | Tablet/Desktop | `lg:` |

**Test by resizing Chrome to:**
- 320px (smallest phones)
- 390px (modern phones)
- 768px (tablets)
- 1024px (desktops)

---

## Performance Testing

### Load Time
```
Chrome DevTools → Network tab
Check:
- Total size <200KB
- Load time <2s on throttled
- No console errors
```

### FPS & Jank
```
Chrome DevTools → Performance tab
1. Press Record
2. Play game for 10 seconds
3. Stop recording
4. Check for jank (drops below 60fps)
```

### Memory Leaks
```
Chrome DevTools → Memory tab
1. Take heap snapshot
2. Play game for 5 mins
3. Take another snapshot
4. Check growth (should be <10MB)
```

---

## Touch Testing

### Things to Test

**Tap Target Size**
- Buttons should be 48px+ minimum
- Spacing between buttons ≥16px

**Visual Feedback**
- Button highlights on press
- Animations are smooth (60fps)
- No delayed response (>100ms)

**Gestures**
- Can tap menu buttons
- Can tap game tiles
- Can scroll if needed
- Long-press works (if implemented)

### Test with Real Phone

1. Open **Discord app** on phone
2. Navigate to WordHex activity
3. **Tap buttons** - should respond instantly
4. **Play a game** - should be smooth
5. **Rotate phone** - layout should adapt

---

## Network Testing

### Simulate Bad Network

**Chrome DevTools → Network tab**
1. Open DevTools
2. Network tab
3. Throttle dropdown → "Slow 4G"
4. Load app and play

**Expected behavior:**
- ✅ App loads (may be slow)
- ✅ Reconnects on network error
- ✅ Real-time updates eventually come through
- ✅ No crashes

---

## Common Mobile Issues to Check

| Issue | Symptom | Fix |
|-------|---------|-----|
| Text too small | Can't read | Already handled with `sm:` |
| Buttons too small | Hard to tap | Already ≥48px |
| Horizontal scroll | Need to scroll left/right | Check on actual device |
| Notch overlap | Content hidden | Optional: add safe-area padding |
| Slow load | Takes >3s | Check network throttling |
| Jank/lag | Stutters during game | Check performance tab |

---

## Automated Testing (Optional)

### Lighthouse Mobile Audit
```
Chrome → F12 → Lighthouse
Select "Mobile"
Click "Analyze page load"
Look for score >90
```

### Responsive Design Checker
```
Chrome → F12 → Device mode
Try all breakpoints
Check layout doesn't break
```

---

## Debugging on Mobile

### See Console Errors
```
1. Open Discord on mobile
2. Long-press on app
3. Tap "Inspect Element"
4. Go to Console tab
5. Check for red errors
```

### Check Logs
```
Your app logs to:
- Browser console
- Error tracking service (if configured)
```

---

## What to Verify

### Functionality ✅
- [ ] App loads on Discord mobile
- [ ] Can log in with Discord
- [ ] Can create lobby
- [ ] Can play game
- [ ] Can see leaderboard
- [ ] Real-time updates work

### Design ✅
- [ ] Text readable (not too small)
- [ ] Buttons easy to tap (≥48px)
- [ ] No horizontal scrolling
- [ ] Proper spacing (no crowding)
- [ ] Images scale correctly

### Performance ✅
- [ ] Loads in <3 seconds
- [ ] Smooth animations (60fps)
- [ ] No memory leaks
- [ ] Works on slow network

### Orientation ✅
- [ ] Works in portrait
- [ ] Works in landscape
- [ ] No layout break on rotate

---

## Report Issues

If you find a mobile issue:

1. **Note the device** (iPhone 14, Pixel 6, etc.)
2. **Note the version** (Discord 160+)
3. **Note the issue** (button not responsive, text too small)
4. **Take a screenshot**
5. **Check console** (F12 → Console)
6. **Report with details**

---

## Quick Checklist

```
📋 Mobile Testing Checklist

Design
  ☐ Text readable on small screen
  ☐ Buttons easy to tap (48px+)
  ☐ No horizontal scrolling
  ☐ Proper spacing between elements

Functionality
  ☐ App loads without errors
  ☐ Discord login works
  ☐ Game plays smoothly
  ☐ Real-time updates work

Performance
  ☐ Loads in <3 seconds
  ☐ 60fps animations
  ☐ No memory leaks
  ☐ Works on 4G

Orientation
  ☐ Portrait mode works
  ☐ Landscape mode works
  ☐ Smooth rotation
```

---

**Status**: Your app is mobile-ready! ✅
