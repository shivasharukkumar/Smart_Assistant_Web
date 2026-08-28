/**
 * PcMonitorManager - Hardware Telemetry & OLED Live Streaming
 */
const PcMonitor = {
    cpu: 0,
    gpu: 0,
    ram: 0,
    ramText: "-- / -- GB",
    gpuTemp: "--C",

    init() {
        this.bindEvents();
        console.log('[PC Monitor] Hardware Telemetry Manager initialized (listening for real PC stats).');
    },

    bindEvents() {
        // Sliders for manual test
        const cpuSlider = document.getElementById('sliderPcCpu');
        const gpuSlider = document.getElementById('sliderPcGpu');
        const ramSlider = document.getElementById('sliderPcRam');

        cpuSlider?.addEventListener('input', (e) => {
            this.cpu = parseInt(e.target.value, 10);
            this.updateUi();
            this.syncToEsp32(false);
        });

        gpuSlider?.addEventListener('input', (e) => {
            this.gpu = parseInt(e.target.value, 10);
            this.updateUi();
            this.syncToEsp32(false);
        });

        ramSlider?.addEventListener('input', (e) => {
            this.ram = parseInt(e.target.value, 10);
            this.updateUi();
            this.syncToEsp32(false);
        });

        // String inputs
        document.getElementById('pcRamTextInput')?.addEventListener('input', (e) => {
            this.ramText = e.target.value.trim() || "--GB";
            this.syncToEsp32(false);
        });
        document.getElementById('pcGpuTempInput')?.addEventListener('input', (e) => {
            this.gpuTemp = e.target.value.trim() || "--C";
            this.syncToEsp32(false);
        });

        // Push button
        document.getElementById('btnPushPcStatsNow')?.addEventListener('click', () => {
            this.syncToEsp32(true);
            App.showToast('Pushed PC Telemetry to OLED Screen!');
        });

        // Switch page
        document.getElementById('btnSwitchToPcPage')?.addEventListener('click', () => {
            Connection.sendWs({ type: 'set_page', page: 'pc_monitor' });
            Connection.post('/api/page', { page: 'pc_monitor' });
            this.syncToEsp32(true);
            App.showToast('Switched OLED to PC Monitor View!');
        });
    },

    setLiveStats(cpu, gpu, ram, ramText, gpuTemp) {
        this.cpu = cpu;
        this.gpu = gpu;
        this.ram = ram;
        if (ramText) this.ramText = ramText;
        if (gpuTemp) this.gpuTemp = gpuTemp;
        this.updateUi();
    },

    updateUi() {
        const cpuVal = document.getElementById('pcCpuVal');
        const cpuBar = document.getElementById('pcCpuBar');
        if (cpuVal) cpuVal.textContent = `${this.cpu}%`;
        if (cpuBar) cpuBar.style.width = `${this.cpu}%`;

        const gpuVal = document.getElementById('pcGpuVal');
        const gpuBar = document.getElementById('pcGpuBar');
        if (gpuVal) gpuVal.textContent = `${this.gpu}% (${this.gpuTemp})`;
        if (gpuBar) gpuBar.style.width = `${this.gpu}%`;

        const ramVal = document.getElementById('pcRamVal');
        const ramBar = document.getElementById('pcRamBar');
        if (ramVal) ramVal.textContent = `${this.ram}% (${this.ramText})`;
        if (ramBar) ramBar.style.width = `${this.ram}%`;
    },

    syncToEsp32(switchPage = false) {
        const payload = {
            cpu: this.cpu,
            gpu: this.gpu,
            ram: this.ram,
            ramText: this.ramText,
            gpuTemp: this.gpuTemp,
            switchPage: switchPage ? "1" : "0"
        };
        Connection.sendWs({ type: 'pc_stats', ...payload });
        Connection.post('/api/pc-stats', payload).catch(() => {});
    }
};

window.PcMonitor = PcMonitor;
