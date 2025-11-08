# Docker helper for Sweettime

This folder contains a Dockerfile and a small PowerShell helper to build the production image for the Next.js app.

Files
- `Dockerfile` — multi-stage Dockerfile that builds the app and creates a runtime image.
- `build.ps1` — PowerShell script that runs docker build using this Dockerfile. Use from repository root or anywhere.

Quick usage

Open PowerShell and run:

```powershell
# Build with default tag
.\Docker\build.ps1

# Build with custom tag
.\Docker\build.ps1 -Tag myrepo/sweettime:1.0.0
```

Notes
- Requires Docker to be installed and the daemon running.
- The script uses the repository root as the build context (it calls `docker build ... ..`).
- The Dockerfile currently copies `node_modules` from the builder stage to keep the image simple. If you prefer a smaller image, modify the Dockerfile to install only production deps in the final stage.
