
/* =================================
   WEBLEARN - MAIN JAVASCRIPT
================================= */


/* =================================
   1. ELEMENT
================================= */

const pages = document.querySelectorAll(".page");

const pageLinks = document.querySelectorAll("[data-page-link]");
const lessonLinks = document.querySelectorAll("[data-lesson-link]");

const materiPage = document.getElementById("page-materi");
const editorPage = document.getElementById("page-editor");

const sidebar = document.querySelector(".sidebar");

const sidebarLinks = Array.from(
    document.querySelectorAll(".sidebar a[data-lesson-link]")
);

// Semua bab materi, berurutan dari atas ke bawah
const lessonSections = Array.from(
    document.querySelectorAll("#page-materi .lesson[id]")
);

const PAGE_TITLES = {
    home: "WebLearn - Belajar Coding",
    materi: "Materi - WebLearn",
    editor: "Code Editor - WebLearn"
};


/* =================================
   2. SPA NAVIGATION
================================= */

// Ubah URL tanpa memuat ulang halaman
function setUrl(hash, state) {
    const url = hash
        ? `#${hash}`
        : location.pathname + location.search;

    try {
        // Hindari riwayat ganda saat mengklik tujuan yang sama
        if (location.hash.slice(1) === hash) {
            history.replaceState(state, "", url);
        } else {
            history.pushState(state, "", url);
        }
    } catch (error) {
        // History API bisa diblokir di beberapa lingkungan
    }
}


// Lompat ke atas tanpa animasi saat berpindah halaman
function jumpToTop() {
    const root = document.documentElement;

    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = "";
}


function showPage(pageName, { updateHistory = true, scroll = true } = {}) {
    const targetPage = document.getElementById(`page-${pageName}`);

    if (!targetPage || !targetPage.classList.contains("page")) return;

    // Tampilkan halaman tujuan, sembunyikan yang lain
    pages.forEach(page => {
        page.classList.toggle("active", page === targetPage);
    });

    // Perbarui menu navigasi
    pageLinks.forEach(link => {
        if (!link.closest("nav")) return;

        const isActive = link.dataset.pageLink === pageName;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    document.title = PAGE_TITLES[pageName] || document.title;

    if (updateHistory) {
        setUrl(pageName === "home" ? "" : pageName, { page: pageName });
    }

    if (scroll) jumpToTop();

    // Refresh CodeMirror saat editor ditampilkan
    if (pageName === "editor") {
        setTimeout(() => {
            refreshEditors();
            startInitialRun();
        }, 50);
    }
}


// Navigasi halaman utama
pageLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        showPage(link.dataset.pageLink);
    });
});


/* =================================
   3. NAVIGASI MATERI + SCROLL SPY
================================= */

let activeLessonId = null;

let spyPaused = false;
let spyTimer = null;
let spyTicking = false;


function findLesson(lessonId) {
    if (!lessonId) return null;

    return lessonSections.find(section => section.id === lessonId) || null;
}


// Geser daftar sidebar (bukan halaman) agar materi aktif tetap terlihat
function keepVisibleInSidebar(link) {
    if (!sidebar || !materiPage.classList.contains("active")) return;

    const margin = 60;

    const top = link.offsetTop;
    const bottom = top + link.offsetHeight;

    const viewTop = sidebar.scrollTop;
    const viewBottom = viewTop + sidebar.clientHeight;

    if (top < viewTop + margin) {
        sidebar.scrollTo({
            top: Math.max(0, top - margin),
            behavior: "smooth"
        });
    } else if (bottom > viewBottom - margin) {
        sidebar.scrollTo({
            top: bottom - sidebar.clientHeight + margin,
            behavior: "smooth"
        });
    }
}


// Tandai materi yang sedang dibuka
function setActiveLesson(lessonId) {
    if (lessonId === activeLessonId) return;

    activeLessonId = lessonId;

    sidebarLinks.forEach(link => {
        const isActive =
            Boolean(lessonId) &&
            link.getAttribute("href") === `#${lessonId}`;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "true");
            keepVisibleInSidebar(link);
        } else {
            link.removeAttribute("aria-current");
        }
    });
}


// Jeda scroll spy selama halaman berpindah otomatis (klik sidebar)
function pauseSpy() {
    spyPaused = true;

    clearTimeout(spyTimer);

    spyTimer = setTimeout(() => {
        spyPaused = false;
    }, 400);
}


// Scroll manual oleh pengguna langsung mengaktifkan spy kembali
["wheel", "touchstart", "keydown"].forEach(type => {
    window.addEventListener(type, () => {
        spyPaused = false;

        clearTimeout(spyTimer);
    }, { passive: true });
});


function updateSpy() {
    spyTicking = false;

    if (!materiPage.classList.contains("active")) return;

    const line = 140;

    let current = null;

    for (const section of lessonSections) {
        if (section.getBoundingClientRect().top <= line) {
            current = section;
        } else {
            break;
        }
    }

    // Di dasar halaman, bab terakhir dianggap aktif
    const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;

    if (atBottom) {
        current = lessonSections[lessonSections.length - 1] || current;
    }

    setActiveLesson(current ? current.id : null);
}


window.addEventListener("scroll", () => {
    if (spyPaused) {
        // Perpanjang jeda selama animasi scroll masih berjalan
        clearTimeout(spyTimer);

        spyTimer = setTimeout(() => {
            spyPaused = false;
        }, 180);

        return;
    }

    if (!spyTicking) {
        spyTicking = true;

        requestAnimationFrame(updateSpy);
    }
}, { passive: true });


function scrollToLesson(lesson, smooth) {
    const root = document.documentElement;

    if (!smooth) root.style.scrollBehavior = "auto";

    lesson.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "start"
    });

    if (!smooth) root.style.scrollBehavior = "";
}


// Buka halaman materi lalu menuju bab tertentu
function goToLesson(lessonId, { updateHistory = true, smooth = true } = {}) {
    const lesson = findLesson(lessonId);

    if (!lesson) return false;

    // Pindah halaman hanya jika belum berada di halaman materi
    if (!materiPage.classList.contains("active")) {
        showPage("materi", { updateHistory: false });
    }

    if (updateHistory) {
        setUrl(lessonId, { page: "materi", lesson: lessonId });
    }

    pauseSpy();
    setActiveLesson(lessonId);

    scrollToLesson(lesson, smooth);

    return true;
}


// Navigasi menuju materi tertentu (sidebar dan kartu beranda)
lessonLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        const href = link.getAttribute("href") || "";

        if (!href.startsWith("#")) return;

        goToLesson(href.slice(1));
    });
});


// Navigasi tombol Back dan Forward browser
function handleHistoryNavigation() {
    const hash = location.hash.slice(1);

    if (hash === "home" || hash === "materi" || hash === "editor") {
        showPage(hash, { updateHistory: false });
        return;
    }

    // Cari hanya di dalam halaman materi (id "home" milik halaman beranda)
    if (findLesson(hash)) {
        goToLesson(hash, { updateHistory: false, smooth: false });
        return;
    }

    showPage("home", { updateHistory: false });
}

window.addEventListener("popstate", handleHistoryNavigation);


/* =================================
   4. DOM PRACTICE
================================= */

const tombolUbah = document.getElementById("ubah");
const judulDOM = document.getElementById("judul");

if (tombolUbah && judulDOM) {
    tombolUbah.addEventListener("click", () => {
        judulDOM.textContent = "Selamat Belajar Coding!";

        judulDOM.style.color = "#2563eb";
    });
}


// Praktik Event Listener pada materi
const tombolEvent = document.getElementById("tombol");
const hasilEvent = document.getElementById("hasil-event");

let jumlahKlik = 0;

if (tombolEvent && hasilEvent) {
    tombolEvent.addEventListener("click", () => {
        jumlahKlik++;

        hasilEvent.textContent =
            `Tombol sudah diklik ${jumlahKlik} kali.`;
    });
}


/* =================================
   5. CODE EDITOR ELEMENTS
================================= */

const htmlTextarea = document.getElementById("htmlCode");
const cssTextarea = document.getElementById("cssCode");
const jsTextarea = document.getElementById("jsCode");

const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");

const preview = document.getElementById("preview");

const consoleOutput = document.getElementById("consoleOutput");
const clearConsoleBtn = document.getElementById("clearConsole");

const saveStatus = document.getElementById("saveStatus");


/* =================================
   6. DEFAULT CODE
================================= */

const defaultHTML = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Saya</title>
</head>
<body>

    <h1>Halo, WebLearn!</h1>
    <p>Saya sedang belajar HTML.</p>

    <button id="tombol">Klik Saya</button>

</body>
</html>`;

const defaultCSS = `body {
    font-family: Arial, sans-serif;
    padding: 30px;
    background: #f1f5f9;
}

h1 {
    color: #2563eb;
}

button {
    padding: 10px 18px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
}`;

const defaultJS = `const tombol = document.getElementById("tombol");

tombol.addEventListener("click", () => {
    alert("Halo! JavaScript berhasil dijalankan.");
});`;


/* =================================
   7. CODEMIRROR INITIALIZATION
================================= */

let htmlEditor = null;
let cssEditor = null;
let jsEditor = null;

function createEditor(textarea, mode) {
    return CodeMirror.fromTextArea(textarea, {
        mode,
        theme: "material-darker",
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: true,
        extraKeys: {
            // Tab menyisipkan spasi, atau menggeser blok yang dipilih
            Tab: cm => {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.execCommand("insertSoftTab");
                }
            },
            "Shift-Tab": cm => cm.indentSelection("subtract")
        }
    });
}

function initializeEditors() {
    if (
        !htmlTextarea ||
        !cssTextarea ||
        !jsTextarea
    ) return;

    // Gunakan CodeMirror jika tersedia, jika tidak pakai textarea biasa
    if (typeof CodeMirror !== "undefined") {
        htmlEditor = createEditor(htmlTextarea, "htmlmixed");
        cssEditor = createEditor(cssTextarea, "css");
        jsEditor = createEditor(jsTextarea, "javascript");
    }
}


// Ambil kode dari editor
function getEditorValue(editor, textarea) {
    return editor ? editor.getValue() : textarea.value;
}


// Masukkan kode ke editor
function setEditorValue(editor, textarea, value) {
    if (editor) {
        editor.setValue(value);
    } else if (textarea) {
        textarea.value = value;
    }
}


// Refresh ukuran editor
function refreshEditors() {
    [htmlEditor, cssEditor, jsEditor].forEach(editor => {
        if (editor) editor.refresh();
    });
}


/* =================================
   8. LOCAL STORAGE / AUTOSAVE
================================= */

const STORAGE_KEY = "weblearn-editor-v1";

let saveTimer = null;

// True saat kode diisi lewat program (muat data / reset), bukan diketik
let isRestoring = false;


// Tampilkan status penyimpanan (warna diatur CSS lewat data-state)
function setStatus(text, state = "ok") {
    if (!saveStatus) return;

    saveStatus.textContent = text;
    saveStatus.dataset.state = state;
}


function setAllEditors({ html, css, js }) {
    isRestoring = true;

    setEditorValue(htmlEditor, htmlTextarea, html);
    setEditorValue(cssEditor, cssTextarea, css);
    setEditorValue(jsEditor, jsTextarea, js);

    isRestoring = false;
}


// Tulis kode ke localStorage
function persistEditor() {
    try {
        const data = {
            html: getEditorValue(htmlEditor, htmlTextarea),
            css: getEditorValue(cssEditor, cssTextarea),
            js: getEditorValue(jsEditor, jsTextarea)
        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );

        setStatus("Semua perubahan tersimpan");

        return true;

    } catch (error) {
        setStatus("Gagal menyimpan kode", "error");

        return false;
    }
}


function saveEditor() {
    if (isRestoring) return;
    if (!htmlTextarea || !cssTextarea || !jsTextarea) return;

    setStatus("Menyimpan...", "saving");

    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        saveTimer = null;

        persistEditor();
    }, 500);
}


// Simpan segera jika halaman ditutup sebelum jeda 500ms selesai
window.addEventListener("pagehide", () => {
    if (!saveTimer) return;

    clearTimeout(saveTimer);
    saveTimer = null;

    persistEditor();
});


// Pasang autosave SETELAH kode dimuat agar tidak menyimpan ulang saat memuat
function attachAutosave() {
    if (htmlEditor && cssEditor && jsEditor) {
        [htmlEditor, cssEditor, jsEditor].forEach(editor => {
            editor.on("change", saveEditor);
        });
    } else {
        [htmlTextarea, cssTextarea, jsTextarea].forEach(textarea => {
            if (textarea) textarea.addEventListener("input", saveEditor);
        });
    }
}


// Ambil kode yang tersimpan
function loadEditor() {
    let data = null;

    try {
        data = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );
    } catch (error) {
        console.warn("Data editor tidak dapat dibaca.");
    }

    setAllEditors({
        html: data?.html ?? defaultHTML,
        css: data?.css ?? defaultCSS,
        js: data?.js ?? defaultJS
    });

    setStatus(
        data
            ? "Kode terakhir berhasil dimuat"
            : "Editor siap digunakan"
    );
}


/* =================================
   9. CONSOLE
================================= */

const MAX_CONSOLE_LINES = 500;

function clearConsole() {
    if (!consoleOutput) return;

    consoleOutput.innerHTML = `
        <div class="console-empty">
            Console dibersihkan.
        </div>
    `;
}


function addConsole(message, type = "log") {
    if (!consoleOutput) return;

    const empty = consoleOutput.querySelector(".console-empty");

    if (empty) empty.remove();

    const line = document.createElement("div");

    line.className = "console-log";

    if (type === "error") {
        line.classList.add("console-error");
    }

    if (type === "warn") {
        line.classList.add("console-warn");
    }

    line.textContent = message;

    consoleOutput.appendChild(line);

    // Batasi jumlah baris agar loop console.log tidak membuat halaman berat
    while (consoleOutput.childElementCount > MAX_CONSOLE_LINES) {
        consoleOutput.firstElementChild.remove();
    }

    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}


if (clearConsoleBtn) {
    clearConsoleBtn.addEventListener("click", clearConsole);
}


/* =================================
   10. RUN CODE / LIVE PREVIEW
================================= */

/*
   Penanda "sedang menjalankan kode". Jika kode berisi loop tanpa akhir
   dan tab terpaksa ditutup, penanda ini tetap menyala. Saat editor dibuka
   lagi, kode TIDAK dijalankan otomatis sehingga pengguna sempat memperbaikinya.
*/

const RUN_FLAG = "weblearn-run-pending";

function setRunPending(isPending) {
    try {
        if (isPending) {
            localStorage.setItem(RUN_FLAG, "1");
        } else {
            localStorage.removeItem(RUN_FLAG);
        }
    } catch (error) {
        // localStorage tidak tersedia
    }
}

function wasRunInterrupted() {
    try {
        return localStorage.getItem(RUN_FLAG) === "1";
    } catch (error) {
        return false;
    }
}


// Script penghubung console iframe ke halaman utama.
// Dipasang paling awal agar <script> milik pengguna di kotak HTML juga tertangkap.
function buildHeadScript(silent) {
    return `<script>
(function () {
    var SILENT = ${silent ? "true" : "false"};

    function format(value) {
        if (typeof value === "string") return value;
        if (value instanceof Error) return value.name + ": " + value.message;
        if (value === undefined || value === null) return String(value);
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (typeof value === "function" || typeof value === "symbol") return String(value);

        try {
            var json = JSON.stringify(value);
            return json === undefined ? String(value) : json;
        } catch (error) {
            return String(value);
        }
    }

    function send(type, message) {
        parent.postMessage({
            source: "weblearn-console",
            type: type,
            message: message
        }, "*");
    }

    function sendLog(type, args) {
        send(type, Array.prototype.map.call(args, format).join(" "));
    }

    ["log", "info", "debug", "warn", "error"].forEach(function (method) {
        var original = console[method];
        var type = (method === "warn" || method === "error") ? method : "log";

        console[method] = function () {
            try { original.apply(console, arguments); } catch (error) {}
            sendLog(type, arguments);
        };
    });

    window.addEventListener("error", function (event) {
        var message = String(event.message || "Terjadi error").replace(/^Uncaught /, "");
        var fromUserCode = String(event.filename || "").indexOf("kode-kamu.js") !== -1;

        send("error", fromUserCode && event.lineno
            ? message + " (baris " + event.lineno + ")"
            : message);
    });

    window.addEventListener("unhandledrejection", function (event) {
        send("error", "Promise error: " + format(event.reason));
    });

    if (SILENT) {
        window.alert = function (message) {
            sendLog("warn", ["alert() tidak ditampilkan saat dijalankan otomatis: " + message]);
        };
        window.confirm = function () { return false; };
        window.prompt = function () { return null; };
    }
})();
<\/script>`;
}


// Script yang memasang CSS dan menjalankan JavaScript pengguna (di akhir body)
function buildRunnerScript(css, js) {
    // Amankan teks agar tidak menutup tag script
    const safeCSS = JSON.stringify(css).replace(/</g, "\\u003C");
    const safeJS = JSON.stringify(js).replace(/</g, "\\u003C");

    return `<script>
(function () {
    var style = document.createElement("style");
    style.textContent = ${safeCSS};
    document.head.appendChild(style);

    // sourceURL membuat nomor baris pada pesan error sesuai kode pengguna
    var script = document.createElement("script");
    script.textContent = ${safeJS} + "\\n//# sourceURL=kode-kamu.js";
    (document.body || document.documentElement).appendChild(script);

    parent.postMessage({ source: "weblearn-console", type: "done" }, "*");
})();
<\/script>`;
}


function buildDocument(html, css, js, silent) {
    const headScript = buildHeadScript(silent);
    const runnerScript = buildRunnerScript(css, js);

    // Jika pengguna memasukkan HTML lengkap
    if (/<html[\s>]/i.test(html)) {
        let documentHTML = html;

        // <head(\s...)?> agar tidak salah mengenali <header>
        const headTag = /<head(\s[^>]*)?>/i;

        if (headTag.test(documentHTML)) {
            documentHTML = documentHTML.replace(
                headTag,
                match => match + headScript
            );
        } else {
            documentHTML = documentHTML.replace(
                /<html[^>]*>/i,
                match => `${match}<head>${headScript}</head>`
            );
        }

        // Pakai fungsi agar karakter "$" pada kode pengguna tidak diubah
        if (/<\/body>/i.test(documentHTML)) {
            documentHTML = documentHTML.replace(
                /<\/body>/i,
                () => runnerScript + "</body>"
            );
        } else {
            documentHTML += runnerScript;
        }

        return documentHTML;
    }

    // Jika pengguna hanya memasukkan potongan HTML
    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${headScript}
</head>
<body>
${html}
${runnerScript}
</body>
</html>`;
}


/*
   auto = true  : dijalankan otomatis (bukan klik pengguna),
                  alert/confirm/prompt dialihkan ke console.
*/
function runCode({ auto = false } = {}) {
    if (!preview) return;

    const html = getEditorValue(htmlEditor, htmlTextarea);
    const css = getEditorValue(cssEditor, cssTextarea);
    const js = getEditorValue(jsEditor, jsTextarea);

    clearConsole();

    addConsole("Menjalankan kode...");

    setRunPending(true);

    preview.srcdoc = buildDocument(html, css, js, auto);
}


// Jalankan kode pertama kali saat editor dibuka (bukan saat website dibuka)
let initialRunDone = false;

function startInitialRun() {
    if (initialRunDone || !preview) return;

    initialRunDone = true;

    if (wasRunInterrupted()) {
        setRunPending(false);

        clearConsole();

        addConsole(
            "Run sebelumnya tidak selesai (mungkin ada loop tanpa akhir). " +
            "Periksa kodenya, lalu klik Run Code.",
            "warn"
        );

        return;
    }

    runCode({ auto: true });
}


if (runBtn) {
    runBtn.addEventListener("click", () => runCode());
}


// Pintasan keyboard: Ctrl + Enter (Cmd + Enter di Mac)
document.addEventListener("keydown", event => {
    const isRunShortcut =
        (event.ctrlKey || event.metaKey) && event.key === "Enter";

    if (isRunShortcut && editorPage.classList.contains("active")) {
        event.preventDefault();

        runCode();
    }
});


// Terima pesan console dari iframe
window.addEventListener("message", event => {
    if (!preview || event.source !== preview.contentWindow) return;

    const data = event.data;

    if (!data || data.source !== "weblearn-console") return;

    if (data.type === "done") {
        setRunPending(false);

        addConsole("Kode selesai dijalankan.");

        return;
    }

    addConsole(data.message, data.type);
});


/* =================================
   11. RESET EDITOR
================================= */

if (resetBtn) {
    resetBtn.addEventListener("click", () => {

        const confirmReset = confirm(
            "Apakah kamu yakin ingin mengembalikan semua kode ke pengaturan awal?"
        );

        if (!confirmReset) return;

        // Batalkan simpan yang masih tertunda agar tidak menimpa hasil reset
        clearTimeout(saveTimer);
        saveTimer = null;

        setAllEditors({
            html: defaultHTML,
            css: defaultCSS,
            js: defaultJS
        });

        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn("Data lokal tidak dapat dihapus.");
        }

        runCode();

        setStatus("Kode dikembalikan ke awal");
    });
}


/* =================================
   12. START APPLICATION
================================= */

initializeEditors();

loadEditor();

attachAutosave();

// Atur halaman pertama saat website dibuka
handleHistoryNavigation();
