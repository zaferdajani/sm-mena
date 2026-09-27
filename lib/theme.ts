/** Shared by the server-rendered bootstrap and client controls.
 * Keep this module server-safe: importing a value from a `use client` module
 * does not provide the server with executable inline JavaScript.
 */
export const THEME_KEY = "sw_theme";

/** Apply only an explicit saved choice, before paint. Never infer from the OS. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"){document.documentElement.dataset.theme="dark"}else{document.documentElement.removeAttribute("data-theme")}}catch(e){}`;
