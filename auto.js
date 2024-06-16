 function tune(url) {
            if (url == null) {
                document.getElementById("kiwiframe").src = "";
                return;
            }
            console.log(`loading ${url}`);

            document.getElementById("overlay").style.display = "block";
            document.getElementById("kiwiframe").src = `${url}?f=${kiwiConfig.freq}${kiwiConfig.mode}z${kiwiConfig.zoom}&pb=${kiwiConfig.startPass},${kiwiConfig.endPass}&cmap=${kiwiConfig.colormap}&vol=${kiwiConfig.volume}`;
            setTimeout(() => { document.getElementById("overlay").style.display = "none"; }, 15 * 1000);
        }

        const kiwimapDay = initAutoreloadMap(kiwilistDay);
        const kiwimapNight = initAutoreloadMap(kiwilistNight);

        async function reload() {
            tune(null);
            document.getElementById("status").style.color = "#2ff427";
            document.getElementById("status").textContent = "AutoreloadFrequency by @nepann.official";

            const now = new Date();
            const utcHour = now.getUTCHours();
            const utcMinutes = now.getUTCMinutes();
            const mskHour = (utcHour + 3) % 24;
            const mskMinutes = now.getUTCMinutes();
            const mskTime = mskHour * 60 + mskMinutes;

            let kiwimap = null;
            if ((mskTime >= 450 && mskTime < 1290)) { // 07:30 - 21:30 MSK
                kiwimap = kiwimapDay;
                kiwiConfig.freq = "-"; // Set daytime frequency
            } else {
                kiwimap = kiwimapNight;
                kiwiConfig.freq = "-"; // Set nighttime frequency
            }

            console.log(`Current MSK time: ${mskHour}:${mskMinutes}, Frequency: ${kiwiConfig.freq}`);

            try {
                const r = await getBestKiwi(config, kiwimap, reloadMinutes);
                const url = r.url;
                const allowedMins = r.time;
                let rxobj = kiwimap.get(url);
                const unixmins = Date.now() / 60000;
                rxobj.lastused = unixmins;
                rxobj.usetimes.push({ t: unixmins, len: allowedMins });
                tune(url);
                document.getElementById("status").textContent = "-";
                setTimeout(reload, allowedMins * 60000);
                console.log(`allowed receiver usage: ${allowedMins} minutes`);
            } catch (e) {
                console.log(`Error: ${e.message}`);
                document.getElementById("status").style.color = "red";
                document.getElementById("status").textContent = `Error: ${e.message}`;

                if (fallback) {
                    try {
                        const r = await probeKiwi(fallbackUrl, config.timeout);
                        if (r.usage < 1) {
                            tune(fallbackUrl);
                            setTimeout(reload, fallbackReloadMinutes * 60000);
                            return;
                        }
                    } catch (e) { }
                }

                setTimeout(reload, retryMinutes * 60000);
            }
        }

        window.addEventListener("load", () => {
            reload();
        });
