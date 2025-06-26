#!/usr/bin/env zsh

# zeami-menu.zsh - ZeamiTerm interactive menu

# Colors
GREEN='\033[0;32m'
BRIGHT_GREEN='\033[1;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'
BOLD='\033[1m'

# Get script directory
SCRIPT_DIR="${0:A:h}"

# Clear screen and show header
clear
echo "${BRIGHT_GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║               ZEAMi TERM - Interactive Menu                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo "${RESET}"

# Show menu options
echo "${CYAN}Available Commands:${RESET}"
echo ""
echo "${GREEN}1)${RESET} ${BOLD}matrix${RESET}         - Run Matrix-style animation"
echo "${GREEN}2)${RESET} ${BOLD}generate${RESET}       - Generate 10,000 lines of code"
echo "${GREEN}3)${RESET} ${BOLD}infinite${RESET}       - Infinite code generator (Ctrl+C to stop)"
echo "${GREEN}4)${RESET} ${BOLD}test${RESET}           - Quick performance test"
echo "${GREEN}5)${RESET} ${BOLD}about${RESET}          - About ZeamiTerm"
echo "${GREEN}6)${RESET} ${BOLD}help${RESET}           - Show available commands"
echo "${GREEN}0)${RESET} ${BOLD}exit${RESET}           - Exit menu"
echo ""

# Read user choice
echo -n "${YELLOW}Enter your choice: ${RESET}"
read choice

case $choice in
    1|matrix)
        echo "${GREEN}Launching Matrix animation...${RESET}"
        sleep 0.5
        exec "$SCRIPT_DIR/matrix-code.zsh"
        ;;
    2|generate)
        echo "${GREEN}Generating 10,000 lines of code...${RESET}"
        sleep 0.5
        exec "$SCRIPT_DIR/generate-code.zsh"
        ;;
    3|infinite)
        echo "${GREEN}Starting infinite code generator...${RESET}"
        echo "${YELLOW}Press Ctrl+C to stop${RESET}"
        sleep 1
        exec "$SCRIPT_DIR/generate-code-infinite.zsh"
        ;;
    4|test)
        echo "${GREEN}Running performance test...${RESET}"
        sleep 0.5
        exec "$SCRIPT_DIR/test-10k.zsh"
        ;;
    5|about)
        clear
        echo "${BRIGHT_GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║                     About ZeamiTerm                           ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo "${RESET}"
        echo ""
        echo "${CYAN}ZeamiTerm v0.1.0${RESET}"
        echo "Terminal from Teleport"
        echo ""
        echo "Advanced terminal emulator designed for Claude Code integration."
        echo "Built with Electron, xterm.js, and WebGL rendering."
        echo ""
        echo "${GREEN}Features:${RESET}"
        echo "• High-performance WebGL rendering"
        echo "• Split terminal support"
        echo "• Session persistence"
        echo "• Claude Code integration"
        echo "• Matrix-style animations"
        echo ""
        echo "${YELLOW}Press Enter to continue...${RESET}"
        read
        exec "$0"
        ;;
    6|help)
        clear
        echo "${BRIGHT_GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║                   ZeamiTerm Commands                          ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo "${RESET}"
        echo ""
        echo "${CYAN}Terminal Shortcuts:${RESET}"
        echo "  ${GREEN}Cmd+T${RESET}         - New terminal"
        echo "  ${GREEN}Cmd+D${RESET}         - Split terminal"
        echo "  ${GREEN}Cmd+W${RESET}         - Close terminal"
        echo "  ${GREEN}Cmd+K${RESET}         - Clear terminal"
        echo "  ${GREEN}Cmd+F${RESET}         - Find in terminal"
        echo "  ${GREEN}Shift+Scroll${RESET}  - 10x scroll speed"
        echo ""
        echo "${CYAN}Test Commands:${RESET}"
        echo "  ${GREEN}?${RESET}             - This menu"
        echo "  ${GREEN}matrix${RESET}        - Matrix animation"
        echo "  ${GREEN}test10k${RESET}       - Generate 10k lines"
        echo ""
        echo "${YELLOW}Press Enter to continue...${RESET}"
        read
        exec "$0"
        ;;
    0|exit|q|quit)
        echo "${GREEN}Exiting ZeamiTerm menu...${RESET}"
        exit 0
        ;;
    *)
        echo "${RED}Invalid choice. Please try again.${RESET}"
        sleep 1
        exec "$0"
        ;;
esac