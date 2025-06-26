#!/usr/bin/env zsh

# Test if animations work in ZeamiTerm

clear

echo "\033[1;32m"
echo "███████╗███████╗ █████╗ ███╗   ███╗██╗"
echo "╚══███╔╝██╔════╝██╔══██╗████╗ ████║██║"
echo "  ███╔╝ █████╗  ███████║██╔████╔██║██║"
echo " ███╔╝  ██╔══╝  ██╔══██║██║╚██╔╝██║██║"
echo "███████╗███████╗██║  ██║██║ ╚═╝ ██║██║"
echo "╚══════╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝"
echo "\033[0m"
echo ""
echo "\033[0;36mIf you can see the logo above, animations work!\033[0m"
echo ""
echo "Press Enter to test matrix effect..."
read

exec "${0:A:h}/matrix-code.zsh"