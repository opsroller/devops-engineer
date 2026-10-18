# How to reproduce a CI-only GPU driver failure locally

*How-to guide, for an engineer whose rendering, graphics or GPU-compute
job fails (hangs, crashes, renders wrong) on a CI runner but passes on
their own machine, and who needs the runner's exact driver locally.*

Most "CI only" graphics failures come from the driver, not the code: the
runner has a different version of a userspace driver (for example Mesa's
llvmpipe or lavapipe software rasterizers on a Linux runner) than any
developer. Userspace drivers are plain shared libraries, so you can run
the runner's exact version beside your own without installing it. This
guide does that for Debian/Ubuntu-style runners; the same steps apply to
other distributions with their own package tools.

For a failure that is not driver-specific (a missing tool, a different
compiler, an OS-only SDK), use the runner's container image instead
(step 8). For the change-pipeline behaviour check, a reproduction made
this way counts as the local red run.

1. **Read the runner and driver from the failing job.** From the job log
   note the runner image and version (most hosted runners print it in
   "Set up job", e.g. `Image: ubuntu-24.04`, `Version: 20261012.1`), the
   driver packages and versions the job installed (the `apt-get install`
   output: `mesa-vulkan-drivers 24.2.8-1ubuntu1~24.04.1`), and the line
   where the program names its renderer or device (an engine banner,
   `OpenGL renderer string`, a Vulkan device name). If the job does not
   print them, add a step that runs `dpkg -l | grep -Ei 'mesa|vulkan|libgl|libegl|libdrm|llvm'`
   and `glxinfo -B` or `vulkaninfo --summary`, and run it once on a
   scratch branch (or a manual dispatch of the workflow on one): the
   runner image is the same, so the versions match, and the versions are
   the evidence the rest depends on.
2. **Fetch exactly those packages.** In a scratch directory:

   ```sh
   mkdir -p ci-driver/debs && cd ci-driver/debs
   apt-get download mesa-vulkan-drivers=24.2.8-1ubuntu1~24.04.1 \
     libgl1-mesa-dri=24.2.8-1ubuntu1~24.04.1 libglx-mesa0=24.2.8-1ubuntu1~24.04.1 \
     libegl-mesa0=24.2.8-1ubuntu1~24.04.1 libgbm1=24.2.8-1ubuntu1~24.04.1
   ```

   Download the driver's own runtime dependencies at the runner's
   versions too when yours differ (for Mesa, usually `libllvm<N>` and
   `libdrm*`): `apt-cache depends` on the driver package lists them. If
   your distribution release differs from the runner's or the version
   has left the archive, fetch the `.deb` files from the distribution's
   package archive (for Ubuntu, the Launchpad build page for that
   version; for Debian, `snapshot.debian.org`) and check each file's
   SHA-256 against the archive's published checksum before use.
3. **Unpack, do not install.** Installing replaces your own driver:

   ```sh
   cd .. && for d in debs/*.deb; do dpkg-deb -x "$d" root; done
   ```

   Everything lands under `ci-driver/root/usr/...`; nothing on the
   system changes, and deleting the directory undoes it.
4. **Point the loader at the unpacked driver.** Set only what your API
   needs, with absolute paths (adjust the multiarch triplet):

   ```sh
   R=$PWD/root/usr/lib/x86_64-linux-gnu
   export LD_LIBRARY_PATH=$R${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
   export LIBGL_DRIVERS_PATH=$R/dri            # OpenGL/GLX DRI drivers
   # The packaged ICD manifest names its library by absolute path
   # (/usr/lib/...); point a copy at the unpacked library instead.
   sed "s#\"/usr/lib#\"$PWD/root/usr/lib#" \
     root/usr/share/vulkan/icd.d/lvp_icd.x86_64.json > lvp_icd.json
   export VK_DRIVER_FILES=$PWD/lvp_icd.json
   export VK_ICD_FILENAMES=$VK_DRIVER_FILES    # older Vulkan loaders
   ```

   The Vulkan loader opens the manifest's `library_path` directly and
   ignores `LD_LIBRARY_PATH`, so without the rewritten copy it loads
   your system's driver (or fails if none is installed); a manifest with
   a bare file name needs no rewrite. To force the same driver the runner used, match its
   selection variables: `LIBGL_ALWAYS_SOFTWARE=1` for a software
   OpenGL context, `GALLIUM_DRIVER=llvmpipe` (or `softpipe`, `zink`) to
   pick the Gallium driver, `MESA_LOADER_DRIVER_OVERRIDE=<name>` to
   force a DRI driver by name. Copy any other driver variables the CI
   job sets (its `env:` blocks and setup actions).
5. **Prove the right driver loaded.** Before running anything else, run
   `glxinfo -B` (OpenGL: "OpenGL renderer string" and the version
   string name the driver and its Mesa version) or
   `vulkaninfo --summary` (Vulkan: `driverName`, `driverInfo`), and
   check the program's own renderer or device line. It must match the
   CI log from step 1 exactly. `LD_DEBUG=libs <program> 2>&1 | grep -i mesa`
   shows which files were actually opened. A mismatch means a variable
   was missed; a match from your system's driver means none of this
   took effect.
6. **Match the display.** Hosted runners have no display; if the job
   uses a virtual X server, run the same way:
   `xvfb-run -a -s "-screen 0 1920x1080x24" <the job's command>`, with
   the resolution and depth the job passes. If the job runs headless
   (EGL surfaceless, an offscreen flag), use the same flag and no X.
7. **Run the job's command.** Use the exact command and arguments from
   the CI step, with the same build artifact if you can download it
   (build-once: the bytes CI tested), and the job's timeout. You now
   have one of three outcomes:
   - **Red, same symptom as CI**: a local reproduction. Record the
     driver versions, the variables and the command next to the issue
     or PR; it is the red case for a fix.
   - **Green**: the driver alone is not the cause. Compare the rest of
     the runner: CPU count and features (software rasterizers use every
     core and the CPU's vector extensions), memory, the window system,
     environment variables. Step 8 removes most of these differences.
   - **Red with a different symptom**: something else differs; treat
     the CI symptom as not yet reproduced.
8. **When the driver swap is not enough, use the runner's image.** Run
   the job in a container from the runner's published image (or the
   distribution's base image at the runner's release, with the job's
   setup steps replayed), using a CPU and memory limit equal to the
   runner's (`--cpus`, `--memory`). If the failure still only happens on
   the runner, a debug step that opens a remote shell on the runner
   (an SSH or tmate-style action) is the last resort: allow it only on
   a branch, only for the person debugging, pinned to a commit SHA, and
   never in a job that has secrets.
9. **Bisect the driver when versions matter.** If an older driver
   passes and the runner's fails, repeat steps 2 to 7 with versions
   between the two (each into its own directory) to find the first bad
   version. Report it upstream with that range, the minimal command and
   the variables, and pin or work around in the pipeline meanwhile
   (ci-pipelines skill: pin what you use).
10. **Write down what the reproduction proves.** A red local run with
    the runner's driver shows the failure is in the program's
    interaction with that driver version, and gives a fast loop for the
    fix. It does not prove the fix works on the runner: the CI run on
    the fix branch is still the green case. Delete the scratch
    directory when you are done, and if contributors will hit this
    again, add the commands to the project's "how to reproduce a CI
    failure locally" guide.

See the [ci-pipelines skill](../reference/skill-ci-pipelines.md) for the
method and the
[change-pipeline reference](../reference/workflow-change-pipeline.md) for
how a local reproduction feeds the behaviour check.
