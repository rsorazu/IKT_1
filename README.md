# IKT Programazioa v3 — CMS-driven

## Egitura
admin/index.html + admin/config.yml  — Decap CMS panela
content/*.json                       — Eduki guztia (CMS-k editatzen du)
index.html + style.css + app.js      — Web-shell (ez ukitu)

## GitHub + Netlify konfigurazioa
1. admin/config.yml fitxategian aldatu: TU_USUARIO/TU_REPOSITORIO
2. Fitxategi guztiak GitHub repositoriora igo
3. Netlify-n: Site configuration > Identity > Enable
4. Identity > Services > Git Gateway > Enable
5. Panel: tu-web.netlify.app/admin

## Edukia editatzeko
content/*.json fitxategiak editatu dezakezu zuzenean GitHuben
edo /admin panelaren bidez.
