/**
 * 希沃智教 π：演示用前端登录态（localStorage）与全局 UI（弹窗 / 帮助）
 */
(function () {
    var STORAGE_KEY = "seewo_pi_demo_user_v1";
    var loggingIn = false;

    var PLACEHOLDER_TEXT =
        "本地演示环境，以下为占位说明。正式版本将对接账号系统与批改记录云端存储。";

    var STATIC_PAGES = {
        about: { title: "关于我们", body: PLACEHOLDER_TEXT + " 希沃智教 π 面向师生提供作业拍照批改与学情反馈演示。" },
        privacy: { title: "隐私政策", body: PLACEHOLDER_TEXT + " 我们将依法说明个人信息收集、使用与保存方式。" },
        terms: { title: "用户协议", body: PLACEHOLDER_TEXT + " 使用本服务前请阅读完整协议条款。" },
        profile: { title: "个人中心", body: "在此可管理昵称、头像与账号安全设置。（演示占位）" },
        history: { title: "我的批改记录", body: "这里将展示历次上传作业的批改结果与时间线。（演示占位）" },
    };

    var defaultAvatar =
        "data:image/svg+xml," +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#c8ebe0"/><text x="32" y="41" text-anchor="middle" fill="#00b578" font-size="26" font-family="system-ui,sans-serif" font-weight="700">用</text></svg>'
        );

    var state = { user: null };

    function loadSession() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            state.user = raw ? JSON.parse(raw) : null;
            if (state.user && !state.user.name) state.user = null;
        } catch (e) {
            state.user = null;
        }
    }

    function saveSession(user) {
        state.user = user;
        if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        else localStorage.removeItem(STORAGE_KEY);
    }

    function isLoggingIn() {
        return loggingIn;
    }

    function isLoggedIn() {
        return !!(state.user && state.user.name);
    }

    function renderNav() {
        var btnLogin = document.getElementById("navBtnLogin");
        var blockLogging = document.getElementById("navAuthLogging");
        var blockUser = document.getElementById("navAuthUser");
        if (!btnLogin || !blockLogging || !blockUser) return;

        btnLogin.classList.add("d-none");
        blockLogging.classList.add("d-none");
        blockUser.classList.add("d-none");
        blockLogging.classList.remove("d-flex");

        if (isLoggingIn()) {
            blockLogging.classList.remove("d-none");
            blockLogging.classList.add("d-flex");
            return;
        }

        if (isLoggedIn()) {
            blockUser.classList.remove("d-none");
            var nameEl = blockUser.querySelector(".nav-user-name");
            var imgEl = blockUser.querySelector(".nav-user-avatar");
            if (nameEl) nameEl.textContent = state.user.name;
            if (imgEl) {
                imgEl.src = state.user.avatar || defaultAvatar;
                imgEl.alt = state.user.name;
            }
            return;
        }

        btnLogin.classList.remove("d-none");
    }

    function runLoginDemo() {
        if (loggingIn || isLoggedIn()) return;
        loggingIn = true;
        renderNav();
        window.setTimeout(function () {
            loggingIn = false;
            saveSession({ name: "演示同学", avatar: "" });
            renderNav();
        }, 950);
    }

    function showModalById(id) {
        var el = document.getElementById(id);
        if (!el || typeof bootstrap === "undefined") return;
        bootstrap.Modal.getOrCreateInstance(el).show();
    }

    function showStaticModal(key) {
        var cfg = STATIC_PAGES[key];
        if (!cfg) return;
        var modal = document.getElementById("modalStaticInfo");
        if (!modal) return;
        modal.querySelector(".modal-static-title").textContent = cfg.title;
        modal.querySelector(".modal-static-body").textContent = cfg.body;
        showModalById("modalStaticInfo");
    }

    function showLoginRequiredModal() {
        showModalById("modalLoginRequired");
    }

    function wireFooterAndMenus() {
        document.querySelectorAll("[data-static-page]").forEach(function (a) {
            a.addEventListener("click", function (e) {
                e.preventDefault();
                showStaticModal(a.getAttribute("data-static-page"));
            });
        });

        var helpTriggers = document.querySelectorAll("[data-open-help]");
        helpTriggers.forEach(function (el) {
            el.addEventListener("click", function (e) {
                e.preventDefault();
                showModalById("modalHelpCenter");
            });
        });

        var goLogin = document.getElementById("modalBtnGoLogin");
        if (goLogin) {
            goLogin.addEventListener("click", function () {
                var m = bootstrap.Modal.getInstance(document.getElementById("modalLoginRequired"));
                if (m) m.hide();
                runLoginDemo();
            });
        }

        var profile = document.getElementById("navMenuProfile");
        var history = document.getElementById("navMenuHistory");
        var logout = document.getElementById("navMenuLogout");
        if (profile) profile.addEventListener("click", function (e) { e.preventDefault(); showStaticModal("profile"); });
        if (history) history.addEventListener("click", function (e) { e.preventDefault(); showStaticModal("history"); });
        if (logout) {
            logout.addEventListener("click", function (e) {
                e.preventDefault();
                saveSession(null);
                renderNav();
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        loadSession();
        renderNav();
        wireFooterAndMenus();

        var btnLogin = document.getElementById("navBtnLogin");
        if (btnLogin) btnLogin.addEventListener("click", runLoginDemo);
    });

    window.SeewoAuth = {
        isLoggedIn: isLoggedIn,
        showLoginRequiredModal: showLoginRequiredModal,
    };
})();
