#!/bin/bash

echo "Creating ZeamiTerm standalone application..."

# Set variables
APP_NAME="ZeamiTerm"
DIST_DIR="dist/standalone"
APP_DIR="$DIST_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
MACOS_DIR="$CONTENTS_DIR/MacOS"

# Clean and create directories
rm -rf "$DIST_DIR"
mkdir -p "$RESOURCES_DIR/app"
mkdir -p "$MACOS_DIR"

# Copy application files
echo "Copying application files..."
cp -R src "$RESOURCES_DIR/app/"
cp package.json "$RESOURCES_DIR/app/"
cp -R node_modules "$RESOURCES_DIR/app/"

# Create Info.plist
echo "Creating Info.plist..."
cat > "$CONTENTS_DIR/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>ZeamiTerm</string>
    <key>CFBundleIdentifier</key>
    <string>com.zeami.term</string>
    <key>CFBundleName</key>
    <string>ZeamiTerm</string>
    <key>CFBundleDisplayName</key>
    <string>ZeamiTerm</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>
EOF

# Create executable script
echo "Creating executable..."
cat > "$MACOS_DIR/$APP_NAME" << 'EOF'
#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../Resources/app"
if [ -x "node_modules/.bin/electron" ]; then
    exec node_modules/.bin/electron .
else
    echo "Error: Electron not found. Please ensure Electron is installed."
    exit 1
fi
EOF

# Make executable
chmod +x "$MACOS_DIR/$APP_NAME"

# Copy icon if exists
if [ -f "assets/icon.icns" ]; then
    cp "assets/icon.icns" "$RESOURCES_DIR/"
fi

echo ""
echo "✅ Standalone application created successfully!"
echo "📁 Location: $APP_DIR"
echo ""
echo "To run the application:"
echo "  open $APP_DIR"
echo ""
echo "To install to Applications folder:"
echo "  cp -R $APP_DIR /Applications/"
echo ""
echo "Note: This is a development build. For production, proper code signing is recommended."