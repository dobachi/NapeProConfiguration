#!/bin/bash
# GitHub CLI Auto-Setup Script
# Automatically installs GitHub CLI in remote environments (Claude Code on the Web)
# Based on gh-setup-hooks: https://github.com/oikon48/gh-setup-hooks

set -e

# Configuration
GH_VERSION="${GH_SETUP_VERSION:-2.83.2}"
INSTALL_DIR="${HOME}/.local/bin"
GH_BINARY="${INSTALL_DIR}/gh"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[gh-setup]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[gh-setup]${NC} $1"
}

error() {
    echo -e "${RED}[gh-setup]${NC} $1" >&2
}

# Check if running in remote environment
is_remote_environment() {
    [[ "${CLAUDE_CODE_REMOTE}" == "true" ]]
}

# Check if gh is already installed and up-to-date
is_gh_installed() {
    if [[ -x "${GH_BINARY}" ]]; then
        local installed_version
        installed_version=$("${GH_BINARY}" --version | head -n1 | awk '{print $3}')
        if [[ "${installed_version}" == "${GH_VERSION}" ]]; then
            return 0
        else
            warn "Installed version (${installed_version}) differs from target (${GH_VERSION})"
            return 1
        fi
    fi
    return 1
}

# Detect architecture
detect_arch() {
    local machine
    machine=$(uname -m)
    case "${machine}" in
        x86_64)
            echo "amd64"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        *)
            error "Unsupported architecture: ${machine}"
            exit 1
            ;;
    esac
}

# Detect OS
detect_os() {
    local os
    os=$(uname -s | tr '[:upper:]' '[:lower:]')
    case "${os}" in
        linux)
            echo "linux"
            ;;
        darwin)
            echo "macOS"
            ;;
        *)
            error "Unsupported OS: ${os}"
            exit 1
            ;;
    esac
}

# Download and install GitHub CLI
install_gh() {
    local arch os download_url temp_dir

    arch=$(detect_arch)
    os=$(detect_os)

    info "Installing GitHub CLI v${GH_VERSION} for ${os}/${arch}..."

    # Construct download URL
    download_url="https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_${os}_${arch}.tar.gz"

    # Create temporary directory
    temp_dir=$(mktemp -d)
    trap "rm -rf '${temp_dir}'" EXIT

    # Download and extract
    info "Downloading from ${download_url}..."
    if ! curl -fsSL "${download_url}" -o "${temp_dir}/gh.tar.gz"; then
        error "Failed to download GitHub CLI"
        exit 1
    fi

    info "Extracting..."
    tar -xzf "${temp_dir}/gh.tar.gz" -C "${temp_dir}"

    # Create install directory
    mkdir -p "${INSTALL_DIR}"

    # Copy binary
    local extracted_dir="${temp_dir}/gh_${GH_VERSION}_${os}_${arch}"
    cp "${extracted_dir}/bin/gh" "${GH_BINARY}"
    chmod +x "${GH_BINARY}"

    info "GitHub CLI v${GH_VERSION} installed successfully to ${GH_BINARY}"
}

# Setup PATH
setup_path() {
    # Check if already in PATH
    if echo "${PATH}" | grep -q "${INSTALL_DIR}"; then
        return 0
    fi

    # Add to PATH in shell rc files
    local shell_rc=""
    if [[ -n "${BASH_VERSION}" ]]; then
        shell_rc="${HOME}/.bashrc"
    elif [[ -n "${ZSH_VERSION}" ]]; then
        shell_rc="${HOME}/.zshrc"
    fi

    if [[ -n "${shell_rc}" ]]; then
        if ! grep -q "export PATH=\"${INSTALL_DIR}:\$PATH\"" "${shell_rc}" 2>/dev/null; then
            echo "" >> "${shell_rc}"
            echo "# Added by gh-setup.sh" >> "${shell_rc}"
            echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "${shell_rc}"
            info "Added ${INSTALL_DIR} to PATH in ${shell_rc}"
        fi
    fi

    # Add to current session
    export PATH="${INSTALL_DIR}:${PATH}"
}

# Configure GitHub authentication
configure_auth() {
    local token="${GH_TOKEN:-${GITHUB_TOKEN}}"

    if [[ -z "${token}" ]]; then
        warn "No GitHub token found (GH_TOKEN or GITHUB_TOKEN)"
        warn "GitHub CLI will not be authenticated"
        return 0
    fi

    info "Configuring GitHub authentication..."

    # Set token for gh command
    export GH_TOKEN="${token}"

    # Verify authentication
    if "${GH_BINARY}" auth status >/dev/null 2>&1; then
        info "GitHub authentication successful"
    else
        warn "GitHub authentication verification failed"
    fi
}

# Configure git user from GitHub account
configure_git_user() {
    local token="${GH_TOKEN:-${GITHUB_TOKEN}}"

    if [[ -z "${token}" ]]; then
        warn "No GitHub token found, skipping git user configuration"
        return 0
    fi

    info "Configuring git user from GitHub account..."

    # Get user info from GitHub API
    local user_info
    user_info=$("${GH_BINARY}" api user 2>/dev/null) || {
        warn "Failed to get user info from GitHub API"
        return 0
    }

    local name email login
    name=$(echo "${user_info}" | jq -r '.name // .login')
    login=$(echo "${user_info}" | jq -r '.login')
    email=$(echo "${user_info}" | jq -r '.email // empty')

    # If email is not public, use GitHub noreply email
    if [[ -z "${email}" || "${email}" == "null" ]]; then
        email="${login}@users.noreply.github.com"
    fi

    git config user.name "${name}"
    git config user.email "${email}"

    info "Git user configured: ${name} <${email}>"
}

# Main execution
main() {
    info "GitHub CLI Setup Script v1.0"

    # Check if running in remote environment
    if ! is_remote_environment; then
        info "Not a remote environment (CLAUDE_CODE_REMOTE != true)"
        info "Skipping GitHub CLI installation"
        exit 0
    fi

    # Check if already installed
    if is_gh_installed; then
        info "GitHub CLI v${GH_VERSION} is already installed"
        setup_path
        configure_auth
        configure_git_user
        exit 0
    fi

    # Install GitHub CLI
    install_gh

    # Setup PATH
    setup_path

    # Configure authentication
    configure_auth

    # Configure git user from GitHub account
    configure_git_user

    info "Setup complete!"
    info "GitHub CLI is ready to use: ${GH_BINARY}"
}

# Run main function
main "$@"
