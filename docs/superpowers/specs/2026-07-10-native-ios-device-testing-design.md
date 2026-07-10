# Native iOS on-device testing

Date: 2026-07-10  
Status: approved 2026-07-10

## Goal

Add a Capacitor iOS target that can be built, signed, installed, and debugged on the owner's iPhone
directly from this Mac using Xcode. The existing web application remains the shared application
implementation; iOS is a native shell around the same production mobile build used by Android.

Success means:

1. `npm run sync:ios` produces a current native iOS project containing the built web assets and
   synchronized Capacitor plugins.
2. Xcode can build the `App` scheme after the user selects their Apple Account or Personal Team.
3. Xcode installs and launches the app on the paired iPhone.
4. The app can take a photo and choose a photo from the iPhone library after the corresponding
   permission prompts are accepted.
5. Existing web and Android behavior remains unchanged.

## Current state and constraints

- The project uses Capacitor 8.4.1 for the CLI, core runtime, and Android platform.
- `@capacitor/ios` is not installed and the repository has no `ios/` project.
- Xcode 26.2 is installed, satisfying Capacitor 8's Xcode 26.0+ requirement.
- Capacitor 8 supports iOS 15 and newer.
- `capacitor.config.ts` already defines the bundle identifier
  `com.brianwong.championsvgc`, app name `Champions VGC Calc`, and `dist` web directory.
- The native build uses Vite's `capacitor` mode and base `/`, which is already correct for the
  Capacitor WebView.
- Xcode signing identities, Personal Team selection, and provisioning profiles are local user
  settings. They must not be hard-coded or committed.
- A free Apple Account is sufficient for personal on-device testing, but Personal Team provisioning
  expires after seven days and requires periodic rebuild/reinstallation.

## Approaches considered

### 1. Direct Xcode installation over USB — selected

Generate the Capacitor iOS project, open its Xcode workspace, select the user's Personal Team and
connected iPhone, then run the app. This is the shortest path, supports the native debugger and
camera testing, and requires no paid Apple Developer Program membership.

### 2. Wireless Xcode installation

After the iPhone has first been paired with Finder/Xcode over USB, Xcode can target it over Wi-Fi.
This is useful after the wired path works but adds pairing and network variables, so it is not the
initial setup path.

### 3. TestFlight distribution

TestFlight avoids a development cable after upload, but requires paid Apple Developer Program
membership plus App Store Connect configuration and distribution signing. It is out of scope for
personal testing.

## Native project design

Install `@capacitor/ios` at the same 8.4.1 version line as `@capacitor/core`, then generate the
standard Capacitor iOS project with `npx cap add ios`. The generated project lives under `ios/` and
is committed so its native configuration is reproducible.

Add this package script:

```json
"sync:ios": "npm run build:mobile && cap sync ios"
```

This mirrors `sync:android`: TypeScript and Vite build the application into `dist`, the ORT WebAssembly
assets are vendored by the existing prebuild hook, and Capacitor copies the output and synchronizes
native plugins into the Xcode project.

The app is opened through `ios/App/App.xcworkspace`, normally via `npx cap open ios`. The user then:

1. connects and trusts the iPhone;
2. signs into Xcode with their Apple Account;
3. chooses their Personal Team under **Signing & Capabilities** while leaving automatic signing on;
4. selects the iPhone as the run destination; and
5. presses **Run**, enabling Developer Mode on the iPhone if prompted.

No Team ID, device identifier, certificate, or provisioning profile is added to repository files.

## Camera and photo permissions

The existing scan adapters already call the Capacitor Camera plugin on native platforms. Add the
three usage descriptions required by the plugin to `ios/App/App/Info.plist`:

- `NSCameraUsageDescription`: "Take photos of game screens to scan teams and battle information."
- `NSPhotoLibraryUsageDescription`: "Choose game screenshots to scan teams and battle information."
- `NSPhotoLibraryAddUsageDescription`: "Save captured images to your photo library when requested."

The current `Camera.getPhoto` integration is deprecated by Camera 8.1's newer split APIs but remains
supported. Migrating it to `Camera.takePhoto` and `Camera.chooseFromGallery` is not necessary to add
the iOS target and is explicitly outside this change.

## Platform behavior

Camera capture and photo-library selection use `@capacitor/camera` and therefore work on iOS after
permissions are configured. The captured native `webPath` is fetched into a `Blob` and passed into
the existing scan pipeline; no scanner or calculator code changes are needed.

The one-tap floating screen-capture feature remains Android-only. Its availability guard requires a
native Android platform, so it stays unavailable on iOS without attempting to call the custom Android
`ScreenCapture` plugin. Implementing an iOS screen-capture equivalent is not part of this work.

## Error handling

- Xcode signing failures are resolved locally by selecting a valid Personal Team and keeping
  automatic signing enabled; repository code must not encode account-specific fixes.
- The app requests camera or photo access only when the corresponding action is used. A denied
  permission is recoverable through iOS Settings; changing the existing capture adapter's error
  semantics is outside this platform-setup change.
- If the device is absent from Xcode, reconnect it over USB, trust the computer, confirm Developer
  Mode, and verify that the iOS platform support component is installed.
- If native dependencies or web assets change, rerun `npm run sync:ios` before rebuilding in Xcode.

## Verification

Automated and host-side checks:

1. `npm test` passes.
2. `npm run type-check` passes.
3. `npm run build:mobile` passes and produces the Capacitor-mode `dist` output.
4. `npm run sync:ios` completes and lists the Camera plugin in the iOS synchronization output.
5. An unsigned simulator-compatible Xcode build completes, proving that the generated native project
   and plugin integration compile independently of the user's signing identity.

Physical-device acceptance checks:

1. Xcode installs and launches `Champions VGC Calc` on the selected iPhone.
2. The app loads its main calculator UI without network hosting.
3. **Take Photo** presents the native camera, requests permission on first use, and returns an image
   to the scan flow.
4. **Choose Photo** presents the native photo picker and returns a selected screenshot to the scan
   flow.
5. The Android-only one-tap capture control is absent or disabled on iOS.

## Out of scope

- TestFlight, App Store Connect, App Store distribution, and paid-team signing.
- Live reload from the Mac during the initial device setup.
- An iOS replacement for Android's floating overlay and MediaProjection capture.
- Camera API migration, scanner changes, UI redesign, app icons, or launch-screen redesign.
